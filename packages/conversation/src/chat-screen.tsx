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

export interface ChatScreenProps {
  readonly registry: CardRegistry<ReactNode, CardContext>;
  /** Placeholder text for the input. App supplies localized copy. */
  readonly inputPlaceholder?: string;
  /** Accessibility label for the send button. App supplies localized copy. */
  readonly sendAccessibilityLabel?: string;
  /** Headline shown when the conversation is empty. */
  readonly emptyStateTitle?: string;
  /** Subtitle under the headline in the empty state. */
  readonly emptyStateSubtitle?: string;
}

/**
 * Composite chat surface. Consumes the context set up by `ChatProvider`
 * and renders the message stream through a pack-registered `CardRegistry`.
 *
 * L1 component — localized copy (placeholder, send label) comes from the
 * consuming app's copy bundle, not hard-coded here.
 *
 * Behaviour:
 *  - Input auto-grows between 1 and ~5 lines; scrolls internally beyond.
 *  - Enter sends, Shift+Enter inserts a newline (web). On native platforms
 *    the soft-keyboard's return key behaves per OS defaults; users tap Send.
 *  - Focus stays on the input after sending so the user can type a
 *    follow-up immediately.
 *  - Auto-scrolls to the latest message on arrival.
 */
export function ChatScreen({
  registry,
  inputPlaceholder = 'Type a message…',
  sendAccessibilityLabel = 'Send message',
  emptyStateTitle = 'Say hello.',
  emptyStateSubtitle = 'Your messages show up here.',
}: ChatScreenProps) {
  const { messages, sendTurn } = useChat();
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const inputRef = useRef<TextInput>(null);

  const handleSend = useCallback(async () => {
    const trimmed = draft.trim();
    if (!trimmed || sending) return;
    setSending(true);
    try {
      setDraft('');
      // Keep focus on the input so the user can keep typing. RN-web and
      // native handle focus slightly differently — the ref call is a no-op
      // on native when the input still owns the keyboard.
      inputRef.current?.focus();
      await sendTurn(trimmed);
    } finally {
      setSending(false);
    }
  }, [draft, sending, sendTurn]);

  // Enter sends, Shift+Enter newline (web). `TextInputKeyPressEventData`
  // on RN Web exposes `shiftKey` via the underlying DOM event; native
  // platforms don't fire `onKeyPress` on Enter for multiline inputs.
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

  // Scroll to latest on every new message.
  useEffect(() => {
    if (messages.length === 0) return;
    // Defer to next frame so FlatList has already rendered the new row.
    const handle = setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
    return () => clearTimeout(handle);
  }, [messages.length]);

  const canSend = draft.trim().length > 0 && !sending;

  return (
    <View className="flex-1 bg-app-bg">
      {messages.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="font-heading text-2xl font-medium text-ink-900 mb-2">
            {emptyStateTitle}
          </Text>
          <Text className="font-body text-base text-ink-500 text-center">{emptyStateSubtitle}</Text>
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

      {/* Composer — sticky at bottom, subtle divider, airy padding. */}
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
            placeholder={inputPlaceholder}
            placeholderTextColor="#8A9BB0"
            editable={!sending}
            multiline
            className="text-ink-900 font-body text-base min-h-[24px] max-h-[140px] py-1"
            // `outlineStyle: 'none'` is a react-native-web escape hatch that maps
            // to CSS `outline: none`; native RN silently ignores it. We keep
            // focus visibility via the teal border on the wrapper View above.
            // biome-ignore lint/suspicious/noExplicitAny: reason: outlineStyle isn't on RN's native TextStyle type.
            style={{ textAlignVertical: 'center', outlineStyle: 'none' } as any}
          />
        </View>
        <Pressable
          onPress={handleSend}
          disabled={!canSend}
          accessibilityRole="button"
          accessibilityLabel={sendAccessibilityLabel}
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
