import { contextBridge, ipcRenderer } from 'electron'
import type { IpcRendererEvent } from 'electron'
import type { FeedbackChunk, MockApi } from '../shared/api'

// The only surface the renderer gets. No raw ipcRenderer, no Node APIs.
const api: MockApi = {
  key: {
    status: () => ipcRenderer.invoke('key:status'),
    set: (key) => ipcRenderer.invoke('key:set', key),
    clear: () => ipcRenderer.invoke('key:clear')
  },
  consent: {
    acknowledge: () => ipcRenderer.invoke('consent:acknowledge')
  },
  sessions: {
    list: () => ipcRenderer.invoke('sessions:list'),
    save: (requestId, session) => ipcRenderer.invoke('sessions:save', requestId, session)
  },
  feedback: {
    start: (requestId, consentToken, question, answer) =>
      ipcRenderer.invoke('feedback:start', requestId, consentToken, question, answer),
    cancel: (requestId) => ipcRenderer.send('feedback:cancel', requestId),
    onChunk: (cb) => {
      const listener = (_event: IpcRendererEvent, chunk: FeedbackChunk) => cb(chunk)
      ipcRenderer.on('feedback:chunk', listener)
      return () => ipcRenderer.removeListener('feedback:chunk', listener)
    }
  }
}

contextBridge.exposeInMainWorld('api', api)
