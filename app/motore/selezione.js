/* =============================================================================
   SIMULATORE 3.0 — Quali domande fare a questa scena
   =============================================================================
   LIVELLO ESTERNO AL CORE. Non calcola: sceglie.

   LA REGOLA                                    [guida 3.2 v6 § 0.2, § 0.2.3]
   «Il questionario non deve nascere prima del racconto, ma dopo la
    contestualizzazione narrativa dell'oggetto d'indagine. Non si interroga
    una persona in astratto con un questionario sempre identico. Si parte
    dal caso.»

   E, esplicitamente, quali domande NON fare:
     un'ora al supermercato → niente dinamiche d'ufficio profonde
     una mattina di lavoro  → niente domande su suoceri o guida lunga
     una settimana          → niente micro-dettaglio su gesti identici

   COME FUNZIONA QUI
   La descrizione della scena attiva una o piu' FAMIGLIE (V001-V040). Ogni
   famiglia dichiara, nella guida, le sue LEVE SENSIBILI. Una domanda si fa
   se tocca una di quelle leve. Le altre si mettono via, e si dice perche'.

   ⚠️ La famiglia non calcola niente                       [guida v6 § 6.10]
   «V001-V040 orientano scenari, non aggiungono punteggi automatici.»
   Qui la famiglia sceglie le domande. Punto. Nessun numero cambia.

   ⚠️ Ogni domanda deve avere un motivo                    [guida v6 § 0.2.5]
   La guida chiede una struttura `QuestionNeed` che «spiega perche' una
   domanda serve a quel racconto». Qui ogni domanda selezionata porta con
   se' il motivo per cui e' stata scelta, e ogni domanda scartata il motivo
   per cui non si fa. Il lettore puo' leggerli tutti.
   ========================================================================== */

