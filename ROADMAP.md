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
- Hint text is not sent anywhere except to generate that hint.
- Exports include the hint count and the request timestamps, but not the hint text by default. The candidate can choose to include the hint text when exporting.
- No automatic sharing with a company or anyone else. Export remains candidate-initiated.
- Hints must not reveal a full answer, a scoring rubric, or a complete code solution.

**Decided for the MVP:**

- Hint levels are fixed at three (structure nudge, concept pointer, no model answer). The candidate does not choose the level, to keep evaluation of practice sessions consistent.

**History list:**

- Sessions with hints show a small "Hints used" indicator with the count. The indicator is visible only to the candidate, on this computer.
- The indicator is local display only. It is not sent anywhere and is included in exports only as the hint count and timestamps, as described above.

**Open questions:**

- None for the MVP.

## Practice-mode voice answers

**Status:** planned, not started.

**Goal:** Let a candidate answer a practice question aloud, with the answer transcribed and used for feedback. This is practice only.

**Design:**

- Visible recording controls: start, stop, and a clear on-screen indicator while the microphone is live.
- Streaming transcription with partial results shown as they arrive.
- A typed-answer fallback that is always available if the microphone, transcription, or network fails. The typed answer is never lost.
- Explicit consent before the first recording, separate from the practice notice.
- No audio retention by default. Audio is discarded after transcription unless the candidate chooses to keep it for a saved session.
- Auditable session records: the transcript, the source (voice or typed), and the consent time.

**Safeguards:**

- Practice only. The practice notice states that voice answers are not available in live interviews or proctored tests.
- Audio and transcripts are not sent anywhere except to produce the transcript and feedback.
- Export follows the same rules as other sessions: candidate-initiated only, and audio is excluded unless the candidate chooses to include it.

### Implementation breakdown: practice-mode voice answers

**Phase 1 (first implementation phase): tasks 1 to 3. No provider needed.**

1. **Permission rule (pure logic, tested).** Allow microphone access for the app's own window only, deny everything else. Enforced in the main process with `setPermissionRequestHandler`.
2. **Recording state machine (pure logic, tested).** States: idle, recording, stopped, failed. Any failure moves to a state where the typed answer is restored.
3. **Renderer controls.** Start and stop buttons plus a visible "Recording" indicator. No network calls in this phase.

**Phase 2: tasks 4 to 7. Blocked on the transcription provider decision.**

4. **Voice consent.** A separate voice notice, accepted by the candidate, and a single-use token issued by the main process, following the existing consent pattern. Transcript consent is separate from audio retention consent.
5. **Transcription provider.** Unresolved. Options under consideration: a cloud streaming provider, a local model such as Whisper, or Windows built-in speech recognition. The choice changes the privacy notice, so it must be settled before this task starts. A thin adapter sits behind one function so the provider can change later.
6. **Session fields.** `source` (voice or typed) and `transcript`, with legacy-safe parsing and tests. Older sessions without these fields still load.
7. **Fallback and save path.** The typed answer is restored on any failure, and saving still requires consent in the main process.

**Audio retention (separate, opt-in).** Audio is discarded after transcription by default. Keeping audio for a saved session requires its own opt-in, separate from transcript consent, and is stored as a separate file. Export excludes audio unless the candidate chooses to include it.

**Provider decision:** unresolved. Do not start task 5 until it is recorded here.
