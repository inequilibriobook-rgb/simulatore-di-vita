/* =============================================================================
   SIMULATORE 3.0 — Interfaccia del singolo gesto
   Script classico, nessun modulo ES, nessuna fetch: funziona da file://
   ========================================================================== */

(function () {
  'use strict';

  var S = window.Spiegazioni;
  var N = window.Nucleo;
  var Lg = window.Lingua;

  /* Le regole dell'italiano stanno in lingua.js: se manca, lo si deve
     sentire adesso e non a meta' frase. */
  if (!S || !N || !Lg) {
    throw new Error('app.js: manca ' + (!S ? 'Spiegazioni' : (!N ? 'Nucleo' : 'Lingua')) +
      '. Ordine di caricamento: calibrazione.js, lingua.js, casuale-mt.js, nucleo.js, ' +
      'stato.js, racconto.js, spiegazioni.js, e solo dopo questo file.');
  }

  /* Stato dei cursori */
  var v = { P0: 75, E: -10, I: 0, T: -5, M: -5, BP: 0, C: 1, STR: 62, DEB: 0 };
  var seme = 424242;
  var contatoreTiri = 0;
  var rng = new window.CasualePython(seme);
  var ultimoTiro = null;

  var CURSORI = [
    { k: 'P0',  min: 1,  max: 99, nome: 'Punto di partenza',      sotto: 'quanto è fattibile in sé (P0)' },
    { k: 'E',   min: -30, max: 30, nome: 'Il corpo adesso',        sotto: 'energia, sonno, dolore (E)' },
    { k: 'I',   min: -30, max: 30, nome: 'Quanto è chiaro',      sotto: 'informazione e istruzioni (I)' },
    { k: 'T',   min: -30, max: 30, nome: 'La pressione del tempo', sotto: 'fretta di questo momento (T)' },
    { k: 'M',   min: -30, max: 30, nome: 'L’ambiente intorno',    sotto: 'spazio, oggetti, rumore (M)' },
    { k: 'BP',  min: 0,  max: 20, nome: 'Ciò che ti protegge',   sotto: 'aiuto concreto temporaneo (BP)' },
    { k: 'C',   min: 0,  max: 10, nome: 'Quanti pezzi ha',         sotto: 'complessità, −5 punti ciascuno (C)' },
    { k: 'STR', min: 0,  max: 100, nome: 'Il carico accumulato',   sotto: 'stress che ti porti dietro (STR)' },
    { k: 'DEB', min: 0,  max: 5,  nome: 'Il debito da insistenza', sotto: 'le volte che hai insistito su una strada che non funzionava, −5 ciascuna (DEB)' }
  ];

  function esc(t) {
    return String(t).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function q(id) { return document.getElementById(id); }

  /* I NUMERI NEGATIVI SI SCRIVONO CON IL SEGNO MENO, NON CON IL TRATTINO.
     Nella stessa schermata c'e' la formula composta dal Canone, che il meno
     lungo (−) lo usa, e accanto comparivano dei «-10» col trattino corto
     della tastiera: due segni diversi per la stessa cosa, a un centimetro di
     distanza. Lingua.intero() scrive il numero come lo scrive l'italiano —
     meno giusto, e punto delle migliaia. */
  function num(n) { return Lg.intero(n); }
  function conSegno(n) { return (n > 0 ? '+' : '') + num(n); }

  /* ---- costruzione del nodo per il motore ---- */
  function nodoCorrente() {
    return {
      id: 'dimostrazione',
      descrizione: q('descrizione').value || 'Azione da simulare',
      p0: v.P0,
      modificatori: { energia_e: v.E, informazione_i: v.I, tempo_t: v.T, materiale_m: v.M, bonus_bp: v.BP, complessita_c: v.C },
      stato_prima: { stress_str: v.STR, posizione_pos: 60, debito_deb: v.DEB, rip: 'assente' }
    };
  }

  /* ---- cursori ---- */
  function costruisciCursori() {
    var html = CURSORI.map(function (c) {
      return '<div class="cursore">' +
        '<label for="cur_' + c.k + '">' +
        // il nome del cursore apre la spiegazione che gia' esisteva in
        // spiegazioni.js e che nessuno mostrava: «breve» piu' «esempio».
        '<span class="nome"><span data-parola="' + esc(c.k) + '">' + esc(c.nome) +
        '</span><small>' + esc(c.sotto) + '</small></span>' +
        '<span class="valore" id="val_' + c.k + '">' + v[c.k] + '</span></label>' +
        '<input type="range" id="cur_' + c.k + '" min="' + c.min + '" max="' + c.max + '" value="' + v[c.k] + '" ' +
        'aria-label="' + esc(c.nome) + '"></div>';
    }).join('');
    q('cursori').innerHTML = html;
    CURSORI.forEach(function (c) {
      q('cur_' + c.k).addEventListener('input', function (e) {
        v[c.k] = parseInt(e.target.value, 10);
        q('val_' + c.k).textContent = v[c.k];
        disegna();
      });
    });
  }

  /* ---- grafico diverging dei contributi ----
     P0 non e' un contributo: e' la base da cui si parte. Metterlo sulla stessa
     scala schiaccerebbe tutti gli altri. Lo mostriamo come punto di partenza,
     e le barre rappresentano solo cio' che lo sposta. */
  function disegnaContributi(termini) {
    var righe = [
      { k: 'E',     val: termini.E },
      { k: 'I',     val: termini.I },
      { k: 'T',     val: termini.T },
      { k: 'M',     val: termini.M },
      { k: 'BP',    val: termini.BP },
      { k: 'C',     val: termini.C },
      { k: 'piSTR', val: termini.piSTR },
      { k: 'DEB',   val: termini.DEB }
    ];
    var max = Math.max(30, Math.max.apply(null, righe.map(function (r) { return Math.abs(r.val); })));
    var zeroPct = 50;

    var somma = righe.reduce(function (a, r) { return a + r.val; }, 0);
    q('basePartenza').innerHTML =
      '<span class="etichetta"><b>' + esc(S.termini.P0.nome) + '</b> · P0</span>' +
      '<span class="pista-base">si parte da qui</span>' +
      '<span class="cifra">' + termini.P0 + '</span>';
    q('sommaSpostamenti').innerHTML =
      '<span class="etichetta"><b>Totale degli spostamenti</b></span>' +
      '<span class="pista-base"></span>' +
      '<span class="cifra" style="color:' + (somma >= 0 ? 'var(--aiuta)' : 'var(--ostacola)') + '">' +
      conSegno(somma) + '</span>';

    var html = righe.map(function (r) {
      var info = S.termini[r.k];
      var larghezza = (Math.abs(r.val) / max) * 50;
      var sinistra = r.val >= 0 ? zeroPct : zeroPct - larghezza;
      var barra = larghezza < 0.4 ? '' :
        '<div class="barra ' + (r.val >= 0 ? 'piu' : 'meno') + '" style="left:' + sinistra + '%;width:' + larghezza + '%"></div>';
      return '<div class="riga-contributo" title="' + esc(info.breve) + '">' +
        '<span class="etichetta"><b data-parola="' + esc(r.k) + '">' + esc(info.nome) + '</b> · ' +
        esc(info.sigla) + '</span>' +
        '<span class="pista"><span class="zero" style="left:' + zeroPct + '%"></span>' + barra + '</span>' +
        '<span class="cifra">' + conSegno(r.val) + '</span>' +
        '</div>';
    }).join('');
    q('contributi').innerHTML = html;

    // tabella dati equivalente: i grafici non devono essere l'unico accesso
    q('tabellaDati').innerHTML =
      '<tr><th>Voce</th><th>Sigla</th><th style="text-align:right">Punti</th></tr>' +
      '<tr><td>' + esc(S.termini.P0.nome) + '</td><td>P0</td><td class="num">' + num(termini.P0) + '</td></tr>' +
      righe.map(function (r) {
        return '<tr><td>' + esc(S.termini[r.k].nome) + '</td><td>' + esc(S.termini[r.k].sigla) +
               '</td><td class="num">' + conSegno(r.val) + '</td></tr>';
      }).join('') +
      '<tr><td><strong>Totale prima del taglio ai bordi</strong></td><td></td><td class="num">' +
      num(termini.P0 + somma) + '</td></tr>';
  }

  /* ---- scala 0–100 con Pn e tiro ---- */
  function disegnaScala(pn, tiro) {
    var marcatore = (tiro === null) ? '' :
      '<span class="marcatore" style="left:' + (tiro - 0.15) + '%"></span>' +
      '<span class="etichetta-marcatore" style="left:' + tiro + '%">dado ' + tiro + '</span>';
    q('scala').innerHTML =
      '<span class="fondo"></span>' +
      '<span class="riempita" style="width:' + pn + '%"></span>' + marcatore;
  }

  /* ---- disegno completo ---- */
  function disegna(conTiro) {
    var nodo = nodoCorrente();
    var r = N.eseguiNodo(nodo, { tiro: conTiro ? ultimoTiro : (ultimoTiro === null ? 1 : ultimoTiro) });
    var soloPn = N.calcolaPn(nodo);

    q('numeroPn').innerHTML = soloPn.pn + '<span class="unita"> su 100</span>';
    var fuoriClamp = soloPn.grezzo !== soloPn.pn;
    q('notaPn').textContent = fuoriClamp
      ? 'La somma dava ' + num(soloPn.grezzo) + ', ma il simulatore non scende mai sotto 5 e non sale mai sopra 95.'
      : 'È la probabilità che questo gesto riesca, nelle condizioni che hai appena raccontato.';

    disegnaContributi(r.termini);
    disegnaScala(soloPn.pn, ultimoTiro);

    if (ultimoTiro === null) {
      q('bloccoEsito').hidden = true;
      return;
    }
    q('bloccoEsito').hidden = false;

    /* il racconto: l'uscita principale, secondo il libro.
       Serve il risultato completo (stato dopo, delta, rischio), non il solo nodo. */
    if (window.Stato && window.Racconto && window.VistaRacconto) {
      var completo = window.Stato.eseguiNodoCompleto(nodo, { tiro: ultimoTiro });
      q('racconto').innerHTML = window.VistaRacconto.disegna(
        window.Racconto.componiRacconto(completo, nodo));
    }

    var e = S.esiti[r.esito];
    var col = S.colori[e.stato];
    q('pillolaEsito').innerHTML =
      '<span class="punto" style="background:' + col + '"></span>' +
      '<span class="glifo" style="color:' + col + '">' + e.glifo + '</span>' +
      esc(e.titolo);

    /* Livello 1 — in parole tue */
    var riuscito = r.successo_prima_del_campo;
    /* QUI SI DICEVA UNA COSA GIA' DETTA DUE VOLTE.
       Il dado e il margine erano scritti in tre punti della stessa schermata:
       nel racconto qui sopra, in questa riga, e nel conto del livello 2. Tre
       volte lo stesso numero non e' insistenza, e' rumore: chi legge si chiede
       se stia guardando tre cose diverse, e ci mette un attimo a capire di no.
       «In parole semplici» deve fare una cosa sola — dire com'e' andata in un
       respiro, per chi il racconto lungo non lo vuole leggere — e poi tacere.
       Il dado sta nel racconto, il conto sta al livello 2. */
    q('liv1').innerHTML = '<p><strong>' + esc(e.umano) + '</strong></p>';

    /* Livello 2 — come l'ho calcolato */
    var t = r.termini;
    var pezzi = [];
    pezzi.push('Si parte da <strong>' + num(t.P0) + '</strong>');
    [['E', 'il corpo'], ['I', 'la chiarezza'], ['T', 'il tempo'], ['M', 'l’ambiente']].forEach(function (p) {
      if (t[p[0]] !== 0) {
        pezzi.push(p[1] + ' ' + (t[p[0]] > 0 ? 'aggiunge <strong>' + num(t[p[0]]) + '</strong>' : 'toglie <strong>' + num(Math.abs(t[p[0]])) + '</strong>'));
      }
    });
    if (t.BP > 0) { pezzi.push('la protezione aggiunge <strong>' + num(t.BP) + '</strong>'); }
    if (t.C !== 0) {
      pezzi.push(v.C === 1 ? 'il pezzo da coordinare toglie <strong>' + num(Math.abs(t.C)) + '</strong>'
                           : 'i ' + v.C + ' pezzi da coordinare tolgono <strong>' + num(Math.abs(t.C)) + '</strong>');
    }
    if (t.piSTR !== 0) { pezzi.push('il carico che ti porti dietro (' + v.STR + ' su 100) toglie <strong>' + num(Math.abs(t.piSTR)) + '</strong>'); }
    if (t.DEB !== 0) { pezzi.push('il debito toglie <strong>' + num(Math.abs(t.DEB)) + '</strong>'); }
    /* Le voci del conto sono un elenco, e un elenco italiano si chiude con
       «e»: prima erano incollate con dei punti e virgola, e l'ultima restava
       appesa come se ne mancasse un'altra. */
    var frase = Lg.elenco(pezzi);
    q('liv2').innerHTML =
      '<p>' + frase.charAt(0).toUpperCase() + frase.slice(1) + '.</p>' +
      '<p>Totale: <strong>' + num(r.pn_grezzo_prima_del_clamp) + '</strong>' +
      (fuoriClamp ? ', riportato a <strong>' + r.pn + '</strong> dal limite di sicurezza (mai sotto 5, mai sopra 95)' : '') +
      '. Il dado da 1 a 100 ha dato <strong>' + r.tiro + '</strong>.</p>' +
      (v.STR > 0 ? '<p class="nota">Va detta una cosa sul carico, cioè sulla stanchezza che ti portavi ' +
        'dietro prima di cominciare: non toglie a poco a poco, un punto per volta. Fino a 39 non toglie nulla. ' +
        'Da 40 toglie 5, da 60 toglie 10, da 70 toglie 15, da 80 toglie 20, da 90 toglie 25. ' +
        'Sono <em>gradini</em>, e per questo fra 41 e 59 il conto non cambia di un punto, mentre al passaggio da ' +
        '59 a 60 cambia di cinque in una volta sola.</p>' : '');

    /* Livello 3 — formula */
    q('liv3').innerHTML =
      /* La formula canonica non si riscrive a mano: si chiede al file generato
         dal Canone, cosi' a schermo e' composta come nel libro stampato. Le
         righe qui sotto portano invece i NUMERI di questa scena, che nel libro
         non ci sono: restano testo, ma con la notazione dell'Apparato B —
         «[5; 95]» e non «[5,95]», perche' in italiano dentro un intervallo la
         virgola si legge come separatore dei decimali. */
      '<div class="formula-libro" data-formula="madre"></div>' +
      '<div class="formula-testo">' +
      'Pn = clamp[5; 95]( ' + num(t.P0) + ' + (' + num(t.E) + ') + (' + num(t.I) + ') + (' + num(t.T) +
      ') + (' + num(t.M) + ') + ' + num(t.BP) +
      ' + (' + num(t.C) + ') + (' + num(t.piSTR) + ') + (' + num(t.DEB) + ') )<br>' +
      'Pn = clamp[5; 95]( ' + num(r.pn_grezzo_prima_del_clamp) + ' ) = <strong>' + r.pn + '</strong></div>' +
      /* «clamp» e' inglese, e nella riga qui sopra compare due volte: chi la
         legge per la prima volta deve trovare qui sotto che cosa vuol dire,
         non tre sezioni piu' avanti. */
      '<p class="nota"><strong>clamp</strong> è la parola con cui il libro chiama il taglio ai bordi: ' +
      'qualunque cosa dia la somma, il risultato non scende sotto 5 e non sale sopra 95. Il numero ' +
      'prima del taglio si chiama <em>grezzo</em>, e resta scritto perché è lui a dire di quanto ' +
      'la scena era finita fuori scala.</p>' +
      '<table class="dati"><tr><th>Grandezza</th><th style="text-align:right">Valore</th></tr>' +
      '<tr><td>Tiro del dado, da 1 a 100</td><td class="num">' + r.tiro + '</td></tr>' +
      '<tr><td>Riuscito, prima che il campo dicesse la sua</td><td class="num">' +
        (r.successo_prima_del_campo ? 'sì' : 'no') + '</td></tr>' +
      '<tr><td>Margine grezzo, la distanza fra il dado e la soglia (la soglia è la probabilità, il numero da non superare)</td><td class="num">' +
        num(r.margine_grezzo) + '</td></tr>' +
      '<tr><td>Margine campo, quanto ha tolto chi ostacolava da fuori</td><td class="num">' +
        num(r.margine_campo) + '</td></tr>' +
      '<tr><td>Margine netto, con il segno dell’esito</td><td class="num">' +
        num(r.margine_netto) + '</td></tr>' +
      '<tr><td>Esito canonico, con il nome che gli dà il libro</td><td class="num">' +
        // la dicitura del libro, non l'identificatore: e' cosi' che il
        // lettore lo ritrova nel capitolo 13.
        esc((S.esiti[r.esito] && S.esiti[r.esito].nelLibro) || r.esito) + '</td></tr>' +
      '<tr><td>Riconosciuto come micro-azione di cura</td><td class="num">' +
        (r.micro_azione ? 'sì' : 'no') + '</td></tr>' +
      '</table>' +
      /* QUI SI LEGGEVA UN ERRORE CHE NON C'ERA.
         La tabella diceva «Margine grezzo 25» e sotto «Margine netto −25»,
         e la riga del campo non era nemmeno mostrata: due numeri uguali con
         il segno opposto, senza niente che spiegasse perche'. E' fedele al
         motore, ma a schermo si legge come un conto sbagliato. I tre margini
         sono tre cose diverse, e adesso ci sono tutti e tre, spiegati. */
      '<p class="nota">I tre margini si leggono così. Il <strong>margine grezzo</strong> non ha ' +
      'segno: dice soltanto di quanti punti il dado è caduto dalla parte giusta della soglia, ' +
      'o da quella sbagliata. Il <strong>margine campo</strong> è quanto ha tolto il campo, cioè ' +
      'qualcuno o qualcosa che da fuori ha contestato, interrotto o messo i bastoni fra le ruote.' +
      (r.margine_campo === 0 ? ' Qui non c’era nessuno, e infatti non ha tolto niente.' : '') +
      ' Il <strong>margine netto</strong> mette insieme le due cose, e ci aggiunge il segno ' +
      'dell’esito: meno se il gesto non è riuscito, più se è riuscito. È il numero che il libro ' +
      'guarda per dire se conviene rifare la stessa cosa domani.</p>' +
      '<p class="nota">Condizioni di questo esito: ' + esc(e.quando) + '</p>';
    /* Il riquadro della formula nasce adesso, e chi lo riempie ha gia' fatto
       il suo giro al caricamento della pagina: senza questa chiamata resta
       vuoto, e la formula composta non si vede. */
    if (window.FormuleVista) { window.FormuleVista.riempi(q('liv3')); }
  }

  /* ---- azioni ---- */
  function tira() {
    ultimoTiro = rng.randint(1, 100);
    contatoreTiri++;
    q('statoSeme').textContent = 'Seme ' + seme + ' · ' +
      Lg.plurale(contatoreTiri, 'tiro fatto', 'tiri fatti');
    disegna(true);
  }

  function reimpostaSeme() {
    var n = parseInt(q('seme').value, 10);
    seme = isFinite(n) ? n : 424242;
    rng = new window.CasualePython(seme);
    contatoreTiri = 0;
    ultimoTiro = null;
    q('statoSeme').textContent = 'Seme ' + seme + ' · non hai ancora tirato il dado';
    q('bloccoEsito').hidden = true;
    disegna();
  }

  /* ---- verifica di parita' ----
     IL RIQUADRO PUO' NON ESSERCI, E VA BENE COSI'.
     Il 10/09/2026 la prova di parita' e' traslocata sulla pagina di apertura,
     dove serve di piu': chi arriva per la prima volta decide li' se fidarsi.
     Qui e' rimasto un rimando, con il solo numero dei confronti.
     Senza questa guardia la funzione trovava null e sollevava un errore che
     fermava TUTTO l'avvio della pagina — i cursori restavano, ma il dado non
     partiva piu'. Un pezzo tolto da una pagina non deve poter spegnere il
     resto di quella pagina. */
  function mostraVerifica() {
    var d = window.Verifica;
    if (!d) { return; }
    if (!q('verifica')) {
      var soloNumero = q('pieConfronti');
      if (soloNumero) { soloNumero.textContent = d.confronti.toLocaleString('it-IT'); }
      return;
    }
    var vel = d.velocita || {};
    var righe =
      tassello('Confronti totali', d.confronti.toLocaleString('it-IT'), 'su tutti i livelli') +
      tassello('Differenze', d.differenze,
               d.differenze === 0 ? 'i due programmi dicono la stessa cosa'
                                  : 'c’è qualcosa da guardare subito') +
      tassello('Nodi singoli', d.nodi.toLocaleString('it-IT'), 'con lo stato dopo il nodo') +
      tassello('Semi del dado', d.semi_generatore_verificati, 'la stessa sequenza di numeri del programma in Python');
    if (vel.nodi_al_secondo_js && vel.nodi_al_secondo_py) {
      righe += tassello('Guadagno di velocità',
        '×' + Math.round(vel.nodi_al_secondo_js / vel.nodi_al_secondo_py),
        'misurato il ' + (vel.data || '').split('-').reverse().join('/'));
    }
    q('verifica').innerHTML = righe;

    /* Il dettaglio per livello: viene dallo stesso file generato, così la
       pagina non può raccontare una prova diversa da quella eseguita. */
    var dett = q('verificaDettaglio');
    if (dett && d.livelli && d.livelli.length) {
      var righeTab = d.livelli.map(function (l) {
        return '<tr><td>' + esc(l.nome) + '</td>' +
               '<td class="num">' + l.quanti.toLocaleString('it-IT') + '</td>' +
               '<td class="num">' + l.confronti.toLocaleString('it-IT') + '</td></tr>';
      }).join('');
      dett.innerHTML =
        '<table class="dati"><thead><tr><th>Livello</th><th>Quanti</th>' +
        '<th>Confronti</th></tr></thead><tbody>' + righeTab + '</tbody></table>' +
        '<p class="nota">Verifica del ' + esc((d.data || '').split('-').reverse().join('/')) +
        ', rifatta da capo a ogni giro dei controlli automatici.</p>';
    }
  }
  function tassello(k, val, sotto) {
    return '<div class="tassello"><div class="k">' + esc(k) + '</div>' +
      '<div class="v">' + esc(val) + '</div>' +
      (sotto ? '<div class="s">' + esc(sotto) + '</div>' : '') + '</div>';
  }

  /* ARRIVARE QUI CON UNA SCENA GIA' PRONTA.
     La pagina dei casi manda qui le sue schede:
       IL-GESTO.html#p0=90&e=-5&i=0&t=0&m=0&bp=0&c=1&str=62&deb=0&d=Bere...
     Serve a una cosa sola, ed e' la cosa che mancava di piu': leggere un
     caso del libro e poi POTERLO MUOVERE. Un esempio che si guarda insegna
     meno di un esempio da cui si parte.

     Niente memoria del browser, niente rete: i valori viaggiano
     nell'indirizzo, e restano visibili a chi lo guarda. Quello che non
     si riconosce viene ignorato, e i cursori restano ai loro valori. */
  var provenienza = null; // 'giro' se il link viene dal giro completo di APRI-QUI.html, altrimenti null (i casi di ESEMPI.html, o nessuna provenienza)

  function leggiDallIndirizzo() {
    var h = (window.location.hash || '').replace(/^#/, '');
    if (!h) { return false; }
    var toccato = false;
    h.split('&').forEach(function (pezzo) {
      var due = pezzo.split('=');
      if (due.length !== 2) { return; }
      var chiave = decodeURIComponent(due[0]).toLowerCase();
      var valore = decodeURIComponent(due[1].replace(/\+/g, ' '));
      if (chiave === 'd') {
        var campo = q('descrizione');
        if (campo && valore) { campo.value = valore; toccato = true; }
        return;
      }
      if (chiave === 'da') {
        if (valore === 'giro') { provenienza = 'giro'; }
        return;
      }
      var cur = CURSORI.filter(function (c) { return c.k.toLowerCase() === chiave; })[0];
      if (!cur) { return; }
      var n = parseInt(valore, 10);
      if (isNaN(n)) { return; }
      v[cur.k] = N.clampInt(n, cur.min, cur.max);
      toccato = true;
    });
    return toccato;
  }

  /* ---- avvio ---- */
  document.addEventListener('DOMContentLoaded', function () {
    var venutoDaFuori = leggiDallIndirizzo();
    costruisciCursori();
    mostraVerifica();
    q('tira').addEventListener('click', tira);
    q('applicaSeme').addEventListener('click', reimpostaSeme);
    q('descrizione').addEventListener('input', function () { if (ultimoTiro !== null) disegna(true); });
    q('tema').addEventListener('click', function () {
      var attuale = document.documentElement.getAttribute('data-tema');
      var nuovo = attuale === 'scuro' ? 'chiaro' : 'scuro';
      document.documentElement.setAttribute('data-tema', nuovo);
      q('tema').textContent = nuovo === 'scuro' ? 'Tema chiaro' : 'Tema scuro';
    });
    /* AUDIT 19/8 sera: il CSS di stampa esisteva già, mancava solo un
       controllo visibile che lo richiamasse. */
    q('stampa').addEventListener('click', function () { window.print(); });

    /* Il piede legge i propri numeri, non li tiene scritti dentro: e' la
       regola che questo giro ha imposto ovunque — nessuna cifra copiata. */
    var pc = q('pieConfronti');
    if (pc && window.Verifica) { pc.textContent = window.Verifica.confronti.toLocaleString('it-IT'); }
    /* la riga di calibrazione la scrive calibrazione.js in tutte le pagine */
    reimpostaSeme();
    tira();

    /* se la scena arriva da un'altra pagina, si dice da dove: chi ha
       cliccato «aprilo nei cursori» deve capire che questi numeri non se
       li e' inventati la pagina, e deve poter tornare indietro */
    if (venutoDaFuori) {
      var avviso = document.createElement('p');
      avviso.className = 'nota venuto-da-fuori no-stampa';
      /* Due provenienze diverse, due frasi diverse: chi arriva dal giro
         completo di APRI-QUI.html non ha mai visto una «scheda» ne' dei
         «casi», e un link a ESEMPI.html lo porterebbe su una pagina che non
         ha mai aperto. Prima questa nota era una sola, scritta per la
         provenienza da ESEMPI.html soltanto, e valeva anche per il giro:
         diceva una cosa falsa. */
      avviso.innerHTML = (provenienza === 'giro')
        ? 'Questi valori vengono dal giro completo della porta d’ingresso, e sono già nei cursori. ' +
          'Muovili quanto vuoi, perché qui non si rompe niente. ' +
          '<a href="APRI-QUI.html#giro">Torna al giro completo</a>'
        : 'Questi valori arrivano da una scheda del libro, e sono già nei cursori. ' +
          'Muovili quanto vuoi, perché qui non si rompe niente. ' +
          '<a href="ESEMPI.html">Torna ai casi</a>';
      var t = document.querySelector('.testata');
      if (t) { t.appendChild(avviso); }
    }
  });

})();
