/* =============================================================================
   SIMULATORE 3.0 — LA CALIBRAZIONE
   =============================================================================
   Questo file esiste perché il libro lo chiede per nome.

     «Il coefficiente di recupero è la scelta implementativa più importante
      del progetto e va trattata come tale: dichiarata, versionata, isolata
      in un file di calibrazione, misurabile nei suoi effetti, modificabile
      senza toccare il core. Chiunque legga un report deve poter sapere quale
      calibrazione lo ha prodotto.»
                                        — Canone, Apparato F, voce 7

     «La soglia va esposta, non nascosta. Chi legge un report in cui il tono
      cambia da un nodo all'altro ha il diritto di sapere che è scattato un
      parametro, quale, e che quel parametro è una scelta del software.»
                                        — Canone, Apparato F, voce 8

   CHE COSA C'E' QUI DENTRO
   Solo numeri che NON vengono dal canone. La formula, i pesi, il clamp, il
   dado, le fasce di margine e i nove esiti non stanno qui: stanno in
   nucleo.js e sono copiati dalle fonti. Qui stanno le cose che le fonti non
   dicono e che il software ha dovuto scegliere per poter girare — il
   recupero fra le scene, fra i giorni e nel sonno, il trasferimento di stato
   fra micronodi, il peso di una giornata, le tre porte del pavimento di
   protezione.

   CHE COSA NON E' QUESTO FILE
   Non è un pannello di regolazione. Cambiare un numero qui cambia gli esiti
   di tutto il simulatore, e va fatto solo rilanciando i banchi di taratura in
   _taratura/ e verificando che i sette criteri restino soddisfatti insieme.
   Il file serve a rendere visibile una scelta, non a invitare a rifarla.

   DA DOVE VENGONO I NUMERI
   Ogni voce dichiara la propria provenienza:
     python     copiato da simulatore_v31_core_finale.py, senza reinterpretarlo
     misurato   ricavato da un banco in _taratura/, con il criterio dichiarato
   Nessuna voce dice «canone», perché nessuna di queste viene dal canone: sono
   scelte del software, non regole del modello.

   Otto voci, però, hanno anche un campo «libro»: il capitolo in cui il Canone
   RACCONTA lo stesso numero, in prosa, come fatto sul motore — non come
   regola che lo impone. È una citazione per chi legge, non una fonte diversa:
   la fonte resta python o misurato. Verificato riga per riga il 15/09/2026,
   grep «calibrazione 3.2», «k = 2,75», «trasferimento», «pavimento», «soglie»
   sul Canone: sono le uniche voci per cui il testo del libro dà il numero
   esatto in chiaro. Le altre quindici (recupero fra i giorni, i due freni del
   pavimento, i sette pesi del sonno, i pavimenti su carico e assetto, il
   pavimento del sonno) restano senza citazione perché il libro stesso
   dichiara di NON quantificarle
   — Apparato B, buco 7: «Il recupero non è mai quantificato» — e inventare
   una citazione per loro sarebbe scrivere nel libro qualcosa che non c'è.
   ========================================================================== */

