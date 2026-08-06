/* Service Worker de Nexo Platform.
   Precarga el app shell (assets del build) y maneja notificaciones push. */

interface ManifestEntry {
  url: string;
  revision: string | null;
}

interface WindowClientLike {
  type: string;
  focus(): Promise<void>;
  navigate(url: string): Promise<void>;
}

interface ExtendableEventLike {
  waitUntil(promise: Promise<unknown>): void;
}

interface FetchEventLike extends ExtendableEventLike {
  request: Request;
  respondWith(response: Promise<Response>): void;
}

interface PushEventLike extends ExtendableEventLike {
  data: { json(): unknown; text(): string } | null;
}

interface NotificationClickEventLike extends ExtendableEventLike {
  notification: { close(): void; data?: unknown };
}

interface ServiceWorkerScope {
  __WB_MANIFEST: Array<ManifestEntry | string>;
  location: Location;
  registration: {
    showNotification(title: string, options?: NotificationOptions): Promise<void>;
  };
  clients: {
    matchAll(opts?: { type?: string; includeUncontrolled?: boolean }): Promise<WindowClientLike[]>;
    openWindow(url: string): Promise<WindowClientLike | null>;
    claim(): Promise<void>;
  };
  skipWaiting(): Promise<void>;
  addEventListener(type: 'install', handler: (event: ExtendableEventLike) => void): void;
  addEventListener(type: 'activate', handler: (event: ExtendableEventLike) => void): void;
  addEventListener(type: 'fetch', handler: (event: FetchEventLike) => void): void;
  addEventListener(type: 'push', handler: (event: PushEventLike) => void): void;
  addEventListener(
    type: 'notificationclick',
    handler: (event: NotificationClickEventLike) => void,
  ): void;
}

const CACHE_NAME = 'nexo-v1';
const ctx = self as unknown as ServiceWorkerScope;

const manifestUrls = (self as unknown as ServiceWorkerScope).__WB_MANIFEST.map((entry) => {
  const url = typeof entry === 'string' ? entry : entry.url;
  return new URL(url, ctx.location.origin).href;
});
const precacheUrls = [...new Set(manifestUrls)];

const appShellUrl = new URL('index.html', ctx.location.origin).href;

ctx.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(precacheUrls))
      .then(() => ctx.skipWaiting()),
  );
});

ctx.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => ctx.clients.claim()),  );
});

ctx.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== ctx.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match(appShellUrl).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((network) => {
          const copy = network.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(appShellUrl, copy)).catch(() => undefined);
          return network;
        });
      }),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => undefined);
        }
        return response;
      });
    }),
  );
});

interface PushPayload {
  title?: string;
  body?: string;
  icon?: string;
  badge?: string;
  url?: string;
}

ctx.addEventListener('push', (event) => {
  let payload: PushPayload = {};
  try {
    payload = event.data ? (event.data.json() as PushPayload) : {};
  } catch {
    payload = { body: event.data?.text() ?? '' };
  }

  const title = payload.title || 'Nexo Platform';
  const options: NotificationOptions = {
    body: payload.body || '',
    icon: new URL('icons/pwa-192x192.png', ctx.location.origin).href,
    badge: new URL('icons/pwa-64x64.png', ctx.location.origin).href,
    data: { url: payload.url || '/' },
  };

  event.waitUntil(ctx.registration.showNotification(title, options));
});

ctx.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data as { url?: string } | undefined)?.url || '/';

  event.waitUntil(
    ctx.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.type === 'window') {
          client.focus();
          client.navigate(targetUrl);
          return;
        }
      }
      return ctx.clients.openWindow(targetUrl);
    }),
  );
});
