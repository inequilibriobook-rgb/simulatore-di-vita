/* =============================================================================
   SIMULATORE 3.0 — L'attesa che si vede: barra, clessidra, una frase (17/09/2026)
   =============================================================================
   Script classico, nessuna libreria.

   PERCHE' ESISTE
   Igor, dal telefono: «se ci impiega molto a caricare, metti una clessidra,
   una barra del tempo che si colora, una frase: attendi, sto caricando;
   qualcosa di serio ma anche simpatico». Alcune sezioni fanno centinaia di
   simulazioni (la settimana: 576 settimane da quaranta giorni). Sul
   computer sono secondi, sul telefono di piu'. Prima quelle simulazioni
   giravano tutte insieme all'apertura, e la pagina restava bianca e ferma
   finche' non avevano finito. Adesso:
   - il lavoro si spezza in passi, e fra un passo e l'altro la pagina
     risponde (si scorre, si legge, si toccano i bottoni);
   - una barra si riempie passo dopo passo, con una clessidra e una frase
     che cambia ogni tanto, cosi' si vede che sta lavorando e quanto manca;
   - il lavoro parte quando serve: quando la sezione entra nello schermo,
     non prima. Chi non ci arriva non aspetta niente.

   COME SI USA
     Attesa.lavora(elemento, quantiPassi, faiPasso, allaFine, opzioni)
       elemento    dove disegnare la barra (una <div> vuota o da svuotare)
       quantiPassi numero dei passi
       faiPasso(i) fa il passo i (sincrono, breve: un decimo di secondo al piu')
       allaFine()  quando tutti i passi sono fatti
       opzioni     { titolo, quandoVisibile: elemento da aspettare }
   ========================================================================== */
(function (globale) {
  'use strict';

  var FRASI = [
    'Sto tirando i dadi, tanti dadi.',
    'Quaranta giorni per volta, una settimana dopo l’altra.',
    'Il conto lo faccio io, tu intanto leggi.',
    'Sono giocate vere, non numeri ricopiati: ci vuole un momento.',
    'Quasi. Le ultime settimane sono sempre le più lunghe.'
  ];

  function disegna(el, titolo) {
    el.innerHTML =
      '<div class="attesa" role="status" aria-live="polite">' +
        '<div class="attesa-testa"><span class="attesa-clessidra" aria-hidden="true">⏳</span>' +
        '<span class="attesa-titolo">' + (titolo || 'Un momento: sto misurando.') + '</span>' +
        '<span class="attesa-quota">0 %</span></div>' +
        '<div class="attesa-barra"><i></i></div>' +
        '<p class="attesa-frase">' + FRASI[0] + '</p>' +
      '</div>';
    return {
      barra: el.querySelector('.attesa-barra > i'),
      quota: el.querySelector('.attesa-quota'),
      frase: el.querySelector('.attesa-frase')
    };
  }

  function lavora(el, quanti, faiPasso, allaFine, opzioni) {
    opzioni = opzioni || {};
    if (!el) { for (var i = 0; i < quanti; i++) { faiPasso(i); } if (allaFine) { allaFine(); } return; }

    function parti() {
      var parti = disegna(el, opzioni.titolo);
      var i = 0, t0 = Date.now(), ultimaFrase = 0;
      function passo() {
        var inizio = Date.now();
        /* piu' passi per giro, finche' il giro resta sotto i 90 ms: cosi'
           sul computer va svelto e sul telefono resta reattivo */
        while (i < quanti && Date.now() - inizio < 90) { faiPasso(i); i++; }
        var q = Math.round(100 * i / quanti);
        parti.barra.style.width = q + '%';
        parti.quota.textContent = q + ' %';
        var passati = Math.floor((Date.now() - t0) / 4000);
        if (passati !== ultimaFrase) { ultimaFrase = passati; parti.frase.textContent = FRASI[passati % FRASI.length]; }
        if (i < quanti) { setTimeout(passo, 16); }
        else { el.innerHTML = ''; if (allaFine) { allaFine(); } }
      }
      setTimeout(passo, 16);
    }

    /* si parte quando la sezione entra nello schermo (o subito, se non si puo' sapere) */
    var sentinella = opzioni.quandoVisibile;
    if (globale.IntersectionObserver && sentinella) {
      var oss = new IntersectionObserver(function (voci) {
        if (voci.some(function (v) { return v.isIntersecting; })) { oss.disconnect(); parti(); }
      }, { rootMargin: '300px 0px' });
      oss.observe(sentinella);
    } else { parti(); }
  }

  var API = { lavora: lavora, FRASI: FRASI };
  globale.Attesa = API;
  if (typeof module !== 'undefined' && module.exports) { module.exports = API; }
}(typeof window !== 'undefined' ? window : this));
