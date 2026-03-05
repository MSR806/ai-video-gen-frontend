import { describe, expect, it } from 'bun:test';
import { fireEvent, render, screen } from '@testing-library/react';
import { GenerationControlBar } from './GenerationControlBar';
import type { Collection } from '@core/collection';
import type { CollectionItem } from '@core/collection-item';

const baseCollection: Collection = {
  id: 'collection-1',
  projectId: 'project-1',
  parentCollectionId: null,
  name: 'Collection One',
  tag: 'tag',
  description: 'Description',
};

const readyItem: CollectionItem = {
  id: 'item-1',
  projectId: 'project-1',
  collectionId: 'collection-1',
  mediaType: 'image',
  status: 'READY',
  name: 'Reference',
  description: 'Reference image',
  url: 'https://assets.example.com/item-1.png',
  metadata: {
    width: 1024,
    height: 1024,
    format: 'png',
    thumbnailUrl: 'https://assets.example.com/item-1-thumb.png',
  },
  jobId: null,
  generationErrorMessage: null,
};

describe('GenerationControlBar', () => {
  it('extracts dropped URLs, dedupes references, and submits via Ctrl+Enter', () => {
    const onGenerate = (prompt: string, referenceImages: string[], aspectRatio: string) => {
      callLog.push({ prompt, referenceImages, aspectRatio });
    };

    const callLog: Array<{ prompt: string; referenceImages: string[]; aspectRatio: string }> = [];

    const { container } = render(
      <GenerationControlBar
        onGenerate={onGenerate}
        isGenerating={false}
        collections={[baseCollection]}
        selectedCollectionId="collection-1"
        selectedCollectionItems={[readyItem]}
        selectedCollectionChildCollections={[]}
        loadCollectionContentsForPicker={async () => null}
      />,
    );

    const promptInput = screen.getByPlaceholderText('What magic should we do today?');

    fireEvent.drop(promptInput, {
      dataTransfer: {
        getData(type: string) {
          if (type === 'application/x-ai-video-gen-item-url') {
            return 'https://assets.example.com/reference-a.png';
          }

          if (type === 'text/uri-list') {
            return 'https://assets.example.com/reference-a.png\nhttps://assets.example.com/reference-b.png';
          }

          if (type === 'text/plain') {
            return 'duplicate https://assets.example.com/reference-a.png and invalid ftp://assets.example.com/file.png';
          }

          return '';
        },
      },
    });

    fireEvent.change(promptInput, { target: { value: 'Create a cinematic close-up' } });
    fireEvent.keyDown(promptInput, { key: 'Enter', ctrlKey: true });

    expect(callLog).toHaveLength(1);
    expect(callLog[0]).toEqual({
      prompt: 'Create a cinematic close-up',
      referenceImages: [
        'https://assets.example.com/reference-a.png',
        'https://assets.example.com/reference-b.png',
      ],
      aspectRatio: 'PORTRAIT',
    });

    const chips = container.querySelectorAll('[class*="referenceChip"]');
    expect(chips.length).toBe(0);
  });

  it('blocks generate when prompt is empty', () => {
    const onGenerateCalls: unknown[] = [];

    render(
      <GenerationControlBar
        onGenerate={(prompt, refs, ratio) => onGenerateCalls.push({ prompt, refs, ratio })}
        isGenerating={false}
        collections={[baseCollection]}
        selectedCollectionId="collection-1"
        selectedCollectionItems={[readyItem]}
        selectedCollectionChildCollections={[]}
        loadCollectionContentsForPicker={async () => null}
      />,
    );

    const promptInput = screen.getByPlaceholderText('What magic should we do today?');
    fireEvent.keyDown(promptInput, { key: 'Enter', ctrlKey: true });

    expect(onGenerateCalls).toHaveLength(0);
  });

  it('blocks generate when already generating', () => {
    const onGenerateCalls: unknown[] = [];

    render(
      <GenerationControlBar
        onGenerate={(prompt, refs, ratio) => onGenerateCalls.push({ prompt, refs, ratio })}
        isGenerating={true}
        collections={[baseCollection]}
        selectedCollectionId="collection-1"
        selectedCollectionItems={[readyItem]}
        selectedCollectionChildCollections={[]}
        loadCollectionContentsForPicker={async () => null}
      />,
    );

    const promptInput = screen.getByPlaceholderText('What magic should we do today?');
    fireEvent.change(promptInput, { target: { value: 'Should not submit now' } });
    fireEvent.keyDown(promptInput, { key: 'Enter', metaKey: true });

    expect(onGenerateCalls).toHaveLength(0);
  });
});
