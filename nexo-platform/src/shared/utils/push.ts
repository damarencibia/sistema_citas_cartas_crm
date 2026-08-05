import { supabase } from '@/shared/api/supabase.client';

const VAPID_PUBLIC_KEY_FALLBACK =
  'BFiFQS_39s6Todi0HcECGSLUwRAUV9_YQAMu4pt83rHse5cVN0vJpsjogtXKcswOARyEGdHQ2N5q2X96W7_jo-M';

const VAPID_PUBLIC_KEY: string =
  import.meta.env.VITE_VAPID_PUBLIC_KEY || VAPID_PUBLIC_KEY_FALLBACK;

export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window
  );
}

export function isVapidConfigured(): boolean {
  return !!VAPID_PUBLIC_KEY;
}

export function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const base64WithPadding = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64WithPadding);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) output[i] = rawData.charCodeAt(i);
  return output;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration> {
  const swUrl = `${import.meta.env.BASE_URL}sw.js`;
  return navigator.serviceWorker.register(swUrl);
}

export async function getPushSubscription(): Promise<PushSubscription | null> {
  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) return null;
  return registration.pushManager.getSubscription();
}

export async function requestPushSubscription(): Promise<PushSubscription> {
  let registration = await navigator.serviceWorker.getRegistration();
  if (!registration) {
    registration = await registerServiceWorker();
  }
  if (!VAPID_PUBLIC_KEY) {
    throw new Error('VITE_VAPID_PUBLIC_KEY no está configurada');
  }
  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  });
}

export async function savePushSubscription(subscription: PushSubscription): Promise<void> {
  const json = subscription.toJSON();
  const endpoint = json.endpoint;
  const keys = (json.keys ?? {}) as { p256dh?: string; auth?: string };
  if (!endpoint) throw new Error('Suscripción sin endpoint');
  const { error } = await (supabase as any).rpc('upsert_push_subscription', {
    p_endpoint: endpoint,
    p_p256dh: keys.p256dh ?? '',
    p_auth: keys.auth ?? '',
    p_user_agent: navigator.userAgent,
  });
  if (error) throw error;
}

export async function removePushSubscription(endpoint: string): Promise<void> {
  const { error } = await (supabase as any).rpc('delete_push_subscription', {
    p_endpoint: endpoint,
  });
  if (error) throw error;
}

export async function hasStoredPushSubscriptions(): Promise<boolean> {
  const { data } = await (supabase as any).rpc('get_my_push_subscriptions');
  return Array.isArray(data) && data.length > 0;
}
