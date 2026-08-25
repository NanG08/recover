import { useEffect } from 'react'
import { useStore, AuditEntry } from '../store/state'

export const useWebSocket = (url: string) => {
  const addEntry = useStore((s) => s.addEntry)

  useEffect(() => {
    let ws: WebSocket
    try {
      ws = new WebSocket(url)
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as AuditEntry
          if (!data.timestamp) data.timestamp = new Date().toLocaleTimeString()
          addEntry(data)
        } catch { /* ignore malformed */ }
      }
    } catch { /* backend offline during dev */ }
    return () => ws?.close()
  }, [url, addEntry])
}
