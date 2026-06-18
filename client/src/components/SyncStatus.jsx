/**
 * Shows WebSocket connection state in the editor toolbar.
 * 'connecting' → spinner, 'connected' → green dot, 'disconnected' → yellow warning
 */
export default function SyncStatus({ status }) {
  if (status === 'connected') {
    return (
      <div className="flex items-center gap-1.5 text-xs text-emerald-600">
        <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
        Synced
      </div>
    )
  }
  if (status === 'disconnected') {
    return (
      <div className="flex items-center gap-1.5 text-xs text-amber-600">
        <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
        Reconnecting…
      </div>
    )
  }
  // connecting
  return (
    <div className="flex items-center gap-1.5 text-xs text-gray-400">
      <span className="w-2 h-2 rounded-full bg-gray-300 inline-block animate-pulse" />
      Connecting…
    </div>
  )
}
