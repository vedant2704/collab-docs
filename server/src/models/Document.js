import mongoose from 'mongoose'

const collaboratorSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role: { type: String, enum: ['view', 'edit', 'admin'], default: 'edit' },
  invitedAt: { type: Date, default: Date.now },
})

const documentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      default: 'Untitled Document',
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: {
      type: mongoose.Schema.Types.Mixed,
      default: [{ type: 'paragraph', children: [{ text: '' }] }],
    },
    yjsState: {
      type: Buffer,
      default: null,
    },
    version: {
      type: Number,
      default: 0,
    },
    collaborators: [collaboratorSchema],
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
)

documentSchema.index({ owner: 1, isDeleted: 1 })
documentSchema.index({ 'collaborators.user': 1, isDeleted: 1 })

documentSchema.methods.getUserRole = function (userId) {
  const uid = userId.toString()

  const ownerId = this.owner?._id
    ? this.owner._id.toString()
    : this.owner?.toString()

  if (ownerId === uid) return 'admin'

  const collab = this.collaborators.find((c) => {
    const collabUserId = c.user?._id
      ? c.user._id.toString()
      : c.user?.toString()
    return collabUserId === uid
  })

  return collab?.role || null
}

export default mongoose.model('Document', documentSchema)
