import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const proxyTarget = process.env.CMS_PROXY_TARGET ?? 'http://127.0.0.1:4000';

// The CMS talks to the existing Lake Group backend. In development the Vite
// server proxies the API paths same-origin, so the session cookie (SameSite=Lax)
// flows and the backend CSRF guard sees Origin == Host (localhost:5173).
// Set VITE_API_BASE_URL only for deployments where the API lives on another
// origin (see .env.example).
export default defineConfig(({ command, mode }) => {
  // The browser guard uses the same explicit server-side flag for local
  // testing. A production build can never contain an enabled value.
  const localCmsAuthBypass = command === 'serve'
    && mode !== 'production'
    && process.env.NODE_ENV !== 'production'
    && process.env.CMS_AUTH_BYPASS === 'true';

  return {
    define: {
      __CMS_AUTH_BYPASS__: JSON.stringify(localCmsAuthBypass),
    },
    plugins: [react(), tailwindcss()],
    server: {
      port: 5173,
      proxy: {
        '/auth': { target: proxyTarget },
        '/admin': { target: proxyTarget },
        '/api': { target: proxyTarget },
        '/health': { target: proxyTarget },
        '/media': { target: proxyTarget },
      },
    },
  };
});
