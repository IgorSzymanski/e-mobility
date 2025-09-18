/// <reference types="vitest" />
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import swc from 'unplugin-swc'
import { defineConfig } from 'vitest/config'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export default defineConfig({
  test: {
    include: ['**/*.e2e-spec.ts'],
    globals: true,
    environment: 'node',
    root: './',
    env: {
      NODE_ENV: 'test',
    },
    setupFiles: ['./test/setup.ts'],
  },
  resolve: {
    alias: {
      // Ensure Vitest correctly resolves TypeScript path aliases
      '@': resolve(__dirname, './src'),
      '@src': resolve(__dirname, './src'),
      '@test': resolve(__dirname, './test'),
      src: resolve(__dirname, './src'),
    },
  },
  plugins: [
    swc.vite({
      module: { type: 'es6' },
    }),
  ],
})
