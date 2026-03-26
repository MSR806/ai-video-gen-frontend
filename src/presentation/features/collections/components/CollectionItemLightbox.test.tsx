import { describe, expect, it } from 'bun:test';
import { fireEvent, render, screen } from '@testing-library/react';
import type { CollectionItem } from '@core/collection-item';
import { CollectionItemLightbox } from './CollectionItemLightbox';

const baseItem: CollectionItem = {
  id: 'item-1',
  projectId: 'project-1',
  collectionId: 'collection-1',
  isFavorite: false,
  mediaType: 'image',
  status: 'READY',
  name: 'Hero frame',
  description: 'A cinematic still',
  url: 'https://example.com/image.jpg',
  metadata: {
    width: 1920,
    height: 1080,
    format: 'jpeg',
    thumbnailUrl: 'https://example.com/thumb.jpg',
  },
};

describe('CollectionItemLightbox', () => {
  it('renders nothing when item is null', () => {
    render(<CollectionItemLightbox item={null} onClose={() => undefined} />);
    expect(screen.queryByLabelText('Close')).not.toBeInTheDocument();
  });

  it('renders image media and closes via Escape', () => {
    let closes = 0;
    render(
      <CollectionItemLightbox
        item={baseItem}
        onClose={() => {
          closes += 1;
        }}
      />,
    );

    expect(screen.getAllByRole('img', { name: 'Hero frame' }).length).toBe(2);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(closes).toBe(1);
  });

  it('shows processing fallback for non-ready media', () => {
    render(
      <CollectionItemLightbox
        item={{ ...baseItem, status: 'GENERATING' }}
        onClose={() => undefined}
      />,
    );

    expect(screen.getByText('Media is still processing...')).toBeInTheDocument();
  });

  it('falls back to text thumbnail after video preview error', () => {
    const videoItem: CollectionItem = {
      ...baseItem,
      mediaType: 'video',
      status: 'READY',
      url: 'https://example.com/video.mp4',
      metadata: {
        width: 1080,
        height: 1920,
        duration: 4,
        format: 'mp4',
        thumbnailUrl: '',
      },
    };

    const { container } = render(
      <CollectionItemLightbox item={videoItem} onClose={() => undefined} />,
    );

    const videos = container.querySelectorAll('video');
    expect(videos.length).toBeGreaterThan(1);

    fireEvent.error(videos[1] as HTMLVideoElement);
    expect(screen.getByText('Hero frame')).toBeInTheDocument();
  });

  it('supports previous and next button navigation', () => {
    let previousCalls = 0;
    let nextCalls = 0;

    render(
      <CollectionItemLightbox
        item={baseItem}
        onClose={() => undefined}
        onPrevious={() => {
          previousCalls += 1;
        }}
        onNext={() => {
          nextCalls += 1;
        }}
        canGoPrevious
        canGoNext
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Previous item' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next item' }));

    expect(previousCalls).toBe(1);
    expect(nextCalls).toBe(1);
  });

  it('supports arrow-key navigation and disables edge controls', () => {
    let previousCalls = 0;
    let nextCalls = 0;

    render(
      <CollectionItemLightbox
        item={baseItem}
        onClose={() => undefined}
        onPrevious={() => {
          previousCalls += 1;
        }}
        onNext={() => {
          nextCalls += 1;
        }}
        canGoPrevious={false}
        canGoNext={false}
      />,
    );

    const previousButton = screen.getByRole('button', { name: 'Previous item' });
    const nextButton = screen.getByRole('button', { name: 'Next item' });

    expect(previousButton).toBeDisabled();
    expect(nextButton).toBeDisabled();

    fireEvent.keyDown(document, { key: 'ArrowLeft' });
    fireEvent.keyDown(document, { key: 'ArrowRight' });

    expect(previousCalls).toBe(0);
    expect(nextCalls).toBe(0);
  });

  it('triggers arrow-key navigation when enabled', () => {
    let previousCalls = 0;
    let nextCalls = 0;

    render(
      <CollectionItemLightbox
        item={baseItem}
        onClose={() => undefined}
        onPrevious={() => {
          previousCalls += 1;
        }}
        onNext={() => {
          nextCalls += 1;
        }}
        canGoPrevious
        canGoNext
      />,
    );

    fireEvent.keyDown(document, { key: 'ArrowLeft' });
    fireEvent.keyDown(document, { key: 'ArrowRight' });

    expect(previousCalls).toBe(1);
    expect(nextCalls).toBe(1);
  });
});
