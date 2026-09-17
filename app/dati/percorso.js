/* =============================================================================
   SIMULATORE 3.0 — Il percorso: dove sei, e dove si va dopo
   =============================================================================
   PERCHE' ESISTE

   All'inizio le pagine erano cinque documenti separati, collegati da una
   pila di link in mezzo alla pagina. Chi arrivava non capiva ne' dove fosse,
   ne' in che ordine conveniva aprirle, ne' perche' ce ne fossero tante.
   Oggi sono dodici, e questo file e' l'unico posto che le elenca tutte:
   la porta (APRI-QUI.html), i quattro gradini, e le sette del menu.

   Ma un ordine c'e', e lo dice il libro: «le domande sono in ordine di
   lunghezza del tempo che guardano. E' lo stesso ordine dei sei livelli
   temporali del capitolo 23». Le pagine non sono alternative fra loro: sono
   una scala, e ogni gradino vede una cosa che il gradino prima non poteva
   vedere.

   «Un gesto dice se una cosa riesce. Una giornata dice quanto costa.
    Una settimana dice se il recupero regge.» — Apparato I

   IL QUESTIONARIO NON E' UN GRADINO
   E' una porta diversa per entrare nel primo: stessa destinazione, per chi
   non sa quali numeri mettere. Metterlo in fila con gli altri farebbe
   credere che venga dopo il gesto singolo, e non e' vero.

   TUTTO QUI DENTRO VIENE DAL LIBRO
   Le domande sono quelle dell'Apparato I, parola per parola. _test/libro.js
   verifica che siano ancora le stesse: se il libro cambia una domanda e la
   pagina no, il controllo se ne accorge.
   ========================================================================== */
