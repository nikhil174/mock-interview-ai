import { useEffect, useRef, useState } from 'react'
import { VOICE_NOTICE } from '../shared/api'
import { nextRecordingState, isRecording, type RecordingState } from './recording-core'
import { blobToWav16k } from './audio'

interface Props {
  onTranscript: (text: string) => void
  onFail: (message: string) => void
  busy: boolean
}

// Voice answers: record while the button is on, then transcribe on this computer.
// The recording is held in memory only and is dropped after it is transcribed.
export default function RecordingControls({ onTranscript, onFail, busy }: Props) {
  const [state, setState] = useState<RecordingState>('idle')
  const [accepted, setAccepted] = useState(false)
  const [working, setWorking] = useState(false)
  const streamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  function releaseMic() {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }

  async function start() {
    setState((s) => nextRecordingState(s, 'start'))
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      chunksRef.current = []
      const recorder = new MediaRecorder(stream)
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorder.onstop = () => void finish()
      recorderRef.current = recorder
      recorder.start()
      setState((s) => nextRecordingState(s, 'started'))
    } catch {
      setState((s) => nextRecordingState(s, 'fail'))
      onFail('Microphone is not available. Type your answer instead.')
    }
  }

  async function finish() {
    releaseMic()
    const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
    chunksRef.current = []
    recorderRef.current = null
    setWorking(true)
    try {
      if (blob.size === 0) {
        onFail('No audio was recorded. Try again, or type your answer.')
        return
      }
      const wav = await blobToWav16k(blob)
      const requestId = Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
      const voiceToken = await window.api.voice.acknowledge()
      const result = await window.api.transcribe.run(requestId, voiceToken, wav)
      if (result.ok) onTranscript(result.text)
      else onFail(result.error)
    } catch {
      onFail('Transcription failed. Type your answer instead.')
    } finally {
      setWorking(false)
    }
  }

  // The microphone is released in finish(), after the recorder has flushed its last chunk.
  function stop() {
    recorderRef.current?.stop()
    setState((s) => nextRecordingState(s, 'stop'))
  }

  // Release the microphone if the page goes away while recording.
  useEffect(() => () => { releaseMic() }, [])

  const disabled = busy || working

  if (!accepted) {
    return (
      <div className="keybox">
        <strong>Voice answer notice</strong>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          {VOICE_NOTICE.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <label>
          <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} /> I understand this
          is practice, and my voice is turned into text on this computer.
        </label>
      </div>
    )
  }

  return (
    <div className="toolbar" aria-live="polite">
      {working ? (
        <span className="hint" role="status">Transcribing on this computer...</span>
      ) : isRecording(state) ? (
        <>
          <span className="hint" role="status">● Recording. Audio is not saved.</span>
          <button onClick={stop}>Stop recording</button>
        </>
      ) : (
        <button onClick={() => void start()} disabled={disabled}>
          Start recording
        </button>
      )}
    </div>
  )
}
