/* =============================================================================
   SIMULATORE 3.0 — I GRAFICI DELL'INDAGINE
   =============================================================================
   Sei famiglie di figure, tutte costruite sopra Disegno.tela, tutte senza
   librerie e senza rete. Ognuna risponde a una domanda precisa:

     barreConIntervallo  →  quanto rischia ogni gesto, e quanto siamo sicuri
     scatolaBaffi        →  quanto la Pn di un gesto oscilla fra una giocata e l'altra
     cascata             →  da dove vengono i punti che mancano a cento
     tornado             →  quale modifica sposta di piu', e di quanto
     curvaConBanda       →  come cambia tutto al cambiare di una condizione iniziale
     sopravvivenza       →  quante giocate arrivano in fondo intatte

   TRE REGOLE CHE VALGONO PER TUTTE

   1. L'INCERTEZZA SI DISEGNA SEMPRE.
      Una barra senza il suo intervallo dice «è cosi'» quando dovrebbe dire
      «è circa cosi', e ecco quanto circa». In un grafico che qualcuno puo'
      usare per decidere, nascondere l'incertezza è la scorrettezza piu' grave
      che si possa fare — piu' grave di sbagliare il numero, perche' un numero
      sbagliato prima o poi si scopre, e un'incertezza nascosta no.

   2. L'ASSE COMINCIA DA ZERO, SEMPRE, QUANDO SONO QUANTITA'.
      Tagliare l'asse per far sembrare grande una differenza piccola è il
      trucco piu' vecchio che ci sia. Qui non si fa, e dove non si potesse
      fare a meno si scriverebbe nella didascalia.

   3. IL COLORE NON E' L'UNICA INFORMAZIONE.
      Chi non distingue il rosso dal verde deve poter leggere lo stesso
      grafico: percio' ogni barra ha anche il suo numero scritto, ogni soglia
      ha la sua etichetta, e ogni figura ha una descrizione parlata per chi
      usa un lettore di schermo.
   ========================================================================== */