(function (globale) {
  'use strict';

  var GRADINI = [
    { file: 'IL-GESTO.html',    n: 1, nome: 'Il gesto',       durata: 'un gesto solo',
      domanda: 'Com’è andato questo gesto, e perché?',
      vede: 'se una cosa riesce',
      invito: 'Comincia da qui. È l’unica pagina in cui si vede il legame diretto fra un cursore che si muove e un numero che cambia.' },
    { file: 'CATENA.html',      n: 2, nome: 'La catena',      durata: 'più gesti di seguito',
      domanda: 'Come si accumula il carico lungo una sequenza?',
      vede: 'quanto costa una sequenza',
      invito: 'Un gesto solo non dice se il carico si accumula, e per accorgersene servono più gesti di fila. Nella catena i gesti si passano lo stato, e quello che il primo lascia arriva addosso al secondo.' },
    { file: 'SETTIMANA.html',   n: 3, nome: 'La settimana',   durata: 'più giorni, con la notte in mezzo',
      domanda: 'Il recupero sta ancora funzionando?',
      vede: 'se il recupero regge',
      invito: 'Una catena non ha la notte dentro. La settimana sì, ed è per questo che qui si vede una cosa nuova: se dormire basta ancora a rimettersi in pari.' },
    { file: 'TRAIETTORIA.html', n: 4, nome: 'La traiettoria', durata: 'più settimane di seguito',
      domanda: 'Sta cambiando il modo di vivere?',
      vede: 'se il regime peggiora o tiene',
      invito: 'Una settimana difficile, da sola, non dice niente. Sei settimane che vanno nella stessa direzione, invece, dicono tutto, ed è quello che qui si guarda.' }
  ];

  /* LA PORTA LATERALE DEL PRIMO GRADINO.
     Non e' un gradino: porta esattamente dove porta il primo, per un'altra
     strada. Metterla in fila con gli altri farebbe credere che venga dopo
     il gesto singolo, e non e' vero. */
  var PORTA = {
    file: 'QUESTIONARIO.html', nome: 'Fammi delle domande', icona: '?',
    domanda: 'Non so quali numeri mettere.',
    breve: 'i cursori non ci sono',
    invito: 'Porta allo stesso posto del primo gradino, ma per un’altra strada. Qui i cursori non ci sono: si risponde a una domanda per volta, e il simulatore costruisce il nodo dalle risposte.'
  };

  /* SOTTO LA SCALA — le pagine che non stanno su nessun gradino.
     La scala e' fatta di durate: un gesto, una catena, una settimana, dei
     mesi. Queste tre non hanno una durata. Stanno sotto tutte e quattro,
     e rispondono a domande che nessun gradino puo' porre:

       la matematica   come si calcola, esattamente
       gli esempi      fammi vedere dei casi gia' fatti, con i numeri veri
       le mille giocate    un caso non basta: fammi vedere la distribuzione

     Erano due pillole in fila accanto al questionario. A tre diventano una
     fila di link che si legge come un elenco della spesa, e non si capisce
     piu' che cosa hanno in comune: percio' adesso stanno in un menu, con un
     nome che dice perche' sono insieme. */
  /* LA LETTURA LUNGA STA IN UN GRUPPO SUO.
     Non e' un gradino e non e' nemmeno «sotto la scala» come la matematica o
     i casi: quelle sono pagine da consultare, questa e' un testo da leggere
     di seguito. Metterla insieme alle altre l'avrebbe fatta sembrare una
     quarta scheda di riferimento, e non e' quello che e'. */
  /* Ogni gruppo ha un «tipo», e il tipo dice che cosa viene DOPO quella
     pagina: la lettura non ha un dopo; le strade portano al primo gradino,
     quindi il loro dopo e' il secondo; le pagine sotto la scala si
     rimandano a vicenda e poi riportano alla scala. Prima il tipo si
     indovinava dal nome del file, e LA-SCENA finiva trattata come se
     stesse sotto la scala: in fondo alla pagina le si proponeva la
     matematica, invece della catena. */
  var MENU = {
    nome: 'Le altre pagine',
    perche: 'Sette pagine che non stanno su un gradino della scala.',
    gruppi: [
      { tipo: 'lettura', titolo: 'Da leggere di seguito, come un libro', voci: ['IL-MODELLO.html'] },
      { tipo: 'strade', titolo: 'Due strade per costruire una scena',
        voci: ['LA-SCENA.html', 'QUESTIONARIO.html'] },
      { tipo: 'sotto', titolo: 'Sotto la scala: valgono per tutti e quattro i livelli',
        voci: ['LA-FORMULA.html', 'ESEMPI.html', 'MONTECARLO.html', 'INDAGINE.html'] }
    ],
    voci: [
      { file: 'IL-MODELLO.html', nome: 'Il modello, letto per intero', icona: '❦',
        domanda: 'Voglio capirlo prima di usarlo.',
        breve: 'diciannove capitoli, sedici figure che si muovono',
        invito: 'Le altre pagine sono strumenti, e questa invece è una lettura, dal primo gesto alle mille ripetizioni. C’è tutta la matematica, e le figure si muovono mentre le guardi.' },
      { file: 'LA-SCENA.html', nome: 'Racconta la scena', icona: '✎',
        domanda: 'Voglio scriverla come la racconterei, non un gesto per riga.',
        breve: 'la divide in nodi da sola',
        invito: 'Scrivi la mattina in prosa, come la racconteresti a voce, e il simulatore la divide nei gesti che contiene. Poi propone i nove valori di ogni gesto, e ti dice quale parola li ha prodotti. Infine calcola tutto, nodo per nodo.' },
      { file: 'QUESTIONARIO.html', nome: 'Fammi delle domande', icona: '?',
        domanda: 'Non so quali numeri mettere.',
        breve: 'i cursori non ci sono',
        invito: 'È l’altra delle due strade, e qui non scrivi niente e non muovi nessun cursore. Rispondi a una domanda per volta, e il simulatore ricava i nove valori dalle risposte.' },
      { file: 'LA-FORMULA.html', nome: 'La matematica, da zero', icona: '∑',
        domanda: 'Come si calcola, esattamente?',
        breve: 'la formula aperta pezzo per pezzo',
        invito: 'Qui la formula si apre un pezzo per volta, e accanto a ogni pezzo c’è il codice vero del motore. In fondo ci sono le quattro cose che il canone dichiara di non contenere.' },
      { file: 'ESEMPI.html', nome: 'I casi del libro', icona: '▤',
        domanda: 'Fammi vedere dei casi già fatti, con i numeri veri.',
        breve: 'i casi già calcolati',
        invito: 'Qui ci sono i casi già calcolati nel libro. Le dodici schede del capitolo 39, i due esempi guidati del capitolo 5, i sei margini del capitolo 9. Sono numeri veri, e il motore li ricalcola mentre li leggi.' },
      { file: 'MONTECARLO.html', nome: 'Mille volte la stessa scena', icona: '▓',
        domanda: 'Un caso solo non basta: fammi vedere la distribuzione.',
        breve: 'la distribuzione, non un caso',
        invito: 'La stessa scena, ripetuta centinaia o migliaia di volte, ogni volta con un dado diverso. Vedi come si distribuiscono gli esiti. Vedi quanto si stringe l’intervallo, cioè la fascia di incertezza intorno al risultato, mentre le ripetizioni salgono. E vedi come vanno due varianti con lo stesso dado.' },
      { file: 'INDAGINE.html', nome: 'Dove si rompe, e perché', icona: '⌖',
        domanda: 'Qual è il punto debole di questa sequenza?',
        breve: 'i punti delicati, con gli intervalli',
        invito: 'Qui la scena non si racconta: si esamina. Il simulatore la ripete migliaia di volte, e poi dice quale gesto è il punto debole, e quanto siamo sicuri che lo sia. Dice anche da dove vengono i punti che gli mancano, e quale condizione cambierebbe davvero le cose.' }
    ]
  };

  function qualePagina() {
    var f = (globale.location && globale.location.pathname || '').split('/').pop();
    if (!f) { return GRADINI[0].file; }
    return decodeURIComponent(f);
  }

  function gradinoDi(file) {
    for (var i = 0; i < GRADINI.length; i++) { if (GRADINI[i].file === file) { return GRADINI[i]; } }
    return null;
  }

  function prossimo(file) {
    var g = gradinoDi(file);
    if (!g) { return GRADINI[0]; }                 // dal questionario si va al gesto
    return GRADINI[g.n] || null;                   // n e' 1-based: GRADINI[n] e' il successivo
  }

  function voceDi(file) {
    for (var i = 0; i < MENU.voci.length; i++) {
      if (MENU.voci[i].file === file) { return MENU.voci[i]; }
    }
    return null;
  }

  /* in quale gruppo del menu sta una pagina: 'lettura', 'strade', 'sotto',
     oppure null se e' un gradino o la porta */
  function tipoDi(file) {
    for (var i = 0; i < MENU.gruppi.length; i++) {
      if (MENU.gruppi[i].voci.indexOf(file) >= 0) { return MENU.gruppi[i].tipo; }
    }
    return null;
  }

  /* le quattro pagine che stanno SOTTO la scala. Il questionario e il
     racconto non sono fra queste: non stanno sotto, stanno accanto al
     primo gradino. Prima si toglieva soltanto il questionario, e la
     lettura lunga e il racconto finivano contati come «sorelle» della
     matematica: in fondo a LA-FORMULA si leggeva «le altre due» seguito
     da cinque bottoni. */
  function sottoLaScala() {
    return MENU.voci.filter(function (v) { return tipoDi(v.file) === 'sotto'; });
  }

  /* LE DODICI PAGINE, NELL'ORDINE IN CUI LA PORTA LE PRESENTA.
     La porta per prima, poi i quattro gradini dal tempo piu' corto al piu'
     lungo, poi i gruppi del menu nell'ordine del menu. E' l'elenco che i
     controlli confrontano con i file .html che esistono davvero: una
     pagina nuova che non entra qui non compare da nessuna parte, e una
     pagina elencata qui che non esiste e' un link rotto su dodici pagine. */
  var PORTA_DI_CASA = 'APRI-QUI.html';
  function tutteLePagine() {
    var elenco = [PORTA_DI_CASA];
    GRADINI.forEach(function (g) { elenco.push(g.file); });
    MENU.gruppi.forEach(function (g) { g.voci.forEach(function (f) { elenco.push(f); }); });
    return elenco;
  }

  var API = { GRADINI: GRADINI, PORTA: PORTA, MENU: MENU, qualePagina: qualePagina,
              gradinoDi: gradinoDi, voceDi: voceDi, tipoDi: tipoDi,
              sottoLaScala: sottoLaScala, tutteLePagine: tutteLePagine,
              PORTA_DI_CASA: PORTA_DI_CASA, prossimo: prossimo };
  globale.Percorso = API;
  if (typeof module !== 'undefined' && module.exports) { module.exports = API; }
}(typeof window !== 'undefined' ? window : this));
