/* =============================================================================
   SIMULATORE 3.0 — La scena raccontata, aperta nodo per nodo
   =============================================================================
   Script classico, nessuna libreria, nessuna rete.

   CHE COSA FA QUESTA PAGINA CHE LE ALTRE NON FANNO
   Le altre pagine chiedono la scena gia' smontata: un gesto per riga, e i
   numeri messi a mano con dei cursori. Qui si scrive la scena come la si
   racconterebbe, e il simulatore fa tre cose in fila:

     1. la apre nei nodi che contiene, e fa vedere dove ha tagliato
     2. propone i nove valori di ogni nodo, con accanto la parola che li ha
        prodotti e il perche'
     3. calcola tutto, nodo per nodo, e mostra ogni passaggio

   ⚠️ IL PUNTO DUE E' UNA PROPOSTA, NON UN VERDETTO
   Ogni numero si puo' cambiare, e da quel momento vince quello scritto a
   mano. La pagina lo dice, e il libro pure: «tarare prima, calcolare dopo.
   Un valore scelto per far tornare il risultato non e' una taratura: e' una
   giustificazione».

   ⚠️ E LA SEGMENTAZIONE SI CORREGGE
   «Segmentare e' gia' interpretare» — capitolo 24. Percio' la pagina non
   nasconde il taglio: lo mostra frammento per frammento, e lascia unire un
   pezzo al precedente o cambiargli natura da gesto a contesto e viceversa.
   ========================================================================== */
