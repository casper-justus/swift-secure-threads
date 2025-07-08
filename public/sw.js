// Service Worker for Push Notifications

self.addEventListener('push', function(event) {
  console.log('[Service Worker] Push Received.');
  console.log(`[Service Worker] Push had this data: "${event.data ? event.data.text() : 'no data'}"`);

  const data = event.data ? event.data.json() : { title: 'New Message', body: 'You have a new message.', icon: '/favicon.ico' };

  const title = data.title || 'Chat App Notification';
  const options = {
    body: data.body || 'You have a new message.',
    icon: data.icon || '/favicon.ico', // Default icon
    badge: data.badge || '/favicon.ico', // Icon for notification tray (Android)
    image: data.image, // Larger image in notification content
    // tag: data.tag || 'chat-message', // Useful for grouping or replacing notifications
    // renotify: data.renotify || false,
    // requireInteraction: data.requireInteraction || false,
    // actions: data.actions || [], // e.g., [{ action: 'reply', title: 'Reply' }]
    data: data.data || { url: '/' } // Arbitrary data associated with notification, like URL to open
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function(event) {
  console.log('[Service Worker] Notification click Received.');
  event.notification.close(); // Close the notification

  // Open the app or a specific URL
  // event.notification.data.url should be set in the push payload
  const urlToOpen = event.notification.data && event.notification.data.url ? event.notification.data.url : '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // If a window for the app is already open, focus it
      for (let i = 0; i < clientList.length; i++) {
        let client = clientList[i];
        // Check if the client URL matches the one we want to open, or if it's the base URL
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // If no window is open, open a new one
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Optional: Listen for subscription change if the browser/push service revokes the subscription
self.addEventListener('pushsubscriptionchange', function(event) {
  console.log('[Service Worker]: \'pushsubscriptionchange\' event fired.');
  // TODO: Resubscribe and send the new subscription to the server.
  // For now, just log it.
  // event.waitUntil(
  //   self.registration.pushManager.subscribe(event.oldSubscription.options)
  //   .then(subscription => {
  //     // send new subscription to server
  //   })
  // );
});

self.addEventListener('install', (event) => {
  console.log('[Service Worker] Install');
  // Perform install steps, like caching static assets
  // self.skipWaiting(); // Optional: activate new SW immediately
});

self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activate');
  // Perform activation steps, like cleaning up old caches
  // event.waitUntil(clients.claim()); // Optional: take control of open pages immediately
});
