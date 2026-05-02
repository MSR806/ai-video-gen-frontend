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
  };
};

describe('ShotsWorkspace', () => {
  it('renders collapsed shot rows with compact tags and toggles expanded details', async () => {
    const shotRepositoryState = buildShotRepository();

    render(
      <ShotsWorkspace
        projectId="project-1"
        screenplayRepository={buildScreenplayRepository()}
        shotRepository={shotRepositoryState.repository}
      />,
    );

    await screen.findByText('Shot Two');
    expect(screen.queryByText('Framing')).not.toBeInTheDocument();
    expect(screen.queryByText('Movement')).not.toBeInTheDocument();
    expect(screen.queryByText('Mood')).not.toBeInTheDocument();

    const firstShotRow = screen.getByText('Shot One').closest('article');
    expect(firstShotRow).not.toBeNull();

    const shotRow = screen.getByText('Shot Two').closest('article');
    expect(shotRow).not.toBeNull();

    expect(within(shotRow as HTMLElement).getByText('Medium')).toBeInTheDocument();
    expect(within(shotRow as HTMLElement).getByText('Push-in')).toBeInTheDocument();
    expect(within(shotRow as HTMLElement).getByText('Tense')).toBeInTheDocument();
    expect(within(shotRow as HTMLElement).queryByText('Framing')).not.toBeInTheDocument();
    expect(within(shotRow as HTMLElement).queryByText('Movement')).not.toBeInTheDocument();
    expect(within(shotRow as HTMLElement).queryByText('Mood')).not.toBeInTheDocument();

    const expandButton = within(shotRow as HTMLElement).getByRole('button', {
      name: 'Show details for Shot Two',
    });
    expect(expandButton).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(within(shotRow as HTMLElement).getByText('Shot Two'));

    expect(expandButton).toHaveAttribute('aria-expanded', 'true');
    expect(within(shotRow as HTMLElement).getByText('Framing')).toBeInTheDocument();
    expect(within(shotRow as HTMLElement).getByText('Movement')).toBeInTheDocument();
    expect(within(shotRow as HTMLElement).getByText('Mood')).toBeInTheDocument();

    fireEvent.click(within(firstShotRow as HTMLElement).getByText('Shot One'));

    expect(
      within(firstShotRow as HTMLElement).getByRole('button', {
        name: 'Hide details for Shot One',
      }),
    ).toHaveAttribute('aria-expanded', 'true');
    expect(
      within(shotRow as HTMLElement).getByRole('button', {
        name: 'Show details for Shot Two',
      }),
    ).toHaveAttribute('aria-expanded', 'false');
    expect(within(shotRow as HTMLElement).queryByText('Framing')).not.toBeInTheDocument();

    fireEvent.click(within(firstShotRow as HTMLElement).getByText('Shot One'));

    expect(
      within(firstShotRow as HTMLElement).getByRole('button', {
        name: 'Show details for Shot One',
      }),
    ).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(within(shotRow as HTMLElement).getByText('Shot Two'));

    const collapseButton = within(shotRow as HTMLElement).getByRole('button', {
      name: 'Hide details for Shot Two',
    });
    fireEvent.click(collapseButton);

    expect(collapseButton).toHaveAttribute('aria-expanded', 'false');
    expect(within(shotRow as HTMLElement).queryByText('Framing')).not.toBeInTheDocument();
    expect(within(shotRow as HTMLElement).queryByText('Movement')).not.toBeInTheDocument();
    expect(within(shotRow as HTMLElement).queryByText('Mood')).not.toBeInTheDocument();
  });

  it('shows scene shot counts and toggles visible scene shots', async () => {
    const shotRepositoryState = buildShotRepository();

    render(
      <ShotsWorkspace
        projectId="project-1"
        screenplayRepository={buildScreenplayRepository()}
        shotRepository={shotRepositoryState.repository}
      />,
    );

    const sceneSelector = await screen.findByRole('combobox', { name: 'Select scene' });
    expect(screen.getByRole('option', { name: 'Scene 1 (2 shots)' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Scene 2 (1 shots)' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Scene 3 (0 shots)' })).toBeInTheDocument();

    expect(screen.getByText('Shot One')).toBeInTheDocument();
    expect(screen.queryByText('Shot Three')).not.toBeInTheDocument();

    fireEvent.change(sceneSelector, { target: { value: 'scene-2' } });
    expect(await screen.findByText('Shot Three')).toBeInTheDocument();
    expect(screen.queryByText('Shot One')).not.toBeInTheDocument();
  });

  it('supports add, edit, and delete in selected scene', async () => {
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
    expect(screen.getByRole('option', { name: 'Scene 1 (3 shots)' })).toBeInTheDocument();

    const createdCard = screen.getByText('Shot Four').closest('article');
    expect(createdCard).not.toBeNull();
    fireEvent.click(
      within(createdCard as HTMLElement).getByRole('button', {
        name: 'Open actions for Shot Four',
      }),
    );
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Edit' }));
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Shot Four Updated' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save shot' }));
    expect(await screen.findByText('Shot Four Updated')).toBeInTheDocument();

    const editedCard = screen.getByText('Shot Four Updated').closest('article');
    expect(editedCard).not.toBeNull();
    fireEvent.click(
      within(editedCard as HTMLElement).getByRole('button', {
        name: 'Open actions for Shot Four Updated',
      }),
    );
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Delete' }));
    await waitFor(() => expect(screen.queryByText('Shot Four Updated')).not.toBeInTheDocument());
    expect(screen.getByRole('option', { name: 'Scene 1 (2 shots)' })).toBeInTheDocument();
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

      const sceneSelector = await screen.findByRole('combobox', { name: 'Select scene' });

      fireEvent.change(sceneSelector, { target: { value: 'scene-3' } });
      fireEvent.click(screen.getByRole('button', { name: 'Generate shots' }));

      expect(await screen.findByText('Generated Establishing')).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Scene 3 (2 shots)' })).toBeInTheDocument();
      expect(confirmCalls).toEqual([]);

      fireEvent.change(sceneSelector, { target: { value: 'scene-1' } });
      fireEvent.click(screen.getByRole('button', { name: 'Regenerate shots' }));

      await waitFor(() => expect(screen.queryByText('Shot One')).not.toBeInTheDocument());
      expect(await screen.findByText('Generated Follow Up')).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Scene 1 (2 shots)' })).toBeInTheDocument();
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
