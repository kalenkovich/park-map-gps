import { defineConfig } from 'vite';
import { resolve } from 'node:path';

// Vite serves any .html in the project root during `dev`, but `build` only
// bundles the pages listed here — so list both.
export default defineConfig({
  build: {
    rolldownOptions: {
      input: {
        editor: resolve(import.meta.dirname, 'index.html'),
        field: resolve(import.meta.dirname, 'field.html'),
      },
    },
  },
});