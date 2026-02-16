import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SetupScreen } from './SetupScreen';

describe('SetupScreen', () => {
  it('disables start when target score is invalid', async () => {
    const user = userEvent.setup();
    render(<SetupScreen onStart={vi.fn()} />);

    const targetInput = screen.getByLabelText('Target score');
    await user.clear(targetInput);
    await user.type(targetInput, '0');

    expect(screen.getByRole('button', { name: 'Start Voice Charades' })).toBeDisabled();
  });
});
