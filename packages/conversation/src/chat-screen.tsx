import { Feather } from '@expo/vector-icons';
import type { ChatMessage } from '@petstory/kernel';
import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  type NativeSyntheticEvent,
  Pressable,
  Text,
  TextInput,
  type TextInputKeyPressEventData,
  View,
} from 'react-native';
import type { CardContext } from './card-host';
import { CardHost } from './card-host';
import type { CardRegistry } from './card-registry';
import { useChat } from './chat-context';
import { type ChatScreenCopy, resolveChatScreenCopy } from './copy';

export interface ChatScreenProps {
  readonly registry: CardRegistry<ReactNode, CardContext>;
  /**
   * Partial copy override — missing keys fall back to the default EN
   * bundle. Apps supply shell-level strings here; later, pack copy-bundle
   * artifacts (ADR-004) augment on top for domain-specific turns.
   */
  readonly copy?: Partial<ChatScreenCopy>;
}

/**
 * Composite chat surface. Consumes the context set up by `ChatProvider`
 * and renders the message stream through a pack-registered `CardRegistry`.
 *
 * Behaviour:
 *  - Input auto-grows between 1 and ~5 lines; scrolls internally beyond.
 *  - Enter sends, Shift+Enter inserts a newline (web). On native platforms
 *    the soft-keyboard's return key behaves per OS defaults; users tap Send.
 *  - Focus stays on the input after sending so the user can type a
 *    follow-up immediately.
 *  - Auto-scrolls to the latest message on arrival.
 *  - Send failures surface as a dismissible banner above the composer
 *    with a Retry affordance; the banner auto-dismisses on the next
 *    successful send.
 */
export function ChatScreen({ registry, copy: copyOverride }: ChatScreenProps) {
  const copy = resolveChatScreenCopy(copyOverride);
  const { messages, sendTurn } = useChat();
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [error, setError] = useState<ChatError | null>(null);
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const inputRef = useRef<TextInput>(null);

  const attemptSend = useCallback(
    async (text: string) => {
      setSending(true);
      try {
        await sendTurn(text);
        setError(null); // auto-dismiss on success
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError({ message, lastDraft: text });
      } finally {
        setSending(false);
      }
    },
    [sendTurn],
  );

  const handleSend = useCallback(async () => {
    const trimmed = draft.trim();
    if (!trimmed || sending) return;
    setDraft('');
    inputRef.current?.focus();
    await attemptSend(trimmed);
  }, [draft, sending, attemptSend]);

  const handleRetry = useCallback(async () => {
    if (!error || sending) return;
    await attemptSend(error.lastDraft);
  }, [error, sending, attemptSend]);

  const handleKeyPress = useCallback(
    (event: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
      // biome-ignore lint/suspicious/noExplicitAny: reason: RN Web exposes shiftKey + preventDefault on nativeEvent; native RN types don't include them.
      const ne = event.nativeEvent as any;
      if (ne.key === 'Enter' && !ne.shiftKey) {
        ne.preventDefault?.();
        void handleSend();
      }
    },
    [handleSend],
  );

  useEffect(() => {
    if (messages.length === 0) return;
    const handle = setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
    return () => clearTimeout(handle);
  }, [messages.length]);

  const canSend = draft.trim().length > 0 && !sending;

  return (
    <View className="flex-1 bg-app-bg">
      {messages.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="font-heading text-2xl font-medium text-ink-900 mb-2">
            {copy.emptyStateTitle}
          </Text>
          <Text className="font-body text-base text-ink-500 text-center">
            {copy.emptyStateSubtitle}
          </Text>
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages as ChatMessage[]}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <CardHost message={item} registry={registry} />}
          contentContainerClassName="px-4 py-4"
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          showsVerticalScrollIndicator={false}
        />
      )}

      {error ? (
        <View
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
          className="mx-4 mb-2 px-3 py-2 rounded-xl bg-danger/10 border border-danger flex-row items-center gap-2"
        >
          <Feather name="alert-triangle" size={16} color="#E76F51" />
          <Text className="flex-1 text-ink-900 font-body text-[13px]" numberOfLines={2}>
            {copy.errorSendFailed} {error.message}
          </Text>
          <Pressable
            onPress={handleRetry}
            disabled={sending}
            accessibilityRole="button"
            accessibilityLabel={copy.errorRetryLabel}
            className="px-2 py-1 rounded-md active:bg-danger/20 disabled:opacity-50"
          >
            <Text className="text-danger font-body font-semibold text-[13px]">
              {copy.errorRetryLabel}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setError(null)}
            accessibilityRole="button"
            accessibilityLabel={copy.errorDismissLabel}
            className="h-7 w-7 rounded-full items-center justify-center active:bg-danger/20"
          >
            <Feather name="x" size={14} color="#E76F51" />
          </Pressable>
        </View>
      ) : null}

      <View className="flex-row items-end gap-2 px-4 pt-3 pb-4 border-t border-app-bg-elevated bg-app-bg">
        <View
          className={`flex-1 bg-app-bg-card rounded-3xl px-4 py-2 border transition-colors ${
            isFocused ? 'border-teal-600' : 'border-app-bg-elevated'
          }`}
          // biome-ignore lint/suspicious/noExplicitAny: reason: web-only cursor; RN native ignores unknown style keys.
          style={{ cursor: 'text' } as any}
        >
          <TextInput
            ref={inputRef}
            value={draft}
            onChangeText={setDraft}
            onKeyPress={handleKeyPress}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={copy.inputPlaceholder}
            placeholderTextColor="#8A9BB0"
            editable={!sending}
            multiline
            className="text-ink-900 font-body text-base min-h-[24px] max-h-[140px] py-1"
            // `outlineStyle: 'none'` maps to CSS `outline: none` on RN Web;
            // native RN silently ignores. Focus visibility is preserved via
            // the teal border on the wrapper View above.
            // biome-ignore lint/suspicious/noExplicitAny: reason: outlineStyle isn't on RN's native TextStyle type.
            style={{ textAlignVertical: 'center', outlineStyle: 'none' } as any}
          />
        </View>
        <Pressable
          onPress={handleSend}
          disabled={!canSend}
          accessibilityRole="button"
          accessibilityLabel={copy.sendAccessibilityLabel}
          className={`h-11 w-11 rounded-full items-center justify-center ${
            canSend ? 'bg-teal-600 active:bg-teal-800' : 'bg-app-bg-elevated'
          }`}
        >
          {sending ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Feather name="arrow-up" size={20} color={canSend ? '#FFFFFF' : '#8A9BB0'} />
          )}
        </Pressable>
      </View>
    </View>
  );
}

interface ChatError {
  readonly message: string;
  readonly lastDraft: string;
}
