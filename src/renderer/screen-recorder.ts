import type { Result } from '../shared/api'

export interface ActiveRecording {
  id: string
  startedAt: number
  recorder: MediaRecorder
  stream: MediaStream
  chunks: Blob[]
}

// Asks for the screen notice token, arms one recording in the main process, then starts capture.
// Capture uses the primary screen. Window choice is not available yet.
export async function startScreenRecording(retentionDays: 7 | 30): Promise<ActiveRecording> {
  const token = await window.api.screen.acknowledge()
  const begun = await window.api.screen.begin(token, retentionDays)
  if (!begun.ok) throw new Error(begun.error)

  const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false })
  const chunks: Blob[] = []
  const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' })
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data)
  }
  recorder.start(1000)
  // If the candidate stops sharing from the OS, end the recording cleanly.
  stream.getVideoTracks()[0]?.addEventListener('ended', () => {
    if (recorder.state !== 'inactive') recorder.stop()
  })
  return { id: begun.id, startedAt: Date.now(), recorder, stream, chunks }
}

// Stops capture, releases the screen, and saves the file locally. Nothing is uploaded.
export async function finishScreenRecording(rec: ActiveRecording): Promise<Result> {
  if (rec.recorder.state !== 'inactive') {
    await new Promise<void>((resolve) => {
      rec.recorder.onstop = () => resolve()
      rec.recorder.stop()
    })
  }
  rec.stream.getTracks().forEach((t) => t.stop())
  const blob = new Blob(rec.chunks, { type: 'video/webm' })
  if (blob.size === 0) return { ok: false, error: 'The screen recording was empty and was not kept.' }
  return window.api.recordings.save(rec.id, new Uint8Array(await blob.arrayBuffer()))
}

// Used when the screen view is closed before a round finishes. Nothing is saved.
export function discardScreenRecording(rec: ActiveRecording): void {
  if (rec.recorder.state !== 'inactive') rec.recorder.stop()
  rec.stream.getTracks().forEach((t) => t.stop())
}
