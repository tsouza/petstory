# e2e

Playwright end-to-end tests against the mobile app's web target (RN Web via Expo Router).

Full scenarios that exercise the running browser — the class of bug a unit or jsdom test won't catch (e.g. the first e2e test in this directory was born from a `crypto.randomUUID` issue that only surfaces on non-localhost HTTP).

## Run

```
just e2e-install     # once after clone — downloads browser binaries
just e2e             # runs every test in e2e/tests against a built static bundle
```

Playwright's `webServer` config in `../playwright.config.ts` auto-launches `just mobile-web-preview` before tests start — it builds the Expo web bundle and serves it on `http://127.0.0.1:4173`. `reuseExistingServer` is on locally so a preview already running is reused.

## Write

```ts
import { expect, test } from '@playwright/test';

test('description of the scenario', async ({ page }) => {
  await page.goto('/');
  // interact + assert
});
```

Locator conventions: prefer `getByRole` / `getByPlaceholder` / `getByText` over CSS selectors. Playwright's default auto-wait handles async UI updates — no manual `setTimeout`.
