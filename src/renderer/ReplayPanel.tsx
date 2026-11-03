import { useEffect, useRef, useState } from 'react'

interface Props {
  recordingId: string
  offsetMs?: number
}

// Plays the saved screen recording from the start of this answer. Nothing is uploaded or sent.
export default function ReplayPanel({ recordingId, offsetMs }: Props) {
  const [url, setUrl] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    return () => {
      if (url) URL.revokeObjectURL(url)
    }
  }, [url])

  async function load() {
    setNote(null)
    const bytes = await window.api.recordings.read(recordingId)
    if (!bytes) {
      setNote('This recording was deleted or has expired. The transcript and feedback are kept.')
      return
    }
    setUrl(URL.createObjectURL(new Blob([new Uint8Array(bytes).buffer], { type: 'video/webm' })))
  }

  async function remove() {
    const result = await window.api.recordings.delete(recordingId)
    setUrl(null)
    setNote(result.ok ? 'Recording deleted. The transcript and feedback are kept.' : result.error)
  }

  function onLoaded() {
    if (videoRef.current && typeof offsetMs === 'number') videoRef.current.currentTime = offsetMs / 1000
  }

  return (
    <div className="keybox">
      <strong>Screen recording</strong>
      {url ? (
        <video ref={videoRef} src={url} controls onLoadedMetadata={onLoaded} style={{ width: '100%' }} />
      ) : (
        <div className="toolbar">
          <button onClick={() => void load()}>Play from this answer</button>
        </div>
      )}
      <div className="toolbar">
        <button onClick={() => void remove()}>Delete recording</button>
      </div>
      {note && <p className="hint">{note}</p>}
    </div>
  )
}
