import { Router } from 'express'
import { protect } from '../middleware/auth.js'
import {
  listDocs, createDoc, getDoc, updateDocTitle, updateDocContent,
  inviteCollaborator, updateCollaboratorRole, removeCollaborator,
  getHistory, restoreVersion, deleteDoc,
} from '../controllers/docController.js'

const router = Router()
router.use(protect)

router.get('/', listDocs)
router.post('/', createDoc)
router.get('/:id', getDoc)
router.patch('/:id', updateDocTitle)
router.patch('/:id/content', updateDocContent)
router.delete('/:id', deleteDoc)

// Collaborators
router.post('/:id/invite', inviteCollaborator)
router.patch('/:id/collaborators/:userId', updateCollaboratorRole)
router.delete('/:id/collaborators/:userId', removeCollaborator)

// Version history
router.get('/:id/history', getHistory)
router.post('/:id/history/:snapshotId/restore', restoreVersion)

export default router
