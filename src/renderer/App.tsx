import { useEffect, useRef, useState } from 'react'
import { PRACTICE_NOTICE, type SavedSession } from '../shared/api'
import { BUILT_IN_QUESTIONS, categoriesOf, pickFrom, type QuestionItem } from './questions'
import RecordingControls from './RecordingControls'

export default function App() {
  const [pool, setPool] = useState<QuestionItem[]>(BUILT_IN_QUESTIONS)
  const [poolName, setPoolName] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>('All')
  const [question, setQuestion] = useState(() => pickFrom(BUILT_IN_QUESTIONS, 'All'))
  const [importNote, setImportNote] = useState<string | null>(null)
  const [source, setSource] = useState<'typed' | 'voice'>('typed')
  const [transcript, setTranscript] = useState('')
  const [exportNote, setExportNote] = useState<string | null>(null)
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

  function nextQuestion(f: string = filter, p: QuestionItem[] = pool) {
    setQuestion(pickFrom(p, f))
    setAnswer('')
    setFeedback('')
    setError(null)
    setViewing(null)
    setSource('typed')
    setTranscript('')
  }

  async function importSet() {
    setImportNote(null)
    const result = await window.api.questionSets.import()
    if ('cancelled' in result) return
    if (!result.ok) {
      setImportNote(result.error)
      return
    }
    const next = result.set.questions
    setPool(next)
    setPoolName(result.set.name)
    setFilter('All')
    nextQuestion('All', next)
    setImportNote(`Loaded "${result.set.name}" with ${next.length} questions.`)
  }

  function useBuiltIn() {
    setPool(BUILT_IN_QUESTIONS)
    setPoolName(null)
    setFilter('All')
    nextQuestion('All', BUILT_IN_QUESTIONS)
    setImportNote(null)
  }

  async function exportSession(id: string) {
    setExportNote(null)
    const result = await window.api.sessions.exportOne(id)
    setExportNote(result.ok ? 'Exported. Only the question, your answer, and the feedback were included.' : result.error)
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

    const requestId = Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
    requestRef.current = requestId
    cancelledRef.current = false
    feedbackRef.current = ''
    setFeedback('')
    setError(null)
    setBusy(true)
    try {
      // The main process issues the consent token; the renderer can't make one itself.
      const consentToken = await window.api.consent.acknowledge()
      const result = await window.api.feedback.start(requestId, consentToken, question, text)
      if (!result.ok) {
        setError(result.error)
      } else if (!cancelledRef.current && feedbackRef.current.trim()) {
        const saved = await window.api.sessions.save(requestId, {
          question,
          answer: text,
          feedback: feedbackRef.current,
          source,
          transcript: source === 'voice' ? transcript : undefined
        })
        if (!saved.ok) setError(saved.error)
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
              const f = e.target.value
              setFilter(f)
              nextQuestion(f)
            }}
          >
            <option value="All">All categories</option>
            {categoriesOf(pool).map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <button onClick={() => nextQuestion()} disabled={busy}>
            Next question
          </button>
          <button onClick={() => void importSet()} disabled={busy}>
            Import question set
          </button>
          {poolName && (
            <button onClick={useBuiltIn} disabled={busy}>
              Use built-in questions
            </button>
          )}
          {poolName && <p className="hint">Set: {poolName}</p>}
          {importNote && <p className="hint">{importNote}</p>}
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
              <button onClick={() => void exportSession(viewing.id)}>Export this session</button>
            </div>
            {exportNote && <p className="hint">{exportNote}</p>}
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
            <RecordingControls
              busy={busy}
              onFail={(m) => setError(m)}
              onTranscript={(t) => {
                setAnswer((a) => (a.trim() ? `${a.trim()} ${t}` : t))
                setSource('voice')
                setTranscript((prev) => (prev ? `${prev} ${t}` : t))
                setError(null)
              }}
            />
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
