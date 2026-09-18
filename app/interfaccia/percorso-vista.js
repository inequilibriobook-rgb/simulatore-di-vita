/* =============================================================================
   SIMULATORE 3.0 — La barra del percorso, e il passo dopo
   =============================================================================
   Disegna due cose, uguali su tutte e dodici le pagine, da un dato solo
   (app/dati/percorso.js):

     in alto    una barra fissa con i quattro gradini numerati, quello dove
                sei acceso, piu' il menu delle altre sette pagine e le
                utilita' (glossario, stampa, tema)
     in fondo   il passo successivo, con scritto CHE COSA VEDE che qui non si
                puo' vedere — che e' la ragione per cui esiste

   Nessuna pagina deve ricordarsi di scrivere la propria navigazione: se
   domani si aggiunge un gradino, si aggiunge in un posto solo.
   ========================================================================== */
(function (globale) {
  'use strict';

  var P = globale.Percorso;
  var Lg = globale.Lingua;
  if (!P || !Lg) {
    throw new Error('percorso-vista.js: manca ' + (!P ? 'Percorso' : 'Lingua') +
      '. Carica app/motore/lingua.js e app/dati/percorso.js prima di questo file.');
  }

  /* LA MISURA DEL TESTO (17/09/2026).
     Tre misure — normale, grande, grandissimo — che valgono sugli schermi
     fino a 1100 px (il foglio di stile ignora l'attributo sopra). Il libro,
     capitolo 48, promette che il pacchetto non usa la memoria del browser:
     percio' la scelta non si salva, viaggia nell'indirizzo (?testo=grande)
     e passa da una pagina all'altra con i collegamenti interni, che la
     portano con se' quando si cliccano. Si applica qui, prima di disegnare
     la barra, cosi' la pagina non cambia misura sotto gli occhi. */
  var MISURE = ['normale', 'grande', 'grandissimo'];
  function misuraTesto() {
    return document.documentElement.getAttribute('data-testo') || 'normale';
  }
  function applicaMisura(m) {
    if (MISURE.indexOf(m) < 0) { m = 'normale'; }
    if (m === 'normale') { document.documentElement.removeAttribute('data-testo'); }
    else { document.documentElement.setAttribute('data-testo', m); }
    return m;
  }
  function conMisura(url, m) {
    /* toglie un eventuale ?testo= e, se la misura non e' normale, lo rimette
       prima del cancelletto */
    var pezzi = url.split('#');
    var base = pezzi[0].replace(/([?&])testo=[^&#]*&?/, '$1').replace(/[?&]$/, '');
    if (m !== 'normale') { base += (base.indexOf('?') >= 0 ? '&' : '?') + 'testo=' + m; }
    return base + (pezzi.length > 1 ? '#' + pezzi.slice(1).join('#') : '');
  }
  function scriviMisuraNellIndirizzo(m) {
    try {
      var nuovo = conMisura(globale.location.pathname + globale.location.search, m) + globale.location.hash;
      globale.history.replaceState(globale.history.state, '', nuovo);
    } catch (e) { /* su file:// qualche browser non lo permette: pazienza */ }
  }
  (function () {
    var t = /[?&]testo=([a-z]+)/.exec(globale.location.search);
    if (t) { applicaMisura(t[1]); }
  }());
  /* i collegamenti alle altre pagine del pacchetto portano con se' la misura */
  document.addEventListener('click', function (ev) {
    var m = misuraTesto();
    if (m === 'normale') { return; }
    var a = ev.target && ev.target.closest ? ev.target.closest('a[href]') : null;
    if (!a) { return; }
    var h = a.getAttribute('href') || '';
    if (/^[a-z]+:|^\/\//i.test(h) || h.charAt(0) === '#' || !/\.html(\?|#|$)/.test(h)) { return; }
    a.setAttribute('href', conMisura(h, m));
  }, true);

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function barra(qui) {
    var gradini = P.GRADINI.map(function (g) {
      var attivo = g.file === qui;
      return '<a class="gradino' + (attivo ? ' qui' : '') + '" href="' + g.file + '"' +
        (attivo ? ' aria-current="page"' : '') +
        ' title="' + esc(g.domanda) + '">' +
        '<span class="gradino-n">' + g.n + '</span>' +
        '<span class="gradino-testo"><b>' + esc(g.nome) + '</b>' +
        '<small>' + esc(g.durata) + '</small></span></a>';
    }).join('<span class="gradino-freccia" aria-hidden="true">›</span>');

    /* IL MENU DELLE PAGINE CHE NON STANNO SU UN GRADINO.
       Tre pillole in fila accanto al questionario si leggevano come una
       lista della spesa: quattro nomi affiancati, e niente che dicesse che
       cosa hanno in comune. In un menu, invece, il nome del menu lo dice.

       E' un vero menu, non un elenco che si apre: si comanda con la
       tastiera (Invio, frecce, Esc), si chiude cliccando fuori, e dichiara
       da solo se e' aperto — aria-expanded — cosi' chi usa un lettore di
       schermo sa che cosa sta per succedere prima di premere. */
    var dentroMenu = P.MENU.voci.some(function (v) { return v.file === qui; });

    function voceMenu(v) {
      var attivo = v.file === qui;
      return '<a class="voce-menu' + (attivo ? ' qui' : '') + '" href="' + v.file + '"' +
        (attivo ? ' aria-current="page"' : '') + ' role="menuitem">' +
        '<span class="voce-icona" aria-hidden="true">' + esc(v.icona) + '</span>' +
        '<span class="voce-testo"><b>' + esc(v.nome) + '</b>' +
        '<small>' + esc(v.breve) + '</small></span></a>';
    }

    /* IL MENU HA DEI GRUPPI, E I GRUPPI HANNO UN TITOLO.
       Le quattro voci non sono la stessa cosa: il questionario porta dove
       porta il primo gradino, per un'altra strada; le altre tre non
       portano da nessuna parte sulla scala — scendono sotto, e valgono per
       tutti e quattro i livelli. Quattro nomi in fila non lo direbbero.
       Il titolo del gruppo lo dice. */
    var vociMenu = P.MENU.gruppi.map(function (g) {
      var dentro = g.voci.map(function (f) {
        var v = P.voceDi(f);
        return v ? voceMenu(v) : '';
      }).join('');
      return '<div class="gruppo-menu" role="group" aria-label="' + esc(g.titolo) + '">' +
        '<p class="gruppo-titolo">' + esc(g.titolo) + '</p>' + dentro + '</div>';
    }).join('');

    var menu = '<div class="menu-giu' + (dentroMenu ? ' dentro' : '') + '">' +
      '<button type="button" class="porta apri-menu" id="barraMenu" ' +
        'aria-expanded="false" aria-haspopup="true" aria-controls="barraMenuTendina" ' +
        'title="' + esc(P.MENU.perche) + '">' +
        /* sul telefono il nome del menu e' piu' corto: «Pagine» al posto di
           «Le altre pagine», che da solo mangiava mezza barra */
        '<span class="porta-lungo">' + esc(P.MENU.nome) + '</span>' +
        '<span class="porta-corto">Pagine</span>' +
        '<span class="freccia-giu" aria-hidden="true">▾</span></button>' +
      '<div class="tendina" id="barraMenuTendina" role="menu" hidden>' + vociMenu +
      '</div></div>';

    var porta = menu;

    /* IL MENU A PANINO, PER GLI SCHERMI PICCOLI (17/09/2026).
       Su un telefono o un mini tablet i quattro bottoni in fila (pagine,
       glossario, stampa, tema) non ci stanno, e un'applicazione li mette
       dietro un tasto solo, quello con le tre righe. Dentro c'e' tutto:
       i quattro livelli con il nome intero (nella barra stretta restano i
       numeri), le altre pagine con i loro gruppi, e gli strumenti. Sul
       computer questo tasto non si vede, e restano i bottoni di sempre. */
    var livelliMenu = P.GRADINI.map(function (g) {
      var attivo = g.file === qui;
      return '<a class="voce-menu' + (attivo ? ' qui' : '') + '" href="' + g.file + '"' +
        (attivo ? ' aria-current="page"' : '') + ' role="menuitem">' +
        '<span class="voce-icona voce-numero" aria-hidden="true">' + g.n + '</span>' +
        '<span class="voce-testo"><b>' + esc(g.nome) + '</b>' +
        '<small>' + esc(g.durata) + '</small></span></a>';
    }).join('');
    var strumentiMenu =
      '<button type="button" class="voce-menu voce-strumento" data-strumento="glossario" role="menuitem">' +
        '<span class="voce-icona" aria-hidden="true">?</span>' +
        '<span class="voce-testo"><b>Glossario</b><small>l’indice delle parole spiegate</small></span></button>' +
      '<button type="button" class="voce-menu voce-strumento" data-strumento="stampa" role="menuitem">' +
        '<span class="voce-icona" aria-hidden="true">⎙</span>' +
        '<span class="voce-testo"><b>Stampa</b><small>questa pagina, per intero</small></span></button>' +
      '<button type="button" class="voce-menu voce-strumento" data-strumento="tema" role="menuitem">' +
        '<span class="voce-icona" aria-hidden="true">◐</span>' +
        '<span class="voce-testo"><b>Tema</b><small>chiaro o scuro</small></span></button>' +
      '<button type="button" class="voce-menu voce-strumento" data-strumento="testo" role="menuitem" id="vocePanTesto">' +
        '<span class="voce-icona" aria-hidden="true">Aa</span>' +
        '<span class="voce-testo"><b>Misura del testo</b>' +
        '<small class="misure-testo" aria-hidden="true"><span data-misura="normale">normale</span>' +
        '<span data-misura="grande">grande</span><span data-misura="grandissimo">grandissimo</span></small></span></button>';
    var sandwich = '<div class="menu-giu menu-sandwich">' +
      '<button type="button" class="porta apri-menu apri-sandwich" id="barraSandwich" ' +
        'aria-expanded="false" aria-haspopup="true" aria-controls="barraSandwichTendina" ' +
        'aria-label="Apri il menu" title="Menu">' +
        '<span class="sandwich" aria-hidden="true"><i></i><i></i><i></i></span>' +
        '<span class="sandwich-testo">Menu</span></button>' +
      '<div class="tendina tendina-sandwich" id="barraSandwichTendina" role="menu" hidden>' +
        '<div class="gruppo-menu" role="group" aria-label="I quattro livelli del tempo">' +
          '<p class="gruppo-titolo">I quattro livelli del tempo</p>' + livelliMenu + '</div>' +
        vociMenu +
        '<div class="gruppo-menu" role="group" aria-label="Strumenti">' +
          '<p class="gruppo-titolo">Strumenti</p>' + strumentiMenu + '</div>' +
      '</div></div>';

    return '<header class="app-barra no-stampa">' +
      '<div class="app-barra-dentro">' +
        /* il nome nella barra porta alla pagina di benvenuto (17/09/2026): e'
           l'unico modo di rivederla da dentro, e c'e' anche nel pacchetto */
        '<a class="marchio" href="index.html" title="La pagina di benvenuto">' +
          '<span class="marchio-nome">Simulatore di vita</span>' +
          '<span class="marchio-versione">3.0</span></a>' +
        '<nav class="percorso-scala" aria-label="I livelli del tempo, dal più corto al più lungo">' +
          gradini + '</nav>' +
        '<div class="app-strumenti">' + porta +
          '<button type="button" class="fantasma" id="barraGlossario" ' +
            'title="Apri l’indice delle parole spiegate">Glossario</button>' +
          '<button type="button" class="fantasma" id="barraStampa" title="Stampa questa pagina">Stampa</button>' +
          '<button type="button" class="fantasma" id="barraTema">Tema</button>' +
          /* Igor, 17/09: «un tastino tondo a fianco al tasto Menu, sempre
             visibile, tre T una piu' grande dell'altra, per cambiare al
             volo la grandezza del testo» — e la stessa voce anche nel menu */
          '<button type="button" class="tasto-testo" id="barraTesto" ' +
            'title="Misura del testo: normale, grande, grandissimo">' +
            '<span class="ttt" aria-hidden="true"><b>T</b><i>T</i><small>T</small></span>' +
            '<span class="solo-lettori">Cambia la misura del testo</span></button>' +
          sandwich +
        '</div>' +
      '</div></header>';
  }

  function passoDopo(qui) {
    var g = P.gradinoDi(qui);

    /* LE PAGINE SOTTO LA SCALA NON HANNO UN «DOPO».
       Non sono gradini: non c'e' un livello successivo da proporre. Ma
       lasciarle senza niente in fondo le rendeva vicoli chiusi — si
       arrivava alla matematica e non c'era piu' una strada. Percio' qui
       si riporta alla scala, e si dicono le altre due sorelle. */
    var v = P.voceDi(qui);
    if (v && v.file === P.PORTA.file) {
      /* il questionario NON sta sotto la scala: sta accanto al primo
         gradino, e il suo passo dopo e' il secondo gradino, come per chi
         e' arrivato dai cursori */
      var g2 = P.GRADINI[1];
      return '<section class="passo-dopo no-stampa">' +
        '<p class="passo-etichetta">Il passo dopo · livello ' + g2.n + ' di ' + P.GRADINI.length + '</p>' +
        '<h2>' + esc(g2.nome) + ' — ' + esc(g2.durata) + '</h2>' +
        '<p class="passo-perche">Qui hai costruito un nodo rispondendo a qualche domanda, e adesso puoi metterlo in fila con altri. ' +
        esc(g2.invito) + '</p>' +
        '<div class="passo-scelte">' +
        '<a class="bottone primario" href="' + g2.file + '">' + esc(g2.domanda) + '</a>' +
        '<a class="bottone secondario" href="' + P.GRADINI[0].file + '">Vedi lo stesso nodo con i cursori</a>' +
        '</div></section>';
    }
    /* LA LETTURA LUNGA NON HA UN «PASSO DOPO».
       Finisce con un capitolo che dice dove andare, scritto per esteso:
       una scatola in fondo che ripete le stesse quattro strade sarebbe la
       stessa cosa detta due volte, peggio la seconda. */
    if (v && v.file === 'IL-MODELLO.html') { return ''; }
    if (v) {
      var sorelle = P.sottoLaScala().filter(function (x) { return x.file !== qui; });
      /* «Le altre due» era scritto a mano quando sotto la scala c'erano tre
         pagine; alla quarta (INDAGINE) i bottoni sono diventati tre e il
         testo diceva ancora «due». Il numero si conta, e si scrive in
         lettere come lo scrive l'italiano. */
      var IN_LETTERE = ['nessuna', 'una', 'due', 'tre', 'quattro', 'cinque', 'sei'];
      var quante = IN_LETTERE[sorelle.length] || String(sorelle.length);
      return '<section class="passo-dopo no-stampa">' +
        '<p class="passo-etichetta">Questa pagina sta sotto la scala</p>' +
        '<h2>Vale per tutti e quattro i livelli</h2>' +
        '<p class="passo-perche">' + esc(P.MENU.perche) + ' Le altre ' + quante + ':</p>' +
        '<div class="passo-scelte">' +
          sorelle.map(function (x) {
            return '<a class="bottone secondario" href="' + x.file + '">' +
              '<span aria-hidden="true">' + esc(x.icona) + '</span> ' + esc(x.nome) + '</a>';
          }).join('') +
          '<a class="bottone primario" href="' + P.GRADINI[0].file + '">Torna alla scala</a>' +
        '</div></section>';
    }

    var pr = P.prossimo(qui);
    if (!pr) {
      /* l'ultimo gradino non ha un dopo: si torna all'inizio, e si dice perche' */
      return '<section class="passo-dopo no-stampa">' +
        '<p class="passo-etichetta">Sei in fondo alla scala</p>' +
        '<h2>Hai visto tutti e quattro i livelli</h2>' +
        '<p class="passo-perche">Ogni livello vede una cosa che quello prima non poteva vedere, e messi in fila dicono questo: ' +
        /* il nome porta gia' il suo articolo — «Il gesto», «La catena» —
           e basta abbassare la maiuscola. Prima toglievo l'articolo e ne
           rimettevo uno fisso, e usciva «il catena dice quanto costa». */
        /* Quattro voci separate solo da virgole restano sospese, come se
           mancasse ancora qualcosa: in italiano un elenco finisce con «e»,
           e la regola la sa lingua.js. */
        Lg.elenco(P.GRADINI.map(function (x) {
          return x.nome.charAt(0).toLowerCase() + x.nome.slice(1) + ' dice ' + x.vede;
        })) + '.</p>' +
        '<div class="passo-scelte">' +
        '<a class="bottone primario" href="' + P.GRADINI[0].file + '">Torna al gesto singolo</a>' +
        P.sottoLaScala().map(function (x) {
          return '<a class="bottone secondario" href="' + x.file + '">' +
            '<span aria-hidden="true">' + esc(x.icona) + '</span> ' + esc(x.nome) + '</a>';
        }).join('') +
        '</div></section>';
    }
    var da = g ? ('Qui hai visto ' + g.vede + '. ') : '';
    return '<section class="passo-dopo no-stampa">' +
      '<p class="passo-etichetta">Il passo dopo · livello ' + pr.n + ' di ' + P.GRADINI.length + '</p>' +
      '<h2>' + esc(pr.nome) + ' — ' + esc(pr.durata) + '</h2>' +
      '<p class="passo-perche">' + esc(da) + esc(pr.invito) + '</p>' +
      '<a class="bottone primario" href="' + pr.file + '">' + esc(pr.domanda) + '</a>' +
      '</section>';
  }

  /* I TITOLI DI SEZIONE ERANO 13 PIXEL IN MAIUSCOLETTO GRIGIO.
     Sono l'ossatura del percorso dentro la pagina — «1 · La scena»,
     «2 · Le condizioni» — e a quella dimensione non si vedevano: per
     scorrere la pagina e capire a che punto si era bisognava leggerli uno
     per uno. Il numero diventa un segno a se', come i gradini della barra,
     ma quadrato e leggero: quelli sono i LIVELLI, questi sono le sezioni
     di una pagina, e non vanno confusi. */
  function numeraSezioni() {
    Array.prototype.forEach.call(
      document.querySelectorAll('.riquadro > h2'), function (h) {
        if (h.querySelector('.sezione-n')) { return; }
        var m = h.textContent.match(/^\s*(\d+)\s*·\s*(.+)$/);
        if (!m) { return; }
        /* il titolo e' un collegamento alla sua sezione (17/09/2026: «rendiamo
           cliccabile quasi qualsiasi cosa»): un tocco porta la sezione in
           cima allo schermo e mette l'ancora nell'indirizzo, cosi' si puo'
           condividere il punto esatto della pagina */
        var sez = h.parentElement;
        if (sez && !sez.id) { sez.id = 'sezione-' + m[1]; }
        h.innerHTML = '<a class="sezione-link" href="#' + (sez ? sez.id : '') + '">' +
                      '<span class="sezione-n">' + esc(m[1]) + '</span>' +
                      '<span class="sezione-t">' + esc(m[2]) + '</span></a>';
      });
  }

  /* LA PARTE GIA' PERCORSA DEL CURSORE.
     WebKit non sa disegnare da solo il pieno a sinistra della manopola
     (Firefox si', con ::-moz-range-progress). Si calcola qui e si passa al
     foglio di stile come una variabile, che disegna un gradiente netto.

     Un ascoltatore solo sul documento: vale per i cursori di tutte e cinque
     le pagine, compresi quelli che l'interfaccia costruisce dopo, e nessuna
     pagina deve ricordarsi di chiamare niente. */
  function riempi(el) {
    var min = parseFloat(el.min || 0), max = parseFloat(el.max || 100);
    var v = parseFloat(el.value);
    var q = (max === min) ? 0 : (v - min) / (max - min);
    el.style.setProperty('--riempimento', (q * 100).toFixed(2) + '%');
  }
  function riempiTutti() {
    Array.prototype.forEach.call(document.querySelectorAll('input[type="range"]'), riempi);
  }

  function avvia() {
    var qui = P.qualePagina();
    numeraSezioni();

    /* I BOTTONI SENZA CLASSE.
       Tredici, sparsi sulle cinque pagine: «Reimposta», «Stampa», «Rifai le
       misure». Prendevano solo la regola base e sembravano importanti quanto
       il comando principale. Chi non ha una classe e' un comando di secondo
       livello: glielo si dice qui, una volta, invece di rincorrerli nei
       cinque file che li costruiscono. */
    function vestiBottoni() {
      Array.prototype.forEach.call(document.querySelectorAll('button'), function (b) {
        if (b.className) { return; }
        b.className = 'secondario';
      });
    }
    vestiBottoni();

    /* LE COLONNE DI NUMERI SI ALLINEANO A DESTRA (17/09/2026).
       Igor: «ricontrolla nelle tabelle l'ordine, l'allineamento: le colonne
       devono essere perfette». Una cella che contiene solo un numero (con il
       segno, la virgola, il per cento, il ±) prende la classe «num», che il
       foglio di stile allinea a destra con cifre di larghezza uguale; se in
       una colonna la maggior parte delle celle e' un numero, anche la sua
       intestazione va a destra, cosi' il titolo sta sopra le cifre. Vale per
       tutte le tabelle, comprese quelle che le pagine costruiscono dopo. */
    var NUMERO = /^[\s(−\-+±≈~]*\d[\d.,\s]*(%|‰|×|x|su\s*\d+|pt|px|s|h|min|gg|giorni|volte)?[\s)]*$/;
    function allineaTabelle(radice) {
      Array.prototype.forEach.call((radice || document).querySelectorAll('table'), function (tb) {
        var righe = tb.rows, colonne = 0, i, j;
        for (i = 0; i < righe.length; i++) { if (righe[i].cells.length > colonne) { colonne = righe[i].cells.length; } }
        /* quante colonne ha, per il foglio di stile: con due o tre colonne sul
           telefono la tabella sta intera, con di piu' scorre di lato */
        tb.classList.add('colonne-' + (colonne >= 4 ? 'molte' : 'poche'));
        for (j = 0; j < colonne; j++) {
          var numeriche = 0, totali = 0, teste = [];
          for (i = 0; i < righe.length; i++) {
            var c = righe[i].cells[j];
            if (!c) { continue; }
            if (c.tagName === 'TH' || righe[i].parentElement.tagName === 'THEAD') { teste.push(c); continue; }
            var t = (c.textContent || '').replace(/\s+/g, ' ').trim();
            if (!t || t === '—' || t === '–' || t === '·') { continue; }
            totali++;
            if (NUMERO.test(t)) { numeriche++; c.classList.add('num'); }
          }
          if (totali && numeriche >= Math.ceil(totali * 0.6)) {
            teste.forEach(function (h) { h.classList.add('num'); });
          }
        }
        /* LE TABELLE CHE RACCONTANO SI IMPILANO SUL TELEFONO (17/09/2026).
           Igor: «la tabellina viene pressata, compressa». Una tabella con tre
           o piu' colonne e una colonna di frasi intere (la tabella dei nove
           termini: nome, che cosa misura, valore, sposta) su 320-390 px
           diventa una colonna di parole una sotto l'altra. Percio' sotto i
           600 px ogni riga diventa una scheda: il nome in alto, la frase
           sotto, i numeri in fila con la loro intestazione davanti. Il
           foglio di stile fa il resto, con la classe «impila»; qui si
           decide quali tabelle, e si scrive su ogni cella il nome della
           sua colonna (data-etichetta). */
        if (colonne >= 3 && !tb.classList.contains('impila') && !tb.classList.contains('non-impilare')) {
          var lunga = false, testaRiga = null;
          for (i = 0; i < righe.length && !lunga; i++) {
            for (j = 0; j < righe[i].cells.length; j++) {
              var cc = righe[i].cells[j];
              if (cc.tagName === 'TD' && (cc.textContent || '').trim().length > 60) { lunga = true; break; }
            }
          }
          if (lunga) {
            tb.classList.add('impila');
            for (i = 0; i < righe.length; i++) {
              if (righe[i].cells.length && righe[i].cells[0].tagName === 'TH') { testaRiga = righe[i]; break; }
            }
            if (testaRiga) {
              testaRiga.classList.add('impila-testa');
              for (i = 0; i < righe.length; i++) {
                if (righe[i] === testaRiga) { continue; }
                for (j = 0; j < righe[i].cells.length; j++) {
                  var th = testaRiga.cells[j];
                  var cella = righe[i].cells[j];
                  if (th && !cella.hasAttribute('data-etichetta')) {
                    cella.setAttribute('data-etichetta', (th.textContent || '').trim());
                  }
                  /* le celle corte («aiuta», «toglie», una sigla) stanno in
                     fila con la loro intestazione, come i numeri, e tengono
                     il loro colore */
                  if (j > 0 && !cella.classList.contains('num') && (cella.textContent || '').trim().length <= 14) {
                    cella.classList.add('corta');
                  }
                }
              }
            }
          }
        }
      });
    }
    allineaTabelle();
    /* le tabelle costruite dopo (racconti, risultati) si allineano quando
       compaiono: si osserva il documento con un ritardo, per non lavorare
       a ogni singolo nodo aggiunto */
    if (globale.MutationObserver) {
      var attesa = null;
      new MutationObserver(function () {
        if (attesa) { return; }
        attesa = setTimeout(function () { attesa = null; allineaTabelle(); }, 150);
      }).observe(document.body, { childList: true, subtree: true });
    }

    /* le tabelle larghe scorrono dentro il proprio riquadro, non allargano
       la pagina: e' il caso della tabella tecnica del nodo su schermo stretto */
    Array.prototype.forEach.call(document.querySelectorAll('table.dati'), function (tb) {
      if (tb.parentElement && tb.parentElement.classList.contains('avvolgi-tabella')) { return; }
      var w = document.createElement('div');
      w.className = 'avvolgi-tabella';
      tb.parentNode.insertBefore(w, tb);
      w.appendChild(tb);
    });

    document.addEventListener('input', function (e) {
      if (e.target && e.target.type === 'range') { riempi(e.target); }
    });
    riempiTutti();
    if (typeof MutationObserver !== 'undefined') {
      new MutationObserver(riempiTutti).observe(document.body, { childList: true, subtree: true });
    }

    /* la barra va in cima al documento, fuori dal contenitore: e' la cornice
       dell'applicazione, non una parte del testo */
    var involucro = document.createElement('div');
    involucro.innerHTML = barra(qui);
    document.body.insertBefore(involucro.firstChild, document.body.firstChild);

    /* il passo dopo va in fondo al contenitore, prima del piede */
    var cont = document.querySelector('.contenitore');
    var piede = cont ? cont.querySelector('.piede') : null;
    if (cont) {
      var html = passoDopo(qui);
      if (html) {
        var d = document.createElement('div');
        d.innerHTML = html;
        if (piede) { cont.insertBefore(d.firstChild, piede); }
        else { cont.appendChild(d.firstChild); }
      }
    }

    /* i due bottoni della barra comandano quelli che le pagine avevano gia':
       non si duplica la logica, si preme il bottone che esiste */
    /* IL GLOSSARIO SI APRE DA QUALUNQUE PUNTO DELLA PAGINA.
       Le voci sono sempre quelle, scritte in un posto solo (spiegazioni.js) e
       disegnate da glossario.js: qui non si ricopia niente, si chiede a lui
       di aprirsi.
       ⚠️ E si chiede AL MOMENTO DEL CLIC, non adesso. Nelle pagine questo
       file e' caricato PRIMA di glossario.js — l'ordine e' giusto ed e'
       voluto — quindi qui `globale.Glossario` non esiste ancora. Guardarlo
       adesso avrebbe tolto il tasto da tutte e dodici le pagine, e senza
       dire niente a nessuno. Accorto prima di consegnarlo, l'11/09/2026.
       Se davvero manca, invece di non fare niente si porta il lettore al
       glossario in fondo alla pagina, che c'e' su undici pagine su dodici. */
    function apriGlossario() {
      if (globale.Glossario && globale.Glossario.apriIndice) {
        globale.Glossario.apriIndice();
        return;
      }
      var inFondo = document.querySelector('[data-glossario]');
      if (inFondo) { inFondo.scrollIntoView({ block: 'start' }); }
    }
    function stampa() {
      var v = document.getElementById('stampa');
      if (v) { v.click(); } else { globale.print(); }
    }
    function cambiaTema() {
      var v = document.getElementById('tema');
      if (!v) { return; }
      /* le transizioni si spengono per due fotogrammi: senza, il bottone
         principale resta del colore del tema precedente — misurato. */
      var radice = document.documentElement;
      radice.classList.add('cambio-tema');
      v.click();
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { radice.classList.remove('cambio-tema'); });
      });
    }
    /* la misura del testo: un giro fra le tre, e la barra e il menu lo dicono */
    function mostraMisura() {
      var m = misuraTesto();
      var bt = document.getElementById('barraTesto');
      if (bt) {
        bt.setAttribute('data-misura', m);
        bt.setAttribute('aria-label', 'Misura del testo: ' + m + '. Premi per cambiarla');
        bt.setAttribute('title', 'Misura del testo: ' + m + ' (premi per cambiarla)');
      }
      Array.prototype.forEach.call(document.querySelectorAll('.misure-testo span'), function (sp) {
        sp.classList.toggle('scelta', sp.getAttribute('data-misura') === m);
      });
    }
    function cambiaMisura() {
      var m = MISURE[(MISURE.indexOf(misuraTesto()) + 1) % MISURE.length];
      applicaMisura(m);
      scriviMisuraNellIndirizzo(m);
      mostraMisura();
      /* le formule si riadattano alla larghezza, e chi ascolta la finestra
         (le tabelle, le figure) si rimisura */
      if (globale.FormuleVista && globale.FormuleVista.adatta) { globale.FormuleVista.adatta(); }
      try { globale.dispatchEvent(new Event('resize')); } catch (e) { /* browser vecchio */ }
    }
    mostraMisura();
    var bTesto = document.getElementById('barraTesto');
    if (bTesto) { bTesto.addEventListener('click', cambiaMisura); }
    var gl = document.getElementById('barraGlossario');
    if (gl) { gl.addEventListener('click', apriGlossario); }
    var st = document.getElementById('barraStampa');
    if (st) { st.addEventListener('click', stampa); }
    var te = document.getElementById('barraTema');
    if (te) { te.addEventListener('click', cambiaTema); }
    /* gli stessi tre strumenti, dentro il menu a panino */
    Array.prototype.forEach.call(document.querySelectorAll('.voce-strumento'), function (b) {
      b.addEventListener('click', function () {
        var quale = b.getAttribute('data-strumento');
        if (quale === 'glossario') { apriGlossario(); }
        else if (quale === 'stampa') { stampa(); }
        else if (quale === 'tema') { cambiaTema(); }
        else if (quale === 'testo') { cambiaMisura(); return; /* il menu resta aperto: si vede la misura cambiare */ }
        var t = b.closest('.tendina');
        if (t) { t.hidden = true; }
        var m = b.closest('.menu-giu');
        if (m) { m.classList.remove('aperto'); var bt = m.querySelector('.apri-menu'); if (bt) { bt.setAttribute('aria-expanded', 'false'); } }
      });
    });

    /* IL MENU SI APRE, SI CHIUDE, E SI COMANDA CON LA TASTIERA.
       Non c'e' nessuna libreria: sono venti righe, e fanno le quattro cose
       che un menu deve fare — aprirsi, chiudersi cliccando fuori, chiudersi
       con Esc riportando il fuoco sul bottone, e scorrere con le frecce. */
    function montaMenu(bottoneMenu, tendina) {
      if (!bottoneMenu || !tendina) { return; }
      var apri = function (stato) {
        tendina.hidden = !stato;
        bottoneMenu.setAttribute('aria-expanded', stato ? 'true' : 'false');
        bottoneMenu.parentElement.classList.toggle('aperto', stato);
      };
      bottoneMenu.addEventListener('click', function (e) {
        e.stopPropagation();
        apri(tendina.hidden);
      });
      document.addEventListener('click', function (e) {
        if (tendina.hidden) { return; }
        if (!tendina.contains(e.target) && e.target !== bottoneMenu) { apri(false); }
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && !tendina.hidden) { apri(false); bottoneMenu.focus(); }
      });
      bottoneMenu.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowDown' || e.key === 'Down') {
          e.preventDefault(); apri(true);
          var prima = tendina.querySelector('.voce-menu');
          if (prima) { prima.focus(); }
        }
      });
      tendina.addEventListener('keydown', function (e) {
        var voci = Array.prototype.slice.call(tendina.querySelectorAll('.voce-menu'));
        var i = voci.indexOf(document.activeElement);
        if (e.key === 'ArrowDown' || e.key === 'Down') {
          e.preventDefault(); (voci[i + 1] || voci[0]).focus();
        } else if (e.key === 'ArrowUp' || e.key === 'Up') {
          e.preventDefault(); (voci[i - 1] || voci[voci.length - 1]).focus();
        }
      });
    }
    montaMenu(document.getElementById('barraMenu'), document.getElementById('barraMenuTendina'));
    montaMenu(document.getElementById('barraSandwich'), document.getElementById('barraSandwichTendina'));

    /* IL TASTO SOVRAPPOSTO PER TORNARE IN ALTO (17/09/2026).
       Igor: «metti sempre un tasto sovrapposto per tornare in alto e poter
       scegliere un altro capitolo: se sbaglio capitolo devo tornare indietro
       con un tasto, velocemente». Un tasto rotondo, fisso in basso a destra,
       che compare dopo una schermata di scorrimento. Nella lettura lunga
       porta in cima E apre l'indice dei capitoli; nelle altre pagine porta in
       cima, dove c'e' il menu. Solo sugli schermi stretti: sul computer c'e'
       la colonna dell'indice e la barra e' sempre sotto mano. */
    (function tornaInAlto() {
      var lettura = !!document.querySelector('.contenitore-lettura');
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'torna-in-alto no-stampa';
      b.setAttribute('aria-label', lettura ? 'Torna in alto e apri l’indice dei capitoli' : 'Torna in alto');
      b.innerHTML =
        /* la freccia e' disegnata dal foglio di stile (punta e asta), cosi'
           e' grossa e nitida a ogni misura */
        '<span class="freccia-su" aria-hidden="true"></span>' +
        '<small' + (lettura ? ' class="lunga"' : '') + '>' + (lettura ? 'Capitoli' : 'In alto') + '</small>';
      b.hidden = true;
      document.body.appendChild(b);
      b.addEventListener('click', function () {
        globale.scrollTo({ top: 0, behavior: 'smooth' });
        if (lettura) {
          var nav = document.querySelector('.indice-lettura');
          var tasto = nav && nav.querySelector('.indice-apri');
          if (nav && tasto && !nav.classList.contains('aperto')) { tasto.click(); }
        }
      });
      var ultimo = 0;
      function guarda() {
        var y = globale.scrollY || document.documentElement.scrollTop || 0;
        var mostra = y > 600;
        if (mostra !== !b.hidden) { b.hidden = !mostra; }
        ultimo = y;
      }
      var attesa = null;
      globale.addEventListener('scroll', function () {
        if (attesa) { return; }
        attesa = setTimeout(function () { attesa = null; guarda(); }, 120);
      }, { passive: true });
      guarda();
    }());

    /* le vecchie utilita' in alto a destra e la pila di link spariscono:
       adesso stanno nella barra */
    var vecchie = document.querySelector('.strumenti-alto');
    if (vecchie) { vecchie.classList.add('sostituita'); }
    Array.prototype.forEach.call(document.querySelectorAll('a.bottone'), function (a) {
      var p = a.parentElement;
      if (p && (p.tagName === 'P' || p.tagName === 'DIV') && !p.classList.contains('passo-scelte') && p.querySelectorAll('a.bottone').length >= 3) {
        p.classList.add('sostituita');
      }
    });
  }

  /* CHI STAMPA DEVE TROVARE SULLA CARTA QUELLO CHE C'E' A SCHERMO.
     I riquadri richiudibili — il calcolo di ogni gesto, il perche' dei
     valori, le parole non riconosciute — sono chiusi di partenza, e un
     riquadro chiuso sulla carta non c'e'. Stampando una scena da undici
     gesti usciva il guscio: i titoli, i numeri finali, e nessuno dei
     calcoli. Proprio la parte per cui si stampa.
     Si aprono prima di stampare e si richiudono dopo, cosi' chi torna alla
     pagina la ritrova come l'aveva lasciata. Il pulsante «Stampa» sta in
     questa barra, quindi la cosa vive qui: e' l'unico file caricato da
     tutte e dodici le pagine che abbia a che fare con la stampa. */
  var riaperti = [];
  function apriPerLaStampa() {
    riaperti = [];
    Array.prototype.forEach.call(document.querySelectorAll('details'), function (d) {
      if (!d.open) { riaperti.push(d); d.open = true; }
    });
  }
  function richiudiDopoLaStampa() {
    riaperti.forEach(function (d) { d.open = false; });
    riaperti = [];
  }
  if (typeof window !== 'undefined' && window.addEventListener) {
    window.addEventListener('beforeprint', apriPerLaStampa);
    window.addEventListener('afterprint', richiudiDopoLaStampa);
  }

  var API = { barra: barra, passoDopo: passoDopo, avvia: avvia,
              apriPerLaStampa: apriPerLaStampa, richiudiDopoLaStampa: richiudiDopoLaStampa };
  globale.PercorsoVista = API;
  if (typeof module !== 'undefined' && module.exports) { module.exports = API; }
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', avvia); }
    else { avvia(); }
  }
}(typeof window !== 'undefined' ? window : this));