(function (globale) {
  'use strict';

  var Q = globale.Questionario;
  var F = globale.Famiglie;

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
    throw new Error('selezione.js non può partire: ' +
      (mancanti.length === 1
        ? 'gli manca il modulo ' + mancanti[0] + ', e gli serve per sapere quali domande esistono e a quale famiglia di vita appartiene la scena.'
        : 'gli mancano i moduli ' + mancanti.join(' e ') + ', e gli servono per sapere quali domande esistono e a quale famiglia di vita appartiene la scena.') +
      ' Ordine di caricamento: nucleo.js, calibrazione.js, casuale-mt.js, stato.js, ' +
      'microsemantica.js, tempo.js, settimana-tipo.js, e i dati prima di chi li usa.');
  }([['Questionario (app/dati/questionario.js)', Q], ['Famiglie (app/dati/famiglie.js)', F]]
    .filter(function (c) { return !c[1]; })
    .map(function (c) { return c[0]; })));


  /* Da quale variabile del modello dipende una domanda. Si ricava dagli
     effetti, non da un'etichetta scritta a mano: cosi' non puo' andare
     fuori sincrono quando una domanda cambia. */
  var LEVA_DI = {
    E: 'E', I: 'I', T: 'T', M: 'M', BP: 'BP', C: 'C', DEB: 'DEB',
    initial_STR: 'STR', initial_POS: 'POS', initial_BP: 'BP',
    campo: 'K/Pd', rip: 'RIP', macro: 'MACRO',
    supporto: 'supporto', delega: 'supporto', riduzione_carico: 'supporto',
    adattamento: 'adattamento'
  };

  /* LE LEVE HANNO UN NOME, E NON È LA SIGLA.
     Il motivo per cui una domanda si fa o non si fa finisce sotto gli occhi
     di chi compila, e fino al 10/09/2026 diceva cose come «Riguarda E, M e
     K/Pd, che in questa scena non è una leva sensibile». Due difetti in una
     riga sola: le sigle sono nomi di programma, e il verbo era al singolare
     mentre le cose elencate erano tre.
     I nomi qui sotto sono gli stessi che l'indagine usa per gli stessi
     termini, così chi passa da una pagina all'altra ritrova le parole. */
  var NOMI_LEVA = {
    E: 'il corpo com’è adesso',
    I: 'quanto è chiaro che cosa fare',
    T: 'la fretta',
    M: 'l’ambiente intorno',
    BP: 'quello che protegge',
    C: 'i pezzi da coordinare',
    DEB: 'il debito da insistenza',
    STR: 'il carico che ci si porta dietro',
    POS: 'l’assetto con cui si arriva',
    'K/Pd': 'quello che risponde al tentativo',
    RIP: 'il rientro, cioè se una pausa vera c’è stata',
    MACRO: 'il regime, cioè che periodo è',
    supporto: 'l’aiuto che c’è davvero',
    adattamento: 'quello che si può cambiare per farcela'
  };

  function nomeLeva(l) { return NOMI_LEVA[l] || l; }

  function levePerDomanda(d) {
    var viste = {}, out = [];
    function raccogli(eff) {
      if (!eff) { return; }
      for (var k in eff) {
        if (eff[k] === 0) { continue; }
        var l = LEVA_DI[k];
        if (l && !viste[l]) { viste[l] = true; out.push(l); }
      }
    }
    if (d.tipo === 'scala') { raccogli(d.per_punto); }
    else { d.opzioni.forEach(function (o) { raccogli(o.effetti); }); }
    return out;
  }

  /* Le leve che riguardano la PERSONA e non la scena: STR, POS e il regime
     valgono in qualunque famiglia, perche' descrivono con che cosa ci si
     arriva, non che cosa si sta facendo. Toglierle perche' «il supermercato
     non e' una famiglia di stress» sarebbe un errore di lettura. */
  var SEMPRE_PERTINENTI = ['STR', 'POS', 'MACRO'];

  /* --------------------------------------------------------------------
     IL FILTRO CHE CONTA DAVVERO: IL TERRITORIO

     Filtrare solo per leva non basta. Diciotto domande su quarantatre
     toccano STR e venti toccano POS: se STR e POS valgono sempre — e
     valgono — allora quasi niente viene tolto. Misurato: su «un'ora al
     supermercato» veniva scartata UNA domanda su venti.

     Ma la guida non dice «togli le leve non sensibili»: dice
     «un'ora al supermercato → evitare dinamiche di ufficio profonde»,
     «una mattina di lavoro → evitare suoceri e guida lunga». Parla di
     AMBITI, non di variabili. «Quanto è pesante il carico di lavoro»
     e «quanto è pesante il carico familiare» toccano la stessa leva e
     appartengono a due mondi diversi.

     Ogni domanda dichiara gia' il proprio territorio. Ventiquattro su
     quarantatre sono trasversali — valgono ovunque. Le altre diciannove
     appartengono a un ambito, e si fanno solo se la scena lo tocca.
     -------------------------------------------------------------------- */
  var TERRITORIO_AREA = {
    cura_corpo:     'cura_personale_corpo',
    casa:           'casa_oggetti',
    relazione:      'coppia_famiglia',
    cura_fragilita: 'coppia_famiglia',
    digitale:       'digitale_burocrazia',
    lavoro_studio:  'lavoro_scuola',
    mobilita:       'mobilita_strada'
  };

  /* Il corpo si porta dietro ovunque: una scena al supermercato non smette
     di riguardare il corpo perche' non e' una scena «di corpo». */
  var TERRITORI_SEMPRE = ['trasversale', 'cura_corpo'];

  var NOMI_TERRITORIO = {
    cura_corpo: 'il corpo e la cura di sé',
    casa: 'la casa e gli oggetti',
    relazione: 'le relazioni',
    cura_fragilita: 'la cura di una persona fragile',
    digitale: 'il digitale e la burocrazia',
    lavoro_studio: 'il lavoro e lo studio',
    mobilita: 'gli spostamenti'
  };

  /* Le sei domande della Tabella 6 sono il minimo del libro: non si tolgono
     mai, qualunque sia la scena. */
  function eDelMinimo(d) { return d.id.charAt(0) === 'R'; }

  /* Le domande professionali non descrivono la scena: descrivono chi
     compila e con quanta certezza. Restano se il livello le prevede. */
  function eDiCornice(d) { return d.id.charAt(0) === 'X'; }

  /* Domande che il dato dichiara valide per qualunque scena, a prescindere
     dalle leve sensibili della famiglia riconosciuta — oggi le condizioni
     ambientali estreme (T17-T20) [claude/condizioni-estreme-senza-ia.md].
     Senza questa via d'uscita sarebbe il DECIMO errore della stessa famiglia del
     19/8: un effetto vero (E, M...) filtra la domanda per leva come tutte le
     altre, ma qui la leva sensibile della famiglia non ha niente a che fare
     con «fa abbastanza freddo da dover mettere una domanda». Provato: T17
     spariva per «vestirsi in un igloo» perché V004 (vestirsi) non ha E né M
     fra le proprie leve sensibili — un difetto invisibile a leggere il
     codice, visibile solo controllando che la domanda sopravviva a una scena
     qualsiasi. */
  function eSempre(d) { return !!d.sempre; }

  /* --------------------------------------------------------------------
     LA SELEZIONE
     -------------------------------------------------------------------- */
  function selezionaPerScena(descrizione, livello, opzioni) {
    opzioni = opzioni || {};
    livello = livello || 'standard';

    var rico = opzioni.famiglie
      ? { riconosciute: [], prevalente: opzioni.famiglie[0] || null,
          secondarie: opzioni.famiglie.slice(1), sicura: true, forzata: true }
      : F.riconosci(descrizione);

    var attive = [rico.prevalente].concat(rico.secondarie).filter(Boolean);
    var leve = F.leveSensibili(attive);
    var aree = [];
    attive.forEach(function (f) { if (aree.indexOf(f.area) < 0) { aree.push(f.area); } });
    var base = Q.perLivello(livello);

    /* Se la scena non è riconosciuta non si inventa una famiglia: si fanno
       tutte le domande del livello e lo si dichiara. Meglio qualche domanda
       di troppo che un blocco tolto per sbaglio. */
    if (!attive.length) {
      return {
        descrizione: descrizione,
        livello: livello,
        famiglie: [], aree: [], lacune: [], leve_sensibili: [],
        riconoscimento: 'nessuno',
        scelte: base.map(function (d) {
          return { domanda: d, leve: levePerDomanda(d),
                   motivo: 'La scena non è stata riconosciuta. Perciò si fanno tutte le domande del livello.' };
        }),
        scartate: [],
        nota: 'Nella descrizione non è stata riconosciuta nessuna famiglia. Perciò il ' +
              'questionario non è stato ridotto. Restano tutte le domande del livello. ' +
              'Se descrivi meglio la scena, o scegli la famiglia a mano, le domande ' +
              'diventano meno. E più mirate.',
        numerosita: valutaNumerosita(base.length, livello)
      };
    }

    var scelte = [], scartate = [];
    for (var i = 0; i < base.length; i++) {
      var d = base[i];
      var lv = levePerDomanda(d);

      if (eDelMinimo(d)) {
        scelte.push({ domanda: d, leve: lv,
          motivo: 'È una delle sei domande minime del libro, e quelle si fanno sempre.' });
        continue;
      }
      if (eDiCornice(d)) {
        scelte.push({ domanda: d, leve: lv,
          motivo: 'Non descrive la scena. Descrive quanto sono buone le informazioni, e serve al referto.' });
        continue;
      }
      if (eSempre(d)) {
        scelte.push({ domanda: d, leve: lv,
          motivo: 'Riguarda le condizioni dell’ambiente, e quelle possono valere per qualunque scena. Si fa sempre.' });
        continue;
      }

      /* primo filtro: l'ambito */
      var terr = d.territorio || 'trasversale';
      if (TERRITORI_SEMPRE.indexOf(terr) < 0) {
        var areaRichiesta = TERRITORIO_AREA[terr];
        if (areaRichiesta && aree.indexOf(areaRichiesta) < 0) {
          scartate.push({
            domanda: d, leve: lv,
            motivo: 'Riguarda ' + (NOMI_TERRITORIO[terr] || terr) +
                    ', che questa scena non tocca.'
          });
          continue;
        }
      }

      /* secondo filtro: la leva */
      var pertinenti = lv.filter(function (l) {
        return leve.indexOf(l) >= 0 || SEMPRE_PERTINENTI.indexOf(l) >= 0;
      });

      if (pertinenti.length) {
        var daFamiglia = lv.filter(function (l) { return leve.indexOf(l) >= 0; });
        var chiDecide = attive.filter(function (f) {
          return f.leve.some(function (l) { return daFamiglia.indexOf(l) >= 0; });
        });
        scelte.push({
          domanda: d, leve: lv,
          motivo: daFamiglia.length
            ? 'Questa domanda tocca ' + elenca(daFamiglia.map(nomeLeva)) + ', ' +
              (daFamiglia.length === 1 ? 'che è una delle cose' : 'che sono fra le cose') +
              ' su cui ' + nomiFamiglie(chiDecide) +
              /* «<= 1» e non «=== 1»: con la lista vuota nomiFamiglie() scrive
                 «questa scena», che e' singolare, mentre «=== 1» era falso e
                 faceva uscire il plurale. A schermo si leggeva «questa scena
                 fanno la differenza». Il verbo deve seguire quello che
                 nomiFamiglie() ha davvero scritto, non quanti erano gli
                 elementi prima di scriverlo. */
              (chiDecide.length <= 1 ? ' fa' : ' fanno') + ' la differenza.'
            : 'Descrive lo stato con cui si arriva alla scena, non la scena. Vale sempre.'
        });
      } else {
        scartate.push({
          domanda: d, leve: lv,
          motivo: lv.length === 0
            ? 'Questa domanda non sposta nessun valore del modello. E in questa scena ' +
              'non c’è niente che la renda necessaria.'
            : 'Questa domanda riguarda ' + elenca(lv.map(nomeLeva)) + ', che però ' +
              (lv.length === 1
                ? 'in questa scena non è una delle cose che fanno la differenza.'
                : 'in questa scena non sono fra le cose che fanno la differenza.')
        });
      }
    }

    /* --- I BUCHI DEL QUESTIONARIO ---                   [guida v6 § 0.2.1]
       «Confronta ciò che il racconto dice con ciò che il core deve sapere.»
       Se la scena tocca un ambito per cui non esiste nemmeno una domanda,
       il questionario ha un buco: va detto, non nascosto sotto le domande
       che ci sono. Oggi, per esempio, nessuna domanda parla di guida o di
       spostamenti — «guidare nel traffico» viene interrogato solo con
       domande trasversali. */
    var lacune = [];
    aree.forEach(function (a) {
      var coperta = base.some(function (d) {
        return TERRITORIO_AREA[d.territorio] === a;
      });
      if (!coperta) {
        var nomeArea = F.AREE[a] || a;
        lacune.push({
          area: a, nome: nomeArea,
          testo: 'La scena tocca «' + nomeArea + '», ma a questo livello non c’è nessuna ' +
                                                 'domanda fatta apposta per ' +
                                                 'quell’ambito. Lo toccano solo le ' +
                                                 'domande trasversali. È un buco del ' +
                                                 'questionario, non della scena.'
        });
      }
    });

    return {
      descrizione: descrizione,
      livello: livello,
      famiglie: attive,
      aree: aree,
      lacune: lacune,
      leve_sensibili: leve,
      riconoscimento: rico.forzata ? 'scelto a mano'
                    : (rico.sicura ? 'sicuro' : 'incerto'),
      parole_riconosciute: (rico.riconosciute || []).slice(0, 3).map(function (x) {
        return { codice: x.famiglia.codice, parole: x.parole };
      }),
      scelte: scelte,
      scartate: scartate,
      nota: scartate.length
        ? (scartate.length === 1
            ? 'Una domanda su ' + base.length + ' non viene fatta, perché non riguarda '
            : scartate.length + ' domande su ' + base.length + ' non vengono fatte, perché non riguardano ') +
          'questa scena. È la regola con cui il questionario nasce dal racconto, e non ' +
          'prima. Non si tratta di fare più domande possibile. Si tratta di fare quelle ' +
          'giuste.'
        : 'Tutte le domande di questo livello riguardano la scena raccontata. Non ne è stata tolta nessuna.',
      numerosita: valutaNumerosita(scelte.length, livello)
    };
  }

  /* --------------------------------------------------------------------
     QUANTE DOMANDE SERVIREBBERO                       [guida v6 § 0.2.2]

     La guida da' una tabella di numerosita' consigliata. Non la si puo'
     rispettare con la banca attuale, e questo va detto invece che nascosto:
     il progetto ha gia' trovato tre volte un numero grande che era piccolo,
     e non ne aggiunge un quarto fingendo di avere piu' domande di quante
     ne ha.
     -------------------------------------------------------------------- */
  var NUMEROSITA = [
    { livello: 'rapida',        arco: 'Micro-scena o gesto breve',        min: 10,  max: 25 },
    { livello: 'standard',      arco: 'Scena ordinaria di 10-60 minuti',  min: 30,  max: 80 },
    { livello: 'profonda',      arco: 'Mezza giornata o giornata',        min: 80,  max: 160 },
    { livello: 'professionale', arco: 'Uso professionale, ricerca, verifica di qualità', min: 300, max: 500 }
  ];

  function valutaNumerosita(quante, livello) {
    var r = null;
    for (var i = 0; i < NUMEROSITA.length; i++) {
      if (NUMEROSITA[i].livello === livello) { r = NUMEROSITA[i]; }
    }
    if (!r) { return null; }
    return {
      domande_fatte: quante,
      consigliate: r.min + '–' + r.max,
      arco: r.arco,
      sotto_il_minimo: quante < r.min,
      nota: quante < r.min
        ? 'La guida tecnica del modello consiglia ' + r.min + '–' + r.max + ' domande per «' + r.arco.toLowerCase() +
          '». Qui ne vengono fatte ' + quante + ': la banca di domande è più ' +
                                                       'piccola di quella che la guida ' +
                                                       'presuppone. Il risultato resta ' +
                                                       'leggibile. La copertura però è ' +
                                                       'quella di ' + quante + ' domande, non di ' + r.min + '.'
        : 'In linea con le ' + r.min + '–' + r.max + ' domande che la guida tecnica del modello consiglia per «' +
          r.arco.toLowerCase() + '».'
    };
  }

  function elenca(v) {
    if (!v.length) { return 'niente'; }
    if (v.length === 1) { return v[0]; }
    return v.slice(0, -1).join(', ') + ' e ' + v[v.length - 1];
  }
  function nomiFamiglie(fs) {
    if (!fs.length) { return 'questa scena'; }
    return fs.map(function (f) { return '«' + f.nome + '»'; }).join(' e ');
  }

  var API = {
    NUMEROSITA: NUMEROSITA,
    TERRITORIO_AREA: TERRITORIO_AREA,
    TERRITORI_SEMPRE: TERRITORI_SEMPRE,
    levePerDomanda: levePerDomanda,
    SEMPRE_PERTINENTI: SEMPRE_PERTINENTI,
    selezionaPerScena: selezionaPerScena,
    valutaNumerosita: valutaNumerosita
  };

  globale.Selezione = API;
  if (typeof module !== 'undefined' && module.exports) { module.exports = API; }

})(typeof window !== 'undefined' ? window : globalThis);
