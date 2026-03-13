import { describe, expect, it } from 'bun:test';
import { fireEvent, render, screen } from '@testing-library/react';
import { Modal } from './Modal';

describe('Modal', () => {
  it('renders only when open and closes via backdrop/close button', () => {
    let closes = 0;
    const onClose = () => {
      closes += 1;
    };

    const { rerender } = render(
      <Modal isOpen={false} onClose={onClose} title="Example">
        <p>Body</p>
      </Modal>,
    );

    expect(screen.queryByRole('heading', { name: 'Example' })).not.toBeInTheDocument();

    rerender(
      <Modal isOpen={true} onClose={onClose} title="Example">
        <p>Body</p>
      </Modal>,
    );

    expect(screen.getByRole('heading', { name: 'Example' })).toBeInTheDocument();
    expect(document.body.style.overflow).toBe('hidden');

    fireEvent.click(screen.getByText('Body'));
    expect(closes).toBe(0);

    fireEvent.click(screen.getByLabelText('Close'));
    expect(closes).toBe(1);

    fireEvent.click(
      screen.getByRole('heading', { name: 'Example' }).closest('div')?.parentElement
        ?.parentElement as HTMLElement,
    );
    expect(closes).toBe(2);
  });

  it('closes on Escape and restores body overflow on unmount', () => {
    let closes = 0;
    const onClose = () => {
      closes += 1;
    };

    const { unmount } = render(
      <Modal isOpen={true} onClose={onClose} title="Keyboard">
        <p>Body</p>
      </Modal>,
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(closes).toBe(1);

    unmount();
    expect(document.body.style.overflow).toBe('');
  });
});
