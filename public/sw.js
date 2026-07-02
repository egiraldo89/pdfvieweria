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

  const notificationData = event.notification.data || {};
  const record = notificationData.record || null;
  const url = new URL('/', self.location.origin);

  if (record?.id) {
    url.searchParams.set('push', '1');
    url.searchParams.set('pushId', String(record.id));
    if (record.word) {
      url.searchParams.set('pushWord', String(record.word));
    }
    if (record.translation) {
      url.searchParams.set('pushTranslation', String(record.translation));
    }
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      const client = clientList.find((c) => c.url.includes('/') && 'focus' in c);
      if (client) {
        client.postMessage({ type: 'PUSH_NOTIFICATION_CLICKED', data: notificationData });
        if (client.navigate) {
          return client.navigate(url.toString()).then(() => client.focus());
        }
        return client.focus();
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(url.toString());
      }
      return null;
    })
  );
});
