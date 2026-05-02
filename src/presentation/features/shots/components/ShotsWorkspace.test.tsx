import { describe, expect, it } from 'bun:test';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { Screenplay, ScreenplayRepository } from '@core/screenplay';
import type {
  Shot,
  ShotCreatePayload,
  ShotReorderPayload,
  ShotRepository,
  ShotUpdatePayload,
} from '@core/shot';
import { ShotsWorkspace } from './ShotsWorkspace';

const buildScreenplayRepository = (): ScreenplayRepository => ({
  async getByProjectId(): Promise<Screenplay> {
    return {
      id: 'screenplay-1',
      projectId: 'project-1',
      title: 'Test Screenplay',
      scenes: [
        {
          id: 'scene-1',
          name: 'Scene 1',
          sceneNumber: 1,
          content: '<scene><action>One</action></scene>',
        },
        {
          id: 'scene-2',
          name: 'Scene 2',
          sceneNumber: 2,
          content: '<scene><action>Two</action></scene>',
        },
        {
          id: 'scene-3',
          name: 'Scene 3',
          sceneNumber: 3,
          content: '<scene><action>Three</action></scene>',
        },
      ],
    };
  },
  async create(): Promise<Screenplay> {
    throw new Error('Not implemented in test');
  },
  async update(): Promise<Screenplay> {
    throw new Error('Not implemented in test');
  },
  async addScene(): Promise<Screenplay> {
    throw new Error('Not implemented in test');
  },
  async updateScene(): Promise<Screenplay['scenes'][number]> {
    throw new Error('Not implemented in test');
  },
  async deleteScene(): Promise<Screenplay> {
    throw new Error('Not implemented in test');
  },
  async reorderScenes(): Promise<Screenplay> {
    throw new Error('Not implemented in test');
  },
});

const buildShotRepository = () => {
  const shotMap = new Map<string, Shot[]>([
    [
      'scene-1',
      [
        {
          id: 'shot-1',
          sceneId: 'scene-1',
          orderIndex: 1,
          title: 'Shot One',
          description: 'A wide setup',
          cameraFraming: 'Wide',
          cameraMovement: 'Static',
          mood: 'Calm',
        },
        {
          id: 'shot-2',
          sceneId: 'scene-1',
          orderIndex: 2,
          title: 'Shot Two',
          description: 'A push in',
          cameraFraming: 'Medium',
          cameraMovement: 'Dolly in',
          mood: 'Tense',
        },
      ],
    ],
    [
      'scene-2',
      [
        {
          id: 'shot-3',
          sceneId: 'scene-2',
          orderIndex: 1,
          title: 'Shot Three',
          description: 'Reaction cutaway',
          cameraFraming: 'Close-up',
          cameraMovement: 'Static',
          mood: 'Concerned',
        },
      ],
    ],
  ]);

  let createdCount = 0;
  let generatedCount = 0;
  let lastReorderPayload: ShotReorderPayload | null = null;

  const repository: ShotRepository = {
    async getBySceneId(_projectId: string, sceneId: string): Promise<Shot[]> {
      return [...(shotMap.get(sceneId) ?? [])];
    },
    async create(projectId: string, sceneId: string, payload: ShotCreatePayload): Promise<Shot> {
      void projectId;
      createdCount += 1;
      const nextShot: Shot = {
        id: `shot-created-${createdCount}`,
        sceneId,
        orderIndex: (shotMap.get(sceneId)?.length ?? 0) + 1,
        ...payload,
      };

      shotMap.set(sceneId, [...(shotMap.get(sceneId) ?? []), nextShot]);
      return nextShot;
    },
    async update(
      projectId: string,
      sceneId: string,
      shotId: string,
      payload: ShotUpdatePayload,
    ): Promise<Shot> {
      void projectId;
      const current = shotMap.get(sceneId) ?? [];
      const updated = current.map((shot) => (shot.id === shotId ? { ...shot, ...payload } : shot));
      shotMap.set(sceneId, updated);

      const result = updated.find((shot) => shot.id === shotId);
      if (!result) {
        throw new Error('Shot not found in test repository');
      }

      return result;
    },
    async delete(projectId: string, sceneId: string, shotId: string): Promise<void> {
      void projectId;
      shotMap.set(
        sceneId,
        (shotMap.get(sceneId) ?? []).filter((shot) => shot.id !== shotId),
      );
    },
    async reorder(projectId: string, sceneId: string, payload: ShotReorderPayload): Promise<void> {
      void projectId;
      lastReorderPayload = payload;
      const ordered = payload.shotIds
        .map((shotId) => (shotMap.get(sceneId) ?? []).find((shot) => shot.id === shotId))
        .filter((shot): shot is Shot => Boolean(shot))
        .map((shot, index) => ({ ...shot, orderIndex: index + 1 }));

      shotMap.set(sceneId, ordered);
    },
    async generate(projectId: string, sceneId: string): Promise<Shot[]> {
      void projectId;
      generatedCount += 1;
      const generatedShots: Shot[] = [
        {
          id: `shot-generated-${generatedCount}-2`,
          sceneId,
          orderIndex: 2,
          title: 'Generated Follow Up',
          description: 'A second generated perspective.',
          cameraFraming: 'Medium',
          cameraMovement: 'Push in',
          mood: 'Rising',
        },
        {
          id: `shot-generated-${generatedCount}-1`,
          sceneId,
          orderIndex: 1,
          title: 'Generated Establishing',
          description: 'A generated opening beat.',
          cameraFraming: 'Wide',
          cameraMovement: 'Static',
          mood: 'Focused',
        },
      ];

      shotMap.set(sceneId, generatedShots);
      return generatedShots;
    },
  };

  return {
    repository,
    getLastReorderShotIds: (): string[] | null => lastReorderPayload?.shotIds ?? null,
  };
};

