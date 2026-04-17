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
    reply: (turn) => `You said: ${turn.text}`,
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
      <ChatProvider port={adapter} petId={DEV_PET_ID}>
        <ChatScreen registry={registry} />
      </ChatProvider>
    </SafeAreaView>
  );
}
