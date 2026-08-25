import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        home: resolve(import.meta.dirname, 'index.html'),
        create: resolve(import.meta.dirname, 'create/index.html'),
        templates: resolve(import.meta.dirname, 'templates/index.html'),
        gallery: resolve(import.meta.dirname, 'gallery/index.html'),
        photoMotionReel: resolve(import.meta.dirname, 'how-to/create-a-photo-motion-reel/index.html'),
        portfolioShowcase: resolve(import.meta.dirname, 'how-to/make-a-portfolio-showcase-video/index.html'),
        verticalExport: resolve(import.meta.dirname, 'how-to/export-vertical-image-motion-video/index.html'),
      },
    },
  },
});
