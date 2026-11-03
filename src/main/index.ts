import { app, BrowserWindow } from 'electron'
import { join } from 'path'
import { registerConsentHandlers } from './consent'
import { registerFeedbackHandlers } from './feedback'
import { registerSecretHandlers } from './secrets'
import { registerSessionHandlers } from './sessions'
import { registerQuestionSetHandlers } from './question-sets'

function createWindow(): void {
  const win = new BrowserWindow({
    width: 960,
    height: 720,
    title: 'Mock Interview AI',
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      sandbox: true
    }
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    void win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    void win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  registerSecretHandlers()
  registerConsentHandlers()
  registerFeedbackHandlers()
  registerSessionHandlers()
  registerQuestionSetHandlers()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  app.quit()
})
