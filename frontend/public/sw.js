// Venti Service Worker — Web Push Notifications
self.addEventListener('push', function (event) {
    const data = event.data ? event.data.json() : {};

    const title = data.title || 'Venti';
    const options = {
        body: data.body || 'Tienes una nueva notificación',
        icon: data.icon || '/venti_logo.png',
        badge: data.badge || '/venti_logo.png',
        data: data.data || { url: '/chat' },
        vibrate: [200, 100, 200],
        actions: [
            { action: 'open', title: 'Ver evento' },
            { action: 'close', title: 'Cerrar' },
        ],
    };

    event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function (event) {
    event.notification.close();

    const url = event.notification.data?.url || '/chat';

    event.waitUntil(
        clients
            .matchAll({ type: 'window', includeUncontrolled: true })
            .then(function (clientList) {
                // If app is already open, focus it
                for (const client of clientList) {
                    if (client.url.includes(url) && 'focus' in client) {
                        return client.focus();
                    }
                }
                // Otherwise open a new window
                if (clients.openWindow) {
                    return clients.openWindow(url);
                }
            })
    );
});

self.addEventListener('install', function () {
    self.skipWaiting();
});

self.addEventListener('activate', function (event) {
    event.waitUntil(self.clients.claim());
});
