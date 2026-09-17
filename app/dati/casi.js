/* =============================================================================
   SIMULATORE 3.0 — I casi pubblicati, con i numeri veri
   =============================================================================
   PERCHE' ESISTE

   Il simulatore sapeva calcolare qualunque cosa e non sapeva mostrare
   niente di gia' fatto. Chi apriva le pagine trovava dei cursori al centro
   e nessun esempio: doveva inventarsi una scena, dei numeri, e non aveva
   modo di sapere se li stava mettendo in un modo sensato.

   Il libro invece ha dodici schede di calcolo complete — capitolo 39,
   «Dodici calcoli completi» — con dati di partenza, formula applicata,
   risultato grezzo, valore finale e lettura. Non sono esempi inventati per
   il libro: sono le tarature con cui il modello e' stato provato.

   Qui dentro ci sono quelle dodici, piu' i due calcoli guidati del
   capitolo 5 e i sei margini del capitolo 9. Sono gli stessi numeri che
   _test/golden.js usa per dire che il motore riproduce le fonti: se un
   giorno il motore smettesse di riprodurli, il controllo fallirebbe prima
   che qualcuno veda a schermo un esempio sbagliato.

   REGOLA CHE VALE PER TUTTO IL FILE
   Il campo `pn` non e' una previsione: e' quello che c'e' stampato sulla
   pagina del libro. La pagina ESEMPI.html lo confronta con quello che il
   motore calcola adesso, e mostra i due numeri accanto. Se un giorno non
   coincidessero, si vedrebbe.

   IL CAMPO `titoloLibro`
   E' il titolo con cui il capitolo 39 intitola quella scheda, e serve a una
   cosa sola: ritrovare nel libro la formula gia' composta di quel calcolo
   (app/dati/formule.js, generato dal Canone). Il titolo che la pagina mostra
   puo' essere piu' chiaro di quello del libro — «Pratica online con il codice
   bloccato» invece di «Pratica online con OTP bloccato» — ma il collegamento
   con la fonte non si deve perdere. _test/casi.js verifica che ognuno di
   questi titoli sia davvero un titolo del capitolo 39.

   Due schede su dodici non hanno numeri, e restano senza. Sono le due che
   insegnano di piu': una perche' il calcolo va sospeso, l'altra perche' a
   quella scala risponderebbe alla domanda sbagliata.
   ========================================================================== */
