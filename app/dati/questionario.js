/* =============================================================================
   SIMULATORE 3.0 — Il questionario
   =============================================================================
   DA DOVE VIENE

   La STRUTTURA è quella dell'Apparato C del libro pubblicato: quattro tarature,
   rapida · standard · profonda · professionale, con le sei domande della
   Tabella 6 riportate parola per parola.

   Le DOMANDE vengono da due fonti:
     · `libro` — testuali dall'Apparato C
     · `Q0xx`  — dalle 35 domande distinte del report ufficiale dei 500 nodi,
                 generalizzate: nel report parlano di Marco in terza persona e
                 sono ancorate a una scena precisa («fra le 05:42 e le 05:50»).
                 Qui parlano a chi risponde.
     · `derivata` — scritte per coprire un blocco che il libro nomina ma non
                 dettaglia. Sono dichiarate come tali.

   GLI EFFETTI
   Ogni risposta sposta qualcosa. I coefficienti sono ancorati, dove esiste, al
   punto di taratura documentato nel report (esempio: «è già in ritardo» vale
   initial_STR +6). Dove non esiste, sono una scelta di questa implementazione:
   il campo `fonte` lo dice sempre.

   ⚠️ LE DOMANDE DI SICUREZZA VENGONO PRIMA DI TUTTO
   Non contribuiscono al calcolo: se una di esse si accende, il simulatore non
   calcola. «Ci sono casi in cui il simulatore deve prima proteggere, non
   calcolare.»

   IL LIBRO AVVERTE
   «Chiedere trenta domande sarebbe eccessivo» per una scena semplice.
   «Una persona sotto pressione non ha sempre la disponibilità mentale per
   rispondere a venti domande.» La taratura si sceglie in base alla scena, non
   si fa sempre la più lunga.
   ========================================================================== */

