import { describe, expect, it, mock } from 'bun:test';
import { fireEvent, render, screen } from '@testing-library/react';

import { Badge } from './Badge';
import { Button } from './Button';
import { Card } from './Card';

describe('UI primitives', () => {
  it('renders Button with default type and invokes click handler', () => {
    const onClick = mock();

    render(<Button onClick={onClick}>Save</Button>);

    const button = screen.getByRole('button', { name: 'Save' });
    expect(button.getAttribute('type')).toBe('button');

    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders disabled outline Button variant', () => {
    render(
      <Button variant="outline" disabled>
        Disabled
      </Button>,
    );

    const button = screen.getByRole('button', { name: 'Disabled' });
    expect(button.hasAttribute('disabled')).toBe(true);
  });

  it('renders Card content and forwards click events', () => {
    const onClick = mock();

    render(
      <Card className="extra-class" onClick={onClick}>
        <span>Card body</span>
      </Card>,
    );

    const cardContent = screen.getByText('Card body');
    const cardElement = cardContent.closest('div');
    expect(cardElement).not.toBeNull();

    if (cardElement) {
      fireEvent.click(cardElement);
    }

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(cardElement?.className.includes('extra-class')).toBe(true);
  });

  it('renders status Badge variant and content', () => {
    render(<Badge variant="in-progress">Running</Badge>);

    const badge = screen.getByText('Running');
    expect(badge.tagName).toBe('SPAN');
    expect(badge.className.length > 0).toBe(true);
  });
});
