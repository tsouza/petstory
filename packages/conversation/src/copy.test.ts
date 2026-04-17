import { describe, expect, it } from 'vitest';

import { DEFAULT_CHAT_SCREEN_COPY, resolveChatScreenCopy } from './copy';

describe('resolveChatScreenCopy', () => {
  it('returns the default bundle when no override is supplied', () => {
    expect(resolveChatScreenCopy()).toEqual(DEFAULT_CHAT_SCREEN_COPY);
    expect(resolveChatScreenCopy(undefined)).toEqual(DEFAULT_CHAT_SCREEN_COPY);
  });

  it('merges a partial override on top of the default', () => {
    const merged = resolveChatScreenCopy({ inputPlaceholder: 'Message petstory…' });
    expect(merged.inputPlaceholder).toBe('Message petstory…');
    // Non-overridden keys still match the default.
    expect(merged.sendAccessibilityLabel).toBe(DEFAULT_CHAT_SCREEN_COPY.sendAccessibilityLabel);
    expect(merged.emptyStateTitle).toBe(DEFAULT_CHAT_SCREEN_COPY.emptyStateTitle);
  });

  it('allows overriding every key', () => {
    const override = {
      inputPlaceholder: 'a',
      sendAccessibilityLabel: 'b',
      emptyStateTitle: 'c',
      emptyStateSubtitle: 'd',
      errorSendFailed: 'e',
      errorDismissLabel: 'f',
      errorRetryLabel: 'g',
    };
    expect(resolveChatScreenCopy(override)).toEqual(override);
  });

  it('default bundle contains a non-empty string for every key (R15 — no silent empties)', () => {
    for (const value of Object.values(DEFAULT_CHAT_SCREEN_COPY)) {
      expect(value.length).toBeGreaterThan(0);
    }
  });
});
