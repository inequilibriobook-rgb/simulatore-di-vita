/* =============================================================================
   SIMULATORE 3.0 — Il glossario, quello che si vede
   =============================================================================
   PERCHE' ESISTE

   In spiegazioni.js c'erano gia' scritte, per ognuno dei nove valori, una
   frase breve e un esempio. Nessuno li mostrava mai: l'interfaccia leggeva
   solo «nome» e «sigla». Materiale didattico gia' pronto, e invisibile.

   Peggio: le parole che il simulatore RESTITUISCE non erano spiegate da
   nessuna parte. Il report scrive «assetto a 57» quindici volte e la parola
   «assetto» non compariva altrove — nessun cursore, nessuna definizione. Chi
   legge vede un numero che non ha messo lui e che nessuno gli ha spiegato.

   COME FUNZIONA

   Due cose, tutte e due automatiche:

     [data-parola="assetto"]   una parola nel testo diventa cliccabile e apre
                               la sua spiegazione sotto, senza far saltare la
                               pagina

     [data-glossario]          un contenitore vuoto si riempie con tutte le
                               voci, in ordine, gia' pronte da leggere e da
                               stampare

   Niente librerie, niente rete. E' un file solo, come tutto il resto.
   ========================================================================== */
(function (G) {
  'use strict';

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* Tutte le voci in un posto solo: prima quelle che si impostano, poi
     quelle che si leggono nel risultato. La chiave e' la stessa che si
     scrive in data-parola. */
  function voci() {
    var S = G.Spiegazioni;
    if (!S) { return {}; }
    var out = {};
    Object.keys(S.termini || {}).forEach(function (k) {
      var t = S.termini[k];
      out[k] = { nome: t.nome, sigla: t.sigla, breve: t.breve,
                 esempio: t.esempio, gruppo: 'si impostano' };
      /* la sigla e' un secondo nome per la stessa voce: chi scrive
         data-parola="STR" deve trovarla come chi scrive data-parola="piSTR" */
      if (t.sigla && !out[t.sigla]) { out[t.sigla] = out[k]; }
    });
    Object.keys(S.parole || {}).forEach(function (k) {
      var t = S.parole[k];
      out[k] = { nome: t.nome, sigla: t.sigla, breve: t.breve,
                 esempio: t.esempio, gruppo: 'si leggono' };
      /* ANCHE QUI LA SIGLA E' UN SECONDO NOME, E QUI MANCAVA.
         Il ciclo dei termini registrava la sigla, questo no. Effetto: il
         cursore «Assetto di partenza» era l'unico dei sette a non aprire
         niente quando lo si cliccava, perche' chiedeva «POS» e sotto quel
         nome non c'era registrato nulla — «assetto» si', «POS» no. Muto e
         senza un segno, come sempre in questi casi.
         Trovato provando il simulatore il 10/09/2026. Vale per POS, per
         DEB, per STR e per Pn, cioe' per le quattro sigle che il lettore
         incontra nei risultati e non fra i cursori. */
      if (t.sigla && !out[t.sigla]) { out[t.sigla] = out[k]; }
    });
    return out;
  }

  var VOCI = null;
  function laVoce(chiave) {
    if (VOCI === null) { VOCI = voci(); }
    return VOCI[chiave] || VOCI[String(chiave).toLowerCase()] || null;
  }

  var contatore = 0;

  /* PERCHE' NON SI ATTACCANO GLI ASCOLTATORI UNO PER UNO
     I cursori non esistono quando la pagina finisce di caricare: li
     costruisce app.js subito dopo. La prima versione girava una volta sola
     su DOMContentLoaded e trovava due parole su undici — le due scritte a
     mano nell'HTML. Le nove dei cursori arrivavano tardi e restavano mute.

     Quindi: un solo ascoltatore sul documento, che vale anche per quello che
     nasce dopo, e un osservatore che decora le parole nuove appena compaiono.
     Cosi' nessuna pagina deve ricordarsi di richiamare niente. */

  function decora(el) {
    if (el.getAttribute('data-glossa-pronta')) { return true; }
    var v = laVoce(el.getAttribute('data-parola'));
    if (!v) { return false; }
    el.setAttribute('data-glossa-pronta', '1');
    el.setAttribute('role', 'button');
    el.setAttribute('tabindex', '0');
    el.setAttribute('aria-expanded', 'false');
    el.classList.add('parola-spiegata');
    el.title = v.breve;
    return true;
  }

  function riquadroDi(el) {
    var id = el.getAttribute('aria-controls');
    if (id) { return document.getElementById(id); }
    var v = laVoce(el.getAttribute('data-parola'));
    if (!v) { return null; }
    id = 'glossa-' + (++contatore);
    var box = document.createElement('div');
    box.id = id;
    box.className = 'glossa';
    box.hidden = true;
    /* i testi lunghi sono scritti a paragrafi, separati da una riga vuota:
       stampati in un blocco solo diventerebbero un muro */
    function aParagrafi(t, classe) {
      return String(t).split(/\n\s*\n/).map(function (pezzo) {
        return '<p' + (classe ? ' class="' + classe + '"' : '') + '>' +
               esc(pezzo.trim()) + '</p>';
      }).join('');
    }
    box.innerHTML = '<strong>' + esc(v.nome) +
      (v.sigla ? ' <span class="glossa-sigla">' + esc(v.sigla) + '</span>' : '') +
      '</strong>' + aParagrafi(v.breve) +
      (v.esempio ? aParagrafi(v.esempio, 'glossa-esempio') : '');
    /* DOVE VA MESSO IL RIQUADRO, E PERCHE' NON BASTA «DOPO IL BLOCCO».
       Il riquadro va dopo il blocco che contiene la parola, non dentro la
       frase: infilarlo dentro spezzerebbe la riga a meta'.

       Ma «dopo il blocco» da solo produce un difetto che si vede subito.
       Quando la parola sta dentro un riquadrino di una griglia — i nove
       valori di un nodo, i nove cursori — il blocco e' una CELLA, e
       infilare il riquadro subito dopo lo rende a sua volta una cella:
       larga settantasei pixel, con dentro tre righe di testo incolonnate
       una parola per riga. Misurato sulla pagina della scena.

       Quindi: scelto il blocco, si sale finche' il genitore dispone i figli
       in griglia o in riga — e si esce dalla griglia prima di inserire. Il
       riquadro nasce cosi' largo quanto tutta la griglia, che e' l'unico
       posto in cui una spiegazione si legge. */
    /* DOVE VA MESSO IL RIQUADRO (riscritto il 17/09/2026).
       Igor, davanti a una spiegazione compressa in una colonna: «non e'
       sistemato, controlla tutti i punti interrogativi, su tutte le
       dimensioni di schermo». Le versioni precedenti elencavano i casi
       (griglia, fila, tabella…) e ogni volta ne mancava uno. Adesso la
       regola e' una sola e misura, non indovina: si sale dalla parola
       finche' non si trova un contenitore in flusso normale (display
       block) largo almeno quattro quinti del riquadro che contiene la
       parola, che non sia un pezzo di tabella e che non scorra di lato. Il
       riquadro va dopo il figlio di quel contenitore che contiene la
       parola. Cosi' nasce sempre largo quanto il testo che il lettore sta
       leggendo, qualunque sia la disposizione intorno alla parola. */
    var limite = (el.closest && el.closest('.riquadro, .apribile-corpo, .passo, .capitolo, .glossario-pannello, article, main, .contenitore')) || document.body;
    var largoLimite = limite.getBoundingClientRect().width || 0;
    var dove = el;
    var risalite = 0;
    while (dove.parentNode && dove.parentNode !== document.body && risalite < 12) {
      var padre = dove.parentNode;
      if (padre === limite) { break; }
      var st = null;
      try { st = G.getComputedStyle(padre); } catch (e) { break; }
      var disp = st.display;
      var inFlusso = disp === 'block' || disp === 'flow-root' || disp === 'list-item';
      if (disp === 'grid' || disp === 'inline-grid') {
        /* una griglia a colonna sola e' come un blocco */
        inFlusso = !/\s/.test((st.gridTemplateColumns || '').trim());
      }
      /* si esce anche dagli elenchi: dentro un punto di un elenco il riquadro
         erediterebbe il rientro (misurato: 241 px su uno schermo da 360) */
      var tabellare = /^table|^inline-table/.test(disp) || /^(TR|TBODY|THEAD|TFOOT|TABLE|UL|OL|DL)$/.test(padre.tagName);
      var scorre = /(auto|scroll)/.test(st.overflowX || '');
      var largo = padre.getBoundingClientRect().width >= largoLimite * 0.8;
      if (inFlusso && !tabellare && !scorre && largo) { break; }
      dove = padre;
      risalite++;
    }
    if (dove.parentNode) { dove.parentNode.insertBefore(box, dove.nextSibling); }
    el.setAttribute('aria-controls', id);
    return box;
  }

  function inverti(el) {
    var box = riquadroDi(el);
    if (!box) { return; }
    var aperto = !box.hidden;
    box.hidden = aperto;
    el.setAttribute('aria-expanded', String(!aperto));
    /* il riquadro puo' stare sotto una tabella lunga: quando si apre, se
       non e' gia' in vista, la pagina scorre fino a mostrarlo */
    if (!aperto && box.scrollIntoView) {
      try {
        var r = box.getBoundingClientRect();
        var alto = G.innerHeight || document.documentElement.clientHeight;
        if (r.top < 70 || r.bottom > alto) {
          box.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
      } catch (e) { /* browser vecchio: resta dov'e' */ }
    }
  }

  function parolaDa(bersaglio) {
    return bersaglio && bersaglio.closest ? bersaglio.closest('[data-parola]') : null;
  }

  /* ══════════════════ LE CATEGORIE: UNA PICCOLA WIKI, NON UN ELENCO ═══════════════
     Fino al 15/09/2026 il glossario era un elenco solo, in due gruppi
     («si impostano» / «si leggono»): con ventinove voci si leggeva, con
     novantanove — tante ne sono arrivate nella giornata del 15/09 — era un
     muro. E quel muro stava in fondo a TUTTE e dodici le pagine, oltre che
     nel pannello: ogni pagina finiva con novantanove definizioni di fila.
     Igor, il 16/09: «non voglio pagine lunghe e infinite; tasti ben
     evidenti con link ai contenuti; non esagerare con i tasti per andare
     da un argomento all'altro».

     Quindi: dieci categorie, ognuna piccola (da due a sedici voci). Si apre
     con un indice di tasti — uno per categoria, con il numero di parole e
     una riga che dice di che cosa parla — e si entra in una categoria per
     volta. Dentro, le voci sono brevi: la definizione si legge subito,
     l'esempio si apre solo se lo si vuole. Un tasto solo per tornare
     all'indice, e nessun rimando da una parola all'altra: il lettore non
     deve finire in una ragnatela.

     Ogni voce sta in UNA categoria sola. Se qualcuno aggiunge una voce a
     spiegazioni.js e si dimentica di metterla qui, finisce da sola in
     «Altre parole» — e _test/glossario.js lo segnala, perche' una parola
     senza casa e' una parola che il lettore non trova. */
  var CATEGORIE = [
    { id: 'valori', titolo: 'I nove valori che imposti tu',
      breve: 'Le nove cose che descrivono la scena. Le muovi con i cursori, e la probabilità cambia.',
      chiavi: ['P0', 'E', 'I', 'T', 'M', 'BP', 'C', 'piSTR', 'DEB'] },
    { id: 'calcolo', titolo: 'Come nasce il numero',
      breve: 'Da un gesto a una probabilità: la formula, i tagli, i tetti, e la regola che ogni fatto si conta una volta sola.',
      chiavi: ['nodo', 'probabilita', 'grezza', 'clamp', 'taglio', 'accumulatore',
               'nodo_a_vuoto', 'penstr', 'bp_stato', 'domicilio_unico', 'taratura'] },
    { id: 'dado', titolo: 'Il dado e i nove esiti',
      breve: 'Una probabilità non è ancora un esito: si tira il dado, si misura il margine, e un gesto può finire in nove modi diversi.',
      chiavi: ['dado', 'seme', 'margine', 'ms', 'mf', 'msnet', 'esito',
               'successo_pulito', 'successo_costoso_sostenibile', 'successo_danneggiato',
               'successo_tossico', 'successo_tecnico_fallimento_umano', 'fallimento_lieve',
               'fallimento_tecnico', 'fallimento_sistemico', 'quasi_collasso'] },
    { id: 'stato', titolo: 'Lo stato che resta dopo',
      breve: 'Quello che un gesto lascia addosso, e che il gesto dopo si ritrova: carico, assetto, costo nascosto, recupero.',
      chiavi: ['assetto', 'carico', 'debito', 'costo_nascosto', 'soglia', 'regime', 'spirale',
               'rip', 'ri4', 'cooldown', 'or1', 'adattamento', 'delega_vera',
               'supporto_reale', 'over_functioning'] },
    { id: 'sicurezza', titolo: 'Le due protezioni',
      breve: 'Il «pavimento», che rallenta il recupero quando il carico è già troppo alto, e il «cancello», che ferma il calcolo quando un numero non sarebbe la risposta giusta. Si accendono da soli.',
      chiavi: ['pavimento', 'safetystop'] },
    { id: 'scena', titolo: 'La scena, la catena, il tempo lungo',
      breve: 'Più gesti di fila, una giornata intera, settimane e mesi: come lo stato passa da un anello all’altro.',
      chiavi: ['campo', 'catena', 'micro_azione', 'micro_semantica', 'micro_frame',
               'microvariazione', 'granularita', 'trasferimento_di_stato', 'due_assi',
               'mini_settimana', 'peso_della_giornata', 'traiettoria', 'saturazione'] },
    { id: 'domande', titolo: 'Le domande, le risposte, e quanto fidarsi',
      breve: 'Come il questionario riconosce la tua situazione, e quanto vale ogni risposta: certa, stimata, presa in prestito.',
      chiavi: ['territori', 'provenienza', 'attendibilita'] },
    { id: 'distribuzione', titolo: 'Leggere un mucchio di ripetizioni',
      breve: 'Quando la stessa scena si ripete mille volte: media, mediana, percentili, e la forma di tutti i casi.',
      chiavi: ['ripetizione', 'ripetizioni', 'valutazioni', 'campione', 'distribuzione', 'media',
               'mediana', 'percentile', 'varianza', 'deviazione', 'quota', 'fascia', 'coda',
               'delta', 'istogramma', 'numerosita'] },
    { id: 'metodi', titolo: 'I metodi e le prove statistiche',
      breve: 'Gli strumenti con cui il simulatore dice quanto è sicuro di un numero, e quando due numeri sono davvero diversi.',
      chiavi: ['monte_carlo', 'intervallo_di_confidenza', 'semiampiezza', 'scarto_z',
               'wilson', 'mcnemar', 'bonferroni', 'correlazione', 'variazione',
               'convergenza'] },
    { id: 'macchina', titolo: 'Il simulatore, visto da dentro',
      breve: 'Com’è fatta la macchina che calcola e come sceglie le parole: il motore, i suoi pezzi, e i loro nomi inglesi.',
      chiavi: ['motore', 'registro', 'budget', 'runner', 'cluster', 'checkpoint', 'audit',
               'payload', 'blueprint', 'overlay'] }
  ];

  /* le voci vere (non le sigle, che sono secondi nomi): quelle che
     DEVONO stare in una categoria */
  function chiaviVere() {
    var S = G.Spiegazioni || {};
    return Object.keys(S.termini || {})
      .concat(Object.keys(S.parole || {}))
      .concat(Object.keys(S.esiti || {}));
  }

  /* le voci che nessuna categoria ha preso: nella pagina vanno in «Altre
     parole», e il controllo automatico se ne accorge */
  function chiaviOrfane() {
    var prese = {};
    CATEGORIE.forEach(function (c) { c.chiavi.forEach(function (k) { prese[k] = true; }); });
    return chiaviVere().filter(function (k) { return !prese[k]; });
  }

  /* gli esiti vivono in un blocco a parte di spiegazioni.js, con un altro
     formato (nome, breve, esempio — senza sigla). Qui si leggono allo stesso
     modo delle altre voci. */
  function vocePer(k) {
    if (VOCI === null) { VOCI = voci(); }
    if (VOCI[k]) { return VOCI[k]; }
    var S = G.Spiegazioni || {};
    var e = S.esiti && S.esiti[k];
    if (!e) { return null; }
    return { nome: e.nome, sigla: '', breve: e.breve, esempio: e.esempio };
  }

  function aParagrafiTesto(t) {
    return String(t).split(/\n\s*\n/).map(function (pezzo) {
      return '<p>' + esc(pezzo.trim()) + '</p>';
    }).join('');
  }

  function rigaVoce(k) {
    var v = vocePer(k);
    if (!v) { return ''; }
    return '<div class="voce-glossario" data-wiki-voce="' + esc(k) + '"><dt>' + esc(v.nome) +
      (v.sigla ? ' <span class="glossa-sigla">' + esc(v.sigla) + '</span>' : '') +
      '</dt><dd>' + aParagrafiTesto(v.breve) +
      (v.esempio
        ? '<details class="glossa-dettaglio"><summary>Un esempio</summary>' +
          aParagrafiTesto(v.esempio) + '</details>'
        : '') +
      '</dd></div>';
  }

  /* Il glossario intero, a categorie. Scrive TUTTO nell'HTML — ogni
     categoria con le sue voci — e mostra solo l'indice: le categorie sono
     nascoste con «hidden», non assenti, cosi' la ricerca le trova tutte, la
     stampa le stampa tutte, e chi ha JavaScript spento vede comunque i
     titoli. */
  function riempiGlossario(el) {
    var orfane = chiaviOrfane();
    var tutte = orfane.length
      ? CATEGORIE.concat([{ id: 'altre', titolo: 'Altre parole',
                            breve: 'Parole spiegate ma non ancora messe in una categoria.',
                            chiavi: orfane }])
      : CATEGORIE;

    var tasti = tutte.map(function (c) {
      var quante = c.chiavi.filter(vocePer).length;
      return '<button type="button" class="wiki-tasto" data-wiki-apri="' + esc(c.id) + '">' +
        '<span class="wiki-tasto-titolo">' + esc(c.titolo) + '</span>' +
        '<span class="wiki-tasto-quante">' + quante + (quante === 1 ? ' parola' : ' parole') + '</span>' +
        '<span class="wiki-tasto-breve">' + esc(c.breve) + '</span>' +
        '</button>';
    }).join('');

    var pagine = tutte.map(function (c) {
      return '<section class="wiki-pagina" data-wiki-pagina="' + esc(c.id) + '" hidden>' +
        '<button type="button" class="wiki-torna" data-wiki-indice>← Tutte le categorie</button>' +
        '<h3 class="glossario-titolo">' + esc(c.titolo) + '</h3>' +
        '<p class="glossario-intro">' + esc(c.breve) + '</p>' +
        '<dl class="glossario-elenco">' + c.chiavi.map(rigaVoce).join('') + '</dl>' +
        '</section>';
    }).join('');

    el.innerHTML =
      '<div class="wiki" data-wiki-stato="indice">' +
        '<div class="wiki-indice">' + tasti + '</div>' +
        pagine +
        '<p class="wiki-vuoto nota" hidden>Nessuna parola con queste lettere.</p>' +
      '</div>';

    /* l'interattivita' solo dove c'e' un documento vero: nei banchi di
       prova el e' un oggetto con il solo innerHTML, e non deve esplodere */
    if (typeof el.addEventListener !== 'function' || typeof el.querySelector !== 'function') { return; }
    var wiki = el.querySelector('.wiki');
    if (!wiki) { return; }

    function mostra(stato, id) {
      wiki.setAttribute('data-wiki-stato', stato);
      var indice = wiki.querySelector('.wiki-indice');
      if (indice) { indice.hidden = stato !== 'indice'; }
      Array.prototype.forEach.call(wiki.querySelectorAll('.wiki-pagina'), function (p) {
        p.hidden = !(stato === 'pagina' && p.getAttribute('data-wiki-pagina') === id);
      });
    }

    el.addEventListener('click', function (e) {
      var t = e.target && e.target.closest ? e.target.closest('[data-wiki-apri], [data-wiki-indice]') : null;
      if (!t || !el.contains(t)) { return; }
      if (t.hasAttribute('data-wiki-apri')) {
        mostra('pagina', t.getAttribute('data-wiki-apri'));
        var pag = wiki.querySelector('.wiki-pagina:not([hidden])');
        if (pag && pag.scrollIntoView) { pag.scrollIntoView({ block: 'start' }); }
      } else {
        mostra('indice');
      }
    });
  }

  /* LA RICERCA: quando si scrive qualcosa, l'indice sparisce e restano
     solo le voci che contengono quelle lettere, da qualunque categoria
     vengano, con il nome della categoria come titolo — testo, non un
     rimando. Cancellato il testo, torna l'indice. */
  function filtra(el, testo) {
    var wiki = el.querySelector ? el.querySelector('.wiki') : null;
    if (!wiki) { return 0; }
    var cerca = String(testo || '').trim().toLowerCase();
    var indice = wiki.querySelector('.wiki-indice');
    var vuoto = wiki.querySelector('.wiki-vuoto');
    var visti = 0;
    if (!cerca) {
      wiki.setAttribute('data-wiki-stato', 'indice');
      if (indice) { indice.hidden = false; }
      Array.prototype.forEach.call(wiki.querySelectorAll('.wiki-pagina'), function (p) {
        p.hidden = true;
        Array.prototype.forEach.call(p.querySelectorAll('.voce-glossario'), function (v) { v.hidden = false; });
      });
      if (vuoto) { vuoto.hidden = true; }
      return -1;
    }
    wiki.setAttribute('data-wiki-stato', 'ricerca');
    if (indice) { indice.hidden = true; }
    Array.prototype.forEach.call(wiki.querySelectorAll('.wiki-pagina'), function (p) {
      var qualcuna = false;
      Array.prototype.forEach.call(p.querySelectorAll('.voce-glossario'), function (v) {
        /* i trattini morbidi della sillabazione (U+00AD) non devono
           impedire di trovare una parola */
        var dentro = v.textContent.replace(/\u00AD/g, '').toLowerCase().indexOf(cerca) >= 0;
        v.hidden = !dentro;
        if (dentro) { qualcuna = true; visti++; }
      });
      p.hidden = !qualcuna;
    });
    if (vuoto) { vuoto.hidden = visti > 0; }
    return visti;
  }

  function decoraTutte() {
    var parole = document.querySelectorAll('[data-parola]');
    var mute = [];
    Array.prototype.forEach.call(parole, function (el) {
      if (!decora(el)) { mute.push(el.getAttribute('data-parola')); }
    });
    return { quante: parole.length, mute: mute };
  }

  var avviato = false;
  function avvia() {
    if (avviato) { decoraTutte(); return; }
    avviato = true;

    /* un ascoltatore solo, sul documento: vale anche per le parole che
       nascono dopo, senza che nessuno debba richiamare niente */
    document.addEventListener('click', function (e) {
      var el = parolaDa(e.target);
      if (el && el.getAttribute('data-glossa-pronta')) { inverti(el); }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') { return; }
      var el = parolaDa(e.target);
      if (el && el.getAttribute('data-glossa-pronta')) { e.preventDefault(); inverti(el); }
    });

    Array.prototype.forEach.call(document.querySelectorAll('[data-glossario]'),
      riempiGlossario);

    /* in stampa gli esempi richiusi si aprono: un <details> chiuso non si
       stampa, e un glossario senza esempi sulla carta e' mezzo glossario.
       Dopo la stampa si richiudono quelli che erano chiusi. */
    if (typeof G.addEventListener === 'function') {
      var apertiPerStampa = [];
      G.addEventListener('beforeprint', function () {
        apertiPerStampa = [];
        Array.prototype.forEach.call(document.querySelectorAll('.glossa-dettaglio'), function (d) {
          if (!d.open) { d.open = true; apertiPerStampa.push(d); }
        });
      });
      G.addEventListener('afterprint', function () {
        apertiPerStampa.forEach(function (d) { d.open = false; });
        apertiPerStampa = [];
      });
    }

    var esito = decoraTutte();

    /* e le parole che compaiono dopo: i cursori, i risultati, tutto quello
       che l'interfaccia costruisce quando il lettore preme un bottone */
    if (typeof MutationObserver !== 'undefined') {
      new MutationObserver(function () { decoraTutte(); })
        .observe(document.body, { childList: true, subtree: true });
    }

    /* una parola senza voce non e' un dettaglio: il lettore ci clicca sopra
       e non succede niente. Si vede in console, e _test/glossario.js la
       trova prima che arrivi al lettore. */
    if (esito.mute.length && G.console) {
      G.console.warn('[glossario] parole senza voce: ' + esito.mute.join(', '));
    }
  }


  /* ══════════════ L'INDICE DEI TERMINI, CHE SI APRE CON UN TASTO ══════════════
     Il glossario c'era gia', ma stava in fondo alla pagina: per leggere che
     cosa vuol dire una parola bisognava smettere di leggere, scorrere fino
     in fondo, cercarla e poi ritrovare il punto in cui si era. Su una pagina
     lunga come IL-MODELLO sono parecchi metri di rotella.
     Adesso lo stesso glossario — le stesse voci, scritte in un posto solo —
     si apre anche in un pannello sopra la pagina, da qualunque punto, con il
     tasto «Glossario» della barra in alto. Si chiude con Esc, con il tasto,
     o cliccando fuori.
     Con sessantotto voci un elenco da scorrere non basta piu': c'e' una
     casella che filtra mentre scrivi. Chiesto da Igor l'11/09/2026. */
  var pannello = null;

  function costruisciPannello() {
    var d = document.createElement('dialog');
    d.className = 'indice-termini';
    d.innerHTML =
      '<form method="dialog" class="indice-alto">' +
        '<h2>Le parole, spiegate</h2>' +
        '<input type="search" class="indice-filtro" ' +
          'placeholder="Cerca una parola…" aria-label="Cerca una parola fra quelle spiegate">' +
        '<button value="chiudi" class="fantasma indice-chiudi" ' +
          'aria-label="Chiudi l’indice dei termini">Chiudi</button>' +
      '</form>' +
      '<div class="indice-corpo"></div>';

    var corpo = d.querySelector('.indice-corpo');
    riempiGlossario(corpo);

    /* la ricerca la fa la wiki stessa (filtra): l'indice sparisce mentre si
       scrive, e torna quando la casella si svuota */
    var filtro = d.querySelector('.indice-filtro');
    filtro.addEventListener('input', function () { filtra(corpo, filtro.value); });

    /* cliccare fuori dal pannello lo chiude: il clic sul <dialog> stesso
       arriva solo quando si e' colpito lo sfondo, non il contenuto */
    d.addEventListener('click', function (e) { if (e.target === d) { d.close(); } });

    document.body.appendChild(d);
    return d;
  }

  function apriIndice() {
    if (!pannello) { pannello = costruisciPannello(); }
    if (typeof pannello.showModal === 'function') { pannello.showModal(); }
    else { pannello.setAttribute('open', ''); }
    var f = pannello.querySelector('.indice-filtro');
    if (f) { f.value = ''; f.dispatchEvent(new Event('input')); f.focus(); }
  }

  var API = { laVoce: laVoce, voci: voci, avvia: avvia,
              riempiGlossario: riempiGlossario, decoraTutte: decoraTutte,
              apriIndice: apriIndice, filtra: filtra,
              /* la struttura della wiki, per i controlli automatici */
              CATEGORIE: CATEGORIE, chiaviVere: chiaviVere, chiaviOrfane: chiaviOrfane };
  G.Glossario = API;
  if (typeof module !== 'undefined' && module.exports) { module.exports = API; }
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', avvia);
    } else { avvia(); }
  }
}(typeof window !== 'undefined' ? window : this));
