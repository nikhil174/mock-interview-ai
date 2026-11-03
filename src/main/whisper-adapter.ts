import { existsSync } from 'fs'
import { join } from 'path'
import { app } from 'electron'
import { TranscriptionUnavailable, type TranscriptionProvider } from './transcribe-core'

// Local Whisper-style model via whisper.cpp. Audio stays on this computer.
// Not finished: the whisper.cpp binary, the model file, and conversion of recorded audio to 16 kHz WAV
// still need to be added and tested on Windows. Until then this adapter reports "not set up".
export function whisperAdapter(): TranscriptionProvider {
  const modelPath = join(app.getPath('userData'), 'models', 'ggml-base.en.bin')
  return {
    async transcribe() {
      if (!existsSync(modelPath)) throw new TranscriptionUnavailable('model not installed')
      throw new TranscriptionUnavailable('whisper.cpp integration not yet implemented')
    }
  }
}
