/**
 * Yjs WebSocket server.
 * Each document gets its own Y.Doc instance keyed by document ID.
 * Handles: room join auth, real-time sync, MongoDB persistence, awareness (cursors).
 */
import { WebSocketServer } from 'ws'
import * as Y from 'yjs'
import * as syncProtocol from 'y-protocols/sync'
import * as awarenessProtocol from 'y-protocols/awareness'
import * as encoding from 'lib0/encoding'
import * as decoding from 'lib0/decoding'
import * as map from 'lib0/map'
import jwt from 'jsonwebtoken'
import { mongodbPersistence } from './config/yjsPersistence.js'
import Document from './models/Document.js'

const CALLBACK_DEBOUNCE_WAIT = 2000  // ms to wait before persisting after last update
const messageSync = 0
const messageAwareness = 1

// In-memory map of docId → Y.Doc
const docs = new Map()

// Per-doc persistence debounce timers
const persistTimers = new Map()

const debouncedPersist = (docName, ydoc) => {
  if (persistTimers.has(docName)) clearTimeout(persistTimers.get(docName))
  persistTimers.set(
    docName,
    setTimeout(async () => {
      await mongodbPersistence.writeState(docName, ydoc)
      persistTimers.delete(docName)
    }, CALLBACK_DEBOUNCE_WAIT)
  )
}

const getYDoc = async (docName) => {
  if (docs.has(docName)) return docs.get(docName)

  const ydoc = new Y.Doc()
  ydoc.gc = true
  docs.set(docName, ydoc)

  // Load persisted state from MongoDB
  await mongodbPersistence.bindState(docName, ydoc)

  // Persist on every update
  ydoc.on('update', () => debouncedPersist(docName, ydoc))

  return ydoc
}

// Per-doc awareness instances
const awarenessMap = new Map()

const getAwareness = (docName, ydoc) => {
  if (!awarenessMap.has(docName)) {
    awarenessMap.set(docName, new awarenessProtocol.Awareness(ydoc))
  }
  return awarenessMap.get(docName)
}

// Parse JWT from WebSocket request query string: ws://host?token=xxx&docId=yyy
const authenticate = (req) => {
  try {
    const url = new URL(req.url, 'ws://localhost')
    const token = url.searchParams.get('token')
    if (!token) return null
    return jwt.verify(token, process.env.JWT_SECRET)
  } catch {
    return null
  }
}

const send = (conn, message) => {
  if (conn.readyState === conn.OPEN) {
    conn.send(message, (err) => { if (err) console.error('[WS] send error:', err) })
  }
}

// Track active connections per doc for broadcasting
const connsByDoc = new Map()  // docId → Set<WebSocket>
const connMeta = new Map()    // ws → { docId, userId }

