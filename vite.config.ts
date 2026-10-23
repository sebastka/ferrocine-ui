import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The core (API and OIDC sign-in) runs on this port during development.
const core = process.env.FERROCINE_UPSTREAM ?? 'http://127.0.0.1:8096';

export default defineConfig({
  root: 'src',
  plugins: [react()],
  build: { outDir: '../dist', emptyOutDir: true },
  server: {
    port: 5173,
    // Trailing slashes: a bare '/api' prefix would also capture the UI module /api.ts.
    proxy: { '/api/': core, '/auth/': core },
  },
});
