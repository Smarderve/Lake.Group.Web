import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const proxyTarget = process.env.CMS_PROXY_TARGET ?? 'http://127.0.0.1:4000';

// The CMS talks to the existing Lake Group backend. In development the Vite
// server proxies the API paths same-origin, so the session cookie (SameSite=Lax)
// flows and the backend CSRF guard sees Origin == Host (localhost:5173).
// Set VITE_API_BASE_URL only for deployments where the API lives on another
// origin (see .env.example).
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/auth': { target: proxyTarget },
      '/admin': { target: proxyTarget },
      '/api': { target: proxyTarget },
      '/health': { target: proxyTarget },
    },
  },
});
