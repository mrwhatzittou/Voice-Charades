import { useEffect, useMemo, useState } from 'react';
import type { Dispatch } from 'react';
import { DIE_FACES } from '../../lib/random';
import type { GameAction } from '../../state/gameReducer';
import type { Category, GameState, Team } from '../../state/types';

interface GameScreenProps {
  state: GameState;
  dispatch: Dispatch<GameAction>;
}

const CATEGORIES: Category[] = ['action', 'incident', 'object', 'nature', 'ps'];

const CATEGORY_LABELS: Record<Category, string> = {
  action: 'Action',
  incident: 'Incident',
  object: 'Object',
  nature: 'Nature',
  ps: "P's"
};

function findTeam(teams: Team[], teamId: string): Team | undefined {
  return teams.find((team) => team.id === teamId);
}

export function GameScreen({ state, dispatch }: GameScreenProps) {
  const [selectedAllInTeamIds, setSelectedAllInTeamIds] = useState<string[]>([]);
  const [partyCardId, setPartyCardId] = useState<string | null>(null);
  const [showCardPopup, setShowCardPopup] = useState(false);

  useEffect(() => {
    setSelectedAllInTeamIds([]);
  }, [state.round.activeCardId, state.round.mode]);

  useEffect(() => {
    if (state.round.activeCardId) {
      setShowCardPopup(true);
      return;
    }
    setShowCardPopup(false);
  }, [state.round.activeCardId]);

  const activeTeam = findTeam(state.teams, state.round.activeTeamId);
  const activePlayer = state.players.find((player) => player.id === state.round.activePlayerId);
  const activeCard = state.round.activeCardId ? state.decks.cardsById[state.round.activeCardId] : null;
  const stealLockTeam = state.round.stealLockTeamId
    ? findTeam(state.teams, state.round.stealLockTeamId)
    : undefined;
  const partyCard = partyCardId ? state.decks.cardsById[partyCardId] : null;

  const livePreviewScores = useMemo(() => {
    const preview = new Map<string, number>();
    state.teams.forEach((team) => preview.set(team.id, team.score));

    state.round.resolvedCards.forEach((resolved) => {
      const card = state.decks.cardsById[resolved.cardId];
      if (!card) {
        return;
      }
      resolved.awardedTeamIds.forEach((teamId) => {
        preview.set(teamId, (preview.get(teamId) ?? 0) + card.points);
      });
    });

    state.round.penalties.forEach((penalty) => {
      state.teams.forEach((team) => {
        if (team.id === penalty.sourceTeamId) {
          return;
        }
        preview.set(team.id, (preview.get(team.id) ?? 0) + 1);
      });
    });

    return preview;
  }, [state]);

  const lifelinesDisabled = state.round.mode !== 'normal' || !state.round.timerRunning;
  const canDrawCard = Boolean(state.round.chosenCategory) && state.round.timerSecondsLeft > 0;

  const rollRoundDie = () => {
    const dieFace = DIE_FACES[Math.floor(Math.random() * DIE_FACES.length)];
    dispatch({ type: 'ROLL_DIE', payload: { dieFace } });
  };

  const drawPartyCard = () => {
    const allCards = Object.values(state.decks.cardsById);
    if (allCards.length === 0) {
      return;
    }
    const randomCard = allCards[Math.floor(Math.random() * allCards.length)];
    setPartyCardId(randomCard.id);
  };

  const toggleAllInTeam = (teamId: string) => {
    setSelectedAllInTeamIds((prev) =>
      prev.includes(teamId) ? prev.filter((entry) => entry !== teamId) : [...prev, teamId]
    );
  };

  const handleCorrect = () => {
    dispatch({ type: 'MARK_TEAM_GUESS_CORRECT' });
    setShowCardPopup(false);
  };

  const handlePass = () => {
    dispatch({ type: 'MARK_PASS' });
    setShowCardPopup(false);
  };

  const handleDeadCard = () => {
    dispatch({ type: 'MARK_DEAD_CARD' });
    setShowCardPopup(false);
  };

  const handlePenalty = () => {
    dispatch({
      type: 'APPLY_PENALTY',
      payload: {
        type: 'hands_unclasped',
        sourceTeamId: state.round.activeTeamId
      }
    });
  };

  const closePopup = () => {
    setShowCardPopup(false);
  };

  return (
    <section className="panel game-panel">
      <div className="game-header-strip">
        <div>
          <p className="muted">Active Team</p>
          <h3>{activeTeam?.name ?? 'Not set'}</h3>
        </div>
        <div>
          <p className="muted">Sound Master</p>
          <h3>{activePlayer?.name ?? 'Not set'}</h3>
        </div>
        <div>
          <p className="muted">Mode</p>
          <h3>{state.round.mode.replace(/_/g, ' ')}</h3>
        </div>
        <div>
          <p className="muted">Timer</p>
          <h3>{state.round.timerSecondsLeft}s</h3>
        </div>
      </div>

      <div className="control-row round-controls">
        <button type="button" onClick={() => dispatch({ type: 'START_ROUND' })}>
          Start Round
        </button>
        <button type="button" onClick={rollRoundDie}>
          Roll Die
        </button>
        <button type="button" onClick={() => dispatch({ type: 'DRAW_NEXT_CARD' })} disabled={!canDrawCard}>
          Draw Card
        </button>
        <button type="button" onClick={() => dispatch({ type: 'END_ROUND_AND_SCORE' })}>
          End Round & Score
        </button>
      </div>

      <div className="status-grid compact">
        <div>
          <strong>Die:</strong> {state.round.dieFace.replace('_', ' ')}
        </div>
        <div>
          <strong>Category:</strong>{' '}
          {state.round.chosenCategory ? CATEGORY_LABELS[state.round.chosenCategory] : 'Not chosen'}
        </div>
        <div>
          <strong>Uncuff:</strong> {state.round.uncuffActive ? 'Active' : 'Inactive'}
        </div>
        <div>
          <strong>Steal lock:</strong> {stealLockTeam?.name ?? 'None'}
        </div>
      </div>

      {(state.round.mode === 'all_in' || state.round.mode === 'tiebreak_all_in') &&
        !state.round.chosenCategory && (
          <div className="category-picker">
            <p>Choose category for All-in:</p>
            {CATEGORIES.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => dispatch({ type: 'SET_ALL_IN_CATEGORY', payload: { category } })}
              >
                {CATEGORY_LABELS[category]}
              </button>
            ))}
          </div>
        )}

      <article className={`card-view game-card ${activeCard ? 'is-live' : ''}`}>
        <h3>Current Card</h3>
        {activeCard ? (
          <>
            <p className="card-category">{CATEGORY_LABELS[activeCard.category]}</p>
            <p className="card-text">{activeCard.text}</p>
            <p className="card-points">{activeCard.points} point(s)</p>
          </>
        ) : (
          <p className="muted">Draw a card to start timed clueing.</p>
        )}
      </article>

      {activeCard && state.round.mode === 'normal' && (
        <div className="game-action-grid">
          <button type="button" className="action-btn success" onClick={handleCorrect}>
            Correct
          </button>
          <button type="button" className="action-btn warning" onClick={handlePass}>
            Pass Card
          </button>
          <button type="button" className="action-btn neutral" onClick={handleDeadCard}>
            Dead Card
          </button>
          <button type="button" className="action-btn penalty" onClick={handlePenalty}>
            Penalty
          </button>
        </div>
      )}

      {activeCard && (state.round.mode === 'all_in' || state.round.mode === 'tiebreak_all_in') && (
        <div className="all-in-award panel-inner">
          <h3>All-in Correct Guess Teams</h3>
          <div className="team-checkboxes">
            {state.teams.map((team) => (
              <label key={`award-${team.id}`}>
                <input
                  type="checkbox"
                  checked={selectedAllInTeamIds.includes(team.id)}
                  onChange={() => toggleAllInTeam(team.id)}
                />
                {team.name}
              </label>
            ))}
          </div>
          <div className="control-row">
            <button
              type="button"
              onClick={() => {
                dispatch({
                  type: 'MARK_TEAM_GUESS_CORRECT',
                  payload: { teamIds: selectedAllInTeamIds }
                });
                setShowCardPopup(false);
              }}
              disabled={selectedAllInTeamIds.length === 0}
            >
              Award Card Points
            </button>
            <button type="button" onClick={handleDeadCard}>
              Mark Dead Card
            </button>
            <button
              type="button"
              onClick={() =>
                selectedAllInTeamIds.length === 1 &&
                dispatch({
                  type: 'RESOLVE_TIEBREAK',
                  payload: { winnerTeamId: selectedAllInTeamIds[0] }
                })
              }
              disabled={state.round.mode !== 'tiebreak_all_in' || selectedAllInTeamIds.length !== 1}
            >
              Declare Tiebreak Winner
            </button>
          </div>
        </div>
      )}

      <article className="panel-inner">
        <h3>Lifelines</h3>
        <div className="control-row">
          <button
            type="button"
            onClick={() => dispatch({ type: 'ACTIVATE_UNCUFF' })}
            disabled={
              lifelinesDisabled || !activeTeam || activeTeam.uncuffRemaining <= 0 || state.status !== 'in_game'
            }
          >
            Use Uncuff me ({activeTeam?.uncuffRemaining ?? 0})
          </button>
        </div>

        <div className="team-checkboxes">
          {state.teams
            .filter((team) => team.id !== state.round.activeTeamId)
            .map((team) => (
              <button
                key={`steal-${team.id}`}
                type="button"
                onClick={() => dispatch({ type: 'REQUEST_STEAL_LOCK', payload: { teamId: team.id } })}
                disabled={
                  lifelinesDisabled ||
                  !activeCard ||
                  Boolean(state.round.stealLockTeamId) ||
                  team.stealRemaining <= 0
                }
              >
                {team.name} Steal ({team.stealRemaining})
              </button>
            ))}
        </div>

        {state.round.stealLockTeamId && (
          <div className="control-row">
            <button
              type="button"
              onClick={() => {
                dispatch({ type: 'RESOLVE_STEAL', payload: { correct: true } });
                setShowCardPopup(false);
              }}
            >
              Steal Correct
            </button>
            <button
              type="button"
              onClick={() => dispatch({ type: 'RESOLVE_STEAL', payload: { correct: false } })}
            >
              Steal Wrong
            </button>
          </div>
        )}
      </article>

      <article className="panel-inner">
        <h3>Live Score Preview (applied at end of round)</h3>
        <table className="score-table">
          <thead>
            <tr>
              <th>Team</th>
              <th>Current</th>
              <th>Projected</th>
            </tr>
          </thead>
          <tbody>
            {state.teams.map((team) => (
              <tr key={`preview-${team.id}`}>
                <td>{team.name}</td>
                <td>{team.score}</td>
                <td>{livePreviewScores.get(team.id) ?? team.score}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </article>

      {state.settings.partyPlayEnabled && (
        <article className="panel-inner">
          <h3>Party Play (Optional)</h3>
          <p className="muted">Random card to play to the whole group outside ranked flow.</p>
          <button type="button" onClick={drawPartyCard}>
            Draw Party Card
          </button>
          {partyCard && (
            <div className="card-view compact">
              <p className="card-category">{CATEGORY_LABELS[partyCard.category]}</p>
              <p className="card-text">{partyCard.text}</p>
              <p className="card-points">{partyCard.points} point(s)</p>
            </div>
          )}
        </article>
      )}

      {showCardPopup && activeCard && (
        <div className="card-modal-backdrop" onClick={closePopup} role="presentation">
          <div className="card-modal" onClick={(event) => event.stopPropagation()}>
            <div className="row-between modal-head">
              <h3>Current Card</h3>
              <button type="button" onClick={closePopup} className="modal-close">
                Close
              </button>
            </div>
            <p className="card-category">{CATEGORY_LABELS[activeCard.category]}</p>
            <p className="card-text">{activeCard.text}</p>
            <p className="card-points">{activeCard.points} point(s)</p>
          </div>
        </div>
      )}
    </section>
  );
}
