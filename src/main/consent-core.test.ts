import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  authorizeFeedback,
  consentForSave,
  createConsentStore,
  NOT_ACKNOWLEDGED,
  TOKEN_TTL_MS
} from './consent-core.ts'

const NOW = 1_000_000

test('direct feedback request with no token is rejected', () => {
  const store = createConsentStore()
  assert.deepEqual(authorizeFeedback(store, undefined, 'req-1', NOW), {
    ok: false,
    error: NOT_ACKNOWLEDGED
  })
  assert.deepEqual(authorizeFeedback(store, '', 'req-1', NOW), {
    ok: false,
    error: NOT_ACKNOWLEDGED
  })
})

test('a made-up token the main process never issued is rejected', () => {
  const store = createConsentStore()
  assert.equal(authorizeFeedback(store, 'forged-token', 'req-1', NOW).ok, false)
})

test('a token the main process issued is accepted once', () => {
  const store = createConsentStore()
  store.issue('tok-a', NOW)
  assert.deepEqual(authorizeFeedback(store, 'tok-a', 'req-1', NOW + 1), { ok: true })
  // Reusing the same token for another request fails.
  assert.equal(authorizeFeedback(store, 'tok-a', 'req-2', NOW + 2).ok, false)
})

test('an expired token is rejected', () => {
  const store = createConsentStore()
  store.issue('tok-old', NOW)
  assert.equal(authorizeFeedback(store, 'tok-old', 'req-1', NOW + TOKEN_TTL_MS + 1).ok, false)
})

test('the consent time comes from the main process issue time, not the renderer', () => {
  const store = createConsentStore()
  store.issue('tok-b', NOW)
  authorizeFeedback(store, 'tok-b', 'req-1', NOW + 5)
  assert.deepEqual(consentForSave(store, 'req-1'), { ok: true, consentAt: NOW })
})

test('saving without an authorized feedback request is rejected', () => {
  const store = createConsentStore()
  const result = consentForSave(store, 'never-authorized')
  assert.equal(result.ok, false)
})

test('a feedback request can be saved only once', () => {
  const store = createConsentStore()
  store.issue('tok-c', NOW)
  authorizeFeedback(store, 'tok-c', 'req-1', NOW)
  assert.equal(consentForSave(store, 'req-1').ok, true)
  assert.equal(consentForSave(store, 'req-1').ok, false)
})
