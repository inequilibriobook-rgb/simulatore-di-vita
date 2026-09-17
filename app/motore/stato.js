/* =============================================================================
   SIMULATORE 3.0 — Aggiornamento dello stato dopo il nodo  (Fase 1)
   =============================================================================
   Traduzione fedele di simulatore_v31_core_finale.py righe 999-1310 e 1487-1615.
   Nessun valore reinterpretato: ogni costante e ogni soglia è copiata dal Python.

   È il pezzo che trasforma "un calcolo" in "una simulazione": senza di questo
   ogni gesto resta isolato e il carico non si accumula mai.
   ========================================================================== */

(function (globale) {
  'use strict';

  var N = globale.Nucleo;
  var CAL = globale.Calibrazione;      // app/dati/calibrazione.js — Apparato F voce 7

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
    throw new Error('stato.js non può partire: ' +
      (mancanti.length === 1
        ? 'gli manca il modulo ' + mancanti[0] + ', e gli serve per aggiornare il carico dopo ogni gesto.'
        : 'gli mancano i moduli ' + mancanti.join(' e ') + ', e gli servono per aggiornare il carico dopo ogni gesto.') +
      ' Ordine di caricamento: nucleo.js, calibrazione.js, casuale-mt.js, stato.js, ' +
      'microsemantica.js, tempo.js, settimana-tipo.js, e i dati prima di chi li usa.');
  }([['Nucleo (nucleo.js)', N], ['Calibrazione (app/dati/calibrazione.js)', CAL]]
    .filter(function (c) { return !c[1]; })
    .map(function (c) { return c[0]; })));

  var clampInt = N.clampInt, clampFloat = N.clampFloat, arr = N.arrotondaComePython;
  var E = N.ESITO;

  /* Python: int(x) tronca verso zero, non arrotonda. Serve distinguerlo. */
  function tronca(x) { return x < 0 ? Math.ceil(x) : Math.floor(x); }

  var RIP_CATTIVA = ['assente', 'finta', 'debole'];
  var RIP_BUONA = ['vera', 'piena'];

  /* --- predicati di supporto e adattamento --------------------------- */
  function supReale(s) {
    return ['pratico', 'informativo', 'logistico', 'professionale'].indexOf(s.tipo) >= 0
      && s.riduzione_carico > 0.25 && s.competenza > 0.25 && s.tempestivo;
  }
  function supFinto(s) {
    return ['simbolico', 'inefficace', 'emotivo'].indexOf(s.tipo) >= 0 && s.riduzione_carico < 0.25;
  }
  function delReale(s) {
    return s.delega === 'reale' && s.riduzione_carico >= 0.50 && s.competenza >= 0.40;
  }
  function supInvasivo(s) {                                     // [py:502]
    return s.tipo === 'invasivo' || s.delega === 'invasiva' || s.costo_confine >= 0.60;
  }
  function adOperativo(a) {                                     // [py:536]
    return a.disponibilita === 'reale' || a.disponibilita === 'parziale';
  }

  /* --- MicroActionDamping V3.1 --------------------------------------- */
  var PAROLE_STRESSOR = ['micro_stressor', 'stressor', 'imprevisto', 'imprevisti', 'fretta',
    'urgente', 'ritardo', 'errore', 'mancante', 'perso', 'persa',
    'smarrito', 'chiavi', 'chiave', 'telefono', 'scarico', 'batteria',
    'porta', 'gas', 'luci', 'finestra',
    'portafoglio', 'documento', 'documenti', 'interruzione', 'deviazione'];

  function fuga(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  function eMicroStressor(n) {                                  // [py:869]
    if (!N.eMicroAzione(n)) { return false; }
    var testo = (n.id + ' ' + n.descrizione + ' ' + n.famiglia + ' ' + n.etichette.join(' ')).toLowerCase();
    return PAROLE_STRESSOR.some(function (k) {
      return new RegExp('(?:^|[^\\w])' + fuga(k) + '(?![\\w])').test(testo);
    });
  }

  function fattoreSmorzamento(n) {                              // [py:879]
    if (!N.eMicroAzione(n)) { return 1.0; }
    var materiale = n.modificatori.materiale_m;
    var compl = n.modificatori.complessita_c;
    var forzaCampo = n.campo.attivo ? n.campo.forza : 0;
    var pressione = Math.min(0, n.modificatori.tempo_t);
    var costoAd = n.adattamento.costo;
    var carico = 0;
    if (materiale < 0) { carico += Math.abs(materiale); }
    if (compl > 1) { carico += compl - 1; }
    if (forzaCampo > 0) { carico += tronca(forzaCampo / 10); }
    if (pressione < 0) { carico += tronca(Math.abs(pressione) / 3); }
    if (costoAd > 0) { carico += tronca(costoAd / 5); }
    if (carico <= 1) { return 0.15; }
    if (carico <= 4) { return 0.25; }
    if (carico <= 8) { return 0.50; }
    return 1.0;
  }

  function creditoRecupero(n, esito, margineNetto) {            // [py:910]
    if (!N.eAzioneDiCura(n)) { return 0.0; }
    if (esito === E.PULITO && margineNetto >= 10) { return 1.0; }
    if (esito === E.COSTOSO && margineNetto >= 0) { return 0.5; }
    return 0.0;
  }

  /* --- costo nascosto ------------------------------------------------ */
  var BASE_COSTO = {};
  BASE_COSTO[E.PULITO] = 0;  BASE_COSTO[E.COSTOSO] = 5;  BASE_COSTO[E.DANNEGGIATO] = 10;
  BASE_COSTO[E.TOSSICO] = 18; BASE_COSTO[E.TECNICO_UMANO] = 22; BASE_COSTO[E.FALL_LIEVE] = 6;
  BASE_COSTO[E.FALL_TECNICO] = 7; BASE_COSTO[E.FALL_SISTEMICO] = 18; BASE_COSTO[E.QUASI_COLLASSO] = 25;

  function deltaCostoNascosto(nodo, esito, margineNetto) {      // [py:998]
    var n = N.normalizzaNodo(nodo);
    var base = BASE_COSTO[esito] || 0;
    if (Math.abs(margineNetto) <= 9) { base += 3; }
    if (supReale(n.supporto) || delReale(n.supporto)) { base -= tronca(6 * n.supporto.riduzione_carico); }
    if (supFinto(n.supporto) || supInvasivo(n.supporto)) { base += 5; }
    if (n.adattamento.costo) { base += tronca(n.adattamento.costo * 0.5); }
    if (N.eMicroAzione(n)) {
      base = arr(base * fattoreSmorzamento(n));
      if (N.eAzioneDiCura(n) && (esito === E.PULITO || esito === E.COSTOSO) && margineNetto >= 0) {
        base = Math.max(0, base - tronca(creditoRecupero(n, esito, margineNetto)));
      }
    }
    return clampInt(base, 0, 30);
  }

  /* --- ΔSTR ---------------------------------------------------------- */
  var BASE_STR = {};
  BASE_STR[E.PULITO] = -2; BASE_STR[E.COSTOSO] = 4; BASE_STR[E.DANNEGGIATO] = 8;
  BASE_STR[E.TOSSICO] = 12; BASE_STR[E.TECNICO_UMANO] = 15; BASE_STR[E.FALL_TECNICO] = 5;
  BASE_STR[E.FALL_LIEVE] = 7; BASE_STR[E.FALL_SISTEMICO] = 15;

  function deltaStr(nodo, esito, margineNetto) {                // [py:1038]
    var n = N.normalizzaNodo(nodo);
    var base = (esito in BASE_STR) ? BASE_STR[esito] : 20;      // QUASI_COLLASSO -> 20

    if (supReale(n.supporto) || delReale(n.supporto)) { base -= tronca(8 * n.supporto.riduzione_carico); }
    if (RIP_BUONA.indexOf(n.stato_prima.rip) >= 0) { base -= 4; }
    if (adOperativo(n.adattamento)) { base -= tronca(5 * n.adattamento.riduzione_attesa); }
    if (n.campo.attivo && n.campo.forza >= 25) { base += 4; }
    if (supInvasivo(n.supporto)) { base += 3; }

    if (N.eMicroAzione(n)) {
      var smorz = fattoreSmorzamento(n);
      var stressor = eMicroStressor(n);
      if (base > 0) { base = arr(base * (stressor ? Math.max(smorz, 0.65) : smorz)); }
      base = arr(base - creditoRecupero(n, esito, margineNetto));

      if (stressor && esito === E.PULITO) {
        var risolto = margineNetto >= 35 ? -4 : (margineNetto >= 10 ? -3 : -2);
        base = clampInt(Math.min(base, risolto), -4, -2);
      } else if (stressor && esito === E.COSTOSO) {
        base = clampInt(base, 2, 3);
      } else if (stressor && esito === E.FALL_LIEVE) {
        base = clampInt(base, 2, 3);
      } else if (stressor && (esito === E.FALL_TECNICO || esito === E.FALL_SISTEMICO || esito === E.QUASI_COLLASSO)) {
        base = 4;
      } else if (stressor && n.campo.attivo && n.campo.forza >= 25) {
        base = clampInt(base + 2, 2, 4);
      } else if (stressor) {
        base = clampInt(base, -4, 4);
      } else if (esito === E.FALL_LIEVE) {
        base = clampInt(base, 0, 2);
      } else if (esito === E.FALL_TECNICO || esito === E.FALL_SISTEMICO || esito === E.QUASI_COLLASSO) {
        base = clampInt(base, 1, 4);
      } else if (n.campo.attivo && n.campo.forza >= 25) {
        base = clampInt(base + 2, 1, 4);
      } else {
        base = clampInt(base, -2, 2);
      }
    }
    return base;
  }

  /* --- ΔPOS ---------------------------------------------------------- */
  var BASE_POS = {};
  BASE_POS[E.PULITO] = 2; BASE_POS[E.COSTOSO] = -1; BASE_POS[E.DANNEGGIATO] = -4;
  BASE_POS[E.TOSSICO] = -7; BASE_POS[E.TECNICO_UMANO] = -9; BASE_POS[E.FALL_TECNICO] = -3;
  BASE_POS[E.FALL_LIEVE] = -5; BASE_POS[E.FALL_SISTEMICO] = -10;

  function deltaPos(nodo, esito, margineNetto) {                // [py:1106]
    var n = N.normalizzaNodo(nodo);
    var d = (esito in BASE_POS) ? BASE_POS[esito] : -15;        // QUASI_COLLASSO -> -15
    if (supReale(n.supporto) || delReale(n.supporto)) { d += tronca(5 * n.supporto.riduzione_carico); }
    if (n.adattamento.crea_rip_reale) { d += 3; }
    if (supInvasivo(n.supporto)) { d -= 4; }
    if (N.eMicroAzione(n)) {
      if (N.eAzioneDiCura(n) && (esito === E.PULITO || esito === E.COSTOSO) && margineNetto >= 0) {
        d = Math.max(d, 1);
      } else if (esito === E.COSTOSO && margineNetto >= 0) {
        d = Math.max(d, 0);
      } else if (esito === E.FALL_LIEVE) {
        d = Math.max(d, -2);
      }
    }
    return d;
  }

  /* --- ΔDEB ---------------------------------------------------------- */
  function deltaDeb(nodo, esito) {                              // [py:1146]
    var n = N.normalizzaNodo(nodo), s = n.stato_prima;
    var strAlto = s.stress_str >= 70;
    var ripCattiva = RIP_CATTIVA.indexOf(s.rip) >= 0;
    var esitoCattivo = [E.TOSSICO, E.TECNICO_UMANO, E.FALL_SISTEMICO, E.QUASI_COLLASSO, E.DANNEGGIATO].indexOf(esito) >= 0;
    var senzaAdattamento = !adOperativo(n.adattamento);
    if (strAlto && ripCattiva && esitoCattivo && senzaAdattamento) { return 1; }
    if (adOperativo(n.adattamento) || supReale(n.supporto) || RIP_BUONA.indexOf(s.rip) >= 0) {
      return s.debito_deb > 0 ? -1 : 0;
    }
    return 0;
  }

  /* --- BP e RIP successivi ------------------------------------------- */
  function prossimoBp(nodo, esito) {                            // [py:1166]
    var n = N.normalizzaNodo(nodo);
    if ([E.FALL_SISTEMICO, E.QUASI_COLLASSO, E.TOSSICO].indexOf(esito) >= 0) { return 0; }
    var bp = 0;
    if (supReale(n.supporto)) { bp += 5; }
    if (delReale(n.supporto)) { bp += 8; }
    if (adOperativo(n.adattamento)) { bp += 5; }
    if (n.adattamento.crea_rip_reale) { bp += 5; }
    return clampInt(bp, 0, 15);
  }

  function prossimoRip(nodo, esito) {                           // [py:1182]
    var n = N.normalizzaNodo(nodo);
    if (n.adattamento.crea_rip_reale && esito !== E.QUASI_COLLASSO) {
      return n.adattamento.disponibilita === 'tardiva' ? 'tardiva' : 'vera';
    }
    if (esito === E.PULITO) { return 'assente'; }
    if (esito === E.COSTOSO && adOperativo(n.adattamento)) { return 'debole'; }
    if (esito === E.TOSSICO || esito === E.TECNICO_UMANO) { return 'finta'; }
    if (esito === E.FALL_SISTEMICO || esito === E.QUASI_COLLASSO) { return 'assente'; }
    return n.stato_prima.rip;
  }

  /* --- ri4 (rientro, riparazione, riduzione, ripresa) ---------------- */
  var D_RI4 = {};
  D_RI4[E.PULITO]        = [ 0.03,  0.02,  0.02,  0.04];
  D_RI4[E.COSTOSO]       = [ 0.01,  0.01, -0.01,  0.02];
  D_RI4[E.DANNEGGIATO]   = [-0.03, -0.02, -0.04, -0.02];
  D_RI4[E.TOSSICO]       = [-0.08, -0.05, -0.08, -0.07];
  D_RI4[E.TECNICO_UMANO] = [-0.08, -0.05, -0.08, -0.07];
  D_RI4[E.FALL_TECNICO]  = [-0.02,  0.00, -0.03, -0.02];
  D_RI4[E.FALL_LIEVE]    = [-0.03, -0.01, -0.04, -0.03];
  D_RI4[E.FALL_SISTEMICO]= [-0.10, -0.08, -0.10, -0.08];
  D_RI4[E.QUASI_COLLASSO]= [-0.18, -0.15, -0.18, -0.15];

  function aggiornaRi4(nodo, esito, deltaCosto) {               // [py:1200]
    var n = N.normalizzaNodo(nodo);
    var r = n.stato_prima.ri4;
    var d = D_RI4[esito] || [0, 0, 0, 0];
    var dr = d[0], dd = d[1], dp = d[2], du = d[3];

    if (delReale(n.supporto))      { dp += 0.10; dr += 0.06; }
    else if (supReale(n.supporto)) { dp += 0.06; dr += 0.04; }
    if (n.adattamento.crea_rip_reale) { dd += 0.10; du += 0.05; }
    if (supFinto(n.supporto))      { dp -= 0.04; }
    if (deltaCosto >= 15)          { dr -= 0.04; du -= 0.04; }

    return {
      rientro:     clampFloat(r.rientro + dr, 0, 1),
      riparazione: clampFloat(r.riparazione + dd, 0, 1),
      riduzione:   clampFloat(r.riduzione + dp, 0, 1),
      ripresa:     clampFloat(r.ripresa + du, 0, 1)
    };
  }
  function punteggioRi4(r) { return clampFloat((r.rientro + r.riparazione + r.riduzione + r.ripresa) / 4, 0, 1); }

  /* --- or1 (orientamento) -------------------------------------------- */
  var D_OR1 = {};
  D_OR1[E.PULITO] = 0.05; D_OR1[E.COSTOSO] = -0.02; D_OR1[E.DANNEGGIATO] = -0.06;
  D_OR1[E.TOSSICO] = -0.10; D_OR1[E.TECNICO_UMANO] = -0.12; D_OR1[E.FALL_TECNICO] = -0.03;
  D_OR1[E.FALL_LIEVE] = -0.05; D_OR1[E.FALL_SISTEMICO] = -0.15; D_OR1[E.QUASI_COLLASSO] = -0.25;

  function prossimoOr1(nodo, esito) {                           // [py:1241]
    var n = N.normalizzaNodo(nodo);
    var v = n.stato_prima.or1 + (D_OR1[esito] || 0);
    if (adOperativo(n.adattamento)) { v += 0.08; }
    if (supReale(n.supporto) || delReale(n.supporto)) { v += 0.06; }
    return clampFloat(v, 0, 1);
  }

  /* --- pavimento e cooldown ------------------------------------------ */
  function pavimentoECooldown(stato, esito) {                   // [py:1263]
    var s = N.normalizzaNodo({ stato_prima: stato }).stato_prima;
    var pavimento = s.floor1_attivo, motivo = s.floor1_motivo;
    var cooldown = Math.max(0, s.cooldown - 1);

    if (s.stress_str >= CAL.valore('porta_pavimento_carico')
        || s.posizione_pos <= CAL.valore('porta_pavimento_assetto')
        || s.costo_nascosto >= CAL.valore('porta_pavimento_costo')) {
      pavimento = true;
      /* IL MOTIVO LO LEGGE UNA PERSONA, NON IL PROGRAMMA.
         Qui c'era scritto «STR/POS/costo in area rossa»: tre sigle e una
         metafora, cioe' esattamente il gergo che dal motore non deve uscire.
         Le stesse tre grandezze, dette come le dice il resto delle pagine,
         sono il carico, l'assetto e il costo nascosto. */
      /* Riscritto il 16/09/2026 con la voce da racconto: le tre porte in un
         periodo solo, e il perché dentro la frase. Le parole che i test
         cercano («Almeno una», «assetto basso», «carico», «costo nascosto»)
         sono le stesse. */
      motivo = 'Almeno una soglia del modello è stata superata: può essere il carico, ' +
               'troppo alto, oppure l’assetto basso, oppure il costo nascosto (quello ' +
               'che si paga più avanti, non subito), troppo alto. Ora serve un rientro ' +
               'vero, perché si esce solo se le cose migliorano davvero, e una pausa ' +
               'qualsiasi non basta.';
      cooldown = Math.max(cooldown, 2);                          // cooldown_min_after_red + 1
    } else if ([E.FALL_SISTEMICO, E.QUASI_COLLASSO, E.TOSSICO].indexOf(esito) >= 0) {
      pavimento = true;
      /* «prendere in carico qualcos'altro» era burocratese: a voce si dice
         che ci si rimette a fare altro */
      motivo = 'Questo gesto è finito in un modo che pesa troppo, e non si può andare avanti ' +
               'come prima. Serve un rientro vero, una pausa che sia davvero una pausa, e ' +
               'solo dopo ci si può rimettere a fare altro.';
      cooldown = Math.max(cooldown, 1);                          // cooldown_min_after_red
    } else if (s.stress_str <= 55 && s.posizione_pos >= 50 && s.costo_nascosto <= 35 && punteggioRi4(s.ri4) >= 0.50) {
      pavimento = false; motivo = '';
    }
    return { pavimento: pavimento, motivo: motivo, cooldown: cooldown };
  }

  /* --- livello di rischio --------------------------------------------
     LE OTTO FASCE HANNO UN NOME DI PROGRAMMA E UNO ITALIANO, E SERVONO
     TUTTI E DUE.

     `rosso_sistemico`, `estremo_diagnostico`, `fragile_grave_pre_rosso` sono
     chiavi: il codice le confronta, non le legge nessuno. Ma bastava che una
     pagina stampasse `r.rischio` invece di cercarlo in una tabella perche' a
     un infermiere comparisse davanti la parola «fragile_grave_pre_rosso» —
     che non e' italiano, non e' inglese, e non spiega niente.

     Percio' il nome italiano nasce qui, accanto alla funzione che decide la
     fascia, e non in una tabella lontana che si dimentica di crescere.

     LE PAROLE SONO SCELTE PER NON SPAVENTARE PIU' DEL DOVUTO.
     Una fascia dice quanto e' carico il sistema in quel momento, non che
     cosa succedera' alla persona: «il sistema regge, ma non ha margine» e'
     una descrizione, «pre-collasso» sarebbe una previsione — e una previsione
     il modello non la fa. Chi legge questi nomi, spesso, sta guardando la
     giornata di qualcuno a cui vuole bene. */
  var FASCE_DI_RISCHIO = {
    ordinario: {
      nome: 'Nessun carico particolare',
      spiega: 'Il carico è quello di una giornata qualunque, e l’assetto tiene: il ' +
              'sistema ha ancora margine per un imprevisto.'
    },
    fragile_lieve: {
      nome: 'Un po’ sotto pressione',
      /* «margine» qui vuol dire lo spazio per un imprevisto, non la distanza
         dal dado che il racconto insegna con la stessa parola: si scioglie
         fra parentesi, come gia' nella fascia «Al limite del margine». Ogni
         fascia si legge da sola, e ognuna e' la prima comparsa della parola. */
      spiega: 'Il carico è salito, o l’assetto è sceso, quel tanto che si sente. Per ora ' +
              'non cambia niente di quello che si riesce a fare, ma il margine (lo spazio ' +
              'per un imprevisto) è meno di prima.'
    },
    fragile_medio: {
      nome: 'Sotto pressione',
      spiega: 'Il carico è alto, e si fa sentire su tutto il resto della giornata: le ' +
              'cose riescono ancora, ma costano più del solito.'
    },
    fragile_grave_pre_rosso: {
      nome: 'Al limite del margine',
      spiega: 'Il sistema regge, ma non ha quasi più margine (lo spazio per un imprevisto), ' +
              'e un imprevisto in più, adesso, non troverebbe niente da cui attingere. È il ' +
              'punto in cui conviene togliere qualcosa, non aggiungerlo.'
    },
    rosso_controllabile: {
      nome: 'Carico alto, ma ancora governabile',
      spiega: 'Questa fascia può dipendere dal carico alto, oppure dall’assetto basso, e ' +
              'conta quale delle due pesa di più, e come cambia lo stato con un rientro o ' +
              'un aiuto concreto. La fascia non decide da sola che cosa accadrà.'
    },
    rosso_sistemico: {
      nome: 'Carico alto che si tiene da sé',
      spiega: 'Carico alto e assetto basso insieme, e ormai si sostengono a vicenda. Non ' +
              'è più una giornata storta: è il modo in cui la settimana è messa, e a ' +
              'questo punto il singolo gesto non è più la leva.'
    },
    estremo_diagnostico: {
      nome: 'Fuori dalla scala ordinaria',
      spiega: 'I valori sono così estremi che il modello non distingue più una ' +
              'situazione dall’altra: qui serve a segnalare, non a misurare, e non è una ' +
              'diagnosi. È proprio il momento in cui un numero conta meno di una ' +
              'persona.'
    },
    quasi_collasso: {
      nome: 'Quasi collasso',
      spiega: 'È la fascia estrema del modello. Può derivare dall’esito del gesto ' +
              'oppure da carico altissimo, assetto molto basso e debito attivo insieme. ' +
              'La fascia da sola non dice se manca anche un rientro vero, e non è ' +
              'comunque una diagnosi.'
    }
  };

  /* Il nome italiano di una fascia. Se un giorno la fascia cambiasse nome
     senza passare di qui, meglio far vedere la chiave con gli spazi al posto
     dei trattini bassi che lasciare un vuoto: si legge male, ma si legge. */
  function nomeRischio(chiave) {
    var f = FASCE_DI_RISCHIO[chiave];
    if (f) { return f.nome; }
    return chiave ? String(chiave).replace(/_/g, ' ') : 'rischio non classificato';
  }

  function livelloRischio(stato, esito) {                       // [py:classify_risk]
    var s = N.normalizzaNodo({ stato_prima: stato }).stato_prima;
    if (esito === E.QUASI_COLLASSO) { return 'quasi_collasso'; }
    if (s.stress_str >= 90 && s.posizione_pos <= 20 && s.debito_deb >= 1) { return 'quasi_collasso'; }
    if (s.stress_str >= 85 && s.posizione_pos <= 30) { return 'estremo_diagnostico'; }
    if (s.stress_str >= 80 && s.posizione_pos <= 35) { return 'rosso_sistemico'; }
    if (s.stress_str >= 70 || s.posizione_pos <= 35) { return 'rosso_controllabile'; }
    if (s.stress_str >= 60 || s.posizione_pos <= 45 || s.debito_deb >= 2) { return 'fragile_grave_pre_rosso'; }
    if (s.stress_str >= 50 || s.posizione_pos <= 55 || s.debito_deb === 1) { return 'fragile_medio'; }
    if (s.stress_str >= 40 || s.posizione_pos <= 60) { return 'fragile_lieve'; }
    return 'ordinario';
  }

  /* --- LO STATO DOPO IL NODO ----------------------------------------- */
  function statoDopoIlNodo(nodo, esito, margineNetto, deltaCosto) {  // [py:1284]
    var n = N.normalizzaNodo(nodo), s = n.stato_prima;
    var dStr = deltaStr(n, esito, margineNetto);
    var dPos = deltaPos(n, esito, margineNetto);
    var dDeb = deltaDeb(n, esito);

    var prov = N.normalizzaNodo({ stato_prima: {
      stress_str:     clampInt(s.stress_str + dStr, 0, 100),
      posizione_pos:  clampInt(s.posizione_pos + dPos, 0, 100),
      debito_deb:     Math.max(0, s.debito_deb + dDeb),
      bonus_bp:       prossimoBp(n, esito),
      rip:            prossimoRip(n, esito),
      or1:            prossimoOr1(n, esito),
      ri4:            aggiornaRi4(n, esito, deltaCosto),
      macro:          s.macro,
      cooldown:       s.cooldown,
      floor1_attivo:  s.floor1_attivo,
      floor1_motivo:  s.floor1_motivo,
      costo_nascosto: clampInt(s.costo_nascosto + deltaCosto, 0, 100)
    }}).stato_prima;

    var pc = pavimentoECooldown(prov, esito);
    prov.floor1_attivo = pc.pavimento;
    prov.floor1_motivo = pc.motivo;
    prov.cooldown = pc.cooldown;
    return prov;
  }

  /* --- ESEGUI UN NODO CON AGGIORNAMENTO DI STATO --------------------- */
  function eseguiNodoCompleto(nodo, opzioni) {
    var r = N.eseguiNodo(nodo, opzioni);
    r.delta_costo_nascosto = deltaCostoNascosto(nodo, r.esito, r.margine_netto);
    r.stato_dopo = statoDopoIlNodo(nodo, r.esito, r.margine_netto, r.delta_costo_nascosto);
    r.rischio = livelloRischio(r.stato_dopo, r.esito);
    r.delta = {
      STR: r.stato_dopo.stress_str - r.stato_prima.stress_str,
      POS: r.stato_dopo.posizione_pos - r.stato_prima.posizione_pos,
      DEB: r.stato_dopo.debito_deb - r.stato_prima.debito_deb,
      costo_nascosto: r.stato_dopo.costo_nascosto - r.stato_prima.costo_nascosto
    };
    return r;
  }

  /* --- LA CATENA: lo stato passa da un gesto al successivo ----------- */
  function applicaStatoAlNodo(nodo, stato) {                    // [py:apply_state_to_node]
    /* il nodo normalizzato e' condiviso (vedi normalizzaNodo): qui se ne fa
       una copia superficiale prima di cambiargli lo stato, cosi' chi lo
       aveva in mano lo ritrova com'era */
    var n0 = N.normalizzaNodo(nodo), n = {};
    for (var k in n0) { if (Object.prototype.hasOwnProperty.call(n0, k)) { n[k] = n0[k]; } }
    n.stato_prima = stato;
    return n;
  }

  var ORDINE_AGG = [E.QUASI_COLLASSO, E.FALL_SISTEMICO, E.TOSSICO, E.TECNICO_UMANO];

  function esitoAggregato(esiti, statoFinale) {                 // [py:classify_aggregate_outcome]
    var s = N.normalizzaNodo({ stato_prima: statoFinale }).stato_prima;
    if (!esiti.length) { return E.FALL_TECNICO; }
    if (esiti.indexOf(E.QUASI_COLLASSO) >= 0) { return E.QUASI_COLLASSO; }
    if (esiti.indexOf(E.FALL_SISTEMICO) >= 0 && s.stress_str >= 75) { return E.FALL_SISTEMICO; }
    if (esiti.indexOf(E.TOSSICO) >= 0) { return E.TOSSICO; }
    if (esiti.indexOf(E.TECNICO_UMANO) >= 0) { return E.TECNICO_UMANO; }
    if (s.stress_str >= 80 && s.posizione_pos <= 35) { return E.DANNEGGIATO; }
    if (esiti.indexOf(E.FALL_TECNICO) >= 0) {
      if (s.stress_str < 70 && s.posizione_pos >= 45) { return E.FALL_TECNICO; }
      return E.DANNEGGIATO;
    }
    if (esiti.indexOf(E.DANNEGGIATO) >= 0) { return E.DANNEGGIATO; }
    if (esiti.indexOf(E.COSTOSO) >= 0) { return E.COSTOSO; }
    if (esiti.every(function (o) { return o === E.PULITO; })) { return E.PULITO; }
    return E.FALL_LIEVE;
  }

  function eseguiScena(nodi, opzioni) {                         // [py:run_scene]
    opzioni = opzioni || {};
    if (!nodi || !nodi.length) { return null; }
    var statoIniziale = N.normalizzaNodo(nodi[0]).stato_prima;
    var stato = statoIniziale;
    var risultati = [];
    for (var i = 0; i < nodi.length; i++) {
      var conStato = applicaStatoAlNodo(nodi[i], stato);
      var r = eseguiNodoCompleto(conStato, {
        rng: opzioni.rng,
        tiro: (opzioni.tiri && i < opzioni.tiri.length) ? opzioni.tiri[i] : undefined
      });
      risultati.push(r);
      stato = r.stato_dopo;
    }
    var esiti = risultati.map(function (r) { return r.esito; });
    var esito = esitoAggregato(esiti, stato);
    var conteggi = {};
    esiti.forEach(function (e) { conteggi[e] = (conteggi[e] || 0) + 1; });
    return {
      nodi: risultati,
      stato_iniziale: statoIniziale,
      stato_finale: stato,
      esito: esito,
      rischio: livelloRischio(stato, esito),
      conteggi: conteggi,
      delta: {
        STR: stato.stress_str - statoIniziale.stress_str,
        POS: stato.posizione_pos - statoIniziale.posizione_pos,
        DEB: stato.debito_deb - statoIniziale.debito_deb,
        costo_nascosto: stato.costo_nascosto - statoIniziale.costo_nascosto,
        or1: Math.round((stato.or1 - statoIniziale.or1) * 1000) / 1000,
        ri4: Math.round((punteggioRi4(stato.ri4) - punteggioRi4(statoIniziale.ri4)) * 1000) / 1000
      }
    };
  }

  /* --- recupero parziale fra una scena e l'altra --------------------- */
  function recuperoFraScene(stato) {                            // [py:1487]
    var s = N.normalizzaNodo({ stato_prima: stato }).stato_prima;
    var f = CAL.valore('recupero_fra_scene');                    // scene_recovery_factor
    var ri4 = punteggioRi4(s.ri4);
    var rid  = tronca(Math.max(0, s.stress_str - CAL.valore('pavimento_carico_scene')) * f * ri4);
    var gain = tronca(Math.max(0, CAL.valore('tetto_assetto_scene') - s.posizione_pos) * f * ri4);
    var ridC = tronca(Math.max(0, s.costo_nascosto - CAL.valore('pavimento_costo_scene')) * f * ri4);
    var deb = s.debito_deb;
    if (RIP_BUONA.indexOf(s.rip) >= 0 && ri4 >= 0.60 && deb > 0) { deb -= 1; }
    return N.normalizzaNodo({ stato_prima: {
      stress_str:     clampInt(s.stress_str - rid, 0, 100),
      posizione_pos:  clampInt(s.posizione_pos + gain, 0, 100),
      debito_deb:     Math.max(0, deb),
      bonus_bp:       Math.max(0, tronca(s.bonus_bp * 0.5)),
      rip:            s.rip,
      or1:            clampFloat(s.or1 + 0.02 * ri4, 0, 1),
      ri4:            s.ri4,
      macro:          s.macro,
      cooldown:       Math.max(0, s.cooldown - 1),
      floor1_attivo:  s.floor1_attivo,
      floor1_motivo:  s.floor1_motivo,
      costo_nascosto: clampInt(s.costo_nascosto - ridC, 0, 100)
    }}).stato_prima;
  }

  var API = {
    deltaStr: deltaStr, deltaPos: deltaPos, deltaDeb: deltaDeb,
    deltaCostoNascosto: deltaCostoNascosto,
    prossimoBp: prossimoBp, prossimoRip: prossimoRip, prossimoOr1: prossimoOr1,
    aggiornaRi4: aggiornaRi4, punteggioRi4: punteggioRi4,
    pavimentoECooldown: pavimentoECooldown, livelloRischio: livelloRischio,
    FASCE_DI_RISCHIO: FASCE_DI_RISCHIO, nomeRischio: nomeRischio,
    eMicroStressor: eMicroStressor, fattoreSmorzamento: fattoreSmorzamento,
    creditoRecupero: creditoRecupero,
    statoDopoIlNodo: statoDopoIlNodo,
    eseguiNodoCompleto: eseguiNodoCompleto,
    eseguiScena: eseguiScena,
    esitoAggregato: esitoAggregato,
    recuperoFraScene: recuperoFraScene,
    applicaStatoAlNodo: applicaStatoAlNodo
  };

  globale.Stato = API;
  if (typeof module !== 'undefined' && module.exports) { module.exports = API; }

})(typeof window !== 'undefined' ? window : globalThis);
