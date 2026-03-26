import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { Collection } from '@core/collection';
import type { CollectionItem, GenerationCapabilities } from '@core/collection-item';

const pushSpy = mock(() => undefined);
const uploadSpy = mock(async () => selectedCollectionItem);

const generationCapabilities: GenerationCapabilities = {
  image: [
    {
      model: 'Nano Banana',
      modelKey: 'nano_banana',
      provider: 'fal',
      mediaType: 'image',
      operations: [
        {
          operationKey: 'text_to_image',
          operationType: 'text_to_image',
          operationName: 'Text to Image',
          endpointId: 'fal-ai/nano-banana',
          required: ['prompt'],
          fields: [{ key: 'prompt', type: 'string', required: true, description: 'Prompt' }],
        },
      ],
    },
  ],
  video: [],
};

const selectedCollection: Collection = {
  id: 'collection-1',
  projectId: 'project-1',
  parentCollectionId: null,
  name: 'Main Collection',
  tag: 'main',
  description: 'Collection description',
};

const selectedCollectionItem: CollectionItem = {
  id: 'item-1',
  projectId: 'project-1',
  collectionId: 'collection-1',
  isFavorite: false,
  mediaType: 'image',
  status: 'READY',
  name: 'Reference 1',
  description: 'Reference media',
  url: 'https://assets.example.com/reference-1.png',
  metadata: {
    width: 1024,
    height: 1024,
    format: 'png',
    thumbnailUrl: '',
  },
  runId: null,
  generationRunOutputId: null,
  generationErrorMessage: null,
};

mock.module('next/navigation', () => ({
  useRouter: () => ({ push: pushSpy }),
}));

mock.module('@infra/repositories', () => ({
  CollectionRepositoryImpl: class {},
  SceneRepositoryImpl: class {},
  CollectionItemRepositoryImpl: class {
    async getContentsByCollectionId() {
      return {
        items: [selectedCollectionItem],
        childCollections: [],
      };
    }

    async getByCollectionId() {
      return [selectedCollectionItem];
    }

    async getById() {
      return selectedCollectionItem;
    }

    async create() {
      return selectedCollectionItem;
    }

    async setFavorite() {
      return selectedCollectionItem;
    }

    async delete() {}

    async upload(payload: unknown) {
      return uploadSpy(payload);
    }

    async getGenerationCapabilities() {
      return generationCapabilities;
    }

    async generateWithAI() {
      return { runId: 'run-1', outputs: [] };
    }

    async getGenerationRun() {
      return { id: 'run-1', status: 'IN_PROGRESS', outputs: [] };
    }
  },
}));

describe('ProjectDetailPage', () => {
  beforeEach(() => {
    pushSpy.mockClear();
    uploadSpy.mockClear();
  });

  it('renders the generation input widget inside the right sidebar for selected collections', async () => {
    const { ProjectDetailPage } = await import('./ProjectDetailPage');

    render(
      <ProjectDetailPage
        projectId="project-1"
        activeTab="collections"
        selectedCollectionId="collection-1"
        collections={[selectedCollection]}
        scenes={[]}
        collectionItems={[selectedCollectionItem]}
        selectedCollectionChildCollections={[]}
        viewportOffsetPx={0}
      />,
    );

    const sidebar = await screen.findByLabelText('Generation controls');
    const promptInput = await within(sidebar).findByRole('textbox');

    expect(promptInput.closest('aside')).toBe(sidebar);
    expect(screen.getAllByRole('textbox')).toHaveLength(1);
  });

  it('opens pasted image confirmation and saves on Enter', async () => {
    const { ProjectDetailPage } = await import('./ProjectDetailPage');

    render(
      <ProjectDetailPage
        projectId="project-1"
        activeTab="collections"
        selectedCollectionId="collection-1"
        collections={[selectedCollection]}
        scenes={[]}
        collectionItems={[selectedCollectionItem]}
        selectedCollectionChildCollections={[]}
        viewportOffsetPx={0}
      />,
    );

    const pastedFile = new File(['image-bytes'], 'clipboard-image.png');
    fireEvent.paste(document, {
      clipboardData: {
        items: [
          {
            kind: 'file',
            type: 'image/png',
            getAsFile: () => pastedFile,
          },
        ],
        files: [pastedFile],
      } as unknown as DataTransfer,
    });

    expect(
      await screen.findByRole('heading', { name: 'Paste Image to Collection' }),
    ).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Enter', code: 'Enter', keyCode: 13, which: 13 });

    await waitFor(() => expect(uploadSpy).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(
        screen.queryByRole('heading', { name: 'Paste Image to Collection' }),
      ).not.toBeInTheDocument(),
    );
  });

  it('does not support paste upload on root collections view', async () => {
    const { ProjectDetailPage } = await import('./ProjectDetailPage');

    render(
      <ProjectDetailPage
        projectId="project-1"
        activeTab="collections"
        selectedCollectionId={null}
        collections={[selectedCollection]}
        scenes={[]}
        collectionItems={[selectedCollectionItem]}
        selectedCollectionChildCollections={[]}
        viewportOffsetPx={0}
      />,
    );

    const pastedFile = new File(['image-bytes'], 'clipboard-image.png');
    fireEvent.paste(document, {
      clipboardData: {
        items: [
          {
            kind: 'file',
            type: 'image/png',
            getAsFile: () => pastedFile,
          },
        ],
        files: [pastedFile],
      } as unknown as DataTransfer,
    });

    expect(
      screen.queryByRole('heading', { name: 'Paste Image to Collection' }),
    ).not.toBeInTheDocument();
    expect(uploadSpy).not.toHaveBeenCalled();
  });
});
