import { baseConfig } from '@petstory/config/vitest';
import { mergeConfig } from 'vitest/config';

export default mergeConfig(baseConfig, {
  test: {
    name: 'kernel',
  },
});
