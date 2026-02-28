import { useState, useEffect } from 'react'
import { io } from 'socket.io-client'

export default function App() {
  const [connected, setConnected] = useState(false)
  const [alerts, setAlerts] = useState([])

  useEffect(() => {
    const socket = io('http://localhost:8081')

    socket.on('connect', () => {
      console.log('[socket] Connected:', socket.id)
      setConnected(true)
    })

    socket.on('disconnect', (reason) => {
      console.log('[socket] Disconnected:', reason)
      setConnected(false)
    })

    socket.on('fall_detected', (data) => {
      console.log('[socket] fall_detected received:', data)
      const time = new Date(data.timestamp * 1000).toLocaleTimeString()
      setAlerts((prev) => [{ time, message: data.message, id: Date.now() }, ...prev])
    })

    return () => {
      socket.disconnect()
    }
  }, [])

  return (
    <div>
      <h1>Fall Detection Monitor</h1>
      <p style={{ color: connected ? '#4ade80' : '#f87171' }}>
        {connected ? 'Connected' : 'Disconnected'}
      </p>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {alerts.map((a) => (
          <li key={a.id} style={{ marginBottom: '0.5rem' }}>
            [{a.time}] {a.message}
          </li>
        ))}
      </ul>
    </div>
  )
}
