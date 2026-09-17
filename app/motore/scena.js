/* =============================================================================
   SIMULATORE 3.0 — Dal racconto ai nodi
   =============================================================================
   LIVELLO ESTERNO AL CORE.
   Qui non c'e' formula, non c'e' clamp, non c'e' dado, non ci sono esiti:
   quelli stanno in nucleo.js e non si toccano. Qui si fa una cosa sola,
   quella che mancava: prendere una scena RACCONTATA e aprirla nei nodi che
   contiene, proponendo per ognuno i suoi nove valori.

   PERCHE' SERVIVA
   Il modo naturale di descrivere una mattina e' raccontarla. Il simulatore
   chiedeva invece di scriverla gia' smontata — un gesto per riga — e di dare
   a tutti i gesti gli stessi numeri con dei cursori condivisi. Ma smontare
   una scena e' gia' meta' del lavoro di analisi, ed e' la meta' in cui si
   sbaglia: il libro ci dedica un capitolo intero, il 24, e lo intitola
   «segmentare e' gia' interpretare».

   ⚠️ TRE REGOLE, E SONO TUTTE DEL LIBRO

   1. IL TESTO PROPONE, LA PERSONA DECIDE.
      Ogni numero che esce di qui e' una proposta, e viaggia sempre con la
      TRACCIA: quale parola l'ha prodotta e perche'. La pagina le mostra
      accanto al numero e le lascia cambiare. Non c'e' nessuna IA: e' una
      tabella di parole, deterministica e testabile [`app/dati/lessico.js`].

   2. IL DOMICILIO UNICO, APPLICATO AL TESTO.        [libro, capitolo 18]
      Ogni fatto entra una volta sola. Qui la posizione nel racconto decide
      dove: una condizione nominata in una frase di CONTESTO vale per tutta
      la scena, una nominata DENTRO un gesto vale per quel gesto.
      Due eccezioni dichiarate, perche' descrivono la persona e non il
      gesto: il carico e il debito valgono sempre per tutta la scena, ovunque
      siano nominati. E una in senso opposto: la complessita' vale sempre
      solo per il gesto in cui compare, perche' e' una proprieta' sua.

   3. IL CAMPO ATTIVO RESTA FUORI.                   [libro, capitolo 10]
      Quello che RISPONDE al tentativo — il cane che tira, il servizio che
      rifiuta il codice — non entra nella formula: agisce dopo il dado. Qui
      viene riconosciuto per essere SEGNALATO, mai per essere calcolato.
      Quanti punti valga il canone non lo dice, ed e' una delle quattro cose
      che l'Apparato B dichiara di non contenere.
   ========================================================================== */
