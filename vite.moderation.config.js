import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const projectRoot = fileURLToPath(
  new URL('.', import.meta.url),
)

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: '.ask-mark-moderation-dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        moderation: resolve(
          projectRoot,
          'ask-mark-moderation.html',
        ),
      },
    },
  },
})
