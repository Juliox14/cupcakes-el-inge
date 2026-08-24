import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import devServer from '@hono/vite-dev-server'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    devServer({
      entry: 'server/index.ts',
      exclude: [/^\/(?!(api)\/).*/], // Proxy solo peticiones /api/*
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) {
              return 'vendor-react'
            }
            if (id.includes('lucide-react')) {
              return 'vendor-icons'
            }
            if (id.includes('html5-qrcode') || id.includes('qrcode')) {
              return 'vendor-qr'
            }
            if (id.includes('canvas-confetti')) {
              return 'vendor-confetti'
            }
          }
        },
      },
    },
  },
})
