/* =============================================================================
   SIMULATORE 3.0 — La giornata tipo e la settimana tipo
   =============================================================================
   Questo file non introduce modello. Costruisce solo gli INGRESSI dei livelli
   temporali: una giornata fatta di tre scene, una settimana fatta di giornate.
   Il calcolo resta tutto in tempo.js / stato.js / nucleo.js.

   PERCHÉ ESISTE
   La forma della giornata (tre scene, e quanto pesa ciascuna) era scritta
   dentro `_taratura/banco.js`, dove k è stato misurato. Se la pagina della
   settimana ne usasse una propria, la settimana mostrata all'utente e la
   settimana su cui k è stato tarato sarebbero due cose diverse, e k non
   varrebbe più per quello che si vede. Sta qui una volta sola, e la usano
   entrambi.

   LA FORMA DELLA GIORNATA — la stessa del banco di taratura
     mattina  P0 82   E −5  T −3  C 0     si parte riposati e le cose sono semplici
     centro   P0 62   E −9  T −7  C 2     il grosso del carico, più pezzi insieme
     sera     P0 70   E −9  T −5  C 2     meno pressione di tempo, corpo più stanco

   L'OSCILLAZIONE
   La durezza del singolo gesto oscilla del ±35 % attorno alla durezza di
   fondo della giornata. Una settimana non è un giorno ideale ripetuto: se lo
   fosse, la misura del recupero direbbe qualcosa che nella vita non capita.
   ========================================================================== */

