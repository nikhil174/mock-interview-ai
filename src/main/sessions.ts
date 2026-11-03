import { app, ipcMain } from 'electron'
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { randomUUID } from 'crypto'
import type { Result, SavedSession } from '../shared/api'
import { consentForSave } from './consent-core'
import { consentStore } from './consent'
import { parseStoredSession } from './session-core'

// Each practice session is one JSON file in %APPDATA%\Mock Interview AI\sessions
function sessionsDir(): string {
  const dir = join(app.getPath('userData'), 'sessions')
  mkdirSync(dir, { recursive: true })
  return dir
}

function readSession(path: string): SavedSession | null {
  return parseStoredSession(readFileSync(path, 'utf8'))
}

export function registerSessionHandlers(): void {
  ipcMain.handle('sessions:list', (): SavedSession[] => {
    const dir = sessionsDir()
    return readdirSync(dir)
      .filter((f) => f.endsWith('.json'))
      .map((f) => readSession(join(dir, f)))
      .filter((s): s is SavedSession => s !== null)
      .sort((a, b) => b.createdAt - a.createdAt)
  })

  // The renderer passes only the requestId and content. The consent time is taken from the main process.
  ipcMain.handle(
    'sessions:save',
    (_e, requestId: string, session: { question: string; answer: string; feedback: string }): Result => {
      const consent = consentForSave(consentStore, String(requestId))
      if (!consent.ok) return consent

      const full: SavedSession = {
        question: String(session.question),
        answer: String(session.answer),
        feedback: String(session.feedback),
        consentAt: consent.consentAt,
        id: randomUUID(),
        createdAt: Date.now()
      }
      writeFileSync(join(sessionsDir(), `${full.id}.json`), JSON.stringify(full, null, 2), 'utf8')
      return { ok: true }
    }
  )
}
