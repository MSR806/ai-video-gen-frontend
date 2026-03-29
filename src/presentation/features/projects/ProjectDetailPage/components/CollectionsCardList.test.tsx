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
  });
});
