import {
  type CardContext,
  CardRegistry,
  ChatProvider,
  ChatScreen,
  renderTextCardForAuthor,
  textCardEntry,
  unknownKindFallback,
} from '@petstory/conversation';
import { type ChatPort, ConvexChatAdapter } from '@petstory/kernel';
import { InMemoryChatAdapter } from '@petstory/testing';
import { ConvexClient } from 'convex/browser';
import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Dev-mode wiring. Two paths, toggled by env:
//  1. `EXPO_PUBLIC_CONVEX_URL` set → `ConvexChatAdapter` talks to the Convex
//     mid-tier (browser → Convex → LLM). This is the production shape.
//  2. Unset → `InMemoryChatAdapter` echoes every turn, so `just mobile-web`
//     and Playwright's e2e smoke keep working without a Convex deployment.
//
// Hard-coded dev user + pet — multi-user simulation lands when a
// multi-owner story requires it (R18). In Stage A auth is anonymous;
// Stage B will swap in real Clerk.
const DEV_PET_ID = 'pet-1';

function createAdapter(): ChatPort {
  // biome-ignore lint/complexity/useLiteralKeys: reason: TS strict `noPropertyAccessFromIndexSignature` requires bracket access on process.env
  const convexUrl = process.env['EXPO_PUBLIC_CONVEX_URL'];
  if (convexUrl) {
    return new ConvexChatAdapter({ client: new ConvexClient(convexUrl) });
  }
  return new InMemoryChatAdapter({
    reply: (turn) =>
      `You said: "${turn.text}". (Mocked — set EXPO_PUBLIC_CONVEX_URL to exercise the Convex mid-tier.)`,
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
      <View className="px-5 pt-3 pb-2 flex-row items-center">
        <Text className="font-heading text-base text-ink-900">
          <Text className="font-heading font-medium">pet</Text>
          <Text className="font-heading font-bold">story</Text>
        </Text>
      </View>
      <ChatProvider port={adapter} petId={DEV_PET_ID}>
        <ChatScreen
          registry={registry}
          copy={{
            inputPlaceholder: 'Message petstory…',
            emptyStateTitle: 'Olá.',
            emptyStateSubtitle: 'Como posso ajudar com o Brutus hoje?',
          }}
        />
      </ChatProvider>
    </SafeAreaView>
  );
}
