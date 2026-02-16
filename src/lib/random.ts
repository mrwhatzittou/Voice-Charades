import type { Category, DeckState, PromptCard } from '../state/types';

const CATEGORIES: Category[] = ['action', 'incident', 'object', 'nature', 'ps'];

function xmur3(seed: string) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i += 1) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function next() {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}

function mulberry32(a: number) {
  return function rand() {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seededShuffle<T>(items: T[], seed: string): T[] {
  const hash = xmur3(seed)();
  const rand = mulberry32(hash);
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function createDeckState(cards: PromptCard[], seed: string): DeckState {
  const cardsById: Record<string, PromptCard> = {};
  cards.forEach((card) => {
    cardsById[card.id] = card;
  });

  const orderByCategory = CATEGORIES.reduce(
    (acc, category) => {
      const ids = cards
        .filter((card) => card.category === category)
        .map((card) => card.id);
      acc[category] = seededShuffle(ids, `${seed}-${category}`);
      return acc;
    },
    {
      action: [] as string[],
      incident: [] as string[],
      object: [] as string[],
      nature: [] as string[],
      ps: [] as string[]
    }
  );

  return {
    seed,
    cardsById,
    orderByCategory,
    nextIndexByCategory: {
      action: 0,
      incident: 0,
      object: 0,
      nature: 0,
      ps: 0
    }
  };
}

export const DIE_FACES: Array<Category | 'all_in'> = [
  'action',
  'incident',
  'object',
  'nature',
  'ps',
  'all_in'
];

export function rollDie(seed: string): Category | 'all_in' {
  const rand = mulberry32(xmur3(seed)());
  const idx = Math.floor(rand() * DIE_FACES.length);
  return DIE_FACES[idx];
}