(function (globale) {
  'use strict';

  /* --------------------------------------------------------------------
     LE DODICI SCHEDE DEL CAPITOLO 39
     -------------------------------------------------------------------- */
  var CASI = [
    {
      id: 'acqua',
      titoloLibro: 'Bere acqua dopo una giornata pesante',
      titolo: 'Bere acqua dopo una giornata pesante',
      territorio: 'Il corpo',
      scena: 'È sera, e una persona è arrivata fin qui con addosso una giornata lunga. Non è in crisi, non le è successo niente di grave: vuole soltanto alzarsi e bere un bicchiere d’acqua.',
      valori: { P0: 90, E: -5, I: 0, T: 0, M: 0, BP: 0, C: 1, STR: 62, DEB: 0 },
      praw: 'Praw = 90 − 5 − 5 − 10 = 70',
      pn: 70,
      decide: 'il carico persistente',
      conti: 'Bere un bicchiere d’acqua è un gesto che si sa fare a occhi chiusi, e infatti si parte da novanta. Da lì scendono cinque punti per il corpo, che è stanco. Altri cinque se ne vanno per la complessità, che qui vale uno, perché c’è una cosa sola da fare. La sottrazione più grossa arriva però dal carico persistente, cioè dalla pressione che ci si porta dietro dai giorni prima. A 62 cade nella fascia da dieci punti, e da solo pesa quanto gli altri due messi insieme.',
      lettura: 'Settanta non è un numero che preoccupa, ma non è nemmeno un numero neutro. Con un carico così alto conviene che il gesto costi il meno possibile, e che dopo le cose si calmino un po’. È un numero che dice una cosa semplice: riesce, e conviene che riesca in modo pulito, senza lasciare strascichi.',
      fonte: 'Canone, cap. 39 · Mega Canvas p. 256'
    },
    {
      id: 'otp',
      titoloLibro: 'Pratica online con OTP bloccato',
      titolo: 'Pratica online con il codice bloccato',
      territorio: 'Digitale e burocrazia',
      scena: 'Una pratica da fare online, e a un certo punto lo schermo chiede un codice di verifica. Il codice non arriva. Oppure arriva, lo si scrive, e l’applicazione lo rifiuta.',
      valori: { P0: 60, E: 0, I: -10, T: -5, M: -5, BP: 0, C: 3, STR: 55, DEB: 0 },
      praw: 'Praw = 60 − 10 − 5 − 5 − 15 − 5 = 20',
      pn: 20,
      decide: 'la complessità e la chiarezza',
      conti: 'Si parte da sessanta, perché una procedura del genere non è un gesto che si fa senza pensarci. Poi la chiarezza toglie dieci punti, dato che le istruzioni non spiegano niente. Tempo e ambiente ne tolgono cinque a testa. Quello che costa di più, però, sono i quindici punti della complessità, che qui vale tre: credenziale, codice e caricamento sono tre cose da tenere insieme davvero, non tre momenti dello stesso gesto. Restano gli ultimi cinque punti, e li toglie il carico a 55.',
      lettura: 'Venti su cento vuol dire che la scena parte quasi persa, e non è colpa di chi ci sta dentro. Se poi l’applicazione rifiuta il codice, quell’imprevisto entra dopo il tiro, non prima. Metterlo già dentro il venti vorrebbe dire punire due volte lo stesso ostacolo.',
      fonte: 'Canone, cap. 39 · Mega Canvas p. 258'
    },
    {
      id: 'coppia',
      titoloLibro: 'Dialogo di coppia teso',
      titolo: 'Dialogo di coppia teso',
      territorio: 'La relazione',
      scena: 'Una conversazione difficile fra due persone che stanno insieme, con un po’ di protezione intorno. Magari il momento è stato scelto con cura. Magari la premessa è stata detta bene, prima di entrare nel discorso.',
      valori: { P0: 55, E: 0, I: -5, T: 0, M: 0, BP: 5, C: 2, STR: 60, DEB: 0 },
      praw: 'Praw = 55 − 5 + 5 − 10 − 10 = 35',
      pn: 35,
      decide: 'la base bassa e il carico',
      conti: 'Un dialogo teso non è un gesto tecnico che riesce quasi sempre, e il punto di partenza lo dice: cinquantacinque. La chiarezza toglie cinque punti. La protezione ne restituisce cinque, ed è l’unico segno positivo di tutta la scheda. Poi scendono dieci punti di complessità, che qui vale due. Altri dieci se ne vanno per il carico a 60, che entra nella fascia giusto per un soffio.',
      lettura: 'Trentacinque è un numero fragile, e quello che serve dopo è una riparazione vera, non una pace apparente. Il motivo è che una conversazione può finire soltanto perché tutti e due sono troppo stanchi per continuare. Quella conversazione non è riuscita. È un successo tossico, e il modello deve saperlo chiamare per nome.',
      fonte: 'Canone, cap. 39 · Mega Canvas p. 260'
    },
    {
      id: 'deadline',
      titoloLibro: 'Deadline riuscita ma tossica',
      titolo: 'Una consegna riuscita, e tossica',
      territorio: 'Il lavoro e lo studio',
      scena: 'Una consegna importante, di quelle con una data segnata sul calendario. La porta a termine una persona che arriva a quel giorno già molto carica.',
      valori: { P0: 75, E: -10, I: 5, T: -15, M: 0, BP: 0, C: 3, STR: 82, DEB: 1 },
      praw: 'Praw = 75 − 10 + 5 − 15 − 15 − 20 − 5 = 15',
      pn: 15,
      decide: 'il carico, il debito, il tempo',
      conti: 'Si parte da settantacinque, perché la persona è competente. La chiarezza aggiunge altri cinque punti: sa bene che cosa deve consegnare. Da lì in poi scende tutto. Dieci punti per il corpo, quindici per il tempo stretto, quindici per la complessità e cinque per il debito. Ma il colpo vero lo dà il carico persistente, che a 82 sta nella penultima fascia e da solo toglie venti punti.',
      lettura: 'Quindici per cento, ed è il caso che spiega meglio di tutti perché il modello non misuri la bravura. La persona è preparata, sa che cosa fare, e si trova lo stesso davanti a quel numero. Se poi il dado dà un numero basso e la consegna arriva, il racconto non deve scrivere «vittoria». Deve dire che una prestazione è stata strappata a un sistema in rosso, cioè a una persona con il carico già in zona di pericolo.',
      fonte: 'Canone, cap. 39 · Mega Canvas p. 262'
    },
    {
      id: 'guida',
      titoloLibro: 'Guidare con sonnolenza',
      titolo: 'Guidare con sonnolenza',
      territorio: 'La mobilità',
      scena: 'È tardi, gli occhi si chiudono, e bisognerebbe mettersi al volante. Una persona troppo stanca per guidare, che sta per guidare lo stesso.',
      senza_calcolo: 'SafetyStop, e viene prima della formula.',
      pn: null,
      decide: 'nessun calcolo',
      lettura: 'Questa scheda esiste per dire che qui non si calcola. Davanti a una guida pericolosa il simulatore non deve cercare il modo migliore di riuscire. Deve guardare se conviene fermarsi, chiedere aiuto, rimandare, farsi accompagnare. Chi è troppo stanco per guidare e si chiede «con che probabilità arrivo a casa» si sta già facendo la domanda sbagliata. Un numero, qualunque numero, la farebbe sembrare più seria di quanto sia. Un simulatore che calcolasse qui produrrebbe un valore, e qualcuno lo leggerebbe come un permesso.',
      fonte: 'Canone, cap. 39 · Mega Canvas p. 264'
    },
    {
      id: 'cane',
      titoloLibro: 'Cane che tira alla porta',
      titolo: 'Cane che tira alla porta',
      territorio: 'La casa',
      scena: 'Uscire di casa con il cane, e il cane tira verso la porta. Non è un ostacolo fermo come una serratura che si incastra: è un essere vivo, e risponde a quello che fai.',
      valori: { P0: 80, E: -5, I: 0, T: -5, M: -5, BP: 0, C: 2, STR: 50, DEB: 0 },
      praw: 'Praw = 80 − 5 − 5 − 5 − 10 − 5 = 50',
      pn: 50,
      decide: 'la complessità, e poi il campo attivo',
      conti: 'Portare fuori il cane è un gesto che si conosce, e si comincia da ottanta. Poi il corpo un po’ stanco, il poco tempo e l’ambiente scomodo tolgono cinque punti ciascuno, e insieme ne portano via già quindici. La complessità ne toglie altri dieci, e il carico a 50 chiude il conto con altri cinque. Nessuna voce, da sola, pesa più delle altre. Sono cinque piccole sottrazioni che, messe insieme, dimezzano la scena.',
      lettura: 'Cinquanta, e il cane non è ancora entrato nel conto: questo numero descrive la scena senza lo strattone. Il cane arriva dopo, come campo attivo, e toglie margine a un esito che il dado ha già deciso. Un ambiente difficile sta dentro la formula. Qualcosa che risponde al tentativo, invece, sta fuori e agisce dopo.',
      fonte: 'Canone, cap. 39 · Mega Canvas p. 266'
    },
    {
      id: 'caregiver',
      titoloLibro: 'Caregiver che compensa tutti',
      titolo: 'Caregiver che compensa tutti',
      territorio: 'La cura e la fragilità',
      scena: 'Una persona tiene in piedi tutto un sistema da sola: i genitori anziani, i figli, la casa, il lavoro, gli appuntamenti, le telefonate. E nodo per nodo, gesto dopo gesto, ci riesce.',
      senza_calcolo: 'Nessun calcolo: non è un nodo, è una sequenza lunga.',
      pn: null,
      decide: 'la scala sbagliata',
      lettura: 'Se si calcolasse ogni singolo passaggio, verrebbero fuori probabilità decenti e una lunga fila di successi. Ma contare i nodi riusciti non basta. Bisogna guardare anche quanto quella persona regge al posto degli altri, e se esiste un minimo di riposo sotto cui non scende mai. Bisogna guardare se dopo gli sforzi il sistema ha il tempo di raffreddarsi, e se la delega è vera oppure soltanto dichiarata. Qui il modello non fallisce perché la formula sbaglia: fallisce se lo si legge alla scala sbagliata. La probabilità di ogni nodo è alta, eppure il carico cresce, l’assetto scende, e l’aiuto che tutti descrivono come presente non toglie peso a nessuno. Nessun numero di quella catena, preso da solo, contiene questa informazione. La contiene la traiettoria, cioè l’andamento nel tempo, che si vede giorno dopo giorno e non in un gesto solo.',
      fonte: 'Canone, cap. 39 · Mega Canvas p. 268'
    },
    {
      id: 'peso',
      titoloLibro: 'Oggetto pesante',
      titolo: 'Oggetto pesante',
      territorio: 'La casa',
      scena: 'Un mobile, uno scatolone, una cassa d’acqua: qualcosa di pesante da sollevare, da soli, in una giornata in cui il corpo non è al meglio e lo spazio intorno non aiuta.',
      valori: { P0: 40, E: -10, I: 0, T: 0, M: -10, BP: 0, C: 3, STR: 58, DEB: 0 },
      praw: 'Praw = 40 − 10 − 10 − 15 − 5 = 0  →  clamp 5',
      pn: 5,
      decide: 'la base bassa e la complessità',
      conti: 'Qui il punto di partenza è già basso, quaranta, perché sollevare un peso da soli è difficile anche in condizioni neutre. Da lì il corpo toglie dieci punti, l’ambiente altri dieci, la complessità quindici e il carico cinque. Sono quaranta punti tolti da quaranta. Il grezzo finisce a zero, e a rialzarlo fino a cinque è soltanto il taglio ai bordi.',
      lettura: 'La risposta è un aiuto concreto, oppure il gesto spezzato in più passaggi. È una risposta pratica, non un incoraggiamento: un cinque non chiede motivazione, chiede una seconda persona o un modo diverso di dividere il peso. Attenzione però al taglio ai bordi. Serve a evitare probabilità assurde, non a nascondere errori di taratura. Quando il grezzo scende molto sotto zero, quasi sempre c’è una variabile scritta due volte.',
      fonte: 'Canone, cap. 39 · Mega Canvas p. 270'
    },
    {
      id: 'messaggio',
      titoloLibro: 'Messaggio scritto sotto stress',
      titolo: 'Messaggio scritto sotto stress',
      territorio: 'La relazione',
      scena: 'Il telefono in mano, un messaggio da scrivere a qualcuno, e la persona che lo scrive è già tesa prima ancora di cominciare.',
      valori: { P0: 70, E: 0, I: -5, T: -5, M: 0, BP: 0, C: 2, STR: 68, DEB: 0 },
      praw: 'Praw = 70 − 5 − 5 − 10 − 10 = 40',
      pn: 40,
      decide: 'il carico persistente',
      conti: 'Settanta, per cominciare. Chiarezza e tempo tolgono cinque punti a testa. La complessità ne toglie dieci, e altri dieci se ne vanno per il carico a 68. Sono queste due ultime voci a decidere il risultato.',
      lettura: 'Quaranta lascia un margine fragile. Il rischio non è di non riuscire a scrivere: è di scrivere con il tono sbagliato. Conviene guardare che cosa in questa tabella non c’è. L’energia sta a zero, e vuol dire che il corpo, in questa scena, non è il problema. Quindi il fallimento, se arriva, non sarà mancanza di parole. Sarà un tono uscito storto da un sistema già acceso.',
      fonte: 'Canone, cap. 39 · Mega Canvas p. 272'
    },
    {
      id: 'supermercato',
      titoloLibro: 'Supermercato nuovo affollato',
      titolo: 'Supermercato nuovo affollato',
      territorio: 'La casa',
      scena: 'La spesa in un supermercato dove non si è mai stati, all’ora in cui c’è la fila a ogni cassa e non si trova niente.',
      valori: { P0: 75, E: -5, I: -10, T: -5, M: -10, BP: 0, C: 2, STR: 60, DEB: 0 },
      praw: 'Praw = 75 − 5 − 10 − 5 − 10 − 10 − 10 = 25',
      pn: 25,
      decide: 'l’ambiente e la chiarezza',
      conti: 'Fare la spesa non è difficile, e la base infatti è settantacinque: è la scena a renderla difficile. Il corpo toglie cinque punti e il tempo altri cinque, ma il grosso sta altrove. Se ne vanno dieci punti di chiarezza, perché il supermercato è nuovo e non si sa dov’è niente. Altri dieci li toglie l’ambiente, per la folla, e dieci la complessità. Gli ultimi dieci se ne vanno per il carico a 60. Quattro voci identiche, e da sole valgono quaranta punti.',
      lettura: 'Venticinque, e il commento è forse il più importante dei dodici. Quello che pesa non è l’incompetenza: sono il campo e l’informazione. C’è una persona che esce da questo supermercato senza metà delle cose, con la sensazione di non saper fare una cosa che fanno tutti. In realtà ha appena attraversato un nodo al venticinque per cento. E il modello serve a questo: a restituire alla scena il peso che la persona si era data.',
      fonte: 'Canone, cap. 39 · Mega Canvas p. 274'
    },
    {
      id: 'porta',
      titoloLibro: 'Porta bloccata con fretta',
      titolo: 'Porta bloccata con fretta',
      territorio: 'La casa',
      scena: 'Una porta che non si apre, la chiave che gira a vuoto, e intanto il tempo passa: bisognava già essere fuori.',
      valori: { P0: 85, E: 0, I: 0, T: -10, M: -10, BP: 0, C: 1, STR: 45, DEB: 0 },
      praw: 'Praw = 85 − 10 − 10 − 5 − 5 = 55',
      pn: 55,
      decide: 'il tempo e l’ambiente',
      conti: 'Aprire una porta è facile, e ottantacinque di base lo dicono. Poi la fretta toglie dieci punti di tempo, e la serratura, che è quella che è, ne toglie altri dieci di ambiente. Complessità e carico chiudono il conto con cinque punti a testa.',
      lettura: 'Cinquantacinque, e non è ancora finita. Se la serratura resiste, l’imprevisto arriva dopo, a contestare il tentativo. È la stessa struttura della scheda del cane, con un oggetto al posto di un animale. Degli ottantacinque punti di partenza ne restano cinquantacinque: le condizioni se ne sono mangiati trenta, e venti erano soltanto la fretta e la serratura.',
      fonte: 'Canone, cap. 39 · Mega Canvas p. 276'
    },
    {
      id: 'lezione',
      titoloLibro: 'Lezione da preparare stanchi',
      titolo: 'Lezione da preparare stanchi',
      territorio: 'Il lavoro e lo studio',
      scena: 'Un insegnante si siede alla scrivania la sera, con la lezione di domani da preparare, e ci arriva già in debito di sonno e di tempo. Vale per chiunque debba preparare qualcosa da spiegare ad altri.',
      valori: { P0: 75, E: -10, I: 5, T: -10, M: 0, BP: 0, C: 3, STR: 70, DEB: 1 },
      praw: 'Praw = 75 − 10 + 5 − 10 − 15 − 15 − 5 = 25',
      pn: 25,
      decide: 'il carico e la complessità',
      conti: 'Si comincia da settantacinque. L’unico segno positivo di tutta la scheda sono i cinque punti di chiarezza: sa bene che cosa deve preparare. Tutto il resto toglie. Dieci punti per il corpo, dieci per il tempo, quindici per la complessità, cinque per il debito. E quindici per il carico, che a 70 apre la fascia dei quindici punti. Bastava un punto di carico in meno, e la penalità sarebbe stata di dieci.',
      lettura: 'Venticinque: il successo è possibile, però costa parecchio. Questa scheda è quasi gemella della consegna tossica, con dieci punti di differenza e una lettura diversa. Là il carico era 82 e si parlava di rischio per la persona. Qui è 70, e si parla di costo. La severità del modello non funziona come un interruttore, acceso o spento. Passa per gradi, e i gradi sono le fasce.',
      fonte: 'Canone, cap. 39 · Mega Canvas p. 278'
    }
  ];

  /* --------------------------------------------------------------------
     I DUE CALCOLI GUIDATI DEL CAPITOLO 5
     Stesso nodo, due campi diversi. Sono l'esempio piu' citato del libro,
     e il secondo porta con se' una nota di onesta' che il libro stesso
     scrive: la fonte pone PenSTR = 12, un valore che sulla griglia a fasce
     {0,5,10,15,20,25} non esiste. Con la griglia il risultato e' 13.
     -------------------------------------------------------------------- */
  var CAPITOLO5 = [
    {
      id: 'sportello-buono',
      titolo: 'Il documento allo sportello — versione favorevole',
      scena: 'Andare a uno sportello a ritirare un documento già pronto. È una di quelle giornate in cui tutto aiuta: si è dormito, si sa dove andare, c’è tempo.',
      valori: { P0: 70, E: 5, I: 5, T: 2, M: 0, BP: 0, C: 1, STR: 50, DEB: 0 },
      praw: 'Praw = 70 + 5 + 5 + 2 + 0 + 0 − 5 − 5 = 72',
      pn: 72,
      decide: 'niente in particolare: nessun termine domina',
      conti: 'Settanta di base, perché il compito in sé è alla portata di chiunque. Poi quasi tutto aiuta. Il corpo ha buona energia, e vale cinque punti in più. La chiarezza ne vale altri cinque: sa dove andare, ha il documento e conosce l’orario. Il tempo ne aggiunge due, perché è sufficiente anche se non largo. L’ambiente è ordinario e una protezione non c’è, quindi zero e zero. Tolgono qualcosa soltanto la complessità, che vale uno e costa cinque punti, e il carico, che ne costa altri cinque senza mai dominare. Di debito non ce n’è.',
      lettura: 'È lo stesso identico nodo dell’altro esempio. Cambia soltanto il campo intorno, e il numero si sposta di cinquantanove punti. Più corta di così la dimostrazione non si fa: la formula non misura la persona, misura la scena in cui la persona si trova.',
      fonte: 'Canone, cap. 5'
    },
    {
      id: 'sportello-cattivo',
      titolo: 'Lo stesso nodo, un altro campo',
      scena: 'Lo stesso documento, lo stesso sportello, la stessa persona. Ma stavolta è una giornata in cui non aiuta niente: poco sonno, poco tempo, e la sala d’attesa piena.',
      valori: { P0: 70, E: -5, I: -8, T: -10, M: -4, BP: 0, C: 3, STR: 65, DEB: 1 },
      praw: 'Praw = 70 − 5 − 8 − 10 − 4 − 15 − 10 − 5 = 13',
      pn: 13,
      decide: 'tutto insieme',
      conti: 'P0 resta settanta, perché in astratto il compito è rimasto lo stesso. Tutto il resto però è cambiato. Il corpo stanco toglie cinque punti, e le informazioni, non più chiare, ne tolgono otto. Il tempo, diventato un ostacolo, ne toglie dieci, e l’ambiente affollato quattro. Di protezione non ce n’è. Poi la complessità sale a tre e costa quindici punti. Il carico a 65 ne toglie dieci, e l’unico punto di debito vale gli ultimi cinque.',
      nota: 'La prima edizione del libro stampava 11, perché poneva PenSTR = 12. Ma 12 sulla griglia a fasce {0, 5, 10, 15, 20, 25} non esiste: con un carico di 65 la penalità è 10, e il risultato canonico diventa 13. Il libro lo dichiara nell’Apparato F, e il simulatore segue la griglia.',
      lettura: 'Stesso gesto, stessa persona, stessa competenza. Settantadue in un caso, tredici nell’altro. Chi legge solo l’esito vede due persone diverse. Chi legge la formula vede due giornate diverse, ed è la stessa persona che le attraversa.',
      fonte: 'Canone, cap. 5 (con la nota dell’Apparato F)'
    }
  ];

  /* --------------------------------------------------------------------
     I MARGINI DEL CAPITOLO 9
     Non due esiti — riuscito, non riuscito — ma di quanto.
     (Diceva «capitolo 10», e il capitolo 10 e' un altro: e' K/Pd, cioe'
      l'imprevisto che entra dopo il dado. I margini stanno nel 9, come
      dicono ESEMPI.html e percorso.js.)
     -------------------------------------------------------------------- */
  var MARGINI = {
    fasce: [
      { da: 0,  a: 9,  nome: 'fragile',  spiega: 'è passata per un soffio, o mancata per un soffio. La prossima volta può andare al contrario senza che sia cambiato niente.' },
      { da: 10, a: 24, nome: 'normale',  spiega: 'la distanza è reale, ma non larga.' },
      { da: 25, a: 99, nome: 'forte',    spiega: 'la scena non era in bilico.' }
    ],
    casi: [
      { nome: 'Elena', pn: 67, tiri: [
        { tiro: 28, tipo: 'MS', margine: 39, fascia: 'forte' },
        { tiro: 65, tipo: 'MS', margine: 2,  fascia: 'fragile' },
        { tiro: 72, tipo: 'MF', margine: 5,  fascia: 'fragile' },
        { tiro: 94, tipo: 'MF', margine: 27, fascia: 'forte' }
      ],
        lettura: 'Quattro mattine, la stessa Elena, lo stesso Pn. Il secondo e il terzo tiro distano sette punti di dado e cadono da parti opposte: uno è riuscito, l’altro no, ed era la stessa mattina, con la stessa persona. Il margine dice che la differenza fra i due non è competenza. È il dado, e basta.' },
      { nome: 'Un messaggio semplice', pn: 75, tiri: [
        { tiro: 32, tipo: 'MS', margine: 43, fascia: 'forte' },
        { tiro: 73, tipo: 'MS', margine: 2,  fascia: 'fragile' }
      ],
        lettura: 'Due riuscite, e non si somigliano per niente. La prima è un messaggio scritto e mandato senza pensarci. La seconda è lo stesso messaggio, passato però per due punti soltanto, come un treno preso mentre le porte si chiudono. Ecco perché il margine conta più dell’esito: è lui a dire se domani conviene rifare la stessa cosa nello stesso modo.' }
    ]
  };

  var API = { CASI: CASI, CAPITOLO5: CAPITOLO5, MARGINI: MARGINI };
  globale.Casi = API;
  if (typeof module !== 'undefined' && module.exports) { module.exports = API; }
}(typeof window !== 'undefined' ? window : this));
