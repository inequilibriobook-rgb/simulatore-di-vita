/* =============================================================================
   SIMULATORE 3.0 — Le figure dei livelli lunghi
   =============================================================================
   Seconda meta' delle figure della lettura: quelle che non stanno dentro un
   gesto solo. Catena, trasferimento di stato, granularita', settimana,
   traiettoria, distribuzione, convergenza, i due assi.

   Stanno in un file a parte per la stessa ragione per cui il libro le mette
   in un'altra parte: sono un altro argomento. Il gesto singolo si guarda con
   la formula; qui si guarda che cosa si accumula, e servono altri attrezzi.

   Anche queste calcolano davvero, con i motori veri e i semi dichiarati.
   ========================================================================== */
(function (globale) {
  'use strict';

  var F = globale.Figure;
  var D = globale.Disegno, N = globale.Nucleo, St = globale.Stato,
      S = globale.Spiegazioni, T = globale.Tempo, A = globale.Analisi,
      MS = globale.MicroSemantica, STip = globale.SettimanaTipo;

  (function (mancanti) {
    if (!mancanti.length) { return; }
    throw new Error('figure-lunghe.js: manca ' + mancanti.join(', ') +
      '. Va caricato dopo figure.js, settimana-tipo.js e analisi.js.');
  }([['Figure', F], ['Disegno', D], ['Tempo', T], ['Analisi', A],
     ['MicroSemantica', MS], ['SettimanaTipo', STip]]
    .filter(function (c) { return !c[1]; })
    .map(function (c) { return c[0]; })));

  var figura = F.figura, COLORI = F.COLORI;
  var esc = D.esc, num = D.num;

  /* I NUMERI PICCOLI, QUANDO SONO PROSA, SI SCRIVONO IN LETTERE.
     Nelle didascalie di questo pacchetto si legge «duemila tiri», «trecento
     tiri», «il novanta per cento»: e' la forma italiana corrente, e in mezzo
     a quelle parole una cifra sola stona. Le misure lette sul grafico restano
     cifre — «arriva a 43» e' un valore, non un modo di dire — e cosi' anche
     tutto cio' che supera il dodici. */
  var LETTERE = ['zero', 'una', 'due', 'tre', 'quattro', 'cinque', 'sei', 'sette',
                 'otto', 'nove', 'dieci', 'undici', 'dodici'];
  function inLettere(n) {
    return (n >= 0 && n < LETTERE.length && n === Math.round(n)) ? LETTERE[n] : num(n, 0);
  }

  /* una catena di gesti diversi fra loro, costruita una volta sola:
     tutte le figure della catena partono da qui, cosi' il lettore segue
     sempre la stessa mattina */
  var GESTI = ['sentire la sveglia', 'alzarsi dal letto', 'lavarsi il viso', 'vestirsi',
    'preparare la borsa', 'cercare le chiavi', 'non trovare le chiavi',
    'controllare le tasche', 'rovistare nel cassetto', 'trovare le chiavi',
    'prendere il telefono', 'controllare l’ora', 'fretta improvvisa',
    'spegnere le luci', 'chiudere il gas', 'aprire la porta', 'uscire e chiudere',
    'scendere le scale', 'attraversare la strada', 'aspettare il verde',
    'salire sul mezzo', 'trovare posto', 'rispondere a un messaggio',
    'scendere alla fermata', 'camminare in fretta', 'aprire un portone',
    'salutare qualcuno', 'sedersi', 'accendere lo schermo', 'ricominciare'];

  function catena(quanti, strIniziale) {
    var out = [];
    for (var i = 0; i < quanti; i++) {
      out.push({
        id: 'g' + i, descrizione: GESTI[i % GESTI.length],
        p0: N.clampInt(78 - (i % 5) * 4, 1, 99),
        modificatori: {
          energia_e: N.clampInt(-6 - (i % 4) * 2, -30, 30),
          informazione_i: -(i % 3),
          tempo_t: N.clampInt(-4 - Math.floor(i / 5) * 2, -30, 30),
          materiale_m: -(i % 3),
          bonus_bp: 0,
          complessita_c: 1 + (i % 2)
        },
        stato_prima: { stress_str: strIniziale === undefined ? 40 : strIniziale,
                       posizione_pos: 60, debito_deb: 0, rip: 'debole' }
      });
    }
    return out;
  }

  /* ====================================================================
     9 · LA CATENA — il carico che si accumula, gesto per gesto
     ==================================================================== */
  figura('catena', {
    titolo: 'Trenta gesti di seguito',
    didascalia: 'Il carico non riparte da zero a ogni gesto. Quello che resta passa al ' +
                'gesto dopo. La linea lo segue gesto per gesto, e ogni pallino è uno dei ' +
                'trenta gesti della mattina.',
    disegna: function () {
      var nodi = catena(30, 40);
      var r = MS.eseguiCatenaMicro(nodi, { rng: new globale.CasualePython(90210),
                                           calibrazione: MS.CALIBRAZIONE });
      var punti = r.nodi.map(function (nd, i) { return [i + 1, nd.stato_persistente.stress_str]; });
      var g = D.tela({ larghezza: 720, altezza: 260, x: [1, nodi.length], y: [0, 100],
                       margini: { sinistra: 42, basso: 42 } });
      g.sfumatura('areaCat', COLORI.ostacola, 0.3, 0.02);
      g.griglia([0, 25, 50, 75, 100]);
      g.soglia(100, 'il tetto', COLORI.ostacola);
      g.area(punti, 'url(#areaCat)');
      g.linea(punti, { colore: COLORI.ostacola });
      g.punti(punti.map(function (p, i) {
        return [p[0], p[1], r.nodi[i].descrizione + ' — carico ' + p[1]];
      }), { colore: COLORI.ostacola, raggio: 3 });
      g.asseX([[1, '1'], [10, '10'], [20, '20'], [30, '30']], 'i gesti, in ordine');
      g.asseY('il carico, da 0 a 100');
      /* «tre punti» o «un punto»: il numero e la parola devono andare
         d'accordo anche quando la catena si muove poco */
      var cresciuto = r.stato_finale.stress_str - 40;
      return g.chiudi('Il carico accumulato lungo trenta gesti') +
        '<p class="figura-conto">Parte da 40 e arriva a <b>' + r.stato_finale.stress_str +
        '</b>, cioè <b>' + (cresciuto === 1 ? 'un punto' : inLettere(cresciuto) + ' punti') +
        '</b> in trenta gesti. Nessuno di quei gesti, preso da solo, meriterebbe di ' +
        'essere raccontato. Il carico non l’ha alzato uno di loro: l’ha alzato la ' +
        'fila.</p>';
    }
  });

  /* ====================================================================
     10 · IL TRASFERIMENTO — 4,6 % contro «passa tutto»
     ==================================================================== */
  figura('trasferimento', {
    titolo: 'Quanto passa davvero al gesto dopo',
    didascalia: 'La stessa catena, con i due modi di trasferire lo stato. Sopra quello ' +
                'storico: passa tutto, e per questo arriva al tetto in pochi gesti. ' +
                'Sotto quello misurato: passa il 4,6 %, e al tetto non ci arriva mai.',
    disegna: function () {
      var nodi = catena(30, 40);
      function corri(cal) {
        return MS.eseguiCatenaMicro(nodi, { rng: new globale.CasualePython(90210),
                                            calibrazione: cal });
      }
      var mis = corri(MS.CALIBRAZIONE), sto = corri(MS.STORICA);
      var pMis = mis.nodi.map(function (nd, i) { return [i + 1, nd.stato_persistente.stress_str]; });
      var pSto = sto.nodi.map(function (nd, i) { return [i + 1, nd.stato_persistente.stress_str]; });

      var g = D.tela({ larghezza: 720, altezza: 270, x: [1, nodi.length], y: [0, 105],
                       margini: { sinistra: 42, basso: 42 } });
      g.griglia([0, 25, 50, 75, 100]);
      g.soglia(100, 'il tetto: da qui in su non distingue più', COLORI.ostacola);
      g.linea(pSto, { colore: COLORI.ostacola, spessore: 2.6 });
      g.linea(pMis, { colore: COLORI.azione, spessore: 2.6 });
      g.asseX([[1, '1'], [10, '10'], [20, '20'], [30, '30']], 'i gesti, in ordine');
      g.asseY('il carico, da 0 a 100');
      return g.chiudi('Le due calibrazioni del trasferimento di stato a confronto') +
        D.legenda([
          { testo: 'misurato, 4,6 % — arriva a ' + mis.stato_finale.stress_str,
            colore: COLORI.azione, forma: 'linea' },
          { testo: 'storico, passa tutto — arriva a ' + sto.stato_finale.stress_str,
            colore: COLORI.ostacola, forma: 'linea' }
        ]) +
        '<p class="figura-conto">La differenza non è una sfumatura di taratura. Con il ' +
        'trasferimento pieno la stessa mattina finisce contro il tetto. Da lì in poi il ' +
        'modello non distingue più una giornata pesante da un quasi-collasso. Al tetto ' +
        'non resta più niente da misurare.</p>';
    }
  });

  /* ====================================================================
     11 · LA GRANULARITÀ — la stessa giornata, raccontata più fine
     ==================================================================== */
  figura('granularita', {
    titolo: 'La stessa settimana, raccontata più fine',
    didascalia: 'A sinistra il modello com’era. Raccontare la settimana più fine la ' +
                'faceva saturare. Il carico finiva al tetto a qualunque scala. Chi ' +
                'descriveva meglio la propria settimana veniva punito proprio per averlo ' +
                'fatto. A destra, con il fattore k, la saturazione sparisce. Una cosa ' +
                'però k non la fa: rendere il risultato uguale a ogni scala. Tiene fermo ' +
                'quanto pesa una giornata, non il cammino che i dadi fanno lungo la ' +
                'settimana.',
    disegna: function () {
      var scale = [2, 4, 8, 16, 32];
      var conK = [], senzaK = [];
      scale.forEach(function (n) {
        var a = STip.eseguiSettimana({ nodiPerScena: n, durezza: 1.15, seme: 707070 });
        var b = STip.eseguiSettimana({ nodiPerScena: n, durezza: 1.15, seme: 707070, k: null });
        conK.push([n, a.stato_finale.stress_str, n * 4 + ' nodi → carico ' + a.stato_finale.stress_str]);
        senzaK.push([n, b.stato_finale.stress_str, n * 4 + ' nodi → carico ' + b.stato_finale.stress_str]);
      });

      function pannello(dati, colore, titolo, nota) {
        var g = D.tela({ larghezza: 400, altezza: 250, x: [0, scale.length - 1], y: [0, 105],
                         margini: { sinistra: 38, basso: 42, destra: 12 } });
        g.griglia([0, 25, 50, 75, 100]);
        g.soglia(100, 'tetto', COLORI.ostacola);
        var punti = dati.map(function (d, i) { return [i, d[1], d[2]]; });
        g.linea(punti, { colore: colore, spessore: 2.6 });
        g.punti(punti, { colore: colore, raggio: 4.5 });
        g.asseX(scale.map(function (n, i) { return [i, String(n * 4)]; }), 'nodi che descrivono un giorno');
        g.asseY('il carico, da 0 a 100');
        return '<div class="colonna-caso" style="--tinta:' + colore + '">' +
          '<p class="colonna-eti">' + esc(titolo) + '</p>' +
          g.chiudi(titolo) +
          '<p class="colonna-conti">' + esc(nota) + '</p></div>';
      }

      /* LE DUE NOTE SI SCRIVONO DAI NUMERI, NON A MEMORIA.
         Fino al 10/09/2026 erano due frasi fisse, e tutte e due dicevano il
         contrario di cio' che la figura stampava: sotto «100 100 100 100 100»
         c'era scritto «il risultato dipende da quanto la si racconta» (non
         dipende: sono tutti al tetto, e' saturazione), e sotto «51 … 82»
         c'era scritto «pesa come una settimana, comunque la si racconti»
         (sono trentuno punti di differenza). Adesso le frasi le decidono i
         numeri, cosi' non possono piu' smentirli. */
      function estremi(dati) {
        var v = dati.map(function (d) { return d[1]; });
        return [Math.min.apply(null, v), Math.max.apply(null, v)];
      }
      var eS = estremi(senzaK), eK = estremi(conK);
      var notaSenza = eS[0] === eS[1]
        ? 'A ogni scala il carico finisce a ' + eS[1] + ', cioè al tetto. Raccontare la ' +
                                                        'giornata più fine non la ' +
                                                        'appesantisce un po’: la satura. ' +
                                                        'La punizione è totale, e ' +
                                                        'proprio per questo non si vede ' +
                                                        'nessuna salita.'
        : 'Da ' + eS[0] + ' a ' + eS[1] + '. Più fine si racconta la giornata, più la ' +
                                          'stessa settimana costa. Il carico non misura ' +
                                          'più la settimana: misura il racconto.';
      var notaCon = eK[1] - eK[0] <= 3
        ? 'Fra ' + eK[0] + ' e ' + eK[1] + ': la giornata pesa come una giornata, ' +
          'comunque la si racconti.'
        : 'Fra ' + eK[0] + ' e ' + eK[1] + ': il carico non satura più, ed è questo che k ' +
          'serve a fare. Restano però ' + (eK[1] - eK[0]) + ' punti fra una scala e ' +
                                                            'l’altra, e vanno detti. Il ' +
                                                            'cammino che i dadi fanno da ' +
                                                            'un gesto al successivo, k ' +
                                                            'non lo tocca. Quindi due ' +
                                                            'settimane si confrontano ' +
                                                            'solo se sono raccontate con ' +
                                                            'la stessa finezza.';
      return '<div class="due-colonne">' +
        pannello(senzaK, COLORI.ostacola, 'Senza il fattore k', notaSenza) +
        pannello(conK, COLORI.azione, 'Con il fattore k = 2,75', notaCon) +
        '</div>';
    }
  });

  /* ====================================================================
     12 · LA SETTIMANA — i giorni, e le notti in mezzo
     ==================================================================== */
  figura('settimana', {
    titolo: 'Sette giorni, e le notti in mezzo',
    didascalia: 'I segmenti che salgono sono le giornate. Quelli che scendono sono le ' +
                'notti. La domanda di questo livello non è com’è andata una giornata. È ' +
                'se il recupero regge ancora.',
    disegna: function () {
      /* IL SONNO SI PASSA COME PROFILO, NON COME NOME.
         Qui c'era scritto «sonno: 'corto'». Il motore non ha nessun profilo
         che si chiami cosi' — sono `ottimo`, `normale`, `scarso` e `banco` —
         e comunque `eseguiSettimana` non vuole un nome: vuole l'oggetto con
         ore, qualita' e continuita'. Ricevendo una stringa calcolava
         `'corto'.ore + ...`, cioe' NaN, e da li' in poi tutte le notti
         recuperavano esattamente zero. La figura mostrava una salita senza
         nessuna discesa, e sotto c'era scritto «le sei notti hanno riportato
         giu' 0 punti in tutto»: una didascalia costruita sui numeri che
         raccontava fedelmente un numero sbagliato.
         `scarso` e' il profilo che «corto» voleva dire: cinque ore e mezza. */
      var r = STip.eseguiSettimana({ durezza: 1.25, seme: 424242,
                                     sonno: STip.sonno('scarso').sonno });
      var punti = [], x = 0;
      punti.push([x, r.stato_iniziale.stress_str]);
      r.giorni.forEach(function (gi, i) {
        x += 1; punti.push([x, gi.stato_finale.stress_str]);
        if (r.notti && r.notti[i]) { x += 0.6; punti.push([x, r.notti[i].stato_dopo.stress_str]); }
      });
      var g = D.tela({ larghezza: 720, altezza: 260, x: [0, x], y: [0, 100],
                       margini: { sinistra: 42, basso: 42 } });
      g.sfumatura('areaSet', COLORI.ostacola, 0.26, 0.02);
      g.griglia([0, 25, 50, 60, 75, 100]);
      /* su ambra il bianco non si legge: la targhetta prende l'inchiostro
         scuro dichiarato per questo fondo */
      g.soglia(60, 'il recupero comincia a non bastare', 'var(--attenzione)',
               { sinistra: true, inchiostro: 'var(--su-attenzione)' });
      g.area(punti, 'url(#areaSet)');
      g.linea(punti, { colore: COLORI.ostacola });
      g.punti(punti, { colore: COLORI.ostacola, raggio: 3.2 });
      var tacche = [];
      var xx = 0;
      r.giorni.forEach(function (gi, i) { xx += 1; tacche.push([xx, 'g' + (i + 1)]); xx += 0.6; });
      /* «le notti fra l'uno e l'altro» diceva sei notti; le notti sono sette,
         una dopo ciascun giorno, e l'ultima cade dopo l'ultima giornata */
      g.asseX(tacche, 'sette giorni, e la notte dopo ciascuno');
      g.asseY('il carico, da 0 a 100');
      var notti = r.notti || [];
      var recuperato = 0;
      notti.forEach(function (nt) {
        recuperato += nt.stato_prima.stress_str - nt.stato_dopo.stress_str;
      });
      var lasciato = r.stato_finale.stress_str - r.stato_iniziale.stress_str;
      /* QUANTE SONO LE NOTTI LO DICONO LE NOTTI.
         C'era scritto «le sei notti» con il numero a mano, e le notti sono
         sette: una per ogni giornata. Un numero scritto a mano accanto a un
         numero calcolato invecchia sempre, e invecchia in silenzio. */
      var quante = notti.length === 1 ? 'La notte ha' : ('Le ' + inLettere(notti.length) + ' notti hanno');
      return g.chiudi('Il carico lungo sette giorni, con il recupero notturno') +
        '<p class="figura-conto">' +
        (recuperato > 0
          ? quante + ' riportato giù <b>' + recuperato + '</b> punti in tutto. La ' +
                                                         'settimana ne ha lasciati ' +
                                                         'comunque <b>' + lasciato + '</b>. Il recupero c’è, quindi, e ' +
                                                       'non basta. È esattamente questo ' +
                                                       'che il livello della settimana ' +
                                                       'serve a far vedere.'
          : quante + ' riportato giù <b>' + recuperato + '</b> punti, e la settimana ne ha ' +
            'lasciati <b>' + lasciato + '</b>. Quando il recupero della notte arriva a ' +
                                        'zero, la domanda non è più come sia andata una ' +
                                        'giornata. È se la notte serva ancora a qualcosa.') +
        '</p>';
    }
  });

  /* ====================================================================
     13 · LA TRAIETTORIA — dodici settimane, e il regime
     ==================================================================== */
  figura('traiettoria', {
    titolo: 'Dodici settimane, e il modo di vivere',
    didascalia: 'Una settimana difficile, da sola, non dice niente. Dodici di fila sì, ' +
                'ed è per questo che il livello esiste. Le due fasce di fondo sono le ' +
                'soglie che separano i regimi. Un regime è il nome che il modello dà al ' +
                'modo in cui si sta vivendo.',
    disegna: function () {
      var durezze = [1, 1, 1.1, 1.15, 1.2, 1.3, 1.35, 1.4, 1.3, 1.45, 1.5, 1.55];
      /* stesso difetto della figura 12: «sonno: 'corto'» non e' un profilo
         che il motore conosca, e arrivava al calcolo come stringa */
      var r = STip.eseguiTraiettoriaTipo({ settimane: 12, durezze: durezze,
                                           seme: 191919,
                                           sonno: STip.sonno('scarso').sonno });
      var punti = r.settimane.map(function (w, i) { return [i + 1, w.stato_finale.stress_str]; });
      var g = D.tela({ larghezza: 720, altezza: 270, x: [1, 12], y: [0, 100],
                       margini: { sinistra: 42, basso: 42 } });
      g.sfumatura('areaTra', COLORI.ostacola, 0.24, 0.02);
      g.griglia([0, 25, 50, 60, 75, 85, 100]);
      /* le soglie dei regimi, che sono la ragione dei salti di colore */
      g.banda(75, 100, COLORI.ostacola, 0.08);
      g.banda(60, 75, 'var(--attenzione)', 0.1);
      g.soglia(75, 'spirale in formazione', COLORI.ostacola);
      g.soglia(60, 'ripetizione pesante', 'var(--attenzione)',
               { sinistra: true, inchiostro: 'var(--su-attenzione)' });
      g.area(punti, 'url(#areaTra)');
      g.linea(punti, { colore: COLORI.ostacola });
      g.punti(punti.map(function (p, i) {
        return [p[0], p[1], 'settimana ' + (i + 1) + ' — carico ' + p[1]];
      }), { colore: COLORI.ostacola, raggio: 3.6 });
      g.asseX([[1, '1'], [4, '4'], [8, '8'], [12, '12']], 'le settimane, in fila');
      g.asseY('il carico a fine settimana, da 0 a 100');
      var nome = r.nome_regime || T.REGIMI[T.regimeDalloStato(r.stato_finale)] || 'regime non nominato';
      /* ANCHE QUESTA NOTA LA SCRIVONO I NUMERI.
         Diceva «nessuna di queste settimane, presa da sola, sarebbe un caso
         clinico», e per come la traiettoria finisce quasi sempre non e' vero:
         dopo poche settimane il carico arriva al tetto e ci resta. Una frase
         fissa sotto una figura che cambia prima o poi la smentisce, ed e' lo
         stesso difetto gia' pagato dalla figura della granularita'. */
      var valori = punti.map(function (p) { return p[1]; });
      var alTetto = valori.filter(function (v) { return v >= 95; }).length;
      var prima = valori[0];
      return g.chiudi('Il carico di fine settimana lungo dodici settimane') +
        '<p class="figura-conto">' +
        (alTetto >= 2
          ? 'La prima settimana si chiude a <b>' + prima + '</b>, e già non è leggera. ' +
                                                           'Ma sono le successive a ' +
                                                           'decidere. ' + (alTetto === valori.length - 1 ? 'tutte le altre' :
            'da lì in poi ' + num(alTetto, 0) + ' settimane su ' + num(valori.length, 0)) +
            ' finiscono contro il tetto, e il regime si ferma su <b>' + esc(nome) + '</b>. ' +
                                                                                    'Da ' +
                                                                                    'lì ' +
                                                                                    'in ' +
                                                                                    'poi ' +
                                                                                    'una ' +
                                                                                    'settimana ' +
                                                                                    'vale ' +
                                                                                    'l’altra: ' +
                                                                                    'infatti ' +
                                                                                    'la ' +
                                                                                    'linea ' +
                                                                                    'si ' +
                                                                                    'appiattisce.'
          : 'Nessuna di queste settimane, presa da sola, sarebbe un caso clinico. Messe ' +
            'in fila, però, portano il regime a <b>' + esc(nome) + '</b>. E l’errore tipico di ' +
                                                         'questo livello è guardare ' +
                                                         'soltanto l’ultima.') +
        '</p>';
    }
  });

  /* ====================================================================
     14 · LA DISTRIBUZIONE — un caso non basta
     ==================================================================== */
  figura('distribuzione', {
    titolo: 'Mille volte la stessa mattina',
    didascalia: 'La stessa catena, ripetuta mille volte con dadi diversi. Non un caso ' +
                'solo, quindi, ma la forma di tutti i casi possibili. Si vedono la ' +
                'media, e la fascia in cui finisce il novanta per cento delle ripetizioni.',
    disegna: function () {
      var m = A.montecarlo(catena(30, 45), { ripetizioni: 1000, seme: 424242,
                                             calibrazione: MS.CALIBRAZIONE });
      var h = A.istogramma(m.campioni.stress, { fasce: 14 });
      if (!h || h.degenere) {
        return '<p class="figura-conto">Tutte le ripetizioni finiscono sullo stesso numero: ' +
          h.minimo + '. Non c’è una distribuzione da mostrare.</p>';
      }
      var primo = h.fasce[0].da, ultimo = h.fasce[h.fasce.length - 1].a;
      var maxN = Math.max.apply(null, h.fasce.map(function (f) { return f.n; }));
      var g = D.tela({ larghezza: 720, altezza: 260, x: [primo, ultimo], y: [0, maxN * 1.1],
                       margini: { sinistra: 46, basso: 42 } });
      g.griglia([0, Math.round(maxN / 2), maxN]);
      g.bandaX(m.stress_finale.p10, m.stress_finale.p90, COLORI.neutro, 0.09);
      g.barre(h.fasce.map(function (f) {
        return [(f.da + f.a) / 2, f.n, 'da ' + f.da + ' a ' + f.a + ': ' + f.n + ' ripetizioni'];
      }), { colore: COLORI.ostacola });
      g.sogliaX(m.stress_finale.media, 'media ' + num(m.stress_finale.media), 'var(--inchiostro)');
      var tacche = [];
      for (var v = primo; v <= ultimo; v += Math.max(1, Math.round((ultimo - primo) / 6))) {
        tacche.push([v, String(v)]);
      }
      g.asseX(tacche, 'carico alla fine della mattina');
      g.asseY('quante ripetizioni, su mille');
      return g.chiudi('La distribuzione del carico finale su mille ripetizioni') +
        D.legenda([
          { testo: 'quante ripetizioni finiscono in quella fascia', colore: COLORI.ostacola },
          { testo: 'fra il 10° e il 90° percentile: l’80 % delle ripetizioni', colore: COLORI.neutro, opacita: 0.35 }
        ]) +
        '<p class="figura-conto">Media <b>' + num(m.stress_finale.media) + '</b>, mediana <b>' +
        num(m.stress_finale.mediana) + '</b>, e l’ottanta per cento delle ripetizioni fra <b>' +
        num(m.stress_finale.p10) + '</b> e <b>' + num(m.stress_finale.p90) + '</b>. La ' +
        'distribuzione è stretta, e non è un difetto del grafico. È il trasferimento al ' +
        '4,6 % che tiene tutte le ripetizioni vicine fra loro.</p>';
    }
  });

  /* ====================================================================
     15 · LA CONVERGENZA — quante ripetizioni bastano
     ==================================================================== */
  figura('convergenza', {
    titolo: 'L’intervallo si stringe con la radice',
    didascalia: 'Le stesse mille ripetizioni di prima, lette a fette. Per ogni n si vede la ' +
                'media sui primi n valori, con la fascia che le spetta. Non è una ' +
                'previsione: è quello che è successo davvero, man mano.',
    disegna: function () {
      var m = A.montecarlo(catena(30, 45), { ripetizioni: 1000, seme: 424242,
                                             calibrazione: MS.CALIBRAZIONE });
      var c = A.convergenza(m.campioni.stress, { soglia: 0.1, punti: 60 });
      var s = c.serie;
      var tutti = s.map(function (p) { return p.basso; }).concat(s.map(function (p) { return p.alto; }));
      var yMin = Math.min.apply(null, tutti), yMax = Math.max.apply(null, tutti);
      var pad = Math.max(0.4, (yMax - yMin) * 0.15);
      var g = D.tela({ larghezza: 720, altezza: 270, x: [s[0].n, s[s.length - 1].n],
                       y: [yMin - pad, yMax + pad], margini: { sinistra: 50, basso: 42 } });
      g.griglia([yMin - pad, (yMin + yMax) / 2, yMax + pad],
                { etichette: true, formato: function (v) { return num(v); }, terra: null });
      g.sfumatura('bandaConv', COLORI.azione, 0.26, 0.08);
      var contorno = s.map(function (p) { return [p.n, p.alto]; })
        .concat(s.slice().reverse().map(function (p) { return [p.n, p.basso]; }));
      var d = 'M ' + contorno.map(function (p) {
        return g.x(p[0]).toFixed(1) + ' ' + g.y(p[1]).toFixed(1);
      }).join(' L ') + ' Z';
      g.aggiungi('<path d="' + d + '" fill="url(#bandaConv)"/>');
      g.linea(s.map(function (p) { return [p.n, p.media]; }), { colore: COLORI.azione });
      if (c.basta_a !== null) { g.sogliaX(c.basta_a, 'bastano ' + c.basta_a, 'var(--buono)'); }
      g.asseX([[s[0].n, String(s[0].n)], [500, '500'], [1000, '1000']], 'ripetizioni');
      g.asseY('il carico medio sui primi n valori');
      return g.chiudi('Come si stringe l’intervallo mentre le ripetizioni salgono') +
        D.legenda([
          { testo: 'la media, man mano', colore: COLORI.azione, forma: 'linea' },
          { testo: 'la fascia al 95 % sulla media', colore: COLORI.azione, opacita: 0.3 }
        ]) +
        '<p class="figura-conto">' + esc(c.verdetto) + '</p>';
    }
  });

  /* ====================================================================
     16 · I DUE ASSI — che cosa non si somma
     ==================================================================== */
  figura('assi', {
    titolo: 'Un errore di denominatore, a variabilità fissata',
    didascalia: 'Le due fasce partono dalla stessa media e dalla stessa variabilità ' +
                'fra le ripetizioni. La seconda, però, commette l’errore di mettere al ' +
                'denominatore il numero di valutazioni invece del numero di ripetizioni, ' +
                'e per questo viene fuori più stretta di quanto abbia diritto di essere. ' +
                'È un esempio, non una regola: il fattore cambia da caso a caso.',
    disegna: function () {
      var m = A.montecarlo(catena(30, 45), { ripetizioni: 200, seme: 424242,
                                             calibrazione: MS.CALIBRAZIONE });
      var nodi = m.granularita.nodi_distinti;
      var giusta = m.stress_finale.semiampiezza_95;
      var finta = giusta / Math.sqrt(nodi);
      var g = D.tela({ larghezza: 700, altezza: 190,
                       x: [m.stress_finale.media - giusta * 1.4, m.stress_finale.media + giusta * 1.4],
                       y: [0, 2], margini: { sinistra: 120, basso: 42, alto: 24 } });
      function fascia(y, semi, colore, eti) {
        var c = m.stress_finale.media;
        g.aggiungi('<line x1="' + g.x(c - semi).toFixed(1) + '" y1="' + g.y(y).toFixed(1) +
          '" x2="' + g.x(c + semi).toFixed(1) + '" y2="' + g.y(y).toFixed(1) +
          '" stroke="' + colore + '" stroke-width="10" stroke-linecap="round" opacity="0.85"/>');
        g.aggiungi('<text x="' + (g.L - 10) + '" y="' + (g.y(y) + 4).toFixed(1) +
          '" text-anchor="end" font-size="11" fill="var(--inchiostro-2)">' + esc(eti) + '</text>');
      }
      fascia(1.45, giusta, COLORI.azione, 'n = ' + m.ripetizioni + ' ripetizioni');
      fascia(0.55, finta, COLORI.ostacola, 'n = ' + num(m.valutazioni_totali, 0) + ' valutazioni');
      g.sogliaX(m.stress_finale.media, 'media ' + num(m.stress_finale.media), 'var(--inchiostro)');
      g.asseX([], 'carico finale');
      return g.chiudi('Le due fasce a confronto: contando le ripetizioni e contando le valutazioni') +
        '<p class="figura-conto">La fascia calcolata sulle ripetizioni è <b>± ' + num(giusta, 2) +
        '</b>. Se al denominatore si mettessero, per sbaglio, le ' +
        num(m.valutazioni_totali, 0) + ' valutazioni, la fascia diventerebbe <b>± ' + num(finta, 2) +
        '</b>: più stretta di <b>' + num(Math.sqrt(nodi)) + ' volte</b>, senza che sia stata fatta ' +
        'una sola ripetizione in più. È una precisione finta, e il rapporto vale solo per questo ' +
        'esempio: con un’altra scena il numero cambia.</p>';
    }
  });

}(typeof window !== 'undefined' ? window : this));
