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

const CACHE_VERSION = 'v15';
const CACHE_NAME = 'athar-quran-' + CACHE_VERSION;
// ذاكرة الصوتيات مستقلّة عن رقم النسخة فلا تُمسح عند كلّ تحديث
const AUDIO_CACHE = 'athar-audio-v1';
// خطوط المصحف تُخزَّن هنا بعد أول تحميل (أو من «مركز التحميل») ولا تُمسح بالتحديثات
const PACK_CACHE = 'athar-packs-v1';

// الملفات الأساسية للتطبيق نفسه فقط (صغيرة، من نفس المستودع)
const CORE_ASSETS = [
  './index.html',
  './mushaf.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
  './078.json',
  './079.json',
  './080.json',
  './081.json',
  './082.json',
  './083.json',
  './084.json',
  './085.json',
  './086.json',
  './087.json',
  './088.json',
  './089.json',
  './090.json',
  './091.json',
  './092.json',
  './093.json',
  './094.json',
  './095.json',
  './096.json',
  './097.json',
  './098.json',
  './099.json',
  './100.json',
  './101.json',
  './102.json',
  './103.json',
  './104.json',
  './105.json',
  './106.json',
  './107.json',
  './108.json',
  './109.json',
  './110.json',
  './111.json',
  './112.json',
  './113.json',
  './114.json'
];

self.addEventListener('install', function(event){
  event.waitUntil(
    // كلّ ملفٍّ على حدة: غيابُ ملفٍّ واحد لا يُفشل تثبيت العامل كلّه
    caches.open(CACHE_NAME).then(function(cache){
      return Promise.all(CORE_ASSETS.map(function(u){
        return cache.add(u).catch(function(){});
      }));
    })
  );
});

self.addEventListener('activate', function(event){
  event.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(
        keys.filter(function(k){ return k !== CACHE_NAME && k !== AUDIO_CACHE && k !== PACK_CACHE; })
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
  // خطوط المصحف من CDN: كاش أولًا، وتُحفظ تلقائيًّا بعد أول تحميل ناجح.
  if(url.hostname === 'cdn.jsdelivr.net' && url.pathname.indexOf('/fonts-woff2/') !== -1){
    event.respondWith(fontFromCache(req));
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

function fontFromCache(req){
  return caches.open(PACK_CACHE).then(function(cache){
    return cache.match(req.url).then(function(hit){
      if(hit) return hit;
      return fetch(req).then(function(res){
        if(res && res.ok){ cache.put(req.url, res.clone()); }
        return res;
      });
    });
  }).catch(function(){ return fetch(req); });
}
