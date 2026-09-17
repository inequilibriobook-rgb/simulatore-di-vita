/* =============================================================================
   SIMULATORE 3.0 — Il racconto
   =============================================================================
   LIVELLO ESTERNO AL CORE. Non calcola niente: legge quello che il core ha
   calcolato e lo dice a parole.

   PERCHE' ESISTE
   «Un buon calcolo con un cattivo report produce una cattiva decisione.»
   Il libro e' esplicito: le persone non ricordano le giornate come tabelle,
   le ricordano come storie. Il racconto non e' un abbellimento dei numeri:
   e' l'uscita principale del simulatore.

   LA STRUTTURA OBBLIGATORIA        [guida 3.2 v6 § 18.2]
   Ogni racconto deve contenere, in quest'ordine:
     esito apparente · qualita' dell'esito · costo interno · danno residuo ·
     rischio differito · leve che hanno pesato · leve disponibili ·
     supporto e delega, reali o finti · adattamento realistico ·
     eventuale successo tossico · eventuale over-adaptation ·
     suggerimento praticabile
   con linguaggio severo ma non colpevolizzante.

   IL MINI-TEMPLATE                 [guida 3.2 v6 § 18.4]
     Esito · Qualita' · Costo · Leve · Rientro · Supporto · Rischio · Azione

   I SETTE REPORT VIETATI           [guida 3.2 v6 § 18.3]
     binario      — riduce tutto a riuscito/fallito
     ottimistico  — nasconde costo e danno
     catastrofico — produce falsi allarmi
     produttivista— premia solo consegna ed efficienza
     colpevolizzante — scambia il fallimento tecnico per colpa
     teorico      — propone leve non disponibili
     fuffoso      — non indica azioni concrete

   LA REGOLA DELLA LUNGHEZZA        [guida 3.2 v6 § 20.2]
     «Piu' il sistema e' compromesso, meno il report deve essere lungo.»
   In quasi-collasso niente strategie raffinate: poche priorita', e basta.
   ========================================================================== */

