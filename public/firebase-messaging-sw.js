/* eslint-disable no-undef */
/*
 * Amatyma — Firebase Cloud Messaging service worker.
 *
 * Handles push notifications when the PWA is backgrounded or closed. It mirrors
 * the payloads the Firebase function `onCallInitiated` already sends to Android:
 *
 *   type: "call"         → ring the user for an incoming 1:1 / group call
 *   type: "new_message"  → (auto-displayed by FCM; we only route the click)
 *
 * This SW runs at a dedicated scope (/firebase-cloud-messaging-push-scope) so it
 * does NOT collide with the Workbox PWA service worker registered at "/".
 */

importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

// Public Firebase web config (safe to expose — same values as src/firebase.ts).
firebase.initializeApp({
  apiKey: 'AIzaSyDlIpNGG-bXxwuZsl6P9PNhpa3dlK45cik',
  authDomain: 'amatyma-e75a8.firebaseapp.com',
  projectId: 'amatyma-e75a8',
  storageBucket: 'amatyma-e75a8.firebasestorage.app',
  messagingSenderId: '306750530279',
  appId: '1:306750530279:web:7315831705255642d83842',
  measurementId: 'G-SLFK1EPEGY',
});

const CALL_TAG = 'amatyma-call';
const STOP_ACTIONS = ['cancelled', 'unanswered', 'rejected', 'busy', 'ended'];
const CALL_FRESHNESS_MS = 30 * 1000;

const messaging = firebase.messaging();

/**
 * Background push handler. Only fires for DATA-ONLY messages — which is exactly
 * how call pushes are sent. Message pushes carry a `notification` block and are
 * auto-displayed by FCM, so they don't reach here (and we don't double-notify).
 */
messaging.onBackgroundMessage((payload) => {
  const data = payload.data || {};
  if (data.type !== 'call') return;

  const action = data.callAction;

  // Caller hung up / call ended elsewhere → clear any ringing notification.
  if (STOP_ACTIONS.includes(action)) {
    self.registration.getNotifications({ tag: CALL_TAG }).then((list) => {
      list.forEach((n) => n.close());
    });
    return;
  }

  if (action !== 'initiated') return;

  // Ignore stale call pushes (the same 30s window the Android app enforces).
  const sentAt = parseInt(data.sentAt || '0', 10);
  if (sentAt && Date.now() > sentAt + CALL_FRESHNESS_MS) return;

  const callType = (data.callType || 'audio').toLowerCase();
  const isVideo = callType === 'video';
  const isGroup = data.receiverType === 'group';

  const title = data.receiverName || 'Amatyma';
  const body = isGroup
    ? `Incoming group ${isVideo ? 'video' : 'voice'} call`
    : `Incoming ${isVideo ? 'video' : 'voice'} call`;

  self.registration.showNotification(title, {
    body,
    tag: CALL_TAG,
    renotify: true,
    requireInteraction: true,
    icon: data.receiverAvatar || '/icon-192x192.png',
    badge: '/icon-96x96.png',
    data,
    actions: [
      { action: 'answer', title: 'Answer' },
      { action: 'decline', title: 'Decline' },
    ],
  });
});

/**
 * Notification click → focus an open tab (or open one), and forward the payload
 * so the app can route to the incoming call / chat.
 */
self.addEventListener('notificationclick', (event) => {
  const data = event.notification?.data || {};
  const declined = event.action === 'decline';
  event.notification.close();

  if (declined) return;

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        if (clientList.length > 0) {
          const client = clientList[0];
          client.postMessage({ source: 'amatyma-push', payload: data });
          return client.focus().catch(() => self.clients.openWindow('/'));
        }
        // No tab open — open the app, then forward the payload once it loads.
        return self.clients.openWindow('/').then(() => {
          setTimeout(() => {
            self.clients
              .matchAll({ type: 'window', includeUncontrolled: true })
              .then((list) => {
                if (list.length > 0) {
                  list[0].postMessage({
                    source: 'amatyma-push',
                    payload: { ...data, fromBackground: true },
                  });
                }
              });
          }, 1500);
        });
      })
  );
});
