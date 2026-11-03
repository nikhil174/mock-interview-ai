// Pure rules for screen recordings. No Electron imports, so they run under plain Node.

export const RETENTION_CHOICES = [7, 30] as const
export type RetentionDays = (typeof RETENTION_CHOICES)[number]

export const MAX_RECORDING_BYTES = 300 * 1024 * 1024
export const ARM_TTL_MS = 30 * 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000
const ID_RE = /^[a-zA-Z0-9-]{8,64}$/

export interface RecordingMeta {
  id: string
  createdAt: number
  retentionDays: RetentionDays
}

export interface Arm {
  id: string
  retentionDays: RetentionDays
  armedAt: number
}

export function isValidRecordingId(id: unknown): id is string {
  return typeof id === 'string' && ID_RE.test(id)
}

export function isValidRetention(days: unknown): days is RetentionDays {
  return (RETENTION_CHOICES as readonly unknown[]).includes(days)
}

export function isExpired(meta: RecordingMeta, now: number): boolean {
  return now - meta.createdAt > meta.retentionDays * DAY_MS
}

// Screen capture is allowed only while a recording is armed, and only for a short time.
export function displayAllowed(arm: Arm | null, now: number): boolean {
  return arm !== null && now - arm.armedAt <= ARM_TTL_MS
}

export function parseMeta(raw: string): RecordingMeta | null {
  try {
    const m = JSON.parse(raw) as Partial<RecordingMeta> | null
    if (!m || typeof m !== 'object') return null
    if (!isValidRecordingId(m.id)) return null
    if (typeof m.createdAt !== 'number' || !isValidRetention(m.retentionDays)) return null
    return { id: m.id, createdAt: m.createdAt, retentionDays: m.retentionDays }
  } catch {
    return null
  }
}
