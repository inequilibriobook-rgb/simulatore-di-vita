/* =============================================================================
   SIMULATORE 3.0 — Testi didattici
   =============================================================================
   Questo file e' un .js e non un .json di proposito: da file:// il browser
   blocca fetch() sui file locali, mentre <script src> funziona sempre.
   E' la regola che rende il pacchetto avviabile con un doppio clic.
   ========================================================================== */

window.Spiegazioni = {

  /* I termini della formula, spiegati senza sigle nude ------------------ */
  termini: {
    P0:    { nome: 'Punto di partenza',   sigla: 'P0',
             breve: 'Quanto è accessibile questo gesto per te, con le capacità che hai stabilmente, in una giornata normale, senza fretta e senza stanchezza. Nel simulatore un gesto è un’azione sola, con un inizio e una fine che si riconoscono. Non dice quanto vali, non dice come stai oggi (quello è il corpo, E) e non dice che cosa ti porti dietro dai giorni prima (quello è il carico): dice quanto il gesto è alla tua portata, a condizioni neutre.',
             esempio: 'Pensa a una porta: aprirla parte da 85 o 90, perché lo fanno tutti, tutti i giorni, senza pensarci. Compilare una pratica online con un codice che arriva per messaggio parte invece da 55 o 60, perché sono tre passaggi da tenere insieme nello stesso momento. E sollevare da soli un oggetto pesante parte da 40, e resta a 40 anche per chi sta benissimo.\n\nAttenzione a non metterci dentro come stai tu, perché quello è il compito degli altri otto valori. Se abbassi P0 perché sei stanco, la stanchezza viene contata due volte.' },
    E:     { nome: 'Il corpo adesso',     sigla: 'E',
             breve: 'Come sta il corpo in questo preciso momento, e solo in questo: l’energia che hai, il sonno che hai fatto, un dolore, la fame, l’equilibrio, la coordinazione. Non come stai in generale.',
             esempio: 'Hai dormito quattro ore, stanotte: quello è E, e conta in negativo. Ti sei svegliato con il mal di schiena: anche quello è E. Ma vale anche al contrario, perché essere riposati e aver mangiato aiuta, e il modello lo conta in positivo.\n\nC’è un confine da tenere fermo. Se il malessere dura da giorni, non è più il corpo di adesso: è il carico accumulato, la pressione che ti porti dietro dai giorni prima, e va nell’altra voce. Una notte storta è E. Tre settimane di notti storte sono carico.' },
    I:     { nome: 'Quanto è chiaro',   sigla: 'I',
             breve: 'Sai che cosa devi fare, in che ordine, e come capirai se è riuscito? Le istruzioni ci sono e si capiscono, oppure no?',
             esempio: 'Immagina un modulo scritto male, o un ufficio in cui non sei mai entrato e non sai a quale sportello andare: tutte e due le cose tolgono punti qui. Sapere esattamente come si fa, perché l’hai fatto cento volte, invece li aggiunge.\n\nÈ la voce che si confonde più spesso con la complessità, eppure la differenza è netta. I dice «non so che cosa fare», C dice «ci sono molte cose da fare». Un compito chiarissimo può essere complicato, e un compito semplicissimo può essere incomprensibile.' },
    T:     { nome: 'La pressione del tempo', sigla: 'T',
             breve: 'Quanto spazio di tempo hai davvero, adesso, per questo gesto: la fretta di questo momento, non la vita frenetica in generale.',
             esempio: 'Sono le otto e ventisette, e alle otto e mezza devi essere fuori: quei tre minuti tolgono punti, come li toglie una scadenza fra un’ora. Avere tutto il pomeriggio davanti, invece, li aggiunge.\n\nAnche qui c’è un confine. «Ho sempre fretta, tutti i giorni» non è T: è carico accumulato, la pressione che ti porti dietro dai giorni prima. T è la fretta di adesso, quella che finisce quando finisce la scena, cioè la fila di gesti che stai attraversando.' },
    M:     { nome: 'L’ambiente intorno',  sigla: 'M',
             breve: 'Tutto quello che ti sta intorno e sta fermo: lo spazio, gli oggetti, la luce, il rumore, la temperatura, gli strumenti che ci sono o che mancano.',
             esempio: 'Il supermercato affollato del sabato pomeriggio toglie punti, e li tolgono anche le chiavi che non sono dove dovrebbero essere. La cucina in ordine, con tutto a portata di mano, li aggiunge.\n\nC’è una distinzione che vale la pena imparare bene, perché è quella su cui si sbaglia di più. Se l’ambiente sta lì e basta, è M. Se invece reagisce mentre ci provi, come il cane che tira proprio adesso o il sito che rifiuta il codice proprio adesso, non è M e sta fuori dalla formula. Si chiama campo attivo, e agisce dopo il dado, cioè dopo il numero tirato a caso che decide se il gesto riesce. Metterlo qui vorrebbe dire farlo pagare due volte. Si veda la voce «campo attivo».' },
    BP:    { nome: 'Ciò che ti protegge', sigla: 'BP',
             breve: 'Un aiuto vero, qui e adesso, che toglie davvero peso a questo gesto: una persona che fa una parte del lavoro, lo strumento giusto, una cosa preparata prima che ti spiana la strada.',
             esempio: 'Qualcuno che tiene il bambino mentre finisci è BP, e lo è anche il modulo che trovi già compilato a metà. Il collega che ti dice «ce la fai», invece, non lo è, ed è la regola più netta di questa voce. Il libro chiama supporto simbolico quello che scalda e non toglie carico, cioè non alleggerisce la pressione che ti porti dietro, e nel conto vale zero.\n\nBP dura poco e non si accumula. È una protezione per questa scena, la fila di gesti che stai attraversando, non un credito che ti resta per la prossima.' },
    C:     { nome: 'Quanti pezzi ha',      sigla: 'C',
             breve: 'Quanti coordinamenti veri richiede il gesto: quante cose vanno tenute insieme, nell’ordine giusto, senza perderne una.',
             esempio: 'Si conta, non si stima. Compilare una pratica in cui servono la credenziale, il codice che arriva sul telefono e il file da caricare è C uguale a tre, perché sono tre cose da tenere insieme. Bere un bicchiere d’acqua è zero, o al massimo uno.\n\nOgni punto costa cinque punti di probabilità, sempre, ed è il termine più brutale della formula. Proprio per questo è quello che va scritto con più cura: C è il numero di coordinamenti, non la difficoltà che senti, e non è il posto dove scaricare tutto ciò che va male.' },
    piSTR: { nome: 'Il carico accumulato', sigla: 'STR',
             breve: 'Lo stress che ti porti dietro da prima che questa scena cominciasse: una pressione accumulata, che somiglia alla stanchezza ma non è la stanchezza di adesso. Quella che era già lì stamattina, e che resta addosso.',
             esempio: 'Va da 0 a 100, ma non pesa un poco alla volta: pesa a gradini. Fino a 39 non toglie niente. Da 40 a 59 toglie 5, da 60 a 69 toglie 10, da 70 a 79 toglie 15, da 80 a 89 toglie 20, da 90 in su toglie 25.\n\nQuindi 41 e 58 costano uguale, mentre 59 e 60 costano diverso. È voluto. Nessuno, guardando una persona che si porta addosso una settimana pesante, saprebbe dire se il suo carico vale 44 o 47; sa dire se è basso, medio, alto o rosso, e i gradini ammettono questo limite invece di nasconderlo dietro decimali inventati.' },
    DEB:   { nome: 'Il debito da insistenza', sigla: 'DEB',
             breve: 'Quante volte hai già ripetuto la stessa strada che non funziona, senza cambiare niente e senza una vera pausa.',
             esempio: 'Ogni punto costa cinque, come la complessità, ma perché il debito cominci a contare ce ne vuole: non basta che qualcosa sia andato storto una volta sola.\n\nDevono valere sei condizioni insieme. Il carico, cioè la pressione accumulata nei giorni prima, è già alto; l’ultimo esito è fragile, oppure è mancato; stai insistendo, e spingi più forte nello stesso punto; la strategia che ripeti è la stessa che già non funzionava; non c’è stato un recupero vero, una pausa dopo la quale qualcosa è cambiato; e non hai cambiato strada. Un inciampo da solo non fa debito: serve che tutte e sei siano vere nello stesso momento.\n\nNella prova dei cinquecento gesti di fila, il debito è rimasto a zero per tutti e cinquecento, anche se c’erano quattro fallimenti tecnici e quarantasette inciampi. Deve restare raro, ed è per questo che, quando compare, vuol dire qualcosa.' }
  },

  /* LE PAROLE CHE ESCONO, non quelle che entrano -----------------------
   * Il blocco «termini» qui sopra spiega i nove valori che il lettore
   * IMPOSTA. Questo spiega le parole che il simulatore gli RESTITUISCE.
   *
   * Il buco era grosso: il report scrive «assetto a 57» quindici volte, e
   * «assetto» non compariva da nessuna parte — nessun cursore, nessuna
   * definizione. Il lettore vedeva un numero che non aveva messo lui e che
   * nessuno gli aveva spiegato. Lo stesso per soglia, margine, costo
   * nascosto, pavimento.
   *
   * Le voci sono ordinate per quanto spesso il racconto le usa davvero.
   */
  parole: {
        carico: {
      nome: 'Il carico', sigla: 'STR',
      breve: 'La pressione che ti porti dietro da prima che la scena cominciasse, accumulata nei giorni precedenti. Somiglia alla stanchezza, ma non coincide con la stanchezza: quella di adesso, del corpo, è un’altra voce (E). Il carico è quello che era già lì quando hai cominciato, e che resta addosso da una scena all’altra.',
      esempio: 'Pensa a un bicchiere d’acqua, e pensa a due mattine diverse. In una arrivi con un carico di 62, nell’altra con un carico di 82: il bicchiere è lo stesso, la persona è la stessa, eppure il simulatore racconta due mattine che non si somigliano. È per questo che la stessa scena non costa uguale in giorni diversi.\n\nIl carico va da 0 a 100, ed è il numero che più spesso pesa sul risultato: nelle dieci schede di calcolo del libro, in otto casi su dieci è fra i due termini che tolgono di più. Sotto 40 non toglie niente. Sopra 70, invece, nessuna riuscita esce pulita, cioè senza costo, che è il migliore dei nove esiti: e non importa quanto bene vada il gesto.' },
    assetto: {
      nome: 'L’assetto', sigla: 'POS',
      breve: 'Come stai dentro di te, in questo periodo: quanto ti orienti, quanta fiducia hai, quanto ti senti al tuo posto in quello che fai. Non è l’umore di un momento, ma il terreno su cui poggi, e cambia lentamente.',
      esempio: 'Immagina di entrare in una stanza piena di gente e di sapere subito dove metterti, con chi parlare, che cosa fare delle mani: quello è un assetto alto. La stessa stanza, in un giorno in cui non sai più nemmeno da che parte cominciare, è un assetto basso. Il numero prova a misurare proprio questo.\n\nNel libro si chiama anche «posizione», o POS, ed è la stessa cosa. Le pagine dicono sempre «assetto», così chi cerca la parola a schermo ne trova una sola.\n\nNon lo imposti tu con un cursore, e non entra nella formula: si muove da solo dopo ogni gesto, perché riuscire male lo abbassa e riuscire bene lo alza. Sotto 20 anche le cose facili diventano faticose, e un assetto basso insieme a un carico alto (la pressione accumulata nei giorni prima) è la coppia che il modello chiama rossa. Si legge accanto alla probabilità, mai dentro.' },
    soglia: {
      nome: 'La soglia', sigla: '',
      breve: 'Un punto oltre il quale le cose cambiano di colpo, tutte insieme, invece di peggiorare un poco alla volta. Prima della soglia il modello si comporta in un modo. Subito dopo, in un altro.',
      esempio: 'Metti una pentola d’acqua sul fuoco e guardala. Per un pezzo non succede niente: si scalda piano, e a novantanove gradi è ancora acqua ferma. Poi, a cento, bolle, e fra novantanove e cento non c’è una via di mezzo. Una soglia è questo.\n\nNel simulatore il carico (la pressione accumulata nei giorni prima) a 70 è una soglia. A 69 una riuscita può ancora uscire pulita, cioè senza costo. A 70 non più, per quanto bene vada il resto. Il salto non è un difetto del modello: serve a dire che certe cose non si consumano un poco alla volta, e che passare il limite conta più di quanto ci si sia avvicinati.\n\nCapita di leggere un racconto in cui il tono cambia da un gesto all’altro, mentre i numeri si sono mossi di poco. Quasi sempre, in mezzo, è stata passata una soglia.' },
    regime: {
      nome: 'Il regime', sigla: 'MACRO',
      breve: 'Il modo in cui vivi in questo periodo, preso tutto insieme. Quanto corri, quanto ti fermi, quanto riesci a rientrare davvero. Non dice come è andata oggi, ma come vanno le cose di questi tempi.',
      esempio: 'Se un amico ti chiede «come va, di solito?» e tu rispondi «di corsa, sempre», hai appena descritto un regime. Vale anche nei giorni in cui non succede niente di particolare, perché non parla di oggi: parla di come stai vivendo in questo periodo.\n\nIl simulatore non te lo chiede. Lo ricava da come stai, settimana dopo settimana, e gli dà uno fra sei nomi, in scala dal più leggero al più difficile da interrompere: un episodio isolato, una catena breve (pochi gesti di fila), una mini-settimana leggera, una ripetizione pesante ma ancora recuperabile, una spirale in formazione (la stanchezza che peggiora le condizioni, e le condizioni la stanchezza), una spirale stabilizzata. Nei documenti tecnici del progetto questa scala si chiama MACRO.\n\nServe perché lo stesso gesto, fatto dalla stessa persona, costa diverso a seconda del periodo in cui lo fa.' },
    costo_nascosto: {
      nome: 'Il costo nascosto', sigla: '',
      breve: 'Quello che un gesto ti è costato e che oggi non senti. Si accumula in silenzio e si presenta dopo, di solito quando non lo colleghi più alla causa.',
      esempio: 'È lunedì sera e vai a letto tardi per finire una cosa. Martedì stai ancora bene, mercoledì un po’ meno, e giovedì ti chiedi perché sei a pezzi, senza più collegarlo a quella sera. Il costo nascosto è quel conto: si accumula in silenzio e si presenta quando non lo aspetti più.\n\nÈ il numero che rende il modello diverso da un contatore di successi, perché puoi fare tutto quello che dovevi fare e uscirne lo stesso con un costo nascosto alto. In quel caso il racconto finale non deve dire che è andata bene: sopra 50 il conto arriva sempre.\n\nQuella soglia non viene dal libro: è una scelta di questo programma.' },
    debito: {
      nome: 'Il debito', sigla: 'DEB',
      breve: 'Quante volte hai già ripetuto la stessa strada che non funziona, senza cambiare niente e senza una pausa vera. Non conta quanti errori hai fatto: conta quanto hai insistito nello stesso punto.',
      esempio: 'Immagina una porta che si è incastrata. Spingi, e non si apre; spingi più forte, e ancora niente; ci dai una spallata, e intanto non hai mai guardato se per caso andava tirata. Il debito è questo: l’aver insistito sulla stessa strada, senza cambiare niente e senza fermarsi davvero.\n\nBasta un punto solo perché ogni riuscita esca danneggiata, e non conta quanto è alto: conta soltanto che ci sia. La parola «debito» dice la cosa giusta, perché qualcosa viene spostato in avanti invece di essere pagato subito. Non paghi adesso: accumuli un costo, e intanto continui a provare, a stringere, a ripetere. Magari ottieni anche un mezzo risultato, ma consumi il margine (lo spazio che separa dal mancare) della scena dopo.\n\nIl modello non misura la differenza fra insistere e mollare: misura quella fra due modi diversi di insistere. Il libro li chiama perseveranza adattiva, che impara, corregge e guarda com’è andata prima di riprovare, e perseverazione rigida, che ripete la stessa mossa e spinge più forte proprio nel punto che già non funzionava.' },
    spirale: {
      nome: 'La spirale', sigla: '',
      breve: 'Quando la stanchezza fa peggiorare le condizioni, e le condizioni peggiori aumentano la stanchezza. È un giro che a ogni passaggio si stringe, e da cui non si esce senza una pausa vera.',
      esempio: 'Dormi poco, e allora il giorno dopo è più duro; il giorno è più duro, e allora la sera dormi ancora peggio. Ecco la spirale: due cose che si peggiorano a vicenda, e un giro che a ogni passaggio si stringe un po’.\n\nSe ne esce cambiando una condizione, non insistendo, perché la spirale non si spezza spingendo più forte: si spezza togliendo uno dei due pezzi che la alimentano.\n\nNel simulatore compare nella traiettoria (la direzione presa su più settimane), quando il regime (la condizione generale del periodo) peggiora di settimana in settimana. Il racconto la chiama «in formazione» finché peggiora. La chiama «stabilizzata» quando si è fermata in alto, e «in rientro» quando torna indietro.' },
    traiettoria: {
      nome: 'La traiettoria', sigla: '',
      breve: 'La direzione in cui stai andando, misurata su più settimane di fila: se il carico (la pressione accumulata nei giorni prima) sale, se scende, o se resta dov’è. Non dice come stai adesso, ma da che parte ti muovi.',
      esempio: 'Due persone hanno oggi lo stesso carico, mettiamo 55. Una ci è arrivata scendendo da un periodo peggiore, l’altra salendo da uno migliore. Il numero di oggi le fa sembrare uguali, ma la direzione le separa del tutto: una sta uscendo da qualcosa, l’altra ci sta entrando.\n\nÈ il motivo per cui il simulatore ha una pagina che guarda molte settimane insieme. Una direzione non si vede in un giorno, e nemmeno in una settimana: si vede solo mettendo in fila abbastanza settimane, tante da distinguere un inciampo da una discesa.' },
    margine: {
      nome: 'Il margine', sigla: '',
      breve: 'La distanza fra la probabilità che avevi e il numero uscito dal dado. Dice di quanto è andata bene, oppure di quanto è mancata. È la differenza fra «per un soffio» e «non c’era partita».',
      esempio: 'Prendere il treno con un secondo di anticipo e prenderlo con dieci minuti: il treno è lo stesso, ma la corsa non lo è, e nemmeno il fiato con cui ti siedi. Il margine misura quella differenza.\n\nCon una probabilità di 40, un tiro di 65 vuol dire mancata per venticinque punti, mentre un tiro di 42 vuol dire mancata per due: l’esito scritto è lo stesso, ma non è successa la stessa cosa.\n\nIl libro divide i margini in tre fasce (gruppi di valori trattati allo stesso modo). Da 0 a 9 il margine è fragile, da 10 a 24 è normale, da 25 in su è forte. Fragile vuol dire che la prossima volta può andare al contrario anche senza che sia cambiato niente; forte vuol dire invece che la scena non era in bilico, e che per cambiarla bisogna cambiare le condizioni, non spingere più forte.\n\nÈ la ragione per cui il simulatore non si accontenta di dire riuscito o non riuscito.' },
    provenienza: {
      nome: 'La provenienza', sigla: '',
      breve: 'Da dove viene un dato, non quanto vale. Il libro ne conta quattro: certo (una risposta data direttamente da chi risponde), stimato (dedotto da un fatto vicino), proxy (un dato usato al posto di un altro che manca, perché correlato), incompleto (un dato che manca in parte).',
      esempio: 'Nel questionario scrivi «igloo al Polo Nord» nella scena, e il simulatore riconosce da solo il freddo estremo e compila le domande sulle condizioni ambientali. Quella risposta è stimata, non certa, perché viene da un fatto vicino e non da una domanda a cui hai risposto tu. Il simulatore lo segna, e finché non confermi a mano la fiducia nel risultato resta media, non alta.\n\nÈ la regola che il libro chiama «catena di custodia» del dato: un numero giusto, ma con la provenienza sbagliata, è un errore più grave di un numero sbagliato, perché nessuno saprà più da dove è venuto.' },
    pavimento: {
      nome: 'Il pavimento', sigla: 'floor1',
      breve: 'Una protezione che il simulatore accende da solo, quando le cose si sono messe troppo male. Da lì in poi il riposo funziona ancora, ma rende circa la metà di prima.',
      esempio: 'C’è un grado di stanchezza oltre il quale una notte buona non basta più a rimettersi in pari: ci si sveglia meglio, non a posto. Chi ci è passato lo riconosce subito, e il pavimento è il modo in cui il simulatore ne tiene conto.\n\nLo accende per tre motivi, e ne basta uno solo: il carico (la pressione accumulata nei giorni prima) supera 85, oppure l’assetto (quanto sei ancora orientato dentro la scena) scende sotto 25, oppure il costo nascosto (il prezzo di un gesto che si vede solo dopo) passa 70. Da lì in avanti il recupero fra un giorno e l’altro vale meno della metà, e quello della notte vale poco più della metà.\n\nSi chiama pavimento perché è anche un fondo: il recupero smette di far scendere i numeri sotto un certo punto, e per andare più giù serve un cambiamento vero, non una notte in più. Il libro lo chiama, in inglese, floor1, letteralmente «pavimento numero uno»: la stessa idea di fondo, scritta come si scrive nel codice.' },
    campo: {
      nome: 'Il campo attivo', sigla: 'K/Pd',
      breve: 'Quello che non sta fermo e risponde mentre fai il gesto. Una persona che ti interrompe, un cane che tira, un sito che rifiuta il codice proprio adesso. Non è l’ambiente: è l’ambiente che reagisce.',
      esempio: 'Esci in macchina all’ora di punta. Il traffico c’era già prima che tu partissi, e lo sapevi: quello è l’ambiente. L’auto che ti taglia la strada mentre svolti, invece, no, perché arriva durante, e arriva proprio perché ci stai passando tu. La differenza si sente subito, e nel calcolo pesa.\n\nL’ambiente entra nella formula e abbassa la probabilità prima del tiro, mentre il campo attivo resta fuori e agisce dopo il dado (il numero tirato a caso che decide se il gesto riesce), togliendo margine (la distanza fra la probabilità e il numero uscito) a un esito già deciso. Metterlo dentro la formula vorrebbe dire farlo pagare due volte. Il libro chiama questa sottrazione K/Pd: la pressione, o la risposta, del campo.\n\nÈ una delle regole che il libro ripete di più, ed è anche l’errore che si fa più spesso.' },
    nodo: {
      nome: 'Il nodo', sigla: '',
      breve: 'Il singolo gesto che il modello calcola. Un’azione sola, con un inizio e una fine che si riconoscono. È l’unità di misura di tutto il simulatore: più in piccolo non si va, e tutto quello che è più grande si conta in nodi.',
      esempio: 'Bere un bicchiere d’acqua è un nodo, e lo è anche mandare una mail difficile. «Fare la spesa», invece, non lo è: è una sequenza, e va aperta in gesti prima di poterla calcolare. «Rimettersi in salute» non lo è per niente, perché sono migliaia di nodi distribuiti su mesi interi.\n\nLa regola per riconoscerlo è semplice. Se puoi dire con precisione quando comincia e quando finisce, e se ha un esito che si può guardare, è un nodo. Se invece, per dire com’è andata, devi raccontare una storia, allora è più grande di un nodo.' },
    catena: {
      nome: 'La catena', sigla: '',
      breve: 'Più gesti messi in fila, uno dopo l’altro, dove quello che resta dal primo arriva al secondo. È un insieme di scene vicine, che si passano l’una all’altra carico, costo e recupero: sta sopra il nodo (il gesto singolo, l’unità più piccola del modello) e sopra la scena, e non serve a dire se un gesto riesce, ma che cosa succede quando i gesti si accumulano. Non è ancora una spirale, ma può prepararla, se non c’è un rientro vero.',
      esempio: 'Alzarsi, lavarsi, vestire il bambino, uscire: presi uno per volta sono quattro gesti facili, di quelli che non ci si accorge nemmeno di fare. Messi in fila diventano un’altra cosa, perché la stanchezza del primo non sparisce quando il primo è finito: il secondo la trova già lì quando comincia, e la passa al terzo.\n\nDentro una catena non c’è la notte, e per quella serve la settimana. La catena dice come si consuma una mattina, non come si recupera.' },
    taratura: {
      nome: 'La taratura', sigla: '',
      breve: 'La fotografia della scena che si fa prima di qualunque calcolo: guardare come stanno le cose davvero, e dare a ogni voce il suo numero. Il libro ne prevede quattro modi, dal più rapido al professionale, e una regola sola che vale sempre: tarare prima, calcolare dopo. Un numero scelto per far tornare il risultato non è una taratura, è una giustificazione.',
      esempio: 'È come tarare una bilancia prima di pesare: si decide dove sta lo zero, e lo si dice a chi poi guarderà il peso.\n\nIl libro dice che il carico (la stanchezza che un gesto lascia addosso) passa da un gesto al gesto dopo, ma non dice quanto. Quel numero, il 4,6 per cento, non è stato scelto a occhio: prima sono stati scritti i criteri da rispettare, e poi si è cercato il valore che li rispettava tutti.\n\nÈ l’ordine che conta. Prima si dichiara che cosa si vuole ottenere, e solo dopo si cerca il numero, perché fatto al contrario si trova sempre il numero che dà ragione a chi lo cerca.' },
    probabilita: {
      nome: 'La probabilità operativa', sigla: 'Pn',
      breve: 'Il numero da 1 a 100 che dice quante probabilità ha questo gesto di riuscire, adesso, in queste condizioni. È il risultato della formula, ed è il numero che il dado (un tiro a caso fra 1 e 100) poi mette alla prova.',
      esempio: 'Funziona come le previsioni del tempo. «Settanta per cento di pioggia» non promette la pioggia: dice quanto è probabile, e tu esci con l’ombrello senza sapere se lo aprirai. Qui è lo stesso. Se la probabilità operativa è 70, su cento mattine identiche a questa il gesto riesce settanta volte: non vuol dire che riuscirà, vuol dire che parte da lì.\n\nSi chiama «operativa» per distinguerla dalla difficoltà del gesto in sé. Bere un bicchiere d’acqua è facile sempre, ma la probabilità di bere quel bicchiere stamattina dipende da come stai stamattina.' },
    taglio: {
      nome: 'Il taglio ai bordi', sigla: '',
      breve: 'La regola per cui la probabilità non scende mai sotto 5 e non sale mai sopra 95, qualunque cosa dica la somma. Serve a impedire due bugie: che una cosa sia impossibile, e che sia certa.',
      esempio: 'Se le condizioni sono così brutte che la somma darebbe meno tre, il simulatore scrive cinque. Non è generosità: è che nella vita quasi niente è impossibile, e un modello che scrive zero dice una cosa che non sa.\n\nVale anche dall’altra parte. Con condizioni ottime la somma può superare cento, e il taglio la riporta a novantacinque, perché nemmeno il gesto più facile riesce sempre: cinque volte su cento qualcosa va storto lo stesso, e chi ha mai rovesciato un bicchiere pieno sul tavolo lo sa.' },
    dado: {
      nome: 'Il dado', sigla: 'd100',
      breve: 'Un numero preso a caso fra 1 e 100, tirato una volta sola per ogni gesto. Se esce uguale o più basso della tua probabilità, il gesto riesce. Se esce più alto, no.',
      esempio: 'Con una probabilità di 70, se esce il 34 il gesto riesce, se esce l’88 no. Il dado non sa niente di te e non giudica niente: tira, e basta, sempre allo stesso modo.\n\nServe perché la stessa mattina, vissuta due volte nelle stesse condizioni, non finisce sempre allo stesso modo. Nella vita vera è così, e un simulatore che desse sempre lo stesso esito racconterebbe una bugia comoda.\n\nÈ anche il motivo per cui un tiro solo non dimostra niente: per capire una scena bisogna giocarla molte volte, e guardare tutti gli esiti insieme. Il libro lo chiama d100, cioè un dado a cento facce, nel linguaggio dei giochi con i dadi.' },
    seme: {
      nome: 'Il seme', sigla: '',
      breve: 'Il numero da cui il simulatore fa partire la lunga fila dei tiri di dado. Con lo stesso seme escono sempre gli stessi tiri, nello stesso ordine, su qualunque computer e in qualunque giorno: così una giocata si può rifare identica.',
      esempio: 'È come un mazzo di carte mescolato sempre nello stesso identico modo: la partita che ne esce è sempre quella, e chi la gioca in un’altra casa la ritrova uguale.\n\nI dadi del simulatore sembrano casuali, ma non lo sono davvero. Li calcola una formula, e il seme è il punto da cui quella formula comincia: cambiare seme vuol dire cambiare tutta la fila, rimettere lo stesso seme vuol dire riavere la stessa identica fila.\n\nServe a due scopi concreti. Il primo è ripetere una prova identica, così che, quando tocchi un valore, tu veda quali cambiamenti dipendono da quello che hai toccato e quali dal caso. Il secondo è il controllo, ed è il più importante: un esempio stampato nel libro deve uscire uguale sul tuo schermo, altrimenti nessuno può verificarlo.' },
    micro_azione: {
      nome: 'La micro-azione di cura', sigla: '',
      breve: 'Un gesto piccolo e buono per te: bere, mangiare qualcosa, prendere una medicina, fermarti un momento.',
      esempio: 'Sono le cinque del pomeriggio, hai la testa piena e ti accorgi di non aver bevuto niente da stamattina. Bere quel bicchiere è una micro-azione di cura, e il simulatore la tratta a parte, perché sono le prime a saltare quando si è stanchi, ed è proprio allora che servirebbero di più.\n\nScrivere «acqua», «pausa» o «farmaco» nella scena le fa riconoscere. Da quel momento smettono di essere un gesto qualunque: anche con il carico (la pressione accumulata nei giorni prima) altissimo, a una piccola azione di cura il modello non dà l’esito peggiore, perché chiedere un bicchiere d’acqua non è chiedere una prestazione.' },
    esito: {
      nome: 'L’esito', sigla: '',
      breve: 'Come è andata a finire. Le possibilità non sono due ma nove, perché riuscire e riuscire rovinandosi non sono la stessa cosa, e nemmeno lo sono mancare per un soffio e mancare mentre tutto intorno stava già cedendo.',
      esempio: 'Due persone finiscono lo stesso compito nello stesso pomeriggio. Una si alza dalla sedia e va a farsi un caffè; l’altra resta seduta, con le mani che le tremano. Sulla carta hanno lo stesso risultato, e il simulatore, per non raccontare questa bugia, tiene nove esiti invece di due.\n\nCinque esiti su nove sono riuscite, e a separarle è quanto sono costate: una non costa niente, una costa qualcosa, una lascia il segno, una arriva consumando la persona che ce l’ha fatta, e l’ultima è quella in cui il compito è fatto e chi lo ha fatto sta male.\n\nGli altri quattro sono mancate riuscite, e a separarle è quanto è mancato e quanto reggeva il resto: mancata di poco, mancata e basta, mancata con tutto già teso intorno. La quarta è il punto di rottura, che è raro, e che chiede di ridurre invece di riprovare.\n\nÈ per questo che il simulatore non tiene un punteggio: contare quante volte è andata bene nasconde proprio la parte che conta.' },

    /* =====================================================================
     * LE PAROLE TECNICHE CHE ARRIVAVANO SOTTO GLI OCCHI SENZA UNA VOCE
     * =====================================================================
     * Il conto fatto il 10/09/2026: trentaquattro termini tecnici comparivano
     * nelle pagine e nel racconto, e nessuno dei trentaquattro aveva una voce
     * da aprire. «fascia» cinquantuno volte, «quota» trentanove, «campione»
     * diciannove, «McNemar» due. Chi ci cliccava sopra non trovava niente.
     *
     * Trentatre' sono qui sotto. La trentaquattresima, «tassello», non c'e' —
     * e' il nome di una classe del foglio di stile, non una parola che
     * qualcuno legga: il motivo sta scritto per esteso in fondo al file.
     *
     * COME SONO SCRITTE, E PERCHE' COSI'.
     * Queste pagine le leggono medici, infermieri, agenti, ricercatori: gente
     * competentissima nel proprio campo, che di statistica puo' non sapere
     * niente. Quindi ogni voce dice tre cose in quest'ordine — che cos'e' con
     * parole gia' note, come si vede nella vita di tutti i giorni, che effetto
     * ha su quello che il lettore sta guardando — e di uno strumento
     * statistico spiega il MESTIERE, mai la formula. Il modello del registro
     * e' questo: l'intervallo di confidenza non dice dov'e' la verita', dice
     * quanto puoi fidarti del numero che hai in mano.
     *
     * LE CHIAVI SONO TUTTE MINUSCOLE, come le altre di questo blocco. Non e'
     * un vezzo: laVoce() in glossario.js, se non trova la chiave, riprova in
     * minuscolo. Con la chiave «rip» funziona sia chi scrive «rip» dentro
     * l'attributo sia chi scrive «RIP»; con la chiave «RIP» avrebbe funzionato
     * solo il secondo. La forma maiuscola che il lettore vede — RIP, PenSTR,
     * MS, MF — sta in «sigla», che il riquadro stampa accanto al nome.
     *
     * (Nell'attributo si scrive la chiave, sempre minuscola. Qui non se ne
     * scrive nessuno per esteso di proposito: _test/glossario.js raccoglie
     * quegli attributi con una espressione regolare, e un esempio dentro un
     * commento diventerebbe una parola cliccabile che non esiste.)
     * ================================================================== */
    /* --- COME SI MISURA: le parole che si leggono quando una scena viene
     * rigiocata molte volte, e i numeri che ne escono. ------------------ */
    giocata: {
      nome: 'La giocata', sigla: '',
      breve: 'Una partita sola. La stessa scena vissuta una volta, da cima a fondo, con i suoi tiri di dado. Rigiocarla vuol dire ricominciare da capo, con gli stessi gesti e dadi nuovi.',
      esempio: 'Immagina di rivivere la stessa mattina cento volte, sempre uguale nelle condizioni di partenza e ogni volta con dadi nuovi: cento giocate sono questo, cento mattine identiche vissute una dopo l’altra. È quello che il simulatore conta quando ripete una scena molte volte.\n\nLa parola serve a non confondersi con i gesti. Una scena da quattro gesti, giocata cento volte, fa quattrocento gesti e cento giocate, e il numero da guardare è il secondo, perché una mattina vissuta una volta sola resta una prova sola, per quanti gesti ci stiano dentro. Si veda anche la voce «valutazioni».' },
    ripetizioni: {
      nome: 'Le ripetizioni', sigla: '',
      breve: 'Quante volte si chiede al simulatore di rigiocare la stessa identica scena. È un numero che scegli tu, e dice soltanto quante giocate vuoi.',
      esempio: 'Con una ripetizione sola vedi un caso, quello che è capitato quella volta lì, e non sai se sia stato fortuna o regola. Con mille vedi la forma di tutti i casi possibili, e a quel punto la fortuna e la regola si distinguono.\n\nAttenzione però a non confonderle con i gesti. Aggiungere ripetizioni non allunga la mattina: la fa rivivere da capo, uguale. Per allungarla davvero servono invece più gesti, e quella è un’altra cosa: si veda la voce «granularità».' },
    valutazioni: {
      nome: 'Le valutazioni', sigla: '',
      breve: 'Quanti conti ha fatto in tutto il simulatore: i gesti distinti della scena, moltiplicati per quante volte l’hai rigiocata.',
      esempio: 'Quattro gesti rigiocati cento volte fanno quattrocento valutazioni. È il numero che inganna di più, e conviene sapere perché.\n\nLe partite vere restano cento, perché le quattro valutazioni di uno stesso giro appartengono alla stessa mattina e non valgono come quattro prove separate: se quella mattina era storta, lo erano tutte e quattro insieme. Chi scambia le valutazioni per il campione (quante prove davvero diverse hai in mano) crede di sapere il quadruplo di quello che sa. Si veda la voce «campione».' },
    campione: {
      nome: 'Il campione', sigla: '',
      breve: 'Quante prove davvero diverse hai in mano. Non quanti numeri hai raccolto. Quante volte la cosa è stata provata da capo, così che una prova non dipenda dall’altra.',
      esempio: 'Chiedere a cento persone diverse che cosa pensano di un film è un campione di cento. Chiedere cento volte alla stessa persona, magari in cento giorni diversi, è un campione di uno, ripetuto: hai molte risposte, ma una sola opinione.\n\nQui vale lo stesso. Se rigiochi una scena cento volte il campione è cento, anche quando i numeri stampati sono molti di più, ed è il campione a decidere quanto puoi fidarti: più è piccolo, più il risultato può essere un caso.' },
    distribuzione: {
      nome: 'La distribuzione', sigla: '',
      breve: 'La forma di tutti i risultati messi insieme: dove si ammucchiano, quanto sono sparsi, se fanno un gruppo solo oppure due gruppi lontani.',
      esempio: 'Pensa ai voti di una classe. La media può essere sei in due classi diverse: in una quasi tutti prendono sei, nell’altra metà prende quattro e metà otto. Stessa media, ma due classi che non si somigliano per niente, e un insegnante che guardasse solo il sei non saprebbe in quale delle due sta entrando.\n\nÈ per questo che il simulatore mostra la forma e non solo il riassunto, perché un riassunto non è una distribuzione: media e deviazione non distinguono una gobba sola da due gobbe lontane.' },
    mediana: {
      nome: 'La mediana', sigla: '',
      breve: 'Metti tutti i risultati in fila, dal più basso al più alto. La mediana è quello che sta proprio in mezzo. Metà stanno sotto, metà stanno sopra.',
      esempio: 'In una stanza ci sono dieci persone, e a un certo punto ne entra una molto ricca. La media degli stipendi schizza in alto e non descrive più nessuno dei presenti, mentre la mediana resta dov’era, perché guarda chi sta in mezzo alla fila e non si lascia impressionare da chi sta in fondo.\n\nNel simulatore vale lo stesso. La mediana dice com’è andata la giocata (la partita intera della scena, dal primo gesto all’ultimo) di mezzo. Quando media e mediana sono lontane, vuol dire che pochi casi estremi tirano la media da una parte.' },
    media: {
      nome: 'La media', sigla: '',
      breve: 'La somma di tutti i risultati, divisa per quanti sono. È quello che toccherebbe a ognuno se il totale fosse diviso in parti uguali.',
      esempio: 'È il conto che si fa a fine pranzo, quando arriva il conto e si divide: quanto abbiamo speso in tutto, diviso quanti siamo.\n\nHa un difetto che conviene conoscere, ed è che un solo caso molto lontano dagli altri se la tira dietro. Dieci giornate normali e una disastrosa danno una media che non somiglia a nessuna delle undici, come un pranzo in cui uno solo ha ordinato l’aragosta. Per questo il simulatore mostra sempre anche la mediana: quando le due sono lontane, la distanza fra loro dice già che ci sono casi estremi.' },
    intervallo_di_confidenza: {
      nome: 'L’intervallo di confidenza', sigla: '±',
      breve: 'Due estremi fra i quali è ragionevole che stia il valore vero. Non è una previsione: è la dichiarazione di quanto ci si può fidare del numero che si ha in mano.',
      esempio: 'Provi una cosa dieci volte e ti riesce sette. Viene spontaneo dire «riesce il settanta per cento delle volte», ma è una promessa molto più grande di quello che dieci prove possono mantenere, perché con dieci prove la verità può stare fra il quaranta e il novanta per cento.\n\nÈ il motivo per cui accanto a ogni percentuale il simulatore scrive un ±. Più giocate (partite intere della stessa scena) si fanno, più i due estremi si avvicinano. La larghezza è l’informazione utile, non un fastidio: un intervallo largo vuol dire «con questi dati non lo so ancora».' },
    semiampiezza: {
      nome: 'La semiampiezza', sigla: '±',
      breve: 'Metà della larghezza dell’intervallo di confidenza: il numero che nel simulatore compare dopo il segno ±.',
      esempio: 'Quando leggi «49,3 ± 0,4», quello 0,4 è la semiampiezza, e vuol dire che è ragionevole pensare che il valore vero stia fra 48,9 e 49,7.\n\nServe a rispondere alla domanda «quante giocate bastano?». Non si fissa un numero di giocate a tavolino: si guarda la semiampiezza, e ci si ferma quando è scesa abbastanza per la decisione da prendere. Conviene però saperlo prima di cominciare, perché per dimezzarla servono quattro volte le giocate, non il doppio.' },
    numerosita: {
      nome: 'La numerosità', sigla: 'n',
      breve: 'Quanti casi ci sono nel gruppo su cui si fa il conto. Nel simulatore è quasi sempre il numero di giocate (le partite intere della stessa scena).',
      esempio: 'La lettera n accanto a un grafico dice su quante prove poggia quello che stai guardando: «n = 2.000» vuol dire che quella curva è nata rigiocando duemila volte la stessa scena.\n\nÈ il numero più importante, e insieme il più dimenticato, perché la stessa percentuale, detta su dieci casi o su duemila, dice due cose diverse. Attenzione anche a non confonderlo con le valutazioni: una giocata di venti gesti fa una giocata sola e venti valutazioni, e se conti le seconde al posto delle prime la misura sembra molto più solida di quanto sia.' },
    scarto_z: {
      nome: 'Lo scarto z', sigla: 'z',
      breve: 'Quanto è grande una differenza, misurata con il metro del caso. Dice quante volte la differenza supera lo scarto che il caso, da solo, produce di solito. Serve a capire se è troppo grande per essere solo fortuna.',
      esempio: 'È come misurare una distanza in passi invece che in metri, dove il passo è quanto il caso, da solo, sposta di solito le cose. Due passi sono tanti, mentre mezzo passo non è niente, e nessuno griderebbe alla scoperta per mezzo passo.\n\nSe due varianti della stessa scena finiscono lontane il doppio di quanto il caso, da solo, le separerebbe, z vale 2. Se invece la distanza è di quelle che il caso produce ogni giorno, z resta piccolo.\n\nLa soglia consueta è 1,96, e vuol dire «succederebbe per caso meno di cinque volte su cento». Ma quando i confronti sono tanti la soglia va alzata, perché fra venti confronti uno che sembra buono capita quasi sempre per caso. Si veda la voce «correzione di Bonferroni».' },
    nodo_a_vuoto: {
      nome: 'Il nodo a vuoto', sigla: '',
      breve: 'Una riga che ripete la precedente senza aggiungere niente: stessi valori, stesso significato, e a cambiare è solo il dado (il tiro a caso che decide l’esito).',
      esempio: 'Immagina di raccontare il risveglio così: aprire gli occhi, aprire gli occhi, aprire gli occhi, per trentadue righe. Non sono trentadue gesti, è un gesto solo raccontato trentadue volte, e le trentuno righe dopo la prima sono nodi a vuoto.\n\nSegna il limite sotto cui non conviene spezzettare una scena, perché sotto quella misura non c’è più niente da leggere: i numeri che escono sembrano tanti solo perché sono ripetuti. Si rimedia in due modi, dando a ogni riga qualcosa di suo oppure fondendo le righe vicine in un gesto solo.' },
    due_assi: {
      nome: 'I due assi', sigla: '',
      breve: 'Quanti gesti diversi contiene una scena, e quante volte quella scena viene rigiocata. Sono due misure separate, e confonderle gonfia i conti.',
      esempio: 'Leggere mille volte un libro di quaranta pagine non lo fa diventare un libro di quarantamila pagine: hai letto molto, ma il libro è sempre quello.\n\nUna scena da quaranta gesti, rigiocata mille volte, fa quarantamila calcoli, ma i gesti restano quaranta e le partite restano mille. Ripetere il dado non aggiunge gesti alla scena, e allungare la scena non rende più sicuro il risultato.\n\nPer questo conviene diffidare dei numeri grandi buttati lì senza spiegazione: un numero che non dice da quale dei due assi viene, di solito, serve soltanto a far sembrare solida una misura che non lo è.' },
    accumulatore: {
      nome: 'L’accumulatore', sigla: '',
      breve: 'Il posto dove il simulatore tiene da parte le frazioni di punto, finché non ne matura uno intero.',
      esempio: 'È come il salvadanaio degli spiccioli sul mobile dell’ingresso. Ogni sera ci metti pochi centesimi, che da soli non comprano niente, e a fine mese, messi insieme, fanno una spesa.\n\nIl modello conta per punti interi, ma quello che un gesto lascia al gesto dopo è spesso una frazione di punto: il quattro e mezzo per cento di pochi punti non arriva a uno. Senza accumulatore quelle frazioni andrebbero perse, e cinquecento gesti non sposterebbero niente. Con l’accumulatore, invece, si sommano, e quando insieme fanno un punto quel punto passa davvero. È la ragione per cui su un gesto solo la colonna dice «meno di 1», e su una mattina intera il conto torna.' },
    percentile: {
      nome: 'Il percentile', sigla: '',
      breve: 'Un modo per dire a che punto della fila cade un valore. Il novantesimo percentile è il numero sotto il quale stanno novanta risultati su cento.',
      esempio: 'È la stessa idea delle curve di crescita dal pediatra. Un bambino al decimo percentile non è per forza basso: vuol dire che dieci bambini su cento stanno sotto di lui, e novanta sopra, e il pediatra lo dice ai genitori proprio così.\n\nQui i percentili servono a dire quanto la scena è ballerina. Il simulatore guarda il decimo e il novantesimo, come fa il libro: fra i due stanno ottanta giocate su cento, e se quella distanza è larga la stessa mattina può finire in modi molto diversi.' },
    varianza: {
      nome: 'La varianza', sigla: '',
      breve: 'Dice quanto i valori si allontanano dalla media. Si prendono gli scarti dalla media, si elevano al quadrato e se ne fa una media.',
      esempio: 'Pensa a cinque persone che arrivano tutte alle nove in punto: la varianza dei loro orari è zero. Se una arriva alle otto e mezza e una alle nove e mezza, cresce, e cresce tanto più quanto più gli arrivi si sparpagliano.\n\nÈ espressa in unità al quadrato, che è un modo scomodo di leggerla: per questo si usa più spesso la sua radice quadrata, cioè la deviazione, che ha una voce sua. Quando si stima la varianza da un campione, la somma degli scarti al quadrato si divide per il numero di dati meno uno, e servono almeno due dati.' },
    correlazione: {
      nome: 'La correlazione', sigla: '',
      breve: 'Un numero che dice se due grandezze si muovono insieme: va da meno uno a più uno, e a zero non si muovono insieme per niente.',
      esempio: 'Chi è più alto pesa di più, di solito, anche se non sempre: fra altezza e peso c’è correlazione, e basta guardare una fila di persone per vederla.\n\nQui dentro la trovi fra il carico finale (la pressione accumulata a fine scena) e il costo nascosto (il prezzo che si vede solo dopo), perché le giocate in cui il carico sale sono spesso anche quelle che costano di più sotto.\n\nAttenzione a che cosa questo numero non dice: non dice che una cosa provoca l’altra. D’estate si vendono più gelati e ci sono più scottature, ma non sono i gelati a scottare: due cose che si muovono insieme possono dipendere tutte e due da una terza. Il numero indica una pista, ma la risposta non la dà.' },
    /* IL NOME DELLA VOCE È QUELLO DEL LIBRO, NON IL SIMBOLO.
       Il Canone non scrive mai «R²»: dice «c’è un indice che dice quanta
       parte della variazione è davvero spiegata». La chiave segue il libro,
       e il simbolo sta accanto al nome, dove chi lo conosce lo ritrova. */
    variazione: {
      nome: 'La variazione spiegata (R²)', sigla: '',
      breve: 'Il quadrato della correlazione. Dice quanta parte del movimento di una grandezza è spiegata dal movimento dell’altra.',
      esempio: 'Se la correlazione vale 0,6, R² vale 0,36, cioè il trentasei per cento. Il resto, sessantaquattro su cento, viene da qualcos’altro che il primo numero non spiega.\n\nHa un’utilità sola, ma grande. Quando si tira una riga dentro una nuvola di punti, quella riga sembra sempre spiegare tutto, e R² dice quanto spiega davvero: quasi sempre è molto meno di quello che sembra.\n\nNon è una percentuale di verità, e non dice chi causa che cosa. Dice solo quanta parte della variazione i due numeri hanno in comune.' },
    deviazione: {
      nome: 'La deviazione', sigla: '',
      breve: 'Quanto i risultati si allontanano, di solito, dal loro valore medio. È un numero solo. Dice se stanno stretti intorno alla media, oppure sparpagliati.',
      esempio: 'Due autobus fanno lo stesso percorso in venti minuti di media. Uno arriva sempre fra i diciannove e i ventuno, e ci puoi contare; l’altro certe volte ci mette dieci minuti e certe volte trenta, e con quello non sai mai se arrivi in tempo. La media non li distingue, la deviazione sì.\n\nUna deviazione piccola vuol dire che la scena si comporta quasi sempre allo stesso modo. Una deviazione grande vuol dire che il caso conta molto, e allora una giocata sola non racconta niente.' },
    coda: {
      nome: 'La coda', sigla: '',
      breve: 'Le poche volte in cui va molto peggio del solito. È la parte più lontana della fila dei risultati, quella che si vede soltanto giocando tante volte.',
      esempio: 'La maggior parte dei giorni assomiglia agli altri, e poi c’è il giorno in cui salta tutto: il bambino con la febbre, la macchina che non parte, la telefonata che non ti aspettavi. Capita di rado, ma quando capita pesa più di dieci giorni normali messi insieme.\n\nÈ per questo che dieci giocate (partite intere della stessa scena) non bastano, perché la coda comincia a farsi vedere nella giusta misura solo dopo qualche migliaio di giocate. Finché non compare, il simulatore guarda soltanto i giorni normali.' },
    istogramma: {
      nome: 'L’istogramma', sigla: '',
      breve: 'Il disegno a colonne che mostra quante volte è uscito ogni risultato: colonne alte dove i risultati si ammucchiano, basse dove sono rari.',
      esempio: 'È il grafico che compare quando il simulatore rigioca una scena molte volte. Ogni colonna raccoglie i risultati vicini fra loro, e la sua altezza dice quante giocate ci sono finite dentro: dove la colonna è alta, lì la scena finisce spesso.\n\nServe a guardare la forma invece del riassunto. Una gobba sola vuol dire che la scena si comporta in un modo solo, mentre due gobbe lontane vogliono dire che ne ha due, e nessun numero medio lo direbbe.' },
    convergenza: {
      nome: 'La convergenza', sigla: '',
      breve: 'Il momento in cui un numero smette di ballare: si aggiungono altre giocate e il risultato non cambia più in modo che si noti.',
      esempio: 'Se lanci una moneta dieci volte puoi ottenere sette teste, e non vuol dire niente. Lanciala diecimila volte, e la quota di teste si assesta vicino alla metà, e ci resta: a quel punto il numero ha smesso di ballare.\n\nServe a decidere quando fermarsi. Finché il numero si muove a ogni giro, la prova è troppo corta; quando si è assestato, aggiungere giocate costa tempo e non insegna più niente.\n\nIl libro usa la stessa parola anche in un altro senso, e vale la pena saperlo. Per il debito (l’insistenza ripetuta sulla stessa strada che non funziona), convergenza vuol dire sei condizioni che capitano tutte insieme.' },
    quota: {
      nome: 'La quota', sigla: '',
      breve: 'Una parte di un totale, detta di solito ogni cento: quante volte su cento è successa una certa cosa.',
      esempio: 'Dire che sette bambini su dieci vanno a scuola a piedi è dire una quota, il settanta per cento. Qui la quota di riuscite dice quante giocate su cento sono finite bene: se su mille giocate ne riescono settecentodieci, la quota è del settantuno per cento.\n\nLa parola torna anche altrove, con lo stesso senso. Il taglio ai bordi (la regola che tiene la probabilità fra 5 e 95) lascia sempre una quota di possibilità e una quota di dubbio: cinque volte su cento da una parte, e cinque dall’altra.' },
    fascia: {
      nome: 'La fascia', sigla: '',
      breve: 'Un gruppo di valori vicini che il modello tratta allo stesso modo, e a cui dà un nome unico. Dentro la stessa fascia il numero preciso non cambia niente.',
      esempio: 'Funziona come le taglie dei vestiti. Fra una quarantotto e una cinquanta c’è un confine, ma dentro la stessa taglia due corpi diversi vestono uguale, e la commessa non ti chiede i centimetri.\n\nIl simulatore usa le fasce nei punti in cui una precisione al decimale non avrebbe senso, e sono tre. Il carico (la pressione accumulata nei giorni prima) pesa a fasce, e da 40 a 59 toglie sempre cinque punti. I margini (di quanto un gesto è riuscito, o mancato) stanno in tre fasce: fragile, normale e forte. Il rischio ne ha una verde, una gialla e una rossa.\n\nNei grafici la parola indica anche la zona colorata che copre quella stessa banda di valori.' },
    delta: {
      nome: 'Il delta', sigla: '',
      breve: 'La differenza fra due numeri: di quanto è cambiato qualcosa fra prima e dopo. È una parola presa dalla matematica. Vuol dire soltanto «di quanto si è spostato».',
      esempio: 'Sali sulla bilancia del bagno: la settimana scorsa pesavi 70, oggi pesi 72, e il delta è più due. Nel simulatore è lo stesso conto. Il carico (la pressione accumulata che ti porti dietro) era 44 prima del gesto ed è 51 dopo, e allora il delta è più sette; se fosse sceso a 40, il delta sarebbe meno quattro.\n\nNelle tabelle compare accanto a ogni gesto, con il segno davanti, e dice che cosa quel gesto ha lasciato. Serve a leggere il movimento invece dei valori fermi, perché due mattine possono finire allo stesso numero arrivandoci da direzioni opposte.' },
    monte_carlo: {
      nome: 'Il metodo Monte Carlo', sigla: '',
      breve: 'Rigiocare molte volte la stessa scena, con dadi sempre nuovi, e guardare la forma di quello che esce invece del singolo risultato.',
      esempio: 'Il nome viene dal casinò, e l’idea è proprio quella: per sapere come si comporta un gioco non basta una partita, bisogna giocarne tante e guardare come vanno, perché una serata fortunata non dice niente sul tavolo.\n\nIl metodo ha ottant’anni, e non serve sapere altro per usarlo. Una giocata sola (una partita intera della scena) dice che cosa è capitato quella volta lì. Mille giocate dicono che cosa capita di solito, quanto il risultato varia, e quanto spesso va molto male.' },
    wilson: {
      nome: 'L’intervallo di Wilson', sigla: '',
      breve: 'Un modo di dire quanto ci si può fidare di una percentuale calcolata su poche prove. Restituisce due estremi, non un numero solo.',
      esempio: 'Su dieci tentativi ne riescono sette, e dire «riesce il settanta per cento delle volte» promette troppo, perché con dieci prove la verità può stare fra il quaranta e il novanta per cento. Questo intervallo lo scrive nero su bianco, invece di lasciarlo sottinteso.\n\nIl suo compito è tutto qui: non dice dove sta la verità, dice quanto puoi fidarti del numero che hai in mano. Con poche prove l’intervallo esce largo, e la larghezza è proprio l’informazione utile. Porta il nome di chi lo ha proposto.' },
    mcnemar: {
      nome: 'La prova di McNemar', sigla: '',
      breve: 'Un controllo per confrontare due modi di fare la stessa cosa, quando sono stati provati sulle stesse identiche situazioni.',
      esempio: 'Immagina di far leggere le stesse trenta lastre a due medici. Non conta quante ne indovinano in tutto, perché su venticinque saranno d’accordo tutti e due: conta dove uno vede e l’altro no. Quelle sono le lastre che distinguono i due, e sono le sole che vale la pena contare.\n\nQui funziona uguale. Due varianti di una scena vengono provate sulle stesse giocate (le stesse partite, dadi compresi), e questa prova guarda soltanto i casi in cui hanno dato esiti diversi. È il modo giusto di confrontare due cose provate a coppie, e chiede molte meno prove, perché tutto ciò su cui le due vanno d’accordo non distingue niente e resta fuori dal conto.' },
    bonferroni: {
      nome: 'La correzione di Bonferroni', sigla: '',
      breve: 'Una regola che alza l’asticella quando fai molti confronti in una volta sola, per non prendere per vera la prima coincidenza che salta fuori.',
      esempio: 'Se guardi venti cose a caso, una ti sembrerà notevole anche quando non c’è niente da vedere, per lo stesso motivo per cui chi tira venti volte al bersaglio prima o poi fa centro, e poi racconta solo di quella volta.\n\nLa correzione è semplice: divide la soglia per il numero di confronti. Con venti confronti, quello che prima bastava adesso deve essere venti volte più netto. È severa, e nessuno può contestarla, perché è la scelta più prudente che ci sia.' },

    /* --- COME E' FATTO IL MODELLO: i nomi tecnici che il libro usa ------ */
    clamp: {
      nome: 'Il morsetto', sigla: 'clamp',
      breve: 'La regola che tiene un numero dentro due estremi: se scende troppo lo riporta al minimo, se sale troppo lo riporta al massimo.',
      esempio: 'Il libro gli dà il nome inglese clamp, che vuol dire proprio «morsetto»: come il morsetto da falegname stringe due assi e non le lascia muovere, questo stringe il numero fra due estremi e non lo lascia uscire.\n\nNel simulatore serve soprattutto per la probabilità, che non scende mai sotto 5 e non sale mai sopra 95. Impedisce due bugie: che una cosa sia impossibile, e che sia certa. Si veda la voce «taglio ai bordi».' },
    penstr: {
      nome: 'La penalità da carico', sigla: 'PenSTR',
      breve: 'I punti che il carico accumulato (la pressione che ti porti dietro dai giorni prima) toglie alla probabilità. Non è il carico: è quanto costa, e costa a gradini, non un poco alla volta.',
      esempio: 'La sigla sta per due parole intere, penalità e stress. Il carico va da 0 a 100, ma la penalità ha soltanto sei valori, e sale a gradini come una scala.\n\nFino a 39 non toglie niente. Da 40 a 59 toglie 5, da 60 a 69 toglie 10, da 70 a 79 toglie 15, da 80 a 89 toglie 20, e da 90 in su toglie 25.\n\nQuindi 41 e 58 costano uguale, ed è voluto: nessuno, guardando una persona che si porta addosso una settimana pesante, sa dire se il suo carico vale 44 o 47. Sa dire se è basso, medio o alto, e i gradini ammettono questo limite invece di nasconderlo dietro decimali inventati.' },
    ms: {
      nome: 'Il margine di successo', sigla: 'MS',
      breve: 'Di quanto è andata bene. È la distanza fra la probabilità che avevi e il numero uscito dal dado, quando quel numero è uguale o più basso.',
      esempio: 'Con una probabilità di 70, un tiro di 34 è una riuscita con margine 36, cioè larga, di quelle in cui non hai mai avuto paura. Un tiro di 69 è una riuscita con margine 1, per un soffio, di quelle in cui ti siedi dopo con il cuore che batte.\n\nL’esito scritto è lo stesso in tutti e due i casi, eppure non è successa la stessa cosa. Si calcola solo dopo il tiro, mai prima, perché finché il dado non è stato tirato non c’è nessuna distanza da misurare. Si veda la voce «margine».' },
    mf: {
      nome: 'Il margine di fallimento', sigla: 'MF',
      breve: 'Di quanto è mancata: la distanza fra il numero uscito dal dado e la probabilità che avevi, quando quel numero è più alto.',
      esempio: 'Con una probabilità di 40, un tiro di 42 manca di due punti, e un tiro di 88 manca di quarantotto. Nel primo caso il treno ti è partito davanti agli occhi; nel secondo, quando sei arrivato in stazione, era già alla fermata dopo.\n\nSi conta al rovescio rispetto al margine di successo, così vengono numeri positivi tutti e due e si possono confrontare. Mancare di due chiede di riprovare cambiando poco. Mancare di quarantotto dice che la scena non era in bilico, e che spingere più forte non serve a niente.' },
    rip: {
      nome: 'Il recupero e riassetto', sigla: 'RIP',
      breve: 'Fermarsi davvero, e cambiare qualcosa. Non è una pausa qualunque: è una pausa dopo la quale qualcosa nella scena, o nel modo di fare, è diverso da prima.',
      esempio: 'Sedersi cinque minuti fissando lo stesso problema, con la testa che continua a girarci intorno, non è recupero: è un intervallo. Sedersi cinque minuti, bere un bicchiere d’acqua, e poi riprovare in un altro ordine, invece, lo è.\n\nIl libro lo dice in una riga sola, al § 6.6: il recupero deve cambiare qualcosa. È la ragione per cui il simulatore chiede sempre due cose separate, quanto ti fermi e che cosa cambia quando ti fermi, perché senza la seconda il carico (la pressione accumulata nei giorni prima) non scende sul serio.' },
    ri4: {
      nome: 'Il rientro lungo', sigla: 'ri4',
      breve: 'Quanto è buono un rientro dopo un periodo duro. Si guardano quattro segni insieme, invece di uno: se la tensione scende, se il danno si ripara, se il carico (la pressione accumulata nei giorni prima) si riduce, se la vita riprende.',
      esempio: 'Il nome è una scorciatoia per quattro parole che cominciano tutte allo stesso modo: rientro, riparazione, riduzione, ripresa.\n\nUn esempio lo chiarisce. Dopo una settimana pesante uno torna al lavoro, e quello è il rientro. Ma il sonno non si aggiusta, il carico resta lo stesso, e non è tornato niente di quello che gli piaceva fare la sera. Mancano tre condizioni su quattro, e il rientro è solo apparente: da fuori è tornato, da dentro no.\n\nServe perché smettere di stare male e ricominciare a stare bene non sono la stessa cosa.' },
    cooldown: {
      nome: 'Il tempo di raffreddamento', sigla: 'cooldown',
      breve: 'Il tempo minimo che deve passare dopo un colpo duro perché il recupero (una pausa che toglie carico davvero) conti. Non basta che l’evento sia finito: serve tempo vero.',
      esempio: 'Spegni il forno e apri lo sportello: dentro resta rovente ancora per un pezzo, e se ci metti le mani ti scotti lo stesso. La fine dell’evento e la fine dei suoi effetti non capitano insieme, e il tempo di raffreddamento è la distanza fra le due.\n\nSenza questa regola un modello diventa ottimista da solo, perché appena l’evento è chiuso dà tutto per rimesso a posto. Il simulatore invece aspetta, e finché quel tempo non è passato conta il recupero per quello che è: parziale.' },
    safetystop: {
      nome: 'Il cancello di sicurezza', sigla: 'SafetyStop',
      breve: 'Una regola che viene prima di tutto il resto: quando compaiono segnali gravi, il calcolo non si fa proprio, e al suo posto arrivano poche cose concrete da fare.',
      esempio: 'Fuori dal simulatore è come il medico che, davanti a certi segnali, non fa la visita di routine e ti manda subito al pronto soccorso, perché prima si mette al sicuro la persona e solo dopo si ragiona.\n\nIl libro lo chiama con il nome inglese SafetyStop, e lo descrive come un cancello. Se è chiuso, la formula non si esegue e non si calcola nessuna probabilità, perché in quel momento non è la domanda giusta.\n\nAl posto del calcolo arrivano poche priorità concrete. Ridurre il carico (la pressione accumulata nei giorni prima). Cercare un aiuto vero. Proteggere la sicurezza. Rinviare le decisioni difficili. Smettere di insistere dove insistere fa danno.\n\nÈ la regola più semplice e più importante del modello, e l’unica che si permette di rifiutare la domanda invece di rispondere.' },
    domicilio_unico: {
      nome: 'Il domicilio unico', sigla: '',
      breve: 'La regola per cui ogni fatto entra nel conto una volta sola, in una casa sola. Se la stanchezza è già stata contata nel corpo, non la si conta di nuovo altrove.',
      esempio: 'È la regola di chi tiene bene i conti di casa: la stessa spesa non si scrive su due righe, perché altrimenti il totale di fine mese è sbagliato, e non si capisce nemmeno dove.\n\nQui è la stessa cosa. Se il carico (la pressione accumulata nei giorni prima) è alto, e per questo abbassi anche la difficoltà di partenza, quella stanchezza pesa due volte, e il numero finale non racconta più niente di vero.\n\nÈ anche il motivo per cui l’ambiente e il campo attivo (quello che reagisce mentre fai il gesto) stanno in due posti diversi: l’ambiente entra nella formula, il campo attivo agisce dopo il dado.' },
    granularita: {
      nome: 'La granularità', sigla: '',
      breve: 'Quanto è fine il taglio con cui si descrive una scena: di quanti gesti distinti è fatta. Non quante volte la si rigioca, ma in quanti pezzi la si divide.',
      esempio: 'La stessa mattina si può raccontare in tre gesti oppure in trenta. Alzarsi può essere un gesto solo, oppure può diventare aprire gli occhi, sedersi sul bordo del letto, mettere i piedi a terra, alzarsi in piedi.\n\nLo decide la descrizione, non il modello. Tagliare più fine mostra in quale punto preciso la mattina si incrina, e questo è utile; tagliare troppo fine, però, trasforma un istante in un evento, e il modello comincia a dare peso a cose che peso non ne hanno.\n\nÈ uno dei due assi della scena, e i due non si sommano mai. L’altro è la voce «ripetizioni».' },
    micro_semantica: {
      nome: 'La micro-semantica', sigla: '',
      breve: 'La regola che dice quando ha senso spezzare un gesto in pezzi più piccoli: soltanto se ogni pezzo fa un mestiere diverso dagli altri.',
      esempio: 'Spezzare «alzarsi» in quattro momenti serve se quei momenti fanno cose diverse: uno riconosce la stanza, uno organizza il corpo, uno accetta un limite, uno parte. Non serve se sono quattro copie dello stesso istante con dadi diversi, perché allora non hai raccontato di più: hai solo tirato più volte.\n\nIl criterio sta in una frase sola: deve cambiare il mestiere del pezzo, non la sua importanza.\n\nQuando poi si spezza, le differenze fra un pezzo e l’altro restano piccolissime: zero, uno, al massimo due punti, non cinque, non dieci.' },
    trasferimento_di_stato: {
      nome: 'Il trasferimento di stato', sigla: '',
      breve: 'Quanto di ciò che un gesto lascia addosso arriva davvero al gesto successivo. Non passa tutto, ma non è nemmeno vero che non passi niente: passa una parte.',
      esempio: 'La telefonata difficile delle nove pesa ancora un po’ sulla riunione delle undici: te la porti dentro, ma non pesa come pesava alle nove e un minuto, quando hai riattaccato. Quella parte che resta è il trasferimento di stato.\n\nNel simulatore vale il 4,6 per cento, ed è un numero scelto e dichiarato, non trovato per caso. Si veda la voce «taratura».\n\nÈ la regola che tiene insieme una catena di gesti. Se passasse tutto, dieci gesti facili di fila diventerebbero una tragedia; se non passasse niente, ogni gesto ricomincerebbe da zero, e le giornate non esisterebbero.' },
    saturazione: {
      nome: 'La saturazione', sigla: '',
      breve: 'Il momento in cui il modello smette di distinguere: i numeri arrivano al massimo che possono segnare e lì restano, così da lì in poi tutto sembra uguale, anche quando uguale non è.',
      esempio: 'Succede come con una bilancia da cucina caricata oltre il massimo: continua a segnare il numero più alto che ha, e da quel punto in avanti un chilo in più non si vede, anche se c’è.\n\nSi riconosce da tre segni. Il carico (la pressione accumulata nei giorni prima) resta fermo in cima per molti gesti di fila, le probabilità diverse fra loro si contano sulle dita, e scene davvero diverse ricevono la stessa risposta.\n\nConviene saperlo, perché un modello saturo non dà un risultato sbagliato: ne dà uno che non vuol dire più niente, e da fuori sembra un risultato come tutti gli altri.' },

    /* --- COME SI PRESENTA IL RISULTATO --------------------------------- */
    registro: {
      nome: 'Il registro', sigla: '',
      breve: 'Il tono e la lunghezza con cui il simulatore racconta com’è andata. Non è una scelta di stile: dipende da quanto la situazione si è messa male.',
      esempio: 'È la differenza fra dare una notizia con calma, seduti a tavola, e darla in fretta sulla porta perché non c’è tempo: le parole cambiano, i fatti no.\n\nI gradini sono tre. Quando le cose reggono il racconto è completo; quando si stringono diventa breve e concreto; quando il sistema è troppo compromesso resta il minimo, poche righe, e solo le cose da fare.\n\nUn racconto corto non è un racconto svogliato: è il modo che ha il simulatore di dire che leggere due pagine, in quel momento, non servirebbe a niente.' },
    budget: {
      nome: 'Il tetto di parole', sigla: 'budget',
      breve: 'Quante parole al massimo il racconto può usare. Ogni registro (il tono, più o meno disteso, con cui il simulatore racconta) ne concede un certo numero, e oltre quello il testo viene accorciato.',
      esempio: 'Il tetto si stringe man mano che le condizioni peggiorano, perché più le cose vanno male meno serve un testo lungo. Cambia anche a seconda di che cosa si guarda: un gesto solo, una catena (più gesti di fila), una settimana intera.\n\nQuando il testo supera il tetto, il simulatore taglia, ma dichiara sempre che cosa ha tolto, e in quale ordine. Tre parti non si tolgono mai: che cosa è successo, che cosa è costato, che cosa fare.\n\nIl tetto decide quanto si può parlare, non che cosa si può nascondere.' },

    /* =====================================================================
     * LE VOCI AGGIUNTE IL 15/09/2026, DAL CONFRONTO CON L'APPARATO A
     * =====================================================================
     * L'Apparato A del Canone — «Glossario unificato» — e la sezione «Le
     * parole del modello» in apertura del libro contengono insieme circa
     * settanta voci in grassetto. Ventidue non avevano ancora una voce qui:
     * non erano un dimenticatoio, erano semplicemente arrivate dopo l'ultimo
     * confronto voce per voce. _test/glossario.js le elenca tutte, una per
     * una, insieme a quelle scelte apposta per restare fuori (con il motivo
     * scritto accanto): e' il modo per cui una settantunesima voce del
     * libro, il giorno che comparirà, non passi inosservata.
     *
     * Molte di queste parole non compaiono oggi in nessuna pagina del
     * pacchetto: sono nomi propri del modello che il libro tiene in inglese,
     * o termini tecnici dell'Apparato A che descrivono strumenti fuori dalle
     * dodici pagine (il runner, i suoi checkpoint, gli audit) o passaggi
     * interni (il payload, il blueprint) che il lettore non vede mai a
     * schermo. Restano comunque spiegate: chi le incontra leggendo il libro
     * deve poterle cercare qui, ed è la regola stessa che il libro dichiara
     * per le sue parole inglesi — spiegate alla prima comparsa, ovunque essa
     * sia. */
    adattamento: {
      nome: 'L’adattamento', sigla: '',
      breve: 'La correzione che una persona fa dentro la scena, mentre la sta ancora attraversando: fermarsi, semplificare, chiedere aiuto, cambiare ordine, ridurre l’obiettivo.',
      esempio: 'Sei alla cassa del supermercato con il carrello pieno, vedi la fila e mandi avanti chi ha solo il pane in mano: quello è un adattamento vero, fatto mentre il gesto è ancora in corso, e cambia come finisce la scena.\n\nPrima di contarlo, però, bisogna chiedersi se era davvero a portata di mano. Il libro ne distingue cinque qualità: disponibile, parziale, teorico, tardivo, finto. Un adattamento teorico, «avrei potuto chiedere aiuto», non ha aiutato nessuno.' },
    attendibilita: {
      nome: 'L’attendibilità delle risposte', sigla: '',
      breve: 'Quanto sono solidi i dati su cui si è calcolato: alta, media o bassa. Va dichiarata sempre, perché un numero preciso scritto sopra dati vaghi è una precisione finta.',
      esempio: 'È diversa dalla provenienza di un singolo dato, che dice se un valore è certo, stimato, proxy o incompleto. L’attendibilità guarda l’insieme delle risposte date per una scena, e dice quanto ci si può fidare del risultato che ne esce: è come la differenza fra controllare un ingrediente e giudicare tutta la ricetta.\n\nNel questionario resta media finché non si conferma a mano ogni valore stimato. Il resoconto scrive sempre accanto al numero anche questa parola, perché senza chi legge non sa se ha davanti un fatto o una supposizione.' },
    audit: {
      nome: 'L’audit', sigla: 'audit',
      breve: 'Una revisione fatta dopo, su tutto il lavoro già svolto, che finisce con un giudizio scritto. Non è uno dei controlli automatici che danno il via libera, o lo negano, mentre si lavora: è una rilettura fatta a mente fredda.',
      esempio: 'È come la differenza fra correggere un compito mentre lo si scrive e rileggerlo da capo la sera, a tavolo sgombro, cercando apposta gli errori. La prima è la verifica di tutti i giorni, e la seconda è l’audit.\n\nQuesto progetto ne ha fatti a decine, e tre hanno un nome proprio nel libro. Un audit scrive anche quello che non ha funzionato, non solo quello che torna, perché altrimenti non servirebbe a niente.' },
    blueprint: {
      nome: 'Il blueprint', sigla: 'blueprint',
      breve: 'Il piano di una scena lunga, fatto prima di calcolare: quanti gesti ci sono, in che ordine, con quali rami possibili e dove stanno i punti di recupero.',
      esempio: 'È come il progetto che si disegna prima di costruire una casa: non contiene ancora un mattone, ma dice dove andrà ognuno, e un progetto provvisorio non è ancora la casa, ma evita di costruire alla cieca.\n\nServe per le scene lunghe e le catene (file di gesti, uno dopo l’altro) che questo pacchetto ricostruisce da un racconto: prima si capisce quanti gesti contiene e in che ordine vengono, e solo poi si calcola ognuno.' },
    bp_stato: {
      nome: 'Il BP di nodo e il BP di stato', sigla: 'BP',
      breve: 'Due protezioni diverse con la stessa sigla. Il BP di nodo è l’aiuto presente in un singolo gesto, ed entra nella formula. Il BP di stato è la protezione di fondo che la persona porta con sé da uno stato all’altro: una routine conosciuta, una casa familiare, un’abitudine prudente.',
      esempio: 'Il BP di nodo dura quanto il gesto: qualcuno che tiene il bambino mentre finisci, e poi la scena è chiusa e l’aiuto con lei. Il BP di stato resta addosso più a lungo, come una rete che c’è comunque, gesto dopo gesto: la casa che conosci a occhi chiusi, la routine del mattino che non devi più pensare.\n\nSi sommano, perché il BP che entra nella formula è il BP di nodo più il BP di stato. In un resoconto lungo lo stato iniziale può dichiarare «BP di stato 4», mentre ogni singolo gesto porta il suo BP proprio, diverso scena per scena. Si veda anche la voce «ciò che ti protegge».' },
    microvariazione: {
      nome: 'Il tetto di microvariazione', sigla: '',
      breve: 'Il limite a quanto un micro-frame (un istante troppo piccolo per essere un gesto) può differire dal precedente. Vale quando una scena viene raccontata a un dettaglio molto fine. Impedisce che un istante minuscolo riceva un bonus o un malus da evento vero e proprio.',
      esempio: 'Se «aprire gli occhi» e «mettere a fuoco» differissero di dieci punti l’uno dall’altro, il modello tratterebbe due istanti della stessa azione come due gesti diversi. Sarebbe come se fra l’uno e l’altro fosse successo qualcosa, e invece non è successo niente.\n\nIl tetto lo impedisce, e le differenze fra micro-frame vicini restano di zero, uno, al massimo due punti. È la stessa regola della micro-semantica, cioè spezzare un gesto solo se i pezzi fanno mestieri diversi, vista però dal lato del numero e non del significato.' },
    checkpoint: {
      nome: 'Il checkpoint', sigla: 'checkpoint',
      breve: 'Un punto di salvataggio dentro una simulazione molto lunga, da cui si può ripartire senza rifare tutto da capo.',
      esempio: 'Funziona come il salvataggio di un videogioco lungo: se va via la luce a metà, si riparte dall’ultimo checkpoint, non dall’inizio, e le ore già giocate non vanno perse.\n\nServe al runner (lo strumento per le simulazioni lunghissime, da laboratorio), non al simulatore che apri con un doppio clic. Qui una scena si racconta in pochi secondi, e non c’è niente da salvare a metà strada.' },
    cluster: {
      nome: 'Il cluster', sigla: 'cluster',
      breve: 'Un gruppo di micro-frame (istanti troppo piccoli per essere gesti) vicini fra loro che, presi uno per uno, non dicono quasi niente, e messi insieme raccontano un passaggio vero.',
      esempio: 'Aprire gli occhi trentadue volte non sono trentadue gesti: è un cluster solo. È lo stesso istante, raccontato con un dettaglio così fine che dentro non ci passa nessuna decisione vera.\n\nÈ il modo giusto di rimediare al nodo a vuoto (la riga che ripete la precedente senza aggiungere niente). Invece di dare a ogni fotogramma un dado suo, si fondono i fotogrammi vicini in un passaggio solo, quello che conta davvero. Così la scena torna a dire qualcosa.' },
    delega_vera: {
      nome: 'La delega vera', sigla: '',
      breve: 'Il passaggio effettivo di una parte del compito a qualcun altro, che davvero lo porta a termine. È diversa dalla delega finta, dove la persona resta comunque responsabile di controllare, ricordare e correggere tutto.',
      esempio: '«Ci pensa lui» è delega vera solo se lui ci pensa davvero, fino in fondo, senza bisogno che tu controlli. Se dopo devi comunque verificare che l’abbia fatto, ricordarglielo e sistemare quello che ha sbagliato, quella non è delega: è un altro compito, con un passaggio in più, e a volte costa più di farlo da soli.\n\nÈ la stessa distinzione netta che il modello fa per il bonus protettivo (BP: l’aiuto concreto che entra nella formula): un aiuto conta solo se toglie davvero peso, non se lo promette soltanto.' },
    mini_settimana: {
      nome: 'La giornata e la mini-settimana', sigla: '',
      breve: 'I livelli di tempo che stanno fra la catena (i gesti in fila di un mattino) e la settimana intera. Mostrano quello che un gesto solo nasconde: l’accumulo, il recupero parziale, la ripetizione, il sovraccarico, i successi che costano più di quanto sembrino.',
      esempio: 'Una catena racconta una mattina, e una settimana racconta sette giorni con le notti in mezzo. Fra le due ci sta un giorno intero, o due o tre giorni vicini raccontati insieme: abbastanza lunghi da vedere un accumulo, troppo corti per vedere un regime (la condizione generale di un periodo).\n\nÈ il livello che risponde a una domanda precisa, quella che uno si fa la sera sul divano: oggi è stato un giorno pesante e basta, oppure è il terzo di fila? La differenza cambia tutto quello che conviene fare dopo.' },
    grezza: {
      nome: 'La probabilità grezza', sigla: 'Praw',
      breve: 'Il risultato della somma, prima del taglio ai bordi (la regola che tiene la probabilità fra 5 e 95). Se coincide con la probabilità finale, la scena stava già dentro i confini; se è diversa, il modello segnala un caso limite.',
      esempio: 'È come il totale scritto a matita in fondo alla lista della spesa, prima di arrotondarlo: quasi sempre coincide con il numero finale, e quando non coincide vale la pena chiedersi perché.\n\nUna probabilità grezza molto sotto zero o molto sopra cento, prima ancora di guardare il taglio, di solito vuol dire che da qualche parte una condizione è stata contata due volte: la stanchezza messa nel corpo e poi di nuovo nel punto di partenza, per esempio.' },
    peso_della_giornata: {
      nome: 'Il peso della giornata', sigla: 'k',
      breve: 'Quanto pesa un giorno intero, qualunque sia il numero di gesti con cui viene raccontato. Diviso per quanti gesti lo descrivono, dice quanto vale ciascuno.',
      esempio: 'Due persone raccontano la stessa giornata: una in sei gesti, l’altra in novantasei, perché ci ha messo più cura. Il giorno pesa uguale per tutte e due, e chi ha raccontato meglio non deve essere punito per averlo fatto: il peso si divide fra i gesti, e a ciascuno tocca la sua parte.\n\nIl valore non è stato scelto a occhio. Prima sono stati scritti sette criteri che il modello doveva rispettare, e poi si è cercato il numero che li soddisfa tutti insieme: vale circa 2,75. Si veda anche la voce «granularità».' },
    micro_frame: {
      nome: 'Il micro-frame', sigla: 'micro-frame',
      breve: 'Il pezzo più piccolo in cui si può spezzare una scena: un istante che da solo non è ancora un gesto, e non racconta niente.',
      esempio: 'Il nome viene dal fotogramma del cinema. Un fotogramma solo non è un movimento, è una fotografia: servono tanti fotogrammi vicini, uno dopo l’altro, perché nasca un gesto che si riconosce.\n\nSotto questa misura non c’è più niente da leggere, perché è il limite che segna dove finisce il taglio utile di una scena e comincia il nodo a vuoto (la riga che ripete la precedente senza aggiungere niente). I micro-frame vicini, messi insieme, fanno un cluster.' },
    motore: {
      nome: 'Il motore', sigla: '',
      breve: 'Il pezzo del programma che calcola, e non fa altro: riceve i dati della scena, applica la formula, tira il dado e restituisce il numero con la sua traccia. Non racconta e non consiglia: quello tocca a chi legge.',
      esempio: 'È come il motore di un’automobile: trasforma il carburante in movimento, ma non decide la strada, e non ti dice se stai andando nel posto giusto. Nei documenti tecnici del progetto ha anche un nome inglese, core, ma il libro e questo simulatore usano sempre la parola italiana.\n\nOgni pagina di questo pacchetto dichiara in fondo con quale file di motore ha calcolato quello che mostra, ed è la stessa promessa che il libro fa per sé e per il software.' },
    msnet: {
      nome: 'Il margine netto', sigla: 'MSnet',
      breve: 'Il margine di successo (di quanto il gesto era riuscito) dopo che il campo attivo (quello che reagisce mentre fai il gesto) ha fatto la sua parte: quanto resta della riuscita, una volta tolta la resistenza incontrata durante il gesto.',
      esempio: 'Una persona ha probabilità 68 e tira 52: il margine è 16, e il gesto passa. Ma se durante il tentativo il campo oppone una resistenza che vale 10, come il bambino che si mette a piangere proprio mentre chiudi la valigia, il margine netto scende a 6: il gesto passa ancora, ma è rimasto in bilico.\n\nSe la resistenza è più forte del margine che c’era, il margine netto diventa negativo, e quello che sembrava superato viene sporcato, o ribaltato del tutto. Si veda anche la voce «campo attivo».' },
    or1: {
      nome: 'Orientamento, ordine e ripartenza minima', sigla: 'or1',
      breve: 'Se la persona conserva ancora priorità leggibili: sa scegliere, sa chiedere aiuto, sa spezzare il compito in pezzi più piccoli quando serve.',
      esempio: 'È la differenza fra chi, sommerso da cose da fare, riesce comunque a dire «prima questa, poi quella, e quest’altra la chiedo a mia sorella», e chi guarda il mucchio e non trova più un ordine in niente.\n\nNon misura quanto è difficile la giornata: misura se la persona ha ancora in mano il timone, per quanto piccolo sia lo spazio di manovra rimasto. È uno dei valori che un recupero vero (una pausa dopo la quale qualcosa è cambiato) dovrebbe far risalire. Si veda anche la voce «recupero e riassetto».' },
    over_functioning: {
      nome: 'Il falso equilibrio', sigla: 'over-functioning',
      breve: 'Una situazione che da fuori sembra reggere solo perché una persona si consuma per tenerla in piedi. Un successo che si vede da fuori può diventare, dentro, una perdita.',
      esempio: 'È la persona che «tiene insieme tutto»: la casa, i figli, il lavoro dei colleghi che non ce la fanno, e a cui tutti dicono che è bravissima. Da fuori sembra un equilibrio. Da dentro è un conto che qualcuno paga da solo, e che nessuno vede finché non salta.\n\nNel modello è il motivo per cui una riuscita può uscire classificata come successo tossico (uno dei nove esiti: riuscito, ma nel modo sbagliato). Il compito è fatto, ma a tenerlo in piedi è stata una persona sola, che per farlo si è consumata.' },
    overlay: {
      nome: 'L’overlay', sigla: 'overlay',
      breve: 'Uno strato di lettura che si posa sopra la scena senza entrare nella formula: rischio fisico, relazionale, sanitario. Cambia le domande da fare e il tono del racconto, non il numero.',
      esempio: 'È come un filtro colorato messo sopra una fotografia: la foto sotto resta la stessa, con le stesse persone e le stesse cose, e cambia solo come la si guarda.\n\nSe una scena racconta un rischio fisico, l’overlay non tocca la probabilità del gesto, ma cambia le domande del questionario e il registro (il tono, più o meno disteso) con cui il resoconto la racconta. È un livello di lettura in più, non un decimo termine della formula.' },
    payload: {
      nome: 'Il payload', sigla: 'payload',
      breve: 'La struttura di dati che traduce una scena raccontata in parole nei numeri che il motore sa leggere. Non inventa niente: raccoglie quello che la taratura (la scelta dichiarata dei numeri che il libro non fissa) permette di stimare, e dichiara quello che resta incerto.',
      esempio: 'È come il modulo che compili prima di consegnarlo allo sportello: quello che avresti raccontato a voce all’impiegato diventa righe con un nome e un valore, pronte per essere lette da chi calcola.\n\nÈ un passaggio interno, fra la scena scritta e il calcolo. Sulle pagine di questo pacchetto non si vede, ma è lì che i nove numeri della taratura prendono la forma che la formula può usare.' },
    runner: {
      nome: 'Il runner', sigla: 'runner',
      breve: 'Lo strumento che esegue le simulazioni molto lunghe: centinaia di migliaia di giocate (partite intere di una scena), archiviate e riprendibili. Il motore calcola un gesto solo; il runner ne calcola cinquecentomila, e li conserva.',
      esempio: 'È come la differenza fra cucinare una cena per quattro e gestire una mensa da mille coperti. La ricetta è la stessa, ma la mensa ha bisogno di scorte, di turni e di un registro di quello che è già stato servito, e nessuno lo tiene a mente.\n\nIl runner non è fra le dodici pagine di questo pacchetto, perché serve a chi fa girare simulazioni da laboratorio, non a chi racconta una scena. Il libro lo nomina perché fa parte del progetto nel suo insieme, anche di quella metà che qui non si apre con un doppio clic.' },
    supporto_reale: {
      nome: 'Il supporto reale', sigla: '',
      breve: 'Un aiuto che riduce davvero il carico (la pressione accumulata), la complessità, il tempo, lo stress o l’isolamento del gesto. Non coincide automaticamente con la presenza di qualcuno o con il conforto che dà.',
      esempio: 'Qualcuno che finisce una parte del lavoro al posto tuo è supporto reale. Qualcuno seduto accanto, che non tocca niente ma ti fa compagnia mentre lo fai, scalda e basta, e va bene così, ma nella scena resta zero.\n\nNella formula del gesto singolo questo si chiama BP, protezione concreta e temporanea. Il supporto reale è la stessa idea guardata da più lontano, perché vale anche fuori da un gesto solo: la routine, la rete di persone, l’abitudine prudente che ci si porta addosso da uno stato all’altro.' },
    territori: {
      nome: 'I sette territori', sigla: '',
      breve: 'I sette gruppi con cui il libro ordina le situazioni di vita: cura personale e corpo, casa, digitale e burocrazia, lavoro e studio, mobilità, relazione, cura e fragilità. Non sono caselle rigide: sono direzioni di attenzione, e una scena può stare in due insieme.',
      esempio: 'Sono il nome leggibile delle quaranta famiglie di scena che il motore usa sotto: quelle hanno un codice, i territori un nome che si riconosce subito, come i quartieri di una città rispetto ai numeri civici.\n\nIl libro dichiara apertamente un limite. Il catalogo tecnico conta solo sei aree, perché la cura e la fragilità non hanno un’area tutta loro e restano dentro «coppia e famiglia», in una scheda sola. È una scelta difendibile, ma dichiarata, non una svista da correggere in silenzio.' }
  },

  /* I nove esiti, in parole comprensibili ------------------------------ *
   * «titolo» e' come il simulatore li chiama al lettore; «nelLibro» e' la
   * dicitura esatta con cui il Canone li nomina — trattino e virgola
   * compresi. Serve per cercarli nel libro e ritrovare il capitolo: il
   * pannello tecnico mostra quella, non l'identificatore col trattino basso,
   * che nel libro non compare nemmeno una volta.
   * _test/libro.js verifica che ognuna di queste diciture sia nel Canone.
   */
  esiti: {
    successo_pulito: {
      titolo: 'Riuscito, e senza costo', stato: 'buono', glifo: '✓',
      nelLibro: 'successo pulito',
      umano: 'È andata, e non ti è costato niente di importante. È il caso raro: vale la pena guardare in che condizioni è successo.',
      quando: 'Succede quando tutto tira dalla stessa parte: il margine (di quanto è andata bene) è ampio, il carico (la pressione accumulata) è basso, non c’è debito da insistenza e l’ambiente non mette i bastoni fra le ruote.' },
    successo_costoso_sostenibile: {
      titolo: 'Riuscito, ma ti è costato', stato: 'attenzione', glifo: '●',
      nelLibro: 'successo costoso sostenibile',
      umano: 'Ce l’hai fatta, e per farcela hai speso qualcosa. Va bene finché resta un’eccezione, meno se diventa il modo abituale.',
      quando: 'Succede quando il margine (di quanto è andata bene) è stretto, oppure quando il carico (la pressione accumulata) era già a metà scala, oppure quando, per riuscire, hai dovuto adattarti a qualcosa. Basta una delle tre.' },
    successo_danneggiato: {
      titolo: 'Riuscito, ma qualcosa si è rotto', stato: 'serio', glifo: '▲',
      nelLibro: 'successo danneggiato',
      umano: 'Il gesto è riuscito, e ti ha lasciato più stanco o più fragile di come eri prima di cominciare.',
      quando: 'Succede quando il risultato arriva, ma chi lo ha ottenuto sta peggio di prima: la cosa è fatta, e a farla ci si è lasciati qualcosa.' },
    successo_tossico: {
      titolo: 'Riuscito nel modo sbagliato', stato: 'critico', glifo: '✕',
      nelLibro: 'successo tossico',
      umano: 'Ha funzionato, ma solo perché ci hai messo tutto te stesso, consumandoti. Una riuscita così non è una buona notizia.',
      quando: 'Succede in tre casi: quando ti sei adattato oltre misura, quando l’aiuto che avevi era solo a parole, oppure quando adattarti ti è costato più di quanto valesse il risultato.' },
    successo_tecnico_fallimento_umano: {
      titolo: 'Il compito è fatto, la persona no', stato: 'critico', glifo: '✕',
      nelLibro: 'successo tecnico, fallimento umano',
      umano: 'Da fuori è andato tutto bene, da dentro no — e sono due cose che non coincidono quasi mai per caso.',
      quando: 'Succede quando il carico (la pressione accumulata) è altissimo e l’assetto (quanto sei ancora orientato) molto basso, e il gesto tentato non è una piccola azione di cura ma qualcosa che chiede di più.' },
    fallimento_lieve: {
      titolo: 'Non riuscito, ma di poco', stato: 'attenzione', glifo: '○',
      nelLibro: 'fallimento lieve',
      umano: 'È mancato per poco. Riprovare, con qualcosa di diverso intorno, ha buone probabilità di andare.',
      quando: 'Succede quando il dado (il numero tirato a caso) supera la probabilità, ma di poco, al massimo di quindici punti. Oltre quel confine il fallimento cambia nome.' },
    fallimento_tecnico: {
      titolo: 'Non riuscito', stato: 'serio', glifo: '○',
      nelLibro: 'fallimento tecnico',
      umano: 'Non è andata, e la ragione sta nelle condizioni di partenza: più sotto c’è scritto quali erano, e quali si possono cambiare.',
      quando: 'Succede quando il dado (il numero tirato a caso) supera la probabilità di parecchio, ma intorno il resto regge: sono mancate le condizioni del momento, mentre tutto il resto teneva, ed è questo che lo distingue dal fallimento sistemico.' },
    fallimento_sistemico: {
      titolo: 'Non riuscito, e il sistema regge male', stato: 'critico', glifo: '◆',
      nelLibro: 'fallimento sistemico',
      umano: 'Il problema non è questo gesto: è che tutto intorno era già teso. Riprovare allo stesso modo non porta da nessuna parte.',
      quando: 'Succede quando il gesto non riesce e intorno era già tutto teso: il carico (la pressione accumulata) alto, l’assetto (quanto sei ancora orientato) basso, e nessuna pausa vera che avesse rimesso le cose a posto.' },
    quasi_collasso: {
      titolo: 'Punto di rottura', stato: 'critico', glifo: '⚠',
      nelLibro: 'quasi-collasso',
      umano: 'Sono capitati insieme parecchi segnali gravi, ed è una combinazione rara. Qui non si tratta di riuscire meglio, ma di ridurre.',
      quando: 'Succede quando nella stessa scena capitano insieme cinque condizioni: il carico (la pressione accumulata) è oltre 85, l’assetto (quanto sei ancora orientato) è sotto 20, c’è un debito attivo (l’insistenza sulla strada che non funziona), non c’è stata nessuna riparazione e non c’è nessun aiuto vero. Devono esserci tutte e cinque, non una qualunque.' }
  },

  colori: { buono: 'var(--buono)', attenzione: 'var(--attenzione)', serio: 'var(--serio)', critico: 'var(--critico)' }
};

