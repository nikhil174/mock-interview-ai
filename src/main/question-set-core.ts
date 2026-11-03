// Pure validation for company-provided question sets. No Electron imports, so it runs under plain Node.
// A question set is a JSON file a company gives to candidates for practice. It holds questions only:
// no answers, no model responses, no scoring rules, and nothing that reaches an interview.

export interface QuestionSetItem {
  category: string
  text: string
}

export interface QuestionSet {
  name: string
  questions: QuestionSetItem[]
}

export const MAX_QUESTIONS = 200
export const MAX_TEXT_LENGTH = 500
export const MAX_NAME_LENGTH = 100

export type ParseResult = { ok: true; set: QuestionSet } | { ok: false; error: string }

export function parseQuestionSet(raw: string): ParseResult {
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    return { ok: false, error: 'This file is not valid JSON.' }
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { ok: false, error: 'The file must contain an object with "name" and "questions".' }
  }
  const obj = data as Record<string, unknown>

  const name = typeof obj.name === 'string' ? obj.name.trim() : ''
  if (!name) return { ok: false, error: 'The question set needs a non-empty "name".' }
  if (name.length > MAX_NAME_LENGTH) return { ok: false, error: `The name must be ${MAX_NAME_LENGTH} characters or fewer.` }

  if (!Array.isArray(obj.questions)) return { ok: false, error: 'The "questions" field must be a list.' }
  if (obj.questions.length === 0) return { ok: false, error: 'The question set has no questions.' }
  if (obj.questions.length > MAX_QUESTIONS) {
    return { ok: false, error: `A question set can have at most ${MAX_QUESTIONS} questions.` }
  }

  const questions: QuestionSetItem[] = []
  for (let i = 0; i < obj.questions.length; i++) {
    const item = obj.questions[i] as Record<string, unknown> | null
    if (!item || typeof item !== 'object') {
      return { ok: false, error: `Question ${i + 1} is not an object.` }
    }
    const text = typeof item.text === 'string' ? item.text.trim() : ''
    if (!text) return { ok: false, error: `Question ${i + 1} has no "text".` }
    if (text.length > MAX_TEXT_LENGTH) {
      return { ok: false, error: `Question ${i + 1} must be ${MAX_TEXT_LENGTH} characters or fewer.` }
    }
    const category = typeof item.category === 'string' && item.category.trim() ? item.category.trim() : 'General'
    questions.push({ category: category.slice(0, MAX_NAME_LENGTH), text })
  }

  return { ok: true, set: { name, questions } }
}
