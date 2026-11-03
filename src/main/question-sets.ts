import { app, dialog, ipcMain, BrowserWindow } from 'electron'
import type { OpenDialogOptions, SaveDialogOptions } from 'electron'
import { readFileSync, writeFileSync, statSync } from 'fs'
import { join } from 'path'
import type { QuestionSet, Result } from '../shared/api'
import { parseQuestionSet } from './question-set-core'
import { parseStoredSession } from './session-core'

const MAX_FILE_BYTES = 256 * 1024

// Reads a company question set the user picks. The file is only read, never written to.
export function registerQuestionSetHandlers(): void {
  ipcMain.handle('questionsets:import', async (e): Promise<{ ok: true; set: QuestionSet } | { ok: false; error: string } | { ok: false; cancelled: true }> => {
    const win = BrowserWindow.fromWebContents(e.sender) ?? undefined
    const opts: OpenDialogOptions = {
      title: 'Choose a question set',
      properties: ['openFile'],
      filters: [{ name: 'Question set (JSON)', extensions: ['json'] }]
    }
    const picked = win ? await dialog.showOpenDialog(win, opts) : await dialog.showOpenDialog(opts)
    if (picked.canceled || picked.filePaths.length === 0) return { ok: false, cancelled: true }

    const path = picked.filePaths[0]
    if (statSync(path).size > MAX_FILE_BYTES) return { ok: false, error: 'This file is too large to be a question set.' }
    const result = parseQuestionSet(readFileSync(path, 'utf8'))
    return result.ok ? { ok: true, set: result.set } : { ok: false, error: result.error }
  })

  // The candidate chooses to export one session, with a save dialog. Nothing is shared automatically.
  ipcMain.handle('sessions:export', async (e, id: string): Promise<Result> => {
    const sessionsDir = join(app.getPath('userData'), 'sessions')
    const sourcePath = join(sessionsDir, `${String(id).replace(/[^a-zA-Z0-9-]/g, '')}.json`)
    let session
    try {
      session = parseStoredSession(readFileSync(sourcePath, 'utf8'))
    } catch {
      return { ok: false, error: 'That session could not be found.' }
    }
    if (!session) return { ok: false, error: 'That session could not be read.' }

    const win = BrowserWindow.fromWebContents(e.sender) ?? undefined
    const saveOpts: SaveDialogOptions = {
      title: 'Export this practice session',
      defaultPath: `practice-${session.id}.json`,
      filters: [{ name: 'Practice session (JSON)', extensions: ['json'] }]
    }
    const saved = win ? await dialog.showSaveDialog(win, saveOpts) : await dialog.showSaveDialog(saveOpts)
    if (saved.canceled || !saved.filePath) return { ok: false, error: 'Export cancelled.' }

    // Only the practice content goes out. No API key or other app state is included.
    const exported = {
      format: 'mock-interview-session',
      version: 1,
      exportedAt: new Date().toISOString(),
      question: session.question,
      answer: session.answer,
      feedback: session.feedback,
      practicedAt: new Date(session.createdAt).toISOString(),
      consentAt: session.consentAt ? new Date(session.consentAt).toISOString() : null
    }
    writeFileSync(saved.filePath, JSON.stringify(exported, null, 2), 'utf8')
    return { ok: true }
  })
}
