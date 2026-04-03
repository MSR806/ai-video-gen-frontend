import { describe, expect, it } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { ProjectOverviewPage } from './ProjectOverviewPage';

describe('ProjectOverviewPage', () => {
  it('renders back action linking to projects list', () => {
    render(
      <ProjectOverviewPage
        project={{
          id: 'project-1',
          name: 'Launch Campaign',
          description: 'Plan launch assets and shots',
          status: 'draft',
          createdAt: new Date('2025-01-01T00:00:00.000Z'),
          updatedAt: new Date('2025-01-02T00:00:00.000Z'),
        }}
      />,
    );

    expect(screen.getByRole('link', { name: 'Back to projects' })).toHaveAttribute('href', '/');
  });
});
