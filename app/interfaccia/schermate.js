/* =============================================================================
   SIMULATORE 3.0 — Le schermate: sezioni che si aprono, schede a passi (17/09/2026)
   =============================================================================
   Script classico, nessuna libreria, nessuna rete.

   PERCHE' ESISTE
   Igor: «riorganizziamo la web app in modo che assomigli a un'app: non testo
   così lungo; pagine spezzate, con menu e sottomenu, tasti a cui arrivarci,
   ramificati; il lettore condotto per mano ma anche incuriosito ad aprire;
   non migliaia di righe già nella prima pagina». Il testo resta quello del
   libro; cambia come si arriva a vederlo. Questo modulo da' alle pagine due
   attrezzi, che si dichiarano nell'HTML con degli attributi:

   1. LE SEZIONI CHE SI APRONO — <section class="riquadro" data-apribile>
      Il titolo diventa un tasto grande; il contenuto sta chiuso finche' non
      lo si apre. Con data-aperta la sezione parte aperta. Con
      data-anteprima="…" sotto il titolo, da chiusa, c'e' una riga che dice
      che cosa c'e' dentro. Se l'indirizzo punta dentro la sezione (#teoria,
      #non-e), la sezione si apre da sola.

   2. LE SCHEDE A PASSI — un elemento con data-passi
      Il contenuto e' diviso ai suoi <h3>: ogni <h3> con quello che segue e'
      un passo, e quello che precede il primo <h3> e' il passo di apertura.
      Si vede un passo per volta, con «Indietro», «Avanti», i puntini che
      dicono a che punto si e', e un'uscita sempre visibile
      (data-uscita="PAGINA.html" data-uscita-testo="…"). Sull'ultimo passo
      compare, se c'e', la scelta finale (un elemento con data-passi-fine
      dentro la scheda).
   ========================================================================== */
