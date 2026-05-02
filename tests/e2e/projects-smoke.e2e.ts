import { test, expect } from '@playwright/test';
import {
  createDefaultMockFixture,
  startMockBackendServer,
  type MockProjectDto,
} from './support/mock-backend-server';

const PROJECT_ID = 'project-e2e-1';
const BACKEND_PORT = 18080;

const baseFixture = createDefaultMockFixture(PROJECT_ID);

let stopMockBackend: (() => Promise<void>) | null = null;

test.beforeAll(async () => {
  const server = await startMockBackendServer({
    fixture: createDefaultMockFixture(PROJECT_ID),
    port: BACKEND_PORT,
  });

  stopMockBackend = server.stop;
});

test.afterAll(async () => {
  if (stopMockBackend) {
    await stopMockBackend();
  }
});

test('home page loads projects list and creates a project with mocked /api/backend', async ({
  page,
}) => {
  let projects: MockProjectDto[] = [...baseFixture.projects];

  await page.route('**/api/backend/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const backendPath = url.pathname.replace(/^\/api\/backend/, '');

    if (request.method() === 'GET' && backendPath === '/api/v1/projects') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(projects),
      });
      return;
    }

    if (request.method() === 'POST' && backendPath === '/api/v1/projects') {
      const payload = request.postDataJSON() as {
        name?: string;
        description?: string;
        status?: MockProjectDto['status'];
      };

      const created: MockProjectDto = {
        id: `project-e2e-created-${projects.length + 1}`,
        name: payload.name ?? 'Untitled Project',
        description: payload.description ?? '',
        status:
          payload.status === 'completed' || payload.status === 'in-progress'
            ? payload.status
            : 'draft',
        createdAt: '2026-03-05T12:00:00.000Z',
        updatedAt: '2026-03-05T12:00:00.000Z',
      };

      projects = [created, ...projects];

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(created),
      });
      return;
    }

    await route.continue();
  });

  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'AI Video Content Projects' })).toBeVisible();
  await expect(page.getByText(baseFixture.projects[0].name)).toBeVisible();

  await page.getByRole('button', { name: '+ New Project' }).click();
  await expect(page.getByRole('heading', { name: 'Create New Project' })).toBeVisible();

  await page.getByLabel('Name').fill('Playwright Created Project');
  await page.getByLabel('Description').fill('Created from smoke test');
  await page.getByRole('button', { name: 'Create Project' }).click();

  await expect(page.getByText('Playwright Created Project')).toBeVisible();
});

test('navigates collections, screenplay, and shots tabs for a project workspace', async ({
  page,
}) => {
  await page.goto(`/projects/${PROJECT_ID}`);

  await expect(page.getByRole('heading', { name: 'Workspace Sections' })).toBeVisible();
  await page.waitForLoadState('networkidle');

  await page.goto(`/projects/${PROJECT_ID}/collections`);
  await expect(page).toHaveURL(new RegExp(`/projects/${PROJECT_ID}/collections$`));
  await expect(page.getByRole('heading', { name: 'Collections' })).toBeVisible();

  await page.goto(`/projects/${PROJECT_ID}`);
  await expect(page.getByRole('heading', { name: 'Workspace Sections' })).toBeVisible();
  await page.waitForLoadState('networkidle');

  await page.goto(`/projects/${PROJECT_ID}/scenes`);
  await expect(page).toHaveURL(new RegExp(`/projects/${PROJECT_ID}/scenes$`));
  await expect(page.getByRole('heading', { name: 'Screenplay' })).toBeVisible();

  await page.goto(`/projects/${PROJECT_ID}`);
  await expect(page.getByRole('heading', { name: 'Workspace Sections' })).toBeVisible();
  await page.waitForLoadState('networkidle');

  await page.goto(`/projects/${PROJECT_ID}/shots`);
  await expect(page).toHaveURL(new RegExp(`/projects/${PROJECT_ID}/shots$`));
  await expect(page.getByLabel('Select scene')).toBeVisible();
  await expect(
    page.getByText('No shots yet for this scene. Generate shots or add one.'),
  ).toBeVisible();
});
