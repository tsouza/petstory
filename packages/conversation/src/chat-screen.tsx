import type { ChatMessage } from '@petstory/kernel';
import { type ReactNode, useCallback, useState } from 'react';
import { FlatList, Pressable, Text, TextInput, View } from 'react-native';
import type { CardContext } from './card-host';
import { CardHost } from './card-host';
import type { CardRegistry } from './card-registry';
import { useChat } from './chat-context';

export interface ChatScreenProps {
  readonly registry: CardRegistry<ReactNode, CardContext>;
  /** Placeholder text for the input. App supplies localized copy. */
  readonly inputPlaceholder?: string;
  /** Label for the send button. App supplies localized copy. */
  readonly sendLabel?: string;
}

/**
 * Composite chat surface. Consumes the context set up by `ChatProvider`
 * and renders the message stream through a pack-registered `CardRegistry`.
 *
 * L1 component — localized copy (placeholder, send label) comes from the
 * consuming app's copy bundle, not hard-coded here.
 */
export function ChatScreen({
  registry,
  inputPlaceholder = 'Type a message…',
  sendLabel = 'Send',
}: ChatScreenProps) {
  const { messages, sendTurn } = useChat();
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = useCallback(async () => {
    const trimmed = draft.trim();
    if (!trimmed || sending) return;
    setSending(true);
    try {
      setDraft('');
      await sendTurn(trimmed);
    } finally {
      setSending(false);
    }
  }, [draft, sending, sendTurn]);

  return (
    <View className="flex-1 bg-app-bg">
      <FlatList
        data={messages as ChatMessage[]}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <CardHost message={item} registry={registry} />}
        contentContainerClassName="px-4 py-3"
      />
      <View className="flex-row items-end gap-2 px-4 py-3 border-t border-app-bg-elevated">
        <TextInput
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={handleSend}
          placeholder={inputPlaceholder}
          editable={!sending}
          multiline
          className="flex-1 bg-app-bg-card rounded-xl px-3 py-2 text-ink-900 font-body"
          placeholderTextColor="#8A9BB0"
        />
        <Pressable
          onPress={handleSend}
          disabled={sending || draft.trim().length === 0}
          className="bg-teal-600 rounded-xl px-4 py-2 disabled:opacity-50"
        >
          <Text className="text-white font-body font-semibold">{sendLabel}</Text>
        </Pressable>
      </View>
    </View>
  );
}
