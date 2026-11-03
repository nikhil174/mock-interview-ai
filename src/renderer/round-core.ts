// Pure logic for timed practice rounds. No DOM or browser APIs, so it runs under plain Node.
// A round is one main question, then one interviewer-style follow-up. Each response gets feedback.
// Timed rounds never give hints. The hint flow in the roadmap applies only to untimed answers.

export const ROUND_LIMIT_SECONDS = 300

export type RoundPhase = 'main' | 'followup' | 'done'

export function remainingSeconds(startedAt: number, now: number, limitSeconds: number): number {
  const elapsed = Math.floor((now - startedAt) / 1000)
  return Math.max(0, limitSeconds - Math.max(0, elapsed))
}

export function nextPhase(phase: RoundPhase): RoundPhase {
  if (phase === 'main') return 'followup'
  return 'done'
}

// Follow-ups sound like an interviewer probing the answer. They never contain a model answer.
const FOLLOW_UPS: Record<string, string[]> = {
  Backend: [
    'What would break first if traffic grew ten times? How would you find out?',
    'How would you test this change safely before it reaches production?',
    'What trade-off did you accept, and what would make you reverse it?'
  ],
  'System design': [
    'Which part of this design would you change first if the requirements doubled?',
    'Where could data be lost or duplicated, and how would you detect it?',
    'What would you monitor to know this design is healthy?'
  ],
  Behavioral: [
    'What would you do differently if you had that situation again?',
    'How did the other people involved see it?',
    'What did you learn that you now apply to every similar problem?'
  ],
  General: [
    'Can you give a concrete example from your own work?',
    'What is the weakest part of your answer, and why?'
  ]
}

export function followUpFor(category: string, pick: number): string {
  const bank = FOLLOW_UPS[category] ?? FOLLOW_UPS.General
  const index = Math.abs(Math.floor(pick)) % bank.length
  return bank[index]
}
