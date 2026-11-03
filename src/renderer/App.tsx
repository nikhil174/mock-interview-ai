import { useEffect, useRef, useState } from 'react'
import { PRACTICE_NOTICE, type SavedSession } from '../shared/api'
import { CATEGORIES, pickQuestion, type Category } from './questions'

type Filter = Category | 'All'

export default function App() {
  const [filter, setFilter] = useState<Filter>('All')
  const [question, setQuestion] = useState(() => pickQuestion('All'))
  const [answer, setAnswer] = useState('')
  const [feedback, setFeedback] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [sessions, setSessions] = useState<SavedSession[]>([])
  const [viewing, setViewing] = useState<SavedSession | null>(null)
  const [hasKey, setHasKey] = useState(false)
  const [showKey, setShowKey] = useState(false)
  const [keyInput, setKeyInput] = useState('')
  const [noticeAccepted, setNoticeAccepted] = useState(false)

  const requestRef = useRef<string | null>(null)
  const feedbackRef = useRef('')
  const cancelledRef = useRef(false)

  function nextQuestion(f: Filter = filter) {
    setQuestion(pickQuestion(f))
    setAnswer('')
    setFeedback('')
    setError(null)
    setViewing(null)
  }

  async function getFeedback() {
    const text = answer.trim()
    if (!text || busy) return
    if (!noticeAccepted) {
      setError('Read and accept the practice notice before getting feedback.')
      return
    }
    if (!hasKey) {
      setShowKey(true)
      setError('Add your DeepSeek API key first.')
      return
    }

    const consentAt = Date.now()
    const requestId = Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
    requestRef.current = requestId
    cancelledRef.current = false
    feedbackRef.current = ''
    setFeedback('')
    setError(null)
    setBusy(true)
    try {
      const result = await window.api.feedback.start(requestId, question, text)
      if (!result.ok) {
        setError(result.error)
      } else if (!cancelledRef.current && feedbackRef.current.trim()) {
        await window.api.sessions.save({
          question,
          answer: text,
          feedback: feedbackRef.current,
          consentAt
        })
        setSessions(await window.api.sessions.list())
      }
    } finally {
      requestRef.current = null
      setBusy(false)
    }
  }

  function stopFeedback() {
    if (requestRef.current) {
      cancelledRef.current = true
      window.api.feedback.cancel(requestRef.current)
    }
  }

  async function saveKey() {
    const result = await window.api.key.set(keyInput)
    if (result.ok) {
      setKeyInput('')
      setHasKey(true)
      setShowKey(false)
      setError(null)
    } else {
      setError(result.error)
    }
  }

  async function clearKey() {
    await window.api.key.clear()
    setHasKey(false)
  }

  useEffect(() => {
    void (async () => {
      setHasKey(await window.api.key.status())
      setSessions(await window.api.sessions.list())
    })()

    return window.api.feedback.onChunk(({ requestId, delta }) => {
      if (requestId === requestRef.current && !cancelledRef.current) {
        feedbackRef.current += delta
        setFeedback((f) => f + delta)
      }
    })
  }, [])

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-head">
          <strong>Practice</strong>
        </div>
        <div style={{ padding: '0 8px 8px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <select
            aria-label="Question category"
            value={filter}
            onChange={(e) => {
              const f = e.target.value as Filter
              setFilter(f)
              nextQuestion(f)
            }}
          >
            <option value="All">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <button onClick={() => nextQuestion()} disabled={busy}>
            Next question
          </button>
        </div>
        <div className="sidebar-head">
          <strong>History</strong>
        </div>
        <ul>
          {sessions.map((s) => (
            <li
              key={s.id}
              className={viewing?.id === s.id ? 'active' : ''}
              onClick={() => setViewing(s)}
            >
              <div className="t">{s.question}</div>
              <div className="d">{new Date(s.createdAt).toLocaleString()}</div>
            </li>
          ))}
        </ul>
      </aside>

      <main className="editor">
        <div className="toolbar">
          <button onClick={() => setShowKey((s) => !s)}>API key</button>
        </div>

        {showKey && (
          <div className="keybox">
            <input
              type="password"
              aria-label="DeepSeek API key"
              placeholder="Paste DeepSeek API key"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
            />
            <div className="toolbar">
              <button onClick={() => void saveKey()} disabled={!keyInput.trim()}>
                Save key
              </button>
              {hasKey && <button onClick={() => void clearKey()}>Remove key</button>}
            </div>
            <p className="hint">
              {hasKey
                ? 'A key is saved, encrypted for your Windows account.'
                : 'No key saved. You need one to get feedback.'}
            </p>
          </div>
        )}

        {viewing ? (
          <>
            <h2 style={{ fontSize: 16, margin: '4px 0' }}>{viewing.question}</h2>
            <div className="toolbar">
              <button onClick={() => setViewing(null)}>Back to practice</button>
            </div>
            <strong>Your answer</strong>
            <pre style={{ whiteSpace: 'pre-wrap', font: 'inherit', margin: 0 }}>
              {viewing.answer}
            </pre>
            <section className="summary">
              <pre>{viewing.feedback}</pre>
            </section>
          </>
        ) : (
          <>
            <h2 style={{ fontSize: 16, margin: '4px 0' }}>{question}</h2>
            <textarea
              aria-label="Your answer"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Answer in your own words. Feedback will critique your answer, not replace it."
            />
            <div className="keybox">
              <strong>Practice notice</strong>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {PRACTICE_NOTICE.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
              <label>
                <input
                  type="checkbox"
                  checked={noticeAccepted}
                  onChange={(e) => setNoticeAccepted(e.target.checked)}
                />{' '}
                I understand this is practice, not a live interview or test.
              </label>
            </div>
            <div className="toolbar">
              <button
                className="primary"
                onClick={() => void getFeedback()}
                disabled={busy || !answer.trim() || !noticeAccepted}
              >
                {busy ? 'Getting feedback...' : 'Get feedback'}
              </button>
              {busy && <button onClick={stopFeedback}>Stop</button>}
            </div>
            {(feedback || error) && (
              <section className="summary">
                {error && <p className="error">{error}</p>}
                <pre>{feedback}</pre>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  )
}