(function (globale) {
  'use strict';

  /* --------------------------------------------------------------------
     SICUREZZA — il cancello che precede il calcolo
     -------------------------------------------------------------------- */
  var SICUREZZA = [
    { id: 'S1', testo: 'C’è un pericolo fisico immediato, in questo momento? Per esempio cadere, farti male, perdere il controllo di un mezzo.' },
    { id: 'S2', testo: 'C’è qualcuno che usa violenza, che minaccia, o di cui hai paura?' },
    { id: 'S3', testo: 'Hai sintomi gravi, in questo momento? Un dolore forte, il fiato che manca, la testa confusa, la sensazione di svenire.' },
    { id: 'S4', testo: 'Stai per prendere una decisione da cui poi è difficile tornare indietro? E proprio adesso non ti senti lucido?' },
    { id: 'S5', testo: 'Ti senti in una disperazione che fatichi a reggere?' }
  ];

  /* --------------------------------------------------------------------
     LE DOMANDE
     tipo 'scala'  → 0-10, con `neutro` e `per_punto` (effetto per punto di scarto)
     tipo 'scelta' → opzioni esplicite, ciascuna con i suoi effetti
     -------------------------------------------------------------------- */

  /* IL RUOLO DI UNA DOMANDA — misurato, non dichiarato a priori
     `_taratura/domande.js` misura quanto ogni domanda separa il risultato su
     4.000 compilazioni intere. Ne sono venute fuori tre categorie:

       diretta       sposta il risultato da sola (da 1 a 16 punti di Pn)
       corroborante  conferma una diretta e da sola sposta quasi niente
       cornice       non tocca il calcolo per disegno: dice chi compila e
                     con quanta certezza, e serve al referto

     PERCHE' ESISTONO LE CORROBORANTI, E PERCHE' NON SI GONFIANO
     Sul carico il questionario ha una domanda diretta — «arrivi gia' molto
     stressato?», che vale fino a 80 punti — e diciassette che la confermano.
     La regola di aggregazione fa quello che deve: la diretta fissa il livello,
     le altre lo correggono al 22,8 %. Una corroborante finisce cosi' a
     spostare il carico di due o tre punti.

     E due o tre punti di carico, quasi sempre, non cambiano niente: la
     penalita' del libro e' a GRADINI DA VENTI PUNTI. Una domanda che sposta
     il carico di tre punti cambia la probabilita' solo se capita a cavallo di
     un gradino — circa una volta su sette.

     Non e' un difetto da correggere alzando i coefficienti: sarebbe inventare
     numeri per far sembrare importante una domanda che non lo e'. E' una cosa
     da SAPERE quando si decide se una domanda vale il tempo di chi risponde. */
  /* `sempre`: la domanda vale per qualunque scena, a prescindere da quali leve
     la famiglia riconosciuta dichiara sensibili — come le sei domande minime
     o quelle di cornice, ma dichiarato nel dato invece che nell'id. Serve per
     le condizioni ambientali estreme (T17-T20): il freddo estremo cambia
     «bere un bicchiere d'acqua» tanto quanto cambia «guidare», quindi non
     deve dipendere dal fatto che quella scena tocchi già E o M. */
  function scala(id, liv, area, terr, testo, aiuto, estremi, neutro, effetti, fonte, ruolo, sempre) {
    return { id: id, livello: liv, area: area, territorio: terr, testo: testo,
             aiuto: aiuto, tipo: 'scala', min: 0, max: 10, neutro: neutro,
             estremi: estremi, per_punto: effetti, fonte: fonte,
             ruolo: ruolo || 'diretta', sempre: !!sempre };
  }
  function scelta(id, liv, area, terr, testo, aiuto, opzioni, fonte, ruolo, sempre) {
    return { id: id, livello: liv, area: area, territorio: terr, testo: testo,
             aiuto: aiuto, tipo: 'scelta', opzioni: opzioni, fonte: fonte,
             ruolo: ruolo || 'diretta', sempre: !!sempre };
  }

  var DOMANDE = [

    /* ===== TARATURA RAPIDA — le sei della Tabella 6, parola per parola ===== */

    scelta('R1', 'rapida', 'Corpo', 'cura_corpo',
      'Com’è il corpo adesso: disponibile, neutro, affaticato?',
      'Conta soltanto come stai in questo momento. Lo stress che ti porti dietro da ' +
      'settimane è un’altra cosa, e te lo chiede un’altra domanda, più avanti.',
      [{ testo: 'Disponibile, riposato', effetti: { E: 5 } },
       { testo: 'Neutro', effetti: { E: 0 } },
       { testo: 'Un po’ affaticato', effetti: { E: -5 } },
       { testo: 'Molto affaticato, o con dolore', effetti: { E: -12 } }], 'libro'),

    scelta('R2', 'rapida', 'Chiarezza', 'trasversale',
      'Sai esattamente che cosa fare?',
      'Non ti si chiede se ne sei capace, ma se hai chiaro come si fa. Per questo un ' +
      'modulo scritto male toglie punti proprio qui, anche a chi sa benissimo che cosa ' +
      'vuole ottenere.',
      [{ testo: 'Sì, so esattamente come si fa', effetti: { I: 5 } },
       { testo: 'Più o meno', effetti: { I: 0 } },
       { testo: 'Ho dei dubbi su qualche passaggio', effetti: { I: -6 } },
       { testo: 'No, devo capirlo mentre lo faccio', effetti: { I: -14 } }], 'libro'),

    scelta('R3', 'rapida', 'Tempo', 'trasversale',
      'Hai margine o sei stretto?',
      'Qui conta soltanto la fretta di questo momento, non la vita di corsa in generale. ' +
      'Quella è il carico, cioè lo stress che uno si porta dietro da prima e non quello di ' +
      'adesso, e te lo chiede un’altra domanda, più avanti.',
      [{ testo: 'Ho tutto il tempo che serve', effetti: { T: 3 } },
       { testo: 'Ho il tempo che basta', effetti: { T: 0 } },
       { testo: 'Sono un po’ stretto con i tempi', effetti: { T: -6 } },
       { testo: 'Sono già in ritardo', effetti: { T: -10 }, secondari: { initial_STR: 6 } }], 'Q009'),

    scelta('R4', 'rapida', 'Ambiente', 'casa',
      'Oggetti, spazio e strumenti sono pronti?',
      'Qui conta l’ambiente che sta lì fermo: gli oggetti, lo spazio, gli strumenti. Se ' +
      'invece qualcosa ti si mette di traverso mentre agisci, è un’altra cosa, e conta ' +
      'dopo, non qui.',
      [{ testo: 'Tutto a posto e a portata', effetti: { M: 4 } },
       { testo: 'Come al solito', effetti: { M: 0 } },
       { testo: 'Qualcosa manca o è fuori posto', effetti: { M: -5 } },
       { testo: 'L’ambiente rema contro', effetti: { M: -10 } }], 'libro'),

    scala('R5', 'rapida', 'Carico', 'trasversale',
      'Arrivi già molto stressato?',
      'Da 0, del tutto scarico, a 10, al limite. Non è la stanchezza di questo minuto, è ' +
      'il carico che ti eri già portato dietro prima ancora di cominciare.',
      ['scarico', 'al limite'], 0,
      { initial_STR: 8 }, 'libro'),

    scelta('R6', 'rapida', 'Aiuto', 'relazione',
      'C’è una protezione concreta o solo un incoraggiamento?',
      'Una protezione, qui, è un aiuto concreto che toglie davvero carico. Una frase gentile ' +
      'conforta e basta: dopo averla sentita, il lavoro da fare è ancora tutto tuo. Dal ' +
      'livello standard in su, nelle scene di relazione, trovi anche T13, che è la stessa ' +
      'area con più dettaglio, e rispondere a tutte e due non conta doppio nel calcolo.',
      [{ testo: 'Qualcuno fa davvero una parte del lavoro', effetti: { BP: 8 }, secondari: { initial_BP: 3 } },
       { testo: 'C’è uno strumento o una condizione che aiuta davvero', effetti: { BP: 5 } },
       { testo: 'C’è solo un incoraggiamento a parole', effetti: {}, secondari: { initial_STR: 2 } },
       { testo: 'Non c’è niente di tutto questo', effetti: { initial_STR: 3, initial_POS: -1 } }], 'libro/Q015'),

    /* ===== TARATURA STANDARD — i sei blocchi della Tabella 7 ===== */

    scala('T1', 'standard', 'Stato iniziale', 'cura_corpo',
      'Quanto hai dormito, e com’è stato il sonno?',
      'Da 0, notte pessima o pochissime ore, a 10, dormito bene e abbastanza. Conta ' +
      'l’ultima notte. La settimana intera te la chiede una domanda più avanti.',
      ['pessimo', 'ottimo'], 6, { E: 1 }, 'Q001'),

    scala('T2', 'standard', 'Stato iniziale', 'cura_corpo',
      'C’è un dolore o un fastidio fisico che ti accompagna?',
      'Da 0, nessuno, a 10, molto presente. Vale anche un fastidio piccolo, se però non ' +
      'ti molla un attimo.',
      ['nessuno', 'molto presente'], 0, { E: -1.2 }, 'Q003'),

    scelta('T3', 'standard', 'Stato iniziale', 'cura_corpo',
      'Hai mangiato e bevuto abbastanza?',
      'La fame toglie energia al corpo, e bere poco fa lo stesso. Quasi sempre non ce ne ' +
      'accorgiamo nemmeno.',
      [{ testo: 'Sì, ho mangiato e bevuto normalmente', effetti: {} },
       { testo: 'Un po’ meno del solito', effetti: { E: -3 } },
       { testo: 'No: sono a digiuno, o non bevo da ore', effetti: { E: -8 }, secondari: { initial_STR: 2 } }], 'derivata'),

    /* «assetto» compare qui per la prima volta nel questionario: sciolto fra
       parentesi nell'aiuto, come chiede la regola sui termini tecnici. */
    scala('T4', 'standard', 'Stato iniziale', 'trasversale',
      'Quanto ti senti in ordine, come assetto generale?',
      'Da 0, tutto scomposto, a 10, in ordine. L’assetto, cioè quanto ti senti stabile e ' +
      'con le cose sotto controllo, non è l’umore di questo momento: è una condizione più ' +
      'di fondo, che cambia più lentamente.',
      /* 4,5 e non 4: MISURATO. Con 4, la risposta peggiore porta l'assetto a
         esattamente 36, e la scogliera dell'assetto sta a «sotto 36». La
         domanda si fermava sul bordo senza mai attraversarlo: veniva fatta e
         non poteva cambiare niente. Con 4,5 arriva a 33. */
      ['tutto scomposto', 'in ordine'], 6, { initial_POS: 4.5 }, 'libro'),

    scelta('T5', 'standard', 'Struttura', 'trasversale',
      'Quante cose vanno fatte insieme, nell’ordine giusto?',
      'Ogni pezzo in più costa cinque punti di probabilità, e per questo qui si contano ' +
      'solo i coordinamenti veri, uno per uno. Non è il posto in cui far finire tutto ' +
      'quello che potrebbe andare storto.',
      [{ testo: 'Una sola', effetti: { C: 0 } },
       { testo: 'Due, una dopo l’altra', effetti: { C: 1 } },
       { testo: 'Tre o quattro, con un ordine da rispettare', effetti: { C: 3 } },
       { testo: 'Molte, e alcune dipendono le une dalle altre', effetti: { C: 5 } }], 'libro'),

    scelta('T6', 'standard', 'Struttura', 'trasversale',
      'Se una parte va storta, il resto si blocca?',
      'Quando un pezzo dipende dall’altro, la scena è più fragile di quanto sembri, e non ' +
      'basta contare i passaggi: se salta il primo, si ferma tutto il resto.',
      [{ testo: 'No, ogni pezzo va avanti per conto suo', effetti: {} },
       { testo: 'In parte: qualcosa si blocca, il resto no', effetti: { C: 1 } },
       { testo: 'Sì, è una catena: salta uno e salta tutto', effetti: { C: 2 }, secondari: { initial_STR: 2 } }], 'derivata'),

    scelta('T7', 'standard', 'Tempo reale', 'trasversale',
      'C’è una scadenza vera?',
      'Una scadenza vera, con qualcuno dall’altra parte che aspetta, pesa in un modo; ' +
      'una che ti sei dato da solo pesa in un altro.',
      [{ testo: 'No', effetti: {} },
       { testo: 'Sì, ma con margine', effetti: { T: -3 } },
       { testo: 'Sì, e il margine è poco', effetti: { T: -8 }, secondari: { initial_STR: 3 } },
       { testo: 'È già passata', effetti: { T: -12, initial_POS: -2 }, secondari: { initial_STR: 5 } }], 'derivata'),

    scelta('T8', 'standard', 'Tempo reale', 'trasversale',
      'Puoi fermarti a metà se serve?',
      'Potersi fermare cambia molto il rischio di una scena. Se puoi fermarti a metà, un ' +
      'intoppo non diventa subito un fallimento.',
      [{ testo: 'Sì, senza conseguenze', effetti: { BP: 4 } },
       { testo: 'Sì, ma con qualche costo', effetti: {} },
       { testo: 'No: una volta iniziato devo arrivare in fondo', effetti: { initial_STR: 3 } }], 'derivata'),

    scelta('T9', 'standard', 'Informazioni', 'digitale',
      'Le istruzioni ci sono e si capiscono?',
      'Vale per qualunque cosa vada letta prima di agire: un modulo, un referto, un ' +
      'messaggio, o il libretto di un elettrodomestico.',
      [{ testo: 'Sì, ci sono e sono chiare', effetti: { I: 4 } },
       { testo: 'Ci sono, ma sono scritte male', effetti: { I: -7 } },
       { testo: 'Non ci sono: vado a memoria', effetti: { I: -5 } },
       { testo: 'Non ci sono, e non ho mai fatto questa cosa', effetti: { I: -14 } }], 'derivata'),

    scelta('T10', 'standard', 'Informazioni', 'trasversale',
      'L’obiettivo è chiaro, o è ancora da definire?',
      'Sapere che cosa vuol dire «riuscito» è già metà del lavoro.',
      [{ testo: 'Chiarissimo', effetti: { I: 3 } },
       { testo: 'Abbastanza', effetti: {} },
       { testo: 'Vago: capirò strada facendo', effetti: { I: -6, initial_POS: -2 } }], 'derivata'),

    scelta('T11', 'standard', 'Campo', 'casa',
      'C’è qualcosa o qualcuno che può reagire e ostacolarti mentre agisci?',
      'Un ambiente fermo pesa in un modo, e uno che risponde mentre agisci è tutt’altra ' +
      'cosa: per questo conta dopo, non dentro il numero di partenza. Il modello lo chiama ' +
      'campo attivo.',
      [{ testo: 'No', effetti: {} },
       { testo: 'Sì, in modo lieve (un animale, un oggetto instabile)', effetti: { campo: 8 } },
       { testo: 'Sì, in modo serio (una persona, un imprevisto probabile)', effetti: { campo: 15 } },
       { testo: 'Sì, in modo forte (qualcosa che di sicuro mi si mette di traverso)', effetti: { campo: 25 } }], 'libro'),

    scala('T12', 'standard', 'Campo', 'casa',
      'Quanto è rumoroso o affollato lo spazio intorno?',
      'Da 0, silenzio e spazio libero, a 10, molto rumore o molta gente. Non conta ' +
      'quanto il rumore ti dia fastidio, ma quanto ce n’è.',
      ['silenzio', 'molto rumore'], 2, { M: -0.9 }, 'Q030'),

    scelta('T13', 'standard', 'Supporto', 'relazione',
      'Se chiedi aiuto, che tipo di aiuto arriva?',
      'Il libro insiste su questa distinzione: un aiuto che consola non è un aiuto che ' +
      'toglie lavoro. È la stessa area di R6, con più sfumature, e qui il tipo di ' +
      'supporto entra anche nel racconto, cioè nel testo in prosa che il simulatore scrive ' +
      'alla fine sotto i numeri, e non solo nel numero.',
      [{ testo: 'Qualcuno prende in carico una parte davvero', effetti: { supporto: 'pratico', riduzione_carico: 0.4, BP: 6, initial_POS: 3 } },
       { testo: 'Qualcuno dà informazioni utili', effetti: { supporto: 'informativo', I: 4 } },
       { testo: 'Qualcuno mi sta vicino ma il lavoro resta mio', effetti: { supporto: 'emotivo' } },
       { testo: 'Nessuno, o solo a parole', effetti: { supporto: 'assente', initial_STR: 3, initial_POS: -1 } }], 'libro/Q015'),

    scala('T14', 'standard', 'Supporto', 'relazione',
      'Quanto ti senti solo in questo carico?',
      'Da 0, per niente, a 10, del tutto solo. Non conta quanta gente hai intorno, ma ' +
      'quanta parte di questo carico resta addosso a te.',
      ['per niente', 'del tutto solo'], 3, { initial_STR: 0.9, initial_POS: -0.7 }, 'Q026'),

    /* T15 e T16 — la mobilità, l'unico ambito completamente scoperto fino al
       19/8: nessuna domanda del questionario toccava M con territorio
       'mobilita', e `selezione.js` lo segnalava già come lacuna [§ 0.2.1].
       Il capitolo 30 dice che qui M «è quasi sempre dominante: strada,
       traffico, luce, meteo, marciapiede, scale, parcheggi», e che il campo
       compare «in forma netta»: un'auto che taglia la strada, il cane che
       tira, il mezzo che salta. Sono due leve diverse — l'ambiente che c'era
       già, e ciò che risponde durante il tentativo — e il libro insiste
       sull'errore di scambiarle: «il traffico previsto» in K/Pd invece che
       in M è l'errore di domicilio classico del capitolo. */
    scala('T15', 'standard', 'Ambiente', 'mobilita',
      'Quanto è difficile il tragitto, in questo momento? Traffico, meteo, parcheggio.',
      'Vale anche la strada di sempre: se a quell’ora è sempre così, non è un ' +
      'imprevisto, è l’ambiente in cui parti.',
      ['per niente', 'molto'], 2, { M: -1.0 }, 'derivata'),

    scelta('T16', 'standard', 'Campo', 'mobilita',
      'C’è qualcosa che può reagire mentre ti sposti, e mettersi di traverso? Un’altra ' +
      'auto, il mezzo pubblico, un animale.',
      'Il traffico che ti aspettavi è ambiente, e conta prima. Quello che succede mentre ' +
      'ti muovi è un’altra cosa, un’auto che taglia la strada o un cane che tira, e ' +
      'conta dopo.',
      [{ testo: 'No', effetti: {} },
       { testo: 'Sì, in modo lieve (un animale, un piccolo imprevisto)', effetti: { campo: 8 } },
       { testo: 'Sì, in modo serio (un mezzo in ritardo, una deviazione)', effetti: { campo: 15 } },
       { testo: 'Sì, in modo forte (qualcosa che di sicuro mi farà cambiare strada)', effetti: { campo: 25 } }], 'derivata'),

    /* T17-T20 — condizioni ambientali estreme, senza dipendere da un'IA.
       [claude/condizioni-estreme-senza-ia.md, 19/8]

       Il simulatore doveva poter reggere scene fuori dall'ordinario — un igloo al
       Polo Nord, una capanna in Amazzonia, caldo o freddo estremi, isolamento —
       senza appoggiarsi a nessuna intelligenza artificiale, nemmeno opzionale.
       Non serve sapere DOVE si trova la persona: serve misurare QUANTO quel luogo
       è severo, su un piccolo numero di assi che qualunque scena attraversa. È lo
       stesso principio delle quaranta famiglie V: non si catalogano i luoghi, si
       catalogano le dimensioni lungo cui i luoghi variano.

       Per questo le quattro domande sono `territorio: 'trasversale'`, non legate
       a nessuna famiglia: il freddo estremo cambia «bere un bicchiere d'acqua»
       tanto quanto cambia «guidare». Il dato dichiara `sempre: true`, che
       `selezione.js` legge per non farle mai dipendere dalle leve sensibili
       della famiglia riconosciuta — altrimenti sarebbe il decimo errore della
       stessa famiglia del nono (T11/T16 invisibili per il campo): qui non si
       ripete, verificato con un test dedicato.

       DOMICILIO UNICO: un primo giro assegnava a ogni opzione severa sia E
       (o M) sia un secondo effetto diretto su un'altra variabile che entra
       nella formula (per esempio E insieme a M nella stessa opzione): il
       test 1bis lo ha bocciato subito, giustamente — lo stesso fatto non può
       avere due domicili nella Pn. Ogni domanda qui tocca UNA sola variabile
       che entra nella formula; dove il fatto tocca davvero anche altro (il
       freddo estremo pesa anche sull'ambiente, non solo sul corpo), quel
       secondo effetto è dichiarato in `secondari` e non sommato — si vede
       nel report, non nel calcolo.

       Le magnitudini sono ancorate a quelle già pubblicate: R1 (corpo) vale al
       peggio E −12, R4 (ambiente) M −10, P15 (temperatura, versione mite) E −8,
       T11/T16 (campo) al peggio 25. Qui si descrivono condizioni davvero
       estreme — non «fa freddo», ma «gelo senza riparo» — quindi in teoria il
       peggio dovrebbe arrivare più in basso di quegli ancoraggi.

       MISURATO, e ridotto di conseguenza. Un primo giro con E fino a −23 (T17)
       e M fino a −20 (T19) passava la taratura di `_taratura/condizioni-
       ambientali.js` (nessuna muta) ma rompeva un test preesistente in
       `_test/questionario.js` («su un compito facile si vedono almeno 8
       risultati diversi»): con TUTTE le domande standard sfavorevoli insieme,
       compreso T20 che tocca ancora E, il grezzo toccava il pavimento del
       clamp già a un quarto del percorso, e il questionario smetteva di
       distinguere per il resto — non perché una singola domanda sbagli, ma
       perché più domande sulla stessa variabile (E: R1, T1, T2, T3, T17, T20)
       si sommano con l'aggregazione. Misurato il fattore che restituisce la
       stessa capacità di distinguere di prima dell'aggiunta (10 valori
       distinti su 21, la stessa misura di quando T17-T20 non esistevano
       ancora): un fattore ~0,6 sulle opzioni più severe. Le magnitudini qui
       sotto sono già quel valore, non quello «teoricamente ancorato» di
       prima. Resta comunque un peggio ben più severo delle domande ordinarie
       sulla stessa variabile (T17 worst E −14 contro il −12 di R1, ma R1 è
       quotidiana e T17 worst è eccezionale in modo dichiarato). Ruolo e
       spread ri-misurati in `_taratura/condizioni-ambientali.js` dopo la
       riduzione: nessuna delle quattro è muta. */
    scelta('T17', 'standard', 'Ambiente', 'trasversale',
      'Che condizioni di temperatura, luce o intemperie ci sono?',
      'Non il disagio di tutti i giorni, che lo chiede un’altra domanda. Qui si parla ' +
      'di condizioni a cui un vestito o un riparo normali non bastano.',
      [{ testo: 'Normali', effetti: {} },
       { testo: 'Disagio evidente (molto caldo o freddo, pioggia forte, vento forte)', effetti: { E: -4 } },
       { testo: 'Severe: gelo, caldo forte o tempesta, e serve attenzione continua',
         effetti: { E: -9 }, secondari: { M: -5, initial_STR: 2 } },
       { testo: 'Estreme, e senza un riparo che basti: gelo o caldo fuori scala, elementi ostili',
         effetti: { E: -14 }, secondari: { M: -8, initial_STR: 4, initial_POS: -2 } }], 'derivata', 'diretta', true),

    scelta('T18', 'standard', 'Campo', 'trasversale',
      'Se qualcosa va storto, un aiuto vero quanto è vicino?',
      'Non conta un incoraggiamento a distanza, ma chi può davvero arrivare fin lì e fare qualcosa.',
      [{ testo: 'Vicino, arriva in pochi minuti', effetti: {} },
       { testo: 'C’è, ma ci vorrebbe un po’ di tempo', effetti: { campo: 6 } },
       { testo: 'Lontano: ci vorrebbero ore', effetti: { campo: 14 }, secondari: { initial_STR: 4, initial_POS: -2 } },
       { testo: 'Non c’è nessun aiuto raggiungibile in tempo utile', effetti: { campo: 22 }, secondari: { initial_STR: 7, initial_POS: -4 } }], 'derivata', 'diretta', true),

    scelta('T19', 'standard', 'Ambiente', 'trasversale',
      'Ci sono acqua corrente, elettricità e un modo per comunicare?',
      'Sono le cose che altrove si danno per scontate, e che qui potrebbero non esserci.',
      [{ testo: 'Sì, tutto funziona normalmente', effetti: {} },
       { testo: 'Qualcosa è limitato o incostante (linea che va e viene, corrente incerta)', effetti: { M: -4 } },
       { testo: 'Mancano più cose essenziali (niente acqua corrente o elettricità)',
         effetti: { M: -8 }, secondari: { I: -5, initial_STR: 2 } },
       { testo: 'Nessuna infrastruttura di base disponibile',
         effetti: { M: -12 }, secondari: { I: -8, initial_STR: 4, initial_POS: -2 } }], 'derivata', 'diretta', true),

    /* T20 sta su un unico domicilio, E: il terreno o la quota difficili
       costano soprattutto fatica fisica. Non porta nemmeno un `secondari`
       (a differenza di T17-T19): dichiarare un secondo effetto solo per
       sembrare più completa sarebbe inventare un fatto che la domanda non
       descrive. La visibilità in ogni scena la garantisce `sempre`, non un
       numero aggiunto per farla notare dal filtro. */
    scala('T20', 'standard', 'Ambiente', 'trasversale',
      'Quanto è difficile il terreno, o la quota? Pendenza, dislivello, altitudine, fondo che non tiene.',
      'Da 0, terreno comodo e in piano, a 10, terreno estremo. Vale il terreno che devi ' +
      'attraversare tu, non il paesaggio che hai intorno.',
      ['comodo', 'estremo'], 0, { E: -0.8 }, 'derivata', 'diretta', true),

    /* ===== TARATURA PROFONDA — gli undici elementi del libro ===== */

    scala('P1', 'profonda', 'Ultimi giorni', 'trasversale',
      'Com’è andata negli ultimi giorni?',
      'Da 0, giornate molto pesanti, a 10, giornate tranquille. Guarda l’ultima ' +
      'settimana, non l’ultimo anno.',
      ['molto pesanti', 'tranquille'], 5, { initial_STR: -1.6 }, 'libro'),

    scala('P2', 'profonda', 'Sonno', 'cura_corpo',
      'Negli ultimi giorni hai dormito bene?',
      'Il debito di sonno si accumula, e per questo una notte buona, dopo una settimana ' +
      'storta, non azzera niente.',
      ['per niente', 'benissimo'], 6, { initial_STR: -1.4 }, 'Q001', 'corroborante'),

    scelta('P3', 'profonda', 'Sintomi', 'cura_corpo',
      'Ci sono sintomi o condizioni fisiche che ti accompagnano da tempo?',
      'Non serve una diagnosi, e nemmeno il nome di una malattia. Basta quello che senti addosso.',
      [{ testo: 'No', effetti: {} },
       { testo: 'Sì, lievi', effetti: { E: -3 }, secondari: { initial_STR: 2 } },
       { testo: 'Sì, e condizionano quello che posso fare', effetti: { E: -8, initial_POS: -3 }, secondari: { initial_STR: 5 } }], 'Q003'),

    scala('P4', 'profonda', 'Carico', 'lavoro_studio',
      'Quanto è pesante il carico di lavoro o di studio in questo periodo?',
      'Da 0, leggero, a 10, insostenibile. Conta come sta andando il periodo, non com’è ' +
      'andata oggi.',
      ['leggero', 'insostenibile'], 4, { initial_STR: 1.3, initial_POS: -0.5 }, 'Q023'),

    scala('P5', 'profonda', 'Carico', 'cura_fragilita',
      'Quanto è pesante il carico familiare, o di cura di qualcuno?',
      'Vale anche se è un carico che hai scelto e a cui tieni.',
      ['leggero', 'insostenibile'], 3, { initial_STR: 1.4, initial_POS: -0.6 }, 'Q022'),

    scelta('P6', 'profonda', 'Delega', 'relazione',
      'Le cose che hai delegato vengono fatte davvero?',
      'Una delega finta costa più che non delegare: ci si aspetta che sia fatto, e non lo è.',
      [{ testo: 'Sì, e non devo ricontrollare', effetti: { delega: 'reale', BP: 6, initial_POS: 4 } },
       { testo: 'In parte, devo tenerle d’occhio', effetti: { delega: 'parziale' } },
       { testo: 'Le delego ma poi le rifaccio io', effetti: { delega: 'finta', initial_STR: 4, initial_POS: -3 } },
       { testo: 'Non delego niente', effetti: { delega: 'assente', initial_STR: 3 } }], 'libro'),

    scelta('P7', 'profonda', 'Recupero', 'trasversale',
      'Quando ti fermi, ti fermi davvero?',
      'Una pausa che non cambia niente non è un recupero, è solo un’interruzione. Nel ' +
      'modello un recupero è una pausa che toglie carico davvero, non una che dà solo ' +
      'sollievo.',
      [{ testo: 'Sì, e dopo qualcosa è cambiato', effetti: { rip: 'vera', initial_POS: 4, initial_STR: -3 } },
       { testo: 'Mi fermo, ma la testa continua a lavorare', effetti: { rip: 'debole' } },
       { testo: 'Mi fermo solo quando non ne posso più', effetti: { rip: 'tardiva', initial_STR: 3 } },
       { testo: 'Non mi fermo', effetti: { rip: 'assente', initial_STR: 5, initial_POS: -2 } }], 'libro'),

    scelta('P8', 'profonda', 'Recupero', 'trasversale',
      'Riesci a fare una micro-pausa prima di iniziare qualcosa di impegnativo?',
      'Non partire subito è già una scelta, non tempo perso. Quel poco che ci si ferma ' +
      'serve ad arrivare al compito un po’ più orientati, cioè con le idee più in ordine.',
      [{ testo: 'Sì, quasi sempre', effetti: { initial_BP: 2, initial_POS: 3 } },
       { testo: 'A volte', effetti: {} },
       { testo: 'No, parto subito', effetti: { initial_STR: 2 } }], 'Q010', 'corroborante'),

    scelta('P9', 'profonda', 'Debito', 'trasversale',
      'C’è qualcosa che continui a riprovare nello stesso modo, senza che funzioni?',
      'Il debito di cui parla questa domanda non è il debito di sonno di prima: è ' +
      'quello che si accumula quando si insiste sempre sullo stesso errore. Non nasce da ' +
      'un fatto isolato, ma dal continuare a riprovare nello stesso modo, senza mai ' +
      'cambiare strada.',
      [{ testo: 'No', effetti: { DEB: 0 } },
       { testo: 'Una cosa', effetti: { DEB: 1 } },
       { testo: 'Più di una, da un po’ di tempo', effetti: { DEB: 2, initial_POS: -3 } },
       { testo: 'Sì, ed è diventato lo schema con cui vivo', effetti: { DEB: 3, initial_POS: -5 }, secondari: { initial_STR: 4 } }], 'libro'),

    scala('P10', 'profonda', 'Over-functioning', 'trasversale',
      'Quanto spesso ti tocca reggere tu cose che dovrebbero reggere gli altri?',
      'Da 0, mai, a 10, praticamente sempre. Vale sia quello che succede al lavoro sia ' +
      'quello che succede a casa.',
      ['mai', 'sempre'], 3, { initial_STR: 1.1, initial_POS: -0.8 }, 'Q025'),

    scala('P11', 'profonda', 'Segnali', 'cura_corpo',
      'Ti capita di notare segnali che qualcosa non va — e di andare avanti lo stesso?',
      'Da 0, mai, a 10, spesso. Conta anche quando il segnale lo noti benissimo e poi ' +
      'tiri dritto lo stesso.',
      ['mai', 'spesso'], 2, { initial_STR: 1.2, initial_POS: -0.6 }, 'Q021', 'corroborante'),

    scelta('P12', 'profonda', 'Reattività', 'trasversale',
      'Come reagisci al primo intoppo?',
      'Non c’è una risposta giusta. Rallentare protegge, e accelerare certe volte serve, ' +
      'certe altre costa caro.',
      [{ testo: 'Rallento e controllo', effetti: { initial_POS: 3, BP: 3 } },
       { testo: 'Continuo come se niente fosse', effetti: {} },
       { testo: 'Accelero per chiudere prima', effetti: { initial_STR: 3, initial_POS: -2 } },
       { testo: 'Mi blocco', effetti: { initial_POS: -4, initial_STR: 2 } }], 'Q014'),

    scala('P13', 'profonda', 'Fiducia', 'trasversale',
      'Quanta fiducia hai di riuscire, in cose come questa?',
      'Da 0, per niente, a 10, molto. Conta quanto ti senti orientato, non quanto sei bravo.',
      ['per niente', 'molto'], 5, { initial_POS: 1.4 }, 'Q034'),

    scelta('P14', 'profonda', 'Ambiente', 'casa',
      'Lo spazio dove succede la scena è familiare?',
      'Un posto nuovo chiede attenzione anche quando è comodo.',
      [{ testo: 'Sì, lo conosco bene', effetti: { M: 3 } },
       { testo: 'Abbastanza', effetti: {} },
       { testo: 'No, è nuovo o cambiato di recente', effetti: { M: -6 }, secondari: { initial_STR: 2 } }], 'derivata'),

    scelta('P15', 'profonda', 'Ambiente', 'casa',
      'La temperatura è un problema?',
      'Il caldo e il freddo consumano energie anche quando non ci si pensa.',
      [{ testo: 'No, si sta bene', effetti: {} },
       { testo: 'Fa un po’ caldo o un po’ freddo', effetti: { E: -3 } },
       { testo: 'Fa molto caldo o molto freddo', effetti: { E: -8 }, secondari: { initial_STR: 3 } }], 'derivata'),

    scelta('P16', 'profonda', 'Interruzioni', 'trasversale',
      'Quanto è probabile che qualcuno o qualcosa ti interrompa?',
      'Le interruzioni non tolgono solo tempo: tolgono il filo.',
      [{ testo: 'Improbabile', effetti: {} },
       { testo: 'Può succedere', effetti: { T: -3, campo: 8 } },
       { testo: 'Quasi certo', effetti: { T: -6, campo: 15 }, secondari: { initial_STR: 2 } }], 'derivata'),

    scelta('P17', 'profonda', 'Adattamento', 'trasversale',
      'Se le cose si mettono male, puoi cambiare strada?',
      'Semplificare, rinviare senza fuggire, chiedere aiuto: sono tre vie d’uscita, e contano tutte.',
      [{ testo: 'Sì, ho più di un’alternativa', effetti: { adattamento: 'reale', BP: 5, initial_POS: 3 } },
       { testo: 'Una sola, e costa', effetti: { adattamento: 'parziale' } },
       { testo: 'In teoria sì, in pratica no', effetti: { adattamento: 'teorica', initial_POS: -2 } },
       { testo: 'No', effetti: { adattamento: 'non_disponibile', initial_STR: 3, initial_POS: -3 } }], 'libro'),

    scelta('P18', 'profonda', 'Anticipazione', 'trasversale',
      'Mentre fai una cosa, stai già pensando alle prossime?',
      'Pensare a tutto in anticipo stanca quanto farlo, perché la testa lavora comunque, ' +
      'anche mentre le mani fanno altro.',
      [{ testo: 'No, resto su quello che sto facendo', effetti: { initial_POS: 3 } },
       { testo: 'Ogni tanto', effetti: {} },
       { testo: 'Sì, ho sempre la giornata intera in testa', effetti: { initial_STR: 4, initial_POS: -2 } }], 'Q031'),

    /* ===== TARATURA PROFESSIONALE — qualità del dato e limiti ===== */

    scelta('X1', 'professionale', 'Qualità input', 'trasversale',
      'Chi risponde a queste domande?',
      'Quello che rispondi qui cambia come va letto il risultato, non come viene calcolato.',
      [{ testo: 'La persona stessa, adesso', effetti: { qualita: 'alta' } },
       { testo: 'La persona, ma ricordando a distanza di tempo', effetti: { qualita: 'media' } },
       { testo: 'Un professionista che osserva', effetti: { qualita: 'media' } },
       { testo: 'Qualcuno che riferisce per sentito dire', effetti: { qualita: 'bassa' } }], 'libro', 'cornice'),

    scelta('X2', 'professionale', 'Qualità input', 'trasversale',
      'Quanto sono certi i dati che hai inserito?',
      'Il libro chiede di distinguere fra certo, stimato e ipotizzato. Un numero stimato ' +
      'non diventa vero solo perché è scritto.',
      [{ testo: 'Quasi tutti certi', effetti: { qualita: 'alta' } },
       { testo: 'Un misto: alcuni certi, altri stimati', effetti: { qualita: 'media' } },
       { testo: 'Per lo più stimati', effetti: { qualita: 'bassa' } }], 'libro/Q027', 'cornice'),

    scelta('X3', 'professionale', 'Ripetibilità', 'trasversale',
      'Questa scena si ripete nel tempo o è un episodio isolato?',
      'Un episodio si legge da solo. Uno schema, invece, si legge nella traiettoria, cioè ' +
      'nell’andamento nel tempo. La risposta fissa il regime, cioè in che condizione ' +
      'generale ti trovi in questo periodo, non oggi.',
      [{ testo: 'Episodio isolato', effetti: { macro: 'macro_0_episodio_isolato' } },
       { testo: 'Capita ogni tanto', effetti: { macro: 'macro_1_catena_breve' } },
       { testo: 'Capita spesso, ma poi si recupera', effetti: { macro: 'macro_3_ripetizione_pesante_recuperabile' } },
       { testo: 'È diventata la norma', effetti: { macro: 'macro_5_spirale_stabilizzata', initial_STR: 4, initial_POS: -4 } }], 'libro'),

    scelta('X4', 'professionale', 'Confronto', 'trasversale',
      'C’è un dato osservabile con cui confrontare il risultato?',
      'Serve qualcosa di esterno con cui confrontare il risultato, perché senza il modello ' +
      'resta un ragionamento chiuso in sé stesso.',
      [{ testo: 'Sì, misure o osservazioni raccolte', effetti: {} },
       { testo: 'Solo impressioni', effetti: {} },
       { testo: 'No', effetti: {} }], 'libro', 'cornice'),

    scelta('X5', 'professionale', 'Scopo', 'trasversale',
      'A che cosa serve questa simulazione?',
      'Nemmeno questa risposta tocca il calcolo: cambia solo che cosa il racconto finale ' +
      'deve mettere in evidenza.',
      [{ testo: 'Capire una difficoltà', effetti: {} },
       { testo: 'Confrontare due modi di fare la stessa cosa', effetti: {} },
       { testo: 'Preparare un colloquio con un professionista', effetti: {} },
       { testo: 'Documentare per un uso tecnico o forense', effetti: {} }], 'derivata', 'cornice')
  ];

  /* --------------------------------------------------------------------
     I QUATTRO LIVELLI
     -------------------------------------------------------------------- */
  /* I QUATTRO «QUANDO» SI LEGGONO UNO SOTTO L'ALTRO, e chi sceglie li
     confronta: percio' hanno tutti la stessa forma — «Per ...: » e poi un
     elenco di scene, sempre con il verbo all'infinito. Prima erano quattro
     frasi costruite in quattro modi diversi (una cominciava con un
     sostantivo, una con un elenco di temi senza verbo), e messe in fila
     sembravano parlare di quattro cose che non c'entrano fra loro. */
  var LIVELLI = [
    { id: 'rapida', nome: 'Rapida', prefissi: ['R'],
      quando: 'Per le scene molto semplici: bere un bicchiere d’acqua, mandare un ' +
              'messaggio senza pensieri. Rimettere a posto un oggetto. Alzarsi dal ' +
              'divano, in una giornata come tante.' },
    { id: 'standard', nome: 'Standard', prefissi: ['R', 'T'],
      quando: 'Per le scene di tutti i giorni che hanno già qualche pezzo da tenere ' +
              'insieme: uscire di casa in ritardo, fare una pratica online. Rispondere a ' +
              'un messaggio teso. Prepararsi per un colloquio. Portare avanti una ' +
              'mattina in famiglia.' },
    { id: 'profonda', nome: 'Profonda', prefissi: ['R', 'T', 'P'],
      quando: 'Per quando pesa qualcosa che dura: affrontare una questione di salute, o ' +
              'una relazione difficile. Un lavoro sotto pressione. La cura di un’altra ' +
              'persona, o i bambini. I conflitti che tornano sempre uguali, e uno stress ' +
              'che non passa.' },
    { id: 'professionale', nome: 'Professionale', prefissi: ['R', 'T', 'P', 'X'],
      quando: 'Per un uso clinico o di ricerca, e solo per orientarsi: ripetere le ' +
              'stesse domande, identiche. Registrare le risposte con criteri fissi. Dire ' +
              'per iscritto fin dove il modello arriva.' }
  ];

  function perLivello(idLivello) {
    var liv = LIVELLI.filter(function (l) { return l.id === idLivello; })[0];
    if (!liv) { return []; }
    return DOMANDE.filter(function (d) {
      return liv.prefissi.indexOf(d.id.charAt(0)) >= 0;
    });
  }

  /* --------------------------------------------------------------------
     DALLA RISPOSTA ALL'EFFETTO
     Restituisce lo scarto da applicare, e la spiegazione di che cosa ha
     spostato: il libro chiede che si veda, non che si subisca.
     -------------------------------------------------------------------- */
  function effettiRisposta(domanda, risposta) {
    var eff = {};
    if (domanda.tipo === 'scelta') {
      var o = domanda.opzioni[risposta];
      if (o) { for (var k in o.effetti) { eff[k] = o.effetti[k]; } }
    } else {
      var scarto = risposta - domanda.neutro;
      for (var j in domanda.per_punto) {
        var v = domanda.per_punto[j] * scarto;
        eff[j] = (v >= 0) ? Math.floor(v + 0.5) : Math.ceil(v - 0.5);
      }
    }
    return eff;
  }

  /* I NOMI CHE COMPAIONO SOTTO OGNI OPZIONE.
     Sono l'unica spiegazione che chi risponde riceve di che cosa ha appena
     spostato, quindi devono dire una cosa, non ripetere la chiave. Due
     erano etichette e non nomi: «la disponibilita' di adattamento» non
     spiegava niente piu' di quanto non facesse la chiave `adattamento`, e
     «la qualita' dell'input» chiamava le risposte con una parola inglese
     che in nessun altro punto del simulatore compare. */
  var NOMI = {
    E: 'il corpo adesso', I: 'la chiarezza', T: 'la pressione del tempo',
    M: 'l’ambiente', BP: 'la protezione', C: 'i pezzi da coordinare',
    DEB: 'il debito', campo: 'il campo attivo',
    initial_STR: 'il carico di partenza', initial_POS: 'l’assetto di partenza',
    initial_BP: 'la protezione di partenza',
    supporto: 'il tipo di supporto', delega: 'il tipo di delega',
    riduzione_carico: 'la parte di carico tolta davvero',
    rip: 'il tipo di recupero', adattamento: 'la possibilità di cambiare strada',
    macro: 'il regime', qualita: 'l’attendibilità delle risposte'
  };

  /* I VALORI SCRITTI IN CHIARO.
     Alcune variabili del modello portano nomi fatti per il codice —
     «non_disponibile», «macro_5_spirale_stabilizzata» — e finivano a
     schermo tali e quali, trattino basso compreso: sotto una risposta del
     questionario si leggeva «il regime: macro_5_spirale_stabilizzata».
     Quei nomi il nucleo li pretende identici (nucleo.js li confronta con
     un elenco chiuso e scarta tutto il resto), percio' non si toccano: si
     traducono qui, nel momento in cui si scrivono. Le parole dei sei
     regimi sono le stesse che tempo.js usa per gli stessi sei regimi. */
  var VALORI_IN_CHIARO = {
    non_disponibile: 'non disponibile',
    macro_0_episodio_isolato: 'episodio isolato',
    macro_1_catena_breve: 'catena breve',
    macro_2_mini_settimana_leggera: 'mini-settimana leggera',
    macro_3_ripetizione_pesante_recuperabile: 'ripetizione pesante ma recuperabile',
    macro_4_spirale_in_formazione: 'spirale in formazione',
    macro_5_spirale_stabilizzata: 'spirale stabilizzata'
  };

  /* E I NUMERI SI SCRIVONO IN ITALIANO.
     «la parte di carico tolta davvero +0.4» era un numero inglese, con il
     punto al posto della virgola; e il meno era il trattino della
     tastiera, non il segno meno. Qui non si passa da lingua.js perche'
     questo file viene caricato anche da solo, nei controlli, dove
     lingua.js non c'e': la regola e' corta e sta tutta in due righe. */
  var MENO = '−';
  function inItaliano(v) {
    return (v < 0 ? MENO : '+') + String(Math.abs(v)).replace('.', ',');
  }

  /* E LE QUOTE PORTANO LA LORO UNITA'.
     `riduzione_carico` vale 0,4 e vuol dire «quaranta per cento», non
     «quattro decimi di punto»: scritto «+0,4» accanto a «la protezione +6»
     sembrava un punteggio piccolissimo. Si scrive in percentuale, con
     l'unita' dichiarata, come tutte le altre quote del pacchetto. */
  var QUOTE = { riduzione_carico: true };

  function spiegaEffetti(eff) {
    var out = [];
    for (var k in eff) {
      var v = eff[k];
      if (v === 0 || v === undefined) { continue; }
      var nome = NOMI[k] || k;
      if (typeof v !== 'number') {
        out.push(nome + ': ' + (VALORI_IN_CHIARO[v] || String(v).replace(/_/g, ' ')));
      } else if (QUOTE[k]) {
        out.push(nome + ' ' + Math.round(v * 100) + ' %');
      } else {
        out.push(nome + ' ' + inItaliano(v));
      }
    }
    return out;
  }

  var API = {
    SICUREZZA: SICUREZZA,
    DOMANDE: DOMANDE,
    LIVELLI: LIVELLI,
    NOMI: NOMI,
    perLivello: perLivello,
    effettiRisposta: effettiRisposta,
    spiegaEffetti: spiegaEffetti
  };

  globale.Questionario = API;
  if (typeof module !== 'undefined' && module.exports) { module.exports = API; }

})(typeof window !== 'undefined' ? window : globalThis);
