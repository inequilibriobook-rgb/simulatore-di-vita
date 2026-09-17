/* =============================================================================
   SIMULATORE 3.0 — Mille volte la stessa scena
   =============================================================================
   Script classico, nessun modulo, nessuna fetch: funziona da file://

   CHE COS'E' QUESTA PAGINA
   Le altre pagine tirano il dado una volta e raccontano com'e' andata.
   Questa lo tira mille volte e mostra che cosa succede in generale.

   Non e' la stessa cosa, e la differenza e' quella che il libro insiste a
   non far confondere (capitolo 27, i due assi):

     GRANULARITA'   quanti nodi DISTINTI ha la scena. Lo decide la
                    descrizione, non un cursore.
     RIPETIZIONI    quante volte si rigioca la STESSA catena con dadi
                    diversi. Non cambia il numero di nodi: cambia la
                    confidenza.

   L'unita' statistica e' LA GIOCATA DELLA SCENA, non il nodo. Duemila
   valutazioni di venti nodi ripetuti cento volte NON sono n = 2000: sono
   n = 100. La pagina lo scrive ogni volta, in chiaro.

   E la regola per sapere quando fermarsi non e' un numero di giri. E' il
   capitolo 47: «si guarda l'ampiezza dell'intervallo, non il numero di
   iterazioni. Se l'intervallo e' stretto abbastanza per la domanda che si
   sta facendo, le ripetizioni bastano. Se e' largo, non bastano, e non
   importa quante siano.»

   ⚠️ UNA COSA SOLA, UN NOME SOLO: GIOCATA.
   Il 10/09/2026 una rilettura ha contato, per la stessa identica cosa —
   una partita completa della scena, rigiocata con dadi diversi — sei nomi
   diversi a schermo: «run», «giocate», «corse», «giri», «iterazioni»,
   «prove». Sei nomi non sono sei sfumature: sono sei cose, per chi legge,
   e chi legge passa il tempo a chiedersi in che cosa differiscono.

   Il nome e' GIOCATA, al singolare e al plurale, e non ne esistono altri.
   Non e' una preferenza di gusto: e' la parola che MONTECARLO.html
   definisce per esteso all'inizio — «ogni volta che la scena riparte
   dall'inizio con dadi nuovi, quella partita si chiama giocata» — e' il
   titolo della sezione 8 («Quante giocate bastano»), ed e' quella che il
   motore dichiara da solo in analisi.js e in inferenza.js, nel campo
   `unita_statistica`: «una giocata intera della scena».

   Il verbo resta «giocare» e «rigiocare»: «la scena e' stata rigiocata
   500 volte» e' italiano buono, e non fa concorrenza al nome.

   Il comando che sceglie quante farne si chiama «Giocate», come la cosa
   che conta: prima diceva «Ripetizioni», e il titolo della sezione due
   centimetri sopra diceva «giocate».
   ========================================================================== */
