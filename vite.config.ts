import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { inspectAttr } from 'kimi-plugin-inspect-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [
    inspectAttr(),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      strategies: 'injectManifest',
      injectRegister: false,
      srcDir: 'src',
      filename: 'sw.ts',
      manifest: false,
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/npm\/pannellum@2\.5\.6\/build\/pannellum\.(css|js)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'pannellum-cdn',
              expiration: {
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
            },
          },
        ],
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest,jpg,jpeg,woff2}'],
      },
    }),
  ],
  server: {
    port: 8080,
  },
  worker: {
    format: 'es',
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
