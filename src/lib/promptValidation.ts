import type { Category, PromptCard } from '../state/types';

const EXPECTED_COUNT_PER_CATEGORY = 65;
const CATEGORIES: Category[] = ['action', 'incident', 'object', 'nature', 'ps'];

export function validatePromptBank(cards: PromptCard[]): string[] {
  const errors: string[] = [];

  CATEGORIES.forEach((category) => {
    const byCategory = cards.filter((card) => card.category === category);
    if (byCategory.length !== EXPECTED_COUNT_PER_CATEGORY) {
      errors.push(
        `Category ${category} expected ${EXPECTED_COUNT_PER_CATEGORY} cards but got ${byCategory.length}`
      );
    }

    const unique = new Set(byCategory.map((card) => card.text.trim().toLowerCase()));
    if (unique.size !== byCategory.length) {
      errors.push(`Category ${category} has duplicate prompt texts`);
    }
  });

  cards.forEach((card) => {
    if (!card.text.trim()) {
      errors.push(`Card ${card.id} has empty text`);
    }
    if (![1, 2, 3].includes(card.points)) {
      errors.push(`Card ${card.id} has invalid points value`);
    }
  });

  return errors;
}