(function (globale) {
  'use strict';

  var T = globale.Tempo;

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
    throw new Error('settimana-tipo.js non può partire: ' +
      (mancanti.length === 1
        ? 'gli manca il modulo ' + mancanti[0] + ', e gli serve per far girare la giornata e la settimana che costruisce.'
        : 'gli mancano i moduli ' + mancanti.join(' e ') + ', e gli servono per far girare la giornata e la settimana che costruisce.') +
      ' Ordine di caricamento: nucleo.js, calibrazione.js, casuale-mt.js, stato.js, ' +
      'microsemantica.js, tempo.js, settimana-tipo.js, e i dati prima di chi li usa.');
  }([['Tempo (tempo.js)', T]]
    .filter(function (c) { return !c[1]; })
    .map(function (c) { return c[0]; })));


  var FORMA = [
    { nome: 'mattina', p0: 82, E: -5, T: -3, C: 0 },
    { nome: 'centro',  p0: 62, E: -9, T: -7, C: 2 },
    { nome: 'sera',    p0: 70, E: -9, T: -5, C: 2 }
  ];

  /* generatore lineare deterministico: serve a far oscillare la durezza,
     NON a tirare i dadi. I dadi restano il Mersenne Twister di casuale-mt.js */
  function oscillatore(seme) {
    var s = seme >>> 0;
    return function () { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  }

  /* le durezze hanno un nome, così la pagina non mostra un numero nudo */
  var DUREZZE = [
    { id: 'leggera',  valore: 0.55, nome: 'leggera',   sotto: 'giorni ordinari, niente di straordinario' },
    { id: 'media',    valore: 1.00, nome: 'ordinaria', sotto: 'la settimana come capita di solito' },
    { id: 'dura',     valore: 1.60, nome: 'pesante',   sotto: 'scadenze, imprevisti, poco margine' }
  ];

  /* I PROFILI DI SONNO
     Il centro e' il profilo; le ampiezze dicono di quanto oscilla intorno.
     Il profilo `banco` e' quello con cui k e' stato tarato: centro 6,75 ore
     e ampiezza 2,5, cioe' l'intervallo 5,5-8,0 di `_taratura/banco.js`.
     Sta qui perche' la settimana mostrata e la settimana su cui k e' stato
     misurato devono poter essere la stessa cosa. */
  var SONNI = [
    { id: 'ottimo',  nome: 'buono',   sonno: { ore: 8.00, qualita: 0.85, continuita: 0.85,
        ampiezza_ore: 0.8, ampiezza_qualita: 0.10, ampiezza_continuita: 0.10 } },
    { id: 'normale', nome: 'normale', sonno: { ore: 7.00, qualita: 0.65, continuita: 0.70,
        ampiezza_ore: 1.4, ampiezza_qualita: 0.20, ampiezza_continuita: 0.20 } },
    { id: 'scarso',  nome: 'scarso',  sonno: { ore: 5.50, qualita: 0.45, continuita: 0.50,
        ampiezza_ore: 1.0, ampiezza_qualita: 0.20, ampiezza_continuita: 0.20 } },
    { id: 'banco',   nome: 'come al banco di taratura',
      sonno: { ore: 6.75, qualita: 0.625, continuita: 0.65,
        ampiezza_ore: 2.5, ampiezza_qualita: 0.35, ampiezza_continuita: 0.30 } }
  ];

  /* un profilo passato dall'esterno puo' non dichiarare le ampiezze */
  function conAmpiezze(s) {
    return {
      ore: s.ore, qualita: s.qualita, continuita: s.continuita,
      ampiezza_ore: s.ampiezza_ore === undefined ? 1.4 : s.ampiezza_ore,
      ampiezza_qualita: s.ampiezza_qualita === undefined ? 0.20 : s.ampiezza_qualita,
      ampiezza_continuita: s.ampiezza_continuita === undefined ? 0.20 : s.ampiezza_continuita
    };
  }

  /* --------------------------------------------------------------------
     UN NUMERO DI GIORNI, DI SETTIMANE O DI GESTI NON PUÒ ESSERE ZERO O
     NEGATIVO, E «0 || 7» NON SE NE ACCORGE.

     Misurato il 15/09/2026: `opzioni.giorni || 7` legge zero come «non
     dato», e lo sostituisce con sette. Chi chiede zero giorni si ritrova
     con una settimana intera, senza nessun avviso. E chi chiede un numero
     negativo — o una scena con zero gesti — non riceve un avviso: riceve
     un crash tre passaggi più in là («null is not an object»), su una riga
     che non parla né di giorni né di gesti.

     Qui il controllo è uno solo, e dice subito qual è il problema: chi
     scrive un banco di prova deve trovare un errore, non un numero
     sbagliato o un crash senza indizi. */
  function interoPositivo(valore, nome) {
    if (typeof valore !== 'number' || !isFinite(valore) ||
        valore !== Math.floor(valore) || valore <= 0) {
      throw new Error('SettimanaTipo: il valore di «' + nome + '» deve essere un numero ' +
        'intero maggiore di zero. Ricevuto: ' + valore + '.');
    }
    return valore;
  }

  function durezza(id) {
    for (var i = 0; i < DUREZZE.length; i++) { if (DUREZZE[i].id === id) { return DUREZZE[i]; } }
    return DUREZZE[1];
  }
  function sonno(id) {
    for (var i = 0; i < SONNI.length; i++) { if (SONNI[i].id === id) { return SONNI[i]; } }
    return SONNI[1];
  }

  /* --------------------------------------------------------------------
     LO STATO DI PARTENZA

     Fino al 18/8 si potevano dare solo STR, POS e DEB. Bastava per generare
     una settimana da zero, e NON bastava per l'esperimento che conta:
     «si e' gia' dentro — che cosa tira fuori?». Quell'esperimento riparte da
     uno stato gia' compromesso, e uno stato compromesso non e' fatto solo di
     carico: ha un costo nascosto accumulato, un pavimento acceso, una
     capacita' di recupero (ri4) gia' consumata. Ripartendo con costo 0,
     pavimento spento e ri4 pieno si misurava l'uscita da un blocco che
     nessuno aveva.

     Se `stato` c'e', si usa quello intero. E' l'unico modo di misurare il
     rientro da dentro invece che da fuori.
     -------------------------------------------------------------------- */
  function statoDiPartenza(opzioni, str, pos, deb, rip) {
    if (opzioni.stato) {
      var base = {};
      for (var k in opzioni.stato) {
        if (Object.prototype.hasOwnProperty.call(opzioni.stato, k)) { base[k] = opzioni.stato[k]; }
      }
      if (rip) { base.rip = rip; }
      return base;
    }
    return { stress_str: str, posizione_pos: pos, debito_deb: deb, rip: rip };
  }

  /* --------------------------------------------------------------------
     UNA GIORNATA — tre scene di `nodiPerScena` gesti
     -------------------------------------------------------------------- */
  function giornata(opzioni) {
    var d = opzioni.durezza === undefined ? 1 : opzioni.durezza;
    var n = interoPositivo(opzioni.nodiPerScena === undefined ? 8 : opzioni.nodiPerScena,
      'gesti per scena');
    var rnd = opzioni.oscilla || function () { return 0.5; };
    var str = opzioni.str === undefined ? 40 : opzioni.str;
    var pos = opzioni.pos === undefined ? 58 : opzioni.pos;
    var deb = opzioni.deb === undefined ? 0 : opzioni.deb;
    var rip = opzioni.rip || 'debole';

    return FORMA.map(function (f, si) {
      var scena = [];
      for (var i = 0; i < n; i++) {
        var dd = d * (0.65 + 0.7 * rnd());
        scena.push({
          id: si + '_' + i,
          descrizione: f.nome + ' ' + (i + 1),
          p0: Math.round(f.p0 - 6 * (dd - 0.5)),
          modificatori: {
            energia_e: Math.round(f.E * dd),
            informazione_i: 0,
            tempo_t: Math.round(f.T * dd),
            materiale_m: Math.round(-2 * dd),
            bonus_bp: 0,
            complessita_c: Math.max(0, Math.round(f.C * dd))
          },
          stato_prima: statoDiPartenza(opzioni, str, pos, deb, rip)
        });
      }
      return scena;
    });
  }

  /* --------------------------------------------------------------------
     UNA SETTIMANA — n giornate, con il sonno fra l'una e l'altra
     Restituisce l'ELENCO dei giorni, pronto per Tempo.eseguiMiniSettimana.
     -------------------------------------------------------------------- */
  function elencoGiorni(opzioni) {
    opzioni = opzioni || {};
    var giorni = interoPositivo(opzioni.giorni === undefined ? 7 : opzioni.giorni, 'giorni');
    var rnd = oscillatore(opzioni.seme === undefined ? 424242 : opzioni.seme);
    var s = conAmpiezze(opzioni.sonno || sonno('normale').sonno);
    var oscillaSonno = opzioni.sonno_oscilla !== false;
    var elenco = [];
    for (var g = 0; g < giorni; g++) {
      /* ORDINE: prima i gesti, poi il sonno. Non e' estetica: l'oscillatore
         e' una sequenza, e cambiarne l'ordine di consumo cambia la settimana.
         Questo e' l'ordine con cui k e' stato tarato in `_taratura/banco.js`. */
      var scene = giornata({
        durezza: opzioni.durezza === undefined ? 1 : opzioni.durezza,
        nodiPerScena: opzioni.nodiPerScena,
        oscilla: rnd, stato: opzioni.stato,
        str: opzioni.str, pos: opzioni.pos, deb: opzioni.deb, rip: opzioni.rip
      });
      /* il sonno oscilla attorno al profilo scelto, come nella vita */
      var son = oscillaSonno ? {
        ore: s.ore + (rnd() - 0.5) * s.ampiezza_ore,
        qualita: Math.max(0.05, Math.min(1, s.qualita + (rnd() - 0.5) * s.ampiezza_qualita)),
        continuita: Math.max(0.05, Math.min(1, s.continuita + (rnd() - 0.5) * s.ampiezza_continuita))
      } : s;
      var voce = { titolo: 'Giorno ' + (g + 1), scene: scene, sonno: son };
      /* `rip_ogni_giorno` dice che quel rientro c'e' TUTTI i giorni, non solo
         il primo. Senza, il rientro dichiarato agisce una volta e poi il
         modello lo consuma: due vite diverse, e vanno potute distinguere. */
      if (opzioni.rip && opzioni.rip_ogni_giorno) { voce.rip = opzioni.rip; }
      elenco.push(voce);
    }
    return elenco;
  }

  /* --------------------------------------------------------------------
     ESEGUE la settimana, con la calibrazione giusta per la granularità.
     È qui che k entra in gioco: f = k / n, con n = nodi totali del giorno.
     -------------------------------------------------------------------- */
  function eseguiSettimana(opzioni) {
    opzioni = opzioni || {};
    var n = interoPositivo(opzioni.nodiPerScena === undefined ? 8 : opzioni.nodiPerScena,
      'gesti per scena');
    var totNodi = n * FORMA.length;
    var k = opzioni.k === undefined ? (T ? T.K_TARATO : 2.75) : opzioni.k;
    var cal = (k === null) ? null : T.calibrazionePerGiornata(totNodi, k);
    var elenco = elencoGiorni(opzioni);
    var seme = opzioni.seme === undefined ? 424242 : opzioni.seme;
    var risultato = T.eseguiMiniSettimana(elenco, {
      rng: opzioni.rng || new globale.CasualePython(seme),
      calibrazione: cal,
      titolo: opzioni.titolo || 'Una settimana'
    });
    /* elencoGiorni valida gia' che i giorni siano un intero positivo, quindi
       `risultato` qui non e' mai nullo: la guardia resta per chi chiama
       Tempo.eseguiMiniSettimana direttamente, con un elenco proprio. */
    if (!risultato) { return null; }
    risultato.k = k;
    risultato.nodi_per_giorno = totNodi;
    return risultato;
  }

  /* --------------------------------------------------------------------
     LA TRAIETTORIA — n settimane, con il regime che cambia settimana per
     settimana. Usa lo stesso generatore della settimana singola: se la
     traiettoria avesse una propria forma di giornata, la spirale misurata
     su di essa non varrebbe per la settimana che si vede nella pagina.

     Ogni settimana puo' avere una propria durezza — l'elenco `durezze`, se
     c'e', sostituisce `opzioni.durezza` settimana per settimana. Serve a
     costruire un'ipotesi diversa dalla successione fissa: «tre settimane
     leggere poi una pesante», non solo «dieci settimane tutte uguali». */
  function elencoSettimane(opzioni) {
    opzioni = opzioni || {};
    var n = interoPositivo(opzioni.settimane === undefined ? 4 : opzioni.settimane,
      'settimane');
    var durezze = opzioni.durezze || null;
    var elenco = [];
    for (var w = 0; w < n; w++) {
      var d = durezze ? durezze[w % durezze.length] : opzioni.durezza;
      var giorni = elencoGiorni({
        giorni: opzioni.giorniPerSettimana,
        durezza: d === undefined ? 1 : d,
        nodiPerScena: opzioni.nodiPerScena,
        /* seme diverso a ogni settimana: altrimenti l'oscillazione dei
           gesti si ripete identica settimana dopo settimana, e la
           traiettoria misurerebbe il ripetersi di uno schema fisso invece
           che sette-per-w giorni indipendenti come nella vita */
        seme: (opzioni.seme === undefined ? 424242 : opzioni.seme) + w * 97,
        sonno: opzioni.sonno, sonno_oscilla: opzioni.sonno_oscilla,
        stato: (w === 0) ? opzioni.stato : undefined,
        str: opzioni.str, pos: opzioni.pos, deb: opzioni.deb,
        rip: opzioni.rip, rip_ogni_giorno: opzioni.rip_ogni_giorno
      });
      elenco.push({ titolo: opzioni.titoloSettimana
        ? opzioni.titoloSettimana(w + 1) : ('Settimana ' + (w + 1)), giorni: giorni });
    }
    return elenco;
  }

  /* --------------------------------------------------------------------
     ESEGUE la traiettoria, con la stessa calibrazione k della settimana.
     -------------------------------------------------------------------- */
  function eseguiTraiettoriaTipo(opzioni) {
    opzioni = opzioni || {};
    var n = interoPositivo(opzioni.nodiPerScena === undefined ? 8 : opzioni.nodiPerScena,
      'gesti per scena');
    var totNodi = n * FORMA.length;
    var k = opzioni.k === undefined ? (T ? T.K_TARATO : 2.75) : opzioni.k;
    var cal = (k === null) ? null : T.calibrazionePerGiornata(totNodi, k);
    var settimane = elencoSettimane(opzioni);
    var seme = opzioni.seme === undefined ? 424242 : opzioni.seme;
    var risultato = T.eseguiTraiettoria(settimane, {
      rng: opzioni.rng || new globale.CasualePython(seme),
      sonno: opzioni.sonno,
      calibrazione: cal,
      titolo: opzioni.titolo || 'Una traiettoria'
    });
    /* elencoSettimane valida gia' che le settimane siano un intero positivo,
       quindi `risultato` qui non e' mai nullo: la guardia resta per chi
       chiama Tempo.eseguiTraiettoria direttamente, con un elenco proprio. */
    if (!risultato) { return null; }
    risultato.k = k;
    risultato.nodi_per_giorno = totNodi;
    return risultato;
  }

  var API = {
    FORMA: FORMA,
    DUREZZE: DUREZZE,
    SONNI: SONNI,
    durezza: durezza,
    sonno: sonno,
    oscillatore: oscillatore,
    conAmpiezze: conAmpiezze,
    statoDiPartenza: statoDiPartenza,
    giornata: giornata,
    elencoGiorni: elencoGiorni,
    eseguiSettimana: eseguiSettimana,
    elencoSettimane: elencoSettimane,
    eseguiTraiettoriaTipo: eseguiTraiettoriaTipo
  };

  globale.SettimanaTipo = API;
  if (typeof module !== 'undefined' && module.exports) { module.exports = API; }

})(typeof window !== 'undefined' ? window : globalThis);
