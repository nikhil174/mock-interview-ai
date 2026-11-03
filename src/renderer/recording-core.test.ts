import { test } from 'node:test'
import assert from 'node:assert/strict'
import { nextRecordingState, isRecording } from './recording-core.ts'

test('start then started moves to recording', () => {
  let s = nextRecordingState('idle', 'start')
  s = nextRecordingState(s, 'started')
  assert.equal(s, 'recording')
  assert.equal(isRecording(s), true)
})

test('stop from recording moves to stopped', () => {
  assert.equal(nextRecordingState('recording', 'stop'), 'stopped')
})

test('a failure at any point ends in failed', () => {
  for (const s of ['idle', 'recording', 'stopped'] as const) {
    assert.equal(nextRecordingState(s, 'fail'), 'failed')
  }
})

test('stop is ignored when not recording', () => {
  assert.equal(nextRecordingState('idle', 'stop'), 'idle')
})

test('started is ignored unless a start was requested', () => {
  assert.equal(nextRecordingState('stopped', 'started'), 'stopped')
})

test('reset returns to idle from any state', () => {
  for (const s of ['recording', 'stopped', 'failed'] as const) {
    assert.equal(nextRecordingState(s, 'reset'), 'idle')
  }
})
