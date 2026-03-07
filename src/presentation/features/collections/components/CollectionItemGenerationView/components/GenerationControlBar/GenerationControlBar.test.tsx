import { describe, expect, it } from 'bun:test';
import { fireEvent, render, screen } from '@testing-library/react';
import { GenerationControlBar } from './GenerationControlBar';
import type { Collection } from '@core/collection';
import type { CollectionItem, GenerationCapabilities } from '@core/collection-item';

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
  runId: null,
  generationRunOutputId: null,
  generationErrorMessage: null,
};

const capabilities: GenerationCapabilities = {
  image: [
    {
      model: 'Nano Banana',
      modelKey: 'nano_banana',
      provider: 'fal',
      mediaType: 'image',
      operations: [
        {
          operationKey: 'image_to_image',
          endpointId: 'fal-ai/nano-banana/edit',
          required: ['prompt', 'image_urls'],
          fields: [
            { key: 'prompt', type: 'string', required: true, description: 'Prompt' },
            {
              key: 'image_urls',
              type: 'array',
              required: true,
              description: 'Reference images',
              itemsType: 'string',
            },
            {
              key: 'aspect_ratio',
              type: 'string',
              required: false,
              description: 'Aspect ratio',
              enum: ['1:1', '9:16', '16:9'],
              default: '1:1',
            },
            { key: 'num_images', type: 'integer', required: false, description: null, default: 1 },
          ],
        },
      ],
    },
  ],
  video: [],
};

describe('GenerationControlBar', () => {
  it('extracts dropped URLs, dedupes references, and submits via Ctrl+Enter', () => {
    const callLog: Array<Record<string, unknown>> = [];

    render(
      <GenerationControlBar
        onGenerate={(params) => callLog.push(params)}
        isGenerating={false}
        projectId="project-1"
        generationCapabilities={capabilities}
        isCapabilitiesLoading={false}
        collections={[baseCollection]}
        selectedCollectionId="collection-1"
        selectedCollectionItems={[readyItem]}
        selectedCollectionChildCollections={[]}
        loadCollectionContentsForPicker={async () => null}
      />,
    );

    const promptInput = screen.getByPlaceholderText('Prompt');

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
      projectId: 'project-1',
      collectionId: 'collection-1',
      mediaType: 'image',
      modelKey: 'nano_banana',
      operationKey: 'image_to_image',
      inputs: {
        prompt: 'Create a cinematic close-up',
        image_urls: [
          'https://assets.example.com/reference-a.png',
          'https://assets.example.com/reference-b.png',
        ],
        aspect_ratio: '1:1',
      },
      outputCount: 1,
    });

    expect((promptInput as HTMLTextAreaElement).value).toBe('');
    expect(screen.queryAllByLabelText('Remove reference')).toHaveLength(0);
  });

  it('blocks generate when required prompt is empty', () => {
    const onGenerateCalls: unknown[] = [];

    render(
      <GenerationControlBar
        onGenerate={(params) => onGenerateCalls.push(params)}
        isGenerating={false}
        projectId="project-1"
        generationCapabilities={capabilities}
        isCapabilitiesLoading={false}
        collections={[baseCollection]}
        selectedCollectionId="collection-1"
        selectedCollectionItems={[readyItem]}
        selectedCollectionChildCollections={[]}
        loadCollectionContentsForPicker={async () => null}
      />,
    );

    const promptInput = screen.getByPlaceholderText('Prompt');
    fireEvent.keyDown(promptInput, { key: 'Enter', ctrlKey: true });

    expect(onGenerateCalls).toHaveLength(0);
  });

  it('blocks generate when already generating', () => {
    const onGenerateCalls: unknown[] = [];

    render(
      <GenerationControlBar
        onGenerate={(params) => onGenerateCalls.push(params)}
        isGenerating={true}
        projectId="project-1"
        generationCapabilities={capabilities}
        isCapabilitiesLoading={false}
        collections={[baseCollection]}
        selectedCollectionId="collection-1"
        selectedCollectionItems={[readyItem]}
        selectedCollectionChildCollections={[]}
        loadCollectionContentsForPicker={async () => null}
      />,
    );

    const promptInput = screen.getByPlaceholderText('Prompt');
    fireEvent.change(promptInput, { target: { value: 'Should not submit now' } });
    fireEvent.keyDown(promptInput, { key: 'Enter', metaKey: true });

    expect(onGenerateCalls).toHaveLength(0);
  });
});
