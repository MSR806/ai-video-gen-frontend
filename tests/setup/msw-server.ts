import { setupServer } from 'msw/node';

export const server = setupServer();

interface TestLifecycleHooks {
  beforeAll: (fn: () => void | Promise<void>) => void;
  afterEach: (fn: () => void | Promise<void>) => void;
  afterAll: (fn: () => void | Promise<void>) => void;
}

export function registerMswLifecycle(hooks: TestLifecycleHooks): void {
  hooks.beforeAll(() => {
    server.listen({ onUnhandledRequest: 'error' });
  });

  hooks.afterEach(() => {
    server.resetHandlers();
  });

  hooks.afterAll(() => {
    server.close();
  });
}
