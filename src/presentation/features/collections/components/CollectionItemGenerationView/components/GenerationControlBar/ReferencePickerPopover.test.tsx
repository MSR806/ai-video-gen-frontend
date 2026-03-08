import { describe, expect, it } from 'bun:test';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { ReferencePickerPopover } from './ReferencePickerPopover';
import type { Collection } from '@core/collection';
import type { CollectionContents, CollectionItem } from '@core/collection-item';

const collections: Collection[] = [
  {
    id: 'root-1',
    projectId: 'project-1',
    parentCollectionId: null,
    name: 'Root One',
    tag: 'root',
    description: 'Root collection',
  },
  {
    id: 'child-1',
    projectId: 'project-1',
    parentCollectionId: 'root-1',
    name: 'Child One',
    tag: 'child',
    description: 'Child collection',
  },
  {
    id: 'nested-1',
    projectId: 'project-1',
    parentCollectionId: 'child-1',
    name: 'Nested One',
    tag: 'nested',
    description: 'Nested collection',
  },
];

const buildItem = (overrides: Partial<CollectionItem> = {}): CollectionItem => ({
  id: overrides.id ?? 'item-1',
  projectId: 'project-1',
  collectionId: 'nested-1',
  mediaType: overrides.mediaType ?? 'image',
  status: overrides.status ?? 'READY',
  name: overrides.name ?? 'Ready Asset',
  description: overrides.description ?? 'asset',
  url: overrides.url ?? 'https://assets.example.com/ready.png',
  metadata:
    overrides.metadata ??
    ({
      width: 1200,
      height: 800,
      format: 'png',
      thumbnailUrl: 'https://assets.example.com/thumb.png',
    } as CollectionItem['metadata']),
  runId: null,
  generationRunOutputId: null,
  generationErrorMessage: null,
});

const renderPopover = (overrides: Partial<ComponentProps<typeof ReferencePickerPopover>> = {}) => {
  const onClose = () => {};
  const onNavigateRoot = () => {};
  const onNavigateCollection = () => {};
  const onSelectReferenceItem = () => {};

  const currentContents: CollectionContents = {
    childCollections: collections.filter(
      (collection) => collection.parentCollectionId === 'nested-1',
    ),
    items: [
      buildItem(),
      buildItem({ id: 'item-2', status: 'GENERATING', name: 'Not ready' }),
      buildItem({ id: 'item-3', mediaType: 'video', name: 'Video asset' }),
      buildItem({ id: 'item-4', url: '   ', name: 'Missing URL' }),
    ],
  };

  return render(
    <ReferencePickerPopover
      collections={collections}
      currentCollectionId="nested-1"
      currentContents={currentContents}
      isLoading={false}
      errorMessage={null}
      selectedReferenceImages={[]}
      maxReferenceImages={2}
      onClose={onClose}
      onNavigateRoot={onNavigateRoot}
      onNavigateCollection={onNavigateCollection}
      onSelectReferenceItem={onSelectReferenceItem}
      {...overrides}
    />,
  );
};

describe('ReferencePickerPopover', () => {
  it('renders breadcrumb, supports navigation, and closes', () => {
    const calls: string[] = [];

    renderPopover({
      onNavigateRoot: () => calls.push('root'),
      onNavigateCollection: (collectionId) => calls.push(collectionId),
      onClose: () => calls.push('close'),
    });

    expect(screen.getByRole('dialog', { name: 'Reference picker' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Collections' }));
    fireEvent.click(screen.getByRole('button', { name: 'Root One' }));
    fireEvent.click(screen.getByRole('button', { name: 'Child One' }));
    fireEvent.click(screen.getByRole('button', { name: 'Close picker' }));

    expect(calls).toEqual(['root', 'root-1', 'child-1', 'close']);
  });

  it('shows only eligible image items and enforces max-selection disable state', () => {
    const selected: string[] = [];

    renderPopover({
      selectedReferenceImages: [
        'https://assets.example.com/already-picked-a.png',
        'https://assets.example.com/already-picked-b.png',
      ],
      maxReferenceImages: 2,
      onSelectReferenceItem: (item) => selected.push(item.id),
    });

    const readyButton = screen.getByRole('button', { name: 'Use Ready Asset as reference' });
    expect(readyButton).toBeDisabled();

    expect(
      screen.queryByRole('button', { name: 'Use Not ready as reference' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Use Video asset as reference' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Use Missing URL as reference' }),
    ).not.toBeInTheDocument();

    fireEvent.click(readyButton);
    expect(selected).toEqual([]);
  });

  it('renders loading and error states for item section', () => {
    const { rerender } = renderPopover({ currentCollectionId: 'child-1', isLoading: true });

    expect(screen.getByText('Loading collection assets...')).toBeInTheDocument();

    rerender(
      <ReferencePickerPopover
        collections={collections}
        currentCollectionId="child-1"
        currentContents={{ childCollections: [], items: [] }}
        isLoading={false}
        errorMessage="Failed to load assets"
        selectedReferenceImages={[]}
        maxReferenceImages={3}
        onClose={() => {}}
        onNavigateRoot={() => {}}
        onNavigateCollection={() => {}}
        onSelectReferenceItem={() => {}}
      />,
    );

    expect(screen.getByText('Failed to load assets')).toBeInTheDocument();
  });
});
