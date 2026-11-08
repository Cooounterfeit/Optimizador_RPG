/// <reference types='vitest' />
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/**
 * CSP solo en el build: en desarrollo bloquearia el WebSocket del HMR.
 *
 * Las imagenes pueden venir de cualquier HTTPS: el creador pega la base de su
 * CDN en `template.assets.sources` y no sube archivos a Supabase. Los scripts
 * siguen limitados a `'self'`; `connect-src` sigue cerrado a Supabase porque
 * el catalogo (JSON) si vive en Storage.
 */
const cspPlugin: Plugin = {
  name: 'zenith-csp',
  apply: 'build',
  transformIndexHtml() {
    const CSP = [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "connect-src 'self' https://*.supabase.co",
      "font-src 'self' data:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join('; ');

    return [
      {
        tag: 'meta',
        attrs: { 'http-equiv': 'Content-Security-Policy', content: CSP },
        injectTo: 'head-prepend',
      },
    ];
  },
};

export default defineConfig(() => ({
  root: import.meta.dirname,
  cacheDir: '../../node_modules/.vite/apps/web',
  server: {
    port: 4200,
    host: 'localhost',
  },
  preview: {
    port: 4300,
    host: 'localhost',
  },
  plugins: [react(), tailwindcss(), cspPlugin],
  // Uncomment this if you are using workers.
  // worker: {
  //  plugins: [],
  // },
  build: {
    outDir: './dist',
    emptyOutDir: true,
    reportCompressedSize: true,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
  test: {
    name: '@zenith/web',
    watch: false,
    globals: true,
    environment: 'jsdom',
    testTimeout: 10_000,
    // Las pruebas nunca tocan el proyecto real: sin variables, todo va a mock.
    env: {
      VITE_USE_MOCKS: '1',
      VITE_SUPABASE_URL: '',
      VITE_SUPABASE_ANON_KEY: '',
    },
    include: ['{src,tests}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: './test-output/vitest/coverage',
      provider: 'v8' as const,
    },
  },
}));
