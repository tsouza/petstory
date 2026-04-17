import type { ChatMessage, ChatPort } from '@petstory/kernel';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from 'react';

/**
 * The shape the app's chat UI actually consumes. Subset of `ChatPort` plus
 * a reactive `messages` snapshot — components don't need to orchestrate
 * subscriptions themselves.
 */
export interface ChatContextValue {
  readonly messages: readonly ChatMessage[];
  readonly sendTurn: (text: string) => Promise<void>;
  readonly petId: string;
}

const ChatContext = createContext<ChatContextValue | null>(null);

export interface ChatProviderProps {
  readonly port: ChatPort;
  readonly petId: string;
  readonly children: ReactNode;
}

/**
 * Subscribes to the injected ChatPort's message stream and exposes a
 * stable `sendTurn(text)` bound to the current `petId`.
 *
 * Mounting the provider with a new `petId` or `port` resets the stream.
 */
export function ChatProvider({ port, petId, children }: ChatProviderProps): ReactNode {
  const [messages, setMessages] = useState<readonly ChatMessage[]>([]);

  useEffect(() => {
    setMessages([]);
    const unsubscribe = port.subscribeMessages(petId, (next) => setMessages(next));
    return () => {
      unsubscribe();
    };
  }, [port, petId]);

  const sendTurn = useCallback(
    async (text: string) => {
      await port.sendTurn({ petId, text });
    },
    [port, petId],
  );

  return (
    <ChatContext.Provider value={{ messages, sendTurn, petId }}>{children}</ChatContext.Provider>
  );
}

/**
 * Access the chat context. Throws if used outside a ChatProvider — fail
 * loud rather than silently returning empty data (R15).
 */
export function useChat(): ChatContextValue {
  const ctx = useContext(ChatContext);
  if (!ctx) {
    throw new Error('[useChat] must be rendered inside a <ChatProvider>');
  }
  return ctx;
}
