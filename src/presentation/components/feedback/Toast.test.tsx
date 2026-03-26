import { describe, expect, it } from 'bun:test';
import { fireEvent, render, screen } from '@testing-library/react';
import { Toast, ToastContainer } from './Toast';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('Toast', () => {
  it('sets assertive accessibility semantics for error toasts', () => {
    render(<Toast message="Error" type="error" onClose={() => undefined} duration={3000} />);

    expect(screen.getByRole('alert')).toHaveAttribute('aria-live', 'assertive');
  });

  it('sets polite accessibility semantics for non-error toasts', () => {
    render(<Toast message="Saved" type="success" onClose={() => undefined} duration={3000} />);

    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
  });

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

describe('ToastContainer', () => {
  it('renders nothing when there are no toasts', () => {
    const { container } = render(<ToastContainer toasts={[]} onRemove={() => undefined} />);

    expect(container.firstChild).toBeNull();
  });

  it('renders notifications region and removes a toast when closed', () => {
    const removedIds: string[] = [];

    render(
      <ToastContainer
        toasts={[
          { id: 'toast-1', message: 'Saved', type: 'success' },
          { id: 'toast-2', message: 'Failed', type: 'error' },
        ]}
        onRemove={(id) => removedIds.push(id)}
      />,
    );

    expect(screen.getByRole('region', { name: 'Notifications' })).toBeInTheDocument();

    const closeButtons = screen.getAllByRole('button', { name: 'Close' });
    fireEvent.click(closeButtons[1]!);

    expect(removedIds).toEqual(['toast-2']);
  });
});
