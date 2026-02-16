import type {
  Category,
  DeckState,
  GameEvent,
  GameSettings,
  GameState,
  PenaltyEvent,
  Player,
  RoundState,
  SetupTeamInput,
  Team
} from './types';
import type { DieFace, ResolvedCard } from './types';

const DEFAULT_TURN_SECONDS = 60;

function createRoundState(
  activeTeamId = '',
  activePlayerId = '',
  turnSeconds = DEFAULT_TURN_SECONDS
): RoundState {
  return {
    mode: 'normal',
    dieFace: 'action',
    chosenCategory: null,
    activeTeamId,
    activePlayerId,
    timerSecondsLeft: turnSeconds,
    timerRunning: false,
    activeCardId: null,
    stealLockTeamId: null,
    uncuffActive: false,
    resolvedCards: [],
    penalties: [],
    deadCardIds: []
  };
}

export function createEmptyGameState(): GameState {
  return {
    teams: [],
    players: [],
    targetScore: 0,
    settings: {
      turnSeconds: DEFAULT_TURN_SECONDS,
      partyPlayEnabled: false
    },
    round: createRoundState(),
    decks: {
      seed: '',
      cardsById: {},
      orderByCategory: {
        action: [],
        incident: [],
        object: [],
        nature: [],
        ps: []
      },
      nextIndexByCategory: {
        action: 0,
        incident: 0,
        object: 0,
        nature: 0,
        ps: 0
      }
    },
    log: [],
    status: 'setup',
    winnerTeamIds: []
  };
}

export const initialGameState: GameState = createEmptyGameState();

interface InitGamePayload {
  teams: Team[];
  players: Player[];
  targetScore: number;
  settings: GameSettings;
  decks: DeckState;
}

interface SetupBuildResult {
  teams: Team[];
  players: Player[];
}

export function buildTeamsAndPlayers(inputs: SetupTeamInput[]): SetupBuildResult {
  const teams: Team[] = [];
  const players: Player[] = [];

  inputs.forEach((input, teamIndex) => {
    const teamId = `team-${teamIndex + 1}`;
    const playerIds: string[] = [];

    input.players.forEach((playerName, playerIndex) => {
      const playerId = `${teamId}-player-${playerIndex + 1}`;
      playerIds.push(playerId);
      players.push({
        id: playerId,
        teamId,
        name: playerName.trim(),
        order: playerIndex
      });
    });

    teams.push({
      id: teamId,
      name: input.name.trim(),
      playerIds,
      score: 0,
      uncuffRemaining: 2,
      stealRemaining: 2,
      nextPlayerIndex: 0
    });
  });

  return { teams, players };
}

function nowId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function addLog(state: GameState, type: GameEvent['type'], message: string): GameState {
  return {
    ...state,
    log: [
      {
        id: nowId('evt'),
        timestamp: Date.now(),
        type,
        message
      },
      ...state.log
    ].slice(0, 300)
  };
}

function getTeam(state: GameState, teamId: string): Team | undefined {
  return state.teams.find((team) => team.id === teamId);
}

function getActiveTeam(state: GameState): Team | undefined {
  return getTeam(state, state.round.activeTeamId);
}

function uniqueExistingTeamIds(state: GameState, teamIds: string[]): string[] {
  const valid = new Set(state.teams.map((team) => team.id));
  return [...new Set(teamIds)].filter((teamId) => valid.has(teamId));
}

function advanceClockwise(teams: Team[], activeTeamId: string): {
  teams: Team[];
  nextTeamId: string;
  nextPlayerId: string;
} {
  if (teams.length === 0) {
    return { teams, nextTeamId: '', nextPlayerId: '' };
  }

  const currentIndex = Math.max(
    0,
    teams.findIndex((team) => team.id === activeTeamId)
  );
  const nextTeamIndex = (currentIndex + 1) % teams.length;
  const nextTeam = teams[nextTeamIndex];
  const drawIndex = nextTeam.nextPlayerIndex % nextTeam.playerIds.length;
  const nextPlayerId = nextTeam.playerIds[drawIndex] ?? '';

  const updatedTeams = teams.map((team, index) => {
    if (index !== nextTeamIndex) {
      return team;
    }

    return {
      ...team,
      nextPlayerIndex: (drawIndex + 1) % team.playerIds.length
    };
  });

  return {
    teams: updatedTeams,
    nextTeamId: nextTeam.id,
    nextPlayerId
  };
}