export const setupWsServer = (httpServer) => {
  const wss = new WebSocketServer({ noServer: true })

  // Upgrade HTTP → WebSocket with auth
  httpServer.on('upgrade', async (req, socket, head) => {
    const url = new URL(req.url, 'ws://localhost')
    if (!url.pathname.startsWith('/yjs')) {
      socket.destroy()
      return
    }

    const decoded = authenticate(req)
    if (!decoded) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n')
      socket.destroy()
      return
    }

    // y-websocket appends room name to path: /yjs/DOCID
    // Also support ?docId=... query param
    const pathParts = url.pathname.split('/').filter(Boolean)
    const rawDocId = url.searchParams.get('docId') || (pathParts.length > 1 ? pathParts[pathParts.length - 1] : null)
    const docId = rawDocId ? rawDocId.replace(/\/+$/, '').trim() : null
    if (!docId) {
      socket.write('HTTP/1.1 400 Bad Request\r\n\r\n')
      socket.destroy()
      return
    }

    // Check the user actually has access to this document
    try {
      const doc = await Document.findById(docId).select('owner collaborators')
      if (!doc) { socket.destroy(); return }
      const role = doc.getUserRole(decoded.id)
      if (!role) { socket.write('HTTP/1.1 403 Forbidden\r\n\r\n'); socket.destroy(); return }
    } catch {
      socket.destroy()
      return
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req, { userId: decoded.id, docId })
    })
  })

  wss.on('connection', async (conn, req, { userId, docId }) => {
    console.log(`[WS] User ${userId} connected to doc ${docId}`)

    const ydoc = await getYDoc(docId)
    const awareness = getAwareness(docId, ydoc)

    // Register connection
    if (!connsByDoc.has(docId)) connsByDoc.set(docId, new Set())
    connsByDoc.get(docId).add(conn)
    connMeta.set(conn, { docId, userId })

    // --- Sync step 1: send sync state to new client ---
    const encoder = encoding.createEncoder()
    encoding.writeVarUint(encoder, messageSync)
    syncProtocol.writeSyncStep1(encoder, ydoc)
    send(conn, encoding.toUint8Array(encoder))

    // --- Send current awareness states ---
    const awarenessStates = awareness.getStates()
    if (awarenessStates.size > 0) {
      const awarenessEncoder = encoding.createEncoder()
      encoding.writeVarUint(awarenessEncoder, messageAwareness)
      encoding.writeVarUint8Array(
        awarenessEncoder,
        awarenessProtocol.encodeAwarenessUpdate(awareness, Array.from(awarenessStates.keys()))
      )
      send(conn, encoding.toUint8Array(awarenessEncoder))
    }

    // --- Broadcast helper (to all OTHER connections in same doc) ---
    const broadcast = (message, exclude) => {
      const conns = connsByDoc.get(docId) || new Set()
      conns.forEach((c) => { if (c !== exclude && c.readyState === c.OPEN) send(c, message) })
    }

    // --- Handle incoming messages ---
    conn.on('message', (rawMessage) => {
      try {
        const message = new Uint8Array(rawMessage)
        const decoder = decoding.createDecoder(message)
        const msgType = decoding.readVarUint(decoder)

        if (msgType === messageSync) {
          const encoder = encoding.createEncoder()
          encoding.writeVarUint(encoder, messageSync)
          const syncMsgType = syncProtocol.readSyncMessage(decoder, encoder, ydoc, null)

          // If we wrote a response (sync step 2 or update), send it back
          if (encoding.length(encoder) > 1) {
            send(conn, encoding.toUint8Array(encoder))
          }

          // Broadcast update to all other connected clients
          if (syncMsgType === syncProtocol.messageYjsSyncStep2 || syncMsgType === syncProtocol.messageYjsUpdate) {
            broadcast(message, conn)
          }
        } else if (msgType === messageAwareness) {
          // Cursor/presence update — broadcast to everyone including sender
          const update = decoding.readVarUint8Array(decoder)
          awarenessProtocol.applyAwarenessUpdate(awareness, update, conn)
          const broadcastEncoder = encoding.createEncoder()
          encoding.writeVarUint(broadcastEncoder, messageAwareness)
          encoding.writeVarUint8Array(broadcastEncoder, update)
          const broadcastMsg = encoding.toUint8Array(broadcastEncoder)
          connsByDoc.get(docId)?.forEach((c) => {
            if (c !== conn && c.readyState === c.OPEN) send(c, broadcastMsg)
          })
        }
      } catch (err) {
        console.error('[WS] message error:', err.message)
      }
    })

    // --- Cleanup on disconnect ---
    conn.on('close', () => {
      console.log(`[WS] User ${userId} disconnected from doc ${docId}`)
      connsByDoc.get(docId)?.delete(conn)
      connMeta.delete(conn)

      // Remove this client's awareness state
      awarenessProtocol.removeAwarenessStates(awareness, [awareness.clientID], null)

      // If no more connections, clean up in-memory doc after 30s (keep for quick reconnects)
      if (connsByDoc.get(docId)?.size === 0) {
        setTimeout(() => {
          if (connsByDoc.get(docId)?.size === 0) {
            docs.delete(docId)
            awarenessMap.delete(docId)
            connsByDoc.delete(docId)
            console.log(`[Yjs] Cleaned up doc ${docId} from memory`)
          }
        }, 30000)
      }
    })

    conn.on('error', (err) => console.error('[WS] conn error:', err.message))
  })

  console.log('[Yjs] WebSocket server ready at ws://localhost:PORT/yjs')
  return wss
}
