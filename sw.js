/* أثر — Service Worker
   يخزّن هيكل التطبيق فقط (الصفحة + الأيقونات)، ولا يتدخّل إطلاقًا في:
   - تلاوة القرآن (everyayah.com)
   - توليد الصوت (Gemini / Google TTS)
   بحيث لا تتأثّر قاعدة "الآيات دائمًا بصوت الحصري" بأي تخزين مؤقت خاطئ. */

const CACHE = "athar-shell-v2";
const SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./apple-touch-icon.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).catch(() => {})
  );
  // لا نستدعي skipWaiting() هنا عمدًا — يبقى الإصدار الجديد "بانتظار"
  // حتى يضغط الوالد زر «تحديث» في الشريط، فيصله رسالة SKIP_WAITING أدناه.
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // لا نتدخّل أبدًا في الطلبات لخارج نفس الأصل (القرآن، الصوت السحابي، أي API)
  if (url.origin !== self.location.origin) return;
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(event.request, copy));
          }
          return res;
        })
        .catch(() => cached);
      // شبكة أولًا مع سقوط فوري للنسخة المخزّنة عند الفشل، لتفادي تقديم نسخة قديمة من الصفحة
      return fetchPromise || cached;
    })
  );
});
