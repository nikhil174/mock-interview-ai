import { app, ipcMain, safeStorage } from 'electron'
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'fs'
import { join } from 'path'
import type { Result } from '../shared/api'

// The API key is encrypted with Windows DPAPI via safeStorage.
// It is only read in the main process and is never sent to the renderer.
function keyFile(): string {
  return join(app.getPath('userData'), 'deepseek.key.enc')
}

export function readKey(): string | null {
  const file = keyFile()
  if (!existsSync(file) || !safeStorage.isEncryptionAvailable()) return null
  try {
    return safeStorage.decryptString(readFileSync(file))
  } catch {
    return null
  }
}

export function registerSecretHandlers(): void {
  ipcMain.handle('key:status', (): boolean => existsSync(keyFile()))

  ipcMain.handle('key:set', (_e, key: string): Result => {
    if (!safeStorage.isEncryptionAvailable()) {
      return { ok: false, error: 'Secure storage is not available on this machine.' }
    }
    const trimmed = String(key).trim()
    if (!trimmed) return { ok: false, error: 'The key is empty.' }
    writeFileSync(keyFile(), safeStorage.encryptString(trimmed))
    return { ok: true }
  })

  ipcMain.handle('key:clear', (): void => {
    if (existsSync(keyFile())) unlinkSync(keyFile())
  })
}
