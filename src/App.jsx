import { useState, useRef } from 'react'

// ─── CONFIG ───────────────────────────────────────────────────────────────
const SHEET_ID = import.meta.env.VITE_SHEET_ID || 'YOUR_SHEET_ID_HERE'
const API_KEY  = import.meta.env.VITE_API_KEY  || 'YOUR_API_KEY_HERE'
const BASE     = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values`

const STAGE_ORDER = [
  'Enrolled', 'Documents Submitted', 'Training In Progress',
  'Exam Registered', 'Exam Completed', 'Result Awaited',
  'Passed', 'Failed', 'Completed', 'Suspended', 'Withdrawn',
]
const TERMINAL_STAGES = ['Passed', 'Failed', 'Completed', 'Suspended', 'Withdrawn']

// ─── API ──────────────────────────────────────────────────────────────────

async function fetchRange(range) {
  const url = `${BASE}/${encodeURIComponent(range)}?key=${API_KEY}`
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch data. Please try again.')
  return (await res.json()).values || []
}

async function lookupStudent(rawId) {
  const id        = rawId.trim().toUpperCase()
  const indexRows = await fetchRange('Students Index!A:L')

  let studentRow = null
  for (let i = 1; i < indexRows.length; i++) {
    if ((indexRows[i][1] || '').trim().toUpperCase() === id) {
      studentRow = indexRows[i]; break
    }
  }
  if (!studentRow) throw new Error(`Student ID "${id}" not found. Please check and try again.`)

  const studentName  = studentRow[2]  || ''
  const courseCode   = studentRow[3]  || ''
  const courseName   = studentRow[4]  || ''
  const currentStage = studentRow[10] || ''
  const status       = studentRow[11] || 'Active'
  const sheetName    = `${id} | ${studentName.trim().toUpperCase()}`

  let stageHistory = []
  try {
    const sheetRows = await fetchRange(`'${sheetName}'!A10:H25`)
    for (const row of sheetRows) {
      const cell = (row[0] || '').trim()
      if (cell === 'BILLING DETAILS' || cell === 'S.No') break
      if (!cell || cell === 'Stage') continue
      stageHistory.push({ stage: cell, date: row[4] || '', notes: row[5] || '' })
    }
  } catch {
    if (currentStage) stageHistory = [{ stage: currentStage, date: '', notes: '' }]
  }

  return { id, name: studentName, courseCode, courseName, currentStage, status, stageHistory }
}

// ─── HELPERS ──────────────────────────────────────────────────────────────

function stageProgress(stage) {
  const nonTerminal = STAGE_ORDER.filter(s => !TERMINAL_STAGES.includes(s))
  const idx = nonTerminal.indexOf(stage)
  if (idx === -1) return TERMINAL_STAGES.includes(stage) ? 100 : 0
  return Math.round(((idx + 1) / nonTerminal.length) * 100)
}

function stageColor(stage) {
  if (['Passed', 'Completed'].includes(stage))              return { bg: '#d4edda', text: '#155724', dot: '#28a745' }
  if (['Failed', 'Suspended', 'Withdrawn'].includes(stage)) return { bg: '#f8d7da', text: '#721c24', dot: '#dc3545' }
  return { bg: 'rgba(201,168,76,.2)', text: '#c9a84c', dot: '#c9a84c' }
}

// ─── STYLES (shared, defined once) ────────────────────────────────────────

const card = {
  background: 'rgba(255,255,255,0.12)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid rgba(255,255,255,0.2)',
  borderRadius: 14,
  padding: 'clamp(14px,3vw,22px)',
  marginBottom: 14,
}

// ─── SEARCH SCREEN ────────────────────────────────────────────────────────

function SearchScreen({ onSearch, loading, error }) {
  const [value, setValue] = useState('')
  const inputRef = useRef()

  const handleSubmit = (e) => {
    e.preventDefault()
    if (value.trim()) onSearch(value.trim())
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      flex: 1, padding: 'clamp(32px,6vw,60px) clamp(16px,4vw,32px)',
      animation: 'fadeUp .5s ease both',
    }}>

      <h2 style={{
        fontFamily: 'Rajdhani, sans-serif',
        fontSize: 'clamp(24px,5vw,36px)',
        fontWeight: 700, color: '#ffffff',
        letterSpacing: 1, textAlign: 'center', marginBottom: 8,
        textShadow: '0 2px 8px rgba(0,0,0,.2)',
      }}>
        Track Your Progress
      </h2>

      <p style={{
        color: 'rgba(255,255,255,.75)',
        fontSize: 'clamp(13px,2vw,15px)',
        textAlign: 'center', maxWidth: 340,
        marginBottom: 'clamp(24px,5vw,36px)',
        lineHeight: 1.6,
      }}>
        Enter your Student ID to view your current stage and full progress history.
      </p>

      <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: 440 }}>
        <div style={{
          display: 'flex',
          background: 'rgba(255,255,255,0.15)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          border: '1.5px solid rgba(255,255,255,0.3)',
          borderRadius: 10, overflow: 'hidden',
          boxShadow: '0 4px 24px rgba(0,0,0,.15)',
        }}>
          <input
            ref={inputRef}
            value={value}
            onChange={e => setValue(e.target.value.toUpperCase())}
            placeholder="e.g. SGA2601DGCA"
            disabled={loading}
            style={{
              flex: 1, minWidth: 0,
              padding: 'clamp(12px,2.5vw,15px) clamp(12px,3vw,18px)',
              background: 'transparent', border: 'none', outline: 'none',
              color: '#ffffff', fontSize: 'clamp(13px,2.5vw,15px)',
              fontFamily: 'Rajdhani, sans-serif', fontWeight: 600,
              letterSpacing: 1,
            }}
          />
          <button
            type="submit"
            disabled={loading || !value.trim()}
            style={{
              padding: 'clamp(12px,2.5vw,15px) clamp(16px,3vw,24px)',
              background: 'linear-gradient(135deg, #c9a84c, #e2c97e)',
              border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
              color: '#1a1a1a', fontWeight: 700,
              fontFamily: 'Rajdhani, sans-serif',
              fontSize: 'clamp(12px,2vw,14px)',
              letterSpacing: 1,
              display: 'flex', alignItems: 'center', gap: 6,
              whiteSpace: 'nowrap', flexShrink: 0,
              transition: 'opacity .2s',
              opacity: loading || !value.trim() ? .6 : 1,
            }}
          >
            {loading ? (
              <svg width="16" height="16" viewBox="0 0 24 24" style={{ animation: 'spin 1s linear infinite' }}>
                <circle cx="12" cy="12" r="10" stroke="rgba(0,0,0,.2)" strokeWidth="3" fill="none"/>
                <path d="M12 2a10 10 0 0 1 10 10" stroke="#1a1a1a" strokeWidth="3" fill="none" strokeLinecap="round"/>
              </svg>
            ) : (
              <>SEARCH
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </>
            )}
          </button>
        </div>

        {error && (
          <div style={{
            marginTop: 12, padding: '10px 14px',
            background: 'rgba(220,53,69,.2)',
            border: '1px solid rgba(220,53,69,.4)',
            borderRadius: 8, color: '#ffcdd2',
            fontSize: 'clamp(12px,2vw,13px)',
            animation: 'fadeUp .3s ease',
          }}>
            {error}
          </div>
        )}
      </form>
    </div>
  )
}

// ─── STAGE TIMELINE ───────────────────────────────────────────────────────

function StageTimeline({ history }) {
  return (
    <div style={{ position: 'relative', paddingLeft: 26 }}>
      {/* Vertical line */}
      <div style={{
        position: 'absolute', left: 7, top: 8,
        width: 1, height: 'calc(100% - 16px)',
        background: 'linear-gradient(to bottom, rgba(255,255,255,.4), rgba(255,255,255,.05))',
      }} />

      {history.map((item, i) => {
        const isLatest = i === history.length - 1
        const c = stageColor(item.stage)
        return (
          <div key={i} style={{
            position: 'relative',
            marginBottom: i < history.length - 1 ? 14 : 0,
            animation: 'fadeUp .4s ease both',
            animationDelay: `${i * 0.07}s`,
          }}>
            {/* Dot */}
            <div style={{
              position: 'absolute', left: -22, top: 6,
              width: 12, height: 12, borderRadius: '50%',
              background: isLatest ? c.dot : 'rgba(255,255,255,.3)',
              border: `2px solid ${isLatest ? c.dot : 'rgba(255,255,255,.4)'}`,
              boxShadow: isLatest ? `0 0 10px ${c.dot}` : 'none',
            }} />

            <div style={{
              background: isLatest
                ? 'rgba(255,255,255,0.2)'
                : 'rgba(255,255,255,0.08)',
              border: `1px solid ${isLatest ? 'rgba(255,255,255,.35)' : 'rgba(255,255,255,.12)'}`,
              borderRadius: 10,
              padding: 'clamp(10px,2vw,13px) clamp(12px,2.5vw,16px)',
            }}>
              <div style={{
                display: 'flex', alignItems: 'flex-start',
                justifyContent: 'space-between', flexWrap: 'wrap', gap: 4,
              }}>
                <span style={{
                  fontFamily: 'Rajdhani, sans-serif',
                  fontSize: 'clamp(13px,2.5vw,15px)',
                  fontWeight: 700,
                  color: isLatest ? '#ffffff' : 'rgba(255,255,255,.65)',
                  letterSpacing: .5,
                  display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 7,
                }}>
                  {item.stage}
                  {isLatest && (
                    <span style={{
                      fontSize: 9,
                      background: 'rgba(201,168,76,.3)',
                      color: '#e2c97e',
                      padding: '2px 8px', borderRadius: 20,
                      fontWeight: 700, letterSpacing: 1,
                      border: '1px solid rgba(201,168,76,.4)',
                    }}>
                      CURRENT
                    </span>
                  )}
                </span>
                {item.date && (
                  <span style={{
                    fontSize: 11,
                    color: 'rgba(255,255,255,.5)',
                    whiteSpace: 'nowrap',
                  }}>
                    {item.date}
                  </span>
                )}
              </div>
              {item.notes && (
                <p style={{
                  marginTop: 4, fontSize: 12,
                  color: 'rgba(255,255,255,.55)',
                  lineHeight: 1.5, fontStyle: 'italic',
                }}>
                  {item.notes}
                </p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── RESULT SCREEN ────────────────────────────────────────────────────────

function ResultScreen({ student, onBack }) {
  const progress   = stageProgress(student.currentStage)
  const c          = stageColor(student.currentStage)
  const isTerminal = TERMINAL_STAGES.includes(student.currentStage)

  return (
    <div style={{
      flex: 1,
      padding: 'clamp(16px,3vw,24px) clamp(12px,3vw,20px) clamp(24px,5vw,40px)',
      maxWidth: 640, margin: '0 auto', width: '100%',
      animation: 'fadeUp .4s ease',
    }}>

      {/* Back button */}
      <button
        onClick={onBack}
        style={{
          display: 'flex', alignItems: 'center', gap: 7,
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'rgba(255,255,255,.6)', fontSize: 13,
          marginBottom: 'clamp(14px,3vw,22px)',
          padding: '6px 0', transition: 'color .2s',
          fontFamily: 'DM Sans, sans-serif',
        }}
        onMouseEnter={e => e.currentTarget.style.color = '#e2c97e'}
        onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,.6)'}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 12H5M12 5l-7 7 7 7"/>
        </svg>
        Back to Search
      </button>

      {/* Student card */}
      <div style={card}>
        <div style={{
          display: 'flex', alignItems: 'flex-start',
          justifyContent: 'space-between', flexWrap: 'wrap', gap: 10,
        }}>
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontSize: 10, color: 'rgba(255,255,255,.6)',
              letterSpacing: 2, textTransform: 'uppercase', marginBottom: 3,
            }}>
              Student
            </div>
            <div style={{
              fontFamily: 'Rajdhani, sans-serif',
              fontSize: 'clamp(18px,4vw,24px)',
              fontWeight: 700, color: '#ffffff',
              lineHeight: 1.1, wordBreak: 'break-word',
            }}>
              {student.name}
            </div>
            <div style={{
              fontSize: 'clamp(11px,2vw,12px)',
              color: 'rgba(255,255,255,.6)', marginTop: 4,
            }}>
              {student.id} &nbsp;·&nbsp; {student.courseCode} — {student.courseName}
            </div>
          </div>

          {/* Status badge */}
          <div style={{
            padding: '5px 14px', borderRadius: 30, flexShrink: 0,
            background: 'rgba(255,255,255,.15)',
            border: '1px solid rgba(255,255,255,.25)',
            color: '#ffffff', fontSize: 11, fontWeight: 700,
            fontFamily: 'Rajdhani, sans-serif', letterSpacing: 1,
          }}>
            {student.status}
          </div>
        </div>

        {/* Progress bar */}
        {!isTerminal && (
          <div style={{ marginTop: 16 }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              fontSize: 11, color: 'rgba(255,255,255,.6)', marginBottom: 6,
            }}>
              <span>Progress</span>
              <span style={{ color: '#e2c97e' }}>{progress}%</span>
            </div>
            <div style={{
              height: 5, borderRadius: 5,
              background: 'rgba(255,255,255,.15)', overflow: 'hidden',
            }}>
              <div style={{
                height: '100%', borderRadius: 5,
                width: `${progress}%`,
                background: 'linear-gradient(90deg, #c9a84c, #e2c97e)',
                boxShadow: '0 0 10px rgba(201,168,76,.6)',
                transition: 'width 1s cubic-bezier(.4,0,.2,1)',
              }} />
            </div>
          </div>
        )}

        {/* Current stage */}
        <div style={{
          marginTop: 14,
          padding: 'clamp(10px,2vw,13px) clamp(12px,2.5vw,16px)',
          background: 'rgba(255,255,255,.1)',
          border: '1px solid rgba(255,255,255,.2)',
          borderRadius: 10,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{
            width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
            background: c.dot,
            boxShadow: `0 0 8px ${c.dot}`,
          }} />
          <div>
            <div style={{
              fontSize: 9, color: 'rgba(255,255,255,.55)',
              letterSpacing: 2, textTransform: 'uppercase',
            }}>
              Current Stage
            </div>
            <div style={{
              fontFamily: 'Rajdhani, sans-serif',
              fontSize: 'clamp(15px,3vw,18px)',
              fontWeight: 700, color: '#ffffff', marginTop: 2,
            }}>
              {student.currentStage || 'Not updated'}
            </div>
          </div>
        </div>
      </div>

      {/* Stage history */}
      <div style={card}>
        <div style={{
          fontFamily: 'Rajdhani, sans-serif',
          fontSize: 11, fontWeight: 700,
          color: 'rgba(255,255,255,.55)',
          letterSpacing: 2, textTransform: 'uppercase',
          marginBottom: 16,
        }}>
          Stage History
        </div>
        {student.stageHistory?.length > 0 ? (
          <StageTimeline history={student.stageHistory} />
        ) : (
          <div style={{
            textAlign: 'center', padding: '20px 0',
            color: 'rgba(255,255,255,.35)', fontSize: 13,
          }}>
            No stage history available yet.
          </div>
        )}
      </div>

      {/* Contact */}
      <p style={{
        textAlign: 'center', marginTop: 16,
        fontSize: 11, color: 'rgba(255,255,255,.35)', lineHeight: 1.7,
      }}>
        For queries — starglideraviation@gmail.com &nbsp;|&nbsp; +91 8122279998
      </p>
    </div>
  )
}

// ─── ROOT ─────────────────────────────────────────────────────────────────

export default function App() {
  const [screen,  setScreen]  = useState('search')
  const [student, setStudent] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const handleSearch = async (id) => {
    setLoading(true); setError('')
    try {
      const data = await lookupStudent(id)
      setStudent(data); setScreen('result')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    setScreen('search'); setStudent(null); setError('')
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex', flexDirection: 'column',
      background: 'transparent',
      position: 'relative',
    }}>
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {screen === 'search' && (
          <SearchScreen onSearch={handleSearch} loading={loading} error={error} />
        )}
        {screen === 'result' && student && (
          <ResultScreen student={student} onBack={handleBack} />
        )}
      </main>
    </div>
  )
}