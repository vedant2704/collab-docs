import { useEffect, useState } from 'react'
import api from '../lib/api.js'

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr)
  if (diff < 60000) return 'just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function HistorySidebar({ docId, onClose }) {
  const [snapshots, setSnapshots] = useState([])
  const [loading, setLoading] = useState(true)
  const [restoring, setRestoring] = useState(null)
  const [message, setMessage] = useState('')

  useEffect(() => {
    api.get(`/api/docs/${docId}/history`)
      .then(({ data }) => setSnapshots(data.snapshots))
      .catch(() => setMessage('Failed to load history'))
      .finally(() => setLoading(false))
  }, [docId])

  const handleRestore = async (snapshotId, version) => {
    if (!window.confirm(`Restore document to version ${version}? This cannot be undone.`)) return
    setRestoring(snapshotId)
    try {
      await api.post(`/api/docs/${docId}/history/${snapshotId}/restore`)
      setMessage('Restored! Reload the page to see changes.')
    } catch (err) {
      setMessage(err.response?.data?.message || 'Restore failed')
    } finally {
      setRestoring(null)
    }
  }

  return (
    <div className="fixed right-0 top-0 h-full w-72 bg-white border-l border-gray-200 shadow-xl z-40 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
          <h2 className="text-sm font-semibold text-gray-900">Version history</h2>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {message && (
          <div className={`text-xs px-3 py-2 rounded-lg mb-3 ${message.includes('Restored') ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
            {message}
          </div>
        )}

        {loading ? (
          <div className="space-y-3 mt-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : snapshots.length === 0 ? (
          <div className="text-center py-10">
            <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
            </div>
            <p className="text-sm text-gray-400">No snapshots yet</p>
            <p className="text-xs text-gray-300 mt-1">Snapshots are saved every 50 edits</p>
          </div>
        ) : (
          <div className="space-y-2">
            {snapshots.map((snap, idx) => (
              <div
                key={snap._id}
                className="border border-gray-200 rounded-xl p-3 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      {idx === 0 && (
                        <span className="text-xs bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-medium">Latest</span>
                      )}
                      <span className="text-xs font-mono text-gray-500">v{snap.version}</span>
                    </div>
                    <p className="text-xs text-gray-400">{timeAgo(snap.createdAt)}</p>
                    {snap.createdBy && (
                      <p className="text-xs text-gray-400 mt-0.5">by {snap.createdBy.name}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleRestore(snap._id, snap.version)}
                    disabled={restoring === snap._id}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-medium opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50 whitespace-nowrap"
                  >
                    {restoring === snap._id ? 'Restoring…' : 'Restore'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="px-5 py-3 border-t border-gray-100">
        <p className="text-xs text-gray-400 text-center">Snapshots saved every 50 edits</p>
      </div>
    </div>
  )
}
