const CACHE_NAME = 'jogym-shell-1.0.1';
const SHELL_ASSETS = ['./', './index.html', './icon-192.png', './icon-512.png', './manifest.json', './css/style.css', './js/config.js', './js/utils.js', './js/programs.js', './js/charts.js', './js/records.js', './js/pace.js', './js/progress.js', './js/leaderboard.js', './js/profile.js', './js/admin.js', './js/weight-calculator.js', './js/supabase.js', './js/workout-share.js', './js/app.js', './assets/share-fonts/inter-0.woff2', './assets/share-fonts/montserrat-0.woff2', './assets/share-fonts/bebasneue-0.woff2', './assets/share-fonts/anton-0.woff2', './assets/share-fonts/oswald-0.woff2', './assets/share-fonts/barlowcondensed-0.woff2', './assets/share-fonts/barlowcondensed-1.woff2', './assets/share-fonts/spacegrotesk-0.woff2', './assets/share-fonts/jetbrainsmono-0.woff2', './assets/share-fonts/ibmplexmono-0.woff2', './assets/share-fonts/ibmplexmono-1.woff2', './assets/share-fonts/dmserifdisplay-0.woff2', './assets/share-fonts/playfairdisplay-0.woff2', './assets/share-fonts/archivoblack-0.woff2', './assets/share-fonts/robotoslab-0.woff2', './assets/share-fonts/silkscreen-0.woff2'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS.map((u) => new Request(u, { cache: 'reload' }))))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// 앱 파일(index.html 등)만 캐싱 대상으로 삼고, Supabase API나 CDN 요청은 그대로 네트워크로 보내서
// 실시간 데이터가 캐시 때문에 오래된 값으로 보이는 일이 없게 해요.
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;

  // cache:'no-cache' — 브라우저 HTTP 캐시(GitHub Pages는 10분)를 건너뛰고 서버에 바뀌었는지 물어봐요.
  // 배포 직후에도 예전 JS가 남지 않아요. 안 바뀌었으면 서버가 304로 짧게 답해서 느려지지 않아요.
  event.respondWith(
    fetch(event.request, { cache: 'no-cache' })
      .then((res) => {
        if (res.ok) {
          const resClone = res.clone();
          event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone)));
        }
        return res;
      })
      .catch(() => caches.match(event.request).then(async (cached) => {
        if (cached) return cached;
        if (event.request.mode === 'navigate') return (await caches.match('./index.html')) || Response.error();
        return Response.error();
      }))
  );
});
