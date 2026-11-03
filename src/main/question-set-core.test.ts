import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseQuestionSet, MAX_QUESTIONS } from './question-set-core.ts'

test('a valid set parses with trimmed text and a default category', () => {
  const raw = JSON.stringify({
    name: '  Backend round  ',
    questions: [
      { category: 'Backend', text: '  How do you cache data?  ' },
      { text: 'Explain indexes.' }
    ]
  })
  const result = parseQuestionSet(raw)
  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.equal(result.set.name, 'Backend round')
  assert.deepEqual(result.set.questions, [
    { category: 'Backend', text: 'How do you cache data?' },
    { category: 'General', text: 'Explain indexes.' }
  ])
})

test('invalid JSON is rejected without throwing', () => {
  const result = parseQuestionSet('{nope')
  assert.equal(result.ok, false)
})

test('a set with no questions is rejected', () => {
  const result = parseQuestionSet(JSON.stringify({ name: 'x', questions: [] }))
  assert.equal(result.ok, false)
})

test('a set over the question limit is rejected', () => {
  const questions = Array.from({ length: MAX_QUESTIONS + 1 }, (_, i) => ({ text: `Q${i}` }))
  const result = parseQuestionSet(JSON.stringify({ name: 'big', questions }))
  assert.equal(result.ok, false)
})

test('an item without text is rejected and names the question', () => {
  const result = parseQuestionSet(JSON.stringify({ name: 'x', questions: [{ text: 'ok' }, { category: 'A' }] }))
  assert.equal(result.ok, false)
  if (!result.ok) assert.match(result.error, /Question 2/)
})

test('extra fields such as answers are ignored, not stored', () => {
  const raw = JSON.stringify({
    name: 'x',
    questions: [{ text: 'Q', modelAnswer: 'secret', scoring: 'rubric' }]
  })
  const result = parseQuestionSet(raw)
  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.deepEqual(result.set.questions[0], { category: 'General', text: 'Q' })
})

test('an array at the top level is rejected', () => {
  assert.equal(parseQuestionSet('[]').ok, false)
})
