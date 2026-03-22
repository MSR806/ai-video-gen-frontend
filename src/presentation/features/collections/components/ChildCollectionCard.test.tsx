import { describe, expect, it } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { ChildCollectionCard } from './ChildCollectionCard';

const collection = {
  id: 'collection-42',
  projectId: 'project-1',
  parentCollectionId: null,
  name: 'Visual Concepts',
  description: 'Concept references',
  tag: 'concept',
};

describe('ChildCollectionCard', () => {
  it('renders collection name and deep-link href', () => {
    render(
      <ChildCollectionCard
        collection={collection}
        href="/projects/project-1/collections/collection-42"
      />,
    );

    const link = screen.getByRole('link', { name: 'Open collection Visual Concepts' });
    expect(screen.getByText('Visual Concepts')).toBeTruthy();
    expect(link).toHaveAttribute('href', '/projects/project-1/collections/collection-42');
  });
});
