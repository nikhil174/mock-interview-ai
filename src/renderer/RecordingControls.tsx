import { useEffect, useRef, useState } from 'react'
import { nextRecordingState, isRecording, type RecordingState } from './recording-core'

// Phase 1: the microphone can be turned on and off with a visible indicator.
// Audio is not saved and not sent anywhere yet. Transcription comes in Phase 2.
export default function RecordingControls({ onFail }: { onFail: (message: string) => void }) {
  const [state, setState] = useState<RecordingState>('idle')
  const streamRef = useRef<MediaStream | null>(null)

  function release() {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }

  async function start() {
    setState((s) => nextRecordingState(s, 'start'))
    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true })
      setState((s) => nextRecordingState(s, 'started'))
    } catch {
      setState((s) => nextRecordingState(s, 'fail'))
      onFail('Microphone is not available. Type your answer instead.')
    }
  }

  function stop() {
    release()
    setState((s) => nextRecordingState(s, 'stop'))
  }

  // Release the microphone if the page goes away while recording.
  useEffect(() => release, [])

  return (
    <div className="toolbar" aria-live="polite">
      {isRecording(state) ? (
        <>
          <span className="hint" role="status">● Recording. Audio is not saved.</span>
          <button onClick={stop}>Stop recording</button>
        </>
      ) : (
        <button onClick={() => void start()}>Start recording</button>
      )}
    </div>
  )
}
