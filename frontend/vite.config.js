import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: path.resolve(__dirname, '../static/react-app'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        sounds: path.resolve(__dirname, 'src/pages/sounds.entry.jsx'),
        dev: path.resolve(__dirname, 'src/pages/dev.entry.jsx'),
        rank: path.resolve(__dirname, 'src/pages/rank.entry.jsx'),
        rank_admin: path.resolve(__dirname, 'src/pages/rank_admin.entry.jsx'),
        vo: path.resolve(__dirname, 'src/pages/vo.entry.jsx'),
        vo_admin: path.resolve(__dirname, 'src/pages/vo_admin.entry.jsx'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name].js',
        assetFileNames: 'assets/[name][extname]',
      },
    },
  },
  server: {
    proxy: {
      '/sounds': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/rank': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});

