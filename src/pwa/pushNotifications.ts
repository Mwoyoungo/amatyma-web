/*
 * Web push notifications for Amatyma (Option A — reuses the existing
 * `onCallInitiated` Firebase function + the shared `users/{uid}.fcmTokens`
 * array that the Android app already populates).
 *
 * Responsibilities:
 *   - Ask for notification permission (after login).
 *   - Register the FCM browser token into Firestore so the function rings web too.
 *   - Show a ringing notification for FOREGROUND group calls (the UIKit's
 *     <CometChatIncomingCall/> only auto-rings native 1:1 calls).
 *   - Remove the token on logout so a signed-out browser stops ringing.
 *
 * The VAPID key MUST be provided via VITE_FIREBASE_VAPID_KEY (Vite env). Without
 * it, token registration is skipped gracefully (no crash, just no push).
 */
import { getMessaging, getToken, deleteToken, onMessage, isSupported, type Messaging } from 'firebase/messaging';
import { doc, setDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { firestore } from '../firebase';
import app from '../firebase';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined;
const FCM_SW_URL = '/firebase-messaging-sw.js';
const FCM_SW_SCOPE = '/firebase-cloud-messaging-push-scope';
const CALL_FRESHNESS_MS = 30 * 1000;

let messaging: Messaging | null = null;
let currentToken: string | null = null;
let foregroundUnsub: (() => void) | null = null;

interface PushPayloadData {
  type?: string;
  callAction?: string;
  callType?: string;
  callWorkflow?: string;
  receiverType?: string;
  receiverName?: string;
  receiverAvatar?: string;
  sentAt?: string;
  [key: string]: string | undefined;
}

/** Lazily resolve a Messaging instance, guarding unsupported browsers. */
async function getMessagingInstance(): Promise<Messaging | null> {
  if (messaging) return messaging;
  try {
    if (!(await isSupported())) {
      console.info('[Push] FCM not supported in this browser');
      return null;
    }
    messaging = getMessaging(app);
    return messaging;
  } catch (err) {
    console.warn('[Push] getMessaging failed:', err);
    return null;
  }
}

/** Register the dedicated FCM service worker at a non-conflicting scope. */
async function registerFcmServiceWorker(): Promise<ServiceWorkerRegistration | undefined> {
  if (!('serviceWorker' in navigator)) return undefined;
  try {
    return await navigator.serviceWorker.register(FCM_SW_URL, { scope: FCM_SW_SCOPE });
  } catch (err) {
    console.warn('[Push] FCM SW registration failed:', err);
    return undefined;
  }
}

/** Write the token into the same fcmTokens array the Android app + function use. */
async function saveTokenToFirestore(uid: string, token: string): Promise<void> {
  const payload = { fcmTokens: arrayUnion(token) };
  await setDoc(doc(firestore, 'users', uid), payload, { merge: true });
  // CometChat lowercases UIDs in webhooks — mirror the Android dual-write.
  const lower = uid.toLowerCase();
  if (lower !== uid) {
    await setDoc(doc(firestore, 'users', lower), payload, { merge: true });
  }
}

/**
 * Full setup: permission → token → Firestore → foreground handler.
 * Safe to call repeatedly; it no-ops if already initialised for this token.
 */
export async function initPushNotifications(uid: string): Promise<void> {
  if (!VAPID_KEY) {
    console.warn('[Push] VITE_FIREBASE_VAPID_KEY is not set — web push disabled');
    return;
  }

  const m = await getMessagingInstance();
  if (!m) return;

  // Request permission (must be triggered after a user gesture / post-login).
  let permission = Notification.permission;
  if (permission === 'default') {
    permission = await Notification.requestPermission();
  }
  if (permission !== 'granted') {
    console.info('[Push] Notification permission not granted:', permission);
    return;
  }

  const swReg = await registerFcmServiceWorker();

  try {
    const token = await getToken(m, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: swReg,
    });
    if (!token) {
      console.info('[Push] No FCM token returned');
      return;
    }
    currentToken = token;
    await saveTokenToFirestore(uid, token);
    console.info('[Push] Web push token registered');
  } catch (err) {
    console.warn('[Push] getToken failed:', err);
    return;
  }

  attachForegroundHandler(m);
}

/**
 * Foreground messages. <CometChatIncomingCall/> already rings native 1:1 calls
 * via the websocket, so here we only surface GROUP ("meeting") calls, which the
 * UIKit does not auto-ring. Shown as a notification so the user can jump in.
 */
function attachForegroundHandler(m: Messaging): void {
  if (foregroundUnsub) return;
  foregroundUnsub = onMessage(m, (payload) => {
    const data = (payload.data || {}) as PushPayloadData;
    if (data.type !== 'call') return;
    if (data.callWorkflow !== 'meeting') return; // 1:1 handled by the UIKit
    if (data.callAction !== 'initiated') return;

    const sentAt = parseInt(data.sentAt || '0', 10);
    if (sentAt && Date.now() > sentAt + CALL_FRESHNESS_MS) return;

    if (Notification.permission !== 'granted') return;
    const isVideo = (data.callType || 'audio').toLowerCase() === 'video';
    navigator.serviceWorker.ready.then((reg) => {
      reg.showNotification(data.receiverName || 'Amatyma', {
        body: `Incoming group ${isVideo ? 'video' : 'voice'} call`,
        tag: 'amatyma-call',
        icon: data.receiverAvatar || '/icon-192x192.png',
        badge: '/icon-96x96.png',
        requireInteraction: true,
        data,
      });
    });
  });
}

/** Remove the token on logout so a signed-out browser stops receiving pushes. */
export async function removePushToken(uid: string): Promise<void> {
  try {
    const token = currentToken;
    if (token) {
      const payload = { fcmTokens: arrayRemove(token) };
      await setDoc(doc(firestore, 'users', uid), payload, { merge: true });
      const lower = uid.toLowerCase();
      if (lower !== uid) {
        await setDoc(doc(firestore, 'users', lower), payload, { merge: true });
      }
    }
    const m = await getMessagingInstance();
    if (m) await deleteToken(m);
  } catch (err) {
    console.warn('[Push] removePushToken failed:', err);
  } finally {
    currentToken = null;
    if (foregroundUnsub) {
      foregroundUnsub();
      foregroundUnsub = null;
    }
  }
}
