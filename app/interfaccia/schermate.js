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

   3. LE SCHEDE DEI RISULTATI — <section class="riquadro" data-scheda>
      (17/09/2026, sera) Igor: «le pagine-strumento restano lunghissime,
      i risultati sono tutti aperti in fila». Le sezioni consecutive con
      data-scheda diventano un gruppo di schede: se ne vede una alla volta,
      con una barra fissa in cima («‹ · Sezione 3 di 8: titolo ▾ · ›») che
      apre un elenco verticale delle sezioni — verticale, perche' Igor non
      vuole menu che scorrono di lato — e in fondo a ogni scheda il tasto
      «Dopo». Le schede nascoste NON sono display:none: stanno fuori dallo
      schermo, larghe come la pagina, cosi' le figure che vi vengono
      disegnate dentro hanno la larghezza giusta anche prima di essere
      viste. Le sezioni che partono nascoste (display:none finche' non c'e'
      un risultato) non compaiono nell'elenco finche' restano nascoste.
      L'indirizzo (#sezione-6) e i collegamenti data-apri mostrano la
      scheda giusta. In stampa si vedono tutte.
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
    var scheda = mostraSchedaDi(el);
    var sez = el.closest ? el.closest('.apribile') : null;
    if (sez && sez.__apri && !sez.classList.contains('aperta')) { sez.__apri(true); }
    /* se l'ancora sta dentro un passo, si mostra quel passo */
    var passo = el.closest ? el.closest('.passo') : null;
    if (passo && passo.parentElement.__mostra) {
      passo.parentElement.__mostra(parseInt(passo.getAttribute('data-passo'), 10) - 1, false);
    }
    if (sez || passo || scheda) { setTimeout(function () { el.scrollIntoView({ block: 'start' }); }, 60); }
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
    /* I FOGLI (18/09/2026). Igor: «usiamo la stessa tecnica per spezzare la
       lungaggine del testo nel modello letto per intero: micro post-it».
       Con data-fogli="4" la divisione non e' ai titoli <h3> (che li' non
       ci sono) ma a blocchi di quattro paragrafi, piu' o meno una
       schermata; una figura fa foglio da sola, con quello che la precede;
       il titolo del capitolo (h2) resta fuori, sopra tutti i fogli. */
    var perFoglio = parseInt(scheda.getAttribute('data-fogli') || '0', 10);
    var testa = null;
    if (perFoglio > 0) {
      figli.forEach(function (n) {
        var el = n.nodeType === 1;
        if (el && n.tagName === 'H2' && !passi.length && !corrente) { testa = n; return; }
        var figura = el && n.classList && n.classList.contains('figura');
        if (!corrente || corrente.nodi.length >= perFoglio || (figura && corrente.nodi.length >= 2)) {
          corrente = { titolo: null, nodi: [] };
          passi.push(corrente);
        }
        corrente.nodi.push(n);
        if (figura) { corrente = null; }
      });
      /* un ultimo foglio di un paragrafo solo si unisce a quello prima */
      if (passi.length > 1 && passi[passi.length - 1].nodi.length === 1 && passi[passi.length - 2].nodi.length < perFoglio + 2) {
        var ultimo = passi.pop(); passi[passi.length - 1].nodi = passi[passi.length - 1].nodi.concat(ultimo.nodi);
      }
    } else {
      figli.forEach(function (n) {
        var titolo = n.nodeType === 1 && n.tagName === 'H3';
        if (titolo || !corrente) {
          corrente = { titolo: titolo ? n : null, nodi: [] };
          passi.push(corrente);
          if (titolo) { return; }
        }
        corrente.nodi.push(n);
      });
    }
    passi = passi.filter(function (p) { return p.titolo || p.nodi.length; });
    if (passi.length < 2) { return; }

    scheda.innerHTML = '';
    if (testa) { scheda.appendChild(testa); }
    scheda.classList.add('passi');
    if (perFoglio > 0) { scheda.classList.add('fogli'); }
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
    /* SI SFOGLIA, E LO SCHERMO STA FERMO (Igor, 18/09/2026: «quando
       vado avanti lo schermo non deve salire né scendere: deve restare
       immobile, e si deve vedere l'effetto di sfogliare un foglio»). Prima
       ogni «Avanti» riportava la scheda in cima allo schermo; adesso la
       pagina non si muove. Il passo che se ne va ruota via da un lato, come
       un foglio che si gira, e il nuovo entra dall'altro; la direzione
       segue il verso (avanti: verso sinistra; indietro: verso destra). */
    var sfogliaInCorso = null;
    function mostra(k, sfoglia) {
      var prima = i;
      i = Math.max(0, Math.min(schermate.length - 1, k));
      var verso = i > prima ? 'avanti' : (i < prima ? 'indietro' : '');
      if (sfogliaInCorso) { clearTimeout(sfogliaInCorso.t); sfogliaInCorso.el.classList.remove('esce-avanti', 'esce-indietro'); sfogliaInCorso = null; }
      schermate.forEach(function (d, j) {
        d.classList.remove('entra-avanti', 'entra-indietro', 'esce-avanti', 'esce-indietro');
        d.classList.toggle('qui', j === i);
      });
      if (sfoglia && verso && prima !== i) {
        var vecchio = schermate[prima], nuovo = schermate[i];
        vecchio.classList.add('esce-' + verso);
        nuovo.classList.add('entra-' + verso);
        sfogliaInCorso = { el: vecchio, t: setTimeout(function () {
          vecchio.classList.remove('esce-' + verso);
          nuovo.classList.remove('entra-' + verso);
          sfogliaInCorso = null;
        }, 420) };
      }
      Array.prototype.forEach.call(punti, function (p, j) { p.classList.toggle('qui', j <= i); });
      indietro.disabled = (i === 0);
      avanti.hidden = (i === schermate.length - 1);
      dove.textContent = (i + 1) + ' di ' + schermate.length;
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

  /* ---------------------------------------------------------------------
     3. LE SCHEDE DEI RISULTATI
     --------------------------------------------------------------------- */
  function titoloDi(sez) {
    var h = sez.querySelector('h2');
    if (!h) { return sez.getAttribute('data-scheda') || ''; }
    var t = h.querySelector('.sezione-t');
    var testo = t ? t.textContent : h.textContent.replace(/^\s*\d+\s*·\s*/, '');
    return testo.replace(/\s+/g, ' ').trim();
  }
  function nascostaDaSola(sez) {
    /* la sezione che il codice della pagina tiene nascosta finche' non c'e'
       un risultato (attributo hidden) */
    return sez.hidden || (sez.style && sez.style.display === 'none');
  }
  function montaSchede(gruppo) {
    if (!gruppo.length || gruppo[0].__schede) { return; }
    var padre = gruppo[0].parentNode;
    padre.classList.add('con-schede');
    var nav = document.createElement('div');
    nav.className = 'schede-nav no-stampa';
    nav.innerHTML =
      '<button type="button" class="schede-prima" aria-label="Sezione precedente">‹</button>' +
      '<button type="button" class="schede-apri" aria-expanded="false" aria-haspopup="true">' +
        '<small class="schede-dove"></small><b class="schede-titolo"></b><span class="schede-freccia" aria-hidden="true">▾</span></button>' +
      '<button type="button" class="schede-dopo" aria-label="Sezione successiva">›</button>';
    var elenco = document.createElement('div');
    elenco.className = 'schede-elenco no-stampa';
    elenco.hidden = true;
    padre.insertBefore(nav, gruppo[0]);
    padre.insertBefore(elenco, gruppo[0]);
    var corrente = 0;

    function visibili() { return gruppo.filter(function (g) { return !nascostaDaSola(g); }); }
    function aggiorna() {
      var vis = visibili();
      var k = vis.indexOf(gruppo[corrente]);
      /* finche' nessuna scheda ha qualcosa da mostrare, la barra non c'e' */
      nav.hidden = vis.length === 0;
      if (vis.length === 0) { elenco.hidden = true; }
      nav.querySelector('.schede-dove').textContent = vis.length ? 'Sezione ' + (k + 1) + ' di ' + vis.length : '';
      nav.querySelector('.schede-titolo').textContent = titoloDi(gruppo[corrente]);
      nav.querySelector('.schede-prima').disabled = k <= 0;
      nav.querySelector('.schede-dopo').disabled = k < 0 || k >= vis.length - 1;
      elenco.innerHTML = vis.map(function (g) {
        var i = gruppo.indexOf(g);
        return '<button type="button" class="schede-voce' + (i === corrente ? ' qui' : '') + '" data-i="' + i + '">' +
          '<span class="schede-n">' + (vis.indexOf(g) + 1) + '</span><span>' + esc(titoloDi(g)) + '</span></button>';
      }).join('');
      /* in fondo a ogni scheda, il tasto per la successiva */
      gruppo.forEach(function (g, i) {
        var piede = g.querySelector(':scope > .schede-piede');
        if (!piede) {
          piede = document.createElement('div');
          piede.className = 'schede-piede no-stampa';
          g.appendChild(piede);
        }
        var j = vis.indexOf(g);
        var dopo = (j >= 0 && j < vis.length - 1) ? vis[j + 1] : null;
        piede.innerHTML = dopo
          ? '<button type="button" class="schede-avanti" data-i="' + gruppo.indexOf(dopo) + '">' +
              '<small>Dopo, sezione ' + (j + 2) + ' di ' + vis.length + '</small><b>' + esc(titoloDi(dopo)) + ' ›</b></button>'
          : '';
      });
    }
    function mostra(i, scorri) {
      if (i < 0 || i >= gruppo.length) { return; }
      corrente = i;
      gruppo.forEach(function (g, j) { g.classList.toggle('scheda-via', j !== i); g.classList.toggle('scheda-qui', j === i); });
      chiudiElenco();
      aggiorna();
      if (globale.FormuleVista && globale.FormuleVista.adatta) {
        setTimeout(function () { globale.FormuleVista.adatta(gruppo[i]); }, 30);
      }
      try { globale.dispatchEvent(new Event('resize')); } catch (e) { /* browser vecchio */ }
      if (scorri) {
        var r = nav.getBoundingClientRect();
        if (r.top < 0 || r.top > 140) { setTimeout(function () { nav.scrollIntoView({ block: 'start', behavior: 'smooth' }); }, 20); }
      }
    }
    function apriElenco() { elenco.hidden = false; nav.classList.add('aperto'); nav.querySelector('.schede-apri').setAttribute('aria-expanded', 'true'); }
    function chiudiElenco() { elenco.hidden = true; nav.classList.remove('aperto'); nav.querySelector('.schede-apri').setAttribute('aria-expanded', 'false'); }
    nav.querySelector('.schede-apri').addEventListener('click', function () { if (elenco.hidden) { apriElenco(); } else { chiudiElenco(); } });
    nav.querySelector('.schede-prima').addEventListener('click', function () {
      var vis = visibili(), k = vis.indexOf(gruppo[corrente]);
      if (k > 0) { mostra(gruppo.indexOf(vis[k - 1]), true); }
    });
    nav.querySelector('.schede-dopo').addEventListener('click', function () {
      var vis = visibili(), k = vis.indexOf(gruppo[corrente]);
      if (k >= 0 && k < vis.length - 1) { mostra(gruppo.indexOf(vis[k + 1]), true); }
    });
    elenco.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('.schede-voce') : null;
      if (b) { mostra(parseInt(b.getAttribute('data-i'), 10), true); }
    });
    padre.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('.schede-avanti') : null;
      if (b) { mostra(parseInt(b.getAttribute('data-i'), 10), true); }
    });
    /* le sezioni che si mostrano o si nascondono da sole aggiornano l'elenco */
    if (globale.MutationObserver) {
      var oss = new MutationObserver(function () {
        if (nascostaDaSola(gruppo[corrente])) {
          var vis = visibili();
          if (vis.length) { mostra(gruppo.indexOf(vis[0]), false); return; }
        }
        aggiorna();
      });
      gruppo.forEach(function (g) { oss.observe(g, { attributes: true, attributeFilter: ['style', 'hidden'] }); });
    }
    gruppo.forEach(function (g, i) {
      g.__schede = true;
      g.__mostraScheda = function (scorri) { mostra(i, scorri); };
    });
    var prima = visibili()[0];
    mostra(prima ? gruppo.indexOf(prima) : 0, false);
  }
  function montaTutteLeSchede() {
    var sezioni = Array.prototype.slice.call(document.querySelectorAll('section[data-scheda]'));
    var gruppi = [], attuale = [];
    sezioni.forEach(function (sez) {
      if (attuale.length) {
        /* consecutive: stesso genitore, e fra le due solo testo o elementi non-sezione senza data-scheda */
        var ultima = attuale[attuale.length - 1];
        var n = ultima.nextSibling, vicina = false;
        while (n) {
          if (n === sez) { vicina = true; break; }
          if (n.nodeType === 1 && n.tagName === 'SECTION') { break; }
          n = n.nextSibling;
        }
        if (vicina && sez.parentNode === ultima.parentNode) { attuale.push(sez); return; }
        gruppi.push(attuale); attuale = [];
      }
      attuale.push(sez);
    });
    if (attuale.length) { gruppi.push(attuale); }
    gruppi.forEach(function (g) { if (g.length > 1) { montaSchede(g); } });
  }
  function mostraSchedaDi(el) {
    var sez = el.closest ? el.closest('section[data-scheda]') : null;
    if (sez && sez.__mostraScheda && sez.classList.contains('scheda-via')) { sez.__mostraScheda(false); return true; }
    return false;
  }

  function avvia() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-passi], [data-fogli]'), montaPassi);
    montaTutteLeSchede();
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
      mostraSchedaDi(el);
      var sez = el.closest('.apribile') || el;
      if (sez.__apri) { sez.__apri(true); }
      if (el.__mostra) { el.__mostra(0, false); }
      setTimeout(function () { sez.scrollIntoView({ block: 'start', behavior: 'smooth' }); }, 40);
    });
  }

  var API = { montaApribile: montaApribile, montaPassi: montaPassi, montaSchede: montaTutteLeSchede, avvia: avvia };
  globale.Schermate = API;
  if (typeof module !== 'undefined' && module.exports) { module.exports = API; }
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', avvia); }
    else { avvia(); }
  }
}(typeof window !== 'undefined' ? window : this));
