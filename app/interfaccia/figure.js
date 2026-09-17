/* =============================================================================
   SIMULATORE 3.0 — Le figure vive della lettura lunga
   =============================================================================
   Script classico, nessuna libreria, nessuna rete.

   CHE COS'E' UNA FIGURA VIVA
   In un libro di carta una figura mostra un caso: quello che l'autore ha
   scelto. Qui la figura mostra il caso del lettore, e lo ricalcola mentre
   lui lo cambia. Non e' un vezzo: quasi tutte le affermazioni di questo
   modello sono affermazioni su come una cosa VARIA al variare di un'altra,
   e una figura ferma le racconta male.

   Quando il capitolo dice «un punto di complessita' costa cinque punti di
   probabilita', sempre, senza sfumature», la figura accanto lascia muovere
   la complessita' e far vedere i cinque punti che se ne vanno.

   TUTTE LE FIGURE CALCOLANO DAVVERO
   Nessun numero e' scritto a mano. Ogni figura chiama il motore vero —
   nucleo.js, stato.js, tempo.js, analisi.js — con gli stessi semi e le
   stesse calibrazioni delle altre pagine. Se il motore cambiasse, le figure
   cambierebbero con lui, e i controlli automatici se ne accorgerebbero.

   LA SCENA CONDIVISA
   Le prime figure lavorano tutte sulla stessa scena, quella che il lettore
   ha tarato al capitolo 2. E' voluto: si taratura una volta, e poi la si
   vede attraversare la formula, il taglio, la tabella a gradini, il dado e
   il margine. In un libro si direbbe «riprendiamo l'esempio di prima»; qui
   l'esempio di prima e' ancora vivo.
   ========================================================================== */
