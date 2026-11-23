import { defineConfig } from 'vitest/config';
import { WxtVitest } from 'wxt/testing/vitest-plugin';

export default defineConfig({
  plugins: [WxtVitest()],
  test: {
    environment: 'jsdom',
    pool: 'vmThreads',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['**/*.test.{ts,tsx}'],
    exclude: ['node_modules', '.output', '.wxt'],
  },
});
