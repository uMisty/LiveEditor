import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'node:path'
import { frontendLicenses } from './scripts/frontend-licenses.mjs'
export default defineConfig({ plugins: [vue(),frontendLicenses()], base: './', build: { rollupOptions: { input: { app: resolve('index.html'), preview: resolve('preview.html') } } }, server: {
  host: '127.0.0.1', port: 5186, strictPort: true,
  // The script-only preview sandbox has an opaque ("null") origin.
  // Keep its isolation while allowing it to load local development modules.
  cors: { origin: ['null', /^https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/] }
} })
