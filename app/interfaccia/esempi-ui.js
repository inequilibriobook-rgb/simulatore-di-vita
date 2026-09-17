/* =============================================================================
   SIMULATORE 3.0 — I casi del libro, ricalcolati mentre li leggi
   =============================================================================
   Script classico, nessun modulo, nessuna fetch: funziona da file://

   COSA FA DI DIVERSO DALLE ALTRE PAGINE
   Le altre pagine calcolano quello che scrivi tu. Questa calcola quello che
   c'e' stampato nel libro, e mette i due numeri uno accanto all'altro: il
   Pn della scheda e il Pn che il motore produce adesso.

   Non e' una decorazione. Se un giorno il motore cambiasse e non
   riproducesse piu' una scheda, si vedrebbe qui, in pagina, senza dover
   lanciare niente — e _test/casi.js fallirebbe prima ancora.
   ========================================================================== */
(function () {
  'use strict';

  var globale = window;
  var C = window.Casi, N = window.Nucleo, S = window.Spiegazioni, Lg = window.Lingua;

  (function (mancanti) {
    if (!mancanti.length) { return; }
    throw new Error('esempi-ui.js: manca ' + mancanti.join(', ') +
      '. Ordine di caricamento: calibrazione.js, lingua.js, casuale-mt.js, nucleo.js, ' +
      'spiegazioni.js, casi.js, e solo dopo questo file.');
  }([['Casi', C], ['Nucleo', N], ['Spiegazioni', S], ['Lingua', Lg]]
    .filter(function (x) { return !x[1]; })
    .map(function (x) { return x[0]; })));

  function esc(t) {
    return String(t).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function q(id) { return document.getElementById(id); }

  /* CENTO PER CENTO DEVE FARE CENTO.
     Nella scheda della pratica online si leggeva «64 % · 22 % · 15 %» — che
     fa 101 — e tre righe sotto «19 · 28 · 54», che fa ancora 101. Due volte
     nella stessa scheda, e in un'altra la somma faceva 99. Nessuno dei numeri
     era sbagliato: era sbagliato arrotondarli uno per uno e poi metterli in
     fila, perche' i resti non spariscono, si accumulano.
     Qui si dà a ognuno la sua parte intera, e i punti che avanzano vanno a
     chi ha il resto piu' grande: il totale fa sempre cento, e nessuna riga si
     allontana di piu' di un punto dal valore vero. */
  /* Il meno della matematica (−) e non il trattino della tastiera (-): nella
     stessa scheda ci sono le righe della formula composta dal Canone, che il
     segno giusto lo usano, e i tasselli accanto scrivevano «-8». */
  function num(n) { return Lg.intero(n); }
  function conSegno(n) { return (n > 0 ? '+' : '') + num(n); }

  function percentuali(valori, totale) {
    if (!totale) { return valori.map(function () { return 0; }); }
    var esatti = valori.map(function (n) { return n / totale * 100; });
    var interi = esatti.map(function (x) { return Math.floor(x); });
    var avanzano = 100 - interi.reduce(function (a, b) { return a + b; }, 0);
    esatti.map(function (x, i) { return { i: i, resto: x - Math.floor(x) }; })
      .sort(function (a, b) { return b.resto - a.resto; })
      .slice(0, Math.max(0, avanzano))
      .forEach(function (x) { interi[x.i]++; });
    return interi;
  }

  /* ---------------------------------------------------------------------
     LE QUATTRO FASCE DI LETTURA DI Pn
     ---------------------------------------------------------------------
     ATTENZIONE, E VA DETTO IN CHIARO: queste quattro fasce NON sono nel
     canone. Il libro dà fasce per il margine — 0-9 fragile, 10-24 normale,
     25 in su forte — e non ne dà per Pn.

     Servono solo a colorare le schede in questa pagina, perche' venti
     numeri tutti dello stesso colore non si leggono. Sono dichiarate qui,
     dichiarate a schermo nella legenda, e non entrano in nessun calcolo. */
  var FASCE_PN = [
    { da: 60, nome: 'probabile',   stato: 'buono',
      dice: 'la scena, così com’è, tende a riuscire' },
    { da: 35, nome: 'incerta',     stato: 'attenzione',
      dice: 'può andare bene come male: a decidere è il dado' },
    { da: 15, nome: 'in salita',   stato: 'serio',
      dice: 'parte svantaggiata, e la riuscita costerà' },
    { da: 0,  nome: 'quasi persa', stato: 'critico',
      dice: 'non serve insistere: serve cambiare la scena' }
  ];
  function fasciaPn(pn) {
    for (var i = 0; i < FASCE_PN.length; i++) { if (pn >= FASCE_PN[i].da) { return FASCE_PN[i]; } }
    return FASCE_PN[FASCE_PN.length - 1];
  }

  function nodoDa(caso) {
    var v = caso.valori;
    return {
      id: caso.id, descrizione: caso.titolo, p0: v.P0,
      modificatori: { energia_e: v.E, informazione_i: v.I, tempo_t: v.T,
                      materiale_m: v.M, bonus_bp: v.BP, complessita_c: v.C },
      stato_prima: { stress_str: v.STR, posizione_pos: 60, debito_deb: v.DEB, rip: 'debole' }
    };
  }

  /* il collegamento verso i cursori: la scheda si apre nel primo gradino
     con gli stessi valori, e da lì si può muovere */
  function collegamentoCursori(caso) {
    var v = caso.valori;
    return 'IL-GESTO.html#p0=' + v.P0 + '&e=' + v.E + '&i=' + v.I + '&t=' + v.T +
      '&m=' + v.M + '&bp=' + v.BP + '&c=' + v.C + '&str=' + v.STR + '&deb=' + v.DEB +
      '&d=' + encodeURIComponent(caso.titolo);
  }

  /* ---------------------------------------------------------------------
     LA SCHEDA CHIUSA
     --------------------------------------------------------------------- */
  function cartaCaso(caso) {
    if (caso.pn === null) {
      return '<button type="button" class="carta-caso senza-numero" data-caso="' + esc(caso.id) + '">' +
        '<span class="caso-alto"><span class="caso-territorio">' + esc(caso.territorio) + '</span>' +
        '<span class="caso-pn niente" title="Questa scheda non ha un numero, e non è una ' +
        'dimenticanza: è voluto.">—</span></span>' +
        '<span class="caso-titolo">' + esc(caso.titolo) + '</span>' +
        '<span class="caso-decide">' + esc(caso.senza_calcolo) + '</span></button>';
    }
    var f = fasciaPn(caso.pn);
    return '<button type="button" class="carta-caso" data-caso="' + esc(caso.id) + '" ' +
      'style="--tinta:' + S.colori[f.stato] + '">' +
      '<span class="caso-alto">' +
        '<span class="caso-territorio">' + esc(caso.territorio || '') + '</span>' +
        '<span class="caso-pn">' + caso.pn + '<small>%</small></span></span>' +
      '<span class="caso-titolo">' + esc(caso.titolo) + '</span>' +
      '<span class="caso-pista"><span class="caso-barra" style="width:' + caso.pn + '%"></span></span>' +
      '<span class="caso-decide">decide: ' + esc(caso.decide) + '</span></button>';
  }

  /* ---------------------------------------------------------------------
     LA FORMULA SMONTATA, CON I NUMERI DELLA SCHEDA
     --------------------------------------------------------------------- */
  function terminiDi(caso) {
    var r = N.eseguiNodo(nodoDa(caso), { tiro: 50 });
    var t = r.termini;
    return {
      pn: r.pn, grezzo: r.pn_grezzo_prima_del_clamp,
      voci: [
        { k: 'P0',    nome: 'punto di partenza',  val: t.P0,    base: true },
        { k: 'E',     nome: 'il corpo adesso',    val: t.E },
        { k: 'I',     nome: 'quanto è chiaro',    val: t.I },
        { k: 'T',     nome: 'la fretta',          val: t.T },
        { k: 'M',     nome: 'l’ambiente',         val: t.M },
        { k: 'BP',    nome: 'ciò che protegge',   val: t.BP },
        { k: '5·C',   nome: 'i pezzi da coordinare (C=' + caso.valori.C + ')', val: t.C },
        { k: 'PenSTR', nome: 'il carico a ' + caso.valori.STR, val: t.piSTR },
        { k: '5·DEB', nome: 'il debito (DEB=' + caso.valori.DEB + ')', val: t.DEB }
      ]
    };
  }

  function barraTermini(caso) {
    var d = terminiDi(caso);
    var vive = d.voci.filter(function (v) { return v.val !== 0 || v.base; });
    var maxAss = Math.max.apply(null, vive.map(function (v) { return Math.abs(v.val); }));
    var righe = vive.map(function (v) {
      var largo = maxAss ? Math.abs(v.val) / maxAss * 100 : 0;
      var verso = v.base ? 'base' : (v.val > 0 ? 'piu' : 'meno');
      return '<div class="riga-termine ' + verso + '">' +
        '<span class="termine-k"><span data-parola="' + esc(v.k.replace('5·', '').replace('Pen', 'pi')) +
          '">' + esc(v.k) + '</span></span>' +
        '<span class="termine-nome">' + esc(v.nome) + '</span>' +
        '<span class="termine-pista"><span class="termine-barra" style="width:' + largo.toFixed(1) + '%"></span></span>' +
        '<span class="termine-val">' + (v.base ? num(v.val) : conSegno(v.val)) + '</span>' +
        '</div>';
    }).join('');

    /* LA RIGA DEL CALCOLO, COMPOSTA COME NEL LIBRO.
       app/dati/formule.js la contiene gia' tradotta in MathML, generata dal
       Canone: cosi' il lettore che ha il libro accanto vede la stessa riga,
       nella stessa forma. Se il file non fosse stato rigenerato si ripiega
       sulla riga in caratteri semplici, che c'e' sempre. */
    var riga = '';
    if (globale && globale.Formule && caso.titoloLibro) {
      var sch = globale.Formule.schedaPerTitolo(caso.titoloLibro);
      if (sch) { riga = '<div class="formula-libro">' + sch.mathml + '</div>'; }
    }
    if (!riga && caso.praw) {
      riga = '<p class="caso-praw"><code>' + esc(caso.praw) + '</code></p>';
    }

    var taglio = d.grezzo !== d.pn
      ? '<p class="nota-taglio"><strong>Il taglio ai bordi è intervenuto.</strong> ' +
        'La somma di tutte le righe qui sopra, quella che il libro chiama il <em>grezzo</em>, ' +
        'faceva ' + num(d.grezzo) + ', ed è fuori dai due confini fra cui una probabilità può ' +
        'stare. Il taglio la riporta a ' + d.pn + '. Serve a evitare probabilità ' +
        'assurde, non a nascondere errori di taratura.</p>'
      : '<p class="nota-taglio spento">Il taglio ai bordi non ha dovuto fare niente: la somma ' +
        'di tutte le righe qui sopra fa ' + num(d.grezzo) + ', ed è già fra 5 e 95.</p>';

    return riga + '<div class="termini">' + righe + '</div>' + taglio;
  }

  /* ---------------------------------------------------------------------
     E SE TIRASSI IL DADO? — cinquecento volte, sulla stessa scheda
     ---------------------------------------------------------------------
     E' la cosa che il libro ripete piu' spesso e che una scheda stampata
     non puo' mostrare: Pn NON e' l'esito. Qui si vede che su cinquecento
     tiri la quota di riuscite si avvicina a Pn — e che le riuscite non si
     somigliano fra loro. */
  function tiraTante(caso, quante) {
    var rng = new window.CasualePython(910000);
    var nodo = nodoDa(caso);
    var esiti = {}, riusciti = 0, margini = [];
    for (var i = 0; i < quante; i++) {
      var r = N.eseguiNodo(nodo, { rng: rng });
      esiti[r.esito] = (esiti[r.esito] || 0) + 1;
      if (r.successo_prima_del_campo) { riusciti++; }
      margini.push(r.margine_grezzo);
    }
    return { esiti: esiti, riusciti: riusciti, quante: quante, margini: margini };
  }

  function bloccoDado(caso) {
    var d = tiraTante(caso, 500);
    var quota = Math.round(d.riusciti / d.quante * 100);
    var ordinati = Object.keys(d.esiti).map(function (k) {
      return { k: k, n: d.esiti[k] };
    }).sort(function (a, b) { return b.n - a.n; });

    var pEsiti = percentuali(ordinati.map(function (o) { return o.n; }), d.quante);
    var strisce = ordinati.map(function (o, i) {
      var info = S.esiti[o.k] || { titolo: o.k, stato: 'attenzione', glifo: '·' };
      return '<div class="riga-esito" style="--tinta:' + S.colori[info.stato] + '">' +
        '<span class="esito-glifo">' + info.glifo + '</span>' +
        '<span class="esito-nome">' + esc(info.titolo) + '</span>' +
        '<span class="esito-pista"><span class="esito-barra" style="width:' +
          (o.n / d.quante * 100).toFixed(1) + '%"></span></span>' +
        '<span class="esito-n">' + pEsiti[i] + '%</span></div>';
    }).join('');

    /* le tre fasce del margine, quelle vere del capitolo 9 */
    var fr = 0, no = 0, fo = 0;
    d.margini.forEach(function (m) {
      if (m <= 9) { fr++; } else if (m <= 24) { no++; } else { fo++; }
    });
    var pMarg = percentuali([fr, no, fo], d.quante);

    return '<div class="dado-blocco">' +
      '<p class="dado-titolo">Cinquecento tiri sulla stessa scheda</p>' +
      '<p class="dado-riga">È riuscita <b>' + quota + ' ' +
      Lg.concorda(quota, 'volta', 'volte') + ' su cento</b>. ' +
      'La scheda dice Pn = ' + caso.pn + ', e su tanti tiri le riuscite finiscono per ' +
      'avvicinarsi a quel numero: è quello il senso di Pn. ' +
      '<span data-parola="dado">Il dado</span> decide il singolo caso, non la probabilità.</p>' +
      strisce +
      '<p class="dado-margini">E i margini? Il capitolo 9 li raggruppa in tre fasce, cioè tre ' +
      'scaglioni di distanza fra il dado e la soglia. Eccoli: ' +
      '<b>' + pMarg[0] + '%</b> fragile, da 0 a 9; ' +
      '<b>' + pMarg[1] + '%</b> normale, da 10 a 24; ' +
      '<b>' + pMarg[2] + '%</b> forte, da 25 in su. ' +
      'Un esito con margine fragile, la prossima volta, può andare al contrario ' +
      'senza che sia cambiato niente: era passato per un soffio.</p>' +
      '</div>';
  }

  /* ---------------------------------------------------------------------
     LA SCHEDA APERTA
     --------------------------------------------------------------------- */
  function tassello(k, val) {
    var conIlPiu = (typeof val === 'number' && val > 0 && k !== 'P0' && k !== 'C' &&
                    k !== 'STR' && k !== 'DEB');
    return '<div class="tassello"><div class="k"><span data-parola="' + esc(k) + '">' +
      esc(k) + '</span></div><div class="v">' +
      (conIlPiu ? conSegno(val) : num(val)) + '</div></div>';
  }

  function dettaglio(caso) {
    if (caso.pn === null) {
      return '<div class="caso-aperto senza-numero">' +
        '<p class="caso-scena">' + esc(caso.scena) + '</p>' +
        '<div class="riquadro-fermo"><p class="fermo-titolo">' + esc(caso.senza_calcolo) + '</p></div>' +
        '<p class="caso-lettura">' + esc(caso.lettura) + '</p>' +
        '<p class="caso-fonte">Nel ' + esc(caso.fonte) + '</p></div>';
    }

    var r = N.calcolaPn(nodoDa(caso));
    var accordo = r.pn === caso.pn;
    var f = fasciaPn(caso.pn);
    var v = caso.valori;

    return '<div class="caso-aperto">' +
      '<p class="caso-scena">' + esc(caso.scena) + '</p>' +

      '<div class="confronto-pn ' + (accordo ? 'accordo' : 'disaccordo') + '">' +
        '<div class="pn-lato"><span class="pn-eti">Il libro stampa</span>' +
          '<span class="pn-num">' + caso.pn + '</span></div>' +
        '<div class="pn-segno" aria-hidden="true">' + (accordo ? '=' : '≠') + '</div>' +
        '<div class="pn-lato"><span class="pn-eti">Il motore calcola, adesso</span>' +
          '<span class="pn-num">' + r.pn + '</span></div>' +
        '<p class="pn-verdetto">' + (accordo
          ? 'Coincidono. Questo numero non è scritto nella pagina: è stato calcolato ' +
            'un istante fa da <code>app/motore/nucleo.js</code>, con i valori della scheda.'
          : 'NON coincidono. È un errore, e va guardato prima di credere a questa pagina.') +
        '</p></div>' +

      (caso.nota ? '<p class="caso-nota">' + esc(caso.nota) + '</p>' : '') +

      '<p class="caso-eti">I nove valori della scheda</p>' +
      '<div class="tasselli">' +
        tassello('P0', v.P0) + tassello('E', v.E) + tassello('I', v.I) + tassello('T', v.T) +
        tassello('M', v.M) + tassello('BP', v.BP) + tassello('C', v.C) +
        tassello('STR', v.STR) + tassello('DEB', v.DEB) +
      '</div>' +

      '<p class="caso-eti">Che cosa aggiunge e che cosa toglie</p>' +
      barraTermini(caso) +

      '<p class="caso-eti">Come li legge il libro</p>' +
      '<p class="caso-conti">' + esc(caso.conti) + '</p>' +
      '<p class="caso-lettura"><b>' + esc(f.nome.charAt(0).toUpperCase() + f.nome.slice(1)) +
        ':</b> ' + esc(f.dice) + '. ' + esc(caso.lettura) + '</p>' +

      bloccoDado(caso) +

      '<div class="caso-azioni">' +
        '<a class="bottone primario" href="' + collegamentoCursori(caso) + '">Aprilo nei cursori e cambia i numeri</a>' +
        '<a class="bottone secondario" href="MONTECARLO.html#caso=' + esc(caso.id) + '">Ripetilo mille volte</a>' +
      '</div>' +
      '<p class="caso-fonte">Nel ' + esc(caso.fonte) + '</p>' +
      '</div>';
  }

  /* ---------------------------------------------------------------------
     IL CONFRONTO DEL CAPITOLO 5 — stesso nodo, due campi
     --------------------------------------------------------------------- */
  function confrontoCapitolo5() {
    var due = C.CAPITOLO5.map(function (c) {
      var r = N.calcolaPn(nodoDa(c));
      var f = fasciaPn(c.pn);
      return '<div class="colonna-caso" style="--tinta:' + S.colori[f.stato] + '">' +
        '<p class="colonna-eti">' + esc(c.titolo) + '</p>' +
        '<p class="colonna-scena">' + esc(c.scena) + '</p>' +
        '<div class="colonna-pn">' + r.pn + '<small>%</small></div>' +
        '<span class="caso-pista"><span class="caso-barra" style="width:' + r.pn + '%"></span></span>' +
        '<p class="colonna-conti">' + esc(c.conti) + '</p>' +
        (c.nota ? '<p class="caso-nota">' + esc(c.nota) + '</p>' : '') +
        '</div>';
    }).join('');

    var d = N.calcolaPn(nodoDa(C.CAPITOLO5[0])).pn - N.calcolaPn(nodoDa(C.CAPITOLO5[1])).pn;
    return '<div class="due-colonne">' + due + '</div>' +
      /* «Stesso gesto, stessa persona, stessa competenza» c'era due volte di
         fila: una scritta qui e una dentro `lettura`, che arriva dai dati del
         libro. Due volte la stessa frase a mezza riga di distanza non e'
         insistenza, e' una svista che si vede subito. Qui resta il numero,
         che e' la cosa che questa riga aggiunge; il resto lo dice il libro. */
      '<p class="riga-conclusione">Fra i due casi ci sono <b>' +
      Lg.plurale(d, 'punto di differenza', 'punti di differenza') + '.</b> ' +
      esc(C.CAPITOLO5[1].lettura) + '</p>';
  }

  /* ---------------------------------------------------------------------
     I MARGINI DEL CAPITOLO 10 — il dado su una riga da 1 a 100
     --------------------------------------------------------------------- */
  function rigaMargini(caso) {
    var W = 900, H = 108, L = 12, R = 12;
    var pw = W - L - R;
    var x = function (t) { return L + (t / 100) * pw; };
    var g = [];

    /* la parte che riesce e quella che no, con Pn come confine */
    g.push('<rect x="' + L + '" y="34" width="' + (x(caso.pn) - L) + '" height="22" rx="4" ' +
      'fill="var(--aiuta)" opacity="0.16"/>');
    g.push('<rect x="' + x(caso.pn) + '" y="34" width="' + (W - R - x(caso.pn)) + '" height="22" rx="4" ' +
      'fill="var(--ostacola)" opacity="0.14"/>');
    g.push('<line x1="' + x(caso.pn) + '" y1="26" x2="' + x(caso.pn) + '" y2="64" ' +
      'stroke="var(--inchiostro)" stroke-width="2"/>');
    g.push('<text x="' + x(caso.pn) + '" y="20" text-anchor="middle" font-size="12" ' +
      'font-weight="700" fill="var(--inchiostro)">Pn ' + caso.pn + '</text>');

    [0, 25, 50, 75, 100].forEach(function (t) {
      g.push('<text x="' + x(t) + '" y="' + (H - 4) + '" text-anchor="middle" font-size="10.5" ' +
        'fill="var(--inchiostro-3)">' + t + '</text>');
    });

    caso.tiri.forEach(function (t) {
      var col = t.tipo === 'MS' ? 'var(--aiuta)' : 'var(--ostacola)';
      var forte = t.fascia === 'forte';
      g.push('<line x1="' + x(t.tiro) + '" y1="34" x2="' + x(t.tiro) + '" y2="56" ' +
        'stroke="' + col + '" stroke-width="2.5"/>');
      g.push('<circle cx="' + x(t.tiro) + '" cy="34" r="' + (forte ? 5.5 : 4) + '" fill="' + col + '"/>');
      g.push('<text x="' + x(t.tiro) + '" y="76" text-anchor="middle" font-size="11" ' +
        'font-weight="600" fill="' + col + '">' + t.tiro + '</text>');
      g.push('<text x="' + x(t.tiro) + '" y="89" text-anchor="middle" font-size="10" ' +
        'fill="var(--inchiostro-3)">' + t.tipo + ' ' + t.margine + '</text>');
    });

    return '<div class="margine-caso">' +
      '<p class="caso-eti">' + esc(caso.nome) + ' — Pn ' + caso.pn + '</p>' +
      '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" style="max-width:100%;height:auto" ' +
      'role="img" aria-label="La riga del dado da 1 a 100 per ' + esc(caso.nome) +
      ', con Pn a ' + caso.pn + ' e i tiri segnati">' + g.join('') + '</svg>' +
      '<p class="caso-lettura">' + esc(caso.lettura) + '</p></div>';
  }

  /* ---------------------------------------------------------------------
     LE DIECI SCHEDE IN FILA — che cosa dicono, messe insieme
     --------------------------------------------------------------------- */
  function tuttiInFila() {
    var conNumero = C.CASI.filter(function (c) { return c.pn !== null; })
      .slice().sort(function (a, b) { return b.pn - a.pn; });
    var righe = conNumero.map(function (c) {
      var f = fasciaPn(c.pn);
      return '<tr><td>' + esc(c.titolo) + '</td>' +
        '<td class="num"><b>' + c.pn + '</b></td>' +
        '<td><span class="mini-pista" style="--tinta:' + S.colori[f.stato] + '">' +
          '<span class="mini-barra" style="width:' + c.pn + '%"></span></span></td>' +
        '<td>' + esc(c.decide) + '</td></tr>';
    }).join('');
    var senza = C.CASI.filter(function (c) { return c.pn === null; }).map(function (c) {
      return '<tr class="riga-senza"><td>' + esc(c.titolo) + '</td><td class="num">—</td>' +
        '<td></td><td>' + esc(c.decide) + '</td></tr>';
    }).join('');
    return '<table class="dati"><thead><tr><th>Scena</th><th class="num">Pn</th>' +
      '<th></th><th>Che cosa decide, in questa scena</th></tr></thead><tbody>' + righe + senza +
      '</tbody></table>';
  }

  /* ---------------------------------------------------------------------
     AVVIO
     --------------------------------------------------------------------- */
  function legenda() {
    return '<div class="legenda-fasce">' + FASCE_PN.map(function (f) {
      return '<span class="voce-legenda"><i class="segno" style="background:' +
        S.colori[f.stato] + '"></i><b>' + esc(f.nome) + '</b> ' +
        (f.da > 0 ? 'da ' + f.da : 'sotto 15') + '</span>';
    }).join('') + '</div>';
  }

  function apri(id) {
    var caso = C.CASI.filter(function (c) { return c.id === id; })[0];
    if (!caso) { return; }
    var dove = q('dettaglioCaso');
    dove.innerHTML = '<div class="apertura"><h3>' + esc(caso.titolo) + '</h3>' +
      '<button type="button" class="fantasma" id="chiudiCaso">Chiudi</button></div>' +
      dettaglio(caso);
    dove.hidden = false;
    Array.prototype.forEach.call(document.querySelectorAll('.carta-caso'), function (b) {
      b.classList.toggle('scelta', b.getAttribute('data-caso') === id);
    });
    q('chiudiCaso').addEventListener('click', function () {
      dove.hidden = true;
      Array.prototype.forEach.call(document.querySelectorAll('.carta-caso'), function (b) {
        b.classList.remove('scelta');
      });
    });
    /* le parole appena create prendono il loro punto interrogativo: il
       glossario ha gia' un osservatore sul documento, ma chiamarlo qui
       evita il fotogramma in cui le parole ci sono e i segni no */
    if (window.Glossario && window.Glossario.decoraTutte) { window.Glossario.decoraTutte(); }
    dove.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  document.addEventListener('DOMContentLoaded', function () {
    q('legendaFasce').innerHTML = legenda();
    q('grigliaCasi').innerHTML = C.CASI.map(cartaCaso).join('');
    Array.prototype.forEach.call(document.querySelectorAll('.carta-caso'), function (b) {
      b.addEventListener('click', function () { apri(b.getAttribute('data-caso')); });
    });
    q('confronto5').innerHTML = confrontoCapitolo5();
    q('margini10').innerHTML = C.MARGINI.casi.map(rigaMargini).join('');
    q('inFila').innerHTML = tuttiInFila();

    q('tema').addEventListener('click', function () {
      var attuale = document.documentElement.getAttribute('data-tema');
      var nuovo = attuale === 'scuro' ? 'chiaro' : 'scuro';
      document.documentElement.setAttribute('data-tema', nuovo);
      q('tema').textContent = nuovo === 'scuro' ? 'Tema chiaro' : 'Tema scuro';
    });
    q('stampa').addEventListener('click', function () { window.print(); });

    /* si può arrivare qui con una scheda già scelta: ESEMPI.html#caso=acqua */
    var m = (window.location.hash || '').match(/caso=([a-z0-9-]+)/i);
    if (m) { apri(m[1]); } else { apri(C.CASI[0].id); }
  });

  window.EsempiUI = { FASCE_PN: FASCE_PN, fasciaPn: fasciaPn, collegamentoCursori: collegamentoCursori };
})();
