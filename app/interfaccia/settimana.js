/* =============================================================================
   SIMULATORE 3.0 — La pagina della settimana
   =============================================================================
   Script classico, nessuna fetch, nessun modulo: funziona da file://

   Questa pagina non calcola niente da sola. Costruisce gli ingressi con
   SettimanaTipo, li dà a Tempo.eseguiMiniSettimana e mostra quello che torna.
   La misura del punto di non ritorno gira davvero, qui, nel browser: i numeri
   della tabella non sono scritti a mano, sono ricalcolabili col pulsante.
   ========================================================================== */

(function () {
  'use strict';

  var T = window.Tempo, ST = window.SettimanaTipo, R = window.Racconto,
      V = window.VistaRacconto, Lg = window.Lingua, semeDa = window.semeDa,
      Sp = window.Spiegazioni;

  /* Il plurale e i numeri con la virgola si chiedono a lingua.js: se manca,
     lo si deve sentire qui e non a meta' pagina, con una frase montata a
     pezzi che si rompe in silenzio. */
  (function (mancanti) {
    if (!mancanti.length) { return; }
    throw new Error('settimana.js: manca ' + mancanti.join(', ') +
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
  var v = { giorni: 7, nodi: 8, STR: 40, POS: 58 };

  var CURSORI = [
    { k: 'giorni', min: 2, max: 21, nome: 'Quanti giorni', sotto: 'la lunghezza della settimana' },
    { k: 'nodi', min: 3, max: 20, nome: 'Gesti per scena',
      sotto: 'quanto finemente la racconti: non costa di più, ma il percorso giorno per giorno cambia' },
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

  /* ---------------- i sei livelli ---------------- */
  function disegnaLivelli() {
    var h = '<div class="verifica">';
    T.LIVELLI.forEach(function (l) {
      h += '<div class="tassello">' +
        '<div><div class="k">' + esc(l.ampiezza) + '</div>' +
        '<div class="v" style="font-size:17px">' + esc(l.nome) + '</div>' +
        '<div class="s">Misura ' + esc(l.misura) + '.</div></div>' +
        '<div class="s" style="margin-top:8px;color:var(--inchiostro-3)">' +
        '<b>trasferisce</b> ' + esc(l.trasferisce) + '<br>' +
        '<b>si legge male</b> ' + esc(l.rischio) + '</div></div>';
    });
    q('livelli').innerHTML = h + '</div>';
  }

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
      function (e) { return 'Settimana ' + e.nome; }, function (e) { return e.sotto; });
    carte('sonni', ST.SONNI.filter(function (s) { return s.id !== 'banco'; }), 'sonno',
      function (e) { return 'Sonno ' + e.nome; },
      function (e) {
      /* «8,0 ore» non e' come si dice: otto ore sono otto ore. Il decimale
         serve solo quando c'e' («5,5 ore»). */
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
    q('cursoriSettimana').innerHTML = h;
    CURSORI.forEach(function (c) {
      q('c_' + c.k).addEventListener('input', function () {
        v[c.k] = parseInt(this.value, 10);
        q('v_' + c.k).textContent = v[c.k];
        aggiornaNotaK();
      });
    });
    aggiornaNotaK();
  }

  function aggiornaNotaK() {
    var tot = v.nodi * 3;
    var f = T.fattorePerGranularita(tot, T.K_TARATO);
    q('notaK').innerHTML = 'Questa giornata è raccontata con ' +
      Lg.plurale(tot, 'gesto', 'gesti') + ', cioè tre scene da ' + v.nodi + ' ciascuna. ' +
      'Una scena è una fila di gesti di seguito, in cui ognuno passa al successivo il ' +
      'carico che ha lasciato. ' +
      /* Anche k e' un decimale, e stampato cosi' com'e' arriva a schermo
         come «2.75»: un numero inglese in mezzo a una frase italiana, a due
         centimetri dal fattore che invece la virgola ce l'ha. */
      'Il fattore di trasferimento vale <code>' + Lg.numero(f, 4) + ' = k / n = ' +
      Lg.numero(T.K_TARATO, 2) + ' / ' + tot + '</code>, e dice quanta parte dell’effetto ' +
      'di ogni gesto passa allo stato della persona. Qui <b>n</b> è quanti gesti ha ' +
      'la giornata, cioè i ' + tot + ' qui sopra. <b>k</b>, invece, è lo stesso numero per ' +
      'tutte le giornate, fissato una volta per sempre. Non è stato scelto a occhio: è ' +
      'tarato su settecento settimane simulate, contro sette criteri scritti prima di ' +
      'cercarlo.' +
      /* QUI C'ERA UNA PROMESSA CHE I NUMERI SMENTISCONO.
         Diceva «il risultato non deve cambiare». Misurato il 10/09/2026 su
         cinque semi e nove finezze diverse, a parita' di tutto il resto il
         carico finale si sposta in media di venti punti e fino a trentadue
         (seme 424242: cinquanta con due gesti per scena, ottantadue con
         cinque). Il fattore k fa una cosa precisa e la fa bene — toglie la
         saturazione — ma non e' quella che la frase prometteva, e promettere
         piu' di quel che si mantiene e' il modo piu' rapido di perdere la
         fiducia di chi legge. */
      '<br><br>Muovi «gesti per scena» e guarda che cosa succede. Senza k il carico ' +
      'finirebbe al tetto, cioè a 100, a qualunque finezza, dove finezza vuol dire con ' +
      'quanti gesti si racconta la stessa giornata. Chi descriveva meglio la propria ' +
      'giornata veniva punito per averlo fatto, e punito fino in fondo. Con k questo non ' +
      'succede più. Su una giornata sola l’effetto è netto: la stessa giornata, raccontata ' +
      'con sei gesti o con novantasei, finisce sullo stesso carico, con tre punti di ' +
      'distanza al massimo. È il criterio D2 del libro, uno dei sette con cui k è stato ' +
      'tarato.' +
      '<br><br>Su una settimana intera, invece, i sette giorni si sommano, e comincia a ' +
      'vedersi l’effetto dei tiri di dado. Il fattore k tiene fermo quanto pesa una ' +
      'giornata, ma non come quella giornata va a finire. Per questo due settimane si ' +
      'possono confrontare fra loro solo a una condizione: che siano raccontate con la ' +
      'stessa finezza.';
  }

  /* ---------------- esecuzione ----------------
     IL PULSANTE E IL CURSORE SI CONTRADDICEVANO IN SILENZIO.
     «Sessanta giorni» faceva girare sessanta giorni, ma il cursore restava
     su sette e nessuno lo diceva; e il primo «Esegui la settimana» dopo
     tornava a sette, sempre senza dirlo. Chi guardava vedeva i numeri
     cambiare due volte e non poteva sapere su quanti giorni fossero
     calcolati — e la lunghezza e' proprio la cosa che questa pagina sta
     misurando. Adesso, quando i due non coincidono, sta scritto sotto i
     risultati, insieme a che cosa succede al prossimo giro. */
  var ultima = null;
  var notaGiorni = '';

  function esegui(giorni) {
    var seme = semeDa(q('seme').value);
    notaGiorni = (giorni && giorni !== v.giorni)
      ? 'Questi risultati sono su ' + Lg.plurale(giorni, 'giorno', 'giorni') +
        ', non sui ' + v.giorni + ' segnati qui sopra. Il cursore arriva al massimo a 21, ' +
        'e per vedere a quale valore il carico si assesta ce ne vogliono di più. ' +
        'Il prossimo «Esegui la settimana» torna a ' +
        Lg.plurale(v.giorni, 'giorno', 'giorni') + '.'
      : '';
    var w = ST.eseguiSettimana({
      durezza: ST.durezza(scelta.durezza).valore,
      sonno: ST.sonno(scelta.sonno).sonno,
      rip: scelta.rip,
      giorni: giorni || v.giorni,
      nodiPerScena: v.nodi,
      str: v.STR, pos: v.POS,
      seme: seme,
      titolo: 'Una settimana'
    });
    ultima = w;
    mostra(w);
  }

  /* IL PALLINO ERA SEMPRE GRIGIO, ANCHE SUL QUASI-COLLASSO.
     Leggeva `qa.colore`, che in racconto.js non esiste e non e' mai
     esistito: mancando, restava sempre il grigio di riserva. Un pallino
     colorato che non cambia mai colore e' peggio di un pallino che non
     c'e', perche' sembra un'informazione e non lo e'.
     Il colore c'e', e sta in spiegazioni.js insieme al titolo dell'esito:
     e' la stessa tinta che CATENA e LA-SCENA mettono sulla stessa parola,
     e adesso le tre pagine dicono lo stesso colore per lo stesso esito. */
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

  /* «SOPRA 50» QUANDO IL VALORE È 50 DICE IL FALSO.
     E lo dice proprio sul numero in cui il registro cambia, cioè dove il
     lettore guarda per capire se è dentro o fuori. Cinquanta non è sopra
     cinquanta: è esattamente la soglia, ed è un'informazione diversa e più
     precisa. Lo stesso difetto stava nel motore ed è già stato corretto lì. */
  function oltre(valore, soglia) {
    return valore === soglia
      ? 'cioè esattamente sulla soglia'
      : 'sopra la soglia, che è a ' + soglia;
  }

  function mostra(w) {
    var f = w.stato_finale, i = w.stato_iniziale;
    var dn = R.diagnosiNonRitorno(f);

    var h = '<div class="esito-principale">' +
      '<div><div class="numero-eroe">' + f.stress_str +
      '<span class="unita">/100</span></div>' +
      '<div class="eroe-etichetta">carico alla fine · era ' + i.stress_str + '</div></div>' +
      '<div><div class="numero-eroe" style="font-size:40px;color:' +
      (dn.oltre_costo ? 'var(--critico)' : 'inherit') + '">' + f.costo_nascosto +
      '</div><div class="eroe-etichetta">costo nascosto · soglia ' + dn.soglia_costo +
      '</div></div>' +
      '<div><div class="numero-eroe" style="font-size:40px">' + f.posizione_pos +
      '</div><div class="eroe-etichetta">assetto · era ' + i.posizione_pos + '</div></div>' +
      '<div style="align-self:center">' + pillolaEsito(w.esito) +
      '<div class="eroe-etichetta" style="margin-top:6px">regime (la condizione generale ' +
      'di questo periodo, non di oggi): <b>' + esc(w.nome_regime) + '</b></div></div></div>';

    if (dn.superato) {
      h += '<div class="avviso" style="border-left-color:var(--critico)">' +
        '<strong>Il punto di non ritorno è stato superato' +
        (dn.quale === 'costo' ? ', e a farlo scattare è stato il costo nascosto.' : '.') +
        '</strong> ' +
        (dn.quale === 'costo'
          ? 'Il costo nascosto è a ' + dn.costo + ', ' + oltre(dn.costo, dn.soglia_costo) + '. ' +
            'È un fatto misurato: sopra quella soglia non esce nessuno, in nessuna delle ' +
            'condizioni provate. Ed è la grandezza che nell’esito non si vede.'
          : 'Il carico è a ' + dn.carico + ', ' + oltre(dn.carico, dn.soglia_carico_migliore) +
            '. È un fatto misurato: da quel valore in su, quaranta giorni nelle condizioni ' +
            'migliori non bastano.') +
        ' Vedi i punti 6 e 7.</div>';
    } else if (dn.solo_col_meglio) {
      h += '<div class="avviso"><strong>Si esce, ma solo con le condizioni migliori.</strong> ' +
        'Il carico è a ' + dn.carico + ': ' + oltre(dn.carico, dn.soglia_carico) +
        ' in condizioni ordinarie, e siamo ancora sotto ' + dn.soglia_carico_migliore + '. ' +
        'Il costo nascosto è a ' + dn.costo + ', ancora sotto ' + dn.soglia_costo + '.</div>';
    } else if (dn.distanza_costo <= 15) {
      /* Il verbo deve seguire il numero: con un punto solo «Mancano 1 punti»
         si legge male proprio nel momento in cui la frase conta di piu'. */
      h += '<div class="avviso"><strong>' + (dn.distanza_costo === 1
          ? 'Manca un solo punto di costo nascosto alla soglia.'
          : 'Mancano ' + dn.distanza_costo + ' punti di costo nascosto alla soglia.') +
        '</strong> È la soglia che nessuna condizione di recupero sposta, e non si vede ' +
        'negli esiti.</div>';
    }

    var notte = R.resaDelleNotti(w);
    /* PARTENDO DA CENTO, UN «−1» NON E' UN MIGLIORAMENTO.
       Con carico 100 e assetto 0 — la settimana peggiore che questa pagina
       sappia costruire — la casella diceva «Carico −1», cioe' la stessa
       cosa che direbbe una settimana andata un po' meglio del previsto. Ma
       da cento il carico non ha piu' dove salire: quel punto in meno e'
       tutto quello che le notti sono riuscite a togliere, ed e' il
       contrario di una buona notizia. */
    h += '<div class="verifica" style="margin-top:20px">' +
      tassello('Giorni', w.giorni.length, 'la lunghezza della settimana') +
      tassello('Carico', conSegno(w.delta.STR),
               i.stress_str >= 100 && w.delta.STR <= 0
                 ? 'partiva già dal massimo, e da 100 il carico non può salire: questo ' +
                   'non è un miglioramento, è solo quello che le notti sono riuscite a ' +
                   'togliere'
                 : 'quanto è cambiato in tutto: da ' + i.stress_str + ' a ' + f.stress_str) +
      tassello('Costo nascosto', conSegno(w.delta.costo_nascosto),
               'quello che non si vede negli esiti: da ' + i.costo_nascosto +
               ' a ' + f.costo_nascosto) +
      tassello('Assetto', conSegno(w.delta.POS),
               'quanto si è spostato: da ' + i.posizione_pos + ' a ' + f.posizione_pos) +
      tassello('Debito', f.debito_deb,
               'quante volte si è insistito sulla stessa strada senza cambiare niente') +
      /* Quanto restituisce una notte e' un decimale: stampato com'e' esce
         «−3.7», con il punto inglese, dentro una fila di numeri che la
         virgola ce l'hanno. */
      (notte ? tassello('Le notti', (notte.restituito_per_notte > 0 ? '−' : '+') +
               Lg.numero(Math.abs(notte.restituito_per_notte)),
               'punti di carico che una notte restituisce, in media' +
               (notte.pavimento_attivo
                 ? ' · con il pavimento di protezione acceso, spiegato qui accanto' : '')) : '') +
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

    if (notaGiorni) { h += '<p class="nota">' + esc(notaGiorni) + '</p>'; }

    q('esito').innerHTML = h;
    q('bloccoEsito').hidden = false;

    disegnaGrafico(w);
    q('racconto').innerHTML = V.disegna(R.componiRaccontoSettimana(w));
    q('bloccoGiorni').hidden = false;
    q('bloccoRacconto').hidden = false;
  }

  function tassello(k, val, sotto) {
    return '<div class="tassello"><div><div class="k">' + esc(k) + '</div>' +
      '<div class="v">' + esc(String(val)) + '</div></div>' +
      '<div class="s">' + esc(sotto) + '</div></div>';
  }
  /* ---------------- il grafico giorno per giorno ----------------
     RIFATTO IL 04/09/2026.
     Prima: barre con gli angoli quasi vivi, tinte piatte, e trecento pixel
     di margine a destra occupati dalle didascalie delle due soglie — piu'
     spazio per le scritte che per i dati.

     Adesso le soglie portano solo il numero, in una pastiglia attaccata
     alla linea, e la spiegazione sta nella legenda sotto. Il grafico si
     riprende quello spazio: a parita' di larghezza le barre sono quasi il
     doppio, ed e' il grafico che deve essere leggibile, non la sua nota.

     Due cose restano come stavano, e sono decisioni del progetto, non
     grafica: il costo nascosto sta nello STESSO grafico del carico (misura
     del 18/08: il carico puo' restare fermo a 51 per venti giorni mentre il
     costo sale da 42 a 52 e l'uscita si chiude — su due grafici separati
     non si vedrebbe), e le due soglie sono quelle misurate. */
  function disegnaGrafico(w) {
    var punti = R.andamentoGiorni(w);
    var notti = w.notti || [];
    var L = 100, alt = 210;
    var largh = Math.max(320, punti.length * 58);
    var passo = largh / punti.length;
    var y = function (s) { return alt - (s / L) * alt; };
    var margineDx = 46;          /* bastano le pastiglie dei numeri */
    var margineSx = 26;

    function idGrad(str) {
      return str >= 60 ? 'gCritico' : (str >= 50 ? 'gSerio' : 'gNormale');
    }

    /* IL TITOLO DELL'ASSE ERA TAGLIATO. La scritta «giorno» sta con la
       base a (alt + 36) e la tela finiva esattamente li': la coda della «g»
       veniva mozzata. Due unita' bastavano; ce ne sono quattro, che e' lo
       spazio che quel corpo di carattere chiede sotto la riga di base. */
    var h = '<svg viewBox="' + (-margineSx) + ' -18 ' +
      (largh + margineDx + margineSx) + ' ' + (alt + 58) +
      '" style="width:100%;height:auto;overflow:visible" role="img" ' +
      'aria-label="Carico giorno per giorno, con il costo nascosto e le due soglie misurate">';

    /* le sfumature: una per ogni fascia di gravita' */
    h += '<defs>' +
      ['gNormale:var(--azione)', 'gSerio:var(--serio)', 'gCritico:var(--critico)']
        .map(function (g) {
          var n = g.split(':')[0], c = g.split(':')[1];
          return '<linearGradient id="' + n + '" x1="0" y1="0" x2="0" y2="1">' +
            '<stop offset="0" stop-color="' + c + '"/>' +
            '<stop offset="1" stop-color="' + c + '" stop-opacity="0.72"/></linearGradient>';
        }).join('') + '</defs>';

    /* la griglia */
    [0, 25, 50, 75, 100].forEach(function (sv) {
      h += '<line x1="0" y1="' + y(sv) + '" x2="' + largh + '" y2="' + y(sv) +
        '" stroke="var(--griglia)" stroke-width="1"/>' +
        '<text x="-8" y="' + (y(sv) + 3.5) + '" font-size="10" text-anchor="end" ' +
        'fill="var(--inchiostro-3)">' + sv + '</text>';
    });
    /* la linea di base, piu' marcata: e' lo zero */
    h += '<line x1="0" y1="' + alt + '" x2="' + largh + '" y2="' + alt +
      '" stroke="var(--linea-base)" stroke-width="1.5"/>';

    /* le due soglie misurate: solo il numero, in una pastiglia */
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
      var hb = alt - y(p.str);
      var r = Math.min(6, w2 / 2, Math.max(0, hb));
      h += '<g class="col-giorno">';
      h += '<rect x="' + x + '" y="' + y(p.str) + '" width="' + w2 + '" height="' + hb +
        '" fill="url(#' + idGrad(p.str) + ')" rx="' + r + '">' +
        '<title>Giorno ' + p.giorno + ': carico ' + p.str + ', assetto ' + p.pos +
        ', costo nascosto ' + p.costo + '</title></rect>';
      /* quello che la notte ha restituito, in chiaro sopra la barra */
      var n = notti[idx];
      if (n && n.stato_prima && n.stato_dopo) {
        var reso = n.stato_prima.stress_str - n.stato_dopo.stress_str;
        if (reso > 0) {
          h += '<rect x="' + x + '" y="' + y(p.str) + '" width="' + w2 + '" height="' +
            (y(p.str - reso) - y(p.str)) + '" fill="var(--buono)" opacity="0.42" rx="' + r + '">' +
            '<title>La notte ha restituito ' +
            Lg.plurale(reso, 'punto di carico', 'punti di carico') + '</title></rect>';
        }
      }
      h += '<text x="' + (x + w2 / 2) + '" y="' + (alt + 15) + '" font-size="10.5" ' +
        'text-anchor="middle" fill="var(--inchiostro-3)">' + p.giorno + '</text>' +
        '<text x="' + (x + w2 / 2) + '" y="' + (y(p.str) - 6) + '" font-size="11" ' +
        'text-anchor="middle" fill="var(--inchiostro)" font-weight="650">' + p.str + '</text>';
      h += '</g>';
    });

    /* il costo nascosto, come linea sopra le barre. Doppio tratto: sotto uno
       spesso del colore della scheda, cosi' la linea non si confonde con le
       barre che attraversa. */
    var linea = punti.map(function (p, idx) {
      return (idx * passo + passo * 0.5) + ',' + y(p.costo);
    }).join(' ');
    h += '<polyline points="' + linea + '" fill="none" stroke="var(--superficie)" ' +
      'stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/>';
    h += '<polyline points="' + linea + '" fill="none" stroke="var(--attenzione)" ' +
      'stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/>';
    punti.forEach(function (p, idx) {
      h += '<circle cx="' + (idx * passo + passo * 0.5) + '" cy="' + y(p.costo) +
        '" r="3.6" fill="var(--attenzione)" stroke="var(--superficie)" stroke-width="1.6">' +
        '<title>Giorno ' + p.giorno + ': costo nascosto ' + p.costo + '</title></circle>';
    });

    h += '<text x="' + (largh / 2) + '" y="' + (alt + 36) + '" font-size="10.5" ' +
      'text-anchor="middle" fill="var(--inchiostro-3)">giorno</text></svg>';

    /* LA LEGENDA, che prima non c'era: le didascalie delle soglie stavano
       dentro il grafico e le altre tre cose non erano spiegate affatto. */
    h += '<div class="legenda">' +
      '<span class="voce-legenda"><i class="segno" style="background:var(--azione)"></i>carico a fine giornata</span>' +
      '<span class="voce-legenda"><i class="segno" style="background:var(--serio)"></i>oltre 50</span>' +
      '<span class="voce-legenda"><i class="segno" style="background:var(--critico)"></i>oltre 60</span>' +
      '<span class="voce-legenda"><i class="segno" style="background:var(--buono);opacity:.5"></i>restituito dalla notte</span>' +
      '<span class="voce-legenda"><i class="segno linea" style="background:var(--attenzione)"></i>costo nascosto</span>' +
      '<span class="voce-legenda"><i class="segno tratteggio"></i>le due soglie misurate: 50 e 60</span>' +
      '</div>';

    q('grafico').innerHTML = h;
  }

  /* ---------------------------------------------------------------
     LE DUE SOGLIE — girate qui, nel browser

     I numeri non sono scritti a mano. Si parte da uno stato sintetico —
     carico e costo nascosto fissati — e si guarda se in quaranta giorni
     nelle condizioni MIGLIORI il sistema esce. Il pulsante li rifa': se il
     codice cambia, la tabella cambia con lui, e se non cambiasse sarebbe
     un errore visibile.
     --------------------------------------------------------------- */
  var MIGLIORE = { d: 0.25, s: 'ottimo', r: 'vera',
                   n: 'giornate leggerissime, sonno ottimo, rientro vero ogni giorno' };
  var MEDIO = { d: 0.55, s: 'normale', r: 'debole',
                n: 'giornate leggere, sonno normale, rientro debole' };

  function esce(str, costo, cambio, seme) {
    var w = ST.eseguiSettimana({
      durezza: cambio.d, sonno: ST.sonno(cambio.s).sonno,
      rip: cambio.r, rip_ogni_giorno: true,
      giorni: 40, nodiPerScena: 8, seme: seme,
      stato: { stress_str: str, posizione_pos: 58, debito_deb: 0,
               costo_nascosto: costo, rip: cambio.r }
    });
    var f = w.stato_finale;
    return !f.floor1_attivo && f.stress_str < 60;
  }

  var COSTI = [0, 30, 40, 45, 50, 60];
  var CARICHI = [40, 50, 60, 70, 80];
  var SEMI_UI = 8;


  function disegnaGriglia(idDiv, cambio, righe) {
    var h = '<p style="font-size:14px;font-weight:600;margin:16px 0 6px">' +
      esc(cambio.n) + '</p>' +
      '<table style="border-collapse:collapse;font-size:13px;font-variant-numeric:tabular-nums">' +
      '<tr><th style="text-align:left;padding:4px 10px;font-weight:550;color:var(--inchiostro-3)">' +
      'costo&nbsp;↓ / carico&nbsp;→</th>';
    CARICHI.forEach(function (s) {
      h += '<th style="padding:4px 10px;font-weight:550;color:var(--inchiostro-3)">' + s + '</th>';
    });
    h += '</tr>';
    righe.forEach(function (r) {
      var chiave = (r.costo >= 50);
      h += '<tr><td style="padding:4px 10px;font-weight:' + (chiave ? '700' : '550') +
        ';color:' + (chiave ? 'var(--critico)' : 'var(--inchiostro-2)') + '">' + r.costo + '</td>';
      r.celle.forEach(function (v) {
        var col = v >= 0.75 ? 'var(--buono)' : (v >= 0.25 ? 'var(--attenzione)' : 'var(--critico)');
        h += '<td style="padding:4px 10px;text-align:center;color:' + col +
          ';font-weight:600">' + Math.round(v * 100) + '%</td>';
      });
      h += '</tr>';
    });
    /* «giocata» compare per la prima volta nella pagina sotto la prima
       tabella: la parentesi sta li', e non si ripete sotto la seconda. */
    var primaVolta = (idDiv === 'grigliaMigliore');
    q(idDiv).innerHTML = h + '</table>' +
      '<p class="nota" style="margin-top:6px">Ogni casella dice quante ripetizioni su cento ' +
      'riescono a uscirne entro quaranta giorni.' +
      (primaVolta
        ? ' Una ripetizione, cioè questi stessi quaranta giorni rifatti da capo con dadi ' +
          'nuovi, è una prova intera, dal primo giorno all’ultimo, con i suoi tiri di dado.'
        : '') +
      ' Ogni casella è provata con ' + SEMI_UI + ' semi diversi, cioè con altrettante ' +
      'sequenze di tiri di dado, e quello che vedi è la loro media.</p>';
  }

  function spiegazioneNonRitorno() {
    q('spiegaNonRitorno').innerHTML =
      '<div class="avviso" style="border-left-color:var(--critico);margin-top:18px">' +
      '<strong>Due soglie, e la seconda è quella che conta.</strong> ' +
      'La soglia del <b>carico</b> sta a 50 in condizioni ordinarie, e a 60 con le ' +
      'condizioni migliori: sono i dieci punti che il recupero riesce a guadagnare. Quella ' +
      'del <b>costo nascosto</b> invece sta a 50 <em>in ogni condizione misurata</em>. ' +
      'Prova a immaginare quaranta giorni di giornate leggerissime, sonno ottimo e rientro ' +
      'vero ogni giorno: non si esce lo stesso. È lo stesso 50 che era già uscito da ' +
      'quattro misure diverse, e qui lo ritrova un metodo che con quelle non ha niente in ' +
      'comune. Nel libro queste soglie si chiamano scogliere, una parola presa dalla ' +
      'geografia. Lì il terreno non scende piano, come una discesa dolce: finisce di ' +
      'colpo, come sul bordo di una rupe. E non si vedono negli esiti, perché le cose ' +
      'possono essere andate tutte a buon fine.' +
      '</div>' +
      '<div class="avviso" style="margin-top:12px">' +
      '<strong>Non c’è un declino graduale.</strong> ' +
      'Misurato su 200 ripetizioni da trenta giorni, il carico finisce o attorno a 52, o a 99, ' +
      'e non c’è quasi niente in mezzo. Non si scivola giù: si sta, e poi si cade. ' +
      'Su cento ripetizioni, quelle già cadute sono zero dopo cinque giorni, quindici dopo ' +
      'quindici giorni e sessantatré dopo trenta. ' +
      'Per questo la domanda utile non è «a che punto sono», ma «da quanto va avanti».' +
      '</div>' +
      '<div class="avviso" style="margin-top:12px">' +
      '<strong>85 non è il punto di non ritorno.</strong> ' +
      '85 è il valore a cui si accende il «pavimento» di protezione, ed è un’altra cosa: ' +
      'da lì in avanti il recupero continua a funzionare, ma rende circa la metà, ' +
      'e il modello smette di lasciar peggiorare lo stato. ' +
      'E ci si entra da tre porte diverse: carico da 85 in su, assetto da 25 in giù, ' +
      'costo nascosto da 70 in su. Su 566 ripetizioni in cui il pavimento si è acceso, la ' +
      'prima porta è stata il carico nel 64 % dei casi, e <b>il costo nascosto nel 35 %</b>.' +
      '</div>';
  }

  /* ---- che cosa tira fuori: misurato ripartendo da dentro ---- */
  var CAMBI = [
    { n: 'niente: si continua uguale',              d: 0.9,  s: 'normale', r: 'debole' },
    { n: 'alleggerire molto le giornate',           d: 0.25, s: 'normale', r: 'debole' },
    { n: 'dormire bene, e basta',                   d: 0.9,  s: 'ottimo',  r: 'debole' },
    { n: 'alleggerire le giornate e dormire bene',  d: 0.25, s: 'ottimo',  r: 'debole' },
    { n: 'un rientro vero, senza alleggerire',      d: 0.9,  s: 'normale', r: 'vera' },
    { n: 'tutto insieme',                           d: 0.25, s: 'ottimo',  r: 'vera' }
  ];

  function bloccaPoiCambia(giorniDentro, cambio, seme) {
    var dentro = ST.eseguiSettimana({
      durezza: 0.9, sonno: ST.sonno('normale').sonno, rip: 'debole', rip_ogni_giorno: true,
      giorni: giorniDentro, nodiPerScena: 8, str: 45, pos: 58, seme: seme
    });
    var s0 = dentro.stato_finale;
    var dopo = ST.eseguiSettimana({
      durezza: cambio.d, sonno: ST.sonno(cambio.s).sonno,
      rip: cambio.r, rip_ogni_giorno: true,
      giorni: 40, nodiPerScena: 8, stato: s0, seme: seme + 5
    });
    return { costo_dentro: s0.costo_nascosto, carico_dentro: s0.stress_str,
             libero: !dopo.stato_finale.floor1_attivo };
  }

  function disegnaUscitaDa(risU, dentro) {
    var h = '';
    [5, 20].forEach(function (gg) {
      var dentroC = dentro[gg].c.slice(), dentroS = dentro[gg].s.slice();
      var righe = CAMBI.map(function (c) { return { n: c.n, esce: risU[gg + '_' + c.n] }; });
      var mc = dentroC.sort(function (a, b) { return a - b; })[Math.floor(dentroC.length / 2)];
      var ms = dentroS.sort(function (a, b) { return a - b; })[Math.floor(dentroS.length / 2)];
      h += '<p style="font-size:14px;font-weight:600;margin:18px 0 4px">Dopo ' + gg +
        ' giorni ordinari senza rientro vero — carico ' + ms + ', costo nascosto ' + mc + '</p>' +
        '<div class="verifica">';
      righe.sort(function (a, b) { return b.esce - a.esce; }).forEach(function (r) {
        var col = r.esce >= 0.6 ? 'var(--buono)' : (r.esce >= 0.25 ? 'var(--attenzione)' : 'var(--critico)');
        h += '<div class="tassello"><div><div class="k">' + esc(r.n) + '</div>' +
          '<div class="v" style="color:' + col + '">' + Math.round(r.esce * 100) + '%</div></div>' +
          '<div class="s">esce in quaranta giorni</div></div>';
      });
      h += '</div>';
    });
    h += '<p class="nota"><b>Quello che funziona presto non funziona tardi.</b> ' +
      'Quando ci si è dentro da poco, alleggerire le giornate fa uscire nella grande ' +
      'maggioranza dei casi, mentre un rientro vero <em>senza</em> alleggerire non fa ' +
      'uscire mai. Quando ci si è dentro da più tempo non funziona più niente in modo ' +
      'affidabile, nemmeno tutto insieme. Non è che il rientro non serva: è che da solo, ' +
      'e tardi, non basta.</p>';
    q('uscita').innerHTML = h;
  }

  /* LA MISURA A PASSI, CON LA BARRA (17/09/2026).
     Le due griglie (2 × 6 costi × 5 carichi × 8 semi = 480 settimane da
     quaranta giorni) e l'uscita (2 × 6 cambi × 8 semi = 96, ciascuna con il
     blocco prima) sono 576 simulazioni: dieci secondi sul computer, un minuto
     sul telefono. Prima giravano tutte all'apertura, e la pagina restava
     ferma. Adesso partono quando la sezione entra nello schermo, un passo per
     volta (un passo = una casella, cioè otto semi), con la barra che si
     riempie; fra un passo e l'altro la pagina risponde. I numeri sono gli
     stessi di prima, seme per seme: cambia solo quando si fanno. */
  function misuraAPassi(dove, allaFine, subito) {
    var celleM = [], celleD = [];
    COSTI.forEach(function (c) { CARICHI.forEach(function (s) { celleM.push([c, s]); celleD.push([c, s]); }); });
    var uscite = [];
    [5, 20].forEach(function (gg) { CAMBI.forEach(function (c) { uscite.push([gg, c]); }); });
    var risM = {}, risD = {}, risU = {}, dentro = { 5: { c: [], s: [] }, 20: { c: [], s: [] } };
    var passi = celleM.length + celleD.length + uscite.length;

    function cella(cambio, c, s) {
      var n = 0;
      for (var r = 0; r < SEMI_UI; r++) { if (esce(s, c, cambio, 313131 + r * 977)) { n++; } }
      return n / SEMI_UI;
    }
    function passo(i) {
      var k;
      if (i < celleM.length) { k = celleM[i]; risM[k[0] + '_' + k[1]] = cella(MIGLIORE, k[0], k[1]); return; }
      i -= celleM.length;
      if (i < celleD.length) { k = celleD[i]; risD[k[0] + '_' + k[1]] = cella(MEDIO, k[0], k[1]); return; }
      i -= celleD.length;
      var u = uscite[i], gg = u[0], c = u[1], lib = 0;
      for (var r = 0; r < SEMI_UI; r++) {
        var x = bloccaPoiCambia(gg, c, 313131 + r * 977);
        if (x.libero) { lib++; }
        if (c === CAMBI[0]) { dentro[gg].c.push(x.costo_dentro); dentro[gg].s.push(x.carico_dentro); }
      }
      risU[gg + '_' + c.n] = lib / SEMI_UI;
    }
    function righe(ris) {
      return COSTI.map(function (c) {
        return { costo: c, celle: CARICHI.map(function (s) { return ris[c + '_' + s]; }) };
      });
    }
    function fine() {
      disegnaGriglia('grigliaMigliore', MIGLIORE, righe(risM));
      disegnaGriglia('grigliaMedia', MEDIO, righe(risD));
      disegnaUscitaDa(risU, dentro);
      if (allaFine) { allaFine(); }
    }
    if (window.Attesa) {
      window.Attesa.lavora(dove, passi, passo, fine, {
        titolo: 'Sto misurando il punto di non ritorno: ' + passi + ' caselle, ' +
          (passi * SEMI_UI) + ' settimane simulate.',
        /* la sentinella e' la sezione intera, che ha un'altezza: una <div>
           vuota, alta zero, puo' passare fuori dallo schermo in un salto
           senza che l'osservatore la veda */
        quandoVisibile: subito ? null : (q('grigliaMigliore').closest('.riquadro') || q('grigliaMigliore'))
      });
    } else {
      for (var i = 0; i < passi; i++) { passo(i); }
      fine();
    }
  }

  /* ---------------- avvio ---------------- */
  function avvia() {
    disegnaLivelli();
    disegnaScelte();
    disegnaCursori();
    spiegazioneNonRitorno();

    document.addEventListener('click', function (ev) {
      var b = ev.target.closest ? ev.target.closest('[data-c]') : null;
      if (!b) { return; }
      scelta[b.getAttribute('data-c')] = b.getAttribute('data-v');
      disegnaScelte();
    });

    q('esegui').addEventListener('click', function () { esegui(); });
    q('sessanta').addEventListener('click', function () { esegui(60); });
    q('rifai').addEventListener('click', function () {
      q('misuraLive').innerHTML = '<p class="nota">Sto rifacendo le misure adesso: ' +
        'ci vogliono un paio di secondi.</p>';
      q('grigliaMigliore').innerHTML = ''; q('grigliaMedia').innerHTML = ''; q('uscita').innerHTML = '';
      misuraAPassi(q('misuraLive'), function () {
        q('misuraLive').innerHTML = '<p class="nota">Rifatte adesso, dentro questa pagina: ' +
          'i numeri qui sopra non sono scritti a mano.</p>';
      }, true);
    });

    q('tema').addEventListener('click', function () {
      var h = document.documentElement;
      var s = h.getAttribute('data-tema') === 'scuro' ? 'chiaro' : 'scuro';
      h.setAttribute('data-tema', s);
      this.textContent = s === 'scuro' ? 'Tema chiaro' : 'Tema scuro';
    });

    /* AUDIT 19/8 sera: il CSS di stampa esisteva già, mancava solo un
       controllo visibile che lo richiamasse. */
    q('stampa').addEventListener('click', function () { window.print(); });

    /* la settimana di esempio subito; la misura del punto di non ritorno
       (576 settimane) a passi, quando la sezione entra nello schermo: la
       tabella non è mai un ricordo, ma non tiene ferma la pagina */
    esegui();
    misuraAPassi(q('misuraLive'));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', avvia);
  } else { avvia(); }

})();
