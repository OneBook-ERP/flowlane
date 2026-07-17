import { defineConfig } from 'vitest/config'
import path from 'path'

// Unit tests for pure logic modules (data-layer helpers, and — in later phases —
// the swimlane generation engine). Node environment: keep this logic browser-free.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.js'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
})
