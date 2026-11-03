import { encodeWav } from './wav-core'

const TARGET_RATE = 16000

// Turns a recorded blob (browser audio, usually WebM/Opus) into 16 kHz mono WAV for whisper.cpp.
export async function blobToWav16k(blob: Blob): Promise<Uint8Array> {
  const ctx = new AudioContext()
  try {
    const decoded = await ctx.decodeAudioData(await blob.arrayBuffer())
    const frames = Math.ceil(decoded.duration * TARGET_RATE)
    const offline = new OfflineAudioContext(1, Math.max(1, frames), TARGET_RATE)
    const src = offline.createBufferSource()
    src.buffer = decoded
    src.connect(offline.destination)
    src.start()
    const rendered = await offline.startRendering()
    return encodeWav(rendered.getChannelData(0), TARGET_RATE)
  } finally {
    await ctx.close()
  }
}
