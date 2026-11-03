export const CATEGORIES = ['Backend', 'System design', 'Behavioral'] as const
export type Category = (typeof CATEGORIES)[number]

export const QUESTIONS: { category: Category; text: string }[] = [
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

export function pickQuestion(filter: Category | 'All'): string {
  const pool = QUESTIONS.filter((q) => filter === 'All' || q.category === filter)
  return pool[Math.floor(Math.random() * pool.length)].text
}
