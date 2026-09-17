/* =============================================================================
   SIMULATORE 3.0 — La pagina della traiettoria
   =============================================================================
   Script classico, nessuna fetch, nessun modulo: funziona da file://

   Stesso schema della pagina della settimana: non calcola niente da solo,
   costruisce gli ingressi con SettimanaTipo.eseguiTraiettoriaTipo e mostra
   quello che torna. Il grafico è settimana per settimana, non giorno per
   giorno: a questo livello la domanda è se il regime cambia nel tempo, non
   come sono andate le singole giornate.
   ========================================================================== */

(function () {
  'use strict';

  var T = window.Tempo, ST = window.SettimanaTipo, R = window.Racconto,
      V = window.VistaRacconto, Lg = window.Lingua, semeDa = window.semeDa,
      Sp = window.Spiegazioni;

  /* Le regole dell'italiano stanno in lingua.js, e se non c'e' si deve
     sentire subito, non a meta' pagina con una frase che si rompe. */
  (function (mancanti) {
    if (!mancanti.length) { return; }
    throw new Error('traiettoria.js: manca ' + mancanti.join(', ') +
      '. Ordine di caricamento: calibrazione.js, lingua.js, casuale-mt.js, nucleo.js, ' +
      'stato.js, microsemantica.js, tempo.js, settimana-tipo.js, analisi.js, ' +
      'racconto.js, racconto-vista.js, spiegazioni.js, e solo dopo questo file.');
  }([['Tempo', T], ['SettimanaTipo', ST], ['Racconto', R], ['VistaRacconto', V],
     ['Lingua', Lg], ['semeDa (casuale-mt.js)', semeDa], ['Spiegazioni', Sp]]
    .filter(function (x) { return !x[1]; })
    .map(function (x) { return x[0]; })));

  function esc(t) {
    return String(t).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function q(id) { return document.getElementById(id); }

  var scelta = { durezza: 'media', sonno: 'normale', rip: 'debole' };
  var v = { settimane: 6, giorni: 7, nodi: 8, STR: 40, POS: 58 };

  var CURSORI = [
    { k: 'settimane', min: 2, max: 26, nome: 'Quante settimane', sotto: 'la lunghezza della traiettoria' },
    { k: 'giorni', min: 3, max: 10, nome: 'Giorni per settimana', sotto: 'quanto dura ogni settimana' },
    { k: 'STR', min: 0, max: 100, nome: 'Carico di partenza', sotto: 'con quanto stress accumulato inizi (STR)' },
    { k: 'POS', min: 0, max: 100, nome: 'Assetto di partenza',
      sotto: 'quanto sei orientato e saldo dentro quello che fai, da 0 a 100 (POS)' }
  ];

  var RIENTRI = [
    { id: 'assente', nome: 'non ci si ferma', sotto: 'nessun rientro' },
    { id: 'debole', nome: 'ci si ferma, ma la testa continua',
      sotto: 'contiene la giornata, non ripara niente' },
    { id: 'vera', nome: 'rientro vero', sotto: 'dopo, qualcosa è cambiato' },
    { id: 'piena', nome: 'rientro pieno', sotto: 'la condizione migliore possibile' }
  ];

  /* I sottotitoli delle durezze nascono per la pagina della settimana e
     parlano di UNA settimana: «la settimana come capita di solito». Qui la
     scelta vale per tutte le settimane della traiettoria, e al singolare
     sembrava che si stesse scegliendo soltanto la prima — con il titolo
     della carta che intanto diceva «Traiettoria». Se domani nasce una
     durezza nuova, la carta ricade sul sottotitolo del motore: si legge un
     po' peggio, ma non sparisce. */
  var DUREZZE_QUI = {
    leggera: 'settimane tutte ordinarie, senza niente di straordinario',
    media:   'settimane come capita di solito',
    dura:    'scadenze, imprevisti, poco margine — una settimana dopo l’altra'
  };

  /* ---------------- le scelte ---------------- */
  function carte(contenitore, elenco, chiave, etichetta, sotto) {
    var h = '';
    elenco.forEach(function (e) {
      h += '<button class="carta-livello' + (scelta[chiave] === e.id ? ' scelta' : '') +
        '" data-c="' + chiave + '" data-v="' + e.id + '">' +
        '<b>' + esc(etichetta(e)) + '</b><span>' + esc(sotto(e)) + '</span></button>';
    });
    q(contenitore).innerHTML = h;
  }

  function disegnaScelte() {
    carte('durezze', ST.DUREZZE, 'durezza',
      function (e) { return 'Traiettoria ' + e.nome; },
      function (e) { return DUREZZE_QUI[e.id] || e.sotto; });
    carte('sonni', ST.SONNI.filter(function (s) { return s.id !== 'banco'; }), 'sonno',
      function (e) { return 'Sonno ' + e.nome; },
      function (e) {
      return Lg.numero(e.sonno.ore, e.sonno.ore === Math.round(e.sonno.ore) ? 0 : 1) +
             ' ore per notte, con una qualità di ' + Lg.numero(e.sonno.qualita, 2) +
             ' (su una scala da 0 a 1)';
    });
    carte('rientri', RIENTRI, 'rip',
      function (e) { return e.nome; }, function (e) { return e.sotto; });
  }

  function disegnaCursori() {
    var h = '';
    CURSORI.forEach(function (c) {
      h += '<div class="cursore"><label for="c_' + c.k + '">' +
        '<span class="nome">' + esc(c.nome) + '<small>' + esc(c.sotto) + '</small></span>' +
        '<span class="valore" id="v_' + c.k + '">' + v[c.k] + '</span></label>' +
        '<div class="riga-scala"><input id="c_' + c.k + '" type="range" min="' + c.min +
        '" max="' + c.max + '" value="' + v[c.k] + '"><span></span></div></div>';
    });
    q('cursoriTraiettoria').innerHTML = h;
    CURSORI.forEach(function (c) {
      q('c_' + c.k).addEventListener('input', function () {
        v[c.k] = parseInt(this.value, 10);
        q('v_' + c.k).textContent = v[c.k];
      });
    });
  }

  /* ---------------- esecuzione ---------------- */
  var ultima = null;

  function esegui() {
    var seme = semeDa(q('seme').value);
    var tr = ST.eseguiTraiettoriaTipo({
      durezza: ST.durezza(scelta.durezza).valore,
      sonno: ST.sonno(scelta.sonno).sonno,
      rip: scelta.rip, rip_ogni_giorno: true,
      settimane: v.settimane, giorniPerSettimana: v.giorni,
      nodiPerScena: v.nodi,
      str: v.STR, pos: v.POS,
      seme: seme,
      titolo: 'Una traiettoria'
    });
    ultima = tr;
    mostra(tr);
  }

  /* IL PALLINO ERA SEMPRE GRIGIO, ANCHE SUL QUASI-COLLASSO.
     Leggeva `qa.colore`, che in racconto.js non esiste: mancando, restava
     sempre il grigio di riserva, e un pallino che non cambia mai colore
     sembra un'informazione senza esserlo. Il colore sta in spiegazioni.js
     insieme al titolo dell'esito, ed e' la stessa tinta che le altre pagine
     mettono sulla stessa parola. */
  function pillolaEsito(esito) {
    var qa = (R.QUALITA && R.QUALITA[esito]) || {};
    var voce = Sp.esiti[esito];
    var col = voce === undefined ? 'var(--linea-base)' : Sp.colori[voce.stato];
    return '<span class="pillola"><span class="punto" style="background:' +
      col + '"></span>' + esc(qa.etichetta || esito) + '</span>';
  }

  /* Il meno di un numero negativo e' «−», non il trattino della tastiera:
     chi sa scrivere un numero in italiano e' lingua.js, e nessun altro. */
  function conSegno(n) { return (Number(n) > 0 ? '+' : '') + Lg.intero(n); }

  /* «SOPRA 50» QUANDO IL VALORE E' 50 DICE IL FALSO, e lo dice proprio sul
     numero in cui il registro cambia. Cinquanta non e' sopra cinquanta: e'
     esattamente la soglia, ed e' un'informazione diversa e piu' precisa.
     Corretto nel motore e nella pagina della settimana, restava qui. */
  function oltre(valore, soglia) {
    return valore === soglia
      ? 'cioè esattamente sulla soglia'
      : 'sopra la soglia, che è a ' + soglia;
  }

  function tassello(k, val, sotto) {
    return '<div class="tassello"><div><div class="k">' + esc(k) + '</div>' +
      '<div class="v">' + esc(String(val)) + '</div></div>' +
      '<div class="s">' + esc(sotto) + '</div></div>';
  }

  function mostra(tr) {
    var f = tr.stato_finale, i = tr.stato_iniziale;
    var dn = R.diagnosiNonRitorno(f);
    var sp = tr.spirale;

    // «fermo in alto» sta in questo elenco insieme agli altri due perche' e'
    // altrettanto grave: un regime che non peggiora ma resta in cima non e' un
    // regime che tiene. Se manca da qui, il riquadro lo colora come se andasse bene.
    var SPIRALI_GRAVI = ['in formazione', 'stabilizzata', 'fermo_in_alto'];
    var colSpirale = sp && SPIRALI_GRAVI.indexOf(sp.andamento) >= 0
      ? 'var(--critico)' : (sp && sp.andamento === 'in rientro' ? 'var(--aiuta)' : 'inherit');

    var h = '<div class="esito-principale">' +
      '<div><div class="numero-eroe">' + f.stress_str +
      '<span class="unita">/100</span></div>' +
      '<div class="eroe-etichetta">carico alla fine · era ' + i.stress_str + '</div></div>' +
      '<div><div class="numero-eroe" style="font-size:40px;color:' +
      (dn.oltre_costo ? 'var(--critico)' : 'inherit') + '">' + f.costo_nascosto +
      '</div><div class="eroe-etichetta">costo nascosto (il prezzo dei gesti riusciti, ' +
      'che si vede dopo) · soglia ' + dn.soglia_costo + '</div></div>' +
      '<div><div class="numero-eroe" style="font-size:40px">' + f.posizione_pos +
      '</div><div class="eroe-etichetta">assetto · era ' + i.posizione_pos + '</div></div>' +
      '<div style="align-self:center">' + pillolaEsito(tr.esito) +
      '<div class="eroe-etichetta" style="margin-top:6px">regime finale: <b style="color:' +
      colSpirale + '">' + esc(tr.nome_regime) + '</b></div></div></div>';

    if (sp && (sp.andamento === 'in formazione' || sp.andamento === 'stabilizzata')) {
      h += '<div class="avviso" style="border-left-color:var(--critico)">' +
        '<strong>' + (sp.andamento === 'stabilizzata' ? 'Il regime è una spirale stabilizzata.'
          : 'Il regime sta peggiorando di settimana in settimana.') + '</strong> ' +
        esc(sp.testo) + '</div>';
    } else if (dn.superato) {
      /* Il punto di non ritorno e' misurato nella pagina della settimana: qui
         va detto in una riga che cos'e', perche' chi arriva da questa pagina
         puo' non aver letto quella. */
      h += '<div class="avviso" style="border-left-color:var(--critico)">' +
        '<strong>Il punto di non ritorno è stato superato' +
        (dn.quale === 'costo' ? ', e a farlo scattare è stato il costo nascosto.' : '.') +
        '</strong> È la soglia oltre la quale non si esce più, qualunque cosa si faccia ' +
        'dopo: la misura sta nella pagina della settimana. ' +
        (dn.quale === 'costo'
          ? 'Il costo nascosto è a ' + dn.costo + ', ' + oltre(dn.costo, dn.soglia_costo) +
            '. E non si vede negli esiti: le cose possono essere andate tutte a buon fine.'
          : 'Il carico è a ' + dn.carico + ', ' +
            oltre(dn.carico, dn.soglia_carico_migliore) +
            '. Da quel valore in su, quaranta giorni nelle condizioni migliori non bastano.') +
        '</div>';
    } else if (sp && sp.andamento === 'in rientro') {
      h += '<div class="avviso" style="border-left-color:var(--aiuta)">' +
        '<strong>Il regime sta migliorando.</strong> ' + esc(sp.testo) + '</div>';
    }

    h += '<div class="verifica" style="margin-top:20px">' +
      tassello('Settimane', tr.settimane.length, 'la lunghezza della traiettoria') +
      tassello('Carico', conSegno(tr.delta.STR),
               i.stress_str >= 100 && tr.delta.STR <= 0
                 ? 'partiva già dal massimo, e da 100 il carico non può salire: questo ' +
                   'non è un miglioramento'
                 : 'quanto è cambiato in tutto: da ' + i.stress_str + ' a ' + f.stress_str) +
      tassello('Costo nascosto', conSegno(tr.delta.costo_nascosto),
               'quello che non si vede negli esiti: da ' + i.costo_nascosto +
               ' a ' + f.costo_nascosto) +
      tassello('Assetto', conSegno(tr.delta.POS),
               'quanto si è spostato: da ' + i.posizione_pos + ' a ' + f.posizione_pos) +
      tassello('Spirale', sp ? R.spiraleInItaliano(sp) : '—',
               'come sta messo il giro in cui la stanchezza peggiora le condizioni, e le ' +
               'condizioni peggiorano la stanchezza') +
      /* «pavimento» compare per la prima volta qui: sciolto fra parentesi,
         come chiede la regola sui termini del tempo lungo. Le due frasi
         portano la stessa parentesi perche' se ne vede una sola per volta. */
      tassello('Pavimento di protezione', f.floor1_attivo ? 'acceso' : 'spento',
               f.floor1_attivo
                 ? 'il «pavimento» (una protezione che il modello accende da solo quando ' +
                   'i numeri peggiorano troppo) è acceso: finché resta acceso, il ' +
                   'recupero vale solo la metà'
                 : 'il «pavimento» (una protezione che il modello accende da solo quando ' +
                   'i numeri peggiorano troppo) è spento: il recupero funziona per intero') +
      '</div>';

    q('esito').innerHTML = h;
    q('bloccoEsito').hidden = false;

    disegnaGrafico(tr);
    q('racconto').innerHTML = V.disegna(R.componiRaccontoTraiettoria(tr));
    q('bloccoSettimane').hidden = false;
    q('bloccoRacconto').hidden = false;
  }

  /* ---------------- il grafico settimana per settimana ---------------- */  /* RIFATTO IL 04/09/2026, come il grafico della settimana — e con una cosa
     in piu'.

     L'ASSETTO C'ERA NEI DATI E NON SI VEDEVA. Stava solo nel suggerimento
     che compare passandoci sopra. Ma la traiettoria esiste per rispondere a
     una domanda sola — «sta cambiando il modo di vivere?» — e l'assetto e'
     meta' di quella risposta: il carico che sale e l'assetto che scende
     sono due cose diverse, e una traiettoria in cui il carico tiene e
     l'assetto crolla e' peggio di una in cui salgono tutti e due di poco.
     Adesso e' una linea sopra le barre, come il costo nascosto nella
     settimana, e con lo stesso trattamento: doppio tratto, cosi' si legge
     anche dove attraversa una colonna. */
  function disegnaGrafico(tr) {
    var punti = tr.regimi || [];
    var L = 100, alt = 210;
    var largh = Math.max(320, punti.length * 58);
    var passo = largh / punti.length;
    var y = function (s) { return alt - (s / L) * alt; };
    var margineDx = 46, margineSx = 26;

    function idGrad(s) {
      return s >= 60 ? 'tCritico' : (s >= 50 ? 'tSerio' : 'tNormale');
    }

    /* IL TITOLO DELL'ASSE ERA TAGLIATO. La scritta «settimana» sta con la
       base a (alt + 36) e la tela finiva esattamente li': la coda della «g»
       veniva mozzata. Due unita' bastavano; ce ne sono quattro, che e' lo
       spazio che quel corpo di carattere chiede sotto la riga di base. */
    var h = '<svg viewBox="' + (-margineSx) + ' -18 ' +
      (largh + margineDx + margineSx) + ' ' + (alt + 58) +
      '" style="width:100%;height:auto;overflow:visible" role="img" ' +
      'aria-label="Carico settimana per settimana, con l’assetto e le due soglie misurate">';

    h += '<defs>' +
      ['tNormale:var(--azione)', 'tSerio:var(--serio)', 'tCritico:var(--critico)']
        .map(function (g) {
          var n = g.split(':')[0], c = g.split(':')[1];
          return '<linearGradient id="' + n + '" x1="0" y1="0" x2="0" y2="1">' +
            '<stop offset="0" stop-color="' + c + '"/>' +
            '<stop offset="1" stop-color="' + c + '" stop-opacity="0.72"/></linearGradient>';
        }).join('') + '</defs>';

    [0, 25, 50, 75, 100].forEach(function (sv) {
      h += '<line x1="0" y1="' + y(sv) + '" x2="' + largh + '" y2="' + y(sv) +
        '" stroke="var(--griglia)" stroke-width="1"/>' +
        '<text x="-8" y="' + (y(sv) + 3.5) + '" font-size="10" text-anchor="end" ' +
        'fill="var(--inchiostro-3)">' + sv + '</text>';
    });
    h += '<line x1="0" y1="' + alt + '" x2="' + largh + '" y2="' + alt +
      '" stroke="var(--linea-base)" stroke-width="1.5"/>';

    [60, 50].forEach(function (sv) {
      h += '<line x1="0" y1="' + y(sv) + '" x2="' + largh + '" y2="' + y(sv) +
        '" stroke="var(--critico)" stroke-width="1.5" stroke-dasharray="5 4" opacity="0.8"/>' +
        '<rect x="' + (largh + 5) + '" y="' + (y(sv) - 9) + '" width="30" height="18" rx="9" ' +
        'fill="var(--critico)"/>' +
        '<text x="' + (largh + 20) + '" y="' + (y(sv) + 4) + '" font-size="10.5" ' +
        'text-anchor="middle" fill="#fff" font-weight="700">' + sv + '</text>';
    });

    punti.forEach(function (p, idx) {
      var x = idx * passo + passo * 0.20, w2 = passo * 0.60;
      var hb = alt - y(p.stress_str);
      var r = Math.min(6, w2 / 2, Math.max(0, hb));
      h += '<g class="col-giorno">' +
        '<rect x="' + x + '" y="' + y(p.stress_str) + '" width="' + w2 + '" height="' + hb +
        '" fill="url(#' + idGrad(p.stress_str) + ')" rx="' + r + '">' +
        '<title>Settimana ' + p.settimana + ': carico ' + p.stress_str +
        ', assetto ' + p.posizione_pos + ', regime ' + p.nome + '</title></rect>' +
        '<text x="' + (x + w2 / 2) + '" y="' + (alt + 15) + '" font-size="10.5" ' +
        'text-anchor="middle" fill="var(--inchiostro-3)">' + p.settimana + '</text>' +
        '<text x="' + (x + w2 / 2) + '" y="' + (y(p.stress_str) - 6) + '" font-size="11" ' +
        'text-anchor="middle" fill="var(--inchiostro)" font-weight="650">' + p.stress_str +
        '</text></g>';
    });

    /* l'assetto: sale quando le cose vanno meglio, quindi si legge al
       contrario delle barre — ed e' proprio il confronto che serve */
    var linea = punti.map(function (p, idx) {
      return (idx * passo + passo * 0.5) + ',' + y(p.posizione_pos);
    }).join(' ');
    h += '<polyline points="' + linea + '" fill="none" stroke="var(--superficie)" ' +
      'stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/>' +
      '<polyline points="' + linea + '" fill="none" stroke="var(--buono)" ' +
      'stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/>';
    punti.forEach(function (p, idx) {
      h += '<circle cx="' + (idx * passo + passo * 0.5) + '" cy="' + y(p.posizione_pos) +
        '" r="3.6" fill="var(--buono)" stroke="var(--superficie)" stroke-width="1.6">' +
        '<title>Settimana ' + p.settimana + ': assetto ' + p.posizione_pos +
        '</title></circle>';
    });

    h += '<text x="' + (largh / 2) + '" y="' + (alt + 36) + '" font-size="10.5" ' +
      'text-anchor="middle" fill="var(--inchiostro-3)">settimana</text></svg>';

    h += '<div class="legenda">' +
      '<span class="voce-legenda"><i class="segno" style="background:var(--azione)"></i>carico a fine settimana</span>' +
      '<span class="voce-legenda"><i class="segno" style="background:var(--serio)"></i>oltre 50</span>' +
      '<span class="voce-legenda"><i class="segno" style="background:var(--critico)"></i>oltre 60</span>' +
      '<span class="voce-legenda"><i class="segno linea" style="background:var(--buono)"></i>assetto — sale quando si sta meglio</span>' +
      '<span class="voce-legenda"><i class="segno tratteggio"></i>le due soglie misurate: 50 e 60</span>' +
      '</div>';

    q('grafico').innerHTML = h;

    /* la fila dei regimi, in chiaro: il colore da solo non basta a dire
       «spirale in formazione» — serve il nome */
    var hr = '<div class="verifica" style="margin-top:14px">';
    punti.forEach(function (p) {
      var grave = p.regime === 'macro_4_spirale_in_formazione' || p.regime === 'macro_5_spirale_stabilizzata';
      hr += '<div class="tassello"><div><div class="k">settimana ' + p.settimana + '</div>' +
        '<div class="v" style="font-size:15px;color:' + (grave ? 'var(--critico)' : 'inherit') + '">' +
        esc(p.nome) + '</div></div>' +
        '<div class="s">carico ' + p.stress_str + ' · assetto ' + p.posizione_pos + '</div></div>';
    });
    q('regimi').innerHTML = hr + '</div>';
  }

  /* ---------------- avvio ---------------- */
  function avvia() {
    disegnaScelte();
    disegnaCursori();

    document.addEventListener('click', function (ev) {
      var b = ev.target.closest ? ev.target.closest('[data-c]') : null;
      if (!b) { return; }
      scelta[b.getAttribute('data-c')] = b.getAttribute('data-v');
      disegnaScelte();
    });

    q('esegui').addEventListener('click', function () { esegui(); });

    q('tema').addEventListener('click', function () {
      var h = document.documentElement;
      var s = h.getAttribute('data-tema') === 'scuro' ? 'chiaro' : 'scuro';
      h.setAttribute('data-tema', s);
      this.textContent = s === 'scuro' ? 'Tema chiaro' : 'Tema scuro';
    });

    /* AUDIT 19/8 sera: il CSS di stampa esisteva già, mancava solo un
       controllo visibile che lo richiamasse. */
    q('stampa').addEventListener('click', function () { window.print(); });

    esegui();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', avvia);
  } else { avvia(); }

})();
