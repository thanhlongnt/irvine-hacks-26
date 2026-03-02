import { useState, useEffect, useRef } from 'react'
import { io } from 'socket.io-client'

const VIDEO_URL = 'http://10.52.254.95:4912/embed'
const VIDEO_TIMEOUT_MS = 10_000

const COLOR_META = {
  green:  { bg: '#052e16', border: '#16a34a', dot: '#4ade80', label: 'Green' },
  yellow: { bg: '#1c1a05', border: '#ca8a04', dot: '#fde047', label: 'Yellow' },
  red:    { bg: '#1c0505', border: '#dc2626', dot: '#f87171', label: 'Red' },
}

function formatTime(ts) {
  return new Date(ts * 1000).toLocaleTimeString([], {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

function elapsed(ts) {
  const secs = Math.floor(Date.now() / 1000 - ts)
  if (secs < 60) return `${secs}s ago`
  const mins = Math.floor(secs / 60)
  return `${mins}m ${secs % 60}s ago`
}

// ── Video player with loading / error states ──────────────────────────────────
function VideoFeed() {
  const [status, setStatus] = useState('loading') // 'loading' | 'ready' | 'error'
  const [key, setKey] = useState(0)
  const timerRef = useRef(null)

  useEffect(() => {
    setStatus('loading')
    timerRef.current = setTimeout(() => setStatus('error'), VIDEO_TIMEOUT_MS)
    return () => clearTimeout(timerRef.current)
  }, [key])

  const handleLoad = () => {
    clearTimeout(timerRef.current)
    setStatus('ready')
  }

  const retry = () => setKey((k) => k + 1)

  return (
    <div className="video-wrap">
      <iframe
        key={key}
        src={VIDEO_URL}
        title="Live camera feed"
        className={`video-frame ${status === 'ready' ? 'video-visible' : ''}`}
        onLoad={handleLoad}
        frameBorder="0"
        allowFullScreen
      />

      {status === 'loading' && (
        <div className="video-overlay">
          <div className="spinner" />
          <span className="overlay-text">Connecting to camera&hellip;</span>
        </div>
      )}

      {status === 'error' && (
        <div className="video-overlay">
          <div className="camera-err-icon">&#x1F4F7;</div>
          <span className="overlay-text">Camera feed unavailable</span>
          <button className="retry-btn" onClick={retry}>Retry</button>
        </div>
      )}
    </div>
  )
}

// ── Main app ──────────────────────────────────────────────────────────────────
export default function App() {
  const [connected, setConnected] = useState(false)
  const [fallTimestamp, setFallTimestamp] = useState(null)
  const [colors, setColors] = useState([])
  const [, forceUpdate] = useState(0)
  const socketRef = useRef(null)

  useEffect(() => {
    const socket = io('http://localhost:8081')
    socketRef.current = socket

    socket.on('connect', () => setConnected(true))
    socket.on('disconnect', () => setConnected(false))

    socket.on('fall_event', (data) => {
      setFallTimestamp(data.timestamp)
      setColors([])
    })

    socket.on('color_update', (data) => {
      setColors((prev) => [
        ...prev,
        { timestamp: data.timestamp, color: data.color, id: Date.now() },
      ])
    })

    socket.on('fall_acknowledged', () => {
      setFallTimestamp(null)
      setColors([])
    })

    return () => socket.disconnect()
  }, [])

  useEffect(() => {
    const id = setInterval(() => forceUpdate((n) => n + 1), 1000)
    return () => clearInterval(id)
  }, [])

  const handleAcknowledge = () => socketRef.current?.emit('acknowledge_fall')

  const hasFall = fallTimestamp !== null

  return (
    <div className="dashboard">

      {/* ── Header ── */}
      <header className="header">
        <div className="header-left">
          <span className="header-icon">&#x2B21;</span>
          <span className="header-title">Fall Detection Dashboard</span>
        </div>
        <div className={`conn-pill ${connected ? 'conn-on' : 'conn-off'}`}>
          <span className="conn-dot" />
          {connected ? 'Live' : 'Disconnected'}
        </div>
      </header>

      <main className="main">

        {/* ── Live video (only when fall active) ── */}
        {hasFall && (
          <section className="video-section">
            <div className="section-label">Live Camera</div>
            <VideoFeed />
          </section>
        )}

        {/* ── Status banner ── */}
        <section className={`status-card ${hasFall ? 'status-alert' : 'status-ok'}`}>
          {hasFall ? (
            <>
              <div className="status-icon alert-pulse">&#x26A0;</div>
              <div>
                <div className="status-label">Fall Detected</div>
                <div className="status-sub">
                  at {formatTime(fallTimestamp)} &middot; {elapsed(fallTimestamp)}
                </div>
              </div>
              <button className="ack-btn" onClick={handleAcknowledge}>
                Acknowledge
              </button>
            </>
          ) : (
            <>
              <div className="status-icon">&#x2713;</div>
              <div>
                <div className="status-label">All Clear</div>
                <div className="status-sub">No fall detected</div>
              </div>
            </>
          )}
        </section>

        {/* ── Stats row ── */}
        <div className="stats-row">
          <div className="stat-card">
            <div className="stat-value">{connected ? 'Online' : 'Offline'}</div>
            <div className="stat-label">Server Status</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{colors.length}</div>
            <div className="stat-label">Sensor Readings</div>
          </div>
          <div className="stat-card">
            <div className={`stat-value ${hasFall ? 'text-red' : 'text-green'}`}>
              {hasFall ? 'Active' : 'None'}
            </div>
            <div className="stat-label">Fall Alert</div>
          </div>
        </div>

        {/* ── Sensor log ── */}
        <section className="log-section">
          <div className="log-header">
            <span>Sensor Log</span>
            <span className="log-count">{colors.length} entries</span>
          </div>

          {colors.length === 0 ? (
            <div className="log-empty">No sensor readings yet</div>
          ) : (
            <ol className="log-list">
              {[...colors].reverse().map((entry, i) => {
                const meta = COLOR_META[entry.color] ?? {
                  bg: '#111', border: '#555', dot: '#999', label: entry.color,
                }
                return (
                  <li
                    key={entry.id}
                    className="log-item"
                    style={{ borderColor: meta.border, background: meta.bg }}
                  >
                    <span className="log-dot" style={{ background: meta.dot }} />
                    <span className="log-color" style={{ color: meta.dot }}>{meta.label}</span>
                    <span className="log-time">{formatTime(entry.timestamp)}</span>
                    {i === 0 && <span className="log-badge">latest</span>}
                  </li>
                )
              })}
            </ol>
          )}
        </section>

      </main>
    </div>
  )
}
