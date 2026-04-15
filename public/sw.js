// azviq Push Notification Service Worker
// This runs in the background, even when the app tab is closed.

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let data = {};
  try {
    data = event.data.json();
  } catch {
    data = { title: "azviq Reminder", body: event.data.text() };
  }
  console.log(data);
  const { title = "⏰ azviq Reminder", body = "", icon, badge, data: extraData } = data;

  const options = {
    body,
    icon: icon || "/icons/icon-192x192.png",
    badge: badge || "/icons/badge-72x72.png",
    vibrate: [200, 100, 200],
    tag: extraData?.todoId || "azviq-reminder",
    renotify: true,
    data: extraData || {},
    actions: [
      { action: "open", title: "Open azviq" },
      { action: "dismiss", title: "Dismiss" },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "dismiss") return;

  const targetUrl = event.notification.data?.url || "/dashboard";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // If app is already open, focus it
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
        // Otherwise open a new window
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
  );
});
