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
   sbaglia: il libro ci dedica un capitolo intero, il 24, e lo chiude con
   una sezione che si intitola «Segmentare è già interpretare».

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

  /* ==========================================================================
     LA GIORNATA DI UN'ALTRA PERSONA  (25/11/2026)
     ==========================================================================
     Tutte le regole di questo file sono scritte per chi racconta la propria
     giornata: «mi alzo», «ho preso le chiavi». Chi racconta la giornata di un
     altro — un medico, un'infermiera, un genitore, un insegnante — scrive «il
     paziente si alza», «ha preso le chiavi». Con le regole della prima
     persona quei racconti andavano persi quasi per intero, e per ragioni
     giuste: «il paziente si alza» comincia con un articolo, quindi il
     soggetto e' un altro; «ha preso» ha l'ausiliare di un altro; «va in
     bagno» non e' «vado».

     Non si indovina. Chi racconta dichiara che la giornata e' di un'altra
     persona, e come la chiama nel racconto («il paziente», «Maria», «lei»).
     Da li' le stesse regole si leggono dall'altra parte:
       · il pezzo che comincia con quel nome ha per soggetto il protagonista,
         non «un altro»;
       · «ha» e «aveva» sono i SUOI ausiliari, quindi «ha preso» e' un gesto;
       · «deve», «vuole», «dovrebbe» sono le sue intenzioni, non gesti;
       · le terze persone irregolari che nessuna radice aggancia («va», «fa»)
         valgono come «vado», «faccio».
     Tutto il resto — le condizioni, il domicilio unico, le domande, la
     ricevuta — non cambia di una riga: sono regole sui fatti, non sulla
     persona del verbo.

     UN LIMITE CHE RESTA, e la pagina lo dice: chi descrive un altro vede i
     gesti, non il corpo. «È stanco» scritto da fuori e' un'osservazione, non
     una dichiarazione: il capitolo 21 la chiama dato «stimato». Per questo
     le domande, in questa modalita', chiedono a chi scrive di dire quello
     che SA, e di lasciare vuoto quello che suppone. */
  var TERZA = false;            // vale solo durante una chiamata di leggi()
  var PROTAGONISTA = '';        // come e' chiamato nel racconto, appiattito
  var INTENZIONI_TERZA = ['deve ', 'dovrebbe ', 'doveva ', 'vuole ', 'vorrebbe ', 'ha da ',
                          'gli tocca ', 'le tocca ', 'dovra '];
  var TERZE_IRREGOLARI = { va: 'vado', fa: 'faccio', esce: 'esco', sale: 'salgo', viene: 'vengo',
                           beve: 'bevo', dice: 'dico', toglie: 'tolgo', sceglie: 'scelgo',
                           spegne: 'spengo', tiene: 'tengo', rimane: 'rimango', pone: 'pongo' };
  function senzaProtagonista(t) {
    if (!TERZA || !PROTAGONISTA) { return t; }
    return t.indexOf(PROTAGONISTA + ' ') === 0 ? t.slice(PROTAGONISTA.length + 1) : t;
  }

  /* LE PAROLE CHE APRONO UN PEZZO SENZA CAMBIARNE LA NATURA (11/11/2026).
     «Oggi dovevo fare la doccia» e' un'intenzione quanto «dovevo fare la
     doccia»; «ma non capisco» e' una negazione quanto «non capisco»;
     «intanto il padrone di casa mi scrive» ha per soggetto il padrone di
     casa. Le tre regole qui sotto guardavano solo la primissima parola, e
     un «oggi» o un «ma» davanti bastava a farle tacere: il pezzo passava
     per un gesto. Sono connettivi e avverbi di tempo: si scavalcano. */
  var ATTACCHI = ['ma ', 'pero ', 'poi ', 'quindi ', 'allora ', 'cosi ', 'intanto ',
                  'infine ', 'alla fine ', 'oggi ', 'ieri ', 'domani ', 'stamattina ',
                  'stasera ', 'stanotte ', 'adesso ', 'anche ', 'io ', 'noi '];
  function senzaAttacco(t) {
    var cambiato = true;
    while (cambiato) {
      cambiato = false;
      for (var i = 0; i < ATTACCHI.length; i++) {
        if (t.indexOf(ATTACCHI[i]) === 0) { t = t.slice(ATTACCHI[i].length); cambiato = true; }
      }
    }
    return t;
  }

  function eIntenzione(pezzo) {
    var t = senzaAttacco(piatto(pezzo));
    if (INTENZIONI.some(function (m) { return t.indexOf(m) === 0; })) { return true; }
    if (!TERZA) { return false; }
    var t3 = senzaProtagonista(t);
    return INTENZIONI_TERZA.some(function (m) { return t3.indexOf(m) === 0; });
  }

  /* UNA FRASE CHE DIPENDE DA UN'ALTRA NON E' UN GESTO SUO.
     «…a mia madre, che oggi non collabora» e «…senza le istruzioni, perché
     le ho perse» non raccontano un gesto nuovo: spiegano quello di prima.
     Sono la relativa e la causale, e si riconoscono dalla parola che le
     apre. */
  function eSubordinata(pezzo) {
    var t = senzaAttacco(piatto(pezzo));
    return t.indexOf('che ') === 0 || t.indexOf('perche ') === 0;
  }

  /* IL TRAPASSATO RACCONTA QUELLO CHE ERA SUCCESSO PRIMA.
     «Sono uscito dal bar, avevo bevuto tre birre»: il secondo pezzo non e'
     un gesto della scena, e' l'antefatto. In italiano lo dice il tempo del
     verbo: il trapassato prossimo esiste per questo. */
  function eTrapassato(pezzo) {
    var t = senzaAttacco(piatto(pezzo));
    return /^(?:avevo|avevamo|ero|eravamo) (?:[a-z]+ ){0,2}?[a-z]*(?:ato|ata|ati|ate|uto|uta|uti|ute|ito|ita|iti|ite|tto|tta|sto|sta|eso|esa|rso|rsa|rto|rta)(?![a-z])/.test(t);
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
    var t = senzaAttacco(piatto(pezzo));
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

  /* e i pronomi: «lei alza la voce», «loro aspettano». In un racconto in
     prima persona chi fa quel gesto e' un altro. */
  var ALTRI = ['lui ', 'lei ', 'loro ', 'egli ', 'ella ', 'essi ', 'esse '];

  function eSoggettoAltro(pezzo) {
    var t = senzaAttacco(piatto(pezzo));
    /* in una giornata raccontata in terza persona, il pezzo che comincia con
       il nome del protagonista parla di lui: non e' «un altro» */
    if (TERZA && PROTAGONISTA && t.indexOf(PROTAGONISTA + ' ') === 0) { return false; }
    if (ALTRI.some(function (a) { return t.indexOf(a) === 0; })) { return true; }
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

  /* ==========================================================================
     QUATTRO GUARDIE CHE VALGONO PER TUTTI I VERBI (11/11/2026)
     ==========================================================================
     Il banco dei racconti ha contato 26 gesti inventati su 64 nodi. Meta'
     venivano dal vocabolario, meta' dalla grammatica, e quasi tutti cadono
     sotto una di queste quattro regole. Vengono dalla lingua, non dagli
     esempi: ognuna si puo' dire in una riga e vale per verbi mai visti. */

  /* 1. NEGATO NON VUOL DIRE FATTO — anche con qualcosa in mezzo.
     La guardia c'era gia', ma guardava solo la parola subito prima.
     «Non MI entra piu' niente in testa», «non ho ANCORA finito», «non CE
     L'ho fatta»: fra la negazione e il verbo l'italiano mette pronomi e
     avverbi. Si scavalcano tutti e tre i tipi. */
  var PRONOMI_ATONI = ['mi', 'ti', 'si', 'ci', 'vi', 'lo', 'la', 'li', 'le', 'ne', 'gli',
                       'me', 'te', 'se', 'ce', 've', 'l', 'm', 't', 'c'];
  var AVVERBI_IN_MEZZO = ['ancora', 'mai', 'piu', 'proprio', 'neanche', 'nemmeno', 'gia',
                          'subito', 'sempre', 'quasi', 'appena', 'poi', 'ben', 'bene'];
  function scavalcabile(w) {
    return NON_SONO_GESTI.indexOf(w) >= 0 || PRONOMI_ATONI.indexOf(w) >= 0 ||
           AVVERBI_IN_MEZZO.indexOf(w) >= 0;
  }
  function negatoPrima(parole, i) {
    var k = i - 1;
    while (k >= 0 && scavalcabile(parole[k])) { k--; }
    return k >= 0 && NEGAZIONI_VICINE.indexOf(parole[k]) >= 0;
  }

  /* 2. «MI» PIU' UN VERBO ALLA TERZA PERSONA: IL GESTO E' DI UN ALTRO.
     «Mi alzo» e «mi lavo» sono io. «Mi chiede», «mi scrive», «mi blocca»,
     «mi tremano le mani», «mi gira la testa», «mi fa male» sono qualcuno o
     qualcosa che agisce su di me. La differenza e' nella desinenza, ed e'
     sicura: alla prima persona del presente l'italiano esce sempre in -o.
     Lo stesso con l'ausiliare: «mi sono alzato» e' mio, «mi ha chiesto»
     no. */
  /* ...e gli ausiliari del PASSIVO (25/11/2026): «la relazione VA consegnata
     entro domani», «il modulo VIENE firmato dal medico». Chi consegna e chi
     firma non e' detto, e di certo quel participio non e' un gesto che la
     persona sta facendo adesso: e' un obbligo, o una cosa che fa un altro.
     L'ha trovato la prima giornata-tipo d'ufficio, dove la scadenza
     diventava un gesto con il suo tiro di dado. */
  var AUSILIARI_ALTRUI = ['ha', 'hanno', 'aveva', 'avevano',
                          'va', 'vanno', 'andava', 'andavano', 'andrebbe', 'andrebbero',
                          'viene', 'vengono', 'veniva', 'venivano'];
  var AUSILIARI_MIEI = ['ho', 'abbiamo', 'sono', 'siamo', 'avevo', 'avevamo', 'ero',
                        'eravamo', 'hai', 'sei'];
  /* in terza persona «ha preso» e «si è alzato» sono gesti del protagonista.
     («è» qui arriva senza accento, come la congiunzione: si accetta solo
     dopo «si», dove congiunzione non puo' essere — vedi azioneDi.) */
  var SUOI_AUSILIARI = ['ha', 'aveva'];
  function suDiMe(parole, i) {
    var k = i - 1, conAusiliareAltrui = false, conAusiliareMio = false;
    while (k >= 0 && (AVVERBI_IN_MEZZO.indexOf(parole[k]) >= 0 ||
                      AUSILIARI_ALTRUI.indexOf(parole[k]) >= 0 ||
                      AUSILIARI_MIEI.indexOf(parole[k]) >= 0)) {
      if (AUSILIARI_ALTRUI.indexOf(parole[k]) >= 0) { conAusiliareAltrui = true; }
      if (AUSILIARI_MIEI.indexOf(parole[k]) >= 0) { conAusiliareMio = true; }
      k--;
    }
    if (k < 0 || ['mi', 'ci', 'm'].indexOf(parole[k]) < 0) { return false; }
    if (conAusiliareMio) { return false; }
    if (conAusiliareAltrui) { return true; }
    var w = parole[i];
    if (/(?:are|ere|ire|arsi|ersi|irsi)$/.test(w)) { return false; }   // un infinito
    return /(?:[ae]|ano|ono|ava|eva|iva|avano|evano|ivano)$/.test(w);
  }

  /* 3. L'AUSILIARE DICE DI CHI E' IL GESTO.
     «Ha chiamato il dottore», «hanno chiuso lo sportello»: in un racconto
     in prima persona l'ausiliare alla terza dice che l'ha fatto un altro. */
  function ausiliareAltruiPrima(parole, i) {
    var k = i - 1;
    while (k >= 0 && (AVVERBI_IN_MEZZO.indexOf(parole[k]) >= 0 ||
                      PRONOMI_ATONI.indexOf(parole[k]) >= 0)) { k--; }
    if (k < 0) { return false; }
    if (TERZA && SUOI_AUSILIARI.indexOf(parole[k]) >= 0) { return false; }
    return AUSILIARI_ALTRUI.indexOf(parole[k]) >= 0;
  }
  function ausiliareMioPrima(parole, i) {
    var k = i - 1;
    while (k >= 0 && (AVVERBI_IN_MEZZO.indexOf(parole[k]) >= 0 ||
                      PRONOMI_ATONI.indexOf(parole[k]) >= 0)) { k--; }
    if (k < 0) { return false; }
    if (TERZA && SUOI_AUSILIARI.indexOf(parole[k]) >= 0) { return true; }
    /* «si è alzato»: senza accento «è» e' scritta come la congiunzione, ma
       dopo «si» congiunzione non puo' essere */
    if (TERZA && parole[k] === 'e' && k > 0 && parole[k - 1] === 'si') { return true; }
    return AUSILIARI_MIEI.indexOf(parole[k]) >= 0;
  }

  /* 4. DOPO «DI», «A», «DA», «PER», «SENZA» UN VERBO NON APRE UN GESTO.
     Se e' un nome («di lavoro», «a casa») non e' un verbo. Se e' un
     infinito, o dipende da un verbo che il gesto l'ha gia' aperto («vado A
     comprare», «provo A spiegare»), oppure e' una subordinata («a forza DI
     sollevarla», «prima DI andare», «PER pagare»). In nessuno dei tre casi
     e' lui a cominciare un gesto nuovo. */
  var PRIMA_DI_UN_INFINITO = ['di', 'a', 'ad', 'da', 'per', 'senza'];

  /* I VERBI CHE NON SONO GESTI.
     Un nodo e' «un gesto con un inizio e una fine» [capitolo 2]. Sentire una
     frenata, vedere, accorgersi, pensare, volere, dormire, dimenticare,
     perdere, sbagliare, cadere, scivolare non lo sono: sono percezioni,
     stati della mente, cose che capitano. E' una classe piccola e chiusa, e
     per questo si puo' elencare. Sono prefissi di parola. */
  var NON_GESTI = ['sent', 'ved', 'vist', 'vid', 'accorg', 'accort', 'capisc', 'capit',
                   'capir', 'capiv', 'sapev', 'saput', 'sapere', 'pens', 'cred', 'vogl',
                   'vuol', 'volev', 'volut', 'poss', 'potev', 'potut', 'dev', 'dovev',
                   'dovut', 'sembr', 'piac', 'dorm', 'dimentic', 'perd', 'pers',
                   'sbagli', 'cad', 'scivol', 'inciamp', 'trem', 'soffr', 'piang',
                   'pians', 'sogn', 'rest', 'rimang', 'riman', 'rimast', 'viv', 'vissut'];
  function eNonGesto(w) {
    return NON_GESTI.some(function (r) { return w.indexOf(r) === 0; });
  }

  var PARTICIPIO = /(?:ato|ata|ati|ate|uto|uta|uti|ute|ito|ita|iti|ite)$/;

  var DOPO_UN_VERBO_IN_TERZA = ['il', 'lo', 'la', 'i', 'gli', 'le', 'un', 'uno', 'una', 'l',
    'al', 'allo', 'alla', 'ai', 'agli', 'alle', 'all', 'del', 'dello', 'della', 'dei', 'delle', 'dell',
    'in', 'a', 'ad', 'con', 'su', 'per', 'da', 'di', 'nel', 'nella', 'sul', 'sulla'];
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
      if (negatoPrima(parole, i)) { continue; }
      var prima = i > 0 ? parole[i - 1] : null;
      if (prima && DAVANTI_C_E_UN_NOME.indexOf(prima) >= 0) { continue; }
      /* una parola che il vocabolario conosce come CONDIZIONE non e' un
         gesto: «stanco morto» apriva un nodo perche' «stanco» finisce in -o */
      if (condizioniDi(w).length) { continue; }
      if (eNonGesto(w)) { continue; }
      if (suDiMe(parole, i)) { continue; }
      /* UN PARTICIPIO SENZA IL SUO AUSILIARE NON E' UN VERBO.
         «Minuti», «infinita», «giornata», «vestiti», «partita» finiscono come
         participi e sono nomi e aggettivi. Il participio che racconta un
         gesto ha davanti «ho», «sono», «abbiamo»: se non c'e', o se
         l'ausiliare e' di un altro («ha», «hanno»), il gesto non e' mio. */
      if (PARTICIPIO.test(w) && !ausiliareMioPrima(parole, i)) { continue; }
      /* L'IMPERFETTO E' LO SFONDO, NON IL GESTO.
         «Pioveva», «lui urlava», «non serviva a niente»: in italiano
         l'imperfetto descrive e il presente e il passato prossimo
         raccontano. Vale solo qui, per i verbi che il vocabolario non
         conosce: «arriva», «lava», «attiva» finiscono allo stesso modo e
         sono presenti, ma quelli il vocabolario li conosce e li prende
         prima.
         ALLA PRIMA PERSONA NO, E SI E' VISTO SUBITO. La prima stesura
         scartava anche «-avo», «-evo», «-ivo», e il banco ha perso un gesto
         vero: «riscrivo tutto da capo». «Riscrivo», «ricevo», «sollevo»,
         «prelevo», «arrivo» sono presenti e finiscono come imperfetti: dalla
         forma non si distinguono. Meglio un «tremavo» letto come gesto, che
         si vede e si corregge, di un gesto vero che sparisce. */
      if (/(?:ava|eva|iva)(?:no|mo|te)?$/.test(w)) { continue; }
      /* «-ANO» E «-ONO» SONO LORO, NON IO. «Ho gli occhi che bruciano»,
         «suonano alla porta», «arrivano i colleghi»: e' la terza plurale. La
         sola eccezione che conta e' il riflessivo di prima persona di certi
         verbi («mi allontano», «mi abbandono»), e ha «mi» davanti. */
      if (/(?:ano|ono)$/.test(w) && prima !== 'mi') { continue; }
      var forte = SOLO_DA_VERBO.test(w);
      var debole = /o$/.test(w) &&
        (i === 0 || (prima && PRONOMI_DAVANTI.indexOf(prima) >= 0));
      /* IN TERZA PERSONA IL VERBO SCONOSCIUTO FINISCE IN -A O IN -E, come
         meta' dei nomi. Non basta la desinenza: serve anche la posizione.
         Vale solo se la parola apre il pezzo (o viene subito dopo il nome
         del protagonista, o dopo «si»), e se subito dopo c'e' un articolo o
         una preposizione, cioe' il suo complemento: «partecipa alla
         riunione», «sparecchia la tavola». «La riunione dura» non passa:
         comincia con un articolo. */
      var debole3 = false;
      if (TERZA && !forte && !debole && w.length >= 5 && /[ae]$/.test(w)) {
        var inizio = i === 0 || prima === 'si' ||
          (PROTAGONISTA && parole.slice(0, i).join(' ') === PROTAGONISTA) ||
          (prima && PRONOMI_DAVANTI.indexOf(prima) >= 0);
        var dopo = parole[i + 1] || '';
        debole3 = !!inizio && DOPO_UN_VERBO_IN_TERZA.indexOf(dopo) >= 0;
      }
      if (!forte && !debole && !debole3) { continue; }
      return {
        azione: { radici: [], nome: 'un gesto che il vocabolario non conosce',
                  classe: 'ordinario', sconosciuto: true },
        parola: w, posizione: i, sconosciuto: true
      };
    }
    return null;
  }

  /* UNA FRASE DI STATO DETTA IN CODA A UN GESTO NON E' QUEL GESTO  (13/11/2026).

     La scena d'esempio dell'indagine finisce cosi': «accompagno il paziente,
     l'ambiente è rumoroso e non c'è nessuno che aiuti». La regola dei
     complementi — un pezzo senza verbo d'azione si riattacca al pezzo prima —
     incollava tutto all'ultimo gesto. Il rumore pesava su «accompagno il
     paziente» e su nessuno degli altri cinque gesti del turno, mentre chi
     scrive intende tutto il turno. E «non c'è nessuno che aiuti» spariva
     dentro il gesto: non produceva niente e nessuno lo vedeva.

     Due casi, e tutti e due si riconoscono dalla grammatica.

     1. «C'E'», «CI SONO», ANCHE NEGATI. Dicono che cosa c'e' intorno, non che
        cosa si sta facendo. Diventano un pezzo a se'. Se il vocabolario non
        ci trova niente, il pezzo finisce fra quelli che la pagina elenca come
        «non hanno prodotto niente»: si vede, ed e' quello che deve succedere.

     2. UN SOGGETTO SUO, UNA COPULA, E UNA CONDIZIONE DEL POSTO. «L'ambiente è
        rumoroso», «il corridoio era buio», «la sala è piena di gente». Qui
        serve una prudenza. «Apro la porta, la porta è bloccata» ha la stessa
        forma, ma la porta bloccata e' l'ostacolo di QUEL gesto, e farla
        valere per tutta la scena sarebbe l'errore opposto. Percio' il pezzo
        si stacca solo se tutte le condizioni che contiene sono voci
        d'ambiente (`ambiente` nel vocabolario: folla, rumore, buio, meteo,
        disordine). Una cosa rotta o che non si trova resta del suo gesto. */
  var SOGGETTO_PROPRIO = ['il', 'lo', 'la', 'l', 'i', 'gli', 'le', 'un', 'uno', 'una',
                          'questo', 'questa', 'quel', 'quella', 'fuori', 'dentro',
                          'qui', 'lì', 'là', 'intorno', 'tutto'];
  var COPULE_DI_STATO = ['è', 'era', 'sono', 'erano', 'sembra', 'sembrava', 'resta', 'restava'];
  var PRIMA_DELLO_STATO = ['e', 'ma', 'poi', 'intanto', 'però', 'é'];

  function eFraseDiStato(pezzo) {
    var w = paroleConAccento(pezzo);
    while (w.length && PRIMA_DELLO_STATO.indexOf(w[0]) >= 0) { w.shift(); }
    var i = (w[0] === 'non') ? 1 : 0;
    if ((w[i] === 'c' && ['è', 'era', 'erano'].indexOf(w[i + 1]) >= 0) ||
        (w[i] === 'ci' && ['sono', 'erano', 'saranno'].indexOf(w[i + 1]) >= 0)) { return true; }
    /* il secondo caso vale solo se nel pezzo non c'e' un gesto della persona */
    if (azioneDi(pezzo) || verboSconosciuto(pezzo)) { return false; }
    if (SOGGETTO_PROPRIO.indexOf(w[0]) < 0) { return false; }
    var haCopula = w.slice(1, 5).some(function (x) { return COPULE_DI_STATO.indexOf(x) >= 0; });
    if (!haCopula) { return false; }
    var cond = condizioniDi(pezzo);
    return cond.length > 0 && cond.every(function (tr) { return tr.voce && tr.voce.ambiente === true; });
  }

  /* IL PASSIVO NON E' UN GESTO DI CHI RACCONTA  (25/11/2026).
     «Va consegnata entro domani», «viene firmato dal medico»: il pezzo
     comincia con «va» o «viene» e subito dopo c'e' un participio. Non e'
     «andare» e non e' «venire»: e' una cosa che deve essere fatta, o che fa
     un altro. Resta attaccata al gesto di prima come un suo complemento —
     «scrivo la relazione, va consegnata entro domani» e' un gesto solo, con
     la sua scadenza. */
  var APRE_IL_PASSIVO = ['va', 'vanno', 'andava', 'andavano', 'andrebbe', 'andrebbero',
                         'viene', 'vengono', 'veniva', 'venivano'];
  function ePassivo(pezzo) {
    var w = senzaAttacco(piatto(pezzo)).split(/[^a-z0-9]+/).filter(function (x) { return x; });
    return w.length >= 2 && APRE_IL_PASSIVO.indexOf(w[0]) >= 0 &&
           /(?:at|ut|it|s|tt|rt|nt)[oaei]$/.test(w[1]);
  }

  function spezzaFrase(frase) {
    /* le congiunzioni e la «e» di seguito si trasformano in virgole, cosi'
       il taglio e' uno solo. La «e» e' rischiosa — «il bambino e la borsa»
       non sono due gesti — ma la guardia qui sotto rimette insieme i pezzi
       che non contengono un'azione, e quel caso si richiude da solo. */
    var lavoro = ' ' + frase + ' ';
    L.CONGIUNZIONI.forEach(function (c) {
      var re = new RegExp(c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      /* «DOPO» E' UNA CONGIUNZIONE SOLO DAVANTI A UN GESTO  (25/11/2026).
         «Mi alzo, dopo esco» sono due gesti. «Sono uscito dopo pranzo» e' un
         gesto solo, con il suo quando: tagliato, diventava «sono uscito» piu'
         un pezzo «pranzo», e la parola «dopo» spariva dal racconto. L'ha
         trovato la prova che cerca le parole perse, sui racconti del banco.
         Si taglia soltanto se la parola che segue apre un gesto. Resta un
         caso che la grammatica non scioglie: «dopo pranzo», dove «pranzo» e'
         un nome e anche un verbo. Li' si taglia, e il taglio si corregge a
         mano con «unisci sopra». */
      if (c.trim().toLowerCase() === 'dopo') {
        lavoro = lavoro.replace(re, function (trovato, dove, intero) {
          var seguito = intero.slice(dove + trovato.length).trim().split(/\s+/)[0] || '';
          return (azioneDi(seguito) || verboSconosciuto(seguito)) ? ', ' : trovato;
        });
        return;
      }
      lavoro = lavoro.replace(re, ', ');
    });
    /* la «e» lascia un segno: serve piu' sotto per sapere che un pezzo era
       coordinato a quello prima («che non collabora E si irrigidisce») */
    lavoro = lavoro.replace(/\s+e\s+/gi, ', \u0001');
    var pezzi = lavoro.split(',').map(function (p) { return p.trim(); })
                      .filter(function (p) { return p.replace('\u0001', '').trim().length; });

    /* si riattaccano al pezzo precedente: i complementi (nessuna azione) e
       le negazioni (l'esito del gesto di prima, non un gesto nuovo) */
    var fuori = [];
    var primaEraSubordinata = false;
    pezzi.forEach(function (p) {
      var coordinato = p.charAt(0) === '\u0001';
      if (coordinato) { p = p.slice(1).trim(); }
      /* una subordinata si porta dietro quello che le e' coordinato: «che
         oggi non collabora e si irrigidisce» e' una frase sola, anche se
         la «e» l'ha tagliata in due */
      var subordinata = eSubordinata(p) || (coordinato && primaEraSubordinata);
      primaEraSubordinata = subordinata;
      if (fuori.length && subordinata) { fuori[fuori.length - 1] += ' e ' + p; return; }
      /* «azione o verbo sconosciuto»: un pezzo il cui verbo il vocabolario non
         conosce NON e' un complemento da riattaccare — e' un gesto che nessuno
         ha ancora messo in elenco. Prima finiva incollato al pezzo prima, e
         due gesti diventavano uno senza che niente lo dicesse. */
      /* una frase di stato non e' un complemento del gesto di prima: resta
         un pezzo a se', e diventa contesto di tutta la scena */
      if (fuori.length && eFraseDiStato(p)) {
        fuori.push(p);
        return;
      }
      if (fuori.length && ((!azioneDi(p) && !verboSconosciuto(p)) || eNegazione(p) || ePassivo(p))) {
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
      if (negatoPrima(parole, posizione)) { return; }
      /* le quattro guardie scritte sopra, uguali per tutti i verbi */
      if (prima && PRIMA_DI_UN_INFINITO.indexOf(prima) >= 0) { return; }
      if (suDiMe(parole, posizione)) { return; }
      if (ausiliareAltruiPrima(parole, posizione)) { return; }
      L.AZIONI.forEach(function (a) {
        if (migliore) { return; }
        a.radici.forEach(function (r) {
          if (migliore) { return; }
          /* UNA RADICE CHE FINISCE CON «$» VUOLE LA PAROLA INTERA.
             Il confronto per prefisso e' comodo e pericoloso: «pul» prendeva
             «pullman», «entr» prendeva «entrambi», «apr» prendeva «aprile».
             Dove il prefisso e' troppo corto per essere sicuro, il
             vocabolario scrive le forme una per una, e quelle che non
             devono allungarsi le chiude con «$». */
          var intera = r.charAt(r.length - 1) === '$';
          var radice = intera ? r.slice(0, -1) : r;
          /* in terza persona «va» e «fa» si leggono come «vado» e «faccio» */
          var daCercare = (TERZA && TERZE_IRREGOLARI[parola]) || parola;
          /* una radice chiusa su una prima persona («partecipo$») vale, in
             terza, anche per la terza: «partecipa», e «pulisce» da «pulisco» */
          var terzaDellaRadice = TERZA && intera && radice.charAt(radice.length - 1) === 'o' &&
            (parola === radice.slice(0, -1) + 'a' || parola === radice.slice(0, -1) + 'e');
          if (terzaDellaRadice || (intera ? daCercare === radice : daCercare.indexOf(radice) === 0)) {
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
  /* A PAROLA INTERA, NON A PEZZO DI PAROLA (11/11/2026).
     Il confronto era `indexOf`: «succede» conteneva «cede» e segnalava un
     oggetto che cede sotto il gesto; «mi ha interrotto» conteneva «rotto» e
     toglieva otto punti per uno strumento guasto; «otto ore filate»
     conteneva «fila». E piu' voci si aggiungono, piu' agganci sbagliati
     nascono: non si poteva allargare il vocabolario senza chiudere prima
     questo.

     Adesso la chiave deve COMINCIARE dove comincia una parola. In fondo puo'
     allungarsi solo di una desinenza — «stanc» prende «stanco», «stanchi»,
     «stanchissima», «stanchezza»; «confus» prende «confusa» e
     «confusione»; «trapan» prende «trapanando» — e poi la parola deve
     finire. «Fila» non prende «filate», «coda» non prende «codata». */
  var DOPO_LA_CHIAVE = /^(?:[aeio]|h[ei]|h?issim[aoei]|h?ezza|os[aoei]|at[aoei]|ant[ei]|ion[ei]|ment[eio]|and[oa]|end[oa]|av[aoi]|avano|ev[aoi]|evano)?(?![a-z0-9])/;
  /* «NON SONO STANCO» NON VUOL DIRE STANCO (11/11/2026).
     Misurato prima di toccare niente: «Non sono stanco» toglieva otto punti
     di energia, «Non ho fretta» dieci di tempo, «Non c'è rumore» sette di
     ambiente. Il lettore trovava la parola e non guardava che cosa aveva
     davanti: leggeva la frase alla rovescia, ed e' l'errore peggiore perche'
     ha il segno sbagliato. E «non ho tempo» faceva scattare due voci
     insieme — la sua, e «ho tempo» che ci sta dentro.

     Una chiave preceduta da una negazione non scatta. Fra le due possono
     stare le parole che l'italiano ci mette in mezzo: «non SONO stanco»,
     «non HO PIU' dolore», «non C'E' traffico», «senza dolore», «nessun
     rumore». Le chiavi che la negazione ce l'hanno dentro («non ho dormito»,
     «senza fretta») cominciano gia' da li', e non ne hanno un'altra davanti.

     Non si rovescia il segno: «non sono stanco» non vuol dire «sono
     riposato». Vuol dire che di stanchezza non si e' parlato. */
  var NEGA = ['non', 'senza', 'nessun', 'nessuna', 'nessuno', 'niente', 'neanche', 'nemmeno'];
  var FRA_IL_NON_E_LA_PAROLA = ['molto', 'tanto', 'troppo', 'cosi', 'e', 'affatto', 'per',
                                'alcun', 'alcuna', 'particolare', 'particolari'];
  function negataNelTesto(t, dove) {
    var prima = t.slice(0, dove).trim().split(' ');
    var k = prima.length - 1, passi = 0;
    while (k >= 0 && passi < 4 &&
           (scavalcabile(prima[k]) || FRA_IL_NON_E_LA_PAROLA.indexOf(prima[k]) >= 0)) { k--; passi++; }
    return k >= 0 && NEGA.indexOf(prima[k]) >= 0;
  }
  function contiene(t, chiave) {
    var da = 0, dove;
    if (!chiave) { return false; }
    while ((dove = t.indexOf(chiave, da)) >= 0) {
      var prima = dove > 0 ? t.charAt(dove - 1) : ' ';
      if (!/[a-z0-9]/.test(prima) && DOPO_LA_CHIAVE.test(t.slice(dove + chiave.length)) &&
          !negataNelTesto(t, dove)) { return true; }
      da = dove + 1;
    }
    return false;
  }

  /* LE CONDIZIONI DETTE IN TERZA PERSONA.
     Il vocabolario delle condizioni e' scritto come parla chi racconta di
     se': «non capisco», «ho fame», «non le trovo». Chi racconta un altro
     scrive «non capisce», «ha fame», «non le trova». Riscrivere quattrocento
     espressioni due volte sarebbe due elenchi da tenere allineati a mano.
     Si volta la CHIAVE, parola per parola, con le poche forme che cambiano:
     e' la stessa voce, con la stessa casa e lo stesso peso. */
  var DA_PRIMA_A_TERZA = { ho: 'ha', avevo: 'aveva', sono: 'e', ero: 'era', sto: 'sta', stavo: 'stava',
    capisco: 'capisce', trovo: 'trova', riesco: 'riesce', dormo: 'dorme', mangio: 'mangia', so: 'sa',
    posso: 'puo', potevo: 'poteva', faccio: 'fa', riprovo: 'riprova', insisto: 'insiste',
    continuo: 'continua', tremo: 'trema', penso: 'pensa', conosco: 'conosce', mi: 'si', mio: 'suo',
    mia: 'sua', miei: 'suoi', mie: 'sue', devo: 'deve', reggo: 'regge', ricordo: 'ricorda',
    vedo: 'vede', sento: 'sente', arrivo: 'arriva', casco: 'casca', crollo: 'crolla' };
  function inTerza(chiave) {
    var cambiata = false;
    var fuori = chiave.split(' ').map(function (w) {
      if (DA_PRIMA_A_TERZA.hasOwnProperty(w)) { cambiata = true; return DA_PRIMA_A_TERZA[w]; }
      return w;
    }).join(' ');
    return cambiata ? fuori : null;
  }

  function condizioniDi(frammento) {
    var t = piatto(frammento);
    var tracce = [];
    L.CONDIZIONI.forEach(function (c) {
      var trovata = null;
      c.chiavi.forEach(function (k) {
        if (trovata) { return; }
        if (contiene(t, piatto(k))) { trovata = k; return; }
        if (TERZA) {
          var k3 = inTerza(piatto(k));
          if (k3 && contiene(t, k3)) { trovata = k3; }
        }
      });
      /* I MODELLI: dove le parole cambiano ma la forma no.
         «Da tre settimane», «da due mesi», «da dieci giorni» non si possono
         elencare: sono la stessa frase con un numero diverso. Un modello la
         riconosce una volta per tutte. La parola che finisce nella traccia
         e' il pezzo di testo trovato, cosi' chi legge vede da dove viene. */
      if (!trovata && c.modelli) {
        c.modelli.forEach(function (m) {
          if (trovata) { return; }
          var r = m.exec(t);
          if (r && !negataNelTesto(t, r.index)) { trovata = r[0]; }
        });
      }
      if (trovata) {
        tracce.push({ variabile: c.variabile, valore: c.valore,
                      parola: trovata, perche: c.perche, voce: c });
      }
    });
    /* UNA VOCE CHE SI PRENDE LA CASA DI UN'ALTRA.              [capitolo 18]
       La tabella dei domicili del libro ha una riga precisa: «Ha dormito
       male da diverse notti → STR (carico persistente). Variabile esclusa:
       E, se il sonno non incide sul gesto adesso». «Non dormo da tre
       settimane» nomina il sonno E la durata: senza questa regola finiva in
       due case, energia e carico. Quando nella stessa frase c'e' una voce di
       durata, quella del sonno e della stanchezza le cede il posto. */
    tracce.forEach(function (a) {
      (a.voce.assorbe || []).forEach(function (causa) {
        tracce.forEach(function (b) {
          if (b !== a && b.voce.causa === causa) { b.assorbitaDa = a; }
        });
      });
    });
    return tracce;
  }

  function campoDi(frammento) {
    var t = piatto(frammento);
    var fuori = [];
    L.CAMPO_ATTIVO.forEach(function (c) {
      c.chiavi.forEach(function (k) {
        if (contiene(t, piatto(k))) { fuori.push({ nome: c.nome, parola: k }); }
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
  /* LA PERSONA DEL RACCONTO SI DECIDE QUI, E VALE PER UNA CHIAMATA SOLA.
     `opzioni.protagonista` e' il nome con cui il racconto chiama la persona
     («il paziente», «Maria», «lei»); una stringa vuota, o `opzioni.terza`,
     dice soltanto che il racconto e' in terza persona con il soggetto
     sottinteso («si alza, va in bagno»). Le due variabili tornano com'erano
     comunque vada, anche se la lettura si rompe: una lettura in terza
     persona non deve lasciare il segno su quella dopo. */
  function leggi(testo, opzioni) {
    opzioni = opzioni || {};
    var eraTerza = TERZA, eraProtagonista = PROTAGONISTA;
    var nome = (typeof opzioni.protagonista === 'string') ? piatto(opzioni.protagonista).trim() : '';
    TERZA = !!(opzioni.terza || nome);
    PROTAGONISTA = nome;
    try {
      var esito = leggiDentro(testo, opzioni);
      esito.terza = TERZA;
      esito.protagonista = PROTAGONISTA;
      return esito;
    } finally {
      TERZA = eraTerza; PROTAGONISTA = eraProtagonista;
    }
  }

  function leggiDentro(testo, opzioni) {
    opzioni = opzioni || {};
    testo = (testo === null || testo === undefined) ? '' : String(testo);
    var caricoBase = opzioni.caricoBase === undefined ? 40 : opzioni.caricoBase;

    /* --- 1. i frammenti --- */
    var frammenti = [];
    /* LA SCENA E' RACCONTATA AL PRESENTE O AL PASSATO?
       Serve alla regola qui sotto, e l'ha chiesto il banco. «Ho mangiato e
       sono stanco. Mi alzo dalla sedia…» e' una scena al presente con un
       antefatto: il passato e' quello che e' successo prima. Ma «ho chiamato
       tre clienti e alle sei ero distrutto» sta in una giornata raccontata
       tutta al passato: li' il passato e' il tempo del racconto, e quel
       gesto e' un gesto. Finche' il vocabolario non conosceva «distrutto» la
       differenza non si vedeva; appena l'ha imparato, la regola ha
       cominciato a mangiarsi i gesti veri di chi racconta la sua giornata
       la sera. Quindi: il passato e' antefatto solo se nella scena c'e'
       almeno un gesto al presente. */
    var tuttiIPezzi = [];
    frasi(testo).forEach(function (frase) {
      spezzaFrase(frase).forEach(function (pezzo) { tuttiIPezzi.push(pezzo); });
    });
    var alPresente = tuttiIPezzi.some(function (pezzo) {
      var a = azioneDi(pezzo) || verboSconosciuto(pezzo);
      if (!a || eIntenzione(pezzo) || eSoggettoAltro(pezzo) || eTrapassato(pezzo) ||
          eSubordinata(pezzo)) { return false; }
      /* al passato e' il gesto che ha davanti il suo ausiliare, ovunque stia
         nel pezzo: «A pranzo HO mangiato un panino» comincia con «a pranzo»,
         e guardando solo l'inizio passava per un presente */
      var parole = piatto(pezzo).split(/[^a-z0-9]+/).filter(function (w) { return w; });
      return !ausiliareMioPrima(parole, a.posizione);
    });
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
        /* ...e lo stato dev'essere DELLA PERSONA. «Ho attraversato la
           strada, era buio» ha un verbo al passato e una condizione, ma la
           condizione e' della strada: il gesto resta un gesto. Prima
           spariva anche lui, e con lui un terzo della scena. */
        if (az && alPresente && ePassatoComposto(pezzo) && condizioniDi(pezzo).some(function (c) {
              return c.variabile === 'E' || c.variabile === 'STR'; })) { az = null; }
        /* «devo uscire alle otto» non e' un gesto che si sta facendo: e'
           una scadenza dichiarata, cioe' contesto. Il verbo modale la
           distingue dal gesto vero, ed e' un segnale grammaticale, non una
           supposizione: «devo uscire» e «esco» sono due cose diverse. */
        if (az && (eIntenzione(pezzo) || eSoggettoAltro(pezzo) ||
                   eTrapassato(pezzo) || eSubordinata(pezzo))) { az = null; }
        /* «non c'è nessuno che aiuti» contiene «aiuti», ma nessuno sta
           aiutando: e' una frase di stato, e resta contesto */
        if (az && eFraseDiStato(pezzo)) { az = null; }
        /* e un pezzo al passivo, rimasto da solo in testa alla frase */
        if (az && ePassivo(pezzo)) { az = null; }
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

    /* --- 2a. LE DOMANDE DI SCENA: CHI HA RISPOSTO NON VIENE PIU' INDOVINATO ---
       [app/dati/lessico.js, DOMANDE_SCENA — 13/11/2026]
       La persona puo' rispondere a poche domande chiuse sulla giornata. Ogni
       domanda ha una casa sola, e dichiara quali voci del vocabolario
       sostituisce. Da quel momento le PAROLE di quelle voci non contano piu',
       ne' nel contesto ne' dentro un gesto: vale la risposta, una volta, per
       tutta la scena. Le parole restano nella traccia come «sostituite»,
       cosi' si vede che erano state lette e perche' non sono state sommate.
       Chi non risponde a una domanda resta alla lettura delle parole, come
       prima: una risposta mancante non vale zero. */
    var risposte = opzioni.risposte || {};
    var DS = L.DOMANDE_SCENA || [];
    function opzioneDi(d, idOpzione) {
      return (d.opzioni || []).filter(function (o) { return o.id === idOpzione; })[0] || null;
    }
    function siFa(d) {
      if (!d.seSolo) { return true; }
      return Object.keys(d.seSolo).some(function (k) { return d.seSolo[k].indexOf(risposte[k]) >= 0; });
    }
    var prese = [];
    var coperte = {};
    var possedute = {};      // le voci che hanno una domanda loro, risposta o no
    DS.forEach(function (d) { (d.copre || []).forEach(function (idVoce) { possedute[idVoce] = true; }); });
    DS.forEach(function (d) {
      var o = siFa(d) ? opzioneDi(d, risposte[d.id]) : null;
      if (!o) { return; }
      prese.push({ d: d, o: o });
      (d.copre || []).forEach(function (idVoce) { coperte[idVoce] = d; });
    });
    function sostituitaDa(d) {
      return 'Su questo hai risposto a una domanda: «' + d.testo + '». Vale la tua risposta, ' +
             'una volta sola e per tutta la scena. Questa parola del racconto non si somma.';
    }
    var viste = {};
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
    var perCausa = {};
    var ASSORBITA = 'Qui la cosa dura da tempo, e allora non è il corpo di adesso: è carico ' +
      'che ci si porta dietro, ed è già stato contato lì. È la regola del domicilio ' +
      'unico del capitolo 18. Se stamattina pesa anche sul gesto, aggiungilo a mano.';
    var STESSA_CAUSA = 'È la stessa cosa detta con altre parole, e conta una volta sola: ' +
      'la stanchezza e il sonno scarso sono un fatto, non due. Resta il valore ' +
      'più forte. Se per te sono davvero due cose diverse, cambia il numero a mano.';
    frammenti.forEach(function (f, indiceF) {
      var primaDiQuesto = contesto.tracce.length;
      condizioniDi(f.testo).forEach(function (tr) {
        /* ...e le voci che descrivono la PERSONA valgono per tutta la scena
           anche quando sono dette dentro un gesto (13/11/2026). «Mi sono
           svegliato tardi perche' ho fatto le due, poi ho preso il treno, ho
           lavorato otto ore»: il sonno perso pesava sul risveglio e basta,
           e gli altri gesti della giornata partivano a energia zero. Ma il
           corpo e' uno, ed e' lo stesso per tutta la giornata. Il vocabolario
           segna queste voci con `diScena` [app/dati/lessico.js]. */
        var diScena = (f.tipo === 'contesto' && SEMPRE_DI_NODO.indexOf(tr.variabile) < 0) ||
                      SEMPRE_DI_SCENA.indexOf(tr.variabile) >= 0 ||
                      (tr.voce && tr.voce.diScena === true);
        if (tr.voce && tr.voce.id) { viste[tr.voce.id] = true; }
        if (tr.voce && tr.voce.id && coperte[tr.voce.id]) {
          if (diScena) {
            contesto.tracce.push({ variabile: tr.variabile, valore: 0, parola: tr.parola,
                                   scartata: true, sostituita: true,
                                   perche: sostituitaDa(coperte[tr.voce.id]) });
          }
          return;
        }
        if (!diScena) { return; }
        if (tr.assorbitaDa) {
          contesto.tracce.push({ variabile: tr.variabile, valore: 0, parola: tr.parola,
                                 scartata: true, perche: ASSORBITA });
          return;
        }
        if (gia.indexOf(tr.voce) >= 0) {
          contesto.tracce.push({ variabile: tr.variabile, valore: 0, parola: tr.parola,
            scartata: true,
            perche: 'La scena lo dice più volte, ma conta una volta sola: ripetere una ' +
                    'parola non rende il fatto più vero. Se è più grave di così, ' +
                    'alza il valore a mano.' });
          return;
        }
        gia.push(tr.voce);
        /* LA STESSA CAUSA DETTA CON DUE PAROLE CONTA UNA VOLTA.   [capitolo 18]
           «"Sono stanca" diventa energia bassa. "Ho dormito male" diventa
           energia ancora più bassa. E il conto è già raddoppiato: la
           stanchezza e il sonno scarso sono la stessa cosa vista due volte.»
           Il libro lo chiama il disastro che avviene in silenzio, e il
           lettore lo commetteva: le due voci sono distinte nel vocabolario,
           e si sommavano. Adesso le voci che dichiarano la stessa `causa`
           si contendono un posto solo: resta la piu' forte, e l'altra
           rimane scritta nella traccia, con il perche'. */
        var causa = tr.voce.causa;
        if (causa) {
          var rivale = perCausa[causa];
          if (rivale && Math.abs(tr.valore) <= Math.abs(rivale.valore)) {
            contesto.tracce.push({ variabile: tr.variabile, valore: 0, parola: tr.parola,
                                   scartata: true, perche: STESSA_CAUSA });
            return;
          }
          if (rivale) {
            contesto.valori[rivale.variabile] -= rivale.valore;
            rivale.valore = 0; rivale.scartata = true; rivale.perche = STESSA_CAUSA;
            rivale.presaDalContesto = false;
          }
          perCausa[causa] = tr;
        }
        contesto.valori[tr.variabile] += tr.valore;
        contesto.tracce.push(tr);
        tr.presaDalContesto = true;
      });
      /* ogni traccia ricorda da quale pezzo del racconto viene: serve alla
         ricevuta, che dice frase per frase dove e' finita ogni cosa */
      for (var jT = primaDiQuesto; jT < contesto.tracce.length; jT++) {
        if (contesto.tracce[jT].frammento === undefined) { contesto.tracce[jT].frammento = indiceF; }
      }
    });

    /* --- 2a-bis. LE FRASI CHE LA PERSONA HA MESSO A MANO IN UNA CASA ---
       [app/dati/lessico.js, CASE_A_MANO — 25/11/2026]
       La chiave e' il testo della frase, non il suo numero: se la persona
       cambia il taglio del racconto i numeri si spostano, il testo no. */
    var assegnate = opzioni.assegnate || {};
    var CM = L.CASE_A_MANO || [];
    frammenti.forEach(function (f, indiceF) {
      var scelta = assegnate[piatto(f.testo)];
      var casa = scelta ? CM.filter(function (c0) { return c0.id === scelta; })[0] : null;
      f.assegnata = casa ? casa.id : null;
      if (!casa || !casa.variabile || f.tipo !== 'contesto') { return; }
      var tr = { variabile: casa.variabile, valore: casa.valore, parola: f.testo,
                 aMano: true, frammento: indiceF,
                 voce: { causa: casa.variabile === 'STR' ? 'carico' : 'a-mano-' + casa.variabile },
                 perche: 'Questa frase l’hai messa tu in questa casa. Il valore è quello di un ' +
                         'fatto detto chiaro: se pesa di più o di meno, cambia il numero a mano.' };
      var rivaleM = perCausa[tr.voce.causa];
      if (rivaleM && Math.abs(tr.valore) <= Math.abs(rivaleM.valore)) {
        contesto.tracce.push({ variabile: tr.variabile, valore: 0, parola: tr.parola, frammento: indiceF,
          scartata: true, aMano: true,
          perche: 'In questa casa c’è già un altro fatto dello stesso genere, e conta una volta ' +
                  'sola: resta il più forte. Se sono due cose diverse, alza il numero a mano.' });
        return;
      }
      if (rivaleM) {
        contesto.valori[rivaleM.variabile] -= rivaleM.valore;
        rivaleM.valore = 0; rivaleM.scartata = true; rivaleM.perche = STESSA_CAUSA;
        rivaleM.presaDalContesto = false;
      }
      perCausa[tr.voce.causa] = tr;
      contesto.valori[tr.variabile] += tr.valore;
      contesto.tracce.push(tr);
      tr.presaDalContesto = true;
    });

    /* --- 2b. LE RISPOSTE ENTRANO NEL CONTESTO, CON LE STESSE REGOLE DELLE PAROLE ---
       Stessa causa, un posto solo: «ho dormito male» (risposta) e «sono a
       pezzi» (parola, se a quella domanda non si e' risposto) sono lo stesso
       riposo, e resta il valore piu' forte. Vale anche per il carico. */
    prese.forEach(function (rp) {
      if (!rp.o.valore) { return; }
      var tr = { variabile: rp.d.variabile, valore: rp.o.valore,
                 parola: '(risposta: ' + rp.o.etichetta.toLowerCase() + ')',
                 daRisposta: true, voce: { causa: rp.d.causa, daDomanda: rp.d.id },
                 perche: 'L’hai detto tu, rispondendo alla domanda «' + rp.d.testo + '». ' +
                         'Una risposta ha una casa sola, e vale per tutti i gesti della scena.' };
      var causa = rp.d.causa;
      if (causa) {
        var rivale = perCausa[causa];
        if (rivale && Math.abs(tr.valore) <= Math.abs(rivale.valore)) {
          contesto.tracce.push({ variabile: tr.variabile, valore: 0, parola: tr.parola,
                                 scartata: true, perche: STESSA_CAUSA });
          return;
        }
        if (rivale) {
          contesto.valori[rivale.variabile] -= rivale.valore;
          rivale.valore = 0; rivale.scartata = true; rivale.perche = STESSA_CAUSA;
          rivale.presaDalContesto = false;
        }
        perCausa[causa] = tr;
      }
      /* UNA RISPOSTA E UNA PAROLA NELLA STESSA CASA NON SI SOMMANO DA SOLE.
         Il banco l'ha mostrato subito. Racconto: «la luce del pianerottolo è
         fulminata». Domanda sul posto: «molto disturbato» — e chi risponde
         sta pensando proprio a quella luce. La voce della cosa rotta non e'
         fra quelle che la domanda sostituisce, e l'ambiente scendeva di otto
         per un fatto solo. E' l'errore che le domande esistono per evitare.
         La regola e' quella che vale gia' fra scena e gesto: nella stessa
         casa, con lo stesso segno, resta il valore piu' forte, e l'altro
         rimane scritto. Possono essere due cose diverse — il dolore e
         l'ansia, il rumore e la luce rotta — e allora la seconda va aggiunta
         a mano: la pagina lo dice. Meglio un fatto da aggiungere che un
         fatto contato due volte senza che nessuno lo sappia. */
      if (tr.valore < 0 && SEMPRE_DI_SCENA.indexOf(tr.variabile) < 0) {
        var piuForte = false;
        contesto.tracce.forEach(function (t0) {
          if (t0.scartata || t0.daRisposta || t0.variabile !== tr.variabile || !(t0.valore < 0)) { return; }
          /* una voce che ha una domanda SUA e' un altro fatto per costruzione:
             il sonno ha la sua domanda, e non e' il dolore. Si confrontano
             solo le voci che nessuna domanda chiede — la cosa rotta, l'ansia —
             perche' sono quelle che chi risponde puo' avere in mente. */
          if (t0.voce && t0.voce.id && possedute[t0.voce.id]) { return; }
          if (Math.abs(t0.valore) > Math.abs(tr.valore)) { piuForte = true; return; }
          contesto.valori[t0.variabile] -= t0.valore;
          t0.valore = 0; t0.scartata = true; t0.presaDalContesto = false;
          t0.perche = 'Sta nella stessa casa della tua risposta alla domanda «' + rp.d.testo +
            '», e potrebbe essere la stessa cosa. Per non contarla due volte resta il ' +
            'valore più forte, che è quello della risposta. Se è un’altra cosa, aggiungila a mano.';
        });
        if (piuForte) {
          contesto.tracce.push({ variabile: tr.variabile, valore: 0, parola: tr.parola, scartata: true,
            perche: 'Nel racconto c’è già una parola che pesa di più nella stessa casa, e potrebbe ' +
                    'essere la stessa cosa. Per non contarla due volte resta quella. Se la tua ' +
                    'risposta dice un’altra cosa, aggiungila a mano.' });
          return;
        }
      }
      contesto.valori[tr.variabile] += tr.valore;
      contesto.tracce.push(tr);
      tr.presaDalContesto = true;
    });
    /* LE DUE DOMANDE CHE SCIOLGONO UNA COPPIA CRITICA.           [capitolo 20]
       «Questa stanchezza da quanto dura?» «Questa fretta è di oggi, o è
       sempre così?» Se la risposta e' «da settimane», il fatto cambia casa:
       non e' piu' il corpo o il tempo di adesso, e' carico che ci si porta
       dietro. Il carico e' gia' entrato qui sopra; quello che resta da fare
       e' togliere il fatto dalla casa di prima, perche' non conti due volte. */
    prese.forEach(function (rp) {
      if (!rp.d.assorbe || !rp.o.valore) { return; }
      contesto.tracce.forEach(function (t) {
        if (t.scartata || !t.voce || t.voce.causa !== rp.d.assorbe || t.valore >= 0) { return; }
        contesto.valori[t.variabile] -= t.valore;
        t.valore = 0; t.scartata = true; t.presaDalContesto = false;
        t.perche = 'Hai risposto che dura da tempo. Allora non è la condizione di adesso: è ' +
                   (TERZA ? 'carico che si porta dietro' : 'carico che ti porti dietro') +
                   ', ed è già contato lì. È una delle coppie ' +
                   'critiche del capitolo 20, e una cosa sta in una casa sola.';
      });
    });
    /* che cosa mostrare a chi risponde: la domanda, la risposta data, e la
       risposta che il racconto suggerisce (il testo propone, non decide) */
    /* in terza persona le domande e le risposte si leggono in terza persona:
       «come ha dormito?», non «come hai dormito?» */
    function nellaPersona(d) {
      return { testo: (TERZA && d.terza) ? d.terza : d.testo,
               opzioni: (d.opzioni || []).map(function (o) {
                 return { id: o.id, valore: o.valore, etichetta: (TERZA && o.terza) ? o.terza : o.etichetta };
               }) };
    }
    var domande = DS.map(function (d) {
      var proposta = null;
      Object.keys(d.propone || {}).forEach(function (idVoce) {
        if (!proposta && viste[idVoce]) { proposta = d.propone[idVoce]; }
      });
      var visibile = siFa(d);
      var np = nellaPersona(d);
      return { id: d.id, testo: np.testo, variabile: d.variabile, opzioni: np.opzioni,
               visibile: visibile, proposta: proposta,
               risposta: (visibile && opzioneDi(d, risposte[d.id])) ? risposte[d.id] : null };
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
          perche: 'Coordinamenti che il gesto richiede in sé.' });
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
      /* la stessa regola della stessa causa, dentro il gesto */
      var fortiNelGesto = {};
      var delGesto = condizioniDi(f.testo);

      /* LE DOMANDE SUL GESTO  [app/dati/lessico.js, DOMANDE_GESTO — 25/11/2026]
         Stesse regole delle domande di scena, applicate a un gesto solo: la
         risposta sostituisce le voci che copre, qui dentro. */
      var idNodo = 'n' + (nodi.length + 1);
      var risposteQui = (opzioni.risposteGesti || {})[idNodo] || {};
      var DG = L.DOMANDE_GESTO || [];
      var preseQui = [], coperteQui = {}, posseduteGesto = {}, visteQui = {};
      DG.forEach(function (d) {
        (d.copre || []).forEach(function (idVoce) { posseduteGesto[idVoce] = true; });
        var o = opzioneDi(d, risposteQui[d.id]);
        if (!o) { return; }
        preseQui.push({ d: d, o: o });
        (d.copre || []).forEach(function (idVoce) { coperteQui[idVoce] = d; });
      });
      delGesto.forEach(function (tr) { if (tr.voce.id) { visteQui[tr.voce.id] = true; } });
      function sostituitaQui(d) {
        return 'Su questo gesto hai risposto a una domanda: «' + d.testo + '». Vale la tua ' +
               'risposta, una volta sola. Questa parola del racconto non si somma.';
      }
      delGesto.forEach(function (tr) {
        var c = tr.voce.causa;
        if (!c || tr.assorbitaDa || (tr.voce.id && (coperte[tr.voce.id] || coperteQui[tr.voce.id]))) { return; }
        if (!fortiNelGesto[c] || Math.abs(tr.valore) > Math.abs(fortiNelGesto[c].valore)) { fortiNelGesto[c] = tr; }
      });
      delGesto.forEach(function (tr) {
        var c = tr.voce.causa;
        /* a questa voce ha gia' risposto una domanda di scena: la parola
           detta dentro il gesto non si somma alla risposta */
        if (tr.voce.id && coperte[tr.voce.id]) {
          if (!tr.voce.diScena) {
            tracce.push({ variabile: tr.variabile, valore: 0, parola: tr.parola,
                          scartata: true, sostituita: true,
                          perche: sostituitaDa(coperte[tr.voce.id]) });
          }
          return;
        }
        if (tr.voce.id && coperteQui[tr.voce.id]) {
          tracce.push({ variabile: tr.variabile, valore: 0, parola: tr.parola,
                        scartata: true, sostituita: true,
                        perche: sostituitaQui(coperteQui[tr.voce.id]) });
          return;
        }
        if (tr.assorbitaDa) {
          tracce.push({ variabile: tr.variabile, valore: 0, parola: tr.parola,
                        scartata: true, perche: ASSORBITA });
          return;
        }
        if (c && fortiNelGesto[c] !== tr) {
          tracce.push({ variabile: tr.variabile, valore: 0, parola: tr.parola,
                        scartata: true, perche: STESSA_CAUSA });
          return;
        }
        if (SEMPRE_DI_SCENA.indexOf(tr.variabile) >= 0 ||
            (tr.voce && tr.voce.diScena === true)) { return; }       // gia' nel contesto
        if (SEMPRE_DI_NODO.indexOf(tr.variabile) >= 0) {
          v[tr.variabile] += tr.valore;                 // la complessita' si somma
          tracce.push(tr);
          return;
        }
        locali[tr.variabile] = (locali[tr.variabile] || []).concat([tr]);
      });

      /* le risposte sul gesto entrano fra le condizioni del gesto */
      preseQui.forEach(function (rp) {
        if (!rp.o.valore) { return; }
        var k2 = rp.d.variabile;
        var tr = { variabile: k2, valore: rp.o.valore,
                   parola: '(risposta: ' + rp.o.etichetta.toLowerCase() + ')',
                   daRisposta: true, voce: { daDomanda: rp.d.id },
                   perche: 'L’hai detto tu, rispondendo alla domanda su questo gesto: «' +
                           rp.d.testo + '». Una risposta ha una casa sola.' };
        if (SEMPRE_DI_NODO.indexOf(k2) >= 0) { v[k2] += tr.valore; tracce.push(tr); return; }
        /* una risposta e una parola che nessuna domanda chiede, nella stessa
           casa e con lo stesso segno: resta il valore piu' forte, come per
           le domande di scena */
        if (tr.valore < 0) {
          var restano = [], piuForte = false;
          (locali[k2] || []).forEach(function (t0) {
            var confrontabile = !t0.daRisposta && t0.valore < 0 &&
                                !(t0.voce && t0.voce.id && posseduteGesto[t0.voce.id]);
            if (!confrontabile) { restano.push(t0); return; }
            if (Math.abs(t0.valore) > Math.abs(tr.valore)) { piuForte = true; restano.push(t0); return; }
            tracce.push({ variabile: k2, valore: 0, parola: t0.parola, scartata: true,
              perche: 'Sta nella stessa casa della tua risposta alla domanda «' + rp.d.testo +
                      '», e potrebbe essere la stessa cosa. Resta il valore più forte, che è ' +
                      'quello della risposta. Se è un’altra cosa, aggiungila a mano.' });
          });
          locali[k2] = restano;
          if (piuForte) {
            tracce.push({ variabile: k2, valore: 0, parola: tr.parola, scartata: true,
              perche: 'Nel gesto c’è già una parola che pesa di più nella stessa casa. Per non ' +
                      'contarla due volte resta quella. Se la risposta dice un’altra cosa, ' +
                      'aggiungila a mano.' });
            return;
          }
        }
        locali[k2] = (locali[k2] || []).concat([tr]);
      });

      ['E', 'I', 'T', 'M', 'BP'].forEach(function (k) {
        /* SU QUESTO GESTO, LA RISPOSTA VINCE ANCHE SULLA SCENA. Se il
           racconto dice per tutti «non capisco le istruzioni» e di questo
           gesto la persona risponde «lo so fare bene», le parole di scena
           delle voci che quella domanda copre qui non valgono. */
        var diScena = 0;
        contesto.tracce.forEach(function (t) {
          if (t.variabile !== k || t.scartata) { return; }
          if (t.voce && t.voce.id && coperteQui[t.voce.id]) {
            /* resta scritto nel gesto, cosi' si vede perche' qui non pesa */
            tracce.push({ variabile: k, valore: 0, parola: t.parola, scartata: true, sostituita: true,
              perche: 'Il racconto lo dice per tutta la scena, ma su questo gesto hai risposto ' +
                      'tu alla domanda «' + coperteQui[t.voce.id].testo + '». Qui vale la risposta.' });
            return;
          }
          diScena += t.valore;
        });
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
            if (t.voce && t.voce.id && coperteQui[t.voce.id]) { return; }   // gia' scritto qui sopra
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
        domande: DG.map(function (d) {
          var proposta = null;
          Object.keys(d.propone || {}).forEach(function (idVoce) {
            if (!proposta && visteQui[idVoce]) { proposta = d.propone[idVoce]; }
          });
          var np = nellaPersona(d);
          return { id: d.id, testo: np.testo, variabile: d.variabile, opzioni: np.opzioni,
                   proposta: proposta,
                   risposta: opzioneDi(d, risposteQui[d.id]) ? risposteQui[d.id] : null };
        }),
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
          ? 'Un gesto il simulatore l’ha riconosciuto dalla grammatica e non dal vocabolario: «' +
            daGrammatica[0].azione.parola + '».'
          : daGrammatica.length + ' gesti il simulatore li ha riconosciuti dalla grammatica e non dal ' +
            'vocabolario: ' + daGrammatica.map(function (f) {
              return '«' + f.azione.parola + '»'; }).join(', ') + '.') +
          ' Vuol dire che lì, con quella desinenza, in italiano c’è un verbo. Ma quale ' +
          'verbo sia, e quanto sia difficile in sé, il simulatore non lo sa. Allora gli ' +
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
          ? 'Un pezzo racconta qualcosa al passato e insieme dice come ' + (TERZA ? 'sta' : 'stai') +
            ': «' + forseContesto[0].testo + '».'
          : forseContesto.length + ' pezzi raccontano qualcosa al passato e insieme dicono come ' +
            (TERZA ? 'sta' : 'stai') + ': ' +
            forseContesto.map(function (f) { return '«' + f.testo + '»'; }).join(', ') + '.') +
          ' Il simulatore l’ha messo nel contesto, non fra i gesti, perché gli è sembrato che raccontasse una ' +
          'cosa già successa, più la condizione che ne resta. E allora vale per tutta la ' +
          'scena, non per un gesto solo.\n\nLa regola è stretta apposta. Raccontare una ' +
          'scena al passato è normalissimo. ' +
          (TERZA ? '«Ha fatto colazione, ha preso le chiavi, ha chiuso la porta» '
                 : '«Mi sono alzato, ho bevuto, sono uscito» ') +
          'restano tre gesti. Serve che nello stesso pezzo ci siano tutte e due le cose: ' +
          'il verbo al passato e uno stato dichiarato. Se ha sbagliato lo stesso, premi ' +
          '«è un gesto» qui sotto.' });
    }

    var campoTot = [];
    frammenti.forEach(function (f) { campoTot = campoTot.concat(campoDi(f.testo)); });
    if (campoTot.length) {
      avvisi.push({ tipo: 'campo',
        /* un nome solo per tipo: «il cane tira il guinzaglio» trovava due volte
           «un animale che reagisce» (visto il 26/11/2026) */
        testo: 'La scena nomina qualcosa che risponde mentre ci provi (' +
          campoTot.map(function (c) { return c.nome; }).filter(function (n, i, a) {
            return a.indexOf(n) === i; }).join(', ') +
          '). Non entra nella formula: agisce dopo il dado, togliendo margine. Il libro ' +
          'non dice quanti punti valga. Questo simulatore non se li inventa.' });
    }
    if (!nodi.length) {
      avvisi.push({ tipo: 'vuoto',
        testo: 'Il simulatore non ha riconosciuto nessun gesto. Il suo vocabolario però conosce i verbi più ' +
               'comuni della vita di ogni giorno. ' +
               (TERZA ? 'Prova a scrivere che cosa fa, non solo come sta.'
                      : 'Prova a scrivere che cosa fai, non solo come stai.') });
    }
    if (nodi.length === 1) {
      avvisi.push({ tipo: 'uno',
        testo: 'Un gesto solo: qui la catena non ha niente da accumulare. ' +
          'Va benissimo per vedere la formula, ma il carico si vede da tre gesti in su.' });
    }
    if (nodi.length > 40) {
      avvisi.push({ tipo: 'molti',
        testo: nodi.length + ' gesti da una descrizione sola. Il capitolo 25 chiama «nodo ' +
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
          ' È il domicilio unico del capitolo 18. Nelle tracce dei gesti si vede quale valore ha vinto, e perché.' });
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
      return f.tipo === 'contesto' && !f.assegnata && condizioniDi(f.testo).length === 0 &&
             campoDi(f.testo).length === 0 && piatto(f.testo).length > 6;
    }).map(function (f) { return f.testo; });

    /* LA RICEVUTA: FRASE PER FRASE, DOVE E' FINITA OGNI COSA  (25/11/2026).
       Finora la pagina mostrava i pezzi del racconto da una parte e i numeri
       dall'altra, e per sapere che fine avesse fatto una frase bisognava
       cercare la sua parola dentro le tracce. Chi racconta una giornata ha
       due paure, e sono di Igor: aver contato una cosa due volte, e averne
       persa una. La ricevuta risponde a tutte e due con la stessa riga: per
       ogni frase dice che cosa ne e' stato. E' diventata un gesto. Ha messo
       un fatto in una casa, per la scena o per un gesto. Era gia' stata
       detta, e non e' stata sommata. Oppure e' rimasta fuori, e allora
       aspetta una decisione. Nessuna frase esce da questo elenco. */
    /* nella ricevuta la parola si mostra COME E' SCRITTA nel racconto: la
       chiave del vocabolario e' una radice («stanc»), e a chi legge una
       radice non dice niente. Si cerca nel pezzo la parola che comincia
       cosi'; se la chiave ha piu' parole, si lascia com'e'. */
    function comeScritta(testoPezzo, chiave) {
      var k0 = piatto(chiave);
      if (!k0 || k0.indexOf(' ') >= 0) { return chiave; }
      var trovata = null;
      String(testoPezzo).split(/[^A-Za-zÀ-ÿ0-9’']+/).forEach(function (w0) {
        if (!trovata && w0 && piatto(w0).indexOf(k0) === 0) { trovata = w0.toLowerCase(); }
      });
      return trovata || chiave;
    }
    var ricevuta = frammenti.map(function (f, indiceF) {
      var nodoSuo = null;
      nodi.forEach(function (n0) { if (n0.indiceFrammento === indiceF) { nodoSuo = n0; } });
      var righe = [];
      contesto.tracce.forEach(function (t0) {
        if (t0.frammento !== indiceF) { return; }
        righe.push({ dove: 'scena', variabile: t0.variabile, valore: t0.valore,
                     parola: t0.aMano ? t0.parola : comeScritta(f.testo, t0.parola), chiave: t0.parola,
                     stato: t0.sostituita ? 'sostituita' : (t0.scartata ? 'gia-detta' : 'contata') });
      });
      if (nodoSuo) {
        nodoSuo.tracce.forEach(function (t0) {
          var p0 = String(t0.parola || '');
          if (t0.dallaScena || t0.daRisposta || t0.variabile === 'P0' || p0.charAt(0) === '(') { return; }
          if (String(t0.perche || '').indexOf('Coordinamenti che il gesto richiede') === 0) { return; }
          if (String(t0.perche || '').indexOf('Il racconto lo dice per tutta la scena') === 0) { return; }
          /* una voce che descrive la persona sta gia' fra le righe di scena */
          if (righe.some(function (r0) { return r0.variabile === t0.variabile && r0.chiave === t0.parola; })) { return; }
          righe.push({ dove: 'gesto', variabile: t0.variabile, valore: t0.valore,
                       parola: comeScritta(f.testo, t0.parola), chiave: t0.parola,
                       stato: t0.sostituita ? 'sostituita' : (t0.scartata ? 'gia-detta' : 'contata') });
        });
      }
      var campoSuo = campoDi(f.testo).map(function (c0) { return c0.nome; });
      return { indice: indiceF, testo: f.testo, tipo: f.tipo, gesto: nodoSuo ? nodoSuo.numero : null,
               righe: righe, campo: campoSuo, assegnata: f.assegnata || null,
               fuori: f.tipo === 'contesto' && !f.assegnata && !righe.length && !campoSuo.length };
    });
    var conto = { frasi: ricevuta.length, gesti: nodi.length, contati: 0, giaDetti: 0, fuori: 0, decise: 0 };
    ricevuta.forEach(function (r0) {
      r0.righe.forEach(function (x0) { if (x0.stato === 'contata') { conto.contati++; } else { conto.giaDetti++; } });
      if (r0.fuori) { conto.fuori++; }
      if (r0.assegnata) { conto.decise++; }
    });

    if (muti.length) {
      avvisi.push({ tipo: 'muto',
        testo: muti.length + (muti.length === 1
          ? ' pezzo del racconto non ha prodotto niente. Il vocabolario non ci ha riconosciuto né un gesto né una condizione.'
          : ' pezzi del racconto non hanno prodotto niente. Il vocabolario non ci ha riconosciuto né un gesto né una condizione.') +
          ' Non è un errore, perché molte frasi sono cornice. Ma nel calcolo quel testo ' +
          'non è entrato, e conviene saperlo prima di leggere i numeri.' });
    }

    return { testo: testo, frammenti: frammenti, nodi: nodi,
             contesto: contesto, avvisi: avvisi, muti: muti, domande: domande,
             ricevuta: ricevuta, conto: conto, caseAMano: CM };
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
