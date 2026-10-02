import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
  build: {
    target: 'es2020',
    sourcemap: false,
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('firebase/firestore')) return 'firebase-firestore'
            if (id.includes('firebase/auth')) return 'firebase-auth'
            if (id.includes('firebase/app')) return 'firebase-app'
            if (id.includes('framer-motion')) return 'motion-vendor'
            if (id.includes('lucide-react')) return 'icons-vendor'
            if (id.includes('react')) return 'react-vendor'
          }
        },
      },
    },
  },
})