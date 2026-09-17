/* =============================================================================
   SIMULATORE 3.0 — Condizioni ambientali estreme, senza dipendere da un'IA
   =============================================================================
   [claude/condizioni-estreme-senza-ia.md, 19/8]

   PERCHÉ QUESTO FILE ESISTE
   Il questionario doveva reggere scene fuori dall'ordinario — un igloo al Polo
   Nord, una capanna in Amazzonia, un deserto, l'alta quota — senza che il
   simulatore debba interfacciarsi con nessuna intelligenza artificiale, nemmeno
   opzionale. Le quattro domande T17-T20 [`app/dati/questionario.js`] misurano
   la SEVERITÀ di temperatura/elementi, isolamento, infrastrutture e terreno;
   questo file suggerisce dove posizionarle leggendo la descrizione libera
   della scena, con lo stesso meccanismo — statico, per parole chiave,
   deterministico — che `Famiglie.riconosci()` [`app/dati/famiglie.js`] usa già
   per le quaranta famiglie V001-V040.

   ⚠️ IL TESTO LIBERO SUGGERISCE, NON CALCOLA
   Questo modulo non tocca nessun numero della formula: propone un valore di
   partenza sui cursori/opzioni di T17-T20. È l'interfaccia
   [`app/interfaccia/questionario-ui.js`] a scrivere quel suggerimento nelle
   risposte, e solo finché la persona non le cambia a mano — da quel momento la
   scelta della persona vince e non viene più sovrascritta. È lo stesso
   principio già scritto per le famiglie V: «orientano, non aggiungono
   punteggi automatici», esteso dalla scena all'ambiente.

   NON È IA
   È una tabella statica di parole chiave. La stessa scena dà sempre lo stesso
   suggerimento, oggi come fra dieci anni, offline, gratis, testabile.
   ========================================================================== */

