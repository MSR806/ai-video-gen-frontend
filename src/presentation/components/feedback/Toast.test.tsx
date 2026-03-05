import { describe, expect, it } from 'bun:test';
import { fireEvent, render, screen } from '@testing-library/react';
import { Toast } from './Toast';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('Toast', () => {
  it('auto-dismisses after provided duration', async () => {
    let closeCount = 0;

    render(
      <Toast message="Saved" type="success" onClose={() => (closeCount += 1)} duration={40} />,
    );

    await wait(70);
    expect(closeCount).toBe(1);
  });

  it('closes immediately when close button is clicked', () => {
    let closeCount = 0;

    render(
      <Toast message="Error" type="error" onClose={() => (closeCount += 1)} duration={3000} />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(closeCount).toBe(1);
  });
});
