import { useEffect, useMemo, useState } from 'react';
import type { Dispatch } from 'react';
import { DIE_FACES } from '../../lib/random';
import type { GameAction } from '../../state/gameReducer';
import type { Category, GameState, PenaltyEvent, Team } from '../../state/types';

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

const PENALTY_TYPES: Array<{ type: PenaltyEvent['type']; label: string }> = [
  { type: 'hands_unclasped', label: 'Hands unclasped' },
  { type: 'pointed_at_object', label: 'Indicated toward answer word/scene' },
  { type: 'used_non_onomatopoeia', label: 'Used non-onomatopoeia words' },
  { type: 'used_forbidden_onomatopoeia', label: 'Used onomatopoeia in answer word/scene' },
  { type: 'movement_only_no_sound', label: 'Movement without sound' }
];

function findTeam(teams: Team[], teamId: string): Team | undefined {
  return teams.find((team) => team.id === teamId);
}

export function GameScreen({ state, dispatch }: GameScreenProps) {
  const [selectedAllInTeamIds, setSelectedAllInTeamIds] = useState<string[]>([]);
  const [penaltySourceTeamId, setPenaltySourceTeamId] = useState(state.round.activeTeamId);
  const [partyCardId, setPartyCardId] = useState<string | null>(null);

  useEffect(() => {
    setPenaltySourceTeamId(state.round.activeTeamId);
  }, [state.round.activeTeamId]);

  useEffect(() => {
    setSelectedAllInTeamIds([]);
  }, [state.round.activeCardId, state.round.mode]);

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

  return (
    <section className="panel game-panel">
      <h2>Game Table</h2>

      <div className="status-grid">
        <div>
          <strong>Active team:</strong> {activeTeam?.name ?? 'Not set'}
        </div>
        <div>
          <strong>Sound Master:</strong> {activePlayer?.name ?? 'Not set'}
        </div>
        <div>
          <strong>Mode:</strong> {state.round.mode.replace(/_/g, ' ')}
        </div>
        <div>
          <strong>Timer:</strong> {state.round.timerSecondsLeft}s
        </div>
      </div>

      <div className="control-row">
        <button type="button" onClick={() => dispatch({ type: 'START_ROUND' })}>
          Start Round
        </button>
        <button type="button" onClick={rollRoundDie}>
          Roll Die
        </button>
        <button type="button" onClick={() => dispatch({ type: 'START_TIMER' })}>
          Start Timer
        </button>
        <button type="button" onClick={() => dispatch({ type: 'END_ROUND_AND_SCORE' })}>
          End Round & Score
        </button>
      </div>

      <div className="status-grid">
        <div>
          <strong>Die result:</strong> {state.round.dieFace.replace('_', ' ')}
        </div>
        <div>
          <strong>Category:</strong>{' '}
          {state.round.chosenCategory ? CATEGORY_LABELS[state.round.chosenCategory] : 'Not chosen'}
        </div>
        <div>
          <strong>Uncuff active:</strong> {state.round.uncuffActive ? 'Yes' : 'No'}
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

      <div className="control-row">
        <button type="button" onClick={() => dispatch({ type: 'DRAW_NEXT_CARD' })}>
          Draw Card
        </button>
      </div>

      <article className="card-view">
        <h3>Current Card</h3>
        {activeCard ? (
          <>
            <p className="card-category">{CATEGORY_LABELS[activeCard.category]}</p>
            <p className="card-text">{activeCard.text}</p>
            <p className="card-points">{activeCard.points} point(s)</p>
          </>
        ) : (
          <p className="muted">No active card.</p>
        )}
      </article>

      {activeCard && state.round.mode === 'normal' && (
        <div className="control-row">
          <button type="button" onClick={() => dispatch({ type: 'MARK_TEAM_GUESS_CORRECT' })}>
            Team Correct Guess
          </button>
          <button type="button" onClick={() => dispatch({ type: 'MARK_PASS' })}>
            Pass Card
          </button>
          <button type="button" onClick={() => dispatch({ type: 'MARK_DEAD_CARD' })}>
            Mark Dead Card
          </button>
        </div>
      )}

      {activeCard && (state.round.mode === 'all_in' || state.round.mode === 'tiebreak_all_in') && (
        <div className="all-in-award">
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
              onClick={() =>
                dispatch({
                  type: 'MARK_TEAM_GUESS_CORRECT',
                  payload: { teamIds: selectedAllInTeamIds }
                })
              }
              disabled={selectedAllInTeamIds.length === 0}
            >
              Award Card Points
            </button>
            <button type="button" onClick={() => dispatch({ type: 'MARK_DEAD_CARD' })}>
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
              onClick={() => dispatch({ type: 'RESOLVE_STEAL', payload: { correct: true } })}
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
        <h3>Penalty Controls (+1 to all other teams)</h3>
        <label>
          Source team
          <select
            value={penaltySourceTeamId}
            onChange={(event) => setPenaltySourceTeamId(event.target.value)}
          >
            {state.teams.map((team) => (
              <option key={`penalty-source-${team.id}`} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </label>

        <div className="team-checkboxes">
          {PENALTY_TYPES.map((penalty) => (
            <button
              key={penalty.type}
              type="button"
              onClick={() =>
                dispatch({
                  type: 'APPLY_PENALTY',
                  payload: { type: penalty.type, sourceTeamId: penaltySourceTeamId }
                })
              }
            >
              {penalty.label}
            </button>
          ))}
        </div>
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
    </section>
  );
}
