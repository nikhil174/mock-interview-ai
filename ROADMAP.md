# Roadmap

## Practice-only hints before answering

**Status:** planned, not started.

**Goal:** Let a candidate who is stuck recover during practice, without a real evaluator involved and without misrepresenting performance.

**Design:**

- The candidate asks for a hint before writing an answer. Hints come in levels:
  1. A nudge about structure (what to cover first).
  2. A pointer to a concept or term to think about.
  3. No model answer, ever.
- Every hint is labeled as a hint in the answer area and in the saved session.
- Each saved session records how many hints were used and when they were requested.
- The candidate sees the hint count in their own session review.

**Safeguards:**

- Practice only. The practice notice states that hints are not available in live interviews or proctored tests.
- Hint text is not sent anywhere except to generate that hint. It is not included in any export unless the candidate exports the session.
- No automatic sharing with a company or anyone else. Export remains candidate-initiated.
- Hints must not reveal a full answer, a scoring rubric, or a complete code solution.

**Open questions:**

- Should hint levels be fixed, or chosen by the candidate?
- Should a session with hints be marked differently in the history list?