(function (globale) {
  'use strict';

  var D = globale.Disegno;
  if (!D) { throw new Error('grafici.js: manca disegno.js. Va caricato prima.'); }

  function esc(t) { return D.esc(t); }
  function n(v) { return Math.round(v * 100) / 100; }
  function pct(q, d) { return (q * 100).toFixed(d === undefined ? 1 : d).replace('.', ','); }
  function num(v, d) { return Number(v).toFixed(d === undefined ? 1 : d).replace('.', ','); }

  /* Il colore di un rischio: si accompagna sempre al numero scritto. */
  function coloreRischio(q) {
    if (q >= 0.5) { return 'var(--critico)'; }
    if (q >= 0.25) { return 'var(--attenzione)'; }
    if (q >= 0.1) { return 'var(--neutro)'; }
    return 'var(--buono)';
  }

  /* ==========================================================================
     1 · BARRE ORIZZONTALI CON INTERVALLO
     ==========================================================================
     voci: [{ etichetta, quota, ic:{basso,alto}, evidenzia, nota }]
     E' la mappa dei punti delicati: una riga per gesto, la barra è il rischio
     misurato, il baffo in tinta d'inchiostro è l'intervallo. Due barre i cui baffi si
     sovrappongono molto non sono distinguibili, e la didascalia lo dice. */
  function barreConIntervallo(voci, opz) {
    opz = opz || {};
    var righe = voci.length;
    var altoRiga = opz.altoRiga || 30;
    var W = opz.larghezza || 760;
    var H = 46 + righe * altoRiga + 30;
    var sinistra = opz.sinistra || 210;
    var t = D.tela({ larghezza: W, altezza: H, x: [0, opz.massimo || 1], y: [0, righe],
                     margini: { sinistra: sinistra, destra: 54, alto: 30, basso: 30 } });

    /* la griglia verticale, in percentuale */
    var tacche = [0, 0.25, 0.5, 0.75, 1].filter(function (v) { return v <= (opz.massimo || 1) + 1e-9; });
    tacche.forEach(function (v) {
      t.aggiungi('<line x1="' + n(t.x(v)) + '" y1="' + n(t.T) + '" x2="' + n(t.x(v)) +
        '" y2="' + n(t.T + t.ph) + '" stroke="var(--griglia)" stroke-width="1"/>');
      t.aggiungi('<text x="' + n(t.x(v)) + '" y="' + n(t.T + t.ph + 18) +
        '" text-anchor="middle" font-size="10.5" fill="var(--inchiostro-3)">' +
        pct(v, 0) + '%</text>');
    });

    voci.forEach(function (v, i) {
      var yc = t.T + (i + 0.5) * (t.ph / righe);
      var h = Math.min(altoRiga - 12, 17);
      /* l'etichetta a sinistra, con il numero del gesto */
      t.aggiungi('<text x="' + n(sinistra - 10) + '" y="' + n(yc + 4) +
        '" text-anchor="end" font-size="11.5"' +
        (v.evidenzia ? ' font-weight="700"' : '') +
        ' fill="var(--inchiostro' + (v.evidenzia ? '' : '-2') + ')">' +
        esc(v.etichetta.length > 30 ? v.etichetta.slice(0, 29) + '…' : v.etichetta) +
        '<title>' + esc(v.etichetta) + '</title></text>');
      /* la barra */
      t.aggiungi('<rect x="' + n(t.x(0)) + '" y="' + n(yc - h / 2) + '" width="' +
        n(Math.max(0.6, t.x(v.quota) - t.x(0))) + '" height="' + n(h) +
        '" rx="2.5" fill="' + (v.colore || coloreRischio(v.quota)) +
        '" opacity="' + (v.evidenzia ? 1 : 0.82) + '">' +
        '<title>' + esc(v.etichetta + ' — ' + pct(v.quota) + ' %' +
          (v.nota ? ' · ' + v.nota : '')) + '</title></rect>');
      /* l'intervallo, sopra la barra e sempre visibile */
      if (v.ic) {
        var x1 = t.x(v.ic.basso), x2 = t.x(v.ic.alto);
        t.aggiungi('<line x1="' + n(x1) + '" y1="' + n(yc) + '" x2="' + n(x2) + '" y2="' + n(yc) +
          '" stroke="var(--inchiostro)" stroke-width="1.6"/>' +
          '<line x1="' + n(x1) + '" y1="' + n(yc - 5) + '" x2="' + n(x1) + '" y2="' + n(yc + 5) +
          '" stroke="var(--inchiostro)" stroke-width="1.6"/>' +
          '<line x1="' + n(x2) + '" y1="' + n(yc - 5) + '" x2="' + n(x2) + '" y2="' + n(yc + 5) +
          '" stroke="var(--inchiostro)" stroke-width="1.6"/>');
      }
      /* il numero scritto: il colore non deve essere l'unica informazione */
      t.aggiungi('<text x="' + n(t.x(v.ic ? v.ic.alto : v.quota) + 8) + '" y="' + n(yc + 4) +
        '" text-anchor="start" font-size="11" font-weight="' + (v.evidenzia ? '700' : '600') +
        '" fill="var(--inchiostro)">' + pct(v.quota) + '%</text>');
    });

    if (opz.titoloX) {
      t.aggiungi('<text x="' + n(sinistra + t.pw / 2) + '" y="' + n(H - 4) +
        '" text-anchor="middle" font-size="10.5" fill="var(--inchiostro-3)">' +
        esc(opz.titoloX) + '</text>');
    }
    return t.chiudi(opz.descrizione ||
      'Rischio di ogni gesto, con l’intervallo di confidenza al 95 per cento');
  }

  /* ==========================================================================
     2 · SCATOLA E BAFFI
     ==========================================================================
     voci: [{ etichetta, r: riassunto }]  con r = {minimo,q1,mediana,q3,massimo}
     Una scatola per gesto. La scatola tiene metà delle giocate; i baffi
     arrivano agli estremi. Una scatola stretta vuol dire che quel gesto è
     sempre uguale a se stesso; una larga, che dipende molto da com'è andata
     prima — ed è quello che qui interessa vedere. */
  function scatolaBaffi(voci, opz) {
    opz = opz || {};
    var W = opz.larghezza || 760;
    var H = opz.altezza || (70 + voci.length * 34);
    var sinistra = opz.sinistra || 210;
    var t = D.tela({ larghezza: W, altezza: H, x: [0, 100], y: [0, voci.length],
                     margini: { sinistra: sinistra, destra: 40, alto: 30, basso: 34 } });

    [0, 20, 40, 60, 80, 100].forEach(function (v) {
      t.aggiungi('<line x1="' + n(t.x(v)) + '" y1="' + n(t.T) + '" x2="' + n(t.x(v)) +
        '" y2="' + n(t.T + t.ph) + '" stroke="var(--griglia)" stroke-width="1"/>' +
        '<text x="' + n(t.x(v)) + '" y="' + n(t.T + t.ph + 18) +
        '" text-anchor="middle" font-size="10.5" fill="var(--inchiostro-3)">' + v + '</text>');
    });
    /* il taglio ai bordi del libro: 5 e 95, che è dove la Pn non puo' andare.
       OGNI SOGLIA HA LA SUA ETICHETTA — e' una regola del pacchetto, e qui
       era l'unica soglia disegnata senza. Restavano due tratteggi verticali
       in mezzo al grafico, e niente diceva che cosa fossero: le tacche
       sotto vanno di venti in venti e il 5 e il 95 non compaiono nemmeno. */
    [[5, 'il taglio in basso: 5', 'start'], [95, 'il taglio in alto: 95', 'end']]
      .forEach(function (s) {
        t.aggiungi('<line x1="' + n(t.x(s[0])) + '" y1="' + n(t.T) + '" x2="' + n(t.x(s[0])) +
          '" y2="' + n(t.T + t.ph) + '" stroke="var(--inchiostro-3)" stroke-width="1" ' +
          'stroke-dasharray="3 3" opacity="0.5"/>');
        t.aggiungi('<text x="' + n(t.x(s[0])) + '" y="' + n(t.T - 8) + '" text-anchor="' + s[2] +
          '" font-size="9.5" fill="var(--inchiostro-3)">' + esc(s[1]) + '</text>');
      });

    voci.forEach(function (v, i) {
      var r = v.r;
      if (!r) { return; }
      var yc = t.T + (i + 0.5) * (t.ph / voci.length);
      var h = Math.min(16, (t.ph / voci.length) - 10);
      t.aggiungi('<text x="' + n(sinistra - 10) + '" y="' + n(yc + 4) +
        '" text-anchor="end" font-size="11.5" fill="var(--inchiostro-2)">' +
        esc(v.etichetta.length > 30 ? v.etichetta.slice(0, 29) + '…' : v.etichetta) +
        '<title>' + esc(v.etichetta) + '</title></text>');
      /* i baffi */
      t.aggiungi('<line x1="' + n(t.x(r.minimo)) + '" y1="' + n(yc) + '" x2="' + n(t.x(r.massimo)) +
        '" y2="' + n(yc) + '" stroke="var(--inchiostro-3)" stroke-width="1.2"/>' +
        '<line x1="' + n(t.x(r.minimo)) + '" y1="' + n(yc - h / 2) + '" x2="' + n(t.x(r.minimo)) +
        '" y2="' + n(yc + h / 2) + '" stroke="var(--inchiostro-3)" stroke-width="1.2"/>' +
        '<line x1="' + n(t.x(r.massimo)) + '" y1="' + n(yc - h / 2) + '" x2="' + n(t.x(r.massimo)) +
        '" y2="' + n(yc + h / 2) + '" stroke="var(--inchiostro-3)" stroke-width="1.2"/>');
      /* la scatola */
      t.aggiungi('<rect x="' + n(t.x(r.q1)) + '" y="' + n(yc - h / 2) + '" width="' +
        n(Math.max(1.5, t.x(r.q3) - t.x(r.q1))) + '" height="' + n(h) +
        '" rx="2" fill="var(--azione-tenue)" stroke="var(--azione)" stroke-width="1.1">' +
        '<title>' + esc(v.etichetta + ' — metà delle ripetizioni fra Pn ' + num(r.q1, 0) +
          ' e ' + num(r.q3, 0) + ', mediana ' + num(r.mediana, 0)) + '</title></rect>');
      /* la mediana */
      t.aggiungi('<line x1="' + n(t.x(r.mediana)) + '" y1="' + n(yc - h / 2) + '" x2="' +
        n(t.x(r.mediana)) + '" y2="' + n(yc + h / 2) +
        '" stroke="var(--azione-viva)" stroke-width="2.2"/>');
      /* quanto oscilla, scritto. Se il riassunto non porta lo scarto tipo
         non si scrive «±NaN»: si tace. */
      if (typeof r.ds === 'number' && isFinite(r.ds)) {
        t.aggiungi('<text x="' + n(t.x(r.massimo) + 8) + '" y="' + n(yc + 4) +
          '" text-anchor="start" font-size="10.5" fill="var(--inchiostro-3)">±' +
          num(r.ds, 1) + '</text>');
      }
    });
    t.aggiungi('<text x="' + n(sinistra + t.pw / 2) + '" y="' + n(H - 4) +
      '" text-anchor="middle" font-size="10.5" fill="var(--inchiostro-3)">' +
      esc(opz.titoloX || 'probabilità del gesto (Pn), da 0 a 100') + '</text>');
    return t.chiudi(opz.descrizione ||
      'Quanto oscilla la probabilità di ogni gesto fra una ripetizione e l’altra') +
      /* LA SCATOLA E I BAFFI NON SI CAPISCONO DA SOLI.
         E' l'unica figura del pacchetto che usa una convenzione statistica
         invece di una barra, e non aveva legenda: chi non l'ha gia' vista
         non ha modo di sapere che la scatola tiene meta' delle giocate, che
         la riga dentro e' la mediana, ne' che cosa sia quel «±» a destra —
         che restava un numero senza nome. */
      D.legenda([
        /* il segno prende il colore del CONTORNO della scatola, non del suo
           riempimento: --azione-tenue e' al 10 per cento e in un quadratino
           da undici pixel non si vedrebbe affatto */
        { testo: 'la scatola: metà delle ripetizioni stanno qui dentro',
          colore: 'var(--azione)' },
        { testo: 'la riga viva: la mediana', colore: 'var(--azione-viva)', forma: 'linea' },
        { testo: 'i baffi: dalla ripetizione più bassa alla più alta',
          colore: 'var(--inchiostro-3)', forma: 'linea' },
        { testo: 'il tratteggio: i due bordi oltre cui la Pn non può andare',
          colore: 'var(--inchiostro-3)', forma: 'tratteggio' },
        { testo: 'il numero grigio a destra (±): di quanto oscilla in media',
          colore: 'var(--inchiostro-3)' }
      ]);
  }

  /* ==========================================================================
     3 · LA CASCATA
     ==========================================================================
     voci: [{ etichetta, valore }] — la somma esatta della formula.
     Si parte dal punto di partenza e si vede ogni termine spingere in su o
     tirare in giu', fino alla probabilita' finale. Non è una stima: la
     formula è una somma, quindi questa figura è aritmetica esatta. E' il
     grafico piu' didattico di tutti, perche' non salta nessun passaggio. */
  function cascata(voci, opz) {
    opz = opz || {};
    var W = opz.larghezza || 760;
    var altezzaChiesta = opz.altezza || 300;
    var quante = voci.length + 1;
    var corrente = 0, punti = [], minimo = 0, massimo = 0;
    voci.forEach(function (v) {
      punti.push({ etichetta: v.etichetta, da: corrente, a: corrente + v.valore, valore: v.valore });
      corrente += v.valore;
      if (corrente < minimo) { minimo = corrente; }
      if (corrente > massimo) { massimo = corrente; }
    });
    var finale = corrente;
    var basso = Math.min(0, minimo) - 6, alto = Math.max(100, massimo) + 6;

    /* LO SPAZIO PER LE ETICHETTE SI MISURA, NON SI INDOVINA.
       I nomi dei termini sono frasi — «il carico che ti porti dietro» — e
       ruotati di 32 gradi scendono sotto il grafico e sporgono a sinistra.
       I margini erano fissi (62 in basso, 46 a sinistra) e tenevano solo i
       nomi corti: misurato sull'indagine, «il carico che ti porti dietro»
       usciva di 16 unita' sotto il bordo del viewBox, «il debito da
       insistenza» di 6, «i pezzi da coordinare» di 3, e «il punto di
       partenza» di 3 a sinistra. Fuori dal viewBox non si accorcia niente:
       si taglia, e quello che resta e' una parola a meta'.
       Un'etichetta ruotata di un angolo A e larga L scende di L·sen(A) e
       sporge a sinistra di L·cos(A): sono i due margini che servono. La
       larghezza si stima dalla lunghezza — il carattere di sistema a 10 px
       non supera 0,52 em per lettera sulle stringhe di questo pacchetto,
       misurato sulle dieci etichette della cascata. */
    var ANGOLO = 32, RAD = ANGOLO * Math.PI / 180;
    var DIM_ETI = 10;
    var largheEti = voci.map(function (v) { return String(v.etichetta).length * DIM_ETI * 0.52; });
    var piuLarga = Math.max.apply(null, largheEti.concat([0]));
    var mBasso = Math.max(62, Math.ceil(10 + piuLarga * Math.sin(RAD) + 8));
    /* a sinistra decide la PRIMA etichetta, che e' quella con meno spazio
       davanti. Il margine entra nel calcolo del passo fra le colonne, quindi
       si gira due volte: al terzo giro il valore non si muove piu'. */
    var mSinistra = 62;
    for (var giro = 0; giro < 3; giro++) {
      var mezzoPasso = (W - mSinistra - 16) / (2 * quante);
      mSinistra = Math.max(62, Math.ceil((largheEti[0] || 0) * Math.cos(RAD) + 6 - mezzoPasso));
    }
    var H = altezzaChiesta + (mBasso - 62);

    var t = D.tela({ larghezza: W, altezza: H, x: [-0.5, quante - 0.5], y: [basso, alto],
                     margini: { sinistra: mSinistra, destra: 16, alto: 22, basso: mBasso } });

    [0, 25, 50, 75, 100].forEach(function (v) {
      if (v < basso || v > alto) { return; }
      t.aggiungi('<line x1="' + n(t.L) + '" y1="' + n(t.y(v)) + '" x2="' + n(t.L + t.pw) +
        '" y2="' + n(t.y(v)) + '" stroke="var(--griglia)" stroke-width="1"/>' +
        '<text x="' + n(t.L - 8) + '" y="' + n(t.y(v) + 4) + '" text-anchor="end" ' +
        'font-size="10.5" fill="var(--inchiostro-3)">' + v + '</text>');
    });

    var passo = t.pw / quante;
    var larga = passo * 0.62;
    punti.forEach(function (p, i) {
      var yA = t.y(Math.max(p.da, p.a)), yB = t.y(Math.min(p.da, p.a));
      var colore = p.valore === 0 ? 'var(--neutro)'
        : (p.valore > 0 ? 'var(--aiuta)' : 'var(--ostacola)');
      t.aggiungi('<rect x="' + n(t.x(i) - larga / 2) + '" y="' + n(yA) + '" width="' + n(larga) +
        '" height="' + n(Math.max(1.5, yB - yA)) + '" rx="2" fill="' + colore + '" opacity="0.9">' +
        '<title>' + esc(p.etichetta + ': ' + (p.valore > 0 ? '+' : '') + num(p.valore, 1) +
        ' punti, da ' + num(p.da, 0) + ' a ' + num(p.a, 0)) + '</title></rect>');
      /* il filo che lega un pezzo al successivo: fa vedere che è una somma */
      if (i < punti.length - 1) {
        t.aggiungi('<line x1="' + n(t.x(i) + larga / 2) + '" y1="' + n(t.y(p.a)) + '" x2="' +
          n(t.x(i + 1) - larga / 2) + '" y2="' + n(t.y(p.a)) +
          '" stroke="var(--inchiostro-3)" stroke-width="1" stroke-dasharray="2 2"/>');
      }
      /* il valore sopra o sotto la barra */
      t.aggiungi('<text x="' + n(t.x(i)) + '" y="' + n((p.valore >= 0 ? yA - 5 : yB + 13)) +
        '" text-anchor="middle" font-size="10.5" font-weight="600" fill="var(--inchiostro-2)">' +
        (p.valore > 0 ? '+' : '') + num(p.valore, 0) + '</text>');
      /* l'etichetta, ruotata perche' i nomi sono lunghi. L'angolo e' quello
         con cui sono stati calcolati i margini qui sopra: se cambia uno,
         cambia l'altro. */
      t.aggiungi('<text transform="translate(' + n(t.x(i)) + ',' + n(t.T + t.ph + 10) +
        ') rotate(-' + ANGOLO + ')" text-anchor="end" font-size="' + DIM_ETI +
        '" fill="var(--inchiostro-3)">' + esc(p.etichetta) + '</text>');
    });
    /* la colonna finale: la Pn */
    var iF = punti.length;
    t.aggiungi('<rect x="' + n(t.x(iF) - larga / 2) + '" y="' + n(t.y(finale)) + '" width="' +
      n(larga) + '" height="' + n(Math.max(1.5, t.y(0) - t.y(finale))) +
      '" rx="2" fill="var(--azione)" opacity="0.95"><title>Probabilità finale: ' +
      num(finale, 0) + '</title></rect>');
    t.aggiungi('<text x="' + n(t.x(iF)) + '" y="' + n(t.y(finale) - 5) +
      '" text-anchor="middle" font-size="12" font-weight="700" fill="var(--inchiostro)">' +
      num(finale, 0) + '</text>');
    t.aggiungi('<text transform="translate(' + n(t.x(iF)) + ',' + n(t.T + t.ph + 10) +
      ') rotate(-' + ANGOLO + ')" text-anchor="end" font-size="' + DIM_ETI +
      '" font-weight="700" fill="var(--inchiostro-2)">Pn</text>');

    /* IL TITOLO DELL'ASSE VERTICALE, CHE NON C'ERA.
       Le tacche dicevano 0 · 25 · 50 · 75 · 100 e nient'altro: quei numeri
       sono punti di probabilita', ma nella figura nessuno lo diceva, e a
       occhio potevano essere euro, minuti o una percentuale qualunque. */
    t.aggiungi('<text transform="translate(13,' + n(t.T + t.ph / 2) +
      ') rotate(-90)" text-anchor="middle" font-size="10.5" ' +
      'fill="var(--inchiostro-3)">' + esc(opz.titoloY || 'punti di probabilità') + '</text>');

    return t.chiudi(opz.descrizione ||
      'Da dove vengono i punti. Ogni termine della formula, sommato uno dopo l’altro') +
      D.legenda([
        { testo: 'aggiunge probabilità', colore: 'var(--aiuta)' },
        { testo: 'toglie probabilità', colore: 'var(--ostacola)' },
        { testo: 'la probabilità finale', colore: 'var(--azione)' }
      ]);
  }

  /* ==========================================================================
     4 · IL TORNADO
     ==========================================================================
     righe: [{ etichetta, differenza, ic:{basso,alto}, conta, nota }]
     Ordinate dalla modifica che sposta di piu'. Il nome viene dalla forma:
     le barre lunghe in alto e corte in basso disegnano un imbuto.
     Le barre che NON si distinguono dal rumore restano pallide: è la
     differenza fra «questa leva funziona» e «questa leva forse funziona». */
  function tornado(righe, opz) {
    opz = opz || {};
    var W = opz.larghezza || 760;
    var altoRiga = 32;
    /* in fondo ci va anche il titolo dell'asse: senza, le tacche dicono
       «+4%» e non dicono di che cosa */
    var H = 44 + righe.length * altoRiga + 42;
    var sinistra = opz.sinistra || 250;
    var lim = 0;
    righe.forEach(function (r) {
      lim = Math.max(lim, Math.abs(r.ic ? r.ic.basso : r.differenza),
                     Math.abs(r.ic ? r.ic.alto : r.differenza));
    });
    lim = Math.max(0.02, lim * 1.12);
    var t = D.tela({ larghezza: W, altezza: H, x: [-lim, lim], y: [0, righe.length],
                     margini: { sinistra: sinistra, destra: 60, alto: 26, basso: 48 } });

    /* lo zero, marcato forte: è la linea che separa «serve» da «non serve» */
    t.aggiungi('<line x1="' + n(t.x(0)) + '" y1="' + n(t.T - 4) + '" x2="' + n(t.x(0)) +
      '" y2="' + n(t.T + t.ph + 4) + '" stroke="var(--inchiostro-2)" stroke-width="1.4"/>');
    [-lim, -lim / 2, lim / 2, lim].forEach(function (v) {
      t.aggiungi('<text x="' + n(t.x(v)) + '" y="' + n(t.T + t.ph + 18) +
        '" text-anchor="middle" font-size="10" fill="var(--inchiostro-3)">' +
        (v > 0 ? '+' : '') + pct(v, 0) + '%</text>');
    });

    righe.forEach(function (r, i) {
      var yc = t.T + (i + 0.5) * (t.ph / righe.length);
      var h = 16;
      /* la parentesi di «var(» era rimasta fuori: «fill="var(--inchiostro-3"».
         Funzionava per un pelo — il browser chiude da solo una funzione
         rimasta aperta a fine valore — ma bastava aggiungere qualunque cosa
         in coda perche' diciotto etichette perdessero il colore in silenzio. */
      t.aggiungi('<text x="' + n(sinistra - 10) + '" y="' + n(yc + 4) +
        '" text-anchor="end" font-size="11.5" fill="var(--inchiostro' + (r.conta ? '' : '-3') + ')">' +
        esc(r.etichetta) + '</text>');
      if (!r.applicabile) {
        t.aggiungi('<text x="' + n(t.x(0) + 10) + '" y="' + n(yc + 4) +
          '" font-size="10.5" fill="var(--inchiostro-3)">' + esc(r.nota || 'non applicabile') +
          '</text>');
        return;
      }
      var d = r.differenza;
      var x0 = t.x(Math.min(0, d)), x1 = t.x(Math.max(0, d));
      t.aggiungi('<rect x="' + n(x0) + '" y="' + n(yc - h / 2) + '" width="' +
        n(Math.max(1, x1 - x0)) + '" height="' + n(h) + '" rx="2" fill="' +
        (d >= 0 ? 'var(--aiuta)' : 'var(--ostacola)') + '" opacity="' +
        (r.conta ? 0.92 : 0.35) + '"><title>' + esc(r.etichetta + ': ' +
        (d > 0 ? '+' : '') + pct(d) + ' punti percentuali' +
        (r.conta ? '' : ' — non distinguibile dal rumore')) + '</title></rect>');
      if (r.ic) {
        t.aggiungi('<line x1="' + n(t.x(r.ic.basso)) + '" y1="' + n(yc) + '" x2="' +
          n(t.x(r.ic.alto)) + '" y2="' + n(yc) + '" stroke="var(--inchiostro)" stroke-width="1.4"/>' +
          '<line x1="' + n(t.x(r.ic.basso)) + '" y1="' + n(yc - 4.5) + '" x2="' + n(t.x(r.ic.basso)) +
          '" y2="' + n(yc + 4.5) + '" stroke="var(--inchiostro)" stroke-width="1.4"/>' +
          '<line x1="' + n(t.x(r.ic.alto)) + '" y1="' + n(yc - 4.5) + '" x2="' + n(t.x(r.ic.alto)) +
          '" y2="' + n(yc + 4.5) + '" stroke="var(--inchiostro)" stroke-width="1.4"/>');
      }
      t.aggiungi('<text x="' + n(t.x(Math.max(0, r.ic ? r.ic.alto : d)) + 8) + '" y="' + n(yc + 4) +
        '" font-size="10.5" font-weight="600" fill="var(--inchiostro' + (r.conta ? '' : '-3') + ')">' +
        (d > 0 ? '+' : '') + pct(d) + ' %' + (r.conta ? '' : ' ?') + '</text>');
    });

    /* IL TITOLO DELL'ASSE, CHE NON C'ERA.
       Le tacche dicevano «−9%  −4%  +4%  +9%» e basta. Per cento che cosa?
       La descrizione parlata lo diceva, ma quella la sente solo chi usa un
       lettore di schermo: chi guarda vedeva dei numeri senza unita'. */
    /* il titolo sta in fondo, non attaccato alle tacche: fra la riga dei
       «−4 % +4 %» e questa devono restare una ventina di unita', se no si
       leggono come una cosa sola */
    t.aggiungi('<text x="' + n(sinistra + t.pw / 2) + '" y="' + n(H - 12) +
      '" text-anchor="middle" font-size="10.5" fill="var(--inchiostro-3)">' +
      esc(opz.titoloX || 'quanto cambia la probabilità, in punti percentuali') + '</text>');

    return t.chiudi(opz.descrizione ||
      'Di quanto sposta ogni modifica, con il suo intervallo. Le barre pallide valgono quanto il caso') +
      /* IL PALLIDO E IL PUNTO INTERROGATIVO VANNO SPIEGATI.
         Sono l'informazione piu' importante della figura — dice quali leve
         funzionano davvero — e stavano solo nel commento del programma. */
      D.legenda([
        { testo: 'la modifica aiuta', colore: 'var(--aiuta)' },
        { testo: 'la modifica peggiora', colore: 'var(--ostacola)' },
        { testo: 'barra pallida, e un «?» accanto: quella differenza non si distingue dal caso',
          colore: 'var(--aiuta)', opacita: 0.35 },
        /* «il baffo nero» era vero soltanto a tema chiaro: --inchiostro vale
           #101418 di giorno e #ffffff di notte, quindi al lettore con il tema
           scuro la legenda indicava come nero un baffo bianco. Il colore lo
           mostra gia' il quadratino accanto: la parola non serviva. */
        { testo: 'il baffo: l’intervallo di confidenza al 95 %',
          colore: 'var(--inchiostro)', forma: 'linea' }
      ]);
  }

  /* ==========================================================================
     5 · CURVA CON BANDA
     ==========================================================================
     punti: [{ x, quota, ic:{basso,alto} }] — la banda è l'incertezza, non la
     dispersione: sono due cose diverse e la didascalia lo deve dire. */
  function curvaConBanda(punti, opz) {
    opz = opz || {};
    var W = opz.larghezza || 760, H = opz.altezza || 280;
    var dx = opz.x || [punti[0].x, punti[punti.length - 1].x];
    var t = D.tela({ larghezza: W, altezza: H, x: dx, y: [0, 1],
                     margini: { sinistra: 48, destra: 20, alto: 22, basso: 44 } });

    [0, 0.25, 0.5, 0.75, 1].forEach(function (v) {
      t.aggiungi('<line x1="' + n(t.L) + '" y1="' + n(t.y(v)) + '" x2="' + n(t.L + t.pw) +
        '" y2="' + n(t.y(v)) + '" stroke="var(--griglia)" stroke-width="1"/>' +
        '<text x="' + n(t.L - 8) + '" y="' + n(t.y(v) + 4) + '" text-anchor="end" ' +
        'font-size="10.5" fill="var(--inchiostro-3)">' + pct(v, 0) + '%</text>');
    });
    var passoX = opz.passoTacche || Math.ceil((dx[1] - dx[0]) / 10);
    for (var vx = dx[0]; vx <= dx[1] + 1e-9; vx += passoX) {
      t.aggiungi('<text x="' + n(t.x(vx)) + '" y="' + n(t.T + t.ph + 18) +
        '" text-anchor="middle" font-size="10.5" fill="var(--inchiostro-3)">' + n(vx) + '</text>');
    }
    /* la banda */
    var su = '', giu = '';
    punti.forEach(function (p, i) {
      su += (i ? ' L ' : 'M ') + n(t.x(p.x)) + ' ' + n(t.y(p.ic ? p.ic.alto : p.quota));
    });
    for (var i = punti.length - 1; i >= 0; i--) {
      giu += ' L ' + n(t.x(punti[i].x)) + ' ' + n(t.y(punti[i].ic ? punti[i].ic.basso : punti[i].quota));
    }
    t.aggiungi('<path d="' + su + giu + ' Z" fill="var(--azione)" opacity="0.16"/>');
    /* la linea */
    var d = '';
    punti.forEach(function (p, i) {
      d += (i ? ' L ' : 'M ') + n(t.x(p.x)) + ' ' + n(t.y(p.quota));
    });
    t.aggiungi('<path d="' + d + '" fill="none" stroke="var(--azione-viva)" stroke-width="2.2" ' +
      'stroke-linejoin="round"/>');
    punti.forEach(function (p) {
      t.aggiungi('<circle cx="' + n(t.x(p.x)) + '" cy="' + n(t.y(p.quota)) +
        '" r="2.6" fill="var(--azione-viva)"><title>' +
        esc((opz.nomeX || 'x') + ' ' + n(p.x) + ' → ' + pct(p.quota) + ' %' +
        (p.ic ? ' (da ' + pct(p.ic.basso) + ' a ' + pct(p.ic.alto) + ')' : '')) +
        '</title></circle>');
    });
    if (opz.segna) {
      t.aggiungi('<line x1="' + n(t.x(opz.segna.x)) + '" y1="' + n(t.T) + '" x2="' +
        n(t.x(opz.segna.x)) + '" y2="' + n(t.T + t.ph) + '" stroke="var(--critico)" ' +
        'stroke-width="1.3" stroke-dasharray="4 3"/>' +
        '<text x="' + n(t.x(opz.segna.x) + 6) + '" y="' + n(t.T + 12) +
        '" font-size="10.5" fill="var(--critico)">' + esc(opz.segna.testo) + '</text>');
    }
    t.aggiungi('<text x="' + n(t.L + t.pw / 2) + '" y="' + n(H - 6) +
      '" text-anchor="middle" font-size="10.5" fill="var(--inchiostro-3)">' +
      esc(opz.titoloX || 'la condizione che varia') + '</text>');
    t.asseY(opz.titoloY || 'quota, da 0 a 100 %');
    return t.chiudi(opz.descrizione ||
      'Come cambia la quota se cambia la condizione. Intorno, la fascia di incertezza');
  }

  /* ==========================================================================
     6 · LA SOPRAVVIVENZA, A GRADINI
     ==========================================================================
     Quante giocate arrivano al gesto k senza che niente sia ancora andato
     male. Si disegna a gradini e non a linea continua per una ragione precisa:
     fra un gesto e l'altro non succede niente, e una linea obliqua farebbe
     credere che il valore passi per i punti intermedi. Non è una finezza
     grafica: è la differenza fra dire il vero e dire una cosa verosimile. */
  function sopravvivenza(curva, opz) {
    opz = opz || {};
    var W = opz.larghezza || 760, H = opz.altezza || 250;
    var t = D.tela({ larghezza: W, altezza: H, x: [0, curva.length - 1], y: [0, 1],
                     margini: { sinistra: 48, destra: 20, alto: 22, basso: 44 } });
    [0, 0.25, 0.5, 0.75, 1].forEach(function (v) {
      t.aggiungi('<line x1="' + n(t.L) + '" y1="' + n(t.y(v)) + '" x2="' + n(t.L + t.pw) +
        '" y2="' + n(t.y(v)) + '" stroke="var(--griglia)" stroke-width="1"/>' +
        '<text x="' + n(t.L - 8) + '" y="' + n(t.y(v) + 4) + '" text-anchor="end" ' +
        'font-size="10.5" fill="var(--inchiostro-3)">' + pct(v, 0) + '%</text>');
    });
    var d = '';
    curva.forEach(function (p, i) {
      var X = t.x(i), Y = t.y(p.quota);
      if (i === 0) { d += 'M ' + n(X) + ' ' + n(Y); }
      else { d += ' L ' + n(t.x(i)) + ' ' + n(t.y(curva[i - 1].quota)) + ' L ' + n(X) + ' ' + n(Y); }
      t.aggiungi('<text x="' + n(X) + '" y="' + n(t.T + t.ph + 18) +
        '" text-anchor="middle" font-size="10.5" fill="var(--inchiostro-3)">' + i + '</text>');
      if (p.ic) {
        t.aggiungi('<line x1="' + n(X) + '" y1="' + n(t.y(p.ic.basso)) + '" x2="' + n(X) +
          '" y2="' + n(t.y(p.ic.alto)) + '" stroke="var(--inchiostro-3)" stroke-width="1.1"/>');
      }
      t.aggiungi('<circle cx="' + n(X) + '" cy="' + n(Y) + '" r="3" fill="var(--azione-viva)">' +
        /* «Dopo 0 gesti sono ancora intatte il 92,3%» sbagliava tre cose in
           una riga: «dopo zero gesti» non e' un momento (e' l'inizio), il
           verbo era al plurale sotto un soggetto singolare («il 92,3 %»), e
           il segno di percentuale stava attaccato alla cifra mentre in tutto
           il resto del progetto ha il suo spazio. */
        '<title>' + (i === 0
            ? 'Prima di cominciare è intatto il ' + pct(p.quota) + ' % delle ripetizioni'
            : 'Dopo ' + i + (i === 1 ? ' gesto' : ' gesti') + ' è ancora intatto il ' +
              pct(p.quota) + ' % delle ripetizioni') +
        '</title></circle>');
    });
    t.aggiungi('<path d="' + d + '" fill="none" stroke="var(--azione-viva)" stroke-width="2.2"/>');
    t.aggiungi('<text x="' + n(t.L + t.pw / 2) + '" y="' + n(H - 6) +
      '" text-anchor="middle" font-size="10.5" fill="var(--inchiostro-3)">' +
      esc(opz.titoloX || 'quanti gesti sono già stati fatti') + '</text>');
    t.asseY('quota ancora intatta');
    return t.chiudi(opz.descrizione ||
      'Quante ripetizioni arrivano intatte fino a ciascun gesto');
  }

  var API = {
    barreConIntervallo: barreConIntervallo,
    scatolaBaffi: scatolaBaffi,
    cascata: cascata,
    tornado: tornado,
    curvaConBanda: curvaConBanda,
    sopravvivenza: sopravvivenza,
    coloreRischio: coloreRischio,
    pct: pct, num: num
  };
  globale.Grafici = API;
  if (typeof module !== 'undefined' && module.exports) { module.exports = API; }
}(typeof window !== 'undefined' ? window : this));
