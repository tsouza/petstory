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
 * Composite chat surface. Two distinct layouts driven by message count:
 *
 *  - **Hero** (empty): Claude/ChatGPT-style centered welcome — large
 *    heading + subtitle with the composer directly below, vertically
 *    centered in the viewport.
 *  - **Stream** (populated): FlatList filling the space, composer pinned
 *    to the bottom with a subtle divider.
 *
 * Both layouts share a single `Composer` subcomponent so the input pill,
 * send button, and error banner are defined once.
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

  const composerProps = {
    copy,
    draft,
    setDraft,
    sending,
    isFocused,
    setIsFocused,
    error,
    setError,
    inputRef,
    handleSend,
    handleRetry,
    handleKeyPress,
  } satisfies Omit<ComposerProps, 'variant'>;

  if (messages.length === 0) {
    return (
      <View className="flex-1 bg-app-bg items-center justify-center px-6">
        <View className="w-full max-w-[640px]">
          <Text className="font-heading font-bold text-ink-900 text-center text-[40px] leading-[48px] mb-3">
            {copy.emptyStateTitle}
          </Text>
          <Text className="font-heading font-medium text-ink-500 text-center text-lg leading-7 mb-10">
            {copy.emptyStateSubtitle}
          </Text>
          <Composer {...composerProps} variant="hero" />
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-app-bg">
      <FlatList
        ref={listRef}
        data={messages as ChatMessage[]}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <CardHost message={item} registry={registry} />}
        contentContainerClassName="px-4 py-4 max-w-[720px] w-full mx-auto"
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        showsVerticalScrollIndicator={false}
      />
      <View className="w-full max-w-[720px] mx-auto px-4 pt-3 pb-4 border-t border-app-bg-elevated bg-app-bg">
        <Composer {...composerProps} variant="stream" />
      </View>
    </View>
  );
}

// --- Composer --------------------------------------------------------------

interface ComposerProps {
  readonly copy: ChatScreenCopy;
  readonly draft: string;
  readonly setDraft: (value: string) => void;
  readonly sending: boolean;
  readonly isFocused: boolean;
  readonly setIsFocused: (value: boolean) => void;
  readonly error: ChatError | null;
  readonly setError: (value: ChatError | null) => void;
  readonly inputRef: React.RefObject<TextInput>;
  readonly handleSend: () => Promise<void>;
  readonly handleRetry: () => Promise<void>;
  readonly handleKeyPress: (e: NativeSyntheticEvent<TextInputKeyPressEventData>) => void;
  readonly variant: 'hero' | 'stream';
}

function Composer({
  copy,
  draft,
  setDraft,
  sending,
  isFocused,
  setIsFocused,
  error,
  setError,
  inputRef,
  handleSend,
  handleRetry,
  handleKeyPress,
  variant,
}: ComposerProps) {
  const canSend = draft.trim().length > 0 && !sending;
  // Pill style — web-only `cursor` always; hero variant also gets a soft
  // surrounding shadow for elevation. Native RN ignores both keys.
  // biome-ignore lint/suspicious/noExplicitAny: reason: RN Web accepts cursor + boxShadow; native silently ignores unknown style keys.
  const pillStyle: any = { cursor: 'text' };
  if (variant === 'hero') {
    pillStyle.boxShadow = '0 8px 24px -12px rgba(13, 27, 42, 0.12)';
  }

  return (
    <View className="w-full">
      {error ? (
        <View
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
          className="mb-2 px-3 py-2 rounded-xl bg-danger/10 border border-danger flex-row items-center gap-2"
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

      <View className="flex-row items-end gap-2">
        <View
          className={`flex-1 bg-app-bg-card rounded-3xl px-4 py-2 border transition-colors ${
            isFocused ? 'border-teal-600' : 'border-app-bg-elevated'
          }`}
          style={pillStyle}
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
