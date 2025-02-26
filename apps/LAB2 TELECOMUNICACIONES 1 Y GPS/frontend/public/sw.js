// public/sw.js
importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.5.4/workbox-sw.js');

if (workbox) {
    console.log("Workbox se ha cargado correctamente.");

    // Precaché de assets de la app (si usas precaching)
    workbox.precaching.precacheAndRoute(self.__WB_MANIFEST || []);

    // Estrategia cache-first para las peticiones de tiles
    workbox.routing.registerRoute(
        ({url}) => url.origin.includes('tile.openstreetmap.org') ||
                url.origin.includes('server.arcgisonline.com') ||
                url.origin.includes('mt'),
        new workbox.strategies.CacheFirst({
        cacheName: 'tiles-cache',
        plugins: [
            new workbox.expiration.ExpirationPlugin({
            maxEntries: 500,          // Aumenta la cantidad de tiles a guardar
            maxAgeSeconds: 60 * 60 * 24 // 24 horas
            }),
        ],
        })
    );
    } else {
    console.log("Workbox no se pudo cargar.");
}
