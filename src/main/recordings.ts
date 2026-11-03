import { app, desktopCapturer, ipcMain, session } from 'electron'
import { randomUUID } from 'crypto'
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { join } from 'path'
import type { Result } from '../shared/api'
import { redeemScreenToken } from './screen-consent-core'
import { screenConsentStore } from './screen-consent'
import {
  displayAllowed,
  isExpired,
  isValidRecordingId,
  isValidRetention,
  MAX_RECORDING_BYTES,
  parseMeta,
  type Arm,
  type RecordingMeta
} from './recording-core'

// The one armed recording. Screen capture works only while this is set.
let arm: Arm | null = null

function dir(): string {
  const d = join(app.getPath('userData'), 'recordings')
  mkdirSync(d, { recursive: true })
  return d
}

export function recordingPath(id: string): string {
  return join(dir(), `${id}.webm`)
}

function metaPath(id: string): string {
  return join(dir(), `${id}.json`)
}

export function recordingExists(id: string): boolean {
  return isValidRecordingId(id) && existsSync(recordingPath(id))
}

// Deletes recordings past their retention period. Runs once at startup.
export function cleanupExpiredRecordings(now: number): void {
  for (const f of readdirSync(dir())) {
    if (!f.endsWith('.json')) continue
    try {
      const meta: RecordingMeta | null = parseMeta(readFileSync(join(dir(), f), 'utf8'))
      if (meta && isExpired(meta, now)) {
        rmSync(recordingPath(meta.id), { force: true })
        rmSync(metaPath(meta.id), { force: true })
      }
    } catch {
      // Unreadable metadata is left alone.
    }
  }
}

export function registerRecordingHandlers(): void {
  // Screen capture: the primary screen only, and only while a recording is armed.
  session.defaultSession.setDisplayMediaRequestHandler(async (_req, callback) => {
    if (!displayAllowed(arm, Date.now())) {
      callback({})
      return
    }
    const sources = await desktopCapturer.getSources({ types: ['screen'] })
    if (sources.length === 0) {
      callback({})
      return
    }
    callback({ video: sources[0] })
  })

  // The renderer redeems a screen token here, which arms one recording with a retention period.
  ipcMain.handle('screen:begin', (_e, token: unknown, retentionDays: unknown): { ok: true; id: string } | { ok: false; error: string } => {
    if (!isValidRetention(retentionDays)) return { ok: false, error: 'Choose 7 or 30 days of retention.' }
    const decision = redeemScreenToken(screenConsentStore, token, Date.now())
    if (!decision.ok) return decision
    const id = randomUUID()
    arm = { id, retentionDays, armedAt: Date.now() }
    return { ok: true, id }
  })

  // Saves the finished recording bytes for the armed id, then disarms.
  ipcMain.handle('recordings:save', (_e, id: unknown, bytes: unknown): Result => {
    if (!isValidRecordingId(id) || !arm || arm.id !== id || !displayAllowed(arm, Date.now())) {
      return { ok: false, error: 'This recording was not armed, or it expired. It was not saved.' }
    }
    if (!(bytes instanceof Uint8Array) || bytes.byteLength === 0) return { ok: false, error: 'The recording was empty.' }
    if (bytes.byteLength > MAX_RECORDING_BYTES) return { ok: false, error: 'The recording is too large to keep.' }
    const meta: RecordingMeta = { id, createdAt: Date.now(), retentionDays: arm.retentionDays }
    writeFileSync(recordingPath(id), bytes)
    writeFileSync(metaPath(id), JSON.stringify(meta), 'utf8')
    arm = null
    return { ok: true }
  })

  ipcMain.handle('recordings:read', (_e, id: unknown): Uint8Array | null => {
    if (!recordingExists(id as string)) return null
    return new Uint8Array(readFileSync(recordingPath(id as string)))
  })

  ipcMain.handle('recordings:delete', (_e, id: unknown): Result => {
    if (!isValidRecordingId(id)) return { ok: false, error: 'That recording could not be found.' }
    rmSync(recordingPath(id), { force: true })
    rmSync(metaPath(id), { force: true })
    return { ok: true }
  })
}
