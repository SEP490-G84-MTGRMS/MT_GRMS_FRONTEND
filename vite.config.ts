/// <reference types="vitest" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          const nid = id.replace(/\\/g, '/');
          if (
            nid.includes('node_modules/react/') ||
            nid.includes('node_modules/react-dom/') ||
            nid.includes('node_modules/react-router-dom/')
          ) {
            return 'vendor-react';
          }
          if (
            nid.includes('node_modules/recharts') ||
            nid.includes('node_modules/chart.js') ||
            nid.includes('node_modules/react-chartjs-2')
          ) {
            return 'vendor-charts';
          }
          if (nid.includes('node_modules/lucide-react')) {
            return 'vendor-icons';
          }
          if (
            nid.includes('node_modules/xlsx') ||
            nid.includes('node_modules/date-fns') ||
            nid.includes('node_modules/dayjs') ||
            nid.includes('node_modules/zod') ||
            nid.includes('node_modules/axios')
          ) {
            return 'vendor-utils';
          }
          if (nid.includes('src/features/')) {
            const match = nid.match(/src\/features\/([^/]+)/);
            if (match) {
              return `feature-${match[1]}`;
            }
          }
          if (nid.includes('src/pages/')) {
            const match = nid.match(/src\/pages\/([^/]+)/);
            if (match) {
              return `page-${match[1]}`;
            }
          }
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api/v1/auth': {
        target: 'http://localhost:5232',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api\/v1\/auth/, '/api/Auth'),
      },
      '/api': {
        target: 'http://localhost:5232',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
  },
})
