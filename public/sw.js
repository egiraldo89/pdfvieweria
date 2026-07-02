self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  const title = data.title || 'Notificación';
  const actions = Array.isArray(data.actions) ? data.actions : [];
  const options = {
    body: data.body || '',
    data: data.data || {},
    badge: '/favicon.ico',
    icon: '/favicon.ico',
    tag: data.tag || 'remember-word',
    requireInteraction: true,
    actions,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const record = event.notification.data?.record || null;

  if (event.action === 'stop' && record?.id) {
    event.waitUntil(
      fetch('/api/notify-word/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: record.id }),
      })
        .catch(() => null)
        .then(() => self.clients.matchAll({ type: 'window', includeUncontrolled: true }))
        .then((clientList) => {
          const client = clientList.find((c) => c.url.includes('/') && 'focus' in c);
          if (client) {
            client.postMessage({ type: 'PUSH_NOTIFICATION_STOPPED', data: { id: record.id } });
            return client.focus();
          }
          if (self.clients.openWindow) {
            return self.clients.openWindow('/');
          }
          return null;
        })
    );
    return;
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      const client = clientList.find((c) => c.url.includes('/') && 'focus' in c);
      if (client) {
        client.postMessage({ type: 'PUSH_NOTIFICATION_CLICKED', data: event.notification.data });
        return client.focus();
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
      return null;
    })
  );
});
