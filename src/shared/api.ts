// Shared between main, preload and renderer. Types only.

export type Result = { ok: true } | { ok: false; error: string }

export interface SavedSession {
  id: string
  question: string
  answer: string
  feedback: string
  createdAt: number
}

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
