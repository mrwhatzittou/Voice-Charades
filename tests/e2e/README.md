# E2E Notes

This project includes reducer + component tests under `src/`.
For browser gameplay verification, use the develop-web-game client workflow:

1. `npm run dev`
2. `node "$WEB_GAME_CLIENT" --url http://localhost:5173 --actions-file "$WEB_GAME_ACTIONS" --iterations 3 --pause-ms 250`

The app exposes `window.render_game_to_text` and `window.advanceTime(ms)` to support deterministic inspection.
