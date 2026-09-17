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
      nota: 'Gesto che parte già in salita, anche con le condizioni buone.' }
  };

  /* I verbi si scrivono alla radice: il riconoscimento e' per prefisso, cosi'
     «alzo», «alzarsi», «alzata» cadono tutti sullo stesso verbo senza dover
     elencare le coniugazioni. E' grossolano, ed e' voluto: un analizzatore
     morfologico completo sarebbe una libreria, e questo pacchetto non ne ha. */
  var AZIONI = [
    /* --- corpo e cura, i gesti piu' automatici --- */
    { radici: ['alz', 'sieder', 'siedo', 'sedermi'], nome: 'alzarsi o sedersi', classe: 'automatico' },
    { radici: ['bev', 'bere', 'bevut'], nome: 'bere', classe: 'automatico' },
    { radici: ['mangi', 'colazion', 'pranz', 'cen'], nome: 'mangiare', classe: 'automatico' },
    { radici: ['lav'], nome: 'lavarsi', classe: 'automatico' },
    { radici: ['vest', 'infil'], nome: 'vestirsi', classe: 'ordinario' },
    { radici: ['dent'], nome: 'lavarsi i denti', classe: 'automatico' },
    { radici: ['respir'], nome: 'respirare', classe: 'automatico' },
    { radici: ['pausa', 'ferm', 'sost'], nome: 'fermarsi', classe: 'automatico' },
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
    { radici: ['pes', 'misur'], nome: 'misurare o pesare', classe: 'ordinario' },
    { radici: ['imbuc'], nome: 'imbucare', classe: 'automatico' },
    { radici: ['avvis'], nome: 'avvisare qualcuno', classe: 'ordinario' },
    { radici: ['abbracci'], nome: 'abbracciare', classe: 'automatico' },
    { radici: ['ricord', 'dimentic'], nome: 'ricordarsi di qualcosa', classe: 'ordinario' },

    /* --- casa e oggetti --- */
    { radici: ['cerc'], nome: 'cercare qualcosa', classe: 'ordinario' },
    { radici: ['trov'], nome: 'trovare qualcosa', classe: 'ordinario' },
    { radici: ['rovist', 'frug'], nome: 'rovistare', classe: 'ordinario' },
    { radici: ['prend', 'pigli'], nome: 'prendere qualcosa', classe: 'automatico' },
    { radici: ['apr'], nome: 'aprire', classe: 'automatico' },
    { radici: ['chiud'], nome: 'chiudere', classe: 'automatico' },
    { radici: ['spegn', 'accend'], nome: 'spegnere o accendere', classe: 'automatico' },
    { radici: ['prepar'], nome: 'preparare qualcosa', classe: 'ordinario' },
    { radici: ['metter', 'metto', 'mess'], nome: 'mettere a posto', classe: 'ordinario' },
    { radici: ['pul', 'riordin', 'sistem'], nome: 'pulire o riordinare', classe: 'ordinario' },
    { radici: ['sollev', 'spost'], nome: 'sollevare o spostare', classe: 'difficile' },
    { radici: ['cucin'], nome: 'cucinare', classe: 'procedura' },
    { radici: ['lavatric', 'bucat', 'stend'], nome: 'fare il bucato', classe: 'procedura' },

    /* --- mobilita' --- */
    { radici: ['esc', 'usc'], nome: 'uscire', classe: 'ordinario' },
    { radici: ['entr'], nome: 'entrare', classe: 'automatico' },
    { radici: ['scend'], nome: 'scendere', classe: 'automatico' },
    { radici: ['sal'], nome: 'salire', classe: 'automatico' },
    { radici: ['cammin', 'vado', 'andare', 'and'], nome: 'andare da qualche parte', classe: 'ordinario' },
    { radici: ['guid'], nome: 'guidare', classe: 'procedura' },
    { radici: ['parcheggi'], nome: 'parcheggiare', classe: 'ordinario' },
    { radici: ['attravers'], nome: 'attraversare', classe: 'ordinario' },
    { radici: ['aspett', 'attend'], nome: 'aspettare', classe: 'automatico' },

    /* --- digitale e burocrazia --- */
    { radici: ['scriv', 'scritt'], nome: 'scrivere', classe: 'ordinario' },
    { radici: ['mand', 'inv', 'spedi'], nome: 'mandare qualcosa', classe: 'ordinario' },
    { radici: ['chiam', 'telefon'], nome: 'chiamare qualcuno', classe: 'ordinario' },
    { radici: ['rispond'], nome: 'rispondere', classe: 'ordinario' },
    { radici: ['compil'], nome: 'compilare un modulo', classe: 'procedura' },
    { radici: ['carica', 'caric'], nome: 'caricare un documento', classe: 'procedura' },
    { radici: ['pag'], nome: 'pagare', classe: 'procedura' },
    { radici: ['prenot'], nome: 'prenotare', classe: 'procedura' },
    { radici: ['stamp'], nome: 'stampare', classe: 'ordinario' },
    { radici: ['legg', 'lett'], nome: 'leggere', classe: 'ordinario' },
    { radici: ['controll', 'verific'], nome: 'controllare', classe: 'ordinario' },
    { radici: ['acced', 'access', 'login'], nome: 'accedere a un servizio', classe: 'procedura' },
    { radici: ['scaric'], nome: 'scaricare qualcosa', classe: 'ordinario' },
    { radici: ['alleg'], nome: 'allegare un documento', classe: 'procedura' },
    { radici: ['firm'], nome: 'firmare', classe: 'ordinario' },
    { radici: ['attiv'], nome: 'attivare qualcosa', classe: 'procedura' },
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
    { radici: ['parl', 'dir', 'dico', 'dett'], nome: 'parlare con qualcuno', classe: 'ordinario' },
    { radici: ['discut', 'litig'], nome: 'discutere', classe: 'difficile' },
    { radici: ['chieder', 'chied'], nome: 'chiedere qualcosa', classe: 'ordinario' },
    { radici: ['aiut'], nome: 'aiutare qualcuno', classe: 'ordinario' },
    { radici: ['accompagn'], nome: 'accompagnare qualcuno', classe: 'ordinario' },
    { radici: ['salut'], nome: 'salutare', classe: 'automatico' },
    { radici: ['spos'], nome: 'spostare qualcuno o qualcosa', classe: 'ordinario' },
    { radici: ['convinc'], nome: 'convincere qualcuno', classe: 'difficile' },
    { radici: ['ascolt'], nome: 'ascoltare qualcuno', classe: 'ordinario' },
    { radici: ['guard'], nome: 'guardare qualcosa', classe: 'automatico' },
    { radici: ['ringrazi', 'scus'], nome: 'ringraziare o scusarsi', classe: 'ordinario' },

    /* --- altri gesti di casa e di strada --- */
    { radici: ['svegli'], nome: 'svegliarsi o svegliare', classe: 'automatico' },
    { radici: ['togli', 'tolg'], nome: 'togliere qualcosa', classe: 'automatico' },
    { radici: ['butt', 'gett'], nome: 'buttare via', classe: 'automatico' },
    { radici: ['raccogl', 'raccolg'], nome: 'raccogliere qualcosa', classe: 'ordinario' },
    { radici: ['stir'], nome: 'stirare', classe: 'ordinario' },
    { radici: ['annaff'], nome: 'annaffiare', classe: 'automatico' },
    { radici: ['spingi', 'sping'], nome: 'spingere qualcosa', classe: 'ordinario' },
    { radici: ['torn', 'rientr'], nome: 'tornare', classe: 'ordinario' },
    { radici: ['arriv'], nome: 'arrivare', classe: 'ordinario' },
    { radici: ['ricominc'], nome: 'ricominciare', classe: 'ordinario' },
    { radici: ['compr', 'acquist'], nome: 'comprare qualcosa', classe: 'ordinario' },
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
    { radici: ['scegl', 'scelg'], nome: 'scegliere', classe: 'ordinario' },
    { radici: ['decid'], nome: 'decidere', classe: 'difficile' },
    { radici: ['insegn'], nome: 'insegnare', classe: 'procedura' },
    { radici: ['present'], nome: 'presentare qualcosa', classe: 'procedura' }
  ];

  /* ---------------------------------------------------------------------
     LE CONDIZIONI — quello che la scena dichiara sulla persona
     ---------------------------------------------------------------------
     Ogni voce tocca UNA variabile sola: e' il domicilio unico del capitolo
     18, applicato alle parole. Il `valore` e' la proposta, il `perche'` e' la
     riga che comparira' a schermo accanto al numero.

     Le magnitudini restano piccole di proposito. Il vocabolario non sa
     quanto e' grave una cosa: sa che e' stata nominata. Chi legge la scena
     sa quanto e' grave, e correggera'. */
  var CONDIZIONI = [
    /* --- E, il corpo adesso --- */
    { chiavi: ['non ho dormito', 'non ho chiuso occhio', 'insonne', 'sveglio tutta la notte',
               'dormito poco', 'poche ore di sonno', 'notte in bianco'],
      variabile: 'E', valore: -10,
      perche: 'Il sonno mancato tocca il corpo adesso. Se dura da giorni va spostato anche sul carico, ma non contato due volte qui.' },
    { chiavi: ['stanc', 'esaust', 'sfinit', 'a pezzi', 'non ne posso più'],
      variabile: 'E', valore: -8,
      perche: 'La stanchezza è detta apertamente, e riguarda il corpo di questo momento. ' +
              'Se dura da giorni, il posto giusto è il carico, non questo.' },
    { chiavi: ['mal di testa', 'mal di schiena', 'dolore', 'dolorant', 'febbre', 'influenz',
               'nausea', 'storto'],
      variabile: 'E', valore: -10,
      perche: 'Il dolore e il malessere si prendono una parte delle forze. Lo fanno ' +
              'prima ancora che il gesto cominci. Quello che resta è meno di quello che ' +
              'sembra.' },
    { chiavi: ['riposat', 'ho dormito bene', 'in forma', 'pieno di energia'],
      variabile: 'E', valore: 6,
      perche: 'Il corpo, oggi, aiuta. È una condizione favorevole detta apertamente, e conta come le altre.' },

    /* --- I, quanto e' chiaro --- */
    { chiavi: ['non capisco', 'non si capisce', 'non è chiaro', 'non ho capito',
               'istruzioni', 'non so come', 'non trovo il modo', 'confus'],
      variabile: 'I', valore: -8,
      perche: 'Quello che va fatto non è chiaro. È informazione che manca, non complessità.' },
    { chiavi: ['prima volta', 'mai fatto', 'non lo conosco', 'nuovo per me', 'posto nuovo'],
      variabile: 'I', valore: -7,
      perche: 'La prima volta si paga in chiarezza. Manca la mappa del gesto nella testa.' },
    { chiavi: ['so esattamente', 'l\u2019ho già fatto', 'lo faccio sempre', 'so bene come'],
      variabile: 'I', valore: 5,
      perche: 'Il compito è chiaro: si sa che cosa fare, in che ordine, e come capire ' +
              'che è riuscito.' },

    /* --- T, la pressione del tempo --- */
    { chiavi: ['in ritardo', 'di corsa', 'di fretta', 'ho fretta', 'non ho tempo',
               'devo sbrigarmi', 'all\u2019ultimo', 'scadenza', 'entro le', 'fra poco'],
      variabile: 'T', valore: -10,
      perche: 'È la fretta di questo momento: quella che finisce quando finisce la ' +
              'scena. Chi ha sempre fretta, tutti i giorni, sta dichiarando un’altra ' +
              'cosa. Sta dichiarando carico.' },
    { chiavi: ['con calma', 'ho tempo', 'senza fretta', 'in anticipo', 'tutto il pomeriggio'],
      variabile: 'T', valore: 6,
      perche: 'Il tempo c’è davvero, e averne cambia il modo in cui si fa una cosa. Si ' +
              'può controllare. Ci si può correggere, e rifare un pezzo senza che salti ' +
              'tutto il resto.' },

    /* --- M, l'ambiente intorno --- */
    { chiavi: ['affollat', 'pieno di gente', 'folla', 'coda', 'fila'],
      variabile: 'M', valore: -8,
      perche: 'Lo spazio è pieno di gente, e questo è ambiente. Pesa sul gesto anche se ' +
              'il compito da fare resta lo stesso di sempre.' },
    { chiavi: ['rumor', 'chiasso', 'urla', 'casino'],
      variabile: 'M', valore: -7,
      perche: 'Il rumore fa parte dell’ambiente. Sta lì e non risponde a quello che stai ' +
              'facendo: quindi conta prima del dado, non dopo.' },
    { chiavi: ['non trovo', 'non le trovo', 'non lo trovo', 'non li trovo',
               'sparit', 'non sono dove', 'chissà dove'],
      variabile: 'M', valore: -7,
      perche: 'Un oggetto che non è al suo posto fa parte dell’ambiente. Il gesto ' +
              'non è diventato più complicato: è il posto intorno che non aiuta.' },
    { chiavi: ['disordin', 'non trovo niente', 'tutto in giro', 'ingombr'],
      variabile: 'M', valore: -6,
      perche: 'Uno spazio in disordine obbliga a cercare e a spostare, prima ancora di ' +
              'fare. È l’ambiente che non collabora. Il compito non è diventato più ' +
              'difficile.' },
    { chiavi: ['buio', 'poca luce', 'al freddo', 'gelo', 'pioggia', 'sotto la pioggia'],
      variabile: 'M', valore: -6,
      perche: 'Il buio, il freddo e la pioggia non cambiano che cosa va fatto. Cambiano ' +
              'quanto costa farlo. Sono le condizioni fisiche del posto in cui ti trovi.' },
    { chiavi: ['non funziona', 'rotto', 'guast', 'si è inceppat', 'non parte'],
      variabile: 'M', valore: -8,
      perche: 'Uno strumento che manca o non funziona fa parte dell’ambiente. Diverso è ' +
              'il caso in cui reagisce mentre ci provi. Si inceppa proprio adesso, ' +
              'rifiuta proprio adesso. Quello è campo attivo, e resta fuori dalla ' +
              'formula.' },
    { chiavi: ['tutto pronto', 'già preparat', 'a portata di mano', 'tutto al suo posto'],
      variabile: 'M', valore: 6,
      perche: 'L’ambiente è già pronto, e quando è pronto lavora a favore. Le cose sono ' +
              'al loro posto, e non c’è niente da cercare prima di cominciare.' },

    /* --- BP, la protezione concreta --- */
    { chiavi: ['mi aiuta', 'mi dà una mano', 'se ne occupa', 'ci pensa lui', 'ci pensa lei',
               'qualcuno lo fa per me'],
      variabile: 'BP', valore: 8,
      perche: 'È un aiuto concreto, e toglie davvero carico. Qualcuno fa al posto tuo una parte del lavoro. Un incoraggiamento, invece, non è protezione.' },
    { chiavi: ['mi ha detto che ce la faccio', 'mi fa il tifo', 'mi incoraggia'],
      variabile: 'BP', valore: 0,
      perche: 'È un supporto che scalda e non toglie lavoro, e il libro su questo è netto: ' +
              'non conta come protezione. La proposta resta zero, ed è voluto.' },

    /* --- STR, il carico che ci si porta dietro --- */
    { chiavi: ['da giorni', 'da settimane', 'è una settimana che', 'ogni giorno così',
               'da mesi', 'periodo pesante', 'giorni che', 'giorno che ci provo',
               'terzo giorno', 'terza volta che', 'sono settimane'],
      variabile: 'STR', valore: 18,
      perche: 'Quando una condizione dura da giorni, smette di essere il corpo di adesso. Diventa carico.' },
    { chiavi: ['sono a pezzi da', 'esaurit', 'non reggo più', 'al limite'],
      variabile: 'STR', valore: 22,
      perche: 'Chi racconta la scena dice da sé di essere arrivato al limite. Non è la ' +
              'stanchezza di oggi: è quella che si è accumulata nei giorni prima.' },
    { chiavi: ['sono tranquill', 'settimana leggera', 'periodo calmo'],
      variabile: 'STR', valore: -12,
      perche: 'Il carico di fondo, in questo periodo, è basso. La scena parte da una ' +
              'condizione buona, e anche questo va contato.' },

    /* --- DEB, il debito da insistenza --- */
    { chiavi: ['riprovo', 'ho riprovato', 'per la terza volta', 'continuo a provare',
               'insisto', 'ancora una volta'],
      variabile: 'DEB', valore: 1,
      perche: 'Il debito misura proprio questo: insistere nello stesso modo, senza ' +
              'cambiare strada. Il libro però chiede di più. Vuole che ci siano insieme ' +
              'le sei condizioni del capitolo 7. Qui si propone un punto di debito, e va ' +
              'confermato.' },

    { chiavi: ['in ansia', 'ansios', 'agitat', 'col cuore in gola'],
      variabile: 'E', valore: -8,
      perche: 'Il cuore batte forte, le mani tremano, il respiro si accorcia. Sta ' +
              'succedendo nel corpo, adesso, e quindi si conta lì.' },
    { chiavi: ['ho fame', 'a stomaco vuoto', 'non ho mangiato'],
      variabile: 'E', valore: -6,
      perche: 'Fame e digiuno tolgono forze al corpo. Proprio come il sonno mancato.' },
    { chiavi: ['distratt', 'la testa altrove', 'non riesco a concentrarmi', 'penso ad altro'],
      variabile: 'I', valore: -6,
      perche: 'Se l’attenzione è altrove, il compito è meno chiaro. Anche quando le istruzioni ci sono.' },
    { chiavi: ['notifiche', 'squilla il telefono', 'continuano a scrivermi', 'suona il telefono'],
      variabile: 'M', valore: -6,
      perche: 'Le interruzioni che arrivano da fuori sono ambiente. Se qualcuno REAGISCE al tentativo, è invece campo attivo.' },
    { chiavi: ['sotto pressione', 'mi stanno addosso', 'mi aspettano', 'tutti aspettano'],
      variabile: 'T', valore: -8,
      perche: 'La pressione di chi aspetta stringe il tempo di questo momento. Il gesto non è cambiato, ma lo spazio per farlo sì.' },

    /* --- C, i pezzi da coordinare --- */
    { chiavi: ['mentre', 'nello stesso tempo', 'contemporaneamente', 'insieme a',
               'e intanto', 'allo stesso tempo'],
      variabile: 'C', valore: 1,
      perche: 'Due cose tenute insieme sono un coordinamento in più. È complessità, non fretta.' },
    { chiavi: ['con i bambini', 'con il bambino', 'con la bambina', 'con mio figlio', 'con mia figlia'],
      variabile: 'C', valore: 1,
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
    { chiavi: ['rifiuta il codice', 'mi butta fuori', 'dà errore', 'scade la sessione'],
      nome: 'un servizio che risponde male al tentativo' },
    { chiavi: ['alza la voce', 'si arrabbia', 'mi interrompe', 'ribatte'],
      nome: 'un’altra persona che reagisce' },
    { chiavi: ['si inceppa proprio', 'si blocca mentre', 'cede'], nome: 'un oggetto che cede sotto il gesto' }
  ];

  /* le parole che aprono un nuovo gesto dentro la stessa frase */
  var CONGIUNZIONI = [' poi ', ' e poi ', ' quindi ', ' dopo ', ' infine ', ' allora '];

  var API = { CLASSI: CLASSI, AZIONI: AZIONI, CONDIZIONI: CONDIZIONI,
              CAMPO_ATTIVO: CAMPO_ATTIVO, CONGIUNZIONI: CONGIUNZIONI };
  globale.Lessico = API;
  if (typeof module !== 'undefined' && module.exports) { module.exports = API; }
}(typeof window !== 'undefined' ? window : this));
