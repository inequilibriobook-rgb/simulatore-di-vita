/* =============================================================================
   SIMULATORE 3.0 — I livelli temporali
   =============================================================================
   Traduzione fedele di simulatore_v31_core_finale.py:
     partial_recovery_between_days   [py:1513]
     run_chain                       [py:1590]
     run_miniweek                    [py:1623]
     run_trajectory                  [py:1658]
     choose_macro_by_state           [py:1697]
     apply_sleep_recovery            [py:3683]

   Ogni costante e' COPIATA dal Python, non reinterpretata:
     scene_recovery_factor  0.20     (gia' in stato.js)
     day_recovery_factor    0.35
     freno floor1/cooldown  x0.45    fra i giorni
     freno floor1/cooldown  x0.55    nel sonno

   IL PRINCIPIO CHE REGGE TUTTO                    [guida 3.2 v6, § 8]
   «Non bisogna correggere la formula del nodo per risolvere problemi che
    appartengono al livello lungo. La formula calcola il nodo. Il tempo
    calcola accumulo, recupero, costo residuo e rischio di spirale.»

   I SEI LIVELLI                                   [guida 3.2 v6, § 8.1-8.6]
   nodo · scena · catena_breve · mini_settimana · traiettoria_lunga ·
   spirale_lunga. Ognuno ha un'ampiezza tipica, una misura, qualcosa che
   trasferisce al livello successivo, e un rischio di lettura che gli e'
   proprio. Sono dichiarati qui sotto perche' chi legge il risultato li possa
   citare per nome.
   ========================================================================== */

