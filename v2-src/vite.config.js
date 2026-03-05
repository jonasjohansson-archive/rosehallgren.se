import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  base: '/v2/',
  plugins: [viteSingleFile()],
  build: {
    outDir: '../v2',
    emptyOutDir: true,
  },
});
