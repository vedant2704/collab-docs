import { useEffect, useRef, useState } from 'react'
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'
import { useAuthStore } from '../store/authStore.js'

export const CURSOR_COLORS = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B',
  '#8B5CF6', '#EC4899', '#06B6D4', '#F97316',
]

const pickColor = (userId) => {
  let hash = 0
  for (let i = 0; i < userId.length; i++) hash = userId.charCodeAt(i) + ((hash << 5) - hash)
  return CURSOR_COLORS[Math.abs(hash) % CURSOR_COLORS.length]
}

export default function useYjs(docId) {
  const { user, token } = useAuthStore()
  const ydocRef = useRef(null)
  const providerRef = useRef(null)
  const [status, setStatus] = useState('connecting')

  useEffect(() => {
    if (!docId || !token) return

    const wsBase = import.meta.env.VITE_WS_URL || 'ws://localhost:4000'
    // y-websocket appends the room name to the URL, so we pass token as param
    // and use docId as the room — server receives /yjs/docId?token=xxx
    const wsUrl = `${wsBase}/yjs?token=${token}&docId=${docId}`

    const ydoc = new Y.Doc()
    ydocRef.current = ydoc

    // Pass empty string as room since we handle routing via query params
    const provider = new WebsocketProvider(wsUrl, '', ydoc, {
      connect: true,
      params: {},
    })
    providerRef.current = provider

    provider.awareness.setLocalStateField('user', {
      id: user._id,
      name: user.name,
      color: pickColor(user._id),
      initials: user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2),
    })

    provider.on('status', ({ status }) => setStatus(status))

    return () => {
      provider.awareness.setLocalStateField('user', null)
      provider.destroy()
      ydoc.destroy()
      ydocRef.current = null
      providerRef.current = null
    }
  }, [docId, token])

  return {
    ydoc: ydocRef.current,
    provider: providerRef.current,
    status,
  }
}
