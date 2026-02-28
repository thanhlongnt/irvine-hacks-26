import { useState, useEffect, useRef } from 'react'
import { io } from 'socket.io-client'

const COLOR_STYLES = {
  red: { background: '#f87171', text: '#7f1d1d' },
  yellow: { background: '#fde047', text: '#713f12' },
  green: { background: '#4ade80', text: '#14532d' },
}

export default function App() {
  const [connected, setConnected] = useState(false)
  const [streaming, setStreaming] = useState(false)
  const [colors, setColors] = useState([])
  const socketRef = useRef(null)

  useEffect(() => {
    const socket = io('http://localhost:8081')
    socketRef.current = socket

    socket.on('connect', () => {
      console.log('[socket] Connected:', socket.id)
      setConnected(true)
    })

    socket.on('disconnect', (reason) => {
      console.log('[socket] Disconnected:', reason)
      setConnected(false)
    })

    socket.on('stream_status', (data) => {
      setStreaming(data.streaming)
    })

    socket.on('color_update', (data) => {
      console.log('[socket] color_update received:', data)
      const time = new Date(data.timestamp * 1000).toLocaleTimeString()
      setColors((prev) => [{ time, color: data.color, id: Date.now() }, ...prev])
    })

    return () => {
      socket.disconnect()
    }
  }, [])

  const handleStart = () => socketRef.current?.emit('start_stream')
  const handleStop = () => socketRef.current?.emit('stop_stream')

  return (
    <div>
      <h1>Color Monitor</h1>
      <p style={{ color: connected ? '#4ade80' : '#f87171' }}>
        {connected ? 'Connected' : 'Disconnected'}
      </p>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <button onClick={handleStart} disabled={!connected || streaming}>
          Start Streaming
        </button>
        <button onClick={handleStop} disabled={!connected || !streaming}>
          Stop Streaming
        </button>
      </div>
      <ol style={{ padding: '0 1rem' }}>
        {colors.map((entry) => {
          const style = COLOR_STYLES[entry.color] ?? { background: '#e5e7eb', text: '#111' }
          return (
            <li
              key={entry.id}
              style={{
                marginBottom: '0.5rem',
                padding: '0.4rem 0.8rem',
                borderRadius: '4px',
                background: style.background,
                color: style.text,
                fontWeight: 'bold',
              }}
            >
              [{entry.time}] {entry.color}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
