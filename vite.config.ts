import { defineConfig } from 'vitest/config';

export default defineConfig({
  // GitHub Pages配信時はワークフローが TENKI_BASE=/tenki/ を与える
  base: process.env.TENKI_BASE ?? '/',
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
