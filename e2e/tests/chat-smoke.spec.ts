import { expect, test } from '@playwright/test';

test.describe('chat (mocked in-memory adapter)', () => {
  test('user sends a message and sees the mocked assistant reply', async ({ page }) => {
    await page.goto('/');

    // Header wordmark is rendered → the route mounted.
    await expect(page.getByText('Dev preview · mocked replies')).toBeVisible();

    // Empty state appears before any messages.
    await expect(page.getByText('Olá!')).toBeVisible();

    const input = page.getByPlaceholder('Message petstory…');
    await input.click();
    await input.fill('hello from playwright');
    await input.press('Enter');

    // The user's own text echoed back into the timeline — matched by exact
    // string to distinguish from the assistant's "You said: …" reply which
    // contains it as a substring.
    await expect(page.getByText('hello from playwright', { exact: true })).toBeVisible();

    // The adapter's mocked assistant reply — "You said: …".
    await expect(page.getByText(/You said: "hello from playwright"/)).toBeVisible();

    // Error banner must NOT appear on a successful send — this is the
    // regression-guard for the crypto.randomUUID bug that prompted the
    // e2e setup.
    await expect(page.getByText("Couldn't send your message.")).not.toBeVisible();
  });

  test('empty / whitespace-only drafts cannot be sent', async ({ page }) => {
    await page.goto('/');

    const input = page.getByPlaceholder('Message petstory…');
    const send = page.getByRole('button', { name: 'Send message' });

    // Button is disabled on a blank draft. Clicking a disabled button is a
    // no-op in RN Web (it stays disabled; no send fires).
    await expect(send).toBeDisabled();

    await input.fill('   ');
    await expect(send).toBeDisabled();

    // No bubbles rendered.
    await expect(page.getByText(/You said/)).not.toBeVisible();
  });
});
