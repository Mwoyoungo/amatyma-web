import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        // Split large vendor libraries so each chunk stays under ~2 MB
        manualChunks: {
          'vendor-react':     ['react', 'react-dom'],
          'vendor-firebase':  ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage'],
          'vendor-cometchat': ['@cometchat/chat-sdk-javascript', '@cometchat/calls-sdk-javascript'],
          'vendor-uikit':     ['@cometchat/chat-uikit-react'],
        },
      },
    },
  },

  plugins: [
    react(),
    VitePWA({
      // 'prompt' = we control when the new SW activates via useRegisterSW
      registerType: 'prompt',
      // Don't auto-inject — our useServiceWorker hook handles registration
      injectRegister: null,

      includeAssets: [
        'favicon.ico',
        'apple-touch-icon.png',
        'icon-*.png',
        'logo.png',
      ],

      manifest: {
        name: 'Amatyma – Community Chat',
        short_name: 'Amatyma',
        description: 'Connect and chat with your community on Amatyma',
        theme_color: '#ff3131',
        background_color: '#000000',
        display: 'standalone',
        display_override: ['standalone', 'minimal-ui', 'browser'],
        orientation: 'portrait-primary',
        start_url: '/?utm_source=pwa',
        scope: '/',
        id: '/',
        lang: 'en',
        categories: ['social', 'communication'],
        icons: [
          { src: '/icon-72x72.png',   sizes: '72x72',   type: 'image/png' },
          { src: '/icon-96x96.png',   sizes: '96x96',   type: 'image/png' },
          { src: '/icon-128x128.png', sizes: '128x128', type: 'image/png' },
          { src: '/icon-144x144.png', sizes: '144x144', type: 'image/png' },
          { src: '/icon-152x152.png', sizes: '152x152', type: 'image/png' },
          { src: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-384x384.png', sizes: '384x384', type: 'image/png' },
          { src: '/icon-512x512.png', sizes: '512x512', type: 'image/png' },
          // Maskable icons — logo centred with 10 % safe zone on black bg
          { src: '/icon-maskable-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: '/icon-maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        shortcuts: [
          {
            name: 'Open Chat',
            short_name: 'Chat',
            description: 'Open Amatyma Chat',
            url: '/',
            icons: [{ src: '/icon-96x96.png', sizes: '96x96', type: 'image/png' }],
          },
        ],
      },

      workbox: {
        // Pre-cache all build artifacts
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2,webp}'],

        // Raise limit to 4 MB — CometChat UIKit chunks are legitimately large
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,

        // Serve index.html for any navigation miss (SPA routing + offline)
        navigateFallback: '/index.html',
        // Don't intercept service-worker or workbox chunks themselves
        navigateFallbackDenylist: [/^\/sw\.js$/, /^\/workbox-.*\.js$/],

        // Don't skip waiting — we prompt users before activating new SW
        skipWaiting: false,
        clientsClaim: false,

        runtimeCaching: [
          // ── CometChat REST API ── NetworkFirst, 5s timeout, 5min TTL ──
          {
            urlPattern: /^https:\/\/[a-z0-9]+\.api\.cometchat\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'cometchat-api',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 60, maxAgeSeconds: 5 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },

          // ── CometChat media/CDN (avatars, thumbnails) ── CacheFirst ──
          {
            urlPattern: /^https:\/\/[a-z0-9-]+\.cometchat\.io\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'cometchat-media',
              expiration: { maxEntries: 200, maxAgeSeconds: 7 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },

          // ── Firebase Firestore ── NetworkFirst ──
          {
            urlPattern: /^https:\/\/firestore\.googleapis\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'firestore',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 50, maxAgeSeconds: 5 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/[a-z0-9-]+\.firebaseio\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'firebase-rtdb',
              networkTimeoutSeconds: 5,
              cacheableResponse: { statuses: [0, 200] },
            },
          },

          // ── Firebase Auth token endpoints ── NetworkOnly (never cache) ──
          {
            urlPattern: /^https:\/\/securetoken\.googleapis\.com\/.*/i,
            handler: 'NetworkOnly',
          },
          {
            urlPattern: /^https:\/\/identitytoolkit\.googleapis\.com\/.*/i,
            handler: 'NetworkOnly',
          },

          // ── Firebase Storage (uploaded media) ── CacheFirst ──
          {
            urlPattern: /^https:\/\/firebasestorage\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'firebase-storage',
              expiration: { maxEntries: 100, maxAgeSeconds: 7 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },

          // ── Google Fonts ── CacheFirst, 1-year TTL ──
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: { maxEntries: 20, maxAgeSeconds: 365 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },

      devOptions: {
        // Keep false — dev SW causes confusing hot-reload behaviour
        enabled: false,
      },
    }),
  ],
})
