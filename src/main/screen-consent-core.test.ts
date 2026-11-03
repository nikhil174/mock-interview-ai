import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createConsentStore, TOKEN_TTL_MS } from './consent-core.ts'
import { redeemScreenToken } from './screen-consent-core.ts'

test('a screen token the main process issued is accepted once', () => {
  const store = createConsentStore()
  store.issue('s1', 0)
  assert.equal(redeemScreenToken(store, 's1', 1).ok, true)
  assert.equal(redeemScreenToken(store, 's1', 2).ok, false)
})

test('a made-up or missing screen token is rejected', () => {
  const store = createConsentStore()
  assert.equal(redeemScreenToken(store, 'nope', 0).ok, false)
  assert.equal(redeemScreenToken(store, undefined, 0).ok, false)
  assert.equal(redeemScreenToken(store, '', 0).ok, false)
})

test('an expired screen token is rejected', () => {
  const store = createConsentStore()
  store.issue('s1', 0)
  assert.equal(redeemScreenToken(store, 's1', TOKEN_TTL_MS + 1).ok, false)
})

test('a token from another consent store (voice, feedback) is rejected here', () => {
  const screenStore = createConsentStore()
  const voiceStore = createConsentStore()
  voiceStore.issue('v1', 0)
  assert.equal(redeemScreenToken(screenStore, 'v1', 1).ok, false)
})