(function (globale) {
  'use strict';

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ----------------------------- le sezioni che si aprono ----------------- */
  function montaApribile(sez) {
    if (sez.__apribile) { return; }
    sez.__apribile = true;
    var h2 = sez.querySelector(':scope > h2');
    if (!h2) { return; }
    /* percorso-vista puo' aver gia' avvolto il titolo in un collegamento:
       qui il titolo e' un tasto, e il collegamento si toglie */
    var link = h2.querySelector('.sezione-link');
    if (link) { h2.innerHTML = link.innerHTML; }

    var corpo = document.createElement('div');
    corpo.className = 'apribile-corpo';
    var figli = Array.prototype.slice.call(sez.childNodes);
    figli.forEach(function (n) { if (n !== h2) { corpo.appendChild(n); } });

    var tasto = document.createElement('button');
    tasto.type = 'button';
    tasto.className = 'apribile-tasto';
    tasto.setAttribute('aria-expanded', 'false');
    tasto.innerHTML = '<span class="apribile-titolo">' + h2.innerHTML + '</span>' +
      (sez.getAttribute('data-anteprima')
        ? '<span class="apribile-anteprima">' + esc(sez.getAttribute('data-anteprima')) + '</span>' : '') +
      '<span class="apribile-freccia" aria-hidden="true">▾</span>';
    h2.innerHTML = '';
    h2.appendChild(tasto);
    h2.className = (h2.className ? h2.className + ' ' : '') + 'apribile-testa';
    sez.appendChild(corpo);
    sez.classList.add('apribile');

    function apri(stato) {
      sez.classList.toggle('aperta', stato);
      tasto.setAttribute('aria-expanded', stato ? 'true' : 'false');
      if (stato && globale.FormuleVista && globale.FormuleVista.adatta) {
        setTimeout(function () { globale.FormuleVista.adatta(sez); }, 30);
      }
    }
    tasto.addEventListener('click', function () {
      var ora = !sez.classList.contains('aperta');
      apri(ora);
      if (ora) {
        /* la sezione appena aperta si porta in vista, sotto la barra */
        setTimeout(function () { sez.scrollIntoView({ block: 'start', behavior: 'smooth' }); }, 40);
      }
    });
    sez.__apri = apri;
    apri(sez.hasAttribute('data-aperta'));
  }

  function apriPerAncora() {
    var h = globale.location.hash;
    if (!h || h.length < 2) { return; }
    var el = document.getElementById(h.slice(1));
    if (!el) { return; }
    var sez = el.closest ? el.closest('.apribile') : null;
    if (sez && sez.__apri && !sez.classList.contains('aperta')) { sez.__apri(true); }
    /* se l'ancora sta dentro un passo, si mostra quel passo */
    var passo = el.closest ? el.closest('.passo') : null;
    if (passo && passo.parentElement.__mostra) {
      passo.parentElement.__mostra(parseInt(passo.getAttribute('data-passo'), 10) - 1, false);
    }
    if (sez || passo) { setTimeout(function () { el.scrollIntoView({ block: 'start' }); }, 60); }
  }

  /* ----------------------------- le schede a passi ------------------------ */
  function montaPassi(scheda) {
    if (scheda.__passi) { return; }
    scheda.__passi = true;
    var fine = scheda.querySelector('[data-passi-fine]');
    if (fine) { fine.parentNode.removeChild(fine); }
    var figli = Array.prototype.slice.call(scheda.childNodes).filter(function (n) {
      return !(n.nodeType === 3 && !n.nodeValue.trim());
    });
    var passi = [], corrente = null;
    figli.forEach(function (n) {
      var titolo = n.nodeType === 1 && n.tagName === 'H3';
      if (titolo || !corrente) {
        corrente = { titolo: titolo ? n : null, nodi: [] };
        passi.push(corrente);
        if (titolo) { return; }
      }
      corrente.nodi.push(n);
    });
    passi = passi.filter(function (p) { return p.titolo || p.nodi.length; });
    if (passi.length < 2) { return; }

    scheda.innerHTML = '';
    scheda.classList.add('passi');
    var schermate = passi.map(function (p, i) {
      var d = document.createElement('div');
      d.className = 'passo';
      d.setAttribute('data-passo', i + 1);
      if (p.titolo) { d.appendChild(p.titolo); }
      p.nodi.forEach(function (n) { d.appendChild(n); });
      scheda.appendChild(d);
      return d;
    });
    if (fine) { fine.classList.add('passi-fine'); schermate[schermate.length - 1].appendChild(fine); }

    var uscita = scheda.getAttribute('data-uscita');
    var uscitaTesto = scheda.getAttribute('data-uscita-testo') || 'Basta così: portami al simulatore';
    var nav = document.createElement('div');
    nav.className = 'passi-nav no-stampa';
    nav.innerHTML =
      '<button type="button" class="secondario passi-indietro">← Indietro</button>' +
      '<span class="passi-punti" aria-hidden="true">' +
        schermate.map(function (_, i) { return '<i data-a="' + (i + 1) + '"></i>'; }).join('') + '</span>' +
      '<span class="passi-dove"></span>' +
      '<button type="button" class="primario passi-avanti">Avanti →</button>' +
      (uscita ? '<a class="passi-uscita" href="' + esc(uscita) + '">' + esc(uscitaTesto) + '</a>' : '');
    scheda.appendChild(nav);

    var indietro = nav.querySelector('.passi-indietro');
    var avanti = nav.querySelector('.passi-avanti');
    var dove = nav.querySelector('.passi-dove');
    var punti = nav.querySelectorAll('.passi-punti i');
    var i = 0;
    function mostra(k, scorri) {
      i = Math.max(0, Math.min(schermate.length - 1, k));
      schermate.forEach(function (d, j) { d.classList.toggle('qui', j === i); });
      Array.prototype.forEach.call(punti, function (p, j) { p.classList.toggle('qui', j <= i); });
      indietro.disabled = (i === 0);
      avanti.hidden = (i === schermate.length - 1);
      dove.textContent = (i + 1) + ' di ' + schermate.length;
      if (scorri) { scheda.scrollIntoView({ block: 'start', behavior: 'smooth' }); }
      if (globale.FormuleVista && globale.FormuleVista.adatta) {
        setTimeout(function () { globale.FormuleVista.adatta(schermate[i]); }, 30);
      }
    }
    indietro.addEventListener('click', function () { mostra(i - 1, true); });
    avanti.addEventListener('click', function () { mostra(i + 1, true); });
    Array.prototype.forEach.call(punti, function (p) {
      p.addEventListener('click', function () { mostra(parseInt(p.getAttribute('data-a'), 10) - 1, true); });
    });
    scheda.__mostra = mostra;
    mostra(0, false);
  }

  function avvia() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-passi]'), montaPassi);
    Array.prototype.forEach.call(document.querySelectorAll('section[data-apribile]'), montaApribile);
    apriPerAncora();
    globale.addEventListener('hashchange', apriPerAncora);
    /* un collegamento con data-apri="#id" apre la sezione e ci porta */
    document.addEventListener('click', function (e) {
      var a = e.target.closest ? e.target.closest('[data-apri]') : null;
      if (!a) { return; }
      var el = document.querySelector(a.getAttribute('data-apri'));
      if (!el) { return; }
      e.preventDefault();
      var sez = el.closest('.apribile') || el;
      if (sez.__apri) { sez.__apri(true); }
      if (el.__mostra) { el.__mostra(0, false); }
      setTimeout(function () { sez.scrollIntoView({ block: 'start', behavior: 'smooth' }); }, 40);
    });
  }

  var API = { montaApribile: montaApribile, montaPassi: montaPassi, avvia: avvia };
  globale.Schermate = API;
  if (typeof module !== 'undefined' && module.exports) { module.exports = API; }
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', avvia); }
    else { avvia(); }
  }
}(typeof window !== 'undefined' ? window : this));
