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

const CACHE_VERSION = 'v13';
const CACHE_NAME = 'athar-quran-' + CACHE_VERSION;
// ذاكرة الصوتيات مستقلّة عن رقم النسخة فلا تُمسح عند كلّ تحديث
const AUDIO_CACHE = 'athar-audio-v1';

// الملفات الأساسية للتطبيق نفسه فقط (صغيرة، من نفس المستودع)
const CORE_ASSETS = [
  './index.html',
  './mushaf.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './surahs/078.json',
  './surahs/079.json',
  './surahs/080.json',
  './surahs/081.json',
  './surahs/082.json',
  './surahs/083.json',
  './surahs/084.json',
  './surahs/085.json',
  './surahs/086.json',
  './surahs/087.json',
  './surahs/088.json',
  './surahs/089.json',
  './surahs/090.json',
  './surahs/091.json',
  './surahs/092.json',
  './surahs/093.json',
  './surahs/094.json',
  './surahs/095.json',
  './surahs/096.json',
  './surahs/097.json',
  './surahs/098.json',
  './surahs/099.json',
  './surahs/100.json',
  './surahs/101.json',
  './surahs/102.json',
  './surahs/103.json',
  './surahs/104.json',
  './surahs/105.json',
  './surahs/106.json',
  './surahs/107.json',
  './surahs/108.json',
  './surahs/109.json',
  './surahs/110.json',
  './surahs/111.json',
  './surahs/112.json',
  './surahs/113.json',
  './surahs/114.json'
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
        keys.filter(function(k){ return k !== CACHE_NAME && k !== AUDIO_CACHE; })
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
  // صوتيات الآيات: تُخدَم من الذاكرة إن كانت محفوظة (مع دعم طلبات Range
  // التي يرسلها مشغّل الصوت)، وإلا تمرّ للشبكة كما هي.
  if(url.hostname === 'everyayah.com'){
    event.respondWith(audioFromCache(req));
    return;
  }
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

function audioFromCache(req){
  return caches.open(AUDIO_CACHE).then(function(cache){
    return cache.match(req.url).then(function(hit){
      if(!hit) return fetch(req);
      var range = req.headers.get('range');
      if(!range || hit.type === 'opaque') return hit;
      return hit.arrayBuffer().then(function(buf){
        var m = /bytes=(\d+)-(\d*)/.exec(range);
        if(!m) return new Response(buf, {status:200, headers:{'Content-Type':'audio/mpeg'}});
        var start = parseInt(m[1], 10);
        var end = m[2] ? parseInt(m[2], 10) : buf.byteLength - 1;
        end = Math.min(end, buf.byteLength - 1);
        return new Response(buf.slice(start, end + 1), {
          status: 206, statusText: 'Partial Content',
          headers: {
            'Content-Type': hit.headers.get('Content-Type') || 'audio/mpeg',
            'Content-Range': 'bytes ' + start + '-' + end + '/' + buf.byteLength,
            'Content-Length': String(end - start + 1),
            'Accept-Ranges': 'bytes'
          }
        });
      });
    });
  }).catch(function(){ return fetch(req); });
}
