import { useState, useEffect, useRef } from 'react'
import { io } from 'socket.io-client'

const MAX_DETECTIONS = 10
const VIDEO_PORT = 4912
const SOCKET_PORT = 7000

export default function VideoDetection() {
  const [boardHost, setBoardHost] = useState('192.168.12.133')
  const [inputHost, setInputHost] = useState('192.168.12.133')
  const [connected, setConnected] = useState(false)
  const [detections, setDetections] = useState([])
  const [confidence, setConfidence] = useState(0.5)
  const socketRef = useRef(null)

  const videoUrl = `http://${boardHost}:${VIDEO_PORT}/embed`

  useEffect(() => {
    if (socketRef.current) {
      socketRef.current.disconnect()
    }

    const socket = io(`http://${boardHost}:${SOCKET_PORT}`, {
      transports: ['websocket'],
    })
    socketRef.current = socket

    socket.on('connect', () => setConnected(true))
    socket.on('disconnect', () => setConnected(false))
    socket.on('detection', (msg) => {
      setDetections((prev) =>
        [{ ...msg, id: Date.now() }, ...prev].slice(0, MAX_DETECTIONS)
      )
    })

    return () => socket.disconnect()
  }, [boardHost])

  const applyHost = () => setBoardHost(inputHost.trim())

  const handleConfidenceChange = (e) => {
    const val = parseFloat(e.target.value)
    setConfidence(val)
    socketRef.current?.emit('override_th', val)
  }

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: '900px', margin: '2rem auto', padding: '0 1rem' }}>
      <h2>Object Detection — Live Feed</h2>

      {/* Board host input */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', alignItems: 'center' }}>
        <label style={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Board host:</label>
        <input
          value={inputHost}
          onChange={(e) => setInputHost(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && applyHost()}
          style={{ flex: 1, padding: '0.35rem 0.6rem', borderRadius: '4px', border: '1px solid #ccc' }}
          placeholder="e.g. arduino.local or 192.168.1.10"
        />
        <button
          onClick={applyHost}
          style={{ padding: '0.35rem 0.9rem', borderRadius: '4px', cursor: 'pointer' }}
        >
          Connect
        </button>
        <span style={{ color: connected ? '#4ade80' : '#f87171', fontWeight: 'bold' }}>
          {connected ? '● Connected' : '○ Disconnected'}
        </span>
      </div>

      <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
        {/* Video feed */}
        <div style={{ flex: '1 1 auto' }}>
          <iframe
            key={boardHost}
            src={videoUrl}
            title="Arduino video stream"
            width="100%"
            height="480"
            frameBorder="0"
            style={{ borderRadius: '6px', background: '#111', display: 'block' }}
          />
        </div>

        {/* Right panel */}
        <div style={{ flex: '0 0 240px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Confidence slider */}
          <div style={{
            padding: '1rem',
            border: '1px solid #e5e7eb',
            borderRadius: '6px',
            background: '#f9fafb',
          }}>
            <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>
              Confidence threshold: {confidence.toFixed(2)}
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={confidence}
              onChange={handleConfidenceChange}
              style={{ width: '100%' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#6b7280' }}>
              <span>0</span><span>1</span>
            </div>
          </div>

          {/* Detection feed */}
          <div style={{
            padding: '1rem',
            border: '1px solid #e5e7eb',
            borderRadius: '6px',
            background: '#f9fafb',
            minHeight: '200px',
          }}>
            <h3 style={{ margin: '0 0 0.75rem' }}>Recent detections</h3>
            {detections.length === 0 ? (
              <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>Waiting for detections…</p>
            ) : (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {detections.map((d) => (
                  <li
                    key={d.id}
                    style={{
                      padding: '0.35rem 0.6rem',
                      borderRadius: '4px',
                      background: '#fff',
                      border: '1px solid #e5e7eb',
                      fontSize: '0.85rem',
                    }}
                  >
                    <span style={{ fontWeight: 'bold' }}>{Math.round(d.confidence * 100)}%</span>
                    {' — '}
                    {d.content}
                    <div style={{ fontSize: '0.7rem', color: '#9ca3af', marginTop: '1px' }}>
                      {new Date(d.timestamp).toLocaleTimeString()}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
