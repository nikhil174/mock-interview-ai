import { ipcMain } from 'electron'
import { randomUUID } from 'crypto'
import type { Result } from '../shared/api'
import { consentStore } from './consent'
import { authorizeTranscription, runTranscription, validateAudio } from './transcribe-core'
import { whisperAdapter } from './whisper-adapter'

// Voice consent: a separate single-use token, issued only by the main process.
export function registerTranscribeHandlers(): void {
  ipcMain.handle('voice:acknowledge', (): string => {
    const token = randomUUID()
    consentStore.issue(token, Date.now())
    return token
  })

  // Transcribes one recording. Audio is passed in memory and is not written to disk.
  // The returned text is attested to the request, so sessions:save can accept it once.
  ipcMain.handle(
    'transcribe:run',
    async (_e, requestId: string, voiceToken: string, audio: unknown): Promise<{ ok: true; text: string } | { ok: false; error: string }> => {
      const auth = authorizeTranscription(consentStore, voiceToken, String(requestId), Date.now())
      if (!auth.ok) return auth
      const checked = validateAudio(audio)
      if (!checked.ok) return checked
      return runTranscription(whisperAdapter(), checked.bytes)
    }
  )
}

export type { Result }
