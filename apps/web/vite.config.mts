/// <reference types='vitest' />
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import { nxCopyAssetsPlugin } from '@nx/vite/plugins/nx-copy-assets.plugin';
import path from 'path';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, path.resolve(__dirname, '../../'), '');

  return {
    root: import.meta.dirname,
    cacheDir: '../node_modules/.vite/web',
    define: {
      'process.env.KEYCLOAK_URL': JSON.stringify(env.KEYCLOAK_URL),
      'process.env.KEYCLOAK_REALM': JSON.stringify(env.KEYCLOAK_REALM),
      // Prefer the web-specific client ID, fallback to the generic one, then default to 'sdas-web'
      'process.env.KEYCLOAK_CLIENT_ID': JSON.stringify(env.KEYCLOAK_WEB_CLIENT_ID || env.KEYCLOAK_CLIENT_ID || 'sdas-web'),
      'process.env.API_BASE_URL': JSON.stringify(env.API_BASE_URL || 'http://localhost:3000'),
    },
    server: {
      port: 4200,
      host: 'localhost',
      proxy: {
        '/api': {
          target: env.API_BASE_URL || 'http://localhost:3000',
          changeOrigin: true,
        },
      },
    },
    preview: {
      port: 4200,
      host: 'localhost',
    },
    plugins: [react(), nxViteTsPaths(), nxCopyAssetsPlugin(['*.md'])],
    // Uncomment this if you are using workers.
    // worker: {
    //   plugins: () => [ nxViteTsPaths() ],
    // },
    build: {
      outDir: '../dist/web',
      emptyOutDir: true,
      reportCompressedSize: true,
      commonjsOptions: {
        transformMixedEsModules: true,
      },
    },
  };
});