(function (globale) {
  'use strict';

  var N = globale.Nucleo;
  var L = globale.Lessico;

  (function (mancanti) {
    if (!mancanti.length) { return; }
    throw new Error('scena.js non può partire: ' +
      (mancanti.length === 1
        ? 'gli manca il modulo ' + mancanti[0] + ', e gli serve per riconoscere i gesti dentro il racconto.'
        : 'gli mancano i moduli ' + mancanti.join(' e ') + ', e gli servono per riconoscere i gesti dentro il racconto.') +
      ' Ordine di caricamento: nucleo.js e lessico.js prima di questo file.');
  }([['Nucleo (nucleo.js)', N], ['Lessico (app/dati/lessico.js)', L]]
    .filter(function (c) { return !c[1]; })
    .map(function (c) { return c[0]; })));

  /* --------------------------------------------------------------------
     NORMALIZZARE
     --------------------------------------------------------------------
     Il confronto avviene su un testo senza accenti, senza apostrofi e senza
     maiuscole: «È un po' presto» e «e un po presto» devono trovare le stesse
     parole. Il testo originale non si tocca mai — e' quello che il lettore
     rivedra' a schermo. */
  var ACCENTI = { 'à': 'a', 'á': 'a', 'è': 'e', 'é': 'e', 'ì': 'i', 'í': 'i',
                  'ò': 'o', 'ó': 'o', 'ù': 'u', 'ú': 'u' };

  /* L'APOSTROFO TIPOGRAFICO DEVE STARE NELLA LISTA, E IL 10/09/2026 NON C'ERA.

     Questa funzione appiattisce il testo prima di confrontarlo: minuscole,
     accenti tolti, apostrofi trasformati in spazio. Serve perche' chi scrive
     «l'ho già fatto» e chi scrive «l’ho gia fatto» devono trovare la stessa
     chiave.

     La lista degli apostrofi conteneva due volte quello dritto (U+0027) e non
     conteneva affatto quello tipografico (U+2019). Finche' tutto il progetto
     usava l'apostrofo dritto non si vedeva. Poi le chiavi del vocabolario sono
     state riscritte con quello tipografico — «l’ho già fatto», «all’ultimo» —
     e da quel momento non si sono piu' riconosciute: «l’ho» restava una parola
     sola, mentre quello che scrive l'utente diventava «l ho».

     Due chiavi perse, in silenzio. E la cosa che vale la pena ricordare e' come
     e' sfuggita: la modifica era stata «verificata» riscrivendo questa funzione
     in Python e confrontando i risultati. La copia era giusta, l'originale no,
     e il confronto tornava. Una verifica che non esegue il codice vero non
     verifica il codice vero. */
  function piatto(t) {
    return String(t).toLowerCase()
      .replace(/[àáèéìíòóùú]/g, function (c) { return ACCENTI[c] || c; })
      .replace(/['’‘ʼ`´]/g, ' ')   /* U+2019 compreso: vedi la nota qui sopra */
      .replace(/\s+/g, ' ')
      .trim();
  }

  /* --------------------------------------------------------------------
     SEGMENTARE
     --------------------------------------------------------------------
     Prima si spezza sulla punteggiatura forte, che in italiano separa
     quasi sempre due gesti. Poi, dentro ogni frase, si spezza sulle virgole
     e sulle congiunzioni di seguito — ma SOLO se il pezzo che segue contiene
     a sua volta un'azione. Senza quella condizione, «esco, finalmente» si
     spezzerebbe in due nodi di cui uno vuoto.

     E' grossolano. Deve esserlo: un analizzatore sintattico dell'italiano
     sarebbe una libreria, e questo pacchetto non ne carica nessuna. Il
     rimedio non e' la finezza dell'algoritmo, e' che la segmentazione si
     puo' correggere a mano — che e' anche quello che il capitolo 24 chiede.
  */
  function frasi(testo) {
    var fuori = [];
    String(testo).split(/([.!?;\n]+)/).forEach(function (pezzo, i) {
      if (i % 2 === 1) { return; }                 // i separatori si buttano
      var t = pezzo.trim();
      if (t) { fuori.push(t); }
    });
    return fuori;
  }

  /* Un pezzo che comincia con una negazione non e' un gesto nuovo: e' come
     e' andato quello di prima. «Cerco le chiavi e non le trovo» e' un gesto
     e il suo esito, non due tentativi. */
  var NEGAZIONI = ['non ', 'senza ', 'nemmeno ', 'neanche ', 'niente '];

  /* i modali: dichiarano un'intenzione o un obbligo, non un gesto in corso */
  var INTENZIONI = ['devo ', 'dovrei ', 'dovevo ', 'bisogna ', 'bisognerebbe ',
                    'vorrei ', 'voglio ', 'ho da ', 'mi tocca ', 'dovro '];

  function eIntenzione(pezzo) {
    var t = piatto(pezzo);
    return INTENZIONI.some(function (m) { return t.indexOf(m) === 0; });
  }

  /* UN GESTO RACCONTATO AL PASSATO CHE PORTA ANCHE UNO STATO.

     «Ho mangiato e sono stanco» viene letto come un gesto, perche' «mangiato»
     ha una radice riconosciuta. Ma in quella frase il mangiare non e' il gesto
     che si sta tentando: e' quello che e' successo prima, e «sono stanco» e'
     la condizione che ne resta. E' contesto, non un nodo.

     E ALLORA PERCHE' NON SI CORREGGE DA SOLO?
     Perche' in italiano raccontare una scena al passato e' del tutto normale:
     «mi sono alzato, ho bevuto un bicchiere d'acqua, sono uscito» sono tre
     gesti veri, non tre pezzi di contesto. La differenza fra i due casi non
     sta nella grammatica — sta nel senso, e riconoscerla vuol dire capire di
     che cosa si sta parlando. Un vocabolario di parole chiave non lo sa fare,
     e fingere che lo sappia produrrebbe l'errore opposto, piu' grave: cioe'
     buttare via gesti veri senza dirlo.

     Percio' qui il simulatore non decide: SEGNALA. Quando un pezzo ha un verbo
     al passato composto e insieme dichiara uno stato, la lettura lo lascia
     dov'e' e avvisa che potrebbe essere contesto. Chi legge guarda e, se e'
     d'accordo, preme «è contesto». E' la stessa regola del capitolo 24:
     segmentare e' gia' interpretare, e un'interpretazione che il lettore non
     puo' discutere sarebbe un'analisi fatta di nascosto. */
  var AUSILIARI = ['ho ', 'hai ', 'ha ', 'abbiamo ', 'avete ', 'hanno ',
                   'sono ', 'sei ', 'siamo ', 'siete ', 'era ', 'ero ', 'avevo ', 'aveva '];
  function ePassatoComposto(pezzo) {
    var t = piatto(pezzo);
    for (var i = 0; i < AUSILIARI.length; i++) {
      var dove = t.indexOf(AUSILIARI[i]);
      if (dove !== 0) { continue; }
      var resto = t.slice(AUSILIARI[i].length).split(' ')[0] || '';
      if (/(?:ato|ata|ati|ate|uto|uta|uti|ute|ito|ita|iti|ite)$/.test(resto)) { return true; }
    }
    return false;
  }

  function eNegazione(pezzo) {
    var t = piatto(pezzo);
    return NEGAZIONI.some(function (n) { return t.indexOf(n) === 0; });
  }

  /* QUANDO IL SOGGETTO NON E' LA PERSONA, NON E' UN GESTO SUO.
     «Le notifiche continuano ad arrivare» contiene il verbo «arrivare», e
     senza questa regola diventava un nodo — cioe' un gesto che la persona
     sta tentando, con la sua probabilita' di riuscita. Ma non e' lei che
     arriva: e' qualcosa che le succede intorno, e quindi e' ambiente.

     La regola e' grammaticale e si puo' dire in una riga: se il frammento
     comincia con un articolo o un dimostrativo, e la parola dopo NON e' a
     sua volta un'azione, allora il soggetto e' un'altra cosa.

     La condizione sulla parola dopo serve per i pronomi: in italiano «le»
     e «lo» sono articoli e anche pronomi atoni. «Le notifiche» e' articolo
     piu' nome — non e' un gesto. «Le trovo sul tavolo» e' pronome piu'
     verbo — e' un gesto, ed e' lo stesso «le». */
  var ARTICOLI = ['il ', 'lo ', 'la ', 'i ', 'gli ', 'le ', 'un ', 'uno ', 'una ',
                  'questo ', 'questa ', 'questi ', 'queste ', 'quel ', 'quella ',
                  'quei ', 'quelle ', 'mio ', 'mia ', 'miei ', 'mie '];

  function eSoggettoAltro(pezzo) {
    var t = piatto(pezzo);
    var apre = null;
    ARTICOLI.forEach(function (a2) { if (!apre && t.indexOf(a2) === 0) { apre = a2; } });
    if (!apre) { return false; }
    var resto = t.slice(apre.length).trim();
    if (!resto) { return false; }
    var primaParola = resto.split(/[^a-z0-9]+/)[0] || '';
    /* se la parola subito dopo l'articolo e' essa stessa un'azione, allora
       quell'articolo era un pronome: «le trovo» */
    return !azioneDi(primaParola);
  }

  /* ==========================================================================
     UN VERBO CHE IL VOCABOLARIO NON CONOSCE
     ==========================================================================
     IL PROBLEMA, IN UN ESEMPIO.
     «Sparecchio la tavola» non veniva riconosciuto come gesto, perche'
     «sparecchiare» non era nell'elenco. E il guaio non era l'elenco corto:
     era che l'elenco non puo' non essere corto. I verbi italiani sono
     decine di migliaia, e ogni casa ne usa di suoi.

     LA STRADA CHE NON SI PUO' PRENDERE.
     Verrebbe da collegarsi a un dizionario del computer. Su questo Mac ce
     n'e' uno completo — 95.221 parole, dentro Adobe Illustrator — e non si
     puo' usare per due ragioni indipendenti, e ciascuna basterebbe da sola.
     La prima e' che il capitolo 48 dice che il pacchetto si apre con un
     doppio clic, senza rete: una pagina aperta da file:// non puo' leggere
     file dal disco, e nemmeno deve poterlo fare. La seconda e' che quel
     dizionario e' distribuito con licenza GPL, e copiarne i dati dentro un
     pacchetto che accompagna un libro venduto obbligherebbe tutto il
     pacchetto a diventare GPL.

     LA STRADA CHE SI PUO' PRENDERE, ED E' MIGLIORE.
     Non serve sapere che «sparecchiare» esiste. Serve accorgersi che
     «sparecchio», in quella posizione, e' un verbo — e questo lo dice la
     grammatica italiana, che e' regolare abbastanza. Un elenco copre le
     parole che qualcuno ha scritto; la morfologia copre anche quelle che
     nessuno ha scritto, compresi i verbi di mestiere e quelli di famiglia.

     COME FA A NON SBAGLIARE.
     Il pericolo e' scambiare per verbo un nome: «il bagno» finisce in -o
     come «sparecchio». Le due guardie sono queste, e vengono tutte e due
     dalla grammatica: dopo un articolo o una preposizione semplice c'e' un
     nome, non un verbo — «il telefono», «in bagno», «della cucina» — e la
     desinenza -o vale come verbo solo se la parola apre il pezzo oppure ha
     davanti un pronome («mi pettino», «lo sistemo»). Le altre desinenze,
     quelle inequivocabili, non hanno bisogno di guardie: nessun nome
     italiano finisce in -iamo, -endo, -isco o -avo.

     E QUANDO SUCCEDE, SI DICE.
     Il gesto inventato prende la classe ordinaria — la piu' neutra delle
     quattro — e nella tabella, al posto della parola che l'avrebbe
     prodotto, c'e' scritto che il verbo non era nel vocabolario. Chi legge
     vede subito che quel 76 non gliel'ha proposto il lessico, e puo'
     cambiarlo. */
  var DAVANTI_C_E_UN_NOME = [
    'il', 'lo', 'la', 'i', 'gli', 'le', 'un', 'uno', 'una',
    'del', 'dello', 'della', 'dei', 'degli', 'delle',
    'al', 'allo', 'alla', 'ai', 'agli', 'alle',
    'dal', 'dallo', 'dalla', 'dai', 'dagli', 'dalle',
    'nel', 'nello', 'nella', 'nei', 'negli', 'nelle',
    'sul', 'sullo', 'sulla', 'sui', 'sugli', 'sulle',
    'col', 'coi', 'in', 'a', 'da', 'di', 'con', 'su', 'per', 'tra', 'fra',
    'questo', 'questa', 'quel', 'quella', 'mio', 'mia', 'suo', 'sua', 'ogni'
  ];
  var PRONOMI_DAVANTI = ['mi', 'ti', 'si', 'ci', 'vi', 'lo', 'la', 'li', 'le', 'ne', 'gli', 'me', 'te'];
  /* desinenze che in italiano non appartengono a nessun nome */
  var SOLO_DA_VERBO = /(?:iamo|iate|isco|isci|isce|iscono|ando|endo|arsi|ersi|irsi|are|ere|ire|avo|evo|ivo|avi|evi|ivi|ava|eva|iva|avamo|evamo|ivamo|avano|evano|ivano|ammo|emmo|immo|assi|essi|issi|asse|esse|isse|ato|ata|ati|ate|uto|uta|uti|ute|ito|ita|iti|ite|ano|ono|amo|ete)$/;

  /* Essere, avere e stare non sono gesti. Reggono i gesti degli altri verbi,
     e sono anche le parole piu' frequenti della lingua: senza questa lista
     «sono stanco» diventerebbe un gesto, perche' «sono» finisce in -ono. */
  var NEGAZIONI_VICINE = ['non', 'senza', 'mai', 'neanche', 'nemmeno', 'niente', 'nessun', 'nessuno'];
  var NON_SONO_GESTI = [
    'sono', 'sei', 'siamo', 'siete', 'era', 'ero', 'eri', 'erano', 'essere', 'stato',
    'stata', 'stati', 'state', 'ho', 'hai', 'abbiamo', 'avete', 'hanno', 'avevo',
    'aveva', 'avevi', 'avevano', 'avere', 'avuto', 'sto', 'stai', 'stiamo', 'state',
    'stanno', 'stare', 'stando', 'dovevo', 'doveva', 'potevo', 'poteva', 'volevo',
    'voleva', 'sarebbe', 'sarei', 'avrei', 'avrebbe', 'andando', 'venendo'
  ];

  function verboSconosciuto(frammento) {
    /* Una negazione racconta qualcosa che NON e' successo: non e' un gesto da
       calcolare. Vale gia' per i verbi conosciuti, e deve valere anche qui —
       se no «non ho dormito» diventerebbe un gesto invece del contesto che e'. */
    if (eNegazione(frammento)) { return null; }
    var parole = piatto(frammento).split(/[^a-z0-9’']+/).filter(function (p) { return p; });
    for (var i = 0; i < parole.length; i++) {
      var w = parole[i];
      if (w.length < 4) { continue; }
      if (NON_SONO_GESTI.indexOf(w) >= 0) { continue; }
      /* la stessa lista che vale per i verbi conosciuti: «dentro», «davanti»,
         «sempre» non sono gesti, e non lo diventano perche' finiscono in -o */
      if (MAI_VERBI.indexOf(w) >= 0) { continue; }
      /* NEGATO NON VUOL DIRE FATTO.
         «non ho dormito» racconta una cosa che non e' successa: e' contesto,
         non un gesto. La guardia sul principio del pezzo non basta, perche'
         dopo che i pezzi si ricuciono la negazione finisce in mezzo — «Sono
         molto stanco e non ho dormito». Percio' si guarda indietro dalla
         parola, scavalcando gli ausiliari: se prima c'e' una negazione, quel
         verbo non e' un gesto. */
      /* la stessa guardia della copula che vale per i verbi conosciuti:
         «l’entrata è stretta» — «entrata» finisce come un participio, ma
         quello che segue e' «è», quindi era il soggetto. */
      var acc = paroleConAccento(frammento);
      var poi = i + 1;
      if (acc[poi] === 'non') { poi++; }
      if (acc[poi] && COPULE.indexOf(acc[poi]) >= 0) { continue; }
      var indietro = i - 1, negato = false;
      while (indietro >= 0 && NON_SONO_GESTI.indexOf(parole[indietro]) >= 0) { indietro--; }
      if (indietro >= 0 && NEGAZIONI_VICINE.indexOf(parole[indietro]) >= 0) { negato = true; }
      if (negato) { continue; }
      var prima = i > 0 ? parole[i - 1] : null;
      if (prima && DAVANTI_C_E_UN_NOME.indexOf(prima) >= 0) { continue; }
      var forte = SOLO_DA_VERBO.test(w);
      var debole = /o$/.test(w) &&
        (i === 0 || (prima && PRONOMI_DAVANTI.indexOf(prima) >= 0));
      if (!forte && !debole) { continue; }
      return {
        azione: { radici: [], nome: 'un gesto che il vocabolario non conosce',
                  classe: 'ordinario', sconosciuto: true },
        parola: w, posizione: i, sconosciuto: true
      };
    }
    return null;
  }

  function spezzaFrase(frase) {
    /* le congiunzioni e la «e» di seguito si trasformano in virgole, cosi'
       il taglio e' uno solo. La «e» e' rischiosa — «il bambino e la borsa»
       non sono due gesti — ma la guardia qui sotto rimette insieme i pezzi
       che non contengono un'azione, e quel caso si richiude da solo. */
    var lavoro = ' ' + frase + ' ';
    L.CONGIUNZIONI.forEach(function (c) {
      var re = new RegExp(c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      lavoro = lavoro.replace(re, ', ');
    });
    lavoro = lavoro.replace(/\s+e\s+/gi, ', ');
    var pezzi = lavoro.split(',').map(function (p) { return p.trim(); })
                      .filter(function (p) { return p.length; });

    /* si riattaccano al pezzo precedente: i complementi (nessuna azione) e
       le negazioni (l'esito del gesto di prima, non un gesto nuovo) */
    var fuori = [];
    pezzi.forEach(function (p) {
      /* «azione o verbo sconosciuto»: un pezzo il cui verbo il vocabolario non
         conosce NON e' un complemento da riattaccare — e' un gesto che nessuno
         ha ancora messo in elenco. Prima finiva incollato al pezzo prima, e
         due gesti diventavano uno senza che niente lo dicesse. */
      if (fuori.length && ((!azioneDi(p) && !verboSconosciuto(p)) || eNegazione(p))) {
        fuori[fuori.length - 1] += ' e ' + p;
      } else { fuori.push(p); }
    });
    return fuori;
  }

  /* --------------------------------------------------------------------
     RICONOSCERE L'AZIONE
     --------------------------------------------------------------------
     Per prefisso di parola, non per sottostringa: senza il confine di
     parola «salire» si troverebbe dentro «insalata». Fra due azioni nella
     stessa frase vince la prima, perche' e' quella che apre il gesto. */
  /* TRE GUARDIE, E PERCHE' SENZA DI LORO L'ELENCO SI RITORCE CONTRO.

     Il riconoscimento e' per prefisso: la radice «lav» aggancia «lavo»,
     «lavarsi», «lavato». Aggancia pero' anche «lavandino», e «dent» aggancia
     «dentro», e «cen» aggancia «centro». Misurato il 10/09/2026 su dodici
     frasi che NON contengono nessun gesto — «Il telefono era in cucina», «Il
     letto è disfatto», «Dentro casa fa buio» — il lettore ne sbagliava
     DODICI SU DODICI: leggeva un gesto dove c'era solo un nome.

     La cosa importante e' che allargare l'elenco avrebbe peggiorato le cose,
     non migliorate: ogni radice nuova e' un aggancio nuovo, e la meta' delle
     radici e' corta quattro lettere o meno. Il problema non erano le parole
     poche: era il confronto grezzo.

     Le tre guardie vengono dalla grammatica, come le altre di questo file.

     1. DOPO UN ARTICOLO C'E' UN NOME. «il telefono», «un messaggio». Valgono
        solo gli articoli che non sono anche pronomi: «lo», «la», «le», «gli»
        restano fuori, perche' in «lo bevo» e «le cerco» sono pronomi e dopo
        di loro c'e' un verbo per davvero.

     2. SE SUBITO DOPO C'E' UNA COPULA, QUELLA PAROLA ERA IL SOGGETTO.
        «Il letto è disfatto»: «letto» non e' quello che si sta facendo, e'
        quello di cui si parla. Si salta un eventuale «non» in mezzo.

     3. CERTE PAROLE NON SONO MAI VERBI. «dentro», «davanti», «sempre»: sono
        avverbi e preposizioni, e se una radice ci finisce dentro e' un caso.

     Restano falsi possibili — «la cena era fredda» passa la prima guardia
     perche' «la» e' ambiguo — ma li prende la seconda. Quello che non si puo'
     prendere si corregge a mano, ed e' per questo che il bottone esiste. */
  var ARTICOLI_SICURI = [
    'il', 'un', 'uno', 'una', 'del', 'dello', 'della', 'dei', 'degli', 'delle',
    'al', 'allo', 'alla', 'ai', 'agli', 'alle', 'dal', 'dallo', 'dalla', 'dai',
    'dagli', 'dalle', 'nel', 'nello', 'nella', 'nei', 'negli', 'nelle',
    'sul', 'sullo', 'sulla', 'sui', 'sugli', 'sulle', 'col', 'coi',
    'questo', 'questa', 'quel', 'quello', 'quella', 'ogni', 'qualche',
    'mio', 'mia', 'tuo', 'tua', 'suo', 'sua', 'nostro', 'vostro',
    /* preposizioni semplici che reggono un nome e non un verbo: «in cucina»,
       «con il coltello», «su per le scale». Fuori restano «a», «da», «per»,
       «di», che reggono benissimo un infinito — «vado a fare la spesa». */
    'in', 'con', 'su', 'tra', 'fra'
  ];
  /* ATTENZIONE: qui NON si puo' usare piatto(), che toglie gli accenti. Senza
     accento «è» e la congiunzione «e» diventano la stessa parola, e la guardia
     scatterebbe su ogni «e» — spegnendo gesti veri per sbaglio. Percio' la
     copula si cerca su una lettura che l'accento lo conserva. */
  var COPULE = ['è', 'era', 'sono', 'erano', 'sarà', 'sarebbe', 'resta', 'restava',
                'sembra', 'sembrava', 'diventa', 'diventava', 'fa', 'faceva', 'pare'];
  function paroleConAccento(frammento) {
    return String(frammento).toLowerCase()
      .replace(/[’'`´]/g, ' ')
      .split(/[^a-zà-ù0-9]+/).filter(function (p) { return p; });
  }
  var MAI_VERBI = [
    'dentro', 'fuori', 'sopra', 'sotto', 'davanti', 'dietro', 'accanto', 'intorno',
    'ancora', 'sempre', 'mai', 'quasi', 'troppo', 'molto', 'poco', 'tanto',
    'insieme', 'invece', 'magari', 'forse', 'proprio', 'appena', 'subito',
    'presto', 'tardi', 'oggi', 'ieri', 'domani', 'adesso', 'prima', 'dopo',
    'centro', 'contro', 'verso', 'lungo', 'senza', 'anche', 'perche', 'mentre'
  ];

  function azioneDi(frammento) {
    var t = piatto(frammento);
    var parole = t.split(/[^a-z0-9]+/).filter(function (p) { return p; });
    var migliore = null;
    parole.forEach(function (parola, posizione) {
      if (migliore) { return; }
      if (MAI_VERBI.indexOf(parola) >= 0) { return; }
      var prima = posizione > 0 ? parole[posizione - 1] : null;
      if (prima && ARTICOLI_SICURI.indexOf(prima) >= 0) { return; }
      var acc = paroleConAccento(frammento);
      var j = posizione + 1;
      if (acc[j] === 'non') { j++; }
      if (acc[j] && COPULE.indexOf(acc[j]) >= 0) { return; }
      /* NEGATO NON VUOL DIRE FATTO, e vale anche qui.
         «un messaggio non letto» non e' qualcuno che legge: e' un participio
         usato come aggettivo. Si guarda indietro scavalcando gli ausiliari,
         esattamente come fa il riconoscitore grammaticale. */
      var giu = posizione - 1;
      while (giu >= 0 && NON_SONO_GESTI.indexOf(parole[giu]) >= 0) { giu--; }
      if (giu >= 0 && NEGAZIONI_VICINE.indexOf(parole[giu]) >= 0) { return; }
      L.AZIONI.forEach(function (a) {
        if (migliore) { return; }
        a.radici.forEach(function (r) {
          if (migliore) { return; }
          if (parola.indexOf(r) === 0 && parola.length >= r.length) {
            migliore = { azione: a, parola: parola, posizione: posizione };
          }
        });
      });
    });
    return migliore;
  }

  /* --------------------------------------------------------------------
     RICONOSCERE LE CONDIZIONI
     --------------------------------------------------------------------
     Torna la lista delle tracce: variabile, valore proposto, la parola che
     l'ha prodotta e il perche' che comparira' a schermo. */
  function condizioniDi(frammento) {
    var t = piatto(frammento);
    var tracce = [];
    L.CONDIZIONI.forEach(function (c) {
      var trovata = null;
      c.chiavi.forEach(function (k) {
        if (trovata) { return; }
        if (t.indexOf(piatto(k)) >= 0) { trovata = k; }
      });
      if (trovata) {
        tracce.push({ variabile: c.variabile, valore: c.valore,
                      parola: trovata, perche: c.perche, voce: c });
      }
    });
    return tracce;
  }

  function campoDi(frammento) {
    var t = piatto(frammento);
    var fuori = [];
    L.CAMPO_ATTIVO.forEach(function (c) {
      c.chiavi.forEach(function (k) {
        if (t.indexOf(piatto(k)) >= 0) { fuori.push({ nome: c.nome, parola: k }); }
      });
    });
    return fuori;
  }

  /* --------------------------------------------------------------------
     LE VARIABILI CHE VALGONO PER TUTTA LA SCENA, E QUELLE DEL SOLO GESTO
     -------------------------------------------------------------------- */
  var SEMPRE_DI_SCENA = ['STR', 'DEB'];   // descrivono la persona
  var SEMPRE_DI_NODO = ['C'];             // descrive il gesto

  function nuoviValori() {
    return { P0: 0, E: 0, I: 0, T: 0, M: 0, BP: 0, C: 0, STR: 0, DEB: 0 };
  }

  /* --------------------------------------------------------------------
     LEGGERE LA SCENA
     -------------------------------------------------------------------- */
  function leggi(testo, opzioni) {
    opzioni = opzioni || {};
    testo = (testo === null || testo === undefined) ? '' : String(testo);
    var caricoBase = opzioni.caricoBase === undefined ? 40 : opzioni.caricoBase;

    /* --- 1. i frammenti --- */
    var frammenti = [];
    frasi(testo).forEach(function (frase) {
      spezzaFrase(frase).forEach(function (pezzo) {
        var az = azioneDi(pezzo) || verboSconosciuto(pezzo);
        /* PASSATO PIU' STATO UGUALE CONTESTO — ed e' una regola stretta.
           «Ho mangiato e sono stanco» non e' un gesto che si sta tentando: e'
           quello che e' successo prima, piu' la condizione che ne resta.
           La regola non tocca il racconto al passato, che in italiano e'
           normalissimo: «mi sono alzato, ho bevuto, sono uscito» sono tre
           gesti veri e restano tre gesti, perche' nessuno dei tre dichiara
           uno stato. Serve la convergenza delle due cose nello stesso pezzo:
           il verbo al passato composto E una condizione dichiarata. */
        if (az && ePassatoComposto(pezzo) && condizioniDi(pezzo).length > 0) { az = null; }
        /* «devo uscire alle otto» non e' un gesto che si sta facendo: e'
           una scadenza dichiarata, cioe' contesto. Il verbo modale la
           distingue dal gesto vero, ed e' un segnale grammaticale, non una
           supposizione: «devo uscire» e «esco» sono due cose diverse. */
        if (az && (eIntenzione(pezzo) || eSoggettoAltro(pezzo))) { az = null; }
        frammenti.push({ testo: pezzo, tipo: az ? 'nodo' : 'contesto', azione: az });
      });
    });

    /* --- 1b. LE CORREZIONI DELLA PERSONA, CHE VENGONO PRIMA DI TUTTO ---

       Il capitolo 24 dice «segmentare è già interpretare», e l'Apparato I ne
       trae la conseguenza: «una segmentazione che il lettore non può discutere
       sarebbe un'analisi fatta di nascosto». Percio' chi legge deve poter dire
       «questo non e' un gesto, e' contesto» — e viceversa.

       LA CORREZIONE VA APPLICATA QUI, NON DOPO.
       Il 10/09/2026 l'interfaccia la applicava ai frammenti gia' letti, e non
       serviva a niente: contesto e nodi erano gia' stati costruiti, e nessuno
       li ricostruiva. Cambiare l'etichetta di un frammento dopo il calcolo e'
       come correggere il titolo di una colonna quando i conti sono gia' fatti.
       Cambiando la natura QUI, prima dei passi 2 e 3, cambia davvero dove va a
       finire ogni condizione: in un nodo solo, oppure su tutta la scena.

       Se si chiede di promuovere a gesto un pezzo in cui nessun verbo d'azione
       e' stato riconosciuto, il gesto va inventato — e allora si dichiara: la
       classe e' quella ordinaria, la piu' neutra delle quattro, e al posto
       della parola che l'avrebbe prodotto c'e' scritto «(scelto da te)». Cosi'
       chi guarda la tabella vede che quel 76 non l'ha proposto il vocabolario:
       l'ha voluto lui. */
    var nature = opzioni.nature || {};
    frammenti.forEach(function (f, i) {
      var voluta = nature[i];
      if (!voluta || voluta === f.tipo) { return; }
      f.corretto = true;
      if (voluta === 'contesto') { f.tipo = 'contesto'; f.azione = null; return; }
      f.tipo = 'nodo';
      if (!f.azione) {
        f.azione = { parola: '(scelto da te)', posizione: 0,
          azione: { nome: 'Gesto che hai indicato tu', classe: 'ordinario' } };
      }
    });

    /* --- 2. il contesto: quello che vale per tutta la scena --- */
    var contesto = { valori: nuoviValori(), tracce: [] };
    contesto.valori.STR = caricoBase;
    contesto.tracce.push({ variabile: 'STR', valore: caricoBase, parola: '(partenza)',
      perche: 'Il carico da cui la scena comincia. Se la scena non dice niente sul carico, ' +
              'si parte da un valore ordinario, ed è la prima cosa da correggere.' });

    /* UNA CONDIZIONE VALE UNA VOLTA, ANCHE SE LA PAROLA TORNA.
       «Riprovo, cambio browser, riprovo ancora» nomina l'insistenza tre
       volte, e senza questa regola il debito salirebbe a tre. Ma ripetere
       una parola non rende il fatto piu' vero: lo rende piu' enfatico. Il
       libro vuole il debito RARO — nella prova dei cinquecento nodi e' rimasto
       zero per tutti e cinquecento — e un contatore che sale con le
       ripetizioni del racconto lo renderebbe comune per un difetto di
       lettura, non per una convergenza reale.
       Voci diverse si sommano; la stessa voce conta una volta, e le altre
       restano nella traccia per dire che erano state viste. */
    var gia = [];
    frammenti.forEach(function (f) {
      condizioniDi(f.testo).forEach(function (tr) {
        var diScena = (f.tipo === 'contesto' && SEMPRE_DI_NODO.indexOf(tr.variabile) < 0) ||
                      SEMPRE_DI_SCENA.indexOf(tr.variabile) >= 0;
        if (!diScena) { return; }
        if (gia.indexOf(tr.voce) >= 0) {
          contesto.tracce.push({ variabile: tr.variabile, valore: 0, parola: tr.parola,
            scartata: true,
            perche: 'La scena lo dice più volte, ma conta una volta sola: ripetere una ' +
                    'parola non rende il fatto più vero. Se è più grave di così, ' +
                    'alza il valore a mano.' });
          return;
        }
        gia.push(tr.voce);
        contesto.valori[tr.variabile] += tr.valore;
        contesto.tracce.push(tr);
        tr.presaDalContesto = true;
      });
    });

    /* --- 3. i nodi --- */
    var nodi = [];
    frammenti.forEach(function (f, i) {
      if (f.tipo !== 'nodo') { return; }
      var classe = L.CLASSI[f.azione.azione.classe];
      var v = nuoviValori();
      var tracce = [];

      v.P0 = classe.p0;
      /* Se il verbo l'ha capito la grammatica e non il vocabolario, la
         tabella lo deve dire: quel numero non viene da nessuna parola
         conosciuta, e chi legge deve poterlo sapere senza andare a cercarlo. */
      tracce.push({ variabile: 'P0', valore: classe.p0,
        parola: f.azione.sconosciuto ? '(verbo non in elenco: ' + f.azione.parola + ')'
                                     : f.azione.parola,
        perche: f.azione.sconosciuto
          ? 'Il vocabolario non conosce questo verbo. La grammatica però dice che lì c’è ' +
            'un gesto. Perciò ha avuto il punto di partenza dei gesti ordinari, il più ' +
            'neutro dei quattro. Se questo gesto è più facile o più difficile della ' +
            'media, cambia il numero a mano.'
          : f.azione.azione.nome + ' — ' + classe.nota });
      if (classe.pezzi) {
        v.C += classe.pezzi;
        tracce.push({ variabile: 'C', valore: classe.pezzi, parola: f.azione.parola,
          perche: 'Coordinamenti che il gesto richiede di suo.' });
      }

      /* IL PESO CONTATO DUE VOLTE, IMPEDITO QUI.
         E' la prima famiglia di errori del capitolo 19, ed e' quella in cui
         si cade senza accorgersene: la scena dice «sono in ritardo» e il
         gesto dice «di corsa». Sono la stessa fretta. Sommarle darebbe venti
         punti di malus per un fatto solo.

         La regola e' quella del domicilio unico: il fatto entra una volta.
         Fra la dichiarazione della scena e quella del gesto vince la piu'
         forte, e l'altra resta scritta nella traccia come scartata — cosi'
         chi legge vede che e' stata riconosciuta e perche' non e' stata
         sommata. Chi non e' d'accordo cambia il numero a mano. */
      var locali = {};
      condizioniDi(f.testo).forEach(function (tr) {
        if (SEMPRE_DI_SCENA.indexOf(tr.variabile) >= 0) { return; }  // gia' nel contesto
        if (SEMPRE_DI_NODO.indexOf(tr.variabile) >= 0) {
          v[tr.variabile] += tr.valore;                 // la complessita' si somma
          tracce.push(tr);
          return;
        }
        locali[tr.variabile] = (locali[tr.variabile] || []).concat([tr]);
      });

      ['E', 'I', 'T', 'M', 'BP'].forEach(function (k) {
        var diScena = contesto.valori[k];
        var diNodo = (locali[k] || []).reduce(function (a2, t) { return a2 + t.valore; }, 0);

        /* LE TRACCE DELLA SCENA DEVONO ARRIVARE FIN DENTRO IL NODO.
           Chi guarda un gesto vede «E −10» e deve poter sapere da dove
           viene, anche se la parola che l'ha prodotto sta tre frasi piu'
           su. Un numero senza la sua parola e' esattamente il «dato
           stimato presentato come certo» che il libro elenca fra gli
           errori di metodo. */
        function daScena() {
          contesto.tracce.forEach(function (t) {
            if (t.variabile !== k || t.scartata) { return; }
            tracce.push({ variabile: k, valore: t.valore, parola: t.parola,
              dallaScena: true,
              perche: 'Dichiarato per tutta la scena. ' + t.perche });
          });
        }

        if (diScena && diNodo) {
          var vinceScena = Math.abs(diScena) >= Math.abs(diNodo);
          v[k] += vinceScena ? diScena : diNodo;
          if (vinceScena) { daScena(); }
          (locali[k] || []).forEach(function (tr) {
            tracce.push(vinceScena
              ? { variabile: k, valore: 0, parola: tr.parola, scartata: true,
                  perche: 'Già contato per tutta la scena (' + diScena + '). ' +
                          'Lo stesso fatto entra una volta sola: è il domicilio unico ' +
                          'del capitolo 18, e sommarlo due volte è il primo errore del 19.' }
              : tr);
          });
          if (!vinceScena) {
            tracce.push({ variabile: k, valore: 0, parola: '(dalla scena)', scartata: true,
              perche: 'La scena dichiarava ' + diScena + ', ma questo gesto è più ' +
                                                         'esplicito. Vince il valore del ' +
                                                         'gesto, e quello della scena ' +
                                                         'non si somma.' });
          }
        } else {
          v[k] += diScena + diNodo;
          if (diScena) { daScena(); }
          (locali[k] || []).forEach(function (tr) { tracce.push(tr); });
        }
      });

      v.STR = contesto.valori.STR;
      v.DEB = contesto.valori.DEB;
      contesto.tracce.forEach(function (t) {
        if (SEMPRE_DI_SCENA.indexOf(t.variabile) < 0 || t.scartata) { return; }
        tracce.push({ variabile: t.variabile, valore: t.valore, parola: t.parola,
          dallaScena: true,
          perche: 'Descrive la persona, non il gesto: vale per tutta la scena. ' + t.perche });
      });

      nodi.push({
        id: 'n' + (nodi.length + 1),
        numero: nodi.length + 1,
        descrizione: f.testo,
        azione: f.azione.azione.nome,
        classe: f.azione.azione.classe,
        valori: {
          P0: N.clampInt(v.P0, 1, 99),
          E: N.clampInt(v.E, -30, 30), I: N.clampInt(v.I, -30, 30),
          T: N.clampInt(v.T, -30, 30), M: N.clampInt(v.M, -30, 30),
          BP: N.clampInt(v.BP, 0, 20), C: N.clampInt(v.C, 0, 10),
          STR: N.clampInt(v.STR, 0, 100), DEB: N.clampInt(v.DEB, 0, 5)
        },
        tracce: tracce,
        campo: campoDi(f.testo),
        indiceFrammento: i
      });
    });

    /* --- 4. gli avvisi: quello che il lettore deve sapere --- */
    var avvisi = [];
    /* IL CAMPO ATTIVO SI CERCA IN TUTTO IL RACCONTO.
       «Il cane tira il guinzaglio» non contiene un verbo d'azione della
       persona, quindi finisce fra i frammenti di contesto: cercarlo solo
       dentro i nodi voleva dire non vederlo proprio nel caso piu' tipico
       che il libro porta come esempio. */
    /* i verbi capiti dalla grammatica e non dal vocabolario: si dichiarano,
       perche' su quelli il valore proposto e' il piu' neutro dei quattro e
       non viene da nessuna parola conosciuta */
    var daGrammatica = frammenti.filter(function (f) {
      return f.tipo === 'nodo' && f.azione && f.azione.sconosciuto;
    });
    if (daGrammatica.length) {
      avvisi.push({ tipo: 'verbo-nuovo',
        testo: (daGrammatica.length === 1
          ? 'Un gesto l’ho riconosciuto dalla grammatica e non dal vocabolario: «' +
            daGrammatica[0].azione.parola + '».'
          : daGrammatica.length + ' gesti li ho riconosciuti dalla grammatica e non dal ' +
            'vocabolario: ' + daGrammatica.map(function (f) {
              return '«' + f.azione.parola + '»'; }).join(', ') + '.') +
          ' Vuol dire che lì, con quella desinenza, in italiano c’è un verbo. Ma quale ' +
          'verbo sia, e quanto sia difficile di suo, il simulatore non lo sa. Allora gli ' +
          'ha dato il punto di partenza dei gesti ordinari: il più neutro dei quattro. ' +
          'Se quel gesto è più facile o più difficile della media, cambialo a mano. ' +
          'Nella tabella c’è scritto che il numero non viene da nessuna parola ' +
          'conosciuta.' });
    }

    /* i pezzi che potrebbero essere contesto e non gesti: si dicono, non si
       correggono da soli — vedi la nota su ePassatoComposto */
    var forseContesto = frammenti.filter(function (f) {
      return f.tipo === 'contesto' && ePassatoComposto(f.testo) && condizioniDi(f.testo).length > 0;
    });
    if (forseContesto.length) {
      avvisi.push({ tipo: 'forse-contesto',
        testo: (forseContesto.length === 1
          ? 'Un pezzo racconta qualcosa al passato e insieme dice come stai: «' +
            forseContesto[0].testo + '».'
          : forseContesto.length + ' pezzi raccontano qualcosa al passato e insieme dicono come ' +
            'stai: ' + forseContesto.map(function (f) { return '«' + f.testo + '»'; }).join(', ') + '.') +
          ' L’ho messo nel contesto, non fra i gesti. Mi è sembrato che raccontasse una ' +
          'cosa già successa, più la condizione che ne resta. E allora vale per tutta la ' +
          'scena, non per un gesto solo.\n\nLa regola è stretta apposta. Raccontare una ' +
          'scena al passato è normalissimo. «Mi sono alzato, ho bevuto, sono uscito» ' +
          'restano tre gesti. Serve che nello stesso pezzo ci siano tutte e due le cose: ' +
          'il verbo al passato e uno stato dichiarato. Se ho sbagliato lo stesso, premi ' +
          '«è un gesto» qui sotto.' });
    }

    var campoTot = [];
    frammenti.forEach(function (f) { campoTot = campoTot.concat(campoDi(f.testo)); });
    if (campoTot.length) {
      avvisi.push({ tipo: 'campo',
        testo: 'La scena nomina qualcosa che RISPONDE al tentativo (' +
          campoTot.map(function (c) { return c.nome; }).join(', ') +
          '). Non entra nella formula: agisce dopo il dado, togliendo margine. Il canone ' +
          'non dice quanti punti valga. Questo simulatore non se li inventa.' });
    }
    if (!nodi.length) {
      avvisi.push({ tipo: 'vuoto',
        testo: 'Non ho riconosciuto nessun gesto. Il lessico però conosce i verbi più ' +
               'comuni della vita di ogni giorno. Prova a scrivere che cosa fai, non ' +
               'solo come stai.' });
    }
    if (nodi.length === 1) {
      avvisi.push({ tipo: 'uno',
        testo: 'Un gesto solo: qui la catena non ha niente da accumulare. ' +
          'Va benissimo per vedere la formula, ma il carico si vede da tre gesti in su.' });
    }
    if (nodi.length > 40) {
      avvisi.push({ tipo: 'molti',
        testo: nodi.length + ' nodi da una descrizione sola. Il capitolo 25 chiama «nodo ' +
                             'a vuoto» un frammento che non cambia niente. Conviene ' +
                             'fondere i gesti che raccontano lo stesso passaggio.' });
    }
    var scartate = 0;
    nodi.forEach(function (n) {
      n.tracce.forEach(function (t) { if (t.scartata) { scartate++; } });
    });
    if (scartate) {
      avvisi.push({ tipo: 'doppio',
        testo: scartate + (scartate === 1
          ? ' condizione era dichiarata due volte: una per la scena e una dentro un gesto. È stata contata una volta sola.'
          : ' condizioni erano dichiarate due volte: una per la scena e una dentro un gesto. Sono state contate una volta sola.') +
          ' È il domicilio unico del capitolo 18. Nelle tracce dei nodi si vede quale valore ha vinto, e perché.' });
    }

    var senzaCarico = !contesto.tracce.some(function (t) {
      return t.variabile === 'STR' && t.parola !== '(partenza)';
    });
    if (senzaCarico) {
      avvisi.push({ tipo: 'carico',
        testo: 'La scena non dice niente sul carico con cui la persona arriva. Ed è il ' +
               'termine che decide più spesso. Il carico di partenza è ' + caricoBase +
          '. Cambialo, se sai che non è così.' });
    }

    /* --- 5. i pezzi che non hanno prodotto niente ---
       Un frammento che non e' un gesto e in cui il vocabolario non ha
       riconosciuto nessuna condizione e' testo che il simulatore ha letto e
       da cui non ha ricavato niente. Non e' un errore — molte frasi di un
       racconto sono cornice — ma il lettore ha il diritto di saperlo:
       altrimenti crede che «il capo mi ha guardato male» sia entrata nel
       calcolo, e non e' entrata.

       E' anche il modo in cui il vocabolario cresce: quello che compare qui
       spesso e' quello che manca. */
    var muti = frammenti.filter(function (f) {
      return f.tipo === 'contesto' && condizioniDi(f.testo).length === 0 &&
             campoDi(f.testo).length === 0 && piatto(f.testo).length > 6;
    }).map(function (f) { return f.testo; });

    if (muti.length) {
      avvisi.push({ tipo: 'muto',
        testo: muti.length + (muti.length === 1
          ? ' pezzo del racconto non ha prodotto niente. Il vocabolario non ci ha riconosciuto né un gesto né una condizione.'
          : ' pezzi del racconto non hanno prodotto niente. Il vocabolario non ci ha riconosciuto né un gesto né una condizione.') +
          ' Non è un errore, perché molte frasi sono cornice. Ma nel calcolo quel testo ' +
          'non è entrato, e conviene saperlo prima di leggere i numeri.' });
    }

    return { testo: testo, frammenti: frammenti, nodi: nodi,
             contesto: contesto, avvisi: avvisi, muti: muti };
  }

  /* --------------------------------------------------------------------
     DAI NODI LETTI AI NODI DEL MOTORE
     --------------------------------------------------------------------
     Il motore vuole la sua forma. Qui la si costruisce, senza toccare
     nessun numero: quello che c'e' nei valori e' quello che va dentro. */
  function perIlMotore(nodiLetti, opzioni) {
    opzioni = opzioni || {};
    return nodiLetti.map(function (n) {
      var v = n.valori;
      return {
        id: n.id, descrizione: n.descrizione, p0: v.P0,
        modificatori: { energia_e: v.E, informazione_i: v.I, tempo_t: v.T,
                        materiale_m: v.M, bonus_bp: v.BP, complessita_c: v.C },
        stato_prima: { stress_str: v.STR,
                       posizione_pos: opzioni.assetto === undefined ? 60 : opzioni.assetto,
                       debito_deb: v.DEB, rip: opzioni.rip || 'debole' }
      };
    });
  }

  var API = { leggi: leggi, perIlMotore: perIlMotore, piatto: piatto,
              frasi: frasi, spezzaFrase: spezzaFrase, azioneDi: azioneDi,
              condizioniDi: condizioniDi, campoDi: campoDi,
              eIntenzione: eIntenzione, eNegazione: eNegazione,
              ePassatoComposto: ePassatoComposto, verboSconosciuto: verboSconosciuto,
              eSoggettoAltro: eSoggettoAltro,
              SEMPRE_DI_SCENA: SEMPRE_DI_SCENA, SEMPRE_DI_NODO: SEMPRE_DI_NODO };
  globale.Scena = API;
  if (typeof module !== 'undefined' && module.exports) { module.exports = API; }
}(typeof window !== 'undefined' ? window : this));
