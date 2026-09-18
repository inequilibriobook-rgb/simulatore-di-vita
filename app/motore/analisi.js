/* =============================================================================
   SIMULATORE 3.0 — I due assi dell'analisi          (decisione del 17/08/2026)
   =============================================================================
   REGOLA VINCOLANTE DEL PROGETTO

   Asse 1 — GRANULARITÀ: quanti nodi DISTINTI ha la scena.
            Lo decide la descrizione, non un cursore. Se vuoi più nodi,
            devi descrivere di più.

   Asse 2 — RIPETIZIONI: quante volte si rigioca la STESSA catena con dadi
            diversi. Non cambia il numero di nodi: cambia quanto stretto è
            l'intervallo dentro cui sta la risposta, cioè quanto ci si può
            fidare del numero che esce.

   I due assi NON si sommano e NON si confondono mai in quello che si legge.
   L'unità statistica è UNA GIOCATA INTERA DELLA SCENA, non il nodo.

   PERCHÉ
   Nel simulatore originale un risultato che diceva «500 nodi» conteneva 40
   microazioni ripetute 13 volte ciascuna, distinte solo dal lancio del dado e
   senza che lo stato passasse dall'una all'altra. Trattare quei 500 come
   n = 500 gonfia il campione di 12,5 volte: gli intervalli si stringono di
   √12,5 ≈ 3,5 volte gratis, e il risultato sembra tre volte e mezzo più
   preciso di quanto sia.
   ========================================================================== */

