/* =============================================================================
   SIMULATORE 3.0 — Il lessico della scena: dalle parole ai nodi
   =============================================================================
   PERCHE' ESISTE

   Il modo naturale di descrivere una mattina e' raccontarla: «non ho dormito,
   mi alzo, cerco le chiavi e non le trovo, esco di corsa». Il simulatore
   chiedeva invece di scriverla gia' smontata, un gesto per riga, e di dare a
   tutti i gesti gli stessi numeri con dei cursori. Sono due cose diverse: la
   seconda e' gia' un'analisi fatta a mano.

   Questo file e' il vocabolario che permette al simulatore di fare il primo
   pezzo di lavoro: riconoscere nel racconto DOVE finisce un gesto e ne
   comincia un altro, e QUALI condizioni la persona sta dichiarando.

   ⚠️ IL TESTO SUGGERISCE, NON CALCOLA
   E' la stessa regola gia' scritta per le condizioni ambientali estreme
   [`app/dati/condizioni-ambientali.js`] e per le quaranta famiglie
   [`app/dati/famiglie.js`]: «orientano, non aggiungono punteggi automatici».
   Qui vale identica. Ogni numero che esce da questo file e' una PROPOSTA
   che compare a schermo con accanto la parola che l'ha prodotta, e che la
   persona conferma o cambia. Dal momento in cui la cambia, vince lei.

   NON E' IA
   E' una tabella statica. La stessa scena da' sempre la stessa proposta,
   oggi come fra dieci anni, offline, e un test la puo' verificare riga per
   riga. Nessuna chiamata a nessun servizio, nessun modello addestrato,
   nessuna sorpresa.

   ⚠️ E NON E' CANONE
   Le magnitudini proposte qui sotto NON vengono dal libro: il libro non
   contiene un vocabolario italiano. Sono una scelta di questa
   implementazione, dichiarata qui, e per questo ogni voce porta con se' il
   motivo. Chi non e' d'accordo cambia il numero a schermo, e il calcolo lo
   segue.

   IL DOMICILIO UNICO, APPLICATO ALLE PAROLE            [libro, capitolo 18]
   Ogni fatto entra nel calcolo UNA VOLTA SOLA, nel posto dove produce il
   suo effetto principale. Per questo ogni voce del vocabolario dichiara una
   variabile sola. «Non ho dormito» tocca il corpo, non anche la fretta e la
   complessita'. Se una parola sembrasse toccarne due, il vocabolario sceglie
   la principale e lo dice nella nota.
   ========================================================================== */
