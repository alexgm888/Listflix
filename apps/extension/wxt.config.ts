import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'wxt';

const DEFAULT_API_BASE_URL = 'http://localhost:8787';

function apiOrigin(): string {
  const raw = process.env.WXT_API_BASE_URL || DEFAULT_API_BASE_URL;
  return new URL(raw).origin;
}

// https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  zip: { artifactTemplate: 'listflix-{{version}}-{{browser}}.zip' },
  manifest: () => ({
    name: '__MSG_extName__',
    description: '__MSG_extDescription__',
    default_locale: 'es',
    action: { default_title: 'Listflix' },
    // `storage` no se pide: los datos viven en IndexedDB (ver docs/decisiones.md).
    permissions: ['unlimitedStorage'],
    host_permissions: [`${apiOrigin()}/*`],
  }),
  vite: () => ({
    plugins: [tailwindcss()],
  }),
});
