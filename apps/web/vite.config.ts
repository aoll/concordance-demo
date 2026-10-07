import { tanstackRouter } from '@tanstack/router-plugin/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [tanstackRouter({ target: 'react', autoCodeSplitting: true }), react()],
  server: {
    port: 5173,
    // Même origine pour le front et l'API : le cookie de session passe sans CORS.
    proxy: { '/api': 'http://localhost:3000' },
  },
});
