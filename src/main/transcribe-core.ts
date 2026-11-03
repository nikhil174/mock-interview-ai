// Pure transcription logic. No Electron imports, so it runs under plain Node.
// Transcription runs only after the main process has checked a single-use voice consent token.
import { authorizeFeedback, type ConsentStore, type Decision } from './consent-core.ts'

export const MAX_AUDIO_BYTES = 10 * 1024 * 1024 // 10 MB, about 5 minutes of compressed speech

export interface TranscriptionProvider {
  // Turns audio into text. Must not keep the audio after it returns.
  transcribe(audio: Uint8Array): Promise<string>
}

export class TranscriptionUnavailable extends Error {}

export function authorizeTranscription(
  store: ConsentStore,
  voiceToken: unknown,
  requestId: string,
  now: number
): Decision {
  return authorizeFeedback(store, voiceToken, requestId, now)
}

export function validateAudio(audio: unknown): { ok: true; bytes: Uint8Array } | { ok: false; error: string } {
  if (!(audio instanceof Uint8Array) || audio.byteLength === 0) {
    return { ok: false, error: 'No audio was recorded. Try again, or type your answer.' }
  }
  if (audio.byteLength > MAX_AUDIO_BYTES) {
    return { ok: false, error: 'That recording is too long. Keep answers under about 5 minutes.' }
  }
  return { ok: true, bytes: audio }
}

// Maps provider failures to a message the candidate can act on. The typed answer is never affected.
export async function runTranscription(
  provider: TranscriptionProvider,
  audio: Uint8Array
): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  try {
    const text = (await provider.transcribe(audio)).trim()
    if (!text) return { ok: false, error: 'No speech was detected. Try again, or type your answer.' }
    return { ok: true, text }
  } catch (err) {
    if (err instanceof TranscriptionUnavailable) {
      return { ok: false, error: 'Voice transcription is not set up on this computer. Type your answer instead.' }
    }
    return { ok: false, error: 'Transcription failed. Type your answer instead.' }
  }
}
