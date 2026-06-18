import Document from '../models/Document.js'
import User from '../models/User.js'
import Snapshot from '../models/Snapshot.js'
import { restoreSnapshot } from '../jobs/snapshotJob.js'

// GET /api/docs
export const listDocs = async (req, res, next) => {
  try {
    const docs = await Document.find({
      $or: [{ owner: req.user._id }, { 'collaborators.user': req.user._id }],
      isDeleted: false,
    })
      .select('title owner collaborators createdAt updatedAt version')
      .populate('owner', 'name email')
      .sort({ updatedAt: -1 })
    res.json({ status: 'success', docs })
  } catch (err) { next(err) }
}

// POST /api/docs
export const createDoc = async (req, res, next) => {
  try {
    const { title } = req.body
    const doc = await Document.create({ title: title || 'Untitled Document', owner: req.user._id })
    await doc.populate('owner', 'name email')
    res.status(201).json({ status: 'success', doc })
  } catch (err) { next(err) }
}

// GET /api/docs/:id
export const getDoc = async (req, res, next) => {
  try {
    const doc = await Document.findOne({ _id: req.params.id, isDeleted: false })
      .populate('owner', 'name email')
      .populate('collaborators.user', 'name email')
    if (!doc) return res.status(404).json({ message: 'Document not found' })
    const role = doc.getUserRole(req.user._id)
    if (!role) return res.status(403).json({ message: 'Access denied' })
    res.json({ status: 'success', doc, role })
  } catch (err) { next(err) }
}

// PATCH /api/docs/:id — update title
export const updateDocTitle = async (req, res, next) => {
  try {
    const doc = await Document.findOne({ _id: req.params.id, isDeleted: false })
    if (!doc) return res.status(404).json({ message: 'Document not found' })
    const role = doc.getUserRole(req.user._id)
    if (!role || role === 'view') return res.status(403).json({ message: 'Access denied' })
    if (req.body.title !== undefined) doc.title = req.body.title
    await doc.save()
    res.json({ status: 'success', doc })
  } catch (err) { next(err) }
}

// PATCH /api/docs/:id/content — save editor content (used by static editor)
export const updateDocContent = async (req, res, next) => {
  try {
    const doc = await Document.findOne({ _id: req.params.id, isDeleted: false })
    if (!doc) return res.status(404).json({ message: 'Document not found' })
    const role = doc.getUserRole(req.user._id)
    if (!role || role === 'view') return res.status(403).json({ message: 'Access denied' })
    doc.content = req.body.content
    doc.version += 1
    await doc.save()
    res.json({ status: 'success', version: doc.version })
  } catch (err) { next(err) }
}

// POST /api/docs/:id/invite — invite by email
export const inviteCollaborator = async (req, res, next) => {
  try {
    const { email, role = 'edit' } = req.body
    if (!email) return res.status(400).json({ message: 'Email is required' })

    const doc = await Document.findOne({ _id: req.params.id, isDeleted: false })
    if (!doc) return res.status(404).json({ message: 'Document not found' })

    const requesterRole = doc.getUserRole(req.user._id)
    if (requesterRole !== 'admin') return res.status(403).json({ message: 'Only admins can invite' })

    // Find user by email
    const invitee = await User.findOne({ email: email.toLowerCase() })
    if (!invitee) return res.status(404).json({ message: 'No user found with that email' })

    // Can't invite yourself
    if (invitee._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'You are already the owner' })
    }

    // Check if already a collaborator
    const alreadyAdded = doc.collaborators.some((c) => c.user.toString() === invitee._id.toString())
    if (alreadyAdded) return res.status(409).json({ message: 'User is already a collaborator' })

    doc.collaborators.push({ user: invitee._id, role })
    await doc.save()
    await doc.populate('collaborators.user', 'name email')

    res.json({ status: 'success', doc })
  } catch (err) { next(err) }
}

// PATCH /api/docs/:id/collaborators/:userId — change role
export const updateCollaboratorRole = async (req, res, next) => {
  try {
    const { role } = req.body
    if (!['view', 'edit', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' })
    }
    const doc = await Document.findOne({ _id: req.params.id, isDeleted: false })
    if (!doc) return res.status(404).json({ message: 'Document not found' })

    const requesterRole = doc.getUserRole(req.user._id)
    if (requesterRole !== 'admin') return res.status(403).json({ message: 'Only admins can change roles' })

    const collab = doc.collaborators.find((c) => c.user.toString() === req.params.userId)
    if (!collab) return res.status(404).json({ message: 'Collaborator not found' })

    collab.role = role
    await doc.save()
    res.json({ status: 'success', message: 'Role updated' })
  } catch (err) { next(err) }
}

// DELETE /api/docs/:id/collaborators/:userId — remove collaborator
export const removeCollaborator = async (req, res, next) => {
  try {
    const doc = await Document.findOne({ _id: req.params.id, isDeleted: false })
    if (!doc) return res.status(404).json({ message: 'Document not found' })

    const requesterRole = doc.getUserRole(req.user._id)
    // Admins can remove anyone; users can remove themselves
    const isSelf = req.params.userId === req.user._id.toString()
    if (requesterRole !== 'admin' && !isSelf) return res.status(403).json({ message: 'Access denied' })

    doc.collaborators = doc.collaborators.filter((c) => c.user.toString() !== req.params.userId)
    await doc.save()
    res.json({ status: 'success', message: 'Collaborator removed' })
  } catch (err) { next(err) }
}

// GET /api/docs/:id/history — list snapshots
export const getHistory = async (req, res, next) => {
  try {
    const doc = await Document.findOne({ _id: req.params.id, isDeleted: false })
    if (!doc) return res.status(404).json({ message: 'Document not found' })

    const role = doc.getUserRole(req.user._id)
    if (!role) return res.status(403).json({ message: 'Access denied' })

    const snapshots = await Snapshot.find({ docId: req.params.id })
      .populate('createdBy', 'name')
      .sort({ version: -1 })
      .limit(20)

    res.json({ status: 'success', snapshots })
  } catch (err) { next(err) }
}

// POST /api/docs/:id/history/:snapshotId/restore
export const restoreVersion = async (req, res, next) => {
  try {
    const doc = await Document.findOne({ _id: req.params.id, isDeleted: false })
    if (!doc) return res.status(404).json({ message: 'Document not found' })

    const role = doc.getUserRole(req.user._id)
    if (!role || role === 'view') return res.status(403).json({ message: 'Access denied' })

    await restoreSnapshot(req.params.id, req.params.snapshotId)
    res.json({ status: 'success', message: 'Document restored. Refresh to see changes.' })
  } catch (err) { next(err) }
}

// DELETE /api/docs/:id
export const deleteDoc = async (req, res, next) => {
  try {
    const doc = await Document.findOne({ _id: req.params.id, isDeleted: false })
    if (!doc) return res.status(404).json({ message: 'Document not found' })
    if (doc.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the owner can delete this document' })
    }
    doc.isDeleted = true
    await doc.save()
    res.json({ status: 'success', message: 'Document deleted' })
  } catch (err) { next(err) }
}
