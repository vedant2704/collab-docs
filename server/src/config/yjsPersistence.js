/**
 * Custom Yjs persistence using MongoDB.
 * Stores the encoded Yjs document state as a Buffer in the Document model.
 * Called by y-websocket server on load and after each update.
 */
import * as Y from 'yjs'
import Document from '../models/Document.js'

export const mongodbPersistence = {
  /**
   * Load existing Yjs state for a document from MongoDB.
   * Returns a Y.Doc pre-loaded with stored updates, or empty if none exist.
   */
  bindState: async (docName, ydoc) => {
    try {
      const dbDoc = await Document.findById(docName).select('yjsState')
      if (dbDoc?.yjsState?.buffer) {
        const update = new Uint8Array(dbDoc.yjsState.buffer)
        Y.applyUpdate(ydoc, update)
        console.log(`[Yjs] Loaded state for doc ${docName}`)
      }
    } catch (err) {
      console.error(`[Yjs] Failed to load state for doc ${docName}:`, err.message)
    }
  },

  /**
   * Persist the current Yjs document state to MongoDB.
   * Called after every update — debounced by y-websocket internals.
   */
  writeState: async (docName, ydoc) => {
    try {
      const state = Y.encodeStateAsUpdate(ydoc)
      await Document.findByIdAndUpdate(docName, {
        yjsState: Buffer.from(state),
        updatedAt: new Date(),
      })
    } catch (err) {
      console.error(`[Yjs] Failed to persist state for doc ${docName}:`, err.message)
    }
  },
}
