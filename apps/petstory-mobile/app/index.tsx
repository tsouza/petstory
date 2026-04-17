import {
  type CardContext,
  CardRegistry,
  ChatProvider,
  ChatScreen,
  renderTextCardForAuthor,
  textCardEntry,
  unknownKindFallback,
} from '@petstory/conversation';
import { BitNetLlmAdapter, type ChatTurn } from '@petstory/kernel';
import { InMemoryChatAdapter } from '@petstory/testing';
import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Dev-mode wiring. The assistant reply is produced by a local BitNet
// container running bitnet.cpp (see `just bitnet-serve` + docs/testing/
// bitnet.md). If the container isn't up, the reply falls back to a
// placeholder echo so the app still renders.
//
// Real Convex + Clerk + Anthropic adapters arrive in a later PR. Multi-user
// simulation lands when a multi-owner story requires it (R18).
const DEV_PET_ID = 'pet-1';
const BITNET_PORT = 11434;
const DEV_SYSTEM_PROMPT =
  'Você é um assistente da petstory. Responda em português (PT-BR), breve e gentil. ' +
  'O tutor está falando sobre o pet Brutus — seja conciso (máximo 2-3 frases) e humano.';

function bitnetBaseUrl(): string {
  // In the browser, derive from the page origin so phones on the LAN can
  // reach the container at the same host the Metro bundle came from.
  // Native RN has no `window`; fall back to loopback (adapter runs
  // in-process on the device / emulator).
  if (typeof window !== 'undefined' && window.location?.hostname) {
    return `http://${window.location.hostname}:${BITNET_PORT}`;
  }
  return `http://127.0.0.1:${BITNET_PORT}`;
}

function createAdapter(): InMemoryChatAdapter {
  const llm = new BitNetLlmAdapter({
    baseUrl: bitnetBaseUrl(),
    model: 'bitnet-b1.58-2B-4T',
    timeoutMs: 30_000,
  });

  return new InMemoryChatAdapter({
    reply: async (turn: ChatTurn) => {
      try {
        const res = await llm.complete({
          tier: 'haiku',
          system: DEV_SYSTEM_PROMPT,
          messages: [{ role: 'user', content: turn.text }],
          maxTokens: 256,
        });
        return res.content;
      } catch (err) {
        // Don't log the turn text — it may be health data (R8).
        const name = err instanceof Error ? err.name : 'unknown';
        console.warn(`[dev] BitNet unreachable (${name}); using echo fallback`);
        return `You said: "${turn.text}". (BitNet offline — mocked fallback. Start it with \`just bitnet-serve\`.)`;
      }
    },
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
