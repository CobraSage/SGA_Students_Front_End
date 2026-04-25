import { useState, useEffect, useRef } from 'react'

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
  const id       = rawId.trim().toUpperCase()
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
  if (['Passed', 'Completed'].includes(stage))             return '#2ecc71'
  if (['Failed', 'Suspended', 'Withdrawn'].includes(stage)) return '#e74c3c'
  return '#c9a84c'
}

// ─── SEARCH SCREEN ────────────────────────────────────────────────────────

function SearchScreen({ onSearch, loading, error }) {
  const [value, setValue] = useState('')
  const inputRef = useRef()

  useEffect(() => { inputRef.current?.focus() }, [])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (value.trim()) onSearch(value.trim())
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', flex: 1,
      padding: 'clamp(24px, 5vw, 48px) clamp(16px, 4vw, 32px)',
      animation: 'fadeUp .5s ease both',
    }}>

      {/* Icon ring */}
      <div style={{
        width: 'clamp(80px, 15vw, 110px)',
        height: 'clamp(80px, 15vw, 110px)',
        borderRadius: '50%',
        border: '1px solid rgba(201,168,76,.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 'clamp(20px, 4vw, 32px)', position: 'relative',
      }}>
        <div style={{
          position: 'absolute', inset: -8, borderRadius: '50%',
          border: '1px solid rgba(201,168,76,.08)',
        }} />
        <svg
          width="clamp(32px, 6vw, 44px)" height="clamp(32px, 6vw, 44px)"
          viewBox="0 0 24 24" fill="none" stroke="#c9a84c" strokeWidth="1.5"
        >
          <path d="M12 2L2 7l10 5 10-5-10-5z"/>
          <path d="M2 17l10 5 10-5"/>
          <path d="M2 12l10 5 10-5"/>
        </svg>
      </div>

      <h1 style={{
        fontFamily: 'Rajdhani, sans-serif',
        fontSize: 'clamp(22px, 5vw, 34px)',
        fontWeight: 700, color: '#f0f4ff',
        letterSpacing: 1, textAlign: 'center', marginBottom: 8,
      }}>
        Track Your Progress
      </h1>

      <p style={{
        color: '#6b7a99', fontSize: 'clamp(13px, 2vw, 15px)',
        textAlign: 'center', maxWidth: 320,
        marginBottom: 'clamp(24px, 5vw, 36px)', lineHeight: 1.6,
      }}>
        Enter your Student ID to view your current stage and full progress history.
      </p>

      <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: 420 }}>
        <div style={{
          display: 'flex',
          background: 'rgba(14,22,40,.85)',
          border: '1.5px solid rgba(201,168,76,.25)',
          borderRadius: 10, overflow: 'hidden',
          boxShadow: '0 0 32px rgba(201,168,76,.06)',
        }}>
          <input
            ref={inputRef}
            value={value}
            onChange={e => setValue(e.target.value.toUpperCase())}
            placeholder="e.g. SGA2601DGCA"
            disabled={loading}
            style={{
              flex: 1,
              padding: 'clamp(11px, 2.5vw, 14px) clamp(12px, 3vw, 18px)',
              background: 'transparent', border: 'none', outline: 'none',
              color: '#f0f4ff', fontSize: 'clamp(13px, 2.5vw, 15px)',
              fontFamily: 'Rajdhani, sans-serif', fontWeight: 600, letterSpacing: 1,
              minWidth: 0, // prevents overflow on mobile
            }}
          />
          <button
            type="submit"
            disabled={loading || !value.trim()}
            style={{
              padding: 'clamp(11px, 2.5vw, 14px) clamp(14px, 3vw, 22px)',
              background: loading ? 'rgba(201,168,76,.3)' : 'linear-gradient(135deg, #c9a84c, #e2c97e)',
              border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
              color: '#080d1a', fontWeight: 700,
              fontFamily: 'Rajdhani, sans-serif',
              fontSize: 'clamp(12px, 2vw, 14px)', letterSpacing: 1,
              display: 'flex', alignItems: 'center', gap: 6,
              whiteSpace: 'nowrap', flexShrink: 0,
            }}
          >
            {loading ? (
              <svg width="16" height="16" viewBox="0 0 24 24" style={{ animation: 'spin 1s linear infinite' }}>
                <circle cx="12" cy="12" r="10" stroke="rgba(0,0,0,.3)" strokeWidth="3" fill="none"/>
                <path d="M12 2a10 10 0 0 1 10 10" stroke="#080d1a" strokeWidth="3" fill="none" strokeLinecap="round"/>
              </svg>
            ) : (
              <>
                SEARCH
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
            background: 'rgba(231,76,60,.12)', border: '1px solid rgba(231,76,60,.3)',
            borderRadius: 8, color: '#e74c3c',
            fontSize: 'clamp(12px, 2vw, 13px)',
            animation: 'fadeUp .3s ease',
          }}>
            {error}
          </div>
        )}
      </form>

      <div style={{ marginTop: 24, fontSize: 11, color: '#3a4a66', letterSpacing: 1 }}>
        www.starglidergroup.com
      </div>
    </div>
  )
}

