import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        dashboard: resolve(__dirname, 'dashboard.html'),
        popup: resolve(__dirname, 'popup.html'),
        background: resolve(__dirname, 'src/background/main.js'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          return chunkInfo.name === 'background' ? '[name].js' : 'assets/[name]-[hash].js'
        }
      }
    },
  },
})
