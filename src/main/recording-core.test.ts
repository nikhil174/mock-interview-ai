import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isValidRecordingId, isValidRetention, isExpired, displayAllowed, parseMeta, ARM_TTL_MS } from './recording-core.ts'

const DAY = 24 * 60 * 60 * 1000

test('recording ids must be plain tokens', () => {
  assert.equal(isValidRecordingId('abc12345-xyz'), true)
  assert.equal(isValidRecordingId('../../etc/passwd'), false)
  assert.equal(isValidRecordingId('short'), false)
  assert.equal(isValidRecordingId(undefined), false)
})

test('only 7 or 30 days of retention are allowed', () => {
  assert.equal(isValidRetention(7), true)
  assert.equal(isValidRetention(30), true)
  assert.equal(isValidRetention(0), false)
  assert.equal(isValidRetention(365), false)
})

test('a recording expires after its retention period', () => {
  const meta = { id: 'abc12345', createdAt: 0, retentionDays: 7 as const }
  assert.equal(isExpired(meta, 7 * DAY), false)
  assert.equal(isExpired(meta, 7 * DAY + 1), true)
})

test('screen capture is allowed only while armed and fresh', () => {
  assert.equal(displayAllowed(null, 0), false)
  const arm = { id: 'abc12345', retentionDays: 7 as const, armedAt: 0 }
  assert.equal(displayAllowed(arm, 1000), true)
  assert.equal(displayAllowed(arm, ARM_TTL_MS + 1), false)
})

test('corrupt or incomplete metadata is ignored', () => {
  assert.equal(parseMeta('{nope'), null)
  assert.equal(parseMeta(JSON.stringify({ id: '../x', createdAt: 1, retentionDays: 7 })), null)
  assert.equal(parseMeta(JSON.stringify({ id: 'abc12345', createdAt: 1, retentionDays: 99 })), null)
  assert.deepEqual(parseMeta(JSON.stringify({ id: 'abc12345', createdAt: 1, retentionDays: 7 })), {
    id: 'abc12345', createdAt: 1, retentionDays: 7
  })
})
