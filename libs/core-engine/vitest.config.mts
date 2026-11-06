import { defineConfig } from 'vitest/config';

export default defineConfig(() => ({
  root: import.meta.dirname,
  cacheDir: '../../node_modules/.vite/libs/core-engine',
  test: {
    name: '@zenith/core-engine',
    watch: false,
    globals: true,
    environment: 'node',
    // El solver tarda mas cuando los 6 proyectos corren en paralelo en CI.
    testTimeout: 20_000,
    include: ['{src,tests}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: './test-output/vitest/coverage',
      provider: 'v8' as const,
    },
  },
}));
