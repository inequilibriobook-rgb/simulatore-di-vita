/* =============================================================================
   SIMULATORE 3.0 — Livello micro-semantico  (calibrazione 3.2)
   =============================================================================
   ⚠️  QUESTO LIVELLO È ESTERNO AL CORE.
   La formula canonica, i pesi, i clamp, il dado e i nove esiti non vengono
   toccati. Qui si regola soltanto QUANTO di ciò che un micronodo produce
   passa allo stato persistente.

   La relazione ufficiale sulla misura dei 500 nodi lo dice per esteso, e la
   citazione si lascia con le parole che aveva:
   «Core e runner non sono stati modificati. Il Micro-Semantic Layer e la
    calibrazione 3.2 sono ancora prototipi esterni.»

   IL PROBLEMA CHE RISOLVE
   Cinquecento micronodi che descrivono otto minuti di risveglio non sono
   cinquecento eventi da sommare. Sono cinquecento punti di osservazione dello
   stesso passaggio. Se ciascuno trasferisse il proprio delta per intero, in
   dieci minuti simulati una persona arriverebbe al punto di rottura.

   IL NUMERO
   Nella misura ufficiale il fattore di trasferimento osservato è ≈ 0,0462:
   ogni micronodo passa allo stato persistente il 4,6 % del proprio effetto.
   Da qui il comportamento osservato — STR che si muove di un punto ogni
   quindici o trenta nodi invece che a ogni nodo.

   COME
   Non si arrotonda a zero il 4,6 % di ogni delta: si accumula. Un
   accumulatore in virgola mobile raccoglie le frazioni e cede allo stato
   la parte intera quando questa matura. È così che il carico continua a
   salire davvero, ma alla velocità giusta.
   ========================================================================== */

