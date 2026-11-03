import type { SavedSession } from '../shared/api.ts'

// Parses one stored session file. Legacy files without consentAt are still valid.
// Anything unreadable or missing the core fields returns null instead of throwing,
// so one bad file can't stop the history from loading.
export function parseStoredSession(raw: string): SavedSession | null {
  try {
    const parsed = JSON.parse(raw) as Partial<SavedSession> | null
    if (!parsed || typeof parsed !== 'object') return null
    if (typeof parsed.question !== 'string' || typeof parsed.answer !== 'string') return null
    if (typeof parsed.feedback !== 'string' || typeof parsed.createdAt !== 'number') return null
    return {
      id: String(parsed.id ?? ''),
      question: parsed.question,
      answer: parsed.answer,
      feedback: parsed.feedback,
      createdAt: parsed.createdAt,
      ...(typeof parsed.consentAt === 'number' ? { consentAt: parsed.consentAt } : {}),
      ...(parsed.source === 'typed' || parsed.source === 'voice' ? { source: parsed.source } : {}),
      ...(typeof parsed.transcript === 'string' ? { transcript: parsed.transcript } : {}),
      ...(typeof parsed.recordingId === 'string' && /^[a-zA-Z0-9-]{8,64}$/.test(parsed.recordingId)
        ? { recordingId: parsed.recordingId }
        : {}),
      ...(typeof parsed.recordingOffsetMs === 'number' && parsed.recordingOffsetMs >= 0
        ? { recordingOffsetMs: parsed.recordingOffsetMs }
        : {})
    }
  } catch {
    return null
  }
}
