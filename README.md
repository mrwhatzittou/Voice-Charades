# Voice Charades

Voice Charades is a rules-accurate digital facilitator app for the sound-based party game flow you specified.

## What is included

- React + Vite + TypeScript single-repo app.
- Setup flow with official constraints:
  - 2-4 teams
  - at least 2 players per team
  - target score required at setup
- Dice-based round mode (`Action`, `Incident`, `Object`, `Nature`, `P's`, `All-in`).
- Multi-card timed rounds with end-of-round scoring.
- Lifelines:
  - `2x Uncuff me`
  - `2x Steal` (keep on success, burn on fail)
- Penalty controls that award `+1` to all other teams.
- All-in category selection and team multi-award support.
- Tiebreak All-in handling.
- Party Play optional mode.
- Rules tab, Lowdown tab, and Scorecard tab.
- Local persistence key: `voice-charades-state-v1`.
- Prompt banks: 65 cards per category with 1/2/3 point values.

## Scripts

- `npm install`
- `npm run dev`
- `npm run build`
- `npm run test`

## Notes

This environment currently cannot resolve `registry.npmjs.org`, so dependency install and runtime verification are blocked until network access is available.
