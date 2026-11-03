import { app, ipcMain } from 'electron'
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { randomUUID } from 'crypto'
import type { SavedSession } from '../shared/api'

// Each practice session is one JSON file in %APPDATA%\Mock Interview AI\sessions
function sessionsDir(): string {
  const dir = join(app.getPath('userData'), 'sessions')
  mkdirSync(dir, { recursive: true })
  return dir
}

export function registerSessionHandlers(): void {
  ipcMain.handle('sessions:list', (): SavedSession[] => {
    const dir = sessionsDir()
    return readdirSync(dir)
      .filter((f) => f.endsWith('.json'))
      .map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')) as SavedSession)
      .sort((a, b) => b.createdAt - a.createdAt)
  })

  ipcMain.handle(
    'sessions:save',
    (_e, session: Omit<SavedSession, 'id' | 'createdAt'>): void => {
      // A session without an acknowledged notice is not saved.
      if (!session.consentAt || session.consentAt <= 0) {
        throw new Error('Practice notice must be acknowledged before saving a session.')
      }
      const full: SavedSession = {
        question: String(session.question),
        answer: String(session.answer),
        feedback: String(session.feedback),
        consentAt: Number(session.consentAt),
        id: randomUUID(),
        createdAt: Date.now()
      }
      writeFileSync(join(sessionsDir(), `${full.id}.json`), JSON.stringify(full, null, 2), 'utf8')
    }
  )
}
