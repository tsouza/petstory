import type { ChatMessage } from '@petstory/kernel';
import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import type { CardRegistry } from './card-registry.js';

export interface CardHostProps {
  readonly message: ChatMessage;
  readonly registry: CardRegistry<ReactNode>;
}

/**
 * Render a single message: dispatch the payload through the registry,
 * wrap in an author-aware row so user messages align right and others
 * align left. The registry only sees the payload — layout concerns
 * (author alignment) stay here.
 */
export function CardHost({ message, registry }: CardHostProps): ReactNode {
  const content = registry.dispatch(message.payload);
  const align = message.author === 'user' ? 'items-end' : 'items-start';
  return <View className={`w-full ${align}`}>{content}</View>;
}

/**
 * Default fallback for unknown card kinds — a visible placeholder rather
 * than a crash. Not installed automatically; the app passes it to the
 * CardRegistry constructor.
 */
export function unknownKindFallback(payload: { kind: string }): ReactNode {
  return (
    <View className="bg-app-bg-elevated rounded-2xl px-4 py-2 my-1">
      <Text className="text-ink-500 font-body text-sm italic">
        [unknown card kind: {payload.kind}]
      </Text>
    </View>
  );
}