(function (globale) {
  'use strict';

  var VERSIONE = '3.2-serra';
  var DATA = '2026-09-02';

  /* --------------------------------------------------------------------
     LE VOCI
     Ogni voce ha: la chiave usata dal codice, il valore, che cosa fa detto
     in italiano piano, e da dove viene. L'elenco è pensato per essere
     stampato in fondo a un report, non solo letto da un programma.
     -------------------------------------------------------------------- */
  var VOCI = [

    /* ---- il trasferimento di stato ---------------------------------- */
    { chiave: 'trasferimento_micronodo', valore: 0.0462, fonte: 'misurato',
      titolo: 'Quanto passa allo stato da un micronodo',
      spiega: 'Un gesto minuscolo non deve lasciare addosso quanto un gesto intero. ' +
              'Ogni micronodo passa allo stato persistente il 4,6 % del proprio effetto. ' +
              'Senza questo freno il carico saturava a 100 dopo pochi nodi.',
      banco: 'simulazione ufficiale Marco Serra, 500 nodi',
      libro: 'cap. 28, «Il trasferimento dello stato»: la media misurata sui 500 micro-nodi ' +
             'di Marco è il fattore τ, «al quattro virgola sei per cento».' },

    /* ---- il recupero ------------------------------------------------- */
    { chiave: 'recupero_fra_scene', valore: 0.20, fonte: 'python',
      titolo: 'Quanto si recupera fra una scena e l’altra',
      spiega: 'Fra due scene della stessa giornata rientra una quota del carico ' +
              'accumulato, proporzionale a quanto la persona è capace di rientrare (ri4).',
      banco: 'py:1487 scene_recovery_factor',
      libro: 'cap. 29, «Saturazione e limiti del modello»: «È il coefficiente di recupero ' +
             'fra le scene. Nel codice vale 0,20, ed è un numero scelto lì.»' },

    { chiave: 'recupero_fra_giorni', valore: 0.35, fonte: 'python',
      titolo: 'Quanto si recupera fra un giorno e l’altro',
      spiega: 'Più generoso di quello fra scene: una notte in mezzo vale più di una pausa.',
      banco: 'py:1513 partial_recovery_between_days' },

    { chiave: 'freno_pavimento_giorni', valore: 0.45, fonte: 'python',
      titolo: 'Quanto frena il pavimento sul recupero fra i giorni',
      spiega: 'Se il pavimento di protezione è acceso o il raffreddamento è in corso, ' +
              'il recupero fra i giorni vale meno della metà. Il recupero non è mai istantaneo.',
      banco: 'py:1513' },

    { chiave: 'freno_pavimento_sonno', valore: 0.55, fonte: 'python',
      titolo: 'Quanto frena il pavimento sul recupero del sonno',
      spiega: 'Vale lo stesso per la notte: chi è sotto il pavimento di protezione dorme, ma ' +
              'non recupera quanto recupererebbe altrimenti.',
      banco: 'py:3683' },

    /* ---- il sonno ----------------------------------------------------- */
    { chiave: 'sonno_peso_ore', valore: 0.45, fonte: 'python',
      titolo: 'Quanto pesano le ore, nel sonno',
      spiega: 'Il sonno non è solo quante ore: è ore, qualità e continuità insieme, ' +
              'con questi tre pesi. Le ore contano quasi la metà.',
      banco: 'py:3683' },
    { chiave: 'sonno_peso_qualita', valore: 0.35, fonte: 'python',
      titolo: 'Quanto pesa la qualità, nel sonno',
      spiega: 'Dormire otto ore male non è dormire otto ore.',
      banco: 'py:3683' },
    { chiave: 'sonno_peso_continuita', valore: 0.20, fonte: 'python',
      titolo: 'Quanto pesa la continuità, nel sonno',
      spiega: 'Svegliarsi quattro volte toglie qualcosa che le ore non restituiscono.',
      banco: 'py:3683' },

    { chiave: 'sonno_riposo_non_reale', valore: 0.45, fonte: 'python',
      titolo: 'Quanto vale una notte che non è riposo vero',
      spiega: 'Stare a letto non è riposare. Se il riposo non è reale, tutto il ' +
              'recupero della notte vale il 45 %.',
      banco: 'py:3683' },

    { chiave: 'sonno_quota_carico', valore: 0.28, fonte: 'python',
      titolo: 'Quanta parte del carico può togliere una notte',
      spiega: 'La quota non si toglie da tutto il carico, ma solo dalla parte che sta sopra ' +
              'il pavimento: sotto quel punto la notte non fa più scendere niente.',
      banco: 'py:3683' },
    { chiave: 'sonno_quota_assetto', valore: 0.24, fonte: 'python',
      titolo: 'Quanta parte dell’assetto può restituire una notte',
      spiega: 'La quota si calcola su quanto manca all’assetto per arrivare al tetto che una ' +
              'notte può raggiungere: più si è vicini a quel tetto, meno la notte restituisce.',
      banco: 'py:3683' },
    { chiave: 'sonno_quota_costo', valore: 0.20, fonte: 'python',
      titolo: 'Quanta parte del costo nascosto può togliere una notte',
      spiega: 'La più bassa delle tre: il costo che non si vede è anche quello che rientra peggio.',
      banco: 'py:3683' },

    /* ---- i pavimenti sotto cui il recupero non scende ------------------ */
    { chiave: 'pavimento_carico_scene', valore: 35, fonte: 'python',
      titolo: 'Sotto quale carico il recupero fra scene non scende più',
      spiega: 'Una pausa fra due scene non riporta il carico sotto 35: ' +
              'sotto quella soglia serve altro.',
      banco: 'py:1487' },
    { chiave: 'pavimento_carico_giorni', valore: 30, fonte: 'python',
      titolo: 'Sotto quale carico il recupero fra giorni non scende più',
      spiega: 'Una notte arriva un po’ più giù di una pausa, ma non a zero.',
      banco: 'py:1513' },
    { chiave: 'tetto_assetto_scene', valore: 65, fonte: 'python',
      titolo: 'Fin dove una pausa può riportare l’assetto',
      spiega: 'Il recupero fra scene riavvicina l’assetto a 65, non oltre.',
      banco: 'py:1487' },
    { chiave: 'tetto_assetto_giorni', valore: 70, fonte: 'python',
      titolo: 'Fin dove una notte può riportare l’assetto',
      spiega: 'La notte arriva a 70. Il resto lo fa il rientro vero, non il tempo.',
      banco: 'py:1513' },
    { chiave: 'pavimento_costo_scene', valore: 20, fonte: 'python',
      titolo: 'Sotto quale costo nascosto una pausa non scende più',
      spiega: 'Il costo residuo si scarica solo per la parte che sta sopra 20.',
      banco: 'py:1487',
      libro: 'cap. 12 (voce di glossario «costo nascosto»): «solo per la parte che sta ' +
             'sopra un pavimento (venti fra le scene, quindici fra i giorni)».' },
    { chiave: 'pavimento_costo_giorni', valore: 15, fonte: 'python',
      titolo: 'Sotto quale costo nascosto una notte non scende più',
      spiega: 'Una notte porta il costo nascosto un po’ più giù di quanto ci riesca una pausa, ' +
              'ma nemmeno lei lo azzera.',
      banco: 'py:1513',
      libro: 'cap. 12 (voce di glossario «costo nascosto»): «solo per la parte che sta ' +
             'sopra un pavimento (venti fra le scene, quindici fra i giorni)».' },
    { chiave: 'pavimento_costo_sonno', valore: 10, fonte: 'python',
      titolo: 'Sotto quale costo nascosto il sonno non scende più',
      spiega: 'È il recupero che arriva più in basso di tutti, e si ferma comunque a 10.',
      banco: 'py:3683' },

    /* ---- quanto pesa una giornata -------------------------------------- */
    { chiave: 'k_granularita', valore: 2.75, fonte: 'misurato',
      titolo: 'Quanto pesa una giornata, indipendentemente da quanti nodi la descrivono',
      spiega: 'La stessa giornata raccontata con dieci gesti o con cento non deve costare ' +
              'di più nel secondo caso. Il fattore di trasferimento di una giornata è ' +
              'k diviso il numero di nodi. Sette criteri presi dal libro sono soddisfatti ' +
              'insieme solo per k fra 2,5 e 3,0: 2,75 è il centro di quella banda.',
      banco: '_taratura/esegui.js — 400 settimane per condizione',
      libro: 'cap. 58, «Quanto pesa una giornata»: «tutti e sette i criteri sono soddisfatti ' +
             'insieme soltanto per k fra due e cinquanta e tre. […] k uguale a due virgola ' +
             'settantacinque» — il centro della banda, non un bordo.' },

    /* ---- le tre porte del pavimento di protezione ----------------------- */
    { chiave: 'porta_pavimento_carico', valore: 85, fonte: 'python',
      titolo: 'A quale carico si accende il pavimento di protezione',
      spiega: 'Attenzione: NON è il punto di non ritorno. È il valore a cui il sistema ' +
              'entra in protezione, e da lì il recupero vale la metà.',
      banco: 'py:1263 pavimentoECooldown',
      libro: 'cap. 54, «Il punto di non ritorno»: «Si accende se il carico supera ' +
             'ottantacinque, oppure se l’assetto scende sotto venticinque, oppure se il ' +
             'costo nascosto supera settanta.» Voce di glossario «pavimento di protezione» → 17, 53, 54, 55.' },
    { chiave: 'porta_pavimento_assetto', valore: 25, fonte: 'python',
      titolo: 'Sotto quale assetto si accende il pavimento di protezione',
      spiega: 'La porta meno frequente delle tre: si apre in circa un caso su cento.',
      banco: 'py:1263',
      libro: 'cap. 54: stessa citazione della voce precedente. Il libro non dà la percentuale ' +
             'per questa porta, ma la ricava per differenza: carico 64 %, costo 35 %, resta circa 1 %.' },
    { chiave: 'porta_pavimento_costo', valore: 70, fonte: 'python',
      titolo: 'A quale costo nascosto si accende il pavimento di protezione',
      spiega: 'La seconda porta per frequenza, e quella che nessuno vede arrivare.',
      banco: 'py:1263',
      libro: 'cap. 54: stessa citazione della voce «porta_pavimento_carico». «Il costo nascosto ' +
             'nel trentacinque [per cento]» dei 566 blocchi osservati.' }
  ];

  /* --------------------------------------------------------------------
     LA MAPPA CHE USA IL CODICE
     Costruita dalle voci, così il numero esiste in un posto solo.
     -------------------------------------------------------------------- */
  var VALORI = {};
  for (var i = 0; i < VOCI.length; i++) { VALORI[VOCI[i].chiave] = VOCI[i].valore; }

  /* Legge un valore dichiarandolo obbligatorio: se manca, meglio un errore
     rumoroso subito che un numero sbagliato in silenzio. È la stessa regola
     che nucleo.js applica al dado. */
  function valore(chiave) {
    if (VALORI[chiave] === undefined) {
      throw new Error('Calibrazione: la voce «' + chiave + '» non esiste. ' +
                      'Le voci disponibili sono: ' + Object.keys(VALORI).join(', '));
    }
    return VALORI[chiave];
  }

  /* --------------------------------------------------------------------
     LA RIGA CHE OGNI RACCONTO DEVE POTER STAMPARE
     -------------------------------------------------------------------- */
  /* LA DATA SI SCRIVE COME LA SCRIVE UN ITALIANO.
     DATA e' registrata come «2026-09-02» perche' cosi' si ordina da sola e
     non si presta a equivoci fra chi scrive prima il giorno e chi il mese.
     Ma quella forma non va letta da nessuno: la riga qui sotto compare in
     fondo a dieci pagine, e per mesi ha scritto «del 2026-09-02», che in
     italiano non e' una data — e' il modo in cui la scrive un archivio.
     Le altre pagine la giravano gia' («03/09/2026», in app.js e casa.js):
     qui non lo faceva nessuno, e la stessa data appariva in due forme
     diverse nello stesso pacchetto. */
  var MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
              'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
  function dataInLettere(iso) {
    var p = String(iso || '').split('-');
    if (p.length !== 3) { return String(iso || ''); }
    var mese = MESI[parseInt(p[1], 10) - 1];
    if (!mese) { return String(iso); }
    return parseInt(p[2], 10) + ' ' + mese + ' ' + p[0];
  }

  function riga() {
    return 'Calibrazione ' + VERSIONE + ', del ' + dataInLettere(DATA) + '. I ' +
                                                                         'coefficienti ' +
                                                                         'di recupero, ' +
                                                                         'il peso di una ' +
                                                                         'giornata e le ' +
                                                                         'soglie del ' +
                                                                         'pavimento non ' +
                                                                         'vengono dal ' +
                                                                         'canone. Sono ' +
                                                                         'scelte ' +
                                                                         'dichiarate di ' +
                                                                         'questo ' +
                                                                         'software.';
  }

  /* Le soglie che invece vivono nel nucleo, lette al momento e non copiate:
     servono al report per dire quale parametro è scattato. */
  function soglieDelNucleo() {
    var C = globale.Nucleo && globale.Nucleo.CONFIG;
    if (!C) { return null; }
    return {
      probabilita_minima:    C.probabilitaMinima,
      probabilita_massima:   C.probabilitaMassima,
      carico_alto:           C.sogliaCaricoAlto,
      carico_altissimo:      C.sogliaCaricoAltissimo,
      assetto_basso:         C.sogliaAssettoBasso,
      assetto_bassissimo:    C.sogliaAssettoBassissimo,
      costo_nascosto:        C.sogliaCostoNascosto
    };
  }

  var API = {
    versione: VERSIONE,
    data: DATA,
    voci: VOCI,
    valori: VALORI,
    valore: valore,
    riga: riga,
    soglieDelNucleo: soglieDelNucleo
  };

  globale.Calibrazione = API;
  if (typeof module !== 'undefined' && module.exports) { module.exports = API; }

  /* --------------------------------------------------------------------
     LA RIGA IN FONDO A OGNI PAGINA
     «Chiunque legga un report deve poter sapere quale calibrazione lo ha
     prodotto» (Apparato F, voce 7). Invece di ricopiare la frase in cinque
     pagine, la scrive il file stesso dove trova un segnaposto.
     -------------------------------------------------------------------- */
  if (typeof document !== 'undefined' && document.addEventListener) {
    document.addEventListener('DOMContentLoaded', function () {
      var posti = document.querySelectorAll('[data-calibrazione]');
      for (var j = 0; j < posti.length; j++) { posti[j].textContent = riga(); }
    });
  }

})(typeof window !== 'undefined' ? window : globalThis);
