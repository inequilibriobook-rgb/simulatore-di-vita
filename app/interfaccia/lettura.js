/* =============================================================================
   SIMULATORE 3.0 — L'apparato della lettura lunga
   =============================================================================
   Script classico, nessuna libreria, nessuna rete.

   CHE COSA FA UN LIBRO CHE UNA PAGINA WEB NON FA
   Quattro cose, e sono tutte cose di orientamento. Un libro dice sempre a
   che punto sei: il numero di pagina, lo spessore fra le dita, il titolo
   corrente in cima, l'indice che si sfoglia. Una pagina che scorre non dice
   niente di tutto questo, e su un testo lungo il lettore si perde — non
   perche' il testo sia difficile, ma perche' non sa quanto manca.

   Questo modulo mette quelle quattro cose:

     l'indice        a lato, sempre visibile, con il capitolo corrente acceso
     l'avanzamento   una riga sottile in cima, che dice quanto resta
     i numeri        capitoli e figure numerati, e le figure citabili
     il ritorno      un modo di tornare in cima senza scorrere all'indietro

   E ne aggiunge una che il libro di carta non puo' avere: le figure si
   ricalcolano mentre il lettore cambia la scena.

   NIENTE MEMORIA DEL BROWSER
   Il capitolo 48 vieta di ricordare fra una apertura e l'altra: una pagina
   aperta da disco non ha un'identita' stabile, e cio' che il browser
   ricorda lo puo' perdere senza avvisare. Quindi l'avanzamento vale per la
   sessione e basta — e chi vuole tenere il segno stampa, che e' la strada
   che il capitolo 48 indica.
   ========================================================================== */
