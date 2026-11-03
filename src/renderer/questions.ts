export interface QuestionItem {
  category: string
  text: string
}

// Built-in practice questions. A company question set, once imported, replaces this pool for the session.
export const BUILT_IN_QUESTIONS: QuestionItem[] = [
  { category: 'Backend', text: 'Explain how Spring Boot auto-configuration decides which beans to create.' },
  { category: 'Backend', text: 'How would you design a rate limiter for a public REST API?' },
  { category: 'Backend', text: 'What is the difference between optimistic and pessimistic locking, and when would you pick each?' },
  { category: 'Backend', text: 'How do you find and fix a slow database query in production?' },
  { category: 'System design', text: 'Design a URL shortener. Start with the requirements.' },
  { category: 'System design', text: 'How would you design a notification system for 10 million users?' },
  { category: 'Behavioral', text: 'Tell me about a time you disagreed with a technical decision.' },
  { category: 'Behavioral', text: 'Describe a bug that took you a long time to find. What did you learn?' },
  { category: 'Behavioral', text: 'Why do you want to change direction in your career?' }
]

export function categoriesOf(pool: QuestionItem[]): string[] {
  return [...new Set(pool.map((q) => q.category))]
}

export function pickFrom(pool: QuestionItem[], filter: string): string {
  const matches = pool.filter((q) => filter === 'All' || q.category === filter)
  const source = matches.length > 0 ? matches : pool
  return source[Math.floor(Math.random() * source.length)].text
}
