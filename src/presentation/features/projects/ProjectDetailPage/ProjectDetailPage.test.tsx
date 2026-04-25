import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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

const CHAT_COLLAPSE_BREAKPOINT_QUERY = '(max-width: 1024px)';
const ScreenplayWorkspaceStub = ({ projectId }: { projectId: string }) => (
  <div data-testid="screenplay-workspace-stub">Screenplay workspace for {projectId}</div>
);

const ScreenplayAssistantPanelStub = () => (
  <aside aria-label="Screenplay assistant">
    <input aria-label="Screenplay assistant message" />
    <button type="button">Send message</button>
    <p>Loading screenplay context… you can start typing now, and early sends will wait.</p>
  </aside>
);

type MatchMediaChangeListener = (event: MediaQueryListEvent) => void;

const createMatchMediaController = (initialMatches: boolean) => {
  let matches = initialMatches;
  const listeners = new Set<MatchMediaChangeListener>();

  const matchMediaMock = mock((query: string) => {
    const mediaQueryList = {
      media: query,
      get matches() {
        return matches;
      },
      onchange: null,
      addEventListener: (eventName: string, listener: EventListenerOrEventListenerObject) => {
        if (eventName !== 'change') {
          return;
        }

        if (typeof listener === 'function') {
          listeners.add(listener as MatchMediaChangeListener);
          return;
        }

        listeners.add((event) => listener.handleEvent(event));
      },
      removeEventListener: (eventName: string, listener: EventListenerOrEventListenerObject) => {
        if (eventName !== 'change') {
          return;
        }

        if (typeof listener === 'function') {
          listeners.delete(listener as MatchMediaChangeListener);
          return;
        }

        listeners.forEach((registeredListener) => {
          if (registeredListener === listener.handleEvent) {
            listeners.delete(registeredListener);
          }
        });
      },
      addListener: (listener: MatchMediaChangeListener) => {
        listeners.add(listener);
      },
      removeListener: (listener: MatchMediaChangeListener) => {
        listeners.delete(listener);
      },
      dispatchEvent: () => true,
    } satisfies MediaQueryList;

    return mediaQueryList;
  });

  const dispatchChange = (nextMatches: boolean) => {
    matches = nextMatches;
    const event = {
      matches: nextMatches,
      media: CHAT_COLLAPSE_BREAKPOINT_QUERY,
    } as MediaQueryListEvent;

    listeners.forEach((listener) => listener(event));
  };

  return {
    matchMedia: matchMediaMock,
    dispatchChange,
  };
};

const originalMatchMedia = window.matchMedia;

mock.module('next/navigation', () => ({
  useRouter: () => ({ push: pushSpy }),
}));

mock.module('@infra/repositories', () => {
  return {
    ScreenplayRepositoryImpl: class {
      async getByProjectId() {
        return {
          id: 'screenplay-1',
          projectId: 'project-1',
          title: 'Untitled',
          scenes: [
            {
              id: 'scene-1',
              name: 'Scene 1',
              sceneNumber: 1,
              content: '<scene><action>Intro</action></scene>',
            },
          ],
        };
      }
    },
    ShotRepositoryImpl: class {
      async getBySceneId() {
        return [
          {
            id: 'shot-1',
            sceneId: 'scene-1',
            orderIndex: 1,
            title: 'Opening shot',
            description: 'Establishing frame',
            cameraFraming: 'Wide',
            cameraMovement: 'Static',
            mood: 'Neutral',
          },
        ];
      }

      async create(_projectId: string, sceneId: string, payload: Record<string, string>) {
        return {
          id: 'shot-created',
          sceneId,
          orderIndex: 2,
          ...payload,
        };
      }

      async update(
        _projectId: string,
        sceneId: string,
        shotId: string,
        payload: Record<string, string>,
      ) {
        return {
          id: shotId,
          sceneId,
          orderIndex: 1,
          ...payload,
        };
      }

      async delete() {}

      async reorder() {}
    },
    ChatRepositoryImpl: class {
      async send() {
        return { threadId: 'thread-1', message: { role: 'assistant', text: 'ok' } };
      }
    },
    CollectionRepositoryImpl: class {
      async create() {
        return selectedCollection;
      }

      async getByProjectId() {
        return [selectedCollection];
      }

      async getById() {
        return selectedCollection;
      }

      async update() {
        return selectedCollection;
      }

      async delete() {}
    },
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
  };
});

