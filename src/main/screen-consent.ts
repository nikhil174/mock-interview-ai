import { ipcMain } from 'electron'
import { randomUUID } from 'crypto'
import { createConsentStore } from './consent-core'

// Screen consent has its own store, so a voice or feedback token can never satisfy it.
export const screenConsentStore = createConsentStore()

// Issues one token each time the candidate accepts the screen notice for a round.
// Recording itself is not started by this step.
export function registerScreenConsentHandlers(): void {
  ipcMain.handle('screen:acknowledge', (): string => {
    const token = randomUUID()
    screenConsentStore.issue(token, Date.now())
    return token
  })
}
