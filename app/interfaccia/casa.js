/* =============================================================================
   SIMULATORE 3.0 — La pagina di apertura
   =============================================================================
   E' la piu' piccola delle interfacce, e la piu' importante: e' la prima cosa
   che si vede, e da lei dipende se qualcuno andra' avanti oppure chiudera' la
   finestra.

   Fa tre cose, e nessuna calcola niente.

   1. Costruisce la mappa delle pagine LEGGENDOLA da app/dati/percorso.js,
      invece di riscriverla a mano nell'HTML. E' la stessa disciplina che vale
      per i numeri e per le formule: due copie della stessa cosa diventano due
      cose diverse il giorno in cui una cambia. Se domani si aggiunge una
      pagina al percorso, questa mappa la mostra da sola.

   2. Mostra l'esito della verifica di parita' leggendolo da app/dati/verifica.js,
      che e' generato dalla suite. La pagina non puo' vantare una prova diversa
      da quella che e' stata eseguita davvero.

   3. Tiene i due bottoni in alto — il tema e la stampa.
   ========================================================================== */

(function (globale) {
  'use strict';

  var P = globale.Percorso;

  function q(id) { return document.getElementById(id); }
  function esc(t) {
    return String(t).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* --------------------------------------------------------------------------
     LA MAPPA DELLE PAGINE
     -------------------------------------------------------------------------- */
  function mappaPagine() {
    var dove = q('mappaPagine');
    if (!dove || !P) { return; }

    var h = '<h3>I quattro livelli del tempo</h3><div class="elenco-pagine">';
    P.GRADINI.forEach(function (g) {
      h += '<a class="riga-pagina" href="' + esc(g.file) + '">' +
        '<span class="riga-n">' + g.n + '</span>' +
        '<span class="riga-t"><b>' + esc(g.nome) + '</b>' +
        '<small>' + esc(g.domanda) + '</small></span>' +
        '<span class="riga-durata">' + esc(g.durata) + '</span></a>';
    });
    h += '</div>';

    if (P.MENU && P.MENU.gruppi) {
      h += '<h3>Le altre pagine</h3>';
      P.MENU.gruppi.forEach(function (gr) {
        h += '<p class="titolo-gruppo">' + esc(gr.titolo) + '</p><div class="elenco-pagine">';
        gr.voci.forEach(function (file) {
          var v = null;
          P.MENU.voci.forEach(function (x) { if (x.file === file) { v = x; } });
          if (!v) { return; }
          h += '<a class="riga-pagina" href="' + esc(v.file) + '">' +
            '<span class="riga-n riga-icona">' + esc(v.icona || '·') + '</span>' +
            '<span class="riga-t"><b>' + esc(v.nome) + '</b>' +
            '<small>' + esc(v.domanda) + '</small></span>' +
            '<span class="riga-durata">' + esc(v.breve || '') + '</span></a>';
        });
        h += '</div>';
      });
    }
    dove.innerHTML = h;
  }

  /* --------------------------------------------------------------------------
     IL GIRO COMPLETO
     I tre link portano al primo gradino con la scena del libro gia' dentro i
     cursori (stessa disciplina di app/interfaccia/esempi-ui.js: i valori
     viaggiano nell'indirizzo, con encodeURIComponent sulla descrizione).
     I NUMERI (Pn, esito, margine, STR dopo, il pavimento) sono scritti a mano
     nel testo della pagina, perche' questa pagina non calcola niente — lo
     dice l'Apparato I, ed e' anche perche' qui non e' caricato il motore.
     _test/lettura.js verifica quei numeri contro il motore vero. */
  var GIRO = {
    base:    { p0: 70, e: -10, i: 0, t: -4, m: 0, bp: 0, c: 0, str: 84, deb: 0,
               d: 'Bere un bicchiere d’acqua, a sera, con la giornata già pesante' },
    tempo:   { p0: 70, e: -10, i: 0, t: 0,  m: 0, bp: 0, c: 0, str: 84, deb: 0,
               d: 'Bere un bicchiere d’acqua, con cinque minuti in più' },
    energia: { p0: 70, e: 0,   i: 0, t: -4, m: 0, bp: 0, c: 0, str: 84, deb: 0,
               d: 'Bere un bicchiere d’acqua, aspettando che il corpo ci sia' }
  };

  /* «&da=giro» distingue questi tre link da quelli che ESEMPI.html manda
     alla stessa pagina (app/interfaccia/esempi-ui.js, che non è fra i file
     di questo incarico). Senza di esso IL-GESTO.html non può sapere da dove
     arriva chi ha cliccato, e scriveva «arrivi da una scheda del libro» e
     «torna ai casi» anche a chi veniva da qui — dove non c'è nessuna scheda
     e non ci sono casi. app/interfaccia/app.js legge questo parametro. */
  function collegamentoGesto(v) {
    return 'IL-GESTO.html#p0=' + v.p0 + '&e=' + v.e + '&i=' + v.i + '&t=' + v.t +
      '&m=' + v.m + '&bp=' + v.bp + '&c=' + v.c + '&str=' + v.str + '&deb=' + v.deb +
      '&da=giro&d=' + encodeURIComponent(v.d);
  }

  function collegaGiro() {
    var coppie = { giroBase: GIRO.base, giroTempo: GIRO.tempo, giroEnergia: GIRO.energia };
    Object.keys(coppie).forEach(function (id) {
      var a = q(id);
      if (a) { a.href = collegamentoGesto(coppie[id]); }
    });
  }

  /* --------------------------------------------------------------------------
     LA PROVA DI PARITA'
     I numeri vengono dal file generato dalla suite: la pagina non li conosce.
     -------------------------------------------------------------------------- */
  function tassello(k, val, sotto) {
    return '<div class="tassello"><div class="k">' + esc(k) + '</div>' +
      '<div class="v">' + esc(val) + '</div>' +
      (sotto ? '<div class="s">' + esc(sotto) + '</div>' : '') + '</div>';
  }

  function mostraVerifica() {
    var d = globale.Verifica;
    if (!d) { return; }
    var vel = d.velocita || {};
    var righe =
      tassello('Confronti totali', d.confronti.toLocaleString('it-IT'), 'su tutti i livelli') +
      tassello('Differenze', d.differenze,
               d.differenze === 0 ? 'i due programmi dicono la stessa cosa'
                                  : 'c’è qualcosa da guardare subito') +
      tassello('Nodi singoli', d.nodi.toLocaleString('it-IT'), 'con lo stato dopo il nodo') +
      tassello('Semi del dado', d.semi_generatore_verificati, 'la stessa sequenza di numeri del programma in Python');
    if (vel.nodi_al_secondo_js && vel.nodi_al_secondo_py) {
      righe += tassello('Guadagno di velocità',
        '×' + Math.round(vel.nodi_al_secondo_js / vel.nodi_al_secondo_py),
        'misurato il ' + (vel.data || '').split('-').reverse().join('/'));
    }
    if (q('verifica')) { q('verifica').innerHTML = righe; }

    var dett = q('verificaDettaglio');
    if (dett && d.livelli && d.livelli.length) {
      dett.innerHTML =
        '<table class="dati"><thead><tr><th>Livello</th><th>Quanti</th>' +
        '<th>Confronti</th></tr></thead><tbody>' +
        d.livelli.map(function (l) {
          return '<tr><td>' + esc(l.nome) + '</td>' +
                 '<td class="num">' + l.quanti.toLocaleString('it-IT') + '</td>' +
                 '<td class="num">' + l.confronti.toLocaleString('it-IT') + '</td></tr>';
        }).join('') + '</tbody></table>' +
        '<p class="nota">Verifica del ' + esc((d.data || '').split('-').reverse().join('/')) +
        ', rifatta da capo a ogni giro dei controlli automatici.</p>';
    }
    var pc = q('pieConfronti');
    if (pc) { pc.textContent = d.confronti.toLocaleString('it-IT'); }
  }

  /* --------------------------------------------------------------------------
     I DUE BOTTONI IN ALTO
     -------------------------------------------------------------------------- */
  function bottoni() {
    var tema = q('tema');
    if (tema) {
      tema.addEventListener('click', function () {
        var ora = document.documentElement.getAttribute('data-tema') || 'chiaro';
        var nuovo = ora === 'scuro' ? 'chiaro' : 'scuro';
        document.documentElement.setAttribute('data-tema', nuovo);
        tema.textContent = nuovo === 'scuro' ? 'Tema chiaro' : 'Tema scuro';
      });
    }
    var stampa = q('stampa');
    if (stampa) { stampa.addEventListener('click', function () { window.print(); }); }
  }

  function avvia() { mappaPagine(); mostraVerifica(); collegaGiro(); bottoni(); }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', avvia);
  } else { avvia(); }

}(typeof window !== 'undefined' ? window : this));
