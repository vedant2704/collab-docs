/**
 * Renders other users' cursors as colored labels inside the editor.
 * Uses Yjs awareness states — updates in real time as users move their cursor.
 */
import { useEffect, useState } from 'react'
import { useAuthStore } from '../store/authStore.js'

export default function CursorOverlay({ provider }) {
  const currentUser = useAuthStore((s) => s.user)
  const [cursors, setCursors] = useState([])

  useEffect(() => {
    if (!provider) return

    const update = () => {
      const states = Array.from(provider.awareness.getStates().entries())
      const others = states
        .filter(([clientId, state]) =>
          state?.user &&
          state.user.id !== currentUser?._id &&
          clientId !== provider.awareness.clientID
        )
        .map(([, state]) => state.user)

      // Deduplicate by user id
      const seen = new Set()
      setCursors(others.filter((u) => {
        if (seen.has(u.id)) return false
        seen.add(u.id)
        return true
      }))
    }

    provider.awareness.on('change', update)
    update()
    return () => provider.awareness.off('change', update)
  }, [provider, currentUser])

  if (cursors.length === 0) return null

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 z-30 pointer-events-none">
      {cursors.map((user) => (
        <div
          key={user.id}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-white text-xs font-medium shadow-lg"
          style={{ backgroundColor: user.color }}
        >
          <span className="w-4 h-4 rounded-full bg-white/30 flex items-center justify-center text-white text-xs">
            {user.initials}
          </span>
          {user.name} is editing
        </div>
      ))}
    </div>
  )
}
