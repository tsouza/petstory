import type { TextCardPayload } from '@petstory/kernel';
import { Text, View } from 'react-native';
import type { CardContext } from './card-host';

export interface TextCardProps {
  readonly payload: TextCardPayload;
  /** Visual variant — apps pick this per message author or per context. */
  readonly variant?: 'accent' | 'neutral';
}

/**
 * Default text-card renderer — a chat bubble.
 *
 * - `accent`  → primary teal, white text, asymmetric rounded corner on the
 *               sending side (right-bottom). Used for the current user.
 * - `neutral` → elevated surface, ink-900 text, asymmetric corner on the
 *               opposite side (left-bottom). Used for everyone else.
 *
 * L1 component; no pet knowledge. Styling uses NativeWind tokens resolved
 * at build time against the consuming app's tailwind preset.
 */
export function TextCard({ payload, variant = 'neutral' }: TextCardProps) {
  const isAccent = variant === 'accent';
  const bubble = isAccent
    ? 'bg-teal-600 rounded-3xl rounded-br-md'
    : 'bg-app-bg-card rounded-3xl rounded-bl-md border border-app-bg-elevated';
  const textColor = isAccent ? 'text-white' : 'text-ink-900';
  return (
    <View className={`${bubble} max-w-[78%] px-4 py-3 my-1`}>
      <Text className={`${textColor} font-body text-[15px] leading-[22px]`}>{payload.text}</Text>
    </View>
  );
}

/**
 * A renderer function suitable for passing to `textCardEntry` that picks
 * the visual variant based on the message author — user turns get the
 * accent bubble, everything else gets the neutral one.
 */
export function renderTextCardForAuthor(payload: TextCardPayload, context: CardContext) {
  return <TextCard payload={payload} variant={context.author === 'user' ? 'accent' : 'neutral'} />;
}
