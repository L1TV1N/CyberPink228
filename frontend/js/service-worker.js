// js/service-worker.js

const CACHE_NAME = "planner-cache-v2";
const STATIC_ASSETS = [
  "/index.html",
  "/login.html",
  "/register.html",
  "/css/style.css",
  "/js/main.js",
  "/js/api.js",
  "/js/map.js",
  "/js/routes.js",
  "/js/upload.js",
  "/js/trips.js",
  "/js/history.js",
  "/js/push.js",
  "/js/auth.js",
  "/js/config.js",
];

// --- Установка SW и кэширование статических ресурсов ---
self.addEventListener("install", (event) => {
  console.log("[SW] Installing service worker...");
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[SW] Caching static assets");
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// --- Активация SW и удаление старых кэшей ---
self.addEventListener("activate", (event) => {
  console.log("[SW] Activating service worker...");
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log("[SW] Removing old cache:", key);
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim();
});

// --- Перехват запросов и отдача из кэша или сети ---
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Игнорируем POST-запросы
  if (request.method !== "GET") return;

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // Возвращаем кэшированный ресурс
        return cachedResponse;
      }
      // Фетчим из сети и кэшируем
      return fetch(request)
        .then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== "basic") {
            return networkResponse;
          }
          const clonedResponse = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, clonedResponse);
          });
          return networkResponse;
        })
        .catch(() => {
          // fallback для оффлайн режима
          if (request.destination === "document") return caches.match("/index.html");
        });
    })
  );
});

// --- Push-уведомления ---
self.addEventListener("push", (event) => {
  let data = { title: "Planner", body: "Новое уведомление!", url: "/" };
  if (event.data) data = event.data.json();

  const options = {
    body: data.body,
    icon: "/favicon.ico",
    badge: "/favicon.ico",
    data: { url: data.url },
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// --- Обработка клика на уведомление ---
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window" }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === event.notification.data.url && "focus" in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(event.notification.data.url);
    })
  );
});
