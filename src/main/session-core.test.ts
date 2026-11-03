import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseStoredSession } from './session-core.ts'

test('a session with consentAt loads with its timestamp', () => {
  const raw = JSON.stringify({
    id: 'a', question: 'Q', answer: 'A', feedback: 'F', consentAt: 123, createdAt: 456
  })
  assert.deepEqual(parseStoredSession(raw), {
    id: 'a', question: 'Q', answer: 'A', feedback: 'F', consentAt: 123, createdAt: 456
  })
})

test('a legacy session without consentAt still loads', () => {
  const raw = JSON.stringify({ id: 'old', question: 'Q', answer: 'A', feedback: 'F', createdAt: 456 })
  const session = parseStoredSession(raw)
  assert.ok(session, 'legacy session should load')
  assert.equal(session.question, 'Q')
  assert.equal(session.consentAt, undefined)
})

test('a corrupt file returns null instead of throwing', () => {
  assert.equal(parseStoredSession('{not json'), null)
})

test('a file missing core fields is skipped', () => {
  assert.equal(parseStoredSession(JSON.stringify({ id: 'x' })), null)
})

test('a voice session keeps its source and transcript', () => {
  const raw = JSON.stringify({ id: 'v', question: 'Q', answer: 'A', feedback: 'F', createdAt: 1, source: 'voice', transcript: 'spoken words' })
  const s = parseStoredSession(raw)
  assert.ok(s)
  assert.equal(s.source, 'voice')
  assert.equal(s.transcript, 'spoken words')
})

test('an unknown source value is dropped, not kept', () => {
  const raw = JSON.stringify({ id: 'v', question: 'Q', answer: 'A', feedback: 'F', createdAt: 1, source: 'audio' })
  const s = parseStoredSession(raw)
  assert.ok(s)
  assert.equal(s.source, undefined)
})
