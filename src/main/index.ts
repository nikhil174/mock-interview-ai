import { app, BrowserWindow, session } from 'electron'
import { allowMicrophone } from './mic-permission-core'
import { join } from 'path'
import { registerConsentHandlers } from './consent'
import { registerFeedbackHandlers } from './feedback'
import { registerSecretHandlers } from './secrets'
import { registerSessionHandlers } from './sessions'
import { registerQuestionSetHandlers } from './question-sets'
import { registerTranscribeHandlers } from './transcribe'

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

// Only the app's own pages can get microphone access, and only for audio.
function allowedOrigins(): string[] {
  const dev = process.env['ELECTRON_RENDERER_URL']
  return dev ? ['file://', new URL(dev).origin] : ['file://']
}

function registerPermissionHandlers(): void {
  const ses = session.defaultSession
  ses.setPermissionRequestHandler((_wc, permission, callback, details) => {
    const mediaTypes = 'mediaTypes' in details ? details.mediaTypes : undefined
    const requestingUrl = 'requestingUrl' in details ? details.requestingUrl : undefined
    callback(allowMicrophone({ permission, mediaTypes, requestingUrl }, allowedOrigins()))
  })
  ses.setPermissionCheckHandler((_wc, permission, requestingOrigin) =>
    allowMicrophone({ permission, mediaTypes: ['audio'], requestingUrl: requestingOrigin }, allowedOrigins())
  )
}

app.whenReady().then(() => {
  registerPermissionHandlers()
  registerSecretHandlers()
  registerConsentHandlers()
  registerFeedbackHandlers()
  registerSessionHandlers()
  registerQuestionSetHandlers()
  registerTranscribeHandlers()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  app.quit()
})
