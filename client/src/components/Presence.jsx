/**
 * Presence bar — shows avatars of all users currently in the document.
 * Reads from Yjs awareness states, updates in real time as users join/leave.
 */
import { useEffect, useState } from 'react'
import { useAuthStore } from '../store/authStore.js'

export default function Presence({ provider }) {
  const currentUser = useAuthStore((s) => s.user)
  const [others, setOthers] = useState([])

  useEffect(() => {
    if (!provider) return

    const updatePresence = () => {
      const states = Array.from(provider.awareness.getStates().entries())
      const online = states
        .filter(([clientId, state]) =>
          state?.user && clientId !== provider.awareness.clientID
        )
        .map(([, state]) => state.user)
      // Deduplicate by user id (user can have multiple tabs)
      const seen = new Set()
      const unique = online.filter((u) => {
        if (seen.has(u.id)) return false
        seen.add(u.id)
        return true
      })
      setOthers(unique)
    }

    provider.awareness.on('change', updatePresence)
    updatePresence()

    return () => provider.awareness.off('change', updatePresence)
  }, [provider])

  if (others.length === 0) return null

  return (
    <div className="flex items-center gap-1" title={`${others.length} other${others.length > 1 ? 's' : ''} editing`}>
      {others.slice(0, 5).map((user) => (
        <div
          key={user.id}
          className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold ring-2 ring-white"
          style={{ backgroundColor: user.color }}
          title={user.name}
        >
          {user.initials}
        </div>
      ))}
      {others.length > 5 && (
        <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-xs font-medium ring-2 ring-white">
          +{others.length - 5}
        </div>
      )}
    </div>
  )
}
