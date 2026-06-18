import { useState } from 'react'
import api from '../lib/api.js'

export default function ShareModal({ doc, onClose, onUpdate }) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('edit')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleInvite = async (e) => {
    e.preventDefault()
    setError(''); setSuccess(''); setLoading(true)
    try {
      const { data } = await api.post(`/api/docs/${doc._id}/invite`, { email, role })
      setSuccess(`${email} added as ${role}`)
      setEmail('')
      onUpdate?.(data.doc)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to invite user')
    } finally { setLoading(false) }
  }

  const handleRemove = async (userId) => {
    try {
      const { data } = await api.delete(`/api/docs/${doc._id}/collaborators/${userId}`)
      onUpdate?.({ ...doc, collaborators: doc.collaborators.filter(c => c.user._id !== userId) })
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to remove collaborator')
    }
  }

  const handleRoleChange = async (userId, newRole) => {
    try {
      await api.patch(`/api/docs/${doc._id}/collaborators/${userId}`, { role: newRole })
      onUpdate?.({
        ...doc,
        collaborators: doc.collaborators.map(c =>
          c.user._id === userId ? { ...c, role: newRole } : c
        )
      })
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update role')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Share "{doc.title}"</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="px-6 py-5">
          {/* Invite form */}
          <form onSubmit={handleInvite} className="flex gap-2 mb-5">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              required
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="view">Viewer</option>
              <option value="edit">Editor</option>
              <option value="admin">Admin</option>
            </select>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition-colors whitespace-nowrap"
            >
              {loading ? '…' : 'Invite'}
            </button>
          </form>

          {error && <p className="text-xs text-red-500 mb-3">{error}</p>}
          {success && <p className="text-xs text-emerald-600 mb-3">✓ {success}</p>}

          {/* Collaborator list */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">People with access</p>

            {/* Owner row */}
            <div className="flex items-center gap-3 py-2">
              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-xs font-semibold flex-shrink-0">
                {doc.owner?.name?.[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{doc.owner?.name}</p>
                <p className="text-xs text-gray-400 truncate">{doc.owner?.email}</p>
              </div>
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">Owner</span>
            </div>

            {/* Collaborators */}
            {doc.collaborators?.map((collab) => (
              <div key={collab.user._id} className="flex items-center gap-3 py-2">
                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 text-xs font-semibold flex-shrink-0">
                  {collab.user?.name?.[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{collab.user?.name}</p>
                  <p className="text-xs text-gray-400 truncate">{collab.user?.email}</p>
                </div>
                <select
                  value={collab.role}
                  onChange={(e) => handleRoleChange(collab.user._id, e.target.value)}
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400"
                >
                  <option value="view">Viewer</option>
                  <option value="edit">Editor</option>
                  <option value="admin">Admin</option>
                </select>
                <button
                  onClick={() => handleRemove(collab.user._id)}
                  className="text-gray-300 hover:text-red-400 transition-colors ml-1"
                  title="Remove"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