(function (globale) {
  'use strict';

  /* ---------------------------------------------------------------------
     LE AZIONI — dove comincia e finisce un nodo
     ---------------------------------------------------------------------
     Un nodo e' un gesto con un inizio e una fine. Nel racconto si riconosce
     da un verbo d'azione. Le quattro classi non sono un giudizio sulla
     difficolta' della vita: sono quanto quel gesto e' fattibile IN SE', in
     condizioni ordinarie — cioe' esattamente quello che il libro chiama P0.

     I valori di P0 proposti stanno nelle fasce che il capitolo 39 usa nelle
     sue schede: gesti notissimi intorno a 85-90, gesti ordinari 70-80,
     procedure 55-65, gesti difficili 40-50. Non sono inventati qui: sono
     letti da li'.

     `pezzi` e' la complessita' tipica di quel gesto — quanti coordinamenti
     veri richiede — e anche questa si somma a quello che il testo aggiunge. */
  var CLASSI = {
    automatico: { p0: 88, pezzi: 0,
      nota: 'Gesto notissimo, fatto migliaia di volte. In condizioni normali riesce quasi sempre.' },
    ordinario:  { p0: 76, pezzi: 1,
      nota: 'Gesto comune, ma non automatico. Chiede un minimo di attenzione.' },
    procedura:  { p0: 58, pezzi: 2,
      nota: 'Non è un gesto solo: è una procedura con più passaggi da tenere insieme.' },
    difficile:  { p0: 45, pezzi: 2,
      nota: 'Gesto difficile in sé, anche con le condizioni buone.' }
  };

  /* I verbi si scrivono alla radice: il riconoscimento e' per prefisso, cosi'
     «alzo», «alzarsi», «alzata» cadono tutti sullo stesso verbo senza dover
     elencare le coniugazioni. E' grossolano, ed e' voluto: un analizzatore
     morfologico completo sarebbe una libreria, e questo pacchetto non ne ha. */
  var AZIONI = [
    /* --- corpo e cura, i gesti piu' automatici --- */
    { radici: ['alz', 'sieder', 'siedo', 'sedermi'], nome: 'alzarsi o sedersi', classe: 'automatico' },
    { radici: ['bev', 'bere', 'bevut'], nome: 'bere', classe: 'automatico' },
    { radici: ['mangi', 'colazion', 'pranz', 'cena$', 'ceno$', 'cene$', 'cenar', 'cenat', 'ceniam', 'cenav', 'cenand'], nome: 'mangiare', classe: 'automatico' },
    /* «LAVORO» NON E' «LAVARSI» (11/11/2026). La radice «lav» prendeva anche
       «lavoro» e «lavorare», e «lavoro al computer» diventava un gesto
       notissimo da 88. Questa voce sta PRIMA di quella, e la precede: fra due
       radici vince la prima che si trova. La classe e' quella ordinaria, la
       piu' neutra, la stessa che la grammatica avrebbe dato da sola. */
    { radici: ['lavor'], nome: 'lavorare', classe: 'ordinario' },
    { radici: ['lav'], nome: 'lavarsi', classe: 'automatico' },
    { radici: ['vest', 'infil'], nome: 'vestirsi', classe: 'ordinario' },
    { radici: ['denti$', 'dente$'], nome: 'lavarsi i denti', classe: 'automatico' },
    { radici: ['respir'], nome: 'respirare', classe: 'automatico' },
    { radici: ['pausa', 'ferm', 'sosta$', 'sosto$', 'sostar', 'sostat', 'sostiam'], nome: 'fermarsi', classe: 'automatico' },
    { radici: ['medicin', 'farmac', 'pastigl'], nome: 'prendere una medicina', classe: 'ordinario' },

    /* --- I VERBI AGGIUNTI IL 10/09/2026, E PERCHE' ---------------------
       Igor ha scritto una scena di quattro gesti: «Ho mangiato e sono stanco.
       Mi alzo dalla sedia, sparecchio la tavola, vado in bagno e mi lavo i
       denti.» Il vocabolario non conosceva «sparecchiare», e la conseguenza
       non e' stata un avviso: e' stata che quel pezzo, non avendo un verbo
       riconosciuto, si e' attaccato al gesto precedente. Quattro gesti letti
       come tre, senza che niente lo dicesse.

       E' il difetto tipico di un vocabolario fisso: non sbaglia rumorosamente,
       sparisce in silenzio. L'unica difesa e' allargarlo dove la vita e' piu'
       fitta — la casa, il corpo, la cura, le pratiche — sapendo che completo
       non sara' mai. Chi scrive una scena e non si ritrova un gesto puo'
       sempre correggere a mano: il bottone «è un gesto» esiste per questo. */
    { radici: ['sparecchi', 'apparecchi'], nome: 'sparecchiare o apparecchiare', classe: 'automatico' },
    { radici: ['asciug'], nome: 'asciugare', classe: 'automatico' },
    { radici: ['pettin', 'spazzol'], nome: 'pettinarsi', classe: 'automatico' },
    { radici: ['sciacqu', 'strofin'], nome: 'sciacquare o strofinare', classe: 'automatico' },
    { radici: ['pieg', 'ripon'], nome: 'piegare o riporre', classe: 'automatico' },
    { radici: ['svuot', 'riempi'], nome: 'svuotare o riempire', classe: 'automatico' },
    { radici: ['spolver', 'innaffi', 'annaffi'], nome: 'spolverare o innaffiare', classe: 'automatico' },
    { radici: ['rimbocc'], nome: 'rimboccare o rifare il letto', classe: 'automatico' },
    { radici: ['tagli', 'mescol'], nome: 'tagliare o mescolare', classe: 'ordinario' },
    { radici: ['solev', 'trascin'], nome: 'sollevare o trascinare', classe: 'difficile' },
    { radici: ['avvit', 'ripar'], nome: 'riparare qualcosa', classe: 'procedura' },
    { radici: ['medic', 'fasci'], nome: 'medicare', classe: 'ordinario' },
    { radici: ['pesar', 'pesat', 'pesav', 'misur'], nome: 'misurare o pesare', classe: 'ordinario' },
    { radici: ['imbuc'], nome: 'imbucare', classe: 'automatico' },
    { radici: ['avvis'], nome: 'avvisare qualcuno', classe: 'ordinario' },
    { radici: ['abbracci'], nome: 'abbracciare', classe: 'automatico' },
    { radici: ['ricord'], nome: 'ricordarsi di qualcosa', classe: 'ordinario' },

    /* --- casa e oggetti --- */
    { radici: ['cerc'], nome: 'cercare qualcosa', classe: 'ordinario' },
    { radici: ['trov'], nome: 'trovare qualcosa', classe: 'ordinario' },
    { radici: ['rovist', 'frug'], nome: 'rovistare', classe: 'ordinario' },
    { radici: ['prend', 'pigli', 'preso$', 'presa$', 'presi$', 'prese$'], nome: 'prendere qualcosa', classe: 'automatico' },
    { radici: ['apro$', 'apri$', 'apre$', 'aprono$', 'aprir', 'apriv', 'apriam', 'aprend', 'apert'], nome: 'aprire', classe: 'automatico' },
    { radici: ['chiud', 'chius'], nome: 'chiudere', classe: 'automatico' },
    { radici: ['spegn', 'spent', 'accend', 'acceso$', 'accesa$', 'accesi$', 'accese$'], nome: 'spegnere o accendere', classe: 'automatico' },
    { radici: ['prepar'], nome: 'preparare qualcosa', classe: 'ordinario' },
    { radici: ['metter', 'metto$', 'mette$', 'mettiam', 'mettev', 'mettend', 'messo$', 'messa$', 'messi$', 'messe$'], nome: 'mettere a posto', classe: 'ordinario' },
    { radici: ['pulisc', 'pulir', 'pulit', 'puliv', 'puliam', 'pulend', 'riordin', 'sistem'], nome: 'pulire o riordinare', classe: 'ordinario' },
    { radici: ['sollev', 'spost'], nome: 'sollevare o spostare', classe: 'difficile' },
    { radici: ['cucin'], nome: 'cucinare', classe: 'procedura' },
    { radici: ['lavatric', 'bucat', 'stend'], nome: 'fare il bucato', classe: 'procedura' },

    /* --- mobilita' --- */
    { radici: ['esc', 'usc'], nome: 'uscire', classe: 'ordinario' },
    { radici: ['entro$', 'entri$', 'entra$', 'entrano$', 'entrar', 'entrat', 'entriam', 'entrav', 'entrand'], nome: 'entrare', classe: 'automatico' },
    { radici: ['scend', 'sceso$', 'scesa$', 'scesi$', 'scese$'], nome: 'scendere', classe: 'automatico' },
    { radici: ['salgo$', 'sali$', 'sale$', 'salgono$', 'salir', 'salit', 'saliv', 'saliam', 'salend'], nome: 'salire', classe: 'automatico' },
    { radici: ['cammin', 'vado', 'andare', 'and'], nome: 'andare da qualche parte', classe: 'ordinario' },
    { radici: ['corro$', 'corri$', 'corre$', 'correr', 'corriam', 'correv', 'corrend', 'corso$', 'corsi$'], nome: 'correre', classe: 'ordinario' },
    { radici: ['guid'], nome: 'guidare', classe: 'procedura' },
    { radici: ['parcheggi'], nome: 'parcheggiare', classe: 'ordinario' },
    { radici: ['attravers'], nome: 'attraversare', classe: 'ordinario' },
    { radici: ['aspett', 'attend'], nome: 'aspettare', classe: 'automatico' },

    /* --- digitale e burocrazia --- */
    { radici: ['scriv', 'scritt'], nome: 'scrivere', classe: 'ordinario' },
    { radici: ['mand', 'invio$', 'invia$', 'inviar', 'inviat', 'inviam', 'inviav', 'inviand', 'spedi'], nome: 'mandare qualcosa', classe: 'ordinario' },
    { radici: ['chiam', 'telefon'], nome: 'chiamare qualcuno', classe: 'ordinario' },
    { radici: ['rispond', 'rispos'], nome: 'rispondere', classe: 'ordinario' },
    { radici: ['compil'], nome: 'compilare un modulo', classe: 'procedura' },
    { radici: ['carica', 'caric'], nome: 'caricare un documento', classe: 'procedura' },
    { radici: ['pago$', 'paga$', 'paghi$', 'pagar', 'pagat', 'pagav', 'paghiam', 'pagand', 'pagher'], nome: 'pagare', classe: 'procedura' },
    { radici: ['prenot'], nome: 'prenotare', classe: 'procedura' },
    { radici: ['stamp'], nome: 'stampare', classe: 'ordinario' },
    { radici: ['leggo$', 'leggi$', 'legge$', 'leggere$', 'leggerl', 'leggiam', 'leggev', 'leggend', 'letto$', 'letta$', 'letti$', 'lette$'], nome: 'leggere', classe: 'ordinario' },
    { radici: ['controll', 'verific'], nome: 'controllare', classe: 'ordinario' },
    { radici: ['acced', 'login'], nome: 'accedere a un servizio', classe: 'procedura' },
    { radici: ['scaric'], nome: 'scaricare qualcosa', classe: 'ordinario' },
    { radici: ['allego$', 'allega$', 'allegar', 'allegat', 'alleghiam', 'allegav', 'allegand'], nome: 'allegare un documento', classe: 'procedura' },
    { radici: ['firm'], nome: 'firmare', classe: 'ordinario' },
    { radici: ['attivo$', 'attiva$', 'attivar', 'attivat', 'attiviam', 'attivav', 'attivand'], nome: 'attivare qualcosa', classe: 'procedura' },
    /* riprovare e' un gesto, e insieme il segnale del debito: il verbo lo
       rende un nodo, il vocabolario delle condizioni gli fa proporre DEB.
       Le due cose non si contendono niente — una decide dove taglia il
       racconto, l'altra che cosa dichiara sulla persona. */
    { radici: ['riprov', 'ritent'], nome: 'riprovare', classe: 'ordinario' },
    { radici: ['cambi'], nome: 'cambiare qualcosa', classe: 'ordinario' },

    /* --- lavoro e studio --- */
    { radici: ['consegn'], nome: 'consegnare', classe: 'procedura' },
    { radici: ['studi', 'ripass'], nome: 'studiare', classe: 'procedura' },
    { radici: ['spieg', 'lezion'], nome: 'spiegare o preparare una lezione', classe: 'procedura' },
    { radici: ['riunion'], nome: 'stare in riunione', classe: 'procedura' },
    { radici: ['organizz', 'pianific'], nome: 'organizzare', classe: 'procedura' },

    /* --- relazione e cura --- */
    { radici: ['parl', 'dico$', 'dici$', 'dice$', 'diciam', 'dicev', 'dicend', 'dire$', 'dirl', 'dirg', 'dirm', 'dirt', 'dirc', 'detto$', 'detta$', 'dissi$'], nome: 'parlare con qualcuno', classe: 'ordinario' },
    { radici: ['discut', 'discuss', 'litig'], nome: 'discutere', classe: 'difficile' },
    { radici: ['chieder', 'chied', 'chiest'], nome: 'chiedere qualcosa', classe: 'ordinario' },
    { radici: ['aiut'], nome: 'aiutare qualcuno', classe: 'ordinario' },
    { radici: ['accompagn'], nome: 'accompagnare qualcuno', classe: 'ordinario' },
    { radici: ['saluto$', 'saluta$', 'salutar', 'salutat', 'salutiam', 'salutav', 'salutand'], nome: 'salutare', classe: 'automatico' },
    { radici: ['sposto$', 'sposta$', 'spostar', 'spostat', 'spostiam', 'spostav', 'spostand'], nome: 'spostare qualcuno o qualcosa', classe: 'ordinario' },
    { radici: ['convinc', 'convint'], nome: 'convincere qualcuno', classe: 'difficile' },
    { radici: ['ascolt'], nome: 'ascoltare qualcuno', classe: 'ordinario' },
    { radici: ['guard'], nome: 'guardare qualcosa', classe: 'automatico' },
    { radici: ['ringrazi', 'scus'], nome: 'ringraziare o scusarsi', classe: 'ordinario' },

    /* --- altri gesti di casa e di strada --- */
    { radici: ['svegli'], nome: 'svegliarsi o svegliare', classe: 'automatico' },
    { radici: ['togli', 'tolg', 'tolt'], nome: 'togliere qualcosa', classe: 'automatico' },
    { radici: ['butt', 'gett'], nome: 'buttare via', classe: 'automatico' },
    { radici: ['raccogl', 'raccolg', 'raccolt'], nome: 'raccogliere qualcosa', classe: 'ordinario' },
    { radici: ['stir'], nome: 'stirare', classe: 'ordinario' },
    { radici: ['annaff'], nome: 'annaffiare', classe: 'automatico' },
    { radici: ['spingi', 'sping', 'spint'], nome: 'spingere qualcosa', classe: 'ordinario' },
    { radici: ['torn', 'rientr'], nome: 'tornare', classe: 'ordinario' },
    { radici: ['arriv'], nome: 'arrivare', classe: 'ordinario' },
    { radici: ['ricominc'], nome: 'ricominciare', classe: 'ordinario' },
    { radici: ['compro$', 'compra$', 'compri$', 'comprar', 'comprat', 'compriam', 'comprav', 'comprand', 'comprer', 'acquist'], nome: 'comprare qualcosa', classe: 'ordinario' },
    { radici: ['ordina', 'ordino'], nome: 'ordinare qualcosa', classe: 'ordinario' },

    /* --- altri gesti di procedura --- */
    { radici: ['ritir'], nome: 'ritirare un documento', classe: 'ordinario' },
    { radici: ['restitu'], nome: 'restituire qualcosa', classe: 'ordinario' },
    { radici: ['rinnov'], nome: 'rinnovare una pratica', classe: 'procedura' },
    { radici: ['disdi'], nome: 'disdire qualcosa', classe: 'procedura' },
    { radici: ['iscriv', 'iscriz'], nome: 'iscriversi', classe: 'procedura' },
    { radici: ['registr'], nome: 'registrarsi', classe: 'procedura' },
    { radici: ['conferm'], nome: 'confermare', classe: 'ordinario' },
    { radici: ['annull', 'cancell'], nome: 'annullare qualcosa', classe: 'ordinario' },
    { radici: ['inoltr'], nome: 'inoltrare qualcosa', classe: 'ordinario' },
    { radici: ['consult'], nome: 'consultare qualcosa', classe: 'ordinario' },
    { radici: ['timbr'], nome: 'timbrare', classe: 'ordinario' },
    { radici: ['misur'], nome: 'misurare qualcosa', classe: 'ordinario' },

    /* --- gesti di decisione: costano piu' di quanto sembri --- */
    { radici: ['scegl', 'scelg', 'scelt'], nome: 'scegliere', classe: 'ordinario' },
    { radici: ['decid', 'deciso$', 'decisa$'], nome: 'decidere', classe: 'difficile' },
    { radici: ['insegn'], nome: 'insegnare', classe: 'procedura' },
    { radici: ['presento$', 'presenta$', 'presentar', 'presentat', 'presentiam', 'presentav', 'presentand', 'presentazion'], nome: 'presentare qualcosa', classe: 'procedura' }
  ];

  /* ---------------------------------------------------------------------
     LE CONDIZIONI — quello che la scena dichiara sulla persona
     ---------------------------------------------------------------------
     Ogni voce tocca UNA variabile sola: e' il domicilio unico del capitolo
     18, applicato alle parole. Il `valore` e' la proposta, il `perche'` e' la
     riga che comparira' a schermo accanto al numero.

     Le magnitudini restano piccole di proposito. Il vocabolario non sa
     quanto e' grave una cosa: sa che e' stata nominata. Chi legge la scena
     sa quanto e' grave, e correggera'.

     LA SCALA DEI PESI, E DA DOVE VIENE  (13/11/2026)
     Fino a ieri ogni fatto valeva fra sei e dieci punti. Non era una scala
     scelta: era cresciuta voce per voce. Messa accanto al libro si e' visto
     che cosa faceva. La frase con cui si apre il capitolo 18 — «Sono stanca,
     ho dormito male, ho mal di schiena e devo fare questa cosa entro domani»
     — letta da qui perdeva trenta punti fra corpo e tempo. La tabella dello
     stesso capitolo, per il mal di schiena e la scadenza, ne toglie quattro
     e quattro. Il lettore stava piu' vicino al «disastro silenzioso» che il
     capitolo descrive che alla lettura disciplinata che propone.

     Il libro usa due scale: quattro punti per fatto nel capitolo 18, cinque
     o dieci nelle schede del capitolo 39, che pero' sono casi tarati da una
     persona che conosce la scena. Un vocabolario non la conosce: sa solo che
     una parola e' stata detta. Per questo prende la scala piu' sobria, che
     e' anche quella misurata — nei cinquecento nodi del capitolo 6 l'energia
     si muove fra −7 e −2, il tempo fra −4 e 0. Proposta a Igor il
     13/11/2026, che ha detto di procedere.

       4   un fatto detto chiaro: il dolore, la fretta, la stanchezza, la
           folla, l'ansia, una cosa che non funziona        [cap. 18: 4 e 4]
       5   la notte senza sonno, che e' la piu' forte delle due voci del
           riposo, e l'aiuto vero                [cap. 39: E −5, BP 5]
       3   quello che disturba senza fermare: istruzioni poco chiare, la
           prima volta, il rumore, la fame, la distrazione   [cap. 18: 3]
       2   il contorno: la luce, la pioggia, il disordine, le notifiche
       3   i fatti a favore: riposato, con calma, tutto pronto, so come si fa

     Dieci non lo propone nessuna voce. Dieci e' il peso di un fatto che
     domina la scena, e questo lo sa chi la racconta: lo mette a mano.

     DUE SEGNI NUOVI SULLE VOCI
       `diScena`   la voce descrive la persona — il sonno, il dolore, la fame,
                   l'ansia, l'alcol — e allora vale per tutti i gesti, anche
                   se e' stata detta dentro un gesto solo. «Mi sono svegliato
                   tardi perche' ho fatto le due»: il sonno perso non pesa
                   solo sul risveglio. E' il corpo di tutta la giornata.
       `ambiente`  la voce descrive il posto — la folla, il rumore, il buio,
                   il disordine. Una frase come «l'ambiente e' rumoroso»,
                   detta in coda a un gesto, vale per la scena e non resta
                   attaccata a quel gesto [app/motore/scena.js,
                   eFraseDiStato]. Una cosa che non funziona o non si trova
                   resta invece del gesto in cui e' detta.

     LE VOCI AGGIUNTE L'11/11/2026, E LA REGOLA CON CUI SONO STATE AGGIUNTE
     Il banco dei racconti (`_taratura/racconti-banco.js`) ha misurato che
     due condizioni su tre non venivano viste: mancavano le parole di tutti
     i giorni — «distrutto», «poco tempo», «mi gira la testa», «traffico».
     Sono state aggiunte come SINONIMI dentro le case che c'erano gia', con
     il valore che quella casa aveva. Nessuna magnitudine nuova: dove serviva
     una voce a parte (lo stress dichiarato, l'alcol) ha preso il valore
     della voce vicina nella stessa variabile, e lo dice nel suo perche'.

     Tre attrezzi nuovi, usati con parsimonia:
       `modelli`  dove cambia un numero e non la frase: «da tre settimane»,
                  «tra dieci minuti», «ho dormito quattro ore»;
       `causa`    le voci con la stessa causa contano una volta sola, e vince
                  la piu' forte: stanchezza e sonno scarso sono un fatto, non
                  due [capitolo 18];
       `assorbe`  una voce che, quando compare nella stessa frase, si prende
                  la casa di un'altra: «non dormo DA TRE SETTIMANE» e' carico
                  persistente, non energia di adesso [capitolo 18, tabella
                  dei domicili]. */
  var CONDIZIONI = [
    /* --- E, il corpo adesso --- */
    { chiavi: ['non ho dormito', 'non ho chiuso occhio', 'insonne', 'sveglio tutta la notte',
               'dormito poco', 'poche ore di sonno', 'notte in bianco',
               'dormito male', 'dormo male', 'dormito pochissimo', 'non dormo',
               'non riesco a dormire', 'ore piccole', 'nottataccia', 'morto di sonno',
               'casco dal sonno', 'crollo dal sonno', 'assonnat'],
      modelli: [/\b(?:dormito|dormo) (?:solo |appena |neanche |nemmeno |a malapena )?(?:un|una|due|tre|quattro|cinque|1|2|3|4|5) or[ae]\b/,
                /\b(?:ho|abbiamo|avevo) fatto le (?:una|due|tre|quattro|cinque)\b/],
      causa: 'riposo',
      variabile: 'E', valore: -5, id: 'sonno', diScena: true,
      perche: 'Il sonno mancato tocca il corpo adesso. Se dura da giorni va spostato anche sul carico, ma non contato due volte qui.' },
    { chiavi: ['stanc', 'esaust', 'sfinit', 'a pezzi', 'non ne posso più',
               'non ne potevo più', 'distrutt', 'stremat', 'spossat', 'sfiancat',
               'senza forze', 'non ho la forza', 'non ho avuto la forza',
               'non avevo la forza', 'non ho più forze', 'sono cotto', 'sono cotta',
               'ero cotto', 'ero cotta'],
      causa: 'riposo',
      variabile: 'E', valore: -4, id: 'stanchezza', diScena: true,
      perche: 'La stanchezza è detta apertamente, e riguarda il corpo di questo momento. ' +
              'Se dura da giorni, il posto giusto è il carico, non questo.' },
    { chiavi: ['mal di testa', 'mal di schiena', 'dolore', 'dolorant', 'febbre', 'influenz',
               'nausea', 'storto',
               'mi fa male', 'mi fanno male', 'male al', 'male alla', 'male allo',
               'male ai', 'male alle', 'male agli', 'mal di pancia', 'mal di denti',
               'mal di gola', 'mal di stomaco', 'mi gira la testa', 'giramento',
               'giramenti', 'capogir', 'vertigin', 'raffredd', 'tosse', 'ferit',
               'frattur', 'crampo', 'crampi', 'occhi che bruciano',
               'mi bruciano gli occhi', 'bruciore', 'mi tremano', 'tremo', 'vomit',
               'emicrania', 'cervicale', 'indolenzit', 'acciaccat', 'debolezza',
               'mi sento male', 'sto male', 'stavo male', 'non sto bene',
               'non mi sento bene'],
      variabile: 'E', valore: -4, id: 'malessere', diScena: true,
      perche: 'Il dolore e il malessere si prendono una parte delle forze. Lo fanno ' +
              'prima ancora che il gesto cominci. Quello che resta è meno di quello che ' +
              'sembra.' },
    { chiavi: ['riposat', 'ho dormito bene', 'in forma', 'pieno di energia',
               'mi sento bene', 'sto bene', 'in gran forma', 'dormito benissimo',
               'una bella dormita', 'pieno di forze', 'piena di energia', 'piena di forze'],
      modelli: [/\bdormito (?:ben |quasi )?(?:otto|nove|dieci|undici|dodici|8|9|10) ore\b/],
      variabile: 'E', valore: 3, id: 'riposato', diScena: true,
      perche: 'Il corpo, oggi, aiuta. È una condizione favorevole detta apertamente, e conta come le altre.' },

    /* --- I, quanto e' chiaro --- */
    /* «istruzioni» da sola non c'e' piu': faceva leggere «seguo le istruzioni
       passo passo» come istruzioni che mancano. Restano le forme che dicono
       davvero che mancano o che non si capiscono. */
    { chiavi: ['non capisco', 'non si capisce', 'non è chiaro', 'non ho capito',
               'scritta male', 'scritto male', 'scritte male', 'scritti male',
               'spiegata male', 'spiegato male',
               'senza le istruzioni', 'senza istruzioni', 'non ho le istruzioni',
               'mancano le istruzioni', 'istruzioni poco chiare', 'istruzioni confuse',
               'non so come', 'non trovo il modo', 'confus',
               'non ricordo', 'non mi ricordo', 'non so cosa', 'non so che cosa',
               'non so quale', 'non so chi', 'non so se', 'incomprensibil',
               'poco chiaro', 'non ci capisco', 'non capivo', 'non si capiva'],
      variabile: 'I', valore: -3, id: 'non-capisco',
      perche: 'Quello che va fatto non è chiaro. È informazione che manca, non complessità.' },
    { chiavi: ['prima volta', 'mai fatto', 'non lo conosco', 'nuovo per me', 'posto nuovo',
               'mai provato', 'non sono pratic', 'inespert', 'alle prime armi',
               'non so usare'],
      variabile: 'I', valore: -3, id: 'prima-volta',
      perche: 'La prima volta si paga in chiarezza. Manca la mappa del gesto nella testa.' },
    { chiavi: ['so esattamente', 'l\u2019ho già fatto', 'lo faccio sempre', 'so bene come',
               'a memoria', 'lo so fare', 'so come si fa', 'lo conosco bene',
               'so già come', 'di routine'],
      variabile: 'I', valore: 3, id: 'so-fare',
      perche: 'Il compito è chiaro: si sa che cosa fare, in che ordine, e come capire ' +
              'che è riuscito.' },

    /* --- T, la pressione del tempo --- */
    { chiavi: ['in ritardo', 'di corsa', 'di fretta', 'ho fretta', 'non ho tempo',
               'devo sbrigarmi', 'all\u2019ultimo', 'scadenza', 'entro le', 'fra poco',
               'tra poco', 'poco tempo', 'non c\u2019è tempo', 'non c\u2019era tempo',
               'manca poco', 'perdere il treno', 'perdere il volo',
               'perdere l\u2019autobus', 'perdere la coincidenza', 'in scadenza',
               'sta per chiudere', 'sta chiudendo', 'scade oggi', 'scade domani'],
      modelli: [/\b(?:tra|fra) (?:un|due|tre|quattro|cinque|sei|sette|otto|nove|dieci|quindici|venti|pochi|poche|\d+) (?:minut|second)[a-z]*\b/,
                /\bentro (?:domani|stasera|stanotte|oggi|sera|mezzogiorno|mezzanotte|fine|breve|lunedi|martedi|mercoledi|giovedi|venerdi|sabato|domenica|la fine|il \d+|un ora|pochi|poche|\d+)\b/],
      causa: 'fretta',
      variabile: 'T', valore: -4, id: 'fretta',
      perche: 'È la fretta di questo momento: quella che finisce quando finisce la ' +
              'scena. Chi ha sempre fretta, tutti i giorni, sta dichiarando un’altra ' +
              'cosa. Sta dichiarando carico.' },
    { chiavi: ['con calma', 'ho tempo', 'senza fretta', 'in anticipo', 'tutto il pomeriggio',
               'mattina libera', 'pomeriggio libero', 'giornata libera', 'serata libera',
               'nessuna fretta', 'tutto il tempo', 'tempo in abbondanza'],
      variabile: 'T', valore: 3, id: 'calma',
      perche: 'Il tempo c’è davvero, e averne cambia il modo in cui si fa una cosa. Si ' +
              'può controllare. Ci si può correggere, e rifare un pezzo senza che salti ' +
              'tutto il resto.' },

    /* --- M, l'ambiente intorno --- */
    { chiavi: ['affollat', 'pieno di gente', 'folla', 'coda', 'fila',
               'traffico', 'ingorgo', 'imbottigliat', 'ressa', 'calca', 'strapien',
               'pienissim'],
      variabile: 'M', valore: -4, id: 'folla', ambiente: true,
      perche: 'Lo spazio è pieno di gente, e questo è ambiente. Pesa sul gesto anche se ' +
              'il compito da fare resta lo stesso di sempre.' },
    { chiavi: ['rumor', 'chiasso', 'urla', 'casino',
               'urlano', 'urlav', 'trapan', 'martell', 'baccano', 'frastuono',
               'a tutto volume', 'strill', 'gridano', 'clacson', 'sirena', 'sirene',
               'cantiere', 'campanell', 'abbaia'],
      variabile: 'M', valore: -3, id: 'rumore', ambiente: true,
      perche: 'Il rumore fa parte dell’ambiente. Sta lì e non risponde a quello che stai ' +
              'facendo: quindi conta prima del dado, non dopo.' },
    { chiavi: ['non trovo', 'non le trovo', 'non lo trovo', 'non li trovo',
               'sparit', 'non sono dove', 'chissà dove',
               'non si sa dove', 'non so dove', 'non so dov\u2019è', 'le ho perse',
               'l\u2019ho perso', 'l\u2019ho persa', 'li ho persi', 'perso le chiavi',
               'perso il portafoglio', 'perso il telefono', 'mi manca un',
               'mi manca una'],
      variabile: 'M', valore: -3, id: 'non-trovo',
      perche: 'Un oggetto che non è al suo posto fa parte dell’ambiente. Il gesto ' +
              'non è diventato più complicato: è il posto intorno che non aiuta.' },
    { chiavi: ['disordin', 'non trovo niente', 'tutto in giro', 'ingombr'],
      variabile: 'M', valore: -2, id: 'disordine', ambiente: true,
      perche: 'Uno spazio in disordine obbliga a cercare e a spostare, prima ancora di ' +
              'fare. È l’ambiente che non collabora. Il compito non è diventato più ' +
              'difficile.' },
    { chiavi: ['buio', 'poca luce', 'al freddo', 'gelo', 'pioggia', 'sotto la pioggia',
               'piove', 'pioveva', 'diluvi', 'temporale', 'nevic', 'neve', 'vento',
               'nebbia', 'afa', 'fa freddo', 'faceva freddo', 'fa caldo',
               'faceva caldo', 'caldo torrido', 'scivolos', 'senza luce',
               'non si vede', 'non vedo bene'],
      variabile: 'M', valore: -2, id: 'luce-meteo', ambiente: true,
      perche: 'Il buio, il freddo e la pioggia non cambiano che cosa va fatto. Cambiano ' +
              'quanto costa farlo. Sono le condizioni fisiche del posto in cui ti trovi.' },
    { chiavi: ['non funziona', 'rotto', 'rotta', 'rotti', 'rotte', 'guast', 'si è inceppat', 'non parte',
               'fulminat', 'si impalla', 'si è impallat', 'va in crash',
               'non si accende', 'non c\u2019è campo', 'senza campo',
               'non c\u2019è segnale', 'senza segnale', 'non c\u2019è rete',
               'senza connessione', 'fuori servizio', 'fuori uso', 'batteria scarica'],
      variabile: 'M', valore: -4, id: 'non-funziona',
      perche: 'Uno strumento che manca o non funziona fa parte dell’ambiente. Diverso è ' +
              'il caso in cui reagisce mentre ci provi. Si inceppa proprio adesso, ' +
              'rifiuta proprio adesso. Quello è campo attivo, e resta fuori dalla ' +
              'formula.' },
    { chiavi: ['tutto pronto', 'già preparat', 'a portata di mano', 'tutto al suo posto',
               'è in ordine', 'era in ordine', 'tutto in ordine', 'già in ordine',
               'c\u2019è silenzio', 'tutto funziona', 'funziona tutto', 'strada libera'],
      variabile: 'M', valore: 3, id: 'tutto-pronto',
      perche: 'L’ambiente è già pronto, e quando è pronto lavora a favore. Le cose sono ' +
              'al loro posto, e non c’è niente da cercare prima di cominciare.' },

    /* --- BP, la protezione concreta --- */
    { chiavi: ['mi aiuta', 'mi dà una mano', 'se ne occupa', 'ci pensa lui', 'ci pensa lei',
               'qualcuno lo fa per me',
               'mi ha aiutat', 'mi aiutano', 'mi danno una mano', 'mi ha dato una mano',
               'mi sostituisce', 'mi copre', 'lo fa lui', 'lo fa lei',
               'se ne occupano', 'ci pensano loro'],
      variabile: 'BP', valore: 5, id: 'aiuto',
      perche: 'È un aiuto concreto, e toglie davvero carico. Qualcuno fa al posto tuo una parte del lavoro. Un incoraggiamento, invece, non è protezione.' },
    { chiavi: ['mi ha detto che ce la faccio', 'mi fa il tifo', 'mi incoraggia'],
      variabile: 'BP', valore: 0, id: 'incoraggia',
      perche: 'È un supporto che scalda e non toglie lavoro, e il libro su questo è netto: ' +
              'non conta come protezione. La proposta resta zero, ed è voluto.' },

    /* --- STR, il carico che ci si porta dietro --- */
    { chiavi: ['da giorni', 'da settimane', 'è una settimana che', 'ogni giorno così',
               'da mesi', 'periodo pesante', 'giorni che', 'giorno che ci provo',
               'terzo giorno', 'terza volta che', 'sono settimane',
               'da tempo', 'da troppo tempo', 'da anni', 'ultimamente',
               'in questo periodo', 'periodaccio', 'brutto periodo', 'momento difficile'],
      modelli: [/\bda (?:un|una|due|tre|quattro|cinque|sei|sette|otto|nove|dieci|\d+|poch[ei]|alcun[ei]|tant[ei]|tropp[ei]|parecch[ei]|divers[ei]) (?:giorn|settiman|mes|ann|nott)[a-z]*\b/,
                /\b(?:e|sono|erano) (?:(?:un|una|due|tre|quattro|cinque|sei|\d+) )?(?:giorn|settiman|mes|ann|nott)[a-z]* che\b/],
      causa: 'carico', assorbe: ['riposo'],
      variabile: 'STR', valore: 18, id: 'durata',
      perche: 'Quando una condizione dura da giorni, smette di essere il corpo di adesso. Diventa carico.' },
    { chiavi: ['sono a pezzi da', 'esaurit', 'non reggo più', 'al limite',
               'non ce la faccio più', 'sto crollando', 'sto per crollare', 'allo stremo',
               'burnout', 'esaurimento'],
      causa: 'carico',
      variabile: 'STR', valore: 22, id: 'crollo',
      perche: 'Chi racconta la scena dice da sé di essere arrivato al limite. Non è la ' +
              'stanchezza di oggi: è quella che si è accumulata nei giorni prima.' },
    /* LO STRESS DETTO COSI', SENZA ALTRO (11/11/2026). La parola «stress»
       nel vocabolario non c'era affatto. Il valore e' quello della voce qui
       sopra che parla di durata — la piu' prudente delle due di carico — e
       le tre voci hanno la stessa causa, cosi' «sono stressato da settimane»
       non vale il doppio. Quando lo stress e' la pressione di QUALCUNO,
       ADESSO («mi ha stressato tutto il giorno»), la sua casa e' il tempo, e
       sta piu' sotto: le due voci non si contendono la stessa frase. */
    { chiavi: ['sono stressat', 'ero stressat', 'sotto stress', 'che stress',
               'troppo stress', 'lo stress'],
      causa: 'carico',
      variabile: 'STR', valore: 18, id: 'stress',
      perche: 'Lo stress detto così, senza un motivo di questo momento, è carico: quello ' +
              'che ci si porta dietro da prima. Se invece è la pressione di qualcuno ' +
              'adesso, il suo posto è il tempo.' },
    { chiavi: ['sono tranquill', 'settimana leggera', 'periodo calmo'],
      variabile: 'STR', valore: -12, id: 'tranquillo',
      perche: 'Il carico di fondo, in questo periodo, è basso. La scena parte da una ' +
              'condizione buona, e anche questo va contato.' },

    /* --- DEB, il debito da insistenza --- */
    { chiavi: ['riprovo', 'ho riprovato', 'per la terza volta', 'continuo a provare',
               'insisto', 'ancora una volta'],
      variabile: 'DEB', valore: 1, id: 'insistenza',
      perche: 'Il debito misura proprio questo: insistere nello stesso modo, senza ' +
              'cambiare strada. Il libro però chiede di più. Vuole che ci siano insieme ' +
              'le sei condizioni del capitolo 7. Qui si propone un punto di debito, e va ' +
              'confermato.' },

    { chiavi: ['in ansia', 'ansios', 'agitat', 'col cuore in gola',
               'nervos', 'spaventat', 'terrorizzat', 'in panico', 'nel panico',
               'mi batte il cuore', 'tachicardia'],
      variabile: 'E', valore: -4, diScena: true,
      perche: 'Il cuore batte forte, le mani tremano, il respiro si accorcia. Sta ' +
              'succedendo nel corpo, adesso, e quindi si conta lì.' },
    { chiavi: ['ho fame', 'a stomaco vuoto', 'non ho mangiato',
               'non mangio da', 'digiun', 'affamat', 'morto di fame', 'muoio di fame',
               'senza mangiare', 'saltato il pranzo', 'saltato la cena',
               'saltato la colazione'],
      variabile: 'E', valore: -3, id: 'fame', diScena: true,
      perche: 'Fame e digiuno tolgono forze al corpo. Proprio come il sonno mancato.' },
    { chiavi: ['distratt', 'la testa altrove', 'non riesco a concentrarmi', 'penso ad altro',
               'non mi entra niente in testa', 'non mi entra più niente in testa',
               'non riesco a pensare', 'testa nel pallone', 'sovrappensiero', 'sbadat'],
      variabile: 'I', valore: -3, diScena: true,
      perche: 'Se l’attenzione è altrove, il compito è meno chiaro. Anche quando le istruzioni ci sono.' },
    /* L'ALCOL (11/11/2026). Stesso valore della voce qui sopra, perche' fa
       la stessa cosa alla stessa variabile: la lucidita'. */
    { chiavi: ['birr', 'bicchieri di vino', 'alcol', 'ubriac', 'sbronz', 'alticci',
               'bevuto troppo'],
      variabile: 'I', valore: -4, diScena: true,
      perche: 'L’alcol toglie lucidità: quello che c’è da fare resta lo stesso, ma si ' +
              'vede meno chiaro. È una proposta prudente. Se incide sul corpo più che ' +
              'sulla testa, spostala sull’energia.' },
    { chiavi: ['notifiche', 'squilla il telefono', 'continuano a scrivermi', 'suona il telefono'],
      variabile: 'M', valore: -2,
      perche: 'Le interruzioni che arrivano da fuori sono ambiente. Se invece qualcuno reagisce mentre ci provi, è campo attivo.' },
    { chiavi: ['sotto pressione', 'mi stanno addosso', 'mi aspettano', 'tutti aspettano',
               'mi ha stressat', 'mi stressa', 'mi stressano', 'mi mette fretta',
               'mi mettono fretta', 'mi sollecita', 'mi pressa', 'fiato sul collo',
               'mi sta addosso', 'mi stava addosso', 'lo vuole subito',
               'lo voleva subito', 'tutto subito'],
      causa: 'fretta',
      variabile: 'T', valore: -4, id: 'pressione',
      perche: 'La pressione di chi aspetta stringe il tempo di questo momento. Il gesto non è cambiato, ma lo spazio per farlo sì.' },

    /* --- C, i pezzi da coordinare --- */
    { chiavi: ['mentre', 'nello stesso tempo', 'contemporaneamente', 'insieme a',
               'e intanto', 'allo stesso tempo',
               'intanto', 'nel frattempo', 'troppe cose', 'mille cose', 'tutto insieme'],
      variabile: 'C', valore: 1, id: 'insieme',
      perche: 'Due cose tenute insieme sono un coordinamento in più. È complessità, non fretta.' },
    { chiavi: ['con i bambini', 'con il bambino', 'con la bambina', 'con mio figlio', 'con mia figlia',
               'con la piccola', 'con il piccolo', 'con i piccoli', 'con il neonato',
               'con la neonata', 'col passeggino', 'con il passeggino'],
      variabile: 'C', valore: 1, id: 'con-altri',
      perche: 'Dentro il gesto c’è un’altra persona da tenere d’occhio. Tenerla d’occhio ' +
              'è un coordinamento in più. Vale un pezzo come tutti gli altri.' }
  ];

  /* ---------------------------------------------------------------------
     IL CAMPO ATTIVO — quello che RISPONDE al tentativo
     ---------------------------------------------------------------------
     Non entra nella formula: agisce dopo il dado, togliendo margine
     [libro, capitolo 10]. Il vocabolario lo riconosce per poterlo
     SEGNALARE, non per calcolarlo — quanti punti valga «lieve» il canone
     non lo dice, ed e' una delle quattro cose che l'Apparato B dichiara di
     non contenere. */
  var CAMPO_ATTIVO = [
    { chiavi: ['tira il guinzaglio', 'il cane tira', 'strattona'], nome: 'un animale che reagisce' },
    { chiavi: ['rifiuta il codice', 'mi butta fuori', 'dà errore', 'scade la sessione',
               'mi blocca', 'mi ha bloccat', 'accesso negato', 'password errata',
               'codice errato', 'non mi fa entrare', 'sessione scaduta', 'si pianta',
               'si blocca'],
      nome: 'un servizio che risponde male al tentativo' },
    { chiavi: ['alza la voce', 'si arrabbia', 'mi interrompe', 'ribatte',
               'non collabora', 'si irrigidisce', 'si oppone', 'fa resistenza',
               'si rifiuta', 'non vuole', 'non ne vuole sapere', 'mi urla',
               'mi insulta', 'mi risponde male', 'mi ignora', 'non mi ascolta',
               'non risponde', 'non mi risponde'],
      nome: 'un’altra persona che reagisce' },
    { chiavi: ['si inceppa proprio', 'si blocca mentre', 'cede'], nome: 'un oggetto che cede sotto il gesto' }
  ];

  /* le parole che aprono un nuovo gesto dentro la stessa frase */
  var CONGIUNZIONI = [' poi ', ' e poi ', ' quindi ', ' dopo ', ' infine ', ' allora '];

  /* ---------------------------------------------------------------------
     LE DOMANDE DI SCENA — la persona dice il fatto, la casella la mette qui
     ---------------------------------------------------------------------
     PERCHE' ESISTONO  (13/11/2026)
     Igor: «La formula di per se' non e' neanche cosi' complicata. Il
     problema e' l'interpretazione, e l'interpretazione e' lasciata
     all'utente. Come possiamo ridurre il rischio di far confusione, di
     duplicare, di inserire la stessa situazione in due campi diversi?»

     Il banco dei racconti ha misurato che indovinare le condizioni dalle
     parole non regge: sui racconti mai visti ne coglie quattro su dieci, e
     allungare il vocabolario non sposta il numero [libro, capitolo 60]. E
     lasciare alla persona i nove cursori vuol dire lasciarle proprio la
     scelta in cui si sbaglia: in quale campo va un fatto.

     La strada e' un'altra. La persona non sceglie il campo. Risponde a una
     domanda chiusa — «come hai dormito?» — e la domanda ha una casa sola,
     decisa qui. Se nessuno sceglie il campo, nessuno puo' mettere lo stesso
     fatto in due campi.

     COME SONO FATTE
       `variabile`  la casa della domanda: una, e non si puo' cambiare;
       `copre`      le voci del vocabolario che la domanda SOSTITUISCE.
                    Quando la persona risponde, le parole di quelle voci non
                    contano piu': vale la risposta. E' cosi' che la stessa
                    stanchezza non entra una volta dal racconto e una dalla
                    domanda;
       `propone`    quale risposta suggerire se nel racconto c'e' la parola:
                    il testo PROPONE, la risposta decide;
       `causa`      la stessa regola delle voci: sonno e stanchezza sono un
                    fatto solo, e fra le due risposte vale la piu' forte;
       `seSolo`     la domanda si fa solo se un'altra ha avuto una di quelle
                    risposte: sono le due domande che sciolgono una coppia
                    critica del capitolo 20 — «la stanchezza di oggi o il
                    carico di settimane», «la fretta di oggi o una vita di
                    corsa».

     I VALORI sono quelli della scala scritta in testa alle condizioni: da
     due a cinque punti. «Un po'» vale due, «abbastanza» quattro, «molto»
     cinque dove la voce piu' forte del vocabolario vale cinque, quattro
     dove vale quattro. Nessuna risposta propone dieci.

     CHE COSA NON COPRONO, E VA DETTO
     Sono domande sulla persona e sulla giornata. Quello che riguarda un
     gesto solo — la cosa che non si trova, l'istruzione che non si capisce,
     le cose da fare insieme, l'insistenza — resta al vocabolario, gesto per
     gesto. E' il passo dopo. */
  var DOMANDE_SCENA = [
    { id: 'sonno', variabile: 'E', causa: 'riposo',
      testo: 'Come hai dormito stanotte?', terza: 'Come ha dormito stanotte?',
      copre: ['sonno', 'riposato'],
      propone: { sonno: 'male', riposato: 'bene' },
      opzioni: [
        { id: 'bene', etichetta: 'Bene', valore: 3 },
        { id: 'solito', etichetta: 'Come al solito', valore: 0 },
        { id: 'male', etichetta: 'Male, o poco', valore: -4 },
        { id: 'niente', etichetta: 'Quasi niente', valore: -5 }] },
    { id: 'stanchezza', variabile: 'E', causa: 'riposo',
      testo: 'Quanto sei stanco, adesso?', terza: 'Quanto è stanca, adesso, questa persona?',
      copre: ['stanchezza'],
      propone: { stanchezza: 'molto' },
      opzioni: [
        { id: 'no', etichetta: 'Non sono stanco', terza: 'Per niente', valore: 0 },
        { id: 'poco', etichetta: 'Un po’', valore: -2 },
        { id: 'molto', etichetta: 'Molto', valore: -4 }] },
    { id: 'durata', variabile: 'STR', causa: 'carico', assorbe: 'riposo',
      seSolo: { sonno: ['male', 'niente'], stanchezza: ['poco', 'molto'] },
      testo: 'Questa stanchezza da quanto dura?',
      copre: ['durata'],
      propone: { durata: 'giorni' },
      opzioni: [
        { id: 'oggi', etichetta: 'Da oggi, o da ieri', valore: 0 },
        { id: 'giorni', etichetta: 'Da giorni, o da settimane', valore: 18 }] },
    { id: 'corpo', variabile: 'E',
      testo: 'Hai dolore, hai fame, o stai poco bene?', terza: 'Ha dolore, ha fame, o sta poco bene?',
      copre: ['malessere', 'fame'],
      propone: { malessere: 'abbastanza', fame: 'poco' },
      opzioni: [
        { id: 'no', etichetta: 'No', valore: 0 },
        { id: 'poco', etichetta: 'Un po’', valore: -2 },
        { id: 'abbastanza', etichetta: 'Abbastanza', valore: -4 },
        { id: 'molto', etichetta: 'Molto', valore: -5 }] },
    { id: 'fretta', variabile: 'T', causa: 'fretta',
      testo: 'Quanta fretta c’è, oggi?',
      copre: ['fretta', 'calma', 'pressione'],
      propone: { fretta: 'molta', pressione: 'molta', calma: 'nessuna' },
      opzioni: [
        { id: 'nessuna', etichetta: 'Nessuna: ho tempo', terza: 'Nessuna: c’è tempo', valore: 3 },
        { id: 'solita', etichetta: 'La solita', valore: 0 },
        { id: 'poca', etichetta: 'Un po’', valore: -2 },
        { id: 'molta', etichetta: 'Molta', valore: -4 }] },
    { id: 'frettaDa', variabile: 'STR', causa: 'carico', assorbe: 'fretta',
      seSolo: { fretta: ['poca', 'molta'] },
      testo: 'Questa fretta è di oggi, o è sempre così?',
      copre: [],
      propone: {},
      opzioni: [
        { id: 'oggi', etichetta: 'È di oggi', valore: 0 },
        { id: 'sempre', etichetta: 'È sempre così, da settimane', valore: 18 }] },
    { id: 'posto', variabile: 'M',
      testo: 'Com’è il posto in cui succede?',
      copre: ['folla', 'rumore', 'disordine', 'luce-meteo'],
      propone: { folla: 'molto', rumore: 'qualche', disordine: 'qualche', 'luce-meteo': 'qualche' },
      opzioni: [
        { id: 'tranquillo', etichetta: 'Tranquillo', valore: 0 },
        { id: 'qualche', etichetta: 'Qualche disturbo: rumore, gente, disordine, poca luce', valore: -2 },
        { id: 'molto', etichetta: 'Molto disturbato', valore: -4 }] },
    { id: 'periodo', variabile: 'STR', causa: 'carico',
      testo: 'Che periodo è, per te?', terza: 'Che periodo è, per questa persona?',
      copre: ['durata', 'crollo', 'stress', 'tranquillo'],
      propone: { crollo: 'limite', stress: 'pesante', tranquillo: 'leggero' },
      opzioni: [
        { id: 'leggero', etichetta: 'Un periodo leggero', valore: -12 },
        { id: 'normale', etichetta: 'Un periodo normale', valore: 0 },
        { id: 'pesante', etichetta: 'Un periodo pesante', valore: 18 },
        { id: 'limite', etichetta: 'Sono al limite', terza: 'È al limite', valore: 22 }] },
    /* LA SETTIMA, AGGIUNTA IL 25/11/2026: L'INSISTENZA.
       Era l'ultima condizione che dipendeva soltanto dalle parole: se nel
       racconto c'era «riprovo», il debito saliva di uno; se la persona lo
       diceva in un altro modo, niente. E' anche una coppia critica del
       capitolo 20, «debito e fallimento isolato»: sbagliare non e'
       insistere. Per questo la risposta di mezzo vale zero di proposito —
       chi riprova CAMBIANDO MODO non sta accumulando debito, sta facendo
       quello che il capitolo 7 chiama riassetto. Il debito e' di chi riprova
       uguale. Il vocabolario lo «proponeva, da confermare»: la domanda e' la
       conferma. */
    { id: 'insistenza', variabile: 'DEB',
      testo: 'Stai riprovando una cosa che non riesce?', terza: 'Sta riprovando una cosa che non riesce?',
      copre: ['insistenza'],
      propone: { insistenza: 'uguale' },
      opzioni: [
        { id: 'no', etichetta: 'No', valore: 0 },
        { id: 'cambio', etichetta: 'Sì, ma ogni volta cambio modo', terza: 'Sì, ma ogni volta cambia modo', valore: 0 },
        { id: 'uguale', etichetta: 'Sì: riprovo sempre uguale, senza fermarmi', terza: 'Sì: riprova sempre uguale, senza fermarsi', valore: 1 }] }
  ];

  /* ---------------------------------------------------------------------
     LE DOMANDE SUL GESTO — per il gesto in cui c'e' stato un intoppo
     ---------------------------------------------------------------------
     IL SECONDO PASSO  (25/11/2026)
     Le domande di scena chiedono della persona e della giornata. Restava
     fuori quello che riguarda un gesto solo: l'istruzione che non si capisce,
     la cosa che manca o non funziona, le cose da tenere insieme, l'aiuto.
     Per quelle la pagina leggeva ancora le parole, cioe' la strada che il
     banco ha misurato a quattro condizioni su dieci.

     Sono quattro, e si fanno solo sul gesto che la persona apre: chiedere
     quattro cose per ognuno di venti gesti sarebbe il questionario da
     ottanta domande che il capitolo 34 sconsiglia.

     Valgono le regole delle domande di scena: una casa sola, la risposta
     sostituisce le voci che `copre`, il racconto propone e non decide. In
     piu', una risposta sul gesto vince, PER QUEL GESTO, anche su quello che
     il racconto diceva per tutta la scena con le stesse voci: «non capisco
     niente di queste istruzioni» vale per tutti i gesti, ma se di uno la
     persona dice «questo lo so fare bene», per quello conta la sua risposta.

     DUE COPPIE CRITICHE DEL CAPITOLO 20 SI SCIOLGONO QUI.
       chiarezza e complessita'  sono due domande diverse, con parole
                                 diverse: «era chiaro che cosa fare?» e
                                 «dovevi badare anche ad altro?». Chi risponde
                                 non puo' mettere il troppo-da-fare nella
                                 chiarezza, perche' la domanda non lo chiede;
       bonus e supporto          la domanda sull'aiuto ha una risposta che
                                 vale zero di proposito: «mi ha incoraggiato,
                                 ma l'ho fatto io». Il capitolo 16 lo dice in
                                 una riga: il sostegno emotivo non e' un bonus
                                 protettivo.

     La complessita' che la risposta aggiunge si somma a quella che il gesto
     ha di suo (compilare un modulo sono gia' due pezzi): sono due cose
     diverse, e il capitolo 7 le conta insieme. */
  var DOMANDE_GESTO = [
    { id: 'chiarezza', variabile: 'I',
      testo: 'Era chiaro che cosa fare, e come?', terza: 'Era chiaro, per questa persona, che cosa fare e come?',
      copre: ['non-capisco', 'prima-volta', 'so-fare'],
      propone: { 'non-capisco': 'no', 'prima-volta': 'no', 'so-fare': 'bene' },
      opzioni: [
        { id: 'bene', etichetta: 'Sì: è una cosa che so fare bene', terza: 'Sì: è una cosa che sa fare bene', valore: 3 },
        { id: 'si', etichetta: 'Sì, abbastanza', valore: 0 },
        { id: 'no', etichetta: 'No: non era chiaro, o era la prima volta', valore: -3 }] },
    { id: 'strumenti', variabile: 'M',
      testo: 'Avevi quello che serviva, e funzionava?', terza: 'Aveva quello che serviva, e funzionava?',
      copre: ['non-trovo', 'non-funziona', 'tutto-pronto'],
      propone: { 'non-trovo': 'manca', 'non-funziona': 'rotto', 'tutto-pronto': 'pronto' },
      opzioni: [
        { id: 'pronto', etichetta: 'Sì: era tutto pronto', valore: 3 },
        { id: 'si', etichetta: 'Sì', valore: 0 },
        { id: 'manca', etichetta: 'Mancava qualcosa, o non lo trovavo', terza: 'Mancava qualcosa, o non si trovava', valore: -3 },
        { id: 'rotto', etichetta: 'Una cosa non funzionava', valore: -4 }] },
    { id: 'insieme', variabile: 'C',
      testo: 'Mentre lo facevi, dovevi badare anche ad altro?', terza: 'Mentre lo faceva, doveva badare anche ad altro?',
      copre: ['insieme', 'con-altri'],
      propone: { insieme: 'una', 'con-altri': 'una' },
      opzioni: [
        { id: 'no', etichetta: 'No, solo a questo', valore: 0 },
        { id: 'una', etichetta: 'Sì, a un’altra cosa', valore: 1 },
        { id: 'due', etichetta: 'Sì, a due o più cose', valore: 2 }] },
    { id: 'aiuto', variabile: 'BP',
      testo: 'Qualcuno ti ha aiutato a farlo?', terza: 'Qualcuno ha aiutato questa persona a farlo?',
      copre: ['aiuto', 'incoraggia'],
      propone: { aiuto: 'parte', incoraggia: 'parole' },
      opzioni: [
        { id: 'no', etichetta: 'No', valore: 0 },
        { id: 'parole', etichetta: 'Mi ha incoraggiato, ma l’ho fatto io', terza: 'Solo incoraggiamento: l’ha fatto da sé', valore: 0 },
        { id: 'parte', etichetta: 'Sì: ne ha fatto una parte, o me l’ha reso più facile',
          terza: 'Sì: qualcuno ne ha fatto una parte, o gliel’ha reso più facile', valore: 5 }] }
  ];

  /* ---------------------------------------------------------------------
     LE CASE A MANO — per la frase che la pagina non ha saputo usare
     ---------------------------------------------------------------------
     IL TERZO PASSO  (25/11/2026)
     Igor: «mi posso anche perdere alcuni elementi importanti, potrei non
     inserirli in nessun posto: questi elementi non hanno nessun valore e non
     vengono movimentati».

     Le domande impediscono di mettere un fatto in due posti. Non impediscono
     di perderlo: una frase che il vocabolario non riconosce, e a cui nessuna
     domanda somiglia, restava in un elenco in fondo alla pagina, e li'
     finiva. Adesso ogni frase rimasta fuori chiede una decisione: a che cosa
     appartiene? La persona sceglie fra poche case scritte in italiano, e fra
     due risposte che non sono case e servono quanto le altre: «l'ho gia'
     detto» e «non c'entra con i numeri». Una frase puo' restare fuori dal
     calcolo, ma perche' qualcuno l'ha deciso, non perche' nessuno l'ha vista.

     IL VALORE e' quello di «un fatto detto chiaro» nella scala scritta in
     testa alle condizioni. Chi sceglie la casa non sceglie un numero: lo
     trova proposto, e lo cambia se pesa di piu' o di meno.

     DUE REGOLE CONTRO IL DOPPIO CONTO, perche' qui il rischio e' massimo:
     chi rilegge l'elenco tende a mettere tutto da qualche parte.
       · piu' frasi messe nella stessa casa contano UNA volta, la piu' forte:
         tre frasi sul mal di testa non fanno tre mal di testa;
       · una frase messa a mano e una risposta nella stessa casa non si
         sommano: resta il valore piu' forte, come per le parole. */
  var CASE_A_MANO = [
    { id: 'corpo', variabile: 'E', valore: -4, etichetta: 'Il corpo: stanchezza, dolore, fame, malessere' },
    { id: 'chiarezza', variabile: 'I', valore: -3, etichetta: 'La chiarezza: non era chiaro che cosa fare' },
    { id: 'tempo', variabile: 'T', valore: -4, etichetta: 'Il tempo: fretta, una scadenza' },
    { id: 'posto', variabile: 'M', valore: -3, etichetta: 'Il posto o gli strumenti: disturbo, cose che mancano' },
    { id: 'aiuto', variabile: 'BP', valore: 5, etichetta: 'Un aiuto vero: qualcuno ha fatto una parte' },
    { id: 'carico', variabile: 'STR', valore: 18, etichetta: 'Il periodo: una cosa che pesa da tempo' },
    { id: 'gia', variabile: null, valore: 0, etichetta: 'L’ho già detto, in un’altra frase o in una risposta' },
    { id: 'niente', variabile: null, valore: 0, etichetta: 'Non c’entra con i numeri: è cornice' }
  ];

  /* ---------------------------------------------------------------------
     LE GIORNATE GIA' APERTE — per chi non sa da dove cominciare a tagliare
     ---------------------------------------------------------------------
     (25/11/2026) La parte piu' difficile, per chi apre la pagina la prima
     volta, viene prima dei numeri: e' decidere che cosa e' un gesto. Chi
     parte da un foglio bianco scrive «ho avuto una giornataccia», e li' non
     c'e' niente da calcolare. Chi parte da una giornata gia' scritta gesto
     per gesto capisce subito la forma, e corregge: toglie, aggiunge, cambia.

     Sono sei, per sei persone diverse, come chiede Igor: «una giornata
     lavorativa, la giornata tipo di un bambino, di un ragazzo, di un
     adulto». Sono scritte in prima persona, una frase per gesto, con una o
     due condizioni dette in chiaro. Non sono casi clinici e non sono
     profili: sono esempi di FORMA. Nessuna porta bonus o penalita' per il
     tipo di persona — e' la regola del capitolo 32, un profilo non e' una
     condanna.

     `gesti` e' quanti gesti il lettore deve trovarci. _test/scena.js lo
     controlla per ognuna: se una giornata-tipo viene letta male, il
     difetto e' del lettore, e si vede subito. E' gia' successo: la giornata
     d'ufficio ha fatto trovare che «va consegnata entro domani» diventava
     un gesto. */
  var GIORNATE_TIPO = [
    { id: 'scuola', nome: 'Una mattina di scuola (un ragazzo)', gesti: 8,
      testo: 'Ho dormito poco. Mi alzo. Mi lavo. Faccio colazione di corsa. Preparo lo zaino. ' +
             'Esco di casa. Prendo l\u2019autobus, è affollato. Entro in classe. Consegno il compito.' },
    { id: 'compiti', nome: 'Un pomeriggio di compiti (un bambino)', gesti: 7,
      testo: 'Torno da scuola. Mangio. Apro il quaderno. Leggo il problema, non capisco che cosa chiede. ' +
             'Scrivo la soluzione. Chiedo aiuto alla mamma. Chiudo lo zaino.' },
    { id: 'ufficio', nome: 'Una giornata d\u2019ufficio (un adulto)', gesti: 8,
      testo: 'Arrivo in ufficio. Accendo il computer. Leggo le email. Rispondo a un cliente. ' +
             'Partecipo alla riunione. Scrivo la relazione, va consegnata entro domani. ' +
             'Telefono al fornitore. Esco.' },
    { id: 'turno', nome: 'Un turno in reparto (chi cura)', gesti: 6,
      testo: 'Sono stanco da giorni. Preparo la terapia. Controllo i parametri. Rispondo al campanello. ' +
             'Chiamo il collega. Compilo la cartella. Accompagno il paziente. Il reparto è rumoroso.' },
    { id: 'genitore', nome: 'Una mattina con un bambino piccolo (un genitore)', gesti: 6,
      testo: 'Ho dormito male. Mi alzo. Preparo la colazione. Vesto il bambino. ' +
             'Cerco le chiavi, non le trovo. Esco di corsa. Accompagno il bambino all\u2019asilo.' },
    { id: 'anziano', nome: 'La mattina di una persona anziana, sola', gesti: 7,
      testo: 'Ho mal di schiena. Mi alzo piano. Prendo le medicine. Preparo il caffè. Scendo le scale. ' +
             'Vado a fare la spesa. Porto le borse a casa. Telefono a mia figlia.' }
  ];

  var API = { CLASSI: CLASSI, AZIONI: AZIONI, CONDIZIONI: CONDIZIONI,
              CAMPO_ATTIVO: CAMPO_ATTIVO, CONGIUNZIONI: CONGIUNZIONI,
              DOMANDE_SCENA: DOMANDE_SCENA, DOMANDE_GESTO: DOMANDE_GESTO,
              CASE_A_MANO: CASE_A_MANO, GIORNATE_TIPO: GIORNATE_TIPO };
  globale.Lessico = API;
  if (typeof module !== 'undefined' && module.exports) { module.exports = API; }
}(typeof window !== 'undefined' ? window : this));
