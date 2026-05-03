import { describe, expect, it, mock } from 'bun:test';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ProjectOverviewPage } from './ProjectOverviewPage';

const ProjectOverviewPageContract = ProjectOverviewPage as unknown as (
  props: Record<string, unknown>,
) => JSX.Element;

describe('ProjectOverviewPage', () => {
  it('renders back action linking to projects list', () => {
    render(
      <ProjectOverviewPageContract
        project={
          {
            id: 'project-1',
            name: 'Launch Campaign',
            description: 'Plan launch assets and shots',
            status: 'draft',
            style: 'cinematic realism',
            aspectRatio: '16:9',
            createdAt: new Date('2025-01-01T00:00:00.000Z'),
            updatedAt: new Date('2025-01-02T00:00:00.000Z'),
          } as never
        }
      />,
    );

    expect(screen.getByRole('link', { name: 'Back to projects' })).toHaveAttribute('href', '/');
  });

  it('displays editable style and aspect ratio settings with defaults', () => {
    render(
      <ProjectOverviewPageContract
        project={
          {
            id: 'project-1',
            name: 'Launch Campaign',
            description: 'Plan launch assets and shots',
            status: 'draft',
            style: '',
            aspectRatio: undefined,
            createdAt: new Date('2025-01-01T00:00:00.000Z'),
            updatedAt: new Date('2025-01-02T00:00:00.000Z'),
          } as never
        }
      />,
    );

    const styleTextarea = screen.getByRole('textbox', { name: 'Style' });
    expect(styleTextarea).toBeInTheDocument();

    const aspectRatioSelect = screen.getByRole('combobox', { name: 'Aspect ratio' });
    expect(aspectRatioSelect).toBeInTheDocument();
    expect(aspectRatioSelect).toHaveValue('16:9');
  });

  it('awaits save update and shows saving then success feedback', async () => {
    let resolveUpdate: (() => void) | null = null;
    const updateProject = mock(
      () =>
        new Promise<void>((resolve) => {
          resolveUpdate = resolve;
        }),
    );

    render(
      <ProjectOverviewPageContract
        project={
          {
            id: 'project-1',
            name: 'Launch Campaign',
            description: 'Plan launch assets and shots',
            status: 'draft',
            style: 'natural light',
            aspectRatio: '4:3',
            createdAt: new Date('2025-01-01T00:00:00.000Z'),
            updatedAt: new Date('2025-01-02T00:00:00.000Z'),
          } as never
        }
        onUpdateProject={updateProject}
      />,
    );

    fireEvent.change(screen.getByRole('textbox', { name: 'Style' }), {
      target: { value: 'anime inked storyboard' },
    });
    fireEvent.change(screen.getByRole('combobox', { name: 'Aspect ratio' }), {
      target: { value: '9:16' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save settings' }));

    const savingButton = screen.getByRole('button', { name: 'Saving...' });
    expect(savingButton).toBeDisabled();

    expect(updateProject).toHaveBeenCalledWith('project-1', {
      style: 'anime inked storyboard',
      aspectRatio: '9:16',
    });

    resolveUpdate?.();

    expect(await screen.findByRole('status')).toHaveTextContent('Settings saved.');
    expect(screen.getByRole('button', { name: 'Save settings' })).not.toBeDisabled();
  });

  it('shows error feedback and re-enables save when update fails', async () => {
    const updateProject = mock(async () => {
      throw new Error('save failed');
    });

    render(
      <ProjectOverviewPageContract
        project={
          {
            id: 'project-1',
            name: 'Launch Campaign',
            description: 'Plan launch assets and shots',
            status: 'draft',
            style: 'natural light',
            aspectRatio: '4:3',
            createdAt: new Date('2025-01-01T00:00:00.000Z'),
            updatedAt: new Date('2025-01-02T00:00:00.000Z'),
          } as never
        }
        onUpdateProject={updateProject}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Save settings' }));

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('Failed to save settings.');
    });
    expect(screen.getByRole('button', { name: 'Save settings' })).not.toBeDisabled();
  });
});
