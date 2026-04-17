/**
 * Copy bundle for `ChatScreen`. Every user-facing string in the chat
 * surface goes through this interface so apps (and later, pack
 * `copyBundle` artifacts per ADR-004) can supply localized text.
 *
 * The default bundle is EN; real i18n (locale-aware plurals, ICU
 * MessageFormat per R9) arrives when the pet-health pack ships its first
 * copy-bundle artifact.
 */
export interface ChatScreenCopy {
  readonly inputPlaceholder: string;
  readonly sendAccessibilityLabel: string;
  readonly emptyStateTitle: string;
  readonly emptyStateSubtitle: string;
  readonly errorSendFailed: string;
  readonly errorDismissLabel: string;
  readonly errorRetryLabel: string;
}

export const DEFAULT_CHAT_SCREEN_COPY: ChatScreenCopy = {
  inputPlaceholder: 'Type a message…',
  sendAccessibilityLabel: 'Send message',
  emptyStateTitle: 'Say hello.',
  emptyStateSubtitle: 'Your messages show up here.',
  errorSendFailed: "Couldn't send your message.",
  errorDismissLabel: 'Dismiss',
  errorRetryLabel: 'Retry',
};

/**
 * Resolve a partial override against the default bundle. Missing keys
 * fall back to the default so apps only specify what they're changing.
 */
export function resolveChatScreenCopy(override?: Partial<ChatScreenCopy>): ChatScreenCopy {
  if (!override) return DEFAULT_CHAT_SCREEN_COPY;
  return { ...DEFAULT_CHAT_SCREEN_COPY, ...override };
}
