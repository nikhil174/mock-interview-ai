// Pure state machine for practice-mode recording. No DOM or browser APIs, so it runs under plain Node.
// Any failure leaves the typed answer untouched: the renderer never clears it.

export type RecordingState = 'idle' | 'recording' | 'stopped' | 'failed'
export type RecordingEvent = 'start' | 'started' | 'stop' | 'fail' | 'reset'

export function nextRecordingState(state: RecordingState, event: RecordingEvent): RecordingState {
  switch (event) {
    case 'start':
      // Starting is only allowed from a clean state.
      return state === 'idle' || state === 'stopped' || state === 'failed' ? 'idle' : state
    case 'started':
      return state === 'idle' ? 'recording' : state
    case 'stop':
      return state === 'recording' ? 'stopped' : state
    case 'fail':
      return 'failed'
    case 'reset':
      return 'idle'
  }
}

export function isRecording(state: RecordingState): boolean {
  return state === 'recording'
}
