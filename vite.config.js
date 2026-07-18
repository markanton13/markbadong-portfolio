import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const projectRoot = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(projectRoot, 'index.html'),
        personalvabot: resolve(projectRoot, 'projects/personalvabot.html'),
        markhq: resolve(projectRoot, 'projects/markhq.html'),
        applylang: resolve(projectRoot, 'projects/applylang.html'),
        leaveflow: resolve(projectRoot, 'projects/leaveflow.html'),
      },
    },
  },
})
