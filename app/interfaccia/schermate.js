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
    /* IL TITOLO RESTA FUORI DAI FOGLI, sempre (18/09/2026, dal Redmi di
       Igor). Nel modello letto per intero il titolo del capitolo — l'h2 —
       finiva dentro il primo foglio e dal secondo in poi spariva: e allora
       l'ancora «sul titolo» non aveva piu' un titolo. Un occhiello e un h2
       in testa alla sezione stanno sopra tutti i fogli, in ogni modalita'. */
    var testa = null, testaNodi = [];
    while (figli.length && figli[0].nodeType === 1 &&
           (figli[0].tagName === 'H2' || (figli[0].classList && figli[0].classList.contains('occhiello') && !testa))) {
      var t = figli.shift();
      testaNodi.push(t);
      if (t.tagName === 'H2') { testa = t; break; }
    }
    if (!testa) { figli = testaNodi.concat(figli); testaNodi = []; }
    if (perFoglio > 0) {
      figli.forEach(function (n) {
        var el = n.nodeType === 1;
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
      /* il livello del titolo che divide: h3 di norma; data-passi="h4" per
         i racconti, che i motori scrivono con titoletti h4 */
      var tagTitolo = (scheda.getAttribute('data-passi') || '').toUpperCase() === 'H4' ? 'H4' : 'H3';
      figli.forEach(function (n) {
        var titolo = n.nodeType === 1 && n.tagName === tagTitolo;
        if (titolo || !corrente) {
          corrente = { titolo: titolo ? n : null, nodi: [] };
          passi.push(corrente);
          if (titolo) { return; }
        }
        corrente.nodi.push(n);
      });
    }
    passi = passi.filter(function (p) { return p.titolo || p.nodi.length; });
    /* data-passi-per="2": due parti per foglio (il racconto in otto parti
       faceva otto «Avanti»: troppi, ha detto Igor; quattro fogli da due
       parti si leggono meglio) */
    var per = parseInt(scheda.getAttribute('data-passi-per') || '1', 10);
    if (per > 1 && passi.length > 2) {
      var uniti = [];
      passi.forEach(function (p, k) {
        if (k % per === 0 || !uniti.length) { uniti.push({ titolo: p.titolo, nodi: p.nodi.slice() }); }
        else {
          var u = uniti[uniti.length - 1];
          if (p.titolo) { u.nodi.push(p.titolo); }
          u.nodi = u.nodi.concat(p.nodi);
        }
      });
      passi = uniti;
    }
    if (passi.length < 2) { return; }

    scheda.innerHTML = '';
    testaNodi.forEach(function (n) { scheda.appendChild(n); });
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
    /* il titolo su cui passa l'onda: quello della sezione che contiene i
       passi (per i fogli e' l'h2 del capitolo; per una scheda dentro una
       sezione apribile e' il titolo del tasto) */
    var sezioneTitolo = scheda.closest('section, .capitolo, .riquadro') || scheda;
    var titolo = sezioneTitolo.querySelector('.apribile-titolo') || sezioneTitolo.querySelector('.cap-titolo') ||
                 sezioneTitolo.querySelector('.sezione-t') || sezioneTitolo.querySelector('h2');
    function segnalibro(passo) {
      var s = passo.querySelector(':scope > .segnalibro');
      if (!s) {
        s = document.createElement('span');
        s.className = 'segnalibro no-stampa';
        passo.insertBefore(s, passo.firstChild);
      }
      return s;
    }
    /* L'ANCORA, MISURATA DAL VIVO (18/09/2026, dal Redmi Note 9S di Igor:
       «sul mio Android non funziona come sull'iPhone»). Prima la distanza
       dalla barra era un numero fisso nel foglio di stile, tarato su uno
       schermo solo, e lo scorrimento passava per scrollIntoView, che su
       Chrome per Android eredita lo scorrimento morbido della pagina: il
       titolo arrivava a posto in ottocento millisecondi, scivolando sotto
       il foglio che girava. Adesso si misura la barra fissa com'e' su
       questo schermo (piu' la riga del capitolo corrente e la barra delle
       schede, quando ci sono), si mette il titolo — o la cima della scheda,
       se un titolo non c'e' — a 36 px sotto, e lo si fa di colpo,
       spegnendo per un istante lo scorrimento morbido. L'ancoraggio
       automatico del browser (che «tiene fermo» il contenuto quando la
       pagina cambia altezza) e' spento sui fogli, se no rispingeva la
       pagina da sola. */
    var SOTTO_LA_BARRA = 36;
    function spazioFisso() {
      var sopra = 0;
      var fissi = [document.querySelector('.app-barra'), document.querySelector('.riga-corrente')];
      var gruppo = scheda.closest('.con-schede');
      if (gruppo) { fissi.push(gruppo.querySelector(':scope > .schede-nav')); }
      fissi.forEach(function (el) {
        if (!el) { return; }
        var cs = getComputedStyle(el);
        var r = el.getBoundingClientRect();
        if (r.height <= 0 || cs.display === 'none' || cs.visibility === 'hidden') { return; }
        if (cs.position === 'sticky' || cs.position === 'fixed') { sopra = Math.max(sopra, (parseFloat(cs.top) || 0) + r.height); }
      });
      return sopra;
    }
    function portaAllAncora() {
      /* la mira e' il titolo della sezione (quello su cui passa l'onda);
         se non c'e' o e' nascosto, l'h2 in testa ai fogli; se no la scheda */
      function visibile(el) { return !!el && el.getBoundingClientRect().height > 0; }
      var mira = visibile(titolo) ? titolo : (visibile(testa) ? testa : scheda);
      var y = Math.max(0, window.pageYOffset + mira.getBoundingClientRect().top - spazioFisso() - SOTTO_LA_BARRA);
      var radice = document.documentElement;
      var prima = radice.style.scrollBehavior;
      radice.style.scrollBehavior = 'auto';
      try { window.scrollTo({ top: y, left: 0, behavior: 'instant' }); } catch (e) { window.scrollTo(0, y); }
      if (Math.abs(window.pageYOffset - y) > 1) { window.scrollTo(0, y); }
      radice.style.scrollBehavior = prima;
      return y;
    }
    function mostra(k, sfoglia) {
      var prima = i;
      i = Math.max(0, Math.min(schermate.length - 1, k));
      var verso = i > prima ? 'avanti' : (i < prima ? 'indietro' : '');
      if (sfogliaInCorso) {
        clearTimeout(sfogliaInCorso.t1); clearTimeout(sfogliaInCorso.t2); clearTimeout(sfogliaInCorso.t3);
        sfogliaInCorso.vecchio.classList.remove('esce-avanti', 'esce-indietro');
        sfogliaInCorso.nuovo.classList.remove('entra-avanti', 'entra-indietro');
        scheda.style.minHeight = '';
        sfogliaInCorso = null;
      }
      schermate.forEach(function (d) {
        d.classList.remove('entra-avanti', 'entra-indietro', 'esce-avanti', 'esce-indietro', 'appena-sfogliato');
        var sb = d.querySelector(':scope > .segnalibro'); if (sb) { sb.hidden = true; }
      });
      if (sfoglia && verso && prima !== i) {
        /* LO SFOGLIARE (Igor, 18/09/2026: «più professionale, niente
           dissolvenza strana, niente scatti, non troppo veloce»). Come si
           gira una pagina vera: il foglio nuovo e' gia' sotto, fermo; il
           foglio vecchio, sopra, ruota intorno al suo bordo — quello
           sinistro andando avanti, quello destro tornando indietro — fino
           a girarsi del tutto, e quando mostra il dorso sparisce. Nessuna
           trasparenza: si vede il foglio girare e quello sotto scoprirsi.
           Sette decimi di secondo, con una curva che parte piano e frena
           piano. L'altezza della sezione resta quella del foglio piu' alto
           finche' dura il movimento, cosi' niente salta. */
        var vecchio = schermate[prima], nuovo = schermate[i];
        var hV = vecchio.getBoundingClientRect().height;
        nuovo.classList.add('qui');
        var hN = nuovo.getBoundingClientRect().height;
        scheda.style.minHeight = Math.max(hV, hN) + 'px';
        vecchio.classList.add('esce-' + verso);
        nuovo.classList.add('entra-' + verso);
        var sb = segnalibro(nuovo);
        sb.textContent = 'Continua da qui · foglio ' + (i + 1) + ' di ' + schermate.length;
        sb.hidden = false;
        nuovo.classList.add('appena-sfogliato');
        if (titolo) { titolo.classList.remove('onda'); void titolo.offsetWidth; titolo.classList.add('onda'); }
        var stato = { vecchio: vecchio, nuovo: nuovo };
        sfogliaInCorso = stato;
        stato.t1 = setTimeout(function () {
          vecchio.classList.remove('qui', 'esce-' + verso);
          nuovo.classList.remove('entra-' + verso);
          scheda.style.minHeight = '';
          sfogliaInCorso = null;
        }, 980);
        stato.t2 = setTimeout(function () { if (titolo) { titolo.classList.remove("onda"); } }, 2300);
      } else {
        schermate.forEach(function (d, j) { d.classList.toggle('qui', j === i); });
      }
      Array.prototype.forEach.call(punti, function (p, j) { p.classList.toggle('qui', j <= i); });
      indietro.disabled = (i === 0);
      avanti.hidden = (i === schermate.length - 1);
      dove.textContent = (i + 1) + ' di ' + schermate.length;
      /* L'ANCORA E' IL TITOLO (Igor, 18/09/2026): «quando vado avanti o
         indietro il titolo — "3 · La formula in una riga" — deve tornare
         sempre alla stessa altezza, con il bordo superiore dello schermo
         come riferimento assoluto». Quindi a ogni foglio la sezione va in
         cima, di colpo e non con lo scorrimento morbido, cosi' il titolo
         sta esattamente dove stava: lo sfogliare avviene sotto un titolo
         fermo. Lo spazio per la barra fissa lo da' scroll-margin-top. */
      if (sfoglia && verso && prima !== i) {
        var yAncora = portaAllAncora();
        /* a fine sfogliata, se nessuno ha toccato la pagina nel frattempo,
           si ricontrolla: un carattere arrivato tardi o una riga in piu'
           sopra possono aver spostato il titolo di qualche pixel */
        if (sfogliaInCorso) {
          sfogliaInCorso.t3 = setTimeout(function () {
            if (Math.abs(window.pageYOffset - yAncora) < 2) { portaAllAncora(); }
          }, 1000);
        }
      }
      if (globale.FormuleVista && globale.FormuleVista.adatta) {
        setTimeout(function () { globale.FormuleVista.adatta(schermate[i]); }, 30);
      }
    }
    indietro.addEventListener('click', function () { mostra(i - 1, true); });
    avanti.addEventListener('click', function () { mostra(i + 1, true); });
    /* SI SFOGLIA ANCHE COL DITO E CON LE FRECCE (18/09/2026). Un trascinamento
       orizzontale di almeno 60 px sul foglio (e non piu' di 40 in verticale,
       per non confondersi con lo scorrimento) gira il foglio; le frecce
       sinistra/destra della tastiera fanno lo stesso quando il fuoco e'
       dentro la scheda. I campi di testo e i cursori sono esclusi. */
    var t0 = null;
    scheda.addEventListener('touchstart', function (e) {
      if (!e.touches || e.touches.length !== 1) { t0 = null; return; }
      if (e.target.closest && e.target.closest('input, textarea, select, .avvolgi-tabella, .formula-libro')) { t0 = null; return; }
      t0 = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now() };
    }, { passive: true });
    scheda.addEventListener('touchend', function (e) {
      if (!t0 || !e.changedTouches || !e.changedTouches.length) { return; }
      var dx = e.changedTouches[0].clientX - t0.x, dy = e.changedTouches[0].clientY - t0.y;
      var veloce = Date.now() - t0.t < 700;
      t0 = null;
      if (!veloce || Math.abs(dx) < 60 || Math.abs(dy) > 40) { return; }
      if (dx < 0) { mostra(i + 1, true); } else { mostra(i - 1, true); }
    }, { passive: true });
    scheda.addEventListener('keydown', function (e) {
      if (e.target.closest && e.target.closest('input, textarea, select')) { return; }
      if (e.key === 'ArrowRight') { e.preventDefault(); mostra(i + 1, true); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); mostra(i - 1, true); }
    });
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

  /* I RACCONTI SI SFOGLIANO (18/09/2026). Il racconto in prosa di ogni
     pagina (#racconto) lo scrive il motore a ogni calcolo, con un titoletto
     h4 per parte: sintesi, che cosa e' successo, le leve, che cosa fare.
     Ogni volta che viene riscritto, lo si rimonta a passi, un h4 per
     foglio, con lo stesso flip card. Si osserva il contenitore: quando
     cambia e non ha piu' la sua barra, si rimonta. */
  function sfogliaRacconti() {
    var racconti = document.querySelectorAll('#racconto, [data-passi-vivo]');
    if (!racconti.length || !globale.MutationObserver) { return; }
    Array.prototype.forEach.call(racconti, function (r) {
      if (!r.getAttribute('data-passi')) { r.setAttribute('data-passi', r.getAttribute('data-passi-vivo') || 'h4'); }
      if (!r.getAttribute('data-passi-per')) { r.setAttribute('data-passi-per', '2'); }
      var attesa = null;
      function rimonta() {
        if (r.querySelector(':scope > .passi-nav')) { return; }
        if (r.querySelectorAll(':scope > h4, :scope > h3').length < 2) { return; }
        r.__passi = false;
        r.classList.remove('passi');
        montaPassi(r);
      }
      new MutationObserver(function () {
        if (attesa) { return; }
        attesa = setTimeout(function () { attesa = null; rimonta(); }, 60);
      }).observe(r, { childList: true });
      rimonta();
    });
  }

  function avvia() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-passi], [data-fogli]'), montaPassi);
    sfogliaRacconti();
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
