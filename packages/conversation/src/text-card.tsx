import type { TextCardPayload } from '@petstory/kernel';
import { Text, View } from 'react-native';

export interface TextCardProps {
  readonly payload: TextCardPayload;
  /** Visual variant — apps pick this per message author or per context. */
  readonly variant?: 'accent' | 'neutral';
}

/**
 * Default text-card renderer — a chat bubble. L1 component; no pet
 * knowledge. Styling uses NativeWind tokens resolved at build time
 * against the consuming app's tailwind preset
 * (`@petstory/config/tailwind.preset.js`).
 */
export function TextCard({ payload, variant = 'neutral' }: TextCardProps) {
  const bubble =
    variant === 'accent'
      ? 'bg-teal-600 rounded-2xl rounded-br-sm'
      : 'bg-app-bg-elevated rounded-2xl rounded-bl-sm';
  const textColor = variant === 'accent' ? 'text-white' : 'text-ink-900';
  return (
    <View className={`${bubble} max-w-[80%] px-4 py-2 my-1`}>
      <Text className={`${textColor} font-body text-base`}>{payload.text}</Text>
    </View>
  );
}
