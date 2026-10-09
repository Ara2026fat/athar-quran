/* ═══════════════════════════════════════════════════════════════
   أثر | القرآن — Service Worker

   وظيفتان فقط:
   ١) تخزين ملفات التطبيق نفسها (لا صفحات المصحف ولا الصوتيات — تلك
      كبيرة ولها تخزينها الخاص أصلًا عبر localStorage في mushaf.html)
      لتعمل الشاشات والتنقّل دون اتصال بعد أول فتح.
   ٢) اكتشاف وجود نسخة أحدث من التطبيق نفسه، لإظهار شريط "تحديث
      التطبيق" في index.html بدل أن يبقى المستخدم على نسخة قديمة
      بصمت.

   ⚠️ مهمّ عند رفع تحديث جديد لاحقًا:
   غيّر رقم CACHE_VERSION بالأسفل (مثلاً v1 → v2) في كل مرة تعدّل
   فيها أي ملف من ملفات التطبيق. هذا هو ما يجعل المتصفح يكتشف وجود
   نسخة جديدة ويعرض شريط التحديث للمستخدمين الذين ثبّتوا التطبيق
   سابقًا. لو لم تُغيّر الرقم، لن يظهر شريط التحديث أبدًا مهما رفعت
   من تعديلات.
   ═══════════════════════════════════════════════════════════════ */

const CACHE_VERSION = 'v7';
const CACHE_NAME = 'athar-quran-' + CACHE_VERSION;

// الملفات الأساسية للتطبيق نفسه فقط (صغيرة، من نفس المستودع)
const CORE_ASSETS = [
  './index.html',
  './mushaf.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', function(event){
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      return cache.addAll(CORE_ASSETS);
    })
  );
});

self.addEventListener('activate', function(event){
  event.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(
        keys.filter(function(k){ return k !== CACHE_NAME; })
            .map(function(k){ return caches.delete(k); })
      );
    }).then(function(){ return self.clients.claim(); })
  );
});

// كاش أولًا لملفات التطبيق نفسها فقط (نفس المصدر)؛ كل شيء آخر
// (صوت، خطوط، بيانات المصحف من CDN خارجي) يمرّ للشبكة مباشرةً بلا
// أي تدخّل — لسنا مسؤولين عن تخزينه هنا.
self.addEventListener('fetch', function(event){
  var req = event.request;
  if(req.method !== 'GET') return;
  var url = new URL(req.url);
  if(url.origin !== self.location.origin) return; // اتركه للشبكة كما هو

  event.respondWith(
    caches.match(req).then(function(cached){
      var network = fetch(req).then(function(res){
        if(res && res.status === 200){
          var copy = res.clone();
          caches.open(CACHE_NAME).then(function(cache){ cache.put(req, copy); });
        }
        return res;
      }).catch(function(){ return cached; });
      return cached || network;
    })
  );
});

// يسمح لصفحة index.html بطلب تفعيل النسخة الجديدة فورًا بدل انتظار
// إغلاق كل التبويبات المفتوحة.
self.addEventListener('message', function(event){
  if(event.data === 'SKIP_WAITING') self.skipWaiting();
});
