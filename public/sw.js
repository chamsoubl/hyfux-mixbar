self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data?.text() ?? '' };
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || "We're open!", {
      body: payload.body || 'The shop is now open and accepting orders.',
      icon: payload.icon || '/hyfux-logo.png',
      badge: payload.badge || '/hyfux-logo.png',
      data: { url: payload.url || '/' },
      tag: 'shop-open',
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const destination = new URL(event.notification.data?.url || '/', self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((client) => client.url === destination);
      if (existing) return existing.focus();
      return self.clients.openWindow(destination);
    }),
  );
});
