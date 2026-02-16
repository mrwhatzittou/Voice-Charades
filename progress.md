Original prompt: PLEASE IMPLEMENT THIS PLAN:
# Voice Charades (Rules-Accurate) Implementation Plan

## Summary
Build a single-repo React + Vite + TypeScript app in `/Users/santinogatmaytan/Documents/New project` branded **Voice Charades**, aligned to the screenshots you provided:
1. Dice determines round type/category (`Action`, `Incident`, `Object`, `Nature`, `P’s`, `All-in`).
2. Team turns are timer-based rounds with multiple cards per round.
3. Lifelines are `2x Uncuff me` and `2x Steal` per team, with exact card behavior.
4. Scoring uses 1/2/3 point cards plus 1-point penalties to other teams for specific mistakes.
5. Win condition is target score chosen at setup; tiebreak uses a special all-in round.

Progress notes:
- Initialized progress tracking and preparing full implementation.

- Scaffolded full React + TypeScript app structure manually (network restriction blocked Vite generator).
- Implemented game domain types, reducer actions, deck randomization, and prompt validation.
- Added full setup/game/rules/scorecard/lowdown UI flow.
- Generated 65 prompts for each category with 1/2/3 point assignment.
- Added reducer and setup tests; pending execution once npm registry access is available.
- Attempted `npm install` with retries and verbose mode; blocked by DNS/network (`ENOTFOUND registry.npmjs.org`).
- Could not execute `npm run test`, `npm run build`, or Playwright loop due missing installed dependencies.

TODO for next agent:
- Run `npm install` once network access is restored.
- Execute `npm run test` and `npm run build`, then fix any TS/test issues surfaced by real dependency resolution.
- Run develop-web-game Playwright loop (`$WEB_GAME_CLIENT`) against `npm run dev` and inspect screenshots + console output.
- Added App shell with tabs, persistence, round timer loop, and accessibility/test hooks (`render_game_to_text`, `advanceTime`).
- Added README and prompt-bank integrity check command.
- Updated penalty wording in Game, Rules, and Lowdown UI to match screenshot language exactly (word/scene phrasing and explicit mistake list).
- Updated gameplay flow: drawing a card now auto-starts the timer.
- Redesigned Game screen to a more app-like layout with big action buttons (Correct, Pass Card, Dead Card, Penalty).
- Added card popup modal whenever a card is drawn.
- Removed in-game penalty-reason picker; penalty is now a single action button.
- Verified locally: `npm run build` passes and `npm run test` passes (8/8 tests).
- Playwright skill client could not run in this environment because the skill script cannot resolve `playwright` from its install location.
