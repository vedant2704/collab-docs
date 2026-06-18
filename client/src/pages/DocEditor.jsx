import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../lib/api.js'
import CollabEditor from '../components/CollabEditor.jsx'
import SlateEditor from '../components/Editor.jsx'
import SyncStatus from '../components/SyncStatus.jsx'
import Presence from '../components/Presence.jsx'
import ShareModal from '../components/ShareModal.jsx'
import HistorySidebar from '../components/HistorySidebar.jsx'
import CursorOverlay from '../components/CursorOverlay.jsx'
import useYjs from '../hooks/useYjs.js'

export default function DocEditor() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [doc, setDoc] = useState(null)
  const [role, setRole] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [title, setTitle] = useState('')
  const [saveStatus, setSaveStatus] = useState('saved')
  const [editingTitle, setEditingTitle] = useState(false)
  const [showShare, setShowShare] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  const { ydoc, provider, status: wsStatus } = useYjs(id)

  useEffect(() => {
    api.get(`/api/docs/${id}`)
      .then(({ data }) => {
        setDoc(data.doc)
        setRole(data.role)
        setTitle(data.doc.title)
      })
      .catch((err) => {
        if (err.response?.status === 403) setError("You don't have access to this document.")
        else if (err.response?.status === 404) setError('Document not found.')
        else setError('Failed to load document.')
      })
      .finally(() => setLoading(false))
  }, [id])

  const saveContent = useCallback(async (content) => {
    setSaveStatus('saving')
    try {
      await api.patch(`/api/docs/${id}/content`, { content })
      setSaveStatus('saved')
    } catch {
      setSaveStatus('error')
    }
  }, [id])

  const saveTitle = async () => {
    setEditingTitle(false)
    if (!doc || title === doc.title) return
    try {
      await api.patch(`/api/docs/${id}`, { title })
      setDoc((d) => ({ ...d, title }))
    } catch {
      setTitle(doc.title)
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (error) return (
    <div className="min-h-screen flex items-center justify-center text-center px-4">
      <div>
        <p className="text-gray-500 mb-4">{error}</p>
        <button onClick={() => navigate('/dashboard')} className="text-sm text-indigo-600 hover:underline">
          ← Back to dashboard
        </button>
      </div>
    </div>
  )

  const readOnly = role === 'view'
  const isCollab = !!ydoc
  const isOwnerOrAdmin = role === 'admin'

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Top bar */}
      <header className="border-b border-gray-200 px-5 py-2.5 flex items-center gap-3 sticky top-0 bg-white z-10">
        {/* Back */}
        <button onClick={() => navigate('/dashboard')} className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
          </svg>
        </button>

        {/* Title */}
        {editingTitle ? (
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={(e) => e.key === 'Enter' && saveTitle()}
            className="flex-1 text-sm font-medium text-gray-900 border-b border-indigo-400 outline-none bg-transparent py-0.5 min-w-0"
          />
        ) : (
          <button
            onClick={() => !readOnly && setEditingTitle(true)}
            className={`flex-1 text-left text-sm font-medium text-gray-900 truncate min-w-0 ${!readOnly ? 'hover:text-indigo-600' : ''}`}
          >
            {title || 'Untitled Document'}
          </button>
        )}

        {/* Right controls */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Online users */}
          <Presence provider={provider} />

          {/* Sync status */}
          {isCollab
            ? <SyncStatus status={wsStatus} />
            : <span className={`text-xs ${saveStatus === 'saving' ? 'text-gray-400' : saveStatus === 'error' ? 'text-red-500' : 'text-emerald-500'}`}>
                {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'error' ? 'Save failed' : 'Saved'}
              </span>
          }

          {/* History button */}
          <button
            onClick={() => setShowHistory((v) => !v)}
            className={`p-1.5 rounded-lg transition-colors ${showHistory ? 'bg-indigo-100 text-indigo-700' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
            title="Version history"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
          </button>

          {/* Share button — only for admins */}
          {isOwnerOrAdmin && (
            <button
              onClick={() => setShowShare(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                <polyline points="16 6 12 2 8 6"/>
                <line x1="12" y1="2" x2="12" y2="15"/>
              </svg>
              Share
            </button>
          )}

          {readOnly && (
            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full">View only</span>
          )}
        </div>
      </header>

      {/* Editor area */}
      <div className={`flex-1 transition-all ${showHistory ? 'mr-72' : ''}`}>
        {doc && (
          isCollab
            ? <CollabEditor ydoc={ydoc} readOnly={readOnly} />
            : <SlateEditor initialContent={doc.content} onSave={saveContent} readOnly={readOnly} />
        )}
      </div>

      {/* Floating cursor labels */}
      {isCollab && <CursorOverlay provider={provider} />}

      {/* Modals / sidebars */}
      {showShare && doc && (
        <ShareModal
          doc={doc}
          onClose={() => setShowShare(false)}
          onUpdate={(updated) => setDoc(updated)}
        />
      )}

      {showHistory && (
        <HistorySidebar
          docId={id}
          onClose={() => setShowHistory(false)}
        />
      )}
    </div>
  )
}
