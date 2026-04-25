import { useState, useRef } from 'react'

const SHEET_ID = import.meta.env.VITE_SHEET_ID || 'YOUR_SHEET_ID_HERE'
const API_KEY  = import.meta.env.VITE_API_KEY  || 'YOUR_API_KEY_HERE'
const BASE     = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values`

const STAGE_ORDER = [
  'Enrolled', 'Documents Submitted', 'Training In Progress',
  'Exam Registered', 'Exam Completed', 'Result Awaited',
  'Passed', 'Failed', 'Completed', 'Suspended', 'Withdrawn',
]
const TERMINAL_STAGES = ['Passed', 'Failed', 'Completed', 'Suspended', 'Withdrawn']

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

function stageProgress(stage) {
  const nonTerminal = STAGE_ORDER.filter(s => !TERMINAL_STAGES.includes(s))
  const idx = nonTerminal.indexOf(stage)
  if (idx === -1) return TERMINAL_STAGES.includes(stage) ? 100 : 0
  return Math.round(((idx + 1) / nonTerminal.length) * 100)
}

function stageColors(stage) {
  if (['Passed', 'Completed'].includes(stage))              return { dot: '#2ecc71', text: '#2ecc71', badge: 'rgba(46,204,113,.15)', badgeBorder: 'rgba(46,204,113,.35)' }
  if (['Failed', 'Suspended', 'Withdrawn'].includes(stage)) return { dot: '#e74c3c', text: '#e74c3c', badge: 'rgba(231,76,60,.15)',  badgeBorder: 'rgba(231,76,60,.35)' }
  return { dot: '#c9a84c', text: '#e2c97e', badge: 'rgba(201,168,76,.15)', badgeBorder: 'rgba(201,168,76,.35)' }
}

const CARD_BG      = '#0a1628'
const CARD_BORDER  = 'rgba(255,255,255,.1)'
const CARD_INNER   = '#0f1f3d'
const GOLD         = '#c9a84c'
const GOLD_LIGHT   = '#e2c97e'
const TEXT_PRIMARY = '#f0f4ff'
const TEXT_MUTED   = '#7a90b8'
const TEXT_DIM     = '#3d5275'

const card = (extra = {}) => ({
  background: CARD_BG,
  border: `1px solid ${CARD_BORDER}`,
  borderRadius: 16,
  padding: 'clamp(16px,3vw,24px)',
  marginBottom: 14,
  boxShadow: '0 8px 32px rgba(0,0,0,.25)',
  ...extra,
})

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
      flex: 1, padding: 'clamp(32px,6vw,56px) clamp(16px,4vw,32px)',
      animation: 'fadeUp .45s ease both',
    }}>

      <div style={{
        width: 72, height: 72, borderRadius: '50%',
        background: CARD_BG,
        border: `1px solid ${CARD_BORDER}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 24,
        boxShadow: '0 8px 24px rgba(0,0,0,.3)',
      }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.5">
          <path d="M12 2L2 7l10 5 10-5-10-5z"/>
          <path d="M2 17l10 5 10-5"/>
          <path d="M2 12l10 5 10-5"/>
        </svg>
      </div>

      <h2 style={{
        fontFamily: 'Rajdhani, sans-serif',
        fontSize: 'clamp(24px,5vw,38px)',
        fontWeight: 700, color: CARD_BG,
        letterSpacing: .5, textAlign: 'center', marginBottom: 8,
        textShadow: '0 1px 3px rgba(255,255,255,.15)',
      }}>
        Track Your Progress
      </h2>
      <p style={{
        color: '#0d2f55',
        fontSize: 'clamp(13px,2vw,15px)',
        textAlign: 'center', maxWidth: 320,
        marginBottom: 'clamp(24px,5vw,36px)', lineHeight: 1.65,
      }}>
        Enter your Student ID to view your current stage and full progress history.
      </p>

      <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: 460 }}>
        <div style={{
          display: 'flex',
          background: CARD_BG,
          border: `1.5px solid ${CARD_BORDER}`,
          borderRadius: 12, overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0,0,0,.25)',
        }}>
          <input
            ref={inputRef}
            value={value}
            onChange={e => setValue(e.target.value.toUpperCase())}
            placeholder="e.g. SGA2601DGCA"
            disabled={loading}
            style={{
              flex: 1, minWidth: 0,
              padding: 'clamp(13px,2.5vw,16px) clamp(14px,3vw,20px)',
              background: 'transparent', border: 'none', outline: 'none',
              color: TEXT_PRIMARY, fontSize: 'clamp(13px,2.5vw,15px)',
              fontFamily: 'Rajdhani, sans-serif', fontWeight: 600, letterSpacing: 1,
            }}
          />
          <button
            type="submit"
            disabled={loading || !value.trim()}
            style={{
              padding: 'clamp(13px,2.5vw,16px) clamp(18px,3.5vw,28px)',
              background: `linear-gradient(135deg, ${GOLD}, ${GOLD_LIGHT})`,
              border: 'none', cursor: loading || !value.trim() ? 'not-allowed' : 'pointer',
              color: '#0a1628', fontWeight: 700,
              fontFamily: 'Rajdhani, sans-serif',
              fontSize: 'clamp(12px,2vw,14px)', letterSpacing: 1.5,
              display: 'flex', alignItems: 'center', gap: 7,
              whiteSpace: 'nowrap', flexShrink: 0,
              opacity: loading || !value.trim() ? .65 : 1,
              transition: 'opacity .2s',
            }}
          >
            {loading ? (
              <svg width="16" height="16" viewBox="0 0 24 24" style={{ animation: 'spin 1s linear infinite' }}>
                <circle cx="12" cy="12" r="10" stroke="rgba(0,0,0,.2)" strokeWidth="3" fill="none"/>
                <path d="M12 2a10 10 0 0 1 10 10" stroke="#0a1628" strokeWidth="3" fill="none" strokeLinecap="round"/>
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
            marginTop: 12, padding: '10px 16px',
            background: 'rgba(10,22,40,.9)',
            border: '1px solid rgba(231,76,60,.4)',
            borderRadius: 8, color: '#ff8a80',
            fontSize: 'clamp(12px,2vw,13px)',
            animation: 'fadeUp .3s ease',
            boxShadow: '0 4px 16px rgba(0,0,0,.2)',
          }}>
            {error}
          </div>
        )}
      </form>
    </div>
  )
}