describe('ShotsWorkspace', () => {
  it('shows scene shot counts and toggles visible scene shots', async () => {
    const shotRepositoryState = buildShotRepository();

    render(
      <ShotsWorkspace
        projectId="project-1"
        screenplayRepository={buildScreenplayRepository()}
        shotRepository={shotRepositoryState.repository}
      />,
    );

    expect(await screen.findByRole('button', { name: 'Scene 1 2 shots' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Scene 2 1 shots' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Scene 3 0 shots' })).toBeInTheDocument();

    expect(screen.getByText('Shot One')).toBeInTheDocument();
    expect(screen.queryByText('Shot Three')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Scene 2 1 shots' }));
    expect(await screen.findByText('Shot Three')).toBeInTheDocument();
    expect(screen.queryByText('Shot One')).not.toBeInTheDocument();
  });

  it('supports add, edit, delete, and reorder in selected scene', async () => {
    const shotRepositoryState = buildShotRepository();

    render(
      <ShotsWorkspace
        projectId="project-1"
        screenplayRepository={buildScreenplayRepository()}
        shotRepository={shotRepositoryState.repository}
      />,
    );

    await screen.findByText('Shot One');

    fireEvent.click(screen.getByRole('button', { name: 'Add shot' }));
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Shot Four' } });
    fireEvent.change(screen.getByLabelText('Description'), {
      target: { value: 'Cut to the hallway' },
    });
    fireEvent.change(screen.getByLabelText('Camera framing'), { target: { value: 'Wide' } });
    fireEvent.change(screen.getByLabelText('Camera movement'), { target: { value: 'Pan' } });
    fireEvent.change(screen.getByLabelText('Mood'), { target: { value: 'Suspenseful' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create shot' }));

    expect(await screen.findByText('Shot Four')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Scene 1 3 shots' })).toBeInTheDocument();

    const createdCard = screen.getByText('Shot Four').closest('article');
    expect(createdCard).not.toBeNull();
    fireEvent.click(within(createdCard as HTMLElement).getByRole('button', { name: 'Edit' }));
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Shot Four Updated' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save shot' }));
    expect(await screen.findByText('Shot Four Updated')).toBeInTheDocument();

    const editedCard = screen.getByText('Shot Four Updated').closest('article');
    expect(editedCard).not.toBeNull();
    fireEvent.click(within(editedCard as HTMLElement).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(screen.queryByText('Shot Four Updated')).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Scene 1 2 shots' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Move Shot Two up' }));
    await waitFor(() =>
      expect(shotRepositoryState.getLastReorderShotIds()).toEqual(['shot-2', 'shot-1']),
    );
  });

  it('generates shots for empty scenes and regenerates existing shots after confirmation', async () => {
    const shotRepositoryState = buildShotRepository();
    const originalConfirm = window.confirm;
    const confirmCalls: string[] = [];

    window.confirm = (message?: string) => {
      confirmCalls.push(message ?? '');
      return true;
    };

    try {
      render(
        <ShotsWorkspace
          projectId="project-1"
          screenplayRepository={buildScreenplayRepository()}
          shotRepository={shotRepositoryState.repository}
        />,
      );

      await screen.findByRole('button', { name: 'Scene 3 0 shots' });

      fireEvent.click(screen.getByRole('button', { name: 'Scene 3 0 shots' }));
      fireEvent.click(screen.getByRole('button', { name: 'Generate shots' }));

      expect(await screen.findByText('Generated Establishing')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Scene 3 2 shots' })).toBeInTheDocument();
      expect(confirmCalls).toEqual([]);

      fireEvent.click(screen.getByRole('button', { name: 'Scene 1 2 shots' }));
      fireEvent.click(screen.getByRole('button', { name: 'Regenerate shots' }));

      await waitFor(() => expect(screen.queryByText('Shot One')).not.toBeInTheDocument());
      expect(await screen.findByText('Generated Follow Up')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Scene 1 2 shots' })).toBeInTheDocument();
      expect(confirmCalls).toHaveLength(1);
    } finally {
      window.confirm = originalConfirm;
    }
  });

  it('does not regenerate shots when confirmation is cancelled', async () => {
    const shotRepositoryState = buildShotRepository();
    const originalConfirm = window.confirm;
    window.confirm = () => false;

    try {
      render(
        <ShotsWorkspace
          projectId="project-1"
          screenplayRepository={buildScreenplayRepository()}
          shotRepository={shotRepositoryState.repository}
        />,
      );

      expect(await screen.findByText('Shot One')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Regenerate shots' }));

      expect(screen.getByText('Shot One')).toBeInTheDocument();
      expect(screen.getByText('Shot Two')).toBeInTheDocument();
    } finally {
      window.confirm = originalConfirm;
    }
  });
});