// ─── STAGE TIMELINE ───────────────────────────────────────────────────────

function StageTimeline({ history }) {
  return (
    <div style={{ position: 'relative', paddingLeft: 24 }}>
      <div style={{
        position: 'absolute', left: 6, top: 8,
        width: 1, height: 'calc(100% - 16px)',
        background: 'linear-gradient(to bottom, rgba(201,168,76,.5), rgba(201,168,76,.05))',
      }} />
      {history.map((item, i) => {
        const isLatest = i === history.length - 1
        const color = stageColor(item.stage)
        return (
          <div key={i} style={{
            position: 'relative',
            marginBottom: i < history.length - 1 ? 16 : 0,
            animation: 'fadeUp .4s ease both',
            animationDelay: `${i * 0.07}s`,
          }}>
            {/* Dot */}
            <div style={{
              position: 'absolute', left: -20, top: 5,
              width: 12, height: 12, borderRadius: '50%',
              background: isLatest ? color : 'transparent',
              border: `2px solid ${color}`,
              boxShadow: isLatest ? `0 0 8px ${color}88` : 'none',
            }} />

            <div style={{
              background: isLatest
                ? `linear-gradient(135deg, rgba(201,168,76,.08), rgba(201,168,76,.03))`
                : 'rgba(14,22,40,.5)',
              border: `1px solid ${isLatest ? 'rgba(201,168,76,.25)' : 'rgba(255,255,255,.05)'}`,
              borderRadius: 10,
              padding: 'clamp(10px, 2vw, 13px) clamp(12px, 3vw, 16px)',
            }}>
              <div style={{
                display: 'flex', alignItems: 'flex-start',
                justifyContent: 'space-between', flexWrap: 'wrap', gap: 4,
              }}>
                <span style={{
                  fontFamily: 'Rajdhani, sans-serif',
                  fontSize: 'clamp(13px, 2.5vw, 15px)',
                  fontWeight: 700,
                  color: isLatest ? color : '#a0aec0',
                  letterSpacing: .5,
                  display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6,
                }}>
                  {item.stage}
                  {isLatest && (
                    <span style={{
                      fontSize: 9, background: `${color}22`, color,
                      padding: '2px 7px', borderRadius: 20,
                      fontWeight: 600, letterSpacing: 1,
                    }}>
                      CURRENT
                    </span>
                  )}
                </span>
                {item.date && (
                  <span style={{ fontSize: 11, color: '#6b7a99', whiteSpace: 'nowrap' }}>
                    {item.date}
                  </span>
                )}
              </div>
              {item.notes && (
                <p style={{ marginTop: 4, fontSize: 12, color: '#7a8aaa', lineHeight: 1.5 }}>
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
  const color      = stageColor(student.currentStage)
  const isTerminal = TERMINAL_STAGES.includes(student.currentStage)

  return (
    <div style={{
      flex: 1,
      padding: 'clamp(16px, 3vw, 24px) clamp(12px, 3vw, 20px) clamp(24px, 5vw, 40px)',
      maxWidth: 640, margin: '0 auto', width: '100%',
      animation: 'fadeUp .4s ease',
    }}>

      {/* Back */}
      <button
        onClick={onBack}
        style={{
          display: 'flex', alignItems: 'center', gap: 7,
          background: 'none', border: 'none', cursor: 'pointer',
          color: '#6b7a99', fontSize: 13,
          marginBottom: 'clamp(16px, 3vw, 24px)',
          padding: '6px 0', transition: 'color .2s',
        }}
        onMouseEnter={e => e.currentTarget.style.color = '#c9a84c'}
        onMouseLeave={e => e.currentTarget.style.color = '#6b7a99'}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 12H5M12 5l-7 7 7 7"/>
        </svg>
        Back to Search
      </button>

      {/* Student card */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(201,168,76,.1), rgba(201,168,76,.03))',
        border: '1px solid rgba(201,168,76,.22)',
        borderRadius: 14,
        padding: 'clamp(14px, 3vw, 20px) clamp(14px, 3vw, 22px)',
        marginBottom: 16,
      }}>
        {/* Name + badge */}
        <div style={{
          display: 'flex', alignItems: 'flex-start',
          justifyContent: 'space-between', flexWrap: 'wrap', gap: 10,
          marginBottom: 4,
        }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 10, color: '#6b7a99', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 3 }}>
              Student
            </div>
            <div style={{
              fontFamily: 'Rajdhani, sans-serif',
              fontSize: 'clamp(18px, 4vw, 24px)',
              fontWeight: 700, color: '#f0f4ff', lineHeight: 1.1,
              wordBreak: 'break-word',
            }}>
              {student.name}
            </div>
            <div style={{
              fontSize: 'clamp(11px, 2vw, 12px)',
              color: '#6b7a99', marginTop: 4,
              wordBreak: 'break-word',
            }}>
              {student.id} &nbsp;·&nbsp; {student.courseCode} — {student.courseName}
            </div>
          </div>
          <div style={{
            padding: '5px 12px', borderRadius: 30,
            background: `${color}18`, border: `1px solid ${color}44`,
            color, fontSize: 11, fontWeight: 700,
            fontFamily: 'Rajdhani, sans-serif', letterSpacing: 1,
            whiteSpace: 'nowrap', flexShrink: 0,
          }}>
            {student.status}
          </div>
        </div>

        {/* Progress bar */}
        {!isTerminal && (
          <div style={{ marginTop: 16 }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              fontSize: 11, color: '#6b7a99', marginBottom: 5,
            }}>
              <span>Progress</span>
              <span style={{ color: '#c9a84c' }}>{progress}%</span>
            </div>
            <div style={{
              height: 4, borderRadius: 4,
              background: 'rgba(255,255,255,.06)', overflow: 'hidden',
            }}>
              <div style={{
                height: '100%', borderRadius: 4,
                width: `${progress}%`,
                background: 'linear-gradient(90deg, #c9a84c, #e2c97e)',
                boxShadow: '0 0 8px rgba(201,168,76,.5)',
                transition: 'width 1s cubic-bezier(.4,0,.2,1)',
              }} />
            </div>
          </div>
        )}

        {/* Current stage */}
        <div style={{
          marginTop: 14,
          padding: 'clamp(10px, 2vw, 12px) clamp(12px, 3vw, 16px)',
          background: `${color}0f`,
          border: `1px solid ${color}33`,
          borderRadius: 10,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{
            width: 9, height: 9, borderRadius: '50%',
            background: color, boxShadow: `0 0 7px ${color}`,
            flexShrink: 0,
          }} />
          <div>
            <div style={{ fontSize: 9, color: '#6b7a99', letterSpacing: 2, textTransform: 'uppercase' }}>
              Current Stage
            </div>
            <div style={{
              fontFamily: 'Rajdhani, sans-serif',
              fontSize: 'clamp(15px, 3vw, 18px)',
              fontWeight: 700, color, marginTop: 2,
            }}>
              {student.currentStage || 'Not updated'}
            </div>
          </div>
        </div>
      </div>

      {/* Stage history */}
      <div style={{
        background: 'rgba(14,22,40,.7)',
        border: '1px solid rgba(255,255,255,.06)',
        borderRadius: 14,
        padding: 'clamp(14px, 3vw, 20px) clamp(14px, 3vw, 22px)',
      }}>
        <div style={{
          fontFamily: 'Rajdhani, sans-serif',
          fontSize: 12, fontWeight: 700, color: '#6b7a99',
          letterSpacing: 2, textTransform: 'uppercase',
          marginBottom: 16,
        }}>
          Stage History
        </div>
        {student.stageHistory?.length > 0 ? (
          <StageTimeline history={student.stageHistory} />
        ) : (
          <div style={{ textAlign: 'center', padding: '20px 0', color: '#3a4a66', fontSize: 13 }}>
            No stage history available yet.
          </div>
        )}
      </div>

      {/* Contact footer */}
      <p style={{
        textAlign: 'center', marginTop: 20,
        fontSize: 'clamp(10px, 2vw, 11px)',
        color: '#3a4a66', lineHeight: 1.7,
      }}>
        For queries, contact us at starglideraviation@gmail.com<br/>
        +91 8122279998 &nbsp;|&nbsp; +91 9962228247
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
      position: 'relative',
      background: 'transparent',
    }}>
      {/* Subtle starfield — position absolute so it doesn't affect layout */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
        {Array.from({ length: 40 }).map((_, i) => (
          <div key={i} style={{
            position: 'absolute',
            width: Math.random() > .7 ? '2px' : '1px',
            height: Math.random() > .7 ? '2px' : '1px',
            borderRadius: '50%',
            background: `rgba(201,168,76,${.1 + Math.random() * .25})`,
            left: `${Math.random() * 100}%`,
            top:  `${Math.random() * 100}%`,
            animation: `pulse-ring ${3 + Math.random() * 4}s ease-in-out infinite`,
            animationDelay: `${Math.random() * 4}s`,
          }} />
        ))}
      </div>

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1 }}>
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