(function (globale) {
  'use strict';

  var N = globale.Nucleo;
  var S = globale.Stato;
  var MS = globale.MicroSemantica;
  var CAL = globale.Calibrazione;      // app/dati/calibrazione.js — Apparato F voce 7

  /* CHI MANCA SI DEVE SENTIRE, SUBITO.
     Questi quattro moduli vengono presi UNA VOLTA SOLA, quando il file viene
     caricato. Se uno non c'e' ancora, la variabile resta undefined per sempre
     — anche se il modulo arriva un istante dopo.

     Il 03/09/2026 ho caricato tempo.js prima di microsemantica.js in un banco
     di prova. Nessun errore, nessun avviso: la calibrazione della giornata e'
     diventata un oggetto vuoto (c'era una guardia «MS && MS.CALIBRAZIONE» che
     lo permetteva), il recupero notturno e' sparito, e una traiettoria di
     dodici settimane che finisce a carico 43 e' finita a 100. Sbagliata del
     doppio, e nessuno se ne sarebbe accorto.

     Le pagine HTML caricano nell'ordine giusto, quindi il prodotto consegnato
     e' corretto. Ma chi scrive un banco di prova suo — ed e' quello che si fa
     per le misure lunghe — deve trovare un errore, non un numero sbagliato.

     Ordine giusto: nucleo · calibrazione · stato · microsemantica · tempo */
  (function (mancanti) {
    if (!mancanti.length) { return; }
    throw new Error('tempo.js non può partire: ' +
      (mancanti.length === 1
        ? 'gli manca il modulo ' + mancanti[0] + ', e gli serve per far accumulare il carico e per farlo recuperare.'
        : 'gli mancano i moduli ' + mancanti.join(' e ') + ', e gli servono per far accumulare il carico e per farlo recuperare.') +
      ' Ordine di caricamento richiesto: nucleo.js, calibrazione.js, ' +
      'stato.js, microsemantica.js, e solo dopo tempo.js.');
  }([['Nucleo (nucleo.js)', N], ['Stato (stato.js)', S],
     ['MicroSemantica (microsemantica.js)', MS], ['Calibrazione (app/dati/calibrazione.js)', CAL]]
    .filter(function (c) { return !c[1]; })
    .map(function (c) { return c[0]; })));

  /* --------------------------------------------------------------------
     LA CALIBRAZIONE VALE A TUTTI I LIVELLI

     Il primo collaudo di questo file ha rifatto l'errore che la decisione
     D2 aveva gia' segnalato altrove: la giornata girava con la propagazione
     STORICA, quella al 100 %, mentre il resto dell'applicazione gira al
     4,6 %. Risultato misurato: cinque giorni ordinari portavano il carico
     da 38 a 100, con esito quasi-collasso e spirale stabilizzata — la
     stessa saturazione risolta in agosto, ricomparsa un piano piu' su.

     Un livello temporale non puo' usare un modello diverso da quello del
     nodo che lo compone: i due risultati non si commenterebbero a vicenda.
     Qui la calibrazione si passa a ogni scena, e per difetto e' la 3.2.
     -------------------------------------------------------------------- */
  function eseguiScenaCalibrata(nodi, opzioni) {
    var cal = opzioni.calibrazione;
    if (cal === null) { return S.eseguiScena(nodi, { rng: opzioni.rng }); }
    if (!MS) { return S.eseguiScena(nodi, { rng: opzioni.rng }); }
    return MS.eseguiCatenaMicro(nodi, {
      rng: opzioni.rng,
      calibrazione: cal || MS.CALIBRAZIONE
    });
  }

  /* --------------------------------------------------------------------
     I SEI LIVELLI, come li descrive la guida
     -------------------------------------------------------------------- */
  var LIVELLI = [
    { id: 'nodo', nome: 'Nodo', ampiezza: 'Una singola unità d’azione',
      misura: 'la probabilità operativa locale',
      trasferisce: 'esito, costo minimo, microvariazione di carico e assetto',
      rischio: 'confondere un errore tecnico con un fallimento sistemico' },
    { id: 'scena', nome: 'Scena', ampiezza: '3-7 nodi circa',
      misura: 'una piccola situazione completa',
      trasferisce: 'carico, assetto, protezione, rientro, costo residuo locale',
      rischio: 'vedere solo riuscita o fallimento' },
    { id: 'catena_breve', nome: 'Giornata', ampiezza: 'Più scene nello stesso arco',
      misura: 'una sequenza quotidiana collegata',
      trasferisce: 'carico, assetto, debito e protezione fra una scena e l’altra',
      rischio: 'trasformarla in una spirale lunga troppo presto' },
    { id: 'mini_settimana', nome: 'Mini-settimana', ampiezza: 'Più giorni o episodi ripetuti',
      misura: 'l’accumulo breve-medio',
      trasferisce: 'recupero parziale, costo residuo, ri4 iniziale',
      rischio: 'credere che il recupero sia pieno, oppure che non ci sia affatto' },
    { id: 'traiettoria_lunga', nome: 'Traiettoria', ampiezza: 'Giorni o settimane',
      misura: 'il regime di carico e recupero',
      trasferisce: 'regime, capacità di rientrare, raffreddamento, pavimento, orientamento',
      rischio: 'non accorgersi di una spirale che comincia a formarsi' },
    { id: 'spirale_lunga', nome: 'Spirale', ampiezza: 'Un regime persistente',
      misura: 'un equilibrio rotto da tempo, che non si rimette a posto da solo',
      trasferisce: 'fallimento del recupero, il fare troppo al posto degli altri, assetto basso',
      rischio: 'scambiare il funzionamento esterno per salute' }
  ];

  function livello(id) {
    for (var i = 0; i < LIVELLI.length; i++) {
      if (LIVELLI[i].id === id) { return LIVELLI[i]; }
    }
    return null;
  }

  /* i sei regimi MACRO, come li nomina la guida */
  var REGIMI = {
    macro_0_episodio_isolato: 'episodio isolato',
    macro_1_catena_breve: 'catena breve',
    macro_2_mini_settimana_leggera: 'mini-settimana leggera',
    macro_3_ripetizione_pesante_recuperabile: 'ripetizione pesante ma recuperabile',
    macro_4_spirale_in_formazione: 'spirale in formazione',
    macro_5_spirale_stabilizzata: 'spirale stabilizzata'
  };

  /* --------------------------------------------------------------------
     IL FATTORE CHE NON DIPENDE DA QUANTO FINEMENTE RACCONTI

     MISURA DEL 17/8. La stessa identica giornata — stesse condizioni,
     stesso arco, stesso stato di partenza — costa di piu' se la si descrive
     con piu' nodi. Con la propagazione piena:

         6 nodi  → carico 63        48 nodi → carico 100
        12 nodi  → carico 86        96 nodi → carico 100
        24 nodi  → carico 100

     E' lo stesso difetto che la decisione D2 vieta su un altro asse: la
     granularita' non deve cambiare il risultato, deve cambiare il dettaglio.
     Chi descrive meglio la propria giornata non sta avendo una giornata
     peggiore.

     LA CORREZIONE, RICAVATA E NON SCELTA
     Se ogni nodo cede una frazione f del proprio effetto, il totale ceduto
     vale circa n · f. Perche' non dipenda da n, deve essere n · f = k:

         f = k / n          (con f al massimo 1)

     Verificato: a k fisso, la stessa giornata da 6 a 96 nodi finisce sullo
     stesso carico (con k = 1: 43, 42, 42, 41, 42).

     CHE COSA E' k
     Il costo complessivo di una giornata, espresso in «nodi interi». k = 1
     vuol dire che l'intera giornata pesa quanto un solo nodo a piena forza.
     E' l'unico numero da tarare, ed e' visibile: non e' nascosto in una
     costante.

     ⭐ k E' TARATO: 2,75.  Non scelto — misurato.

     La taratura sta in `_taratura/`. Sette criteri, ognuno preso da una
     fonte del progetto e citato, e 400 settimane simulate per condizione,
     con durezza e sonno che oscillano a caso come nella vita:

       non satura              D4 — «storica 100 % sature → 3.2 0 % sature»
       quasi-collasso raro     guida § 6.11 — «riservare a convergenze rare»
       distingue               D9 — «meta' della scala non diceva piu' niente»
       monotono                una settimana piu' dura non lascia meno carico
       reversibile             guida § 8.4 — «recupero troppo pieno o nullo»
       granularita'            D2 — il dettaglio non cambia il risultato
       informativo             il carico si muove in almeno meta' dei giorni

     Tutti e sette sono soddisfatti insieme per k fra 2,5 e 3,0. Fuori da
     quella banda ne cade sempre almeno uno: sopra satura, sotto smette di
     distinguere una settimana leggera da una pesante. 2,75 e' il centro.

     A k = 2,75, su 400 settimane da dieci giorni: settimana leggera 44,8 di
     carico medio, settimana ordinaria 49,0, settimana pesante 78,2.
     -------------------------------------------------------------------- */
  var K_TARATO = CAL.valore('k_granularita');

  function fattorePerGranularita(numeroNodi, k) {
    /* zero nodi non si divide per zero, e un numero negativo di nodi non
       significa niente: in tutti e due i casi non c'è riduzione da fare,
       non un fattore negativo che gonfierebbe il carico invece di ridurlo. */
    if (typeof numeroNodi !== 'number' || !isFinite(numeroNodi) || numeroNodi <= 0) { return 1; }
    k = (k === undefined) ? K_TARATO : k;
    return Math.min(1, k / numeroNodi);
  }

  function calibrazionePerGiornata(numeroNodi, k) {
    k = (k === undefined) ? K_TARATO : k;
    var base = (MS && MS.CALIBRAZIONE) ? MS.CALIBRAZIONE : {};
    /* un numero di nodi non valido (stringa, NaN, negativo...) non deve
       finire grezzo dentro il risultato: si sanifica una volta sola qui,
       cosi' fattorePerGranularita, il campo «nodi» e la «nota» vedono
       tutti lo stesso valore pulito, mai un NaN o un "undefined" scritto
       in chiaro. */
    var nNodi = (typeof numeroNodi === 'number' && isFinite(numeroNodi) && numeroNodi > 0) ? numeroNodi : 0;
    var f = fattorePerGranularita(nNodi, k);
    return {
      versione: 'granularita-k' + k,
      fattore_trasferimento: f,
      budget_microvariazione: base.budget_microvariazione !== undefined ? base.budget_microvariazione : 7,
      budget_medio: base.budget_medio !== undefined ? base.budget_medio : 3.37,
      delta_massimo_variabile: base.delta_massimo_variabile !== undefined ? base.delta_massimo_variabile : 2,
      nodi_per_microetichetta: base.nodi_per_microetichetta !== undefined ? base.nodi_per_microetichetta : 4,
      nodi: nNodi,
      k: k,
      nota: 'fattore ' + Math.round(f * 10000) / 10000 + ' = ' + k + ' / ' + nNodi +
            ': lo stesso giorno descritto con più nodi non costa di più.'
    };
  }

  /* --------------------------------------------------------------------
     IL REGIME, DALLO STATO                      [py:1697 choose_macro_by_state]
     Le soglie sono quelle del Python, non una scelta di questa versione.
     -------------------------------------------------------------------- */
  function regimeDalloStato(stato) {
    var s = N.normalizzaNodo({ stato_prima: stato }).stato_prima;
    if (s.stress_str >= 85 && s.posizione_pos <= 30 && s.debito_deb >= 1) {
      return 'macro_5_spirale_stabilizzata';
    }
    if (s.stress_str >= 75 || s.costo_nascosto >= 65) { return 'macro_4_spirale_in_formazione'; }
    if (s.stress_str >= 60 || s.costo_nascosto >= 45) { return 'macro_3_ripetizione_pesante_recuperabile'; }
    if (s.stress_str >= 45) { return 'macro_2_mini_settimana_leggera'; }
    return 'macro_1_catena_breve';
  }

  function tronca(x) { return x < 0 ? Math.ceil(x) : Math.floor(x); }
  function punteggioRi4(r) {
    return (r.rientro + r.riparazione + r.riduzione + r.ripresa) / 4;
  }
  var RIP_BUONA = ['vera', 'piena'];

  /* --------------------------------------------------------------------
     RECUPERO FRA UN GIORNO E L'ALTRO              [py:1513]
     Piu' generoso di quello fra scene (0,35 contro 0,20), ma frenato dal
     pavimento e dal raffreddamento: il Python moltiplica per 0,45 quando
     uno dei due e' attivo. «Il recupero non e' mai istantaneo.»
     -------------------------------------------------------------------- */
  function recuperoFraGiorni(stato) {
    var s = N.normalizzaNodo({ stato_prima: stato }).stato_prima;
    var f = CAL.valore('recupero_fra_giorni');
    if (s.floor1_attivo || s.cooldown > 0) { f *= CAL.valore('freno_pavimento_giorni'); }
    var ri4 = punteggioRi4(s.ri4);

    var rid  = tronca(Math.max(0, s.stress_str - CAL.valore('pavimento_carico_giorni')) * f * ri4);
    var gain = tronca(Math.max(0, CAL.valore('tetto_assetto_giorni') - s.posizione_pos) * f * ri4);
    var ridC = tronca(Math.max(0, s.costo_nascosto - CAL.valore('pavimento_costo_giorni')) * f * ri4);

    var deb = s.debito_deb;
    if (RIP_BUONA.indexOf(s.rip) >= 0 && ri4 >= 0.65 && deb > 0) { deb -= 1; }

    return N.normalizzaNodo({ stato_prima: {
      stress_str:     N.clampInt(s.stress_str - rid, 0, 100),
      posizione_pos:  N.clampInt(s.posizione_pos + gain, 0, 100),
      debito_deb:     Math.max(0, deb),
      bonus_bp:       0,
      /* un rientro debole non sopravvive alla notte: torna assente */
      rip:            (s.rip === 'debole') ? 'assente' : s.rip,
      or1:            N.clampFloat(s.or1 + 0.04 * ri4, 0, 1),
      ri4:            s.ri4,
      macro:          s.macro,
      cooldown:       Math.max(0, s.cooldown - 1),
      floor1_attivo:  s.floor1_attivo && !(s.stress_str < 65 && s.posizione_pos > 45),
      floor1_motivo:  s.floor1_motivo,
      costo_nascosto: N.clampInt(s.costo_nascosto - ridC, 0, 100)
    }}).stato_prima;
  }

  /* --------------------------------------------------------------------
     IL SONNO                                      [py:3683]
     L'unico recupero che tocca anche ri4, cioe' la capacita' futura di
     recuperare. Il fattore si compone di ore, qualita' e continuita' con
     i pesi 0,45 / 0,35 / 0,20; se il riposo non e' reale vale il 45 %.
     -------------------------------------------------------------------- */
  function profiloSonno(p) {
    p = p || {};
    return {
      ore:        N.clampFloat(p.ore !== undefined ? p.ore : 7.0, 0, 14),
      qualita:    N.clampFloat(p.qualita !== undefined ? p.qualita : 0.6, 0, 1),
      continuita: N.clampFloat(p.continuita !== undefined ? p.continuita : 0.6, 0, 1),
      riposo_reale: (p.riposo_reale === undefined) ? true : !!p.riposo_reale,
      nota: String(p.nota || '')
    };
  }

  function dormi(stato, sonno) {
    var s = N.normalizzaNodo({ stato_prima: stato }).stato_prima;
    var p = profiloSonno(sonno);
    var prima = s;

    var f = N.clampFloat((p.ore / 8.0) * CAL.valore('sonno_peso_ore')
                         + p.qualita * CAL.valore('sonno_peso_qualita')
                         + p.continuita * CAL.valore('sonno_peso_continuita'), 0, 1.25);
    if (!p.riposo_reale) { f *= CAL.valore('sonno_riposo_non_reale'); }
    if (s.floor1_attivo || s.cooldown > 0) { f *= CAL.valore('freno_pavimento_sonno'); }

    var calaStr = tronca(Math.max(0, s.stress_str - CAL.valore('pavimento_carico_giorni')) * CAL.valore('sonno_quota_carico') * f);
    var salePos = tronca(Math.max(0, CAL.valore('tetto_assetto_giorni') - s.posizione_pos) * CAL.valore('sonno_quota_assetto') * f);
    var calaCosto = tronca(Math.max(0, s.costo_nascosto - CAL.valore('pavimento_costo_sonno')) * CAL.valore('sonno_quota_costo') * f);

    var deb = s.debito_deb;
    if (p.riposo_reale && p.qualita >= 0.75 && RIP_BUONA.indexOf(s.rip) >= 0 && deb > 0) { deb -= 1; }

    var ri4 = {
      rientro:     N.clampFloat(s.ri4.rientro + 0.12 * f, 0, 1),
      riparazione: N.clampFloat(s.ri4.riparazione + (p.riposo_reale ? 0.06 : 0.01), 0, 1),
      riduzione:   N.clampFloat(s.ri4.riduzione + 0.08 * f, 0, 1),
      ripresa:     N.clampFloat(s.ri4.ripresa + 0.10 * f, 0, 1)
    };

    var dopo = N.normalizzaNodo({ stato_prima: {
      stress_str:     N.clampInt(s.stress_str - calaStr, 0, 100),
      posizione_pos:  N.clampInt(s.posizione_pos + salePos, 0, 100),
      debito_deb:     Math.max(0, deb),
      bonus_bp:       0,
      rip:            s.rip,
      or1:            N.clampFloat(s.or1 + 0.06 * f, 0, 1),
      ri4:            ri4,
      macro:          s.macro,
      cooldown:       Math.max(0, s.cooldown - (f >= 0.65 ? 1 : 0)),
      floor1_attivo:  s.floor1_attivo && !(s.stress_str < 70 && s.posizione_pos > 40 && deb <= 1),
      floor1_motivo:  s.floor1_motivo,
      costo_nascosto: N.clampInt(s.costo_nascosto - calaCosto, 0, 100)
    }}).stato_prima;
    dopo.macro = regimeDalloStato(dopo);

    return {
      etichetta: 'recupero notturno',
      profilo: p,
      fattore: Math.round(f * 1000) / 1000,
      stato_prima: prima,
      stato_dopo: dopo,
      delta: {
        STR: dopo.stress_str - prima.stress_str,
        POS: dopo.posizione_pos - prima.posizione_pos,
        DEB: dopo.debito_deb - prima.debito_deb,
        costo_nascosto: dopo.costo_nascosto - prima.costo_nascosto,
        cooldown: dopo.cooldown - prima.cooldown,
        ri4: Math.round((punteggioRi4(dopo.ri4) - punteggioRi4(prima.ri4)) * 1000) / 1000
      },
      motivi: ['recupero notturno prudenziale',
               'il pavimento e il raffreddamento frenano i recuperi troppo generosi']
    };
  }

  /* --------------------------------------------------------------------
     LA GIORNATA — piu' scene, con recupero parziale fra l'una e l'altra
                                                   [py:1590 run_chain]
     -------------------------------------------------------------------- */
  function eseguiGiornata(scene, opzioni) {
    opzioni = opzioni || {};
    if (!scene || !scene.length) { return null; }

    var statoIniziale = N.normalizzaNodo(scene[0][0] || {}).stato_prima;
    statoIniziale.macro = 'macro_1_catena_breve';
    var stato = statoIniziale;
    var risultati = [];

    for (var i = 0; i < scene.length; i++) {
      /* UNA SCENA SENZA GESTI NON PRODUCE UNO STATO, E NON DEVE FINGERE
         DI PRODURLO. Senza questo controllo il motore di sotto (eseguiScena)
         restituisce null, e la riga successiva prova a leggere
         `.stato_finale` da un null: un crash che non nomina né la giornata
         né la scena, tre livelli sotto a dove l'errore è nato davvero. */
      if (!scene[i] || !scene[i].length) {
        throw new Error('eseguiGiornata: la scena ' + (i + 1) + ' di ' + scene.length +
          ' non ha nemmeno un gesto. Ogni scena ne vuole almeno uno.');
      }
      var nodi = scene[i].map(function (n) { return S.applicaStatoAlNodo(n, stato); });
      var r = eseguiScenaCalibrata(nodi, opzioni);
      risultati.push(r);
      stato = recuperoFraScene(r.stato_finale);
      stato.macro = 'macro_1_catena_breve';
    }

    var finale = risultati[risultati.length - 1].stato_finale;
    return componi('catena_breve', opzioni.titolo || 'Una giornata',
                   risultati, statoIniziale, finale, 'scene');
  }

  /* il recupero fra scene sta in stato.js: qui si usa, non si riscrive */
  function recuperoFraScene(stato) { return S.recuperoFraScene(stato); }

  /* --------------------------------------------------------------------
     LA MINI-SETTIMANA — piu' giorni, con il recupero fra i giorni
                                                   [py:1623 run_miniweek]
     Se al giorno viene dato un profilo di sonno, si dorme; altrimenti si
     applica il recupero fra giorni del Python. Il sonno e' un di piu' che
     il nucleo prevede ma che run_miniweek non usa: qui e' opzionale e
     dichiarato, cosi' i due percorsi restano confrontabili.
     -------------------------------------------------------------------- */
  function eseguiMiniSettimana(giorni, opzioni) {
    opzioni = opzioni || {};
    if (!giorni || !giorni.length) { return null; }

    var primo = giorni[0];
    var scenePrime = primo.scene || primo;
    var statoIniziale = N.normalizzaNodo((scenePrime[0] || [])[0] || {}).stato_prima;
    statoIniziale.macro = 'macro_2_mini_settimana_leggera';
    var stato = statoIniziale;
    var risultati = [], notti = [];

    for (var g = 0; g < giorni.length; g++) {
      var giorno = giorni[g];
      /* UN GIORNO SALTATO (undefined o null nell'elenco) SI DEVE SENTIRE
         QUI, non tre righe sotto su `.scene` di un valore che non esiste.
         Un elenco di giorni costruito a mano — un banco di prova, non
         l'interfaccia — puo' avere un buco a un indice; il messaggio dice
         quale. */
      if (!giorno) {
        throw new Error('eseguiMiniSettimana: il giorno ' + (g + 1) + ' di ' + giorni.length +
          ' è vuoto (undefined o null). Un giorno saltato non ha uno stato da cui ripartire.');
      }
      var scene = giorno.scene || giorno;

      /* IL RIENTRO DICHIARATO DI OGGI                        [misura del 18/8]
         RIP e' un ingresso della scena, e prossimoRip [py:1182] lo consuma:
         dopo un successo pulito torna 'assente'. Portando avanti solo lo
         stato, un rientro dichiarato agiva UNA VOLTA SOLA, il primo nodo del
         primo giorno — e poi la settimana proseguiva senza. Misurato: quel
         solo nodo bastava a spostare l'esito di sessanta giorni da 99 a 42,
         perche' il sistema e' bistabile e la condizione iniziale decide in
         quale bacino cade.
         Il punto e' che «un rientro vero una volta sola» e «un rientro vero
         tutti i giorni» sono due vite diverse, e il banco sapeva dire solo
         la prima. Se il giorno dichiara un proprio `rip`, quello di oggi
         torna a valere: e' la persona che decide oggi se fermarsi davvero,
         non un residuo di ieri. */
      var ripOggi = giorno.rip;
      var statoOggi = stato;
      if (ripOggi) {
        statoOggi = N.normalizzaNodo({ stato_prima: stato }).stato_prima;
        statoOggi.rip = ripOggi;
      }

      /* solo la prima scena del giorno riceve lo stato trasportato */
      var scenePatch = scene.map(function (nodiScena, idx) {
        return idx === 0
          ? nodiScena.map(function (n) { return S.applicaStatoAlNodo(n, statoOggi); })
          : nodiScena;
      });
      var r = eseguiGiornata(scenePatch, { rng: opzioni.rng, calibrazione: opzioni.calibrazione,
        titolo: giorno.titolo || ('Giorno ' + (g + 1)) });
      r.giorno = g + 1;
      risultati.push(r);

      var sonno = giorno.sonno || opzioni.sonno;
      if (sonno) {
        var notte = dormi(r.stato_finale, sonno);
        notte.dopo_il_giorno = g + 1;
        notti.push(notte);
        stato = notte.stato_dopo;
      } else {
        stato = recuperoFraGiorni(r.stato_finale);
      }
      stato.macro = 'macro_2_mini_settimana_leggera';
    }

    var out = componi('mini_settimana', opzioni.titolo || 'Una mini-settimana',
                      risultati, statoIniziale, risultati[risultati.length - 1].stato_finale, 'giorni');
    out.notti = notti;
    out.stato_al_risveglio = stato;
    return out;
  }

  /* --------------------------------------------------------------------
     LA TRAIETTORIA — piu' mini-settimane, e il regime che cambia
                                                   [py:1658 run_trajectory]
     -------------------------------------------------------------------- */
  function eseguiTraiettoria(settimane, opzioni) {
    opzioni = opzioni || {};
    if (!settimane || !settimane.length) { return null; }

    var primaSett = settimane[0];
    var primoGiorno = (primaSett.giorni || primaSett)[0];
    var scenePrime = primoGiorno.scene || primoGiorno;
    var statoIniziale = N.normalizzaNodo((scenePrime[0] || [])[0] || {}).stato_prima;
    statoIniziale.macro = 'macro_3_ripetizione_pesante_recuperabile';
    var stato = statoIniziale;
    var risultati = [], regimi = [];

    for (var w = 0; w < settimane.length; w++) {
      var sett = settimane[w];
      /* UNA SETTIMANA SALTATA SI DEVE SENTIRE QUI, con il proprio indice —
         non su `.giorni` di un valore che non esiste. Stesso principio del
         giorno saltato in eseguiMiniSettimana. */
      if (!sett) {
        throw new Error('eseguiTraiettoria: la settimana ' + (w + 1) + ' di ' + settimane.length +
          ' è vuota (undefined o null). Una settimana saltata non ha uno stato da cui ripartire.');
      }
      var giorni = sett.giorni || sett;
      var giorniPatch = giorni.map(function (gio, gi) {
        if (!gio) {
          throw new Error('eseguiTraiettoria: nella settimana ' + (w + 1) + ' il giorno ' +
            (gi + 1) + ' è vuoto (undefined o null).');
        }
        var scene = gio.scene || gio;
        if (gi !== 0) { return gio; }
        var patch = scene.map(function (nodiScena, si) {
          return si === 0
            ? nodiScena.map(function (n) { return S.applicaStatoAlNodo(n, stato); })
            : nodiScena;
        });
        return { scene: patch, titolo: gio.titolo, sonno: gio.sonno };
      });
      var r = eseguiMiniSettimana(giorniPatch, {
        rng: opzioni.rng, sonno: opzioni.sonno, calibrazione: opzioni.calibrazione,
        titolo: sett.titolo || ('Settimana ' + (w + 1))
      });
      r.settimana = w + 1;
      risultati.push(r);

      stato = recuperoFraGiorni(r.stato_finale);
      stato.macro = regimeDalloStato(stato);
      regimi.push({ settimana: w + 1, regime: stato.macro, nome: REGIMI[stato.macro],
                    stress_str: stato.stress_str, posizione_pos: stato.posizione_pos });
    }

    var finale = risultati[risultati.length - 1].stato_finale;
    finale.macro = regimeDalloStato(finale);
    var out = componi('traiettoria_lunga', opzioni.titolo || 'Una traiettoria',
                      risultati, statoIniziale, finale, 'settimane');
    out.regimi = regimi;
    out.spirale = diagnosiSpirale(regimi, finale);
    return out;
  }

  /* --------------------------------------------------------------------
     LA SPIRALE — il rischio di lettura proprio del livello lungo
     «Ignorare una spirale in formazione» e', per la guida, l'errore del
     livello traiettoria. Qui si guarda se il regime peggiora nel tempo
     invece di limitarsi a fotografare l'ultimo.
     -------------------------------------------------------------------- */
  var ORDINE_REGIMI = ['macro_1_catena_breve', 'macro_2_mini_settimana_leggera',
    'macro_3_ripetizione_pesante_recuperabile', 'macro_4_spirale_in_formazione',
    'macro_5_spirale_stabilizzata'];

  function diagnosiSpirale(regimi, finale) {
    if (!regimi.length) { return null; }
    var grado = function (m) { var i = ORDINE_REGIMI.indexOf(m); return i < 0 ? 0 : i; };
    var primo = grado(regimi[0].regime), ultimo = grado(regimi[regimi.length - 1].regime);
    var peggiora = 0, migliora = 0;
    for (var i = 1; i < regimi.length; i++) {
      var d = grado(regimi[i].regime) - grado(regimi[i - 1].regime);
      if (d > 0) { peggiora++; } else if (d < 0) { migliora++; }
    }
    var stabilizzata = finale.macro === 'macro_5_spirale_stabilizzata';
    /* «Stabile» non basta come risposta: dipende da CHE COSA e' stabile.
       Un regime fermo su «catena breve» e' una buona notizia; un regime fermo
       su «spirale in formazione» e' la peggiore che ci sia, e chiamarlo
       stabile lo farebbe leggere come rassicurante. Trovato provando il
       simulatore il 3/9: sei settimane con carico da 40 a 99 e assetto da 58
       a 1 uscivano sotto il titolo «Il regime tiene».
       Da grado 2 in su — ripetizione pesante, spirale in formazione, spirale
       stabilizzata — un regime che non si muove e' un regime che non
       migliora, e va detto cosi'. */
    var informazione = stabilizzata ? 'stabilizzata'
                     : (ultimo > primo && peggiora > migliora) ? 'in formazione'
                     : (ultimo < primo) ? 'in rientro'
                     : (ultimo >= 2) ? 'fermo_in_alto' : 'stabile';

    var testo;
    if (informazione === 'stabilizzata') {
      testo = 'Il regime è una spirale stabilizzata. Il sistema non è in difficoltà per ' +
              'una settimana storta: è sbilanciato per come è organizzato. A questo ' +
              'livello il gesto singolo non è più la leva.';
    } else if (informazione === 'in formazione') {
      /* LE TAPPE SI CONTANO, NON SI ELENCANO UNA PER SETTIMANA.
         Prima qui c'era un nome per ogni settimana, e con ventisei settimane
         uscivano venticinque «spirale in formazione» di fila dentro una
         parentesi. Illeggibile, ma soprattutto falso: la frase diceva «peggiora
         di settimana in settimana» mentre il regime peggiorava UNA volta, alla
         seconda settimana, e poi restava fermo per venticinque. Adesso le
         settimane uguali di fila si fondono in una tappa sola con la sua
         durata, e si dice quante volte il regime e' davvero peggiorato. */
      var tappe = [];
      regimi.forEach(function (r) {
        var nome = REGIMI[r.regime];
        if (tappe.length && tappe[tappe.length - 1].nome === nome) { tappe[tappe.length - 1].quante++; }
        else { tappe.push({ nome: nome, quante: 1 }); }
      });
      var percorso = tappe.map(function (x) {
        return x.nome + ' (' + (x.quante === 1 ? 'una settimana' : x.quante + ' settimane') + ')';
      }).join(' → ');
      testo = 'Il regime ' +
        (peggiora === 1
          ? 'è peggiorato una volta sola, e da lì non si è più mosso'
          : 'è peggiorato ' + peggiora + ' volte') +
        '. Il percorso: ' + percorso +
        '. È una spirale in formazione. Guardare solo l’ultima settimana la farebbe ' +
        'sembrare una settimana difficile come tante.';
    } else if (informazione === 'in rientro') {
      testo = 'Il regime migliora: ' + REGIMI[regimi[0].regime] + ' → ' +
        REGIMI[regimi[regimi.length - 1].regime] + '. Il recupero sta funzionando.';
    } else if (informazione === 'fermo_in_alto') {
      testo = 'Il regime resta «' + REGIMI[regimi[regimi.length - 1].regime] + '» da ' +
        regimi.length + (regimi.length === 1 ? ' settimana' : ' settimane') +
        '. Non peggiora, ma non migliora nemmeno: sta fermo in alto. Un regime che non ' +
        'migliora non è un regime che tiene. È un regime che si è installato. E a questo ' +
        'livello il gesto singolo non è più la leva.';
    } else {
      testo = 'Il regime resta ' + REGIMI[regimi[regimi.length - 1].regime] +
        ': la traiettoria non peggiora e non migliora.';
    }
    return { andamento: informazione, peggioramenti: peggiora, miglioramenti: migliora,
             regime_finale: finale.macro, testo: testo };
  }

  /* --------------------------------------------------------------------
     LA COMPOSIZIONE DEL RISULTATO — uguale a tutti i livelli
     -------------------------------------------------------------------- */
  function componi(idLivello, titolo, parti, iniziale, finale, nomeParti) {
    var esiti = parti.map(function (p) { return p.esito; });
    var conteggi = {};
    esiti.forEach(function (e) { conteggi[e] = (conteggi[e] || 0) + 1; });
    var esito = S.esitoAggregato(esiti, finale);

    var out = {
      livello: idLivello,
      descrizione_livello: livello(idLivello),
      titolo: titolo,
      calibrazione: (parti[0] && parti[0].calibrazione) || 'storica',
      stato_iniziale: iniziale,
      stato_finale: finale,
      esito: esito,
      rischio: S.livelloRischio ? S.livelloRischio(finale, esito) : null,
      /* ATTENZIONE: QUESTO REGIME E' MISURATO PRIMA DEL RIPOSO DI FINE
         SETTIMANA, L'ELENCO `regimi` E' MISURATO DOPO.
         Non e' un errore di nessuno dei due: sono due momenti diversi.
         `regimi[w]` porta lo stato con cui si ENTRA nella settimana
         successiva, cioe' dopo `recuperoFraGiorni`; qui invece si guarda
         l'ultimo nodo dell'ultimo giorno, che e' lo stesso stato da cui
         nascono i delta stampati accanto. Misurato il 10/09/2026 su 640
         traiettorie: i due nomi divergono nel 17,7 per cento dei casi, e la
         sintesi risulta sempre PIU' GRAVE dell'ultima riga dell'elenco.
         Il racconto adesso chiude usando l'ultima riga dell'elenco, quindi a
         schermo la contraddizione non si vede piu'. Chi legge questo campo
         direttamente, pero', riceve l'altra risposta: e' scritto qui perche'
         non venga riscoperto come un difetto.
         Resta una domanda vera per l'autore, e non la decide il codice: il
         «regime finale» di una traiettoria e' quello con cui l'ultima
         settimana finisce, o quello con cui si resta dopo essersi riposati? */
      regime: regimeDalloStato(finale),
      nome_regime: REGIMI[regimeDalloStato(finale)],
      conteggi: conteggi,
      delta: {
        STR: finale.stress_str - iniziale.stress_str,
        POS: finale.posizione_pos - iniziale.posizione_pos,
        DEB: finale.debito_deb - iniziale.debito_deb,
        costo_nascosto: finale.costo_nascosto - iniziale.costo_nascosto,
        or1: Math.round((finale.or1 - iniziale.or1) * 1000) / 1000,
        ri4: Math.round((punteggioRi4(finale.ri4) - punteggioRi4(iniziale.ri4)) * 1000) / 1000
      }
    };
    out[nomeParti] = parti;
    return out;
  }

  var API = {
    LIVELLI: LIVELLI,
    eseguiScenaCalibrata: eseguiScenaCalibrata,
    K_TARATO: K_TARATO,
    fattorePerGranularita: fattorePerGranularita,
    calibrazionePerGiornata: calibrazionePerGiornata,
    REGIMI: REGIMI,
    ORDINE_REGIMI: ORDINE_REGIMI,
    livello: livello,
    regimeDalloStato: regimeDalloStato,
    recuperoFraGiorni: recuperoFraGiorni,
    profiloSonno: profiloSonno,
    dormi: dormi,
    eseguiGiornata: eseguiGiornata,
    eseguiMiniSettimana: eseguiMiniSettimana,
    eseguiTraiettoria: eseguiTraiettoria,
    diagnosiSpirale: diagnosiSpirale
  };

  globale.Tempo = API;
  if (typeof module !== 'undefined' && module.exports) { module.exports = API; }

})(typeof window !== 'undefined' ? window : globalThis);
