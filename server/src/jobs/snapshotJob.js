/**
 * Background job: every 50 Yjs updates, take a snapshot of the document.
 * Snapshots are stored in the snapshots collection and used for version history.
 * Also used to restore a document to a previous state.
 */
import * as Y from 'yjs'
import Document from '../models/Document.js'
import Snapshot from '../models/Snapshot.js'

// Called from wsServer whenever a doc update is saved
export const maybeSnapshot = async (docId, ydoc, userId) => {
  try {
    const doc = await Document.findById(docId).select('version')
    if (!doc) return

    // Snapshot every 50 versions
    if (doc.version % 50 !== 0) return

    // Get current Slate content from Yjs shared type
    // We store the encoded Yjs state as the snapshot
    const state = Y.encodeStateAsUpdate(ydoc)

    await Snapshot.create({
      docId,
      version: doc.version,
      content: Buffer.from(state).toString('base64'),
      createdBy: userId,
    })

    console.log(`[Snapshot] Created snapshot for doc ${docId} at v${doc.version}`)
  } catch (err) {
    console.error('[Snapshot] Error creating snapshot:', err.message)
  }
}

// Restore a document to a specific snapshot version
export const restoreSnapshot = async (docId, snapshotId) => {
  const snapshot = await Snapshot.findOne({ _id: snapshotId, docId })
  if (!snapshot) throw new Error('Snapshot not found')

  const stateBuffer = Buffer.from(snapshot.content, 'base64')
  await Document.findByIdAndUpdate(docId, {
    yjsState: stateBuffer,
    version: snapshot.version,
    updatedAt: new Date(),
  })

  return snapshot
}