(function (globale) {
  'use strict';

  var N = globale.Nucleo;
  var CAL = globale.Calibrazione;      // app/dati/calibrazione.js — Apparato F voce 7

  /* CHI MANCA SI DEVE SENTIRE, SUBITO.
     I moduli qui sopra vengono presi UNA VOLTA SOLA, al caricamento: se uno
     non c'e' ancora, la variabile resta undefined per sempre, anche se il
     modulo arriva un istante dopo.

     Perche' non basta lasciar esplodere da solo: dove c'e' una guardia del
     tipo «X && X.qualcosa», un modulo mancante non esplode — degrada. Il
     03/09/2026 tempo.js caricato prima di microsemantica.js ha prodotto una
     traiettoria di dodici settimane a carico 100 invece di 43, senza un
     errore ne' un avviso. Sbagliata del doppio, e invisibile.

     Le pagine HTML caricano nell'ordine giusto e il prodotto consegnato e'
     corretto. Questa guardia serve a chi scrive un banco proprio — le run
     lunghe — perche' trovi un errore e non un numero sbagliato. */
  (function (mancanti) {
    if (!mancanti.length) { return; }
    throw new Error('racconto.js: manca ' + mancanti.join(', ') +
      '. Ordine di caricamento: nucleo.js, calibrazione.js, casuale-mt.js, stato.js, microsemantica.js, tempo.js, settimana-tipo.js, e i dati prima di chi li usa.');
  }([['Nucleo', N], ['Calibrazione', CAL]]
    .filter(function (c) { return !c[1]; })
    .map(function (c) { return c[0]; })));

  var CFG = N.CONFIG;                  // le soglie della classificazione, casa unica

  /* Divide un testo in frasi sul punto seguito da spazio, tenendo il punto
     attaccato alla frase che chiude — stesso risultato di uno split con
     lookbehind /(?<=\.)\s+/, ma senza lookbehind: quella sintassi (ES2018)
     manda in errore di parsing i browser precedenti al 2023 (Safari incluso),
     bloccando il caricamento dell'intero file, non solo della funzione.
     [AUDIT 19/8 — sostituisce cinque occorrenze del lookbehind in questo file] */
  function divisioneFrasi(testo) {
    var pezzi = String(testo).split(/\.\s+/);
    return pezzi.map(function (p, i) { return (i < pezzi.length - 1) ? p + '.' : p; });
  }

  /* LA FRASE CHE APRE UNA LEVA SOLA, SCRITTA IN UN POSTO SOLO.
     La scrivono in due: leveDisponibili(), quando la leva disponibile e' una
     sola, e la riduzione «seconda leva», quando le leve erano due o tre e il
     racconto ne ha tenuta una. Erano due frasi diverse, e la seconda non
     spiegava la parola «leva» — cosi' proprio i racconti accorciati, cioe'
     quelli delle condizioni piu' strette, restavano senza la spiegazione. */
  /* «una cosa su cui si può agire» usava «cosa» come tappabuchi: si dice
     su quale punto si può agire. */
  var INTRO_UNA_LEVA = 'C’è un punto solo su cui agire davvero, e il libro lo chiama leva: ' +
    'una condizione che basta spostare perché il resto si muova.';

  /* --------------------------------------------------------------------
     QUANTO DEVE ESSERE LUNGO
     Non e' una preferenza di stile: e' una regola del modello.
     -------------------------------------------------------------------- */
  var ROSSI = ['quasi_collasso'];
  /* QUALI RISCHI SONO ROSSI, E PERCHE' QUESTA RIGA E' STATA RISCRITTA.

     Era: ['rosso', 'rosso_critico', 'quasi_collasso', 'collasso'], confrontata
     con indexOf, cioe' cercando la sottostringa. Sbagliava in tre modi
     diversi, e tutti e tre in silenzio.

     PRIMO, e il peggiore: «fragile_grave_pre_rosso» contiene la parola
     «rosso», quindi passava per rosso. Ma «pre_rosso» vuol dire, alla
     lettera, NON ancora rosso — e' il gradino subito prima. Il risultato si
     vedeva a schermo: un gesto con carico 67 e assetto 57, che il modello
     dichiara pre-rosso, riceveva il racconto accorciato con la scritta
     «Racconto ridotto», e chi leggeva perdeva proprio la spiegazione di cui
     aveva piu' bisogno. Il caso piu' comune di tutti, trattato come un caso
     grave.

     SECONDO, all'incontrario: «estremo_diagnostico» NON contiene la parola
     rosso, quindi non passava — ed e' il secondo stato piu' grave della
     scala, peggio dei due rossi che invece passavano.

     TERZO: 'rosso_critico' e 'collasso' non corrispondono a nessuno stato che
     livelloRischio possa restituire. Erano due righe che non facevano niente,
     e la loro presenza faceva credere che l'elenco fosse completo.

     Adesso gli stati sono nominati per intero e confrontati per intero.
     L'elenco completo, dal peggio al meglio, sta in stato.js: quasi_collasso,
     estremo_diagnostico, rosso_sistemico, rosso_controllabile,
     fragile_grave_pre_rosso, fragile_medio, fragile_lieve, ordinario. */
  var RISCHI_ROSSI = ['quasi_collasso', 'estremo_diagnostico',
                      'rosso_sistemico', 'rosso_controllabile'];
  function eRischioRosso(rischio) { return RISCHI_ROSSI.indexOf(String(rischio)) >= 0; }

  /* --------------------------------------------------------------------
     LE QUATTRO SCOGLIERE DEL MODELLO — misurate, non scelte

     Cercate spazzando ogni variabile su tutto il suo intervallo, con tre
     nodi di riferimento diversi e tutti e cento i tiri del dado per ogni
     valore (`_taratura/scogliere.js`). Sono i punti in cui la QUALITA'
     degli esiti cambia di colpo, molto piu' di quanto cambi la probabilita':

       DEBITO      da 0 a 1     esiti buoni 44 % → 0 %
       ASSETTO     a 36         esiti buoni  0 % → 44 %
       CARICO      a 70         esiti buoni 34 % → 0 %
       COSTO NASCOSTO a 50      esiti buoni 44 % → 0 %, e la probabilita'
                                di riuscita NON CAMBIA di un punto

     Tutte e quattro confermate su nodo ordinario, nodo gia' carico e nodo
     facile. Sono invisibili nella formula — nascono da classificaEsito — e
     sono la ragione per cui «ridurre un po'» a volte non serve a niente.

     Le soglie del registro sono ancorate a queste, non scelte a occhio.

     I NUMERI NON SONO RISCRITTI QUI. Nascono dalle soglie con cui
     classificaEsito decide, e quelle vivono in Nucleo.CONFIG: se una
     cambia la', la scogliera si sposta da sola e il racconto resta vero.
     -------------------------------------------------------------------- */
  /* LA SOGLIA SI DICE UNA VOLTA SOLA, NON DUE.
     La riga a schermo nasce da due pezzi: una testa che il codice costruisce
     — «Il carico è a 79, oltre la soglia di 70.» — e questo testo, scritto a
     mano, che le va subito dietro. I due pezzi non si conoscevano, e ognuno
     ripeteva quello che aveva gia' detto l'altro: «…sotto la soglia di 36.
     Sotto un assetto di 36 nessuna riuscita esce pulita»; «…oltre la soglia
     di 70. Sopra un carico di 70…»; «…e la soglia è 50: mancano 3 punti.
     Superati i 50 di costo nascosto…». Ogni volta la stessa parola e lo
     stesso numero a quattro parole di distanza, e chi legge si ferma a
     controllare se siano due numeri diversi.
     Adesso il numero lo dice la testa, e il testo riprende con «da lì»: la
     soglia e' gia' sotto gli occhi, non serve ripeterla. */
  /* Ogni soglia aveva anche un campo `misura`, con la percentuale grezza
     («esiti buoni dal 44 % allo 0 %»): non lo leggeva nessuno, in nessuna
     vista, ed era l'unico punto del file in cui un numero restava in
     percentuale grezza invece che tradotto in parole — proprio quello che
     questo file chiede di non fare. Il `testo` qui sotto dice la stessa
     misura già in prosa leggibile («nessuna riuscita esce pulita»,
     «la probabilità non cambia di un punto»): il campo morto è stato tolto,
     non la sostanza. */
  var SCOGLIERE = [
    { id: 'debito', variabile: 'DEB', soglia: CFG.sogliaDebitoAttivo, verso: 'sopra',
      nome: 'il debito',
      /* «debito» e' un termine del modello e qui viene detto che cos'e',
         con le parole del glossario: questa riga c'e' sempre, quando il
         debito e' almeno uno (le soglie superate non si tolgono mai), mentre
         la leva «Chiudere il debito» puo' mancare o essere tagliata.
         Le soglie superate non si tolgono mai, e il registro «breve» sta a
         457 parole su 460: la definizione ha fatto nascere quattro racconti
         incomprimibili su ottocento. Si paga togliendo «Non è una quantità
         che cresce poco per volta», che ridiceva «interruttore, acceso o
         spento», e tenendo la definizione in undici parole — misurato sugli
         stessi ottocento casi: zero incomprimibili, come prima. */
      testo: 'Il debito è l’aver insistito sulla stessa strada senza cambiare niente, ' +
             'e ne basta un punto perché ogni riuscita esca danneggiata. Non conta quanto ' +
             'ce n’è, conta che ce ne sia, come un interruttore, acceso o spento.' },
    { id: 'assetto', variabile: 'POS', soglia: CFG.sogliaAssettoBasso + 1, verso: 'sotto',
      nome: 'l’assetto',
      testo: 'Da lì in giù nessuna riuscita esce pulita, anche se il gesto va bene: ' +
             'risalire di pochi punti cambia tutto quello che viene dopo.' },
    { id: 'carico', variabile: 'STR', soglia: CFG.sogliaCaricoAlto, verso: 'sopra',
      nome: 'il carico',
      testo: 'Da lì in su nessuna riuscita esce pulita: il gesto può andare benissimo e ' +
             'costare comunque.' },
    { id: 'costo', variabile: 'costo_nascosto', soglia: CFG.sogliaCostoNascosto, verso: 'sopra',
      nome: 'il costo nascosto',
      testo: 'Da lì in su ogni successo viene letto come danneggiato, mentre la probabilità ' +
             'di riuscita non cambia di un punto. È la soglia più subdola del modello, ' +
             'e non si vede nel numero.' }
  ];

  /* Dove si trova questo nodo rispetto alle quattro scogliere. */
  function vicinanzaScogliere(stato) {
    var valori = {
      DEB: stato.debito_deb, POS: stato.posizione_pos,
      STR: stato.stress_str, costo_nascosto: stato.costo_nascosto
    };
    var oltre = [], vicino = [];
    SCOGLIERE.forEach(function (sc) {
      var v = valori[sc.variabile];
      if (v === undefined) { return; }
      if (sc.verso === 'sopra') {
        if (v >= sc.soglia) { oltre.push({ sc: sc, valore: v }); }
        /* LO ZERO NON E' «VICINO» A NIENTE: E' IL POSTO IN CUI SI DEVE STARE.
           Le scogliere che si superano salendo misurano cose che si
           accumulano — debito, carico, costo nascosto — e per tutte lo zero e'
           il valore migliore possibile, non un valore in avvicinamento.
           La banda di prossimita' e' larga almeno due punti, e la soglia del
           debito e' uno: cosi' lo zero ci finiva sempre dentro, e il racconto
           scriveva «il debito è a 1 punto dalla soglia (0 contro 1)» proprio
           quando il debito era al meglio. Il libro vuole il debito raro e per
           questo significativo: un avviso che scatta sempre lo rende rumore. */
        else if (v > 0 && v >= sc.soglia - Math.max(2, sc.soglia * 0.12)) {
          vicino.push({ sc: sc, valore: v, mancano: sc.soglia - v });
        }
      } else {
        if (v < sc.soglia) { oltre.push({ sc: sc, valore: v }); }
        else if (v <= sc.soglia + Math.max(2, sc.soglia * 0.12)) { vicino.push({ sc: sc, valore: v, mancano: v - sc.soglia + 1 }); }
      }
    });
    return { oltre: oltre, vicino: vicino };
  }

  /* I BUDGET DI PAROLE, RIMISURATI IL 10/09/2026 — E PERCHE' SI RIMISURANO.

     Questi tre numeri non stanno nel libro. Il libro dice una cosa sola, al
     capitolo 46: piu' il sistema e' compromesso, meno il racconto deve essere
     lungo. E' l'ORDINE a essere canonico, non le cifre.

     Le cifre sono il novantesimo percentile del minimo incomprimibile —
     cioe': si prendono ottocento casi, si applicano tutte le riduzioni fino
     in fondo, si guarda quante parole restano, e si prende il valore sotto il
     quale ne stanno nove su dieci. Sono quindi una MISURA DEL TESTO, e vanno
     rifatte ogni volta che il testo cambia davvero.

     Il 10/09/2026 il testo e' cambiato: le spiegazioni sono state riscritte
     piu' distese, perche' quelle vecchie erano esatte e incomprensibili — «Il
     dado ha dato 65 contro una probabilità di 40: sopra la soglia» si capisce
     solo se si sa gia' come funziona. Con i budget vecchi, misurati sul testo
     vecchio, le nuove spiegazioni venivano tagliate: il testo migliorava e il
     lettore ne vedeva di meno. Un numero misurato su una versione precedente
     che impedisce alla versione nuova di esistere non e' una regola: e' un
     fossile.

     Misura del 10/09/2026, ottocento casi, due numeri per registro: quanto
     sarebbe lungo il racconto SENZA nessun tetto, e quanto resta dopo aver
     applicato tutte le riduzioni fino in fondo.

                    naturale p90   incomprimibile p90   tetto scelto
       minimo            211              152               190
       breve             571              423               460
       completo          653              397               600

     RIMISURATA IL 10/09/2026, la sera, dopo la riscrittura del testo — e la
     misura di quel giorno andava rifatta per due motivi, non per uno.

     Il primo e' quello di sempre: il testo e' cambiato. Le frasi chiuse che
     non spiegavano niente — «Toglie incertezza, non carico», «Non scarica,
     raddoppia», «competente e circoscritto» — sono diventate spiegazioni, e
     una spiegazione e' piu' lunga di un aforisma.

     Il secondo e' che la misura precedente era sporca. La riduzione
     «spiegazione del costo nascosto» cercava una frase con il punto e la
     frase finiva con i due punti: non toglieva niente e rispondeva «fatto» a
     ogni giro, bruciando tutti e quaranta i giri concessi. Le tre riduzioni
     scritte dopo di lei — la motivazione della leva, la sezione del supporto,
     le soglie vicine — non hanno mai girato, ne' in produzione ne' sul banco.
     Il «minimo incomprimibile» misurato allora non era il minimo: era il
     punto in cui il giro si arrendeva.

                    naturale p90   incomprimibile p90   tetto (invariato)
       minimo            233              177               190
       breve             724              418               460
       completo          806              378               600

     I tre tetti stanno ancora dove devono: sopra il minimo incomprimibile e
     sotto la lunghezza naturale. Non sono stati toccati.

     I tetti stanno in mezzo, e non a caso. Sopra l'incomprimibile, perche' un
     tetto sotto quel valore taglierebbe cose che non si possono togliere e
     produrrebbe racconti dichiarati «incomprimibili» a ogni giro. Sotto il
     naturale, perche' un tetto che non stringe mai non e' un tetto.

     Il tetto di «completo» e' quasi largo quanto la lunghezza naturale, ed e'
     voluto: «completo» vuol dire che le condizioni NON sono rosse, e per un
     caso non rosso il libro non chiede nessun accorciamento. Li' il tetto e'
     una sicurezza contro i casi estremi, non il meccanismo. Il meccanismo e'
     «breve», che taglia davvero — da una lunghezza naturale di 571 a 460 — e
     soprattutto e' «minimo», che prima ancora del tetto rinuncia a cinque
     sezioni su otto.

     Una cosa merita di essere notata, perche' e' controintuitiva: il minimo
     incomprimibile di «breve» e' PIU' ALTO di quello di «completo». Non e' un
     errore. Le condizioni brutte producono piu' cose obbligatorie da dire —
     scogliere vicine, danno residuo, rischio differito — e quelle il libro le
     vuole dette. Ad accorciarsi e' la parte che spiega, non la parte che
     avvisa: «breve» rinuncia a due sezioni intere e a una leva, ed e' li' che
     sta l'accorciamento vero. Il budget e' il tetto, non il meccanismo.

     RIMISURATA L'11/09/2026, dopo la riscrittura a frasi corte.
     Igor ha chiesto di alzare «enormemente» la comprensione e la
     discorsivita' del testo, e la misura e' l'indice Gulpease
     (scripts/gulpease.py). Sui referti INTERI — i sei di
     scripts/referti_esempio.js, misurati blocco per blocco come li legge la
     persona — il gesto e' passato da 69 a 85, la sequenza da 70 a 77, la
     settimana da 66 a 79, la traiettoria da 69 a 71; su un inventario di
     seicento blocchi diversi la media e' passata da 66 a 78, e i blocchi
     sotto 60 da 134 a 1 (la sezione della spirale, il cui testo arriva da
     tempo.js). Il modo: spezzare le frasi lunghe e rimettere fuori il legame
     che stava dentro — «Per questo», «Vuol dire che», «E» — senza togliere
     una parola precisa; i due punti e il punto e virgola sono diventati
     punti dove le due meta' stavano in piedi da sole.

     Le parole non sono cresciute, e i tre tetti restano quelli. Stessi
     ottocento casi del banco, dopo le riduzioni:

                    mediana   p90   massimo   incomprimibili
       minimo          182    182     184
       breve           442    457     460          0 su 800
       completo        565    594     600          (erano 24)

     Gli incomprimibili sono scesi a zero per un altro motivo, trovato
     misurando gli scatti delle riduzioni: tre di loro non avevano mai
     scattato. «elenco di ciò che resta» e «spiegazione del costo nascosto»
     cercavano `s.pezzi` in una sezione che non li dichiarava, e montaCosto()
     non esisteva; «ciò che ha retto» cercava `senza_pro` che nessuno
     scriveva. Adesso costo() e levePesate() dichiarano i loro pezzi, e le tre
     riduzioni scattano (90, 29 e 265 volte su 800). */
  function registro(res) {
    var str = res.stato_dopo.stress_str;
    var pos = res.stato_dopo.posizione_pos;
    var rischioRosso = eRischioRosso(res.rischio);

    if (ROSSI.indexOf(res.esito) >= 0 || (rischioRosso && str >= 85)) {
      return {
        nome: 'minimo',
        /* La vista mette davanti «Qui il racconto si accorcia apposta.»: un
           secondo «qui» a otto parole di distanza si sentiva. */
        motivo: 'Il sistema è troppo compromesso, e un ragionamento lungo non servirebbe a niente.',
        sezioni: ['esito', 'costo', 'azione'],
        max_leve: 1,
        budget_parole: 190
      };
    }
    /* 70 e 36 non sono scelti: sono due delle quattro scogliere misurate.
       Oltre quelle, nessuna riuscita esce pulita, e un racconto lungo che
       spiega come migliorare il gesto starebbe parlando della cosa sbagliata. */
    if (rischioRosso || str >= CFG.sogliaCaricoAlto || pos <= CFG.sogliaAssettoBasso) {
      return {
        nome: 'breve',
        motivo: 'Le condizioni sono strette: poche cose, e concrete.',
        sezioni: ['esito', 'qualita', 'costo', 'leve', 'supporto', 'azione'],
        max_leve: 2,
        budget_parole: 460
      };
    }
    return {
      nome: 'completo',
      motivo: '',
      sezioni: ['esito', 'qualita', 'costo', 'leve', 'rientro', 'supporto', 'rischio', 'azione'],
      max_leve: 3,
      budget_parole: 600
    };
  }

  /* --------------------------------------------------------------------
     IL BUDGET DI PAROLE — la regola § 20.2 resa esecutiva

     Togliere delle sezioni non basta: le sezioni che restano possono
     allungarsi da sole, e un racconto «breve» finiva per essere piu' lungo
     di uno «completo» solo perche' c'era piu' da dire. Misurato: 377 parole
     contro 251.

     Allora il registro non dichiara solo QUALI sezioni, ma anche QUANTO
     spazio hanno. Se il racconto sfora, si toglie, in un ordine deciso in
     anticipo: prima le cose interessanti, poi quelle utili, mai quelle
     necessarie. Che cosa e' successo, che cosa e' costato, che cosa fare e
     le soglie SUPERATE non si tolgono mai.

     DA DOVE VENGONO I NUMERI DEL BUDGET
     Non sono scelti. Sono stati misurati generando 500 nodi a caso su tutto
     lo spazio delle variabili, riducendo ogni racconto fino al suo minimo
     incomprimibile, e guardando quanto resta:

       registro    casi   minimo   mediana   p90   massimo
       completo      73      300       447   474       480
       breve        324      189       270   314       375
       minimo       103      158       179   189       189

     Il budget e' il p90 del minimo incomprimibile: nove racconti su dieci ci
     stanno dentro, e il decimo non e' un errore — e' un caso in cui non c'e'
     piu' niente da togliere, e viene dichiarato.
     -------------------------------------------------------------------- */
  function conta(racconto) {
    var t = racconto.sintesi + ' ';
    racconto.sezioni.forEach(function (s) { t += s.titolo + ' ' + s.testo + ' '; });
    if (racconto.leve_disponibili) {
      t += racconto.leve_disponibili.testo + ' ';
      racconto.leve_disponibili.leve.forEach(function (l) { t += l.azione + ' ' + l.perche + ' '; });
    }
    /* LA NOTA SULLE SCOGLIERE SI VEDE A SCHERMO, E NON SI CONTAVA.
       La vista la stampa — `<p class="nota">` sotto le righe delle soglie — e
       sono una quarantina di parole. Il conto le saltava, e quindi il budget
       misurava meno testo di quanto il lettore ne trovasse.
       Da questo nasceva anche un secondo difetto, di quelli muti che questo
       file conosce bene: «nota sulle scogliere» e' la PRIMA riduzione della
       lista, cancella la nota e risponde «fatto» — ma le parole contate non
       scendevano di una, perche' quelle parole nel conto non c'erano mai
       state. `applicaRiduzioni` la trattava giustamente come non fatta, e su
       ottocento racconti non ha mai tolto niente: zero scatti. La prima
       riduzione dell'ordine era morta, e la nota restava sempre a schermo
       anche nei racconti che sforavano.
       Adesso la nota si conta, e quindi si puo' anche togliere: torna a essere
       la prima cosa a cui si rinuncia, che e' il posto giusto — spiega da dove
       vengono le quattro soglie, ed e' interessante, non necessaria. */
    if (racconto.scogliere) {
      t += racconto.scogliere.righe.join(' ') + ' ' + (racconto.scogliere.nota || '') + ' ';
    }
    if (racconto.incastri) { t += racconto.incastri.righe.join(' ') + ' '; }
    t += racconto.azione.testo + ' ' + (racconto.azione.priorita || []).join(' ') +
         ' ' + (racconto.azione.nota || '');
    /* `racconto.calcolo` NON entra in questo conto, e non e' una svista del
       tipo descritto qui sopra: e' un'appendice apposta fuori dal budget di
       parole (vedi calcoloPerEsteso()), sempre completa anche quando il
       racconto sopra si accorcia. Se un giorno dovesse contare anche lei,
       vuol dire che il progetto ha deciso di darle un budget suo: allora va
       aggiunta qui di proposito, non per errore. */
    return t.split(/\s+/).filter(Boolean).length;
  }

  /* In ordine: il primo che ha ancora qualcosa da togliere, la toglie. */
  var RIDUZIONI = [
    { nome: 'nota sulle scogliere', fai: function (r) {
        if (r.scogliere && r.scogliere.nota) { r.scogliere.nota = ''; return true; }
        return false;
      } },
    { nome: 'letture non ovvie', fai: function (r) {
        if (!r.incastri) { return false; }
        if (r.incastri.righe.length > 1) { r.incastri.righe = r.incastri.righe.slice(0, 1); return true; }
        r.incastri = null; return true;
      } },
    { nome: 'terza leva', fai: function (r) {
        var L = r.leve_disponibili;
        if (L && L.leve.length > 2) {
          L.leve = L.leve.slice(0, 2);
          allineaAzioneAlleLeve(r);
          return true;
        }
        return false;
      } },
    { nome: 'nota sulla singola leva', fai: function (r) {
        if (r.azione.nota) { r.azione.nota = ''; return true; }
        return false;
      } },
    { nome: 'dettaglio del supporto', fai: function (r) {
        var s = trovaSezione(r, 'supporto');
        /* si tiene la versione breve scritta apposta per ogni aiuto, non la
           prima frase del testo: a frasi corte, la prima da sola non diceva
           piu' che cosa l'aiuto toglieva davvero */
        if (!s || !s.breve || s.testo === s.breve) { return false; }
        s.testo = s.breve;
        return true;
      } },
    { nome: 'seconda leva', fai: function (r) {
        var L = r.leve_disponibili;
        if (L && L.leve.length > 1) {
          L.leve = L.leve.slice(0, 1);
          /* La stessa frase che leveDisponibili() scrive quando la leva e' una
             sola: se qui se ne scrivesse un'altra, il racconto direbbe la
             stessa cosa in due modi a seconda che sia stato tagliato o no —
             e la spiegazione della parola «leva», che sta li' dentro,
             sparirebbe proprio nei racconti accorciati. */
          L.testo = INTRO_UNA_LEVA;
          allineaAzioneAlleLeve(r);
          return true;
        }
        return false;
      } },
    { nome: 'sezione del rientro', fai: function (r) {
        return togliSezione(r, 'rientro');
      } },
    /* LE RIDUZIONI CHE SEGUONO NON LEGGONO PIU' IL TESTO: TAGLIANO PER STRUTTURA.

       Fino all'11/09/2026 cinque di loro cercavano dentro le frasi a schermo:
       «ciò che ha retto» spezzava su «Dall’altra parte», «elenco di ciò che
       resta» su «Quello che resta dopo», «spiegazione del costo nascosto»
       cancellava una frase con un'espressione regolare, «commento sul
       margine» e «distanza dal margine» contavano le frasi, e «testo della
       qualità» teneva LA FRASE PIU' LUNGA. Ognuna si e' gia' spenta in
       silenzio almeno una volta per un apostrofo cambiato, un punto diventato
       due punti, una frase riscritta — i commenti piu' vecchi di questo file
       lo raccontano per esteso.

       L'11/09/2026 il testo e' stato riscritto a frasi corte, e a quel punto
       «la frase piu' lunga» e «le prime due frasi» non volevano piu' dire
       niente: la frase lunga poteva essere una qualsiasi, e le prime due
       potevano essere «Il dado ha dato 31.» e basta.

       Adesso ogni sezione che si puo' accorciare dichiara i suoi PEZZI —
       esito: numeri, margine, commento; costo: base, nascosto, spiegazione,
       soglia, residuo; qualita': il testo intero e la sua versione breve
       (`breve`, scritta a mano per ognuno dei nove esiti); leve pesate: il
       testo senza la parte «ha retto» (`senza_pro`) — e la riduzione spegne
       un pezzo e rimonta il testo. Il testo puo' cambiare quanto vuole. */
    { nome: 'ciò che ha retto', fai: function (r) {
        var s = trovaSezione(r, 'pesate');
        if (!s || !s.senza_pro || s.testo === s.senza_pro) { return false; }
        s.testo = s.senza_pro;
        return true;
      } },
    { nome: 'testo della qualità', fai: function (r) {
        var s = trovaSezione(r, 'qualita');
        /* si tiene la versione breve scritta apposta, non una frase pescata:
           deve rispondere da sola al titolo della sezione, e nessuna frase
           pescata a caso lo garantiva. */
        if (!s || !s.breve || s.testo === s.breve) { return false; }
        s.testo = s.breve;
        return true;
      } },
    { nome: 'commento sul margine', fai: function (r) {
        var s = trovaSezione(r, 'Che cosa è successo');
        if (!s || !s.pezzi || !s.pezzi.commento) { return false; }
        s.pezzi.commento = '';
        montaEsito(s);
        return true;
      } },
    { nome: 'elenco di ciò che resta', fai: function (r) {
        var s = trovaSezione(r, 'costo');
        if (!s || !s.pezzi || !s.pezzi.residuo) { return false; }
        s.pezzi.residuo = '';
        montaCosto(s);
        return true;
      } },
    { nome: 'spiegazione del costo nascosto', fai: function (r) {
        var s = trovaSezione(r, 'costo');
        if (!s || !s.pezzi || !s.pezzi.spiegazione) { return false; }
        s.pezzi.spiegazione = '';
        montaCosto(s);
        return true;
      } },
    /* «carico» e «assetto» si spiegano fra parentesi la prima volta che
       compaiono: vedi costo(). La spiegazione si paga in parole, e quando lo
       spazio stringe questa riduzione la toglie e riporta le due righe alla
       loro forma corta — la stessa logica di «spiegazione del costo
       nascosto», qui sopra, applicata alla sezione precedente. */
    { nome: 'spiegazione di carico e assetto', fai: function (r) {
        var s = trovaSezione(r, 'costo');
        if (!s || !s.pezzi || !s.pezzi.baseBreve || s.pezzi.base === s.pezzi.baseBreve) { return false; }
        s.pezzi.base = s.pezzi.baseBreve;
        montaCosto(s);
        return true;
      } },
    { nome: 'motivazione della leva', fai: function (r) {
        var L = r.leve_disponibili;
        if (!L || !L.leve.length) { return false; }
        var l = L.leve[0];
        /* la versione breve e' scritta a mano per ogni leva (LEVE[].breve):
           a frasi corte, «la prima frase» poteva essere un pezzo solo del
           ragionamento. L'azione non va toccata: non ricopia piu' la leva. */
        if (!l.perche_breve || l.perche === l.perche_breve) { return false; }
        l.perche = l.perche_breve;
        return true;
      } },
    /* L'ULTIMO GIRO SULLA PRIMA SEZIONE, E PERCHE' NE SERVIVA UNO SECONDO.
       «commento sul margine», la' sopra, tiene le prime due frasi: prima erano
       «Il gesto non è riuscito» e i due numeri, e la distanza fra i numeri
       cadeva. Da quando la sezione non ripete piu' il verdetto — lo dicono
       gia' il pallino della pagina e la riga di sintesi — quelle due frasi
       sono i numeri E la distanza, cioe' una frase lunga in piu' di prima. In
       quasi-collasso, dove lo spazio e' 190 parole e questa e' quasi l'unica
       riduzione che possa scattare, bastava a far sforare quaranta racconti su
       cento. Questa toglie anche la distanza, ed e' l'ultima cosa che si
       toglie da li': viene dopo tutto il resto proprio perche' spiegare che
       cos'e' il margine si paga una volta sola e serve per sempre. */
    { nome: 'distanza dal margine', fai: function (r) {
        var s = trovaSezione(r, 'Che cosa è successo');
        if (!s || !s.pezzi || !s.pezzi.margine) { return false; }
        s.pezzi.margine = '';
        montaEsito(s);
        return true;
      } },
    { nome: 'sezione del supporto', fai: function (r) {
        return togliSezione(r, 'supporto');
      } },
    { nome: 'soglie vicine', fai: function (r) {
        /* le soglie SUPERATE non si tolgono mai: sono la cosa più importante
           che il racconto abbia da dire. Si tolgono solo quelle vicine.

           QUESTA RIDUZIONE NON LEGGE PIU' IL TESTO DELLE RIGHE.
           Cercava la frase «è oltre la soglia» dentro ognuna: legava il taglio
           alle parole scritte a schermo, ed e' proprio il modo in cui in questo
           file tre riduzioni si sono spente in silenzio. Adesso scogliere()
           dichiara quante righe parlano di soglie gia' passate, e stanno in
           testa: si taglia per posizione, e il testo puo' cambiare quanto
           vuole. */
        if (!r.scogliere) { return false; }
        var superate = r.scogliere.superate || 0;
        if (r.scogliere.righe.length > superate) {
          r.scogliere.righe = r.scogliere.righe.slice(0, superate);
          if (!superate) { r.scogliere = null; }
          return true;
        }
        return false;
      } }
  ];

  /* QUANDO L'ELENCO DELLE LEVE SI ACCORCIA, LA FRASE CHE LO COMMENTA VA RIFATTA.
     Le due riduzioni qui sopra tolgono una leva dall'elenco; la sezione «Che
     cosa fare» era gia' stata scritta e continuava a parlare del numero di
     prima. Si riscrive con il numero vero — e' una riga sola, e sta qui in
     mezzo alle riduzioni perche' e' la' che il difetto nasceva. */
  function allineaAzioneAlleLeve(r) {
    var L = r.leve_disponibili;
    if (!r.azione || !r.azione.leva_prima || !L) { return; }
    r.azione.testo = testoAzioneLeve(r.azione.leva_prima, L.leve.length);
  }

  /* CERCARE UNA SEZIONE PER TITOLO, SENZA FARSI FREGARE DALL'APOSTROFO.

     Il 10/09/2026 questa ricerca ha smesso di funzionare per un motivo che
     non si vedeva: il titolo era diventato «Chi c’era» con l'apostrofo
     tipografico, mentre la chiave che lo cercava era rimasta «Chi c'era» con
     quello dritto. Sono due caratteri diversi, la ricerca non ha trovato piu'
     niente, e la riduzione non e' mai scattata.

     Il guaio non e' stato l'errore: e' stato il silenzio. Niente si e' rotto.
     I racconti hanno solo smesso di accorciarsi, e da 60 incomprimibili su
     400 sono passati a 136 — un terzo dei racconti troppo lungo, senza un
     avviso. Se ne e' accorto un test che contava, non uno che leggeva.

     Da qui in avanti i due apostrofi valgono uguale nel confronto. Il titolo
     resta scritto bene, con quello tipografico; la ricerca non se ne cura. */
  function stessoApostrofo(t) { return String(t).replace(/[’‘`´]/g, "'"); }

  /* SI CERCA PRIMA PER CHIAVE, POI PER TITOLO.
     Cercare solo per titolo legava le riduzioni alle parole scritte a schermo:
     bastava migliorare un titolo e una riduzione smetteva di scattare, in
     silenzio. La chiave e' un nome interno che non si legge da nessuna parte,
     e proprio per questo puo' restare fermo mentre il titolo migliora. Il
     titolo resta accettato per le sezioni che una chiave non ce l'hanno. */
  function combacia(sezione, cerca) {
    if (sezione.chiave && sezione.chiave === cerca) { return true; }
    return stessoApostrofo(sezione.titolo).indexOf(stessoApostrofo(cerca)) >= 0;
  }
  function trovaSezione(r, frammento) {
    for (var i = 0; i < r.sezioni.length; i++) {
      if (combacia(r.sezioni[i], frammento)) { return r.sezioni[i]; }
    }
    return null;
  }
  function togliSezione(r, frammento) {
    for (var i = 0; i < r.sezioni.length; i++) {
      if (combacia(r.sezioni[i], frammento)) { r.sezioni.splice(i, 1); return true; }
    }
    return false;
  }

  /* UNA RIDUZIONE CHE DICE «FATTO» SENZA AVER TOLTO NIENTE FERMA TUTTE LE ALTRE.

     Il giro qui sotto si fidava della risposta: la prima riduzione che diceva
     «fatto» faceva ricominciare il giro da capo, e quella dopo non veniva mai
     provata. Se la risposta era sbagliata — ed e' successo: cercava una frase
     con il punto e la frase finiva con i due punti — il giro girava a vuoto
     quaranta volte e le riduzioni scritte piu' in basso non toccavano mai il
     testo. Nessun errore, nessun avviso: solo racconti troppo lunghi.

     Adesso non si crede alla risposta: si contano le parole prima e dopo, e
     se non sono scese la riduzione vale come non fatta e si passa alla
     prossima. Costa un conteggio in piu' per riduzione provata, e in cambio
     un difetto che prima era muto adesso non puo' esistere.

     `applicaRiduzioni` fa questo per tutti e quattro i livelli: il gesto, la
     sequenza, la settimana e la traiettoria avevano quattro copie dello
     stesso giro, e quindi quattro volte lo stesso rischio. */
  function applicaRiduzioni(racconto, budget, elenco_, misura, giriMax) {
    var tolte = [], giri = 0;
    var quante = misura(racconto);
    while (quante > budget && giri < giriMax) {
      var fatto = false;
      for (var i = 0; i < elenco_.length; i++) {
        if (!elenco_[i].fai(racconto)) { continue; }
        var adesso = misura(racconto);
        if (adesso >= quante) { continue; }   /* ha detto di si' e non ha tolto niente */
        tolte.push(elenco_[i].nome);
        quante = adesso;
        fatto = true;
        break;
      }
      if (!fatto) { break; }   /* resta solo l'indispensabile: non si taglia oltre */
      giri++;
    }
    return tolte;
  }

  function rispettaIlBudget(racconto, budget) {
    return applicaRiduzioni(racconto, budget, RIDUZIONI, conta, 40);
  }

  /* --------------------------------------------------------------------
     1 · ESITO APPARENTE — che cosa è successo, prima di ogni giudizio
     -------------------------------------------------------------------- */
  function esito(res) {
    var riuscito = res.successo_prima_del_campo;
    var m = Math.abs(res.margine_netto);
    var stretto = m < 10;

    /* «IL GESTO NON È RIUSCITO», TRE VOLTE IN QUATTRO RIGHE.
       La pagina lo scrive di suo, accanto al pallino: «Non riuscito». La riga
       di sintesi lo ridice: «Il gesto non è riuscito: l'esito è «tecnico»…».
       E questa sezione lo ridiceva una terza volta, con le stesse parole della
       seconda, prima di arrivare al punto. Chi legge non impara niente al
       terzo giro: si chiede se abbia saltato una riga.
       La sezione adesso comincia da quello che solo lei sa dire — i due numeri
       e la distanza fra loro — e com'è andata lo dice mentre lo spiega:
       «per riuscire doveva restare sotto 40, ed è andato oltre». */

    /* PERCHE' QUESTE FRASI SONO CORTE, E PERCHE' SONO PIU' DI UNA.
       «Il dado ha dato 65 contro una probabilità di 40: sopra la soglia» e'
       esatta e non si capisce, se non si sa gia' come funziona. Chi legge un
       referto per la prima volta non sa che il dado deve stare SOTTO, e non
       sa che il margine e' la distanza fra i due numeri. Le informazioni le
       vuole una alla volta: quanto era probabile, che cosa ha detto il dado,
       che cosa doveva succedere, com'e' finita. La chiusa — «Ed è rimasto
       sotto», «Ed è andato oltre» — e' la frase che si porta via, e sta da
       sola. L'11/09/2026 tutto il racconto e' stato riscritto cosi', a frasi
       corte, misurando con l'indice Gulpease (scripts/gulpease.py): si alza
       spezzando le frasi, non impoverendo le parole. */
    /* RISCRITTA IL 16/09/2026 CON LA VOCE DA RACCONTO. Igor ha bocciato il
       ritmo a martello («Ed è rimasto sotto.» da solo): le stesse quattro
       informazioni, nello stesso ordine, ma legate come le direbbe a voce un
       amico che era lì. Il numero di parole e' lo stesso: questa sezione sta
       anche nel registro «minimo», che ha 190 parole e le consuma tutte. */
    var pezzi = {
      numeri: 'La probabilità di riuscita era ' + res.pn + ' su cento, cioè ' +
        comeFrazione(res.pn) + ', e il dado ha dato ' + res.tiro +
        '. Per riuscire doveva restare sotto quella soglia, ' +
        (riuscito ? 'ed è rimasto sotto.' : 'ed è andato oltre.'),
      margine: 'La distanza fra i due numeri, che il libro chiama margine, è di ' +
        inPunti(m) + '.',
      commento: '',
      campo: ''
    };

    if (stretto) {
      /* «per andare nell'altro modo» era «to go the other way» con le parole
         italiane: un italiano dice che una cosa «finisce al contrario». */
      pezzi.commento = 'È pochissimo: sarebbe bastato un niente perché finisse al contrario, ' +
        'e vale la pena ricordarlo, perché ' + (riuscito
          ? 'un successo di misura non dice che le condizioni erano buone.'
          : 'un fallimento di misura non dice che il tentativo era sbagliato.');
    } else if (m > 40) {
      /* «Le condizioni tenevano con abbondanza» diceva una cosa falsa, e la
         diceva nel momento peggiore. Il margine misura la distanza fra il
         dado e la soglia, cioe' quanto il TIRO e' stato netto: non dice
         niente su come sta la persona. Cosi' com'era, un quasi-collasso con
         il carico a 99 poteva uscire con la frase «le condizioni tenevano con
         abbondanza» — il referto ottimistico che il paragrafo 18.3 vieta. */
      pezzi.commento = 'È una distanza larga' + (riuscito
        ? ', e il tiro non è mai stato in bilico.'
        : ': non è mancato poco, e con queste condizioni il gesto era in salita fin dall’inizio.');
    }

    if (res.margine_campo && res.margine_campo !== 0) {
      pezzi.campo = 'Poi il campo attivo, cioè qualcosa o qualcuno che ha reagito durante il ' +
        'tentativo, ha ' + (res.margine_campo < 0 ? 'tolto ' : 'aggiunto ') +
        inPunti(res.margine_campo) + ' al risultato.';
    }
    var s = { titolo: 'Che cosa è successo', chiave: 'esito', pezzi: pezzi, testo: '' };
    montaEsito(s);
    return s;
  }

  /* I pezzi della prima sezione, rimessi in fila. Le riduzioni «commento sul
     margine» e «distanza dal margine» ne spengono uno e richiamano questa:
     il testo a schermo e' sempre il risultato del montaggio, mai un residuo
     di un taglio fatto sulle parole. */
  function montaEsito(s) {
    var p = s.pezzi;
    s.testo = [p.numeri, p.margine, p.commento, p.campo].filter(Boolean).join(' ');
  }

  /* --------------------------------------------------------------------
     2 · QUALITA' DELL'ESITO — riuscire non vuol dire stare bene
     --------------------------------------------------------------------

     IL PALLINO DELLA PILLOLA ERA SEMPRE GRIGIO, ANCHE NEL QUASI-COLLASSO.

     Le pagine della settimana e della traiettoria disegnano l'esito con una
     pillola e un pallino colorato, e il colore lo chiedono qui:

         var qa = (R.QUALITA && R.QUALITA[esito]) || {};
         ... style="background:' + (qa.colore || 'var(--linea-base)')

     Solo che `colore` in QUALITA non c'e' mai stato. Nessun errore: la
     guardia `||` faceva il suo mestiere e il pallino usciva grigio sempre,
     su tutti e nove gli esiti — il successo pulito e il quasi-collasso con
     lo stesso identico grigio, cioe' il colore che vuol dire «neutro».
     Il difetto muto di questo file, ancora una volta: niente si rompe, e
     un'informazione sparisce.

     La scala esiste gia' in app/dati/spiegazioni.js, dove ogni esito dichiara
     il suo `stato` e i quattro stati hanno i loro quattro colori. Qui e'
     scritta con le stesse quattro
     variabili del foglio di stile, e nello stesso ordine: buono per il
     successo pulito, attenzione per quello che costa e per il fallimento di
     misura, serio per il danno e per il fallimento tecnico, critico per il
     successo tossico, per quello solo tecnico, per il fallimento sistemico e
     per il quasi-collasso.

     ⚠️ NON SI LEGGE DA `Spiegazioni`, E IL MOTIVO E' LO STESSO DI SEMPRE:
     diciassette banchi in _test/ e otto in _taratura/ caricano racconto.js
     senza i dati, e una dipendenza nuova li spegnerebbe tutti. Le due scale
     vanno tenute d'accordo a mano; sono nove righe e non cambiano mai.
     -------------------------------------------------------------------- */
  /* OGNI ESITO HA DUE TESTI: QUELLO INTERO E QUELLO BREVE.
     `breve` e' la frase che resta quando il racconto si accorcia. Prima la
     riduzione teneva la frase piu' lunga del testo intero, e due volte quella
     frase e' rimasta a schermo senza appiglio — un «Ma» contro niente, un
     «Vuol dire che» senza la parola da spiegare. La versione breve e' scritta
     a mano, e risponde da sola al titolo della sezione: com'e' riuscito, o che
     tipo di fallimento e' stato. */
  var QUALITA = {
    successo_pulito: {
      etichetta: 'pulito',
      colore: 'var(--buono)',
      testo: 'È andata, e non è costata quasi niente: è il caso raro e buono, quello che vale ' +
             'la pena guardare da vicino per capire che cosa lo ha reso possibile, perché ' +
             'così si può rifare.',
      breve: 'È andata, e non è costata quasi niente: è il caso raro e buono.'
    },
    successo_costoso_sostenibile: {
      etichetta: 'costoso ma sostenibile',
      colore: 'var(--attenzione)',
      testo: 'È andata, ma è costata. Il costo sta ancora dentro un limite che il sistema ' +
             'regge, e lo regge, però, solo finché resta un’eccezione: se diventa ' +
             'l’abitudine, non lo regge più.',
      breve: 'È andata, ma è costata: il sistema regge questo costo solo finché resta un’eccezione.'
    },
    successo_danneggiato: {
      etichetta: 'danneggiato',
      colore: 'var(--serio)',
      /* «La consegna c'è stata» era «the delivery happened»: in italiano si
         dice che il risultato c'è. */
      testo: 'Il compito è finito, ma qualcosa si è rotto per strada: il risultato c’è, e il ' +
             'sistema che lo ha prodotto, però, sta peggio di prima. Guardare solo il ' +
             'risultato, qui, sarebbe un errore.',
      breve: 'Il compito è finito, ma il sistema che l’ha prodotto sta peggio di prima.'
    },
    successo_tossico: {
      etichetta: 'tossico',
      colore: 'var(--critico)',
      /* «bravo, ce l’hai fatta» resta scritto apposta, ed e' l'unica lode di
         tutto il file: _test/racconto.js la lascia passare solo se nello
         stesso racconto c'e' «sarebbe la cosa peggiore da dire». */
      /* «Dire … sarebbe la cosa peggiore da dire»: «dire» due volte nella
         stessa riga. La lode resta citata, e la chiusa che il test cerca
         («sarebbe la cosa peggiore da dire») pure. */
      testo: 'Il compito è fatto, sulla carta. Il problema non è il risultato, è il modo in ' +
             'cui ci si è arrivati, perché un successo così insegna a ripetere proprio quello ' +
             'che consuma. Un «bravo, ce l’hai fatta», qui, sarebbe la cosa peggiore da dire.',
      breve: 'Il compito è fatto, ma un successo così insegna a ripetere proprio quello che ' +
             'consuma.'
    },
    successo_tecnico_fallimento_umano: {
      etichetta: 'tecnico, ma non umano',
      colore: 'var(--critico)',
      testo: 'Il compito è stato fatto, ma la persona che l’ha fatto non ne è uscita bene. ' +
             'Sono due cose diverse, e vanno tenute separate, perché riuscire non è una ' +
             'misura di salute.',
      breve: 'Il compito è stato fatto, ma la persona che l’ha fatto non ne è uscita bene.'
    },
    fallimento_lieve: {
      etichetta: 'lieve',
      colore: 'var(--attenzione)',
      testo: 'Non è andata, ma è mancato pochissimo, e non è successo niente di grave.\n\n' +
             'Un fallimento così è soprattutto un’informazione: dice che il gesto era sul ' +
             'confine, e che bastava spostare una cosa sola perché finisse dall’altra parte. ' +
             'Riprovare, qui, ha senso più che in ogni altro caso. A una condizione, però: ' +
             'che prima si cambi qualcosa, perché rifare tutto uguale vuol dire ripetere lo ' +
             'stesso tiro.',
      breve: 'Non è andata, ma è mancato pochissimo: riprovare ha senso, a patto di cambiare ' +
             'prima qualcosa.'
    },
    fallimento_tecnico: {
      etichetta: 'tecnico',
      colore: 'var(--serio)',
      /* QUESTO E' IL PUNTO IN CUI SI SPIEGA IL SENSO, E L'UNICO. Si dice IN
         CHE SENSO il fallimento e' tecnico: si nominano le condizioni, si dice
         che sono quelle a fare il numero, e si manda il lettore dove sono
         scritte. Negli altri punti del referto questa discussione non torna. */
      testo: 'Il modello lo chiama fallimento tecnico, e il nome merita due parole, perché ' +
             'nella vita questa distinzione si fa di rado.\n\nA mancare sono state le ' +
             'condizioni di partenza, non il modo di fare il gesto. Il corpo, il tempo, ' +
             'l’ambiente, quanto era già stato speso prima: parte tutto da lì. Con le stesse ' +
             'mani e la stessa testa, ma con il corpo più riposato, lo stesso gesto sarebbe ' +
             'partito da un numero più alto, e sarebbe andato diversamente.\n\n' +
             'Non è una consolazione, è un’indicazione pratica: se il problema erano le ' +
             'condizioni, sulle condizioni si può agire. Qui sotto c’è scritto quali hanno ' +
             'pesato, di quanto, e quali si possono spostare davvero.',
      breve: 'A mancare sono state le condizioni di partenza, non il modo di fare il gesto: ' +
             'è sulle condizioni che si può agire.'
    },
    fallimento_sistemico: {
      etichetta: 'sistemico',
      colore: 'var(--critico)',
      testo: 'Non è andata, e questa volta la ragione non sta nel singolo tentativo.\n\n' +
             'La differenza con il fallimento tecnico è di scala: lì mancava una condizione, ' +
             'qui manca l’insieme. Il carico con cui si è arrivati, lo stato d’animo, quello ' +
             'che era già successo prima, tiravano tutti dalla stessa parte, e il gesto ha ' +
             'solo fatto vedere dove si era arrivati. Per questo riprovare oggi, allo stesso ' +
             'modo, non cambierebbe molto: prima bisogna togliere peso, non insistere meglio.',
      breve: 'Non è andata, e la ragione non sta nel singolo tentativo ma nell’insieme, che ' +
             'pesa: prima bisogna togliere peso.'
    },
    quasi_collasso: {
      etichetta: 'quasi-collasso',
      colore: 'var(--critico)',
      testo: 'Qui non è più questione di come è andato il gesto, perché troppi indicatori ' +
             'sono in rosso nello stesso momento. La cosa utile, adesso, non è capire ' +
             'meglio: è ridurre.',
      breve: 'Troppi indicatori sono in rosso nello stesso momento: la cosa utile adesso è ' +
             'ridurre.'
    }
  };

  /* Il titolo diceva «Come è riuscito, o come non è riuscito», e teneva i
     piedi in due staffe perche' la stessa funzione serve i due casi. Ma chi
     legge sa gia', a questo punto, com'e' andata: gliel'ha detto la sezione
     prima. Un titolo che si copre le spalle davanti a un lettore che ha gia'
     l'informazione e' solo un titolo che non dice niente. */
  function qualita(res) {
    var q = QUALITA[res.esito] || { etichetta: res.esito, testo: '', breve: '' };
    return {
      titolo: res.successo_prima_del_campo
        ? 'In che modo è riuscito'
        : 'Che tipo di fallimento è stato',
      chiave: 'qualita',
      etichetta: q.etichetta,
      testo: q.testo,
      breve: q.breve || ''
    };
  }

  /* --------------------------------------------------------------------
     3 · COSTO INTERNO, DANNO RESIDUO, RISCHIO DIFFERITO
     Tre cose distinte che di solito vengono confuse in una.
     -------------------------------------------------------------------- */
  /* tre modi equivalenti di aprire l'elenco di quello che il gesto e'
     costato — scelti da varia(), non a caso.
     «Ecco che cosa il gesto ha lasciato dietro di sé» era «what the gesture
     left behind» detto con parole italiane: un gesto, in italiano, costa, e
     il costo si legge in numeri. */
  var APERTURE_COSTO = [
    'Il costo, in numeri, è questo.',
    'Questo è il conto che il gesto ha lasciato.',
    'Ecco che cosa resta, dopo questo gesto.'
  ];
  function costo(res, reg) {
    var d = res.delta, prima = res.stato_prima, dopo = res.stato_dopo;
    var breve = reg && reg.nome === 'minimo';
    var voci = [];

    /* In quasi-collasso il conto si dice in una riga sola: elencare sei danni
       a chi è già in rosso è esattamente il «report catastrofico» vietato.
       Il carico e l'assetto stanno nella riga di sintesi, che la vista mette
       in cima a tutto: il rimando va li', non «alla riga qui sopra». */
    if (breve) {
      return {
        titolo: 'Dove si è arrivati',
        chiave: 'costo',
        /* Qui, nel registro più compresso, non si aggiunge una spiegazione fra
           parentesi: sarebbe la stessa contraddizione di un report lungo in
           quasi-collasso, che il libro vieta al § 20.2. «Costo nascosto» e
           «pavimento» si sciolgono per esteso nei registri «breve» e
           «completo», dove lo spazio c'è; qui restano nominati, e basta. */
        testo: 'Il debito è a ' + dopo.debito_deb + ', il costo nascosto arriva a ' +
          dopo.costo_nascosto + '.' +
          (dopo.floor1_attivo ? ' Il «pavimento» (la protezione automatica) è attivo.' : '') +
          ' Il carico e l’assetto sono scritti nella riga in cima: qui non serve altro.'
      };
    }

    /* OGNI VOCE E' UNA FRASE INTERA, CON IL SUO PUNTO.
       «il carico è salito di 5 punti, da 62 a 67; e l’assetto si è abbassato
       di 3 punti, da 40 a 37» era una frase sola di ventidue parole, tenuta
       insieme da un punto e virgola. Chi legge vuole i due numeri uno alla
       volta. */
    /* «carico» e «assetto» si spiegano fra parentesi la prima volta che
       compaiono in questo racconto: sono nella lista dei termini da sciogliere
       subito, anche se sono parole semplici — restano comunque il nome di una
       misura precisa, non il loro senso comune. La parentesi si scrive due
       volte, una volta con la spiegazione e una senza: quando il racconto
       deve stringere, la riduzione «spiegazione di carico e assetto», qui
       sotto, passa alla versione corta senza dover rileggere il testo.
       ⚠️ La spiegazione dell'assetto e' la STESSA di SPIEGA_CARICO_ASSETTO
       (sequenza, settimana, traiettoria): erano due — «la tenuta della
       persona» qui, «quanto ci si sente al proprio posto» la' — e un termine
       spiegato in due modi non insegna niente. */
    var vociBreve = [];
    /* La parentesi e' diventata un inciso con «cioè»: stessa spiegazione,
       stesse parole, ma dentro il discorso invece che accanto (16/09/2026). */
    if (d.STR > 0) {
      voci.push('Il carico, cioè la pressione accumulata nei giorni prima, è salito di ' +
                inPunti(d.STR) + ', da ' + prima.stress_str + ' a ' + dopo.stress_str + '.');
      vociBreve.push('Il carico è salito di ' + inPunti(d.STR) + ', da ' + prima.stress_str + ' a ' + dopo.stress_str + '.');
    } else if (d.STR < 0) {
      voci.push('Il carico, cioè la pressione accumulata nei giorni prima, è sceso di ' +
                inPunti(d.STR) + ', da ' + prima.stress_str + ' a ' + dopo.stress_str + '.');
      vociBreve.push('Il carico è sceso di ' + inPunti(d.STR) + ', da ' + prima.stress_str + ' a ' + dopo.stress_str + '.');
    }
    if (d.POS < 0) {
      voci.push('L’assetto, cioè quanto ci si sente al proprio posto, e non l’umore del momento, è sceso di ' +
                inPunti(d.POS) + ', da ' + prima.posizione_pos + ' a ' + dopo.posizione_pos + '.');
      vociBreve.push('L’assetto è sceso di ' + inPunti(d.POS) + ', da ' +
                prima.posizione_pos + ' a ' + dopo.posizione_pos + '.');
    } else if (d.POS > 0) {
      voci.push('L’assetto, cioè quanto ci si sente al proprio posto, e non l’umore del momento, è salito di ' +
                inPunti(d.POS) + ', da ' + prima.posizione_pos + ' a ' + dopo.posizione_pos + '.');
      vociBreve.push('L’assetto è salito di ' + inPunti(d.POS) + ', da ' +
                prima.posizione_pos + ' a ' + dopo.posizione_pos + '.');
    }
    if (d.DEB > 0) {
      var rigaDebito = 'Il debito da insistenza è cresciuto di ' + inPunti(d.DEB) + '.';
      voci.push(rigaDebito);
      vociBreve.push(rigaDebito);
    }

    /* LA SEZIONE DICHIARA I SUOI PEZZI, E LE RIDUZIONI SPENGONO UN PEZZO.
       «elenco di ciò che resta» toglie `residuo`, «spiegazione del costo
       nascosto» toglie `spiegazione`, e montaCosto() rimonta il testo. Fino
       all'11/09/2026 le due riduzioni cercavano `s.pezzi` in una sezione che
       non li dichiarava, e montaCosto() non esisteva da nessuna parte: non
       hanno mai tolto niente, senza un errore, e il banco degli scatti le
       contava a zero. Un difetto muto, come gli altri di questo file. */
    var pezzi = {
      base: voci.length
        ? varia(res, APERTURE_COSTO) + ' ' + voci.join(' ')
        : 'Il gesto non ha lasciato costi misurabili sullo stato.',
      /* la stessa apertura, con «carico» e «assetto» senza la parentesi:
         la usa la riduzione «spiegazione di carico e assetto» quando lo
         spazio stringe e la spiegazione, già data una volta, si può togliere. */
      baseBreve: voci.length
        ? varia(res, APERTURE_COSTO) + ' ' + vociBreve.join(' ')
        : '',
      nascosto: '', spiegazione: '', soglia: '', residuo: ''
    };

    /* il costo nascosto è la parte che non si vede subito: la prima volta
       che compare non c'e' un totale da riportare, c'e' un inizio */
    /* IL NOME SI DICE QUI, DOVE NASCE. «un costo che oggi non si vede» lo
       descriveva senza mai chiamarlo per nome, e tre righe sotto la soglia
       diceva «il costo nascosto è a 58»: chi legge doveva indovinare che
       fossero la stessa cosa. Adesso il nome e la spiegazione fra parentesi
       stanno insieme, una volta sola; e «Non si sente adesso. Si sente
       quando…» era una litania di due frasi che dicevano la stessa cosa. */
    if (d.costo_nascosto > 0) {
      pezzi.nascosto = 'A questo si aggiunge il costo nascosto, quello che oggi non si vede: ' +
        inPunti(d.costo_nascosto) + ', ' +
        (prima.costo_nascosto === 0
          ? 'ed è la prima volta che se ne accumula.'
          : 'e il totale arriva a ' + dopo.costo_nascosto + '.');
      pezzi.spiegazione = 'È la parte che pesa fra qualche giorno, non oggi, e si sente quando ' +
        'è tardi per collegarla a questo gesto.';
      if (dopo.costo_nascosto >= CFG.sogliaCostoNascosto && prima.costo_nascosto < CFG.sogliaCostoNascosto) {
        /* «Non è una punizione del modello, è la sua memoria» si ricorda e non
           spiega niente. Qui si dice la cosa vera, che e' anche piu' semplice. */
        pezzi.soglia = '⚠️ Con questo gesto il costo nascosto ha passato la soglia di ' +
          CFG.sogliaCostoNascosto + ', e da qui in avanti anche i successi vengono letti come ' +
          'danneggiati. Non è una punizione: il modello tiene il conto di quello che è stato ' +
          'speso finora, e lo fa pesare in ogni lettura.';
      }
    }

    /* danno residuo e rischio differito. Se il costo nascosto e' gia' stato
       raccontato qui sopra, nell'elenco non ci torna. */
    var residuo = [];
    if (dopo.stress_str >= 70) { residuo.push('un carico alto, che ci si porta dietro nella scena dopo'); }
    if (dopo.posizione_pos <= 30) { residuo.push('un assetto basso, che rende più difficile il rientro'); }
    if (dopo.debito_deb >= 2) { residuo.push('un debito che non si chiude da solo'); }
    if (dopo.costo_nascosto >= 30 && !pezzi.nascosto) {
      residuo.push('un costo nascosto che cresce in silenzio');
    }
    if (dopo.floor1_attivo) {
      residuo.push('un pavimento attivo, cioè un sistema che si protegge da solo');
    }
    /* il punto e virgola si mette solo quando una voce ha gia' una virgola
       dentro; se no basta la congiunzione */
    if (residuo.length) {
      var conVirgoleDentro = residuo.some(function (v) { return v.indexOf(',') >= 0; });
      pezzi.residuo = 'Quello che resta dopo è questo: ' +
        (residuo.length === 1 ? residuo[0]
         : conVirgoleDentro
           ? residuo.slice(0, -1).join('; ') + '; e ' + residuo[residuo.length - 1]
           : elenco(residuo)) + '.';
    }

    var s = { titolo: 'Che cosa è costato', chiave: 'costo', pezzi: pezzi, testo: '' };
    montaCosto(s);
    return s;
  }

  /* I pezzi della sezione del costo, rimessi in fila: come montaEsito(). */
  function montaCosto(s) {
    var p = s.pezzi;
    s.testo = [p.base, p.nascosto, p.spiegazione, p.soglia, p.residuo].filter(Boolean).join(' ');
  }

  /* --------------------------------------------------------------------
     4 · LE LEVE CHE HANNO PESATO — ordinate per peso reale
     -------------------------------------------------------------------- */
  var NOMI_LEVA = {
    E:     { nome: 'il corpo', verso: 'lo stato fisico del momento' },
    I:     { nome: 'la chiarezza', verso: 'sapere che cosa fare e come' },
    T:     { nome: 'il tempo', verso: 'quanto tempo c’era davanti' },
    M:     { nome: 'l’ambiente', verso: 'lo spazio, gli oggetti, gli strumenti' },
    BP:    { nome: 'la protezione', verso: 'un aiuto concreto e temporaneo' },
    C:     { nome: 'i pezzi da coordinare', verso: 'quante cose vanno tenute insieme', plurale: true },
    piSTR: { nome: 'il carico accumulato', verso: 'lo stress che ci si porta dietro' },
    DEB:   { nome: 'il debito da insistenza', verso: 'l’aver riprovato uguale senza cambiare' }
  };

  /* tre modi equivalenti di introdurre quello che ha retto, quando qualcosa
     ha anche tirato giù la probabilità — scelti da varia(), non a caso.
     «Dall'altra parte» e «Sul lato opposto» erano «on the other hand» e «on
     the other side»: in italiano il rovescio di un conto si introduce con
     «in compenso», o con un «però». */
  /* Finiscono con i due punti, e la frase di quello che ha retto continua in
     minuscolo dopo di loro: «In compenso qualcosa ha retto: la protezione ha
     aggiunto 5 punti». Un periodo solo, invece di due frasi a martello
     (16/09/2026, la voce da racconto). */
  var APERTURE_PRO_CONTRO = [
    'In compenso qualcosa ha retto: ',
    'Qualcosa, però, ha tenuto: ',
    'Non tutto ha tirato giù, e qualcosa ha retto: '
  ];

  function levePesate(res, massimo) {
    var t = res.termini;
    var righe = ['E', 'I', 'T', 'M', 'BP', 'C', 'piSTR', 'DEB']
      .map(function (k) { return { k: k, val: t[k] }; })
      .filter(function (x) { return x.val !== 0; })
      .sort(function (a, b) { return Math.abs(b.val) - Math.abs(a.val); });

    var contro = righe.filter(function (x) { return x.val < 0; }).slice(0, massimo);
    var pro = righe.filter(function (x) { return x.val > 0; }).slice(0, 2);

    /* IL VERBO SI ACCORDA AL NOME CHE SEGUE, E UNO DEGLI OTTO NOMI E' PLURALE.
       «i pezzi da coordinare» vuole «hanno tolto»; gli altri sette «ha tolto».
       Il genere, invece, a questi verbi non serve. */
    function haTolto(k) { return NOMI_LEVA[k].plurale ? 'hanno tolto ' : 'ha tolto '; }
    function haAggiunto(k) { return NOMI_LEVA[k].plurale ? 'hanno aggiunto ' : 'ha aggiunto '; }

    var frasi = [];
    if (contro.length) {
      var pesi = contro.map(function (x) { return Math.abs(x.val); });
      var nomi = contro.map(function (x) { return NOMI_LEVA[x.k].nome; });
      var tuttiUguali = pesi.every(function (v) { return v === pesi[0]; });
      if (contro.length > 1 && tuttiUguali) {
        /* Quando le voci pesano uguale si dice una volta sola, ed e' anche
           l'informazione piu' interessante: nessuna domina, e toglierne una
           sola non basta. */
        /* «cioè esattamente uguale» era «exactly the same» con parole
           italiane: a voce, un peso uguale e' «né più né meno». */
        frasi.push('A tirare giù la probabilità sono stati soprattutto ' + elenco(nomi) + ', che ' +
          'pesano ' + inPunti(pesi[0]) + ' a testa, né più né meno. ' +
          'Nessuno dei ' + (contro.length === 2 ? 'due' : 'tre') +
          ' decide da solo, e ' +
          (contro.length === 2 ? 'togliere uno solo e lasciare l’altro'
                               : 'toglierne uno solo e lasciare gli altri') +
          ' sposterebbe poco.');
      } else if (contro.length === 1) {
        frasi.push('A tirare giù la probabilità ha pesato soprattutto ' + nomi[0] + ', che ' +
          haTolto(contro[0].k) + inPunti(pesi[0]) + '.');
      } else {
        /* «il carico accumulato (10 punti), il tempo (8) e il corpo (6)» era
           una frase sola con i numeri fra parentesi: esatta, e la piu'
           faticosa di tutto il referto (Gulpease 58 su centinaia di casi).
           Adesso si annuncia quante sono, poi si contano. L'unita' la porta
           la prima, come in ogni elenco di misure scritto in italiano; le
           altre vanno per ellissi: «il tempo 8, il corpo 6». */
        var coda = nomi.slice(1).map(function (nm, i) { return nm + ' ' + pesi[i + 1]; });
        frasi.push((contro.length === 2 ? 'Due' : 'Tre') + ' condizioni hanno pesato più di tutte. ' +
          maiuscola(nomi[0]) + ' ' + haTolto(contro[0].k) + inPunti(pesi[0]) + ' alla probabilità, ' +
          (contro.length === 2 ? coda[0] : coda[0] + ' e ' + coda[1]) + '.');
      }
    }
    var senzaPro = frasi.length ? frasi[0] : '';
    if (pro.length) {
      var nomiPro = pro.map(function (x) { return NOMI_LEVA[x.k].nome; });
      frasi.push((contro.length
          ? varia(res, APERTURE_PRO_CONTRO)
          : 'Niente ha tirato giù la probabilità, e qualcosa l’ha tenuta su: ') +
        nomiPro[0] + ' ' + haAggiunto(pro[0].k) + inPunti(pro[0].val) +
        (pro.length > 1 ? ', ' + nomiPro[1] + ' ' + Math.abs(pro[1].val) : '') + '.');
    }
    if (!frasi.length) {
      frasi.push('Nessuna condizione ha spostato il risultato in modo sensibile: ha deciso ' +
        'quasi tutto il punto di partenza del compito, cioè quanto era facile, o difficile, in sé.');
    }
    var testo = frasi.join(' ');
    return {
      titolo: 'Che cosa ha pesato',
      chiave: 'pesate',
      testo: testo,
      /* il testo senza la parte «ha retto»: lo usa la riduzione «ciò che ha
         retto», che fino all'11/09/2026 lo cercava senza che nessuno lo
         scrivesse — zero scatti su ottocento racconti */
      senza_pro: (senzaPro && senzaPro !== testo) ? senzaPro : '',
      contro: contro, pro: pro
    };
  }

  /* --------------------------------------------------------------------
     5 · LE LEVE DISPONIBILI — misurate, non decise a soglia

     PRIMA VERSIONE, e perche' era sbagliata. Ogni leva compariva sopra una
     soglia scelta a mano: «spezzare il compito» sopra 10 punti di C,
     «procurarsi l'informazione» sopra 8 di I, «rimandare» sopra 12 di E.
     Quelle soglie non venivano da nessuna fonte. Erano mie, e sembravano
     ragionevoli — che e' esattamente il modo in cui un modello si riempie
     di numeri che nessuno sa piu' da dove vengano.

     LA MISURA, in `_taratura/leve.js`. Mille nodi generati a caso, ogni leva
     applicata a ognuno, e ogni nodo giocato su TUTTI E CENTO i tiri del dado:
     900.000 valutazioni. Per rendere il confronto onesto, ogni leva vale
     esattamente DIECI PUNTI DI Pn — la prima versione della misura dava al
     rientro il doppio del budget delle altre, e infatti vinceva sempre.

     CHE COSA E' VENUTO FUORI
       Un rientro vero                          14,0     e non da' nessun punto di Pn
       Smettere di riprovare uguale (DEB)       11,3
       Arrivarci con meno carico (STR)           7,8
       Informazione, tempo, ambiente, aiuto,
       corpo — a parita' di dieci punti          1,8     tutte identiche
       Spezzare il compito                       1,2     (limitato da C >= 0)

     Le cinque leve che agiscono sulla FORMULA valgono tutte uguale, com'e'
     giusto che sia: dieci punti sono dieci punti. Le leve che agiscono sullo
     STATO valgono da quattro a otto volte tanto. E la piu' forte di tutte
     non sposta la probabilita' di un punto.

     COME SI SCEGLIE ADESSO
     Non per soglia: si misura il guadagno di ogni leva SU QUESTO NODO, con
     tutti e cento i tiri, e si propone quella che rende di piu'. Una leva
     resta esclusa solo se non e' disponibile davvero — non si propone di
     chiedere un aiuto che c'e' gia'.
     -------------------------------------------------------------------- */

  /* Le leve, con l'intervento e la condizione che le rende disponibili.
     La condizione e' qualitativa e verificabile sul nodo: e' il divieto di
     «report teorico» del § 18.3, che vieta di proporre cio' che non c'e'. */
  var LEVE = [
    { id: 'rientro', azione: 'Un rientro vero, non una pausa apparente',
      disponibile: function (n, t) { return ['assente', 'finta', 'debole'].indexOf(n.stato_prima.rip) >= 0; },
      applica: function (n) { var m = clonaNodo(n); m.stato_prima.rip = 'vera'; return m; },
      perche: function (n, t) {
        return 'è la leva che nelle prove rende più di tutte, eppure non aggiunge un solo ' +
               'punto di probabilità, perché agisce su quello che resta dopo. Fermarsi con ' +
               'la testa che continua a lavorare non è fermarsi davvero.'; },
      /* OGNI LEVA HA ANCHE UNA MOTIVAZIONE BREVE, SCRITTA A MANO.
         La riduzione «motivazione della leva» teneva la prima frase: a frasi
         corte, la prima poteva essere un pezzo solo del ragionamento. */
      breve: function (n, t) {
        return 'è la leva che nelle prove rende più di tutte. Agisce su quello che resta dopo.'; } },

    { id: 'debito', azione: 'Chiudere il debito, non ridurlo',
      disponibile: function (n, t) { return n.stato_prima.debito_deb >= 1; },
      /* MISURATO: il debito e' una scogliera, non una discesa. Con lo stesso
         nodo, al variare del solo debito:
             DEB 3 → 28 % di successi, TUTTI danneggiati
             DEB 2 → 33 % di successi, TUTTI danneggiati
             DEB 1 → 38 % di successi, TUTTI danneggiati
             DEB 0 → 43 % di successi, TUTTI puliti o sostenibili
         Ridurlo alza la probabilita' e non cambia niente: finche' resta anche
         un solo punto di debito, ogni riuscita esce danneggiata. Per questo la
         leva porta a zero, e non toglie due punti. */
      applica: function (n) { var m = clonaNodo(n); m.stato_prima.debito_deb = 0; return m; },
      perche: function (n, t) {
        return 'il debito toglie ' + inPunti(t.DEB) + ', ma non è questo il problema: finché ' +
               'ne resta anche uno solo, ogni riuscita esce danneggiata. Ridurlo non serve, ' +
               'va chiuso, e non si chiude fermandosi ma cambiando il modo di fare.'; },
      breve: function (n, t) {
        return 'finché resta anche un solo punto di debito, ogni riuscita esce danneggiata, ' +
               'e va chiuso, non ridotto.'; } },

    { id: 'carico', azione: 'Arrivarci con meno carico addosso',
      disponibile: function (n, t) { return n.stato_prima.stress_str >= 40; },
      applica: function (n) { var m = clonaNodo(n);
        m.stato_prima.stress_str = Math.max(0, m.stato_prima.stress_str - 20); return m; },
      perche: function (n, t) {
        return 'il carico accumulato toglie ' + inPunti(t.piSTR) + ', e non li toglie in ' +
               'proporzione ma a gradini: per questo bastano pochi punti in meno per ' +
               'scendere di un gradino intero, e i punti tornano tutti insieme.'; },
      breve: function (n, t) {
        return 'il carico accumulato toglie ' + inPunti(t.piSTR) + ', e li toglie a gradini. ' +
               'Pochi punti in meno possono restituirli tutti insieme.'; } },

    { id: 'complessita', azione: 'Spezzare il compito',
      disponibile: function (n, t) { return n.modificatori.complessita_c >= 2; },
      applica: function (n) { var m = clonaNodo(n);
        m.modificatori.complessita_c = Math.max(0, m.modificatori.complessita_c - 2); return m; },
      perche: function (n, t) {
        return 'i pezzi da coordinare tolgono ' + inPunti(t.C) + ', e la mossa è farne uno ' +
               'solo adesso, rimandando il resto.'; },
      breve: function (n, t) {
        return 'i pezzi da coordinare tolgono ' + inPunti(t.C) + ', e la mossa è farne uno ' +
               'solo adesso, rimandando il resto.'; } },

    { id: 'informazione', azione: 'Procurarsi l’informazione che manca',
      disponibile: function (n, t) { return n.modificatori.informazione_i <= -4; },
      applica: function (n) { var m = clonaNodo(n);
        m.modificatori.informazione_i = Math.min(30, m.modificatori.informazione_i + 10); return m; },
      perche: function (n, t) {
        return 'non sapere come si fa toglie ' + inPunti(t.I) + ', ed è la leva che costa ' +
               'meno di tutte, perché spesso basta una telefonata.'; },
      breve: function (n, t) {
        return 'non sapere come si fa toglie ' + inPunti(t.I) + ', e spesso basta una telefonata.'; } },

    /* Si chiamava «Guadagnare margine», ed era la terza volta che «margine»
       compariva nello stesso referto con un senso diverso da quello che la
       prima sezione aveva appena insegnato. Qui il senso e' semplicemente:
       arrivarci con più tempo davanti. */
    { id: 'tempo', azione: 'Prendersi più tempo davanti',
      disponibile: function (n, t) { return n.modificatori.tempo_t <= -4; },
      applica: function (n) { var m = clonaNodo(n);
        m.modificatori.tempo_t = Math.min(30, m.modificatori.tempo_t + 10); return m; },
      perche: function (n, t) {
        return 'la fretta toglie ' + inPunti(t.T) + ', e avvisare che si arriva più tardi ' +
               'costa poco e restituisce quei punti quasi per intero.'; },
      breve: function (n, t) {
        return 'la fretta toglie ' + inPunti(t.T) + ', e avvisare che si arriva più tardi ' +
               'costa poco e li restituisce quasi tutti.'; } },

    { id: 'ambiente', azione: 'Sistemare l’ambiente prima di cominciare',
      disponibile: function (n, t) { return n.modificatori.materiale_m <= -4; },
      applica: function (n) { var m = clonaNodo(n);
        m.modificatori.materiale_m = Math.min(30, m.modificatori.materiale_m + 10); return m; },
      perche: function (n, t) {
        return 'lo spazio e gli strumenti tolgono ' + inPunti(t.M) + ', e due minuti di ' +
               'preparazione valgono più di dieci di fatica.'; },
      breve: function (n, t) {
        return 'lo spazio e gli strumenti tolgono ' + inPunti(t.M) + ', e due minuti di ' +
               'preparazione valgono più di dieci di fatica.'; } },

    { id: 'aiuto', azione: 'Chiedere un aiuto che tolga carico, non che conforti',
      disponibile: function (n, t) {
        var sup = (n.supporto || {}).tipo;
        return ['assente', 'emotivo', 'simbolico', 'inefficace'].indexOf(sup) >= 0; },
      applica: function (n) { var m = clonaNodo(n);
        m.modificatori.bonus_bp = Math.min(20, m.modificatori.bonus_bp + 10);
        m.supporto = { tipo: 'pratico', delega: 'reale', riduzione_carico: 0.4 }; return m; },
      /* la coda vale per tutti e due i rami; l'apertura no: «di aiuto non
         ce n'è: sostiene l'umore» non voleva dire niente */
      perche: function (n, t) {
        var sup = (n.supporto || {}).tipo;
        /* «in capo a» e' linguaggio da atto notarile: a voce si dice «sulle
           spalle di» */
        return (sup === 'assente'
                 ? 'di aiuto non ce n’è, e il lavoro resta tutto sulle spalle di una persona sola.'
                 : 'l’aiuto che c’è sostiene l’umore, ma non toglie niente da fare.') +
               ' Un aiuto che si prende una parte concreta del lavoro toglie punti, mentre un ' +
               'incoraggiamento, per quanto sincero, non ne toglie nemmeno uno.'; },
      breve: function (n, t) {
        var sup = (n.supporto || {}).tipo;
        return (sup === 'assente'
                 ? 'di aiuto non ce n’è, e'
                 : 'l’aiuto che c’è sostiene l’umore ma non toglie niente da fare:') +
               ' toglie punti solo chi si prende una parte concreta del lavoro.'; } },

    { id: 'corpo', azione: 'Rimandare a quando il corpo c’è',
      disponibile: function (n, t) { return n.modificatori.energia_e <= -6; },
      applica: function (n) { var m = clonaNodo(n);
        m.modificatori.energia_e = Math.min(30, m.modificatori.energia_e + 10); return m; },
      perche: function (n, t) {
        return 'il corpo toglie ' + inPunti(t.E) + ', e se il compito può aspettare due ore, o ' +
               'una notte, conviene aspettare: è la mossa che rende di più per quello che costa.'; },
      breve: function (n, t) {
        return 'il corpo toglie ' + inPunti(t.E) + ', e se il compito può aspettare conviene ' +
               'aspettare.'; } }
  ];

  function clonaNodo(n) { return JSON.parse(JSON.stringify(N.normalizzaNodo(n))); }

  /* Il guadagno di una leva su QUESTO nodo, su tutti e cento i tiri.
     Non un campione: tutto lo spazio del dado, quindi nessun rumore. */
  var BUONI = ['successo_pulito', 'successo_costoso_sostenibile'];
  var CATTIVI = ['successo_danneggiato', 'successo_tossico',
                 'successo_tecnico_fallimento_umano', 'fallimento_sistemico', 'quasi_collasso'];

  function valutaSuTuttiITiri(nodo) {
    var S = globale.Stato;
    if (!S || !S.eseguiNodoCompleto) { return null; }
    var riusciti = 0, buoni = 0, cattivi = 0, str = 0;
    for (var t = 1; t <= 100; t++) {
      var r = S.eseguiNodoCompleto(nodo, { tiro: t });
      if (r.successo_prima_del_campo) { riusciti++; }
      if (BUONI.indexOf(r.esito) >= 0) { buoni++; }
      if (CATTIVI.indexOf(r.esito) >= 0) { cattivi++; }
      str += r.delta.STR;
    }
    return { riusciti: riusciti / 100, buoni: buoni / 100, cattivi: cattivi / 100, str: str / 100 };
  }

  /* Lo stesso punteggio usato in _taratura/leve.js: riuscita, qualita'
     dell'esito e carico risparmiato, con lo stesso peso. */
  function punteggioLeva(prima, dopo) {
    return (dopo.riusciti - prima.riusciti) * 100 +
           (dopo.buoni - prima.buoni) * 100 +
           (prima.cattivi - dopo.cattivi) * 100 +
           (prima.str - dopo.str) * 2;
  }

  function leveDisponibili(res, nodo, massimo) {
    var t = res.termini;
    var base = valutaSuTuttiITiri(nodo);
    var proposte = [];

    for (var i = 0; i < LEVE.length; i++) {
      var L = LEVE[i];
      if (!L.disponibile(N.normalizzaNodo(nodo), t)) { continue; }
      var g = base ? punteggioLeva(base, valutaSuTuttiITiri(L.applica(nodo))) : 0;
      if (g <= 0.5) { continue; }        /* se non rende, non si propone */
      proposte.push({
        id: L.id, azione: L.azione, peso: Math.round(g * 10) / 10,
        perche: L.perche(N.normalizzaNodo(nodo), t),
        /* la versione corta, per quando il racconto si accorcia: scritta a
           mano per ogni leva, non pescata dal testo */
        perche_breve: L.breve ? L.breve(N.normalizzaNodo(nodo), t) : ''
      });
    }

    proposte.sort(function (a, b) { return b.peso - a.peso; });
    var scelte = proposte.slice(0, massimo);

    /* «leva» si spiega dove nasce, in mezza riga e una volta sola: chi legge
       un referto non ha un glossario aperto accanto, e la parola torna nella
       sequenza, nella settimana e nella traiettoria. E una cosa che si scopre
       e fa piacere, in italiano, e' una buona notizia — non «un'informazione
       buona». */
    if (!scelte.length) {
      return {
        titolo: 'Che cosa si può spostare',
        testo: 'Nessuna condizione è così fuori posto da meritare un intervento. Il libro ' +
               'chiama leva una condizione che basta spostare perché il resto si muova, e ' +
               'qui non ce n’è una da tirare: è già una buona notizia.',
        leve: []
      };
    }
    var intro = (scelte.length === 1)
      ? INTRO_UNA_LEVA
      : 'Queste sono le leve, che è il nome che il libro dà alle condizioni che basta ' +
        'spostare perché il resto si muova. Sono messe in fila, prima quella che renderebbe ' +
        'di più e poi le altre, e la resa è misurata su questo gesto, non in generale.';
    return { titolo: 'Che cosa si può spostare', testo: intro, leve: scelte };
  }

  /* --------------------------------------------------------------------
     6 · SUPPORTO E ADATTAMENTO — reali o solo dichiarati
     -------------------------------------------------------------------- */
  /* OGNI LETTURA DELL'AIUTO HA DUE TESTI: QUELLO INTERO E QUELLO BREVE.
     La riduzione «dettaglio del supporto» teneva la prima frase del testo e
     buttava il resto; da quando le frasi sono corte, la prima da sola non
     diceva piu' che cosa l'aiuto toglieva davvero — cioe' la cosa per cui la
     sezione esiste. `breve` e' scritto a mano per ognuna delle nove voci e
     risponde da solo al titolo: chi c'era, e che cosa toglieva. */
  var LETTURA_SUPPORTO = {
    assente: {
      testo: 'Non c’è nessun aiuto, e va detto senza farne un dramma: è una condizione, non una colpa.',
      breve: 'Non c’è nessun aiuto: è una condizione, non una colpa.' },
    /* «in capo a» (burocratese), «prendere in carico» (idem), «non va seguito
       mentre aiuta» (che in italiano non si capisce: voleva dire che non
       c'e' bisogno di sorvegliarlo) e «resta il compito vero» (il calco di
       «the real task remains») sono stati riscritti come si direbbero a
       voce. */
    emotivo: {
      testo: 'C’è vicinanza, e conta davvero, ma non toglie niente da fare: il lavoro resta ' +
             'tutto sulle spalle di chi lo sta facendo, perché stare accanto a qualcuno lo ' +
             'aiuta a reggere, non a finire.',
      breve: 'C’è vicinanza, e conta, ma non toglie niente da fare.' },
    simbolico: {
      testo: 'L’aiuto è simbolico: esiste come gesto e si vede, ma non alleggerisce niente.',
      breve: 'L’aiuto è simbolico: si vede, ma non alleggerisce niente.' },
    /* «È una delle cose che pesano di più. Le cose da fare, però…»: «cose»
       due volte in due righe, e quel «però» cadeva a quattro parole dal
       «Però» che legameDelega() mette davanti alla delega reale — «…però,
       restano… Però quello che…». La restrizione resta, detta con «invece». */
    informativo: {
      testo: 'L’aiuto è informativo: qualcuno spiega come si fa, e toglie il non sapere, che ' +
             'è uno dei pesi più grossi. Il lavoro, invece, resta tutto a chi lo stava facendo.',
      breve: 'L’aiuto è informativo: toglie il non sapere, non le cose da fare.' },
    pratico: {
      testo: 'L’aiuto è pratico: qualcuno si prende una parte del lavoro, e quella ' +
             'parte esce davvero dalle mani di chi faceva tutto.',
      breve: 'L’aiuto è pratico: una parte del lavoro passa davvero ad altri.' },
    logistico: {
      testo: 'L’aiuto è logistico: qualcuno si prende il contorno, cioè gli spostamenti, le ' +
             'cose da procurare, i tempi da incastrare. Il compito vero resta a chi lo faceva, ' +
             'ma senza tutto quello che si porta dietro.',
      breve: 'L’aiuto è logistico: qualcuno si prende il contorno, e il compito vero resta a chi lo faceva.' },
    professionale: {
      testo: 'C’è un aiuto professionale: chi lo dà sa quello che fa, si occupa di un ' +
             'pezzo preciso, ed è il tipo di aiuto che non c’è bisogno di sorvegliare.',
      breve: 'C’è un aiuto professionale: si occupa di un pezzo preciso, e non c’è bisogno di sorvegliarlo.' },
    inefficace: {
      testo: 'L’aiuto c’è, ma non funziona, perché che qualcuno sia presente non vuol dire che ' +
             'stia alleggerendo: conta quello che toglie da fare, non che ci sia.',
      breve: 'L’aiuto c’è, ma non funziona: non toglie niente da fare.' },
    invasivo: {
      testo: 'L’aiuto invade: invece di togliere qualcosa da fare, ne aggiunge, perché adesso ' +
             'bisogna occuparsi anche di lui.',
      breve: 'L’aiuto invade: invece di togliere lavoro, ne aggiunge.' }
  };
  /* Ogni riga della delega mette avanti quello che succede e in fondo il
     nome della cosa — prima il fatto, poi come si chiama. Sei righe che
     cominciavano tutte con «La delega è…», dopo una riga che cominciava con
     «L'aiuto è…», si leggevano come una scheda, non come un discorso.
     ⚠️ Cominciano in minuscola apposta: davanti ci va la congiunzione che
     sceglie supporto(), che sa se questa riga conferma quella prima o la
     contraddice. Quando la riga dell'aiuto non c'e', supporto() rimette la
     maiuscola da se'. E dentro non c'e' nessun «solo che»: cadrebbe a otto
     parole da quello che supporto() mette davanti. */
  var LETTURA_DELEGA = {
    assente:      '',
    parziale:     'una parte va tenuta d’occhio, e tenere d’occhio costa: la delega è parziale.',
    reale:        'quello che è stato passato ad altri resta ad altri: la delega è reale.',
    finta:        'il compito viene passato a qualcuno e poi rifatto da capo: la delega è ' +
                  'finta. Così non si toglie lavoro, se ne aggiunge, prima spiegare e poi ' +
                  'rifare, e intanto il compito è rimasto in testa lo stesso.',
    tardiva:      'la delega arriva tardi, e serve lo stesso, ma il costo a quel punto è già ' +
                  'stato pagato, e non si recupera.',
    incompetente: 'quello che torna indietro va corretto, e il lavoro non è sparito: è ' +
                  'diventato un lavoro di correzione.',
    invasiva:     'chi aiuta decide lui, e così aggiunge un problema invece di toglierlo: la ' +
                  'delega invade.'
  };
  /* CHE COSA LEGA LA RIGA DELLA DELEGA A QUELLA DELL'AIUTO.
     Le due righe nascono in due tabelle diverse e non si conoscono; il legame
     invece si sa, e allora si dice. Un aiuto ALLEGGERISCE o non alleggerisce
     — e' la domanda che fa il titolo della sezione. Una delega REGGE, non
     regge, o regge a meta'. Se i due segni concordano si tira dritto con
     «e»; se si oppongono si dice «però»; se la delega smorza una buona
     notizia senza rovesciarla, «solo che».
     ⚠️ Un connettivo dove il legame non c'e' e' peggio del silenzio: per
     questo i due segni sono scritti a mano, voce per voce, e non indovinati.
     ⚠️ «informativo» NON sta fra quelli che alleggeriscono, e non e' una
     dimenticanza: la sua riga finisce con una restrizione («le cose da fare,
     però, restano…»), e quello che conta per la congiunzione e' come finisce
     la frase che il lettore ha appena letto, non il bilancio della voce. */
  var AIUTO_ALLEGGERISCE = ['pratico', 'logistico', 'professionale'];
  var DELEGA_REGGE = ['reale'];
  var DELEGA_A_META = ['parziale', 'tardiva'];
  function legameDelega(tipo, delega) {
    var alleggerisce = AIUTO_ALLEGGERISCE.indexOf(tipo) >= 0;
    if (DELEGA_A_META.indexOf(delega) >= 0) { return alleggerisce ? 'Solo che' : 'E'; }
    var regge = DELEGA_REGGE.indexOf(delega) >= 0;
    return (alleggerisce === regge) ? 'E' : 'Però';
  }
  /* La strada di scorta si chiama «riserva», non «margine»: «margine» la
     prima sezione del referto l'ha appena insegnato con un altro senso. */
  var LETTURA_ADATTAMENTO = {
    reale:           'C’è più di una strada praticabile, ed è questa la riserva che protegge ' +
                     'dalle sorprese.',
    parziale:        'C’è un’alternativa sola, e costa. È meglio di niente, ma non è una ' +
                     'riserva, perché una riserva è poter scegliere fra due strade, e qui la ' +
                     'strada è una: se salta, non ne resta nessuna.',
    teorica:         'L’alternativa esiste in teoria, non in pratica, e il modello la conta per ' +
                     'quello che è: dichiarata, ma non disponibile.',
    tardiva:         'L’alternativa arriva, ma arriva tardi, spesso troppo tardi per servire: ' +
                     'quando compare, la strada è già stata fatta senza di lei.',
    finta:           'L’alternativa è finta: sembra una via d’uscita, e non lo è.',
    /* «E questo va saputo prima, non dopo» apriva con «e questo», che e' un
       attacco da traduzione: la stessa cosa a voce si dice in quattro parole */
    non_disponibile: 'Non c’è alternativa: se le cose si mettono male, non si può cambiare ' +
                     'strada, ed è meglio saperlo prima che dopo.'
  };

  function supporto(res, nodo) {
    var sup = nodo.supporto || {}, ad = nodo.adattamento || {};
    var pezzi = [], breve = '';
    if (LETTURA_SUPPORTO[sup.tipo]) {
      pezzi.push(LETTURA_SUPPORTO[sup.tipo].testo);
      breve = LETTURA_SUPPORTO[sup.tipo].breve;
    }
    if (LETTURA_DELEGA[sup.delega]) {
      /* se la riga dell'aiuto non c'e', questa apre la sezione e si rialza la
         maiuscola: le righe della delega stanno in minuscola perche' di solito
         hanno una congiunzione davanti, non perche' siano pezzi di frase. */
      pezzi.push(pezzi.length
        ? legameDelega(sup.tipo, sup.delega) + ' ' + LETTURA_DELEGA[sup.delega]
        : maiuscola(LETTURA_DELEGA[sup.delega]));
    }
    if (LETTURA_ADATTAMENTO[ad.disponibilita]) { pezzi.push(LETTURA_ADATTAMENTO[ad.disponibilita]); }
    /* Se non c'e' niente da dire su chi c'era, non si scrive un titolo con
       il vuoto sotto: si restituisce niente. */
    if (!pezzi.length) { return null; }
    /* senza la riga dell'aiuto, la versione breve e' la prima frase del
       primo pezzo che c'e' */
    if (!breve) { breve = divisioneFrasi(pezzi[0])[0]; }
    return { titolo: 'Chi c’era, e che cosa toglieva davvero', chiave: 'supporto',
             testo: pezzi.join(' '), breve: breve };
  }

  /* --------------------------------------------------------------------
     7 · IL RIENTRO — quanto è possibile tornare indietro
     -------------------------------------------------------------------- */
  /* Sei letture del rientro, ed erano tutte e sei troppo corte: frasi giuste e
     chiuse, che dicono la cosa e non la spiegano. «Contiene, non ripara» e'
     memorabile e non insegna niente a chi non sa gia' che cosa contenga e che
     cosa dovrebbe riparare. Qui il lettore va accompagnato: e' il punto in cui
     il modello dice una cosa che nella vita si sbaglia continuamente, cioe'
     che fermarsi e riposare non sono la stessa cosa. */
  var LETTURA_RIP = {
    /* «e questo è il punto» era «and that's the point»; «un riposo che si
       sente come riposo» era «feels like rest»; «la condizione migliore in
       cui una scena possa chiudersi» era «the best way a scene can close».
       Riscritte come le direbbe un italiano. */
    assente: 'Non ci si ferma mai davvero, ed è qui il problema, perché senza un rientro il ' +
             'carico non ha nessun modo di scendere. Non è una questione di volontà: il ' +
             'recupero ha bisogno di tempo in cui non succede niente, e quel tempo qui non c’è.',
    finta:   'La pausa c’è, ma non è una pausa, perché cambia l’attività e non lo stato: ' +
             'smettere una cosa e cominciarne un’altra sposta l’attenzione, ma il carico ' +
             'resta dov’era. È un riposo che sembra riposo, e non lo è.',
    debole:  'Il rientro è debole: ci si ferma davvero, ma la testa continua a lavorare, e ' +
             'allora serve a contenere il danno, non a ripararlo. La differenza non si vede ' +
             'oggi, si vede domani, quando il carico riparte da dove era rimasto invece che ' +
             'da più in basso.',
    vera:    'Il rientro è vero: dopo, qualcosa è cambiato davvero nello stato, non solo ' +
             'nella sensazione. È la differenza fra una pausa che riposa e una che ' +
             'rimanda la stanchezza.',
    tardiva: 'Il rientro arriva, ma arriva tardi. Serve ancora, perché tardi è sempre meglio ' +
             'che mai, solo che il costo, a quel punto, è già stato pagato: quello che si ' +
             'recupera è la coda, non il danno.',
    piena:   'Il rientro è pieno, ed è il modo migliore in cui una scena possa finire: ' +
             'il carico scende davvero, e la scena dopo comincia da un punto più basso ' +
             'invece che dallo stesso.'
  };

  /* PERCHE' IL PAVIMENTO E' ACCESO, DETTO IN ITALIANO E SENZA SIGLE.
     Il motore un motivo ce l'ha, e sta in `floor1_motivo` (stato.js): una
     frase intera in italiano, scritta per chi legge il racconto, non un
     codice per chi legge il codice. Il pavimento ha tre porte, e sono
     quelle di PORTE_PAVIMENTO: qui si guarda quali sono aperte ADESSO e si
     nominano con le parole che il lettore ha gia' visto dappertutto. Se non
     ne e' aperta nessuna non si inventa una causa. */
  var NOME_PORTA = { STR: 'il carico', POS: 'l’assetto', costo_nascosto: 'il costo nascosto' };

  function porteAperte(stato) {
    var valori = { STR: stato.stress_str, POS: stato.posizione_pos,
                   costo_nascosto: stato.costo_nascosto };
    var aperte = [];
    PORTE_PAVIMENTO.forEach(function (p) {
      var v = valori[p.variabile];
      if (v === undefined) { return; }
      if (p.verso === 'sopra' ? v >= p.soglia : v <= p.soglia) { aperte.push(NOME_PORTA[p.variabile]); }
    });
    return aperte;
  }

  function perchePavimento(stato) {
    var aperte = porteAperte(stato);
    if (!aperte.length) { return ''; }
    return ', e a tenerlo acceso ' + (aperte.length > 1 ? 'sono ' : 'è ') + elenco(aperte);
  }

  function rientro(res) {
    var s = res.stato_dopo;
    /* il rientro va letto com'era DURANTE il nodo: dopo, il motore lo consuma.
       Leggere stato_dopo.rip direbbe «non ci si ferma mai» proprio a chi si è appena fermato. */
    var ripUsato = res.stato_prima.rip;
    /* IL RIENTRO BUONO E IL RIENTRO CATTIVO NON REGGONO LO STESSO SEGUITO.
       Con un rientro vero il seguito e' sempre una restrizione — «però»,
       «solo che»; con un rientro assente o finto e' una conferma — «e». Il
       segno si sa da qui, e allora si dice invece di lasciarlo indovinare. */
    var buono = (ripUsato === 'vera' || ripUsato === 'piena');
    var pezzi = [LETTURA_RIP[ripUsato] || ''];
    if (buono && s.rip !== ripUsato) {
      pezzi.push('Quel rientro, però, è stato speso qui, e per il gesto dopo non c’è più: va rifatto.');
    }
    if (s.or1 < 0.35) {
      pezzi.push((buono ? 'Solo che la' : 'E la') + ' capacità di rientrare è bassa (' +
        conVirgola(s.or1.toFixed(2)) + '), e anche una pausa vera renderebbe meno del solito: ' +
        'è il momento di ridurre quello che si chiede, non di aumentare quello che si tenta.');
    }
    if (s.cooldown > 0) {
      /* il raffreddamento cala di uno a ogni gesto: la sua unita' di misura
         sono i gesti, e si scrive */
      /* «raffreddamento» e' un termine del modello: la seconda frase e' la
         sua definizione, e la dice come definizione («È il tempo in cui…»),
         non come una conseguenza («Fino ad allora…») che lasciava la parola
         senza spiegazione. Fra parentesi dentro la prima frase il Gulpease
         crollava a 57: misurato. */
      pezzi.push('C’è anche un raffreddamento in corso, e dura ancora ' +
        plurale(s.cooldown, 'gesto', 'gesti', 'un') + ': è il tempo in cui il sistema non ' +
        'regge un altro tentativo dello stesso tipo.');
    }
    if (s.floor1_attivo) {
      /* «sta impedendo» era il progressivo inglese: il modello impedisce */
      pezzi.push('⚠️ Il «pavimento» di protezione è attivo, cioè la difesa che il modello accende da solo quando il carico è salito troppo. Da lì in poi il riposo rende circa la metà' + perchePavimento(s) +
        '. Il modello impedisce che le cose peggiorino oltre un certo punto, e non è ' +
        'una buona notizia: è un freno d’emergenza. Quello che si legge adesso è uno stato ' +
        'tenuto su dal modello, non lo stato che ci sarebbe senza.');
    }
    return { titolo: 'Quanto si torna indietro', chiave: 'rientro',
             testo: pezzi.filter(Boolean).join(' ') };
  }

  /* --------------------------------------------------------------------
     8 · GLI INCASTRI                          [guida 3.2 v6 § 19.2]
     «Gli edge case impediscono al modello di diventare semplicistico.»
     Casi in cui la lettura ovvia è quella sbagliata.
     -------------------------------------------------------------------- */
  function incastri(res, nodo) {
    var s = res.stato_dopo, sup = nodo.supporto || {}, ad = nodo.adattamento || {};
    var t = [];

    if (s.stress_str >= 70 && s.posizione_pos >= 55) {
      t.push('Il carico è alto, ma l’assetto regge: non è un caso sistemico, è un caso ' +
        'costoso, e la differenza conta, perché un assetto che tiene è quello che rende ' +
        'possibile il rientro.');
    }
    if (s.posizione_pos <= 35 && (sup.tipo === 'pratico' || sup.tipo === 'logistico' || sup.tipo === 'professionale')) {
      /* «sta funzionando» era il progressivo inglese: in italiano l'aiuto
         funziona, al presente */
      t.push('L’assetto è basso, ma il supporto è reale: l’aiuto funziona, e si vede. ' +
        'Quello che l’aiuto non fa è rimettere in piedi l’assetto, perché sono due cose ' +
        'diverse, e vedere la prima fa credere che sia a posto anche la seconda.');
    }
    if (s.debito_deb >= 2 && (s.rip === 'vera' || s.rip === 'piena')) {
      t.push('C’è un rientro vero, ma il debito è ancora aperto, perché recuperare non ' +
        'azzera il debito: il debito si chiude cambiando strada, non riposando.');
    }
    if (res.successo_prima_del_campo && (res.esito === 'successo_danneggiato' || res.esito === 'successo_tossico')) {
      t.push('Il compito è riuscito, ma il sistema sta peggio: guardare solo la consegna, ' +
        'qui, porta a ripetere proprio quello che ha fatto danno.');
    }
    if (!res.successo_prima_del_campo && s.stress_str < 40 && s.posizione_pos >= 55) {
      t.push('È un fallimento tecnico con un sistema sano: non c’è niente da correggere ' +
        'nella persona. Le condizioni non c’erano, e le condizioni si cambiano.');
    }
    if (ad.disponibilita === 'tardiva') {
      t.push('L’alternativa c’era, ma è arrivata tardi: è servita, ma non abbastanza, e la ' +
        'stessa mossa fatta prima avrebbe reso molto di più.');
    }
    if (nodo.campo && nodo.campo.attivo && nodo.campo.forza >= 50 && res.successo_prima_del_campo) {
      t.push('Il campo era duro, e il gesto è riuscito lo stesso, perché la competenza ha ' +
        'protetto: è un merito, ma non rende il campo più facile la prossima volta.');
    }
    return t.length ? { titolo: 'Una lettura che non è ovvia', righe: t } : null;
  }

  /* --------------------------------------------------------------------
     8bis · LE SCOGLIERE — dove sei rispetto alle quattro soglie misurate
     -------------------------------------------------------------------- */
  function scogliere(res) {
    var v = vicinanzaScogliere(res.stato_dopo);
    if (!v.oltre.length && !v.vicino.length) { return null; }
    var righe = [];
    /* DUE SOGLIE SI PASSANO IN DUE DIREZIONI OPPOSTE, E LA FRASE DEVE SAPERLO.
       Debito, carico e costo nascosto si passano salendo; l'assetto si passa
       SCENDENDO — la sua soglia e' un pavimento, non un tetto. E quando il
       valore tocca esattamente la soglia («il debito è a 1, oltre la soglia
       di 1» si smentisce da solo) si dice cosi'. */
    v.oltre.forEach(function (x) {
      var pari = (x.valore === x.sc.soglia);
      righe.push('**' + maiuscola(x.sc.nome) + ' è a ' + x.valore +
        (pari ? ', e la soglia scatta proprio a ' + x.sc.soglia
              : (x.sc.verso === 'sopra' ? ', oltre la soglia di ' : ', sotto la soglia di ') +
                x.sc.soglia) + '.** ' + x.sc.testo);
    });
    /* «mancano 1 punto» era un plurale davanti a un singolare; e sulle soglie
       che si passano scendendo «basta che scenda» si leggeva come un
       consiglio. Qui si dice quanto spazio resta, che non si puo' fraintendere.
       Il numero e la distanza stanno in due frasi: il grassetto le tiene
       insieme lo stesso. */
    v.vicino.forEach(function (x) {
      var uno = (x.mancano === 1);
      righe.push('**' + maiuscola(x.sc.nome) + ' è a ' + x.valore + ', e la soglia è ' +
        x.sc.soglia + '. ' + (x.sc.verso === 'sopra'
          ? (uno ? 'Ne manca uno solo' : 'Ne mancano ' + x.mancano)
          : (uno ? 'Basta un punto in meno per passarla'
                 : 'Bastano ' + inPunti(x.mancano) + ' in meno per passarla')) +
        '.** ' + x.sc.testo);
    });
    return {
      titolo: v.oltre.length ? 'Soglie superate' : 'Soglie vicine',
      righe: righe,
      /* QUANTE RIGHE PARLANO DI SOGLIE GIA' PASSATE: stanno sempre in testa,
         e la riduzione «soglie vicine» taglia da li' in giu' per posizione,
         senza leggere il testo — che puo' cambiare quanto vuole. */
      superate: v.oltre.length,
      /* «Queste quattro soglie» stava sotto una riga sola, e chi legge
         cercava le altre tre: le soglie del modello sono quattro, e qui se
         ne mostrano quelle passate o vicine. */
      nota: 'Le soglie del modello sono quattro, e sono state misurate, non scelte: ogni ' +
            'variabile è stata provata da un capo all’altro del suo intervallo. Sono i punti ' +
            'in cui cambia la qualità degli esiti, non la probabilità, e per questo non si ' +
            'vedono nel numero.'
    };
  }

  /* --------------------------------------------------------------------
     9 · L'AZIONE — poche mosse, praticabili
        In quasi-collasso: le priorità del § 20.2, e nient'altro.
     -------------------------------------------------------------------- */
  var PRIORITA_ROSSE = [
    'ridurre subito il carico: togliere, non organizzare meglio',
    'attivare un supporto reale, anche uno solo',
    'proteggere la sicurezza fisica e relazionale, se è in gioco',
    'interrompere ciò che si continua a riprovare senza risultato',
    'creare un rientro minimo, anche breve, ma vero',
    'rinviare tutto ciò che non è urgente oggi',
    'in questo stato, non prendere decisioni difficili da revocare'
  ];

  function azione(res, nodo, reg, leve) {
    if (reg.nome === 'minimo') {
      return {
        titolo: 'Le priorità, e basta',
        priorita: PRIORITA_ROSSE,
        /* «Queste sono le uniche cose che contano adesso:» con i due punti
           era una frase sola di diciannove parole. L'elenco arriva comunque
           sotto, e la frase puo' chiudersi da sola. */
        testo: 'In questo stato una strategia raffinata non serve, e non regge: le cose che ' +
               'contano adesso sono poche, e sono queste.',
        nota: 'Nessun consiglio elaborato, perché in quasi-collasso proporre una strategia ' +
              'complessa vuol dire proporre una cosa che non c’è.'
      };
    }
    if (!leve.leve.length) {
      return {
        titolo: 'Che cosa fare',
        testo: 'Non c’è niente di particolare da fare, perché le condizioni non chiedono un ' +
               'intervento. La cosa sensata è andare avanti, e riguardare la situazione ' +
               'se cambia.',
        priorita: []
      };
    }
    var prima = leve.leve[0];
    /* Questa sezione non ricopia la prima leva: sta due righe sopra, per
       esteso. Il suo compito e' dire COME SI FA a provarla — una sola — e
       come ci si accorge se ha funzionato. */
    return {
      titolo: 'Che cosa fare',
      /* il nome della prima leva resta scritto qui perche' le riduzioni
         possano riscrivere questo testo dopo aver accorciato l'elenco:
         vedi testoAzioneLeve() e le riduzioni «terza leva» e «seconda leva». */
      leva_prima: prima.azione,
      testo: testoAzioneLeve(prima.azione, leve.leve.length),
      nota: '',
      priorita: []
    };
  }

  /* IL TESTO SI RISCRIVE DA QUI, CON IL NUMERO VERO DI LEVE.
     Si scrive PRIMA delle riduzioni, e «terza leva» e «seconda leva»
     accorciano l'elenco DOPO: se il conto restasse quello di partenza si
     leggerebbe «spostandone tre insieme» sotto un elenco di due. Le
     riduzioni richiamano questa funzione con il numero rimasto.
     E la persona e' l'impersonale, come in tutto il resto del referto: qui
     per quattro verbi si passava al «tu», e chi legge sente il cambio anche
     senza saperlo nominare. */
  function testoAzioneLeve(nomeLeva, quante) {
    /* «Meglio da sola» era un moncone senza verbo; «restituisce di più» era
       «returns the most» (una leva, in italiano, RENDE); «E una sola davvero,
       non è pignoleria» non era una frase. Riscritte come si direbbero. */
    if (quante <= 1) {
      /* «una cosa sola da provare» e «cambiare una cosa sola»: «cosa» come
         tappabuchi, due volte nella stessa sezione. Quella da provare e' una
         mossa. */
      return 'La mossa da provare è una sola, **' + nomeLeva + '**, e da sola, non insieme ' +
        'ad altre. Domani si guarda che cosa è cambiato: è l’unico modo per sapere se è ' +
        'servita davvero.';
    }
    var aParole = (quante === 2 ? 'due' : 'tre');
    return 'Se c’è spazio per una mossa sola, è questa: **' + nomeLeva + '**. È la ' +
      'prima dell’elenco qui sopra, perché su questo gesto è quella che rende di più.\n\n' +
      'Una sola, e non per pignoleria: se se ne spostano ' + aParole + ' insieme e domani ' +
      'va meglio, non si sa quale delle ' + aParole + ' abbia funzionato, e la volta dopo ' +
      'tocca rifarle tutte. Con una sola, invece, si sa.';
  }

  /* --------------------------------------------------------------------
     IL CALCOLO PER ESTESO — perché il racconto, da solo, non basta a
     rifare i conti a mano.

     Il racconto racconta: dice quali due o tre condizioni hanno pesato di
     più, non tutte. È una scelta voluta — un elenco di nove termini non si
     legge come una storia — ma ha un costo, ed è questo: chi vuole
     controllare il numero con carta e penna non trova, nel racconto, il
     punto di partenza (P0) né i termini che hanno pesato poco. Il libro
     vuole che si possa sempre risalire da un numero al calcolo che lo ha
     prodotto; il racconto da solo non lo garantisce.
     Questo pezzo sta FUORI da `sezioni`: `conta()` non lo legge, quindi non
     consuma budget di parole e non viene mai accorciato. È un'appendice,
     non narrazione — la vista la mostra chiusa per difetto, come già fa con
     «che cosa è stato tolto». */
  var NOME_TERMINE = [
    { k: 'P0', nome: 'Il punto di partenza' },
    { k: 'E', nome: 'Il corpo' },
    { k: 'I', nome: 'La chiarezza' },
    { k: 'T', nome: 'Il tempo' },
    { k: 'M', nome: 'L’ambiente' },
    { k: 'BP', nome: 'La protezione' },
    { k: 'C', nome: 'I pezzi da coordinare' },
    { k: 'piSTR', nome: 'Il carico accumulato' },
    { k: 'DEB', nome: 'Il debito da insistenza' }
  ];
  function calcoloPerEsteso(res) {
    var t = res.termini;
    if (!t) { return null; }
    var voci = [];
    NOME_TERMINE.forEach(function (r) {
      if (t[r.k] === undefined) { return; }
      voci.push({ chiave: r.k, nome: r.nome, valore: t[r.k] });
    });
    var grezzo = res.pn_grezzo_prima_del_clamp;
    var clampato = (grezzo !== res.pn);
    return {
      titolo: 'Il calcolo per esteso',
      voci: voci,
      /* righe già scritte per la vista: «Nome: +N» / «Nome: −N», con il
         segno vero e non il trattino — le stesse regole di conSegno() */
      righe: voci.map(function (v) {
        return v.nome + ': ' + (v.chiave === 'P0' ? v.valore : conSegno(v.valore));
      }),
      grezzo: grezzo,
      pn: res.pn,
      clampato: clampato,
      tiro: res.tiro,
      /* il segno meno vero anche qui, come nelle righe: «−10», non «-10» */
      nota: 'La somma di queste voci è ' + String(grezzo).replace('-', '−') + '.' +
        (clampato
          ? ' Il modello non fa mai uscire una probabilità sotto ' + CFG.probabilitaMinima +
            ' o sopra ' + CFG.probabilitaMassima + '. Qui l’ha riportata dentro quel confine, ' +
            'e il numero confrontato col dado è ' + res.pn + '.'
          : '') +
        ' Il dado ha dato ' + res.tiro + '. Per riuscire doveva restare sotto ' + res.pn + '.'
    };
  }

  /* --------------------------------------------------------------------
     IL RACCONTO COMPLETO
     -------------------------------------------------------------------- */
  function componiRacconto(res, nodo, opzioni) {
    opzioni = opzioni || {};
    nodo = nodo || {};
    var reg = registro(res);
    var vuole = function (s) { return reg.sezioni.indexOf(s) >= 0; };

    var pesate = levePesate(res, reg.max_leve);
    var disponibili = leveDisponibili(res, nodo, reg.nome === 'minimo' ? 0 : reg.max_leve);

    var sezioni = [];
    if (vuole('esito'))    { sezioni.push(esito(res)); }
    if (vuole('qualita'))  { sezioni.push(qualita(res)); }
    if (vuole('costo'))    { sezioni.push(costo(res, reg)); }
    if (vuole('leve'))     { sezioni.push(pesate); }
    if (vuole('rientro'))  { sezioni.push(rientro(res)); }
    /* supporto() puo' non avere niente da dire, e allora restituisce niente:
       si aggiunge solo se c'e' davvero una sezione. */
    if (vuole('supporto')) {
      var sup = supporto(res, nodo);
      if (sup) { sezioni.push(sup); }
    }

    var inc = (reg.nome === 'completo') ? incastri(res, nodo) : null;
    var sco = (reg.nome === 'minimo') ? null : scogliere(res);
    var az = azione(res, nodo, reg, disponibili);

    var racconto = {
      registro: reg,
      sezioni: sezioni,
      leve_disponibili: (reg.nome === 'minimo') ? null : disponibili,
      scogliere: sco,
      incastri: inc,
      azione: az,
      /* fuori dal budget apposta: vedi calcoloPerEsteso() */
      calcolo: calcoloPerEsteso(res),
      /* la sintesi in una riga, per chi legge solo quella */
      sintesi: sintesi(res)
    };

    racconto.parole_prima = conta(racconto);
    racconto.tagliato = rispettaIlBudget(racconto, reg.budget_parole);
    racconto.parole = conta(racconto);
    racconto.incomprimibile = racconto.parole > reg.budget_parole;
    return racconto;
  }

  /* LA RIGA CHE LEGGE CHI NE LEGGE UNA SOLA — E NON ERA UNA FRASE.
     Diceva «Non riuscito — tecnico, con 5 punti di carico in più. Carico a 16,
     assetto a 52.»: due pezzi, e nessuno dei due con un verbo. La vista la
     mette in cima al referto, dentro un paragrafo, come prima cosa da leggere:
     e' prosa, non un'etichetta di stato, e va scritta come prosa. Costa sei
     parole ed e' la riga piu' letta di tutte.

     E DOPO ERA UNA FRASE, MA CON TRE SOGGETTI DENTRO.
     «Il gesto non è riuscito: l'esito è «tecnico», e sono 5 punti di carico in
     più. Il carico chiude a 79, l'assetto a 41.» Chi la legge cambia soggetto
     tre volte in dodici parole — il gesto, poi l'esito, poi «sono», che e' un
     plurale senza padrone e si riferisce ai punti. In mezzo, «carico» scritto
     due volte a cinque parole di distanza. E quando i punti erano uno solo la
     riga diceva «sono 1 punto»: un verbo plurale davanti a un numero
     singolare, proprio nel caso piu' comune di tutti.

     Adesso sono due frasi, e ognuna ha un soggetto solo: la prima dice com'e'
     andata e come il modello la chiama, la seconda dice che cosa e' costata.
     La seconda frase e' una frase a se' apposta: quanto e' costato e' la cosa
     che questo simulatore esiste per dire, e non si attacca in coda a un'altra
     con una «e». La riga e' anche piu' corta di prima di una parola, il che
     conta: nel registro «minimo» lo spazio e' 190 parole e viene consumato
     tutto. */
  function sintesi(res) {
    var q = QUALITA[res.esito] || { etichetta: res.esito };
    var verso = res.successo_prima_del_campo ? 'Il gesto è riuscito' : 'Il gesto non è riuscito';
    /* Un soggetto solo, il carico, e il verbo che si accorda a lui e non al
       numero dei punti: cosi' «1 punto» e «5 punti» stanno bene tutti e due. */
    var costoBreve = (res.delta.STR > 0)
      ? 'Il carico è salito di ' + inPunti(res.delta.STR)
      : (res.delta.STR < 0
          ? 'Il carico è sceso di ' + inPunti(Math.abs(res.delta.STR))
          : 'Il carico non si è mosso');
    /* tre frasi, tre soggetti chiari: il gesto, il carico, l'assetto */
    return verso + ', e il modello lo chiama «' + q.etichetta + '». ' +
      costoBreve + (res.delta.STR === 0 ? ' e resta a ' : ' e chiude a ') +
      res.stato_dopo.stress_str + ', l’assetto è a ' + res.stato_dopo.posizione_pos + '.';
  }

  function elenco(voci) {
    if (voci.length === 1) { return voci[0]; }
    if (voci.length === 2) { return voci[0] + ' e ' + voci[1]; }
    return voci.slice(0, -1).join(', ') + ' e ' + voci[voci.length - 1];
  }

  /* =====================================================================
     IL RACCONTO DELLA CATENA

     Un gesto solo si racconta con «com'è andata». Una sequenza no: quello
     che conta non e' come e' andato il settimo gesto, ma dove la giornata
     ha cambiato pendenza. Il libro lo dice a modo suo: «le persone non
     ricordano le giornate come tabelle, le ricordano come storie» -- e una
     storia ha un prima, uno snodo e un dopo.

     Le stesse regole del racconto singolo valgono qui: struttura
     obbligatoria, sette divieti, e piu' il sistema e' compromesso piu' il
     racconto si accorcia.
     ===================================================================== */

  function registroCatena(esitoCatena) {
    var f = esitoCatena.stato_finale;
    var rischioRosso = eRischioRosso(esitoCatena.rischio);
    if (esitoCatena.esito === 'quasi_collasso' || (rischioRosso && f.stress_str >= 85)) {
      return { nome: 'minimo', budget_parole: 200,
        motivo: 'Alla fine di questa sequenza il sistema è troppo compromesso, e un racconto ' +
                'lungo non servirebbe.' };
    }
    if (rischioRosso || f.stress_str >= 70 || f.posizione_pos <= 25) {
      return { nome: 'breve', budget_parole: 300,
        motivo: 'La sequenza si chiude in condizioni strette: poche cose, e concrete.' };
    }
    return { nome: 'completo', budget_parole: 560, motivo: '' };
  }

  /* Dove la giornata cambia pendenza: non tutti i nodi contano uguale.

     ATTENZIONE A QUALE STATO SI LEGGE.
     Con la calibrazione 3.2 ogni nodo ha due «dopo»: `stato_dopo` e' l'effetto
     pieno, quello che ci sarebbe se il micronodo trasferisse tutto; ma quello
     che passa davvero al gesto successivo e' `stato_persistente`, il 4,6 %.
     Leggere `stato_dopo` faceva dire «al gesto 1 il carico ha superato 40» su
     una sequenza il cui carico, dall'inizio alla fine, non si e' mosso di un
     punto. Uno snodo che non e' successo e' peggio di nessuno snodo. */
  function statoDopoReale(n) {
    return n.stato_persistente || n.stato_dopo;
  }

  /* «il 1» non e' italiano, e «1 gesti» nemmeno. */
  var ORDINALI = ['primo', 'secondo', 'terzo', 'quarto', 'quinto', 'sesto',
                  'settimo', 'ottavo', 'nono', 'decimo', 'undicesimo', 'dodicesimo',
                  'tredicesimo', 'quattordicesimo', 'quindicesimo', 'sedicesimo',
                  'diciassettesimo', 'diciottesimo', 'diciannovesimo', 'ventesimo'];
  function ordinale(i) {
    return ORDINALI[i] || ('numero ' + (i + 1));
  }

  /* PERCHE' NON BASTA ATTACCARE L'ARTICOLO DAVANTI ALL'ORDINALE.

     Due cose andavano storte insieme, e si vedevano a schermo.

     La prima: «Al ottavo gesto». Davanti a vocale l'articolo si elide, e si
     dice «All'ottavo». Vale per ottavo, undicesimo, diciassettesimo,
     diciottesimo, diciannovesimo.

     La seconda: gli ordinali si fermavano a «decimo», e dall'undicesimo in
     poi la funzione restituiva «numero 11». Attaccandoci l'articolo veniva
     fuori «Al numero 12 gesto», che non e' una frase italiana. Da qui in
     avanti gli ordinali arrivano al ventesimo, e oltre il ventesimo si cambia
     costruzione: «Al gesto numero 21», che si legge bene ed e' onesta.

     Le tre funzioni si somigliano ma reggono preposizioni diverse — al, il,
     sul — e in italiano ognuna elide a modo suo. */
  function conArticolo(i) {
    var o = ordinale(i);
    return (/^[aeiou]/i.test(o) ? 'l’' : 'il ') + o;
  }
  /* E LA STESSA COSA AL FEMMINILE, PERCHE' LE SETTIMANE SONO FEMMINILI.
     Gli ordinali qui sopra stanno tutti al maschile, perche' nati per i gesti;
     sulla traiettoria pero' si contano settimane, e «il terzo» al posto di «la
     terza» e' l'errore che si sente subito. In italiano l'ordinale si accorda,
     e l'articolo elide davanti a vocale: «la terza», ma «l'ottava».
     Prende il numero della settimana come lo scrive il motore, cioe' a
     partire da uno. */
  function laEnnesima(n) {
    var o = ORDINALI[n - 1];
    if (!o) { return 'la settimana numero ' + n; }
    o = o.replace(/o$/, 'a');
    return (/^[aeiou]/i.test(o) ? 'l’' : 'la ') + o;
  }
  function aGesto(i) {
    var o = ORDINALI[i];
    if (!o) { return 'Al gesto numero ' + (i + 1); }
    return (/^[aeiou]/i.test(o) ? 'All’' : 'Al ') + o + ' gesto';
  }
  function ilGesto(i) {
    var o = ORDINALI[i];
    if (!o) { return 'il gesto numero ' + (i + 1); }
    return (/^[aeiou]/i.test(o) ? 'l’' : 'il ') + o + ' gesto';
  }
  function suGesto(i) {
    var o = ORDINALI[i];
    if (!o) { return 'Sul gesto numero ' + (i + 1); }
    return (/^[aeiou]/i.test(o) ? 'Sull’' : 'Sul ') + o + ' gesto';
  }
  function maiuscola(t) { return t.charAt(0).toUpperCase() + t.slice(1); }
  function minuscola(t) { return t.charAt(0).toLowerCase() + t.slice(1); }
  /* QUANDO IL NUMERO E' UNO, IN ITALIANO SPESSO SI SCRIVE LA PAROLA.
     «La settimana è lunga 1 giorno», «La traiettoria copre 1 settimana»,
     «C'è un raffreddamento in corso, e dura ancora 1 gesto»: la cifra sola,
     dentro una frase, si legge come un dato di tabella finito per sbaglio in
     mezzo alla prosa. Nelle righe telegrafiche di sintesi — «1 gesto · carico
     64 → 64» — la cifra invece e' giusta, perche' quelle sono colonne.
     Percio' non e' un automatismo ma una scelta, e si dichiara: chi vuole la
     parola passa l'articolo giusto come quarto argomento.
     ⚠️ lingua.js ha gia' esattamente questa funzione, con la stessa firma.
     Non la si chiama da qui: diciassette banchi in _test/ e otto in
     _taratura/ caricano racconto.js SENZA lingua.js, e una dipendenza nuova
     li spegnerebbe tutti in un colpo. La copia locale resta, e resta uguale
     all'originale apposta. */
  function plurale(n, singolare, plurale_, aParole) {
    if (n !== 1) { return n + ' ' + plurale_; }
    return (aParole || '1') + ' ' + singolare;
  }
  /* Si chiama inPunti e non punti perche' «punti» e' gia' il nome di una
     variabile piu' avanti in questo file: chiamarlo cosi' la coprirebbe, e il
     racconto della settimana smetterebbe di funzionare.

     DUE COSE LE FA DA SE', E PRIMA NO.
     La virgola dei decimali: la resa delle notti scriveva «0.1 punti a notte»,
     con il punto decimale dell'inglese, perche' passava il numero cosi' com'era
     e non da questa parte. E il singolare: «1 punti» usciva ogni volta che il
     valore era esattamente uno. Adesso chi scrive una frase con dei punti
     dentro non deve ricordarsi ne' dell'una ne' dell'altro. */
  function inPunti(n) {
    var v = Math.abs(n);
    return conVirgola(String(v)) + ' ' + (v === 1 ? 'punto' : 'punti');
  }
  /* In italiano i decimali si separano con la virgola: «0,33», non «0.33». */
  function conVirgola(x) { return String(x).replace('.', ','); }

  /* UN NUMERO SU CENTO NON È UN'IMMAGINE. UNA FRAZIONE DI VOLTE LO È.
     «43 su cento» è preciso e non si immagina: nessuno ha un'intuizione di
     che cosa voglia dire, a occhio. «Poco meno della metà delle volte» sì.
     Questa funzione traduce il numero in un punto di riferimento che si
     immagina — un decimo, un quarto, un terzo, la metà — e dice se il
     numero vero sta sopra, sotto o esattamente lì. Il numero esatto resta
     scritto accanto: questa frase lo spiega, non lo sostituisce.
     La metà ha una banda più larga delle altre (dal 43 al 57): è il punto
     di riferimento più naturale, e la lingua ha già le parole apposta
     («poco meno», «poco più») per i numeri vicini. Gli altri punti hanno
     una banda più stretta, e fuori da ogni banda si dice «circa». */
  /* «una volta su venti» c'e' perche' 5 e' il valore piu' frequente di tutti:
     e' il minimo a cui il modello taglia la probabilita', e senza questo punto
     di riferimento 5 usciva come «circa una volta su dieci» — il doppio del
     vero, proprio nei racconti piu' compromessi. */
  var FRAZIONI_NOTE = [
    { v: 5,  testo: 'una volta su venti' },
    { v: 10, testo: 'una volta su dieci' },
    { v: 20, testo: 'una volta su cinque' },
    { v: 25, testo: 'un quarto delle volte' },
    { v: 33, testo: 'un terzo delle volte' },
    { v: 40, testo: 'due volte su cinque' },
    { v: 60, testo: 'tre volte su cinque' },
    { v: 67, testo: 'due volte su tre' },
    { v: 75, testo: 'tre volte su quattro' },
    { v: 80, testo: 'quattro volte su cinque' },
    { v: 90, testo: 'nove volte su dieci' }
  ];
  function comeFrazione(pn) {
    var p = Math.max(0, Math.min(100, Math.round(Number(pn))));
    if (p <= 3) { return 'quasi mai'; }
    if (p >= 97) { return 'quasi sempre'; }
    if (p >= 43 && p <= 57) {
      if (p === 50) { return 'esattamente una volta su due'; }
      return (p < 50 ? 'poco meno della metà delle volte' : 'poco più della metà delle volte');
    }
    var meglio = FRAZIONI_NOTE[0], dist = Math.abs(p - meglio.v);
    FRAZIONI_NOTE.forEach(function (pt) {
      var d = Math.abs(p - pt.v);
      if (d < dist) { meglio = pt; dist = d; }
    });
    if (dist === 0) { return meglio.testo; }
    if (dist <= 4) { return (p < meglio.v ? 'poco meno di ' : 'poco più di ') + meglio.testo; }
    return 'circa ' + meglio.testo;
  }

  /* QUANDO SI GIOCANO PIÙ RIPETIZIONI DELLA STESSA SCENA, LE FRASI DI SERVIZIO
     NON DEVONO SEMBRARE UN MODULO PRECOMPILATO.
     Le nove definizioni degli esiti, le sei letture del rientro e simili
     restano fisse apposta: sono vocabolario condiviso col libro, e un
     vocabolario che cambia parole non insegna niente. Ma due o tre frasi di
     puro collegamento — non definizioni, solo il modo in cui una sezione si
     apre — si ripetevano identiche decine di volte in una singola sessione
     di ripetizioni, perché il tiro cambia e la frase di apertura no. Qui si
     sceglie fra un pugno di varianti equivalenti, con un numero che il nodo
     ha già: il tiro del dado. Stesso nodo e stesso tiro restituiscono sempre
     la stessa frase — non è casuale, è deterministico quanto il resto del
     racconto — ma tiri diversi, che è la ragione stessa per cui si ripete
     una giocata, adesso suonano anche un po' diversi. */
  function varia(res, lista) {
    var k = (res && typeof res.tiro === 'number') ? Math.abs(Math.round(res.tiro)) : 0;
    return lista[k % lista.length];
  }

  /* Un numero con il suo segno davanti, e il segno meno vero — «−12», non
     «-12»: il trattino della tastiera e' un trattino, e in mezzo alle cifre
     si legge come un tratto d'unione. */
  function conSegno(n) {
    return (n > 0 ? '+' + n : String(n).replace('-', '\u2212'));
  }

  /* L'ARCO DI UN LIVELLO — carico e assetto, da dove partono e dove arrivano.

     Serviva in tre punti — sequenza, settimana, traiettoria — ed era ricopiato
     tre volte, con lo stesso difetto in tutte e tre. Quando un valore non si
     muoveva usciva «Il carico è passato da 48 a 48 — è rimasto fermo,
     l'assetto da 50 a 50»: la frase si spezza a meta' e l'inciso si mangia il
     verbo della seconda voce. Qui ogni voce porta il suo verbo, e chi non si
     e' mosso lo dice in modo diretto invece che smentirsi da solo. */
  /* «Carico» e «assetto» si spiegano qui, la prima volta che compaiono nel
     racconto della sequenza, della settimana e della traiettoria — sempre
     come una frase corta in coda, non incastrata dentro la frase dei numeri:
     misurato, incastrarla la' dentro fa crollare il Gulpease di quella riga
     di venti punti buoni, perche' unisce due informazioni dense (i numeri e
     la definizione) in una frase sola invece di due. `conGlossa` e' falso nei
     registri piu' compressi, dove la sezione non si puo' togliere e lo
     spazio in piu' farebbe sforare il budget senza rimedio. */
  var SPIEGA_CARICO_ASSETTO = ' Il carico è la pressione accumulata nei giorni prima, e ' +
    'l’assetto è quanto ci si sente al proprio posto, non l’umore del momento.';
  function arcoCaricoAssetto(daStr, aStr, daPos, aPos, conGlossa) {
    var glossa = conGlossa ? SPIEGA_CARICO_ASSETTO : '';
    /* Quando non si e' mosso niente, «Il carico è rimasto fermo a 35,
       l'assetto è rimasto fermo a 58» dice due volte la stessa cosa in una
       riga sola. Se sono fermi tutti e due si dice una volta per tutti e due,
       ed e' anche l'informazione vera: la sequenza non ha lasciato traccia. */
    if (daStr === aStr && daPos === aPos) {
      return 'Né il carico né l’assetto si sono mossi. Il carico resta a ' + daStr +
             ', l’assetto a ' + daPos + '.' + glossa;
    }
    /* «Il carico è passato da 25 a 42 (+17), l'assetto È PASSATO da 65 a 62
       (−3)»: lo stesso verbo due volte in una riga, e la seconda volta e' gia'
       sottinteso. In italiano nel secondo membro di un'enumerazione il verbo si
       lascia cadere — «il carico è passato da 25 a 42, l'assetto da 65 a 62» —
       e la frase diventa una frase invece di due colonne.
       Il verbo si ripete solo quando i due membri ne vogliono uno diverso, cioe'
       quando uno si e' mosso e l'altro no: li' il sottinteso mentirebbe. E' lo
       stesso motivo per cui il verbo era stato messo due volte, applicato dove
       serve davvero. */
    var mossoStr = (daStr !== aStr), mossoPos = (daPos !== aPos);
    var c = 'Il carico ' + (mossoStr
      ? 'è passato da ' + daStr + ' a ' + aStr + ' (' + conSegno(aStr - daStr) + ')'
      : 'è rimasto fermo a ' + daStr);
    var p = 'l’assetto ' + (mossoPos
      ? (mossoStr ? '' : 'è passato ') + 'da ' + daPos + ' a ' + aPos +
        ' (' + conSegno(aPos - daPos) + ')'
      : 'è rimasto fermo a ' + daPos);
    return c + ', ' + p + '.' + glossa;
  }

  function snodi(nodi) {
    var trovati = [];
    for (var i = 0; i < nodi.length; i++) {
      var n = nodi[i];
      var prima = n.stato_prima, dopo = statoDopoReale(n);

      /* il salto di carico piu' grosso della catena lo troviamo dopo */
      if (dopo.costo_nascosto >= 50 && prima.costo_nascosto < 50) {
        trovati.push({ i: i, peso: 100, tipo: 'soglia_costo', nodo: n,
          testo: aGesto(i) + ' («' + n.descrizione + '») il costo nascosto ha superato 50, ' +
                 'e da lì in poi anche i successi vengono letti come danneggiati: è il punto ' +
                 'in cui la giornata ha cambiato natura, non intensità.' });
      }
      if (dopo.floor1_attivo && !prima.floor1_attivo) {
        trovati.push({ i: i, peso: 95, tipo: 'pavimento', nodo: n,
          testo: aGesto(i) + ' («' + n.descrizione + '») si è acceso il «pavimento» di ' +
                 'protezione, cioè la difesa che il modello accende da solo quando il carico è salito troppo. Da lì in poi il riposo rende circa la metà. Il modello smette di lasciar peggiorare le cose: è un freno ' +
                 'd’emergenza, non un miglioramento.' });
      }
      if (dopo.debito_deb > prima.debito_deb) {
        trovati.push({ i: i, peso: 70, tipo: 'debito', nodo: n,
          testo: aGesto(i) + ' («' + n.descrizione + '») è cresciuto il debito: qualcosa è ' +
                 'stato riprovato uguale, senza cambiare strada.' });
      }
      if (n.esito === 'successo_tossico' || n.esito === 'successo_danneggiato') {
        trovati.push({ i: i, peso: 80, tipo: 'successo_costoso', nodo: n,
          testo: maiuscola(ilGesto(i)) + ' («' + n.descrizione + '») è riuscito, e ha fatto ' +
                 'danno: nella sequenza è quello da guardare due volte, perché conta come ' +
                 'riuscito, ma ha lasciato il sistema peggio di come l’ha trovato.' });
      }
      if (n.esito === 'quasi_collasso') {
        trovati.push({ i: i, peso: 110, tipo: 'collasso', nodo: n,
          testo: aGesto(i) + ' («' + n.descrizione + '») la sequenza è arrivata al ' +
                 'quasi-collasso, e tutto quello che viene dopo va letto alla luce di questo.' });
      }
      if (prima.stress_str < 40 && dopo.stress_str >= 40) {
        trovati.push({ i: i, peso: 60, tipo: 'soglia_str', nodo: n,
          testo: aGesto(i) + ' il carico ha superato 40, e da qui in poi comincia a togliere ' +
                 'punti a tutto il resto, mentre prima si accumulava senza farsi sentire.' });
      }
    }
    /* Una soglia si attraversa una volta: se lo stesso tipo di snodo ricorre,
       conta la prima volta. Ripeterlo tre volte non aggiunge niente e riempie
       lo spazio che serve alle cose che il lettore non sa ancora. */
    var visti = {}, unici = [];
    trovati.sort(function (a, b) { return a.i - b.i; });
    for (var k = 0; k < trovati.length; k++) {
      if (visti[trovati[k].tipo]) { continue; }
      visti[trovati[k].tipo] = true;
      unici.push(trovati[k]);
    }
    unici.sort(function (a, b) { return b.peso - a.peso || a.i - b.i; });
    return unici;
  }

  /* Il gesto piu' caro della sequenza, e quello che ha retto meglio. */
  function estremi(nodi) {
    var peggio = null, meglio = null;
    for (var i = 0; i < nodi.length; i++) {
      var d = nodi[i].delta || {};
      var costo = (d.STR || 0) - (d.POS || 0) + 3 * (d.DEB || 0);
      if (!peggio || costo > peggio.costo) { peggio = { i: i, costo: costo, n: nodi[i] }; }
      if (!meglio || costo < meglio.costo) { meglio = { i: i, costo: costo, n: nodi[i] }; }
    }
    return { peggio: peggio, meglio: meglio };
  }

  function componiRaccontoCatena(esitoCatena, opzioni) {
    opzioni = opzioni || {};
    var nodi = esitoCatena.nodi || [];
    var ini = esitoCatena.stato_iniziale, fin = esitoCatena.stato_finale;
    var reg = registroCatena(esitoCatena);
    var sezioni = [];

    /* --- 1 · l'arco: da dove parte, dove arriva --- */
    var dStr = fin.stress_str - ini.stress_str;
    /* +3 partendo da 72 non e' come +3 partendo da 20: quello che conta e'
       quanto spazio e' stato consumato di quello che restava. */
    var spazio = Math.max(1, 100 - ini.stress_str);
    var quota = dStr / spazio;
    var verso = (quota > 0.15 || dStr > 12) ? 'in salita'
              : (quota > 0.04 ? 'in leggera salita'
              : (dStr < -5 ? 'in discesa' : 'in piano'));
    /* Con un gesto solo non c'e' un andamento fra un punto e se stesso; e
       quando niente si e' mosso la pendenza non riassume niente che il
       lettore non abbia appena letto nella riga prima. */
    var fermo = (ini.stress_str === fin.stress_str && ini.posizione_pos === fin.posizione_pos);
    sezioni.push({
      titolo: 'Come è andata la sequenza',
      testo: 'La sequenza contiene ' + plurale(nodi.length, 'gesto', 'gesti', 'un') +
        (nodi.length === 1 ? ' solo. ' : '. ') +
        arcoCaricoAssetto(ini.stress_str, fin.stress_str, ini.posizione_pos, fin.posizione_pos,
                          reg.nome !== 'minimo') +
        (nodi.length > 1 && !fermo ? ' Nel complesso è ' + verso + '.' : '') +
        (fin.debito_deb > ini.debito_deb
          ? ' Il debito è cresciuto di ' + inPunti(fin.debito_deb - ini.debito_deb) +
            ': da qualche parte si è insistito senza cambiare strada.' : '')
    });

    /* --- 2 · come sono finiti i gesti --- */
    if (reg.nome !== 'minimo') {
      var c = esitoCatena.conteggi || {};
      var voci = Object.keys(c).sort(function (a, b) { return c[b] - c[a]; });
      var riusciti = voci.filter(function (k) { return k.indexOf('successo') === 0; })
        .reduce(function (a, k) { return a + c[k]; }, 0);
      var costosi = (c.successo_danneggiato || 0) + (c.successo_tossico || 0) +
                    (c.successo_tecnico_fallimento_umano || 0);
      /* «nessuno degli 3 gesti»: l'articolo davanti a una cifra non regge.
         Con un gesto solo il confronto non ha senso: si dice com'e' andato.
         E con un successo solo «quei successi» sarebbe un plurale senza
         padrone: si accorda. */
      var uno = (nodi.length === 1);
      var t = (riusciti === 0
                 ? (uno ? 'L’unico gesto della sequenza non è riuscito.'
                        : 'Su ' + nodi.length + ' gesti non ne è riuscito nessuno.')
             : riusciti === 1
                 ? (uno ? 'L’unico gesto della sequenza è riuscito.'
                        : 'Un gesto solo su ' + nodi.length + ' è riuscito.')
                 : riusciti + ' gesti su ' + nodi.length + ' sono riusciti.');
      if (costosi > 0) {
        t += ' ' + (riusciti === 1
          ? 'Ma quel successo ha lasciato un danno. Contarlo solo come riuscito'
          : costosi === 1
            ? 'Ma uno di quei successi ha lasciato un danno. Contarlo solo come riuscito'
            : 'Ma ' + costosi + ' di quei successi hanno lasciato un danno. Contarli solo ' +
              'come riusciti') +
          ' sarebbe il modo più veloce di ripetere quello che è costato.';
      } else if (riusciti === nodi.length) {
        t += uno
          ? ' E non ha lasciato danni. Vale la pena notare in che condizioni è successo.'
          : ' Nessuno ha lasciato danni: è la sequenza che si vorrebbe, e vale la pena ' +
            'notare in che condizioni è avvenuta.';
      } else if (riusciti > 0) {
        /* il conto non si commenta da solo: una cifra nuda sotto un titolo
           e' il report binario che il § 18.3 vieta */
        t += (riusciti === 1
          ? ' E quel successo non ha lasciato danni:'
          : ' E nessuno di quei successi ha lasciato danni:') +
          ' è l’altra metà del conto, quella che la cifra da sola non dice.';
      }
      sezioni.push({ titolo: 'Come sono finiti i gesti', testo: t });
    }

    /* --- 3 · gli snodi --- */
    var sn = snodi(nodi);
    var maxSnodi = reg.nome === 'minimo' ? 1 : (reg.nome === 'breve' ? 2 : 3);
    var snodiScelti = sn.slice(0, maxSnodi);

    /* --- 4 · il gesto più caro --- */
    if (reg.nome === 'completo' && nodi.length > 2) {
      var e = estremi(nodi);
      if (e.peggio && e.peggio.costo > 0) {
        var pezzi = ['Il gesto che è costato di più è ' + conArticolo(e.peggio.i) + ': «' +
          e.peggio.n.descrizione + '».'];
        var recuperato = !!(e.meglio && e.meglio.costo < 0);
        if (recuperato) {
          /* «invece» lega le due righe: la seconda e' il rovescio della
             prima, non un altro argomento. Era «Dall'altra parte», cioe' «on
             the other hand» con parole italiane. */
          pezzi.push('Quello che invece ha restituito qualcosa è ' +
            conArticolo(e.meglio.i) + ': «' + e.meglio.n.descrizione + '». Guardare che ' +
            'cosa avevano di diverso dice più di qualunque media.');
        }
        /* DUE PUSH E NON UN TITOLO CALCOLATO: il controllo «ogni chiave che
           cerca una sezione trova un titolo che esiste davvero» legge i
           titoli dal sorgente cercando `titolo:` seguito da una stringa, e un
           titolo scritto come condizione ? 'a' : 'b' gli sarebbe invisibile.
           La riduzione «dove si è speso» cerca «Dove si è speso», che e' il
           principio di tutti e due i titoli. */
        if (recuperato) {
          sezioni.push({ titolo: 'Dove si è speso, e dove si è recuperato', testo: pezzi.join(' ') });
        } else {
          sezioni.push({ titolo: 'Dove si è speso', testo: pezzi.join(' ') });
        }
      }
    }

    /* --- 5 · il modello sta ancora dicendo qualcosa? --- */
    var sat = esitoCatena.saturazione;
    if (sat && !sat.informativo && reg.nome !== 'minimo') {
      /* gli avvisi arrivano da microsemantica.js e non si riscrivono da qui:
         si mettono in una frase loro, con la maiuscola e il punto, invece
         di appenderli dopo due punti a una frase gia' lunga */
      var avvisi = (sat.avvisi && sat.avvisi.length) ? sat.avvisi.join(' ').trim() : '';
      if (avvisi && !/[.!?…]$/.test(avvisi)) { avvisi += '.'; }
      sezioni.push({
        titolo: 'Attenzione a come si legge',
        testo: 'Lungo questa sequenza il modello è arrivato al limite di quello che sa ' +
          'distinguere. ' + (avvisi ? maiuscola(avvisi) + ' ' : '') +
          'Da quel punto in avanti i numeri sono ancora corretti, ma non aggiungono ' +
          'informazione: dicono che si è al limite, non quanto.'
      });
    }

    /* --- 6 · che cosa fare --- */
    var az;
    if (reg.nome === 'minimo') {
      az = {
        titolo: 'Le priorità, e basta',
        testo: 'La sequenza si chiude in uno stato in cui una strategia non regge: le cose ' +
               'che contano adesso sono poche, e sono queste.',
        priorita: PRIORITA_ROSSE
      };
    } else {
      /* la leva si sceglie sul nodo peggiore: e' li' che c'e' qualcosa da spostare */
      var e2 = estremi(nodi);
      var bersaglio = (e2.peggio && e2.peggio.n) || nodi[nodi.length - 1];
      var leve = bersaglio ? leveDisponibili(bersaglio, bersaglio, 1) : { leve: [] };
      /* con un gesto solo non c'e' un «dove»: il gesto e' quello, e non ce
         n'e' un altro da preferirgli */
      var unGestoSolo = (nodi.length === 1);
      if (leve.leve.length) {
        var l = leve.leve[0];
        az = {
          titolo: 'Che cosa fare',
          /* LA SEZIONE DICHIARA I SUOI PEZZI: la testa (dove, e che cosa) e
             il perche' della leva. La riduzione «motivazione della leva» mette
             al posto del perche' la versione breve scritta a mano e rimonta
             il testo con montaAzioneCatena(). Prima cercava la parola «Perché»
             dentro il testo con un'espressione regolare, cioe' leggeva le
             parole a schermo — il modo in cui in questo file le riduzioni
             muoiono in silenzio. suGesto() porta gia' la preposizione con
             l'articolo («Sul», «Sull’»), perche' l'elisione dipende dalla
             parola che segue. */
          pezzi: {
            testa: (unGestoSolo
                     ? 'Su questo gesto la mossa da provare è questa: **'
                     : 'La sequenza non si cambia dappertutto: si cambia dove si è speso di ' +
                       'più. ' + suGesto(e2.peggio ? e2.peggio.i : nodi.length - 1) +
                       ' la mossa da provare è questa: **') + l.azione + '**.',
            perche: maiuscola(l.perche),
            perche_breve: l.perche_breve ? maiuscola(l.perche_breve) : ''
          },
          testo: '',
          priorita: [],
          /* impersonale, come tutto il resto: «Cambiane una sola» era l'unico
             imperativo alla seconda persona del racconto della sequenza */
          nota: unGestoSolo
            ? 'Una sola, però, perché spostandone due insieme, se la volta dopo va meglio, ' +
              'non si sa quale delle due abbia funzionato.'
            : 'Si cambia una leva sola, e su un solo gesto, perché cambiare tutto insieme ' +
              'rende impossibile capire che cosa ha funzionato.'
        };
        montaAzioneCatena(az);
      } else {
        az = {
          titolo: 'Che cosa fare',
          testo: 'Non c’è un punto evidente su cui intervenire, perché la sequenza ha retto ' +
                 'e nessun gesto è costato molto più degli altri.',
          priorita: []
        };
      }
    }

    var racconto = {
      registro: reg,
      catena: true,
      sezioni: sezioni,
      snodi: snodiScelti,
      leve_disponibili: null,
      incastri: null,
      azione: az,
      sintesi: plurale(nodi.length, 'gesto', 'gesti') + ' · carico ' + ini.stress_str + ' → ' + fin.stress_str +
        ' · assetto ' + ini.posizione_pos + ' → ' + fin.posizione_pos +
        ' · si chiude con «' + ((QUALITA[esitoCatena.esito] || {}).etichetta || esitoCatena.esito) + '».'
    };

    racconto.parole_prima = contaCatena(racconto);
    racconto.tagliato = riduciCatena(racconto, reg.budget_parole);
    racconto.parole = contaCatena(racconto);
    return racconto;
  }

  /* I pezzi della sezione finale della sequenza, rimessi in fila. */
  function montaAzioneCatena(az) {
    var p = az.pezzi;
    az.testo = p.testa + ' ' + p.perche;
  }

  function contaCatena(r) {
    var t = r.sintesi + ' ';
    r.sezioni.forEach(function (s) { t += s.titolo + ' ' + s.testo + ' '; });
    r.snodi.forEach(function (s) { t += s.testo + ' '; });
    t += r.azione.testo + ' ' + (r.azione.priorita || []).join(' ') + ' ' + (r.azione.nota || '');
    return t.split(/\s+/).filter(Boolean).length;
  }

  var RIDUZIONI_CATENA = [
    { nome: 'terzo snodo', fai: function (r) {
        if (r.snodi.length > 2) { r.snodi = r.snodi.slice(0, 2); return true; } return false; } },
    { nome: 'dove si è speso', fai: function (r) {
        return togliSezione(r, 'Dove si è speso'); } },
    { nome: 'nota sulla leva', fai: function (r) {
        if (r.azione.nota) { r.azione.nota = ''; return true; } return false; } },
    { nome: 'secondo snodo', fai: function (r) {
        if (r.snodi.length > 1) { r.snodi = r.snodi.slice(0, 1); return true; } return false; } },
    { nome: 'come sono finiti i gesti', fai: function (r) {
        return togliSezione(r, 'Come sono finiti'); } },
    { nome: 'motivazione della leva', fai: function (r) {
        /* per struttura, non leggendo il testo: la versione breve del perche'
           e' scritta a mano in LEVE[].breve, e il testo si rimonta */
        var p = r.azione.pezzi;
        if (!p || !p.perche_breve || p.perche === p.perche_breve) { return false; }
        p.perche = p.perche_breve;
        montaAzioneCatena(r.azione);
        return true; } },
    { nome: 'ultimo snodo', fai: function (r) {
        if (r.snodi.length) { r.snodi = []; return true; } return false; } }
  ];

  function riduciCatena(racconto, budget) {
    return applicaRiduzioni(racconto, budget, RIDUZIONI_CATENA, contaCatena, 30);
  }


  /* ======================================================================
     IL RACCONTO DELLA SETTIMANA                    [guida 3.2 v6, § 8.4-8.6]
     ======================================================================
     Il livello della settimana non racconta i gesti: a quel livello il gesto
     singolo non e' piu' la leva. Racconta tre cose che il giorno non puo'
     dire, perche' hanno bisogno di piu' giorni per esistere:

       1. l'accumulo    quanto carico resta in fondo, e non quanto se n'e' fatto
       2. il recupero   se la notte restituisce, e quanto
       3. il regime     in che modo di funzionare si sta stabilizzando

     E una quarta, che e' la piu' importante, e che tre misure successive
     hanno cambiato tre volte prima di stare in piedi.

     ======================================================================
     IL PUNTO DI NON RITORNO — la terza versione, e perche' le prime due
     erano sbagliate                        [`_taratura/non-ritorno.js`]
     ======================================================================

     PRIMA VERSIONE: «la soglia e' 85.»
     Sbagliata due volte. 85 e' il valore a cui pavimentoECooldown [py:1263]
     accende il pavimento di protezione: e' la soglia del PAVIMENTO, non il
     punto oltre il quale il sistema non torna. E il pavimento non ha una
     porta sola: si accende se STR >= 85 OPPURE POS <= 25 OPPURE
     costo_nascosto >= 70. Su 566 corse in cui si e' acceso, la prima porta
     e' stata STR nel 64 % dei casi e IL COSTO NASCOSTO NEL 35 %.

     SECONDA VERSIONE: «la soglia e' fra 54 e 80, dipende dal rientro.»
     Piu' vicina, ma misurata su un banco che non sapeva esprimere la cosa
     che dichiarava. RIP e' un ingresso della scena e prossimoRip [py:1182]
     lo consuma: un rientro dichiarato agiva UNA VOLTA SOLA, il primo nodo
     del primo giorno. «Un rientro vero una volta» e «un rientro vero tutti
     i giorni» sono due vite diverse, e il banco sapeva dire solo la prima.

     TERZA VERSIONE, quella misurata sul serio.
     Si parte da uno stato intero — carico, assetto, debito, COSTO NASCOSTO,
     pavimento, cooldown, ri4 — e si guarda se in quaranta giorni si esce.

       quota di uscita, condizioni MIGLIORI (giornate leggerissime,
       sonno ottimo, rientro vero ogni giorno):
                    STR 40   50   60   70   80
         costo  30   100  100  100    0    0
         costo  40   100  100   90    0    0
         costo  45    95   95    0    0    0
         costo  50     0    0    0    0    0

       condizioni MEDIE (giornate leggere, sonno normale, rientro debole):
         costo  40   100  100    0    0    0
         costo  45    75   75    0    0    0
         costo  50     0    0    0    0    0

     NON UNA SOGLIA MA UNA FRONTIERA, su due variabili.
       CARICO           50 in condizioni medie · 60 nelle migliori
       COSTO NASCOSTO   50, in ogni condizione misurata

     La differenza fra le due e' il punto. Le condizioni di recupero
     — giornate piu' leggere, sonno migliore, rientro vero ogni giorno —
     spostano la soglia del carico di dieci punti. Sulla soglia del costo
     non spostano NIENTE: a costo 50, quaranta giorni di giornate
     leggerissime con sonno ottimo e rientro vero ogni giorno, e non si
     esce lo stesso. E' l'unica delle due che non si puo' comprare.

     ED E' LA STESSA 50 delle quattro scogliere gia' misurate — trovata
     allora facendo variare il costo su un nodo singolo, ritrovata qui su
     quaranta giorni con un metodo che non ha niente a che vedere. Due
     misure indipendenti sullo stesso numero.

     UNA COSA CHE HO CREDUTO E CHE IL TEST HA SMENTITO.
     Guardando le mediane sembrava che il carico restasse fermo a 51 mentre
     il costo saliva da 42 a 52 e l'uscita si chiudeva: «il carico non dice
     niente, guarda il costo». Falso, e falso per il motivo di sempre — la
     mediana di una popolazione BIMODALE non descrive nessuno.
     Su 200 corse da trenta giorni: al giorno 10 un carico >= 60 predice il
     collasso nel 100 % dei casi, e un costo >= 55 pure. I due predicono
     ugualmente bene. Quello che e' vero e' un'altra cosa, e piu' semplice:

     IL MODELLO NON HA UN DECLINO GRADUALE. A trenta giorni il carico e' 52
     oppure 99, e non c'e' quasi niente in mezzo. Non si scivola: si sta, e
     poi si cade. Percentuale di corse gia' cadute: 0 % a 5 giorni, 5 % a 10,
     15 % a 15, 30 % a 20, 63 % a 30.

     Il costo nascosto resta importante per un'altra ragione, che il test
     conferma: e' l'unica soglia che nessuna condizione di recupero sposta,
     e nell'esito non si vede. Non perche' predica meglio.

     E LA COSA CHE TIRA FUORI NON E' QUELLA CHE SEMBRA.
     Da poco dentro (cinque giorni): alleggerire le giornate porta fuori
     nell'80 % dei casi. Un rientro vero SENZA alleggerire le giornate:
     0 %. Da piu' dentro (venti giorni): niente porta fuori in modo
     affidabile, nemmeno tutto insieme (33 %).
     Non e' che il rientro non serva: e' che da solo, e tardi, non basta.
     Quello che sposta l'esito e' togliere carico, e presto.
     ====================================================================== */

  /* LE DUE SOGLIE, misurate.
     Il costo non dipende dalle condizioni; il carico si'. */
  var SOGLIA_COSTO_NASCOSTO = CFG.sogliaCostoNascosto;
  var SOGLIA_CARICO_MEDIA = 50;
  var SOGLIA_CARICO_MIGLIORE = 60;

  /* la soglia peggiore del carico: quella che vale se non si sa come si recupera */
  var PUNTO_NON_RITORNO = SOGLIA_CARICO_MEDIA;

  /* la soglia a cui si accende il pavimento: un'altra cosa, e va detta come tale */
  var SOGLIA_PAVIMENTO = CAL.valore('porta_pavimento_carico');

  var PORTE_PAVIMENTO = [
    { variabile: 'STR', soglia: CAL.valore('porta_pavimento_carico'), verso: 'sopra', quota: 0.64 },
    { variabile: 'costo_nascosto', soglia: CAL.valore('porta_pavimento_costo'), verso: 'sopra', quota: 0.35 },
    { variabile: 'POS', soglia: CAL.valore('porta_pavimento_assetto'), verso: 'sotto', quota: 0.01 }
  ];

  /* La diagnosi: quale delle due soglie e' stata passata, e quale conta.
     Se sono state passate entrambe conta il costo, perche' e' quella che
     nessuna condizione di recupero sposta. */
  function diagnosiNonRitorno(stato) {
    var str = stato.stress_str, costo = stato.costo_nascosto;
    var oltreCosto = costo >= SOGLIA_COSTO_NASCOSTO;
    var oltreCarico = str >= SOGLIA_CARICO_MIGLIORE;
    var oltreCaricoMedio = str >= SOGLIA_CARICO_MEDIA;
    return {
      soglia_costo: SOGLIA_COSTO_NASCOSTO,
      soglia_carico: SOGLIA_CARICO_MEDIA,
      soglia_carico_migliore: SOGLIA_CARICO_MIGLIORE,
      costo: costo,
      carico: str,
      oltre_costo: oltreCosto,
      oltre_carico: oltreCarico,
      /* «superato» = nessuna condizione misurata porta fuori */
      superato: oltreCosto || oltreCarico,
      /* «stretto» = si esce solo con le condizioni migliori */
      solo_col_meglio: !oltreCosto && !oltreCarico && oltreCaricoMedio,
      quale: oltreCosto ? 'costo' : (oltreCarico ? 'carico' : null),
      distanza_costo: SOGLIA_COSTO_NASCOSTO - costo,
      distanza_carico: SOGLIA_CARICO_MIGLIORE - str,
      pavimento_attivo: !!stato.floor1_attivo
    };
  }

  /* Che cosa tira fuori, misurato ripartendo dallo stato intero.
     L'ordine e' quello dell'efficacia misurata, non quello dell'intuizione.

     NESSUNA VISTA LA LEGGE OGGI (verificato il 15/09/2026 con grep su tutto
     il progetto) — ma NON e' un campo morto da cancellare: il primo valore,
     0.80, e' proprio il numero che il libro cita in prosa al capitolo 14
     («alleggerire le giornate spegne il pavimento in dodici corse su
     quindici»: 12/15 = 0,80). Questi dati sono la prova che sta dietro
     quella frase. Resta esportato finche' qualcuno non decide di mostrarli
     da qualche parte (una scheda in IL-MODELLO, per esempio), o di
     spostarli in un banco di _taratura/ come documentazione pura. */
  var USCITA_MISURATA = [
    { quando: 'costo nascosto 42 (cinque giorni dentro)',
      righe: [
        { cosa: 'alleggerire le giornate',              esce: 0.80 },
        { cosa: 'alleggerire le giornate e dormire bene', esce: 0.80 },
        { cosa: 'dormire bene, e basta',                esce: 0.53 },
        { cosa: 'un rientro vero senza alleggerire',    esce: 0.00 },
        { cosa: 'continuare uguale',                    esce: 0.00 }
      ] },
    { quando: 'costo nascosto 52 (venti giorni dentro)',
      righe: [
        { cosa: 'tutto insieme: giornate, sonno, rientro', esce: 0.33 },
        { cosa: 'alleggerire le giornate',              esce: 0.33 },
        { cosa: 'dormire bene, e basta',                esce: 0.13 },
        { cosa: 'un rientro vero senza alleggerire',    esce: 0.00 }
      ] }
  ];

  /* I BUDGET DI PAROLE — misurati, non scelti
     1176 settimane su 7 durezze x 7 carichi x 4 assetti x 3 regimi di
     recupero x 2 semi, e contate le parole prodotte da ciascun registro:

       registro    non ridotto            dopo la catena di riduzione
       soglia      p50 370 · max 373      342 · max 343  (fondo irriducibile)
       stretto     p50 193 · max 193      193
       completo    p50 214 · p90 241      p90 170 · max 170

     PERCHE' QUI IL REGISTRO GRAVE E' IL PIU' LUNGO, ed e' l'unico livello
     in cui succede. Sul nodo e sulla catena, quando le cose vanno male c'e'
     meno da dire. Sulla settimana no: oltre la soglia il modello ha da dire
     la cosa piu' specifica che sappia dire — quale delle due soglie e' stata
     passata, e che cosa e' misurato tirare fuori e che cosa no. Quella cosa
     costa 310 parole. Si chiama `soglia` perche' dice UNA cosa sola, non
     perche' dica poco.

     Un budget sotto il fondo irriducibile non e' un budget severo: e' un
     budget finto, e verrebbe violato in silenzio a ogni settimana grave.
     Il primo tentativo dava 280: le sezioni che non si tagliano ne fanno piu'
     di trecento da sole.

     RIMISURATO IL 10/09/2026, la sera, sulle stesse 588 settimane e sul testo
     riscritto: il fondo di `soglia` e' sceso da 342 a 337, perche' la sezione
     delle priorita' ha smesso di ridire per la terza volta quello che le due
     sezioni sopra di lei avevano gia' detto. `completo` fa 180, `stretto`
     215. I tre tetti — 343, 240, 180 — restano quelli, e restano sopra il
     loro fondo. */
  function registroSettimana(sett) {
    var f = sett.stato_finale;
    var dn = diagnosiNonRitorno(f);
    /* il registro grave scatta quando una delle due soglie misurate e' passata,
       non su 85: a 85 il sistema e' bloccato da un pezzo */
    /* «Quale soglia è stata passata, e che cosa è misurato tirare fuori.»
       Non era una frase italiana: un participio passivo — «è misurato» —
       reggeva un infinito attivo — «tirare fuori» — e in mezzo non c'era
       niente che li tenesse insieme. Quello che voleva dire e' che le prove
       hanno misurato quali mosse portano fuori e quali no; e lo si dice
       dicendolo. La riga sta sotto gli occhi di chiunque superi la soglia:
       la vista la stampa in cima al racconto, per spiegare perche' quel
       racconto e' fatto cosi'. */
    if (dn.superato || sett.esito === 'quasi_collasso') {
      return { nome: 'soglia', budget_parole: 343,
        /* La vista apre con «Qui il racconto dice una cosa sola.» e chiude con
           «tutto lo spazio va a quella»: «una cosa sola» non si ridice qui in
           mezzo per la terza volta. */
        motivo: 'Oltre questo punto non serve un racconto lungo: serve sapere quale delle ' +
                'due soglie è stata passata, e con quali mosse, nelle prove, se ne esce ' +
                'davvero.' };
    }
    if (dn.solo_col_meglio || f.posizione_pos < 36) {
      return { nome: 'stretto', budget_parole: 240,
        motivo: 'La settimana si chiude con poco spazio di manovra: poche cose, e concrete.' };
    }
    return { nome: 'completo', budget_parole: 180, motivo: '' };
  }

  /* quanto restituisce la notte, misurato sulle notti di QUESTA settimana */
  function resaDelleNotti(sett) {
    var notti = sett.notti || [];
    if (!notti.length) { return null; }
    var tot = 0, quante = 0;
    for (var i = 0; i < notti.length; i++) {
      var n = notti[i];
      if (!n.stato_prima || !n.stato_dopo) { continue; }
      tot += (n.stato_prima.stress_str - n.stato_dopo.stress_str);
      quante++;
    }
    if (!quante) { return null; }
    var media = tot / quante;
    return {
      notti: quante,
      restituito_totale: Math.round(tot * 10) / 10,
      restituito_per_notte: Math.round(media * 10) / 10,
      pavimento_attivo: !!(sett.stato_finale && sett.stato_finale.floor1_attivo)
    };
  }

  /* il carico giorno per giorno: la forma conta piu' del punto d'arrivo */
  function andamentoGiorni(sett) {
    var g = sett.giorni || [];
    var punti = [];
    for (var i = 0; i < g.length; i++) {
      punti.push({
        giorno: i + 1,
        titolo: g[i].titolo,
        str: g[i].stato_finale.stress_str,
        pos: g[i].stato_finale.posizione_pos,
        deb: g[i].stato_finale.debito_deb,
        costo: g[i].stato_finale.costo_nascosto,
        pavimento: !!g[i].stato_finale.floor1_attivo,
        esito: g[i].esito
      });
    }
    return punti;
  }

  function componiRaccontoSettimana(sett, opzioni) {
    opzioni = opzioni || {};
    var ini = sett.stato_iniziale, fin = sett.stato_finale;
    var reg = registroSettimana(sett);
    var giorni = sett.giorni || [];
    var punti = andamentoGiorni(sett);
    var notte = resaDelleNotti(sett);
    var sezioni = [];

    /* --- 1 · l'arco della settimana --- */
    var dStr = fin.stress_str - ini.stress_str;
    sezioni.push({
      titolo: 'Come è andata la settimana',
      /* una settimana lunga un giorno non e' una settimana: il generatore le
         giornate le conta come gli si dice, e una sola e' un caso legittimo.
         Il nome del regime e' una citazione e va fra caporali; la parola
         «regime» si consegna DOPO il fatto, come si farebbe a voce. */
      testo: (giorni.length === 1
                ? 'Questo racconto copre un giorno solo. '
                : 'La settimana copre ' + giorni.length + ' giorni. ') +
        arcoCaricoAssetto(ini.stress_str, fin.stress_str, ini.posizione_pos, fin.posizione_pos, true) +
        ' Il modo di funzionare che ne è uscito è «' + (sett.nome_regime || '—') + '», ' +
        'e il modello lo chiama regime.' +
        (fin.debito_deb > ini.debito_deb
          ? ' Il debito è cresciuto di ' + inPunti(fin.debito_deb - ini.debito_deb) +
            ': in qualche giorno si è insistito senza cambiare strada.' : '')
    });

    /* --- 2 · IL PUNTO DI NON RITORNO — le due soglie misurate --- */
    var dn = diagnosiNonRitorno(fin);
    if (dn.superato) {
      var testoSuperato;
      /* la soglia scatta a «maggiore o uguale»: «da 50 in su» e' vero anche
         sul valore esatto, «sopra 50» no */
      if (dn.quale === 'costo') {
        /* Nel registro «soglia» questa sezione APRE il racconto, e «costo
           nascosto» e' il suo primo termine del modello: si scioglie qui, una
           volta, con le parole del glossario. «Quaranta giorni di giornate»
           metteva la stessa parola due volte a due parole di distanza. Il
           tetto di questo registro (343) e' misurato sul fondo: la parentesi
           costa nove parole e le due riscritture ne restituiscono tre. */
        testoSuperato = 'Il costo nascosto (il prezzo dei gesti che si vede solo dopo) chiude a ' +
          dn.costo + ', e la soglia è ' +
          dn.soglia_costo + '. È la soglia che conta di più, e per due motivi. Nelle prove, ' +
          'da ' + dn.soglia_costo + ' in su, non esce nessuno: quaranta giorni ' +
          'leggerissimi, con sonno ottimo e rientro vero ogni sera, e il sistema ' +
          'resta bloccato lo stesso. Le condizioni di recupero spostano la soglia del carico ' +
          'di dieci punti, ma su questa non spostano niente, ed è l’unica delle due che non ' +
          'si può aggirare. E poi **non si vede nell’esito**: le cose possono ' +
          'essere andate a buon fine tutte quante.';
      } else {
        testoSuperato = 'Il carico chiude a ' + dn.carico + ', e da ' +
          dn.soglia_carico_migliore + ' in su, nelle prove, non si esce: quaranta giorni ' +
          'leggerissimi, con sonno ottimo e rientro vero ogni sera, non bastano. ' +
          'In condizioni ordinarie la soglia è ancora più bassa: ' + dn.soglia_carico + '.';
      }
      sezioni.unshift({
        titolo: 'Il punto di non ritorno è stato superato',
        chiave: 'non_ritorno',
        testo: testoSuperato + ' E non è un pendio, è un salto: misurato su trenta giorni, ' +
          'il carico finisce o attorno a 52 o a 99, in mezzo non c’è quasi niente. Non si ' +
          'scivola giù: si sta, e poi si cade.'
      });
      /* «Che cosa tira fuori», «porta fuori», «da poco dentro», «da più
         dentro»: era tutta una famiglia di calchi («gets you out», «from a
         little inside»). In italiano da una situazione SI ESCE, e si parte
         da poco o da molto oltre una soglia. Il test di _test/settimana.js
         cerca la chiave «uscita», non il titolo. */
      sezioni.push({
        titolo: 'Che cosa fa uscire, e che cosa no',
        chiave: 'uscita',
        /* ⚠️ Questa sezione non si taglia mai, e il registro «soglia» ha un
           tetto di 343 parole misurato sul fondo: qui ogni parola in piu' e'
           uno sforamento su tutte le settimane gravi (_test/settimana.js lo
           conta). La riscrittura e' quindi anche piu' corta di prima. */
        testo: 'Le prove ripartono da uno stato già compromesso. Appena oltre la soglia ' +
          '(costo 42), alleggerendo le giornate se ne esce ' + comeFrazione(80) + '; con un ' +
          'rientro vero, ma **senza** alleggerire, mai. Più in là (costo 52) niente fa uscire ' +
          'di sicuro, nemmeno tutto insieme: solo ' + comeFrazione(33) + '. Non è che il ' +
          'rientro non serva, è che da solo, e tardi, non basta: quello che funziona è ' +
          'togliere carico, e presto.'
      });
    } else if (dn.solo_col_meglio) {
      sezioni.push({
        titolo: 'Da qui si esce, ma solo con le condizioni migliori',
        chiave: 'stretto',
        testo: 'Il carico chiude a ' + dn.carico + ', e da ' + dn.soglia_carico + ' in su, in ' +
          'condizioni ordinarie, non si torna indietro. Resta però sotto ' +
          dn.soglia_carico_migliore + ', che è la soglia con le condizioni migliori, e in ' +
          'mezzo alle due soglie si esce ancora, alleggerendo davvero le giornate. ' +
          'Il costo nascosto (il prezzo dei gesti che si vede solo dopo) intanto è a ' +
          dn.costo + ', sotto ' + dn.soglia_costo + ', ' +
          'ed è lì che sta lo spazio vero, più che nel carico.'
      });
    } else if (dn.distanza_costo <= 15 || dn.distanza_carico <= 15) {
      var vicina = (dn.distanza_costo <= dn.distanza_carico)
        ? { n: 'Il costo nascosto è a ' + dn.costo + ', ed è quello che si accumula in ' +
               'silenzio e si paga più avanti. ',
            s: dn.soglia_costo, d: dn.distanza_costo,
            coda: 'Ed è la soglia che nessuna condizione di recupero sposta.' }
        : { n: 'Il carico è a ' + dn.carico + '. ',
            s: dn.soglia_carico_migliore, d: dn.distanza_carico,
            coda: 'In condizioni ordinarie la soglia è ' + dn.soglia_carico + ', più vicina ancora.' };
      sezioni.push({
        titolo: 'Quanto manca al punto di non ritorno',
        chiave: 'vicinanza',
        testo: vicina.n +
          (vicina.d === 1 ? 'Manca un punto' : 'Mancano ' + inPunti(vicina.d)) + ' a ' +
          vicina.s + ', la soglia oltre la quale, nelle prove, non si torna più. ' +
          vicina.coda + ' È la distanza che vale la pena guardare, non il numero.'
      });
    }

    /* --- 3 · la resa delle notti --- */
    if (notte && reg.nome !== 'soglia') {
      /* La virgola dei decimali e il singolare li mette inPunti; l'unita' si
         scrive una volta. Con una notte sola «in media … a notte» non vuole
         dire niente: la media di un valore solo e' quel valore. Il numero e
         la sua lettura stanno in due frasi corte, e la lettura e' la cosa che
         il lettore si porta via. */
      var t;
      var quanteNotti = (notte.notti === 1
        ? 'L’unica notte della settimana ha restituito '
        : 'Le ' + notte.notti + ' notti hanno restituito, in media, ');
      if (notte.pavimento_attivo) {
        t = quanteNotti + inPunti(notte.restituito_per_notte) + ' di carico' +
          (notte.notti === 1 ? '' : ' a notte') + '. Ma il «pavimento» di protezione è attivo: è la difesa che il modello accende da solo quando il carico è salito troppo, e da cui in poi il riposo rende circa la metà. ' +
          'Il recupero è già dimezzato: quello che si vede non è quanto la notte ' +
          'può dare, è quanto le resta da dare.';
      } else if (notte.restituito_per_notte <= 0) {
        t = 'Le notti non hanno restituito niente: in media il carico al risveglio è uguale ' +
          'o più alto di quello della sera, e si dorme, ma il recupero non arriva lo stesso. ' +
          'Il libro lo chiama fallimento del recupero, e dice più del carico con cui la ' +
          'settimana si chiude.';
      } else {
        t = quanteNotti + inPunti(notte.restituito_per_notte) + ' di carico' +
          (notte.notti === 1
            ? '. '
            : ' a notte. In tutto ' + (notte.restituito_totale === 1
                ? 'fa 1' : 'fanno ' + conVirgola(String(notte.restituito_totale))) + '. ') +
          (notte.restituito_totale >= Math.abs(dStr)
            ? 'Il recupero tiene il passo di quello che la settimana spende.'
            : 'Non basta a coprire quello che la settimana spende, e la differenza è quello ' +
              'che resta addosso.');
      }
      sezioni.push({ titolo: 'Che cosa hanno restituito le notti', chiave: 'notti', testo: t });
    }

    /* --- 4 · la forma della settimana --- */
    /* IL PICCO E LO SCATTO SI CALCOLANO QUI, NON DENTRO LA SEZIONE: «Che cosa
       fare» deve vederli, o le due sezioni si smentiscono a vicenda nella
       stessa schermata. */
    var peggiore = punti.length ? punti[0] : null, salti = [];
    for (var i = 0; i < punti.length; i++) {
      if (punti[i].str > peggiore.str) { peggiore = punti[i]; }
      if (i > 0 && punti[i].str - punti[i - 1].str >= 8) {
        salti.push({ giorno: punti[i].giorno, salto: punti[i].str - punti[i - 1].str });
      }
    }
    if (reg.nome === 'completo' && punti.length >= 3) {
      var ultimo = punti[punti.length - 1];
      /* ogni ramo porta il suo verbo, e il massimo si dice nella frase invece
         che fra parentesi */
      var forma = (peggiore.giorno === punti.length)
        ? 'è andata in salita fino alla fine, e il carico più alto, ' + peggiore.str +
          ', è dell’ultimo giorno.'
        : 'ha avuto un picco al giorno ' + peggiore.giorno + ', con il carico a ' +
          /* «la settimana è rientrata» usava «rientrare» nel senso comune
             tre righe dopo che il racconto lo usa nel senso del modello (il
             rientro): qui a scendere e' il carico, e si dice cosi'. */
          peggiore.str + ', ' + (ultimo.str < peggiore.str - 5
            ? 'e dopo quel picco il carico è sceso.'
            : 'e dopo quel picco il carico non è sceso davvero.');
      sezioni.push({
        titolo: 'La forma della settimana',
        chiave: 'forma',
        testo: 'La settimana ' + forma +
          (salti.length
            ? ' Il carico ha fatto uno scatto netto al giorno ' + salti[0].giorno + ': +' +
              salti[0].salto + ' rispetto al giorno prima, ed è lì che è successo qualcosa, ' +
              'non nella media.'
            : ' Nessun giorno ha fatto uno scatto: il carico è salito o sceso poco per ' +
              'volta, e conta la somma dei giorni, non un giorno solo.')
      });
    }

    /* --- 5 · che cosa fare --- */
    var az;
    if (dn.superato) {
      /* la spiegazione sta per esteso qui sopra e nella sezione dell'uscita:
         una cosa gia' detta si richiama in mezza riga, e si va avanti */
      az = {
        titolo: 'Le priorità, e basta',
        testo: 'A questo punto il gesto singolo non è più la leva, e nemmeno la giornata: ' +
               'il motivo è scritto qui sopra. Restano le priorità, che non sono un modo di ' +
               'recuperare ma un modo di non peggiorare.',
        priorita: PRIORITA_ROSSE
      };
    } else if (notte && notte.restituito_per_notte <= 0) {
      az = {
        titolo: 'Che cosa fare',
        /* «non sta restituendo», «sta tenendo il passo»: progressivi inglesi
           dove l'italiano usa il presente */
        testo: 'La leva di questa settimana non è dentro i giorni, è fra i giorni: **il ' +
               'recupero non restituisce niente**. Prima di alleggerire le giornate ' +
               'vale la pena guardare che cosa succede di notte, perché una giornata più ' +
               'leggera, dentro un recupero che non funziona, lascia il carico dov’è.',
        priorita: [],
        nota: 'Una mossa sola alla volta, e per almeno una settimana, perché sotto quella ' +
              'durata la differenza non si distingue dalle oscillazioni normali.'
      };
    } else if (fin.posizione_pos < 36) {
      az = {
        titolo: 'Che cosa fare',
        testo: 'L’assetto chiude a ' + fin.posizione_pos + ', sotto 36, che è una delle ' +
               'quattro soglie misurate. Sotto quella soglia cambia la qualità di quello che ' +
               'riesce, non la probabilità che riesca: le cose continuano a funzionare, e ' +
               'costano di più. **La leva è l’assetto, non il carico.**',
        priorita: [],
        nota: 'Guardare solo se le cose sono andate a buon fine, qui, nasconde proprio il ' +
              'problema.'
      };
    } else if (dn.solo_col_meglio) {
      /* dice la cosa che la sezione di sopra implica: la via d'uscita c'e'
         ed e' una sola. Senza questo ramo, un avviso e tre righe sotto un
         via libera. */
      az = {
        titolo: 'Che cosa fare',
        testo: 'Si esce ancora, ma in un modo solo, quello detto qui sopra: **alleggerire ' +
               'le giornate per davvero**. Nelle prove è la mossa con cui si esce, mentre un ' +
               'rientro vero, con il carico dov’è, non ha fatto uscire nessuno.',
        priorita: []
      };
    } else {
      /* con un giorno solo non c'e' un confronto fra giorni ne' una somma */
      var pochiGiorni = (punti.length < 2);
      az = {
        titolo: 'Che cosa fare',
        testo: pochiGiorni
          ? 'Il conto si chiude in una condizione che regge. Con un giorno solo, però, ' +
            'non c’è ancora una forma da guardare, perché questo livello parla sull’arco ' +
            'di più giorni, e qui l’arco non c’è.'
          : salti.length
          ? 'La settimana si chiude in una condizione che regge. Se c’è qualcosa da ' +
            'guardare, è il giorno ' + salti[0].giorno + ', quello dello scatto più grosso ' +
            'del carico: è l’unico punto in cui la settimana dice qualcosa di preciso, e ' +
            'vale la pena ricordarsi che cosa c’era quel giorno.'
          : 'La settimana si chiude in una condizione che regge. Nessun giorno si stacca ' +
            'dagli altri, perché il carico è salito e sceso poco per volta: non c’è un ' +
            'giorno da guardare, c’è una somma, e per adesso la somma tiene.',
        priorita: []
      };
    }

    var racconto = {
      registro: reg,
      settimana: true,
      livello: sett.livello,
      punti: punti,
      sezioni: sezioni,
      snodi: [],
      azione: az,
      punto_non_ritorno: dn,
      sintesi: plurale(giorni.length, 'giorno', 'giorni') + ' · carico ' + ini.stress_str + ' → ' + fin.stress_str +
        ' · assetto ' + ini.posizione_pos + ' → ' + fin.posizione_pos +
        ' · regime «' + (sett.nome_regime || '—') + '».'
    };

    racconto.parole_prima = contaSettimana(racconto);
    racconto.tagliato = riduciSettimana(racconto, reg.budget_parole);
    racconto.parole = contaSettimana(racconto);
    return racconto;
  }

  function contaSettimana(r) {
    var t = r.sintesi + ' ';
    r.sezioni.forEach(function (s) { t += s.titolo + ' ' + s.testo + ' '; });
    t += r.azione.testo + ' ' + (r.azione.priorita || []).join(' ') + ' ' + (r.azione.nota || '');
    return t.split(/\s+/).filter(Boolean).length;
  }

  /* L'ORDINE DELLE RINUNCE — e che cosa non si taglia mai.
     Il punto di non ritorno e la sua uscita non sono in questa lista: sono
     la cosa piu' forte che il modello sappia dire, e se il racconto e' lungo
     si accorcia altro. */
  var RIDUZIONI_SETTIMANA = [
    { nome: 'forma della settimana', fai: function (r) { return togliSezione(r, 'La forma della'); } },
    { nome: 'nota sull’azione', fai: function (r) {
        if (r.azione.nota) { r.azione.nota = ''; return true; } return false; } },
    { nome: 'resa delle notti', fai: function (r) { return togliSezione(r, 'Che cosa hanno restituito'); } },
    { nome: 'vicinanza alla soglia', fai: function (r) { return togliSezione(r, 'Quanto manca al punto'); } },
    { nome: 'arco della settimana', fai: function (r) { return togliSezione(r, 'Come è andata la settimana'); } }
  ];

  function riduciSettimana(racconto, budget) {
    return applicaRiduzioni(racconto, budget, RIDUZIONI_SETTIMANA, contaSettimana, 30);
  }

  /* Gli identificativi interni non devono mai finire sotto gli occhi di chi
     legge. «spirale fermo_in_alto» è comparso nella sintesi il 3/9, appena
     dopo che avevo aggiunto quel caso: una svista piccola, ma è esattamente
     il genere di cosa che fa sembrare un report una schermata di debug. */
  function spiraleInItaliano(sp) {
    if (!sp) { return 'nessuna spirale'; }
    var NOMI = {
      'stabilizzata':  'spirale stabilizzata',
      'in formazione': 'spirale in formazione',
      'in rientro':    'spirale in rientro',
      'fermo_in_alto': 'regime fermo in alto',
      'stabile':       'regime stabile'
    };
    if (NOMI[sp.andamento]) { return NOMI[sp.andamento]; }
    return sp.andamento ? 'regime ' + String(sp.andamento).replace(/_/g, ' ')
                         : 'regime non riconosciuto';
  }

  /* ==========================================================================
     IL RACCONTO DELLA TRAIETTORIA — il livello lungo, mesi
     ==========================================================================
     Il livello sopra la settimana. La settimana dice come è andata una
     settimana; la traiettoria dice se il modo in cui si vive sta cambiando.
     La cosa che il libro chiama l'errore proprio di questo livello — [guida
     3.2 v6, § 8.6] «ignorare una spirale in formazione» — è già misurata e
     raccontata da `diagnosiSpirale` in tempo.js: qui si compone il racconto
     attorno a quella diagnosi, non se ne inventa una seconda.

     STESSA REGOLA DELLA SETTIMANA: il registro è misurato, non scelto, e il
     budget di parole è il fondo che il registro produce davvero — si misura
     con lo stesso banco (`_test/traiettoria.js`), non si ricopia qui a mano. */

  /* Il registro della traiettoria guarda TRE cose che la settimana da sola
     non vede: la soglia dello stato finale (stessa diagnosi della settimana,
     letta sull'ultima settimana), e l'andamento della spirale — che può
     essere grave anche quando lo stato finale, isolato, non lo è ancora:
     è il senso stesso di «spirale in formazione».

     I BUDGET DI PAROLE — misurati, non scelti, con lo stesso metodo della
     settimana (`_test/traiettoria.js`): 540 traiettorie su 5 profili di
     durezza (fissa e mista) x 4 stati iniziali x 3 assetti x 3 regimi di
     recupero x 2-3 lunghezze, contate le parole prodotte da ciascun registro
     PRIMA del taglio (`parole_prima`):

       registro    fondo misurato (max su 540 corse)
       soglia      264
       stretto     137
       completo    137

     Il budget resta sopra il fondo — un budget sotto il fondo verrebbe
     violato in silenzio — e non troppo sopra, o non è un vincolo, è un
     numero scritto a caso. */
  function registroTraiettoria(tra) {
    var f = tra.stato_finale;
    var dn = diagnosiNonRitorno(f);
    var sp = tra.spirale;
    var spiraleGrave = sp && (sp.andamento === 'stabilizzata' || sp.andamento === 'in formazione');
    if (dn.superato || spiraleGrave) {
      return { nome: 'soglia', budget_parole: 300,
        /* «la cosa da dire è una sola» ripeteva il titolo della vista («Qui il
           racconto dice una cosa sola»); e «sta peggiorando» era il progressivo
           inglese dove l'italiano usa il presente. */
        motivo: 'Il punto di non ritorno è stato superato, oppure il regime peggiora di ' +
                'settimana in settimana. In tutti e due i casi si dice per intero quale ' +
                'delle due è successa, e da quante settimane.' };
    }
    if (dn.solo_col_meglio || f.posizione_pos < 36) {
      return { nome: 'stretto', budget_parole: 170,
        motivo: 'La traiettoria si chiude con poco spazio di manovra.' };
    }
    return { nome: 'completo', budget_parole: 170, motivo: '' };
  }

  /* la settimana peggiore e quella migliore della traiettoria, per punteggio
     di carico — non serve altro per dire dove sta il punto di svolta */
  function estremiRegimi(regimi) {
    if (!regimi || !regimi.length) { return null; }
    var peggiore = regimi[0], migliore = regimi[0];
    for (var i = 1; i < regimi.length; i++) {
      if (regimi[i].stress_str > peggiore.stress_str) { peggiore = regimi[i]; }
      if (regimi[i].stress_str < migliore.stress_str) { migliore = regimi[i]; }
    }
    return { peggiore: peggiore, migliore: migliore };
  }

  function componiRaccontoTraiettoria(tra, opzioni) {
    opzioni = opzioni || {};
    var ini = tra.stato_iniziale, fin = tra.stato_finale;
    var reg = registroTraiettoria(tra);
    var settimane = tra.settimane || [];
    var regimi = tra.regimi || [];
    var sp = tra.spirale;
    var estremi = estremiRegimi(regimi);
    var sezioni = [];

    /* --- 1 · l'arco della traiettoria --- */
    sezioni.push({
      titolo: 'Come è andata la traiettoria',
      testo: 'La traiettoria copre ' + plurale(settimane.length, 'settimana', 'settimane', 'una') + '. ' +
        arcoCaricoAssetto(ini.stress_str, fin.stress_str, ini.posizione_pos, fin.posizione_pos, true) +
        (sp ? '' : ' Il modo di funzionare che si è ripetuto è «' +
                   (tra.nome_regime || '—') + '», e il modello lo chiama regime.')
    });

    /* --- 2 · LA SPIRALE — il rischio di lettura proprio di questo livello --- */
    if (sp) {
      /* «fermo_in_alto» va trattato come grave quanto una spirale: e' una
         spirale che non si muove, non una traiettoria tranquilla. */
      var chiaveSp = (sp.andamento === 'in formazione' || sp.andamento === 'stabilizzata'
                      || sp.andamento === 'fermo_in_alto')
        ? 'spirale_grave' : 'spirale';
      /* «REGIME» E' LA PAROLA DI QUESTO LIVELLO, E QUI SI PRESENTA. Questa
         sezione sta in cima al racconto, e il testo della diagnosi arriva da
         tempo.js e comincia con «Il regime…»: riscriverlo non tocca a questo
         file. La riga che lo introduce e' di qui, presenta la parola una volta
         sola e la consegna in fondo, dove diventa la cerniera con la frase
         dopo. ⚠️ La leggibilita' di questa sezione dipende quasi tutta da
         tempo.js: e' l'unica del racconto che resta sotto il Gulpease 60. */
      sezioni.unshift({
        titolo: sp.andamento === 'stabilizzata' ? 'Il regime è una spirale stabilizzata'
              : sp.andamento === 'in formazione' ? 'Il regime sta peggiorando settimana per settimana'
              : sp.andamento === 'in rientro' ? 'Il regime sta migliorando'
              : sp.andamento === 'fermo_in_alto' ? 'Il regime non migliora'
              : 'Il regime tiene',
        chiave: chiaveSp,
        /* «spirale» si spiega solo quando questa sezione la nomina davvero
           (andamento grave): sciogliere un termine che poi non compare
           sarebbe spazio buttato, proprio nel registro piu' compresso. */
        testo: 'Il modo di funzionare che si ripete uguale, il modello lo chiama regime.' +
               (chiaveSp === 'spirale_grave'
                 ? ' Un regime che peggiora sempre, e non si ferma da solo, si chiama spirale.'
                 : '') +
               ' ' + sp.testo
      });
    }

    /* --- 3 · il punto di non ritorno, se superato sull'ultima settimana --- */
    var dn = diagnosiNonRitorno(fin);
    if (dn.superato) {
      var testoSuperato;
      /* «da 50 in su» e' vero anche sul valore esatto; «sopra 50» no */
      if (dn.quale === 'costo') {
        /* «costo nascosto» sciolto fra parentesi qui, con le parole del
           glossario: nel registro «soglia» e' il primo termine del modello
           che questa sezione nomina. Il tetto (300) e' misurato sul fondo:
           la parentesi si paga accorciando «Le priorità, e basta», qui sotto. */
        testoSuperato = 'Il costo nascosto (il prezzo dei gesti che si vede solo dopo) chiude a ' +
          dn.costo + ', e la soglia è ' +
          dn.soglia_costo + '. È la soglia che nessuna condizione di recupero sposta, e ' +
          'non si vede nell’esito: le cose possono essere andate a buon fine tutte quante.';
      } else {
        testoSuperato = 'Il carico chiude a ' + dn.carico + ', e da ' +
          dn.soglia_carico_migliore + ' in su, nelle prove, non si esce in nessuna delle ' +
          'condizioni provate.';
      }
      sezioni.push({
        titolo: 'Il punto di non ritorno è stato superato',
        chiave: 'non_ritorno',
        testo: testoSuperato
      });
    }

    /* --- 4 · come si sono succedute le settimane --- */
    if (reg.nome !== 'soglia' && estremi && regimi.length >= 2) {
      /* Quando i due estremi coincidono non c'e' una forma da raccontare, e
         dirlo e' un'informazione vera. L'ordinale si accorda al femminile e
         basta da solo: il titolo dice gia' che si parla di settimane. */
      var testo4 = (estremi.peggiore.settimana === estremi.migliore.settimana)
        ? 'Le settimane si somigliano tutte: la più pesante e la più leggera sono la ' +
          'stessa, ' + laEnnesima(estremi.peggiore.settimana) + ' (carico ' +
          estremi.peggiore.stress_str + '). Non c’è un punto di svolta da guardare, e ' +
          'anche questo dice qualcosa.'
        : 'La più pesante è stata ' + laEnnesima(estremi.peggiore.settimana) +
          ' (carico ' + estremi.peggiore.stress_str + '), la più leggera ' +
          laEnnesima(estremi.migliore.settimana) +
          ' (carico ' + estremi.migliore.stress_str + '). ' +
          (estremi.peggiore.settimana > estremi.migliore.settimana
            ? 'Il peggio è arrivato dopo, non all’inizio.'
            : 'Il peggio è arrivato subito, e poi la traiettoria ha retto meglio.');
      sezioni.push({ titolo: 'Come si sono succedute le settimane', chiave: 'forma', testo: testo4 });
    }

    /* --- 5 · che cosa fare --- */
    var az;
    if (dn.superato) {
      az = {
        titolo: 'Le priorità, e basta',
        /* la sezione qui sopra ha gia' detto quale soglia e' stata passata:
           ridirlo con altre parole tre righe piu' in basso non aggiunge niente */
        /* «C’è da smettere di aggiungerne»: aggiungerne che cosa? Il «ne»
           rimandava a «le cose», che e' un tappabuchi. Quello che non va
           aggiunto e' peso. Otto parole in meno, che pagano la parentesi sul
           costo nascosto tre righe sopra. */
        testo: 'Le priorità qui sotto non servono a recuperare: servono a non peggiorare, e a ' +
               'questo punto è già molto. La soglia scritta qui sopra dice perché, e in una ' +
               'settimana nessuna mossa rimette tutto a posto: c’è solo da smettere di ' +
               'aggiungere peso.',
        priorita: PRIORITA_ROSSE
      };
    } else if (sp && sp.andamento === 'in formazione') {
      az = {
        titolo: 'Che cosa fare',
        /* «sta salendo» era il progressivo inglese: in italiano il carico sale */
        testo: 'Quello che conta a questo livello non è il carico di oggi, è che sale ' +
               'settimana dopo settimana. **La leva è intervenire ora**, mentre il ' +
               'regime è ancora recuperabile, perché aspettare che il carico faccia notare ' +
               'da solo il problema vuol dire aspettare che la spirale si stabilizzi.',
        priorita: [],
        nota: 'Guardare solo l’ultima settimana nasconde proprio questo: si vede una ' +
              'settimana pesante come tante, non l’andamento che la precede.'
      };
    } else if (sp && sp.andamento === 'in rientro') {
      az = {
        titolo: 'Che cosa fare',
        testo: 'Il regime migliora: da «' + regimi[0].nome + '» a «' +
               regimi[regimi.length - 1].nome + '». Quello che ha funzionato in queste ' +
               'settimane vale la pena di continuarlo così com’è, senza cambiare niente.',
        priorita: []
      };
    } else {
      /* la settimana piu' pesante e' gia' nominata tre righe sopra, quando
         quella sezione c'e': nominarla di nuovo costa due parole e chiude il
         cerchio; quando non c'e', si dice come prima */
      var pesante = (estremi && regimi.length >= 2 &&
                     estremi.peggiore.settimana !== estremi.migliore.settimana)
        ? ', ' + laEnnesima(estremi.peggiore.settimana) : '';
      az = {
        titolo: 'Che cosa fare',
        /* «non sta peggiorando», «sta migliorando», «una cosa da guardare»:
           progressivi inglesi e «cosa» tappabuchi, riscritti come si direbbero */
        testo: 'La traiettoria si chiude in una condizione che regge, e il regime non ' +
               'peggiora. Se c’è qualcosa da guardare, è la settimana più pesante' +
               pesante + ', perché è lì che la traiettoria ha detto qualcosa di preciso.',
        priorita: []
      };
    }

    var racconto = {
      registro: reg,
      traiettoria: true,
      livello: tra.livello,
      regimi: regimi,
      sezioni: sezioni,
      snodi: [],
      azione: az,
      punto_non_ritorno: dn,
      spirale: sp,
      /* La riga di sintesi si allinea a quello che le sezioni dicono (il nome
         del regime dell'ultima settimana, `regimi[…].nome`, non
         `nome_regime`: le due misure di tempo.js non coincidono sempre), e
         quando l'andamento contiene gia' il nome del regime, il nome non si
         ripete. */
      sintesi: (function () {
        var ultimoRegime = regimi.length ? regimi[regimi.length - 1].nome : null;
        var nomeReg = ultimoRegime || tra.nome_regime || '—';
        var andamento = spiraleInItaliano(sp);
        var doppio = andamento.toLowerCase().indexOf(nomeReg.toLowerCase()) >= 0;
        return plurale(settimane.length, 'settimana', 'settimane') +
          ' · carico ' + ini.stress_str + ' → ' + fin.stress_str +
          ' · assetto ' + ini.posizione_pos + ' → ' + fin.posizione_pos +
          (doppio ? '' : ' · si chiude in «' + nomeReg + '»') + ' · ' + andamento + '.';
      }())
    };

    racconto.parole_prima = contaTraiettoria(racconto);
    racconto.tagliato = riduciTraiettoria(racconto, reg.budget_parole);
    racconto.parole = contaTraiettoria(racconto);
    return racconto;
  }

  function contaTraiettoria(r) {
    var t = r.sintesi + ' ';
    r.sezioni.forEach(function (s) { t += s.titolo + ' ' + s.testo + ' '; });
    t += r.azione.testo + ' ' + (r.azione.priorita || []).join(' ') + ' ' + (r.azione.nota || '');
    return t.split(/\s+/).filter(Boolean).length;
  }

  /* L'ORDINE DELLE RINUNCE — la spirale e il punto di non ritorno non sono
     in questa lista, per lo stesso motivo della settimana: sono la cosa
     più forte che il modello sappia dire. */
  var RIDUZIONI_TRAIETTORIA = [
    /* Cercava «La settimana più pesante», che e' l'inizio del TESTO della
       sezione, non il suo titolo: percio' non ha mai tolto niente. Il nome
       della riduzione diceva gia' quale sezione voleva togliere. */
    { nome: 'come si sono succedute le settimane',
      fai: function (r) { return togliSezione(r, 'Come si sono succedute le settimane'); } },
    { nome: 'nota sull’azione', fai: function (r) {
        if (r.azione.nota) { r.azione.nota = ''; return true; } return false; } },
    { nome: 'arco della traiettoria', fai: function (r) { return togliSezione(r, 'Come è andata la traiettoria'); } }
  ];

  function riduciTraiettoria(racconto, budget) {
    return applicaRiduzioni(racconto, budget, RIDUZIONI_TRAIETTORIA, contaTraiettoria, 30);
  }

  var API = {
    QUALITA: QUALITA,
    PRIORITA_ROSSE: PRIORITA_ROSSE,
    registro: registro,
    SCOGLIERE: SCOGLIERE,
    vicinanzaScogliere: vicinanzaScogliere,
    eRischioRosso: eRischioRosso,
    RISCHI_ROSSI: RISCHI_ROSSI,
    registroCatena: registroCatena,
    snodi: snodi,
    calcoloPerEsteso: calcoloPerEsteso,
    comeFrazione: comeFrazione,
    componiRacconto: componiRacconto,
    componiRaccontoCatena: componiRaccontoCatena,
    PUNTO_NON_RITORNO: PUNTO_NON_RITORNO,
    SOGLIA_PAVIMENTO: SOGLIA_PAVIMENTO,
    SOGLIA_COSTO_NASCOSTO: SOGLIA_COSTO_NASCOSTO,
    SOGLIA_CARICO_MEDIA: SOGLIA_CARICO_MEDIA,
    SOGLIA_CARICO_MIGLIORE: SOGLIA_CARICO_MIGLIORE,
    diagnosiNonRitorno: diagnosiNonRitorno,
    PORTE_PAVIMENTO: PORTE_PAVIMENTO,
    USCITA_MISURATA: USCITA_MISURATA,
    registroSettimana: registroSettimana,
    resaDelleNotti: resaDelleNotti,
    andamentoGiorni: andamentoGiorni,
    componiRaccontoSettimana: componiRaccontoSettimana,
    registroTraiettoria: registroTraiettoria,
    estremiRegimi: estremiRegimi,
    componiRaccontoTraiettoria: componiRaccontoTraiettoria,
    spiraleInItaliano: spiraleInItaliano,
    sintesi: sintesi
  };

  globale.Racconto = API;
  if (typeof module !== 'undefined' && module.exports) { module.exports = API; }

})(typeof window !== 'undefined' ? window : globalThis);
