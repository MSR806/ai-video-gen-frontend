import { describe, expect, it, mock } from 'bun:test';
import { fireEvent, render, screen } from '@testing-library/react';
import { CollectionsCardList } from './CollectionsCardList';

const buildCollection = (
  overrides: Partial<{ id: string; name: string; description: string; tag: string }> = {},
) => ({
  id: overrides.id ?? 'collection-1',
  projectId: 'project-1',
  name: overrides.name ?? 'Moodboard',
  description: overrides.description ?? 'Creative references',
  tag: overrides.tag ?? 'Ref',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
});

describe('CollectionsCardList', () => {
  it('renders empty state and triggers add callback', () => {
    const onCollectionSelect = mock(() => {});
    const onAddClick = mock(() => {});

    render(
      <CollectionsCardList
        collections={[]}
        onCollectionSelect={onCollectionSelect}
        onAddClick={onAddClick}
      />,
    );

    expect(screen.getByText('No collections found.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '+ New collection' }));

    expect(onAddClick).toHaveBeenCalledTimes(1);
    expect(onCollectionSelect).not.toHaveBeenCalled();
  });

  it('renders collection cards and selects requested collection', () => {
    const onCollectionSelect = mock(() => {});
    const onAddClick = mock(() => {});

    render(
      <CollectionsCardList
        collections={[
          buildCollection(),
          buildCollection({
            id: 'collection-2',
            name: 'Scenes',
            description: 'Scene breakouts',
            tag: 'Seq',
          }),
        ]}
        onCollectionSelect={onCollectionSelect}
        onAddClick={onAddClick}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Moodboard/i }));
    fireEvent.click(screen.getByRole('button', { name: /Scenes/i }));

    expect(onCollectionSelect).toHaveBeenNthCalledWith(1, 'collection-1');
    expect(onCollectionSelect).toHaveBeenNthCalledWith(2, 'collection-2');
  });
});