(function (globale) {
  'use strict';

  /* Ogni voce: le parole con cui si riconosce la condizione, il suggerimento
     per ciascuna delle quattro domande (indice di opzione per T17-T19, valore
     0-10 per T20, che è una scala), e una nota che spiega perché.

     Le magnitudini dei suggerimenti non inventano una nuova scala: puntano
     alle stesse opzioni/valori già dichiarati in T17-T20. Cambiare un numero
     lì cambia automaticamente anche il senso qui, senza doppie fonti. */
  var VOCABOLARIO = [
    { codice: 'polare', nome: 'condizioni polari',
      chiavi: ['polo nord', 'polo sud', 'artico', 'artide', 'antartide', 'iglu', 'igloo',
               'tundra', 'banchisa', 'calotta glaciale'],
      suggerimento: { T17: 3, T18: 2, T19: 2, T20: 1 },
      nota: 'Ai poli il freddo è estremo e non dà tregua. Un aiuto vero è lontano ' +
            'parecchie ore. Le cose di base ci sono soltanto se le si è portate: l’acqua ' +
            'corrente, la corrente elettrica, un modo per chiamare qualcuno.' },

    { codice: 'tropicale', nome: 'foresta tropicale',
      chiavi: ['amazzonia', 'amazzonica', 'giungla', 'foresta pluviale', 'foresta tropicale',
               'foresta equatoriale'],
      suggerimento: { T17: 2, T18: 1, T19: 3, T20: 2 },
      nota: 'Nella foresta tropicale il caldo umido non lascia respiro. Le cose di base ' +
            'quasi non ci sono. E il terreno rende faticoso anche solo spostarsi di ' +
            'qualche metro.' },

    { codice: 'deserto', nome: 'deserto',
      chiavi: ['deserto', 'sahara', 'dune di sabbia', 'dune del deserto'],
      suggerimento: { T17: 3, T18: 1, T19: 2 },
      nota: 'Nel deserto il caldo arriva a livelli che il corpo regge male. L’acqua e le ' +
            'altre cose necessarie vanno razionate. E un aiuto vicino non c’è quasi mai.' },

    { codice: 'alta_quota', nome: 'alta quota',
      chiavi: ['alta montagna', 'alta quota', 'altissima quota', 'vetta', 'crepaccio',
               'cima innevata', 'ghiacciaio'],
      suggerimento: { T17: 2, T18: 1, T20: 3 },
      nota: 'In alta quota fa freddo. Il terreno sale ripido e non tiene bene. L’aria ' +
            'più sottile rende pesante anche uno sforzo che in pianura non si noterebbe. ' +
            'E se serve aiuto, ci mette molto ad arrivare.' },

    { codice: 'isolamento', nome: 'isolamento marcato',
      chiavi: ['isola deserta', 'isola disabitata', 'naufragio', 'naufrag', 'fuori copertura',
               'senza segnale', 'nel mezzo del nulla', 'nessun vicino'],
      suggerimento: { T18: 3, T19: 2 },
      nota: 'In un posto isolato non c’è nessuno abbastanza vicino da intervenire in ' +
            'tempo. Anche le cose di base sono poche, o vanno e vengono.' },

    /* Le tre voci qui sotto — audit 19/8 sera: il dizionario copriva bene gli
       scenari "da manuale" (poli, deserti, giungla) ma non le condizioni
       estreme più probabili per un lettore italiano. Stessa disciplina delle
       cinque di sopra: parole chiave multi-parola dove il rischio di falso
       positivo è concreto, magnitudini dentro i domini già dichiarati in
       T17-T20, nessuna nuova scala inventata. */
    { codice: 'alluvione_terremoto', nome: 'alluvione o terremoto',
      chiavi: ['alluvione', 'inondazione', 'esondazione', 'terremoto', 'scossa di terremoto',
               'scossa sismica', 'crollo di un edificio', 'macerie'],
      suggerimento: { T18: 2, T19: 3, T20: 3 },
      nota: 'Dopo un’alluvione o un terremoto le cose di base saltano tutte insieme. I ' +
            'soccorsi ci mettono ore ad arrivare dove serve. E il terreno intorno non ' +
            'tiene, o è pieno di macerie.' },

    { codice: 'blackout', nome: 'blackout prolungato',
      chiavi: ['blackout', 'black-out', 'senza corrente da giorni', 'senza elettricità da giorni',
               'manca la luce da giorni', 'salta la corrente'],
      suggerimento: { T19: 2 },
      nota: 'Quando la corrente manca per giorni, saltano la luce e i modi soliti di ' +
            'sentirsi. Tutto il resto resta com’era: la temperatura, il terreno, un ' +
            'aiuto che può arrivare. Fra le condizioni severe è la più vicina alla vita ' +
            'di tutti i giorni. Capita anche in città.' },

    { codice: 'zona_conflitto', nome: 'zona di conflitto',
      chiavi: ['zona di conflitto', 'zona di guerra', 'sotto le bombe', 'bombardamento',
               'guerra in corso', 'sotto attacco'],
      suggerimento: { T18: 3, T19: 3 },
      nota: 'In una zona di conflitto mancano insieme i soccorsi e le cose di base. E ' +
            'succede con qualunque clima e su qualunque terreno.' }
  ];

  /* Stesso confine a sinistra usato in famiglie.js: la chiave deve cominciare
     dove comincia una parola, cosi' «artico» non prende «quartiere». */
  function normalizza(descrizione) {
    return ' ' + String(descrizione || '').toLowerCase()
      .replace(/[^a-zàèéìòùç\s]/g, ' ').replace(/\s+/g, ' ') + ' ';
  }

  /* «BLACK-OUT» NON SI TROVAVA MAI, E IL TRATTINO ERA IL COLPEVOLE.
     Il testo della scena passa da normalizza(), che butta via tutto quello
     che non e' una lettera — trattino compreso — e trasforma «un black-out»
     in «un black out», con uno spazio al posto del trattino. Ma la chiave
     con cui si confrontava restava «black-out», scritta com'era nel
     dizionario. Cercare «black-out» dentro un testo che ormai diceva
     «black out» non trovava mai niente: quella voce del dizionario era
     scritta per essere riconosciuta e non lo era mai stata, silenziosamente,
     da quando esiste. Il controllo automatico che prova ogni chiave uno per
     uno se n'e' accorto; nessun controllo precedente provava le chiavi con
     un trattino dentro.
     Ora la chiave passa dalla stessa normalizza() del testo, prima del
     confronto: stessa trasformazione da entrambe le parti, come vuole
     piatto() in scena.js per l'apostrofo. Il testo mostrato a chi legge resta
     quello del dizionario, «black-out» con il trattino: cambia solo il modo
     in cui la si cerca.
     Trovato provando il simulatore il 15/09/2026. */
  function chiaveConfrontabile(k) {
    return normalizza(k).trim();
  }

  /* Legge la descrizione, restituisce i gruppi riconosciuti e un
     suggerimento per domanda: il caso peggiore fra i gruppi che hanno
     trovato riscontro, non la somma — è un punto di partenza prudente,
     non un calcolo. */
  function suggerisci(descrizione) {
    var testo = normalizza(descrizione);
    var gruppi = [];

    VOCABOLARIO.forEach(function (v) {
      var trovate = v.chiavi.filter(function (k) {
        return testo.indexOf(' ' + chiaveConfrontabile(k)) >= 0;
      });
      if (trovate.length) { gruppi.push({ voce: v, parole: trovate }); }
    });

    var suggerimenti = {};
    gruppi.forEach(function (g) {
      for (var id in g.voce.suggerimento) {
        var val = g.voce.suggerimento[id];
        if (suggerimenti[id] === undefined || val > suggerimenti[id]) { suggerimenti[id] = val; }
      }
    });

    return {
      gruppi: gruppi.map(function (g) {
        return { codice: g.voce.codice, nome: g.voce.nome, parole: g.parole, nota: g.voce.nota };
      }),
      suggerimenti: suggerimenti
    };
  }

  var API = {
    VOCABOLARIO: VOCABOLARIO,
    suggerisci: suggerisci
  };

  globale.CondizioniAmbientali = API;
  if (typeof module !== 'undefined' && module.exports) { module.exports = API; }

})(typeof window !== 'undefined' ? window : globalThis);
