export type Category = 'action' | 'incident' | 'object' | 'nature' | 'ps';

export type DieFace = Category | 'all_in';

export type RoundMode = 'normal' | 'all_in' | 'tiebreak_all_in';

export type LifelineType = 'uncuff_me' | 'steal';

export interface PromptCard {
  id: string;
  category: Category;
  text: string;
  points: 1 | 2 | 3;
}

export interface Team {
  id: string;
  name: string;
  playerIds: string[];
  score: number;
  uncuffRemaining: number;
  stealRemaining: number;
  nextPlayerIndex: number;
}

export interface Player {
  id: string;
  teamId: string;
  name: string;
  order: number;
}

export interface PenaltyEvent {
  type:
    | 'pass'
    | 'hands_unclasped'
    | 'pointed_at_object'
    | 'used_non_onomatopoeia'
    | 'used_forbidden_onomatopoeia'
    | 'movement_only_no_sound';
  sourceTeamId: string;
  createdAt: number;
}

export interface ResolvedCard {
  cardId: string;
  awardedTeamIds: string[];
  via: 'team_guess' | 'steal' | 'all_in';
}

export interface DeckState {
  seed: string;
  cardsById: Record<string, PromptCard>;
  orderByCategory: Record<Category, string[]>;
  nextIndexByCategory: Record<Category, number>;
}

export interface RoundState {
  mode: RoundMode;
  dieFace: DieFace;
  chosenCategory: Category | null;
  activeTeamId: string;
  activePlayerId: string;
  timerSecondsLeft: number;
  timerRunning: boolean;
  activeCardId: string | null;
  stealLockTeamId: string | null;
  uncuffActive: boolean;
  resolvedCards: ResolvedCard[];
  penalties: PenaltyEvent[];
  deadCardIds: string[];
}

export interface GameSettings {
  turnSeconds: number;
  partyPlayEnabled: boolean;
}

export interface GameEvent {
  id: string;
  timestamp: number;
  type:
    | 'round_started'
    | 'die_rolled'
    | 'card_drawn'
    | 'card_scored'
    | 'pass'
    | 'penalty'
    | 'steal_locked'
    | 'steal_resolved'
    | 'round_scored'
    | 'winner_declared'
    | 'tiebreak_started';
  message: string;
}

export interface GameState {
  teams: Team[];
  players: Player[];
  targetScore: number;
  settings: GameSettings;
  round: RoundState;
  decks: DeckState;
  log: GameEvent[];
  status: 'setup' | 'in_game' | 'finished';
  winnerTeamIds: string[];
}

export interface SetupTeamInput {
  name: string;
  players: string[];
}