/* =============================================================================
   LE PAROLE CHE STANNO FUORI DA QUESTO FILE, E PERCHE'
   =============================================================================
   «TASSELLO» — non e' una voce, ed e' l'unica dei trentaquattro termini
   contati il 10/09/2026 che non lo e'.

   Le trenta occorrenze sono tutte della stessa specie: class="tassello" nel
   foglio di stile, una funzione tassello() in catena.js che costruisce quei
   riquadrini, il selettore .tassello in glossario.js che decide dove aprire la
   spiegazione. Cercandola nel testo che il lettore legge davvero — le pagine
   senza tag, e le stringhe di prosa dei moduli — la parola compare zero volte.
   Nessuno la legge mai: e' il nome di un mattoncino dell'interfaccia.

   E il Canone non la contiene: «tassell» ha zero occorrenze in tutto il libro.
   Scriverne una voce vorrebbe dire insegnare al lettore una parola che nel
   libro non ritrovera' mai — cioe' esattamente la divergenza che il controllo
   del vocabolario in _test/libro.js esiste per impedire.

   Se un giorno una pagina scrivesse «guarda il tassello del carico», allora la
   voce servirebbe: ma servirebbe di piu' cambiare la pagina, perche' quella
   non e' una parola del modello.

   -----------------------------------------------------------------------
   DA FARE FUORI DI QUI, e non e' dimenticanza: _test/libro.js tiene la tabella
   RADICI, che per ogni chiave di «parole» dichiara la radice da cercare nel
   Canone. Le trentatre' chiavi nuove vanno aggiunte li' dentro. Le radici sono
   state verificate una per una contro il Canone e ci sono tutte: il controllo
   passera' appena la tabella e' allineata. Quel file non appartiene a chi
   scrive le spiegazioni, e si tocca dalla sua parte.

   -----------------------------------------------------------------------
   AGGIORNAMENTO DEL 15/09/2026 — LE VENTIDUE VOCI DELL'APPARATO A
   Confrontando spiegazioni.js voce per voce con l'Apparato A del Canone
   («Glossario unificato») e con la sezione «Le parole del modello» in
   apertura del libro, mancavano ventidue voci. Sono state aggiunte qui sopra,
   nel blocco datato dentro «parole». _test/glossario.js porta ora un
   controllo che rilegge da solo l'elenco dei termini in grassetto del libro
   e pretende, per ognuno, o una voce qui o una riga in un elenco di
   esclusioni motivate — cosi' una settantunesima voce, il giorno che
   comparira' nel libro, non passera' inosservata.

   Tutte le chiavi nuove si ricavano da sole con la regola gia' scritta in
   RADICI (_test/libro.js): minuscolo, trattino basso reso spazio o
   trattino, eventualmente senza la desinenza. Tre concetti — il tetto di
   microvariazione, il livello fra la catena e la settimana, il peso della
   giornata — nel libro sono nominati con una parola in mezzo che la chiave
   letterale non avrebbe ritrovato («budget DI microvariazione», «giornata E
   mini-settimana», «il peso DI UNA giornata»). Per questo le chiavi qui
   sopra sono «microvariazione», «mini_settimana» e «peso_della_giornata»
   invece del nome piu' lungo che il titolo dell'Apparato A userebbe per
   intero: la parola scelta e' quella che la radice ritrova da sola, cosi'
   _test/libro.js non ha bisogno di una riga in piu' in RADICI. Verificato
   in Python con la stessa regola di radiciPossibili(), contro il Canone.
   ========================================================================== */
