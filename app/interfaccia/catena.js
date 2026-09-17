/* SIMULATORE 3.0 — Interfaccia della catena e dell'analisi statistica.
   Script classico, nessuna fetch, nessun modulo: funziona da file:// */

(function () {
  'use strict';

  var S = window.Spiegazioni, N = window.Nucleo, St = window.Stato,
      A = window.Analisi, MS = window.MicroSemantica, Lg = window.Lingua, semeDa = window.semeDa;

  /* Le regole dell'italiano si chiedono a lingua.js, e se non c'e' si deve
     sentire subito: prima Lingua veniva usata a meta' file senza che nessuno
     l'avesse dichiarata, e in una pagina caricata nell'ordine sbagliato il
     conto si fermava a meta' senza dire perche'. */
  (function (mancanti) {
    if (!mancanti.length) { return; }
    throw new Error('catena.js: manca ' + mancanti.join(', ') +
      '. Ordine di caricamento: calibrazione.js, lingua.js, casuale-mt.js, nucleo.js, ' +
      'stato.js, microsemantica.js, analisi.js, spiegazioni.js, e solo dopo questo file.');
  }([['Spiegazioni', S], ['Nucleo', N], ['Stato', St], ['Analisi', A],
     ['MicroSemantica', MS], ['Lingua', Lg], ['semeDa (casuale-mt.js)', semeDa]]
    .filter(function (x) { return !x[1]; })
    .map(function (x) { return x[0]; })));


  var calibrazione = null;   // impostata all'avvio

  var GESTI_INIZIALI = [
    'sentire la sveglia', 'alzarsi dal letto', "bere un bicchiere d’acqua", 'lavarsi il viso',
    'vestirsi', 'preparare la borsa', 'cercare le chiavi', 'non trovare le chiavi',
    'controllare le tasche', 'rovistare nel cassetto', 'trovare le chiavi',
    'prendere il telefono', 'controllare l’ora', 'fretta improvvisa',
    'spegnere le luci', 'chiudere il gas', 'aprire la porta', 'uscire e chiudere'
  ];

  var v = { P0: 74, E: -12, T: -8, M: -4, C: 1, STR: 42, POS: 58 };
  var CURSORI = [
    { k: 'P0',  min: 1, max: 99, nome: 'Punto di partenza medio',  sotto: 'quanto sono fattibili questi gesti (P0)' },
    { k: 'E',   min: -30, max: 30, nome: 'Il corpo adesso',        sotto: 'energia, sonno, dolore (E)' },
    { k: 'T',   min: -30, max: 30, nome: 'La pressione del tempo', sotto: 'fretta (T)' },
    { k: 'M',   min: -30, max: 30, nome: "L’ambiente intorno",     sotto: 'spazio, oggetti, rumore (M)' },
    { k: 'C',   min: 0, max: 10, nome: 'Pezzi da coordinare',      sotto: 'complessità media (C)' },
    { k: 'STR', min: 0, max: 100, nome: 'Carico di partenza',      sotto: 'con quanto stress inizi (STR)' },
    /* «POS» E' L'UNICA SIGLA CHE IL GLOSSARIO NON SA CERCARE.
       Le sigle dei nove termini della formula sono registrate anche come
       secondo nome della loro voce; «assetto» pero' non e' un termine della
       formula — e' una grandezza che si legge — e per quelle il secondo nome
       non c'e'. Risultato: questo cursore era l'unico dei sette a non
       aprirsi, e non lo diceva a nessuno, perche' il controllo automatico
       guarda le pagine e non le parole che nascono dal programma. Qui si
       chiede la voce con il suo nome, e il cursore si apre come gli altri.
       Trovato provando il simulatore il 10/09/2026. */
    { k: 'POS', min: 0, max: 100, nome: 'Assetto di partenza',     sotto: 'quanto sei stabile dentro (POS)',
      voce: 'assetto' }
  ];

  var ultimaCatena = null, ultimoRis = null;

  function esc(t) {
    return String(t).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function q(id) { return document.getElementById(id); }

  /* ---- costruzione della catena dai testi ----
     LE CONDIZIONI SEGUONO IL GESTO, NON LA RIGA IN CUI STA SCRITTO.
     Prima seguivano la riga: il primo gesto partiva da 74, il sesto da 74
     meno quattro, e cosi' via. Sembrava innocuo, e invece spegneva il
     pulsante «Aggiungi 40 righe ripetute», che esiste apposta per far
     vedere il controllo delle repliche mentre lavora: due righe identiche
     finivano a due indici diversi, ricevevano condizioni diverse, e per il
     controllo erano due gesti diversi. A schermo: «Nodi forniti 58 · Nodi
     distinti 58 · Repliche scartate 0». La dimostrazione non si accendeva
     mai, e nessuno poteva capire perche'.
     Adesso le condizioni si prendono dalla PRIMA riga in cui quel gesto
     compare: la catena predefinita — diciotto gesti tutti diversi — resta
     identica a prima, e due righe uguali diventano finalmente uguali anche
     per il controllo. Trovato provando il simulatore il 10/09/2026. */
  function costruisciCatena() {
    var righe = q('gesti').value.split('\n').map(function (r) { return r.trim(); })
                 .filter(function (r) { return r.length; });
    var st = { stress_str: v.STR, posizione_pos: v.POS, debito_deb: 0, rip: 'debole' };
    var primaVolta = {};
    righe.forEach(function (g, i) {
      var k = g.toLowerCase().replace(/\s+/g, ' ');
      if (primaVolta[k] === undefined) { primaVolta[k] = i; }
    });
    return righe.map(function (g, i) {
      var j = primaVolta[g.toLowerCase().replace(/\s+/g, ' ')];
      return {
        id: 'g' + i, descrizione: g,
        p0: N.clampInt(v.P0 - (j % 5) * 4, 1, 99),
        modificatori: {
          energia_e: v.E + (j % 4) * -3, informazione_i: 0,
          tempo_t: v.T - Math.floor(j / 3) * 2, materiale_m: v.M - (j % 3),
          bonus_bp: 0, complessita_c: v.C
        },
        stato_prima: st
      };
    });
  }

  /* Il meno di un numero negativo e' «−», non il trattino della tastiera.
     Chi sa scrivere un numero in italiano e' lingua.js, e nessun altro. */
  function conSegno(n) { return (Number(n) > 0 ? '+' : '') + Lg.intero(n); }

  function costruisciCursori() {
    q('cursoriCatena').innerHTML = CURSORI.map(function (c) {
      return '<div class="cursore"><label for="c_' + c.k + '"><span class="nome">' +
        '<span data-parola="' + esc(c.voce || c.k) + '">' + esc(c.nome) + '</span>' +
        '<small>' + esc(c.sotto) + '</small></span><span class="valore" id="v_' + c.k + '">' +
        Lg.intero(v[c.k]) +
        '</span></label><input type="range" id="c_' + c.k + '" min="' + c.min + '" max="' + c.max +
        '" value="' + v[c.k] + '" aria-label="' + esc(c.nome) + '"></div>';
    }).join('');
    CURSORI.forEach(function (c) {
      q('c_' + c.k).addEventListener('input', function (e) {
        v[c.k] = parseInt(e.target.value, 10);
        q('v_' + c.k).textContent = Lg.intero(v[c.k]);
      });
    });
  }

  function tassello(k, val, sotto) {
    return '<div class="tassello"><div class="k">' + esc(k) + '</div><div class="v">' + val + '</div>' +
      (sotto ? '<div class="s">' + esc(sotto) + '</div>' : '') + '</div>';
  }  /* ---- il carico accumulato lungo la catena ----
     RIFATTO IL 04/09/2026.
     Era una linea rossa con dei pallini su una griglia. Adesso ha sotto
     l'area riempita, ed e' quello che cambia di piu': la linea dice dove
     sei, l'area dice quanto ne hai accumulato — che in un grafico
     dell'accumulo e' proprio la cosa da vedere.

     Il tetto a 100 resta segnato perche' e' il punto in cui il modello
     smette di distinguere (capitolo 29): da li' in su un gesto pessimo e
     uno catastrofico danno lo stesso numero, e i pallini diventano pieni
     per dirlo. */
  function disegnaTraiettoria(ris) {
    var nodi = ris.nodi;
    var L = 46, R = 16, T = 18, B = 34, W = 900, H = 270;
    var pw = W - L - R, ph = H - T - B;
    var n = nodi.length;
    var x = function (i) { return L + (n <= 1 ? pw / 2 : (i / (n - 1)) * pw); };
    var y = function (val) { return T + ph - (val / 100) * ph; };

    var g = [];
    g.push('<defs><linearGradient id="areaCarico" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="var(--ostacola)" stop-opacity="0.30"/>' +
      '<stop offset="1" stop-color="var(--ostacola)" stop-opacity="0.02"/>' +
      '</linearGradient></defs>');

    /* griglia */
    [0, 25, 50, 75, 100].forEach(function (t) {
      g.push('<line x1="' + L + '" y1="' + y(t) + '" x2="' + (W - R) + '" y2="' + y(t) +
        '" stroke="var(--griglia)" stroke-width="1"/>');
      g.push('<text x="' + (L - 10) + '" y="' + (y(t) + 4) + '" text-anchor="end" ' +
        'font-size="11" fill="var(--inchiostro-3)">' + t + '</text>');
    });
    g.push('<line x1="' + L + '" y1="' + y(0) + '" x2="' + (W - R) + '" y2="' + y(0) +
      '" stroke="var(--linea-base)" stroke-width="1.5"/>');

    /* il tetto: dove il modello smette di distinguere */
    g.push('<line x1="' + L + '" y1="' + y(100) + '" x2="' + (W - R) + '" y2="' + y(100) +
      '" stroke="var(--ostacola)" stroke-width="1.5" stroke-dasharray="5 4" opacity="0.8"/>');
    g.push('<rect x="' + (W - R - 96) + '" y="' + (y(100) - 20) + '" width="96" height="17" rx="8.5" ' +
      'fill="var(--ostacola)"/>');
    g.push('<text x="' + (W - R - 48) + '" y="' + (y(100) - 8) + '" text-anchor="middle" ' +
      'font-size="10.5" font-weight="700" fill="#fff">tetto: 100</text>');

    var pts = nodi.map(function (nd, i) { return [x(i), y(nd.stato_persistente.stress_str)]; });

    /* l'area sotto la linea */
    var area = 'M ' + x(0) + ' ' + y(ris.stato_iniziale.stress_str);
    pts.forEach(function (p) { area += ' L ' + p[0] + ' ' + p[1]; });
    area += ' L ' + pts[pts.length - 1][0] + ' ' + y(0) + ' L ' + x(0) + ' ' + y(0) + ' Z';
    g.push('<path d="' + area + '" fill="url(#areaCarico)"/>');

    /* la linea */
    var d = 'M ' + x(0) + ' ' + y(ris.stato_iniziale.stress_str);
    pts.forEach(function (p) { d += ' L ' + p[0] + ' ' + p[1]; });
    g.push('<path d="' + d + '" fill="none" stroke="var(--ostacola)" stroke-width="2.4" ' +
      'stroke-linejoin="round" stroke-linecap="round"/>');

    /* i marcatori: pieni quando il carico e' al tetto e non distingue piu' */
    pts.forEach(function (p, i) {
      var sat = nodi[i].stato_persistente.stress_str >= 100;
      g.push('<circle cx="' + p[0] + '" cy="' + p[1] + '" r="' + (sat ? 5 : 3.6) +
        '" fill="' + (sat ? 'var(--ostacola)' : 'var(--superficie)') +
        '" stroke="var(--ostacola)" stroke-width="2"><title>' +
        esc(nodi[i].descrizione) + ' — carico ' +
        nodi[i].stato_persistente.stress_str + '</title></circle>');
    });

    /* asse dei gesti */
    var passo = Math.max(1, Math.ceil(n / 12));
    for (var i = 0; i < n; i += passo) {
      g.push('<text x="' + x(i) + '" y="' + (H - 12) + '" text-anchor="middle" ' +
        'font-size="10.5" fill="var(--inchiostro-3)">' + (i + 1) + '</text>');
    }

    q('grafico').innerHTML =
      '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" role="img" ' +
      'aria-label="Andamento del carico accumulato lungo la catena di gesti, da 0 a 100"' +
      ' style="max-width:100%;height:auto">' + g.join('') + '</svg>' +
      '<div class="legenda">' +
      '<span class="voce-legenda"><i class="segno linea" style="background:var(--ostacola)"></i>carico accumulato, gesto per gesto</span>' +
      '<span class="voce-legenda"><i class="segno" style="background:var(--ostacola);opacity:.28"></i>quanto se n’è accumulato</span>' +
      '<span class="voce-legenda"><i class="segno tratteggio"></i>il tetto: sopra, il modello non distingue più</span>' +
      '</div>';
  }

  /* UNA BARRA SOLA NON E' UN ERRORE, ed e' la prima cosa che si vede
     aprendo questa pagina: con i valori predefiniti la distribuzione degli
     esiti e' una barra al 100 %.

     Misurato il 04/09/2026, 500 ripetizioni della catena predefinita:
     probabilita' 40 per gesto, mediana di 14 gesti falliti su 18, e ZERO
     ripetizioni in cui tutti
     e diciotto riescono. L'esito aggregato di una catena e' deciso dal suo
     anello peggiore, quindi piu' la catena e' lunga piu' la distribuzione si
     stringe su un esito solo — a 4 gesti gli esiti diversi sono quattro, a
     12 e' uno.

     Non si tarano i cursori per far uscire un grafico piu' bello: sarebbe
     fabbricare un risultato. Si dice al lettore che cosa sta guardando, e
     come aprirlo. E' il capitolo 27 visto dall'altra parte: li' si conta
     troppo, qui si concentra troppo. */
  function notaDistribuzione(m) {
    var prima = m.esiti[0];
    if (!prima || prima.quota < 0.85) { return ''; }
    var quanti = (m.granularita && m.granularita.nodi_distinti) || 0;
    /* QUANTE BARRE CI SONO DAVVERO. La nota diceva «una barra sola» anche
       quando le barre erano quattro, e finiva consigliando «con quattro
       gesti gli esiti diventano quattro» a chi di gesti ne aveva quattro:
       il consiglio di fare quello che si era gia' fatto. Adesso il titolo
       guarda quante barre ci sono, e il consiglio parte da dove sta il
       lettore. Trovato provando il simulatore il 10/09/2026. */
    var barre = m.esiti.length;
    var comeAprirla = quanti > 2
      ? 'Accorcia la catena, perché meno anelli vuol dire meno occasioni di rompersi. Da ' +
        quanti + ' gesti scendi a due o tre, e la differenza si vede subito.'
      : 'La catena è già corta quanto può, e resta soltanto l’altra strada.';
    return '<div class="nota-distribuzione">' +
      '<strong>' + (barre === 1
        ? 'Una barra sola non è un errore.'
        : 'Una barra che si prende quasi tutto non è un errore.') + '</strong> ' +
      'Il motivo è che l’esito di una catena è deciso dal suo anello peggiore: basta che ' +
      'uno dei gesti vada male, e tutta la catena risulta mancata. Con ' +
      (quanti === 1 ? 'un gesto solo' : quanti + ' gesti di seguito') +
      ' questo succede quasi sempre, ed è per questo che ' +
      (prima.quota * 100).toFixed(0) + ' volte su 100 esce lo stesso esito.' +
      '<br>Per vedere esiti diversi ci sono due strade, e agiscono su due punti diversi. ' +
      comeAprirla +
      ' Oppure alza il punto di partenza e abbassa il carico. Così non è la fila ad ' +
      'accorciarsi, ma ogni singolo anello a reggere di più.' +
      '</div>';
  }

  /* ---- perché la probabilità è cambiata rispetto all'anello prima ----
     Il capitolo 23 dice che una catena e' fatta di anelli, e che quello che
     passa da un anello al successivo e' lo stato: carico, assetto, costo
     nascosto. Qui in piu' c'e' la Pn di ogni anello, ma la tabella non
     diceva mai PERCHE' fosse cambiata rispetto a quella di prima — restava
     un elenco di numeri paralleli, e chi legge doveva ricostruire da solo
     il confronto.
     Ogni anello del motore porta con se' `termini`: la stessa scomposizione
     P0/E/I/T/M/BP/C/piSTR/DEB che il capitolo 5 mette in fila per un nodo
     solo. Confrontando termine per termine l'anello con quello prima, si
     vede subito quale pezzo si e' mosso di piu' — quasi sempre il carico
     accumulato (piSTR), perche' e' l'unico termine che la catena porta
     avanti da un anello all'altro; gli altri li ha scritti la persona nei
     cursori qui sopra e restano fissi gesto per gesto.
     Non e' un secondo calcolo: e' lo stesso numero che il motore ha gia'
     prodotto, letto un anello alla volta invece che uno solo. */
  var NOMI_TERMINE = { P0: 'il punto di partenza', E: 'il corpo', I: 'quanto è chiaro',
    T: 'la fretta', M: 'l’ambiente', BP: 'la protezione', C: 'la complessità',
    piSTR: 'il carico accumulato', DEB: 'il debito' };

  function percheCambia(prima, dopo) {
    if (!prima) {
      return 'primo anello della catena (ogni gesto è un anello). Non c’è un anello ' +
        'prima con cui confrontarla';
    }
    var dPn = dopo.pn - prima.pn;
    if (dPn === 0) { return 'uguale all’anello prima'; }
    var maggiore = null, maxAss = 0;
    Object.keys(NOMI_TERMINE).forEach(function (k) {
      var d = (dopo.termini[k] || 0) - (prima.termini[k] || 0);
      if (Math.abs(d) > maxAss) { maxAss = Math.abs(d); maggiore = { k: k, d: d }; }
    });
    if (!maggiore || maxAss === 0) {
      /* la Pn e' passata dal taglio 5–95: i termini non si sono mossi, ma
         il numero finale si', perche' uno dei due confinava con il bordo */
      return conSegno(dPn) + ' per il taglio ai bordi: i termini non sono cambiati, ' +
        'ma uno dei due risultati toccava il confine 5–95';
    }
    return conSegno(dPn) + ', soprattutto per ' + NOMI_TERMINE[maggiore.k] +
      ' (' + conSegno(maggiore.d) + ')';
  }

  /* ---- esecuzione ---- */
  function esegui() {
    var catena = costruisciCatena();
    if (!catena.length) {
      /* AUDIT 19/8: prima usciva in silenzio lasciando in pagina i risultati
         del calcolo precedente, come se fossero ancora validi per una catena
         vuota — fuorviante più che un errore. Ora lo dice e nasconde tutto. */
      q('erroreCatena').textContent = 'L’elenco dei gesti è vuoto, e senza gesti non c’è ' +
        'una catena da far girare. Scrivi qui sopra almeno un gesto — uno per riga — e poi ' +
        'premi «Esegui la catena».';
      q('erroreCatena').style.display = '';
      ['bloccoGran', 'bloccoDiag', 'bloccoTrai', 'bloccoMC', 'bloccoRacconto'].forEach(function (id) {
        var el = q(id);
        if (el) { el.style.display = 'none'; }
      });
      ultimaCatena = null;
      return;
    }
    q('erroreCatena').style.display = 'none';
    var seme = semeDa(q('seme').value);
    ultimaCatena = catena;

    /* asse 1 */
    var gran = A.verificaGranularita(catena);
    var colore = gran.verdetto === 'valida' ? 'var(--buono)' :
                 (gran.verdetto === 'accettabile' ? 'var(--attenzione)' : 'var(--critico)');
    q('gran').innerHTML =
      tassello('Gesti scritti', gran.nodi_forniti, 'le righe dell’elenco qui sopra') +
      tassello('Gesti diversi', '<span style="color:' + colore + '">' + gran.nodi_distinti +
               '</span>', 'quelli davvero diversi fra loro: le copie non contano') +
      tassello('Righe ripetute', gran.repliche,
               gran.repliche ? 'stesso gesto e stesse condizioni: cambierebbe solo il dado'
                             : 'non ce n’era nessuna') +
      tassello('Gonfiaggio', '×' + Lg.numero(gran.fattore_gonfiaggio,
               gran.fattore_gonfiaggio === Math.round(gran.fattore_gonfiaggio) ? 0 : 2),
               'di quanto il conteggio sarebbe cresciuto tenendo dentro anche le copie') +
      /* IL NOME DELLA FASCIA NON E' LA DESCRIZIONE DI QUESTA CATENA.
         Con cinque gesti diversi, tutti e cinque distinti, questo tassello
         scriveva in grande «Un gesto singolo»: e' il nome della fascia da 1
         a 5, non il numero dei gesti di questa catena — che sta gia' scritto
         sopra, nel tassello «Gesti diversi». Letto veloce sembrava dire
         l'opposto di quello che diceva «Gesti diversi» due tasselli prima.
         La stessa correzione era gia' stata fatta sulla pagina della scena
         (vedi scena-ui.js, disegnaCatena): qui mancava ancora.
         Trovato provando il simulatore il 15/09/2026. */
      tassello('Quanto è grande questa scena', '«' + esc(gran.scala.etichetta) + '»',
               'è il nome della fascia, non il numero dei gesti di questa catena: va da ' +
               gran.scala.min + ' a ' + gran.scala.max + ' gesti diversi, e qui ce ne sono ' +
               gran.nodi_distinti + '.');
    /* La spiegazione arriva da analisi.js e, quando ci sono delle copie,
       usa la parola «campione»: chi legge questa pagina non ha nessun motivo
       di saperla, e il posto per spiegarla e' questo, non il glossario in
       fondo. */
    q('granSpiega').innerHTML = esc(gran.spiegazione) + (gran.repliche
      ? ' <em>Campione</em> qui vuol dire l’insieme dei casi su cui si fa il conto, e ' +
        'allargarlo con delle copie non lo rende più solido: lo fa soltanto sembrare.'
      : '');
    q('bloccoGran').style.display = '';

    /* la catena vera gira sui nodi distinti, con la calibrazione scelta */
    var ris = MS.eseguiCatenaMicro(gran.catena_deduplicata,
      { rng: new window.CasualePython(seme), calibrazione: calibrazione });
    ultimoRis = ris;

    /* diagnosi: il modello sta ancora distinguendo qualcosa? */
    var sat = ris.saturazione, dz = ris.diagnosi;
    /* «ZONA MICRO-SEMANTICA» ERA GERGO PURO, e stava scritto sopra la cosa
       piu' utile del riquadro. Dice quanto e' fitto il racconto: se da un
       gesto al successivo cambia troppo poco, o troppo, o quel che serve.
       Il motore lo dice in due pezzi separati dai due punti — il giudizio e
       il perche' — e fino a oggi il perche' veniva buttato via. */
    var zona = String(dz.zona).split(':');
    q('diag').innerHTML =
      /* «100,0 %» non e' come si scrive cento per cento: il decimale serve
         solo dove c'e' («4,6 %»). */
      tassello('Quanto arriva al gesto dopo',
               Lg.numero(ris.fattore_trasferimento * 100,
                         (ris.fattore_trasferimento * 100) % 1 === 0 ? 0 : 1) + ' %',
               ris.fattore_trasferimento >= 1
                 ? 'passa tutto: è il comportamento vecchio, quello che mandava il carico al tetto'
                 : 'è la quota misurata sulla prova ufficiale dei cinquecento gesti') +
      /* Anche questa media arriva dal motore come decimale, e stampata cosi'
         com'e' esce «12.41»: il punto inglese in mezzo a una fila di numeri
         italiani. */
      /* Con un gesto solo non c'e' nessun «gesto dopo», e la media era zero:
         una misura che non esiste, stampata sotto la riga che dice che non
         c'e' ancora una catena da giudicare. */
      tassello('Quanto è fitta la catena', zona[0],
               (zona[1] ? zona[1].trim() : '') +
               (ris.nodi.length > 1
                 ? (zona[1] ? ' · ' : '') +
                   'in media, fra un gesto e quello dopo i nove valori si spostano in ' +
                   'tutto di ' + Lg.numero(dz.variazione_media, 2) + ' punti'
                 : '')) +
      tassello('Probabilità diverse', sat.valori_pn_distinti,
               'quanti valori diversi ha preso la probabilità, su ' +
               Lg.plurale(ris.nodi.length, 'gesto', 'gesti')) +
      tassello('Da quanti gesti il carico non si muove',
               Lg.plurale(sat.str_fermo_da, 'gesto', 'gesti'),
               sat.str_fermo_da > 10 ? 'sono troppi' : 'è normale') +
      tassello('Distingue ancora?', sat.informativo ? 'sì' : 'no',
               sat.informativo ? 'gesti diversi danno numeri diversi'
                               : 'i numeri si sono appiattiti: da qui in poi non dicono più niente');
    q('avvisiSat').innerHTML = sat.avvisi.map(function (a) {
      return '<div class="avviso" style="border-left-color:var(--critico);' +
        'background:color-mix(in srgb, var(--critico) 7%, var(--superficie))">' + esc(a) + '</div>';
    }).join('');
    q('bloccoDiag').style.display = '';

    /* il racconto della sequenza: non com'è andato un gesto, ma che storia è stata */
    if (window.Racconto && window.VistaRacconto) {
      q('racconto').innerHTML = window.VistaRacconto.disegna(
        window.Racconto.componiRaccontoCatena(ris));
      q('bloccoRacconto').style.display = '';
    }

    q('strIniziale').textContent = ris.stato_iniziale.stress_str;
    q('strFinale').innerHTML = ris.stato_finale.stress_str + '<span class="unita"> su 100</span>';
    var e = S.esiti[ris.esito], col = S.colori[e.stato];
    q('pillolaEsito').innerHTML = '<span class="punto" style="background:' + col + '"></span>' +
      '<span class="glifo" style="color:' + col + '">' + e.glifo + '</span>' + esc(e.titolo);

    disegnaTraiettoria(ris);

    var primoSaturo = -1;
    ris.nodi.forEach(function (nd, i) { if (primoSaturo < 0 && nd.stato_persistente.stress_str >= 100) { primoSaturo = i; } });
    /* Quanti gesti restano dopo il punto in cui il carico ha toccato il
       tetto. Se e' uno solo, «i 1 gesti successivi» si legge male; se non
       ne resta nessuno, la frase direbbe «i 0 gesti successivi», che e'
       peggio ancora. Tre casi, tre frasi, e nessuna montata a indovinare. */
    var restanti = ris.nodi.length - primoSaturo - 1;
    var cosaResta = restanti === 0
      ? ' Era anche l’ultimo della catena, quindi non è andato perso niente.'
      : (restanti === 1
          ? ' Da lì in poi il modello è cieco: l’ultimo gesto non può più cambiare niente.'
          : ' Da lì in poi il modello è cieco: i ' + restanti +
            ' gesti che vengono dopo non possono più cambiare niente.');
    q('notaSat').innerHTML = primoSaturo >= 0
      ? '<strong style="color:var(--critico)">Il carico satura, cioè tocca il tetto di 100 ' +
        'oltre cui non sale, al gesto ' +
        (primoSaturo + 1) + ' di ' + ris.nodi.length + '.</strong>' + cosaResta
      : 'Il carico non satura mai, cioè non tocca il tetto di 100 oltre cui non sale, e quindi ' +
        'il modello continua a distinguere per tutta la catena, dal primo gesto all’ultimo.';

    /* IL PERCHE' STA DENTRO LA CELLA DELLA PROBABILITA', NON IN UNA COLONNA
       IN PIU'. Una settima colonna sembrava la scelta pulita, ma a schermo
       stretto — un telefono, o questa stessa pagina nel riquadro
       dell'anteprima — sette colonne in una tabella che ne aveva sei
       stringono ogni cella fino a spezzare le parole una lettera per riga:
       «PER / CAM…», illeggibile. La spiegazione resta, ma appoggiata sotto
       il numero a cui si riferisce, nella stessa cella, piu' piccola: la
       tabella non si allarga, e chi legge trova il perche' proprio dove sta
       guardando gia'. Trovato provando il simulatore il 15/09/2026. */
    q('tabCatena').innerHTML =
      '<tr><th>#</th><th>Gesto</th><th style="text-align:right">probabilità</th>' +
      '<th style="text-align:right">dado</th>' +
      '<th>Esito</th><th style="text-align:right">carico ceduto</th>' +
      '<th style="text-align:right">carico</th></tr>' +
      ris.nodi.map(function (nd, i) {
        return '<tr><td>' + (i + 1) + '</td><td>' + esc(nd.descrizione) + '</td><td class="num">' + nd.pn +
          '<br><small style="font-weight:400;color:var(--inchiostro-3)">' +
          esc(percheCambia(i > 0 ? ris.nodi[i - 1] : null, nd)) + '</small>' +
          '</td><td class="num">' + nd.tiro + '</td><td style="font-size:12px">' + esc(S.esiti[nd.esito].titolo) +
          '</td><td class="num">' + conSegno(nd.delta_ceduto.stress_str) +
          '</td><td class="num">' + nd.stato_persistente.stress_str + '</td></tr>';
      }).join('');
    q('bloccoTrai').style.display = '';
    q('bloccoMC').style.display = '';
    q('mcTasselli').innerHTML = '';
    q('mcEsiti').innerHTML = '';
    q('mcNota').innerHTML = 'Scegli qui sotto quante volte rigiocare la scena. ' +
      'Più giocate fai, più stretto diventa il margine di incertezza intorno alla media: ' +
      'con poche giocate il caso pesa ancora molto, con molte non pesa quasi niente.';
  }

  /* ---- Monte Carlo ---- */
  function montecarlo(rip) {
    if (!ultimaCatena) { return; }
    q('statoMC').textContent = 'Sto rigiocando la scena…';
    setTimeout(function () {
      var seme = semeDa(q('seme').value);
      var t0 = performance.now();
      var m = A.montecarlo(ultimaCatena, { ripetizioni: rip, seme: seme, calibrazione: calibrazione });
      var ms = Math.round(performance.now() - t0);
      var st = m.stress_finale;

      q('mcTasselli').innerHTML =
        tassello('Giocate', Lg.intero(rip),
                 'volte che la scena è stata rigiocata da capo, con dadi nuovi') +
        tassello('Gesti diversi', m.granularita.nodi_distinti, 'in ogni giocata') +
        tassello('Valutazioni', Lg.intero(m.valutazioni_totali),
                 'i due numeri qui accanto moltiplicati fra loro: un conto che non si usa ' +
                 'mai, perché quello che si conta è la giocata') +
        tassello('Carico finale medio', Lg.numero(st.media, 2),
                 'rifacendo tutto da capo, 95 volte su 100 la media finirebbe dentro ' +
                 '± ' + Lg.numero(st.semiampiezza_95, 2) + ' da questo numero') +
        tassello('Il valore di mezzo', st.mediana,
                 'metà delle giocate finisce sotto e metà sopra — si chiama mediana; ' +
                 'in tutto si va da ' + st.minimo + ' a ' + st.massimo) +
        tassello('Quanto ci è voluto', Lg.numero(ms / 1000) + ' secondi',
                 m.calibrazione === 'storica'
                   ? 'con il comportamento vecchio, quello che passa tutto'
                   : 'con la taratura misurata, quella che passa il 4,6 %');

      /* LA DISTRIBUZIONE DEGLI ESITI aveva un componente in prestito: le
         righe di «che cosa aiuta e che cosa ostacola», che servono a dire
         quanto un valore sposta la probabilita'. Qui non si sposta niente:
         si dice quante volte su cento e' uscito ognuno dei nove esiti. E'
         un'altra cosa, e adesso ha un componente suo, con il glifo
         dell'esito e il conteggio accanto alla percentuale.

         Il colore restava scritto in linea, e per questo la barra era di
         tinta piena: adesso arriva come variabile e il foglio ci costruisce
         la sfumatura, come sulle altre barre dell'applicazione. */
      var max = m.esiti[0].quota;
      q('mcEsiti').innerHTML = '<div class="distribuzione">' + m.esiti.map(function (o) {
        var info = S.esiti[o.chiave] || { titolo: o.chiave, stato: 'attenzione', glifo: '•' };
        var w = (o.quota / max) * 100;
        var quante = Math.round(o.quota * rip);
        return '<div class="riga-distribuzione" style="--tinta:' + S.colori[info.stato] + '">' +
          '<span class="dist-glifo">' + esc(info.glifo) + '</span>' +
          '<span class="dist-nome">' + esc(info.titolo) + '</span>' +
          '<span class="dist-pista"><span class="dist-barra" style="width:' + w + '%"></span></span>' +
          '<span class="dist-quota">' + window.Lingua.numero(o.quota * 100) +
            '<small>%</small></span>' +
          '<span class="dist-conta">' + Lg.intero(quante) + '</span>' +
          '</div>';
      }).join('') + '</div>' + notaDistribuzione(m);

      q('mcNota').innerHTML = '<strong>Come si contano.</strong> ' + esc(m.nota_conteggio) +
        ' Il caso singolo che hai visto qui sopra <em>appartiene</em> a queste giocate: ' +
        'non è stato calcolato a parte, ed è una di queste.';
      q('statoMC').textContent = '';
    }, 30);
  }

  document.addEventListener('DOMContentLoaded', function () {
    q('gesti').value = GESTI_INIZIALI.join('\n');
    costruisciCursori();
    calibrazione = MS.CALIBRAZIONE;
    q('esegui').addEventListener('click', esegui);
    function scegli(cal, attivo, spento) {
      calibrazione = cal;
      q(attivo).className = 'primario'; q(spento).className = '';
      q('notaCal').textContent = cal === MS.CALIBRAZIONE
        ? 'Di quello che un gesto lascia addosso, al gesto dopo ne arriva il 4,6 %. È una ' +
          'misura, non una scelta, e viene dalla prova ufficiale dei cinquecento gesti.'
        : 'Al gesto dopo arriva tutto, per intero. È il comportamento vecchio, quello che in ' +
          'una mattina qualunque mandava il carico contro il tetto, e lì lo lasciava.';
      esegui();
    }
    q('cal32').addEventListener('click', function () { scegli(MS.CALIBRAZIONE, 'cal32', 'calStorica'); });
    q('calStorica').addEventListener('click', function () { scegli(MS.STORICA, 'calStorica', 'cal32'); });
    q('notaCal').textContent = 'Di quello che un gesto lascia addosso, al gesto dopo ne ' +
      'arriva il 4,6 %. È una misura, non una scelta, e viene dalla prova ufficiale dei ' +
      'cinquecento gesti.';
    q('duplica').addEventListener('click', function () {
      var righe = q('gesti').value.split('\n').filter(function (r) { return r.trim(); });
      /* AUDIT 19/8: con righe.length=0, righe[i % 0] dava undefined, scritto
         40 volte come riga vuota nella textarea — divisione per zero vera,
         non solo un'assenza di messaggio. */
      if (!righe.length) {
        q('erroreCatena').textContent = 'Le righe ripetute copiano i gesti che ci sono già, ' +
          'e qui non ce n’è ancora nessuno. Scrivi almeno un gesto qui sopra e poi riprova.';
        q('erroreCatena').style.display = '';
        return;
      }
      q('erroreCatena').style.display = 'none';
      var agg = [];
      for (var i = 0; i < 40; i++) { agg.push(righe[i % righe.length]); }
      q('gesti').value = righe.concat(agg).join('\n');
      esegui();
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-rip]'), function (b) {
      b.addEventListener('click', function () { montecarlo(parseInt(b.getAttribute('data-rip'), 10)); });
    });
    q('tema').addEventListener('click', function () {
      var a = document.documentElement.getAttribute('data-tema');
      var nuovo = a === 'scuro' ? 'chiaro' : 'scuro';
      document.documentElement.setAttribute('data-tema', nuovo);
      q('tema').textContent = nuovo === 'scuro' ? 'Tema chiaro' : 'Tema scuro';
    });
    /* AUDIT 19/8 sera: il CSS di stampa esisteva già, mancava solo un
       controllo visibile che lo richiamasse. */
    q('stampa').addEventListener('click', function () { window.print(); });
    esegui();
  });
})();
