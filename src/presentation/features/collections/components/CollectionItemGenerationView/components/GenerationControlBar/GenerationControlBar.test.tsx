import { describe, expect, it } from 'bun:test';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
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

const arrayCapabilities: GenerationCapabilities = {
  image: [
    {
      model: 'Nano Banana',
      modelKey: 'nano_banana',
      provider: 'fal',
      mediaType: 'image',
      operations: [
        {
          operationKey: 'image_to_image',
          operationType: 'image_to_image',
          operationName: 'Image to Image',
          endpointId: 'fal-ai/nano-banana/edit',
          required: ['prompt', 'image_urls'],
          fields: [
            { key: 'prompt', type: 'string', required: true, description: 'Prompt' },
            {
              key: 'image_urls',
              type: 'array',
              required: true,
              title: 'Reference Images',
              description: 'Reference images',
              uiGroup: 'basic',
              itemsType: 'string',
            },
            {
              key: 'aspect_ratio',
              uiGroup: 'basic',
              title: 'Aspect Ratio',
              type: 'string',
              required: false,
              description: 'Aspect ratio',
              enum: ['1:1', '9:16', '16:9'],
              default: '1:1',
            },
            {
              key: 'num_images',
              type: 'integer',
              required: false,
              description: null,
              default: 1,
              uiGroup: 'basic',
            },
            {
              key: 'seed',
              title: 'Seed',
              type: 'integer',
              required: false,
              description: 'The seed for the random number generator.',
              uiGroup: 'advanced',
            },
          ],
        },
      ],
    },
  ],
  video: [],
};

const pairedFrameCapabilities: GenerationCapabilities = {
  image: [],
  video: [
    {
      model: 'Veo 3.1',
      modelKey: 'veo_3_1',
      provider: 'fal',
      mediaType: 'video',
      operations: [
        {
          operationKey: 'first_last_frame_to_video',
          operationType: 'first_last_frame_to_video',
          operationName: 'First/Last Frame to Video',
          endpointId: 'fal-ai/veo3.1/first-last-frame-to-video',
          required: ['prompt', 'first_frame_url', 'last_frame_url'],
          fields: [
            { key: 'prompt', type: 'string', required: true, description: 'Prompt' },
            {
              key: 'first_frame_url',
              type: 'string',
              format: 'uri',
              required: true,
              title: 'Start Frame',
              description: 'URL of the first frame.',
            },
            {
              key: 'last_frame_url',
              type: 'string',
              format: 'uri',
              required: true,
              title: 'End Frame',
              description: 'URL of the last frame.',
            },
          ],
        },
      ],
    },
  ],
};

const declarativeSequenceCapabilities: GenerationCapabilities = {
  image: [],
  video: [
    {
      model: 'Future Sequence Model',
      modelKey: 'future_sequence',
      provider: 'fal',
      mediaType: 'video',
      operations: [
        {
          operationKey: 'start_mid_end_to_video',
          operationType: 'first_last_frame_to_video',
          operationName: 'Start/Mid/End to Video',
          endpointId: 'fal-ai/future-sequence',
          required: ['prompt', 'start_frame_url', 'mid_frame_url', 'end_frame_url'],
          mediaGroups: [
            {
              groupKey: 'frames',
              layout: 'sequence',
              placement: 'top',
            },
          ],
          fields: [
            { key: 'prompt', type: 'string', required: true, description: 'Prompt' },
            {
              key: 'start_frame_url',
              type: 'string',
              format: 'uri',
              required: true,
              title: 'Start Frame',
              description: 'Start frame',
              mediaGroup: 'frames',
              mediaOrder: 1,
              mediaName: 'Start',
            },
            {
              key: 'mid_frame_url',
              type: 'string',
              format: 'uri',
              required: true,
              title: 'Middle Frame',
              description: 'Middle frame',
              mediaGroup: 'frames',
              mediaOrder: 2,
              mediaName: 'Mid',
            },
            {
              key: 'end_frame_url',
              type: 'string',
              format: 'uri',
              required: true,
              title: 'End Frame',
              description: 'End frame',
              mediaGroup: 'frames',
              mediaOrder: 3,
              mediaName: 'End',
            },
          ],
        },
      ],
    },
  ],
};

const nonBatchCapabilities: GenerationCapabilities = {
  image: [],
  video: [
    {
      model: 'Veo 3.1',
      modelKey: 'veo_3_1',
      provider: 'fal',
      mediaType: 'video',
      operations: [
        {
          operationKey: 'text_to_video',
          operationType: 'text_to_video',
          operationName: 'Text to Video',
          endpointId: 'fal-ai/veo3.1',
          required: ['prompt'],
          fields: [{ key: 'prompt', type: 'string', required: true, description: 'Prompt' }],
        },
      ],
    },
  ],
};

const renderControlBar = (
  generationCapabilities: GenerationCapabilities,
  onGenerate = () => undefined,
) =>
  render(
    <GenerationControlBar
      onGenerate={onGenerate}
      isGenerating={false}
      projectId="project-1"
      generationCapabilities={generationCapabilities}
      isCapabilitiesLoading={false}
      collections={[baseCollection]}
      selectedCollectionId="collection-1"
      selectedCollectionItems={[readyItem]}
      selectedCollectionChildCollections={[]}
      loadCollectionContentsForPicker={async () => null}
    />,
  );

