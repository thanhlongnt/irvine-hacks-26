import { useState, useEffect, useRef } from 'react'
import { io } from 'socket.io-client'

const COLOR_STYLES = {
  green:  { background: '#4ade80', text: '#14532d' },
  yellow: { background: '#fde047', text: '#713f12' },
  red:    { background: '#f87171', text: '#7f1d1d' },
}

export default function App() {
  const [connected, setConnected] = useState(false)
  const [fallTime, setFallTime] = useState(null)
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

    socket.on('fall_event', (data) => {
      const time = new Date(data.timestamp * 1000).toLocaleTimeString()
      setFallTime(time)
      setColors([])
    })

    socket.on('color_update', (data) => {
      const time = new Date(data.timestamp * 1000).toLocaleTimeString()
      setColors((prev) => [...prev, { time, color: data.color, id: Date.now() }])
    })

    socket.on('fall_acknowledged', () => {
      setFallTime(null)
      setColors([])
    })

    return () => {
      socket.disconnect()
    }
  }, [])

  const handleAcknowledge = () => socketRef.current?.emit('acknowledge_fall')

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: '480px', margin: '2rem auto', padding: '0 1rem' }}>
      <h1>Fall Detection Monitor</h1>
      <p style={{ color: connected ? '#4ade80' : '#f87171' }}>
        {connected ? 'Connected' : 'Disconnected'}
      </p>

      {fallTime ? (
        <div style={{
          padding: '1rem',
          marginBottom: '1rem',
          borderRadius: '6px',
          background: '#fef2f2',
          border: '2px solid #f87171',
          color: '#7f1d1d',
        }}>
          <strong>Fall detected at {fallTime}</strong>
          <div style={{ marginTop: '0.75rem' }}>
            <button onClick={handleAcknowledge}>Acknowledge</button>
          </div>
        </div>
      ) : (
        <p style={{ color: '#6b7280' }}>Waiting for fall event...</p>
      )}

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
