import { ipcMain } from 'electron'
import { randomUUID } from 'crypto'
import { createConsentStore } from './consent-core'

// One store for the app's lifetime. Tokens and attestations live only in main-process memory.
export const consentStore = createConsentStore()

export function registerConsentHandlers(): void {
  ipcMain.handle('consent:acknowledge', (): string => {
    const token = randomUUID()
    consentStore.issue(token, Date.now())
    return token
  })
}
