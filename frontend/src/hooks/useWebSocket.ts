import { useEffect } from 'react'
import { useStore, AuditEntry } from '../store/state'

export const useWebSocket = (path = '/ws/audit') => {
  const addEntry = useStore((s) => s.addEntry)

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const url = `${protocol}://${window.location.host}${path}`
    let ws: WebSocket

    const connect = () => {
      try {
        ws = new WebSocket(url)
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data) as AuditEntry
            if (!data.timestamp) data.timestamp = new Date().toLocaleTimeString()
            addEntry(data)
          } catch { /* ignore malformed frames */ }
        }
        ws.onerror = () => { /* suppress console noise when backend is offline */ }
      } catch { /* backend offline during frontend-only dev */ }
    }

    connect()
    return () => ws?.close()
  }, [path, addEntry])
}