describe('ProjectDetailPage', () => {
  let matchMediaController: ReturnType<typeof createMatchMediaController>;

  beforeEach(() => {
    pushSpy.mockClear();
    uploadSpy.mockClear();

    matchMediaController = createMatchMediaController(false);
    window.matchMedia = matchMediaController.matchMedia as typeof window.matchMedia;
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it('defaults to collapsed chat when the initial viewport is mobile', async () => {
    matchMediaController = createMatchMediaController(true);
    window.matchMedia = matchMediaController.matchMedia as typeof window.matchMedia;

    const { ProjectDetailPage } = await import('./ProjectDetailPage');

    render(
      <ProjectDetailPage
        projectId="project-1"
        activeTab="collections"
        selectedCollectionId="collection-1"
        collections={[selectedCollection]}
        collectionItems={[selectedCollectionItem]}
        selectedCollectionChildCollections={[]}
        screenplayWorkspaceComponent={ScreenplayWorkspaceStub}
        screenplayAssistantPanelComponent={ScreenplayAssistantPanelStub}
        viewportOffsetPx={0}
      />,
    );

    expect(await screen.findByRole('button', { name: 'Expand chat sidebar' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(matchMediaController.matchMedia).toHaveBeenCalledWith(CHAT_COLLAPSE_BREAKPOINT_QUERY);
  });

  it('updates chat collapsed state when viewport crosses the breakpoint', async () => {
    const { ProjectDetailPage } = await import('./ProjectDetailPage');

    render(
      <ProjectDetailPage
        projectId="project-1"
        activeTab="collections"
        selectedCollectionId="collection-1"
        collections={[selectedCollection]}
        collectionItems={[selectedCollectionItem]}
        selectedCollectionChildCollections={[]}
        screenplayWorkspaceComponent={ScreenplayWorkspaceStub}
        screenplayAssistantPanelComponent={ScreenplayAssistantPanelStub}
        viewportOffsetPx={0}
      />,
    );

    expect(
      await screen.findByRole('button', { name: 'Collapse chat sidebar' }),
    ).toBeInTheDocument();

    act(() => {
      matchMediaController.dispatchChange(true);
    });
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Expand chat sidebar' })).toHaveAttribute(
        'aria-expanded',
        'false',
      ),
    );

    act(() => {
      matchMediaController.dispatchChange(false);
    });
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Collapse chat sidebar' })).toBeInTheDocument(),
    );
  });

  it('renders the generation input widget inside the right sidebar for selected collections', async () => {
    const { ProjectDetailPage } = await import('./ProjectDetailPage');

    render(
      <ProjectDetailPage
        projectId="project-1"
        activeTab="collections"
        selectedCollectionId="collection-1"
        collections={[selectedCollection]}
        collectionItems={[selectedCollectionItem]}
        selectedCollectionChildCollections={[]}
        screenplayWorkspaceComponent={ScreenplayWorkspaceStub}
        screenplayAssistantPanelComponent={ScreenplayAssistantPanelStub}
        viewportOffsetPx={0}
      />,
    );

    const sidebar = await screen.findByLabelText('Generation controls');
    const promptInput = await within(sidebar).findByRole('textbox');

    expect(promptInput.closest('aside')).toBe(sidebar);
    expect(screen.getAllByRole('textbox').length).toBeGreaterThanOrEqual(1);
  });

  it('opens pasted image confirmation and saves on Enter', async () => {
    const { ProjectDetailPage } = await import('./ProjectDetailPage');

    render(
      <ProjectDetailPage
        projectId="project-1"
        activeTab="collections"
        selectedCollectionId="collection-1"
        collections={[selectedCollection]}
        collectionItems={[selectedCollectionItem]}
        selectedCollectionChildCollections={[]}
        screenplayWorkspaceComponent={ScreenplayWorkspaceStub}
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
        collectionItems={[selectedCollectionItem]}
        selectedCollectionChildCollections={[]}
        screenplayWorkspaceComponent={ScreenplayWorkspaceStub}
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

  it('hides tab navigation in collections view and supports back to project', async () => {
    const { ProjectDetailPage } = await import('./ProjectDetailPage');

    render(
      <ProjectDetailPage
        projectId="project-1"
        activeTab="collections"
        selectedCollectionId={null}
        collections={[selectedCollection]}
        collectionItems={[selectedCollectionItem]}
        selectedCollectionChildCollections={[]}
        screenplayWorkspaceComponent={ScreenplayWorkspaceStub}
        viewportOffsetPx={0}
      />,
    );

    expect(
      screen.queryByRole('navigation', { name: 'Project workspace tabs' }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Back to Project' }));
    expect(pushSpy).toHaveBeenCalledWith('/projects/project-1');
  });

  it('keeps back to project out of detail path bar and moves chat controls by state', async () => {
    const { ProjectDetailPage } = await import('./ProjectDetailPage');

    render(
      <ProjectDetailPage
        projectId="project-1"
        activeTab="collections"
        selectedCollectionId="collection-1"
        collections={[selectedCollection]}
        collectionItems={[selectedCollectionItem]}
        selectedCollectionChildCollections={[]}
        screenplayWorkspaceComponent={ScreenplayWorkspaceStub}
        viewportOffsetPx={0}
      />,
    );

    expect(screen.queryByRole('button', { name: 'Back to Project' })).not.toBeInTheDocument();

    const chatPanel = screen.getByLabelText('Chat assistant');
    const collapseButton = within(chatPanel).getByRole('button', {
      name: 'Collapse chat sidebar',
    });
    expect(collapseButton).toBeInTheDocument();

    fireEvent.click(collapseButton);

    const expandButton = await screen.findByRole('button', { name: 'Expand chat sidebar' });
    const backButton = screen.getByRole('button', { name: /^Back$/ });

    const pathBar = backButton.closest('div');
    expect(pathBar).not.toBeNull();
    expect(pathBar).toContainElement(expandButton);
    expect(pathBar).toContainElement(backButton);
    expect(expandButton.compareDocumentPosition(backButton)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it('renders screenplay assistant sidebar alongside screenplay workspace', async () => {
    const { ProjectDetailPage } = await import('./ProjectDetailPage');

    render(
      <ProjectDetailPage
        projectId="project-1"
        activeTab="screenplay"
        selectedCollectionId={null}
        collections={[selectedCollection]}
        collectionItems={[selectedCollectionItem]}
        selectedCollectionChildCollections={[]}
        screenplayWorkspaceComponent={ScreenplayWorkspaceStub}
        screenplayAssistantPanelComponent={ScreenplayAssistantPanelStub}
        viewportOffsetPx={0}
      />,
    );

    const assistantPanel = await screen.findByLabelText('Screenplay assistant');
    const assistantInput = within(assistantPanel).getByRole('textbox', {
      name: 'Screenplay assistant message',
    });
    const sendButton = within(assistantPanel).getByRole('button', { name: 'Send message' });

    expect(assistantInput).not.toBeDisabled();
    fireEvent.change(assistantInput, { target: { value: 'Help tighten dialogue' } });
    expect(assistantInput).toHaveValue('Help tighten dialogue');
    expect(sendButton).toBeInTheDocument();
    expect(screen.getByTestId('screenplay-workspace-stub')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Loading screenplay context… you can start typing now, and early sends will wait.',
      ),
    ).toBeInTheDocument();
  });

  it('renders manual shots workspace in shots tab', async () => {
    const { ProjectDetailPage } = await import('./ProjectDetailPage');

    render(
      <ProjectDetailPage
        projectId="project-1"
        activeTab="shots"
        selectedCollectionId={null}
        collections={[selectedCollection]}
        collectionItems={[selectedCollectionItem]}
        selectedCollectionChildCollections={[]}
        screenplayWorkspaceComponent={ScreenplayWorkspaceStub}
        viewportOffsetPx={0}
      />,
    );

    expect(await screen.findByRole('button', { name: 'Scene 1 1 shots' })).toBeInTheDocument();
    expect(screen.getByText('Opening shot')).toBeInTheDocument();
  });
});
