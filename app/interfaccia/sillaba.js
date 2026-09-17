/* =============================================================================
   SIMULATORE 3.0 — La sillabazione automatica del testo (17/09/2026)
   =============================================================================
   Script classico, nessuna libreria, nessuna rete.

   PERCHE' ESISTE
   Igor: «per i tablet, i mini tablet e soprattutto i cellulari il testo va
   assolutamente sillabato in automatico: se no resta troppo spazio fra una
   parola e l'altra, ed è brutto». Il testo e' giustificato, e il foglio di
   stile chiede al browser «hyphens: auto»; ma non tutti i browser sillabano
   l'italiano, e non tutti allo stesso modo. Qui si fa in casa: si leggono le
   regole di app/dati/sillabazione-it.js (il dizionario di LibreOffice) e si
   mettono i trattini morbidi (U+00AD) nelle parole lunghe. Un trattino
   morbido non si vede: dice al browser «se devi andare a capo, qui puoi».
   Vale in ogni browser, dal disco e dal web.

   L'ALGORITMO
   E' quello di Liang, lo stesso di TeX: ogni regola e' una sequenza di
   lettere con dei numeri in mezzo; si cercano tutte le regole che stanno
   dentro la parola (con un punto ai due capi), si tiene per ogni posizione
   il numero piu' alto, e dove il numero e' dispari si puo' spezzare. Mai
   prima della seconda lettera ne' dopo la penultima.

   DOVE SI APPLICA, E DOVE NO
   Solo al testo che corre: paragrafi, elenchi, note, racconti, glossario.
   Non ai titoli, ai bottoni, alle tabelle, ai numeri, al codice, alle
   formule, alle etichette, alla barra, alle parole del glossario con il
   punto interrogativo (che vanno tenute intere). E non a quello che
   l'utente scrive. Si rifa' quando la pagina aggiunge testo (i racconti).
   ========================================================================== */
(function (globale) {
  'use strict';

  var R = globale.SillabazioneIT;
  if (!R) { return; }

  /* le regole, indicizzate per la loro sequenza di lettere */
  var TABELLA = {};
  var MASSIMA = 1;
  R.regole.forEach(function (regola) {
    var lettere = '', punti = [], ultimo = 0;
    for (var i = 0; i < regola.length; i++) {
      var c = regola.charAt(i);
      if (c >= '0' && c <= '9') { ultimo = ultimo * 10 + (c - '0'); }
      else { punti.push(ultimo); ultimo = 0; lettere += c; }
    }
    punti.push(ultimo);
    TABELLA[lettere] = punti;
    if (lettere.length > MASSIMA) { MASSIMA = lettere.length; }
  });

  var MORBIDO = '­';
  var MIN_LETTERE = 6;

  function sillaba(parola) {
    if (parola.length < MIN_LETTERE) { return parola; }
    var bassa = '.' + parola.toLowerCase() + '.';
    var n = bassa.length;
    var punti = [];
    for (var k = 0; k <= n; k++) { punti.push(0); }
    for (var i = 0; i < n; i++) {
      for (var l = 1; l <= MASSIMA && i + l <= n; l++) {
        var p = TABELLA[bassa.substr(i, l)];
        if (!p) { continue; }
        for (var j = 0; j < p.length; j++) {
          if (p[j] > punti[i + j]) { punti[i + j] = p[j]; }
        }
      }
    }
    /* punti[i] sta PRIMA della lettera i di «bassa»; la lettera i di
       «bassa» e' la lettera i-1 della parola */
    var fuori = '';
    for (var m = 0; m < parola.length; m++) {
      var prima = m;                    // lettere a sinistra del taglio
      var dopo = parola.length - m;     // lettere a destra
      if (m > 0 && prima >= R.minSinistra && dopo >= R.minDestra && (punti[m + 1] % 2) === 1) {
        fuori += MORBIDO;
      }
      fuori += parola.charAt(m);
    }
    return fuori;
  }

  /* una parola e' una sequenza di lettere (anche accentate); il resto —
     numeri, punteggiatura, virgolette, trattini veri — resta com'e' */
  var PAROLA = /[A-Za-zÀ-ÖØ-öø-ÿ]{6,}/g;
  function sillabaTesto(testo) {
    if (testo.indexOf(MORBIDO) >= 0) { return testo; }
    return testo.replace(PAROLA, sillaba);
  }

  var SALTA = 'script,style,code,pre,kbd,samp,math,button,input,textarea,select,option,label,' +
    'h1,h2,h3,h4,h5,h6,table,th,td,summary,nav,dialog,' +
    '.app-barra,.tendina,.wiki-tasto,.wiki-torna,.parola-spiegata,.cifra,.num,.sezione-t,' +
    '.bottone,.primario,.secondario,.fantasma,.porta,' +
    '.gradino,.indice-voce,.indice-lettura,.riga-corrente,.occhiello,.passo-etichetta,' +
    '.gruppo-titolo,.legenda,.voce-legenda,.formula-libro,.formula-fonte,.ancore,.cursore,' +
    '.opzione,.carta-livello b,.imbocco-eti,.imbocco strong,.marchio,.codice,.figura svg,' +
    '[data-no-sillaba]';

  function daSaltare(el) {
    for (var e = el; e && e.nodeType === 1; e = e.parentElement) {
      if (e.matches && e.matches(SALTA)) { return true; }
      if (e.isContentEditable) { return true; }
    }
    return false;
  }

  var inCorso = false;
  function applica(radice) {
    var r = radice || document.body;
    if (!r) { return 0; }
    var lingua = (document.documentElement.lang || '').toLowerCase();
    if (lingua && lingua.indexOf('it') !== 0) { return 0; }
    inCorso = true;
    var quante = 0;
    var giro = document.createTreeWalker(r, NodeFilter.SHOW_TEXT, {
      acceptNode: function (nodo) {
        if (!nodo.nodeValue || nodo.nodeValue.length < MIN_LETTERE) { return NodeFilter.FILTER_REJECT; }
        if (!PAROLA.test(nodo.nodeValue)) { PAROLA.lastIndex = 0; return NodeFilter.FILTER_REJECT; }
        PAROLA.lastIndex = 0;
        return daSaltare(nodo.parentElement) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
      }
    });
    var nodi = [];
    while (giro.nextNode()) { nodi.push(giro.currentNode); }
    nodi.forEach(function (nodo) {
      var nuovo = sillabaTesto(nodo.nodeValue);
      if (nuovo !== nodo.nodeValue) { nodo.nodeValue = nuovo; quante++; }
    });
    inCorso = false;
    return quante;
  }

  /* il testo che le pagine aggiungono dopo (i racconti, i risultati) si
     sillaba quando compare: si osserva il documento, con un ritardo */
  function osserva() {
    if (!globale.MutationObserver || !document.body) { return; }
    var attesa = null;
    new MutationObserver(function (cambi) {
      if (inCorso) { return; }
      var utile = cambi.some(function (c) { return c.type === 'childList' && c.addedNodes.length; });
      if (!utile || attesa) { return; }
      attesa = setTimeout(function () { attesa = null; applica(); }, 120);
    }).observe(document.body, { childList: true, subtree: true });
  }

  function avvia() { applica(); osserva(); }
  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', avvia); }
  else { avvia(); }

  var API = { sillaba: sillaba, sillabaTesto: sillabaTesto, applica: applica, MORBIDO: MORBIDO };
  globale.Sillaba = API;
  if (typeof module !== 'undefined' && module.exports) { module.exports = API; }
}(typeof window !== 'undefined' ? window : this));
