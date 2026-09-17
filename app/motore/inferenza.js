/* =============================================================================
   SIMULATORE 3.0 — L'INDAGINE: dove una scena si rompe, e per colpa di che cosa
   =============================================================================
   A CHE COSA SERVE, E A CHI

   Il resto del simulatore risponde alla domanda «come è andata». Questo file
   risponde a una domanda diversa, e piu' difficile:

       in una scena che va male, DOVE si rompe, e PERCHE' proprio li'?

   E' la domanda di chi indaga, non di chi racconta. Un medico che guarda una
   giornata di un paziente, un infermiere che prepara un turno, un investigatore
   che ricostruisce una sequenza di gesti, uno studioso che vuole capire il
   modello: tutti chiedono la stessa cosa, e non e' «quante probabilita' ci
   sono», e' «quale pezzo di questa sequenza è il punto debole, e che cosa lo
   rende debole».

   TRE COSE CHE VANNO CAPITE PRIMA DI GUARDARE UN QUALUNQUE NUMERO

   1. IL DADO NON E' IL COLPEVOLE.
      In questo modello il dado è onesto: esce un numero da 1 a 100, tutti
      ugualmente possibili. Quindi la probabilita' che un gesto fallisca NON
      dipende dalla fortuna: dipende solo da Pn, e vale esattamente
      (100 − Pn)/100. Se un nodo fallisce spesso non è perche' «è sfortunato»:
      è perche' ha una Pn bassa. La sfortuna non si indaga; le condizioni si'.

   2. ALLORA PERCHE' RIPETERE?
      Perche' dal secondo nodo in poi Pn non è piu' un numero fisso. Quello che
      succede al primo gesto cambia il carico, e il carico entra nella Pn del
      secondo. Quindi ripetendo la scena mille volte la Pn di un nodo diventa
      una DISTRIBUZIONE, e quanto è larga dice una cosa preziosa: quanto il
      destino di quel gesto dipende da com'è andata prima.
      Un nodo con Pn sempre 78 è solido. Un nodo con Pn che oscilla fra 30 e 75
      è un nodo che qualcuno, prima, ha reso fragile.

   3. QUESTO NON E' UNO STUDIO SULLA VITA.
      E' la cosa piu' importante di tutte, e il libro la ripete al capitolo 49.
      Ripetere una scena diecimila volte esplora IL MODELLO, non il mondo. I
      numeri che escono da qui descrivono come si comporta una rappresentazione
      dentro un insieme di regole scritte da qualcuno. Non sono una prova su
      una persona vera, non sono una diagnosi, non sono una previsione, e non
      valgono come elemento in una decisione clinica o giudiziaria.
      Chi lavora con le persone deve poterlo leggere scritto, e sta scritto qui.

   COME SI LEGGE UN INTERVALLO, IN UNA RIGA
   Ogni numero stimato esce con un intervallo. La regola del libro (capitolo 47)
   dice di guardare L'AMPIEZZA di quell'intervallo, non il numero di ripetizioni:
   «il 30 %» detto con ±14 e «il 30 %» detto con ±1 sono due affermazioni
   diverse, e solo la seconda serve a decidere qualcosa.
   ========================================================================== */