(function (globale) {
  'use strict';

  var N = globale.Nucleo;
  var S = globale.Stato;

  /* CHI MANCA SI DEVE SENTIRE, SUBITO.
     I moduli qui sopra vengono presi UNA VOLTA SOLA, al caricamento: se uno
     non c'e' ancora, la variabile resta undefined per sempre, anche se il
     modulo arriva un istante dopo.

     Perche' non basta lasciar esplodere da solo: dove c'e' una guardia del
     tipo «X && X.qualcosa», un modulo mancante non esplode — degrada. Il
     03/09/2026 tempo.js caricato prima di microsemantica.js ha prodotto una
     traiettoria di dodici settimane a carico 100 invece di 43, senza un
     errore ne' un avviso. Sbagliata del doppio, e invisibile.

     Le pagine HTML caricano nell'ordine giusto e il prodotto consegnato e'
     corretto. Questa guardia serve a chi scrive un banco di prova suo — le
     misure lunghe — perche' trovi un errore e non un numero sbagliato. */
  (function (mancanti) {
    if (!mancanti.length) { return; }
    throw new Error('analisi.js non può partire: ' +
      (mancanti.length === 1
        ? 'gli manca il modulo ' + mancanti[0] + ', e gli serve per contare i nodi distinti e per ripetere la scena.'
        : 'gli mancano i moduli ' + mancanti.join(' e ') + ', e gli servono per contare i nodi distinti e per ripetere la scena.') +
      ' Ordine di caricamento: nucleo.js, calibrazione.js, casuale-mt.js, stato.js, ' +
      'microsemantica.js, tempo.js, settimana-tipo.js, e i dati prima di chi li usa.');
  }([['Nucleo (nucleo.js)', N], ['Stato (stato.js)', S]]
    .filter(function (c) { return !c[1]; })
    .map(function (c) { return c[0]; })));


  /* ---------------------------------------------------------------------
     ASSE 1 — GRANULARITÀ
     --------------------------------------------------------------------- */

  /* La firma di un nodo: tutto ciò che entra nel calcolo, escluso il dado.
     Due nodi con la stessa firma NON sono due nodi: sono lo stesso nodo
     giocato due volte. */
  function firmaNodo(nodo) {
    var n = N.normalizzaNodo(nodo);
    var m = n.modificatori, c = n.campo, s = n.supporto, a = n.adattamento;
    return [
      n.descrizione.toLowerCase().replace(/\s+/g, ' ').trim(),
      n.p0, m.energia_e, m.informazione_i, m.tempo_t, m.materiale_m, m.bonus_bp, m.complessita_c,
      c.attivo ? 1 : 0, c.forza, c.tiro === null ? '-' : c.tiro,
      s.tipo, s.delega, s.riduzione_carico, s.competenza, s.tempestivo ? 1 : 0, s.costo_confine,
      a.tipo, a.disponibilita, a.riduzione_attesa, a.costo, a.crea_rip_reale ? 1 : 0,
      n.profilo, n.famiglia
    ].join('|');
  }

  /* Scale di granularità: quanti nodi distinti è ragionevole avere. */
  var SCALE = [
    { id: 'gesto',      etichetta: 'Un gesto singolo',            min: 1,    max: 5 },
    { id: 'brevissima', etichetta: 'Scena brevissima',            min: 5,    max: 15 },
    { id: 'breve',      etichetta: 'Scena breve',                 min: 15,   max: 40 },
    { id: 'complessa',  etichetta: 'Sequenza complessa',          min: 40,   max: 150 },
    { id: 'mezza',      etichetta: 'Mezza giornata',              min: 150,  max: 600 },
    { id: 'giornata',   etichetta: 'Una giornata intera',         min: 600,  max: 2000 },
    { id: 'settimana',  etichetta: 'Una settimana',               min: 2000, max: 15000 }
  ];

  function scalaPer(nDistinti) {
    for (var i = 0; i < SCALE.length; i++) {
      if (nDistinti <= SCALE[i].max) { return SCALE[i]; }
    }
    return SCALE[SCALE.length - 1];
  }

  /* I numeri grandi si leggono solo con il punto delle migliaia: «15.000
     valutazioni» si legge in un colpo d'occhio, «15000 valutazioni» si conta
     una cifra alla volta. La regola vive in app/motore/lingua.js, ma questo
     file gira anche nei banchi di prova che lingua.js non caricano: qui la
     stessa regola, in un punto solo. */
  function conLeMigliaia(n) {
    return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  /* I NUMERI SI SCRIVONO IN ITALIANO ANCHE QUI.
     Le frasi di questo file uscivano con «±0.35»: il punto dei decimali è
     inglese, e finiva a schermo accanto a percentuali scritte con la virgola.
     Le regole stanno in app/motore/lingua.js, ma analisi.js gira anche nei
     banchi di prova che non lo caricano, e allora la virgola si mette qui,
     con la stessa regola e in un punto solo. */
  /* Il meno è quello della matematica (−), non il trattino della tastiera:
     a due centimetri il resto del simulatore scrive «−5 punti» con il segno
     vero, e due segni per la stessa cosa nella stessa riga si notano. */
  function conLaVirgola(x) { return String(x).replace('.', ',').replace(/^-/, '−'); }

  /* Verifica la granularità di una catena e denuncia le repliche. */
  function verificaGranularita(nodi) {
    var visti = {}, distinti = [], repliche = [], gruppi = {};
    for (var i = 0; i < nodi.length; i++) {
      var f = firmaNodo(nodi[i]);
      if (visti[f] === undefined) {
        visti[f] = distinti.length;
        distinti.push(nodi[i]);
        gruppi[f] = 1;
      } else {
        repliche.push({ indice: i, replica_di: visti[f] });
        gruppi[f]++;
      }
    }
    var maxRip = 0, chiaveMax = null;
    for (var g in gruppi) { if (gruppi[g] > maxRip) { maxRip = gruppi[g]; chiaveMax = g; } }

    var forniti = nodi.length, nDist = distinti.length;
    var gonfiaggio = nDist ? forniti / nDist : 1;

    /* LE FRASI SI ACCORDANO, ANCHE QUANDO IL NUMERO È UNO.
       Una scena di un gesto solo, o con una replica sola, faceva scrivere
       «1 gesti reali» e «1 repliche su 1 nodi». Le regole dell'italiano
       stanno in app/motore/lingua.js, ma questo file gira anche nei banchi
       di prova che lingua.js non caricano: qui l'accordo si scrive a mano,
       ed è il motivo per cui ogni frase porta il proprio singolare. */
    var verdetto, spiegazione;
    if (repliche.length === 0) {
      verdetto = 'valida';
      spiegazione = nDist === 1
        ? 'C’è un gesto solo, e non si ripete: la scena è tutta qui.'
        : 'Ogni gesto è diverso dagli altri: sono ' + conLeMigliaia(nDist) + ' gesti veri.';
    } else if (gonfiaggio < 1.15) {
      verdetto = 'accettabile';
      spiegazione = (repliche.length === 1
          ? 'Un gesto su ' + conLeMigliaia(forniti) + ' è la copia di un altro.'
          : conLeMigliaia(repliche.length) + ' gesti su ' + conLeMigliaia(forniti) +
            ' sono la copia di un altro.') +
        ' Sono meno del 15 %. Si può tollerare, ma è giusto dirlo.';
    } else {
      verdetto = 'gonfiata';
      var quanteVolte = (Math.round(gonfiaggio * 10) / 10);
      var volte = String(quanteVolte).replace('.', ',');
      /* «CIASCUNO» VUOLE PIU' DI UNO DAVANTI.
         Qui c'era una coda sola per tutti e due i rami, e con un gesto distinto
         soltanto usciva «e' come contarlo 2 volte ciascuno»: ciascuno di chi, se
         e' uno solo? La coda adesso sta dentro il ramo che la regge. */
      spiegazione = 'Sono stati dichiarati ' + conLeMigliaia(forniti) + ' gesti, ma quelli ' +
        'davvero diversi ' + (nDist === 1
          ? 'sono uno solo. È come contarlo ' + volte + ' volte. '
          : 'sono ' + conLeMigliaia(nDist) + '. È come contarli ' + volte + ' volte ciascuno. ') +
        (repliche.length === 1
          ? 'La copia che resta cambia solo per il lancio del dado. Non aggiunge niente a ' +
            'quello che si sa, e allargherebbe il campione senza motivo. Perciò viene contata una volta sola.'
          : 'Le ' + conLeMigliaia(repliche.length) + ' copie che restano cambiano solo per il lancio del dado. ' +
            'Non aggiungono niente a quello che si sa, e allargherebbero il campione senza ' +
            'motivo. Perciò vengono contate una volta sola.');
    }

    return {
      nodi_forniti: forniti,
      nodi_distinti: nDist,
      repliche: repliche.length,
      fattore_gonfiaggio: Math.round(gonfiaggio * 100) / 100,
      max_ripetizioni_stesso_nodo: maxRip,
      scala: scalaPer(nDist),
      verdetto: verdetto,
      spiegazione: spiegazione,
      catena_deduplicata: distinti
    };
  }

  /* ---------------------------------------------------------------------
     ASSE 2 — RIPETIZIONI (Monte Carlo)
     --------------------------------------------------------------------- */

  /* Rigioca la stessa catena `ripetizioni` volte con dadi diversi.
     Il seme deriva da quello della sessione: il caso singolo mostrato
     all'utente APPARTIENE al campione che lo commenta.
     (Nel Python i semi erano fissi — Random(910000+i) — e il caso mostrato
      restava fuori dal campione.) */
  function montecarlo(nodi, opzioni) {
    opzioni = opzioni || {};
    var ripetizioni = opzioni.ripetizioni || 100;
    var seme = opzioni.seme === undefined ? 424242 : opzioni.seme;
    var suDistinti = opzioni.usaDeduplicata !== false;

    var gran = verificaGranularita(nodi);
    var catena = suDistinti ? gran.catena_deduplicata : nodi;

    var Casuale = globale.CasualePython;
    var MS = globale.MicroSemantica;
    var cal = opzioni.calibrazione || (MS ? MS.CALIBRAZIONE : null);
    var esiti = {}, rischi = {};
    var strFinali = [], posFinali = [], debFinali = [], cosFinali = [];
    var esempio = null;

    /* IL LIVELLO DEL NODO, CHE PRIMA SI BUTTAVA VIA.
       Aggiunto il 06/09/2026, e serve a un caso che si presenta subito:
       una scena di UN nodo solo. L'esito della scena, li', dice poco —
       il trasferimento di stato misurato e' il 4,6 % (capitolo 28), e un
       nodo solo muove lo stato finale di una frazione di punto, quindi
       l'esito aggregato esce quasi sempre uguale. Ma il NODO, sotto,
       riesce o non riesce, e con margini diversi.

       Le due cose hanno unita' statistiche diverse e non si confrontano:
         esiti        n = ripetizioni         (unita': una giocata della scena)
         esiti_nodo   n = nodi x ripetizioni  (unita': la valutazione di un nodo)
       Sono tenute separate, e ciascuna dichiara la propria n. Confonderle
       sarebbe lo stesso errore dei «500 nodi che erano 40». */
    var esitiNodo = {}, riuscite = 0, valutazioni = 0;
    var fasceMargine = { fragile: 0, normale: 0, forte: 0 };

    for (var r = 0; r < ripetizioni; r++) {
      var rng = new Casuale(seme + r);          // seme derivato, non fisso
      /* la stessa calibrazione del caso singolo: il campione e il caso mostrato
         devono venire dallo stesso modello, altrimenti non si commentano a vicenda */
      var res = (MS && cal)
        ? MS.eseguiCatenaMicro(catena, { rng: rng, calibrazione: cal })
        : S.eseguiScena(catena, { rng: rng });
      esiti[res.esito] = (esiti[res.esito] || 0) + 1;
      rischi[res.rischio] = (rischi[res.rischio] || 0) + 1;
      strFinali.push(res.stato_finale.stress_str);
      posFinali.push(res.stato_finale.posizione_pos);
      debFinali.push(res.stato_finale.debito_deb);
      cosFinali.push(res.stato_finale.costo_nascosto);

      for (var k = 0; k < res.nodi.length; k++) {
        var nd = res.nodi[k];
        esitiNodo[nd.esito] = (esitiNodo[nd.esito] || 0) + 1;
        valutazioni++;
        if (nd.successo_prima_del_campo) { riuscite++; }
        /* le tre fasce del capitolo 9, sul margine grezzo */
        if (nd.margine_grezzo <= 9) { fasceMargine.fragile++; }
        else if (nd.margine_grezzo <= 24) { fasceMargine.normale++; }
        else { fasceMargine.forte++; }
      }
      if (r === 0) { esempio = res; }    // la prima giocata È dentro il campione
    }

    return componi({
      granularita: gran,
      quantiNodi: catena.length,
      ripetizioni: ripetizioni,
      calibrazione: cal ? cal.versione : 'nessuna',
      seme: seme,
      esiti: esiti,
      rischi: rischi,
      esitiNodo: esitiNodo,
      valutazioni: valutazioni,
      riuscite: riuscite,
      margini: fasceMargine,
      campioni: { stress: strFinali, posizione: posFinali,
                  debito: debFinali, costo_nascosto: cosFinali },
      esempio: esempio
    });
  }

  /* IL RISULTATO SI COMPONE IN UN POSTO SOLO.
     Lo usano `montecarlo`, che gioca tutto d'un fiato, e `fondi`, che rimette
     insieme i pezzi di una partita giocata a rate. Se la forma del risultato
     si scrivesse due volte, prima o poi le due copie direbbero cose diverse —
     e la seconda sarebbe quella che nessuno guarda. */
  function componi(d) {
    var quanteValut = d.quantiNodi * d.ripetizioni;
    return {
      granularita: d.granularita,
      metodo_statistico: 'media_normale95_varianza_campionaria_2026-09-14',
      ripetizioni: d.ripetizioni,
      calibrazione: d.calibrazione,
      seme_base: d.seme,
      unita_statistica: 'una ripetizione intera della scena',
      valutazioni_totali: quanteValut,
      nota_conteggio: (d.quantiNodi === 1
          ? 'Un gesto solo, ripetuto '
          : conLeMigliaia(d.quantiNodi) + ' gesti diversi, ripetuti ') +
        (d.ripetizioni === 1 ? 'una volta' : conLeMigliaia(d.ripetizioni) + ' volte') +
        ': in tutto ' + (quanteValut === 1
          ? 'una valutazione'
          : conLeMigliaia(quanteValut) + ' valutazioni') +
        '. Ma le valutazioni non sono il campione: il campione è ' + conLeMigliaia(d.ripetizioni) +
        ', cioè quante volte la scena è stata rifatta da capo.',
      esiti: ordina(d.esiti, d.ripetizioni),
      /* Le fasce escono con la chiave E con il nome italiano accanto: chi le
         mostra non deve andare a cercarsi una tabella da un'altra parte, e
         non puo' far comparire a schermo «fragile_grave_pre_rosso». */
      rischi: ordina(d.rischi, d.ripetizioni).map(function (r) {
        r.nome = S.nomeRischio(r.chiave);
        return r;
      }),

      /* il livello del nodo, con la sua unita' dichiarata accanto */
      nodo: {
        unita_statistica: 'la valutazione di un nodo',
        n: d.valutazioni,
        esiti: ordina(d.esitiNodo, d.valutazioni),
        riuscite: d.riuscite,
        quota_riuscite: d.valutazioni ? d.riuscite / d.valutazioni : 0,
        margini: {
          fragile: d.margini.fragile,
          normale: d.margini.normale,
          forte: d.margini.forte
        }
      },
      stress_finale: statistiche(d.campioni.stress),
      posizione_finale: statistiche(d.campioni.posizione),
      debito_finale: statistiche(d.campioni.debito),
      costo_finale: statistiche(d.campioni.costo_nascosto),

      /* I CAMPIONI GREZZI, NON SOLO I LORO RIASSUNTI.
         Aggiunti il 06/09/2026. Prima uscivano solo media, deviazione e
         percentili: numeri che descrivono una distribuzione senza mai
         mostrarla. Con media 71 e deviazione 9 non si distingue una gobba
         sola da due gobbe lontane, e le due cose vogliono dire cose molto
         diverse — la seconda dice che la stessa scena ha due destini, non
         un destino incerto.

         Sono gli stessi numeri da cui `statistiche` ha ricavato i propri:
         chi legge puo' rifare i conti e trovare gli stessi valori. */
      campioni: {
        stress: d.campioni.stress.slice(),
        posizione: d.campioni.posizione.slice(),
        debito: d.campioni.debito.slice(),
        costo_nascosto: d.campioni.costo_nascosto.slice()
      },

      /* CHE COSA SI MUOVE INSIEME — la regressione descrittiva del libro.
         Le coppie non si scelgono a schermo, e non e' una limitazione: sono
         le tre che hanno senso confrontare, cioe' le tre grandezze che ogni
         giocata porta a casa insieme. Un menu che permettesse di incrociare
         tutto con tutto sarebbe esattamente la pesca che l'avvertenza qui
         sotto esiste per scoraggiare. */
      correlazioni: [
        coppiaCorrelata('il carico finale', d.campioni.stress,
                        'il costo nascosto', d.campioni.costo_nascosto),
        coppiaCorrelata('il carico finale', d.campioni.stress,
                        'l’assetto finale', d.campioni.posizione),
        coppiaCorrelata('il costo nascosto', d.campioni.costo_nascosto,
                        'l’assetto finale', d.campioni.posizione)
      ],
      avvertenza_correlazioni: AVVERTENZA,

      esempio_nel_campione: d.esempio
    };
  }

  /* ---------------------------------------------------------------------
     LA STESSA PARTITA, GIOCATA A RATE
     ---------------------------------------------------------------------
     DIECIMILA GIOCATE BLOCCAVANO LA PAGINA, E UNA PAGINA FERMA SEMBRA ROTTA.
     Trentamila valutazioni al secondo sono tante finché la scena è corta.
     Con trenta gesti rigiocati diecimila volte sono trecentomila valutazioni:
     cinque secondi buoni in cui il browser non ridisegna niente, non risponde
     al mouse e non muove la pagina. Chi guarda non vede un calcolo in corso.
     Vede una pagina che non funziona più, e clicca di nuovo.

     Il rimedio non è calcolare di meno — sarebbe barare sul campione — ma
     calcolare a rate. Si gioca un pezzo, si restituisce il fiato al browser,
     si gioca il pezzo dopo. Fra un pezzo e l'altro l'avanzamento si può
     mostrare, e il conto si può anche interrompere.

     I RISULTATI SONO GLI STESSI, NON «PRATICAMENTE GLI STESSI».
     Il seme della giocata numero r è sempre `seme + r`, in `montecarlo`. Il
     pezzo che parte dalla giocata 500 riceve quindi `seme + 500` come seme di
     base, e le sue giocate riprendono esattamente la fila dei dadi dove il
     pezzo precedente l'aveva lasciata. Non è una promessa: è un controllo
     della suite, che confronta pezzo per pezzo con la partita giocata tutta
     insieme. */
  function montecarloAPezzi(nodi, opzioni) {
    opzioni = opzioni || {};
    var totale = opzioni.ripetizioni || 100;
    var pezzo = Math.max(1, Math.round(opzioni.pezzo || 250));
    var semeBase = opzioni.seme === undefined ? 424242 : opzioni.seme;
    var fatte = 0, parti = [];

    return {
      totale: totale,
      fatte: function () { return fatte; },
      finito: function () { return fatte >= totale; },
      /* gioca il pezzo successivo e restituisce quante giocate sono fatte */
      passo: function () {
        if (fatte >= totale) { return fatte; }
        var quante = Math.min(pezzo, totale - fatte);
        var sotto = {};
        for (var k in opzioni) {
          if (Object.prototype.hasOwnProperty.call(opzioni, k)) { sotto[k] = opzioni[k]; }
        }
        sotto.ripetizioni = quante;
        sotto.seme = semeBase + fatte;
        parti.push(montecarlo(nodi, sotto));
        fatte += quante;
        return fatte;
      },
      risultato: function () {
        if (!parti.length) { return montecarlo(nodi, opzioni); }
        return fondi(parti, semeBase);
      }
    };
  }

  function fondi(parti, semeBase) {
    var esiti = {}, rischi = {}, esitiNodo = {};
    var margini = { fragile: 0, normale: 0, forte: 0 };
    var campioni = { stress: [], posizione: [], debito: [], costo_nascosto: [] };
    var ripetizioni = 0, valutazioni = 0, riuscite = 0;

    parti.forEach(function (p) {
      ripetizioni += p.ripetizioni;
      valutazioni += p.nodo.n;
      riuscite += p.nodo.riuscite;
      p.esiti.forEach(function (o) { esiti[o.chiave] = (esiti[o.chiave] || 0) + o.n; });
      p.rischi.forEach(function (o) { rischi[o.chiave] = (rischi[o.chiave] || 0) + o.n; });
      p.nodo.esiti.forEach(function (o) { esitiNodo[o.chiave] = (esitiNodo[o.chiave] || 0) + o.n; });
      margini.fragile += p.nodo.margini.fragile;
      margini.normale += p.nodo.margini.normale;
      margini.forte += p.nodo.margini.forte;
      /* i quattro campioni si scorrono per chiave, non per elenco scritto a
         mano: un elenco andrebbe tenuto in pari con `componi`, e il giorno in
         cui se ne aggiungesse un quinto la fusione lo perderebbe in silenzio */
      Object.keys(campioni).forEach(function (c) {
        campioni[c] = campioni[c].concat(p.campioni[c]);
      });
    });

    return componi({
      granularita: parti[0].granularita,
      quantiNodi: ripetizioni ? Math.round(valutazioni / ripetizioni) : 0,
      ripetizioni: ripetizioni,
      calibrazione: parti[0].calibrazione,
      seme: semeBase === undefined ? parti[0].seme_base : semeBase,
      esiti: esiti, rischi: rischi, esitiNodo: esitiNodo,
      valutazioni: valutazioni, riuscite: riuscite, margini: margini,
      campioni: campioni,
      /* la prima giocata del primo pezzo è la prima giocata di tutte */
      esempio: parti[0].esempio_nel_campione
    });
  }

  function ordina(conteggi, tot) {
    return Object.keys(conteggi)
      .map(function (k) { return { chiave: k, n: conteggi[k], quota: conteggi[k] / tot }; })
      .sort(function (a, b) { return b.n - a.n; });
  }

  function statistiche(v) {
    if (!v.length) { return null; }
    var s = v.slice().sort(function (a, b) { return a - b; });
    var media = v.reduce(function (a, b) { return a + b; }, 0) / v.length;
    var varianza = v.reduce(function (a, b) { return a + (b - media) * (b - media); }, 0) / v.length;
    var ds = Math.sqrt(varianza);
    /* semiampiezza al 95 % sulla MEDIA, con n = numero di ripetizioni */
    var semi = v.length > 1 ? 1.96 * ds / Math.sqrt(v.length - 1) : 0;
    return {
      n: v.length,
      metodo_statistico: 'media_normale95_varianza_campionaria_2026-09-14',
      /* CON UNA GIOCATA SOLA L'INTERVALLO NON E' ZERO: NON C'E'.
         La semiampiezza usciva 0, e un ±0 a schermo si legge «questa media è
         esatta»: esattamente il contrario di quello che una giocata sola
         permette di dire. Il numero resta 0 perché chi disegna le fasce ha
         bisogno di un numero, ma accanto c'è la bandierina che dice che quello
         zero non è una misura — è un'assenza di misura. */
      incertezza_ignota: v.length < 2,
      media: Math.round(media * 100) / 100,
      deviazione: Math.round(ds * 100) / 100,
      minimo: s[0],
      massimo: s[s.length - 1],
      /* il decimo e il novantesimo, non il quinto e il novantacinquesimo:
         sono le due soglie che il capitolo 47 nomina per nome ('il decimo
         mostra le giocate piu' favorevoli, il novantesimo quelle piu'
         pesanti') per dire quanto e' stabile la scena. Corretto il 15/09/2026
         — prima il codice ne calcolava altre due, vicine ma diverse. */
      p10: perc(s, 0.10), p25: perc(s, 0.25), mediana: perc(s, 0.50),
      p75: perc(s, 0.75), p90: perc(s, 0.90),
      semiampiezza_95: Math.round(semi * 100) / 100,
      intervallo_95: [Math.round((media - semi) * 100) / 100, Math.round((media + semi) * 100) / 100]
    };
  }
  function confrontoAppaiato(prima, dopo) {
    if (prima.length !== dopo.length || prima.length < 2) {
      throw new Error('Servono almeno due coppie di repliche nello stesso ordine.');
    }
    var r = statistiche(dopo.map(function (x, i) { return x - prima[i]; }));
    r.metodo_statistico = 'differenze_appaiate_media_normale95_2026-09-14';
    return r;
  }
  function perc(ordinati, p) {
    var i = (ordinati.length - 1) * p;
    var b = Math.floor(i), r = i - b;
    return ordinati[b + 1] !== undefined
      ? Math.round((ordinati[b] + r * (ordinati[b + 1] - ordinati[b])) * 100) / 100
      : ordinati[b];
  }

  /* ---------------------------------------------------------------------
     GUARDARE LA DISTRIBUZIONE, NON SOLO IL SUO RIASSUNTO
     ---------------------------------------------------------------------
     Due funzioni sole, e nessuna delle due inventa niente: rimettono in
     forma i campioni che `montecarlo` ha appena prodotto.  */

  /* ISTOGRAMMA — quante run sono finite in ciascuna fascia.
     La larghezza delle fasce non viene scelta a occhio: si parte dal numero
     di fasce chiesto e si arrotonda il passo a un numero leggibile (1, 2, 5,
     10, 20, 25, 50), perche' un istogramma con le fasce «da 6,37 a 12,74»
     non lo legge nessuno. */
  var PASSI_LEGGIBILI = [1, 2, 5, 10, 20, 25, 50, 100];

  function istogramma(valori, opzioni) {
    opzioni = opzioni || {};
    if (!valori || !valori.length) { return null; }
    var fasceVolute = opzioni.fasce || 12;
    var min = opzioni.minimo !== undefined ? opzioni.minimo : Math.min.apply(null, valori);
    var max = opzioni.massimo !== undefined ? opzioni.massimo : Math.max.apply(null, valori);

    /* tutto uguale: una fascia sola, e si dice che e' una sola */
    if (max === min) {
      return {
        passo: 1, fasce: [{ da: min, a: min, n: valori.length, quota: 1 }],
        n: valori.length, minimo: min, massimo: max, degenere: true
      };
    }

    var grezzo = (max - min) / fasceVolute, passo = PASSI_LEGGIBILI[0];
    for (var i = 0; i < PASSI_LEGGIBILI.length; i++) {
      passo = PASSI_LEGGIBILI[i];
      if (passo >= grezzo) { break; }
    }
    /* La prima fascia comincia su un multiplo del passo, non sul minimo:
       cosi' le etichette sono 40-45, 45-50, e non 41,3-46,3.
       Le fasce sono chiuse a sinistra e aperte a destra — un valore esatto
       su un confine sta nella fascia che comincia li' — e ce ne vuole una
       in piu' per contenere il massimo. */
    var base = Math.floor(min / passo) * passo;
    var quante = Math.floor((max - base) / passo) + 1;

    var fasce = [];
    for (var f = 0; f < quante; f++) {
      fasce.push({ da: base + f * passo, a: base + (f + 1) * passo, n: 0, quota: 0 });
    }
    for (var v = 0; v < valori.length; v++) {
      var idx = Math.floor((valori[v] - base) / passo);
      if (idx < 0) { idx = 0; }
      if (idx >= fasce.length) { idx = fasce.length - 1; }
      fasce[idx].n++;
    }
    for (var k = 0; k < fasce.length; k++) { fasce[k].quota = fasce[k].n / valori.length; }

    return { passo: passo, fasce: fasce, n: valori.length,
             minimo: min, massimo: max, degenere: false };
  }

  /* CONVERGENZA — come si stringe l'intervallo mentre le ripetizioni salgono.
     E' la regola del capitolo 47, messa in un grafico:

       «si guarda l'ampiezza dell'intervallo, non il numero di iterazioni.
        Se l'intervallo e' stretto abbastanza per la domanda che si sta
        facendo, le ripetizioni bastano. Se e' largo, non bastano, e non
        importa quante siano.»

     Per ogni n crescente si ricalcola media e semiampiezza al 95 % sui primi
     n valori del campione. Nessuna nuova simulazione: sono le stesse run,
     lette a fette. Percio' il grafico non e' una stima di quello che
     succederebbe con piu' ripetizioni — e' quello che e' successo davvero,
     man mano. */
  function convergenza(valori, opzioni) {
    opzioni = opzioni || {};
    var soglia = opzioni.soglia === undefined ? null : opzioni.soglia;
    var punti = opzioni.punti || 40;
    if (!valori || valori.length < 2) { return null; }

    var tot = valori.length;
    var primoN = Math.min(10, tot);
    var tappe = [], j;
    for (j = 0; j < punti; j++) {
      var n = Math.round(primoN + (tot - primoN) * (j / (punti - 1)));
      if (n >= 2 && (!tappe.length || n > tappe[tappe.length - 1])) { tappe.push(n); }
    }

    /* LA VARIANZA NON SI CALCOLA COME «MEDIA DEI QUADRATI MENO QUADRATO DELLA
       MEDIA», NEMMENO SE E' LA FORMULA CHE TUTTI RICORDANO.
       Quei due numeri, quando i valori stanno lontano da zero, sono grandi e
       quasi uguali: sottraendoli si perdono quasi tutte le cifre buone, e
       quello che resta è rumore dell'aritmetica. Con carichi intorno a 90 e
       una dispersione di mezzo punto, la varianza poteva uscire negativa — e
       infatti c'era un Math.max(0, ...) a nasconderlo, che è il sintomo, non
       la cura. Qui si usa la ricorrenza di Welford: aggiorna media e somma
       degli scarti un valore alla volta, non sottrae mai due numeri grandi, e
       dà lo stesso risultato della definizione fino all'ultima cifra utile. */
    var conteggio = 0, media = 0, scarti = 0, i = 0, serie = [], bastaA = null;
    for (var t = 0; t < tappe.length; t++) {
      var fino = tappe[t];
      for (; i < fino; i++) {
        conteggio++;
        var delta = valori[i] - media;
        media += delta / conteggio;
        scarti += delta * (valori[i] - media);
      }
      var varianza = scarti / fino;
      // La deviazione descrittiva usa n; l’errore standard equivale alla varianza campionaria.
      var semi = 1.96 * Math.sqrt(varianza) / Math.sqrt(fino - 1);
      serie.push({
        n: fino,
        media: Math.round(media * 100) / 100,
        semiampiezza: Math.round(semi * 100) / 100,
        basso: Math.round((media - semi) * 100) / 100,
        alto: Math.round((media + semi) * 100) / 100
      });
      if (soglia !== null && bastaA === null && semi <= soglia) { bastaA = fino; }
    }

    var ultima = serie[serie.length - 1];

    return {
      serie: serie,
      soglia: soglia,
      basta_a: bastaA,
      semiampiezza_finale: ultima.semiampiezza,
      /* la frase che il libro vuole che si legga al posto del numero di giri */
      verdetto: soglia === null
        ? 'Non è stata dichiarata nessuna soglia. Quindi non c’è un traguardo da ' +
          'raggiungere. Si può solo dire quanto è largo l’intervallo: è ±' +
          conLaVirgola(ultima.semiampiezza) + '.'
        : (bastaA !== null
            ? 'L’intervallo è sceso sotto ±' + conLaVirgola(soglia) + ' dopo ' +
              (bastaA === 1 ? 'una ripetizione' : conLeMigliaia(bastaA) + ' ripetizioni') +
              '. È il primo passaggio osservato sotto la soglia. Altre ripetizioni possono ' +
              'ancora cambiare la media e la fascia. E c’è una cosa da sapere: se ci si ferma ' +
              'nel momento esatto in cui la fascia scende sotto la soglia, quel «95 per cento» ' +
              'vale un po’ meno di quanto promette, perché si è scelto il momento buono per fermarsi.'
            : 'Dopo ' + (tot === 1 ? 'una ripetizione' : conLeMigliaia(tot) + ' ripetizioni') +
              ' l’intervallo è ancora ±' + conLaVirgola(ultima.semiampiezza) +
              '. È più largo della soglia ±' + conLaVirgola(soglia) +
              ' che ci si era dati. Quindi le ripetizioni non bastano, e non importa quante siano.')
    };
  }

  /* ---------------------------------------------------------------------
     LA REGRESSIONE DESCRITTIVA — che cosa si muove insieme
     ---------------------------------------------------------------------
     Il libro la chiede, e la chiede insieme alla sua avvertenza:

       «C'è poi un'insidia specifica delle analisi ripetute: la regressione
        descrittiva. Quando si hanno diecimila giocate, è facile e tentante
        cercare quali variabili si muovono insieme. Il simulatore lo fa. Ma
        accompagna il risultato con un'avvertenza che non è di stile: non
        prova causalità da sola, suggerisce piste da verificare. Con
        diecimila punti quasi tutto correla con quasi tutto. Una relazione
        debole, vista su un grafico, sembra fortissima. C'è un indice che
        dice quanta parte della variazione è davvero spiegata. Serve proprio
        a non sopravvalutare correlazioni che sembrano forti solo a occhio.»

     Le due cose nascono qui insieme e non si separano mai: `correlazione`
     restituisce il numero E l'avvertenza, dentro lo stesso oggetto. Chi la
     usa non puo' prendere il primo e dimenticare la seconda, perche' la
     seconda arriva da sola.

     IL CONTO E' QUELLO STANDARD, E SI RIFA' A MANO.
     Il coefficiente di Pearson e' la somma degli scarti moltiplicati fra
     loro, divisa per la radice del prodotto delle due somme di scarti al
     quadrato. Vale da −1 a +1. A +1 i punti stanno su una retta che sale, a
     −1 su una retta che scende, a 0 non c'e' nessuna retta.

     GLI SCARTI SI CALCOLANO DALLA MEDIA, NON CON LA FORMULA DEI QUADRATI.
     Vale la stessa ragione scritta in `convergenza`: «media dei prodotti meno
     prodotto delle medie» sottrae due numeri grandi e quasi uguali, e con
     carichi intorno a novanta quello che resta e' rumore dell'aritmetica.
     Due passaggi sui dati costano il doppio e non sbagliano mai. */

  var AVVERTENZA = {
    titolo: 'Che cosa questo numero non dice',
    punti: [
      'Non prova una causa. Dice che due grandezze si muovono insieme, e ' +
        'basta. Il perché resta tutto da cercare. Serve a scegliere quale ' +
        'pista andare a verificare, non a chiudere la domanda.',
      'Con diecimila punti quasi tutto correla con quasi tutto. Più ripetizioni ' +
        'ci sono, più è facile che un legame spunti fuori. E un legame ' +
        'piccolo, su tanti punti, esce comunque come un numero diverso da zero.',
      'Una relazione debole, vista su un grafico, sembra fortissima. ' +
        'L’occhio cerca la riga e la trova, anche dentro una nuvola di punti ' +
        'sparsi. Per questo il numero va letto, non guardato.',
      'R² dice quanta parte della variazione è davvero spiegata. È il ' +
        'quadrato del coefficiente. Serve a non sopravvalutare le ' +
        'correlazioni. Cioè quelle che sembrano forti solo a occhio.'
    ]
  };

  /* Il coefficiente di Pearson fra due grandezze delle stesse giocate.
     Ogni punto è una giocata: il primo numero e il secondo vengono dalla
     stessa partita, altrimenti il conto non vuol dire niente. */
  function correlazione(x, y) {
    if (!x || !y) { return null; }
    if (x.length !== y.length) {
      throw new Error('La correlazione confronta due grandezze della STESSA ripetizione, ' +
        'quindi le due file devono essere lunghe uguali: qui sono ' + x.length +
        ' e ' + y.length + '.');
    }
    var n = x.length;
    /* SOTTO TRE PUNTI IL NUMERO ESISTE E NON DICE NIENTE.
       Con due punti soli passa sempre una retta esatta, e il coefficiente
       esce ±1 qualunque siano i numeri. Un ±1 a schermo si legge «legame
       perfetto»: sarebbe la bugia più grossa che questa sezione possa dire,
       e proprio nella sezione che esiste per non sopravvalutare i legami. */
    if (n < 3) { return null; }

    var mx = 0, my = 0, i;
    for (i = 0; i < n; i++) { mx += x[i]; my += y[i]; }
    mx /= n; my /= n;

    var sxy = 0, sxx = 0, syy = 0, dx, dy;
    for (i = 0; i < n; i++) {
      dx = x[i] - mx; dy = y[i] - my;
      sxy += dx * dy; sxx += dx * dx; syy += dy * dy;
    }

    /* UNA GRANDEZZA CHE NON SI MUOVE NON PUÒ MUOVERSI INSIEME A NESSUNO.
       Succede davvero, ed è la saturazione del capitolo 29: quando il carico
       tocca il tetto, tutte le giocate finiscono a cento. Lì il conto
       dividerebbe per zero. Non è un caso limite da nascondere con uno zero:
       è una cosa da dire. */
    if (sxx === 0 || syy === 0) {
      return {
        n: n, r: null, r2: null, verso: 'nessuno',
        variazione_spiegata: null,
        spiegazione: 'Qui il conto non si può fare, e il motivo è chiaro. ' +
          (sxx === 0 && syy === 0
            ? 'Tutte e due restano ferme sullo stesso valore in ogni ripetizione. '
            : 'Una delle due resta ferma sullo stesso valore in ogni ripetizione. ') +
          'Una cosa che non si muove non può muoversi insieme a un’altra.',
        avvertenza: AVVERTENZA
      };
    }

    var r = sxy / Math.sqrt(sxx * syy);
    /* l'aritmetica può sbordare di un miliardesimo oltre i due estremi:
       un coefficiente di 1,0000000002 non esiste, e a schermo spaventa */
    if (r > 1) { r = 1; }
    if (r < -1) { r = -1; }
    var r2 = r * r;
    var perCento = Math.round(r2 * 1000) / 10;

    return {
      n: n,
      metodo_statistico: 'pearson_r_e_r2_2026-09-15',
      r: Math.round(r * 10000) / 10000,
      r2: Math.round(r2 * 10000) / 10000,
      /* LA RETTA CHE IL GRAFICO DISEGNA, E NIENTE DI PIÙ.
         È la retta dei minimi quadrati: quella che passa il più vicino
         possibile a tutti i punti. Si chiama regressione, ed è la parola che
         dà il nome a questa sezione. Serve a far vedere il verso, non a
         prevedere niente: una retta tirata dentro una nuvola sparsa resta
         una retta bellissima e una previsione pessima. È esattamente il
         difetto d'occhio che l'avvertenza qui accanto racconta. */
      pendenza: Math.round((sxy / sxx) * 10000) / 10000,
      intercetta: Math.round((my - (sxy / sxx) * mx) * 10000) / 10000,
      verso: Math.abs(r) < 0.0001 ? 'nessuno' : (r > 0 ? 'insieme' : 'al contrario'),
      variazione_spiegata: perCento,
      spiegazione: (Math.abs(r) < 0.0001
        ? 'Le due non si muovono insieme in nessun modo. '
        : (r > 0
          ? 'Le due salgono e scendono insieme. Dove una è alta, quasi sempre ' +
            'è alta anche l’altra. '
          : 'Le due vanno al contrario. Dove una è alta, quasi sempre ' +
            'l’altra è bassa. ')) +
        'Il coefficiente vale ' + conLaVirgola(Math.round(r * 100) / 100) +
        '. Il suo quadrato, R², vale ' + conLaVirgola(Math.round(r2 * 100) / 100) +
        '. Vuol dire che una delle due spiega il ' + conLaVirgola(perCento) +
        ' per cento di come varia l’altra. Il resto, ' +
        conLaVirgola(Math.round((100 - perCento) * 10) / 10) + ' per cento, viene da altro.',
      avvertenza: AVVERTENZA
    };
  }

  /* Una coppia pronta da mostrare: i due nomi, e la misura che li lega.
     I nomi arrivano da chi chiama, perché sono i nomi che si leggono a
     schermo, e i nomi delle chiavi del motore non lo sono. */
  function coppiaCorrelata(nomePrima, prima, nomeSeconda, seconda) {
    return {
      prima: nomePrima,
      seconda: nomeSeconda,
      misura: correlazione(prima, seconda)
    };
  }

  /* Quante ripetizioni servono per una data precisione sulla media di STR.
     E' la formula del capitolo 47 girata al contrario: n ≥ (1,96·s/ε)².
     Il risultato si arrotonda in su a multipli di cinquanta, perche' un
     consiglio come «servono 3.847 giocate» finge una precisione che il conto
     non ha: s stessa e' stimata.

     IL MINIMO DICEVA TRENTA E NON POTEVA MAI ESSERE TRENTA.
     C'era scritto Math.max(30, …), ma l'arrotondamento a multipli di cinquanta
     non restituisce mai un numero fra uno e quarantanove: quel trenta poteva
     uscire soltanto con una deviazione esattamente zero. Un minimo che non
     si applica mai e' un minimo scritto per sbaglio, e chi legge il codice ci
     casca. Adesso il minimo dice cinquanta, che e' quello che la funzione fa
     davvero — e resta comunque sotto le cento giocate che il libro indica come
     soglia per «farsi un'idea»: questo numero risponde a una precisione
     chiesta, non sostituisce quel consiglio. */
  function ripetizioniConsigliate(deviazioneAttesa, precisioneVoluta) {
    var n = Math.pow(1.96 * deviazioneAttesa / precisioneVoluta, 2);
    return Math.max(50, Math.ceil(n / 50) * 50);
  }

  var API = {
    firmaNodo: firmaNodo,
    SCALE: SCALE,
    scalaPer: scalaPer,
    verificaGranularita: verificaGranularita,
    montecarlo: montecarlo,
    montecarloAPezzi: montecarloAPezzi,
    statistiche: statistiche,
    confrontoAppaiato: confrontoAppaiato,
    istogramma: istogramma,
    convergenza: convergenza,
    correlazione: correlazione,
    coppiaCorrelata: coppiaCorrelata,
    AVVERTENZA_CORRELAZIONI: AVVERTENZA,
    ripetizioniConsigliate: ripetizioniConsigliate
  };

  globale.Analisi = API;
  if (typeof module !== 'undefined' && module.exports) { module.exports = API; }

})(typeof window !== 'undefined' ? window : globalThis);
