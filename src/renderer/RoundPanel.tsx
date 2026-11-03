import type { RoundPhase } from './round-core'
import RecordingControls from './RecordingControls'

export interface RoundState {
  phase: RoundPhase
  mainQuestion: string
  followUp: string
  currentQuestion: string
}

interface Props {
  round: RoundState
  remaining: number
  answer: string
  setAnswer: (text: string) => void
  busy: boolean
  onSubmit: () => void
  onFail: (message: string) => void
  onTranscript: (text: string) => void
  onNewRound: () => void
}

// Timed round screen. No hint button here: hints are for untimed practice only.
export default function RoundPanel(p: Props) {
  const mm = Math.floor(p.remaining / 60)
  const ss = String(p.remaining % 60).padStart(2, '0')

  if (p.round.phase === 'done') {
    return (
      <section className="summary">
        <p>Round complete. Each answer and its feedback are saved in History.</p>
        <button className="primary" onClick={p.onNewRound}>Start another round</button>
      </section>
    )
  }

  const label = p.round.phase === 'main' ? 'Main question' : 'Follow-up from the interviewer'
  return (
    <>
      <p className="hint" role="status">
        {label}. Time left: {mm}:{ss}
      </p>
      <h2 style={{ fontSize: 16, margin: '4px 0' }}>{p.round.currentQuestion}</h2>
      <RecordingControls busy={p.busy} onFail={p.onFail} onTranscript={p.onTranscript} />
      <textarea
        aria-label="Your answer"
        value={p.answer}
        onChange={(e) => p.setAnswer(e.target.value)}
        placeholder="Answer now. The timer submits whatever you have when it reaches zero."
      />
      <div className="toolbar">
        <button className="primary" onClick={p.onSubmit} disabled={p.busy || !p.answer.trim()}>
          {p.busy ? 'Getting feedback...' : 'Submit answer'}
        </button>
      </div>
    </>
  )
}
