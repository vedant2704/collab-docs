import mongoose from 'mongoose'

const snapshotSchema = new mongoose.Schema(
  {
    docId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      required: true,
      index: true,
    },
    version: { type: Number, required: true },
    content: { type: mongoose.Schema.Types.Mixed, required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    label: { type: String, default: null }, // optional named snapshot
  },
  { timestamps: true }
)

snapshotSchema.index({ docId: 1, version: -1 })

export default mongoose.model('Snapshot', snapshotSchema)
