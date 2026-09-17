/* =============================================================================
   SIMULATORE 3.0 — Dalle risposte al nodo
   =============================================================================
   LIVELLO ESTERNO AL CORE.
   Questo file non contiene formula, pesi, clamp, dado, soglie o esiti: quelli
   stanno in nucleo.js e non sono stati toccati. Qui si fa una cosa sola:
   prendere le risposte del questionario e comporre il NODO che poi il core
   calcola con le sue regole di sempre.

   La regola di lettura e' che ogni numero del nodo deve essere riconducibile
   a una risposta precisa. Per questo la composizione restituisce, accanto al
   nodo, la TRACCIA: chi ha spostato che cosa, e di quanto.

   COME SI SOMMANO GLI EFFETTI
   Le variabili numeriche (E, I, T, M, BP, C, DEB, initial_STR, initial_POS,
   initial_BP) si sommano fra tutte le risposte, poi il core applica i suoi
   limiti. Le variabili categoriali (supporto, delega, rip, adattamento,
   macro) non si sommano: vince l'ultima risposta data, perche' una
   sola domanda le governa.
   ========================================================================== */

(function (globale) {
  'use strict';

  var N = globale.Nucleo;
  var Q = globale.Questionario;

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
     corretto. Questa guardia serve a chi scrive un banco di prova suo — le
     misure lunghe — perche' trovi un errore e non un numero sbagliato. */
  (function (mancanti) {
    if (!mancanti.length) { return; }
    throw new Error('composizione.js non può partire: ' +
      (mancanti.length === 1
        ? 'gli manca il modulo ' + mancanti[0] + ', e gli serve per trasformare le risposte del questionario in un nodo da calcolare.'
        : 'gli mancano i moduli ' + mancanti.join(' e ') + ', e gli servono per trasformare le risposte del questionario in un nodo da calcolare.') +
      ' Ordine di caricamento: nucleo.js, calibrazione.js, casuale-mt.js, stato.js, ' +
      'microsemantica.js, tempo.js, settimana-tipo.js, e i dati prima di chi li usa.');
  }([['Nucleo (nucleo.js)', N], ['Questionario (app/dati/questionario.js)', Q]]
    .filter(function (c) { return !c[1]; })
    .map(function (c) { return c[0]; })));


  /* Chiavi che si sommano. Tutte le altre sono categoriali. */
  var SOMMABILI = ['E', 'I', 'T', 'M', 'BP', 'C', 'DEB',
                   'initial_STR', 'initial_POS', 'initial_BP',
                   'campo', 'riduzione_carico'];

  /* LA PROVENIENZA DI UN DATO NON È LA SUA FONTE.
     La fonte (`d.fonte`: libro / Q0xx / derivata) dice da dove viene il
     TESTO della domanda. La provenienza dice da dove viene la RISPOSTA. Il
     capitolo 21 ne conta esattamente quattro, e li chiama per nome —
     «i nomi sono quelli che usa anche il simulatore»: certo, stimato,
     proxy, incompleto. Qui questo file esisteva solo di fatto (ogni
     risposta data a mano è certa, ogni domanda senza risposta è esclusa),
     ma senza il nome: una risposta dedotta dal testo libero della scena
     (le condizioni ambientali suggerite, in questionario-ui.js) veniva
     trattata esattamente come una risposta data a mano, e il capitolo 21 è
     esplicito sul perché questo sia grave: «Un dato stimato presentato
     come certo è un errore più grave di un numero sbagliato […] è una
     falsificazione della catena di custodia». */
  var PROVENIENZE = ['certo', 'stimato', 'proxy', 'incompleto'];

  /* Dove finisce ciascuna chiave dentro il nodo. Serve anche come elenco
     chiuso: una chiave non prevista qui viene segnalata, non ignorata. */
  var DESTINAZIONE = {
    E:  'modificatori.energia_e',      I: 'modificatori.informazione_i',
    T:  'modificatori.tempo_t',        M: 'modificatori.materiale_m',
    BP: 'modificatori.bonus_bp',       C: 'modificatori.complessita_c',
    DEB: 'stato_prima.debito_deb',
    initial_STR: 'stato_prima.stress_str',
    initial_POS: 'stato_prima.posizione_pos',
    initial_BP:  'stato_prima.bonus_bp',
    campo: 'campo.forza',
    supporto: 'supporto.tipo',
    riduzione_carico: 'supporto.riduzione_carico',
    delega: 'supporto.delega',
    rip: 'stato_prima.rip',
    adattamento: 'adattamento.disponibilita',
    macro: 'stato_prima.macro',
    qualita: '(nessuna: descrive la fiducia nel risultato, non il calcolo)'
  };

  /* Valori ammessi per le chiavi categoriali, presi dagli elenchi del core.
     Se una risposta ne propone uno diverso, il core lo sostituirebbe in
     silenzio con il valore predefinito: qui invece lo diciamo. */
  function ammessi(chiave) {
    switch (chiave) {
      case 'supporto':    return N.SUPPORTO;
      case 'delega':      return N.DELEGA;
      case 'rip':         return N.RIP;
      case 'adattamento': return N.DISPONIBILITA;
      case 'macro':       return N.MACRO;
      case 'qualita':     return ['alta', 'media', 'bassa'];
      default:            return null;
    }
  }

  /* --------------------------------------------------------------------
     LA SCALA DI P0 — presa dagli esempi pubblicati, non inventata

     Il punto di partenza non viene dal questionario: lo decide chi descrive
     la scena, perche' dice quanto e' fattibile il gesto IN SE', per chiunque,
     in condizioni normali. Le domande descrivono la persona, non il compito.

     PRIMA VERSIONE, e perche' era sbagliata. Avevo scritto una scala mia:
     90 / 80 / 70 / 60 / 50 / 40 / 30 / 20, con esempi miei. Meta' di quei
     valori il libro non li usa mai (50, 30, 20), e tre che usa mancavano
     (55, 75, 85).

     Questa scala e' fatta con i valori che il libro usa davvero e con i suoi
     esempi, presi dai dodici casi numerici pubblicati — Capitolo 5 e Mega
     Canvas alle pagine indicate. Ogni scalino ha una fonte.
     -------------------------------------------------------------------- */
  var SCALA_P0 = [
    { valore: 90, etichetta: 'Gesto automatico',
      esempio: 'bere un bicchiere d’acqua, anche dopo una giornata pesante',
      fonte: 'Mega Canvas p. 256' },
    { valore: 85, etichetta: 'Gesto semplice con un intoppo possibile',
      esempio: 'uscire di casa quando la porta si blocca e si ha fretta',
      fonte: 'Mega Canvas p. 276' },
    { valore: 80, etichetta: 'Gesto ordinario con qualcosa che reagisce',
      esempio: 'uscire con il cane che tira alla porta',
      fonte: 'Mega Canvas p. 266' },
    { valore: 75, etichetta: 'Compito che richiede attenzione',
      esempio: 'la spesa in un supermercato nuovo e affollato, preparare una lezione',
      fonte: 'Mega Canvas p. 274 e p. 278' },
    { valore: 70, etichetta: 'Compito ordinario',
      esempio: 'scrivere un messaggio che conta, mentre si è sotto pressione',
      fonte: 'libro Cap. 5 e Mega Canvas p. 272' },
    { valore: 60, etichetta: 'Compito con un ostacolo tecnico',
      esempio: 'una pratica online con il codice di accesso che non arriva',
      fonte: 'Mega Canvas p. 258' },
    { valore: 55, etichetta: 'Compito relazionale delicato',
      esempio: 'un dialogo di coppia teso',
      fonte: 'Mega Canvas p. 260' },
    { valore: 40, etichetta: 'Compito che richiede condizioni buone',
      esempio: 'spostare un oggetto pesante da soli',
      fonte: 'Mega Canvas p. 270' }
  ];

  /* --------------------------------------------------------------------
     PERCHE' LE RISPOSTE NON SI POSSONO SOMMARE E BASTA

     Nel libro ogni variabile del nodo vale una cosa sola: E sta fra -30 e
     +30, e quel -30 e' il corpo nella peggiore condizione descrivibile.
     Ma sul corpo il questionario fa cinque domande. Sommandole si arriva a
     -54: un valore che il libro non prevede.

     Il core lo taglierebbe a -30 e non se ne accorgerebbe nessuno. Il
     problema del taglio non e' il numero: e' che due persone diverse -- una
     a -32, una a -54 -- ricevono lo stesso identico -30 e da li' in poi sono
     indistinguibili. L'informazione in piu' che il questionario ha raccolto
     viene buttata proprio dove servirebbe di piu'.

     Allora, invece di tagliare, si comprime. Fino a una soglia la somma passa
     intatta; oltre, le risposte in piu' contano sempre meno ma contano: -54
     resta peggio di -40, e nessuno dei due esce dal dominio del libro.

     DOVE STA LA SOGLIA, E PERCHE' NON E' PIU' 0,70
     La prima versione la metteva al 70 % del dominio. Era un numero mio.
     Misurando i dodici esempi numerici pubblicati (libro, Cap. 5 e 10, e
     Mega Canvas), il valore piu' alto che il libro usa davvero e':

       modificatori E, I, M   fino al 33 % del dominio
       T                      fino al 50 %
       BP                     fino al 25 %
       C                      fino al 30 %
       DEB                    fino al  5 %
       STR                    fino all' 82 %      ← STR 82, Mega Canvas

     Con la soglia a 0,70 un questionario che descrive quella persona — STR
     82 — l'avrebbe compressa a 80. Cioe' la compressione avrebbe alterato un
     valore che il libro usa come esempio.

     La regola diventa: LA COMPRESSIONE NON DEVE MAI TOCCARE UN VALORE CHE IL
     LIBRO USA. Soglia 0,85, appena sopra l'82 % misurato. Sotto, identita'
     esatta; sopra, la rete di sicurezza contro l'uscita dal dominio.

     Questo e' un livello esterno. Il core riceve un valore gia' dentro i
     suoi limiti e applica il clamp come sempre, senza effetto.
     -------------------------------------------------------------------- */
  /* 0,85 = appena sopra l'82 % che il piu' alto esempio pubblicato usa */
  var SOGLIA_COMPRESSIONE = 0.85;

  function comprimi(somma, minimo, massimo) {
    var limite = (somma >= 0) ? massimo : minimo;
    if (limite === 0) { return 0; }
    var L = Math.abs(limite), s = Math.abs(somma);
    var soglia = SOGLIA_COMPRESSIONE * L;
    if (s <= soglia) { return somma; }
    var margine = L - soglia;
    var compresso = soglia + margine * (1 - Math.exp(-(s - soglia) / margine));
    return (somma >= 0) ? compresso : -compresso;
  }

  /* Un valore e' "in compressione" quando la somma delle risposte ha
     superato la soglia: da li' in poi rispondere peggio sposta poco.
     Va detto, non nascosto. */
  function saturazione(somma, minimo, massimo) {
    var limite = (somma >= 0) ? massimo : minimo;
    if (limite === 0) { return 0; }
    var L = Math.abs(limite), s = Math.abs(somma);
    var soglia = SOGLIA_COMPRESSIONE * L;
    if (s <= soglia) { return 0; }
    return Math.min(1, Math.round(((s - soglia) / (L - soglia)) * 100) / 100);
  }

  /* Domini dichiarati dal libro, per le sole chiavi numeriche. */
  var DOMINIO = {
    E: [-30, 30], I: [-30, 30], T: [-30, 30], M: [-30, 30],
    BP: [0, 20], C: [0, 10], DEB: [0, 20],
    initial_STR: [0, 100], initial_BP: [0, 20],
    campo: [0, 100], riduzione_carico: [0, 1]
  };

  /* --------------------------------------------------------------------
     PERCHE' NEMMENO LA COMPRESSIONE BASTA

     Comprimere impedisce di uscire dal dominio, ma non risolve il problema
     vero. Con quattordici domande al livello standard, e trentotto al livello
     profondo, il bilancio della formula si esaurisce a meta' strada: un
     rispondente che scelga la risposta intermedia a ogni domanda arriva gia'
     a Pn = 5, e da li' in avanti il modello non distingue piu' niente.
     Misurato: al livello profondo, dal rango 0,50 in poi tutte le
     compilazioni davano lo stesso 5.

     Il difetto sta nell'idea di sommare. Nel libro E vale un numero solo, e
     lo si sceglie dopo aver considerato corpo, sonno, dolore, cibo: le
     domande sul corpo sono CINQUE MODI DI GUARDARE LA STESSA COSA, non
     cinque sottrazioni indipendenti. Sommarle e' come misurare cinque volte
     la stessa febbre e addizionare i risultati.

     LA REGOLA
     Per ogni variabile, la risposta piu' sfavorevole fissa il livello; le
     altre lo correggono con un peso ridotto.

         v = c1 + rho * (c2 + c3 + ... + cn)        c1 = la piu' grande in modulo

     Con una sola domanda la regola sparisce: v = c1, esattamente il valore
     che il libro assegna a quella risposta. Con cinque domande tutte
     sfavorevoli si va oltre ogni singola risposta, ma non oltre il dominio.

     DA DOVE VIENE rho
     Non e' scelto: e' calcolato. Si impone la condizione che il libro stesso
     dichiara -- "-30 e' il corpo nella peggiore condizione descrivibile" --
     e si ricava il peso che porta il caso peggiore esattamente al bordo:

         rho = (limite - c1) / (c2 + c3 + ... + cn)     nel caso peggiore

     Se il risultato e' maggiore di 1 la variabile ha meno domande di quante
     ne servirebbero per riempire il dominio: nessuna attenuazione. rho
     dipende dal livello scelto, perche' dipende da quante domande ci sono.
     -------------------------------------------------------------------- */

  /* Il contributo piu' sfavorevole che una domanda puo' dare a una chiave. */
  function peggiorContributo(d, chiave) {
    if (d.tipo === 'scala') {
      var p = d.per_punto ? d.per_punto[chiave] : undefined;
      if (p === undefined) { return 0; }
      var a = p * (d.min - d.neutro), b = p * (d.max - d.neutro);
      /* sfavorevole = negativo per i modificatori, positivo per i carichi */
      return carico(chiave) ? Math.max(a, b) : Math.min(a, b);
    }
    var peggio = 0;
    for (var i = 0; i < d.opzioni.length; i++) {
      var v = d.opzioni[i].effetti[chiave];
      if (typeof v !== 'number') { continue; }
      peggio = carico(chiave) ? Math.max(peggio, v) : Math.min(peggio, v);
    }
    return peggio;
  }

  /* Chiavi in cui "piu' alto" vuol dire "peggio". */
  function carico(chiave) {
    return chiave === 'C' || chiave === 'DEB' || chiave === 'initial_STR';
  }

  var _cachePesi = {};
  function pesiAttenuazione(livello) {
    if (_cachePesi[livello]) { return _cachePesi[livello]; }
    var elenco = Q.perLivello(livello);
    var perChiave = {};

    for (var i = 0; i < elenco.length; i++) {
      for (var chiave in DOMINIO) {
        var c = peggiorContributo(elenco[i], chiave);
        if (c !== 0) { (perChiave[chiave] = perChiave[chiave] || []).push(c); }
      }
      var cp = peggiorContributo(elenco[i], 'initial_POS');
      if (cp !== 0) { (perChiave.initial_POS = perChiave.initial_POS || []).push(cp); }
    }

    var pesi = {};
    for (var k in perChiave) {
      var lista = perChiave[k].slice().sort(function (a, b) { return Math.abs(b) - Math.abs(a); });
      var primo = lista[0];
      var resto = 0;
      for (var j = 1; j < lista.length; j++) { resto += lista[j]; }

      var limite;
      if (k === 'initial_POS') { limite = -60; }            // POS parte da 60, il bordo è 0
      else { limite = carico(k) ? DOMINIO[k][1] : (primo < 0 ? DOMINIO[k][0] : DOMINIO[k][1]); }

      var rho = (resto === 0) ? 1 : (limite - primo) / resto;
      pesi[k] = {
        rho: Math.max(0, Math.min(1, rho)),
        domande: lista.length,
        peggior_singola: primo,
        peggior_somma: primo + resto,
        limite: limite,
        attenua: rho < 1
      };
    }
    _cachePesi[livello] = pesi;
    return pesi;
  }

  /* Applica la regola a una lista di contributi. */
  function aggrega(lista, rho) {
    if (!lista || !lista.length) { return 0; }
    var ord = lista.slice().sort(function (a, b) { return Math.abs(b.valore) - Math.abs(a.valore); });
    var v = ord[0].valore;
    for (var i = 1; i < ord.length; i++) { v += rho * ord[i].valore; }
    return v;
  }

  /* --------------------------------------------------------------------
     LA COMPOSIZIONE
     -------------------------------------------------------------------- */
  function componiNodo(risposte, opzioni) {
    opzioni = opzioni || {};
    risposte = risposte || {};

    var livello = opzioni.livello || 'standard';
    var elenco = Q.perLivello(livello);

    /* Il questionario nasce dal racconto: se la scena ha gia' scelto solo
       alcune domande, il nodo
       si compone su quelle. Contare come «senza risposta» delle domande che
       non sono mai state fatte abbasserebbe la fiducia per un motivo falso. */
    if (opzioni.soloQueste && opzioni.soloQueste.length) {
      elenco = elenco.filter(function (d) { return opzioni.soloQueste.indexOf(d.id) >= 0; });
    }
    var somme = {}, contributi = {}, categorie = {}, traccia = [], avvisi = [], senzaRisposta = [];
    var secondari = [];
    var attenuazione = pesiAttenuazione(livello);
    var provenienzaData = opzioni.provenienza || {};

    for (var i = 0; i < elenco.length; i++) {
      var d = elenco[i];
      var r = risposte[d.id];

      if (r === undefined || r === null || r === '') { senzaRisposta.push(d.id); continue; }

      /* Di default una risposta è «certa»: qualcuno l'ha data lui stesso,
         adesso, su questa domanda. Chi compone il nodo può dichiarare il
         contrario — per esempio quando il valore non viene da una scelta
         della persona ma da un'inferenza sul testo libero della scena. */
      var provenienza = provenienzaData[d.id] || 'certo';
      if (PROVENIENZE.indexOf(provenienza) < 0) {
        avvisi.push('La domanda ' + d.id + ' porta una provenienza «' + provenienza + '» che il ' +
          'modello non riconosce: il capitolo 21 ne dichiara quattro — certo, stimato, proxy, ' +
          'incompleto. Trattata come «certo». È un difetto del programma, non una risposta sbagliata.');
        provenienza = 'certo';
      }

      var eff = Q.effettiRisposta(d, r);
      var testoRisposta = (d.tipo === 'scelta')
        ? (d.opzioni[r] ? d.opzioni[r].testo : String(r))
        : String(r) + ' su ' + d.max;

      var spostamenti = [];
      for (var k in eff) {
        var v = eff[k];
        if (v === 0 || v === undefined) { continue; }

        /* QUESTE DUE SEGNALAZIONI LE LEGGE UNA PERSONA.
           Escono nel riquadro «Segnalazioni» della pagina del questionario,
           e prima erano scritte come due righe di diagnostica: «R7: la
           chiave "campo" non ha una destinazione nel nodo, ignorata.» —
           senza verbo, con le virgolette dritte, e con «chiave» che qui vuol
           dire una cosa che nel resto delle pagine non si chiama mai così.
           Adesso dicono che cosa è successo e che cosa vuol dire. */
        if (!DESTINAZIONE.hasOwnProperty(k)) {
          avvisi.push('La domanda ' + d.id + ' vorrebbe spostare «' + k + '», ma nel ' +
                                                                          'nodo non c’è ' +
                                                                          'niente che si ' +
                                                                          'chiami così. ' +
                                                                          'La sua ' +
                                                                          'risposta non ' +
                                                                          'è entrata nel ' +
                                                                          'calcolo. È un ' +
                                                                          'difetto del ' +
                                                                          'programma, ' +
                                                                          'non una ' +
                                                                          'risposta ' +
                                                                          'sbagliata.');
          continue;
        }
        var lista = ammessi(k);
        if (lista && lista.indexOf(v) < 0) {
          avvisi.push('La domanda ' + d.id + ' propone il valore «' + v + '» per «' +
            (Q.NOMI && Q.NOMI[k] ? Q.NOMI[k] : k) + '», che non è fra quelli previsti (' +
            lista.join(', ') + '). La sua risposta non è entrata nel calcolo. È un ' +
                               'difetto del programma, non una risposta sbagliata.');
          continue;
        }

        if (SOMMABILI.indexOf(k) >= 0) {
          somme[k] = (somme[k] || 0) + v;
          (contributi[k] = contributi[k] || []).push({ da: d.id, valore: v });
        } else if (k === 'qualita') {
          /* Le due domande misurano limiti diversi: una risposta favorevole
             non cancella una fonte indiretta o dati per lo piu stimati. */
          var gravita = { alta: 0, media: 1, bassa: 2 };
          if (!categorie.qualita || gravita[v] > gravita[categorie.qualita]) {
            categorie.qualita = v;
          }
        } else { categorie[k] = v; }
        spostamenti.push({ chiave: k, valore: v, nome: Q.NOMI[k] || k });
      }

      /* DOMICILIO UNICO DEL FATTO (guida 3.2 v6, § 6.1-6.4)
         «prima estrarre i fatti, poi assegnare domicilio primario, poi
          scrivere eventuale effetto secondario SENZA DUPLICARE LA CAUSA»
         Gli effetti secondari si dichiarano in quello che si legge, e NON
         si sommano:
         la stessa stanchezza non può togliere punti due volte, una da E
         e una da STR. */
      var dichiarati = [];
      var sec = (d.tipo === 'scelta' && d.opzioni[r]) ? d.opzioni[r].secondari : d.secondari;
      if (sec) {
        for (var ks in sec) {
          if (sec[ks] === 0) { continue; }
          dichiarati.push({ chiave: ks, valore: sec[ks], nome: Q.NOMI[ks] || ks });
          secondari.push({ da: d.id, chiave: ks, valore: sec[ks], nome: Q.NOMI[ks] || ks });
        }
      }

      traccia.push({
        id: d.id, testo: d.testo, risposta: testoRisposta,
        fonte: d.fonte, spostamenti: spostamenti, dichiarati: dichiarati,
        provenienza: provenienza
      });
    }

    /* Quante risposte, fra quelle date, non sono «certe». Serve alla
       fiducia: una scena può avere copertura piena e qualità dichiarata
       alta, ed essere comunque appoggiata in parte a valori che nessuno ha
       confermato di persona. */
    var nonCerte = traccia.filter(function (t) { return t.provenienza !== 'certo'; }).length;

    /* ---- dalle risposte ai valori del nodo ---- */
    var valori = {}, compressioni = [], aggregazioni = [];
    for (var chiave in DOMINIO) {
      var peso = attenuazione[chiave];
      var rho = peso ? peso.rho : 1;
      var grezzo = aggrega(contributi[chiave], rho);
      if (contributi[chiave] && contributi[chiave].length > 1) {
        aggregazioni.push({
          chiave: chiave, nome: Q.NOMI[chiave] || chiave,
          domande: contributi[chiave].length,
          somma_semplice: Math.round((somme[chiave] || 0) * 100) / 100,
          valore_aggregato: Math.round(grezzo * 100) / 100,
          rho: Math.round(rho * 1000) / 1000
        });
      }
      var dom = DOMINIO[chiave];
      var vv = comprimi(grezzo, dom[0], dom[1]);
      valori[chiave] = (chiave === 'riduzione_carico') ? Math.round(vv * 100) / 100 : Math.round(vv);
      var sat = saturazione(grezzo, dom[0], dom[1]);
      if (sat > 0) {
        compressioni.push({
          chiave: chiave, nome: Q.NOMI[chiave] || chiave,
          somma_risposte: Math.round(grezzo * 100) / 100,
          valore_usato: valori[chiave],
          saturazione: sat,
          limite: (grezzo >= 0) ? dom[1] : dom[0]
        });
      }
    }

    /* POS parte da 60 e si muove verso l'alto o verso il basso: la
       compressione si misura sullo spazio che resta fino al bordo. */
    var posGrezza = aggrega(contributi.initial_POS,
                            attenuazione.initial_POS ? attenuazione.initial_POS.rho : 1);
    if (contributi.initial_POS && contributi.initial_POS.length > 1) {
      aggregazioni.push({
        chiave: 'initial_POS', nome: Q.NOMI.initial_POS,
        domande: contributi.initial_POS.length,
        somma_semplice: Math.round((somme.initial_POS || 0) * 100) / 100,
        valore_aggregato: Math.round(posGrezza * 100) / 100,
        rho: Math.round((attenuazione.initial_POS ? attenuazione.initial_POS.rho : 1) * 1000) / 1000
      });
    }
    var spazio = (posGrezza >= 0) ? (100 - 60) : (0 - 60);
    var posValore = 60 + Math.round(comprimi(posGrezza, spazio < 0 ? spazio : -60, spazio > 0 ? spazio : 40));
    var posSat = saturazione(posGrezza, -60, 40);
    if (posSat > 0) {
      compressioni.push({
        chiave: 'initial_POS', nome: Q.NOMI.initial_POS,
        somma_risposte: posGrezza, valore_usato: posValore,
        saturazione: posSat, limite: posGrezza >= 0 ? 100 : 0
      });
    }

    var p0 = (opzioni.p0 === undefined) ? 70 : opzioni.p0;
    var nodo = {
      id: opzioni.id || 'da_questionario',
      descrizione: opzioni.descrizione || 'Scena descritta dal questionario',
      p0: p0,
      modificatori: {
        energia_e:      valori.E,
        informazione_i: valori.I,
        tempo_t:        valori.T,
        materiale_m:    valori.M,
        bonus_bp:       valori.BP,
        complessita_c:  valori.C
      },
      stato_prima: {
        stress_str:    Math.max(0, valori.initial_STR),
        posizione_pos: posValore,
        debito_deb:    Math.max(0, valori.DEB),
        bonus_bp:      Math.max(0, valori.initial_BP),
        rip:           categorie.rip || 'assente',
        macro:         categorie.macro || 'macro_0_episodio_isolato'
      },
      campo: valori.campo
        ? { attivo: true, etichetta: 'campo dichiarato dalle risposte', forza: valori.campo, tiro: null }
        : { attivo: false, forza: 0, tiro: null },
      supporto: {
        tipo:   categorie.supporto || 'assente',
        delega: categorie.delega || 'assente',
        riduzione_carico: valori.riduzione_carico
      },
      adattamento: {
        tipo: 'nessuno',
        disponibilita: categorie.adattamento || 'non_disponibile'
      }
    };

    /* ---- il modello sta ancora distinguendo qualcosa? ----
       Il libro impone un pavimento a 5 e un soffitto a 95. Sono limiti
       dichiarati, non errori: anche nella condizione peggiore resta un 5 %.
       Ma quando il calcolo grezzo finisce molto oltre il bordo, due
       situazioni diversissime ricevono lo stesso numero, e il numero smette
       di essere informativo. Va detto al lettore, non nascosto dietro il
       clamp. */
    var calcolo = N.calcolaPn(nodo, N.CONFIG);
    var risoluzione = leggiRisoluzione(calcolo, nodo);

    /* ---- quanta fiducia merita il risultato ---- */
    var risposteDate = elenco.length - senzaRisposta.length;
    var copertura = elenco.length ? risposteDate / elenco.length : 0;
    var qualita = categorie.qualita || null;

    return {
      nodo: nodo,
      nodo_normalizzato: N.normalizzaNodo(nodo),
      livello: livello,
      traccia: traccia,
      avvisi: avvisi,
      senza_risposta: senzaRisposta,
      secondari_dichiarati: secondari,
      calcolo: calcolo,
      risoluzione: risoluzione,
      copertura: Math.round(copertura * 100) / 100,
      qualita_dichiarata: qualita,
      non_certe: nonCerte,
      fiducia: fiducia(copertura, qualita, nonCerte),
      somme: somme,
      valori: valori,
      aggregazioni: aggregazioni,
      compressioni: compressioni,
      attenuazione: attenuazione,
      categorie: categorie
    };
  }

  function leggiRisoluzione(calcolo, nodo) {
    var g = calcolo.grezzo, pn = calcolo.pn;
    var minimo = N.CONFIG.probabilitaMinima, massimo = N.CONFIG.probabilitaMassima;

    if (g >= minimo && g <= massimo) {
      return {
        stato: 'piena', grezzo: g, pn: pn, oltre_il_bordo: 0,
        messaggio: 'Il numero è dentro la scala del modello. Vuol dire che qui una ' +
                   'risposta diversa cambierebbe il risultato. Il calcolo sta ancora ' +
                   'distinguendo.'
      };
    }
    if (g < minimo) {
      /* IL MENO E' UN SEGNO, NON UN TRATTINO DELLA TASTIERA.
         «Il calcolo grezzo da' -66» stampava il trattino, mentre in
         novantaquattro punti del progetto il meno e' il segno vero «−». Si
         vede, ed e' proprio la riga che il lettore guarda quando il numero
         e' andato fuori scala. */
      function segno(n) { return n < 0 ? '−' + Math.abs(n) : String(n); }
      var sotto = minimo - g;
      return {
        stato: sotto > 20 ? 'esaurita' : 'al_bordo',
        grezzo: g, pn: pn, oltre_il_bordo: sotto,
        messaggio: sotto > 20
          ? 'Il calcolo grezzo è la somma dei pezzi della formula, prima che il ' +
            'simulatore la riporti dentro i suoi confini. Qui dà ' + segno(g) + ': sono ' + sotto +
            ' punti sotto il minimo di ' + minimo +
            ' che il libro impone con il «taglio ai bordi». Da qui in giù il modello non distingue più. Una ' +
            'situazione appena sotto il minimo e una a ' + segno(g) + ' ricevono lo stesso identico ' + minimo +
            '. Non è un errore: è il limite dichiarato. Vuol dire però che la ' +
            'probabilità di questo gesto ha smesso di essere la cosa interessante. ' +
            'Quello che continua a distinguerle è lo stato: carico ' + nodo.stato_prima.stress_str +
            ', assetto ' + nodo.stato_prima.posizione_pos + ', debito ' + nodo.stato_prima.debito_deb + '.'
          : 'Il calcolo grezzo è la somma dei pezzi della formula, prima del taglio ai ' +
            'bordi. Qui dà ' +
            segno(g) + ', e il minimo è ' + minimo + '. Perciò il numero mostrato è ' +
                                                        'il minimo. Peggiorare ancora ' +
                                                        'le risposte non lo abbasserebbe.'
      };
    }
    var sopra = g - massimo;
    return {
      stato: sopra > 20 ? 'esaurita' : 'al_bordo',
      grezzo: g, pn: pn, oltre_il_bordo: sopra,
      messaggio: 'Il calcolo grezzo dà ' + g + ', e sta sopra il soffitto di ' + massimo +
        '. Ma il libro non concede mai la certezza. Perciò il numero mostrato resta ' + massimo + '.' +
        (sopra > 20 ? ' Aumentare ancora il grezzo non alza Pn oltre il limite. Gli effetti sugli altri stati vanno controllati a parte.' : '')
    };
  }

  /* La fiducia non e' una precisione statistica: e' una dichiarazione di
     quanto il numero poggia su qualcosa di osservato.

     `nonCerte` conta le risposte che, pur essendoci, non sono «certe» nel
     senso del capitolo 21: non le ha date la persona rispondendo alla
     domanda, ma un'inferenza (oggi: il testo libero della scena, per le
     condizioni ambientali). Il capitolo 21 descrive proprio questo caso
     alla voce «media»: «il nucleo della scena è chiaro, alcune variabili
     sono stimate o proxy». Una copertura piena non basta a dire «alta» se
     una parte di quella copertura nessuno l'ha confermata. */
  function fiducia(copertura, qualita, nonCerte) {
    nonCerte = nonCerte || 0;
    if (copertura < 0.6) {
      return { livello: 'bassa', motivo: 'Meno di sei domande su dieci hanno una risposta. Una parte rilevante del nodo usa quindi valori già impostati. Controlla ciò che manca prima di leggere il risultato.' };
    }
    if (qualita === 'bassa') {
      return { livello: 'bassa', motivo: 'Le risposte dichiarano informazioni indirette o soprattutto stimate. Il risultato dipende da queste ipotesi: prima di interpretarlo, controlla i dati più incerti.' };
    }
    if (copertura < 0.9 || qualita === 'media') {
      return { livello: 'media', motivo: 'La copertura delle domande o la qualità dichiarata delle risposte è intermedia. Controlla ciò che manca e ciò che è stimato. Il risultato resta una lettura interna al modello.' };
    }
    if (nonCerte > 0) {
      return { livello: 'media', motivo: (nonCerte === 1
          ? 'Hai risposto quasi a tutte le domande, ma una di quelle risposte non l’hai data tu: '
          : 'Hai risposto quasi a tutte le domande, ma ' + nonCerte + ' di quelle risposte non le hai date tu: ') +
        'vengono da un valore dedotto dal testo della scena, non ancora confermato. Il libro chiama ' +
        'questa provenienza «stimato», per distinguerla da una risposta certa. Controllala nella ' +
        'traccia qui sotto prima di leggere il risultato come definitivo.' };
    }
    return { livello: 'alta', motivo: 'Hai risposto ad almeno nove domande su dieci fra quelle previste e non risultano dichiarazioni di qualità ridotta. Questo indicatore non verifica la verità delle risposte. Resta un modello di ragionamento, non una previsione.' };
  }

  /* --------------------------------------------------------------------
     IL CANCELLO DI SICUREZZA
     Cinque domande prima di ogni calcolo. Se una sola ha risposta
     affermativa, il simulatore non calcola: il modello non è uno
     strumento clinico e non deve dare un numero in una situazione in cui
     un numero sarebbe fuori luogo.
     -------------------------------------------------------------------- */
  var MESSAGGI_STOP = {
    S1: 'C’è un rischio fisico immediato. Metti in sicurezza la situazione: il calcolo non serve adesso.',
    S2: 'C’è violenza, minaccia o paura di qualcuno. Questo non è un problema di probabilità: cerca aiuto, anche subito.',
    S3: 'Ci sono sintomi gravi in corso. Rivolgiti a un medico o ai soccorsi: il simulatore non valuta sintomi.',
    S4: 'Stai per prendere una decisione da cui poi è difficile tornare indietro, e non ti senti lucido. Rimandare di qualche ora si può quasi sempre. E quasi sempre è meglio.',
    S5: 'Quello che stai descrivendo non è una questione di gesti che riescono o no. Parlane con qualcuno di cui ti fidi. Oppure con un professionista.'
  };

  function verificaSicurezza(risposteSicurezza) {
    risposteSicurezza = risposteSicurezza || {};
    var attivati = [];
    for (var i = 0; i < Q.SICUREZZA.length; i++) {
      var s = Q.SICUREZZA[i];
      if (risposteSicurezza[s.id] === true || risposteSicurezza[s.id] === 'si') {
        attivati.push({ id: s.id, domanda: s.testo, messaggio: MESSAGGI_STOP[s.id] });
      }
    }
    var senzaRisposta = Q.SICUREZZA.filter(function (s) {
      return risposteSicurezza[s.id] === undefined;
    }).map(function (s) { return s.id; });

    return {
      puo_calcolare: attivati.length === 0 && senzaRisposta.length === 0,
      fermato: attivati.length > 0,
      motivi: attivati,
      senza_risposta: senzaRisposta
    };
  }

  var API = {
    SCALA_P0: SCALA_P0,
    SOGLIA_COMPRESSIONE: SOGLIA_COMPRESSIONE,
    DOMINIO: DOMINIO,
    DESTINAZIONE: DESTINAZIONE,
    PROVENIENZE: PROVENIENZE,
    MESSAGGI_STOP: MESSAGGI_STOP,
    comprimi: comprimi,
    saturazione: saturazione,
    pesiAttenuazione: pesiAttenuazione,
    aggrega: aggrega,
    componiNodo: componiNodo,
    verificaSicurezza: verificaSicurezza
  };

  globale.Composizione = API;
  if (typeof module !== 'undefined' && module.exports) { module.exports = API; }

})(typeof window !== 'undefined' ? window : globalThis);