(function (globale) {
  'use strict';

  var N = globale.Nucleo;
  var S = globale.Stato;
  var A = globale.Analisi;
  var MS = globale.MicroSemantica;
  var Casuale = globale.CasualePython;

  (function (mancanti) {
    if (!mancanti.length) { return; }
    throw new Error('inferenza.js non può partire: ' +
      (mancanti.length === 1
        ? 'gli manca il modulo ' + mancanti[0] + ', e gli serve per rigiocare la scena migliaia di volte.'
        : 'gli mancano i moduli ' + mancanti.join(' e ') + ', e gli servono per rigiocare la scena migliaia di volte.') +
      ' Ordine di caricamento: calibrazione.js, lingua.js, casuale-mt.js, nucleo.js, ' +
      'stato.js, microsemantica.js, analisi.js, e solo dopo questo file.');
  }([['Nucleo (nucleo.js)', N], ['Stato (stato.js)', S], ['Analisi (analisi.js)', A],
     ['CasualePython (casuale-mt.js)', Casuale]]
    .filter(function (c) { return !c[1]; })
    .map(function (c) { return c[0]; })));

  /* ==========================================================================
     PARTE 1 · GLI STRUMENTI STATISTICI, SPIEGATI
     ========================================================================== */

  /* L'INTERVALLO DI WILSON, E PERCHE' NON QUELLO CHE SI IMPARA A SCUOLA.

     La formula che si insegna per l'intervallo di una percentuale è
         p ± 1,96 · radice( p(1−p) / n )
     e funziona bene quando p sta in mezzo. Vicino ai bordi si rompe, e si
     rompe in modo imbarazzante: con 0 fallimenti su 200 dà l'intervallo
     [0 %, 0 %], cioè dichiara la certezza assoluta dopo duecento prove. Non è
     prudenza, è un errore: da 200 prove andate bene non segue che non possa
     mai andare male.

     L'intervallo di Wilson (1927) risolve proprio questo, e non costa niente
     in piu': con 0 su 200 dà circa [0 %, 1,9 %], che è la cosa onesta da dire.
     Qui si indaga anche su nodi che falliscono quasi mai o quasi sempre, cioè
     esattamente dove l'altra formula sbaglia. */
  function wilson(successi, n, z) {
    if (!n) { return { quota: 0, basso: 0, alto: 1, ampiezza: 1, n: 0 }; }
    if (typeof successi !== 'number' || !isFinite(successi) || successi < 0 || successi > n) {
      throw new Error('Inferenza.wilson: successi deve essere un numero fra 0 e n (' + n +
        '), non ' + JSON.stringify(successi) + '.');
    }
    var zz = (z === undefined) ? 1.959963985 : z;
    var p = successi / n;
    var d = 1 + zz * zz / n;
    var centro = (p + zz * zz / (2 * n)) / d;
    var mezzo = (zz / d) * Math.sqrt(p * (1 - p) / n + zz * zz / (4 * n * n));
    var basso = Math.max(0, centro - mezzo);
    var alto = Math.min(1, centro + mezzo);
    return {
      quota: p, basso: basso, alto: alto,
      ampiezza: alto - basso, semiampiezza: (alto - basso) / 2, n: n
    };
  }

  /* IL CONFRONTO FRA DUE NODI DELLA STESSA SCENA — E PERCHE' NON BASTA
     GUARDARE DUE INTERVALLI E VEDERE SE SI TOCCANO.

     Sembra ragionevole: se l'intervallo del nodo 3 e quello del nodo 5 non si
     sovrappongono, allora sono diversi. Ma qui i due nodi non vengono da due
     esperimenti separati: vengono dalle STESSE ripetizioni, e quindi sono
     legati. Nella stessa giocata, se il primo gesto è andato male il secondo
     parte piu' carico. Trattarli come indipendenti butta via proprio questa
     informazione, e rende il confronto molto meno sensibile del dovuto.

     Il confronto giusto per dati appaiati è quello di McNemar. Non guarda i
     totali: guarda le giocate in cui i due nodi si sono comportati in modo
     DIVERSO. Se il nodo 3 fallisce e il 5 tiene in 180 giocate, e il contrario
     succede in 40, la differenza è netta. Se sono 110 contro 100, non lo è —
     anche se le percentuali totali sembrano diverse. */
  function mcnemar(soloA, soloB) {
    if (typeof soloA !== 'number' || typeof soloB !== 'number' ||
        !isFinite(soloA) || !isFinite(soloB) || soloA < 0 || soloB < 0) {
      throw new Error('Inferenza.mcnemar: soloA e soloB devono essere conteggi finiti e non ' +
        'negativi, non ' + JSON.stringify(soloA) + ' e ' + JSON.stringify(soloB) + '.');
    }
    var discordi = soloA + soloB;
    if (discordi === 0) { return { distinguibili: false, z: 0, discordi: 0 }; }
    /* correzione di continuita': con pochi discordi la normale sopravvaluta */
    var z = (Math.abs(soloA - soloB) - 1) / Math.sqrt(discordi);
    return { distinguibili: z > 1.959963985, z: z, discordi: discordi,
             piu_delicato: soloA > soloB ? 'A' : 'B' };
  }

  /* QUANDO SI CONFRONTANO VENTI NODI, QUALCUNO SEMBRA ESTREMO PER CASO.
     E' il problema dei confronti multipli, e chi fa ricerca lo conosce: se si
     guardano venti nodi con la soglia del 5 %, in media uno esce «notevole»
     anche quando non c'è niente da notare. La correzione di Bonferroni alza la
     soglia in proporzione al numero di confronti: severa, semplice, e nessuno
     puo' contestarla. Qui si usa per DIRE il numero, non per nasconderlo. */
  function zCorretto(quanti_confronti) {
    if (!(quanti_confronti > 1)) { return 1.959963985; }   /* cattura anche NaN */
    /* z tale che due code diano alfa/quanti: si inverte la normale a mano,
       con l'approssimazione di Beasley-Springer-Moro semplificata */
    var alfa = 0.05 / quanti_confronti;
    return zDaCoda(alfa / 2);
  }

  /* L'inversa della normale standard, senza librerie: approssimazione di
     Acklam, errore sotto 1,15e-9 su tutto l'intervallo utile. Serve solo qui,
     e la si scrive per esteso perche' il pacchetto non puo' scaricare niente. */
  function zDaCoda(p) {
    if (!(p > 0)) { return 8; }    /* cattura anche NaN */
    if (!(p < 1)) { return -8; }   /* cattura anche NaN */
    var a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02,
             1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
    var b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02,
             6.680131188771972e+01, -1.328068155288572e+01];
    var c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00,
             -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
    var d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00,
             3.754408661907416e+00];
    var pb = 0.02425, q, r, x;
    if (p < pb) {
      q = Math.sqrt(-2 * Math.log(p));
      x = (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
          ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
    } else if (p <= 1 - pb) {
      q = p - 0.5; r = q * q;
      x = (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
          (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
    } else {
      q = Math.sqrt(-2 * Math.log(1 - p));
      x = -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
           ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
    }
    return -x;   /* coda destra */
  }

  /* Le statistiche di una serie di numeri, con i quartili veri (non stimati). */
  function riassunto(valori) {
    if (!valori || !valori.length) { return null; }
    var v = valori.slice().sort(function (a, b) { return a - b; });
    var n = v.length;
    function quantile(q) {
      var i = (n - 1) * q, b = Math.floor(i), resto = i - b;
      return v[b] + (v[Math.min(b + 1, n - 1)] - v[b]) * resto;
    }
    var somma = 0;
    for (var i = 0; i < n; i++) { somma += v[i]; }
    var media = somma / n;
    var s2 = 0;
    for (i = 0; i < n; i++) { s2 += (v[i] - media) * (v[i] - media); }
    var ds = n > 1 ? Math.sqrt(s2 / (n - 1)) : 0;
    return {
      n: n, media: media, ds: ds,
      minimo: v[0], massimo: v[n - 1],
      q1: quantile(0.25), mediana: quantile(0.5), q3: quantile(0.75),
      /* l'intervallo della MEDIA, che non è la dispersione dei valori:
         confonderli è l'errore piu' comune in assoluto su questi grafici */
      ic_media: n > 1 ? 1.959963985 * ds / Math.sqrt(n) : 0
    };
  }

  /* ==========================================================================
     PARTE 2 · L'INDAGINE
     ========================================================================== */

  var TERMINI = ['P0', 'E', 'I', 'T', 'M', 'BP', 'C', 'piSTR', 'DEB'];

  var NOME_TERMINE = {
    P0: 'il punto di partenza',
    E: 'il corpo adesso',
    I: 'quanto è chiaro',
    T: 'la fretta',
    M: 'l’ambiente intorno',
    BP: 'quello che protegge',
    C: 'i pezzi da coordinare',
    piSTR: 'il carico che ti porti dietro',
    DEB: 'il debito da insistenza'
  };

  /* IL BUDGET, E PERCHE' NON SI PUO' FAR FINTA CHE NON ESISTA.

     Una scena puo' avere tre gesti o tremila. Il lavoro cresce come il numero
     di gesti moltiplicato per le ripetizioni, e su questa macchina il motore
     fa circa settantacinquemila valutazioni al secondo. Tremila gesti giocati
     duemila volte sarebbero sei milioni di valutazioni: un minuto e mezzo di
     pagina bloccata, e nessuno aspetta.

     Ci sono tre modi di comportarsi, e due sono cattivi. Il primo e' bloccare
     la pagina e sperare: si perde chi legge. Il secondo e' ridurre di nascosto
     le ripetizioni e mostrare gli stessi grafici: gli intervalli si allargano,
     le conclusioni si indeboliscono, e chi guarda non lo sa. E' il modo
     peggiore, perche' produce numeri che sembrano solidi e non lo sono.

     Il terzo, che e' quello scelto qui: si riduce, e SI DICE. La riduzione
     esce dentro il risultato, con quante ripetizioni erano state chieste,
     quante ne sono state fatte, e perche'. Chi legge sa che gli intervalli
     sono piu' larghi del solito, e sa di quanto — perche' l'ampiezza e'
     scritta anche lei. */
  var BUDGET_VALUTAZIONI = 400000;
  var TROPPI_GESTI = 100000;

  /* I numeri grandi si leggono solo se hanno il punto delle migliaia:
     «400.000 valutazioni» si legge, «400000 valutazioni» si conta a occhio.
     Le regole dei numeri stanno in app/motore/lingua.js, ma questo file gira
     anche nei banchi di prova che non lo caricano: la stessa regola, scritta
     qui in un punto solo. */
  function conLeMigliaia(n) {
    return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  function indaga(nodi, opzioni) {
    opzioni = opzioni || {};
    var chieste = opzioni.ripetizioni || 2000;
    var seme = opzioni.seme === undefined ? 424242 : opzioni.seme;
    var cal = opzioni.calibrazione || (MS ? MS.CALIBRAZIONE : null);

    if (!nodi || !nodi.length) {
      return { vuota: true, perche: 'Non c’è nessun gesto da indagare.' };
    }
    if (nodi.length > TROPPI_GESTI) {
      return { troppo_grande: true, gesti: nodi.length,
        perche: 'Questa scena ha ' + conLeMigliaia(nodi.length) + ' gesti, e sono troppi ' +
          'per essere giocati qui dentro anche una volta sola. Servirebbero minuti, non ' +
          'secondi. Una scena così non si indaga tutta insieme: si indaga un pezzo per ' +
          'volta. E i pezzi si scelgono guardando dove il carico sale.' };
    }

    var K = nodi.length;
    var budget = opzioni.budget_valutazioni || BUDGET_VALUTAZIONI;
    var ripetizioni = Math.max(50, Math.min(chieste, Math.floor(budget / K)));
    var ridotto = (ripetizioni < chieste)
      ? { chieste: chieste, usate: ripetizioni, gesti: K,
          perche: 'Questa scena ha ' + conLeMigliaia(K) + ' gesti. Giocarla ' +
            conLeMigliaia(chieste) + ' volte vorrebbe dire ' + conLeMigliaia(K * chieste) +
            ' valutazioni. Chi guarda la pagina resterebbe fermo ad aspettare ' +
            'troppo a lungo. Le giocate sono state ridotte a ' + conLeMigliaia(ripetizioni) +
            '. Gli intervalli qui sotto sono quindi più larghi di quanto sarebbero stati ' +
            'con tutte le giocate chieste. Ed è scritto di quanto.' }
      : null;
    /* per ogni nodo: la Pn di ogni giocata, e se ha fallito */
    var pnPerNodo = [], falliPerNodo = [], terminiPerNodo = [], esitiPerNodo = [];
    var i, k;
    for (k = 0; k < K; k++) {
      pnPerNodo.push([]); falliPerNodo.push([]); esitiPerNodo.push({});
      var acc = {}; TERMINI.forEach(function (t) { acc[t] = 0; });
      acc._taglio = 0;
      terminiPerNodo.push(acc);
    }
    /* dove si rompe per la prima volta, giocata per giocata */
    var primaRottura = [];
    /* il percorso dello stato: media per indice di nodo */
    var percorso = { stress_str: [], posizione_pos: [], debito_deb: [], costo_nascosto: [] };
    for (k = 0; k < K; k++) {
      percorso.stress_str.push([]); percorso.posizione_pos.push([]);
      percorso.debito_deb.push([]); percorso.costo_nascosto.push([]);
    }
    var esitiScena = {};

    for (var r = 0; r < ripetizioni; r++) {
      var rng = new Casuale(seme + r);
      var res = (MS && cal)
        ? MS.eseguiCatenaMicro(nodi, { rng: rng, calibrazione: cal })
        : S.eseguiScena(nodi, { rng: rng });
      esitiScena[res.esito] = (esitiScena[res.esito] || 0) + 1;

      var rotto = -1;
      for (k = 0; k < res.nodi.length && k < K; k++) {
        var nd = res.nodi[k];
        pnPerNodo[k].push(nd.pn);
        var fallito = !nd.successo_prima_del_campo;
        falliPerNodo[k].push(fallito ? 1 : 0);
        esitiPerNodo[k][nd.esito] = (esitiPerNodo[k][nd.esito] || 0) + 1;
        if (fallito && rotto < 0) { rotto = k; }
        var t = nd.termini || {};
        for (i = 0; i < TERMINI.length; i++) {
          terminiPerNodo[k][TERMINI[i]] += (t[TERMINI[i]] || 0);
        }
        terminiPerNodo[k]._taglio += (nd.pn - nd.pn_grezzo_prima_del_clamp);
        var sp = nd.stato_prima || {};
        percorso.stress_str[k].push(sp.stress_str || 0);
        percorso.posizione_pos[k].push(sp.posizione_pos || 0);
        percorso.debito_deb[k].push(sp.debito_deb || 0);
        percorso.costo_nascosto[k].push(sp.costo_nascosto || 0);
      }
      primaRottura.push(rotto);
    }

    /* --- le schede dei nodi ------------------------------------------------ */
    var fallimentiTotali = 0;
    for (k = 0; k < K; k++) {
      for (i = 0; i < falliPerNodo[k].length; i++) { fallimentiTotali += falliPerNodo[k][i]; }
    }
    var z = zCorretto(K);        /* la soglia si alza perche' i nodi sono K */

    var schede = [];
    for (k = 0; k < K; k++) {
      var quantiFalli = 0;
      for (i = 0; i < falliPerNodo[k].length; i++) { quantiFalli += falliPerNodo[k][i]; }
      var pn = riassunto(pnPerNodo[k]);
      var scomposizione = {};
      TERMINI.forEach(function (t) {
        scomposizione[t] = terminiPerNodo[k][t] / ripetizioni;
      });
      scomposizione.taglio = terminiPerNodo[k]._taglio / ripetizioni;

      schede.push({
        indice: k,
        descrizione: (nodi[k] && (nodi[k].descrizione || nodi[k].id)) || ('gesto ' + (k + 1)),
        pn: pn,
        rischio: wilson(quantiFalli, ripetizioni, z),
        rischio_semplice: wilson(quantiFalli, ripetizioni),
        fallimenti: quantiFalli,
        quota_dei_fallimenti: fallimentiTotali ? quantiFalli / fallimentiTotali : 0,
        /* quanto il destino di questo gesto dipende da com'è andata prima:
           se la Pn non si muove mai, il gesto è quello che è; se oscilla,
           qualcuno prima lo ha reso fragile */
        dipende_dal_prima: pn ? pn.ds : 0,
        scomposizione: scomposizione,
        esiti: esitiPerNodo[k],
        stato_prima: {
          carico: riassunto(percorso.stress_str[k]),
          assetto: riassunto(percorso.posizione_pos[k]),
          debito: riassunto(percorso.debito_deb[k]),
          costo_nascosto: riassunto(percorso.costo_nascosto[k])
        }
      });
    }

    /* --- la classifica, e se è distinguibile ------------------------------- */
    var classifica = schede.slice().sort(function (a, b) {
      return b.rischio.quota - a.rischio.quota;
    });
    var confronto = null;
    if (classifica.length >= 2) {
      var a1 = classifica[0].indice, a2 = classifica[1].indice;
      var soloA = 0, soloB = 0;
      for (i = 0; i < ripetizioni; i++) {
        var fa = falliPerNodo[a1][i], fb = falliPerNodo[a2][i];
        if (fa && !fb) { soloA++; } else if (fb && !fa) { soloB++; }
      }
      confronto = mcnemar(soloA, soloB);
      confronto.primo = a1;
      confronto.secondo = a2;
      confronto.solo_primo = soloA;
      confronto.solo_secondo = soloB;
    }

    /* --- dove si rompe la prima volta -------------------------------------- */
    var conteggioRottura = [], maiRotto = 0;
    for (k = 0; k < K; k++) { conteggioRottura.push(0); }
    for (i = 0; i < primaRottura.length; i++) {
      if (primaRottura[i] < 0) { maiRotto++; } else { conteggioRottura[primaRottura[i]]++; }
    }
    var rottura = {
      per_nodo: conteggioRottura.map(function (c, idx) {
        return { indice: idx, quante: c, quota: c / ripetizioni,
                 ic: wilson(c, ripetizioni) };
      }),
      mai: maiRotto,
      quota_mai: maiRotto / ripetizioni,
      /* la curva di sopravvivenza: quante giocate sono ancora intatte dopo k gesti */
      sopravvivenza: (function () {
        var vive = ripetizioni, curva = [{ dopo: 0, quota: 1 }];
        for (var kk = 0; kk < K; kk++) {
          vive -= conteggioRottura[kk];
          curva.push({ dopo: kk + 1, quota: vive / ripetizioni,
                       ic: wilson(vive, ripetizioni) });
        }
        return curva;
      }())
    };

    /* --- la precisione, con la regola del capitolo 47 ---------------------- */
    var ampiezzaMax = 0, doveMax = 0;
    for (k = 0; k < K; k++) {
      if (schede[k].rischio_semplice.ampiezza > ampiezzaMax) {
        ampiezzaMax = schede[k].rischio_semplice.ampiezza; doveMax = k;
      }
    }

    return {
      metodo_statistico: 'wilson_per_nodo_bonferroniK_mcnemar_esplorativo_2026-09-14',
      ripetizioni: ripetizioni,
      ripetizioni_chieste: chieste,
      ridotto: ridotto,
      seme_base: seme,
      calibrazione: cal ? cal.versione : 'nessuna',
      nodi: schede,
      classifica: classifica.map(function (s) { return s.indice; }),
      confronto_ai_vertici: confronto,
      rottura: rottura,
      esiti_scena: esitiScena,
      fallimenti_totali: fallimentiTotali,
      valutazioni: K * ripetizioni,
      precisione: {
        z_usato: z,
        confronti: K,
        nota_bonferroni: K > 1
          ? 'I gesti messi a confronto sono ' + conLeMigliaia(K) + '. Quando i confronti ' +
            'sono tanti, capita che uno sembri estremo per puro caso. Succede anche quando ' +
            'non c’è proprio niente da notare. Per questo la soglia è stata alzata, con la ' +
            'regola che si chiama correzione di Bonferroni. Si divide la soglia per quanti ' +
            'sono i confronti. Così un caso fortunato non passa più per una scoperta.'
          : 'C’è un gesto solo. Quindi non c’è nessun confronto da fare, e non c’è niente ' +
            'da correggere. La soglia resta quella di sempre.',
        ampiezza_massima: ampiezzaMax,
        nodo_meno_preciso: doveMax,
        ripetizioni_per_meta_ampiezza: Math.ceil(ripetizioni * 4)
      },
      unita_statistica: 'una giocata intera della scena',
      nota_conteggio: (K === 1 ? 'Un gesto solo, giocato ' : conLeMigliaia(K) + ' gesti, giocati ') +
        (ripetizioni === 1 ? 'una volta' : conLeMigliaia(ripetizioni) + ' volte') +
        ': in tutto ' + (K * ripetizioni === 1 ? 'una valutazione' : conLeMigliaia(K * ripetizioni) + ' valutazioni') +
        '. Le valutazioni NON sono il campione: il campione è ' + conLeMigliaia(ripetizioni) +
        ', cioè quante volte la scena è stata giocata da capo.'
    };
  }

  /* ==========================================================================
     PARTE 3 · CHE COSA SUCCEDE SE CAMBIO UNA COSA SOLA
     ==========================================================================
     E' la domanda che segue subito dopo «dove si rompe»: e se togliessi un
     pezzo da coordinare? E se partissi con dieci punti di carico in meno?

     DUE ACCORTEZZE CHE FANNO TUTTA LA DIFFERENZA.

     La prima: si riusa LO STESSO SEME. Confrontare due mondi con dadi diversi
     vuol dire misurare insieme l'effetto della modifica e il rumore del dado,
     e il rumore spesso è piu' grande dell'effetto. Riusando gli stessi tiri,
     le due versioni vedono esattamente la stessa sequenza di numeri, e la
     differenza che resta è solo la modifica. Si chiama «numeri casuali comuni»,
     e in una simulazione seria non è un'opzione: è il modo di farlo.

     La seconda: si separa l'effetto DIRETTO da quello INDIRETTO.
     L'effetto diretto si sa a mente, perche' la formula è una somma: un punto
     in piu' di corpo è un punto in piu' di Pn; un pezzo da coordinare in meno
     sono cinque punti in piu'. Quello che NON si sa a mente è quanto di quel
     guadagno arriva fino in fondo alla scena, perche' un gesto riuscito lascia
     meno carico, e meno carico cambia i gesti dopo. La differenza fra i due
     numeri è precisamente l'effetto che passa attraverso lo stato — la parte
     che nessuno riesce a calcolare a occhio, ed è la ragione per cui questa
     simulazione esiste. */

  /* PERCHE' LE LEVE NON SONO «+5 A OGNI VARIABILE».

     E' stato il primo tentativo, ed era sbagliato in un modo istruttivo. Nella
     formula il corpo, la chiarezza, la fretta, l'ambiente e la protezione si
     sommano tutti con peso uno: quindi «+5 al corpo» e «+5 alla chiarezza»
     danno per forza lo stesso identico risultato. Il grafico usciva con cinque
     barre uguali. Non era un errore di calcolo — era una domanda mal posta.

     La domanda vera e' un'altra: QUALI VARIABILI STANNO CREANDO IL PROBLEMA.
     E allora la leva giusta non e' «aggiungi cinque», e' «e se questa cosa non
     pesasse». Una variabile che oggi vale zero non ha niente da togliere, e la
     sua leva non e' applicabile; una che vale −12 ne ha dodici, e si vede.
     Cosi' le barre diventano diverse fra loro, e la loro lunghezza dice
     davvero quanto ciascuna condizione sta costando in questa scena.

     I tipi di leva sono quattro, e ognuno risponde a una domanda diversa:
       togli   → e se questa condizione non pesasse? (solo se oggi pesa)
       meno    → e se ce ne fosse un po' meno? (un passo realistico)
       piu     → e se ci fosse qualcosa che oggi non c'è?
       azzera  → e se non ce ne fosse affatto? (il caso limite) */
  var LEVE = [
    { chiave: 'E',    tipo: 'togli',  dove: 'modificatori.energia_e',
      nome: 'se il corpo non pesasse' },
    { chiave: 'I',    tipo: 'togli',  dove: 'modificatori.informazione_i',
      nome: 'se fosse tutto chiaro' },
    { chiave: 'T',    tipo: 'togli',  dove: 'modificatori.tempo_t',
      nome: 'se non ci fosse fretta' },
    { chiave: 'M',    tipo: 'togli',  dove: 'modificatori.materiale_m',
      nome: 'se l’ambiente non ostacolasse' },
    { chiave: 'C1',   tipo: 'meno',   passo: 1,  dove: 'modificatori.complessita_c',
      nome: 'un pezzo da coordinare in meno' },
    { chiave: 'C0',   tipo: 'azzera', dove: 'modificatori.complessita_c',
      nome: 'se non ci fosse niente da coordinare' },
    { chiave: 'BP',   tipo: 'piu',    passo: 5,  dove: 'modificatori.bonus_bp',
      nome: 'se ci fosse un aiuto vero' },
    { chiave: 'STR1', tipo: 'meno',   passo: 10, dove: 'stato_prima.stress_str',
      nome: 'dieci punti di carico in meno' },
    { chiave: 'STR0', tipo: 'azzera', dove: 'stato_prima.stress_str',
      nome: 'se si partisse riposati' },
    { chiave: 'DEB',  tipo: 'azzera', dove: 'stato_prima.debito_deb',
      nome: 'se non ci fosse debito da insistenza' }
  ];

  function copiaProfonda(x) { return JSON.parse(JSON.stringify(x)); }

  function scrivi(oggetto, percorso, valore) {
    var pezzi = percorso.split('.'), o = oggetto;
    for (var i = 0; i < pezzi.length - 1; i++) {
      if (!o[pezzi[i]]) { o[pezzi[i]] = {}; }
      o = o[pezzi[i]];
    }
    o[pezzi[pezzi.length - 1]] = valore;
  }

  function leggi(oggetto, percorso) {
    var pezzi = percorso.split('.'), o = oggetto;
    for (var i = 0; i < pezzi.length; i++) {
      if (o === undefined || o === null) { return 0; }
      o = o[pezzi[i]];
    }
    return (o === undefined || o === null) ? 0 : o;
  }

  /* Quante volte la scena finisce senza nessun gesto fallito, con questi nodi. */
  function misuraSuccesso(nodi, ripetizioni, seme, cal) {
    var intatte = 0, pnTot = 0, quanti = 0, esitiAppaiati = [];
    for (var r = 0; r < ripetizioni; r++) {
      var rng = new Casuale(seme + r);
      var res = (MS && cal)
        ? MS.eseguiCatenaMicro(nodi, { rng: rng, calibrazione: cal })
        : S.eseguiScena(nodi, { rng: rng });
      var tutti = true;
      for (var k = 0; k < res.nodi.length; k++) {
        if (!res.nodi[k].successo_prima_del_campo) { tutti = false; }
        pnTot += res.nodi[k].pn; quanti++;
      }
      if (tutti) { intatte++; }
      esitiAppaiati.push(tutti ? 1 : 0);
    }
    return { intatte: intatte, quota: intatte / ripetizioni, esiti_appaiati: esitiAppaiati,
             pn_media: quanti ? pnTot / quanti : 0 };
  }

  /* Differenza di proporzioni appaiate: si contano le repliche discordanti.
     Due intervalli Wilson al 97,5%, combinati con Bonferroni, danno una
     fascia prudente nominale al 95% per p(migliora)-p(peggiora). Rimane una
     approssimazione e non collassa a zero se non si osservano discordi.
     La correzione riguarda i due termini di UN confronto, non tutte le leve. */
  function differenzaAppaiata(prima, dopo) {
    if (prima.length !== dopo.length || !prima.length) {
      throw new Error('Il confronto richiede coppie di repliche in ugual numero.');
    }
    var meglio = 0, peggio = 0, n = prima.length;
    for (var i = 0; i < n; i++) {
      if (dopo[i] > prima[i]) { meglio++; }
      else if (dopo[i] < prima[i]) { peggio++; }
    }
    var z = zDaCoda(0.0125);
    var p = wilson(meglio, n, z), m = wilson(peggio, n, z);
    return { basso: Math.max(-1, p.basso - m.alto),
      alto: Math.min(1, p.alto - m.basso), n: n,
      migliora: meglio, peggiora: peggio,
      metodo: 'Wilson-Bonferroni sui discordi appaiati; nominale 95%',
      metodo_versione: 'discordi_appaiati_wilson975_bonferroni2_2026-09-14' };
  }

  function seCambiassi(nodi, opzioni) {
    opzioni = opzioni || {};
    var ripetizioni = opzioni.ripetizioni || 800;
    var seme = opzioni.seme === undefined ? 424242 : opzioni.seme;
    var cal = opzioni.calibrazione || (MS ? MS.CALIBRAZIONE : null);
    var soloNodo = (opzioni.nodo === undefined) ? null : opzioni.nodo;

    var base = misuraSuccesso(nodi, ripetizioni, seme, cal);
    var righe = [];

    LEVE.forEach(function (lv) {
      var variante = copiaProfonda(nodi);
      var toccati = 0, puntiTolti = 0;
      for (var k = 0; k < variante.length; k++) {
        if (soloNodo !== null && k !== soloNodo) { continue; }
        var prima = leggi(variante[k], lv.dove);
        var dopo = prima;
        if (lv.tipo === 'togli') {
          /* si toglie solo il DANNO: se la variabile aiuta gia', non c'è
             niente da togliere e la leva su questo nodo non si applica */
          if (prima < 0) { dopo = 0; }
        } else if (lv.tipo === 'azzera') {
          dopo = 0;
        } else if (lv.tipo === 'meno') {
          dopo = Math.max(0, prima - lv.passo);
        } else if (lv.tipo === 'piu') {
          dopo = prima + lv.passo;
        }
        if (lv.dove === 'stato_prima.stress_str') { dopo = Math.max(0, Math.min(100, dopo)); }
        if (dopo === prima) { continue; }
        puntiTolti += Math.abs(dopo - prima);
        scrivi(variante[k], lv.dove, dopo);
        toccati++;
      }
      if (!toccati) {
        righe.push({ leva: lv, applicabile: false,
          perche: (lv.tipo === 'togli' || lv.tipo === 'azzera')
            ? 'in questa scena non pesa: non c’è niente da togliere'
            : 'è già al minimo' });
        return;
      }
      var dopoM = misuraSuccesso(variante, ripetizioni, seme, cal);
      var differenza = dopoM.quota - base.quota;
      var appaiato = differenzaAppaiata(base.esiti_appaiati, dopoM.esiti_appaiati);
      righe.push({
        leva: lv,
        applicabile: true,
        nodi_toccati: toccati,
        prima: base.quota,
        dopo: dopoM.quota,
        differenza: differenza,
        ic: appaiato,
        conta: appaiato.basso > 0 || appaiato.alto < 0,
        /* Quanto vale la modifica SULLA CARTA, prima di sapere che cosa
           succede a valle. Per i termini che entrano nella somma con peso uno
           è il numero di punti tolti diviso i nodi toccati; per la complessità
           è cinque volte tanto; per il carico non si sa dirlo, perche' la
           penalità è una tabella a gradini e non una moltiplicazione — ed è
           proprio la differenza che il libro sottolinea all'Apparato B. */
        punti_tolti: puntiTolti,
        effetto_diretto_su_pn: (function () {
          var perNodo = puntiTolti / toccati;
          if (lv.dove === 'stato_prima.stress_str') { return null; }
          if (lv.dove === 'modificatori.complessita_c') { return perNodo * 5; }
          if (lv.dove === 'stato_prima.debito_deb') { return perNodo * 5; }
          return perNodo;
        }()),
        pn_prima: base.pn_media,
        pn_dopo: dopoM.pn_media,
        guadagno_su_pn: dopoM.pn_media - base.pn_media
      });
    });

    righe.sort(function (a, b) {
      return Math.abs(b.differenza || 0) - Math.abs(a.differenza || 0);
    });

    return {
      ripetizioni: ripetizioni,
      seme_base: seme,
      base: base,
      metodo_statistico: 'discordi_appaiati_wilson975_bonferroni2_2026-09-14',
      righe: righe,
      nodo: soloNodo,
      metodo: 'Ogni variante è stata giocata con gli stessi identici tiri di dado della ' +
              'versione di partenza. Si chiama «numeri casuali comuni». Vuol dire che le ' +
              'due versioni hanno avuto esattamente la stessa fortuna. Così la differenza ' +
              'che si vede è la modifica, e non il caso.'
    };
  }

  /* ==========================================================================
     PARTE 4 · DA DOVE SI PARTE CAMBIA TUTTO
     ==========================================================================
     La domanda «quali sono le condizioni iniziali che creano il problema» ha
     una risposta che si disegna: si fa scorrere il carico di partenza da 0 a
     100 e si guarda la curva. Non è mai una retta, e il punto in cui piega è
     l'informazione che serve. */
  function daDoveParti(nodi, opzioni) {
    opzioni = opzioni || {};
    var ripetizioni = opzioni.ripetizioni || 300;
    var seme = opzioni.seme === undefined ? 424242 : opzioni.seme;
    var cal = opzioni.calibrazione || (MS ? MS.CALIBRAZIONE : null);
    var passo = opzioni.passo || 5;
    var punti = [];
    for (var str = 0; str <= 100; str += passo) {
      var variante = copiaProfonda(nodi);
      for (var k = 0; k < variante.length; k++) {
        if (!variante[k].stato_prima) { variante[k].stato_prima = {}; }
        if (k === 0) { variante[k].stato_prima.stress_str = str; }
      }
      var m = misuraSuccesso(variante, ripetizioni, seme, cal);
      punti.push({ carico: str, quota: m.quota, ic: wilson(m.intatte, ripetizioni),
                   pn_media: m.pn_media });
    }
    /* dove la curva piega di piu': il punto in cui dieci punti di carico
       costano il massimo. Non è una soglia del libro, è una misura di questa
       scena, e va detto. */
    var salto = null;
    for (var i = 1; i < punti.length; i++) {
      var d = punti[i - 1].quota - punti[i].quota;
      if (salto === null || d > salto.caduta) {
        salto = { da: punti[i - 1].carico, a: punti[i].carico, caduta: d };
      }
    }
    return { punti: punti, passo: passo, ripetizioni: ripetizioni,
             caduta_piu_ripida: salto,
             nota: 'È una misura di QUESTA scena, non una soglia del libro.' };
  }

  var API = {
    indaga: indaga,
    seCambiassi: seCambiassi,
    daDoveParti: daDoveParti,
    wilson: wilson,
    differenzaAppaiata: differenzaAppaiata,
    mcnemar: mcnemar,
    zCorretto: zCorretto,
    zDaCoda: zDaCoda,
    riassunto: riassunto,
    LEVE: LEVE,
    TERMINI: TERMINI,
    NOME_TERMINE: NOME_TERMINE
  };

  globale.Inferenza = API;
  if (typeof module !== 'undefined' && module.exports) { module.exports = API; }

})(typeof window !== 'undefined' ? window : globalThis);
