# Mock Interview AI

Practice interview answers on your own, then get structured feedback on
what you wrote. The feedback critiques your answer and suggests structure;
it does not write a complete answer for you.

Built with Electron, React, and TypeScript. Uses DeepSeek for feedback.

## Features

- Interview questions by category: Backend, System design, Behavioral
- You type your answer, then click **Get feedback**
- Feedback streams in: score, what worked, what was missing, a structure to try, and a likely follow-up
- Sessions are saved locally as JSON in `%APPDATA%\Mock Interview AI\sessions`

## Setup on Windows 11

1. Install Node.js LTS and Git.
2. Clone and install:
   ```powershell
   git clone <your-repo-url> mock-interview-ai
   cd mock-interview-ai
   npm install
   ```
3. Run: `npm run dev`
4. Create a DeepSeek key at platform.deepseek.com, click **API key** in the app, and paste it in.
5. Build the installer: `npm run package` (output in `dist/`).

## Notes

- Your answers are sent to DeepSeek when you click **Get feedback**. Nothing else is sent.
- The API key is encrypted with Windows `safeStorage` and only read in the main process.
- Use this for practice. Feedback is meant for you to read after you answer, not during a live interview or test.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start with hot reload |
| `npm run typecheck` | Type-check all source |
| `npm run build` | Compile into `out/` |
| `npm run package` | Build the Windows installer |
