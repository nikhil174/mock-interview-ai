import { test } from 'node:test'
import assert from 'node:assert/strict'
import { remainingSeconds, nextPhase, followUpFor, ROUND_LIMIT_SECONDS } from './round-core.ts'

test('remaining time counts down and never goes below zero', () => {
  assert.equal(remainingSeconds(0, 0, 300), 300)
  assert.equal(remainingSeconds(0, 60_000, 300), 240)
  assert.equal(remainingSeconds(0, 999_999_999, 300), 0)
})

test('a round goes from main question to follow-up to done', () => {
  assert.equal(nextPhase('main'), 'followup')
  assert.equal(nextPhase('followup'), 'done')
  assert.equal(nextPhase('done'), 'done')
})

test('the default limit is five minutes', () => {
  assert.equal(ROUND_LIMIT_SECONDS, 300)
})

test('follow-ups come from the category and wrap around', () => {
  const a = followUpFor('Backend', 0)
  assert.equal(typeof a, 'string')
  assert.equal(followUpFor('Backend', 3), a)
  assert.notEqual(followUpFor('Backend', 1), a)
})

test('an unknown category falls back to general follow-ups', () => {
  assert.equal(followUpFor('Unknown', 0), followUpFor('General', 0))
})

test('no follow-up contains a model answer or a hint', () => {
  for (const c of ['Backend', 'System design', 'Behavioral', 'General']) {
    for (let i = 0; i < 3; i++) {
      assert.doesNotMatch(followUpFor(c, i), /hint|answer is|you should say/i)
    }
  }
})
