/* =============================================================================
   SIMULATORE 3.0 — L'indagine, a schermo
   =============================================================================
   Mette insieme tre cose che esistono gia': il lettore della scena in prosa
   (scena.js), il motore statistico (inferenza.js) e le figure (grafici.js).
   Qui non si calcola niente di nuovo: si decide che cosa mostrare, in che
   ordine, e soprattutto CHE COSA DIRE accanto a ogni figura.

   Il testo che accompagna un grafico non e' un ornamento. Un grafico letto
   senza sapere che cosa guardare produce due esiti, tutti e due cattivi: chi
   non capisce lo salta, e chi crede di capire ci legge dentro quello che si
   aspettava. Percio' ogni figura, qui, esce con la sua frase: che cosa dice,
   dove guardare, e che cosa NON si puo' concludere.
   ========================================================================== */

(function (globale) {
  'use strict';

  var Sc = globale.Scena, I = globale.Inferenza, G = globale.Grafici,
      D = globale.Disegno, MS = globale.MicroSemantica, Lg = globale.Lingua, semeDa = globale.semeDa;

  (function (mancanti) {
    if (!mancanti.length) { return; }
    throw new Error('indagine-ui.js: manca ' + mancanti.join(', ') +
      '. Ordine: calibrazione.js, lingua.js, casuale-mt.js, nucleo.js, stato.js, ' +
      'microsemantica.js, analisi.js, inferenza.js, lessico.js, scena.js, ' +
      'disegno.js, grafici.js, e solo dopo questo file.');
  }([['Scena', Sc], ['Inferenza', I], ['Grafici', G], ['Disegno', D], ['Lingua', Lg], ['semeDa (casuale-mt.js)', semeDa]]
    .filter(function (c) { return !c[1]; }).map(function (c) { return c[0]; })));

  function q(id) { return document.getElementById(id); }
  function esc(t) { return D.esc(t); }
  /* IL MENO E' QUELLO DELLA MATEMATICA (−), NON IL TRATTINO DELLA TASTIERA (-).
     G.num scriveva «-10,0 punti» a due righe da «4,6 %»: due segni per la
     stessa cosa nella stessa pagina. Si corregge qui, nell'unico punto da cui
     passano i numeri che questa pagina scrive. */
  function pct(q, d) { return G.pct(q, d).replace(/^-/, '−'); }
  function num(v, d) { return G.num(v, d).replace(/^-/, '−'); }

  /* «NEL 83,5 %» NON E' ITALIANO.
     Davanti a un numero l'articolo si elide secondo come il numero si LEGGE,
     non secondo la cifra con cui si scrive: 83 si legge «ottantatré», comincia
     per vocale, e vuole «nell'». Fra 0 e 100 le eccezioni sono poche e sono
     tutte qui: uno, otto, undici e gli ottanta cominciano per vocale; zero
     comincia per z e vuole «nello». Diciotto no — si legge «diciotto». */
  function articoloNel(q100, minuscolo) {
    var intero = parseInt(pct(q100), 10);
    var art = intero === 0 ? 'Nello '
      : (intero === 1 || intero === 8 || intero === 11 ||
         (intero >= 80 && intero <= 89)) ? 'Nell’' : 'Nel ';
    return minuscolo ? art.charAt(0).toLowerCase() + art.slice(1) : art;
  }
  function nelPerCento(q100, minuscolo) {
    return articoloNel(q100, minuscolo) + pct(q100) + '&nbsp;%';
  }

  /* UN NUMERO PICCOLO, A INIZIO FRASE, IN ITALIANO SI SCRIVE IN LETTERE.
     «4 leve che pareggiano» e' una didascalia, non una frase: chi legge la
     inciampa. Sopra il dieci la cifra torna comoda, e li' si lascia. */
  var A_PAROLE = ['zero', 'una', 'due', 'tre', 'quattro', 'cinque', 'sei', 'sette',
                  'otto', 'nove', 'dieci'];
  function aParole(n, maiuscola) {
    if (n < 0 || n > 10 || n !== Math.round(n)) { return Lg.intero(n); }
    var p = A_PAROLE[n];
    return maiuscola ? p.charAt(0).toUpperCase() + p.slice(1) : p;
  }

  /* --------------------------------------------------------------------------
     LE SCENE D'ESEMPIO
     Non sono decorative: ognuna ha un punto debole di natura diversa, cosi'
     chi apre la pagina per la prima volta vede subito che l'indagine trova
     cose diverse e non ripete sempre la stessa storia.
     -------------------------------------------------------------------------- */
  var ESEMPI = [
    { nome: 'La mattina che si incrina',
      cosa: 'un gesto facile in mezzo a una sequenza che si carica',
      testo: 'Non ho dormito quasi niente. Mi alzo dal letto, bevo un bicchiere d’acqua, ' +
             'preparo la colazione mentre vesto il bambino, cerco le chiavi che non trovo, ' +
             'sono in ritardo, esco di corsa.' },
    { nome: 'La pratica che non si chiude',
      cosa: 'insistere sullo stesso punto senza cambiare strada',
      testo: 'Devo caricare un documento sul portale. Inserisco il codice, il sito lo rifiuta, ' +
             'riprovo, provo da un altro computer, riprovo ancora, cerco il documento giusto, ' +
             'riprovo. Le istruzioni non sono chiare e ho poco tempo.' },
    { nome: 'Il turno pesante',
      cosa: 'molte cose da coordinare, con poco margine',
      testo: 'Sono già stanco da giorni. Preparo la terapia, controllo i parametri, ' +
             'rispondo al campanello, chiamo il collega, compilo la cartella, ' +
             'accompagno il paziente, l’ambiente è rumoroso e non c’è nessuno che aiuti.' },
    { nome: 'La sera in cui si insiste',
      cosa: 'una sequenza che parte già in rosso',
      testo: 'Sono esausto e ho male alla schiena. Rileggo il messaggio, scrivo una risposta ' +
             'dura, la cancello, la riscrivo, la rileggo, insisto ancora, non chiedo aiuto a ' +
             'nessuno.' }
  ];

  /* Una quota (0…1) detta come la direbbe una persona: «su cento giocate,
     quarantuno». Si arrotonda all'intero perché una fascia raccontata a
     giocate intere è una fascia che si immagina; i decimali, lì, sono finta
     precisione — la fascia stessa è larga molto più di un decimo. */
  function fraseCento(quota) {
    return String(Math.round(quota * 100));
  }

  var lettura = null, nodi = null, ind = null, leve = null, curva = null;

  /* QUANTI GESTI STANNO IN UN GRAFICO.
     Venti barre si leggono, duecento no: diventano una striscia grigia in cui
     non si distingue niente, e un grafico illeggibile e' peggio di nessun
     grafico, perche' occupa il posto di quello che serviva. Quando i gesti
     sono tanti si mostrano i piu' delicati — che sono quelli per cui si e'
     aperta la pagina — e si dice quanti ne restano fuori. */
  var MASSIMO_NEL_GRAFICO = 18;

  function daMostrare() {
    if (ind.nodi.length <= MASSIMO_NEL_GRAFICO) {
      return ind.nodi.map(function (n, k) { return k; });
    }
    return ind.classifica.slice(0, MASSIMO_NEL_GRAFICO).sort(function (a, b) { return a - b; });
  }

  function notaTagliati() {
    var fuori = ind.nodi.length - MASSIMO_NEL_GRAFICO;
    if (fuori <= 0) { return ''; }
    return '<p class="nota"><strong>Il grafico mostra i ' + MASSIMO_NEL_GRAFICO +
      ' gesti più delicati</strong> su ' + Lg.intero(ind.nodi.length) +
      '. Gli altri ' + Lg.intero(fuori) + ' esistono e sono stati calcolati. ' +
      'Sono solo meno interessanti per la domanda che questa pagina fa, e ' +
      'metterli tutti renderebbe la figura illeggibile.</p>';
  }

  /* --------------------------------------------------------------------------
     AVVIO
     -------------------------------------------------------------------------- */
  function avvia() {
    q('esempi').innerHTML = ESEMPI.map(function (e, i) {
      return '<button class="scelta-esempio" data-i="' + i + '" title="' + esc(e.cosa) + '">' +
        esc(e.nome) + '</button>';
    }).join('');
    Array.prototype.forEach.call(q('esempi').querySelectorAll('button'), function (b) {
      b.addEventListener('click', function () {
        q('scena').value = ESEMPI[parseInt(b.getAttribute('data-i'), 10)].testo;
        indaga();
      });
    });
    q('scena').value = ESEMPI[0].testo;
    q('indaga').addEventListener('click', indaga);
    q('qualeNodo').addEventListener('change', disegnaCascata);
    var stampa = q('stampa');
    if (stampa) { stampa.addEventListener('click', function () { window.print(); }); }
    indaga();
  }

  function dimmi(t) {
    q('statoIndagine').textContent = t;
  }

  /* --------------------------------------------------------------------------
     L'INDAGINE
     -------------------------------------------------------------------------- */
  /* L'INDAGINE SI FA IN TRE TEMPI, E OGNI TEMPO SI VEDE ARRIVARE.
     Indagare una scena vuol dire tre calcoli lunghi, uno dietro l'altro: la
     scena rigiocata migliaia di volte, poi sedici varianti per le leve, poi
     ventuno varianti per la curva del carico. Prima succedevano tutti dentro
     la stessa chiamata: con diecimila giocate erano quattro secondi in cui la
     pagina non ridisegnava niente e non rispondeva al mouse. Chi guardava non
     vedeva un calcolo in corso, vedeva una pagina rotta.

     Adesso i tre calcoli sono tre tempi separati, e fra l'uno e l'altro la
     pagina riprende fiato. Le figure che un tempo ha già prodotto si
     disegnano subito, invece di aspettare la fine di tutto: le prime cinque
     sezioni si possono leggere mentre le leve si stanno ancora calcolando.
     I numeri non cambiano di una virgola: cambia solo quando si vedono. */
  /* CHI PARTE DOPO VINCE, E QUELLO PRIMA SI FERMA.
     Con l'indagine in tre tempi passano dei secondi fra il primo e l'ultimo. In
     quei secondi si può cliccare un altro esempio, e allora due indagini
     correrebbero insieme scrivendo nelle stesse figure: si vedrebbero le leve
     di una scena accanto alla mappa di un'altra. Ogni indagine prende un
     numero; se quando tocca a lei quel numero non è più l'ultimo, si ferma. */
  var giroIndagine = 0;

  function indaga() {
    var testo = q('scena').value.trim();
    if (!testo) { dimmi('Scrivi una scena, o scegli un esempio qui sopra.'); return; }
    dimmi('Primo tempo di tre: sto ripetendo la scena…');

    var mioGiro = ++giroIndagine;
    var t0 = (globale.performance && performance.now) ? performance.now() : Date.now();
    var rip = parseInt(q('ripetizioni').value, 10) || 2000;
    var seme = semeDa(q('seme').value);
    var cal = MS ? MS.CALIBRAZIONE : null;

    /* si lascia respirare la pagina, se no il messaggio non si vede mai */
    setTimeout(function () {
      if (mioGiro !== giroIndagine) { return; }
      lettura = Sc.leggi(testo, { caricoBase: parseInt(q('caricoBase').value, 10) || 45 });
      nodi = Sc.perIlMotore(lettura.nodi);

      if (!nodi.length) {
        dimmi('');
        q('lettura').innerHTML = '<strong>Non ho riconosciuto nessun gesto in questa scena.</strong> ' +
          'Il vocabolario cerca dei verbi d’azione. Prova a scrivere che cosa fai, non solo ' +
          'come stai. «Mi alzo», «bevo», «esco» sono gesti. «Sono stanco» è contesto, e da solo ' +
          'non fa una sequenza da indagare.';
        ['mappa', 'scatole', 'cascata', 'rottura', 'sopravvivenza', 'tornado',
         'curvaCarico', 'precisione', 'verdettoMappa', 'letturaCascata',
         'letturaLeve', 'letturaCarico'].forEach(function (id) { q(id).innerHTML = ''; });
        return;
      }

      ind = I.indaga(nodi, { ripetizioni: rip, seme: seme, calibrazione: cal });
      if (ind.troppo_grande) {
        dimmi('');
        q('lettura').innerHTML = '<strong>Questa scena è troppo grande per essere indagata ' +
          'qui dentro.</strong> ' + esc(ind.perche);
        return;
      }
      disegnaIndagine();
      dimmi('Secondo tempo di tre: sto provando le modifiche, una per volta…');

      setTimeout(function () {
        if (mioGiro !== giroIndagine) { return; }
        /* le leve e la curva costano molto: si scala il numero di ripetizioni, e lo
           si dichiara invece di nasconderlo */
        leve = I.seCambiassi(nodi, { ripetizioni: Math.min(1000, Math.max(300, Math.round(rip / 3))),
                                     seme: seme, calibrazione: cal });
        disegnaLeve();
        dimmi('Terzo tempo di tre: sto facendo scorrere il carico di partenza…');

        setTimeout(function () {
          if (mioGiro !== giroIndagine) { return; }
          curva = I.daDoveParti(nodi, { ripetizioni: Math.min(400, Math.max(120, Math.round(rip / 8))),
                                        seme: seme, passo: 5, calibrazione: cal });
          disegnaCurva();
          if (globale.Glossario && globale.Glossario.decoraTutte) { globale.Glossario.decoraTutte(); }
          var t1 = (globale.performance && performance.now) ? performance.now() : Date.now();
          dimmi('Ci sono voluti ' + num((t1 - t0) / 1000, 1) + ' secondi, e tutto è successo ' +
            'dentro questa pagina: niente è uscito da questo computer.');
        }, 20);
      }, 20);
    }, 30);
  }

  function nomeNodo(k) {
    var d = ind.nodi[k].descrizione;
    return (k + 1) + ' · ' + d;
  }

  /* Tutto quello che si può disegnare con il primo tempo soltanto: le sezioni
     dalla 2 alla 5, più la precisione, che parla dell'indagine e non delle
     leve. Le leve (sezione 6) e la curva (sezione 7) arrivano dopo. */
  function disegnaIndagine() {
    var gesti = ind.nodi.length;
    q('lettura').innerHTML =
      '<strong>Ho letto ' + Lg.plurale(gesti, 'gesto', 'gesti') + '</strong>' +
      (lettura.contesto && lettura.frammenti
        ? ' e ' + Lg.plurale(
            lettura.frammenti.filter(function (f) { return f.tipo === 'contesto'; }).length,
            'pezzo di contesto', 'pezzi di contesto') +
          ', cioè le frasi che dicono come stai, non che cosa fai'
        : '') +
      ', e ho ripetuto la scena ' + Lg.intero(ind.ripetizioni) + ' volte. ' +
      'Ogni gesto è stato valutato una volta per ripetizione, quindi in tutto le valutazioni ' +
      'sono ' + Lg.intero(ind.valutazioni) + '. Ma il <strong>campione</strong> non è quello. ' +
      'Campione vuol dire su quanti casi davvero indipendenti è calcolato un numero, e qui ' +
      'i casi indipendenti sono <strong>' + Lg.intero(ind.ripetizioni) + '</strong>, cioè ' +
      'quante volte la scena è stata rifatta da capo. I gesti di una stessa ripetizione, invece, ' +
      'sono legati l’uno all’altro: se il primo va male, il secondo parte più carico. Contarli ' +
      'uno per uno stringerebbe tutti gli intervalli, senza una sola informazione in più.';

    if (ind.ridotto) {
      q('lettura').innerHTML += '<br><br><strong>Ho dovuto ridurre le ripetizioni.</strong> ' +
        esc(ind.ridotto.perche);
    }
    disegnaMappa();
    disegnaScatole();
    var sel = q('qualeNodo');
    sel.innerHTML = daMostrare().map(function (k) {
      return '<option value="' + k + '"' + (k === ind.classifica[0] ? ' selected' : '') + '>' +
        esc(nomeNodo(k)) + (k === ind.classifica[0] ? ' — il più delicato' : '') + '</option>';
    }).join('');
    disegnaCascata();
    disegnaRottura();
    disegnaPrecisione();
    /* le due figure che ancora non ci sono si annunciano, invece di lasciare
       due buchi bianchi in mezzo alla pagina */
    q('tornado').innerHTML = '<p class="nota">Sto provando le modifiche, una per volta. ' +
      'Ogni modifica è una scena intera da rifare da capo, e sono sedici.</p>';
    q('letturaLeve').innerHTML = '';
    q('curvaCarico').innerHTML = '<p class="nota">Questa curva arriva per ultima: fa scorrere ' +
      'il carico di partenza da 0 a 100, e per ogni valore ripete la scena.</p>';
    q('letturaCarico').innerHTML = '';
    if (globale.Glossario && globale.Glossario.decoraTutte) { globale.Glossario.decoraTutte(); }
  }

  /* ---- 2 · la mappa ------------------------------------------------------ */
  function disegnaMappa() {
    var voci = daMostrare().map(function (k) {
      var n = ind.nodi[k];
      return { etichetta: nomeNodo(k), quota: n.rischio.quota,
               ic: { basso: n.rischio.basso, alto: n.rischio.alto },
               evidenzia: k === ind.classifica[0],
               nota: 'Pn media ' + num(n.pn.media, 0) };
    });
    q('mappa').innerHTML = G.barreConIntervallo(voci, {
      titoloX: 'quante volte questo gesto è andato male, su ' +
               Lg.intero(ind.ripetizioni) + ' ripetizioni',
      descrizione: 'Rischio di ciascun gesto della scena, con l’intervallo di confidenza'
    }) + notaTagliati();

    var primo = ind.nodi[ind.classifica[0]];
    var c = ind.confronto_ai_vertici;

    /* UN SOLO GESTO NON HA UN «PUNTO PIU' DELICATO».
       Con una scena di un gesto la pagina scriveva «il punto più delicato è il
       gesto 1»: un superlativo su un insieme di uno, che e' una frase vuota e
       fa sospettare che il resto sia scritto con la stessa attenzione. Un
       gesto solo si annuncia per quello che e'. */
    var unoSolo = ind.nodi.length === 1;
    var h = '<p><strong>' +
      (unoSolo
        ? 'La scena ha un gesto solo, «' + esc(primo.descrizione) + '».'
        : 'Il punto più delicato è il gesto ' + (ind.classifica[0] + 1) +
          ', «' + esc(primo.descrizione) + '».') +
      '</strong> È andato male ' +
      pct(primo.rischio.quota) + ' volte su cento, e la stima sta fra ' +
      pct(primo.rischio.basso) + '&nbsp;% e ' + pct(primo.rischio.alto) + '&nbsp;%. ' +
      'La sua probabilità media è ' + num(primo.pn.media, 0) + '. ' +
      'Con un dado da 1 a 100 che non è truccato, questo basta a spiegare tutto: il rischio che vada ' +
      'male è esattamente cento meno la probabilità, diviso cento.' +
      /* IL NUMERO CON ACCANTO LA FRASE CHE DICE COSA VUOL DIRE.
         «Fra 22,1 % e 27,0 %» è una fascia, e una fascia si legge solo se
         qualcuno dice di che cosa. Qui sotto la stessa fascia è detta contando
         giocate: sono le stesse cifre, ma diventano una cosa che si immagina. */
      ' <b>Detto contando le ripetizioni:</b> su cento ripetizioni come questa, il gesto ' +
      'riesce fra ' + fraseCento(1 - primo.rischio.alto) + ' e ' +
      fraseCento(1 - primo.rischio.basso) + ' volte, e va male fra ' +
      fraseCento(primo.rischio.basso) + ' e ' + fraseCento(primo.rischio.alto) + '. ' +
      'Non è un numero preciso, ed è giusto così, perché ' + Lg.intero(ind.ripetizioni) +
      ' ripetizioni non bastano a dire di più.' +
      (unoSolo
        ? ' Con un gesto solo non c’è nessuna classifica da stilare, e nessun confronto da ' +
          'fare. Quello che segue racconta questo gesto, senza metterlo in fila con altri.'
        : '') + '</p>';

    if (c) {
      var secondo = ind.nodi[c.secondo];
      h += '<p class="nota">' + (c.distinguibili
        ? '<strong>Il confronto esplorativo distingue i primi due.</strong> In ' +
          Lg.plurale(c.solo_primo, 'ripetizione', 'ripetizioni') + ' il gesto ' + (c.primo + 1) +
          ' è andato male e il gesto ' + (c.secondo + 1) + ' no. Il contrario è successo in ' +
          Lg.intero(c.solo_secondo) + '. È un segnale della prova, non una certezza.'
        : '<strong>Attenzione: la differenza con il secondo NON è distinguibile.</strong> ' +
          'Il gesto ' + (c.primo + 1) + ' e il gesto ' + (c.secondo + 1) + ' si scambiano il ' +
          'primato troppo spesso. Non si può dire quale sia davvero il peggiore: ' +
          Lg.plurale(c.solo_primo, 'ripetizione', 'ripetizioni') + ' contro ' +
          Lg.intero(c.solo_secondo) + '. Con più ripetizioni forse si separerebbero. ' +
          'Per adesso vanno trattati come due punti deboli, non come uno.') +
        '<br><em>Il confronto è fatto con la prova di McNemar, che è quella giusta quando ' +
        'i due gesti vengono dalle stesse ripetizioni. Nella stessa mattina, infatti, se il primo ' +
        'va male il secondo parte più carico: non sono indipendenti, e quindi non si possono ' +
        'confrontare come se lo fossero. I primi due gesti sono scelti dopo aver visto i ' +
        'dati, quindi questo confronto resta esplorativo e non tiene conto di quella ' +
        'selezione.</em></p>';
    }
    q('verdettoMappa').innerHTML = h;
  }

  /* ---- 3 · le scatole ---------------------------------------------------- */

  /* LA FIGURA CHE SMENTIVA LA PAGINA, E COME SI E' RIMESSA IN PARI.
     In cima la pagina dice che dal secondo gesto in poi la probabilita' puo'
     smettere di essere un numero fisso. Poi arriva questa figura e con una
     scena da dodici gesti fa dodici scatole tutte a ±0,0: chi legge trova una
     premessa e la sua smentita a due schermate di distanza, e non ha modo di
     sapere quale delle due e' rotta.
     Nessuna delle due lo e'. Con la calibrazione misurata ogni gesto passa al
     successivo il 4,6 % del proprio effetto, e su una scena corta il carico si
     muove di una frazione di punto; la penalita' del carico, poi, e' una
     tabella a gradini, quindi finche' non si scavalca un gradino la Pn non si
     muove affatto. E' il modello, ed e' istruttivo — ma va detto SOTTO LA
     FIGURA, con i numeri di questa scena, non lasciato indovinare. */
  function notaScatolePiatte() {
    var mostrati = daMostrare();
    var mosse = mostrati.filter(function (k) { return ind.nodi[k].pn.ds > 0.05; });
    var primo = ind.nodi[0].stato_prima.carico, ultimo = ind.nodi[ind.nodi.length - 1].stato_prima.carico;
    var corsa = ultimo.massimo - primo.minimo;

    /* con un gesto solo non c'e' nessun «prima» da cui dipendere, e parlare di
       «tutte le scatole» e del «gesto dopo» sarebbe raccontare una scena che
       non c'e' */
    if (ind.nodi.length === 1) {
      return '<p class="nota"><strong>La scatola è ridotta a una riga, e non poteva essere ' +
        'altrimenti.</strong> La scena ha un gesto solo. Prima di lui non è successo niente, ' +
        'quindi la sua probabilità è la stessa in tutte le ripetizioni. Non ha modo di ' +
        'muoversi. Quello che il dado decide è l’esito, non la probabilità. Per vedere ' +
        'una scatola aprirsi davvero serve una scena con almeno un gesto prima.</p>';
    }

    if (mosse.length) {
      return '<p class="nota"><strong>' + Lg.plurale(mosse.length, 'scatola', 'scatole') +
        ' su ' + Lg.intero(mostrati.length) + ' ' +
        (mosse.length === 1 ? 'ha una larghezza vera' : 'hanno una larghezza vera') +
        '.</strong> Vuol dire che lì la probabilità del gesto è cambiata da una ripetizione ' +
        'all’altra. Il carico lasciato dai gesti prima ha scavalcato un gradino della ' +
        'tabella. Così il gesto si è trovato più fragile in certe ripetizioni che in altre. È ' +
        'proprio quello che questa pagina cerca.</p>';
    }
    return '<p class="nota"><strong>Tutte le scatole sono ridotte a una riga, e c’è una ' +
      'ragione precisa.</strong> ' +
      'Con la calibrazione misurata ogni gesto passa al gesto dopo soltanto il 4,6 % del ' +
      'proprio effetto. In tutta questa scena il carico si è mosso da ' + num(primo.minimo, 0) +
      ' a ' + num(ultimo.massimo, 0) + ', cioè ' +
      (corsa < 1 ? 'meno di un punto' : Lg.plurale(Math.round(corsa), 'punto', 'punti')) +
      '. E la penalità del carico non scende poco per volta: scende a gradini. Finché il ' +
      'carico non ne scavalca uno, la probabilità del gesto seguente resta esattamente la ' +
      'stessa. Quindi qui la risposta alla domanda «quanto la probabilità di questo gesto ' +
      'dipende da com’è andata prima?» è: <strong>niente affatto</strong>. Non è una figura ' +
      'rotta. È una figura che dice di no. ' +
      /* NIENTE RICETTE CHE NON FUNZIONANO.
         Prima qui c'era scritto «per vederle aprirsi serve una scena piu'
         lunga, o una che parta gia' molto carica»: un consiglio che si
         smentisce da solo, perche' con ventiquattro gesti e novantacinque di
         carico di partenza le scatole restano chiuse lo stesso. Con il
         trasferimento al 4,6 % restano chiuse quasi sempre, e la cosa onesta
         e' dirlo — indicando dove quel numero si puo' cambiare davvero. */
      'E qui va detto qualcosa che vale per tutta la pagina. Con il trasferimento misurato al ' +
      '4,6 % queste scatole restano chiuse quasi sempre: non basta allungare la scena, e non ' +
      'basta farla partire carica. Perché una si apra, il carico deve cambiare fra una ripetizione ' +
      'e l’altra proprio di quel tanto che serve a scavalcare un gradino, e sono coincidenze ' +
      'rare. A spalancarle è la calibrazione storica, quella di prima che il 4,6 % venisse ' +
      'misurato, e la si può provare in <a href="MONTECARLO.html">Mille volte la stessa ' +
      'scena</a>.</p>';
  }

  function disegnaScatole() {
    q('scatole').innerHTML = G.scatolaBaffi(daMostrare().map(function (k) {
      return { etichetta: nomeNodo(k), r: ind.nodi[k].pn };
    }), { descrizione: 'Come si distribuisce la probabilità di ciascun gesto sulle ripetizioni' }) +
      notaTagliati() + notaScatolePiatte();
  }

  /* ---- 4 · la cascata ---------------------------------------------------- */
  function disegnaCascata() {
    if (!ind) { return; }
    var k = parseInt(q('qualeNodo').value, 10) || 0;
    var n = ind.nodi[k], s = n.scomposizione;
    var voci = [];
    voci.push({ etichetta: I.NOME_TERMINE.P0, valore: s.P0 });
    ['E', 'I', 'T', 'M', 'BP', 'C', 'piSTR', 'DEB'].forEach(function (t) {
      voci.push({ etichetta: I.NOME_TERMINE[t], valore: s[t] });
    });
    if (Math.abs(s.taglio) > 0.05) {
      voci.push({ etichetta: 'il taglio ai bordi', valore: s.taglio });
    }
    q('cascata').innerHTML = G.cascata(voci, {
      descrizione: 'Scomposizione esatta della probabilità del gesto ' + (k + 1)
    });

    /* la lettura: si nomina il termine che pesa di piu' in negativo */
    var peggio = null;
    ['E', 'I', 'T', 'M', 'C', 'piSTR', 'DEB'].forEach(function (t) {
      if (s[t] < 0 && (peggio === null || s[t] < s[peggio])) { peggio = t; }
    });
    var h = '<p><strong>Il gesto ' + (k + 1) + ' parte da ' + num(s.P0, 0) + '</strong>, ' +
      'che è quanto vale di suo, prima che le condizioni dicano la loro. ';
    if (peggio) {
      h += 'Poi la voce che toglie di più è <strong>' + esc(I.NOME_TERMINE[peggio]) +
        '</strong>, con ' + num(s[peggio], 1) + ' punti. ';
      if (peggio === 'piSTR') {
        /* PER IL PRIMO GESTO NON C'E' NESSUN «PRIMA».
           La frase generica diceva «e' stato reso difficile da quello che e'
           successo prima»: davanti al gesto 1 e' falsa, perche' prima non e'
           successo niente. Li' il carico e' quello con cui la scena comincia,
           e nominarlo per quello che e' cambia anche la conclusione pratica —
           non si guarda indietro nella scena, si guarda a come ci si e'
           arrivati. */
        h += 'E questo è il punto che merita attenzione. Il carico non è una condizione ' +
          'del gesto: è quello che la persona si porta dietro. Vuol dire che questo gesto ' +
          'non è difficile in sé. È stato reso difficile ' +
          (k === 0
            ? 'dal carico con cui la scena è cominciata, prima ancora che cominciasse. ' +
              'Su questo gesto la sequenza non può niente. Quello che si può cambiare sta ' +
              'a monte della scena. '
            : 'da quello che è successo nei gesti prima, oppure dal carico con cui la scena ' +
              'è cominciata. ');
      } else if (peggio === 'C') {
        h += 'Ogni pezzo da coordinare pesa cinque punti, sempre. È la voce ' +
          'più dura della formula. Però è anche quella su cui si agisce più ' +
          'facilmente, perché spesso un pezzo si può togliere, o rimandare. ';
      } else if (peggio === 'DEB') {
        h += 'Il debito da insistenza è raro. Proprio per questo, quando compare, ' +
          'vuol dire qualcosa. Si è insistito sulla stessa strada, senza ' +
          'cambiarla e senza una pausa vera. ';
      }
    }
    h += 'Alla fine la probabilità è <strong>' + num(n.pn.media, 0) + '</strong>. ' +
      'Se sommi con la calcolatrice i numeri scritti sopra le colonne, ottieni esattamente ' +
      'questo. La formula è una somma, e qui non c’è nessuna approssimazione.</p>';
    if (n.dipende_dal_prima > 0.5) {
      h += '<p class="nota">Questa probabilità <strong>non è sempre la stessa</strong>. ' +
        'Oscilla di ±' + num(n.dipende_dal_prima, 1) + ' punti fra una ripetizione e l’altra. ' +
        'Nel peggiore dei casi è scesa a ' + num(n.pn.minimo, 0) + '. La colonna che ' +
        'cambia è quella del carico. E cambia per quello che è successo nei gesti prima.</p>';
    } else if (k === 0) {
      h += '<p class="nota">Questo è il primo gesto della scena. Prima di lui non è successo ' +
        'niente, quindi la sua probabilità è la stessa in tutte le ripetizioni. È l’unico gesto ' +
        'di cui si può dire «vale tanto», senza aggiungere «dipende».</p>';
    }
    q('letturaCascata').innerHTML = h;
  }

  /* ---- 5 · dove si rompe -------------------------------------------------- */
  function disegnaRottura() {
    var mostra = daMostrare();
    var voci = ind.rottura.per_nodo.filter(function (r) {
      return mostra.indexOf(r.indice) >= 0;
    }).map(function (r) {
      return { etichetta: nomeNodo(r.indice), quota: r.quota,
               ic: { basso: r.ic.basso, alto: r.ic.alto },
               evidenzia: false, colore: 'var(--attenzione)' };
    });
    var max = Math.max.apply(null, voci.map(function (v) { return v.ic.alto; }).concat([0.1]));

    /* L'ARROTONDAMENTO CHE NON TORNA, DETTO PRIMA CHE LO TROVI TU.
       Le barre e la riga qui sotto sono sei quote arrotondate al decimo, e sei
       arrotondamenti sommati danno 100,2 invece di 100. Chi prende la
       calcolatrice se ne accorge in dieci secondi, e da quel momento non si
       fida piu' di nessun numero della pagina. Il rimedio non e' truccare una
       delle sei: e' mostrare i conteggi interi, che sommano esatti, e dire da
       dove viene la differenza. */
    var somma = ind.rottura.per_nodo.reduce(function (t, r) {
      return t + Math.round(r.quota * 1000) / 10;
    }, Math.round(ind.rottura.quota_mai * 1000) / 10);
    var scarto = Math.round((somma - 100) * 10) / 10;
    /* con dei gesti tagliati fuori dalla figura la somma NON deve fare cento, e
       spiegarne lo scarto direbbe una cosa falsa: la nota tace, e a dire che
       cosa manca ci pensa notaTagliati() */
    if (ind.nodi.length > MASSIMO_NEL_GRAFICO) { scarto = 0; }

    q('rottura').innerHTML = G.barreConIntervallo(voci, {
      massimo: Math.min(1, max * 1.1),
      titoloX: 'quante ripetizioni si sono rotte QUI per la prima volta',
      descrizione: 'Distribuzione del primo gesto andato male'
    }) +
      /* «NELLO 0,0 % DELLE GIOCATE... SONO 0 GIOCATE SU 2.000» E' UNA FRASE CHE
         GIRA A VUOTO. Quando il conteggio e' zero, o quando ci sono arrivate
         tutte, la percentuale non aggiunge niente e il numero secco dice
         meglio. Sono i due estremi, e sono proprio i casi in cui chi legge
         vuole una risposta netta. */
      '<p class="nota">' +
      (ind.rottura.mai === 0
        ? '<strong>Nessuna ripetizione è arrivata in fondo intatta.</strong> In tutte e ' +
          Lg.intero(ind.ripetizioni) + ' le ripetizioni, prima della fine, almeno un gesto è ' +
          'andato male.'
        : ind.rottura.mai === ind.ripetizioni
          ? '<strong>Non si è mai rotto niente.</strong> Tutte e ' +
            Lg.intero(ind.ripetizioni) + ' le ripetizioni sono arrivate in fondo con ogni gesto ' +
            'riuscito.'
          : nelPerCento(ind.rottura.quota_mai) + ' delle ripetizioni non si è rotto niente. La ' +
            'scena è arrivata in fondo con tutti i gesti riusciti: sono ' +
            Lg.plurale(ind.rottura.mai, 'ripetizione', 'ripetizioni') + ' su ' +
            Lg.intero(ind.ripetizioni) + '.') + '</p>' +
      (scarto !== 0
        ? '<p class="nota"><strong>Se sommi queste percentuali non fanno 100, e non è un ' +
          'errore.</strong> Fanno ' + num(somma, 1) + '. Ogni quota è arrotondata al decimo. ' +
          'Tutti quegli arrotondamenti messi in fila si portano dietro ' +
          (scarto > 0 ? 'un avanzo' : 'un ammanco') + ' di ' +
          num(Math.abs(scarto), 1) + '. I conteggi invece tornano esatti. Le ripetizioni rotte sono ' +
          Lg.intero(ind.rottura.per_nodo.reduce(function (t, r) { return t + r.quante; }, 0)) +
          ', quelle arrivate intatte sono ' + Lg.intero(ind.rottura.mai) + '. Insieme fanno ' +
          Lg.intero(ind.ripetizioni) + ', senza avanzi. Meglio farti vedere la ' +
          'percentuale che non torna, e dirti da dove viene, che aggiustarne una di ' +
          'nascosto.</p>'
        : '');

    q('sopravvivenza').innerHTML = G.sopravvivenza(ind.rottura.sopravvivenza, {
      titoloX: 'quanti gesti sono già stati fatti',
      descrizione: 'Curva di sopravvivenza: quante ripetizioni arrivano intatte a ciascun gesto'
    });
  }

  /* ---- 6 · le leve -------------------------------------------------------- */
  function disegnaLeve() {
    var righe = leve.righe.map(function (r) {
      return { etichetta: r.leva.nome, differenza: r.differenza || 0,
               ic: r.ic, conta: !!r.conta, applicabile: r.applicabile,
               nota: r.perche };
    });
    q('tornado').innerHTML = G.tornado(righe, {
      descrizione: 'Effetto di ciascuna modifica sulla probabilità che la scena arrivi in fondo intatta'
    });

    q('tornado').innerHTML += '<p class="nota">La fascia qui sopra confronta le ripetizioni a ' +
      'coppie, non come due gruppi separati. Il calcolo usa il metodo di <strong>Wilson</strong>, ' +
      'una formula che regge bene anche vicino a zero o a cento, e usa ' +
      '<strong>Bonferroni</strong>, per la ragione che la sezione 8 spiega. Vale per ' +
      'ciascuna modifica presa da sola, non per la scelta fra tutte le leve insieme. Leva è ' +
      'il nome che il simulatore dà a una modifica: un valore della formula mosso di un ' +
      'passo. La classifica resta esplorativa.</p>';
    var utili = leve.righe.filter(function (r) { return r.applicabile && r.conta; });
    var h = '<p>Qui una scena è intatta se tutti i gesti riescono al tiro, prima che ' +
      'intervenga il campo attivo, cioè quello che l’ambiente fa dopo il dado. Non vuol ' +
      'dire esiti buoni o un costo basso: vuol dire soltanto che nessun gesto è andato ' +
      'male. La scena risulta intatta ' +
      articoloNel(leve.base.quota, true) + '<strong>' + pct(leve.base.quota) +
      '&nbsp;%</strong> delle ripetizioni. ';
    if (!utili.length) {
      h += 'Nessuna delle modifiche provate sposta questo numero abbastanza. Con ' +
        Lg.intero(leve.ripetizioni) + ' ripetizioni, il loro effetto non si distingue dal caso. ' +
        'Non vuol dire che non servano: vuol dire che per dirlo servirebbero più ripetizioni.</p>';
    } else {
      var m = utili[0];
      h += 'La modifica che sposta di più è <strong>«' + esc(m.leva.nome) + '»</strong>. ' +
        'Porta quel numero a ' + pct(m.dopo) + '&nbsp;%. Sono ' +
        (m.differenza > 0 ? '+' : '') + pct(m.differenza) +
        ' punti percentuali di scene arrivate in fondo intatte.</p>' +
        /* LA DIFFERENZA APPAIATA, DETTA CONTANDO LE GIOCATE.
           «Fascia da +0,02 a +0,09» non dice niente a chi legge. Le stesse
           cifre raccontate come giocate — quante sono migliorate, quante
           peggiorate, e dentro quale fascia sta la differenza su cento — sono
           la stessa statistica e si capiscono senza saperla. */
        '<p class="nota"><b>Detto contando le ripetizioni.</b> Le due versioni sono state ' +
        'ripetute con gli stessi dadi, quindi ogni ripetizione ha la sua gemella. Su ' +
        Lg.intero(m.ic.n) + ' coppie, la modifica ne ha salvate ' + Lg.intero(m.ic.migliora) +
        ' e ne ha rovinate ' + Lg.intero(m.ic.peggiora) + '. Tutte le altre sono finite ' +
        'uguali, e quelle non dicono niente né a favore né contro. La fascia ' +
        'al 95 % è questa: su cento ripetizioni come queste, la modifica ne fa arrivare in ' +
        'fondo intatte ' +
        (m.ic.alto < 0
          ? 'fra ' + fraseCento(-m.ic.alto) + ' e ' + fraseCento(-m.ic.basso) + ' in meno'
          : 'fra ' + fraseCento(m.ic.basso) + ' e ' + fraseCento(m.ic.alto) + ' in più') +
        '.</p>';
      if (m.effetto_diretto_su_pn) {
        var indiretto = m.guadagno_su_pn - m.effetto_diretto_su_pn;
        h += '<p class="nota"><strong>E qui c’è il punto che vale la pena guardare.</strong> ' +
          'Attenzione a non confondere due numeri che si somigliano. Quelli qui sopra sono ' +
          'punti percentuali di <em>scene intatte</em>; questi qui sotto sono punti di ' +
          '<em>probabilità del singolo gesto</em>. Sulla carta quella modifica vale ' +
          Lg.plurale(Math.round(m.effetto_diretto_su_pn), 'punto grezzo',
                    'punti grezzi') + ', cioè i punti scritti nella formula, prima di ogni ' +
          'altro effetto: lo dice la formula, ed è aritmetica. Misurata sulla scena ' +
          'intera, però, ne ha fatti guadagnare ' + num(m.guadagno_su_pn, 1) + '. ' +
          (Math.abs(indiretto) < 0.3
            ? 'I due numeri quasi coincidono. Questo non esclude effetti successivi che si ' +
              'compensano: per distinguerli bisognerebbe seguire la scena gesto per gesto.'
            : (indiretto > 0
              ? 'La differenza, ' + num(indiretto, 1) + ' punti, è il guadagno che passa ' +
                'attraverso lo stato, cioè il carico che un gesto lascia al gesto dopo. Un ' +
                'gesto che riesce lascia meno carico, e meno carico rende più facili anche ' +
                'i gesti dopo. È la parte che nessuno riesce a calcolare a mente, ed è la ' +
                'ragione per cui una simulazione serve.'
              : 'La differenza, ' + num(indiretto, 1) + ' punti, va nella direzione opposta. ' +
                'Il guadagno si perde per strada. Il taglio ai bordi, o la saturazione (il ' +
                'carico arrivato a cento, che non può più salire), se ne mangiano una ' +
                'parte.')) + '</p>';
      }
    }
    /* QUANDO DUE LEVE PAREGGIANO, NON E' UN ERRORE — ED E' LA COSA PIU'
       INTERESSANTE CHE QUESTO GRAFICO SAPPIA DIRE.
       Con gli stessi dadi, due modifiche che valgono gli stessi punti di
       probabilità ribaltano le stesse identiche ripetizioni, e quindi danno lo
       stesso numero. Succede spesso con il carico, e la ragione sta nel libro:
       la penalità del carico non è una moltiplicazione, è una tabella a
       gradini. Partendo da 45, togliere dieci punti e togliere tutto valgono
       uguale, perché quello che conta non è quanto scendi: è se scavalchi un
       gradino. */
    var pari = {};
    leve.righe.filter(function (r) { return r.applicabile && r.conta; }).forEach(function (r) {
      var chiave = r.differenza.toFixed(6);
      (pari[chiave] = pari[chiave] || []).push(r);
    });
    var gruppo = null;
    Object.keys(pari).forEach(function (k) {
      if (pari[k].length > 1 && (!gruppo || pari[k].length > gruppo.length)) { gruppo = pari[k]; }
    });
    if (gruppo) {
      var nomi = gruppo.map(function (r) { return '«' + esc(r.leva.nome) + '»'; });
      var suCarico = gruppo.filter(function (r) {
        return r.leva.dove === 'stato_prima.stress_str'; }).length > 0;
      h += '<p class="nota"><strong>' + aParole(gruppo.length, true) + ' ' +
        Lg.concorda(gruppo.length, 'leva che pareggia', 'leve che pareggiano') +
        ', e non è un errore.</strong> ' +
        Lg.elenco(nomi) + ' spostano esattamente lo stesso numero di ripetizioni. ' +
        'Succede perché valgono gli stessi punti di probabilità. Con gli stessi tiri di dado, ' +
        'punti uguali ribaltano le stesse identiche ripetizioni. Ed è proprio per questo che ' +
        'si riusano gli stessi tiri.' +
        (suCarico
          ? ' Nel caso del carico c’è anche una ragione in più, e viene dal libro. La penalità ' +
            'del carico <strong>non è una moltiplicazione. È una tabella a gradini</strong>. ' +
            'Quello che conta non è di quanto scendi. Conta se scavalchi un gradino. E allora ' +
            'togliere dieci punti, o toglierli tutti, può valere uguale.'
          : '') + '</p>';
    }

    h += '<p class="nota">Le leve sono state misurate su ' +
      Lg.intero(leve.ripetizioni) + ' ripetizioni. Sono meno di quelle dell’indagine ' +
      'principale, perché ogni leva richiede di rifare tutta la scena da capo. ' +
      'Gli intervalli qui sono quindi un po’ più larghi, ed è giusto saperlo.</p>';
    q('letturaLeve').innerHTML = h;
  }

  /* ---- 7 · da dove parti -------------------------------------------------- */
  function disegnaCurva() {
    var punti = curva.punti.map(function (p) {
      return { x: p.carico, quota: p.quota, ic: { basso: p.ic.basso, alto: p.ic.alto } };
    });
    var s = curva.caduta_piu_ripida;
    q('curvaCarico').innerHTML = G.curvaConBanda(punti, {
      x: [0, 100], passoTacche: 10, nomeX: 'carico di partenza',
      titoloX: 'con quanto carico si arriva alla scena',
      segna: s ? { x: s.a, testo: 'qui la curva piega' } : null,
      descrizione: 'Quante ripetizioni arrivano in fondo intatte, al variare del carico di partenza'
    });
    var h = '';
    if (s) {
      h = '<p><strong>Il tratto più ripido è fra ' + s.da + ' e ' + s.a + ' di carico.</strong> ' +
        'Lì cinque punti di carico in più costano ' + pct(s.caduta) + ' punti percentuali di scene ' +
        'arrivate in fondo intatte. Prima di quel tratto il carico si sente meno. Dopo, il ' +
        'danno è in buona parte già fatto.</p>' +
        '<p class="nota">È l’informazione che serve per decidere <em>quando</em> ' +
        'intervenire, non <em>se</em>. E vale la pena ripeterlo. Questa è una misura di questa ' +
        'scena, con questi gesti. Non è una soglia del libro. Su un’altra scena il punto di ' +
        'piega starebbe altrove.</p>';
    }
    h += '<p class="nota">La curva è stata misurata su ' +
      Lg.intero(curva.ripetizioni) + ' ripetizioni per ogni valore di carico provato. ' +
      'I valori provati sono ' + curva.punti.length + '.</p>';
    q('letturaCarico').innerHTML = h;
  }

  /* ---- 8 · la precisione -------------------------------------------------- */

  /* IL SEMAFORO SULLA PRECISIONE, CHE IL LIBRO DESCRIVE E LA PAGINA NON AVEVA.
     Il capitolo 47 lo dichiara per esteso, con quattro livelli e con i loro
     nomi: verde, giallo, arancione, rosso. «Non giudica la scena: giudica la
     stabilità della lettura.» La pagina ne diceva tre, senza nominarli, dentro
     una frase — e lasciava fuori proprio il consiglio che il libro attacca al
     rosso: prima di tutto <em>semplifica la scena</em>, e solo dopo aumenta le
     giocate.

     LE SOGLIE SONO UNA SCELTA DICHIARATA, NON UNA REGOLA DEL LIBRO.
     Il capitolo descrive i quattro livelli e non fissa i numeri che li
     separano. Questi — due, cinque e dieci punti percentuali di semiampiezza —
     sono quelli che la pagina usava già nelle sue tre frasi, con l'aggiunta
     del quarto scalino. Servono a rendere il verdetto sempre uguale a sé
     stesso, non a stabilire una verità: sono scritti qui, in chiaro, perché
     chi legge possa non essere d'accordo. */
  var SEMAFORO = [
    { fino: 0.02, nome: 'verde', tinta: 'var(--buono)',
      dice: 'l’intervallo è stretto abbastanza per una prima lettura',
      poi: 'Su questa scena le conclusioni reggono.' },
    { fino: 0.05, nome: 'giallo', tinta: 'var(--attenzione)',
      dice: 'utile, ma non definitivo',
      poi: 'Basta per orientarsi. Non basta per distinguere differenze piccole.' },
    { fino: 0.10, nome: 'arancione', tinta: 'var(--serio)',
      dice: 'il rumore statistico può spostare l’interpretazione',
      poi: 'Si può dire quale gesto è delicato. Non di quanto. Prima di aumentare le ' +
           'ripetizioni, conviene guardare se la scena si può descrivere meglio.' },
    { fino: Infinity, nome: 'rosso', tinta: 'var(--ostacola)',
      dice: 'troppo largo perché il risultato regga qualsiasi conclusione',
      poi: 'E il consiglio, qui, non è «aumenta le ripetizioni». È prima di tutto un altro: ' +
           '<strong>semplifica la scena</strong>. Una fascia così larga non si chiude ' +
           'ripetendola. Si chiude descrivendo meno cose, e meglio.' }
  ];

  function semaforoPrecisione(semiampiezza) {
    var l = SEMAFORO[SEMAFORO.length - 1], i;
    for (i = 0; i < SEMAFORO.length; i++) {
      if (semiampiezza <= SEMAFORO[i].fino) { l = SEMAFORO[i]; break; }
    }
    var luci = SEMAFORO.map(function (s) {
      var acceso = s === l;
      return '<span style="display:inline-flex;align-items:center;gap:6px;' +
        'padding:3px 10px;border-radius:999px;' +
        (acceso ? 'background:' + s.tinta + ';color:#fff;font-weight:700'
                : 'border:1px solid var(--bordo);color:var(--inchiostro-3)') + '">' +
        '<i style="width:9px;height:9px;border-radius:50%;background:' +
        (acceso ? '#fff' : s.tinta) + ';opacity:' + (acceso ? '1' : '.45') + '"></i>' +
        esc(s.nome) + '</span>';
    }).join(' ');
    return '<div style="margin:14px 0 6px;display:flex;gap:7px;flex-wrap:wrap">' + luci + '</div>' +
      '<p><strong>Il semaforo della precisione dice ' + esc(l.nome) + ':</strong> ' +
      esc(l.dice) + '. ' + l.poi + ' Attenzione a che cosa questo semaforo guarda. Non ' +
      'giudica la scena, e non dice se le cose vanno bene o male. Giudica soltanto quanto è ' +
      'stabile la lettura che hai davanti. È la scala del capitolo 47. Le soglie che separano ' +
      'i quattro colori — due, cinque e dieci punti percentuali — sono una scelta di questa ' +
      'pagina, scritta qui apposta perché si possa discutere. Il libro nomina i colori, non i ' +
      'numeri.</p>';
  }

  function disegnaPrecisione() {
    var p = ind.precisione;
    var peggiore = ind.nodi[p.nodo_meno_preciso];
    q('precisione').innerHTML =
      '<div class="tasselli">' +
        tassello('Ripetizioni', Lg.intero(ind.ripetizioni),
                 'è questo il campione: una ripetizione è una scena intera, dal primo gesto all’ultimo') +
        tassello('Intervallo più largo', '±' + pct(p.ampiezza_massima / 2) + ' %',
                 'sul gesto ' + (p.nodo_meno_preciso + 1)) +
        /* «CONFRONTI FATTI: 1» CONTRADDICEVA LA RIGA SOTTO.
           Il motore mette in questo campo il numero dei GESTI, non quello dei
           confronti: con un gesto solo il riquadro diceva «confronti fatti 1»
           mentre due righe piu' giu' c'era scritto «non c'e' nessun confronto
           da fare». L'etichetta adesso dice quello che il numero e'. */
        tassello('Gesti messi in fila', String(p.confronti),
                 p.confronti > 1 ? 'e ognuno è un’occasione di sbagliarsi' : 'uno solo') +
        tassello('Soglia usata', 'z = ' + num(p.z_usato, 2),
                 p.confronti > 1 ? 'alzata da 1,96 perché i gesti sono tanti' : 'la solita, 1,96') +
      '</div>' +
      '<p>La <strong>z</strong> del riquadro qui sopra è la manopola della severità. Dice ' +
      'quanto un numero deve stare lontano dal caso, prima di chiamarlo un risultato. ' +
      'A 1,96 sta la soglia di tutti i giorni, quella che sbaglia una volta su venti. ' +
      'Più gesti si guardano insieme, più quella manopola va stretta, perché le ' +
      'occasioni di sbagliare crescono con le domande.</p>' +
      semaforoPrecisione(p.ampiezza_massima / 2) +
      '<p>' +
      (ind.nodi.length === 1
        ? 'L’unico numero dell’indagine, quello del gesto 1, è detto con un margine di ±'
        : 'Il numero meno preciso di tutta l’indagine è quello del gesto ' +
          (p.nodo_meno_preciso + 1) + '. È detto con un margine di ±') +
      pct(p.ampiezza_massima / 2) + '&nbsp;%. ' +
      'Per dimezzarlo servirebbero circa ' + Lg.intero(p.ripetizioni_per_meta_ampiezza) +
      ' ripetizioni. L’intervallo, infatti, si stringe come la radice del numero di ripetizioni: ' +
      'per stringerlo a metà bisogna quadruplicarle, e raddoppiarle non basta.</p>' +
      /* LO STESSO MARGINE, CONTATO IN GIOCATE.
         «±2,3 %» è un numero che si legge e non si vede. Contato in giocate su
         cento diventa una cosa che si immagina, ed è la stessa identica cifra. */
      '<p><b>Detto contando le ripetizioni.</b> Quel gesto è andato male ' +
      fraseCento(peggiore.rischio.quota) + ' volte su cento. La fascia dice che il numero ' +
      'vero, quello che verrebbe da infinite ripetizioni con questi stessi dati, sta fra ' +
      fraseCento(peggiore.rischio.basso) + ' e ' + fraseCento(peggiore.rischio.alto) +
      ' su cento. Tutto il resto della pagina va letto tenendo a mente questa larghezza. ' +
      'Nessun numero qui dentro è più preciso di così.</p>' +
      '<p class="nota">' + esc(p.nota_bonferroni) + '</p>';
  }

  function tassello(nome, valore, sotto) {
    return '<div class="tassello"><span class="k">' + esc(nome) + '</span>' +
      '<span class="v">' + esc(valore) + '</span>' +
      (sotto ? '<span class="s">' + esc(sotto) + '</span>' : '') + '</div>';
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', avvia);
  } else { avvia(); }

}(typeof window !== 'undefined' ? window : this));