(function () {
  'use strict';

  var A = window.Analisi, N = window.Nucleo, St = window.Stato,
      S = window.Spiegazioni, C = window.Casi, MS = window.MicroSemantica,
      Lg = window.Lingua;

  (function (mancanti) {
    if (!mancanti.length) { return; }
    throw new Error('montecarlo-ui.js: manca ' + mancanti.join(', ') +
      '. Ordine di caricamento: calibrazione.js, lingua.js, casuale-mt.js, nucleo.js, ' +
      'stato.js, microsemantica.js, analisi.js, spiegazioni.js, casi.js, e solo dopo ' +
      'questo file.');
  }([['Analisi', A], ['Nucleo', N], ['Stato', St], ['Spiegazioni', S], ['Casi', C],
     ['Lingua', Lg]]
    .filter(function (x) { return !x[1]; })
    .map(function (x) { return x[0]; })));

  function esc(t) {
    return String(t).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function q(id) { return document.getElementById(id); }
  /* IL MENO E' QUELLO DELLA MATEMATICA (−), NON IL TRATTINO DELLA TASTIERA (-).
     toLocaleString scriveva «-10,5» con il trattino, e a due centimetri il
     resto del simulatore scrive «−5 punti» con il segno vero, come fa
     Lingua.numero. Due segni per la stessa cosa nella stessa riga. Si
     corregge qui, nell'unico punto da cui escono i numeri di questa pagina. */
  function num(x, d) {
    return Number(x).toLocaleString('it-IT', { maximumFractionDigits: d === undefined ? 1 : d })
      .replace(/^-/, '−');
  }
  /* DUE NUMERI NELLA STESSA FRASE VOGLIONO LO STESSO NUMERO DI DECIMALI.
     «La fascia fra 49,33 e 49,4» si legge come se il secondo numero fosse
     meno preciso del primo, e non lo è: è solo uno zero finale che si perde.
     Dove due estremi stanno accanto, i decimali si fissano. */
  function numFisso(x, d) {
    return Number(x).toLocaleString('it-IT',
      { minimumFractionDigits: d, maximumFractionDigits: d }).replace(/^-/, '−');
  }
  /* rilegge un numero scritto in italiano, per poter controllare se i conti
     tornano CON I NUMERI CHE SI VEDONO e non con quelli che ci sono sotto
     (e il meno vero torna a essere il trattino che Number() sa leggere) */
  function daScritto(t) {
    return Number(String(t).replace(/^−/, '-').replace(/\./g, '').replace(',', '.'));
  }


  /* ---------------------------------------------------------------------
     LA SCENA DA RIGIOCARE
     ---------------------------------------------------------------------
     Due modi, e sono i due assi. Un gesto solo: una scheda del libro,
     granularita' 1. Una catena: piu' gesti distinti, granularita' vera. */
  var stato = {
    /* SI PARTE DALLA CATENA, NON DAL GESTO SINGOLO.
       Con un nodo solo lo stato finale non si muove: il trasferimento
       misurato e' il 4,6 % (capitolo 28), e un gesto lo sposta di una
       frazione di punto che si perde nell'arrotondamento. L'istogramma
       esce con una barra sola — corretto, e illeggibile come prima cosa
       da vedere. La lezione del 4,6 % si impara meglio DOPO aver visto
       una distribuzione vera, scegliendo «un gesto solo» dal menu. */
    quantiNodi: 30,
    scheda: 'porta',
    ripetizioni: 500,
    seme: 424242,
    soglia: 0.1,
    calibrazione: 'misurata',
    leva: 'STR', delta: -10
  };
  function unGestoSolo() { return stato.quantiNodi === 1; }

  /* I NOMI DELLE LUNGHEZZE NON SI SCRIVONO QUI.
     Vengono dalle scale di granularita' del motore (analisi.js): se un
     giorno cambiassero, il menu direbbe una cosa e il riquadro degli assi
     un'altra — «una sequenza lunga» nel menu e «scena breve» due sezioni
     piu' sotto, per lo stesso numero di nodi. E' successo. */
  var LUNGHEZZE = [1, 9, 30, 60, 120].map(function (n) {
    return { n: n, etichetta: A.scalaPer(n).etichetta + ' · ' + n +
      (n === 1 ? ' gesto' : ' gesti') };
  });

  var GESTI = [
    'sentire la sveglia', 'alzarsi dal letto', 'lavarsi il viso', 'vestirsi',
    'preparare la borsa', 'cercare le chiavi', 'non trovare le chiavi',
    'controllare le tasche', 'rovistare nel cassetto', 'trovare le chiavi',
    'prendere il telefono', 'controllare l’ora', 'fretta improvvisa',
    'spegnere le luci', 'chiudere il gas', 'aprire la porta', 'uscire e chiudere',
    'scendere le scale', 'attraversare la strada', 'aspettare il verde',
    'salire sul mezzo', 'trovare posto', 'rispondere a un messaggio',
    'scendere alla fermata', 'camminare in fretta', 'aprire un portone',
    'salutare qualcuno', 'sedersi', 'accendere lo schermo', 'ricominciare'
  ];
  function nomeGesto(i) { return GESTI[i % GESTI.length]; }

  function calibrazioneScelta() {
    if (!MS) { return null; }
    return stato.calibrazione === 'storica' ? MS.STORICA : MS.CALIBRAZIONE;
  }

  function nodoDaScheda(caso, modifica) {
    var v = caso.valori, m = modifica || {};
    function con(k) { return m[k] === undefined ? v[k] : m[k]; }
    return {
      id: caso.id, descrizione: caso.titolo, p0: N.clampInt(con('P0'), 1, 99),
      modificatori: {
        energia_e: N.clampInt(con('E'), -30, 30), informazione_i: N.clampInt(con('I'), -30, 30),
        tempo_t: N.clampInt(con('T'), -30, 30), materiale_m: N.clampInt(con('M'), -30, 30),
        bonus_bp: N.clampInt(con('BP'), 0, 20), complessita_c: N.clampInt(con('C'), 0, 10)
      },
      stato_prima: { stress_str: N.clampInt(con('STR'), 0, 100), posizione_pos: 60,
                     debito_deb: N.clampInt(con('DEB'), 0, 5), rip: 'debole' }
    };
  }

  function schedaCorrente() {
    return C.CASI.filter(function (c) { return c.id === stato.scheda; })[0] ||
           C.CASI.filter(function (c) { return c.pn !== null; })[0];
  }

  /* LA CATENA NON E' LA STESSA SCHEDA RIPETUTA.
     Se lo fosse, sarebbe una replica — trenta righe che cambiano solo per
     il dado — e la verifica di granularita' la denuncerebbe, giustamente:
     non aggiungono informazione e falsano le statistiche.
     Quindi ogni gesto ha il suo nome e i suoi numeri, derivati da quelli
     della scheda ma diversi fra loro. La scheda decide il tono della
     sequenza, non i suoi singoli anelli. */
  function catenaCorrente(modifica) {
    var caso = schedaCorrente();
    var base = nodoDaScheda(caso, modifica);
    if (unGestoSolo()) { return [base]; }
    var quanti = stato.quantiNodi, out = [];
    for (var i = 0; i < quanti; i++) {
      out.push({
        id: 'g' + i, descrizione: nomeGesto(i),
        p0: N.clampInt(base.p0 - (i % 5) * 4, 1, 99),
        modificatori: {
          energia_e: N.clampInt(base.modificatori.energia_e - (i % 4) * 2, -30, 30),
          informazione_i: N.clampInt(base.modificatori.informazione_i - (i % 3), -30, 30),
          tempo_t: N.clampInt(base.modificatori.tempo_t - Math.floor(i / 5) * 2, -30, 30),
          materiale_m: N.clampInt(base.modificatori.materiale_m - (i % 3), -30, 30),
          bonus_bp: base.modificatori.bonus_bp,
          complessita_c: N.clampInt(base.modificatori.complessita_c + (i % 2), 0, 10)
        },
        stato_prima: base.stato_prima
      });
    }
    return out;
  }

  function corri(modifica, ripetizioni) {
    return A.montecarlo(catenaCorrente(modifica), {
      ripetizioni: ripetizioni || stato.ripetizioni,
      seme: stato.seme,
      calibrazione: calibrazioneScelta()
    });
  }

  /* ---------------------------------------------------------------------
     L'ISTOGRAMMA — la forma della distribuzione, non il suo riassunto
     --------------------------------------------------------------------- */
  function disegnaIstogramma(campione, riass, titolo, tinta, compatto) {
    var h = A.istogramma(campione, { fasce: compatto ? 8 : 14 });
    if (!h) {
      return '<p class="nota">Qui non c’è ancora niente da disegnare. La scena non ha ' +
        'prodotto nessun numero da mettere in un istogramma. Prova a ripeterla, oppure ' +
        'aumenta il numero di ripetizioni qui sopra.</p>';
    }

    /* TUTTE LE RIPETIZIONI ALLO STESSO NUMERO.
       Succede davvero, e non e' un caso limite da nascondere: e' la
       saturazione del capitolo 29. Quando il carico arriva al tetto, un
       gesto pessimo e uno catastrofico danno lo stesso numero, e il modello
       smette di distinguere. Un istogramma con una barra sola e' la forma
       giusta per dirlo — e prima qui usciva un grafico vuoto, perche' la
       scala orizzontale divideva per un intervallo largo zero. */
    if (h.degenere) {
      return '<div class="istogramma-piatto">' +
        '<p class="piatto-num">' + num(h.minimo) + '</p>' +
        '<p class="piatto-dice">Tutte e ' + h.n + ' le ripetizioni finiscono sullo stesso ' +
        'valore di <b>' + esc(titolo) + '</b>. Non c’è una distribuzione da mostrare. ' +
        'C’è un solo risultato possibile.' +
        (h.minimo >= 100
          ? ' A cento il modello ha raggiunto il tetto (il massimo del carico, oltre il ' +
            'quale non si sale). Da lì in su non distingue più fra un gesto pessimo e uno ' +
            'catastrofico. Il capitolo 29 la chiama saturazione: a questa scala il modello ' +
            'ha smesso di dire qualcosa.'
          : '') +
        '</p></div>';
    }

    /* IN COLONNA STRETTA IL DISEGNO VA RIMPICCIOLITO, NON SOLO SCALATO.
       Un SVG largo 900 dentro una colonna da 330 px si scala di un terzo,
       e con lui il testo: le etichette degli assi finivano a quattro pixel
       e mezzo, illeggibili. Un riquadro piu' piccolo tiene il testo alla
       stessa dimensione apparente delle altre scritte della pagina. */
    var W = compatto ? 460 : 900, H = compatto ? 200 : 260;
    var L = compatto ? 34 : 44, R = compatto ? 12 : 16;
    var T = compatto ? 22 : 26, B = compatto ? 40 : 46;
    var pw = W - L - R, ph = H - T - B;
    var maxN = Math.max.apply(null, h.fasce.map(function (f) { return f.n; }));
    var largo = pw / h.fasce.length;
    var g = [];

    /* la banda fra il decimo e il novantesimo percentile — quelli che il
       capitolo 47 nomina per dire quanto la scena e' stabile: dove finisce
       l'ottanta per cento delle ripetizioni */
    var primo = h.fasce[0].da, ultimo = h.fasce[h.fasce.length - 1].a;
    var ampiezza = Math.max(1e-9, ultimo - primo);
    var scalaX = function (v) { return L + (v - primo) / ampiezza * pw; };
    if (riass) {
      g.push('<rect x="' + scalaX(riass.p10) + '" y="' + T + '" width="' +
        Math.max(1, scalaX(riass.p90) - scalaX(riass.p10)) + '" height="' + ph +
        '" fill="var(--inchiostro-3)" opacity="0.07"/>');
    }

    [0, 0.25, 0.5, 0.75, 1].forEach(function (f) {
      var y = T + ph - f * ph;
      g.push('<line x1="' + L + '" y1="' + y + '" x2="' + (W - R) + '" y2="' + y +
        '" stroke="var(--griglia)" stroke-width="1"/>');
      g.push('<text x="' + (L - 9) + '" y="' + (y + 4) + '" text-anchor="end" font-size="10.5" ' +
        'fill="var(--inchiostro-3)">' + Math.round(f * maxN) + '</text>');
    });

    h.fasce.forEach(function (f, i) {
      var alt = maxN ? f.n / maxN * ph : 0;
      var x = L + i * largo;
      if (f.n > 0) {
        g.push('<rect x="' + (x + 1.5) + '" y="' + (T + ph - alt) + '" width="' +
          Math.max(1, largo - 3) + '" height="' + alt + '" rx="3" fill="' + tinta + '" opacity="0.86">' +
          '<title>da ' + f.da + ' a ' + f.a + ': ' +
          Lg.plurale(f.n, 'ripetizione', 'ripetizioni') + ' su ' + h.n +
          ' (' + Math.round(f.quota * 100) + '%)</title></rect>');
      }
      if (i % Math.ceil(h.fasce.length / 8) === 0) {
        g.push('<text x="' + x + '" y="' + (H - 24) + '" text-anchor="middle" font-size="10.5" ' +
          'fill="var(--inchiostro-3)">' + f.da + '</text>');
      }
    });

    if (riass) {
      /* la media, e l'intervallo al 95 % SULLA MEDIA — che e' una cosa
         diversa dalla dispersione, e va detto perche' si confondono sempre */
      var xm = scalaX(riass.media);
      g.push('<line x1="' + xm + '" y1="' + (T - 6) + '" x2="' + xm + '" y2="' + (T + ph) +
        '" stroke="var(--inchiostro)" stroke-width="2"/>');
      g.push('<text x="' + xm + '" y="' + (T - 10) + '" text-anchor="middle" font-size="11" ' +
        'font-weight="700" fill="var(--inchiostro)">media ' + num(riass.media) + '</text>');
      var xmed = scalaX(riass.mediana);
      g.push('<line x1="' + xmed + '" y1="' + T + '" x2="' + xmed + '" y2="' + (T + ph) +
        '" stroke="var(--inchiostro-3)" stroke-width="1.5" stroke-dasharray="4 3"/>');
    }

    g.push('<line x1="' + L + '" y1="' + (T + ph) + '" x2="' + (W - R) + '" y2="' + (T + ph) +
      '" stroke="var(--linea-base)" stroke-width="1.5"/>');
    g.push('<text x="' + (L + pw / 2) + '" y="' + (H - 6) + '" text-anchor="middle" font-size="10.5" ' +
      'fill="var(--inchiostro-3)">' + esc(titolo) + ' · fasce da ' + h.passo + '</text>');

    return '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" style="max-width:100%;height:auto" ' +
      'role="img" aria-label="Istogramma di ' + esc(titolo) + ' su ' + h.n +
      ' ripetizioni">' +
      g.join('') + '</svg>';
  }

  /* ---------------------------------------------------------------------
     LA CONVERGENZA — quanto si stringe l'intervallo mentre n sale
     --------------------------------------------------------------------- */
  function disegnaConvergenza(conv) {
    if (!conv) {
      return '<p class="nota">Per vedere come si stringe l’intervallo servono almeno ' +
        'due ripetizioni. Con una sola non c’è ancora niente da confrontare. Scegli un ' +
        'numero più alto nel comando «Ripetizioni» qui sopra.</p>';
    }
    var W = 900, H = 280, L = 48, R = 18, T = 22, B = 40;
    var pw = W - L - R, ph = H - T - B;
    var s = conv.serie;
    var nMax = s[s.length - 1].n, nMin = s[0].n;
    var tutti = s.map(function (p) { return p.basso; }).concat(s.map(function (p) { return p.alto; }));
    var yMin = Math.min.apply(null, tutti), yMax = Math.max.apply(null, tutti);
    var pad = Math.max(1, (yMax - yMin) * 0.12);
    yMin -= pad; yMax += pad;

    var x = function (n) { return L + (n - nMin) / Math.max(1, nMax - nMin) * pw; };
    var y = function (v) { return T + ph - (v - yMin) / Math.max(1e-9, yMax - yMin) * ph; };
    var g = [];

    g.push('<defs><linearGradient id="bandaConv" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="var(--azione)" stop-opacity="0.24"/>' +
      '<stop offset="1" stop-color="var(--azione)" stop-opacity="0.08"/></linearGradient></defs>');

    [0, 0.5, 1].forEach(function (f) {
      var yy = T + f * ph;
      g.push('<line x1="' + L + '" y1="' + yy + '" x2="' + (W - R) + '" y2="' + yy +
        '" stroke="var(--griglia)" stroke-width="1"/>');
      g.push('<text x="' + (L - 9) + '" y="' + (yy + 4) + '" text-anchor="end" font-size="10.5" ' +
        'fill="var(--inchiostro-3)">' + num(yMax - f * (yMax - yMin)) + '</text>');
    });

    var banda = 'M ' + x(s[0].n) + ' ' + y(s[0].alto);
    s.forEach(function (p) { banda += ' L ' + x(p.n) + ' ' + y(p.alto); });
    for (var i = s.length - 1; i >= 0; i--) { banda += ' L ' + x(s[i].n) + ' ' + y(s[i].basso); }
    banda += ' Z';
    g.push('<path d="' + banda + '" fill="url(#bandaConv)"/>');

    var linea = 'M ' + x(s[0].n) + ' ' + y(s[0].media);
    s.forEach(function (p) { linea += ' L ' + x(p.n) + ' ' + y(p.media); });
    g.push('<path d="' + linea + '" fill="none" stroke="var(--azione)" stroke-width="2.4" ' +
      'stroke-linejoin="round"/>');

    if (conv.basta_a !== null) {
      g.push('<line x1="' + x(conv.basta_a) + '" y1="' + T + '" x2="' + x(conv.basta_a) +
        '" y2="' + (T + ph) + '" stroke="var(--buono)" stroke-width="2" stroke-dasharray="5 4"/>');
      g.push('<rect x="' + (x(conv.basta_a) - 46) + '" y="' + (T + 2) + '" width="92" height="17" rx="8.5" fill="var(--buono)"/>');
      g.push('<text x="' + x(conv.basta_a) + '" y="' + (T + 14) + '" text-anchor="middle" ' +
        'font-size="10.5" font-weight="700" fill="#fff">bastano ' + conv.basta_a + '</text>');
    }

    [nMin, Math.round((nMin + nMax) / 2), nMax].forEach(function (n) {
      g.push('<text x="' + x(n) + '" y="' + (H - 14) + '" text-anchor="middle" font-size="10.5" ' +
        'fill="var(--inchiostro-3)">' + num(n, 0) + '</text>');
    });
    g.push('<text x="' + (L + pw / 2) + '" y="' + (H - 1) + '" text-anchor="middle" font-size="10.5" ' +
      'fill="var(--inchiostro-3)">ripetizioni</text>');

    return '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" style="max-width:100%;height:auto" ' +
      'role="img" aria-label="Come si stringe l’intervallo di confidenza mentre le ripetizioni salgono">' +
      g.join('') + '</svg>' +
      '<div class="legenda">' +
      '<span class="voce-legenda"><i class="segno linea" style="background:var(--azione)"></i>la media, man mano</span>' +
      '<span class="voce-legenda"><i class="segno" style="background:var(--azione);opacity:.24"></i>l’intervallo al 95 % sulla media</span>' +
      (conv.basta_a !== null
        ? '<span class="voce-legenda"><i class="segno tratteggio"></i>da qui l’intervallo è più stretto della soglia</span>'
        : '') +
      '</div>';
  }

  /* ---------------------------------------------------------------------
     CHE COSA SI MUOVE INSIEME — la regressione descrittiva
     ---------------------------------------------------------------------
     Il capitolo dei limiti lo chiede per nome, e lo chiede insieme alla sua
     avvertenza: «quando si hanno diecimila giocate, è facile e tentante
     cercare quali variabili si muovono insieme. Il simulatore lo fa. Ma
     accompagna il risultato con un'avvertenza che non è di stile».

     Qui l'avvertenza non e' scritta a mano in questa pagina: arriva dal
     motore, dentro lo stesso oggetto che porta il numero (analisi.js). E'
     l'unico modo per essere sicuri che le due cose restino attaccate: non
     affidarle alla prudenza di chi scrive il testo.

     LA NUVOLA E' PROPRIO IL PUNTO DEBOLE, E VA MOSTRATA.
     «Una relazione debole, vista su un grafico, sembra fortissima.» Il modo
     onesto di dirlo non e' nascondere il grafico: e' disegnarlo, tirarci
     dentro la retta, e scrivere accanto quanto poco quella retta spiega. */

  /* LE GIOCATE CHE FINISCONO NELLO STESSO PUNTO SI VEDONO, NON SPARISCONO.
     Il primo disegno metteva un cerchietto per giocata, e con la calibrazione
     misurata era illeggibile per una ragione che non e' un dettaglio: il
     carico finale prende cinque valori interi e l'assetto tre, quindi
     cinquecento giocate si ammucchiano in nove posti. A schermo comparivano
     nove puntini, uguali fra loro, e sembrava un grafico rotto — mentre il
     dato vero era che quei nove punti valgono cinquecento giocate, in
     proporzioni molto diverse.

     Adesso le giocate che cadono nello stesso posto si contano, e il cerchio
     cresce con la radice del conteggio (la radice, non il conteggio: l'area
     del cerchio deve essere proporzionale, se no i mucchi grandi mangiano il
     disegno). Il guadagno e' doppio: con pochi valori distinti si legge dove
     sta il mucchio, e con diecimila giocate il numero di cerchi resta quello
     dei punti dello schermo, non quello delle giocate. */
  function disegnaNuvola(x, y, nomeX, nomeY, mis) {
    var W = 900, H = 330, L = 56, R = 18, T = 18, B = 46;
    var pw = W - L - R, ph = H - T - B;
    var xMin = Math.min.apply(null, x), xMax = Math.max.apply(null, x);
    var yMin = Math.min.apply(null, y), yMax = Math.max.apply(null, y);
    if (xMax === xMin) { xMax = xMin + 1; }
    if (yMax === yMin) { yMax = yMin + 1; }
    var px = function (v) { return L + (v - xMin) / (xMax - xMin) * pw; };
    var py = function (v) { return T + ph - (v - yMin) / (yMax - yMin) * ph; };
    var g = [];

    [0, 0.5, 1].forEach(function (f) {
      var yy = T + f * ph;
      g.push('<line x1="' + L + '" y1="' + yy + '" x2="' + (W - R) + '" y2="' + yy +
        '" stroke="var(--griglia)" stroke-width="1"/>');
      g.push('<text x="' + (L - 9) + '" y="' + (yy + 4) + '" text-anchor="end" font-size="10.5" ' +
        'fill="var(--inchiostro-3)">' + num(yMax - f * (yMax - yMin)) + '</text>');
    });

    /* i mucchi si contano sul punto dello schermo, non sul valore: due
       giocate che il disegno non riuscirebbe comunque a separare sono, per
       chi guarda, lo stesso punto */
    var mucchi = {}, chiavi = [], k, i;
    for (i = 0; i < x.length; i++) {
      k = Math.round(px(x[i])) + ',' + Math.round(py(y[i]));
      if (mucchi[k] === undefined) { mucchi[k] = 0; chiavi.push(k); }
      mucchi[k]++;
    }
    var piuAlto = 1;
    chiavi.forEach(function (c) { if (mucchi[c] > piuAlto) { piuAlto = mucchi[c]; } });
    chiavi.forEach(function (c) {
      var xy = c.split(',');
      var raggio = 2.2 + Math.sqrt(mucchi[c] / piuAlto) * 8;
      g.push('<circle cx="' + xy[0] + '" cy="' + xy[1] + '" r="' + raggio.toFixed(1) +
        '" fill="var(--azione)" opacity="0.34"><title>' +
        Lg.plurale(mucchi[c], 'ripetizione', 'ripetizioni') + ' qui</title></circle>');
    });

    /* la retta dei minimi quadrati, disegnata solo da un capo all'altro dei
       dati veri: prolungarla oltre sarebbe una previsione, e questa retta
       non prevede niente */
    if (mis && mis.pendenza !== undefined && mis.r !== null) {
      var ySx = mis.intercetta + mis.pendenza * xMin;
      var yDx = mis.intercetta + mis.pendenza * xMax;
      g.push('<line x1="' + px(xMin) + '" y1="' + py(ySx) + '" x2="' + px(xMax) +
        '" y2="' + py(yDx) + '" stroke="var(--ostacola)" stroke-width="2.4" ' +
        'stroke-linecap="round" opacity="0.9"/>');
    }

    g.push('<line x1="' + L + '" y1="' + (T + ph) + '" x2="' + (W - R) + '" y2="' + (T + ph) +
      '" stroke="var(--linea-base)" stroke-width="1.5"/>');
    [xMin, (xMin + xMax) / 2, xMax].forEach(function (v) {
      g.push('<text x="' + px(v) + '" y="' + (H - 22) + '" text-anchor="middle" font-size="10.5" ' +
        'fill="var(--inchiostro-3)">' + num(v) + '</text>');
    });
    g.push('<text x="' + (L + pw / 2) + '" y="' + (H - 5) + '" text-anchor="middle" font-size="10.5" ' +
      'fill="var(--inchiostro-3)">in orizzontale ' + esc(nomeX) + ' · in verticale ' +
      esc(nomeY) + '</text>');

    return '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" style="max-width:100%;height:auto" ' +
      'role="img" aria-label="Ogni punto è una ripetizione: ' + esc(nomeX) + ' in orizzontale, ' +
      esc(nomeY) + ' in verticale">' + g.join('') + '</svg>' +
      '<div class="legenda">' +
      '<span class="voce-legenda"><i class="segno" style="background:var(--azione);opacity:.4"></i>' +
      'le ripetizioni: più il cerchio è grande, più ce ne sono finite lì</span>' +
      '<span class="voce-legenda"><i class="segno linea" style="background:var(--ostacola)"></i>la riga che passa più vicino a tutti i punti</span>' +
      '<span class="voce-legenda">' + Lg.intero(x.length) + ' ripetizioni, ammucchiate in ' +
      Lg.plurale(chiavi.length, 'punto', 'punti') + '</span></div>';
  }

  /* IL CAMPIONE SI RITROVA DAL NOME CHE SI LEGGE, perche' il nome e' l'unica
     cosa che il motore e la pagina si scambiano: le chiavi interne restano
     nel motore, dove devono stare. */
  function campionePer(m, nome) {
    if (/costo/.test(nome)) { return m.campioni.costo_nascosto; }
    if (/assetto/.test(nome)) { return m.campioni.posizione; }
    return m.campioni.stress;
  }

  function avvertenzaScritta(m) {
    var a = m.avvertenza_correlazioni || A.AVVERTENZA_CORRELAZIONI;
    return '<div class="avviso"><strong>' + esc(a.titolo) + '</strong>' +
      '<ul class="elenco-avvertenza">' +
      a.punti.map(function (p) { return '<li>' + esc(p) + '</li>'; }).join('') +
      '</ul></div>';
  }

  function bloccoCorrelazioni(m) {
    var coppie = m.correlazioni || [];
    var misurate = coppie.filter(function (c) { return c.misura && c.misura.r !== null; });

    /* QUANDO NON C'È NIENTE DA CONFRONTARE, L'AVVERTENZA RESTA.
       Succede con la calibrazione storica e una scena lunga: il carico tocca
       il tetto, tutte le giocate finiscono uguali, e una cosa ferma non si
       muove insieme a nessuno. Il numero sparisce; il perché va scritto lo
       stesso, e l'avvertenza pure — è la sezione che insegna a diffidare, e
       non si spegne quando il conto non esce. */
    if (!misurate.length) {
      /* IL PERCHÉ È DIVERSO NEI DUE CASI, E DIRE QUELLO SBAGLIATO È PEGGIO
         CHE NON DIRNE NESSUNO. Le grandezze restano ferme per due ragioni
         opposte. Al tetto, perché il modello non distingue più (la
         saturazione). Su una scena cortissima, perché il trasferimento di
         stato è piccolo e non arriva a spostare un punto intero. */
      var fermo = m.stress_finale && m.stress_finale.massimo >= 100
        ? ' Succede quando il carico tocca il tetto: il modello non distingue più, ed è ' +
          'la saturazione di cui parla la sezione 3.'
        : ' Con una scena così corta il carico finale non si muove affatto. Il trasferimento ' +
          'di stato è il quattro virgola sei per cento. Su pochi gesti sparisce ' +
          'nell’arrotondamento.';
      return '<p class="nota">' +
        (coppie.length && coppie[0].misura && coppie[0].misura.spiegazione
          ? esc(coppie[0].misura.spiegazione) + fermo
          : 'Qui non c’è ancora niente da confrontare. Servono almeno tre ripetizioni perché la ' +
            'domanda «si muovono insieme?» abbia una risposta. Con due punti soli passa ' +
            'sempre una riga esatta, e il numero uscirebbe al massimo comunque.') +
        '</p>' + avvertenzaScritta(m);
    }

    /* la coppia più legata di tutte: è quella che si disegna, perché è la
       sola su cui l'occhio possa davvero sbagliarsi */
    var forte = misurate.slice().sort(function (a, b) {
      return Math.abs(b.misura.r) - Math.abs(a.misura.r);
    })[0];

    var righe = misurate.map(function (c) {
      var r = c.misura.r;
      function met(v, verso) {
        return '<span class="leva-mezza ' + verso + '"><span class="leva-barra" style="width:' +
          (Math.abs(v) * 100).toFixed(1) + '%"></span></span>';
      }
      return '<div class="riga-leva">' +
        '<span class="leva-k">r</span>' +
        '<span class="leva-nome">' + esc(c.prima) + ' e ' + esc(c.seconda) + '</span>' +
        '<span class="leva-sx">' + (r < 0 ? num(r, 2) : '—') + '</span>' +
        '<span class="leva-pista">' + met(r < 0 ? r : 0, 'sx') + '<i class="leva-zero"></i>' +
          met(r > 0 ? r : 0, 'dx') + '</span>' +
        '<span class="leva-val">' + (r > 0 ? '+' + num(r, 2) : '—') + '</span>' +
        '</div>';
    }).join('');

    var quadrati = '<div class="distribuzione">' + misurate.map(function (c) {
      var quanto = c.misura.variazione_spiegata;
      return '<div class="riga-distribuzione" style="--tinta:var(--azione)">' +
        '<span class="dist-glifo">·</span>' +
        '<span class="dist-nome">' + esc(c.prima) + ' e ' + esc(c.seconda) + '</span>' +
        '<span class="dist-pista"><span class="dist-barra" style="width:' +
          quanto.toFixed(1) + '%"></span></span>' +
        '<span class="dist-quota">' + Lg.numero(quanto) + '<small>%</small></span>' +
        '<span class="dist-conta">R² ' + num(c.misura.r2, 2) + '</span></div>';
    }).join('') + '</div>';

    return '<div class="leve">' + righe + '</div>' +
      '<div class="legenda">' +
      '<span class="voce-legenda"><i class="segno" style="background:var(--ostacola)"></i>a sinistra: vanno al contrario</span>' +
      '<span class="voce-legenda"><i class="segno" style="background:var(--aiuta)"></i>a destra: si muovono insieme</span>' +
      '<span class="voce-legenda">la pista va da −1 a +1, e lo zero sta nel mezzo</span>' +
      '</div>' +

      '<p class="caso-eti">E quanta parte della variazione è davvero spiegata</p>' +
      quadrati +
      '<p class="nota">Questa seconda fila è il quadrato della prima, e si chiama <b>R²</b>, ' +
      'che si legge «erre due». ' +
      'È l’indice della <span data-parola="variazione">variazione</span> spiegata, e si ' +
      'legge come una percentuale: dice quanta parte del movimento di una grandezza è ' +
      'spiegata dal movimento dell’altra. Il resto viene da qualcos’altro, e da qui non si ' +
      'vede.</p>' +
      misurate.map(function (c) {
        return '<p class="nota-leve"><b>' + esc(c.prima) + ' e ' + esc(c.seconda) +
          '.</b> ' + esc(c.misura.spiegazione) + '</p>';
      }).join('') +

      '<p class="caso-eti">La stessa cosa, disegnata</p>' +
      '<p style="margin-top:0">Il grafico qui sotto mostra la coppia più legata delle tre: ' +
      'in orizzontale ' + esc(forte.prima) + ', in verticale ' + esc(forte.seconda) + '. ' +
      'Ogni cerchio raccoglie le ripetizioni finite nello stesso posto, e più ce ne sono, più il ' +
      'cerchio è grande. La riga rossa passa più vicino che può a tutti i punti, e si chiama ' +
      '<span data-parola="correlazione">regressione</span>.</p>' +
      disegnaNuvola(campionePer(m, forte.prima), campionePer(m, forte.seconda),
                    forte.prima, forte.seconda, forte.misura) +
      '<p class="nota">Adesso guarda la riga, e poi guarda il numero. La riga taglia il ' +
      'disegno decisa, e a occhio sembra che spieghi tutto quanto. Il numero dice che spiega ' +
      'il <b>' + Lg.numero(forte.misura.variazione_spiegata) + ' %</b>. Il resto, ' +
      Lg.numero(Math.round((100 - forte.misura.variazione_spiegata) * 10) / 10) + ' %, la riga ' +
      'non lo vede. Sono due letture della stessa figura, e quella giusta è la seconda.</p>' +
      avvertenzaScritta(m);
  }

  /* ---------------------------------------------------------------------
     LE LEVE — quale sposta di piu', a parita' di dado
     ---------------------------------------------------------------------
     Ogni leva si muove del suo passo naturale, in meglio e in peggio, e si
     misura di quanto cambia il carico finale medio. Stesso seme in tutte e
     sedici le varianti: la differenza NON e' il dado. */
  var LEVE = [
    { k: 'E',   nome: 'il corpo adesso',      passo: 10 },
    { k: 'I',   nome: 'quanto è chiaro',      passo: 10 },
    { k: 'T',   nome: 'la fretta',            passo: 10 },
    { k: 'M',   nome: 'l’ambiente',           passo: 10 },
    { k: 'BP',  nome: 'ciò che protegge',     passo: 5, soloSu: true },
    { k: 'C',   nome: 'i pezzi da coordinare', passo: 1, allIncontrario: true },
    { k: 'STR', nome: 'il carico di partenza', passo: 15, allIncontrario: true },
    { k: 'DEB', nome: 'il debito da insistenza', passo: 1, allIncontrario: true }
  ];

  /* CHE COSA SI MISURA QUANDO SI MUOVE UNA LEVA
     Non il carico finale. Muovere il carico di partenza e poi misurare il
     carico finale e' quasi una tautologia: con il trasferimento al 4,6 %
     il carico finale e' il carico iniziale piu' pochi punti, quindi quella
     leva vincerebbe sempre, e non perche' sia la piu' importante.

     Si misura invece la QUOTA DI GESTI RIUSCITI, in punti percentuali.
     E' l'effetto che passa per la formula — ogni leva entra in Pn — ed e'
     la risposta alla domanda pratica: se posso cambiare una cosa sola,
     quale mi fa riuscire piu' spesso? */
  /* IL PIANO PRIMA DELLE CORSE.
     Studiare le leve vuol dire rigiocare la scena una volta per ogni
     direzione di ogni leva: sedici scene intere. Prima erano un ciclo solo,
     che girava fino in fondo senza mai restituire il fiato al browser. Adesso
     il piano si scrive per primo — quali scene, con quale modifica — e chi lo
     esegue decide come: tutto d'un fiato (`studiaLeve`, che serve ai banchi di
     prova) oppure una scena per volta, con l'avanzamento che si vede. */
  function pianoLeve() {
    var caso = schedaCorrente();
    var passi = [{ sigla: 'base', nome: 'la scena così com’è', modifica: null }];
    LEVE.forEach(function (l) {
      /* «meglio» vuol dire nella direzione che aiuta, e per carico,
         complessita' e debito e' la direzione opposta */
      var su = l.allIncontrario ? -l.passo : l.passo;
      var meglio = {}; meglio[l.k] = caso.valori[l.k] + su;
      passi.push({ sigla: l.k + '+', nome: l.nome + ', mossa in meglio', modifica: meglio });
      if (!l.soloSu) {
        var peggio = {}; peggio[l.k] = caso.valori[l.k] - su;
        passi.push({ sigla: l.k + '-', nome: l.nome + ', mossa in peggio', modifica: peggio });
      }
    });
    return passi;
  }

  function componiLeve(quote) {
    var base = quote.base;
    var righe = LEVE.map(function (l) {
      var qM = quote[l.k + '+'];
      var qP = l.soloSu ? base : quote[l.k + '-'];
      /* IL TOTALE DEVE ESSERE LA SOMMA DEI DUE NUMERI CHE SI VEDONO.
         Le due meta' della riga si mostrano a un decimale; l'ampiezza si
         calcolava invece sui valori per esteso, e cosi' le barre dicevano
         −9,9 e +9,9 mentre il testo sotto dichiarava «19,7 punti fra i due
         estremi». Adesso si arrotonda una volta sola, prima di mostrare, e la
         somma dei due numeri a schermo torna sempre. L'ordine della classifica
         resta deciso sui valori per esteso: due leve davvero diverse non
         devono pareggiare per colpa di un arrotondamento. */
      var meglio1 = Math.round((qM - base) * 10) / 10;
      var peggio1 = Math.round((qP - base) * 10) / 10;
      return {
        k: l.k, nome: l.nome, passo: l.passo,
        meglio: meglio1,
        peggio: peggio1,
        ampiezza: Math.round((Math.abs(meglio1) + Math.abs(peggio1)) * 10) / 10,
        ampiezza_per_esteso: Math.abs(qM - base) + Math.abs(qP - base)
      };
    });
    righe.sort(function (a, b) { return b.ampiezza_per_esteso - a.ampiezza_per_esteso; });
    return { base: base, righe: righe };
  }

  /* lo stesso studio, tutto d'un fiato: comodo fuori dalla pagina */
  function studiaLeve(ripetizioni) {
    var quote = {};
    pianoLeve().forEach(function (p) {
      quote[p.sigla] = corri(p.modifica, ripetizioni).nodo.quota_riuscite * 100;
    });
    return componiLeve(quote);
  }

  /* QUANDO PIU' LEVE PESANO UGUALE, VA DETTO CHE E' COSI' PER COSTRUZIONE.
     E, I, T e M entrano nella formula con peso uno: dieci punti di uno
     valgono dieci punti dell'altro. Dire «la leva che sposta di piu' e' il
     corpo» quando quattro leve sono pari al centesimo sarebbe scegliere a
     caso e farlo sembrare un risultato. */
  function inCima(dati) {
    var cima = Math.round(dati.righe[0].ampiezza * 10) / 10;
    return dati.righe.filter(function (r) {
      return Math.round(r.ampiezza * 10) / 10 === cima;
    });
  }
  function pareggi(dati) {
    var pari = inCima(dati);
    if (pari.length < 2) { return ''; }
    return ' E il pareggio in cima non è un caso. <b>' +
      pari.map(function (r) { return r.k; }).join(', ') +
      '</b> entrano nella formula con peso uno, quindi dieci punti di una valgono ' +
      'dieci punti dell’altra. A distinguerle non è il modello, ma quanto sono facili ' +
      'da muovere nella vita.';
  }

  function disegnaLeve(dati, m) {
    var maxAss = Math.max.apply(null, dati.righe.map(function (r) {
      return Math.max(Math.abs(r.meglio), Math.abs(r.peggio));
    })) || 1;

    var righe = dati.righe.map(function (r) {
      function met(v, verso) {
        var largo = Math.abs(v) / maxAss * 50;
        return '<span class="leva-mezza ' + verso + '"><span class="leva-barra" style="width:' +
          largo.toFixed(1) + '%">' + '</span></span>';
      }
      return '<div class="riga-leva">' +
        '<span class="leva-k"><span data-parola="' + esc(r.k) + '">' + esc(r.k) + '</span></span>' +
        '<span class="leva-nome">' + esc(r.nome) + ' <small>±' + r.passo + '</small></span>' +
        '<span class="leva-sx">' + (r.peggio ? num(r.peggio) : '—') + '</span>' +
        '<span class="leva-pista">' + met(r.peggio, 'sx') + '<i class="leva-zero"></i>' + met(r.meglio, 'dx') + '</span>' +
        '<span class="leva-val">' + (r.meglio > 0 ? '+' : '') + (r.meglio ? num(r.meglio) : '—') + '</span>' +
        '</div>';
    }).join('');

    var pari = inCima(dati), ultima = dati.righe[dati.righe.length - 1];
    function estremi(r) {
      return num(r.ampiezza) + ' punti percentuali fra i due estremi. Cioè ' +
        num(Math.abs(r.peggio)) + ' da una parte più ' + num(Math.abs(r.meglio)) +
        ' dall’altra';
    }
    var cima = pari.length > 1
      ? 'In cima ci sono <b>' + pari.map(function (r) { return esc(r.nome); }).join('</b>, <b>') +
        '</b>, tutte con ' + estremi(pari[0])
      : 'In cima c’è <b>' + esc(pari[0].nome) + '</b>, con ' + estremi(pari[0]);
    return '<div class="leve">' + righe + '</div>' +
      '<div class="legenda">' +
      '<span class="voce-legenda"><i class="segno" style="background:var(--ostacola)"></i>a sinistra: la leva mossa in peggio</span>' +
      '<span class="voce-legenda"><i class="segno" style="background:var(--aiuta)"></i>a destra: mossa in meglio</span>' +
      '<span class="voce-legenda">i numeri sono punti percentuali di gesti riusciti</span>' +
      '</div>' +
      /* PERCHE' QUESTO 22,5 % NON E' IL 23 % DELLA SEZIONE 6.
         E' la stessa grandezza — la quota di gesti riusciti — misurata due
         volte su due gruppi di giocate diversi: la sezione 6 usa tutte le
         giocate scelte in cima alla pagina, qui se ne usano meno, perche' le
         leve costano quindici scene rigiocate da capo. Due misure oneste dello
         stesso numero possono benissimo differire di mezzo punto: e' esattamente
         quello che l'intervallo di confidenza serve a dire. Ma se la pagina le
         scrive tutte e due senza avvisare, chi legge trova una contraddizione e
         non ha modo di sapere quale delle due e' sbagliata. */
      '<p class="nota-leve">Senza toccare niente riesce il <b>' + num(dati.base) + ' %</b> dei gesti' +
      (m && m.nodo && Math.abs(m.nodo.quota_riuscite * 100 - dati.base) > 0.05 &&
       dati.giocate !== stato.ripetizioni
        ? '. Il numero è misurato sulle ' + num(dati.giocate, 0) + ' ripetizioni di questa sezione. ' +
          'Nella sezione 6 lo stesso numero è ' + num(m.nodo.quota_riuscite * 100) + ' %, perché ' +
          'lì viene da ' + num(stato.ripetizioni, 0) + ' ripetizioni. Sono due misure oneste della ' +
          'stessa grandezza, fatte su due gruppi di ripetizioni diversi. È normale che non ' +
          'coincidano al decimale. '
        : '. ') +
      cima + '. In fondo c’è <b>' + esc(ultima.nome) + '</b>, con ' + num(ultima.ampiezza) + '.</p>' +
      '<p class="nota-leve">Tutte le ripetizioni usano lo stesso seme. La differenza non è il dado, ' +
      'è la leva. Un trattino vuol dire che quella direzione non era disponibile: una leva ' +
      'già a zero non si può abbassare.' +
      /* Le giocate delle leve scalano al contrario della lunghezza della
         scena, quindi a volte sono meno di quelle scelte sopra e a volte
         sono le stesse. Quando sono le stesse, dire «invece delle 500 di
         sopra» e' una frase che si smentisce da sola: si dice l'altra. */
      (dati.giocate === stato.ripetizioni
        ? ' Ogni variante è stata ripetuta ' + num(dati.giocate, 0) + ' volte, come la scena ' +
          'qui sopra. Sono quindici scene rifatte da capo, e costano tempo.'
        : ' Ogni variante è stata ripetuta ' + num(dati.giocate, 0) + ' volte invece di ' +
          num(stato.ripetizioni, 0) + '. Sono quindici scene da rifare da capo, e con una ' +
          'scena lunga costerebbero minuti.') +
      pareggi(dati) + '</p>';
  }

  /* ---------------------------------------------------------------------
     DUE VARIANTI A CONFRONTO
     --------------------------------------------------------------------- */
  /* LA DIFFERENZA APPAIATA, DETTA COME LA DIREBBE UNA PERSONA.
     Le due colonne sono state giocate con gli stessi dadi, quindi ogni giocata
     di A ha la sua gemella in B. Confrontarle una per una è il conto giusto —
     ed è anche l'unico che si può raccontare: «in 487 giocate su 500 il carico
     è sceso» non ha bisogno di nessuna statistica per essere capito. */
  function fraseDifferenza(primaV, dopoV, dati) {
    var giu = 0, su = 0, uguale = 0;
    for (var i = 0; i < primaV.length; i++) {
      if (dopoV[i] < primaV[i]) { giu++; }
      else if (dopoV[i] > primaV[i]) { su++; }
      else { uguale++; }
    }
    var n = primaV.length;
    var basso = dati.intervallo_95[0], alto = dati.intervallo_95[1];
    return '<p class="nota" style="margin-top:14px">' +
      '<b>Detto in italiano.</b> ' +
      (Math.abs(dati.media) < 0.005
        ? 'Muovendo quella leva il carico finale resta dov’era. '
        : 'Muovendo quella leva il carico finale è più ' +
          (dati.media < 0 ? 'basso' : 'alto') + ' di <b>' + num(Math.abs(dati.media), 2) +
          ' punti</b>, in media. ') +
      'Guardando poi ripetizione per ripetizione, ' +
      (giu === n
        ? 'il carico è sceso in tutte e ' + Lg.intero(n) + ' le ripetizioni. '
        : (su === n
          ? 'il carico è salito in tutte e ' + Lg.intero(n) + ' le ripetizioni. '
          : 'il carico è sceso ' + Lg.plurale(giu, 'volta', 'volte') + ', è salito ' +
            Lg.plurale(su, 'volta', 'volte') + ' ed è rimasto identico ' +
            Lg.plurale(uguale, 'volta', 'volte') + ', su ' + Lg.intero(n) + '. ')) +
      (dati.incertezza_ignota
        ? 'Una fascia qui non si può dare. Una coppia sola non dice quanto quel numero balla.'
        : 'La fascia, invece, dice questo: se rifacessi lo stesso confronto tante volte, con dadi ' +
          'sempre nuovi, la differenza media cadrebbe fra <b>' + numFisso(basso, 2) + '</b> e <b>' +
          numFisso(alto, 2) + '</b> punti in 95 casi su 100. È una fascia sulla media, non sulla ' +
          'singola ripetizione. Le singole ripetizioni si allontanano molto di più.') +
      '</p>';
  }

  /* La colonna A e' il calcolo che la pagina ha gia' fatto in cima: rifarlo
     raddoppierebbe l'attesa per riottenere gli stessi identici numeri. Percio'
     le due corse arrivano da fuori, gia' fatte. */
  function confronto(a, b) {
    var caso = schedaCorrente();

    var d = Math.round((b.stress_finale.media - a.stress_finale.media) * 100) / 100;
    /* Le corse condividono il seme: si riassumono le differenze appaiate,
       non si sommano varianze come se le due serie fossero indipendenti. */
    var confrontoDati = A.confrontoAppaiato(a.campioni.stress, b.campioni.stress);
    d = confrontoDati.media;
    var semi = confrontoDati.semiampiezza_95;
    var significativa = Math.abs(d) > semi;

    var nuovo = N.clampInt(caso.valori[stato.leva] + stato.delta,
      stato.leva === 'STR' ? 0 : -30, stato.leva === 'STR' ? 100 : 30);

    return '<div class="due-colonne">' +
      '<div class="colonna-caso" style="--tinta:var(--inchiostro-3)">' +
        '<p class="colonna-eti">A · la scheda com’è</p>' +
        '<p class="colonna-scena">' + esc(stato.leva) + ' = ' + caso.valori[stato.leva] + '</p>' +
        disegnaIstogramma(a.campioni.stress, a.stress_finale, 'carico finale', 'var(--inchiostro-3)', true) +
        '<p class="colonna-conti">Carico finale medio <b>' + num(a.stress_finale.media) +
          '</b> ± ' + num(a.stress_finale.semiampiezza_95, 2) + '</p>' +
      '</div>' +
      '<div class="colonna-caso" style="--tinta:var(--azione)">' +
        '<p class="colonna-eti">B · una leva mossa</p>' +
        '<p class="colonna-scena">' + esc(stato.leva) + ' = ' + nuovo +
          ' (' + (stato.delta > 0 ? '+' : '') + stato.delta + ')</p>' +
        disegnaIstogramma(b.campioni.stress, b.stress_finale, 'carico finale', 'var(--azione)', true) +
        '<p class="colonna-conti">Carico finale medio <b>' + num(b.stress_finale.media) +
          '</b> ± ' + num(b.stress_finale.semiampiezza_95, 2) + '</p>' +
      '</div></div>' +
      /* OGNI NUMERO CON ACCANTO LA FRASE CHE DICE COSA VUOL DIRE.
         «Differenza −10,4, fascia ±0,3» è una riga che si legge solo se si sa
         gia' che cos'e' una differenza appaiata. Sotto c'e' la stessa riga
         detta in italiano, con le giocate contate una per una: quante volte il
         carico e' sceso, quante e' salito, quante e' rimasto dov'era. Quei tre
         numeri sono la cosa che succede davvero, e la fascia e' solo il modo
         di dire quanto sono stabili. */
      fraseDifferenza(a.campioni.stress, b.campioni.stress, confrontoDati) +
      '<p class="riga-conclusione">' +
      'La differenza è <b>' + (d > 0 ? '+' : '') + num(d) + '</b> punti di carico finale. ' +
      'La fascia approssimata al 95 % sulla differenza media è ± ' + num(semi, 2) + '. ' +
      /* QUANDO LA SOTTRAZIONE A SCHERMO NON TORNA, LO SI DICE PRIMA.
         Le due medie qui sopra sono arrotondate al decimo per stare in una
         riga; la differenza invece si calcola sui valori per esteso e si
         arrotonda solo alla fine. Ogni tanto i due arrotondamenti litigano e a
         schermo si legge «49,3 − 38,9 = −10,5», che con la calcolatrice fa
         10,4. Non e' un errore di conto, ed e' proprio per questo che va
         detto: chi trova da solo un numero che non torna smette di fidarsi di
         tutti gli altri. */
      /* il confronto si fa sui numeri COME SONO SCRITTI, rileggendo le stesse
         stringhe che le colonne mostrano: qualunque altra strada rischia di
         dire «torna» dove il lettore vede che non torna */
      (Math.abs((daScritto(num(b.stress_finale.media)) - daScritto(num(a.stress_finale.media))) -
                daScritto(num(d))) > 0.001
        ? '<b>E se la rifai a mano non ti torna:</b> ' + num(b.stress_finale.media) + ' meno ' +
          num(a.stress_finale.media) + ' fa ' +
          num(daScritto(num(b.stress_finale.media)) - daScritto(num(a.stress_finale.media))) +
          ', non ' + num(d) + '. Non è un errore di conto. Le due medie qui sopra sono ' +
          'arrotondate al decimo ciascuna, per stare in una riga. La differenza invece è ' +
          'calcolata sulle differenze fra le singole ripetizioni e arrotondata alla fine. '
        : '') +
      (significativa
        ? '<b>La fascia non comprende zero.</b> Il confronto segnala una differenza fra le ' +
          'medie simulate, nelle ipotesi della prova.'
        : '<b>La fascia comprende zero.</b> La prova non distingue le medie con questo ' +
          'criterio. Non dimostra che le varianti siano uguali.') +
      ' Le colonne usano lo stesso seme (' + stato.seme + ') e le ripetizioni sono confrontate ' +
      'a coppie. La fascia riguarda la media, non tutti i risultati futuri. Anche una fascia ' +
      'che in questo campione non si allontana da zero non garantisce che ogni altro tiro ' +
      'dia la stessa differenza.' +
      '</p>';
  }

  /* ---------------------------------------------------------------------
     GLI ESITI, E I DUE ASSI
     --------------------------------------------------------------------- */
  function distribuzioneEsiti(m) {
    return '<div class="distribuzione">' + m.esiti.map(function (o) {
      var info = S.esiti[o.chiave] || { titolo: o.chiave, stato: 'attenzione', glifo: '·' };
      return '<div class="riga-distribuzione" style="--tinta:' + S.colori[info.stato] + '">' +
        '<span class="dist-glifo">' + info.glifo + '</span>' +
        '<span class="dist-nome">' + esc(info.titolo) + '</span>' +
        '<span class="dist-pista"><span class="dist-barra" style="width:' +
          (o.quota * 100).toFixed(1) + '%"></span></span>' +
        '<span class="dist-quota">' + window.Lingua.numero(o.quota * 100) +
            '<small>%</small></span>' +
        '<span class="dist-conta">' + Lg.plurale(o.n, 'ripetizione', 'ripetizioni') +
        '</span></div>';
    }).join('') + '</div>';
  }

  /* PERCHE' QUESTA DISTRIBUZIONE E' COSI' STRETTA
     E' la domanda che viene subito, guardando il grafico, e la risposta e'
     una cosa che il libro misura: il trasferimento di stato e' il 4,6 %
     (capitolo 28). Un gesto sposta il carico finale di una frazione di
     punto; anche sessanta gesti lo spostano di pochi punti in tutto. Non
     e' un difetto del grafico: e' il modello, e si puo' vedere passando
     alla calibrazione storica, che passa tutto. */
  function notaSullaLarghezza(m) {
    var ampiezza = m.stress_finale.massimo - m.stress_finale.minimo;
    if (stato.calibrazione === 'storica') {
      var alTetto = m.stress_finale.minimo >= 100;
      return '<p class="nota-nodo">Stai guardando la <b>calibrazione storica</b>, cioè la ' +
        'taratura di prima che il 4,6 % venisse misurato. Qui ogni nodo passa tutto il ' +
        'suo effetto allo stato, e lo stato è il carico e l’assetto che la persona si ' +
        'porta dietro. ' +
        (alTetto
          ? 'E il risultato è questo: <b>tutte le ripetizioni finiscono a cento</b>. Non è una ' +
            'distribuzione stretta: è una distribuzione che non c’è più, perché il carico ' +
            'ha toccato il tetto prima della fine della catena. Da lì in su il modello non ' +
            'distingue più fra un gesto pessimo e uno catastrofico. Con pochi gesti si vede ' +
            'ancora qualcosa; con ' + stato.quantiNodi + ' non resta niente da distinguere.'
          : 'La distribuzione si allarga, e il carico corre verso l’alto molto più in fretta.') +
        ' È il comportamento che produceva la saturazione del capitolo 29, e sta qui per ' +
        'confronto, non perché sia quello giusto.</p>';
    }
    return '<p class="nota-nodo">' +
      (ampiezza === 0
        ? 'Tutte le ripetizioni finiscono sullo stesso numero, e c’è una '
        : 'La distribuzione è larga <b>' + ampiezza + ' punti</b>, e c’è una ') +
      'ragione precisa. Il trasferimento di stato, cioè quanta parte dell’effetto di un ' +
      'gesto passa al gesto dopo, misurato è il <b>quattro virgola sei per cento</b>, come ' +
      'dice il capitolo 28. Vuol dire che un gesto sposta il carico finale di una frazione di punto' +
      (unGestoSolo() ? ', e con un gesto solo quella frazione sparisce nell’arrotondamento.'
                     : '. Anche ' + stato.quantiNodi + ' gesti in fila lo spostano di pochi punti in tutto.') +
      ' Non è un difetto del grafico: è il modello. Vuoi vedere che cosa succedeva prima che ' +
      'quel numero venisse misurato? Scegli la calibrazione storica qui sopra.</p>';
  }

  /* IL LIVELLO DEL NODO — quello che la scena, sopra, non fa vedere */
  function bloccoNodo(m) {
    var caso = schedaCorrente();
    var q100 = m.nodo.quota_riuscite * 100;
    var tot = m.nodo.n;
    var mg = m.nodo.margini;

    var esitiNodo = '<div class="distribuzione">' + m.nodo.esiti.map(function (o) {
      var info = S.esiti[o.chiave] || { titolo: o.chiave, stato: 'attenzione', glifo: '·' };
      return '<div class="riga-distribuzione" style="--tinta:' + S.colori[info.stato] + '">' +
        '<span class="dist-glifo">' + info.glifo + '</span>' +
        '<span class="dist-nome">' + esc(info.titolo) + '</span>' +
        '<span class="dist-pista"><span class="dist-barra" style="width:' +
          (o.quota * 100).toFixed(1) + '%"></span></span>' +
        '<span class="dist-quota">' + window.Lingua.numero(o.quota * 100) +
            '<small>%</small></span>' +
        '<span class="dist-conta">' + num(o.n, 0) + '</span></div>';
    }).join('') + '</div>';

    function fascia(nome, n, spiega) {
      return '<div class="fascia-margine">' +
        '<p class="fascia-num">' + Math.round(n / tot * 100) + '<small>%</small></p>' +
        '<p class="fascia-nome">' + esc(nome) + '</p>' +
        '<p class="fascia-dice">' + esc(spiega) + '</p></div>';
    }

    return '<div class="tasselli">' +
      '<div class="tassello"><div class="k">Riuscite</div><div class="v">' +
        num(q100) + '<small style="font-size:var(--t-piccolo)">%</small></div>' +
        '<div class="s">delle valutazioni</div></div>' +
      (unGestoSolo()
        ? '<div class="tassello"><div class="k">La scheda dice Pn</div><div class="v">' + caso.pn +
          '</div><div class="s">e le due cose devono somigliarsi</div></div>'
        : '') +
      '<div class="tassello"><div class="k">n della scena</div><div class="v">' + m.ripetizioni +
        '</div><div class="s">' + esc(m.unita_statistica) + '</div></div>' +
      '<div class="tassello"><div class="k">n del nodo</div><div class="v">' + num(m.nodo.n, 0) +
        '</div><div class="s">' + esc(m.nodo.unita_statistica) + '</div></div>' +
      '</div>' +
      (unGestoSolo()
        ? '<p class="nota-nodo">Su ' + num(tot, 0) + ' tiri il gesto riesce <b>' + num(q100) +
          ' volte su cento</b>, e la scheda dice Pn = ' + caso.pn +
          '. Pn vuol dire questo e niente altro: non una previsione sul singolo caso, ' +
          'ma la quota sul lungo periodo. Il dado decide il caso, non la probabilità.</p>'
        /* il fattore di restringimento e' un numero che si legge, non un
           attributo di un disegno: va scritto in italiano, con la virgola.
           Prima usciva «5.5 volte», con il punto dell'inglese, a due
           centimetri da «4,6 %». */
        : '<p class="nota-nodo">Attenzione a non sommare le due n. La scena è stata ripetuta ' +
          num(m.ripetizioni, 0) + ' volte, e ogni volta ha attraversato ' + m.granularita.nodi_distinti +
          ' nodi. Le <b>valutazioni</b> sono ' + num(tot, 0) + ': è quante volte, in tutto, ' +
          'è stato calcolato un gesto. Ma <b>n resta ' + num(m.ripetizioni, 0) +
          '</b>. Il <b>campione</b> è quello, non le valutazioni, perché campione vuol ' +
          'dire quante repliche indipendenti della quantità finale si hanno a ' +
          'disposizione. I nodi interni della stessa ripetizione si passano l’uno all’altro ' +
          'il carico che lasciano: non sono repliche in più del suo risultato finale. La ' +
          'precisione va stimata sulle ripetizioni, e non esiste un fattore universale che si ' +
          'possa ricavare dal solo rapporto fra valutazioni e ripetizioni.</p>') +
      '<p class="caso-eti">Come sono andati i singoli nodi</p>' + esitiNodo +
      '<p class="caso-eti">E con quale margine</p>' +
      '<p class="nota" style="margin-top:0">Il margine è la distanza fra la probabilità ' +
      'del gesto e il numero uscito dal dado. Dice di quanto è riuscito, o di quanto è ' +
      'mancato.</p>' +
      '<div class="fasce-margine">' +
        fascia('fragile · 0–9', mg.fragile, 'riuscita, o mancata, per un soffio: la prossima volta può andare al contrario, senza che sia cambiato niente') +
        fascia('normale · 10–24', mg.normale, 'la distanza c’è, ma non è grande') +
        fascia('forte · 25 in su', mg.forte, 'il dado è caduto lontano dalla probabilità di quel gesto') +
      '</div>';
  }

  function bloccoAssi(m) {
    var g = m.granularita;
    return '<div class="assi">' +
      '<div class="asse">' +
        '<p class="asse-eti">Asse 1 · granularità</p>' +
        '<p class="asse-num">' + g.nodi_distinti + '</p>' +
        '<p class="asse-dice">nodi <b>distinti</b>. Scala: ' + esc(g.scala.etichetta.toLowerCase()) + '. ' +
        'Lo decide la descrizione, non un cursore: per avere più nodi bisogna descrivere di più.</p>' +
        (g.repliche ? '<p class="asse-avviso">' + esc(g.spiegazione) + '</p>' : '') +
      '</div>' +
      '<div class="asse">' +
        '<p class="asse-eti">Asse 2 · ripetizioni</p>' +
        '<p class="asse-num">' + m.ripetizioni + '</p>' +
        '<p class="asse-dice">volte che la <b>stessa</b> catena è stata rifatta con dadi diversi. ' +
        'Non cambia il numero di nodi. Cambia quanto ci si può fidare del numero che esce.</p>' +
      '</div>' +
      '<div class="asse asse-somma">' +
        '<p class="asse-eti">E che cosa NON si somma</p>' +
        '<p class="asse-num piccolo">' + num(m.valutazioni_totali, 0) + '</p>' +
        '<p class="asse-dice">valutazioni totali. ' + esc(m.nota_conteggio) + '</p>' +
      '</div></div>';
  }

  /* ---------------------------------------------------------------------
     DISEGNO DI TUTTA LA PAGINA
     --------------------------------------------------------------------- */
  /* =====================================================================
     OGNI NUMERO CON ACCANTO LA FRASE CHE DICE COSA VUOL DIRE
     =====================================================================
     Le due sezioni qui sotto non calcolano niente di nuovo. Prendono i numeri
     che il riquadro mostra già e li raccontano in italiano, con i valori di
     QUESTA prova dentro la frase. Il motivo è semplice: «media 47,2 ± 0,42» è
     una riga che si legge solo se si sa già che cos'è una semiampiezza, e
     questa pagina è scritta anche per chi non lo sa e non ha nessun motivo di
     saperlo. Una definizione generale non basta: chi legge deve poter mettere
     il dito su un numero e trovarci accanto che cosa dice, qui, in questa
     scena. Perciò le frasi nominano i numeri, non le grandezze. */
  function leggiIlRiassunto(m) {
    var st = m.stress_finale;
    var basso = st.intervallo_95[0], alto = st.intervallo_95[1];
    var quante = st.n;
    var frase = '<p class="nota" style="margin-top:14px"><b>Gli stessi numeri, detti in ' +
      'italiano.</b> ';

    frase += 'La <b>media</b> è ' + num(st.media) + ', e si ottiene sommando il carico finale ' +
      'di tutte e ' + Lg.intero(quante) + ' le ripetizioni e dividendo per ' + Lg.intero(quante) + '. ';

    if (st.incertezza_ignota) {
      frase += 'Il <b>±</b> qui non c’è, e non è una dimenticanza: con una ripetizione sola non ' +
        'c’è nessun modo di dire quanto quel numero balla. Serve almeno un secondo caso. ';
    } else {
      frase += 'Il <b>± ' + num(st.semiampiezza_95, 2) + '</b> accanto non dice quanto le ' +
        'ripetizioni sono diverse fra loro. Dice un’altra cosa. Ripetendo la scena ' + Lg.intero(quante) +
        ' volte è uscito ' + num(st.media) + '; con altri ' + Lg.intero(quante) +
        ' dadi sarebbe uscito un numero un po’ diverso. La <b>fascia fra ' + numFisso(basso, 2) +
        ' e ' + numFisso(alto, 2) + '</b> è quella in cui quel numero cade in 95 casi su 100. ';
    }

    frase += 'La <b>mediana</b> è ' + num(st.mediana) + ', e si legge così: metti in fila ' +
      'tutte le ripetizioni, dalla più bassa alla più alta, e metà è finita sotto ' +
      num(st.mediana) + ', metà sopra. ';

    frase += 'L’<b>80 % sta fra ' + num(st.p10) + ' e ' + num(st.p90) + '</b> vuol dire ' +
      'questo: su cento ripetizioni come questa, ottanta finiscono lì dentro, dieci finiscono ' +
      'sotto ' + num(st.p10) + ' e dieci sopra ' + num(st.p90) + '. Sono il decimo e il ' +
      'novantesimo percentile, quelli che il capitolo 47 usa proprio per dire quanto è ' +
      'stabile la scena. ';

    frase += 'Lo <b>scarto medio</b> è ' + num(st.deviazione) + ' punti. È la terza ' +
      'grandezza, e si confonde di continuo con il ±: dice quanto una ripetizione qualunque si ' +
      'allontana dalla media. ';

    if (!st.incertezza_ignota && st.semiampiezza_95 > 0) {
      var volte = st.deviazione / st.semiampiezza_95;
      frase += 'Qui è <b>' + num(volte) + ' volte più largo</b> del ±, e non è un caso. ' +
        'Ripetendo di più il ± si stringe. Lo scarto no: lo scarto è la scena, il ± è ' +
        'quanto la conosciamo.';
    }
    return frase + '</p>';
  }

  function leggiConvergenza(conv, m) {
    if (!conv) { return ''; }
    var semi = conv.semiampiezza_finale;
    var n = m.ripetizioni;
    var perMeta = n * 4;
    var perLaSoglia = A.ripetizioniConsigliate(m.stress_finale.deviazione, stato.soglia);
    return '<p class="nota"><b>Lo stesso, detto in italiano.</b> Con ' + Lg.intero(n) +
      ' ripetizioni la fascia è ±' + num(semi, 2) + '. Vuol dire che il numero da tenere a mente ' +
      'non è «' + num(m.stress_finale.media) + '», ma «' + num(m.stress_finale.media) +
      ', e comunque fra ' + numFisso(m.stress_finale.intervallo_95[0], 2) + ' e ' +
      numFisso(m.stress_finale.intervallo_95[1], 2) + '». Per dimezzare quella fascia, cioè per ' +
      'arrivare a ±' + num(semi / 2, 2) + ', non basta raddoppiare le ripetizioni: ne servono ' +
      'quattro volte tante, ' + Lg.intero(perMeta) + '. È la radice quadrata del capitolo 47, ' +
      'ed è il motivo per cui a un certo punto conviene fermarsi. ' +
      (conv.basta_a !== null
        ? 'La soglia che hai scelto, ±' + num(stato.soglia, 2) + ', è già stata raggiunta.'
        : 'Per arrivare alla soglia che hai scelto, ±' + num(stato.soglia, 2) +
          ', servirebbero circa ' + Lg.intero(perLaSoglia) + ' ripetizioni. Il conto viene dalla ' +
          'formula qui sopra, rovesciata, con lo scarto misurato in questa prova.') +
      '</p>';
  }

  var ultimoLeve = null;

  /* =====================================================================
     IL CALCOLO A RATE, CON L'AVANZAMENTO CHE SI VEDE
     =====================================================================
     DIECIMILA GIOCATE BLOCCAVANO LA PAGINA, E UNA PAGINA FERMA SEMBRA ROTTA.
     Questa pagina, per disegnarsi tutta, rigioca la scena diciotto volte: una
     per il riassunto, una per la variante B del confronto, sedici per le leve.
     Con trenta gesti e diecimila giocate sono più di mezzo milione di
     valutazioni. Prima succedevano tutte dentro una sola chiamata: dieci,
     quindici secondi in cui il browser non ridisegna niente, non risponde al
     mouse e non lascia scorrere la pagina. Chi guardava non vedeva un calcolo
     in corso. Vedeva una pagina rotta, e cliccava di nuovo — facendo ripartire
     tutto da capo.

     Adesso il lavoro è una fila di pezzi. Si gioca un pezzo, si restituisce il
     fiato al browser, si gioca il pezzo dopo. Fra un pezzo e l'altro si mostra
     l'avanzamento, e se qualcuno cambia un comando il lavoro in corso si
     ferma invece di finire nel vuoto.

     E il disegno non aspetta la fine. Appena la prima corsa è pronta si
     disegnano le sezioni dalla 2 alla 8; il confronto arriva dopo, le leve per
     ultime. Chi legge comincia a leggere mentre il resto si calcola.

     I NUMERI SONO GLI STESSI. Il motore ricuce i pezzi ridando a ogni giocata
     lo stesso seme che avrebbe avuto in una partita sola (analisi.js,
     `montecarloAPezzi`), e la suite lo controlla confrontando pezzo per pezzo. */
  var lavoro = null;

  /* QUANTE GIOCATE STANNO IN UN PEZZO.
     Un pezzo deve durare poco più di un fotogramma. Mezzo secondo e la pagina
     torna a sembrare bloccata; un millesimo e si passa il tempo a entrare e
     uscire dal calcolo invece di calcolare. Il conto si fa sulle valutazioni,
     non sulle giocate: una giocata di centoventi gesti costa centoventi volte
     una giocata di un gesto solo. Duemila valutazioni, misurate nel browser il
     15/09/2026, sono circa tre centesimi di secondo: due fotogrammi. */
  function giocatePerPezzo() {
    return Math.max(5, Math.min(1000, Math.round(2000 / Math.max(1, stato.quantiNodi))));
  }

  function motore(modifica, ripetizioni) {
    return A.montecarloAPezzi(catenaCorrente(modifica), {
      ripetizioni: ripetizioni || stato.ripetizioni,
      seme: stato.seme,
      calibrazione: calibrazioneScelta(),
      pezzo: giocatePerPezzo()
    });
  }

  /* LA BARRA SI COSTRUISCE UNA VOLTA, POI SI MUOVE SOLTANTO.
     Rifare l'innerHTML a ogni pezzo vuol dire rifare il lavoro del browser
     centinaia di volte: in una funzione che esiste per non far rallentare la
     pagina sarebbe un controsenso. Qui i due pezzi che cambiano — la larghezza
     e la riga di testo — si toccano da soli. */
  function mostraAvanzamento(fatte, totali, nome) {
    var barra = q('avanzamento');
    if (!barra) { return; }
    if (!barra.firstChild) {
      barra.innerHTML =
        '<div style="height:7px;border-radius:4px;background:var(--inchiostro-3);opacity:.9;' +
          'overflow:hidden"><div id="avanzPieno" style="height:100%;width:0%;' +
          'background:var(--azione);transition:width .12s linear"></div></div>' +
        '<p class="nota" id="avanzRiga" style="margin:6px 0 0"></p>';
    }
    var quota = totali ? Math.min(1, fatte / totali) : 1;
    var pieno = q('avanzPieno'), riga = q('avanzRiga');
    if (pieno) { pieno.style.width = (quota * 100).toFixed(1) + '%'; }
    if (riga) {
      riga.innerHTML = 'Sto ripetendo ' + esc(nome) + '. Fatte <b>' + Lg.intero(fatte) +
        '</b> ripetizioni su ' + Lg.intero(totali) + '. La pagina risponde lo stesso, perché il ' +
        'conto è diviso apposta in pezzi piccoli.';
    }
    barra.style.display = '';
  }

  function nascondiAvanzamento() {
    var barra = q('avanzamento');
    if (barra) { barra.innerHTML = ''; barra.style.display = 'none'; }
  }

  /* Un passo senza `apri` non gioca niente: serve a rimettere insieme i pezzi
     e a ridisegnare, e costa zero giocate. */
  function esegui(passi, quandoFinisce) {
    if (lavoro) { lavoro.annullato = true; }
    var mio = { annullato: false, i: 0, corrente: null, fatte: 0, totali: 0 };
    passi.forEach(function (p) { mio.totali += (p.giocate || 0); });
    lavoro = mio;

    function avanti() {
      if (mio.annullato) { return; }
      if (mio.i >= passi.length) {
        lavoro = null;
        nascondiAvanzamento();
        quandoFinisce();
        return;
      }
      var p = passi[mio.i];
      if (!p.apri) {
        mio.i++;
        p.chiudi(null);
      } else {
        if (!mio.corrente) { mio.corrente = p.apri(); }
        var prima = mio.corrente.fatte();
        mio.corrente.passo();
        mio.fatte += mio.corrente.fatte() - prima;
        if (mio.corrente.finito()) {
          var risultato = mio.corrente.risultato();
          mio.corrente = null;
          mio.i++;
          p.chiudi(risultato);
        }
      }
      if (mio.annullato) { return; }
      mostraAvanzamento(mio.fatte, mio.totali, passi[Math.min(mio.i, passi.length - 1)].nome);
      setTimeout(avanti, 0);
    }

    mostraAvanzamento(0, mio.totali, passi[0].nome);
    setTimeout(avanti, 0);
  }

  function disegna(rifaiLeve) {
    var t0 = (window.performance && performance.now) ? performance.now() : null;
    var caso = schedaCorrente();
    var m = null;
    var passi = [];

    passi.push({
      nome: 'la scena', giocate: stato.ripetizioni,
      apri: function () { return motore(null); },
      chiudi: function (r) { m = r; disegnaScena(r); }
    });

    var mod = {};
    mod[stato.leva] = caso.valori[stato.leva] + stato.delta;
    passi.push({
      nome: 'la variante B del confronto', giocate: stato.ripetizioni,
      apri: function () { return motore(mod); },
      chiudi: function (r) { q('confronto').innerHTML = confronto(m, r); }
    });

    if (rifaiLeve || !ultimoLeve) {
      /* QUINDICI SCENE IN PIU', E VANNO PAGATE.
         Lo studio delle leve rigioca la scena una volta per ogni direzione
         di ogni leva. Con una catena lunga e molte ripetizioni sarebbero
         minuti. Le ripetizioni qui scalano al contrario della lunghezza,
         cosi' il lavoro totale resta piu' o meno costante — e la pagina
         dichiara sotto quante ne ha usate, invece di lasciarlo credere. */
      var ripLeve = Math.max(80, Math.min(stato.ripetizioni,
        Math.round(9000 / Math.max(1, stato.quantiNodi))));
      var quote = {};
      pianoLeve().forEach(function (pl) {
        passi.push({
          nome: pl.nome, giocate: ripLeve,
          apri: function () { return motore(pl.modifica, ripLeve); },
          chiudi: function (r) { quote[pl.sigla] = r.nodo.quota_riuscite * 100; }
        });
      });
      passi.push({
        nome: 'le leve', giocate: 0, apri: null,
        chiudi: function () {
          ultimoLeve = componiLeve(quote);
          ultimoLeve.giocate = ripLeve;
          q('leve').innerHTML = disegnaLeve(ultimoLeve, m);
        }
      });
    } else {
      passi.push({
        nome: 'le leve', giocate: 0, apri: null,
        chiudi: function () { q('leve').innerHTML = disegnaLeve(ultimoLeve, m); }
      });
    }

    esegui(passi, function () {
      if (window.Glossario && window.Glossario.decoraTutte) { window.Glossario.decoraTutte(); }
      var riga = q('statoCalcolo');
      if (riga && t0 !== null) {
        riga.textContent = 'Ultimo calcolo: ' +
          window.Lingua.numero((performance.now() - t0) / 1000) +
          ' secondi. Tutto è successo dentro questa pagina: niente è uscito da questo computer.';
      }
    });
  }

  function disegnaScena(m) {
    var caso = schedaCorrente();

    q('riassunto').innerHTML =
      '<div class="tasselli">' +
      /* IL NUMERO IN VETRINA ERA QUELLO GONFIATO.
         Questo riquadro scriveva «120 gesti di seguito» — stato.quantiNodi,
         cioe' quanti ne sono stati CHIESTI — mentre la sezione 7, due
         schermate piu' sotto, contava «110 nodi distinti», perche' con centoventi
         i nomi ricominciano da capo e alcuni gesti sono copie di altri. Il
         numero grosso, quello che si legge per primo e si ricorda, era il
         gonfiato: nella pagina che esiste per denunciare il gonfiaggio.
         Adesso in vetrina va il numero che conta, e quando i due differiscono
         si vedono tutti e due. */
      '<div class="tassello"><div class="k">La scena</div><div class="v" style="font-size:var(--t-corpo)">' +
        esc(caso.titolo) + '</div><div class="s">' +
        (unGestoSolo()
          ? 'un gesto solo, Pn ' + caso.pn
          : (m.granularita.nodi_distinti === stato.quantiNodi
            ? stato.quantiNodi + ' gesti di seguito, tutti diversi'
            : m.granularita.nodi_distinti + ' gesti diversi su ' + stato.quantiNodi +
              ' · gli altri sono copie')) +
        '</div></div>' +
      '<div class="tassello"><div class="k">Carico finale, media</div><div class="v">' +
        num(m.stress_finale.media) + '</div><div class="s">± ' +
        num(m.stress_finale.semiampiezza_95, 2) + ' al 95 %</div></div>' +
      '<div class="tassello"><div class="k">Mediana</div><div class="v">' +
        num(m.stress_finale.mediana) + '</div><div class="s">metà delle ripetizioni sta sotto</div></div>' +
      '<div class="tassello"><div class="k">L’80 % sta fra</div><div class="v" style="font-size:var(--t-medio)">' +
        num(m.stress_finale.p10) + ' e ' + num(m.stress_finale.p90) +
        '</div><div class="s">dal 10° al 90° percentile</div></div>' +
      /* LA DEVIAZIONE STANDARD MANCAVA, ED E' PROPRIO QUELLA CHE SI CONFONDE
         CON IL ±. Il riquadro mostrava il ± al 95 % — che parla della media —
         e non mostrava mai quanto le singole giocate si allontanano fra loro.
         Cosi' l'unico numero di dispersione visibile era quello sbagliato, e
         la nota sotto spiegava una differenza fra due cose di cui se ne vedeva
         una sola. */
      '<div class="tassello"><div class="k">Quanto si sparpagliano</div><div class="v">' +
        num(m.stress_finale.deviazione) + '</div><div class="s">punti di scarto medio ' +
        'fra una ripetizione e la media</div></div>' +
      '<div class="tassello"><div class="k">n</div><div class="v">' + m.ripetizioni +
        '</div><div class="s">' + esc(m.unita_statistica) + '</div></div>' +
      '</div>' +
      leggiIlRiassunto(m);

    q('istogramma').innerHTML =
      disegnaIstogramma(m.campioni.stress, m.stress_finale, 'carico finale (STR)', 'var(--ostacola)') +
      '<div class="legenda">' +
      '<span class="voce-legenda"><i class="segno linea" style="background:var(--inchiostro)"></i>la media</span>' +
      '<span class="voce-legenda"><i class="segno tratteggio"></i>la mediana</span>' +
      '<span class="voce-legenda"><i class="segno" style="background:var(--inchiostro-3);opacity:.18"></i>fra il 10° e il 90° percentile</span>' +
      '</div>' +
      '<p class="nota">Ogni barra è una fascia di carico finale, e la sua altezza è il numero ' +
      'di ripetizioni finite lì dentro. Se media e mediana sono lontane, la distribuzione pende ' +
      'da una parte, e in quel caso la media da sola racconta male.</p>' +
      notaSullaLarghezza(m);

    q('istoAltri').innerHTML =
      '<div class="due-colonne">' +
      '<div class="colonna-caso" style="--tinta:var(--aiuta)">' +
        '<p class="colonna-eti">L’assetto alla fine</p>' +
        disegnaIstogramma(m.campioni.posizione, m.posizione_finale, 'assetto (POS)', 'var(--aiuta)', true) +
        '<p class="colonna-conti">Media ' + num(m.posizione_finale.media) + ', mediana ' +
        num(m.posizione_finale.mediana) + '. L’<span data-parola="assetto">assetto</span> ' +
        'non entra nella formula: si muove da solo dopo ogni gesto, e si legge accanto al ' +
        'carico, mai dentro.</p>' +
      '</div>' +
      '<div class="colonna-caso" style="--tinta:var(--serio)">' +
        '<p class="colonna-eti">Il costo nascosto</p>' +
        disegnaIstogramma(m.campioni.costo_nascosto, m.costo_finale, 'costo nascosto', 'var(--serio)', true) +
        '<p class="colonna-conti">Media ' + num(m.costo_finale.media) + '. È quello che una riuscita ' +
        'è costata senza che si veda nell’esito. Il <span data-parola="costo_nascosto">costo nascosto</span> ' +
        'è la ragione per cui riuscire non vuol dire stare bene.</p>' +
      '</div></div>';

    q('esiti').innerHTML = distribuzioneEsiti(m) +
      '<p class="nota">Su ' + num(m.ripetizioni, 0) + ' ripetizioni della stessa scena. ' +
      'Se esce una barra sola, non è un errore. Quando la catena, cioè la scena vista come ' +
      'una fila di anelli, un gesto dopo l’altro, è lunga, l’esito complessivo è quello ' +
      'dell’anello peggiore. E più anelli ci sono, più è probabile che almeno uno vada ' +
      'storto.</p>';

    q('nodo').innerHTML = bloccoNodo(m);
    q('assi').innerHTML = bloccoAssi(m);
    q('correlazioni').innerHTML = bloccoCorrelazioni(m);

    var conv = A.convergenza(m.campioni.stress, { soglia: stato.soglia, punti: 44 });
    q('convergenza').innerHTML = disegnaConvergenza(conv) +
      '<p class="verdetto-conv ' + (conv.basta_a !== null ? 'basta' : 'nonbasta') + '">' +
      esc(conv.verdetto) + '</p>' + leggiConvergenza(conv, m);

    /* Il confronto e le leve arrivano dopo, quando le loro corse sono finite:
       intanto quello che c'è già si può leggere. */
    if (window.Glossario && window.Glossario.decoraTutte) { window.Glossario.decoraTutte(); }
  }

  /* ---------------------------------------------------------------------
     I COMANDI
     --------------------------------------------------------------------- */
  function costruisciComandi() {
    var opzioni = C.CASI.filter(function (c) { return c.pn !== null; }).map(function (c) {
      return '<option value="' + esc(c.id) + '"' + (c.id === stato.scheda ? ' selected' : '') + '>' +
        esc(c.titolo) + ' — Pn ' + c.pn + '</option>';
    }).join('');

    var leve = LEVE.map(function (l) {
      return '<option value="' + l.k + '"' + (l.k === stato.leva ? ' selected' : '') + '>' +
        l.k + ' — ' + esc(l.nome) + '</option>';
    }).join('');

    q('comandi').innerHTML =
      '<div class="comandi">' +
        '<label class="comando"><span>La scena</span>' +
          '<select id="cScheda">' + opzioni + '</select></label>' +
        '<label class="comando"><span>Quanti nodi</span>' +
          '<select id="cNodi">' +
            LUNGHEZZE.map(function (l) {
              return '<option value="' + l.n + '"' + (l.n === stato.quantiNodi ? ' selected' : '') +
                '>' + esc(l.etichetta) + '</option>';
            }).join('') +
          '</select></label>' +
        '<label class="comando"><span>Trasferimento di stato</span>' +
          '<select id="cCal">' +
            '<option value="misurata"' + (stato.calibrazione === 'misurata' ? ' selected' : '') +
              '>misurato · 4,6 %</option>' +
            '<option value="storica"' + (stato.calibrazione === 'storica' ? ' selected' : '') +
              '>storico · passa tutto</option>' +
          '</select></label>' +
        /* DIECIMILA ADESSO SI PUO' CHIEDERE.
           Il menu si fermava a cinquemila, e non per una ragione statistica:
           il libro colloca la zona ragionevole «fra mille e diecimila»
           (capitolo 47). Si fermava perche' oltre quel numero la pagina
           restava bloccata troppo a lungo. Adesso il calcolo va a pezzi, con
           l'avanzamento che si vede, e il limite del libro torna a essere il
           limite del menu. Accanto a ogni voce c'e' scritto quanto costa e a
           che cosa serve: sceglierne una non deve essere indovinare. */
        '<label class="comando"><span>Ripetizioni</span>' +
          '<select id="cRip">' +
            [[100, 'per farsi un’idea'], [300, ''], [500, 'un buon punto di partenza'],
             [1000, 'quadro stabile'], [2000, ''], [5000, 'per differenze piccole'],
             [10000, 'molto preciso, qualche secondo']].map(function (v) {
              return '<option value="' + v[0] + '"' + (v[0] === stato.ripetizioni ? ' selected' : '') +
                '>' + num(v[0], 0) + (v[1] ? ' · ' + v[1] : '') + '</option>';
            }).join('') +
          '</select></label>' +
        '<label class="comando"><span>Seme del dado</span>' +
          '<input type="number" id="cSeme" value="' + stato.seme + '" min="0" step="1"></label>' +
        '<label class="comando"><span>Soglia: intervallo ±</span>' +
          '<select id="cSoglia">' +
            [0.05, 0.1, 0.25, 0.5, 1, 2, 5].map(function (n) {
              return '<option value="' + n + '"' + (n === stato.soglia ? ' selected' : '') + '>' +
                num(n, 2) + '</option>';
            }).join('') +
          '</select></label>' +
        '<label class="comando"><span>Variante B: leva</span>' +
          '<select id="cLeva">' + leve + '</select></label>' +
        '<label class="comando"><span>di quanto</span>' +
          '<select id="cDelta">' +
            [-20, -15, -10, -5, 5, 10, 15, 20].map(function (n) {
              return '<option value="' + n + '"' + (n === stato.delta ? ' selected' : '') + '>' +
                (n > 0 ? '+' : '') + n + '</option>';
            }).join('') +
          '</select></label>' +
      '</div>' +
      '<div class="barra-azioni">' +
        '<button class="primario" id="rifai">Ripeti la scena</button>' +
        '<button id="nuovoSeme">Cambia dado</button>' +
        '<span class="nota" id="statoCalcolo"></span>' +
      '</div>' +
      '<div id="avanzamento" style="display:none;margin-top:10px"></div>';

    /* IL CALCOLO DURA, E MENTRE DURA SI DEVE VEDERE CHE DURA.
       Prima qui si scriveva «Sto rigiocando la scena…» e si lasciava un
       fotogramma al browser perche' la scritta comparisse; poi partiva un
       calcolo lungo e immobile. Adesso il calcolo stesso va a pezzi e mostra
       da solo a che punto e', percio' basta avviarlo: la barra e le frasi le
       scrive lui. */
    function conAvviso(rifaiLeve) {
      var s = q('statoCalcolo');
      if (s) { s.textContent = ''; }
      disegna(rifaiLeve);
    }

    /* UNA CASELLA VUOTA NON E' UN NUMERO, E LA PAGINA NON DEVE FINGERE DI SI'.
       Svuotando la casella del seme, parseFloat('') dava NaN: il seme diventava
       NaN, a schermo compariva «(NaN)», e — molto peggio — tutte le giocate
       davano lo stesso identico esito, perche' il generatore partiva sempre
       dallo stesso posto. La pagina intanto continuava a dichiarare n = 500:
       cinquecento copie della stessa partita, spacciate per cinquecento
       giocate, nella pagina che esiste per denunciare esattamente questo.
       Adesso un valore non numerico non entra: resta l'ultimo buono, la
       casella lo rimette, e la riga di stato dice che cosa e' successo. */
    function lega(id, campo, numero) {
      var el = q(id);
      el.addEventListener('change', function () {
        if (numero) {
          var v = parseFloat(el.value);
          if (!isFinite(v)) {
            el.value = stato[campo];
            var s = q('statoCalcolo');
            if (s) {
              s.textContent = 'Quella casella è rimasta vuota, e un seme vuoto non è un ' +
                'numero. Ho rimesso l’ultimo valore buono, ' + stato[campo] + '. ' +
                'Scrivine un altro se vuoi cambiare i dadi.';
            }
            return;
          }
          stato[campo] = v;
        } else {
          stato[campo] = el.value;
        }
        conAvviso(campo === 'scheda' || campo === 'quantiNodi' ||
                  campo === 'calibrazione' || campo === 'seme');
      });
    }
    lega('cScheda', 'scheda', false);
    lega('cNodi', 'quantiNodi', true);
    lega('cCal', 'calibrazione', false);
    lega('cRip', 'ripetizioni', true);
    lega('cSeme', 'seme', true);
    lega('cSoglia', 'soglia', true);
    lega('cLeva', 'leva', false);
    lega('cDelta', 'delta', true);

    q('rifai').addEventListener('click', function () { conAvviso(true); });
    q('nuovoSeme').addEventListener('click', function () {
      /* il seme cambia in modo prevedibile: si puo' tornare indietro
         scrivendolo a mano. Niente Math.random(): la riproducibilita' e'
         una promessa del progetto, non una comodita'. */
      stato.seme = (stato.seme + 7919) % 1000000;
      q('cSeme').value = stato.seme;
      conAvviso(true);
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    var m = (window.location.hash || '').match(/caso=([a-z0-9-]+)/i);
    if (m && C.CASI.some(function (c) { return c.id === m[1] && c.pn !== null; })) {
      stato.scheda = m[1];
    }
    costruisciComandi();
    disegna(true);

    /* IL COLLEGAMENTO A UNA SEZIONE FUNZIONA ANCHE QUI.
       Il browser cerca l'ancora appena finisce di leggere l'HTML, e qui
       dentro a quel momento i grafici non ci sono ancora: la pagina
       restava in cima. Adesso, quando i contenuti ci sono, si va dove
       l'indirizzo dice — cosi' MONTECARLO.html#leve porta alle leve. */
    var ancora = (window.location.hash || '').replace(/^#/, '');
    if (ancora && !/=/.test(ancora)) {
      var dove = document.getElementById(ancora);
      if (dove) { dove.scrollIntoView(); }
    }

    q('tema').addEventListener('click', function () {
      var attuale = document.documentElement.getAttribute('data-tema');
      var nuovo = attuale === 'scuro' ? 'chiaro' : 'scuro';
      document.documentElement.setAttribute('data-tema', nuovo);
      q('tema').textContent = nuovo === 'scuro' ? 'Tema chiaro' : 'Tema scuro';
    });
    q('stampa').addEventListener('click', function () { window.print(); });
  });

  window.MonteCarloUI = { LEVE: LEVE, studiaLeve: studiaLeve, stato: stato };
})();
