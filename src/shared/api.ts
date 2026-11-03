// Shared between main, preload and renderer. Types only, plus the practice notice text.

export type Result = { ok: true } | { ok: false; error: string }

export interface SavedSession {
  id: string
  question: string
  answer: string
  feedback: string
  // Set by the main process when the practice notice was accepted.
  // Missing on sessions saved before consent gating existed (legacy data).
  consentAt?: number
  // How the answer was given. Missing on older sessions, which were all typed.
  source?: 'typed' | 'voice'
  // The transcript of a voice answer. Audio is never stored.
  transcript?: string
  createdAt: number
}

export const VOICE_NOTICE = [
  'Your voice is recorded only while you hold the button, and it is turned into text on this computer.',
  'The audio is discarded after it is transcribed. It is not saved and not sent anywhere.',
  'The transcript is saved with your session only if you finish the answer.',
  'Do not use this during a live interview or a proctored test.'
]

export const PRACTICE_NOTICE = [
  'This is practice. The AI reads your answer and gives feedback on it.',
  'Your question and your answer are sent to DeepSeek to generate the feedback.',
  'Each session is saved as a JSON file on this computer, with the question, your answer, and the feedback.',
  'Do not use this during a live interview or a proctored test.'
]

export interface FeedbackChunk {
  requestId: string
  delta: string
}

// A company-provided question set. Questions only: no answers or scoring.
export interface QuestionSet {
  name: string
  questions: { category: string; text: string }[]
}

export interface MockApi {
  key: {
    status(): Promise<boolean>
    set(key: string): Promise<Result>
    clear(): Promise<void>
  }
  consent: {
    // Asks the main process for a single-use token. Called when the user accepts the notice and asks for feedback.
    acknowledge(): Promise<string>
  }
  sessions: {
    list(): Promise<SavedSession[]>
    save(requestId: string, session: { question: string; answer: string; feedback: string; source?: 'typed' | 'voice'; transcript?: string }): Promise<Result>
    // Candidate-initiated only. Opens a save dialog for one session.
    exportOne(id: string): Promise<Result>
  }
  voice: {
    // Single-use token for one voice answer. Accepted voice notice required before recording.
    acknowledge(): Promise<string>
  }
  transcribe: {
    run(requestId: string, voiceToken: string, audio: Uint8Array): Promise<{ ok: true; text: string } | { ok: false; error: string }>
  }
  questionSets: {
    // Opens a file picker. Resolves with the parsed set, an error, or cancelled.
    import(): Promise<{ ok: true; set: QuestionSet } | { ok: false; error: string } | { ok: false; cancelled: true }>
  }
  feedback: {
    start(requestId: string, consentToken: string, question: string, answer: string): Promise<Result>
    cancel(requestId: string): void
    onChunk(cb: (chunk: FeedbackChunk) => void): () => void
  }
}
