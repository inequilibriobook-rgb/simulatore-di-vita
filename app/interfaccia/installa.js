/* =============================================================================
   SIMULATORE 3.0 — L'app installabile, e l'uso senza rete (17/09/2026)
   =============================================================================
   Script classico, nessuna libreria.

   CHE COSA FA
   Quando il simulatore arriva da un indirizzo web (https://…), registra il
   piccolo programma di cache «sw.js»: da quel momento il telefono, il tablet
   o il computer si tengono una copia di tutti i file, e il simulatore si apre
   anche senza connessione. E' quello che permette «Aggiungi alla schermata
   Home»: un'icona come un'app vera, a schermo intero.

   QUANDO NON FA NIENTE
   Aperto dal disco con un doppio clic (file://) il browser non permette la
   cache, e non serve: i file sono gia' sul disco. Qui lo script se ne accorge
   e non fa nulla, senza errori. Il capitolo 48 del libro resta vero: il
   pacchetto funziona da solo, e questo e' un di piu' per chi arriva dal web.

   NIENTE ESCE
   La cache tiene i file del simulatore, non quello che l'utente scrive. Le
   sessioni continuano a salvarsi come file, come dice il capitolo 48.
   ========================================================================== */
(function (globale) {
  'use strict';

  var daWeb = /^https?:$/.test(globale.location.protocol);
  /* sul server locale di chi sviluppa (localhost) la cache darebbe file vecchi
     a ogni modifica: la' non si registra, a meno di chiederlo con «?pwa» nell'indirizzo */
  var locale = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(globale.location.hostname);
  var conCache = daWeb && (!locale || /[?&]pwa/.test(globale.location.search));

  function registra() {
    if (!conCache || !('serviceWorker' in navigator)) { return; }
    navigator.serviceWorker.register('sw.js').then(function (reg) {
      /* se il sito e' cambiato, il nuovo programma di cache scarica i file
         nuovi in silenzio; appena e' pronto, una striscia in basso lo dice,
         e un tocco ricarica la pagina con la versione nuova (17/09/2026:
         Igor sul telefono non vedeva le modifiche e non sapeva perche') */
      if (!reg) { return; }
      function quandoPronto(w) {
        if (!w) { return; }
        w.addEventListener('statechange', function () {
          if (w.state === 'installed' && navigator.serviceWorker.controller) { avvisaNuovaVersione(); }
        });
      }
      reg.addEventListener('updatefound', function () { quandoPronto(reg.installing); });
      if (reg.waiting && navigator.serviceWorker.controller) { avvisaNuovaVersione(); }
      if (reg.update) { reg.update(); }
    }).catch(function () { /* niente: si va avanti senza cache */ });
  }

  var avvisato = false;
  function avvisaNuovaVersione() {
    if (avvisato) { return; }
    avvisato = true;
    var s = document.createElement('div');
    s.className = 'nuova-versione';
    s.setAttribute('role', 'status');
    s.innerHTML = '<span>C’è una versione nuova del simulatore.</span>' +
      '<button type="button" class="primario">Aggiorna adesso</button>';
    s.querySelector('button').addEventListener('click', function () { globale.location.reload(); });
    document.body.appendChild(s);
  }

  /* IL RIQUADRO «SUL TELEFONO, SUL TABLET, SUL COMPUTER».
     Solo da web: dal disco quelle istruzioni non servono a chi le legge. */
  function riquadro() {
    var dove = document.querySelector('[data-installa]');
    if (!dove || !daWeb) { return; }
    var iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
              (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    var standalone = globale.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
    var righe = [];
    if (standalone) {
      righe.push('<p><strong>Il simulatore è installato su questo dispositivo.</strong> Da qui funziona anche senza connessione: tutti i file sono già qui dentro.</p>');
    } else if (iOS) {
      righe.push('<p><strong>Sull’iPhone e sull’iPad.</strong> In Safari tocca il tasto di condivisione (il quadrato con la freccia in su), poi <em>Aggiungi alla schermata Home</em>. Compare l’icona del simulatore: da lì si apre a schermo intero e funziona anche senza rete.</p>');
    } else {
      righe.push('<p><strong>Sul telefono e sul tablet.</strong> Nel menu del browser (i tre puntini) scegli <em>Installa app</em> oppure <em>Aggiungi alla schermata Home</em>. Compare l’icona del simulatore: da lì si apre a schermo intero e funziona anche senza rete.</p>');
    }
    righe.push('<p><strong>Sul computer.</strong> Basta questo indirizzo, salvato fra i preferiti. Chi preferisce avere i file sul proprio disco, o su una chiavetta, scarica il pacchetto: si apre la cartella e si fa doppio clic su <code>APRI-QUI.html</code>.</p>');
    righe.push('<p class="passo-scelte"><a class="bottone secondario" href="scarica/SIMULATORE-3.0.zip" download>Scarica il pacchetto (zip)</a></p>');
    righe.push('<p class="nota">Niente di quello che scrivi parte da qui: il sito consegna i file del simulatore e non riceve nulla. Le sessioni si salvano e si ricaricano come file, sul tuo dispositivo.</p>');
    dove.innerHTML = righe.join('');
    dove.hidden = false;
  }

  /* il tasto «installa» vero e proprio, quando il browser lo offre (Android,
     Chrome ed Edge sul computer): si tiene da parte l'evento e lo si usa */
  var offerta = null;
  globale.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    offerta = e;
    var dove = document.querySelector('[data-installa]');
    if (!dove) { return; }
    var p = dove.querySelector('.passo-scelte');
    if (!p || p.querySelector('.installa-ora')) { return; }
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'primario installa-ora';
    b.textContent = 'Installa il simulatore su questo dispositivo';
    b.addEventListener('click', function () {
      if (!offerta) { return; }
      offerta.prompt();
      offerta.userChoice.then(function () { offerta = null; b.remove(); });
    });
    p.insertBefore(b, p.firstChild);
  });

  function avvia() { registra(); riquadro(); }
  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', avvia); }
  else { avvia(); }

  globale.Installa = { daWeb: daWeb };
}(typeof window !== 'undefined' ? window : this));
