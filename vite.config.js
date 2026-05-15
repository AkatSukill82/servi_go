import base44 from "@base44/vite-plugin"
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [
    base44({
      legacySDKImports: process.env.BASE44_LEGACY_SDK_IMPORTS === 'true',
      hmrNotifier: true,
      navigationNotifier: true,
      analyticsTracker: true,
      visualEditAgent: true
    }),
    react(),
    // Remove crossorigin from all tags — WKWebView (Capacitor) serves assets
    // via capacitor://localhost with no CORS headers, so crossorigin attributes
    // cause CSS links and ES module scripts to fail silently.
    {
      name: 'capacitor-crossorigin-fix',
      transformIndexHtml(html) {
        return html
          .replace(/<link rel="stylesheet" crossorigin/g, '<link rel="stylesheet"')
          .replace(/<script type="module" crossorigin/g, '<script type="module"');
      },
    },
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
});
