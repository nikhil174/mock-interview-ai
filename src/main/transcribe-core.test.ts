import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createConsentStore, TOKEN_TTL_MS } from './consent-core.ts'
import { authorizeTranscription, runTranscription, validateAudio, MAX_AUDIO_BYTES, TranscriptionUnavailable } from './transcribe-core.ts'

test('transcription needs a voice token the main process issued', () => {
  const store = createConsentStore()
  assert.equal(authorizeTranscription(store, 'made-up', 'r1', 0).ok, false)
  store.issue('t1', 0)
  assert.equal(authorizeTranscription(store, 't1', 'r1', 1).ok, true)
})

test('a voice token works once', () => {
  const store = createConsentStore()
  store.issue('t1', 0)
  assert.equal(authorizeTranscription(store, 't1', 'r1', 1).ok, true)
  assert.equal(authorizeTranscription(store, 't1', 'r2', 2).ok, false)
})

test('an expired voice token is rejected', () => {
  const store = createConsentStore()
  store.issue('t1', 0)
  assert.equal(authorizeTranscription(store, 't1', 'r1', TOKEN_TTL_MS + 1).ok, false)
})

test('empty, missing, and oversized audio are rejected', () => {
  assert.equal(validateAudio(new Uint8Array(0)).ok, false)
  assert.equal(validateAudio(undefined).ok, false)
  assert.equal(validateAudio(new Uint8Array(MAX_AUDIO_BYTES + 1)).ok, false)
  assert.equal(validateAudio(new Uint8Array(10)).ok, true)
})

test('a provider that is not set up gives a message that points to typing', async () => {
  const result = await runTranscription({ transcribe: async () => { throw new TranscriptionUnavailable('x') } }, new Uint8Array(4))
  assert.equal(result.ok, false)
  if (!result.ok) assert.match(result.error, /Type your answer/)
})

test('an unexpected provider error does not leak details', async () => {
  const result = await runTranscription({ transcribe: async () => { throw new Error('secret path C:\\x') } }, new Uint8Array(4))
  assert.equal(result.ok, false)
  if (!result.ok) assert.equal(result.error.includes('secret'), false)
})

test('a successful transcript is trimmed, and empty text is reported', async () => {
  const ok = await runTranscription({ transcribe: async () => '  hello there  ' }, new Uint8Array(4))
  assert.deepEqual(ok, { ok: true, text: 'hello there' })
  const empty = await runTranscription({ transcribe: async () => '   ' }, new Uint8Array(4))
  assert.equal(empty.ok, false)
})