(function (globale) {
  'use strict';

  var N = globale.Nucleo;
  var S = globale.Stato;
  var CAL = globale.Calibrazione;

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
    throw new Error('microsemantica.js non può partire: ' +
      (mancanti.length === 1
        ? 'gli manca il modulo ' + mancanti[0] + ', e gli serve per far passare allo stato solo una parte di quello che ogni micronodo produce.'
        : 'gli mancano i moduli ' + mancanti.join(' e ') + ', e gli servono per far passare allo stato solo una parte di quello che ogni micronodo produce.') +
      ' Ordine di caricamento: nucleo.js, calibrazione.js, casuale-mt.js, stato.js, ' +
      'microsemantica.js, tempo.js, settimana-tipo.js, e i dati prima di chi li usa.');
  }([['Nucleo (nucleo.js)', N], ['Stato (stato.js)', S], ['Calibrazione (app/dati/calibrazione.js)', CAL]]
    .filter(function (c) { return !c[1]; })
    .map(function (c) { return c[0]; })));


  /* --- Parametri della calibrazione 3.2 ------------------------------
     Misurati sulla prova ufficiale dei 500 nodi. Sono parametri dichiarati
     e modificabili, non regole del libro: il libro non li contiene.
     Il fattore di trasferimento vive in app/dati/calibrazione.js, che e'
     il file di calibrazione dichiarato dall'Apparato F voce 7: qui si
     legge, non si ricopia. */
  var CALIBRAZIONE = {
    versione: CAL.versione,
    fattore_trasferimento: CAL.valore('trasferimento_micronodo'),
    budget_microvariazione: 7,       // massimo osservato per cluster
    budget_medio: 3.37,              // medio osservato
    delta_massimo_variabile: 2,      // soglia dichiarata, oggi NON applicata sotto 3.2 — vedi nota in eseguiCatenaMicro
    nodi_per_microetichetta: 4       // nella prova: ogni etichetta copre 4 nodi
  };

  /* La calibrazione storica: tutto passa per intero. Serve per riprodurre
     i risultati precedenti e per il confronto. */
  var STORICA = {
    versione: 'storica',
    fattore_trasferimento: 1.0,
    budget_microvariazione: Infinity,
    budget_medio: null,
    delta_massimo_variabile: Infinity,
    nodi_per_microetichetta: 1
  };

  /* ---------------------------------------------------------------------
     LE TRE ZONE
     Dalla relazione: sotto la misura giusta un nodo non cambia niente e
     cambia solo il dado, e allora due nodi si fondono in uno; nella misura
     giusta ogni nodo cambia la funzione del passaggio che descrive; sopra
     la misura giusta si distingue troppo, e le microvariazioni vanno
     tenute dentro un tetto.
     --------------------------------------------------------------------- */

  /* A che cosa serve un micronodo dentro il passaggio che descrive. Sono i
     sette mestieri che un gesto minimo puo' fare: si chiamavano FUNZIONI_FRAME,
     e «frame» qui non vuol dire niente che non si possa dire in italiano —
     e' il passaggio, cioe' il pezzo di scena che quel gesto apre o chiude. */
  var FUNZIONI_DEL_PASSAGGIO = [
    'apertura fisica', 'messa a fuoco', 'orientamento', 'ascolto corporeo',
    'controllo', 'micro-decisione', 'chiusura del gesto'
  ];

  /* Quanta variazione c'è fra due nodi consecutivi, escluso il dado. */
  function variazione(a, b) {
    var na = N.normalizzaNodo(a), nb = N.normalizzaNodo(b);
    var ma = na.modificatori, mb = nb.modificatori;
    return Math.abs(na.p0 - nb.p0)
      + Math.abs(ma.energia_e - mb.energia_e)
      + Math.abs(ma.informazione_i - mb.informazione_i)
      + Math.abs(ma.tempo_t - mb.tempo_t)
      + Math.abs(ma.materiale_m - mb.materiale_m)
      + Math.abs(ma.bonus_bp - mb.bonus_bp)
      + Math.abs(ma.complessita_c - mb.complessita_c);
  }

  /* Classifica una catena: dove sta, rispetto alle tre zone.

     LE PAROLE DI QUESTE TRE RISPOSTE FINISCONO A SCHERMO, E FINO AL
     10/09/2026 NON ERANO PAROLE.
     La pagina della catena mostra quello che sta PRIMA dei due punti, e
     quello che stava prima dei due punti era «sotto» e «sopra». Sotto che
     cosa? Sopra che cosa? Chi guardava leggeva un avverbio solo, senza
     niente a cui riferirlo. E dietro i due punti c'era «iper-differenziazione»,
     che è una parola da convegno.
     Adesso la prima metà è una frase che si regge da sola — «troppo fitta»,
     «troppo minuta», «giusta» — e la seconda spiega perché. */
  function diagnosiZone(nodi, cal) {
    cal = cal || CALIBRAZIONE;
    if (nodi.length < 2) {
      return { zona: 'un gesto solo: non c’è ancora una catena da giudicare',
               vuoti: 0, iper: 0, variazione_media: 0, budget_superato: 0 };
    }
    var vuoti = 0, iper = 0, somma = 0, superati = 0;
    for (var i = 1; i < nodi.length; i++) {
      var v = variazione(nodi[i - 1], nodi[i]);
      somma += v;
      if (v === 0) { vuoti++; }
      if (v > cal.budget_microvariazione) { iper++; superati++; }
    }
    var media = somma / (nodi.length - 1);
    var zona = vuoti > (nodi.length - 1) * 0.3
                 ? 'troppo fitta: molti gesti non cambiano niente rispetto a quello ' +
                   'prima. Meglio fonderli'
             : iper > (nodi.length - 1) * 0.3
                 ? 'troppo minuta: da un gesto all’altro cambia troppo, tutto insieme. ' +
                   'Ogni passo pesa più del dovuto'
             : 'giusta: da un gesto all’altro cambia qualcosa, ma non tutto';
    return {
      zona: zona,
      vuoti: vuoti,
      iper: iper,
      variazione_media: Math.round(media * 100) / 100,
      budget_superato: superati,
      budget: cal.budget_microvariazione
    };
  }

  /* ---------------------------------------------------------------------
     ESECUZIONE DI UNA CATENA CON TRASFERIMENTO SMORZATO
     --------------------------------------------------------------------- */

  function eseguiCatenaMicro(nodi, opzioni) {
    opzioni = opzioni || {};
    var cal = opzioni.calibrazione || CALIBRAZIONE;
    var f = cal.fattore_trasferimento;

    if (!nodi || !nodi.length) { return null; }

    var statoIniziale = N.normalizzaNodo(nodi[0]).stato_prima;
    var stato = statoIniziale;

    /* accumulatori in virgola mobile: raccolgono le frazioni non ancora cedute */
    var acc = { stress_str: 0, posizione_pos: 0, debito_deb: 0, costo_nascosto: 0 };

    var risultati = [];
    for (var i = 0; i < nodi.length; i++) {
      var conStato = S.applicaStatoAlNodo(nodi[i], stato);
      var r = S.eseguiNodoCompleto(conStato, {
        rng: opzioni.rng,
        tiro: (opzioni.tiri && i < opzioni.tiri.length) ? opzioni.tiri[i] : undefined
      });

      /* il delta pieno che il core ha prodotto */
      var pieno = {
        stress_str:     r.stato_dopo.stress_str    - r.stato_prima.stress_str,
        posizione_pos:  r.stato_dopo.posizione_pos - r.stato_prima.posizione_pos,
        debito_deb:     r.stato_dopo.debito_deb    - r.stato_prima.debito_deb,
        costo_nascosto: r.stato_dopo.costo_nascosto - r.stato_prima.costo_nascosto
      };

      /* ne passa la frazione dichiarata, accumulata fino a maturare un intero */
      var nuovo = Object.assign({}, stato);
      var ceduto = {};
      for (var k in acc) {
        /* AUDIT 19/8: con f<1 (calibrazione 3.2) questa riga dava sempre
           lim=Infinity, quindi cal.delta_massimo_variabile (=2) non è mai
           stato applicato in nessuna delle misure già pubblicate — inclusa
           la taratura di fattore_trasferimento stesso, la frontiera del
           punto di non ritorno e i budget di parole dei registri.
           Prova fatta in questo audit: applicare il tetto sempre (rimuovendo
           la condizione su f) fa fallire 13 controlli già verdi in
           _test/settimana.js e _test/traiettoria.js (soglie del pavimento,
           rilevamento spirale, budget dei registri) — la cornice era
           calibrata SENZA quel tetto attivo. Attivarlo ora richiederebbe
           rifare da capo tutte quelle misure, e non è una correzione da un
           giorno di lavoro.
           Si lascia quindi il comportamento invariato (mai applicato sotto
           3.2) e si corregge solo la promessa nel commento sopra, che era
           falsa. */
        var lim = (f >= 1) ? cal.delta_massimo_variabile : Infinity;
        var d = Math.max(-lim, Math.min(lim, pieno[k]));
        acc[k] += d * f;
        var intero = (acc[k] >= 0) ? Math.floor(acc[k]) : Math.ceil(acc[k]);
        acc[k] -= intero;
        ceduto[k] = intero;
        nuovo[k] = nuovo[k] + intero;
      }
      /* le grandezze non accumulabili seguono l'ultimo nodo */
      nuovo.bonus_bp = r.stato_dopo.bonus_bp;
      nuovo.rip = r.stato_dopo.rip;
      nuovo.or1 = r.stato_dopo.or1;
      nuovo.ri4 = r.stato_dopo.ri4;
      nuovo.macro = r.stato_dopo.macro;

      stato = N.normalizzaNodo({ stato_prima: nuovo }).stato_prima;
      var pc = S.pavimentoECooldown(stato, r.esito);
      stato.floor1_attivo = pc.pavimento;
      stato.floor1_motivo = pc.motivo;
      stato.cooldown = pc.cooldown;

      r.delta_pieno = pieno;
      r.delta_ceduto = ceduto;
      r.stato_persistente = stato;
      risultati.push(r);
    }

    var esiti = risultati.map(function (x) { return x.esito; });
    var esito = S.esitoAggregato(esiti, stato);
    var conteggi = {};
    esiti.forEach(function (e) { conteggi[e] = (conteggi[e] || 0) + 1; });

    return {
      calibrazione: cal.versione,
      fattore_trasferimento: f,
      diagnosi: diagnosiZone(nodi, cal),
      nodi: risultati,
      stato_iniziale: statoIniziale,
      stato_finale: stato,
      esito: esito,
      rischio: S.livelloRischio(stato, esito),
      conteggi: conteggi,
      delta: {
        STR: stato.stress_str - statoIniziale.stress_str,
        POS: stato.posizione_pos - statoIniziale.posizione_pos,
        DEB: stato.debito_deb - statoIniziale.debito_deb,
        costo_nascosto: stato.costo_nascosto - statoIniziale.costo_nascosto
      },
      saturazione: analizzaSaturazione(risultati)
    };
  }

  /* ---------------------------------------------------------------------
     DIAGNOSI DI SATURAZIONE
     Il modello smette di essere informativo quando una grandezza si incolla
     a un estremo. Va detto, non nascosto.
     --------------------------------------------------------------------- */
  function analizzaSaturazione(risultati) {
    if (!risultati.length) { return null; }
    var str = risultati.map(function (r) { return r.stato_persistente.stress_str; });
    var pn = risultati.map(function (r) { return r.pn; });
    var costo = risultati.map(function (r) { return r.stato_persistente.costo_nascosto; });

    function codaFerma(v) {
      var n = 1;
      for (var i = v.length - 1; i > 0 && v[i] === v[i - 1]; i--) { n++; }
      return n;
    }
    var pnAlTetto = pn.filter(function (x) { return x >= 95; }).length;
    var pnAlPavimento = pn.filter(function (x) { return x <= 5; }).length;
    var strFermo = codaFerma(str);
    var costoOltre = costo.filter(function (x) { return x >= 50; }).length;

    /* «IN 1 NODI SU 3», E COME NASCEVA.
       Queste quattro frasi attaccavano un numero a un plurale senza guardare
       quanto valeva il numero, e con una scena corta il numero è uno: «in 1
       nodi su 3», «in 1 nodi». Le regole dell'italiano stanno in
       app/motore/lingua.js, ma questo file gira anche nei banchi di prova
       che lingua.js non caricano — quindi l'accordo si scrive qui, e ogni
       frase porta il proprio singolare accanto al proprio plurale. */
    function gesti(n) { return n === 1 ? 'un gesto' : n + ' gesti'; }
    /* «in 3 gesti su 3 gesti» era una parola di troppo: dopo «su» il numero
       basta, perche' il nome l'ha gia' detto la prima metà della frase. */
    function suQuanti(n) { return n === 1 ? 'uno' : String(n); }

    var avvisi = [];
    if (strFermo > Math.max(10, risultati.length * 0.2)) {
      avvisi.push('Il carico è fermo a ' + str[str.length - 1] + ' su 100 negli ultimi ' +
        gesti(strFermo) + ' della catena. Da lì in poi il modello non distingue più ' +
                          'niente: quello che succede non lo sposta.');
    }
    if (pnAlTetto > risultati.length * 0.25) {
      avvisi.push('La probabilità è al suo massimo, 95 su 100, in ' + gesti(pnAlTetto) + ' su ' +
        suQuanti(risultati.length) + '. La scena è troppo facile: il calcolo non ' +
                                     'aggiunge niente a quello che già si vede.');
    }
    if (pnAlPavimento > risultati.length * 0.25) {
      avvisi.push('La probabilità è al suo minimo, 5 su 100, in ' + gesti(pnAlPavimento) + ' su ' +
        suQuanti(risultati.length) + ': o la scena è costruita male, o va rivista la taratura (cioè i numeri di partenza scelti per ogni gesto).');
    }
    if (costoOltre > 0) {
      avvisi.push('Il costo nascosto ha superato la metà della sua scala, 50 su 100, in ' +
        gesti(costoOltre) + '. Da quel punto in poi anche i gesti che riescono si ' +
                            'leggono così: «riusciti, ma qualcosa si è rotto».');
    }
    return {
      informativo: avvisi.length === 0,
      str_fermo_da: strFermo,
      pn_al_tetto: pnAlTetto,
      pn_al_pavimento: pnAlPavimento,
      valori_pn_distinti: new Set(pn).size,
      nodi_oltre_soglia_costo: costoOltre,
      avvisi: avvisi
    };
  }

  var API = {
    CALIBRAZIONE: CALIBRAZIONE,
    STORICA: STORICA,
    FUNZIONI_DEL_PASSAGGIO: FUNZIONI_DEL_PASSAGGIO,
    variazione: variazione,
    diagnosiZone: diagnosiZone,
    eseguiCatenaMicro: eseguiCatenaMicro,
    analizzaSaturazione: analizzaSaturazione
  };

  globale.MicroSemantica = API;
  if (typeof module !== 'undefined' && module.exports) { module.exports = API; }

})(typeof window !== 'undefined' ? window : globalThis);