(function (globale) {
  'use strict';

  var Sc = globale.Scena, N = globale.Nucleo, St = globale.Stato,
      S = globale.Spiegazioni, A = globale.Analisi, D = globale.Disegno,
      MS = globale.MicroSemantica, R = globale.Racconto, L = globale.Lingua;

  (function (mancanti) {
    if (!mancanti.length) { return; }
    throw new Error('scena-ui.js: manca ' + mancanti.join(', ') +
      '. Ordine: calibrazione.js, lingua.js, casuale-mt.js, nucleo.js, stato.js, ' +
      'microsemantica.js, analisi.js, lessico.js, scena.js, spiegazioni.js, ' +
      'disegno.js, e solo dopo questo file.');
  }([['Scena', Sc], ['Nucleo', N], ['Stato', St], ['Spiegazioni', S],
     ['Analisi', A], ['Disegno', D], ['Lingua', L]]
    .filter(function (c) { return !c[1]; })
    .map(function (c) { return c[0]; })));

  var esc = D.esc, num = D.num;
  function q(id) { return document.getElementById(id); }


  var ESEMPIO =
    'Sono le sette e dieci e non ho dormito. Devo uscire alle otto e sono già in ritardo.\n' +
    'Mi alzo, vado in cucina e preparo il caffè.\n' +
    'Cerco le chiavi e non le trovo. Rovisto nel cassetto, controllo le tasche. Le trovo sul tavolo.\n' +
    'Vesto il bambino di corsa, prendo la borsa, esco e chiudo la porta.';

  /* lo stato della pagina: la lettura, piu' le correzioni fatte a mano */
  var lettura = null;
  var corretti = {};        // id nodo → { variabile: valore scritto a mano }
  var uniti = {};           // indice frammento → true, se unito al precedente
  var cambiati = {};        // indice frammento → 'nodo' | 'contesto'
  var seme = 424242;
  var risultato = null;
  var mc = null;

  var CAMPI = [
    { k: 'P0',  min: 1,  max: 99,  nome: 'punto di partenza' },
    { k: 'E',   min: -30, max: 30, nome: 'il corpo adesso' },
    { k: 'I',   min: -30, max: 30, nome: 'quanto è chiaro' },
    { k: 'T',   min: -30, max: 30, nome: 'la fretta' },
    { k: 'M',   min: -30, max: 30, nome: 'l’ambiente' },
    { k: 'BP',  min: 0,  max: 20,  nome: 'ciò che protegge' },
    { k: 'C',   min: 0,  max: 10,  nome: 'i pezzi da coordinare' },
    { k: 'STR', min: 0,  max: 100, nome: 'il carico di partenza' },
    { k: 'DEB', min: 0,  max: 5,   nome: 'il debito' }
  ];

  /* --------------------------------------------------------------------
     LEGGERE, CON LE CORREZIONI DELLA PERSONA
     -------------------------------------------------------------------- */
  /* IL CARICO DI PARTENZA ARRIVAVA DALLA CASELLA COSI' COM'ERA.
     Svuotando la casella, `parseInt('')` da' NaN, e il NaN scendeva fino in
     fondo: la pagina scriveva «Il carico di partenza è NaN» e la traccia del
     nodo «STR NaN» — una parola che per chi legge non vuol dire niente, in
     due punti diversi della stessa schermata. Scrivendoci 999 succedeva il
     contrario: la pagina dichiarava 999 mentre la catena girava lo stesso
     con 100, perche' il motore taglia ai bordi senza dirlo. Due bugie
     opposte, con la stessa causa.
     Adesso il numero si sistema qui, in un punto solo, e la correzione si
     vede: la casella cambia sotto gli occhi e sopra c'e' scritto perche'.
     Trovato provando il simulatore il 10/09/2026. */
  var CARICO_PREDEFINITO = 40;
  var avvisoCarico = '';

  function caricoDiPartenza() {
    var casella = q('caricoBase');
    var letto = parseInt(casella.value, 10);
    avvisoCarico = '';
    if (isNaN(letto)) {
      letto = CARICO_PREDEFINITO;
      avvisoCarico = 'La casella del carico di partenza era vuota, e senza un numero non c’è ' +
        'niente da calcolare. Così ho rimesso ' + CARICO_PREDEFINITO +
        ', che è il valore con cui la pagina si apre. Scrivine un altro quando vuoi.';
    } else if (letto < 0 || letto > 100) {
      var dentro = Math.min(100, Math.max(0, letto));
      avvisoCarico = 'Il carico va da 0 a 100, e ' + letto + ' sta fuori, quindi l’ho portato a ' +
        dentro + '. Il modello lo avrebbe tagliato lo stesso, ma senza dirtelo, e la ' +
        'pagina avrebbe continuato a dichiarare ' + letto + '.';
      letto = dentro;
    }
    if (String(letto) !== casella.value) { casella.value = letto; }
    return letto;
  }

  /* Il meno di un numero negativo e' «−», non il trattino della tastiera. */
  function conSegno(x) { return (Number(x) > 0 ? '+' : '') + L.intero(x); }

  function testoCorretto() {
    /* le unioni si applicano al testo prima di rileggerlo: unire due
       frammenti vuol dire togliere il taglio che li separava */
    if (!lettura) { return q('scena').value; }
    var pezzi = [];
    lettura.frammenti.forEach(function (f, i) {
      if (uniti[i] && pezzi.length) { pezzi[pezzi.length - 1] += ' e ' + f.testo; }
      else { pezzi.push(f.testo); }
    });
    return pezzi.join('. ');
  }

  function rileggi(daZero) {
    if (daZero) { uniti = {}; cambiati = {}; corretti = {}; }
    /* Le nature cambiate a mano si passano al lettore, che le applica PRIMA
       di costruire contesto e nodi. Prima si applicavano dopo, sui frammenti
       gia' letti, e poi una rilettura le cancellava: il bottone «è contesto /
       è un gesto» sembrava funzionare e non spostava un numero. */
    lettura = Sc.leggi(daZero ? q('scena').value : testoCorretto(),
                       { caricoBase: caricoDiPartenza(),
                         nature: cambiati });
    risultato = null;
  }

  function valoriDi(nodo) {
    var v = {};
    CAMPI.forEach(function (c) {
      var mano = corretti[nodo.id] && corretti[nodo.id][c.k];
      v[c.k] = (mano === undefined) ? nodo.valori[c.k] : mano;
    });
    return v;
  }

  function nodiPerIlMotore() {
    return lettura.nodi.map(function (n) {
      var v = valoriDi(n);
      return {
        id: n.id, descrizione: n.descrizione, p0: v.P0,
        modificatori: { energia_e: v.E, informazione_i: v.I, tempo_t: v.T,
                        materiale_m: v.M, bonus_bp: v.BP, complessita_c: v.C },
        stato_prima: { stress_str: v.STR, posizione_pos: 60, debito_deb: v.DEB, rip: 'debole' }
      };
    });
  }

  /* --------------------------------------------------------------------
     1 · CHE COSA HO LETTO
     -------------------------------------------------------------------- */
  function disegnaLettura() {
    var f = lettura.frammenti.map(function (fr, i) {
      var nodo = fr.tipo === 'nodo';
      return '<div class="frammento ' + (nodo ? 'e-nodo' : 'e-contesto') + '">' +
        '<span class="fr-segno">' + (nodo ? '◆' : '·') + '</span>' +
        '<span class="fr-testo">' + esc(fr.testo) + '</span>' +
        '<span class="fr-natura">' + (nodo
          ? esc(fr.azione.azione.nome) + ' · ' + esc(fr.azione.azione.classe)
          : 'contesto') + '</span>' +
        '<span class="fr-comandi">' +
          '<button type="button" class="fantasma" data-natura="' + i + '">' +
            (nodo ? 'è contesto' : 'è un gesto') + '</button>' +
          (i > 0 ? '<button type="button" class="fantasma" data-unisci="' + i + '">' +
            (uniti[i] ? 'separa' : 'unisci sopra') + '</button>' : '') +
        '</span></div>';
    }).join('');

    var tracce = lettura.contesto.tracce.map(function (t) {
      return '<li><b>' + esc(t.variabile) + ' ' + conSegno(t.valore) +
        '</b> ← «' + esc(t.parola) + '»<br><small>' + esc(t.perche) + '</small></li>';
    }).join('');

    q('lettura').innerHTML =
      '<div class="frammenti">' + f + '</div>' +
      '<p class="nota">◆ è un gesto, cioè un nodo che verrà calcolato. · è contesto: ' +
      'descrive la scena e vale per tutti i gesti. <strong>Se ho tagliato male, correggi qui</strong>: ' +
      'segmentare è già interpretare, e la scelta è tua.</p>' +
      '<h3 class="sotto-titolo">Quello che vale per tutti i gesti della scena</h3>' +
      '<ul class="tracce">' + tracce + '</ul>';

    Array.prototype.forEach.call(q('lettura').querySelectorAll('[data-natura]'), function (b) {
      b.addEventListener('click', function () {
        var i = parseInt(b.getAttribute('data-natura'), 10);
        var ora = lettura.frammenti[i].tipo;
        cambiati[i] = (ora === 'nodo') ? 'contesto' : 'nodo';
        rileggi(false); calcola();
      });
    });
    Array.prototype.forEach.call(q('lettura').querySelectorAll('[data-unisci]'), function (b) {
      b.addEventListener('click', function () {
        var i = parseInt(b.getAttribute('data-unisci'), 10);
        uniti[i] = !uniti[i];
        rileggi(false); calcola();
      });
    });
  }

  /* --------------------------------------------------------------------
     2 · I NODI, CON TUTTI I VALORI E TUTTO IL CALCOLO
     -------------------------------------------------------------------- */
  /* I GESTI SI SFOGLIANO UNO ALLA VOLTA (18/09/2026).
     Igor: «le pagine restano lunghissime». La sezione «I nodi, uno per uno»
     con dodici gesti e nove valori ciascuno era alta novemila pixel sul
     telefono. Adesso si vede un gesto per volta, con «‹ Gesto 3 di 12 ›» e
     il titolo del gesto; «Tutti in fila» li rimette uno sotto l'altro, per
     chi li vuole confrontare. La scelta resta quando i numeri si
     ricalcolano (la sezione si ridisegna a ogni ritocco). */
  var nodoCorrente = 0, nodiInFila = false;
  function sfogliaNodi() {
    var dove = q('nodi');
    var carte = Array.prototype.slice.call(dove.querySelectorAll('.carta-nodo'));
    if (carte.length < 2) { return; }
    var nav = document.createElement('div');
    nav.className = 'sfoglia-nodi no-stampa';
    nav.innerHTML =
      '<button type="button" class="sfoglia-prima" aria-label="Gesto precedente">‹</button>' +
      '<div class="sfoglia-dove"><small></small><b></b></div>' +
      '<button type="button" class="sfoglia-dopo" aria-label="Gesto successivo">›</button>' +
      '<button type="button" class="sfoglia-tutti secondario"></button>';
    dove.insertBefore(nav, carte[0]);
    if (nodoCorrente >= carte.length) { nodoCorrente = carte.length - 1; }
    function mostra(k) {
      nodoCorrente = Math.max(0, Math.min(carte.length - 1, k));
      carte.forEach(function (c, j) { c.classList.toggle('nodo-via', !nodiInFila && j !== nodoCorrente); });
      var n = carte[nodoCorrente];
      nav.querySelector('.sfoglia-dove small').textContent = 'Gesto ' + (nodoCorrente + 1) + ' di ' + carte.length;
      nav.querySelector('.sfoglia-dove b').textContent = (n.querySelector('.nodo-testo b') || {}).textContent || '';
      nav.querySelector('.sfoglia-prima').disabled = nodiInFila || nodoCorrente === 0;
      nav.querySelector('.sfoglia-dopo').disabled = nodiInFila || nodoCorrente === carte.length - 1;
      nav.querySelector('.sfoglia-tutti').textContent = nodiInFila ? 'Uno alla volta' : 'Tutti in fila';
      nav.classList.toggle('in-fila', nodiInFila);
    }
    nav.querySelector('.sfoglia-prima').addEventListener('click', function () { mostra(nodoCorrente - 1); });
    nav.querySelector('.sfoglia-dopo').addEventListener('click', function () { mostra(nodoCorrente + 1); });
    nav.querySelector('.sfoglia-tutti').addEventListener('click', function () { nodiInFila = !nodiInFila; mostra(nodoCorrente); });
    mostra(nodoCorrente);
  }

  function tasselloValore(nodo, c, v, daMano) {
    return '<div class="tassello v-' + c.k + (daMano ? ' a-mano' : '') + '">' +
      '<div class="k"><span data-parola="' + esc(c.k) + '">' + esc(c.k) + '</span></div>' +
      '<div class="v">' + (c.k === 'P0' || c.k === 'C' || c.k === 'STR' || c.k === 'DEB'
        ? L.intero(v) : conSegno(v)) + '</div>' +
      '<div class="s">' + esc(c.nome) + '</div></div>';
  }

  function bloccoTracce(nodo) {
    var v = valoriDi(nodo);
    var righe = nodo.tracce.map(function (t) {
      return '<li' + (t.scartata ? ' class="scartata"' : '') + '>' +
        '<b>' + esc(t.variabile) + (t.scartata ? '' : ' ' + conSegno(t.valore)) +
        '</b> ← «' + esc(t.parola) + '»' +
        (t.scartata ? ' <em>non contato</em>' : '') +
        '<br><small>' + esc(t.perche) + '</small></li>';
    }).join('');

    var campi = CAMPI.map(function (c) {
      return '<label class="campo-valore"><span>' + esc(c.k) + '</span>' +
        '<input type="number" data-nodo="' + esc(nodo.id) + '" data-campo="' + c.k + '" ' +
        'min="' + c.min + '" max="' + c.max + '" value="' + v[c.k] + '"></label>';
    }).join('');

    return '<ul class="tracce">' + righe + '</ul>' +
      '<h4 class="sotto-titolo">Cambiali, se la scena la conosci meglio tu</h4>' +
      '<p class="nota" style="margin-top:0">Da qui in poi vince quello che scrivi. ' +
      'Il libro su questo non transige: <em>tarare prima, calcolare dopo</em>.</p>' +
      '<div class="campi-valori">' + campi + '</div>';
  }

  function bloccoCalcolo(nodo, r) {
    if (!r) {
      return '<p class="nota">Il conto di questo gesto non è ancora stato fatto: premi ' +
        '<b>Apri e calcola</b> qui sopra e questo riquadro si riempie.</p>';
    }
    var t = r.termini;
    /* Ogni riga porta anche la chiave del glossario (il quinto elemento):
       cosi' «PenSTR», «5·C» e «5·DEB» diventano cliccabili come lo sono gia'
       P0/E/I/T/M/BP/C/STR/DEB nei tasselli dei valori qui sopra. Senza,
       chi legge la somma vede «PenSTR» scritto una volta sola in tutta la
       pagina e senza nessun modo di sapere che cos'e': la spiegazione c'e'
       gia' in spiegazioni.js, ma restava raggiungibile solo scorrendo fino
       al glossario in fondo e cercandola a mano.
       Trovato provando il simulatore il 15/09/2026. */
    var voci = [
      ['P0', 'punto di partenza', t.P0, true, 'P0'], ['E', 'il corpo adesso', t.E, false, 'E'],
      ['I', 'quanto è chiaro', t.I, false, 'I'], ['T', 'la fretta', t.T, false, 'T'],
      ['M', 'l’ambiente', t.M, false, 'M'], ['BP', 'ciò che protegge', t.BP, false, 'BP'],
      ['5·C', 'i pezzi da coordinare', t.C, false, 'C'],
      ['PenSTR', 'quanto toglie il carico, che è a ' + r.stato_prima.stress_str, t.piSTR, false, 'piSTR'],
      ['5·DEB', 'il debito', t.DEB, false, 'DEB']
    ].filter(function (x) { return x[2] !== 0 || x[3]; });
    var maxAss = Math.max.apply(null, voci.map(function (x) { return Math.abs(x[2]); })) || 1;
    var barre = voci.map(function (x) {
      var verso = x[3] ? 'base' : (x[2] > 0 ? 'piu' : 'meno');
      return '<div class="riga-termine ' + verso + '">' +
        '<span class="termine-k" data-parola="' + esc(x[4]) + '">' + esc(x[0]) + '</span>' +
        '<span class="termine-nome">' + esc(x[1]) + '</span>' +
        '<span class="termine-pista"><span class="termine-barra" style="width:' +
          (Math.abs(x[2]) / maxAss * 100).toFixed(1) + '%"></span></span>' +
        '<span class="termine-val">' + (x[3] ? L.intero(x[2]) : conSegno(x[2])) +
        '</span></div>';
    }).join('');

    var somma = voci.map(function (x, i) {
      return (i === 0 ? '' : (x[2] < 0 ? ' − ' : ' + ')) + Math.abs(x[2]);
    }).join('');

    var info = S.esiti[r.esito];
    var margine = r.margine_grezzo;
    var fascia = margine <= 9 ? 'fragile' : (margine <= 24 ? 'normale' : 'forte');
    /* TRE STATI, NON DUE, ED E' IL PUNTO PIU' ISTRUTTIVO DELLA PAGINA.
       `stato_prima`  com'era la persona quando ha cominciato questo gesto
       `stato_dopo`   che cosa il gesto produrrebbe da solo, per intero
       `persistente`  che cosa passa davvero al gesto dopo, dopo lo
                      smorzamento al 4,6 % del capitolo 28
       Vederli in fila e' il modo piu' corto di capire perche' cinquecento
       gesti non fanno cinquecento volte il danno di uno. */
    var prima = r.stato_prima, dopo = r.stato_dopo;
    var persiste = r.stato_persistente || dopo;
    function riga(eti, campo) {
      var a2 = prima[campo], pieno = dopo[campo], passa = persiste[campo];
      var dPieno = pieno - a2, dPassa = passa - a2;
      /* ZERO PER ARROTONDAMENTO NON È ZERO, E QUI LA DIFFERENZA È TUTTO.
         Il trasferimento misurato vale il 4,6 %. Su un gesto solo, il 4,6 %
         di pochi punti quasi mai arriva a un punto intero, e il modello
         lavora con numeri interi: la colonna finiva per scrivere «—» su
         ogni riga di ogni nodo, cioè «niente». Ma non è niente — è la
         misura per cui questa pagina esiste, ed è proprio la cosa che il
         capitolo 28 vuole far vedere: sul gesto singolo non si vede, sulla
         lunghezza si somma. Un trattino diceva il falso; adesso la casella
         dice che il trasferimento c'è ed è più piccolo di un punto.
         Trovato provando il simulatore il 10/09/2026. */
      var quantoPassa = dPassa !== 0
        ? conSegno(dPassa)
        : (dPieno !== 0
            ? '<span class="sotto-uno" title="Il trasferimento c’è, ma su questo ' +
              'gesto non arriva a un punto intero. Non si perde: il simulatore ' +
              'tiene da parte le frazioni e le somma. Quando insieme fanno un ' +
              'punto, quel punto passa.">meno di 1</span>'
            : '—');
      return '<tr><td>' + esc(eti) + '</td><td class="num">' + a2 + '</td>' +
        '<td class="num ' + (dPieno === 0 ? 'uguale' : (dPieno > 0 ? 'su' : 'giu')) + '">' +
          (dPieno === 0 ? '—' : conSegno(dPieno)) + '</td>' +
        '<td class="num ' + (dPassa === 0 ? 'uguale' : (dPassa > 0 ? 'su' : 'giu')) + '">' +
          quantoPassa + '</td>' +
        '<td class="num"><b>' + passa + '</b></td></tr>';
    }

    return '<p class="passo-eti">La somma</p>' +
      '<div class="termini">' + barre + '</div>' +
      '<p class="figura-conto">' + somma + ' = <b>' + r.pn_grezzo_prima_del_clamp + '</b>' +
      (r.pn_grezzo_prima_del_clamp !== r.pn
        ? ' → il taglio ai bordi lo riporta a <b>' + r.pn + '</b>'
        : ', dentro i confini 5–95: il taglio non interviene') + '</p>' +

      '<p class="passo-eti">Il dado</p>' +
      '<div class="riga-dado">' +
        '<span class="dado-pn">probabilità (Pn) <b>' + r.pn + '</b></span>' +
        '<span class="dado-tiro">tiro <b>' + r.tiro + '</b></span>' +
        '<span class="dado-verdetto ' + (r.successo_prima_del_campo ? 'ok' : 'ko') + '">' +
          (r.successo_prima_del_campo ? 'riuscito' : 'non riuscito') + '</span>' +
        '<span class="dado-margine">margine ' +
          (r.successo_prima_del_campo ? 'di riuscita (MS)' : 'di fallimento (MF)') +
          ' <b>' + margine + '</b> · ' + esc(fascia) + '</span>' +
      '</div>' +

      '<p class="passo-eti">L’esito</p>' +
      '<p class="esito-riga" style="--tinta:' + S.colori[info.stato] + '">' +
        '<span class="esito-glifo">' + info.glifo + '</span> <b>' + esc(info.titolo) + '</b>' +
        '<br><small>' + esc(info.umano) + '</small></p>' +

      '<p class="passo-eti">Che cosa lascia questo gesto, e quanto ne passa davvero</p>' +
      '<table class="dati tabella-stato"><thead><tr><th>Grandezza</th>' +
      '<th class="num">prima</th><th class="num">il gesto</th>' +
      '<th class="num">ne passa</th><th class="num">dopo</th></tr></thead><tbody>' +
      riga('carico', 'stress_str') +
      riga('assetto', 'posizione_pos') +
      riga('debito', 'debito_deb') +
      riga('costo nascosto', 'costo_nascosto') +
      '</tbody></table>' +
      '<p class="nota">La colonna <b>il gesto</b> dice quanto questo gesto produrrebbe ' +
      'da solo, e la colonna <b>ne passa</b> dice quanto arriva davvero al gesto dopo. ' +
      'La differenza fra le due è il trasferimento, quello misurato nel capitolo 28. ' +
      'Senza quella differenza, una mattina ordinaria finirebbe contro il tetto.</p>' +
      '<p class="nota" style="margin-bottom:0">Dove trovi <b>meno di 1</b> vuol dire che ' +
      'su quel gesto il trasferimento non arriva a un punto intero. Ma <b>non va ' +
      'perduto</b>: il simulatore tiene da parte le frazioni e le somma, come gli spiccioli ' +
      'in un barattolo. Quando insieme fanno un punto, quel punto passa davvero. Per questo ' +
      'su un gesto solo non si vede niente, mentre su una scena intera il conto torna. Ed è ' +
      'per questo che una mattina raccontata gesto per gesto non va a sbattere contro il ' +
      'tetto.</p>';
  }

  function disegnaNodi() {
    if (!lettura.nodi.length) {
      /* Racconto vuoto e racconto senza gesti sono due cose diverse: dire
         «ci sono solo frasi che descrivono la situazione» a chi ha appena
         svuotato il riquadro parla di frasi che non esistono. */
      q('nodi').innerHTML = !lettura.frammenti.length
        ? '<p class="nota">Qui non c’è ancora niente da leggere. Racconta una scena nel ' +
          'riquadro qui sopra, una frase per ogni cosa che succede, e poi premi ' +
          '«Apri e calcola».</p>'
        : '<p class="nota">In questo racconto non ho riconosciuto nessun gesto: ci sono ' +
          'solo frasi che descrivono com’è la situazione. Prova ad aggiungere una frase ' +
          'in cui qualcuno <em>fa</em> qualcosa, come «mi alzo», «cerco le chiavi», «esco», ' +
          'e poi premi di nuovo «Apri e calcola».</p>';
      return;
    }
    /* UN COMANDO PER APRIRE TUTTO IN UNA VOLTA.
       Il calcolo di ogni gesto sta dentro due riquadri richiudibili, chiusi
       di partenza. Con undici gesti sono ventidue clic per vedere lo
       sviluppo nodo per nodo — che e' esattamente la cosa per cui questa
       sezione esiste, e la cosa che Igor ha detto di non trovare, l'11/09/2026.
       Non e' sparita: era piegata via, e mancava il modo di aprirla. */
    q('nodi').innerHTML =
      '<p class="apri-tutto">' +
        '<button type="button" id="apri-tutto" class="secondario">' +
          'Apri tutti i calcoli</button> ' +
        '<span class="nota">Il calcolo si apre un gesto per volta, oppure ' +
        'tutto insieme, da qui. Dentro trovi i valori, da dove vengono, la somma, il dado ' +
        'e che cosa passa al gesto dopo. A passare sono quattro grandezze. Il carico, prima ' +
        'di tutto. Poi l’assetto, cioè quanto sei ancora orientato dentro la scena o quanto ' +
        'ne sei uscito trascinato. Poi il debito, quello che si accumula insistendo su una ' +
        'strada che non funziona. E infine il costo nascosto, il prezzo di un gesto che da ' +
        'fuori sembra riuscito e che si vede solo dopo.</span>' +
      '</p>' +
      lettura.nodi.map(function (n, i) {
      var v = valoriDi(n);
      var r = risultato ? risultato.nodi[i] : null;
      var pn = r ? r.pn : N.calcolaPn(nodiPerIlMotore()[i]).pn;
      var f = pn >= 60 ? 'buono' : (pn >= 35 ? 'attenzione' : (pn >= 15 ? 'serio' : 'critico'));
      var manoQui = corretti[n.id] || {};

      return '<article class="carta-nodo" style="--tinta:' + S.colori[f] + '">' +
        '<header class="nodo-alto">' +
          '<span class="nodo-n">' + n.numero + '</span>' +
          '<span class="nodo-testo"><b>' + esc(n.descrizione) + '</b>' +
            '<small>' + esc(n.azione) + ' · gesto ' + esc(n.classe) + '</small></span>' +
          '<span class="nodo-pn">' + pn + '<small>%</small></span>' +
        '</header>' +
        '<div class="tasselli nodo-valori">' + CAMPI.map(function (c) {
          return tasselloValore(n, c, v[c.k], manoQui[c.k] !== undefined);
        }).join('') + '</div>' +
        (n.campo.length
          ? '<p class="nodo-campo">⚠ Qui c’è qualcosa che <b>risponde</b> al tentativo: ' +
            esc(L.elenco(n.campo.map(function (c) { return c.nome; }))) +
            '. Non entra nella formula: agisce dopo il dado.</p>'
          : '') +
        '<details><summary>Perché questi numeri, e come cambiarli</summary>' +
          bloccoTracce(n) + '</details>' +
        '<details' + (i === 0 && risultato ? ' open' : '') +
          '><summary>Il calcolo, passaggio per passaggio</summary>' +
          bloccoCalcolo(n, r) + '</details>' +
        '</article>';
    }).join('');

    sfogliaNodi();

    (function () {
      var bottone = q('nodi').querySelector('#apri-tutto');
      if (!bottone) { return; }
      bottone.addEventListener('click', function () {
        var riquadri = q('nodi').querySelectorAll('details');
        /* si guarda quanti sono chiusi: se ne resta anche uno solo, il
           comando apre. Cosi' non capita mai di premere «apri» e vedere
           qualcosa chiudersi. */
        var chiusi = 0;
        Array.prototype.forEach.call(riquadri, function (d) { if (!d.open) { chiusi++; } });
        var apri = chiusi > 0;
        Array.prototype.forEach.call(riquadri, function (d) { d.open = apri; });
        bottone.textContent = apri ? 'Chiudi tutti i calcoli' : 'Apri tutti i calcoli';
      });
    }());

    Array.prototype.forEach.call(q('nodi').querySelectorAll('input[data-campo]'), function (inp) {
      inp.addEventListener('change', function () {
        var id = inp.getAttribute('data-nodo'), k = inp.getAttribute('data-campo');
        corretti[id] = corretti[id] || {};
        corretti[id][k] = parseInt(inp.value, 10) || 0;
        /* si ricalcola subito. Prima si azzerava il risultato e la pagina
           tornava a dire «premi Calcola la scena»: cambiare un numero
           spegneva tutto quello che c'era sotto, e sembrava un difetto. */
        calcola();
      });
    });
  }

  /* --------------------------------------------------------------------
     3 · LA CATENA INTERA
     -------------------------------------------------------------------- */
  /* Un riquadro vuoto ha due ragioni diverse per essere vuoto, e dire la
     ragione sbagliata manda la persona a premere un tasto che ha appena
     premuto. O il calcolo non e' stato ancora chiesto, o non c'e' proprio
     niente da calcolare perche' nel racconto non c'e' nessun gesto.

     E la spiegazione lunga — che cosa scrivere per farsi capire — si dice
     UNA volta, nel riquadro dei gesti, che e' il primo che si incontra.
     Qui sotto basta ricordare perche' questo pezzo non c'e': quattro volte
     lo stesso paragrafo sulla stessa schermata non e' insistenza, e' rumore,
     e chi legge si chiede se stia guardando quattro problemi diversi. */
  function senzaGesti() { return !lettura || !lettura.nodi.length; }
  function perche(cosaManca) {
    return senzaGesti()
      ? '<p class="nota">Senza gesti non c’è ' + cosaManca +
        ': la spiegazione sta qui sopra, nel riquadro dei gesti.</p>'
      : '<p class="nota">Qui non c’è ancora niente: premi <b>Apri e calcola</b> qui sopra ' +
        'e questo riquadro si riempie.</p>';
  }

  function disegnaCatena() {
    if (!risultato) {
      q('catena').innerHTML = perche('una catena da mostrare');
      return;
    }
    var nodi = risultato.nodi;
    var punti = nodi.map(function (nd, i) {
      return [i + 1, (nd.stato_persistente || nd.stato_dopo).stress_str];
    });
    var g = D.tela({ larghezza: 760, altezza: 240, x: [1, Math.max(2, nodi.length)],
                     y: [0, 100], margini: { sinistra: 42, basso: 40 } });
    g.sfumatura('areaSc', 'var(--ostacola)', 0.28, 0.02);
    g.griglia([0, 25, 50, 75, 100]);
    g.area(punti, 'url(#areaSc)');
    g.linea(punti, { colore: 'var(--ostacola)' });
    g.punti(punti.map(function (p, i) {
      return [p[0], p[1], nodi[i].descrizione + ' — carico ' + p[1]];
    }), { colore: 'var(--ostacola)', raggio: 3.4 });
    g.asseX(nodi.map(function (nd, i) { return [i + 1, String(i + 1)]; }).filter(function (t, i) {
      return nodi.length <= 12 || i % Math.ceil(nodi.length / 10) === 0;
    }), 'i gesti, in ordine');

    var info = S.esiti[risultato.esito];
    var gran = A.verificaGranularita(nodiPerIlMotore());
    var d = risultato.delta;

    q('catena').innerHTML =
      '<div class="tasselli">' +
        '<div class="tassello"><div class="k">Esito della scena</div>' +
          '<div class="v" style="font-size:var(--t-medio);color:' + S.colori[info.stato] + '">' +
          esc(info.titolo) + '</div><div class="s">l’anello peggiore decide</div></div>' +
        '<div class="tassello"><div class="k">Carico</div><div class="v">' +
          risultato.stato_iniziale.stress_str + ' → ' + risultato.stato_finale.stress_str +
          '</div><div class="s">' + conSegno(d.STR) + ' in tutta la scena</div></div>' +
        '<div class="tassello"><div class="k">Assetto</div><div class="v">' +
          risultato.stato_finale.posizione_pos + '</div><div class="s">' +
          conSegno(d.POS) + ' in tutta la scena</div></div>' +
        '<div class="tassello"><div class="k">Costo nascosto</div><div class="v">' +
          risultato.stato_finale.costo_nascosto + '</div><div class="s">' +
          conSegno(d.costo_nascosto) + ' in tutta la scena</div></div>' +
        /* IL NOME DELLA FASCIA NON E' LA DESCRIZIONE DI QUESTA SCENA.
           Sotto il conteggio c'era scritto il nome della scala — «un gesto
           singolo» — anche quando i gesti letti erano cento: la scala va da
           1 a 5 e il nome e' quello, ma stampato li' sembrava dire che nel
           racconto ci fosse un gesto solo. Adesso e' dichiarato come quello
           che e': la fascia in cui questo numero cade. */
        '<div class="tassello"><div class="k">Gesti diversi</div><div class="v">' +
          gran.nodi_distinti + '</div><div class="s">su ' +
          L.plurale(gran.nodi_forniti, 'gesto letto', 'gesti letti') + ' · è la fascia «' +
          esc(gran.scala.etichetta.toLowerCase()) + '», che va da ' + gran.scala.min +
          ' a ' + gran.scala.max + '</div></div>' +
      '</div>' +
      g.chiudi('Il carico lungo la scena, gesto per gesto') +
      (gran.repliche
        ? '<p class="nota-doppia">' + esc(gran.spiegazione) + '</p>'
        : '') +
      '<div class="distribuzione">' + Object.keys(risultato.conteggi)
        .sort(function (a2, b2) { return risultato.conteggi[b2] - risultato.conteggi[a2]; })
        .map(function (k) {
          var inf = S.esiti[k];
          var quota = risultato.conteggi[k] / nodi.length * 100;
          return '<div class="riga-distribuzione" style="--tinta:' + S.colori[inf.stato] + '">' +
            '<span class="dist-glifo">' + inf.glifo + '</span>' +
            '<span class="dist-nome">' + esc(inf.titolo) + '</span>' +
            '<span class="dist-pista"><span class="dist-barra" style="width:' +
              quota.toFixed(1) + '%"></span></span>' +
            '<span class="dist-quota">' + Math.round(quota) + '<small>%</small></span>' +
            '<span class="dist-conta">' + L.plurale(risultato.conteggi[k], 'gesto', 'gesti') +
            '</span></div>';
        }).join('') + '</div>';
  }

  /* --------------------------------------------------------------------
     IL RACCONTO
     --------------------------------------------------------------------
     Ogni esito viene raccontato, non solo calcolato: e' una delle promesse
     centrali del pacchetto, e questa pagina era l'unica che calcolava senza
     raccontare. Il racconto della catena non dice com'e' andato un gesto:
     dice che storia e' stata la sequenza. */
  function disegnaRacconto() {
    if (!risultato || !globale.Racconto || !globale.VistaRacconto) {
      q('racconto').innerHTML = perche('una storia da raccontare');
      return;
    }
    q('racconto').innerHTML = globale.VistaRacconto.disegna(
      globale.Racconto.componiRaccontoCatena(risultato));
  }

  /* --------------------------------------------------------------------
     LA SATURAZIONE                                     [libro, capitolo 29]
     --------------------------------------------------------------------
     La domanda che il capitolo 29 impone di porsi a ogni scena lunga: il
     modello sta ancora distinguendo qualcosa, o ha smesso? Un carico
     appoggiato al tetto da meta' scena in poi non e' un risultato: e' un
     modello diventato cieco. */
  function disegnaSaturazione() {
    var sat = risultato && risultato.saturazione;
    if (!sat) { q('saturazione').innerHTML = ''; return; }
    var grave = sat.satura || sat.quota_al_tetto > 0.25;
    q('saturazione').innerHTML =
      '<div class="riquadro-sat ' + (grave ? 'grave' : 'ok') + '">' +
      '<p class="sat-titolo">' + (grave
        ? 'Attenzione: il modello non distingue quasi più'
        : 'Il modello distingue ancora') + '</p>' +
      '<p>' + esc(sat.spiegazione || '') + '</p></div>';
  }

  /* --------------------------------------------------------------------
     MILLE VOLTE LA STESSA SCENA
     --------------------------------------------------------------------
     Un caso solo non dice quanto sia tipico. Qui la scena LETTA — non una
     scena di esempio — viene rigiocata con dadi diversi, e si guarda la
     forma di quello che esce. Le due unita' statistiche restano dichiarate
     e separate, come impone il capitolo 27. */
  function disegnaMonteCarlo() {
    if (!mc) {
      q('montecarlo').innerHTML = senzaGesti()
        ? perche('niente da ripetere')
        : '<p class="nota">Premi <b>Ripeti la scena</b> qui sopra, e invece di un caso solo ' +
          'vedrai la forma di tutti i casi possibili. Quante volte ripeterla lo scegli tu, ' +
          'nel menù accanto al pulsante.</p>';
      return;
    }
    var h = A.istogramma(mc.campioni.stress, { fasce: 12 });
    var dentro = '';
    if (h && !h.degenere) {
      var primo = h.fasce[0].da, ultimo = h.fasce[h.fasce.length - 1].a;
      var maxN = Math.max.apply(null, h.fasce.map(function (f) { return f.n; }));
      var g = D.tela({ larghezza: 720, altezza: 220, x: [primo, ultimo],
                       y: [0, maxN * 1.1], margini: { sinistra: 44, basso: 40 } });
      g.griglia([0, Math.round(maxN / 2), maxN]);
      g.bandaX(mc.stress_finale.p10, mc.stress_finale.p90, 'var(--inchiostro-3)', 0.09);
      g.barre(h.fasce.map(function (f) {
        return [(f.da + f.a) / 2, f.n, 'da ' + f.da + ' a ' + f.a + ': ' +
                L.plurale(f.n, 'ripetizione', 'ripetizioni')];
      }), { colore: 'var(--ostacola)' });
      g.sogliaX(mc.stress_finale.media, 'media ' + num(mc.stress_finale.media), 'var(--inchiostro)');
      var tacche = [];
      for (var v = primo; v <= ultimo; v += Math.max(1, Math.round((ultimo - primo) / 6))) {
        tacche.push([v, String(v)]);
      }
      g.asseX(tacche, 'carico alla fine della scena');
      dentro = g.chiudi('La distribuzione del carico finale');
    } else if (h) {
      dentro = '<p class="figura-conto">Tutte le ripetizioni finiscono a <b>' + h.minimo +
        '</b>. Non c’è una distribuzione da mostrare, cioè un ventaglio di risultati ' +
        'diversi. C’è un solo esito possibile.</p>';
    }

    q('montecarlo').innerHTML =
      '<div class="tasselli">' +
        '<div class="tassello"><div class="k">n della scena</div><div class="v">' +
          mc.ripetizioni + '</div><div class="s">' + esc(mc.unita_statistica) +
          '</div></div>' +
        '<div class="tassello"><div class="k">n del nodo</div><div class="v">' +
          num(mc.nodo.n, 0) + '</div><div class="s">' + esc(mc.nodo.unita_statistica) +
          '</div></div>' +
        '<div class="tassello"><div class="k">Carico finale, media</div><div class="v">' +
          num(mc.stress_finale.media) + '</div><div class="s">± ' +
          num(mc.stress_finale.semiampiezza_95, 2) + ' al 95 %</div></div>' +
        '<div class="tassello"><div class="k">Gesti riusciti</div><div class="v">' +
          num(mc.nodo.quota_riuscite * 100) + '<small style="font-size:var(--t-piccolo)">%</small>' +
          '</div><div class="s">contando tutti i gesti di tutte le ripetizioni</div></div>' +
      '</div>' +
      '<p class="nota-doppia">' + esc(mc.nota_conteggio) + ' Le due n non si sommano: ' +
      'è la regola del capitolo 27, e questa pagina la scrive ogni volta.</p>' +
      dentro +
      '<div class="distribuzione">' + mc.esiti.map(function (o) {
        var inf = S.esiti[o.chiave];
        return '<div class="riga-distribuzione" style="--tinta:' + S.colori[inf.stato] + '">' +
          '<span class="dist-glifo">' + inf.glifo + '</span>' +
          '<span class="dist-nome">' + esc(inf.titolo) + '</span>' +
          '<span class="dist-pista"><span class="dist-barra" style="width:' +
            (o.quota * 100).toFixed(1) + '%"></span></span>' +
          '<span class="dist-quota">' + globale.Lingua.numero(o.quota * 100) +
            '<small>%</small></span>' +
          '<span class="dist-conta">' +
          L.plurale(o.n, 'ripetizione', 'ripetizioni') + '</span></div>';
      }).join('') + '</div>';
  }

  function disegnaMuti() {
    if (!lettura.muti || !lettura.muti.length) { q('muti').innerHTML = ''; return; }
    q('muti').innerHTML =
      '<details class="muti"><summary>' + (lettura.muti.length === 1
        ? 'Un pezzo del racconto non ha prodotto niente'
        : lettura.muti.length + ' pezzi del racconto non hanno prodotto niente') + '</summary>' +
      '<p class="nota" style="margin-top:8px">Il vocabolario non ci ha riconosciuto né un ' +
      'gesto né una condizione, quindi questi pezzi non sono entrati nel calcolo. Molte ' +
      'frasi di un racconto sono cornice, e va bene così, ma è meglio saperlo prima di ' +
      'leggere i numeri. Se qui compare qualcosa che secondo te doveva contare, è il ' +
      'vocabolario che va allargato, non il tuo racconto.</p><ul class="tracce">' +
      lettura.muti.map(function (m) { return '<li>«' + esc(m) + '»</li>'; }).join('') +
      '</ul></details>';
  }

  /* CHE COSA HO LETTO, IN UNA RIGA.
     Il tasto «apri» sembrava non funzionare, e il motivo era che la pagina
     apre e calcola gia' da sola al caricamento: premendolo non cambiava
     niente di visibile, perche' era gia' tutto li'. Adesso ogni lettura
     lascia un segno — quanti gesti, quanto contesto, quanto non riconosciuto
     — e premere il tasto si vede. */
  function disegnaStato() {
    var el = q('statoLettura');
    if (!el || !lettura) { return; }
    var contesto = lettura.frammenti.filter(function (f) { return f.tipo === 'contesto'; }).length;
    var muti = (lettura.muti || []).length;
    var gesti = lettura.nodi.length;
    /* «1 pezzi» si legge male, e in una pagina che parla di lettura una
       sbavatura di lingua e' proprio quella che non ci si puo' permettere.
       La regola del plurale non si riscrive qui: la sa lingua.js, e questa
       funzione le chiede solo la parola giusta — il numero lo mette in
       grassetto da sola, che e' l'unica cosa in piu' che serve. */
    function conta(n, uno, molti) { return '<b>' + n + '</b> ' + L.concorda(n, uno, molti); }
    /* Lo zero valeva per i gesti e non per il contesto, e cosi' una scena
       tutta di gesti finiva con «Ho letto 100 gesti e 0 pezzi di contesto»:
       un conteggio in mezzo a una frase, proprio nella pagina che si vanta
       di leggere l'italiano. Trovato provando il simulatore il 10/09/2026. */
    function contesti(n) {
      return n === 0 ? '<b>nessun</b> pezzo di contesto'
                     : conta(n, 'pezzo di contesto', 'pezzi di contesto');
    }

    if (!gesti && !contesto) {
      el.innerHTML = 'Non c’è ancora niente da leggere: scrivi una scena qui sopra.';
      return;
    }
    /* «di cui» diceva il falso: i pezzi muti non sono una parte dei gesti e
       del contesto, sono una terza categoria — quelli che non sono ne' l'uno
       ne' l'altro. Con «e in piu'» il conto torna. */
    /* Lo zero non si dice come gli altri numeri: «Ho letto 0 gesti» e' un
       conteggio, non una frase, e in una pagina che si vanta di leggere
       l'italiano e' proprio la riga da non sbagliare. */
    var coda = (muti ? ', e in più ' + conta(muti, 'pezzo in cui non ho riconosciuto niente',
                                             'pezzi in cui non ho riconosciuto niente') : '') +
               '.' + (risultato ? ' Il calcolo l’ho fatto con il seme ' + seme + '.' : '');
    el.innerHTML = (gesti === 0
      ? 'Non ho riconosciuto <b>nessun gesto</b>: solo ' +
        conta(contesto, 'pezzo di contesto', 'pezzi di contesto')
      : 'Ho letto ' + conta(gesti, 'gesto', 'gesti') + ' e ' + contesti(contesto)) + coda;
  }

  function disegnaAvvisi() {
    var testa = avvisoCarico
      ? '<p class="avviso-scena a-carico">' + esc(avvisoCarico) + '</p>'
      : '';
    if (!lettura.avvisi.length) { q('avvisi').innerHTML = testa; return; }
    q('avvisi').innerHTML = testa + lettura.avvisi.map(function (a) {
      return '<p class="avviso-scena a-' + esc(a.tipo) + '">' + esc(a.testo) + '</p>';
    }).join('');
  }

  function disegna() {
    disegnaStato();
    disegnaLettura();
    disegnaAvvisi();
    disegnaMuti();
    disegnaNodi();
    disegnaCatena();
    disegnaSaturazione();
    disegnaRacconto();
    disegnaMonteCarlo();
    if (globale.Glossario && globale.Glossario.decoraTutte) { globale.Glossario.decoraTutte(); }
  }

  /* LA CATENA GIRA CON IL TRASFERIMENTO MISURATO, COME LE ALTRE PAGINE.
     Con `Stato.eseguiScena` ogni nodo cede allo stato tutto il suo effetto,
     ed e' il comportamento storico: una mattina di undici gesti ordinari
     finiva con il carico a 100, cioe' contro il tetto, dove il modello non
     distingue piu' niente. Il fattore misurato e' il 4,6 % [capitolo 28], ed
     e' quello che usano CATENA e MONTECARLO: se questa pagina usasse un
     altro numero direbbe una cosa diversa dalle sue sorelle sulla stessa
     scena. */
  function calcola() {
    var nodi = nodiPerIlMotore();
    if (!nodi.length) {
      /* SENZA GESTI NON C'E' NIENTE DA CALCOLARE, MA LA PAGINA DEVE
         RIDISEGNARSI LO STESSO.
         Prima si usciva di qui in silenzio, e a schermo restava tutto il
         calcolo della scena precedente: i suoi nodi, la sua catena, il suo
         racconto, e in cima la riga «Ho letto 11 gesti». Chi aveva appena
         cancellato il testo e premuto «Apri e calcola» vedeva una pagina
         piena che parlava di un'altra scena — non un errore, una bugia.
         E' lo stesso difetto gia' corretto sulla pagina della catena. */
      risultato = null;
      mc = null;
      disegna();
      return;
    }
    var cal = (q('trasferimento').value === 'storico') ? MS.STORICA : MS.CALIBRAZIONE;
    risultato = MS.eseguiCatenaMicro(nodi, {
      rng: new globale.CasualePython(seme), calibrazione: cal
    });
    mc = null;
    disegna();
  }

  function rigioca() {
    var nodi = nodiPerIlMotore();
    if (!nodi.length) { mc = null; disegna(); return; }
    var cal = (q('trasferimento').value === 'storico') ? MS.STORICA : MS.CALIBRAZIONE;
    mc = A.montecarlo(nodi, { ripetizioni: parseInt(q('ripetizioni').value, 10),
                              seme: seme, calibrazione: cal });
    disegna();
  }

  /* --------------------------------------------------------------------
     AVVIO
     -------------------------------------------------------------------- */
  document.addEventListener('DOMContentLoaded', function () {
    q('scena').value = ESEMPIO;
    q('apri').addEventListener('click', function () {
      rileggi(true);
      calcola();
      /* si porta l'occhio dove il tasto ha lavorato, e lo si segnala per un
         istante: senza, chi preme non vede muoversi niente perche' il
         risultato sta sotto la piega dello schermo */
      var dove = q('lettura');
      if (dove && dove.scrollIntoView) {
        dove.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      var sez = dove ? dove.closest('.riquadro') : null;
      if (sez) {
        sez.classList.remove('appena-letta');
        /* due fotogrammi, altrimenti il browser non rifa' l'animazione */
        globale.requestAnimationFrame(function () {
          globale.requestAnimationFrame(function () { sez.classList.add('appena-letta'); });
        });
      }
    });
    q('calcolaScena').addEventListener('click', calcola);
    q('svuota').addEventListener('click', function () {
      q('scena').value = '';
      q('scena').focus();
      rileggi(true); disegna();
    });
    q('rigioca').addEventListener('click', function () {
      var b2 = q('rigioca');
      var prima = b2.textContent;
      b2.textContent = 'Sto ripetendo la scena…';
      /* un fotogramma al browser per mostrarlo, poi si comincia: mille
         ripetizioni su una scena lunga sono qualche secondo di lavoro vero */
      setTimeout(function () { rigioca(); b2.textContent = prima; }, 30);
    });
    q('caricoBase').addEventListener('change', function () { rileggi(false); calcola(); });
    q('trasferimento').addEventListener('change', function () { if (risultato) { calcola(); } });
    q('nuovoSeme').addEventListener('click', function () {
      seme = (seme + 7919) % 1000000;
      q('semeOra').textContent = seme;
      if (risultato) { calcola(); }
    });
    q('semeOra').textContent = seme;

    q('tema').addEventListener('click', function () {
      var attuale = document.documentElement.getAttribute('data-tema');
      var nuovo = attuale === 'scuro' ? 'chiaro' : 'scuro';
      document.documentElement.setAttribute('data-tema', nuovo);
      q('tema').textContent = nuovo === 'scuro' ? 'Tema chiaro' : 'Tema scuro';
    });
    q('stampa').addEventListener('click', function () { globale.print(); });

    rileggi(true);
    calcola();
  });

  globale.ScenaUI = { rileggi: rileggi, calcola: calcola, rigioca: rigioca };
}(typeof window !== 'undefined' ? window : this));
