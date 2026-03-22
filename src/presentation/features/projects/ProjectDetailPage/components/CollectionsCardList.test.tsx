import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, mock } from 'bun:test';
import { CollectionsCardList } from './CollectionsCardList';

describe('CollectionsCardList', () => {
  it('renders empty state and triggers add button action', () => {
    const onAddClick = mock(() => {});

    render(
      <CollectionsCardList
        collections={[]}
        onCollectionSelect={() => {}}
        onAddClick={onAddClick}
      />,
    );

    expect(screen.getByText('No collections found.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '+ New collection' }));
    expect(onAddClick).toHaveBeenCalledTimes(1);
  });

  it('renders collections and calls selection callback with the selected id', () => {
    const onCollectionSelect = mock((collectionId: string) => {
      void collectionId;
    });

    render(
      <CollectionsCardList
        collections={[
          {
            id: 'col-1',
            projectId: 'proj-1',
            name: 'Shots',
            description: 'Camera setups',
            status: 'ACTIVE',
            tag: 'shots',
            parentCollectionId: null,
            createdAt: '2026-03-01T00:00:00.000Z',
            updatedAt: '2026-03-01T00:00:00.000Z',
          },
        ]}
        onCollectionSelect={onCollectionSelect}
        onAddClick={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /shots/i }));

    expect(onCollectionSelect).toHaveBeenCalledTimes(1);
    expect(onCollectionSelect).toHaveBeenCalledWith('col-1');
  });
});
