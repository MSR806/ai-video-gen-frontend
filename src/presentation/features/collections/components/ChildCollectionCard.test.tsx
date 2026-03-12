import { describe, expect, it, mock } from 'bun:test';
import { fireEvent, render, screen } from '@testing-library/react';
import { ChildCollectionCard } from './ChildCollectionCard';

const collection = {
  id: 'collection-42',
  projectId: 'project-1',
  name: 'Visual Concepts',
  description: 'Concept references',
  tag: 'concept',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('ChildCollectionCard', () => {
  it('renders collection name and opens the collection on click', () => {
    const onClick = mock(() => {});

    render(<ChildCollectionCard collection={collection} onClick={onClick} />);

    fireEvent.click(screen.getByRole('button', { name: 'Open collection Visual Concepts' }));

    expect(screen.getByText('Visual Concepts')).toBeTruthy();
    expect(onClick).toHaveBeenCalledWith('collection-42');
  });

  it('supports missing onClick handler without throwing', () => {
    render(<ChildCollectionCard collection={collection} />);

    fireEvent.click(screen.getByRole('button', { name: 'Open collection Visual Concepts' }));

    expect(screen.getByText('Visual Concepts')).toBeTruthy();
  });
});
