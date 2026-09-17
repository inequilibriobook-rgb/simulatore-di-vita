/* =============================================================================
   SIMULATORE 3.0 — Nucleo di calcolo
   =============================================================================
   Traduzione fedele di simulatore_v31_core_finale.py (righe 49-1434).
   La formula canonica, i clamp, i pesi e le soglie NON sono stati modificati:
   ogni valore numerico qui dentro e' copiato dal Python, non reinterpretato.

   FORMULA CANONICA
     Pn = clamp[5,95]( P0 + E + I + T + M + BP - 5*C - piSTR(STR) - 5*DEB )

   Riferimenti al sorgente Python indicati come  [py:RIGA]
   ========================================================================== */

(function (globale) {
  'use strict';

  /* ---------------------------------------------------------------------
     UTILITY DI SANIFICAZIONE                                    [py:49-72]
     --------------------------------------------------------------------- */

  function numeroSicuro(valore, predefinito) {
    predefinito = (predefinito === undefined) ? 0 : predefinito;
    var n = Number(valore);
    if (typeof valore === 'boolean') { n = valore ? 1 : 0; }
    if (valore === null || valore === undefined || valore === '' || !isFinite(n)) {
      return Number(predefinito);
    }
    return n;
  }

  /* Python usa round() con arrotondamento "al pari" (banker's rounding).
     Math.round() di JavaScript arrotonda sempre verso l'alto sui .5.
     Senza questa correzione i due motori divergono sui valori a meta'. */
  function arrotondaComePython(x) {
    if (typeof x !== 'number' || !isFinite(x)) {
      throw new Error('Nucleo.arrotondaComePython: x deve essere un numero finito, non ' +
        JSON.stringify(x) + '.');
    }
    var basso = Math.floor(x);
    var resto = x - basso;
    if (resto > 0.5) { return basso + 1; }
    if (resto < 0.5) { return basso; }
    return (basso % 2 === 0) ? basso : basso + 1;
  }

  function clampInt(valore, minimo, massimo) {            // [py:64]
    if (typeof minimo !== 'number' || typeof massimo !== 'number' ||
        !isFinite(minimo) || !isFinite(massimo)) {
      throw new Error('Nucleo.clampInt: minimo e massimo sono obbligatori e devono essere ' +
        'numeri, non ' + JSON.stringify(minimo) + ' e ' + JSON.stringify(massimo) + '.');
    }
    var predefinito = (minimo <= 0 && 0 <= massimo) ? 0 : minimo;
    return Math.max(minimo, Math.min(massimo, arrotondaComePython(numeroSicuro(valore, predefinito))));
  }

  function clampFloat(valore, minimo, massimo) {          // [py:69]
    if (typeof minimo !== 'number' || typeof massimo !== 'number' ||
        !isFinite(minimo) || !isFinite(massimo)) {
      throw new Error('Nucleo.clampFloat: minimo e massimo sono obbligatori e devono essere ' +
        'numeri, non ' + JSON.stringify(minimo) + ' e ' + JSON.stringify(massimo) + '.');
    }
    var predefinito = (minimo <= 0.0 && 0.0 <= massimo) ? 0.0 : minimo;
    return Math.max(minimo, Math.min(massimo, numeroSicuro(valore, predefinito)));
  }

  function testoNonVuoto(testo, ripiego) {                // [py:114]
    ripiego = ripiego || '';
    var t = (testo === null || testo === undefined) ? '' : String(testo).trim();
    return t || ripiego;
  }

  function booleanoSicuro(valore, predefinito) {          // [py:148]
    if (typeof valore === 'boolean') { return valore; }
    if (valore === null || valore === undefined) { return !!predefinito; }
    if (typeof valore === 'number') { return isFinite(valore) ? valore !== 0 : !!predefinito; }
    var t = String(valore).trim().toLowerCase();
    if (['true', '1', 'si', 'sì', 'yes', 'reale', 'attivo', 'ok'].indexOf(t) >= 0) { return true; }
    if (['false', '0', 'no', 'assente', 'inattivo'].indexOf(t) >= 0) { return false; }
    return !!predefinito;
  }

  function enumSicuro(valoriAmmessi, valore, predefinito) {  // [py:99]
    if (valore === null || valore === undefined) { return predefinito; }
    var t = String(valore).trim().toLowerCase();
    for (var i = 0; i < valoriAmmessi.length; i++) {
      if (String(valoriAmmessi[i]).toLowerCase() === t) { return valoriAmmessi[i]; }
    }
    return predefinito;
  }

  /* ---------------------------------------------------------------------
     ENUM CANONICHE                                            [py:178-296]
     --------------------------------------------------------------------- */

  var ESITO = {
    PULITO: 'successo_pulito',
    COSTOSO: 'successo_costoso_sostenibile',
    DANNEGGIATO: 'successo_danneggiato',
    TOSSICO: 'successo_tossico',
    TECNICO_UMANO: 'successo_tecnico_fallimento_umano',
    FALL_TECNICO: 'fallimento_tecnico',
    FALL_LIEVE: 'fallimento_lieve',
    FALL_SISTEMICO: 'fallimento_sistemico',
    QUASI_COLLASSO: 'quasi_collasso'
  };

  var RIP = ['assente', 'finta', 'debole', 'vera', 'tardiva', 'piena'];
  var SUPPORTO = ['assente', 'emotivo', 'pratico', 'informativo', 'logistico',
                  'simbolico', 'inefficace', 'invasivo', 'professionale'];
  var DELEGA = ['assente', 'parziale', 'reale', 'finta', 'tardiva', 'incompetente', 'invasiva'];
  var DISPONIBILITA = ['reale', 'parziale', 'teorica', 'tardiva', 'finta', 'non_disponibile'];
  var ADATTAMENTO = ['nessuno', 'chiedere_aiuto', 'semplificare', 'delegare',
                     'rinviare_senza_evitare', 'cambiare_ambiente', 'cambiare_obiettivo',
                     'riparare', 'spezzare_compito', 'pausa_reale', 'cambiare_sequenza',
                     'avvisare_qualcuno'];
  var MACRO = ['macro_0_episodio_isolato', 'macro_1_catena_breve',
               'macro_2_mini_settimana_leggera', 'macro_3_ripetizione_pesante_recuperabile',
               'macro_4_spirale_in_formazione', 'macro_5_spirale_stabilizzata'];
  var PROFILO = ['neutro', 'fragile', 'resistente', 'impulsivo', 'iper_responsabile',
                 'caregiver', 'genitore_sovraccarico', 'lavoratore_sotto_pressione',
                 'partner_compensante', 'chiede_aiuto', 'non_chiede_aiuto',
                 'competente_ma_stanco', 'competente_ma_isolato'];

  /* ---------------------------------------------------------------------
     COME SI DICONO IN ITALIANO
     ---------------------------------------------------------------------
     Le parole degli elenchi qui sopra sono chiavi: servono al programma per
     confrontare, e sono scritte con il trattino basso perche' cosi' si
     scrivono le chiavi. Non sono italiano, e non devono arrivare sotto gli
     occhi di nessuno.

     Il 10/09/2026 ci arrivavano. Nella pagina del questionario, sotto le
     risposte, si leggeva «il regime: macro_5_spirale_stabilizzata» e «la
     disponibilità di adattamento: non_disponibile». Il nome del campo passava
     da una tabella; il valore no, perche' la tabella non c'era.

     ⚠️ PERCHE' LA TABELLA HA DUE PIANI E NON UNO.
     Perche' la stessa parola vuol dire cose diverse in elenchi diversi.
     «reale» in DELEGA vuol dire che il compito e' passato davvero a
     qualcun altro; «reale» in DISPONIBILITA vuol dire che la cosa con cui
     adattarsi c'era per davvero. «finta», «tardiva», «parziale» e «assente»
     stanno in due o tre elenchi ciascuna. Una tabella piatta avrebbe dato a
     tutte la stessa traduzione, cioe' avrebbe scritto una frase sbagliata
     con l'aria di essere giusta — che e' il difetto peggiore dei due.

     Si usa cosi':  Nucleo.inItaliano('delega', 'reale')  ->  «passata davvero
     a qualcun altro». I nove esiti non stanno qui: li nomina, con il titolo
     e il perche', app/dati/spiegazioni.js.
     -------------------------------------------------------------------- */
  var IN_ITALIANO = {

    /* il rientro: se una pausa vera c'e' stata, e di che tipo */
    rip: {
      assente: 'nessun rientro',
      finta:   'un rientro solo apparente',
      debole:  'un rientro debole',
      vera:    'un rientro vero',
      tardiva: 'un rientro arrivato tardi',
      piena:   'un rientro pieno'
    },

    /* l'aiuto ricevuto */
    supporto: {
      assente:       'nessun aiuto',
      emotivo:       'vicinanza, senza alleggerire il carico',
      pratico:       'aiuto pratico, che toglie lavoro',
      informativo:   'qualcuno che ha spiegato come si fa',
      logistico:     'qualcuno che ha risolto un problema di organizzazione',
      simbolico:     'un gesto di riguardo, che però non alleggerisce',
      inefficace:    'aiuto che non ha aiutato',
      invasivo:      'aiuto che ha invaso, e ha aggiunto lavoro',
      professionale: 'aiuto di qualcuno che lo fa di mestiere'
    },

    /* la delega: passare a qualcun altro una parte del compito */
    delega: {
      assente:      'niente è stato passato a nessuno',
      parziale:     'una parte è stata passata a qualcun altro',
      reale:        'passata davvero a qualcun altro',
      finta:        'passata solo a parole',
      tardiva:      'passata quando ormai era tardi',
      incompetente: 'passata a chi non sapeva farla',
      invasiva:     'presa in mano da qualcun altro senza chiederlo'
    },

    /* quanto è a portata di mano la cosa con cui ci si potrebbe adattare */
    disponibilita: {
      reale:           'c’era davvero',
      parziale:        'c’era in parte',
      teorica:         'c’era solo sulla carta',
      tardiva:         'è arrivata quando ormai era tardi',
      finta:           'sembrava esserci, e non c’era',
      non_disponibile: 'non c’era'
    },

    /* i modi di adattarsi */
    adattamento: {
      nessuno:                'nessun adattamento',
      chiedere_aiuto:         'chiedere aiuto',
      semplificare:           'semplificare il compito',
      delegare:               'passare il compito a qualcun altro',
      rinviare_senza_evitare: 'rimandare, ma senza far finta di niente',
      cambiare_ambiente:      'spostarsi in un posto diverso',
      cambiare_obiettivo:     'cambiare quello che si voleva ottenere',
      riparare:               'riparare quello che si è rotto',
      spezzare_compito:       'spezzare il compito in pezzi più piccoli',
      pausa_reale:            'fermarsi davvero',
      cambiare_sequenza:      'fare le stesse cose in un altro ordine',
      avvisare_qualcuno:      'avvisare qualcuno'
    },

    /* il regime: che periodo è, non che giornata */
    macro: {
      macro_0_episodio_isolato:                 'un episodio isolato',
      macro_1_catena_breve:                     'una catena breve',
      macro_2_mini_settimana_leggera:           'una mini-settimana leggera',
      macro_3_ripetizione_pesante_recuperabile: 'una ripetizione pesante, ma da cui si rientra',
      macro_4_spirale_in_formazione:            'una spirale che si sta formando',
      macro_5_spirale_stabilizzata:             'una spirale ormai stabile'
    },

    /* chi è la persona che sta facendo il gesto */
    profilo: {
      neutro:                     'nessun profilo particolare',
      fragile:                    'una persona già fragile',
      resistente:                 'una persona che regge molto',
      impulsivo:                  'una persona che parte di slancio',
      iper_responsabile:          'una persona che si sente responsabile di tutto',
      caregiver:                  'una persona che si prende cura di qualcun altro',
      genitore_sovraccarico:      'un genitore con troppe cose addosso',
      lavoratore_sotto_pressione: 'una persona sotto pressione al lavoro',
      partner_compensante:        'chi in coppia compensa per due',
      chiede_aiuto:               'una persona che l’aiuto lo chiede',
      non_chiede_aiuto:           'una persona che l’aiuto non lo chiede',
      competente_ma_stanco:       'una persona capace, ma stanca',
      competente_ma_isolato:      'una persona capace, ma sola'
    }
  };

  /* Il nome italiano di un valore, dentro l'elenco a cui appartiene.
     Se un valore nuovo non e' ancora stato tradotto, si mostra con gli spazi
     al posto dei trattini bassi: si legge male, ma si legge, e chi lo vede
     capisce subito che qui manca una riga. */
  function inItaliano(elenco, valore) {
    if (valore === null || valore === undefined) { return ''; }
    var g = IN_ITALIANO[elenco];
    if (g && g[valore]) { return g[valore]; }
    return String(valore).replace(/_/g, ' ');
  }

  /* ---------------------------------------------------------------------
     CONFIGURAZIONE MATEMATICA                                 [py:305-321]
     --------------------------------------------------------------------- */

  var CONFIG = {
    probabilitaMinima: 5,
    probabilitaMassima: 95,
    pesoComplessita: 5,
    pesoDebito: 5,
    strSogliaBassa: 39,
    strSogliaMedia: 59,
    strSogliaAlta: 69,
    strSogliaRossoControllato: 79,
    strSogliaRossoGrave: 89,

    /* Le soglie con cui si classifica l'esito. Stavano scritte a mano dentro
       classificaEsito, ognuna ripetuta in due o tre punti, e il racconto le
       ricopiava a sua volta: adesso hanno una casa sola e si leggono da qui.
       Una sola di queste NON viene dal canone — sogliaCostoNascosto — ed e'
       la voce 8 dell'Apparato F: e' una scelta del programma, non del canone,
       ed e' dichiarata qui perche' chi legge il risultato la possa citare
       per nome invece di trovarsela dentro un conto. */
    sogliaCaricoAlto: 70,
    sogliaCaricoAltissimo: 85,
    sogliaCaricoCostoso: 55,
    sogliaAssettoBasso: 35,
    sogliaAssettoBassissimo: 20,
    sogliaDebitoAttivo: 1,
    sogliaCostoNascosto: 50
  };

  /* piSTR — penalita' a gradini dello stress accumulato          [py:347] */
  function penalitaStr(valoreStr, cfg) {
    cfg = cfg || CONFIG;
    var s = clampInt(valoreStr, 0, 100);
    if (s <= cfg.strSogliaBassa) { return 0; }
    if (s <= cfg.strSogliaMedia) { return 5; }
    if (s <= cfg.strSogliaAlta) { return 10; }
    if (s <= cfg.strSogliaRossoControllato) { return 15; }
    if (s <= cfg.strSogliaRossoGrave) { return 20; }
    return 25;
  }

  /* ---------------------------------------------------------------------
     NORMALIZZAZIONE DELLE STRUTTURE                           [py:368-578]
     --------------------------------------------------------------------- */

  function normalizzaModificatori(m) {                          // [py:379]
    m = m || {};
    return {
      energia_e:      clampInt(m.energia_e !== undefined ? m.energia_e : 0, -30, 30),
      informazione_i: clampInt(m.informazione_i !== undefined ? m.informazione_i : 0, -30, 30),
      tempo_t:        clampInt(m.tempo_t !== undefined ? m.tempo_t : 0, -30, 30),
      materiale_m:    clampInt(m.materiale_m !== undefined ? m.materiale_m : 0, -30, 30),
      bonus_bp:       clampInt(m.bonus_bp !== undefined ? m.bonus_bp : 0, 0, 20),
      complessita_c:  clampInt(m.complessita_c !== undefined ? m.complessita_c : 0, 0, 10)
    };
  }

  function sigmaMod(m) { return m.energia_e + m.informazione_i + m.tempo_t + m.materiale_m; } // [py:376]

  function normalizzaRi4(r) {                                   // [py:405]
    r = r || {};
    return {
      rientro:     clampFloat(r.rientro     !== undefined ? r.rientro     : 0.5, 0, 1),
      riparazione: clampFloat(r.riparazione !== undefined ? r.riparazione : 0.5, 0, 1),
      riduzione:   clampFloat(r.riduzione   !== undefined ? r.riduzione   : 0.5, 0, 1),
      ripresa:     clampFloat(r.ripresa     !== undefined ? r.ripresa     : 0.5, 0, 1)
    };
  }

  function normalizzaStato(s) {                                 // [py:433]
    s = s || {};
    return {
      stress_str:      clampInt(s.stress_str !== undefined ? s.stress_str : 0, 0, 100),
      posizione_pos:   clampInt(s.posizione_pos !== undefined ? s.posizione_pos : 60, 0, 100),
      // DEB e' l'unico campo senza tetto massimo, esattamente come nel Python
      debito_deb:      Math.max(0, arrotondaComePython(numeroSicuro(s.debito_deb, 0))),
      bonus_bp:        clampInt(s.bonus_bp !== undefined ? s.bonus_bp : 0, 0, 20),
      rip:             enumSicuro(RIP, s.rip, 'assente'),
      or1:             clampFloat(s.or1 !== undefined ? s.or1 : 0.5, 0, 1),
      ri4:             normalizzaRi4(s.ri4),
      macro:           enumSicuro(MACRO, s.macro, 'macro_0_episodio_isolato'),
      cooldown:        Math.max(0, arrotondaComePython(numeroSicuro(s.cooldown, 0))),
      floor1_attivo:   booleanoSicuro(s.floor1_attivo, false),
      floor1_motivo:   String(s.floor1_motivo || ''),
      costo_nascosto:  clampInt(s.costo_nascosto !== undefined ? s.costo_nascosto : 0, 0, 100)
    };
  }

  function normalizzaCampo(c) {                                 // [py:445]
    c = c || {};
    return {
      attivo:   booleanoSicuro(c.attivo, false),
      etichetta: testoNonVuoto(c.etichetta),
      forza:    clampInt(c.forza !== undefined ? c.forza : 0, 0, 100),
      tiro:     (c.tiro === null || c.tiro === undefined) ? null : clampInt(c.tiro, 0, 100)
    };
  }

  function normalizzaSupporto(s) {                              // [py:474]
    s = s || {};
    return {
      tipo:            enumSicuro(SUPPORTO, s.tipo, 'assente'),
      delega:          enumSicuro(DELEGA, s.delega, 'assente'),
      riduzione_carico: clampFloat(s.riduzione_carico !== undefined ? s.riduzione_carico : 0, 0, 1),
      competenza:      clampFloat(s.competenza !== undefined ? s.competenza : 0, 0, 1),
      tempestivo:      booleanoSicuro(s.tempestivo, false),
      costo_confine:   clampFloat(s.costo_confine !== undefined ? s.costo_confine : 0, 0, 1),
      nota:            testoNonVuoto(s.nota)
    };
  }

  function supportoReale(s) {                                   // [py:486]
    return ['pratico', 'informativo', 'logistico', 'professionale'].indexOf(s.tipo) >= 0
      && s.riduzione_carico > 0.25 && s.competenza > 0.25 && s.tempestivo;
  }
  function supportoFintoOSimbolico(s) {                         // [py:495]
    return ['simbolico', 'inefficace', 'emotivo'].indexOf(s.tipo) >= 0 && s.riduzione_carico < 0.25;
  }
  function delegaReale(s) {                                     // [py:499]
    return s.delega === 'reale' && s.riduzione_carico >= 0.50 && s.competenza >= 0.40;
  }

  function normalizzaAdattamento(a) {                           // [py:521]
    a = a || {};
    return {
      tipo:            enumSicuro(ADATTAMENTO, a.tipo, 'nessuno'),
      disponibilita:   enumSicuro(DISPONIBILITA, a.disponibilita, 'non_disponibile'),
      riduzione_attesa: clampFloat(a.riduzione_attesa !== undefined ? a.riduzione_attesa : 0, 0, 1),
      costo:           clampInt(a.costo !== undefined ? a.costo : 0, 0, 30),
      crea_rip_reale:  booleanoSicuro(a.crea_rip_reale, false),
      nota:            testoNonVuoto(a.nota)
    };
  }

  function adattamentoTardivoOFinto(a) {                        // [py:539]
    return ['tardiva', 'finta', 'teorica', 'non_disponibile'].indexOf(a.disponibilita) >= 0;
  }

  function normalizzaNodo(n) {                                  // [py:566]
    /* UN NODO E' UN OGGETTO, E SE NON LO E' SI DICE SUBITO.
       Prima, a chi passava una stringa o un numero al posto del nodo, il
       motore rispondeva con un Pn calcolato sui valori predefiniti — 50 di
       base, tutto il resto a zero — senza una parola. Un numero plausibile
       uscito da un errore e' peggio di un errore. Le forme false (0, '',
       false, null, undefined) restano il nodo vuoto, come nel Python. */
    if (n && (typeof n !== 'object' || Array.isArray(n))) {
      throw new Error('Il motore vuole un nodo, cioè un oggetto con p0, modificatori e ' +
        'stato_prima. Ha ricevuto invece ' + descriviTipo(n) + '.');
    }
    n = n || {};
    var etichette = Array.isArray(n.etichette) ? n.etichette.slice()
                  : (n.etichette ? [String(n.etichette)] : []);
    return {
      id:            testoNonVuoto(n.id, 'node'),
      descrizione:   testoNonVuoto(n.descrizione, 'Nodo operativo'),
      p0:            clampInt(n.p0 !== undefined ? n.p0 : 50, 1, 99),
      modificatori:  normalizzaModificatori(n.modificatori),
      stato_prima:   normalizzaStato(n.stato_prima),
      campo:         normalizzaCampo(n.campo),
      supporto:      normalizzaSupporto(n.supporto),
      adattamento:   normalizzaAdattamento(n.adattamento),
      profilo:       enumSicuro(PROFILO, n.profilo, 'neutro'),
      famiglia:      testoNonVuoto(n.famiglia),
      etichette:     etichette
    };
  }

  /* ---------------------------------------------------------------------
     I CONTROLLI SUI VALORI, DETTI IN ITALIANO
     ---------------------------------------------------------------------
     Il motore non si ferma mai davanti a un valore strano: normalizzaNodo
     lo riporta in griglia in silenzio, come fa il Python. Una stringa che
     non e' un numero diventa il valore predefinito, uno stress a 120
     diventa 100, una base a 70,5 diventa 70. E' giusto che il calcolo non
     si fermi. Non e' giusto che nessuno lo sappia: chi scrive «energia»
     invece di «energia_e» vede il termine sparire e non capisce perche'.

     controllaNodo guarda il nodo PRIMA della normalizzazione e torna un
     elenco di avvisi, uno per ogni valore che il motore ha dovuto
     correggere o ignorare. Elenco vuoto: tutto in griglia. Non cambia
     nessun numero, e non e' chiamata dal calcolo: e' una lente, non un
     filtro. Ogni avviso ha il campo, il valore ricevuto e una frase.
     -------------------------------------------------------------------- */

  function descriviTipo(v) {
    if (v === null) { return 'null'; }
    if (Array.isArray(v)) { return 'un elenco'; }
    if (typeof v === 'string') { return 'la stringa «' + v + '»'; }
    if (typeof v === 'number') { return 'il numero ' + v; }
    if (typeof v === 'boolean') { return (v ? 'vero' : 'falso'); }
    if (typeof v === 'function') { return 'una funzione'; }
    return 'un valore di tipo ' + typeof v;
  }

  /* i campi numerici, con il nome che il libro usa e la griglia ammessa */
  var CAMPI_NUMERICI = [
    ['p0',                          'P0, il punto di partenza',        1, 99,  50],
    ['modificatori.energia_e',      'E, il corpo',                    -30, 30,   0],
    ['modificatori.informazione_i', 'I, la chiarezza',                -30, 30,   0],
    ['modificatori.tempo_t',        'T, il tempo',                    -30, 30,   0],
    ['modificatori.materiale_m',    'M, l’ambiente',                  -30, 30,   0],
    ['modificatori.bonus_bp',       'BP, la protezione',                0, 20,   0],
    ['modificatori.complessita_c',  'C, la complessità',                0, 10,   0],
    ['stato_prima.stress_str',      'STR, il carico',                   0, 100,  0],
    ['stato_prima.posizione_pos',   'POS, l’assetto',                   0, 100, 60],
    ['stato_prima.debito_deb',      'DEB, il debito',                   0, null, 0],
    ['stato_prima.bonus_bp',        'BP di stato, la protezione che resta', 0, 20, 0],
    ['stato_prima.costo_nascosto',  'il costo nascosto',                0, 100,  0],
    ['stato_prima.cooldown',        'il cooldown, il tempo di raffreddamento', 0, null, 0]
  ];

  /* i campi a scelta chiusa, con l'elenco ammesso e il valore predefinito */
  var CAMPI_CHIUSI = [
    ['stato_prima.rip',            'RIP, il rientro',                   RIP,           'assente'],
    ['stato_prima.macro',          'il regime (macro)',                 MACRO,         'macro_0_episodio_isolato'],
    ['profilo',                    'il profilo della persona',          PROFILO,       'neutro'],
    ['supporto.tipo',              'il tipo di supporto',               SUPPORTO,      'assente'],
    ['supporto.delega',            'la delega',                         DELEGA,        'assente'],
    ['adattamento.tipo',           'il tipo di adattamento',            ADATTAMENTO,   'nessuno'],
    ['adattamento.disponibilita',  'la disponibilità dell’adattamento', DISPONIBILITA, 'non_disponibile']
  ];

  /* le chiavi che il motore legge dentro ogni blocco: una chiave diversa
     da queste viene ignorata in silenzio, e vale la pena dirlo */
  var CHIAVI_AMMESSE = {
    modificatori: ['energia_e', 'informazione_i', 'tempo_t', 'materiale_m', 'bonus_bp', 'complessita_c'],
    stato_prima:  ['stress_str', 'posizione_pos', 'debito_deb', 'bonus_bp', 'rip', 'or1', 'ri4',
                   'macro', 'cooldown', 'floor1_attivo', 'floor1_motivo', 'costo_nascosto']
  };
  /* le sigle del libro scritte al posto delle chiavi del motore: chi le
     usa si aspetta che contino, e invece il motore non le vede */
  var SIGLE_SCAMBIATE = {
    P0: 'p0', E: 'modificatori.energia_e', I: 'modificatori.informazione_i',
    T: 'modificatori.tempo_t', M: 'modificatori.materiale_m', BP: 'modificatori.bonus_bp',
    C: 'modificatori.complessita_c', STR: 'stato_prima.stress_str',
    POS: 'stato_prima.posizione_pos', DEB: 'stato_prima.debito_deb'
  };

  /* il meno della matematica, non il trattino: gli avvisi finiscono sotto
     gli occhi di chi legge, e «−40» si legge, «-40» si confonde */
  function numeroIt(n) { return String(n).replace(/^-/, '\u2212').replace('.', ','); }

  function leggiCampo(oggetto, percorso) {
    var parti = percorso.split('.'), v = oggetto;
    for (var i = 0; i < parti.length; i++) {
      if (v === null || v === undefined || typeof v !== 'object') { return undefined; }
      v = v[parti[i]];
    }
    return v;
  }

  function controllaNodo(nodo) {
    var avvisi = [];
    function avvisa(campo, valore, messaggio) {
      avvisi.push({ campo: campo, valore: valore, messaggio: messaggio });
    }
    if (nodo && (typeof nodo !== 'object' || Array.isArray(nodo))) {
      avvisa('nodo', nodo, 'Il nodo deve essere un oggetto con p0, modificatori e stato_prima; ' +
        'qui c’è ' + descriviTipo(nodo) + '. Il motore si rifiuta di calcolarlo.');
      return avvisi;
    }
    nodo = nodo || {};

    /* le sigle del libro al posto delle chiavi del motore */
    Object.keys(SIGLE_SCAMBIATE).forEach(function (sigla) {
      if (nodo[sigla] !== undefined) {
        avvisa(sigla, nodo[sigla], 'La chiave «' + sigla + '» è la sigla del libro, non una chiave ' +
          'del motore: il motore non la legge e usa il valore predefinito. Va scritta come «' +
          SIGLE_SCAMBIATE[sigla] + '».');
      }
    });

    /* le chiavi sconosciute dentro i due blocchi */
    Object.keys(CHIAVI_AMMESSE).forEach(function (blocco) {
      var b = nodo[blocco];
      if (!b || typeof b !== 'object') {
        if (b !== undefined && b !== null) {
          avvisa(blocco, b, 'Il blocco «' + blocco + '» deve essere un oggetto; qui c’è ' +
            descriviTipo(b) + '. Il motore lo ignora e usa i valori predefiniti.');
        }
        return;
      }
      Object.keys(b).forEach(function (k) {
        if (CHIAVI_AMMESSE[blocco].indexOf(k) < 0) {
          avvisa(blocco + '.' + k, b[k], 'La chiave «' + k + '» dentro «' + blocco + '» non è fra ' +
            'quelle che il motore legge (' + CHIAVI_AMMESSE[blocco].join(', ') + '): viene ignorata.');
        }
      });
    });

    /* i numeri: tipo, virgola, griglia */
    CAMPI_NUMERICI.forEach(function (c) {
      var campo = c[0], nome = c[1], min = c[2], max = c[3], predef = c[4];
      var v = leggiCampo(nodo, campo);
      if (v === undefined) { return; }
      var griglia = (max === null) ? 'da ' + numeroIt(min) + ' in su'
                                   : 'da ' + numeroIt(min) + ' a ' + numeroIt(max);
      if (v === null || v === '') {
        avvisa(campo, v, nome + ' è vuoto: il motore usa il valore predefinito, ' + predef + '.');
        return;
      }
      if (typeof v === 'boolean') {
        avvisa(campo, v, nome + ' è «' + (v ? 'vero' : 'falso') + '», non un numero: il motore lo ' +
          'legge come ' + (v ? 1 : 0) + '.');
        return;
      }
      var n = Number(v);
      if (typeof v === 'string' && !isFinite(n)) {
        var conVirgola = /^\s*[+−–-]?\d+,\d+\s*$/.test(v);
        avvisa(campo, v, nome + ' è la stringa «' + v + '», che non è un numero' +
          (conVirgola ? ' per via della virgola: il motore vuole il punto, o meglio un intero' : '') +
          '. Il motore usa il valore predefinito, ' + predef + '.');
        return;
      }
      if (typeof v !== 'number' && typeof v !== 'string') {
        avvisa(campo, v, nome + ' è ' + descriviTipo(v) + ', non un numero: il motore usa il ' +
          'valore predefinito, ' + predef + '.');
        return;
      }
      if (!isFinite(n)) {
        avvisa(campo, v, nome + ' non è un numero finito: il motore usa il valore predefinito, ' +
          predef + '.');
        return;
      }
      if (n !== Math.floor(n)) {
        avvisa(campo, v, nome + ' vale ' + numeroIt(v) + ', con la virgola: il ' +
          'motore lavora a interi e lo arrotonda a ' + numeroIt(arrotondaComePython(n)) +
          ' (sul mezzo arrotonda al pari, come fa Python).');
        n = arrotondaComePython(n);
      }
      if (n < min) {
        avvisa(campo, v, nome + ' vale ' + numeroIt(n) + ', sotto la griglia (' + griglia +
          '): il motore lo riporta a ' + numeroIt(min) + '.');
      } else if (max !== null && n > max) {
        avvisa(campo, v, nome + ' vale ' + n + ', oltre la griglia (' + griglia + '): il motore ' +
          'lo riporta a ' + max + '.');
      }
    });

    /* le scelte chiuse */
    CAMPI_CHIUSI.forEach(function (c) {
      var campo = c[0], nome = c[1], ammessi = c[2], predef = c[3];
      var v = leggiCampo(nodo, campo);
      if (v === undefined || v === null) { return; }
      if (enumSicuro(ammessi, v, null) === null) {
        avvisa(campo, v, nome + ' è «' + String(v) + '», che non è fra i valori ammessi (' +
          ammessi.join(', ') + '): il motore usa «' + predef + '».');
      }
    });

    return avvisi;
  }

  /* ---------------------------------------------------------------------
     LA FORMULA CANONICA                                       [py:749-762]
     --------------------------------------------------------------------- */

  function calcolaPn(nodo, cfg) {
    cfg = cfg || CONFIG;
    var n = normalizzaNodo(nodo);
    var s = n.stato_prima, m = n.modificatori;
    var grezzo = n.p0
      + sigmaMod(m)
      + m.bonus_bp
      + s.bonus_bp
      - cfg.pesoComplessita * m.complessita_c
      - penalitaStr(s.stress_str, cfg)
      - cfg.pesoDebito * s.debito_deb;
    return { grezzo: grezzo, pn: clampInt(grezzo, cfg.probabilitaMinima, cfg.probabilitaMassima) };
  }

  /* Margine del campo attivo (K/Pd): entra DOPO Pn, mai dentro   [py:766] */
  function margineCampo(campo) {
    var c = normalizzaCampo(campo);
    if (!c.attivo) { return 0; }
    if (c.tiro !== null) { return clampInt(c.tiro, 0, 100); }
    return c.forza;
  }

  /* ---------------------------------------------------------------------
     MICRO-AZIONI (V3.1 MicroActionDamping)                    [py:822-907]
     --------------------------------------------------------------------- */

  var PAROLE_MICRO = ['bere', 'acqua', 'idrata', 'idratazione', 'bicchiere', 'bottiglia',
    'sedersi', 'alzarsi', 'lavarsi', 'viso', 'respirare', 'respiro',
    'appoggiarsi', 'appoggio', 'tisana', 'medicina', 'farmaco', 'denti',
    'micro', 'cura', 'rientro', 'recupero', 'pausa', 'riposare', 'riposo',
    'stendermi', 'stendersi', 'sdraiarmi', 'sdraiarsi'];

  var PAROLE_CURA = ['bere', 'acqua', 'idrata', 'idratazione', 'sedersi', 'respirare',
    'lavarsi', 'viso', 'appoggiarsi', 'tisana', 'medicina', 'farmaco',
    'rientro', 'recupero', 'pausa', 'riposare', 'riposo', 'stendermi',
    'stendersi', 'sdraiarmi', 'sdraiarsi'];

  var FAMIGLIE_MICRO = ['V001', 'V002', 'V003', 'V005', 'V006', 'V007', 'V020'];

  function testoNodo(n) {                                       // [py:846]
    return (n.id + ' ' + n.descrizione + ' ' + n.famiglia + ' ' + n.etichette.join(' ')).toLowerCase();
  }

  function eMicroAzione(nodo) {                                 // [py:851]
    var n = normalizzaNodo(nodo);
    var testo = testoNodo(n);
    var famigliaOk = FAMIGLIE_MICRO.indexOf(n.famiglia) >= 0;
    var parolaOk = PAROLE_MICRO.some(function (k) { return testo.indexOf(k) >= 0; });
    return !!((famigliaOk || parolaOk)
      && n.modificatori.complessita_c <= 2
      && n.stato_prima.debito_deb === 0
      && (!n.campo.attivo || n.campo.forza <= 15)
      && n.modificatori.tempo_t >= -5
      && n.adattamento.costo <= 8);
  }

  function eAzioneDiCura(nodo) {                                // [py:864]
    var n = normalizzaNodo(nodo);
    var testo = testoNodo(n);
    return eMicroAzione(n)
      && (['V003', 'V005', 'V006', 'V007'].indexOf(n.famiglia) >= 0
          || PAROLE_CURA.some(function (k) { return testo.indexOf(k) >= 0; }));
  }

  /* Rischio di sovra-adattamento                                [py:783] */
  var PROFILI_A_RISCHIO = ['iper_responsabile', 'caregiver', 'genitore_sovraccarico',
    'partner_compensante', 'non_chiede_aiuto', 'lavoratore_sotto_pressione',
    'competente_ma_isolato'];

  function rischioSovraAdattamento(nodo) {
    var n = normalizzaNodo(nodo);
    var profiloRischio = PROFILI_A_RISCHIO.indexOf(n.profilo) >= 0;
    var senzaSupportoReale = !supportoReale(n.supporto) && !delegaReale(n.supporto);
    var caricoAlto = n.stato_prima.stress_str >= CONFIG.sogliaCaricoAlto;
    var riduzioneBassa = n.supporto.riduzione_carico < 0.25;
    var adattamentoCostoso = n.adattamento.costo >= 10 || adattamentoTardivoOFinto(n.adattamento);
    return profiloRischio && senzaSupportoReale && caricoAlto && (riduzioneBassa || adattamentoCostoso);
  }

  /* ---------------------------------------------------------------------
     CLASSIFICAZIONE DELL'ESITO                                [py:944-995]
     --------------------------------------------------------------------- */

  function classificaEsito(nodo, pn, tiro, successoPrimaDelCampo, margineNetto, cfg) {
    cfg = cfg || CONFIG;
    var n = normalizzaNodo(nodo);
    var s = n.stato_prima;
    var strAlto = s.stress_str >= cfg.sogliaCaricoAlto;
    var strAltissimo = s.stress_str >= cfg.sogliaCaricoAltissimo;
    var posBassa = s.posizione_pos <= cfg.sogliaAssettoBasso;
    var posBassissima = s.posizione_pos <= cfg.sogliaAssettoBassissimo;
    var debitoAttivo = s.debito_deb >= cfg.sogliaDebitoAttivo;
    var ripCattiva = ['assente', 'finta', 'debole'].indexOf(s.rip) >= 0;
    var supReale = supportoReale(n.supporto) || delegaReale(n.supporto);
    var supFinto = supportoFintoOSimbolico(n.supporto);
    var sovraRischio = rischioSovraAdattamento(n);
    var adattamentoCostoso = n.adattamento.costo >= 15;

    if (strAltissimo && posBassissima && debitoAttivo && ripCattiva && !supReale) {
      return ESITO.QUASI_COLLASSO;
    }

    if (margineNetto < -30) {
      if (strAlto && posBassa && ripCattiva) { return ESITO.FALL_SISTEMICO; }
      return ESITO.FALL_TECNICO;
    }

    if (successoPrimaDelCampo && margineNetto >= 0) {
      var micro = eMicroAzione(n);
      if (sovraRischio || adattamentoCostoso || (strAltissimo && posBassa && ripCattiva) || supFinto) {
        return ESITO.TOSSICO;
      }
      if (strAltissimo && posBassa && !micro) {
        return ESITO.TECNICO_UMANO;
      }
      if (strAlto || posBassa || debitoAttivo || s.costo_nascosto >= cfg.sogliaCostoNascosto) {
        // V3.1: nelle micro-azioni sicure lo STR alto resta severo ma non basta
        // da solo a rendere il nodo "danneggiato".
        if (micro && !posBassa && !debitoAttivo && s.costo_nascosto < cfg.sogliaCostoNascosto && !n.campo.attivo) {
          return ESITO.COSTOSO;   // [py:977-982] i tre rami del Python danno tutti questo esito
        }
        return ESITO.DANNEGGIATO;
      }
      if (margineNetto <= 9 || s.stress_str >= cfg.sogliaCaricoCostoso || n.adattamento.costo >= 8) {
        return ESITO.COSTOSO;
      }
      return ESITO.PULITO;
    }

    if (!successoPrimaDelCampo || margineNetto < 0) {
      if (strAlto && posBassa && ripCattiva && debitoAttivo) { return ESITO.FALL_SISTEMICO; }
      if (Math.abs(margineNetto) <= 15) { return ESITO.FALL_LIEVE; }
      return ESITO.FALL_TECNICO;
    }

    return ESITO.FALL_LIEVE;
  }

  /* ---------------------------------------------------------------------
     ESECUZIONE DEL NODO                                      [py:1400-1434]
     --------------------------------------------------------------------- */

  function eseguiNodo(nodo, opzioni) {
    opzioni = opzioni || {};
    var n = normalizzaNodo(nodo);
    var cfg = opzioni.config || CONFIG;

    var calc = calcolaPn(n, cfg);
    var pn = calc.pn;

    var tiro;
    if (opzioni.tiro !== undefined && opzioni.tiro !== null) {
      tiro = clampInt(opzioni.tiro, 1, 100);
    } else if (opzioni.rng) {
      tiro = clampInt(opzioni.rng.randint(1, 100), 1, 100);
    } else {
      /* AUDIT 19/8: qui c'era un ripiego silenzioso su Math.random(), che
         rompe senza avviso la riproducibilità che casuale-mt.js esiste per
         garantire — basta un punto di chiamata che dimentichi rng/tiro
         perché lo stesso seme smetta di dare lo stesso risultato. Meglio
         un errore rumoroso subito che un dado infedele in silenzio. Tutti
         i punti di chiamata attuali (app.js, questionario-ui.js, stato.js,
         golden.js) passano già tiro o rng: questo ramo non si attiva mai
         nell'uso presente, è una rete di sicurezza per il futuro. */
      throw new Error('Non posso eseguire il nodo «' + n.id + '»: nessuno mi ha dato ' +
        'il tiro del dado. Chi chiama eseguiNodo deve passare opzioni.tiro, se il ' +
        'numero lo sceglie lui, oppure opzioni.rng, cioè il generatore di casuale-mt.js. ' +
        'Un dado tirato di nascosto qui dentro romperebbe la riproducibilità: con lo ' +
        'stesso seme il simulatore deve dare sempre lo stesso risultato.');
    }

    var successo = tiro <= pn;
    var margineGrezzo = successo ? (pn - tiro) : (tiro - pn);
    var margCampo = margineCampo(n.campo);
    var margineNetto = successo ? (margineGrezzo - margCampo) : (-margineGrezzo - margCampo);
    var esito = classificaEsito(n, pn, tiro, successo, margineNetto, cfg);

    return {
      id: n.id,
      descrizione: n.descrizione,
      famiglia: n.famiglia,
      pn: pn,
      pn_grezzo_prima_del_clamp: calc.grezzo,
      tiro: tiro,
      successo_prima_del_campo: successo,
      margine_grezzo: margineGrezzo,
      margine_campo: margCampo,
      margine_netto: margineNetto,
      esito: esito,
      stato_prima: n.stato_prima,
      // scomposizione della formula, per la spiegazione a schermo
      termini: {
        P0: n.p0,
        E: n.modificatori.energia_e,
        I: n.modificatori.informazione_i,
        T: n.modificatori.tempo_t,
        M: n.modificatori.materiale_m,
        BP: n.modificatori.bonus_bp + n.stato_prima.bonus_bp,
        C: -cfg.pesoComplessita * n.modificatori.complessita_c,
        piSTR: -penalitaStr(n.stato_prima.stress_str, cfg),
        DEB: -cfg.pesoDebito * n.stato_prima.debito_deb
      },
      micro_azione: eMicroAzione(n),
      azione_di_cura: eAzioneDiCura(n)
    };
  }

  var API = {
    CONFIG: CONFIG,
    ESITO: ESITO,
    RIP: RIP, SUPPORTO: SUPPORTO, DELEGA: DELEGA, DISPONIBILITA: DISPONIBILITA,
    ADATTAMENTO: ADATTAMENTO, MACRO: MACRO, PROFILO: PROFILO,
    IN_ITALIANO: IN_ITALIANO, inItaliano: inItaliano,
    clampInt: clampInt, clampFloat: clampFloat, arrotondaComePython: arrotondaComePython,
    penalitaStr: penalitaStr,
    normalizzaNodo: normalizzaNodo,
    controllaNodo: controllaNodo,
    calcolaPn: calcolaPn,
    margineCampo: margineCampo,
    eMicroAzione: eMicroAzione,
    eAzioneDiCura: eAzioneDiCura,
    rischioSovraAdattamento: rischioSovraAdattamento,
    classificaEsito: classificaEsito,
    eseguiNodo: eseguiNodo
  };

  globale.Nucleo = API;
  if (typeof module !== 'undefined' && module.exports) { module.exports = API; }

})(typeof window !== 'undefined' ? window : globalThis);
