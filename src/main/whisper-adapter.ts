import { execFile } from 'child_process'
import { existsSync, mkdirSync, unlinkSync, writeFileSync, readFileSync } from 'fs'
import { join } from 'path'
import { randomUUID } from 'crypto'
import { app } from 'electron'
import { TranscriptionUnavailable, type TranscriptionProvider } from './transcribe-core'

// Local Whisper-style model via whisper.cpp. Audio stays on this computer.
// Expected files (installed by hand, see ROADMAP.md):
//   <userData>/whisper/whisper-cli.exe   the whisper.cpp command-line program
//   <userData>/models/ggml-base.en.bin   the model file
const TIMEOUT_MS = 120_000

function paths() {
  const base = app.getPath('userData')
  return {
    cli: join(base, 'whisper', 'whisper-cli.exe'),
    model: join(base, 'models', 'ggml-base.en.bin'),
    tmp: join(base, 'tmp')
  }
}

export function whisperAdapter(): TranscriptionProvider {
  return {
    async transcribe(audio: Uint8Array): Promise<string> {
      const p = paths()
      if (!existsSync(p.cli) || !existsSync(p.model)) throw new TranscriptionUnavailable('not installed')

      // The WAV exists only for the length of one run and is deleted in finally.
      mkdirSync(p.tmp, { recursive: true })
      const wavPath = join(p.tmp, `${randomUUID()}.wav`)
      try {
        writeFileSync(wavPath, audio)
        const text = await new Promise<string>((resolve, reject) => {
          execFile(
            p.cli,
            ['-m', p.model, '-f', wavPath, '-nt', '-np', '-l', 'en'],
            { timeout: TIMEOUT_MS, maxBuffer: 1024 * 1024, windowsHide: true },
            (err, stdout) => (err ? reject(err) : resolve(String(stdout)))
          )
        })
        return text.trim()
      } finally {
        try {
          unlinkSync(wavPath)
        } catch {
          // Already gone; nothing to do.
        }
      }
    }
  }
}
