// Shared between main, preload and renderer. Types only.

export type Result = { ok: true } | { ok: false; error: string }

export interface SavedSession {
  id: string
  question: string
  answer: string
  feedback: string
  // When the practice notice was acknowledged for this session.
  consentAt: number
  createdAt: number
}

export const PRACTICE_NOTICE = [
  'This is practice. The AI reads your answer and gives feedback on it.',
  'Your answer and the feedback are saved on this computer and sent to DeepSeek to generate the feedback.',
  'Do not use this during a live interview or a proctored test.'
]

export interface FeedbackChunk {
  requestId: string
  delta: string
}

export interface MockApi {
  key: {
    status(): Promise<boolean>
    set(key: string): Promise<Result>
    clear(): Promise<void>
  }
  sessions: {
    list(): Promise<SavedSession[]>
    save(session: Omit<SavedSession, 'id' | 'createdAt'>): Promise<void>
  }
  feedback: {
    start(requestId: string, question: string, answer: string): Promise<Result>
    cancel(requestId: string): void
    onChunk(cb: (chunk: FeedbackChunk) => void): () => void
  }
}
