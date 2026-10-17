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

const CACHE_VERSION = 'v71';
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
  './favicon.ico',
  './packs.json',
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
  './114.json',
  './c001.mp3',
  './c002.mp3',
  './c003.mp3',
  './c004.mp3',
  './c005.mp3',
  './c006.mp3',
  './c007.mp3',
  './c008.mp3',
  './c009.mp3',
  './c010.mp3',
  './c011.mp3',
  './c012.mp3',
  './c013.mp3',
  './c014.mp3',
  './c015.mp3',
  './c016.mp3',
  './c017.mp3',
  './c018.mp3',
  './c019.mp3',
  './c020.mp3',
  './c021.mp3',
  './c022.mp3',
  './c023.mp3',
  './c024.mp3',
  './c025.mp3',
  './c026.mp3',
  './c027.mp3',
  './c028.mp3',
  './c029.mp3',
  './c030.mp3',
  './c031.mp3',
  './c032.mp3',
  './c033.mp3',
  './c034.mp3',
  './c035.mp3',
  './c036.mp3',
  './c037.mp3',
  './c038.mp3',
  './c039.mp3',
  './c040.mp3',
  './c041.mp3',
  './c042.mp3',
  './c043.mp3',
  './c044.mp3',
  './c045.mp3',
  './c046.mp3',
  './c047.mp3',
  './c048.mp3',
  './c049.mp3',
  './c050.mp3',
  './c051.mp3',
  './c052.mp3',
  './c053.mp3',
  './c054.mp3',
  './c055.mp3',
  './c056.mp3',
  './c057.mp3',
  './c058.mp3',
  './c059.mp3',
  './c060.mp3',
  './c061.mp3',
  './c062.mp3',
  './c063.mp3',
  './c064.mp3',
  './c065.mp3',
  './c066.mp3',
  './c067.mp3',
  './c068.mp3',
  './c069.mp3',
  './c070.mp3',
  './c071.mp3',
  './c072.mp3',
  './c073.mp3',
  './c074.mp3',
  './c075.mp3',
  './c076.mp3',
  './c077.mp3',
  './c078.mp3',
  './c079.mp3',
  './c080.mp3',
  './c081.mp3',
  './c082.mp3',
  './c083.mp3',
  './c084.mp3',
  './c085.mp3',
  './c086.mp3',
  './c087.mp3',
  './c088.mp3',
  './c089.mp3',
  './c090.mp3',
  './c091.mp3',
  './t001.mp3',
  './t002.mp3',
  './t003.mp3',
  './t004.mp3',
  './t005.mp3',
  './t006.mp3',
  './t007.mp3',
  './t008.mp3',
  './t009.mp3',
  './t010.mp3',
  './t011.mp3',
  './t012.mp3',
  './t013.mp3',
  './t014.mp3',
  './t015.mp3',
  './t026.mp3',
  './t027.mp3',
  './t028.mp3',
  './t029.mp3',
  './t030.mp3',
  './t031.mp3',
  './t032.mp3',
  './t033.mp3',
  './t035.mp3',
  './t036.mp3',
  './t037.mp3',
  './t039.mp3',
  './t040.mp3',
  './t041.mp3',
  './t043.mp3',
  './t044.mp3',
  './t045.mp3',
  './t047.mp3',
  './t048.mp3',
  './t049.mp3',
  './t051.mp3',
  './t052.mp3',
  './t053.mp3',
  './t055.mp3',
  './t056.mp3',
  './t057.mp3',
  './t058.mp3',
  './t059.mp3',
  './t060.mp3',
  './t061.mp3',
  './t062.mp3',
  './t063.mp3',
  './t064.mp3',
  './t065.mp3',
  './t066.mp3',
  './t067.mp3',
  './t068.mp3',
  './t069.mp3',
  './t070.mp3',
  './t071.mp3',
  './t072.mp3',
  './t073.mp3',
  './t074.mp3',
  './t075.mp3',
  './t076.mp3',
  './t077.mp3',
  './t078.mp3',
  './t080.mp3',
  './t082.mp3',
  './t084.mp3',
  './t086.mp3',
  './t088.mp3',
  './t090.mp3',
  './t092.mp3',
  './t094.mp3',
  './t096.mp3'
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
  // ملفات حزم التنزيل (خطوط المصحف وصفحاته): كاش أولًا، والمرايا المختلفة تُعامَل كمفتاح واحد
  var pk = packKey(url);
  if(pk){
    event.respondWith(packFromCache(req, pk));
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

// يوحّد عناوين المرايا (cdn/fastly/gcore) إلى العنوان الأول المحفوظ في الكاش
function packKey(url){
  var h = url.hostname, p = url.pathname;
  if((h === 'cdn.jsdelivr.net' || h === 'fastly.jsdelivr.net' || h === 'gcore.jsdelivr.net') && p.indexOf('/fonts-woff2/') !== -1){
    return 'https://cdn.jsdelivr.net' + p;
  }
  if((h === 'cdn.jsdelivr.net' || h === 'fastly.jsdelivr.net' || h === 'gcore.jsdelivr.net') && p.indexOf('/gh/Ara2026fat/quran-qcf4') === 0){
    return 'https://cdn.jsdelivr.net' + p;
  }
  return null;
}
function packFromCache(req, key){
  return caches.open(PACK_CACHE).then(function(cache){
    return cache.match(key).then(function(hit){
      if(hit) return hit;
      return fetch(req).then(function(res){
        if(res && res.ok){ cache.put(key, res.clone()); }
        return res;
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
