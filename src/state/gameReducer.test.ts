import { describe, expect, it } from 'vitest';
import { allPromptCards } from '../data/prompts';
import { createDeckState } from '../lib/random';
import { buildTeamsAndPlayers, gameReducer, initialGameState } from './gameReducer';
import type { GameState, SetupTeamInput } from './types';

function createState(setup?: { teams?: SetupTeamInput[]; targetScore?: number }): GameState {
  const teamsInput =
    setup?.teams ??
    [
      { name: 'Alpha', players: ['A1', 'A2'] },
      { name: 'Bravo', players: ['B1', 'B2'] }
    ];

  const { teams, players } = buildTeamsAndPlayers(teamsInput);
  const decks = createDeckState(allPromptCards, 'test-seed');

  let state = gameReducer(initialGameState, {
    type: 'INIT_GAME',
    payload: {
      teams,
      players,
      targetScore: setup?.targetScore ?? 30,
      settings: { turnSeconds: 60, partyPlayEnabled: false },
      decks
    }
  });

  state = gameReducer(state, {
    type: 'RANDOMIZE_FIRST_SOUND_MASTER',
    payload: {
      teamId: teams[0].id,
      playerId: teams[0].playerIds[0]
    }
  });

  state = gameReducer(state, { type: 'START_ROUND' });
  return state;
}

describe('gameReducer', () => {
  it('maps all_in die roll to all_in mode', () => {
    const state = createState();
    const next = gameReducer(state, {
      type: 'ROLL_DIE',
      payload: { dieFace: 'all_in' }
    });

    expect(next.round.mode).toBe('all_in');
    expect(next.round.chosenCategory).toBeNull();
  });

  it('awards pass penalty to all other teams in normal round', () => {
    let state = createState();
    state = gameReducer(state, {
      type: 'ROLL_DIE',
      payload: { dieFace: 'action' }
    });
    state = gameReducer(state, { type: 'DRAW_NEXT_CARD' });
    state = gameReducer(state, { type: 'MARK_PASS' });
    state = gameReducer(state, { type: 'END_ROUND_AND_SCORE' });

    expect(state.teams.find((team) => team.id === 'team-2')?.score).toBe(1);
  });

  it('does not award pass penalty during all_in', () => {
    let state = createState();
    state = gameReducer(state, {
      type: 'ROLL_DIE',
      payload: { dieFace: 'all_in' }
    });
    state = gameReducer(state, {
      type: 'SET_ALL_IN_CATEGORY',
      payload: { category: 'action' }
    });
    state = gameReducer(state, { type: 'DRAW_NEXT_CARD' });
    state = gameReducer(state, { type: 'MARK_PASS' });
    state = gameReducer(state, { type: 'END_ROUND_AND_SCORE' });

    expect(state.teams.find((team) => team.id === 'team-2')?.score).toBe(0);
  });

  it('consumes uncuff only after timer starts', () => {
    let state = createState();
    const baseline = state.teams[0].uncuffRemaining;

    state = gameReducer(state, { type: 'ACTIVATE_UNCUFF' });
    expect(state.teams[0].uncuffRemaining).toBe(baseline);

    state = gameReducer(state, {
      type: 'ROLL_DIE',
      payload: { dieFace: 'action' }
    });
    state = gameReducer(state, { type: 'DRAW_NEXT_CARD' });
    state = gameReducer(state, { type: 'START_TIMER' });
    state = gameReducer(state, { type: 'ACTIVATE_UNCUFF' });

    expect(state.teams[0].uncuffRemaining).toBe(baseline - 1);
  });

  it('locks steal to first requester and burns card on wrong guess', () => {
    let state = createState({
      teams: [
        { name: 'Alpha', players: ['A1', 'A2'] },
        { name: 'Bravo', players: ['B1', 'B2'] },
        { name: 'Charlie', players: ['C1', 'C2'] }
      ]
    });

    state = gameReducer(state, {
      type: 'ROLL_DIE',
      payload: { dieFace: 'action' }
    });
    state = gameReducer(state, { type: 'DRAW_NEXT_CARD' });
    state = gameReducer(state, { type: 'START_TIMER' });

    state = gameReducer(state, {
      type: 'REQUEST_STEAL_LOCK',
      payload: { teamId: 'team-2' }
    });
    state = gameReducer(state, {
      type: 'REQUEST_STEAL_LOCK',
      payload: { teamId: 'team-3' }
    });

    expect(state.round.stealLockTeamId).toBe('team-2');

    state = gameReducer(state, {
      type: 'RESOLVE_STEAL',
      payload: { correct: false }
    });

    expect(state.teams.find((team) => team.id === 'team-2')?.stealRemaining).toBe(1);
  });

  it('keeps steal card on successful steal and awards points', () => {
    let state = createState({
      teams: [
        { name: 'Alpha', players: ['A1', 'A2'] },
        { name: 'Bravo', players: ['B1', 'B2'] }
      ]
    });

    state = gameReducer(state, {
      type: 'ROLL_DIE',
      payload: { dieFace: 'action' }
    });
    state = gameReducer(state, { type: 'DRAW_NEXT_CARD' });
    state = gameReducer(state, { type: 'START_TIMER' });
    state = gameReducer(state, {
      type: 'REQUEST_STEAL_LOCK',
      payload: { teamId: 'team-2' }
    });
    state = gameReducer(state, {
      type: 'RESOLVE_STEAL',
      payload: { correct: true }
    });
    state = gameReducer(state, { type: 'END_ROUND_AND_SCORE' });

    expect(state.teams.find((team) => team.id === 'team-2')?.stealRemaining).toBe(2);
    expect((state.teams.find((team) => team.id === 'team-2')?.score ?? 0) > 0).toBe(true);
  });

  it('triggers tiebreak mode when multiple teams reach target together', () => {
    let state = createState({ targetScore: 5 });

    state = {
      ...state,
      teams: state.teams.map((team) => ({ ...team, score: 4 })),
      round: {
        ...state.round,
        mode: 'all_in',
        chosenCategory: 'action',
        resolvedCards: [
          {
            cardId: state.decks.orderByCategory.action[0],
            awardedTeamIds: state.teams.map((team) => team.id),
            via: 'all_in'
          }
        ]
      }
    };

    state = gameReducer(state, { type: 'END_ROUND_AND_SCORE' });

    expect(state.status).toBe('in_game');
    expect(state.round.mode).toBe('tiebreak_all_in');
  });
});
