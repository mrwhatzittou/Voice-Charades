import action from './action.json';
import incident from './incident.json';
import object from './object.json';
import nature from './nature.json';
import ps from './ps.json';
import { validatePromptBank } from '../../lib/promptValidation';
import type { PromptCard } from '../../state/types';

const allPromptCards: PromptCard[] = [
  ...(action as PromptCard[]),
  ...(incident as PromptCard[]),
  ...(object as PromptCard[]),
  ...(nature as PromptCard[]),
  ...(ps as PromptCard[])
];

const validationErrors = validatePromptBank(allPromptCards);
if (validationErrors.length > 0) {
  throw new Error(`Prompt validation failed: ${validationErrors.join(' | ')}`);
}

export { allPromptCards };
