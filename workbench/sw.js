const CACHE_NAME = 'xiaoningmeng-v7';
const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-72.png',
  './icons/icon-96.png',
  './icons/icon-128.png',
  './icons/icon-152.png',
  './icons/icon-167.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './icons/maskable-192.png',
  './icons/maskable-512.png',
  './icons/favicon.png'
];

// 安装时预缓存核心文件
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS).catch(err => {
        console.log('PreCache partial fail:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// 激活时清理旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// 网络优先 + 缓存回退策略
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 只拦截同源请求
  if (url.origin !== self.location.origin) return;

  // API 请求只走网络
  if (url.pathname.includes('/api/')) {
    event.respondWith(fetch(request).catch(() => new Response(JSON.stringify({ok:false,offline:true}), {
      headers: {'Content-Type':'application/json'}
    })));
    return;
  }

  // 音频文件：缓存优先（因为它们不变）
  if (url.pathname.includes('/audio/')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        });
      })
    );
    return;
  }

  // 图标文件：缓存优先
  if (url.pathname.includes('/icons/')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        });
      })
    );
    return;
  }

  // 其他静态资源（HTML等）：网络优先，离线时用缓存
  event.respondWith(
    fetch(request).then((response) => {
      const clone = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
      return response;
    }).catch(() => caches.match(request).then(cached => cached || caches.match('./index.html')))
  );
});
