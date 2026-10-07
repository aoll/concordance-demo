import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// Même origine pour l'API et la socket temps réel (socket.io sur /socket.io, en WebSocket).
const proxy = {
  '/api': 'http://localhost:3000',
  '/socket.io': { target: 'http://localhost:3000', ws: true },
};

export default defineConfig({
  plugins: [
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.ico', 'favicon.svg', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'Concordance',
        short_name: 'Concordance',
        description: 'Présence des managers sur les zones du réseau',
        lang: 'fr',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'any',
        theme_color: '#0b3d91',
        background_color: '#ffffff',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Shell en cache : JS, CSS, HTML et icônes précachés, toute navigation retombe sur index.html.
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//, /^\/socket\.io\//],
        runtimeCaching: [
          {
            // API en network-first : réponse fraîche si le réseau répond, dernière réponse connue sinon.
            // Sauf la session : une copie en cache survivrait à la déconnexion. Hors ligne, la
            // session vient du cache TanStack persisté, purgé lui aussi à la déconnexion.
            urlPattern: ({ url, sameOrigin }) =>
              sameOrigin &&
              url.pathname.startsWith('/api/') &&
              !url.pathname.startsWith('/api/auth/'),
            handler: 'NetworkFirst',
            method: 'GET',
            options: {
              cacheName: 'api',
              networkTimeoutSeconds: 3,
              expiration: { maxAgeSeconds: 60 * 60 * 24 },
              cacheableResponse: { statuses: [200] },
            },
          },
        ],
      },
    }),
  ],
  // Alias des composants shadcn/ui (`@/components/ui/…`), comme dans components.json.
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: {
    port: 5173,
    // Même origine pour le front et l'API : le cookie de session passe sans CORS.
    proxy,
  },
  preview: {
    port: 4173,
    proxy,
  },
});
