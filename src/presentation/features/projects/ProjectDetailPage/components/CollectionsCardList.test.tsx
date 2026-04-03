import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, mock } from 'bun:test';
import { CollectionsCardList } from './CollectionsCardList';

describe('CollectionsCardList', () => {
  it('renders empty state and triggers add button action', () => {
    const onAddClick = mock(() => {});
    const onBackToProjectClick = mock(() => {});

    render(
      <CollectionsCardList
        projectId="proj-1"
        collections={[]}
        onAddClick={onAddClick}
        onBackToProjectClick={onBackToProjectClick}
      />,
    );

    expect(screen.getByText('No collections found.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '+ New collection' }));
    expect(onAddClick).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Back to Project' }));
    expect(onBackToProjectClick).toHaveBeenCalledTimes(1);
  });

  it('renders collections as navigation links', () => {
    render(
      <CollectionsCardList
        projectId="proj-1"
        collections={[
          {
            id: 'col-1',
            projectId: 'proj-1',
            name: 'Shots',
            description: 'Camera setups',
            tag: 'shots',
            parentCollectionId: null,
            thumbnailUrl: null,
          },
        ]}
        onAddClick={() => {}}
        onBackToProjectClick={() => {}}
      />,
    );

    expect(screen.getByRole('link', { name: 'Open collection Shots' })).toHaveAttribute(
      'href',
      '/projects/proj-1/collections/col-1',
    );
    expect(screen.getByText('No preview')).toBeInTheDocument();
  });

  it('renders collection thumbnail image when thumbnailUrl is present', () => {
    render(
      <CollectionsCardList
        projectId="proj-1"
        collections={[
          {
            id: 'col-1',
            projectId: 'proj-1',
            name: 'Shots',
            description: 'Camera setups',
            tag: 'shots',
            parentCollectionId: null,
            thumbnailUrl: 'https://assets.example.com/shots.jpg',
          },
        ]}
        onAddClick={() => {}}
        onBackToProjectClick={() => {}}
      />,
    );

    expect(screen.getByRole('img', { name: 'Collection thumbnail for Shots' })).toHaveAttribute(
      'src',
      'https://assets.example.com/shots.jpg',
    );
  });

  it('falls back to placeholder when thumbnail image fails to load', () => {
    render(
      <CollectionsCardList
        projectId="proj-1"
        collections={[
          {
            id: 'col-1',
            projectId: 'proj-1',
            name: 'Shots',
            description: 'Camera setups',
            tag: 'shots',
            parentCollectionId: null,
            thumbnailUrl: 'https://assets.example.com/shots.jpg',
          },
        ]}
        onAddClick={() => {}}
        onBackToProjectClick={() => {}}
      />,
    );

    fireEvent.error(screen.getByRole('img', { name: 'Collection thumbnail for Shots' }));

    expect(
      screen.queryByRole('img', { name: 'Collection thumbnail for Shots' }),
    ).not.toBeInTheDocument();
    expect(screen.getByText('No preview')).toBeInTheDocument();
  });
});
