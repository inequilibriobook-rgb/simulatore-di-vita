/* =============================================================================
   SIMULATORE 3.0 — La matematica, da zero
   =============================================================================
   PERCHE' ESISTE QUESTA PAGINA

   Il simulatore calcolava e raccontava, ma non c'era un posto in cui la
   formula fosse aperta pezzo per pezzo. C'era un pannello tecnico ripiegato
   dentro «Com'e' andata» — utile a chi sa gia' — e nient'altro.
   Chi voleva capire la matematica da zero, o anche solo sapere dove si crea
   un nodo, non aveva dove andare.

   IL CODICE MOSTRATO E' QUELLO VERO
   Le righe di calcolaPn e penalitaStr sono copiate da app/motore/nucleo.js.
   Copiare del codice in due posti e' il modo classico di farli divergere,
   quindi _test/formula.js confronta i due carattere per carattere: se il
   motore cambia e questa pagina no, il controllo fallisce.
   ========================================================================== */
(function (globale) {
  'use strict';

  var N = globale.Nucleo;
  var S = globale.Spiegazioni;
  if (!N || !S) {
    throw new Error('formula-ui.js: manca ' + (!N ? 'Nucleo' : 'Spiegazioni') +
      '. Ordine: nucleo.js, spiegazioni.js, e solo dopo formula-ui.js.');
  }

  function q(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  /* IL MENO DELLA MATEMATICA, NON IL TRATTINO DELLA TASTIERA.
     Le due tabelle a gradini di questa pagina scrivono «−5» con il segno
     lungo, e la colonna «sposta» scriveva «-5» con il trattino corto: due
     segni diversi per la stessa cosa, uno sopra l'altro. Qui non si puo'
     chiedere il numero a lingua.js — questo file viene caricato anche dal
     controllo automatico, che gli passa una finestra con dentro il solo
     nucleo — quindi la regola sta scritta a mano, ed e' una riga. */
  var MENO = '−';
  function num(v) { return String(v).replace(/^-/, MENO); }
  function segno(v) { return (v > 0 ? '+' : '') + num(v); }

  /* i nove cursori, negli stessi domini della pagina del gesto singolo */
  var CURSORI = [
    { k: 'P0',  min: 1,   max: 99, nome: 'Punto di partenza',      sotto: 'quanto è fattibile in sé (P0)' },
    { k: 'E',   min: -30, max: 30, nome: 'Il corpo adesso',        sotto: 'energia, sonno, dolore (E)' },
    { k: 'I',   min: -30, max: 30, nome: 'Quanto è chiaro',   sotto: 'informazione e istruzioni (I)' },
    { k: 'T',   min: -30, max: 30, nome: 'La pressione del tempo', sotto: 'fretta di questo momento (T)' },
    { k: 'M',   min: -30, max: 30, nome: 'L’ambiente intorno', sotto: 'spazio, oggetti, rumore (M)' },
    { k: 'BP',  min: 0,   max: 20, nome: 'Ciò che ti protegge', sotto: 'aiuto concreto temporaneo (BP)' },
    { k: 'C',   min: 0,   max: 10, nome: 'Quanti pezzi ha',        sotto: 'complessità, −5 punti ciascuno (C)' },
    { k: 'STR', min: 0,   max: 100, nome: 'Il carico accumulato',  sotto: 'stress che ti porti dietro (STR)' },
    /* Il massimo e' 5, come in app.js e in scena-ui.js. Qui era 20, e siccome
       il debito toglie cinque punti per unita' avrebbe voluto dire −100: la
       probabilita' sarebbe finita sul pavimento per qualunque gesto, sempre.
       La scala del Canone resta aperta («da 4 in su −20 o oltre») e la tabella
       qui sotto lo dice ancora, con la riga «4 e oltre». */
    { k: 'DEB', min: 0,   max: 5,  nome: 'Il debito da insistenza', sotto: '−5 punti ciascuno (DEB)' }
  ];
  var v = { P0: 75, E: -10, I: 0, T: -5, M: -5, BP: 0, C: 1, STR: 62, DEB: 0 };

  function nodo(valori) {
    var x = valori || v;
    return {
      id: 'formula', descrizione: 'nodo di studio', p0: x.P0,
      modificatori: { energia_e: x.E, informazione_i: x.I, tempo_t: x.T,
                      materiale_m: x.M, bonus_bp: x.BP, complessita_c: x.C },
      stato_prima: { stress_str: x.STR, posizione_pos: 60, debito_deb: x.DEB, rip: 'assente' }
    };
  }

  /* LE SEI FASCE DEL CARICO, IN UN POSTO SOLO.
     Stavano dentro la funzione che disegna, e adesso le legge anche lo
     svolgimento passo per passo: due copie della stessa scala sarebbero
     diventate due scale diverse il primo giorno che una cambia. */
  var FASCE_STR = [[0, 39, 'basso o gestibile', 0], [40, 59, 'medio', 5], [60, 69, 'alto', 10],
                   [70, 79, 'rosso controllabile', 15], [80, 89, 'rosso severo', 20],
                   [90, 100, 'quasi limite', 25]];

  function fasciaDi(str) {
    for (var i = 0; i < FASCE_STR.length; i++) {
      if (str >= FASCE_STR[i][0] && str <= FASCE_STR[i][1]) { return FASCE_STR[i]; }
    }
    return FASCE_STR[FASCE_STR.length - 1];
  }

  /* ------------------------------------------------------------------ *
   * IL CODICE VERO, copiato da app/motore/nucleo.js.
   * _test/formula.js verifica che sia ancora identico.
   * ------------------------------------------------------------------ */
  var CODICE_PN = [
    'function calcolaPn(nodo, cfg) {',
    '  cfg = cfg || CONFIG;',
    '  var n = normalizzaNodo(nodo);',
    '  var s = n.stato_prima, m = n.modificatori;',
    '  var grezzo = n.p0',
    '    + sigmaMod(m)',
    '    + m.bonus_bp',
    '    + s.bonus_bp',
    '    - cfg.pesoComplessita * m.complessita_c',
    '    - penalitaStr(s.stress_str, cfg)',
    '    - cfg.pesoDebito * s.debito_deb;',
    '  return { grezzo: grezzo, pn: clampInt(grezzo, cfg.probabilitaMinima, cfg.probabilitaMassima) };',
    '}'
  ].join('\n');

  var CODICE_PEN = [
    'function penalitaStr(valoreStr, cfg) {',
    '  cfg = cfg || CONFIG;',
    '  var s = clampInt(valoreStr, 0, 100);',
    '  if (s <= cfg.strSogliaBassa) { return 0; }',
    '  if (s <= cfg.strSogliaMedia) { return 5; }',
    '  if (s <= cfg.strSogliaAlta) { return 10; }',
    '  if (s <= cfg.strSogliaRossoControllato) { return 15; }',
    '  if (s <= cfg.strSogliaRossoGrave) { return 20; }',
    '  return 25;',
    '}'
  ].join('\n');

  /* le quattro cose che il canone non contiene — Apparato B */
  var MANCA = [
    ['I coefficienti di recupero',
     'Il modello distingue con cura molti tipi di recupero: vero, finto, debole, tardivo, pieno. Un recupero è una pausa che toglie carico davvero, non una che dà soltanto un po’ di sollievo. Ma in nessuna fonte c’è un numero. Non è scritto da nessuna parte quanto stress rientra dopo una notte di sonno. Quei numeri li deve scegliere chi programma, e deve dichiararli come una scelta sua.'],
    ['La conversione del campo attivo in punti',
     'Il campo attivo è quello che nella scena risponde al tentativo: un cane che tira, una serratura che resiste. Le fonti distinguono con cura una sua contestazione lieve, media e forte. Ma non è scritto da nessuna parte quanti punti valga «lieve». Il ponte fra la parola e il numero, insomma, non esiste ancora. Va costruito, e va dichiarato.'],
    ['L’unità del cooldown',
     'Il cooldown è il tempo di raffreddamento. Dopo una fase rossa, cioè un periodo in cui il carico è arrivato in zona di pericolo, il modello impone un’attesa prima che si possa tornare a spingere. È un numero intero, e cala di uno per volta. Di uno ogni quanto, però? A ogni nodo, a ogni scena, a ogni ora, a ogni giorno? Non è dichiarato da nessuna parte. E la stessa cifra, letta come nodi o come giorni, dà due modelli del recupero del tutto diversi.'],
    ['I tetti su assetto, debito e costo nascosto',
     'La tabella del debito si ferma a «4 o oltre», e da lì in su la scala resta aperta: un tetto, cioè un valore massimo, non c’è. L’assetto una scala dichiarata non ce l’ha proprio. Il costo nascosto, cioè il prezzo di un gesto che da fuori sembra riuscito e che si vede solo dopo, non ha né una soglia né un modo di calare col tempo. Eppure nel programma una soglia c’è, a metà scala, e cambia il modo in cui il simulatore si comporta. Funziona, si vede negli esiti, e non è canone.']
  ];

  /* ------------------------------------------------------------------ *
   * IL CONTO SVOLTO, UN PASSO ALLA VOLTA
   * ------------------------------------------------------------------
   * La formula madre e' una riga sola, e una riga sola non si guarda:
   * si legge tutta insieme o non si legge affatto. Il capitolo 39 del
   * libro fa il contrario — prende dodici scene vere e scrive il conto
   * per esteso, termine per termine. Questa e' la stessa cosa a schermo,
   * con il totale che cresce dopo ogni passo, cosi' si vede quale termine
   * ha davvero spostato il risultato e quale non lo ha toccato.
   *
   * L'ordine dei passi e' quello della formula, non uno comodo: prima il
   * punto di partenza, poi i quattro termini della scena, la protezione,
   * e infine le tre penalita' che tolgono e basta.
   * ------------------------------------------------------------------ */
  function passiDelConto(val, cfg) {
    cfg = cfg || N.CONFIG;
    var f = fasciaDi(val.STR);
    var pen = N.penalitaStr(val.STR, cfg);
    var quantiC = val.C === 0
      ? 'non c’è niente da coordinare, e questa riga non toglie niente'
      : (val.C === 1
        ? 'cinque punti per l’unico pezzo da coordinare'
        : 'cinque punti per ognuno dei ' + val.C + ' pezzi da coordinare');
    var quantoDeb = val.DEB === 0
      ? 'non c’è debito da insistenza, e questa riga non toglie niente'
      : (val.DEB === 1
        ? 'cinque punti per l’unica unità di debito'
        : 'cinque punti per ognuna delle ' + val.DEB + ' unità di debito');
    var elenco = [
      ['P0', 'Il punto di partenza', val.P0,
       'quanto il gesto è fattibile in sé, prima ancora di guardare la giornata'],
      ['E', 'Il corpo adesso', val.E, 'energia, sonno, dolore'],
      ['I', 'Quanto è chiaro', val.I, 'le istruzioni, e quanto si capisce che cosa va fatto'],
      ['T', 'La pressione del tempo', val.T, 'la fretta di questo momento'],
      ['M', 'L’ambiente intorno', val.M, 'lo spazio, gli oggetti, il rumore'],
      ['BP', 'Ciò che ti protegge', val.BP, 'un aiuto concreto, e per ora temporaneo'],
      ['5·C', 'La complessità', -cfg.pesoComplessita * val.C, quantiC],
      ['PenSTR', 'Il carico accumulato', -pen,
       'il carico vale ' + val.STR + ', e cade nella fascia da ' + f[0] + ' a ' + f[1] +
       ', quella che il modello legge come «' + f[2] + '»'],
      ['5·DEB', 'Il debito da insistenza', -cfg.pesoDebito * val.DEB, quantoDeb]
    ];
    var totale = 0;
    return elenco.map(function (p) {
      totale += p[2];
      return { sigla: p[0], nome: p[1], quanto: p[2], dice: p[3], totale: totale };
    });
  }

  /* le schede del capitolo 39, cosi' come le ha lette dal Canone lo script
     scripts/genera_formule.py — qui non se ne ricopia nemmeno una */
  function schedeDelLibro() {
    var F = globale.Formule;
    return (F && F.SCHEDE) ? F.SCHEDE : [];
  }
  function schedeSenzaCalcolo() {
    var F = globale.Formule;
    return (F && F.SENZA_CALCOLO) ? F.SENZA_CALCOLO : [];
  }

  /* quale scheda e' aperta adesso: null se i cursori li muove chi legge */
  var scelta = null;

  function rigaPasso(p, n) {
    var colore = p.quanto > 0 ? 'var(--aiuta)' : (p.quanto < 0 ? 'var(--ostacola)' : 'var(--inchiostro-3)');
    return '<tr><td class="num">' + n + '</td>' +
      '<td><b>' + esc(p.nome) + '</b> <span class="glossa-sigla">' + esc(p.sigla) + '</span>' +
      '<br><small style="color:var(--inchiostro-3)">' + esc(p.dice) + '</small></td>' +
      '<td class="num" style="color:' + colore + '">' + segno(p.quanto) + '</td>' +
      '<td class="num"><b>' + num(p.totale) + '</b></td></tr>';
  }

  function svolgimentoHTML() {
    var cfg = N.CONFIG;
    var passi = passiDelConto(v, cfg);
    var r = N.calcolaPn(nodo());
    var grezzo = passi[passi.length - 1].totale;
    var s = (scelta && scelta.tipo === 'calcolo') ? scelta.scheda : null;

    var testa = s
      ? '<h3 class="sotto-titolo" style="margin-top:0">' + esc(s.titolo) + '</h3>' +
        '<p class="caso-conti">' + esc(s.conti) + '</p>' +
        '<p class="caso-fonte">Sono le parole del libro, non un riassunto, e la riga qui sotto è ' +
        'quella stampata nel capitolo 39.</p>' +
        '<div class="formula-libro" data-scheda="' + esc(s.titolo) + '"></div>'
      : '<h3 class="sotto-titolo" style="margin-top:0">I cursori che hai messo tu</h3>' +
        '<p style="margin-top:0;color:var(--inchiostro-2)">Non hai ancora scelto una scheda, ' +
        'quindi il conto qui sotto è quello dei nove cursori come stanno adesso. Scegli una ' +
        'scheda qui sopra e al suo posto compare un caso del libro, con i suoi numeri.</p>';

    var tabella =
      '<div class="avvolgi-tabella"><table class="dati">' +
      '<tr><th class="num">passo</th><th>che cosa entra</th><th class="num">quanto</th>' +
      '<th class="num">totale dopo</th></tr>' +
      passi.map(function (p, i) { return rigaPasso(p, i + 1); }).join('') +
      '</table></div>';

    /* i tre passi che vengono dopo la somma: arrotondamento e taglio */
    var tagliato = grezzo !== r.pn;
    var coda =
      '<p style="margin-bottom:6px"><strong>Passo ' + (passi.length + 1) + ' — la somma grezza.</strong> ' +
      'I nove termini, messi in fila, fanno ' + num(grezzo) + '. Il libro chiama questo numero ' +
      'il <em>grezzo</em>, perché non è ancora passato da nessun controllo.</p>' +
      '<p style="margin-bottom:6px"><strong>Passo ' + (passi.length + 2) + ' — l’arrotondamento.</strong> ' +
      'Il motore lavora a numeri interi, quindi prima di tagliare arrotonda. Qui il grezzo è già ' +
      'intero e resta ' + num(grezzo) + '. Il passo serve quando un valore arriva con la virgola, ' +
      'per esempio da un’altra pagina che ha fatto una media. Su un mezzo punto esatto il motore ' +
      'arrotonda al numero pari, come fa Python, il linguaggio in cui è scritto l’altro motore del ' +
      'progetto. È una delle ragioni per cui i due motori danno sempre lo stesso risultato.</p>' +
      '<p style="margin-bottom:10px"><strong>Passo ' + (passi.length + 3) + ' — il taglio ai bordi.</strong> ' +
      'clamp(' + num(grezzo) + ') vuol dire: prendi il maggiore fra 5 e ' + num(grezzo) + ', poi il ' +
      'minore fra 95 e quello che ne esce. ' +
      (tagliato
        ? 'Qui il taglio è intervenuto davvero, perché ' + num(grezzo) + ' è fuori dai confini, e Pn diventa ' +
          r.pn + '.'
        : 'Qui ' + num(grezzo) + ' sta già fra i due confini, e Pn resta ' + r.pn + '.') +
      '</p>' +
      '<div class="due-numeri" style="margin-bottom:14px">' +
      '<div class="numero-taglio"><span class="k">il grezzo</span><span class="v">' +
      num(grezzo) + '</span></div>' +
      '<div class="freccia-taglio" aria-hidden="true">→</div>' +
      '<div class="numero-taglio' + (tagliato ? ' tagliato' : '') + '">' +
      '<span class="k">Pn, dopo il taglio</span><span class="v">' + r.pn + '</span></div></div>';

    /* il confronto con il numero stampato: solo se la scheda è ancora quella */
    var confronto = '';
    if (s) {
      var accordo = (r.pn === s.pn) && (grezzo === s.praw);
      confronto =
        '<div class="confronto-pn ' + (accordo ? 'accordo' : 'disaccordo') + '">' +
        '<div class="pn-lato"><span class="pn-eti">Il libro stampa</span>' +
        '<span class="pn-num">' + s.pn + '</span></div>' +
        '<div class="pn-segno" aria-hidden="true">' + (accordo ? '=' : '≠') + '</div>' +
        '<div class="pn-lato"><span class="pn-eti">Il motore calcola, adesso</span>' +
        '<span class="pn-num">' + r.pn + '</span></div>' +
        '<p class="pn-verdetto">' + (accordo
          ? 'Coincidono, e coincide anche il grezzo: ' + num(s.praw) + ' nel libro, ' +
            num(grezzo) + ' qui. Il numero di destra non è scritto in questa pagina. Lo ha ' +
            'calcolato un istante fa <code>app/motore/nucleo.js</code>, con i valori della scheda.'
          : 'NON coincidono. È un errore, e va guardato prima di credere a questa pagina.') +
        '</p></div>';
    }

    var chiusa =
      '<p class="nota"><strong>Due particolari che qui non si vedono, e contano.</strong> ' +
      'Il primo è l’<span data-parola="assetto">assetto</span>, che il libro scrive POS. Non ha ' +
      'un passo suo perché sta fuori dalla formula, e il motore lo usa dopo, quando dà un nome ' +
      'all’esito. Il secondo è che Pn non è l’esito. Dopo questo numero c’è ancora il dado, il ' +
      'margine, e l’imprevisto se il campo risponde, dove il campo è qualcosa nella scena che ' +
      'reagisce al tentativo. Il libro lo ripete all’inizio del capitolo 39, e vale per tutte e ' +
      'dodici le schede.</p>';

    return testa + tabella + coda + confronto + chiusa;
  }

  function fermataHTML(s) {
    return '<div class="riquadro-fermo">' +
      '<p class="fermo-titolo">' + esc(s.titolo) + '</p>' +
      '<p style="margin:8px 0 0;white-space:pre-line">' + esc(s.perche) + '</p></div>' +
      '<p style="color:var(--inchiostro-2)">Questa scheda non ha numeri, e non è una ' +
      'dimenticanza del libro. È una delle due in cui il calcolo si ferma prima di cominciare, ' +
      'perché fermarsi <em>è</em> il risultato. Un numero, qui, verrebbe letto come un permesso.</p>';
  }

  function disegnaSvolgimento() {
    var dove = q('svolgimento');
    if (!dove) { return; }
    if (scelta && scelta.tipo === 'fermata') { dove.innerHTML = fermataHTML(scelta.scheda); }
    else { dove.innerHTML = svolgimentoHTML(); }
    /* la riga in matematica del libro la compone FormuleVista, che la prende
       dal file generato dal Canone: qui non si scrive nemmeno un simbolo */
    var box = dove.querySelector('[data-scheda]');
    if (box && globale.FormuleVista) {
      globale.FormuleVista.scheda(box, box.getAttribute('data-scheda'));
    }
    /* le parole da spiegare comparse adesso le decora da sé glossario.js,
       che tiene d'occhio la pagina e passa su tutto quello che nasce dopo */
    Array.prototype.forEach.call(document.querySelectorAll('#schedeLibro button'),
      function (b) {
        var suo = scelta && b.getAttribute('data-titolo') === scelta.scheda.titolo;
        b.className = suo ? 'primario' : 'fantasma';
        b.setAttribute('aria-pressed', suo ? 'true' : 'false');
      });
  }

  function applica(valori) {
    CURSORI.forEach(function (c) {
      v[c.k] = valori[c.k];
      var input = q('f_' + c.k);
      if (input) { input.value = valori[c.k]; }
      var eti = q('fv_' + c.k);
      if (eti) { eti.textContent = valori[c.k]; }
    });
  }

  function costruisciSchede() {
    var dove = q('schedeLibro');
    if (!dove) { return; }
    var conCalcolo = schedeDelLibro(), senza = schedeSenzaCalcolo();
    if (!conCalcolo.length && !senza.length) {
      dove.innerHTML = '<p class="nota" style="margin:0">Le schede del capitolo 39 arrivano da ' +
        '<code>app/dati/formule.js</code>, e quel file qui non c’è. Va rigenerato con ' +
        '<code>scripts/genera_formule.py</code>.</p>';
      return;
    }
    /* il numero accanto al titolo e' il Pn stampato nel libro, e va scritto
       con il colore del bottone: dentro un riquadro grigio, sul bottone
       scelto che e' scuro, si leggeva appena */
    dove.innerHTML = conCalcolo.map(function (s) {
      return '<button class="fantasma" data-titolo="' + esc(s.titolo) + '" aria-pressed="false">' +
        esc(s.titolo) + ' <small style="opacity:.72">Pn ' + s.pn + '</small></button>';
    }).join('') + senza.map(function (s) {
      return '<button class="fantasma" data-titolo="' + esc(s.titolo) + '" data-ferma="1" ' +
        'aria-pressed="false">' + esc(s.titolo) +
        ' <small style="opacity:.72">senza numeri</small></button>';
    }).join('');

    Array.prototype.forEach.call(dove.querySelectorAll('button'), function (b) {
      b.addEventListener('click', function () {
        var titolo = b.getAttribute('data-titolo');
        if (b.getAttribute('data-ferma')) {
          var f = null;
          senza.forEach(function (s) { if (s.titolo === titolo) { f = s; } });
          scelta = f ? { tipo: 'fermata', scheda: f } : null;
          disegnaSvolgimento();
          return;
        }
        var trovata = null;
        conCalcolo.forEach(function (s) { if (s.titolo === titolo) { trovata = s; } });
        if (!trovata) { return; }
        scelta = { tipo: 'calcolo', scheda: trovata };
        applica(trovata.valori);
        disegna();
      });
    });
  }

  /* ------------------------------------------------------------------ */
  function costruisciCursori() {
    q('cursoriFormula').innerHTML = CURSORI.map(function (c) {
      return '<div class="cursore"><label for="f_' + c.k + '">' +
        '<span class="nome"><span data-parola="' + esc(c.k) + '">' + esc(c.nome) + '</span>' +
        '<small>' + esc(c.sotto) + '</small></span>' +
        '<span class="valore" id="fv_' + c.k + '">' + v[c.k] + '</span></label>' +
        '<input type="range" id="f_' + c.k + '" min="' + c.min + '" max="' + c.max +
        '" value="' + v[c.k] + '" aria-label="' + esc(c.nome) + '"></div>';
    }).join('');
    CURSORI.forEach(function (c) {
      q('f_' + c.k).addEventListener('input', function (e) {
        v[c.k] = parseInt(e.target.value, 10);
        q('fv_' + c.k).textContent = v[c.k];
        /* appena si muove un cursore la scheda aperta non descrive piu' quei
           numeri, e tenerla accesa vorrebbe dire confrontare il conto di
           adesso con il Pn stampato per un'altra scena */
        scelta = null;
        disegna();
      });
    });
  }

  function disegna() {
    var r = N.calcolaPn(nodo());
    var cfg = N.CONFIG;
    var pen = r.grezzo - (v.P0 + v.E + v.I + v.T + v.M + v.BP
      - cfg.pesoComplessita * v.C - cfg.pesoDebito * v.DEB);
    var penStr = -pen;   /* quello che PenSTR ha tolto */

    /* la formula, con i numeri veri sotto ogni simbolo */
    var PEZZI = [
      /* Il segno segue il NUMERO, non il posto che il termine occupa nella
         formula scritta. E, I, T e M compaiono con un piu' nell'Apparato B
         perche' li' sono termini additivi — ma i loro valori sono spesso
         negativi, e mostrare «+ 10» accanto a un cursore che dice −10
         sarebbe una bugia. Complessita', carico e debito tolgono sempre, e
         li' il meno e' fisso. */
      /* il terzo campo dice se il termine SOTTRAE sempre: complessita',
         carico e debito non possono aggiungere niente, e portano il meno
         anche quando valgono zero — e' cosi' che li scrive l'Apparato B.
         Gli altri seguono il proprio segno. */
      ['P0', v.P0, false], ['E', v.E, false], ['I', v.I, false], ['T', v.T, false],
      ['M', v.M, false], ['BP', v.BP, false],
      ['5C', -cfg.pesoComplessita * v.C, true],
      ['PenSTR', -penStr, true],
      ['5DEB', -cfg.pesoDebito * v.DEB, true]
    ];
    q('formulaMadre').innerHTML =
      '<div class="fm-riga">' + PEZZI.map(function (p, i) {
        return (i ? '<span class="fm-op">' + ((p[2] || p[1] < 0) ? '−' : '+') + '</span>' : '') +
          '<span class="fm-pezzo' + (p[1] === 0 ? ' spento' : '') + '">' +
          '<span class="fm-sim">' + esc(p[0].replace('5C', '5·C').replace('5DEB', '5·DEB')) + '</span>' +
          '<span class="fm-val">' + Math.abs(p[1]) + '</span></span>';
      }).join('') + '</div>' +
      '<div class="fm-esito"><span class="fm-etichetta">probabilità di riuscita</span>' +
      '<span class="fm-pn">' + r.pn + '<small>/100</small></span></div>' +
      /* IL BUCO CHE C'ERA QUI, E CHE SI VEDEVA SOLO AI FONDI SCALA.
         Con i cursori tutti in alto la riga stampava «P0 99 + E 30 + I 30 +
         T 30 + M 30 + BP 20 …» e subito sotto «95/100»: i pezzi in vista
         facevano 239, il risultato ne diceva 95, e non c'era una parola.
         Il taglio veniva spiegato tre sezioni piu' giu', dove chi ha appena
         visto i due numeri non e' ancora arrivato. La pagina del gesto
         singolo, nello stesso punto, lo dice subito; questa no. Adesso si'. */
      '<p class="nota">' + (r.grezzo !== r.pn
        ? '<strong>Attenzione ai due numeri.</strong> I pezzi qui sopra, sommati, danno ' +
          num(r.grezzo) + '. Ma il simulatore non scende mai sotto 5 e non sale mai sopra 95, ' +
          'e ha riportato il risultato dentro quei due confini: è il <em>taglio ai bordi</em>, ' +
          'e più sotto c’è la sezione che lo apre per intero.'
        : 'I pezzi qui sopra, sommati, danno ' + num(r.grezzo) + '. Cadono già fra 5 e 95, cioè ' +
          'dentro i confini in cui una probabilità può stare, e qui il taglio ai bordi non ha ' +
          'dovuto fare niente.') +
      ' In quella riga <strong>PenSTR</strong> non è una moltiplicazione. È la penalità da carico, ' +
      'cioè quanti punti toglie lo stress che ti porti dietro da prima, e il conto sta al punto 5.</p>';

    /* la tabella dei nove termini */
    q('tabellaTermini').innerHTML =
      '<tr><th>termine</th><th>che cosa misura</th><th class="num">valore</th><th class="num">sposta</th></tr>' +
      CURSORI.map(function (c) {
        var t = S.termini[c.k] || S.termini['pi' + c.k] || {};
        var sp = (c.k === 'C') ? -cfg.pesoComplessita * v.C
               : (c.k === 'DEB') ? -cfg.pesoDebito * v.DEB
               : (c.k === 'STR') ? -penStr : v[c.k];
        return '<tr><td><b>' + esc(c.nome) + '</b> <span class="glossa-sigla">' +
          esc(c.k) + '</span></td><td>' + esc(t.breve || '') + '</td>' +
          '<td class="num">' + num(v[c.k]) + '</td>' +
          '<td class="num" style="color:' + (sp > 0 ? 'var(--aiuta)' : (sp < 0 ? 'var(--ostacola)' : 'var(--inchiostro-3)')) +
          '">' + segno(sp) + '</td></tr>';
      }).join('');

    /* PenSTR, con la fascia in cui sei adesso */
    q('tabellaStr').innerHTML =
      '<tr><th>STR</th><th>lettura</th><th class="num">toglie</th></tr>' +
      FASCE_STR.map(function (f) {
        var qui = v.STR >= f[0] && v.STR <= f[1];
        return '<tr' + (qui ? ' class="fascia-qui"' : '') + '><td>' + f[0] + '–' + f[1] +
          (qui ? ' <span class="qui-ora">sei qui</span>' : '') + '</td><td>' + f[2] +
          '</td><td class="num">−' + f[3] + '</td></tr>';
      }).join('');

    var DEB = [[0, 'nessun debito', 0], [1, 'debito leggero', 5], [2, 'debito serio', 10],
               [3, 'debito grave', 15], [4, 'zona molto critica — scala aperta', 20]];
    q('tabellaDeb').innerHTML =
      '<tr><th>DEB</th><th>lettura</th><th class="num">toglie</th></tr>' +
      DEB.map(function (d) {
        var qui = (d[0] === 4) ? v.DEB >= 4 : v.DEB === d[0];
        return '<tr' + (qui ? ' class="fascia-qui"' : '') + '><td>' + (d[0] === 4 ? '4 e oltre' : d[0]) +
          (qui ? ' <span class="qui-ora">sei qui</span>' : '') + '</td><td>' + d[1] +
          '</td><td class="num">−' + (d[0] === 4 ? Math.max(20, 5 * v.DEB) : d[2]) + '</td></tr>';
      }).join('');

    /* il taglio */
    var tagliato = r.grezzo !== r.pn;
    q('taglio').innerHTML =
      '<div class="numero-taglio"><span class="k">la somma, prima del taglio</span>' +
      '<span class="v">' + num(r.grezzo) + '</span></div>' +
      '<div class="freccia-taglio" aria-hidden="true">→</div>' +
      '<div class="numero-taglio' + (tagliato ? ' tagliato' : '') + '">' +
      '<span class="k">Pn, dopo</span><span class="v">' + r.pn + '</span></div>' +
      '<p class="nota" style="margin:0;flex-basis:100%">' +
      (tagliato
        ? '<strong>Qui il taglio è intervenuto.</strong> La somma di tutti i termini, quella che il ' +
          'libro chiama il <em>grezzo</em>, faceva ' + num(r.grezzo) + ', ed è fuori dai confini ' +
          '5 e 95. Vuol dire che questa scena è finita fuori scala, e da qui in poi il numero ' +
          'ha smesso di distinguere: una scena appena oltre il confine e una molto oltre ricevono ' +
          'lo stesso identico ' + r.pn + '.'
        : 'I due numeri coincidono. La somma di tutti i termini cade già dentro i confini, e il ' +
          'taglio non ha dovuto fare niente.') +
      '</p>';

    /* i margini */
    var MARG = [[0, 9, 'fragile, quasi pari', 'riuscita o fallimento dipendono molto dal contesto'],
                [10, 24, 'normale', 'esito leggibile, ma va collegato al costo'],
                [25, 100, 'forte', 'buon margine, ma non vuol dire costo zero']];
    q('tabellaMargini').innerHTML =
      '<tr><th>margine</th><th>lettura</th><th>attenzione</th></tr>' +
      MARG.map(function (m) {
        return '<tr><td>' + m[0] + (m[1] === 100 ? ' e oltre' : '–' + m[1]) +
          '</td><td><b>' + m[2] + '</b></td><td>' + m[3] + '</td></tr>';
      }).join('');

    disegnaSvolgimento();
  }

  function avvia() {
    costruisciCursori();
    costruisciSchede();
    disegna();
    q('codicePn').textContent = CODICE_PN;
    q('codicePen').textContent = CODICE_PEN;
    q('cosaManca').innerHTML = MANCA.map(function (m, i) {
      return '<div class="manca-voce"><span class="manca-n">' + (i + 1) + '</span>' +
        '<div><b>' + esc(m[0]) + '</b><p>' + esc(m[1]) + '</p></div></div>';
    }).join('');

    var st = q('stampa'); if (st) { st.addEventListener('click', function () { globale.print(); }); }
    var te = q('tema');
    if (te) {
      te.addEventListener('click', function () {
        var r = document.documentElement;
        var scuro = r.getAttribute('data-tema') === 'scuro';
        r.setAttribute('data-tema', scuro ? 'chiaro' : 'scuro');
        te.textContent = scuro ? 'Tema scuro' : 'Tema chiaro';
      });
    }
  }

  var API = { CODICE_PN: CODICE_PN, CODICE_PEN: CODICE_PEN, CURSORI: CURSORI, MANCA: MANCA,
              FASCE_STR: FASCE_STR, passiDelConto: passiDelConto };
  globale.FormulaUI = API;
  if (typeof module !== 'undefined' && module.exports) { module.exports = API; }
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', avvia); }
    else { avvia(); }
  }
}(typeof window !== 'undefined' ? window : this));
