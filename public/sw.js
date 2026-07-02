self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  const title = data.title || 'Notificación';
  const options = {
    body: data.body || '',
    data: data.data || {},
    badge: '/favicon.ico',
    icon: '/favicon.ico',
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
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