describe('GenerationControlBar', () => {
  it('renders URI-array media fields at the top, dedupes dropped URLs, and submits them in inputs', () => {
    const callLog: Array<Record<string, unknown>> = [];

    renderControlBar(arrayCapabilities, (params) => callLog.push(params));

    const promptInput = screen.getByPlaceholderText('Prompt');
    const addButton = screen.getByRole('button', { name: 'Add Reference Images' });
    const modelSelect = screen.getByLabelText('Model');
    expect(screen.getByText('Aspect Ratio')).toBeTruthy();
    expect(screen.getByText('Num Images')).toBeTruthy();
    expect(screen.queryByText('Seed')).toBeNull();
    expect(addButton).toBeTruthy();
    expect(
      modelSelect.compareDocumentPosition(addButton) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

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

    expect(screen.getByAltText('Reference Images 1')).toBeTruthy();
    expect(screen.getByAltText('Reference Images 2')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Add Reference Images' })).toBeTruthy();

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
        num_images: 1,
      },
      outputCount: 1,
    });

    expect((promptInput as HTMLTextAreaElement).value).toBe('');
    expect(screen.queryByAltText('Reference Images 1')).toBeNull();
  });

  it('opens the picker modal and selects references from collections', async () => {
    renderControlBar(arrayCapabilities);

    fireEvent.click(screen.getByRole('button', { name: 'Add Reference Images' }));
    expect(screen.getByRole('dialog', { name: 'Reference picker' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Open collection Collection One' }));
    fireEvent.click(screen.getByRole('button', { name: 'Use Reference as reference' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Reference picker' })).toBeNull();
    });

    expect(screen.getByAltText('Reference Images 1')).toBeTruthy();
  });

  it('requires explicit field targeting when multiple URI media fields exist', () => {
    renderControlBar(pairedFrameCapabilities);

    fireEvent.click(screen.getByRole('button', { name: 'Video' }));
    expect(screen.getByRole('button', { name: 'Add Start Frame' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Add End Frame' })).toBeTruthy();
    expect(screen.getByText('↔')).toBeTruthy();

    const promptInput = screen.getByPlaceholderText('Prompt');
    fireEvent.drop(promptInput, {
      dataTransfer: {
        getData(type: string) {
          if (type === 'application/x-ai-video-gen-item-url') {
            return 'https://assets.example.com/frame-a.png';
          }

          return '';
        },
      },
    });

    expect(screen.queryByAltText('Start Frame')).toBeNull();
    expect(screen.queryByAltText('End Frame')).toBeNull();

    fireEvent.drop(screen.getByTestId('compact-media-target-first_frame_url'), {
      dataTransfer: {
        getData(type: string) {
          if (type === 'application/x-ai-video-gen-item-url') {
            return 'https://assets.example.com/frame-a.png';
          }

          return '';
        },
      },
    });

    fireEvent.drop(screen.getByTestId('compact-media-target-last_frame_url'), {
      dataTransfer: {
        getData(type: string) {
          if (type === 'application/x-ai-video-gen-item-url') {
            return 'https://assets.example.com/frame-b.png';
          }

          return '';
        },
      },
    });

    expect(screen.getByAltText('Start Frame')).toBeTruthy();
    expect(screen.getByAltText('End Frame')).toBeTruthy();
  });

  it('renders declarative media sequences without field-name special casing', () => {
    renderControlBar(declarativeSequenceCapabilities);

    fireEvent.click(screen.getByRole('button', { name: 'Video' }));

    expect(screen.getByRole('button', { name: 'Add Start Frame' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Add Middle Frame' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Add End Frame' })).toBeTruthy();
    expect(screen.getByText('Start')).toBeTruthy();
    expect(screen.getByText('Mid')).toBeTruthy();
    expect(screen.getByText('End')).toBeTruthy();
  });

  it('uses mediaName labels in drag-only declarative media sequences', async () => {
    renderControlBar(declarativeSequenceCapabilities);

    fireEvent.click(screen.getByRole('button', { name: 'Video' }));

    await act(async () => {
      document.body.classList.add('is-dragging-ingredient');
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Add Start' })).toBeTruthy();
    });

    expect(screen.getByRole('button', { name: 'Add Mid' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Add End' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Add Start Frame' })).toBeNull();

    await act(async () => {
      document.body.classList.remove('is-dragging-ingredient');
      await Promise.resolve();
    });
  });

  it('shows only drag targets while an ingredient drag is active', async () => {
    renderControlBar(pairedFrameCapabilities);

    fireEvent.click(screen.getByRole('button', { name: 'Video' }));
    await act(async () => {
      document.body.classList.add('is-dragging-ingredient');
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(screen.getByTestId('media-target-first_frame_url')).toBeTruthy();
    });

    expect(screen.queryByTestId('compact-media-target-first_frame_url')).toBeNull();
    expect(screen.queryByPlaceholderText('Prompt')).toBeNull();
    expect(screen.queryByLabelText('Model')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Show advanced settings' })).toBeNull();

    await act(async () => {
      document.body.classList.remove('is-dragging-ingredient');
      await Promise.resolve();
    });
  });

  it('uses the dedicated drag target for a single URI field', async () => {
    renderControlBar(arrayCapabilities);

    await act(async () => {
      document.body.classList.add('is-dragging-ingredient');
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(screen.getByTestId('media-target-image_urls')).toBeTruthy();
    });

    expect(screen.queryByTestId('compact-media-target-image_urls')).toBeNull();
    expect(screen.getByRole('button', { name: 'Add Reference Images' })).toBeTruthy();

    await act(async () => {
      document.body.classList.remove('is-dragging-ingredient');
      await Promise.resolve();
    });
  });

  it('does not render a separate output count control', () => {
    renderControlBar(nonBatchCapabilities);

    fireEvent.click(screen.getByRole('button', { name: 'Video' }));

    expect(screen.queryByLabelText('Output count')).toBeNull();
  });

  it('reveals advanced fields on demand', () => {
    renderControlBar(arrayCapabilities);

    expect(screen.queryByText('Seed')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Show advanced settings' }));
    expect(screen.getByText('Seed')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Hide advanced settings' })).toBeTruthy();
  });
});
