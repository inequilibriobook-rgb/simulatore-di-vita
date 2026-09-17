/* sw.js — il programma di cache del simulatore (GENERATO da scripts/genera_sw.py: non si modifica a mano).
   Registrato da app/interfaccia/installa.js solo quando il simulatore arriva da un indirizzo web.
   Alla prima apertura scarica tutti i file qui sotto; da allora le pagine si aprono anche senza
   rete. Quando l'elenco o un file cambia, cambia la versione, e i dispositivi si aggiornano da soli.
   Versione: ed9714dc39a5 (68 file). */
var VERSIONE = 'simulatore-ed9714dc39a5';
var FILE = [
  'APRI-QUI.html',
  'CATENA.html',
  'ESEMPI.html',
  'IL-GESTO.html',
  'IL-MODELLO.html',
  'INDAGINE.html',
  'LA-FORMULA.html',
  'LA-SCENA.html',
  'MONTECARLO.html',
  'QUESTIONARIO.html',
  'SETTIMANA.html',
  'TRAIETTORIA.html',
  'index.html',
  'manifest.webmanifest',
  'app/dati/calibrazione.js',
  'app/dati/casi.js',
  'app/dati/condizioni-ambientali.js',
  'app/dati/domande.js',
  'app/dati/famiglie.js',
  'app/dati/formule.js',
  'app/dati/lessico.js',
  'app/dati/percorso.js',
  'app/dati/questionario.js',
  'app/dati/sillabazione-it.js',
  'app/dati/spiegazioni.js',
  'app/dati/verifica.js',
  'app/icone/icona-180.png',
  'app/icone/icona-192.png',
  'app/icone/icona-512.png',
  'app/icone/icona-maskable-512.png',
  'app/interfaccia/app.js',
  'app/interfaccia/attesa.js',
  'app/interfaccia/casa.js',
  'app/interfaccia/catena.js',
  'app/interfaccia/disegno.js',
  'app/interfaccia/esempi-ui.js',
  'app/interfaccia/figure-lunghe.js',
  'app/interfaccia/figure.js',
  'app/interfaccia/formula-ui.js',
  'app/interfaccia/formule-vista.js',
  'app/interfaccia/glossario.js',
  'app/interfaccia/grafici.js',
  'app/interfaccia/indagine-ui.js',
  'app/interfaccia/installa.js',
  'app/interfaccia/lettura-avvio.js',
  'app/interfaccia/lettura.js',
  'app/interfaccia/montecarlo-ui.js',
  'app/interfaccia/percorso-vista.js',
  'app/interfaccia/questionario-ui.js',
  'app/interfaccia/racconto-vista.js',
  'app/interfaccia/scena-ui.js',
  'app/interfaccia/settimana.js',
  'app/interfaccia/sillaba.js',
  'app/interfaccia/traiettoria.js',
  'app/motore/analisi.js',
  'app/motore/casuale-mt.js',
  'app/motore/composizione.js',
  'app/motore/inferenza.js',
  'app/motore/lingua.js',
  'app/motore/microsemantica.js',
  'app/motore/nucleo.js',
  'app/motore/racconto.js',
  'app/motore/scena.js',
  'app/motore/selezione.js',
  'app/motore/settimana-tipo.js',
  'app/motore/stato.js',
  'app/motore/tempo.js',
  'app/stile/stile.css'
];

self.addEventListener('install', function (e) {
  /* i file si scaricano saltando la cache del browser (cache: 'reload'):
     il sito li serve con dieci minuti di cache, e senza questo una versione
     nuova poteva riempirsi di file vecchi */
  e.waitUntil(caches.open(VERSIONE).then(function (c) {
    return c.addAll(FILE.map(function (f) { return new Request(f, { cache: 'reload' }); }));
  }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (chiavi) {
    return Promise.all(chiavi.filter(function (k) { return k !== VERSIONE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

/* prima la copia in cache (veloce, e funziona senza rete); se non c'e', la rete;
   quello che arriva dalla rete e sta nell'elenco si mette da parte per la prossima volta */
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') { return; }
  var url = new URL(e.request.url);
  if (url.origin !== self.location.origin) { return; }
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(function (r) {
    if (r) { return r; }
    return fetch(e.request).then(function (risposta) {
      if (risposta && risposta.ok) {
        var copia = risposta.clone();
        caches.open(VERSIONE).then(function (c) { c.put(e.request, copia); });
      }
      return risposta;
    }).catch(function () {
      if (e.request.mode === 'navigate') { return caches.match('APRI-QUI.html'); }
      return new Response('', { status: 503, statusText: 'senza rete e senza copia' });
    });
  }));
});