function resetRoundForNextTurn(
  state: GameState,
  mode: RoundState['mode'],
  teamId: string,
  playerId: string
): RoundState {
  return {
    ...createRoundState(teamId, playerId, state.settings.turnSeconds),
    mode,
    dieFace: mode === 'normal' ? 'action' : 'all_in'
  };
}

function scoreResolvedCards(
  teams: Team[],
  resolvedCards: ResolvedCard[],
  decks: DeckState
): Team[] {
  const scoreByTeamId = new Map<string, number>();
  teams.forEach((team) => scoreByTeamId.set(team.id, 0));

  resolvedCards.forEach((resolved) => {
    const card = decks.cardsById[resolved.cardId];
    if (!card) {
      return;
    }

    resolved.awardedTeamIds.forEach((teamId) => {
      scoreByTeamId.set(teamId, (scoreByTeamId.get(teamId) ?? 0) + card.points);
    });
  });

  return teams.map((team) => ({
    ...team,
    score: team.score + (scoreByTeamId.get(team.id) ?? 0)
  }));
}

function scorePenalties(teams: Team[], penalties: PenaltyEvent[]): Team[] {
  return teams.map((team) => {
    const bonusPoints = penalties.reduce((acc, penalty) => {
      if (penalty.sourceTeamId === team.id) {
        return acc;
      }
      return acc + 1;
    }, 0);

    return {
      ...team,
      score: team.score + bonusPoints
    };
  });
}

function inGame(state: GameState): boolean {
  return state.status === 'in_game';
}

function decreaseTimer(state: GameState, seconds: number): GameState {
  if (!state.round.timerRunning) {
    return state;
  }

  const nextSeconds = Math.max(0, state.round.timerSecondsLeft - seconds);
  const timedOut = nextSeconds === 0;

  return {
    ...state,
    round: {
      ...state.round,
      timerSecondsLeft: nextSeconds,
      timerRunning: !timedOut,
      deadCardIds:
        timedOut && state.round.activeCardId
          ? [...state.round.deadCardIds, state.round.activeCardId]
          : state.round.deadCardIds,
      activeCardId: timedOut ? null : state.round.activeCardId,
      stealLockTeamId: timedOut ? null : state.round.stealLockTeamId
    }
  };
}

function getLeadingTeams(teams: Team[]): Team[] {
  if (!teams.length) {
    return [];
  }
  const max = Math.max(...teams.map((team) => team.score));
  return teams.filter((team) => team.score === max);
}

function resolveRoundEnd(state: GameState): GameState {
  const withCardScore = scoreResolvedCards(state.teams, state.round.resolvedCards, state.decks);
  const withPenaltyScore = scorePenalties(withCardScore, state.round.penalties);

  const reached = withPenaltyScore.filter((team) => team.score >= state.targetScore);

  let nextState: GameState = {
    ...state,
    teams: withPenaltyScore
  };

  nextState = addLog(nextState, 'round_scored', 'Round scored and points applied.');

  if (reached.length === 1) {
    nextState = {
      ...nextState,
      status: 'finished',
      winnerTeamIds: [reached[0].id],
      round: {
        ...nextState.round,
        timerRunning: false,
        activeCardId: null,
        stealLockTeamId: null
      }
    };
    return addLog(nextState, 'winner_declared', `${reached[0].name} wins the game.`);
  }

  if (reached.length > 1) {
    const advanced = advanceClockwise(withPenaltyScore, state.round.activeTeamId);
    nextState = {
      ...nextState,
      teams: advanced.teams,
      round: resetRoundForNextTurn(state, 'tiebreak_all_in', advanced.nextTeamId, advanced.nextPlayerId),
      winnerTeamIds: []
    };
    return addLog(nextState, 'tiebreak_started', 'Tie detected. Starting all-in tiebreak round.');
  }

  const advanced = advanceClockwise(withPenaltyScore, state.round.activeTeamId);
  nextState = {
    ...nextState,
    teams: advanced.teams,
    round: resetRoundForNextTurn(state, 'normal', advanced.nextTeamId, advanced.nextPlayerId),
    winnerTeamIds: []
  };

  return nextState;
}

