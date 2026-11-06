const CACHE_NAME = 'art-travel-v2';

// ติดตั้งและบังคับอัปเดตทันที
self.addEventListener('install', (e) => {
  self.skipWaiting();
});

// ล้างแคชเก่าทิ้งทันทีเมื่อเปิดแอป
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// ดึงข้อมูลใหม่จากเน็ตเวิร์กก่อนเสมอ
self.addEventListener('fetch', (e) => {
  e.respondWith(
    fetch(e.request)
      .then((response) => {
        return response;
      })
      .catch(() => {
        return caches.match(e.request);
      })
  );
});
