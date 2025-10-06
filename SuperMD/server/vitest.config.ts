import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/**/*.test.ts'],
    watch: false,
    setupFiles: [],
    coverage: {
      enabled: false,
    },
  },
});