(function (globale) {
  'use strict';

  var Fig = globale.Figure;

  function esc(t) {
    return String(t).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* --------------------------------------------------------------------
     I NUMERI
     --------------------------------------------------------------------
     I capitoli si numerano di seguito, le figure pure. Non si scrivono a
     mano nell'HTML: se domani si aggiunge un capitolo in mezzo, tutti i
     rimandi resterebbero indietro. Qui i numeri li mette il codice, e i
     rimandi nel testo li cerca per nome — «vedi la figura della catena» si
     scrive `<a data-vedi="catena">`, e diventa «figura 9». */
  function numera() {
    var capitoli = document.querySelectorAll('.capitolo');
    Array.prototype.forEach.call(capitoli, function (sez, i) {
      var h = sez.querySelector('h2');
      if (!h || h.querySelector('.cap-numero')) { return; }
      var n = i + 1;
      sez.setAttribute('data-numero', n);
      if (!sez.id) { sez.id = 'cap-' + n; }
      h.innerHTML = '<span class="cap-numero">' + n + '</span>' +
                    '<span class="cap-titolo">' + h.innerHTML + '</span>';
    });

    var figure = document.querySelectorAll('.figura');
    var perNome = {};
    Array.prototype.forEach.call(figure, function (f, i) {
      f.setAttribute('data-n', i + 1);
      var nome = f.getAttribute('data-figura');
      if (nome) { perNome[nome] = i + 1; f.id = f.id || 'fig-' + nome; }
    });
    /* i rimandi nel testo */
    Array.prototype.forEach.call(document.querySelectorAll('[data-vedi]'), function (a) {
      var nome = a.getAttribute('data-vedi');
      var n = perNome[nome];
      if (!n) {
        /* Il rimando resta nel mezzo di una frase: deve dire che la figura
           citata non c'e', non lasciare un buco muto che sembra un refuso. */
        a.textContent = 'una figura che qui non c’è';
        a.className = 'rimando rotto';
        a.setAttribute('title', 'Il testo cita la figura «' + nome + '», che in questa ' +
          'pagina non è stata disegnata.');
        return;
      }
      a.className = 'rimando';
      a.setAttribute('href', '#fig-' + nome);
      if (!a.textContent.trim()) { a.textContent = 'figura ' + n; }
      else { a.textContent = a.textContent.replace(/\bfigura\b/i, 'figura ' + n); }
    });
    return perNome;
  }

  /* --------------------------------------------------------------------
     L'INDICE, E IL CAPITOLO CORRENTE
     -------------------------------------------------------------------- */
  function costruisciIndice() {
    var voci = [];
    var parteCorrente = null;
    Array.prototype.forEach.call(document.querySelectorAll('.parte, .capitolo'), function (el) {
      if (el.classList.contains('parte')) {
        parteCorrente = el.textContent.trim();
        voci.push({ tipo: 'parte', testo: parteCorrente });
        return;
      }
      var h = el.querySelector('.cap-titolo');
      voci.push({ tipo: 'capitolo', id: el.id, n: el.getAttribute('data-numero'),
                  testo: h ? h.textContent.trim() : '' });
    });

    var dentro = voci.map(function (v) {
      if (v.tipo === 'parte') {
        return '<p class="indice-parte">' + esc(v.testo) + '</p>';
      }
      return '<a class="indice-voce" href="#' + v.id + '" data-per="' + v.id + '">' +
        '<span class="indice-n">' + v.n + '</span>' + esc(v.testo) + '</a>';
    }).join('');

    var nav = document.createElement('nav');
    nav.className = 'indice-lettura no-stampa';
    nav.setAttribute('aria-label', 'Indice della lettura');
    nav.innerHTML = '<p class="indice-titolo">In questa lettura</p>' +
      /* il tasto che apre l'indice sugli schermi stretti (il foglio di stile
         lo mostra solo li'): dice «In questa lettura» e, accanto, il
         capitolo in cui si e' */
      '<button type="button" class="indice-apri no-stampa" aria-expanded="false">' +
        '<span class="indice-apri-icona" aria-hidden="true">☰</span>' +
        '<span class="indice-apri-testo">Indice dei capitoli</span>' +
        '<span class="freccia-giu" aria-hidden="true">▾</span></button>' +
      '<div class="indice-voci">' + dentro + '</div>';
    var tasto = nav.querySelector('.indice-apri');
    tasto.addEventListener('click', function () {
      var aperto = nav.classList.toggle('aperto');
      tasto.setAttribute('aria-expanded', aperto ? 'true' : 'false');
    });
    /* toccato un capitolo, l'indice si richiude */
    nav.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('.indice-voce')) {
        nav.classList.remove('aperto'); tasto.setAttribute('aria-expanded', 'false');
      }
    });
    return nav;
  }

  /* IL CAPITOLO CORRENTE, SENZA ASCOLTARE LO SCORRIMENTO.
     Un ascoltatore su «scroll» viene chiamato decine di volte al secondo e
     costringe a rileggere la posizione di ogni capitolo: su una pagina
     lunga si sente. IntersectionObserver fa la stessa cosa lasciando il
     lavoro al browser, che lo sa fare meglio. */
  function segui(voci) {
    if (typeof IntersectionObserver === 'undefined') { return; }
    var visibili = {};
    var osservatore = new IntersectionObserver(function (voci2) {
      voci2.forEach(function (v) { visibili[v.target.id] = v.isIntersecting; });
      var capitoli = Array.prototype.slice.call(document.querySelectorAll('.capitolo'));
      var attivo = null;
      for (var i = 0; i < capitoli.length; i++) {
        if (visibili[capitoli[i].id]) { attivo = capitoli[i].id; break; }
      }
      if (!attivo) { return; }
      Array.prototype.forEach.call(document.querySelectorAll('.indice-voce'), function (a) {
        var suo = a.getAttribute('data-per') === attivo;
        a.classList.toggle('qui', suo);

        if (suo && a.scrollIntoView) {
          var cont = a.closest('.indice-voci');
          if (cont && (a.offsetTop < cont.scrollTop ||
                       a.offsetTop > cont.scrollTop + cont.clientHeight - 40)) {
            cont.scrollTop = a.offsetTop - cont.clientHeight / 2;
          }
        }
      });
      var titolo = document.querySelector('.titolo-corrente');
      if (titolo) {
        var sez = document.getElementById(attivo);
        var t = sez ? sez.querySelector('.cap-titolo') : null;
        titolo.textContent = t ? (sez.getAttribute('data-numero') + ' · ' + t.textContent) : '';
      }
    }, { rootMargin: '-72px 0px -60% 0px', threshold: 0 });

    Array.prototype.forEach.call(document.querySelectorAll('.capitolo'), function (c) {
      osservatore.observe(c);
    });
  }

  /* --------------------------------------------------------------------
     L'AVANZAMENTO
     -------------------------------------------------------------------- */
  function avanzamento() {
    var barra = document.createElement('div');
    barra.className = 'avanzamento-lettura no-stampa';
    barra.innerHTML = '<i></i>';
    document.body.appendChild(barra);
    var fatto = barra.querySelector('i');
    var pendente = false;
    function aggiorna() {
      pendente = false;
      var alto = document.documentElement.scrollHeight - globale.innerHeight;
      var q = alto <= 0 ? 1 : Math.min(1, Math.max(0, globale.scrollY / alto));
      fatto.style.width = (q * 100).toFixed(2) + '%';
    }
    globale.addEventListener('scroll', function () {
      if (pendente) { return; }
      pendente = true;
      globale.requestAnimationFrame(aggiorna);
    }, { passive: true });
    aggiorna();
  }

  /* --------------------------------------------------------------------
     LE FIGURE
     -------------------------------------------------------------------- */
  function montaFigure() {
    if (!Fig) { return; }
    var elenco = document.querySelectorAll('.figura[data-figura]');
    Array.prototype.forEach.call(elenco, function (el) {
      var nome = el.getAttribute('data-figura');
      var def = Fig.FIGURE[nome];
      if (!def) {
        el.innerHTML = '<p class="figura-manca">Questa figura si chiama «' + esc(nome) +
          '», ma nessuno l’ha ancora disegnata: manca la sua voce in ' +
          '<code>app/interfaccia/figure.js</code>. Il resto della lettura funziona lo stesso.</p>';
        return;
      }
      var n = el.getAttribute('data-n');
      el.innerHTML =
        (def.titolo ? '<p class="figura-titolo">' + esc(def.titolo) + '</p>' : '') +
        (def.comandi ? '<div class="figura-comandi">' + def.comandi() + '</div>' : '') +
        '<div class="figura-tela"></div>' +
        '<figcaption><b>Figura ' + n + '</b> — ' + esc(def.didascalia || '') + '</figcaption>';

      var tela = el.querySelector('.figura-tela');
      /* UNA FIGURA CHE SI ROMPE NON DEVE PORTARSI VIA LE ALTRE.
         Senza questa rete, la prima figura che solleva un errore ferma il
         ciclo e tutte le figure successive restano vuote — che e' quello
         che e' successo la prima volta che questa pagina e' girata. Adesso
         la figura rotta si dichiara al suo posto, con il messaggio vero, e
         la lettura continua. */
      var disegnata = false;
      function rifai() {
        disegnata = true;
        try {
          if (def.primaDiDisegnare) { def.primaDiDisegnare(); }
          tela.innerHTML = def.disegna();
        } catch (e) {
          tela.innerHTML = '<p class="figura-manca">La figura «' + esc(nome) +
            '» non si è potuta disegnare, e il motivo è questo: ' +
            esc(e && e.message ? e.message : e) +
            '. Le altre figure della pagina non ne risentono.</p>';
          if (globale.console) { globale.console.error('[figura ' + nome + ']', e); }
        }
        if (globale.Glossario && globale.Glossario.decoraTutte) { globale.Glossario.decoraTutte(); }
      }
      el.__rifai = rifai;
      /* LE FIGURE SI DISEGNANO QUANDO SI ARRIVA A VEDERLE (17/09/2026).
         Sedici figure, alcune con centinaia di giocate dentro: disegnarle
         tutte all'apertura teneva ferma la pagina un secondo e mezzo sul
         computer, dieci sul telefono. Adesso ognuna si disegna quando entra
         nello schermo (con un margine di due schermate, cosi' e' pronta
         prima che il lettore ci arrivi); nel frattempo mostra una riga che
         dice che sta per arrivare. Se il browser non sa osservare, si
         disegna subito, come prima. Se qualcuno chiede di rifarla prima
         (i cursori della scena), si disegna in quel momento. */
      var rifaiUnaVolta = function () { if (!disegnata) { rifai(); } };
      if (globale.IntersectionObserver) {
        tela.innerHTML = '<p class="figura-attesa"><span aria-hidden="true">⏳</span> La figura si disegna fra un istante…</p>';
        var oss = new IntersectionObserver(function (voci) {
          if (voci.some(function (v) { return v.isIntersecting; })) { oss.disconnect(); rifaiUnaVolta(); }
        }, { rootMargin: '1200px 0px' });
        oss.observe(el);
      } else { rifaiUnaVolta(); }
      if (def.lega) {
        def.lega(el, function () {
          rifai();
          if (def.segueLaScena === undefined && !def.comandaLaScena) { return; }
        });
      }
    });

    /* LA SCENA CONDIVISA
       Chi muove i cursori del capitolo 2 deve vedere cambiare anche le
       figure dopo. Si rifanno solo quelle che dipendono dalla scena: le
       altre farebbero un lavoro inutile, e alcune costano secondi. */
    var taratura = document.querySelector('.figura[data-figura="taratura"]');
    if (taratura) {
      var def = Fig.FIGURE.taratura;
      if (def && def.lega) {
        def.lega(taratura, function () {
          taratura.__rifai();
          Fig.DIPENDENTI.forEach(function (nome) {
            var altra = document.querySelector('.figura[data-figura="' + nome + '"]');
            if (altra && altra.__rifai) { altra.__rifai(); }
          });
        });
      }
    }
  }

  /* --------------------------------------------------------------------
     AVVIO
     -------------------------------------------------------------------- */
  function avvia() {
    numera();
    /* gli id dei capitoli nascono qui, dopo che il browser ha gia' provato a
       raggiungere l'ancora dell'indirizzo (#cap-9, dai collegamenti di
       APRI-QUI): la si raggiunge adesso, a mano */
    if (location.hash && location.hash.indexOf('#cap-') === 0) {
      var bersaglio = document.getElementById(location.hash.slice(1));
      if (bersaglio) { setTimeout(function () { bersaglio.scrollIntoView({ block: 'start' }); }, 50); }
    }

    /* la cornice: indice a sinistra, testo al centro */
    var cont = document.querySelector('.contenitore-lettura');
    if (cont) {
      var indice = costruisciIndice();
      cont.insertBefore(indice, cont.firstChild);
      segui();
    }

    /* la riga con il titolo del capitolo corrente, come il titolo corrente
       in cima a una pagina stampata */
    var barra = document.querySelector('.app-barra');
    if (barra) {
      var riga = document.createElement('div');
      riga.className = 'riga-corrente no-stampa';
      riga.innerHTML = '<span class="titolo-corrente"></span>' +
        '<a class="torna-su" href="#cima">torna in cima</a>';
      barra.parentNode.insertBefore(riga, barra.nextSibling);
    }

    avanzamento();
    montaFigure();
  }

  globale.Lettura = { avvia: avvia, numera: numera };
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', avvia); }
    else { avvia(); }
  }
}(typeof window !== 'undefined' ? window : this));
