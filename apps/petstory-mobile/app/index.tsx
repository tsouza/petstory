import {
  type CardContext,
  CardRegistry,
  ChatProvider,
  ChatScreen,
  renderTextCardForAuthor,
  textCardEntry,
  unknownKindFallback,
} from '@petstory/conversation';
import { InMemoryChatAdapter } from '@petstory/testing';
import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Dev-mode wiring. Real Convex + Clerk adapters arrive in a later PR;
// until then the in-memory adapter echoes every turn so the full UI loop
// is visible on device/browser.
//
// Hard-coded dev user + pet — multi-user simulation lands when a
// multi-owner story requires it (R18).
const DEV_PET_ID = 'pet-1';

function createAdapter(): InMemoryChatAdapter {
  return new InMemoryChatAdapter({
    reply: (turn) =>
      `You said: "${turn.text}". (Mocked — real LLM responses arrive when we wire the Anthropic adapter.)`,
  });
}

function createRegistry(): CardRegistry<ReactNode, CardContext> {
  const registry = new CardRegistry<ReactNode, CardContext>(unknownKindFallback);
  registry.register(textCardEntry<CardContext, ReactNode>(renderTextCardForAuthor));
  return registry;
}

export default function ChatRoute() {
  const adapter = useMemo(() => createAdapter(), []);
  const registry = useMemo(() => createRegistry(), []);
  return (
    <SafeAreaView className="flex-1 bg-app-bg" edges={['top']}>
      <View className="px-5 pt-2 pb-3 border-b border-app-bg-elevated bg-app-bg">
        <Text className="font-heading text-xl text-ink-900">
          <Text className="font-heading font-medium">pet</Text>
          <Text className="font-heading font-bold">story</Text>
        </Text>
        <Text className="font-body text-xs text-ink-500 mt-0.5">Dev preview · mocked replies</Text>
      </View>
      <ChatProvider port={adapter} petId={DEV_PET_ID}>
        <ChatScreen
          registry={registry}
          copy={{
            inputPlaceholder: 'Message petstory…',
            emptyStateTitle: 'Olá!',
            emptyStateSubtitle: 'Try: how is Brutus doing today?',
          }}
        />
      </ChatProvider>
    </SafeAreaView>
  );
}
