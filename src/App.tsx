import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { LowdownCard } from './components/LowdownCard';
import { allPromptCards } from './data/prompts';
import { GameScreen } from './features/game/GameScreen';
import { RulesPanel } from './features/rules/RulesPanel';
import { ScorecardPanel } from './features/scorecard/ScorecardPanel';
import { SetupScreen, type SetupConfig } from './features/setup/SetupScreen';
import { createDeckState } from './lib/random';
import { clearGameState, loadGameState, saveGameState } from './lib/storage';
import {
  buildTeamsAndPlayers,
  gameReducer,
  initialGameState
} from './state/gameReducer';
import type { GameState } from './state/types';

const TABS = ['game', 'rules', 'scorecard', 'lowdown'] as const;
type TabId = (typeof TABS)[number];
const TAB_LABELS: Record<TabId, string> = {
  game: 'Game',
  rules: 'Rules',
  scorecard: 'Scorecard',
  lowdown: 'Lowdown'
};

function pickRandom<T>(items: T[]): T | undefined {
  if (items.length === 0) {
    return undefined;
  }
  return items[Math.floor(Math.random() * items.length)];
}

function renderStateToText(state: GameState): string {
  const activeTeam = state.teams.find((team) => team.id === state.round.activeTeamId)?.name ?? null;
  const activePlayer = state.players.find((player) => player.id === state.round.activePlayerId)?.name ?? null;
  const activeCard = state.round.activeCardId ? state.decks.cardsById[state.round.activeCardId] : null;

  return JSON.stringify({
    mode: state.round.mode,
    status: state.status,
    activeTeam,
    activePlayer,
    timerSecondsLeft: state.round.timerSecondsLeft,
    category: state.round.chosenCategory,
    dieFace: state.round.dieFace,
    activeCard,
    scores: state.teams.map((team) => ({
      team: team.name,
      score: team.score,
      uncuff: team.uncuffRemaining,
      steal: team.stealRemaining
    }))
  });
}

export default function App() {
  const [state, dispatch] = useReducer(gameReducer, initialGameState);
  const [activeTab, setActiveTab] = useState<TabId>('game');
  const hydratedRef = useRef(false);
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    if (hydratedRef.current) {
      return;
    }
    const loaded = loadGameState();
    if (loaded) {
      dispatch({ type: 'REHYDRATE_STATE', payload: { state: loaded } });
    }
    hydratedRef.current = true;
  }, []);

  useEffect(() => {
    if (!hydratedRef.current) {
      return;
    }

    if (state.status === 'setup') {
      clearGameState();
      return;
    }

    saveGameState(state);
  }, [state]);

  useEffect(() => {
    if (!state.round.timerRunning || state.status !== 'in_game') {
      return;
    }

    const interval = window.setInterval(() => {
      dispatch({ type: 'TIMER_TICK', payload: { seconds: 1 } });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [state.round.timerRunning, state.status]);

  useEffect(() => {
    window.render_game_to_text = () => renderStateToText(stateRef.current);
    window.advanceTime = (ms: number) => {
      const seconds = Math.max(1, Math.round(ms / 1000));
      for (let i = 0; i < seconds; i += 1) {
        dispatch({ type: 'TIMER_TICK', payload: { seconds: 1 } });
      }
    };

    return () => {
      window.render_game_to_text = undefined;
      window.advanceTime = undefined;
    };
  }, []);

  const winnerNames = useMemo(
    () =>
      state.winnerTeamIds
        .map((winnerId) => state.teams.find((team) => team.id === winnerId)?.name)
        .filter(Boolean)
        .join(', '),
    [state.teams, state.winnerTeamIds]
  );

  const handleStartGame = (config: SetupConfig) => {
    const { teams, players } = buildTeamsAndPlayers(config.teams);
    const seed = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const decks = createDeckState(allPromptCards, seed);

    dispatch({
      type: 'INIT_GAME',
      payload: {
        teams,
        players,
        targetScore: config.targetScore,
        settings: {
          turnSeconds: config.turnSeconds,
          partyPlayEnabled: config.partyPlayEnabled
        },
        decks
      }
    });

    const randomPlayer = pickRandom(players);
    if (randomPlayer) {
      dispatch({
        type: 'RANDOMIZE_FIRST_SOUND_MASTER',
        payload: {
          teamId: randomPlayer.teamId,
          playerId: randomPlayer.id
        }
      });
      dispatch({ type: 'START_ROUND' });
    }

    setActiveTab('game');
  };

  const handleReset = () => {
    clearGameState();
    dispatch({ type: 'RESET_GAME' });
    setActiveTab('game');
  };

  const showSetup = state.status === 'setup';

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <h1>Voice Charades</h1>
          <p className="muted">
            Sound-based team game manager with official round flow, lifelines, rules, and scorecard.
          </p>
        </div>
        {!showSetup && (
          <div className="header-meta">
            <div>
              <strong>Target Score:</strong> {state.targetScore}
            </div>
            <div>
              <strong>Timer:</strong> {state.settings.turnSeconds}s
            </div>
          </div>
        )}
      </header>

      {showSetup ? (
        <SetupScreen onStart={handleStartGame} />
      ) : (
        <>
          <nav className="tab-row" aria-label="App sections">
            {TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={activeTab === tab ? 'active' : ''}
              >
                {TAB_LABELS[tab]}
              </button>
            ))}
          </nav>

          {state.status === 'finished' && (
            <section className="winner-banner">
              <strong>Winner:</strong> {winnerNames || 'Undeclared'}
            </section>
          )}

          {activeTab === 'game' && <GameScreen state={state} dispatch={dispatch} />}
          {activeTab === 'rules' && <RulesPanel />}
          {activeTab === 'scorecard' && <ScorecardPanel state={state} />}
          {activeTab === 'lowdown' && <LowdownCard />}

          <div className="footer-row">
            <button type="button" onClick={handleReset}>
              New Game / Hard Reset
            </button>
          </div>
        </>
      )}
    </main>
  );
}
