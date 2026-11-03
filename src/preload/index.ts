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
  sessions: {
    list: () => ipcRenderer.invoke('sessions:list'),
    save: (session) => ipcRenderer.invoke('sessions:save', session)
  },
  feedback: {
    start: (requestId, question, answer) =>
      ipcRenderer.invoke('feedback:start', requestId, question, answer),
    cancel: (requestId) => ipcRenderer.send('feedback:cancel', requestId),
    onChunk: (cb) => {
      const listener = (_event: IpcRendererEvent, chunk: FeedbackChunk) => cb(chunk)
      ipcRenderer.on('feedback:chunk', listener)
      return () => ipcRenderer.removeListener('feedback:chunk', listener)
    }
  }
}

contextBridge.exposeInMainWorld('api', api)