function StageTimeline({ history }) {
  return (
    <div style={{ position: 'relative', paddingLeft: 28 }}>
      <div style={{
        position: 'absolute', left: 7, top: 10,
        width: 1, height: 'calc(100% - 20px)',
        background: `linear-gradient(to bottom, ${GOLD}66, transparent)`,
      }} />

      {history.map((item, i) => {
        const isLatest = i === history.length - 1
        const c = stageColors(item.stage)
        return (
          <div key={i} style={{
            position: 'relative',
            marginBottom: i < history.length - 1 ? 12 : 0,
            animation: 'fadeUp .4s ease both',
            animationDelay: `${i * 0.07}s`,
          }}>
            <div style={{
              position: 'absolute', left: -24, top: 7,
              width: 13, height: 13, borderRadius: '50%',
              background: isLatest ? c.dot : 'transparent',
              border: `2px solid ${isLatest ? c.dot : TEXT_DIM}`,
              boxShadow: isLatest ? `0 0 10px ${c.dot}88` : 'none',
              transition: 'all .3s',
            }} />

            <div style={{
              background: isLatest ? CARD_INNER : 'rgba(255,255,255,.02)',
              border: `1px solid ${isLatest ? GOLD + '40' : 'rgba(255,255,255,.06)'}`,
              borderRadius: 10,
              padding: 'clamp(10px,2vw,13px) clamp(12px,2.5vw,16px)',
              transition: 'all .2s',
            }}>
              <div style={{
                display: 'flex', alignItems: 'flex-start',
                justifyContent: 'space-between', flexWrap: 'wrap', gap: 6,
              }}>
                <span style={{
                  fontFamily: 'Rajdhani, sans-serif',
                  fontSize: 'clamp(13px,2.5vw,15px)',
                  fontWeight: 700,
                  color: isLatest ? TEXT_PRIMARY : TEXT_MUTED,
                  letterSpacing: .5,
                  display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8,
                }}>
                  {item.stage}
                  {isLatest && (
                    <span style={{
                      fontSize: 9,
                      background: c.badge,
                      color: c.text,
                      padding: '2px 9px', borderRadius: 20,
                      fontWeight: 700, letterSpacing: 1.5,
                      border: `1px solid ${c.badgeBorder}`,
                    }}>
                      CURRENT
                    </span>
                  )}
                </span>
                {item.date && (
                  <span style={{ fontSize: 11, color: TEXT_DIM, whiteSpace: 'nowrap' }}>
                    {item.date}
                  </span>
                )}
              </div>
              {item.notes && (
                <p style={{
                  marginTop: 5, fontSize: 12,
                  color: TEXT_MUTED, lineHeight: 1.5, fontStyle: 'italic',
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

function ResultScreen({ student, onBack }) {
  const progress   = stageProgress(student.currentStage)
  const c          = stageColors(student.currentStage)
  const isTerminal = TERMINAL_STAGES.includes(student.currentStage)

  return (
    <div style={{
      flex: 1,
      padding: 'clamp(16px,3vw,24px) clamp(12px,3vw,20px) clamp(24px,5vw,40px)',
      maxWidth: 660, margin: '0 auto', width: '100%',
      animation: 'fadeUp .4s ease',
    }}>

      <button
        onClick={onBack}
        style={{
          display: 'flex', alignItems: 'center', gap: 7,
          background: 'none', border: 'none', cursor: 'pointer',
          color: '#0d2f55', fontSize: 13,
          marginBottom: 'clamp(14px,3vw,22px)',
          padding: '6px 0', transition: 'color .2s',
          fontFamily: 'DM Sans, sans-serif', fontWeight: 600,
        }}
        onMouseEnter={e => e.currentTarget.style.color = CARD_BG}
        onMouseLeave={e => e.currentTarget.style.color = '#0d2f55'}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M19 12H5M12 5l-7 7 7 7"/>
        </svg>
        Back to Search
      </button>

      <div style={card()}>

        <div style={{
          display: 'flex', alignItems: 'flex-start',
          justifyContent: 'space-between', flexWrap: 'wrap', gap: 10,
          marginBottom: 16,
        }}>
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontSize: 9, color: TEXT_DIM,
              letterSpacing: 2.5, textTransform: 'uppercase', marginBottom: 4,
            }}>
              Student
            </div>
            <div style={{
              fontFamily: 'Rajdhani, sans-serif',
              fontSize: 'clamp(20px,4vw,26px)',
              fontWeight: 700, color: TEXT_PRIMARY,
              lineHeight: 1.1, wordBreak: 'break-word',
            }}>
              {student.name}
            </div>
            <div style={{ fontSize: 12, color: TEXT_MUTED, marginTop: 5 }}>
              {student.id}&nbsp;&nbsp;·&nbsp;&nbsp;{student.courseCode} — {student.courseName}
            </div>
          </div>

          <div style={{
            padding: '5px 14px', borderRadius: 30, flexShrink: 0,
            background: 'rgba(255,255,255,.06)',
            border: '1px solid rgba(255,255,255,.12)',
            color: TEXT_MUTED,
            fontSize: 11, fontWeight: 700,
            fontFamily: 'Rajdhani, sans-serif', letterSpacing: 1.5,
          }}>
            {student.status}
          </div>
        </div>

        {!isTerminal && (
          <div style={{ marginBottom: 14 }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              fontSize: 11, color: TEXT_DIM, marginBottom: 6,
            }}>
              <span style={{ letterSpacing: 1, textTransform: 'uppercase' }}>Progress</span>
              <span style={{ color: GOLD_LIGHT, fontWeight: 700 }}>{progress}%</span>
            </div>
            <div style={{
              height: 5, borderRadius: 5,
              background: 'rgba(255,255,255,.06)', overflow: 'hidden',
            }}>
              <div style={{
                height: '100%', borderRadius: 5,
                width: `${progress}%`,
                background: `linear-gradient(90deg, ${GOLD}, ${GOLD_LIGHT})`,
                boxShadow: `0 0 10px ${GOLD}88`,
                transition: 'width 1s cubic-bezier(.4,0,.2,1)',
              }} />
            </div>
          </div>
        )}

        <div style={{
          padding: 'clamp(12px,2vw,16px)',
          background: CARD_INNER,
          border: `1px solid ${c.badgeBorder}`,
          borderRadius: 12,
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <div style={{
            width: 12, height: 12, borderRadius: '50%', flexShrink: 0,
            background: c.dot,
            boxShadow: `0 0 12px ${c.dot}`,
          }} />
          <div>
            <div style={{
              fontSize: 9, color: TEXT_DIM,
              letterSpacing: 2.5, textTransform: 'uppercase', marginBottom: 3,
            }}>
              Current Stage
            </div>
            <div style={{
              fontFamily: 'Rajdhani, sans-serif',
              fontSize: 'clamp(16px,3vw,20px)',
              fontWeight: 700, color: c.text,
            }}>
              {student.currentStage || 'Not updated yet'}
            </div>
          </div>
        </div>
      </div>

      <div style={card()}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18,
        }}>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,.06)' }} />
          <span style={{
            fontFamily: 'Rajdhani, sans-serif',
            fontSize: 11, fontWeight: 700,
            color: TEXT_DIM, letterSpacing: 2.5, textTransform: 'uppercase',
          }}>
            Stage History
          </span>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,.06)' }} />
        </div>

        {student.stageHistory?.length > 0 ? (
          <StageTimeline history={student.stageHistory} />
        ) : (
          <div style={{
            textAlign: 'center', padding: '24px 0',
            color: TEXT_DIM, fontSize: 13,
          }}>
            No stage history recorded yet.
          </div>
        )}
      </div>

      <p style={{
        textAlign: 'center', marginTop: 8,
        fontSize: 11, color: '#0d2f55', lineHeight: 1.8,
      }}>
        For queries — starglideraviation@gmail.com &nbsp;|&nbsp; +91 8122279998
      </p>
    </div>
  )
}

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