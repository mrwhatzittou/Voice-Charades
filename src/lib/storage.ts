import type { GameState } from '../state/types';

const STORAGE_KEY = 'voice-charades-state-v1';
const STORAGE_VERSION = 1;

interface PersistedPayload {
  version: number;
  state: GameState;
}

export function saveGameState(state: GameState): void {
  const payload: PersistedPayload = {
    version: STORAGE_VERSION,
    state
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function loadGameState(): GameState | null {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as PersistedPayload;
    if (parsed.version !== STORAGE_VERSION) {
      return null;
    }
    return parsed.state;
  } catch {
    return null;
  }
}

export function clearGameState(): void {
  window.localStorage.removeItem(STORAGE_KEY);
}
