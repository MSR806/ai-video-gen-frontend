import { describe, expect, it } from 'bun:test';
import { fireEvent, render, screen } from '@testing-library/react';
import { ChildCollectionCard } from './ChildCollectionCard';

const collection = {
  id: 'collection-42',
  projectId: 'project-1',
  parentCollectionId: null,
  name: 'Visual Concepts',
  description: 'Concept references',
  tag: 'concept',
  thumbnailUrl: null,
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
    expect(screen.getByText('concept')).toBeInTheDocument();
    expect(screen.getByText('Concept references')).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/projects/project-1/collections/collection-42');
    expect(screen.getByText('No preview')).toBeInTheDocument();
  });

  it('renders thumbnail when thumbnailUrl is available', () => {
    render(
      <ChildCollectionCard
        collection={{ ...collection, thumbnailUrl: 'https://assets.example.com/concepts.jpg' }}
        href="/projects/project-1/collections/collection-42"
      />,
    );

    expect(
      screen.getByRole('img', { name: 'Collection thumbnail for Visual Concepts' }),
    ).toHaveAttribute('src', 'https://assets.example.com/concepts.jpg');
  });

  it('falls back to placeholder when thumbnail image fails to load', () => {
    render(
      <ChildCollectionCard
        collection={{ ...collection, thumbnailUrl: 'https://assets.example.com/concepts.jpg' }}
        href="/projects/project-1/collections/collection-42"
      />,
    );

    fireEvent.error(screen.getByRole('img', { name: 'Collection thumbnail for Visual Concepts' }));

    expect(
      screen.queryByRole('img', { name: 'Collection thumbnail for Visual Concepts' }),
    ).not.toBeInTheDocument();
    expect(screen.getByText('No preview')).toBeInTheDocument();
  });
});
