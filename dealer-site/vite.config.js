import { defineConfig } from 'vite';

// Acme Cars runs on its own origin (like a real dealer domain) and talks to the KenganAuto API.
export default defineConfig({
  server: { port: 5174, strictPort: true },
  preview: { port: 4174 },
});