(function (globale) {
  'use strict';

  var D = globale.Disegno, N = globale.Nucleo, St = globale.Stato,
      S = globale.Spiegazioni, T = globale.Tempo, A = globale.Analisi,
      MS = globale.MicroSemantica;

  (function (mancanti) {
    if (!mancanti.length) { return; }
    throw new Error('figure.js: manca ' + mancanti.join(', ') +
      '. Ordine: calibrazione.js, casuale-mt.js, nucleo.js, stato.js, ' +
      'microsemantica.js, tempo.js, analisi.js, spiegazioni.js, disegno.js, ' +
      'e solo dopo questo file.');
  }([['Disegno', D], ['Nucleo', N], ['Stato', St], ['Spiegazioni', S],
     ['Tempo', T], ['Analisi', A]]
    .filter(function (c) { return !c[1]; })
    .map(function (c) { return c[0]; })));

  var esc = D.esc, num = D.num;
  var COLORI = { aiuta: 'var(--aiuta)', ostacola: 'var(--ostacola)',
                 azione: 'var(--azione)', neutro: 'var(--inchiostro-3)' };

  /* --------------------------------------------------------------------
     LA SCENA CONDIVISA
     -------------------------------------------------------------------- */
  var scena = { P0: 75, E: -10, I: 0, T: -5, M: -5, BP: 0, C: 1, STR: 62, DEB: 0 };

  var CURSORI = [
    { k: 'P0',  min: 1,   max: 99,  nome: 'Punto di partenza',    sotto: 'quanto è fattibile in sé' },
    { k: 'E',   min: -30, max: 30,  nome: 'Il corpo adesso',      sotto: 'energia, sonno, dolore' },
    { k: 'I',   min: -30, max: 30,  nome: 'Quanto è chiaro',      sotto: 'informazione e istruzioni' },
    { k: 'T',   min: -30, max: 30,  nome: 'La pressione del tempo', sotto: 'la fretta di adesso' },
    { k: 'M',   min: -30, max: 30,  nome: 'L’ambiente intorno',   sotto: 'spazio, oggetti, rumore' },
    { k: 'BP',  min: 0,   max: 20,  nome: 'Ciò che ti protegge',  sotto: 'aiuto concreto temporaneo' },
    { k: 'C',   min: 0,   max: 10,  nome: 'Quanti pezzi ha',      sotto: 'complessità, −5 ciascuno' },
    { k: 'STR', min: 0,   max: 100, nome: 'Il carico accumulato', sotto: 'lo stress che ti porti dietro' },
    { k: 'DEB', min: 0,   max: 5,   nome: 'Il debito da insistenza', sotto: '−5 ciascuno' }
  ];

  function nodoScena(descrizione) {
    return {
      id: 'lettura', descrizione: descrizione || 'il gesto che stiamo seguendo',
      p0: scena.P0,
      modificatori: { energia_e: scena.E, informazione_i: scena.I, tempo_t: scena.T,
                      materiale_m: scena.M, bonus_bp: scena.BP, complessita_c: scena.C },
      stato_prima: { stress_str: scena.STR, posizione_pos: 60, debito_deb: scena.DEB, rip: 'debole' }
    };
  }
  function pnScena() { return N.calcolaPn(nodoScena()); }

  /* --------------------------------------------------------------------
     IL REGISTRO DELLE FIGURE
     -------------------------------------------------------------------- */
  var FIGURE = {};
  var DIPENDENTI = [];        // figure da rifare quando la scena cambia

  function figura(id, def) { FIGURE[id] = def; if (def.segueLaScena) { DIPENDENTI.push(id); } }

  /* ====================================================================
     1 · LA TARATURA — i nove numeri, e la probabilità che ne esce
     ==================================================================== */
  figura('taratura', {
    titolo: 'La scena che ci portiamo dietro',
    didascalia: 'I nove valori della taratura. Muovili pure. Da qui in avanti tutte le ' +
                'figure del capitolo lavorano su questa scena, e quello che cambi qui lo ' +
                'ritrovi più sotto.',
    comandi: function () {
      return '<div class="griglia-cursori figura-cursori">' + CURSORI.map(function (c) {
        return '<div class="cursore"><label for="lt_' + c.k + '">' +
          '<span class="nome"><span data-parola="' + esc(c.k) + '">' + esc(c.nome) + '</span>' +
          '<small>' + esc(c.sotto) + '</small></span>' +
          '<span class="valore" id="ltv_' + c.k + '">' + scena[c.k] + '</span></label>' +
          '<input type="range" id="lt_' + c.k + '" min="' + c.min + '" max="' + c.max +
          '" value="' + scena[c.k] + '" aria-label="' + esc(c.nome) + '"></div>';
      }).join('') + '</div>';
    },
    lega: function (el, rifai) {
      CURSORI.forEach(function (c) {
        var input = el.querySelector('#lt_' + c.k);
        if (!input) { return; }
        input.addEventListener('input', function (e) {
          scena[c.k] = parseInt(e.target.value, 10);
          el.querySelector('#ltv_' + c.k).textContent = scena[c.k];
          rifai();
        });
      });
    },
    disegna: function () {
      var r = pnScena();
      var f = r.pn >= 60 ? 'buono' : (r.pn >= 35 ? 'attenzione' : (r.pn >= 15 ? 'serio' : 'critico'));
      return '<div class="pn-grande" style="--tinta:' + S.colori[f] + '">' +
        '<span class="eti">Probabilità di riuscita</span>' +
        '<span class="cifra">' + r.pn + '<small>%</small></span>' +
        '<span class="pista"><i style="width:' + r.pn + '%"></i></span>' +
        (r.grezzo !== r.pn
          ? '<span class="nota-pn">il grezzo era ' + r.grezzo + ', e il taglio ai bordi lo ha riportato dentro</span>'
          : '<span class="nota-pn">grezzo ' + r.grezzo + ': era già dentro i confini, quindi il taglio non ha fatto niente</span>') +
        '</div>';
    }
  });

  /* ====================================================================
     2 · I CONTRIBUTI — che cosa aggiunge e che cosa toglie
     ==================================================================== */
  figura('contributi', {
    segueLaScena: true,
    titolo: 'Da dove viene quel numero',
    /* LA DIDASCALIA DICEVA IL CONTRARIO DEL DISEGNO.
       Diceva «a destra cio' che aiuta, a sinistra cio' che toglie», e nella
       figura non c'e' nessuna destra e nessuna sinistra: tutte le barre
       partono dal bordo sinistro della loro pista, e quello che cambia e' il
       colore. Lo dice per esteso anche il commento del foglio di stile, alla
       riga «.riga-termine .termine-barra { left: 0 }»: le negative crescevano
       da destra ed e' stato corretto li', ma qui era rimasta la frase vecchia.
       Chi leggeva cercava due colonne che non ci sono mai state. */
    didascalia: 'Ogni termine della formula, con quanto sposta la probabilità in questa ' +
                'scena. Il colore dice il verso: se quella voce aggiunge o toglie. La ' +
                'lunghezza dice di quanto. Sommando tutte le barre viene fuori il ' +
                'grezzo, ed è il conto scritto qui sotto.',
    disegna: function () {
      var r = N.eseguiNodo(nodoScena(), { tiro: 50 });
      var t = r.termini;
      var voci = [
        ['P0', 'punto di partenza', t.P0, true],
        ['E', 'il corpo adesso', t.E, false],
        ['I', 'quanto è chiaro', t.I, false],
        ['T', 'la fretta', t.T, false],
        ['M', 'l’ambiente', t.M, false],
        ['BP', 'ciò che protegge', t.BP, false],
        ['5·C', 'i pezzi da coordinare', t.C, false],
        ['PenSTR', 'il carico a ' + scena.STR, t.piSTR, false],
        ['5·DEB', 'il debito', t.DEB, false]
      ].filter(function (v) { return v[2] !== 0 || v[3]; });

      var maxAss = Math.max.apply(null, voci.map(function (v) { return Math.abs(v[2]); })) || 1;
      var righe = voci.map(function (v) {
        var verso = v[3] ? 'base' : (v[2] > 0 ? 'piu' : 'meno');
        var largo = Math.abs(v[2]) / maxAss * 100;
        return '<div class="riga-termine ' + verso + '">' +
          '<span class="termine-k">' + esc(v[0]) + '</span>' +
          '<span class="termine-nome">' + esc(v[1]) + '</span>' +
          '<span class="termine-pista"><span class="termine-barra" style="width:' +
            largo.toFixed(1) + '%"></span></span>' +
          '<span class="termine-val">' + (v[2] > 0 && !v[3] ? '+' : '') + v[2] + '</span></div>';
      }).join('');
      return '<div class="termini">' + righe + '</div>' +
        '<p class="figura-conto">' + voci.map(function (v, i) {
          return (i === 0 ? '' : (v[2] < 0 ? ' − ' : ' + ')) + Math.abs(v[2]);
        }).join('') + ' = <b>' + r.pn_grezzo_prima_del_clamp + '</b></p>';
    }
  });

  /* ====================================================================
     3 · IL TAGLIO AI BORDI — la funzione, non solo la regola
     ==================================================================== */
  figura('clamp', {
    segueLaScena: true,
    titolo: 'La funzione che taglia',
    didascalia: 'Nel tratto in diagonale il taglio non fa niente: il valore grezzo era ' +
                'già dentro i confini. Nei due tratti in piano, invece, lo riporta ' +
                'dentro. Il punto segnato è la tua scena.',
    disegna: function () {
      var r = pnScena();
      var g = D.tela({ larghezza: 700, altezza: 300, x: [-40, 140], y: [-40, 140],
                       margini: { sinistra: 46, basso: 40 } });
      g.griglia([-40, 0, 5, 50, 95, 140], { terra: -40, formato: function (v) { return v; } });
      g.banda(-40, 5, COLORI.ostacola, 0.07);
      g.banda(95, 140, COLORI.ostacola, 0.07);
      /* la funzione: piatta, diagonale, piatta */
      g.linea([[-40, 5], [5, 5]], { colore: COLORI.azione, spessore: 3 });
      g.linea([[5, 5], [95, 95]], { colore: COLORI.azione, spessore: 3 });
      g.linea([[95, 95], [140, 95]], { colore: COLORI.azione, spessore: 3 });
      /* la bisettrice: dove finirebbe il valore se non ci fosse il taglio */
      g.linea([[-40, -40], [140, 140]], { colore: COLORI.neutro, spessore: 1.2,
                                          tratteggio: '4 4', opacita: 0.7 });
      g.punti([[r.grezzo, r.pn, 'grezzo ' + r.grezzo + ' → Pn ' + r.pn]],
              { colore: COLORI.azione, pieno: 'var(--superficie)', raggio: 5.5 });
      g.testo(r.grezzo, r.pn, 'la tua scena', { dy: -14, peso: 700, colore: 'var(--inchiostro)' });
      g.asseX([[-40, '−40'], [0, '0'], [5, '5'], [50, '50'], [95, '95'], [140, '140']],
              'il valore grezzo, prima del taglio');
      g.asseY('la probabilità Pn, dopo il taglio');
      return g.chiudi('La funzione clamp: piatta sotto 5, diagonale fra 5 e 95, piatta sopra 95') +
        D.legenda([
          { testo: 'la probabilità dopo il taglio', colore: COLORI.azione, forma: 'linea' },
          { testo: 'dove finirebbe senza il taglio', colore: COLORI.neutro, forma: 'tratteggio' },
          { testo: 'le zone in cui il taglio agisce', colore: COLORI.ostacola, opacita: 0.25 }
        ]);
    }
  });

  /* ====================================================================
     4 · PenSTR — la funzione a gradini, disegnata
     ==================================================================== */
  figura('penstr', {
    segueLaScena: true,
    titolo: 'Perché si chiama funzione a gradini',
    didascalia: 'La penalità da carico non sale in diagonale. Sta ferma dentro ogni ' +
                'fascia, e al confine salta. Il tratteggio è dove passerebbe una curva ' +
                'continua: sta lì solo per il confronto.',
    disegna: function () {
      var g = D.tela({ larghezza: 700, altezza: 260, x: [0, 100], y: [0, 28],
                       margini: { sinistra: 42, basso: 40 } });
      g.griglia([0, 5, 10, 15, 20, 25]);
      var punti = [];
      for (var s = 0; s <= 100; s++) { punti.push([s, N.penalitaStr(s)]); }
      g.linea(punti, { colore: COLORI.ostacola, spessore: 3, gradini: true });
      /* la curva continua che il libro rifiuta: 25·(s/100) */
      g.linea([[0, 0], [100, 25]], { colore: COLORI.neutro, spessore: 1.2,
                                     tratteggio: '4 4', opacita: 0.75 });
      var pen = N.penalitaStr(scena.STR);
      g.sogliaX(scena.STR, 'carico ' + scena.STR, 'var(--inchiostro)');
      g.punti([[scena.STR, pen, 'carico ' + scena.STR + ' → penalità ' + pen]],
              { colore: COLORI.ostacola, raggio: 5.5 });
      g.asseX([[0, '0'], [40, '40'], [60, '60'], [70, '70'], [80, '80'], [90, '90'], [100, '100']],
              'il carico persistente');
      g.asseY('la penalità da carico, in punti');
      return g.chiudi('La penalità da carico, a gradini, da 0 a 25') +
        D.legenda([
          { testo: 'la penalità vera, a sei gradini', colore: COLORI.ostacola, forma: 'linea' },
          { testo: 'una curva continua: direbbe di sapere più di quanto si sa',
            colore: COLORI.neutro, forma: 'tratteggio' }
        ]);
    }
  });

  /* ====================================================================
     5 · IL DADO — la legge dei grandi numeri, in diretta
     ==================================================================== */
  var statoDado = { rng: null, tiri: 0, riusciti: 0, storia: [], pnAllInizio: null };
  function azzeraDado() {
    statoDado.rng = new globale.CasualePython(20260906);
    statoDado.tiri = 0; statoDado.riusciti = 0; statoDado.storia = [];
    statoDado.pnAllInizio = pnScena().pn;
  }
  function tiraDado(quanti) {
    var pn = statoDado.pnAllInizio;
    for (var i = 0; i < quanti; i++) {
      var d = statoDado.rng.randint(1, 100);
      statoDado.tiri++;
      if (d <= pn) { statoDado.riusciti++; }
      if (statoDado.tiri <= 40 || statoDado.tiri % Math.ceil(statoDado.tiri / 240) === 0) {
        statoDado.storia.push([statoDado.tiri, statoDado.riusciti / statoDado.tiri * 100]);
      }
    }
  }

  figura('dado', {
    segueLaScena: true,
    titolo: 'La quota di riuscite si avvicina a Pn',
    didascalia: 'Un tiro solo è un caso, e da solo non dice niente. La riga segue la ' +
                'quota di riuscite man mano che i tiri si accumulano. E allora si vede: ' +
                'più tiri ci sono, più la quota si stringe intorno a Pn.',
    comandi: function () {
      return '<div class="barra-azioni figura-azioni">' +
        '<button class="primario" data-tira="1">Tira una volta</button>' +
        '<button data-tira="10">Dieci</button>' +
        '<button data-tira="100">Cento</button>' +
        '<button data-tira="1000">Mille</button>' +
        '<button data-tira="0">Ricomincia</button></div>';
    },
    lega: function (el, rifai) {
      Array.prototype.forEach.call(el.querySelectorAll('[data-tira]'), function (b) {
        b.addEventListener('click', function () {
          var q = parseInt(b.getAttribute('data-tira'), 10);
          if (q === 0) { azzeraDado(); } else { tiraDado(q); }
          rifai();
        });
      });
    },
    primaDiDisegnare: function () {
      /* se la scena e' cambiata, i tiri di prima parlavano di un'altra Pn */
      if (statoDado.rng === null || statoDado.pnAllInizio !== pnScena().pn) { azzeraDado(); }
    },
    disegna: function () {
      var pn = statoDado.pnAllInizio;
      var g = D.tela({ larghezza: 700, altezza: 250, x: [1, Math.max(40, statoDado.tiri)],
                       y: [0, 100], margini: { sinistra: 42, basso: 40 } });
      g.griglia([0, 25, 50, 75, 100], { formato: function (v) { return v + '%'; } });
      g.soglia(pn, 'Pn ' + pn, COLORI.ostacola);
      if (statoDado.storia.length > 1) {
        g.linea(statoDado.storia, { colore: COLORI.aiuta, spessore: 2.4 });
      } else if (statoDado.storia.length === 1) {
        g.punti(statoDado.storia, { colore: COLORI.aiuta, raggio: 5 });
      }
      var t = Math.max(40, statoDado.tiri);
      g.asseX([[1, '1'], [Math.round(t / 2), num(Math.round(t / 2), 0)], [t, num(t, 0)]], 'tiri fatti');
      g.asseY('quota di riuscite');
      var quota = statoDado.tiri ? statoDado.riusciti / statoDado.tiri * 100 : 0;
      /* «1 tiri» e «1 riusciti»: il numero e la parola devono andare
         d'accordo anche quando il numero e' uno, ed e' proprio il primo che
         il lettore vede, perche' comincia tirando una volta sola. */
      return '<div class="dado-conta">' +
          '<span><b>' + num(statoDado.tiri, 0) + '</b> ' +
            (statoDado.tiri === 1 ? 'tiro' : 'tiri') + '</span>' +
          '<span><b>' + num(statoDado.riusciti, 0) + '</b> ' +
            (statoDado.riusciti === 1 ? 'riuscito' : 'riusciti') + '</span>' +
          '<span>quota <b>' + num(quota) + ' %</b></span>' +
          '<span class="dado-atteso">Pn = ' + pn + ' %</span>' +
        '</div>' +
        g.chiudi('La quota di riuscite mentre i tiri si accumulano, con Pn come riferimento') +
        (statoDado.tiri === 0
          ? '<p class="figura-conto">Nessun tiro ancora. Comincia da uno, poi passa a dieci e a cento: è nel passaggio che si vede la cosa.</p>'
          : '');
    }
  });

  /* ====================================================================
     6 · IL MARGINE — di quanto, non solo se
     ==================================================================== */
  figura('margine', {
    segueLaScena: true,
    titolo: 'Non se è riuscita: di quanto',
    didascalia: 'Duemila tiri sulla stessa scena, contati secondo il margine che hanno ' +
                'lasciato. A sinistra i fallimenti, a destra le riuscite, in mezzo la ' +
                'soglia. Le fasce colorate sono le tre letture del capitolo 9. Lì si ' +
                'vede la differenza fra riuscire per un soffio e riuscire con margine.',
    disegna: function () {
      var pn = pnScena().pn;
      var rng = new globale.CasualePython(555000);
      var conta = {};
      for (var i = 0; i < 2000; i++) {
        var d = rng.randint(1, 100);
        var m = (d <= pn) ? (pn - d) : -(d - pn);
        conta[m] = (conta[m] || 0) + 1;
      }
      var chiavi = Object.keys(conta).map(Number).sort(function (a, b) { return a - b; });
      var maxN = Math.max.apply(null, chiavi.map(function (k) { return conta[k]; }));
      var g = D.tela({ larghezza: 700, altezza: 250, x: [-100, 100], y: [0, maxN * 1.08],
                       margini: { sinistra: 42, basso: 42 } });
      /* PRIMA NON C'ERA NESSUNA TACCA A SINISTRA, SOLO LA LINEA DELLO ZERO.
         Ogni barra porta il conteggio nel suo <title>, ma quello lo trova
         solo chi ci passa sopra il mouse o il dito: senza tacche, chi
         guarda l'istogramma da fermo non ha modo di leggere quante volte
         corrisponde a un'altezza. Due valori — zero e il massimo — bastano
         a dare la scala senza affollare il fianco del grafico. */
      g.griglia([0, maxN], { etichette: true });
      g.bandaX(-9, 9, 'var(--attenzione)', 0.16);
      g.bandaX(-24, -10, COLORI.neutro, 0.09);
      g.bandaX(10, 24, COLORI.neutro, 0.09);
      g.barre(chiavi.map(function (k) {
        return [k, conta[k], (k >= 0 ? 'MS ' : 'MF ') + Math.abs(k) + ': ' + conta[k] + ' tiri'];
      }), { colore: function (b) { return b[0] >= 0 ? COLORI.aiuta : COLORI.ostacola; },
            pienezza: 1, raggio: 0 });
      g.sogliaX(0, 'la soglia', 'var(--inchiostro)');
      g.asseX([[-100, 'MF 100'], [-50, 'MF 50'], [0, '0'], [50, 'MS 50'], [100, 'MS 100']],
              'margine: a destra riuscite, a sinistra fallimenti');
      g.asseY('quante volte, su duemila tiri');
      return g.chiudi('La distribuzione dei margini su duemila tiri') +
        D.legenda([
          { testo: 'riuscite', colore: COLORI.aiuta },
          { testo: 'fallimenti', colore: COLORI.ostacola },
          { testo: 'fascia fragile, 0–9: sarebbe potuta andare al contrario', colore: 'var(--attenzione)', opacita: 0.5 }
        ]);
    }
  });

  /* ====================================================================
     7 · GLI ESITI — come cambia il ventaglio al variare del carico
     ==================================================================== */
  figura('esiti', {
    titolo: 'Lo stesso gesto, nove esiti possibili',
    didascalia: 'Per ogni valore del carico, come si distribuiscono gli esiti su ' +
                'trecento tiri. Il gesto non cambia mai. Cambia soltanto il carico con ' +
                'cui lo si affronta, e basta questo a spostare i colori.',
    disegna: function () {
      var ORDINE = ['successo_pulito', 'successo_costoso_sostenibile', 'successo_danneggiato',
                    'successo_tossico', 'successo_tecnico_fallimento_umano',
                    'fallimento_lieve', 'fallimento_tecnico', 'fallimento_sistemico',
                    'quasi_collasso'];
      var carichi = [];
      for (var s = 0; s <= 100; s += 5) { carichi.push(s); }
      var colonne = carichi.map(function (s) {
        var rng = new globale.CasualePython(31000 + s);
        var nodo = {
          id: 'e', descrizione: 'un gesto qualunque', p0: 75,
          modificatori: { energia_e: -5, informazione_i: 0, tempo_t: -5,
                          materiale_m: 0, bonus_bp: 0, complessita_c: 1 },
          stato_prima: { stress_str: s, posizione_pos: Math.max(20, 60 - Math.round(s / 3)),
                         debito_deb: 0, rip: 'debole' }
        };
        var conta = {};
        for (var i = 0; i < 300; i++) {
          var r = N.eseguiNodo(nodo, { rng: rng });
          conta[r.esito] = (conta[r.esito] || 0) + 1;
        }
        return { s: s, conta: conta };
      });

      var g = D.tela({ larghezza: 720, altezza: 280, x: [0, 100], y: [0, 100],
                       margini: { sinistra: 42, basso: 42 } });
      g.griglia([0, 25, 50, 75, 100], { formato: function (v) { return v + '%'; } });
      /* le nove aree impilate: si costruiscono dal basso, una sull'altra */
      var sotto = carichi.map(function () { return 0; });
      ORDINE.forEach(function (chiave) {
        var info = S.esiti[chiave];
        var alto = colonne.map(function (c, i) {
          return sotto[i] + (c.conta[chiave] || 0) / 300 * 100;
        });
        var contorno = [];
        for (var i = 0; i < carichi.length; i++) { contorno.push([carichi[i], alto[i]]); }
        for (var j = carichi.length - 1; j >= 0; j--) { contorno.push([carichi[j], sotto[j]]); }
        var d = 'M ' + contorno.map(function (p) {
          return g.x(p[0]).toFixed(1) + ' ' + g.y(p[1]).toFixed(1);
        }).join(' L ') + ' Z';
        g.aggiungi('<path d="' + d + '" fill="' + S.colori[info.stato] +
          '" opacity="0.82"><title>' + esc(info.titolo) + '</title></path>');
        sotto = alto;
      });
      g.asseX([[0, '0'], [40, '40'], [60, '60'], [70, '70'], [85, '85'], [100, '100']],
              'il carico con cui si affronta il gesto');
      g.asseY('quota di ciascun esito, su trecento tiri');
      var visti = {};
      colonne.forEach(function (c) { Object.keys(c.conta).forEach(function (k) { visti[k] = 1; }); });
      return g.chiudi('Come cambia il ventaglio degli esiti al crescere del carico') +
        D.legenda(ORDINE.filter(function (k) { return visti[k]; }).map(function (k) {
          return { testo: S.esiti[k].titolo, colore: S.colori[S.esiti[k].stato] };
        }));
    }
  });

  /* ====================================================================
     8 · LO STATO DOPO IL NODO
     ==================================================================== */
  figura('statodopo', {
    segueLaScena: true,
    titolo: 'Che cosa resta, dopo',
    didascalia: 'Lo stesso gesto, giocato una volta con un tiro fortunato e una con uno ' +
                'sfortunato. Non cambia solo l’esito. Cambia anche da dove parte il ' +
                'gesto successivo, e quella differenza resta.',
    disegna: function () {
      var pn = pnScena().pn;
      var casi = [
        { nome: 'tiro fortunato', tiro: Math.max(1, Math.round(pn * 0.2)) },
        { nome: 'tiro sfortunato', tiro: Math.min(100, Math.round(pn + (100 - pn) * 0.7) || 90) }
      ];
      return '<div class="due-colonne">' + casi.map(function (c) {
        var r = St.eseguiScena([nodoScena()], { tiri: [c.tiro] });
        var nd = r.nodi[0];
        var info = S.esiti[r.esito];
        var prima = nd.stato_prima, dopo = nd.stato_dopo;
        function riga(eti, a, b, versoBuono) {
          var d = b - a;
          var segno = d === 0 ? 'uguale' : (d > 0 ? 'su' : 'giu');
          var buono = d === 0 ? 'pari' : ((d > 0) === versoBuono ? 'bene' : 'male');
          return '<tr><td>' + esc(eti) + '</td><td class="num">' + a + '</td>' +
            '<td class="num freccia ' + segno + '">' + (d > 0 ? '+' : '') + (d || '—') + '</td>' +
            '<td class="num ' + buono + '"><b>' + b + '</b></td></tr>';
        }
        return '<div class="colonna-caso" style="--tinta:' + S.colori[info.stato] + '">' +
          '<p class="colonna-eti">' + esc(c.nome) + ' · dado ' + c.tiro + '</p>' +
          '<p class="colonna-scena"><b>' + esc(info.titolo) + '</b> — margine ' +
            nd.margine_grezzo + '</p>' +
          /* l'involucro che scorre: e' la convenzione del pacchetto per ogni
             tabella, e questa e' a quattro colonne dentro una colonna che su
             telefono vale meno di trecento pixel */
          '<div class="avvolgi-tabella">' +
          '<table class="dati tabella-stato"><thead><tr><th>Grandezza</th>' +
          '<th class="num">prima</th><th class="num">Δ</th><th class="num">dopo</th></tr></thead><tbody>' +
          riga('carico', prima.stress_str, dopo.stress_str, false) +
          riga('assetto', prima.posizione_pos, dopo.posizione_pos, true) +
          riga('debito', prima.debito_deb, dopo.debito_deb, false) +
          riga('costo nascosto', prima.costo_nascosto, dopo.costo_nascosto, false) +
          '</tbody></table></div></div>';
      }).join('') + '</div>';
    }
  });

  globale.Figure = { FIGURE: FIGURE, DIPENDENTI: DIPENDENTI, scena: scena,
                     nodoScena: nodoScena, figura: figura, COLORI: COLORI };
}(typeof window !== 'undefined' ? window : this));