export type GameAction =
  | { type: 'INIT_GAME'; payload: InitGamePayload }
  | { type: 'RANDOMIZE_FIRST_SOUND_MASTER'; payload: { teamId: string; playerId: string } }
  | { type: 'START_ROUND' }
  | { type: 'ROLL_DIE'; payload: { dieFace: DieFace } }
  | { type: 'SET_ALL_IN_CATEGORY'; payload: { category: Category } }
  | { type: 'DRAW_NEXT_CARD' }
  | { type: 'MARK_TEAM_GUESS_CORRECT'; payload?: { teamIds?: string[] } }
  | { type: 'MARK_PASS' }
  | { type: 'APPLY_PENALTY'; payload: { type: PenaltyEvent['type']; sourceTeamId?: string } }
  | { type: 'ACTIVATE_UNCUFF' }
  | { type: 'REQUEST_STEAL_LOCK'; payload: { teamId: string } }
  | { type: 'RESOLVE_STEAL'; payload: { correct: boolean } }
  | { type: 'MARK_DEAD_CARD' }
  | { type: 'START_TIMER' }
  | { type: 'TIMER_TICK'; payload: { seconds: number } }
  | { type: 'END_ROUND_AND_SCORE' }
  | { type: 'CHECK_WIN_OR_TIEBREAK' }
  | { type: 'START_TIEBREAK_ALL_IN' }
  | { type: 'RESOLVE_TIEBREAK'; payload: { winnerTeamId?: string } }
  | { type: 'ADVANCE_TO_NEXT_TEAM_CLOCKWISE' }
  | { type: 'REHYDRATE_STATE'; payload: { state: GameState } }
  | { type: 'RESET_GAME' };

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'INIT_GAME': {
      const { teams, players, targetScore, settings, decks } = action.payload;
      return {
        teams,
        players,
        targetScore,
        settings,
        round: createRoundState('', '', settings.turnSeconds),
        decks,
        log: [],
        status: 'in_game',
        winnerTeamIds: []
      };
    }

    case 'RANDOMIZE_FIRST_SOUND_MASTER': {
      if (!inGame(state)) {
        return state;
      }

      const team = getTeam(state, action.payload.teamId);
      if (!team || !team.playerIds.includes(action.payload.playerId)) {
        return state;
      }

      const chosenIndex = team.playerIds.indexOf(action.payload.playerId);
      const updatedTeams = state.teams.map((entry) => {
        if (entry.id !== team.id) {
          return entry;
        }
        return {
          ...entry,
          nextPlayerIndex: (chosenIndex + 1) % entry.playerIds.length
        };
      });

      return {
        ...state,
        teams: updatedTeams,
        round: createRoundState(action.payload.teamId, action.payload.playerId, state.settings.turnSeconds)
      };
    }

    case 'START_ROUND': {
      if (!inGame(state)) {
        return state;
      }

      const mode: RoundState['mode'] =
        state.round.mode === 'tiebreak_all_in' ? 'tiebreak_all_in' : 'normal';
      let nextState: GameState = {
        ...state,
        round: {
          ...createRoundState(
            state.round.activeTeamId,
            state.round.activePlayerId,
            state.settings.turnSeconds
          ),
          mode,
          dieFace: mode === 'tiebreak_all_in' ? 'all_in' : 'action'
        }
      };

      nextState = addLog(
        nextState,
        'round_started',
        `Round started for ${getTeam(nextState, nextState.round.activeTeamId)?.name ?? 'team'}.`
      );
      return nextState;
    }

    case 'ROLL_DIE': {
      if (!inGame(state)) {
        return state;
      }

      const dieFace = action.payload.dieFace;
      const mode: RoundState['mode'] =
        dieFace === 'all_in'
          ? state.round.mode === 'tiebreak_all_in'
            ? 'tiebreak_all_in'
            : 'all_in'
          : 'normal';
      let nextState: GameState = {
        ...state,
        round: {
          ...state.round,
          dieFace,
          mode,
          chosenCategory: dieFace === 'all_in' ? null : dieFace,
          activeCardId: null,
          stealLockTeamId: null
        }
      };
      nextState = addLog(nextState, 'die_rolled', `Die rolled: ${dieFace}.`);
      return nextState;
    }

    case 'SET_ALL_IN_CATEGORY': {
      if (!inGame(state)) {
        return state;
      }
      return {
        ...state,
        round: {
          ...state.round,
          chosenCategory: action.payload.category
        }
      };
    }

    case 'DRAW_NEXT_CARD': {
      if (!inGame(state) || !state.round.chosenCategory) {
        return state;
      }

      const category = state.round.chosenCategory;
      const order = state.decks.orderByCategory[category];
      if (order.length === 0) {
        return state;
      }

      let nextIndex = state.decks.nextIndexByCategory[category];
      if (nextIndex >= order.length) {
        nextIndex = 0;
      }

      const cardId = order[nextIndex];
      const card = state.decks.cardsById[cardId];

      let nextState: GameState = {
        ...state,
        decks: {
          ...state.decks,
          nextIndexByCategory: {
            ...state.decks.nextIndexByCategory,
            [category]: nextIndex + 1
          }
        },
        round: {
          ...state.round,
          activeCardId: cardId,
          stealLockTeamId: null
        }
      };

      nextState = addLog(nextState, 'card_drawn', `Card drawn: ${card?.text ?? cardId}.`);
      return nextState;
    }

    case 'MARK_TEAM_GUESS_CORRECT': {
      if (!inGame(state) || !state.round.activeCardId) {
        return state;
      }

      const fallbackTeamIds = [state.round.activeTeamId];
      const requestedIds = action.payload?.teamIds?.length
        ? action.payload.teamIds
        : fallbackTeamIds;
      const awardedTeamIds = uniqueExistingTeamIds(state, requestedIds);

      if (awardedTeamIds.length === 0) {
        return state;
      }

      const via = state.round.mode === 'normal' ? 'team_guess' : 'all_in';

      let nextState: GameState = {
        ...state,
        round: {
          ...state.round,
          resolvedCards: [
            ...state.round.resolvedCards,
            {
              cardId: state.round.activeCardId,
              awardedTeamIds,
              via
            }
          ],
          activeCardId: null,
          stealLockTeamId: null
        }
      };

      nextState = addLog(nextState, 'card_scored', 'Card marked correct.');
      return nextState;
    }

    case 'MARK_PASS': {
      if (!inGame(state) || !state.round.activeCardId) {
        return state;
      }

      const penalties: PenaltyEvent[] =
        state.round.mode === 'normal'
          ? [
              ...state.round.penalties,
              {
                type: 'pass',
                sourceTeamId: state.round.activeTeamId,
                createdAt: Date.now()
              }
            ]
          : state.round.penalties;

      let nextState: GameState = {
        ...state,
        round: {
          ...state.round,
          penalties,
          deadCardIds: [...state.round.deadCardIds, state.round.activeCardId],
          activeCardId: null,
          stealLockTeamId: null
        }
      };

      nextState = addLog(nextState, 'pass', 'Card passed.');
      return nextState;
    }

    case 'APPLY_PENALTY': {
      if (!inGame(state)) {
        return state;
      }

      const sourceTeamId = action.payload.sourceTeamId ?? state.round.activeTeamId;

      let nextState: GameState = {
        ...state,
        round: {
          ...state.round,
          penalties: [
            ...state.round.penalties,
            {
              type: action.payload.type,
              sourceTeamId,
              createdAt: Date.now()
            }
          ]
        }
      };

      nextState = addLog(nextState, 'penalty', `Penalty logged: ${action.payload.type}.`);
      return nextState;
    }

    case 'ACTIVATE_UNCUFF': {
      if (!inGame(state) || !state.round.timerRunning || state.round.mode !== 'normal') {
        return state;
      }

      const activeTeam = getActiveTeam(state);
      if (!activeTeam || activeTeam.uncuffRemaining <= 0) {
        return state;
      }

      return {
        ...state,
        teams: state.teams.map((team) =>
          team.id === activeTeam.id
            ? {
                ...team,
                uncuffRemaining: Math.max(0, team.uncuffRemaining - 1)
              }
            : team
        ),
        round: {
          ...state.round,
          uncuffActive: true
        }
      };
    }

    case 'REQUEST_STEAL_LOCK': {
      if (
        !inGame(state) ||
        state.round.mode !== 'normal' ||
        !state.round.timerRunning ||
        !state.round.activeCardId ||
        state.round.stealLockTeamId
      ) {
        return state;
      }

      const stealTeam = getTeam(state, action.payload.teamId);
      if (!stealTeam || stealTeam.id === state.round.activeTeamId || stealTeam.stealRemaining <= 0) {
        return state;
      }

      let nextState: GameState = {
        ...state,
        round: {
          ...state.round,
          stealLockTeamId: stealTeam.id
        }
      };
      nextState = addLog(nextState, 'steal_locked', `${stealTeam.name} locked a steal attempt.`);
      return nextState;
    }

    case 'RESOLVE_STEAL': {
      if (!inGame(state) || !state.round.stealLockTeamId || !state.round.activeCardId) {
        return state;
      }

      const stealingTeamId = state.round.stealLockTeamId;
      if (action.payload.correct) {
        let nextState: GameState = {
          ...state,
          round: {
            ...state.round,
            resolvedCards: [
              ...state.round.resolvedCards,
              {
                cardId: state.round.activeCardId,
                awardedTeamIds: [stealingTeamId],
                via: 'steal'
              }
            ],
            activeCardId: null,
            stealLockTeamId: null
          }
        };
        nextState = addLog(nextState, 'steal_resolved', 'Steal success. Points awarded.');
        return nextState;
      }

      let nextState: GameState = {
        ...state,
        teams: state.teams.map((team) =>
          team.id === stealingTeamId
            ? {
                ...team,
                stealRemaining: Math.max(0, team.stealRemaining - 1)
              }
            : team
        ),
        round: {
          ...state.round,
          stealLockTeamId: null
        }
      };
      nextState = addLog(nextState, 'steal_resolved', 'Steal failed. Card burned for stealing team.');
      return nextState;
    }

    case 'MARK_DEAD_CARD': {
      if (!inGame(state) || !state.round.activeCardId) {
        return state;
      }
      return {
        ...state,
        round: {
          ...state.round,
          deadCardIds: [...state.round.deadCardIds, state.round.activeCardId],
          activeCardId: null,
          stealLockTeamId: null
        }
      };
    }

    case 'START_TIMER': {
      if (!inGame(state)) {
        return state;
      }
      return {
        ...state,
        round: {
          ...state.round,
          timerRunning: true
        }
      };
    }

    case 'TIMER_TICK': {
      if (!inGame(state)) {
        return state;
      }
      return decreaseTimer(state, action.payload.seconds);
    }

    case 'END_ROUND_AND_SCORE': {
      if (!inGame(state)) {
        return state;
      }
      return resolveRoundEnd(state);
    }

    case 'CHECK_WIN_OR_TIEBREAK': {
      if (!inGame(state)) {
        return state;
      }

      const reached = state.teams.filter((team) => team.score >= state.targetScore);
      if (reached.length === 1) {
        return {
          ...state,
          status: 'finished',
          winnerTeamIds: [reached[0].id]
        };
      }

      if (reached.length > 1) {
        return {
          ...state,
          round: {
            ...state.round,
            mode: 'tiebreak_all_in',
            dieFace: 'all_in',
            chosenCategory: null,
            timerRunning: false,
            activeCardId: null,
            stealLockTeamId: null,
            uncuffActive: false
          },
          winnerTeamIds: []
        };
      }

      return state;
    }

    case 'START_TIEBREAK_ALL_IN': {
      if (!inGame(state)) {
        return state;
      }

      return {
        ...state,
        round: {
          ...createRoundState(
            state.round.activeTeamId,
            state.round.activePlayerId,
            state.settings.turnSeconds
          ),
          mode: 'tiebreak_all_in',
          dieFace: 'all_in'
        }
      };
    }

    case 'RESOLVE_TIEBREAK': {
      if (!inGame(state)) {
        return state;
      }

      const winnerTeamId = action.payload.winnerTeamId;
      if (winnerTeamId) {
        return {
          ...state,
          status: 'finished',
          winnerTeamIds: [winnerTeamId]
        };
      }

      const leading = getLeadingTeams(state.teams);
      if (leading.length === 1) {
        return {
          ...state,
          status: 'finished',
          winnerTeamIds: [leading[0].id]
        };
      }

      return {
        ...state,
        round: {
          ...createRoundState(
            state.round.activeTeamId,
            state.round.activePlayerId,
            state.settings.turnSeconds
          ),
          mode: 'tiebreak_all_in',
          dieFace: 'all_in'
        }
      };
    }

    case 'ADVANCE_TO_NEXT_TEAM_CLOCKWISE': {
      if (!inGame(state)) {
        return state;
      }

      const advanced = advanceClockwise(state.teams, state.round.activeTeamId);
      return {
        ...state,
        teams: advanced.teams,
        round: resetRoundForNextTurn(state, 'normal', advanced.nextTeamId, advanced.nextPlayerId)
      };
    }

    case 'REHYDRATE_STATE': {
      return action.payload.state;
    }

    case 'RESET_GAME': {
      return createEmptyGameState();
    }

    default:
      return state;
  }
}
