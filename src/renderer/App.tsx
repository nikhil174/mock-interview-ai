import { useEffect, useRef, useState } from 'react'
import { PRACTICE_NOTICE, type SavedSession } from '../shared/api'
import { BUILT_IN_QUESTIONS, categoriesOf, pickFrom, type QuestionItem } from './questions'
import RecordingControls from './RecordingControls'
import RoundPanel, { type RoundState } from './RoundPanel'
import { followUpFor, nextPhase, remainingSeconds, ROUND_LIMIT_SECONDS } from './round-core'
import { startScreenRecording, finishScreenRecording, discardScreenRecording, type ActiveRecording } from './screen-recorder'
import ReplayPanel from './ReplayPanel'

type ActiveRound = RoundState & { startedAt: number; category: string }

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

  const [round, setRound] = useState<ActiveRound | null>(null)
  const [now, setNow] = useState(() => Date.now())

  const requestRef = useRef<string | null>(null)
  const feedbackRef = useRef('')
  const cancelledRef = useRef(false)
  const submittingRef = useRef(false)
  const recRef = useRef<ActiveRecording | null>(null)
  const [recOn, setRecOn] = useState(false)
  const [retention, setRetention] = useState<7 | 30>(7)

  useEffect(() => () => {
    if (recRef.current) discardScreenRecording(recRef.current)
  }, [])

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

  // Gets feedback for one answer and saves it. Used by both normal practice and each timed-round response.
  async function runFeedback(
    q: string,
    text: string,
    src: 'typed' | 'voice',
    tr: string,
    extra?: { recordingId?: string; recordingOffsetMs?: number }
  ): Promise<void> {
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
      const result = await window.api.feedback.start(requestId, consentToken, q, text)
      if (!result.ok) {
        setError(result.error)
      } else if (!cancelledRef.current && feedbackRef.current.trim()) {
        const saved = await window.api.sessions.save(requestId, {
          question: q,
          answer: text,
          feedback: feedbackRef.current,
          source: src,
          transcript: src === 'voice' ? tr : undefined,
          ...extra
        })
        if (!saved.ok) setError(saved.error)
        setSessions(await window.api.sessions.list())
      }
    } finally {
      requestRef.current = null
      setBusy(false)
    }
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
    await runFeedback(question, text, source, transcript)
  }

  // Timed round: one main question, then one interviewer follow-up. Each response gets feedback.
  // No hints are offered in a round.
  async function startRound() {
    if (!noticeAccepted) {
      setError('Read and accept the practice notice before starting a round.')
      return
    }
    if (!hasKey) {
      setShowKey(true)
      setError('Add your DeepSeek API key first.')
      return
    }
    if (recOn) {
      try {
        recRef.current = await startScreenRecording(retention)
      } catch (err) {
        setError(`Screen recording could not start. ${err instanceof Error ? err.message : ''}`.trim())
        return
      }
    }
    const category = pool.find((q) => q.text === question)?.category ?? 'General'
    setRound({
      phase: 'main',
      mainQuestion: question,
      followUp: '',
      currentQuestion: question,
      startedAt: Date.now(),
      category
    })
    setNow(Date.now())
    setAnswer('')
    setSource('typed')
    setTranscript('')
    setFeedback('')
    setError(null)
  }

  async function submitRoundAnswer(auto: boolean) {
    if (!round || round.phase === 'done' || submittingRef.current) return
    submittingRef.current = true
    const current = round
    const text = answer.trim()
    try {
      if (text) {
        const q = current.phase === 'main' ? current.mainQuestion : current.followUp
        const rec = recRef.current
        const extra = rec ? { recordingId: rec.id, recordingOffsetMs: Math.max(0, current.startedAt - rec.startedAt) } : undefined
        await runFeedback(q, text, source, transcript, extra)
      } else if (auto) {
        setError('Time is up. No answer was given for this question.')
      }
      if (nextPhase(current.phase) === 'followup') {
        const fu = followUpFor(current.category, Date.now())
        setRound({ ...current, phase: 'followup', followUp: fu, currentQuestion: fu, startedAt: Date.now() })
        setNow(Date.now())
      } else {
        setRound({ ...current, phase: 'done' })
        await finishRecording()
      }
      setAnswer('')
      setSource('typed')
      setTranscript('')
    } finally {
      submittingRef.current = false
    }
  }

  // Stops and saves the round's screen recording, if there is one.
  async function finishRecording() {
    const rec = recRef.current
    recRef.current = null
    if (!rec) return
    const result = await finishScreenRecording(rec)
    if (!result.ok) setError(result.error)
  }

  // Ticks once a second while a round is running.
  useEffect(() => {
    if (!round || round.phase === 'done') return
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [round?.phase, round?.startedAt])

  const remaining =
    round && round.phase !== 'done' ? remainingSeconds(round.startedAt, now, ROUND_LIMIT_SECONDS) : null

  // When the time runs out, submit whatever is in the answer box.
  useEffect(() => {
    if (remaining === 0) void submitRoundAnswer(true)
  }, [remaining])

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
            {viewing.recordingId && <ReplayPanel recordingId={viewing.recordingId} offsetMs={viewing.recordingOffsetMs} />}
            <strong>Your answer</strong>
            <pre style={{ whiteSpace: 'pre-wrap', font: 'inherit', margin: 0 }}>
              {viewing.answer}
            </pre>
            <section className="summary">
              <pre>{viewing.feedback}</pre>
            </section>
          </>
        ) : round ? (
          <>
            <RoundPanel
              round={round}
              remaining={remaining ?? 0}
              answer={answer}
              setAnswer={setAnswer}
              busy={busy}
              onSubmit={() => void submitRoundAnswer(false)}
              onFail={(m) => setError(m)}
              onTranscript={(t) => {
                setAnswer((a) => (a.trim() ? `${a.trim()} ${t}` : t))
                setSource('voice')
                setTranscript((prev) => (prev ? `${prev} ${t}` : t))
                setError(null)
              }}
              onNewRound={() => {
                setRound(null)
                void finishRecording()
                nextQuestion()
              }}
            />
            {(feedback || error) && (
              <section className="summary">
                {error && <p className="error">{error}</p>}
                <pre>{feedback}</pre>
              </section>
            )}
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
              <label>
                <input type="checkbox" checked={recOn} onChange={(e) => setRecOn(e.target.checked)} /> Record my screen for
                replay (optional, stays on this computer)
              </label>
              {recOn && (
                <label>
                  Keep for{' '}
                  <select value={retention} onChange={(e) => setRetention(Number(e.target.value) as 7 | 30)}>
                    <option value={7}>7 days</option>
                    <option value={30}>30 days</option>
                  </select>
                </label>
              )}
              <button onClick={() => void startRound()} disabled={busy}>
                Start timed round (5 min)
              </button>
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
