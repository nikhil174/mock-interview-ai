import { test } from 'node:test'
import assert from 'node:assert/strict'
import { encodeWav } from './wav-core.ts'

test('header describes 16 kHz mono 16-bit PCM', () => {
  const wav = encodeWav(new Float32Array([0, 0.5, -0.5, 1]), 16000)
  const view = new DataView(wav.buffer)
  const str = (o: number, n: number) => String.fromCharCode(...wav.subarray(o, o + n))
  assert.equal(str(0, 4), 'RIFF')
  assert.equal(str(8, 4), 'WAVE')
  assert.equal(view.getUint16(20, true), 1)
  assert.equal(view.getUint16(22, true), 1)
  assert.equal(view.getUint32(24, true), 16000)
  assert.equal(view.getUint16(34, true), 16)
  assert.equal(view.getUint32(40, true), 8)
  assert.equal(wav.byteLength, 44 + 8)
})

test('samples are clamped and scaled', () => {
  const wav = encodeWav(new Float32Array([2, -2]), 16000)
  const view = new DataView(wav.buffer)
  assert.equal(view.getInt16(44, true), 32767)
  assert.equal(view.getInt16(46, true), -32768)
})
