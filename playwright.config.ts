import { defineConfig, devices } from '@playwright/test';

// Playwright e2e config — runs against the mobile app's static web bundle.
//
// `just mobile-web-preview` builds the bundle via Expo and serves it on
// port 4173 (Vite preview convention). Playwright waits for the URL to
// respond before running tests. Locally, `reuseExistingServer: true`
// means a preview already running doesn't get rebuilt — fast iteration.
//
// CI will set CI=1 so reuseExistingServer: false, guaranteeing a fresh
// build per run. Not in CI yet (see ticket) but wiring is ready.

const PORT = 4173;

export default defineConfig({
  testDir: './e2e/tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['html', { open: 'never' }]] : 'list',

  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  webServer: {
    command: `just mobile-web-preview ${PORT}`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
