import { test, expect } from '@playwright/test';
import { createDefaultMockFixture, startMockBackendServer } from './support/mock-backend-server';

const PROJECT_ID = 'project-e2e-1';
const BACKEND_PORT = 18080;

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

test('edits scene content and persists through mocked save endpoint', async ({ page }) => {
  const fixture = createDefaultMockFixture(PROJECT_ID);
  let scenes = structuredClone(fixture.scenesByProject[PROJECT_ID]) as Array<{
    id: string;
    projectId: string;
    name: string;
    sceneNumber: number;
    content: Record<string, unknown>;
  }>;
  let lastPatchPayload: Record<string, unknown> | null = null;

  await page.route('**/api/backend/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const backendPath = url.pathname.replace(/^\/api\/backend/, '');

    if (request.method() === 'GET' && backendPath === `/api/v1/projects/${PROJECT_ID}/scenes`) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(scenes),
      });
      return;
    }

    const updateSceneMatch = backendPath.match(
      new RegExp(`^/api/v1/projects/${PROJECT_ID}/scenes/([^/]+)$`),
    );
    if (request.method() === 'PATCH' && updateSceneMatch) {
      const sceneId = updateSceneMatch[1];
      const payload = request.postDataJSON() as Record<string, unknown>;
      lastPatchPayload = payload;

      scenes = scenes.map((scene) =>
        scene.id === sceneId
          ? {
              ...scene,
              ...payload,
              content:
                payload.content && typeof payload.content === 'object'
                  ? (payload.content as Record<string, unknown>)
                  : scene.content,
            }
          : scene,
      );

      const updated = scenes.find((scene) => scene.id === sceneId);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(updated),
      });
      return;
    }

    await route.continue();
  });

  await page.goto(`/projects/${PROJECT_ID}/scenes`);

  const editorInput = page.getByPlaceholder('Write scene text...');
  await expect(editorInput).toBeVisible();
  await expect(editorInput).toHaveValue('Initial mocked scene content.');

  await editorInput.fill('Updated scene content from smoke test');

  await expect
    .poll(() => lastPatchPayload?.content as { text?: string } | undefined, {
      timeout: 5_000,
    })
    .toMatchObject({
      text: 'Updated scene content from smoke test',
    });
});
