/* =============================================================================
   SIMULATORE 3.0 — Interfaccia del questionario
   =============================================================================
   Nessuna logica di calcolo qui dentro: questa pagina raccoglie risposte,
   le passa a Composizione.componiNodo e mostra il nodo che ne esce.
   Il calcolo lo fa il core, come sempre.
   ========================================================================== */

(function () {
  'use strict';

  var Q = window.Questionario;
  var F = window.Famiglie;
  var Sel = window.Selezione;
  var C = window.Composizione;
  var N = window.Nucleo;
  var S = window.Spiegazioni;
  var CA = window.CondizioniAmbientali;
  var Lg = window.Lingua, semeDa = window.semeDa;

  /* Le regole dell'italiano — il plurale, i numeri con la virgola — stanno
     in un posto solo, e se quel posto non c'e' si deve sentire subito.
     CondizioniAmbientali invece e' davvero facoltativa: la pagina funziona
     anche senza, e infatti piu' sotto si controlla prima di usarla. */
  if (!Lg || !semeDa) {
    throw new Error('questionario-ui.js: manca ' +
      (!Lg ? 'Lingua (lingua.js)' : '') + (!Lg && !semeDa ? ' e ' : '') +
      (!semeDa ? 'semeDa (casuale-mt.js)' : '') + '. Ordine di caricamento: ' +
      'calibrazione.js, lingua.js, casuale-mt.js, nucleo.js, stato.js, racconto.js, ' +
      'questionario.js, famiglie.js, selezione.js, composizione.js, spiegazioni.js, ' +
      'e solo dopo questo file.');
  }

  var selezione = null;      /* quali domande fa questa scena, e perché */
  var risposteSicurezza = {};
  var risposte = {};
  var livello = 'standard';
  var p0 = 70;
  var ultimo = null;

  /* Le domande T17-T20 (condizioni ambientali estreme) possono ricevere un
     suggerimento di partenza dal testo libero della scena [claude/condizioni-
     estreme-senza-ia.md]. `toccateAMano` ricorda quali la persona ha già
     scelto lei: il suggerimento non le sovrascrive mai, una volta toccate —
     il testo libero suggerisce, non calcola. */
  var toccateAMano = {};
  var condizioniRiconosciute = null;

  function applicaSuggerimentiAmbientali(descrizione) {
    condizioniRiconosciute = null;
    if (!CA) { return; }
    var esito = CA.suggerisci(descrizione);
    if (!esito.gruppi.length) { return; }
    condizioniRiconosciute = esito;
    for (var id in esito.suggerimenti) {
      if (toccateAMano[id]) { continue; }
      risposte[id] = esito.suggerimenti[id];
    }
  }

  function q(id) { return document.getElementById(id); }
  function esc(t) {
    return String(t).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  /* I NUMERI COME LI SCRIVE L'ITALIANO, NON COME LI SCRIVE IL CODICE.
     Nella tabella «Ha spostato» si leggeva «−16.43 | 0,35» sulla stessa riga:
     il punto dei decimali dell'inglese accanto alla virgola dell'italiano,
     perche' il primo numero usciva da qui e il secondo da lingua.js. E i
     negativi portavano il trattino della tastiera (-16) mentre due righe piu'
     in la' la formula composta usava il segno meno lungo (−). Adesso passano
     tutti da lingua.js, che di queste due regole e' il posto unico. */
  function num(v) {
    var n = Number(v);
    if (!isFinite(n)) { return String(v); }
    return (n === Math.round(n)) ? Lg.intero(n) : Lg.numero(n, 2);
  }
  function segno(v) {
    var n = Number(v);
    if (!isFinite(n)) { return String(v); }
    return (n > 0 ? '+' : '') + num(n);
  }

  /* ---------------------------------------------------------------
     1 · IL CANCELLO DI SICUREZZA
     --------------------------------------------------------------- */
  function disegnaSicurezza() {
    q('sicurezza').innerHTML = Q.SICUREZZA.map(function (s) {
      return '<div class="domanda"><div class="testo">' + esc(s.testo) + '</div>' +
        '<div class="opzioni" style="grid-template-columns:1fr 1fr;display:grid;gap:6px">' +
        ['no', 'si'].map(function (v) {
          return '<label class="opzione" data-sic="' + s.id + '" data-val="' + v + '">' +
            '<input type="radio" name="sic_' + s.id + '" value="' + v + '">' +
            '<span>' + (v === 'si' ? 'Sì' : 'No') + '</span><span class="eff"></span></label>';
        }).join('') + '</div></div>';
    }).join('');

    q('sicurezza').addEventListener('change', function (ev) {
      var lab = ev.target.closest('label[data-sic]');
      if (!lab) { return; }
      risposteSicurezza[lab.getAttribute('data-sic')] = (lab.getAttribute('data-val') === 'si');
      Array.prototype.forEach.call(
        q('sicurezza').querySelectorAll('label[data-sic="' + lab.getAttribute('data-sic') + '"]'),
        function (l) { l.classList.toggle('scelta', l === lab); });
      valutaSicurezza();
    });
  }

  function valutaSicurezza() {
    var v = C.verificaSicurezza(risposteSicurezza);

    if (v.fermato) {
      q('esitoSicurezza').innerHTML = '<div class="cancello"><h3>Il simulatore si ferma qui.</h3>' +
        v.motivi.map(function (m) { return '<p style="margin:8px 0">' + esc(m.messaggio) + '</p>'; }).join('') +
        '<p style="margin:12px 0 0;font-size:13px;color:var(--inchiostro-2)">' +
        'Non è un blocco tecnico. Il modello calcola la riuscita di un gesto, e in questa ' +
        'situazione la riuscita del gesto non è il problema.</p></div>';
      ['bloccoScena', 'bloccoLivello', 'bloccoDomande', 'bloccoRisultato'].forEach(function (b) {
        q(b).style.display = 'none';
      });
      return;
    }

    if (!v.puo_calcolare) {
      /* Il participio e la coda della frase devono seguire il numero, e per
         una sola domanda cambiano tutti e due: «Manca ancora una risposta …
         rispondi anche alle ultime» dice una cosa e il suo contrario nella
         stessa riga. Due frasi intere, non una frase con un pezzo variabile.
         E i casi sono TRE, non due: quando non se n'e' data ancora nessuna,
         «rispondi ANCHE alle ultime» promette un lavoro gia' cominciato che
         non e' cominciato. Chi apre la pagina la prima volta leggeva proprio
         quella. */
      var quante = v.senza_risposta.length;
      var tutte = Q.SICUREZZA.length;
      q('esitoSicurezza').innerHTML = '<p class="nota">' + (
        quante === tutte
          ? 'Non hai ancora risposto a nessuna di queste domande: rispondi a tutte, ' +
            'e si va avanti.'
          : quante === 1
            ? 'Manca ancora una risposta su ' + tutte + ': rispondi anche all’ultima e si va avanti.'
            : 'Mancano ancora ' + quante + ' risposte su ' + tutte +
              ': rispondi anche alle altre e si va avanti.') + '</p>';
      return;
    }

    q('esitoSicurezza').innerHTML = '<p class="nota">Nessuna delle cinque situazioni ti riguarda, ' +
      'quindi si può andare avanti.</p>';
    q('bloccoScena').style.display = '';
    q('bloccoLivello').style.display = '';
    q('bloccoDomande').style.display = '';
  }

  /* ---------------------------------------------------------------
     2 · LA SCALA DI P0
     --------------------------------------------------------------- */
  function disegnaP0() {
    q('scalaP0').innerHTML = C.SCALA_P0.map(function (s) {
      return '<button class="carta-livello' + (s.valore === p0 ? ' scelta' : '') + '" data-p0="' + s.valore + '">' +
        '<b>' + s.valore + ' · ' + esc(s.etichetta) + '</b><span>' + esc(s.esempio) +
        (s.fonte ? '<br><em class="carta-fonte">nel ' + esc(s.fonte) + '</em>' : '') + '</span></button>';
    }).join('');
    q('scalaP0').addEventListener('click', function (ev) {
      var b = ev.target.closest('button[data-p0]');
      if (!b) { return; }
      p0 = parseInt(b.getAttribute('data-p0'), 10);
      disegnaP0();
      if (ultimo) { calcola(); }
    });
  }

  /* ---------------------------------------------------------------
     3 · IL LIVELLO
     --------------------------------------------------------------- */
  function disegnaLivelli() {
    q('livelli').innerHTML = Q.LIVELLI.map(function (l) {
      var n = Q.perLivello(l.id).length;
      return '<button class="carta-livello' + (l.id === livello ? ' scelta' : '') + '" data-liv="' + l.id + '">' +
        '<b>' + esc(l.nome) + ' · ' + Lg.plurale(n, 'domanda', 'domande') + '</b>' +
        '<span>' + esc(l.quando) + '</span></button>';
    }).join('');
    q('livelli').addEventListener('click', function (ev) {
      var b = ev.target.closest('button[data-liv]');
      if (!b) { return; }
      livello = b.getAttribute('data-liv');
      disegnaLivelli();
      disegnaDomande();
      q('bloccoRisultato').style.display = 'none';
      ultimo = null;
    });
  }

  /* ---------------------------------------------------------------
     4 · LE DOMANDE
     --------------------------------------------------------------- */
  var TARGA = {
    libro: 'dal libro',
    derivata: 'scritta per il modello'
  };
  function targa(fonte) {
    if (TARGA[fonte]) { return TARGA[fonte]; }
    /* Q003, Q015: sono le domande registrate durante la raccolta ufficiale.
       La targa diceva «run ufficiale», che in italiano non vuol dire niente,
       e ripeteva una parola inglese che il resto del pacchetto sta togliendo. */
    if (/^Q\d/.test(fonte)) { return 'domanda registrata · ' + fonte; }
    if (/^libro\//.test(fonte)) { return 'dal libro · ' + fonte.split('/')[1]; }
    return fonte;
  }

  /* LE SIGLE DELLE LEVE NON SI SCRIVONO NUDE A SCHERMO.
     Sotto la famiglia riconosciuta si leggeva «leve sensibili: E, STR, POS,
     cooldown»: quattro sigle senza scioglimento, e una parola inglese.
     Quei valori sono chiavi che app/motore/selezione.js confronta con un
     elenco chiuso, quindi nel dato non si toccano: si sciolgono qui, nel
     momento in cui si scrivono, come gia' fa il nucleo con inItaliano(). */
  var LEVE_IN_CHIARO = {
    E: 'il corpo',
    I: 'la chiarezza di quello che c’è da fare',
    T: 'la pressione del tempo',
    M: 'l’ambiente intorno',
    BP: 'la protezione (un aiuto concreto)',
    C: 'i pezzi da coordinare',
    DEB: 'il debito da insistenza',
    STR: 'il carico che ti porti dietro',
    POS: 'l’assetto (quanto ti senti in ordine)',
    RIP: 'il rientro (le pause vere)',
    supporto: 'l’aiuto che arriva da qualcuno',
    or1: 'l’orientamento (quanto sai ancora dove stai andando)',
    cooldown: 'il tempo di raffreddamento dopo una fase rossa (un periodo con il carico in ' +
              'zona di pericolo)'
  };
  function leveInChiaro(leve) {
    return Lg.elenco((leve || []).map(function (k) {
      return LEVE_IN_CHIARO[k] || String(k).replace(/_/g, ' ');
    }));
  }

  /* --------------------------------------------------------------
     LO SCENARIO-FIRST: la scena decide quali domande fare
     -------------------------------------------------------------- */
  function aggiornaSelezione() {
    if (!Sel) { return; }
    var descrizione = q('descrizione').value;
    selezione = Sel.selezionaPerScena(descrizione, livello);
    applicaSuggerimentiAmbientali(descrizione);
    disegnaFamiglie();
  }

  function disegnaFamiglie() {
    if (!selezione) { return; }
    var f = selezione.famiglie;
    if (!f.length) {
      q('famiglie').innerHTML = '<p class="nota" style="margin:0">' +
        '<strong>Non ho riconosciuto a quale parte della vita appartiene questa scena.</strong> ' +
        esc(selezione.nota) + ' Puoi andare avanti lo stesso, perché le domande le trovi ' +
        'tutte qui sotto. Oppure racconta la scena con qualche parola in più, qui sopra.</p>';
      return;
    }
    q('famiglie').innerHTML =
      '<p class="nota" style="margin:0 0 8px"><strong>La scena assomiglia a ' +
      (f.length === 1 ? 'questa famiglia di scene' : 'queste famiglie di scene') + '</strong>' +
      (selezione.riconoscimento === 'incerto'
        ? ' — ma il riconoscimento è incerto: più famiglie le somigliano allo stesso modo.' : '') + '</p>' +
      '<div class="scelta-livello">' + f.map(function (x, i) {
        return '<div class="carta-livello" style="cursor:default">' +
          '<b>' + esc(x.codice) + ' · ' + esc(x.nome) + '</b>' +
          '<span>' + esc(F.AREE[x.area] || x.area) + ' · qui pesano soprattutto ' +
          esc(leveInChiaro(x.leve)) +
          (i === 0 ? '<br>è la famiglia che somiglia di più alla tua scena' : '') +
          '</span></div>';
      }).join('') + '</div>' +
      '<p class="nota">Una famiglia è un gruppo di scene che si somigliano, per esempio ' +
      'vestirsi, uscire di casa, pagare una bolletta. La sigla che le sta davanti è il ' +
      'numero con cui il libro la chiama. Le famiglie <strong>non cambiano nessun ' +
      'numero</strong>, e la guida tecnica del modello lo dice in modo chiaro: servono ' +
      'soltanto a scegliere quali domande ha senso farti.</p>';
  }

  function disegnaSelezione() {
    if (!selezione) { q('selezione').innerHTML = ''; return; }
    var h = '';

    if (selezione.scartate.length) {
      h += '<details class="livello" style="margin-bottom:16px"><summary>' +
        '<span class="grado">−</span> ' +
        (selezione.scartate.length === 1
          ? 'Una domanda non viene fatta, e c’è un motivo'
          : selezione.scartate.length + ' domande non vengono fatte, e c’è un motivo') +
        '</summary><div class="corpo">' +
        '<p>' + esc(selezione.nota) + '</p>' +
        '<table class="dati"><tr><th>Domanda</th><th>Perché non si fa</th></tr>' +
        selezione.scartate.map(function (x) {
          return '<tr><td>' + esc(x.domanda.testo) + '</td><td>' + esc(x.motivo) + '</td></tr>';
        }).join('') + '</table></div></details>';
    }

    (selezione.lacune || []).forEach(function (l) {
      h += '<div class="avviso"><strong>Un ambito rimasto scoperto.</strong> ' + esc(l.testo) + '</div>';
    });

    if (condizioniRiconosciute && condizioniRiconosciute.gruppi.length) {
      h += '<div class="avviso" style="border-left-color:var(--attenzione)">' +
        '<strong>Condizioni ambientali riconosciute nel testo.</strong> ' +
        condizioniRiconosciute.gruppi.map(function (g) { return esc(g.nota); }).join(' ') +
        ' Le domande sulle condizioni ambientali, qui sotto, partono già da un valore, ' +
        'quello che il tuo testo suggerisce. Guardale, e cambiale se non descrivono ' +
        'bene la scena: il testo suggerisce, non calcola.</div>';
    }

    if (selezione.numerosita && selezione.numerosita.sotto_il_minimo) {
      h += '<p class="nota">' + esc(selezione.numerosita.nota) + '</p>';
    }
    q('selezione').innerHTML = h;
  }

  function disegnaDomande() {
    aggiornaSelezione();
    var elenco = selezione
      ? selezione.scelte.map(function (x) { return x.domanda; })
      : Q.perLivello(livello);
    disegnaSelezione();
    q('domande').innerHTML = elenco.map(function (d) {
      var corpo;
      if (d.tipo === 'scelta') {
        corpo = '<div class="opzioni">' + d.opzioni.map(function (o, i) {
          var eff = Q.spiegaEffetti(o.effetti).join(' · ');
          return '<label class="opzione' + (risposte[d.id] === i ? ' scelta' : '') +
            '" data-dom="' + d.id + '" data-val="' + i + '">' +
            '<input type="radio" name="d_' + d.id + '" value="' + i + '"' +
            (risposte[d.id] === i ? ' checked' : '') + '>' +
            '<span>' + esc(o.testo) + '</span>' +
            '<span class="eff">' + esc(eff) + '</span></label>';
        }).join('') + '</div>';
      } else {
        var val = (risposte[d.id] === undefined) ? d.neutro : risposte[d.id];
        corpo = '<div class="riga-scala">' +
          '<input type="range" data-dom="' + d.id + '" min="' + d.min + '" max="' + d.max +
          '" step="1" value="' + val + '">' +
          '<span class="val" id="val_' + d.id + '">' + val + '</span></div>' +
          '<div class="ancore"><span>' + d.min + ' · ' + esc(d.estremi ? d.estremi[0] : '') + '</span>' +
          '<span>' + esc(d.estremi ? d.estremi[1] : '') + ' · ' + d.max + '</span></div>' +
          '<div class="eff nota" id="eff_' + d.id + '" style="margin-top:6px"></div>';
      }
      var perche = motivoDi(d.id);
      var RUOLO = {
        corroborante: 'conferma, sposta poco',
        cornice: 'non entra nel calcolo'
      };
      return '<div class="domanda"><div class="testo">' + esc(d.testo) +
        '<span class="targa">' + esc(targa(d.fonte)) + '</span>' +
        (RUOLO[d.ruolo] ? '<span class="targa" title="Misurato su 4.000 questionari compilati: ' +
          'questa domanda da sola sposta il risultato di meno di mezzo punto.">' +
          esc(RUOLO[d.ruolo]) + '</span>' : '') +
        (perche ? '<span class="targa" title="' + esc(perche) + '">perché</span>' : '') +
        '</div>' +
        (d.aiuto ? '<div class="aiuto">' + esc(d.aiuto) + '</div>' : '') + corpo + '</div>';
    }).join('');

    /* le scale mostrano subito l'effetto della posizione corrente */
    elenco.forEach(function (d) {
      if (d.tipo === 'scala' && risposte[d.id] !== undefined) { aggiornaEffScala(d, risposte[d.id]); }
    });
    aggiornaAvanzamento();
  }

  function motivoDi(id) {
    if (!selezione) { return ''; }
    for (var i = 0; i < selezione.scelte.length; i++) {
      if (selezione.scelte[i].domanda.id === id) { return selezione.scelte[i].motivo; }
    }
    return '';
  }

  function aggiornaEffScala(d, val) {
    var e = q('eff_' + d.id);
    if (!e) { return; }
    var testo = Q.spiegaEffetti(Q.effettiRisposta(d, val)).join(' · ');
    e.textContent = testo || 'questa risposta sta nel mezzo, e non sposta niente';
  }

  function aggiornaAvanzamento() {
    var elenco = selezione
      ? selezione.scelte.map(function (x) { return x.domanda; })
      : Q.perLivello(livello);
    var tot = elenco.length;
    var date = elenco.filter(function (d) { return risposte[d.id] !== undefined; }).length;
    /* «0 risposte su 17» e' un conteggio, non una frase: chi apre la pagina
       la prima volta legge proprio quella, e legge uno zero. */
    q('contaRisposte').textContent = (date === 0)
      ? 'Ancora nessuna risposta, e le domande sono ' + tot + '. Finché restano vuote ' +
        'valgono il loro valore di mezzo, quello che non sposta niente.'
      : (date === 1 ? 'Una risposta su ' + tot : date + ' risposte su ' + tot) +
        (date < tot
          ? '. Quelle senza risposta restano ferme al valore che non sposta niente, e nel ' +
            'risultato si vede.'
          : '. Ci siamo: hai risposto a tutte.');
    q('barraAvanzamento').style.width = (tot ? (date / tot) * 100 : 0) + '%';
  }

  function collegaDomande() {
    q('domande').addEventListener('change', function (ev) {
      var lab = ev.target.closest('label[data-dom]');
      if (lab) {
        var id = lab.getAttribute('data-dom');
        risposte[id] = parseInt(lab.getAttribute('data-val'), 10);
        toccateAMano[id] = true;
        Array.prototype.forEach.call(
          q('domande').querySelectorAll('label[data-dom="' + id + '"]'),
          function (l) { l.classList.toggle('scelta', l === lab); });
        aggiornaAvanzamento();
        if (ultimo) { calcola(); }
      }
    });
    q('domande').addEventListener('input', function (ev) {
      var r = ev.target;
      if (r.type !== 'range') { return; }
      var id = r.getAttribute('data-dom');
      var v = parseInt(r.value, 10);
      risposte[id] = v;
      toccateAMano[id] = true;
      q('val_' + id).textContent = v;
      var d = Q.DOMANDE.filter(function (x) { return x.id === id; })[0];
      if (d) { aggiornaEffScala(d, v); }
      aggiornaAvanzamento();
    });
    q('domande').addEventListener('change', function (ev) {
      if (ev.target.type === 'range' && ultimo) { calcola(); }
    });
  }

  /* ---------------------------------------------------------------
     5 · IL RISULTATO
     --------------------------------------------------------------- */
  /* CHI HA RISPOSTO DAVVERO, E CHI NO.
     Le condizioni ambientali (T17-T20) possono partire già valorizzate da
     `applicaSuggerimentiAmbientali`, che legge il testo libero della scena.
     Finché la persona non tocca quella domanda con le sue mani, quel
     valore non è una risposta: è una deduzione. Il capitolo 21 ha un nome
     per questo — «stimato», distinto da «certo» — e composizione.js lo usa
     per non far passare una deduzione per una risposta data. */
  function provenienzaRisposte() {
    var prov = {};
    if (condizioniRiconosciute && condizioniRiconosciute.suggerimenti) {
      for (var id in condizioniRiconosciute.suggerimenti) {
        if (risposte[id] !== undefined && !toccateAMano[id]) { prov[id] = 'stimato'; }
      }
    }
    return prov;
  }

  function calcola() {
    ultimo = C.componiNodo(risposte, {
      livello: livello, p0: p0,
      soloQueste: selezione ? selezione.scelte.map(function (x) { return x.domanda.id; }) : null,
      descrizione: q('descrizione').value || 'Scena descritta dal questionario',
      provenienza: provenienzaRisposte()
    });
    q('bloccoRisultato').style.display = '';
    disegnaRisultato(ultimo);
    var quante = selezione ? selezione.scelte.length : Q.perLivello(livello).length;
    var date = quante - ultimo.senza_risposta.length;
    q('statoCalcolo').textContent = date === 0
      ? 'Il nodo è stato costruito senza nessuna risposta: per adesso ogni domanda vale il ' +
        'suo valore di mezzo, quello che non sposta niente.'
      : date === quante
        ? 'Il nodo è stato costruito su tutte e ' + quante + ' le risposte che questa scena chiede.'
        : 'Il nodo è stato costruito su ' + (date === 1 ? 'una sola' : date) +
          ' delle ' + quante + ' risposte che questa scena chiede.';
  }

  function disegnaRisultato(r) {
    var calc = r.calcolo;

    q('numeroPn').innerHTML = calc.pn + '<span class="unita"> su 100</span>';
    q('notaPn').textContent = 'È la probabilità che questo gesto riesca, nelle condizioni che ' +
      'le tue risposte hanno descritto. Accanto c’è la fiducia, cioè quanto ci si può ' +
      'appoggiare a questo numero, e dipende da quante risposte hai dato e da quanto sono certe.';

    var colF = { alta: 'var(--buono)', media: 'var(--attenzione)', bassa: 'var(--serio)' }[r.fiducia.livello];
    q('pillolaFiducia').innerHTML =
      '<span class="punto" style="background:' + colF + '"></span>fiducia ' + r.fiducia.livello;
    q('pillolaFiducia').title = r.fiducia.motivo;

    q('scala').innerHTML = '<span class="fondo"></span>' +
      '<span class="riempita" style="width:' + calc.pn + '%"></span>';

    /* il modello sta ancora distinguendo qualcosa? */
    var av = q('avvisoRisoluzione');
    if (r.risoluzione.stato === 'piena') {
      av.style.display = 'none';
    } else {
      av.style.display = '';
      av.style.borderLeftColor = (r.risoluzione.stato === 'esaurita') ? 'var(--critico)' : 'var(--attenzione)';
      av.innerHTML = '<strong>' +
        (r.risoluzione.stato === 'esaurita' ? 'Qui il numero ha smesso di distinguere.' : 'Il numero è appoggiato al bordo.') +
        '</strong> ' + esc(r.risoluzione.messaggio);
    }

    disegnaContributi(r);
    disegnaTraccia(r);
    disegnaAggregazioni(r);
    disegnaNodoTecnico(r);
    q('esitoTiro').innerHTML = '';
    q('racconto').innerHTML = '';
  }

  function disegnaContributi(r) {
    var n = r.nodo_normalizzato, m = n.modificatori;
    var righe = [
      { k: 'E', val: m.energia_e }, { k: 'I', val: m.informazione_i },
      { k: 'T', val: m.tempo_t },   { k: 'M', val: m.materiale_m },
      { k: 'BP', val: m.bonus_bp + n.stato_prima.bonus_bp },
      { k: 'C', val: -5 * m.complessita_c },
      { k: 'piSTR', val: -N.penalitaStr(n.stato_prima.stress_str) },
      { k: 'DEB', val: -5 * n.stato_prima.debito_deb }
    ];
    var max = Math.max(30, Math.max.apply(null, righe.map(function (x) { return Math.abs(x.val); })));
    var somma = righe.reduce(function (a, x) { return a + x.val; }, 0);

    q('basePartenza').innerHTML =
      '<span class="etichetta"><b data-parola="P0">' + esc(S.termini.P0.nome) + '</b> · P0</span>' +
      '<span class="pista-base">deciso da te, non dalle risposte</span>' +
      '<span class="cifra">' + n.p0 + '</span>';
    q('sommaSpostamenti').innerHTML =
      '<span class="etichetta"><b>Totale degli spostamenti</b></span>' +
      '<span class="pista-base"></span>' +
      '<span class="cifra" style="color:' + (somma >= 0 ? 'var(--aiuta)' : 'var(--ostacola)') + '">' +
      segno(somma) + '</span>';

    q('contributi').innerHTML = righe.map(function (x) {
      var info = S.termini[x.k];
      var larghezza = (Math.abs(x.val) / max) * 50;
      var sinistra = x.val >= 0 ? 50 : 50 - larghezza;
      var barra = larghezza < 0.4 ? '' :
        '<div class="barra ' + (x.val >= 0 ? 'piu' : 'meno') + '" style="left:' + sinistra + '%;width:' + larghezza + '%"></div>';
      return '<div class="riga-contributo" title="' + esc(info.breve) + '">' +
        '<span class="etichetta"><b data-parola="' + esc(x.k) + '">' + esc(info.nome) + '</b> · ' +
        esc(info.sigla) + '</span>' +
        '<span class="pista"><span class="zero" style="left:50%"></span>' + barra + '</span>' +
        '<span class="cifra">' + segno(x.val) + '</span></div>';
    }).join('');

    /* La penalità da carico è a gradini: sotto 40 non toglie niente.
       Vederlo quando capita vale più di leggerlo in una tabella. */
    var str = n.stato_prima.stress_str;
    var pen = N.penalitaStr(str);
    var nota = q('notaPenStr');
    if (!nota) {
      nota = document.createElement('p');
      nota.id = 'notaPenStr';
      nota.className = 'nota';
      q('sommaSpostamenti').parentNode.insertBefore(nota, q('sommaSpostamenti').nextSibling);
    }
    if (str > 0 && pen === 0) {
      nota.textContent = 'Il carico che ti porti dietro vale ' + str + ', ma non toglie ' +
        'ancora nessun punto, perché la penalità del libro è a gradini e comincia a 40. Fino a ' +
        'lì il carico si accumula senza farsi sentire, ed è proprio per questo che è insidioso.';
    } else if (pen > 0) {
      var soglie = [40, 60, 70, 80, 90];
      var prossima = soglie.filter(function (s) { return s > str; })[0];
      nota.textContent = 'Carico ' + str + ': la penalità del libro è a gradini, e a questo gradino ' +
        'toglie ' + pen + ' punti' +
        (prossima ? '. Lo scalino successivo è a ' + prossima + '.' : ', ed è l’ultimo scalino che c’è.');
    } else {
      nota.textContent = '';
    }
  }

  /* UN VALORE CHE NON E' UN NUMERO E' UNA CHIAVE DEL MOTORE.
     Nella colonna «Ha spostato» finivano a schermo cose come
     `macro_5_spirale_stabilizzata`: il nome che il codice usa per parlare con
     se stesso, trattino basso compreso. Il nucleo la traduzione ce l'ha gia'
     — Nucleo.inItaliano(elenco, valore) — e l'elenco a cui il valore
     appartiene e' proprio la chiave che l'ha prodotto. */
  /* La chiave della risposta e l'elenco in cui il valore vive non sempre si
     chiamano allo stesso modo: la domanda sull'adattamento risponde con la
     DISPONIBILITA' di un'alternativa — «reale», «teorica», «non_disponibile»
     — e nel nodo finisce infatti dentro adattamento.disponibilita. */
  var ELENCO_DEL_VALORE = { adattamento: 'disponibilita' };

  function valoreInChiaro(s) {
    if (typeof s.valore === 'number') { return segno(s.valore); }
    var quale = (s.chiave === undefined) ? '' : s.chiave;
    return N.inItaliano(ELENCO_DEL_VALORE[quale] || quale, s.valore) ||
      String(s.valore).replace(/_/g, ' ');
  }

  /* LA PROVENIENZA DI UNA RIGA DELLA TRACCIA.
     «Certo» non si scrive: è il caso normale, ed è già chiaro dal fatto
     che la riga esiste. Le altre tre provenienze del capitolo 21 si
     dichiarano, perché cambiano quanto ci si può fidare di quel pezzo del
     risultato — oggi, nella pratica, capita solo «stimato»: un valore che
     il testo della scena ha suggerito e che la persona non ha ancora
     confermato con le sue mani (vedi `provenienzaRisposte` più sopra). */
  var PROVENIENZA_ETICHETTA = {
    stimato: 'stimato dal testo della scena, non confermato',
    proxy: 'valore proxy, non confermato',
    incompleto: 'dato incompleto'
  };
  var PROVENIENZA_TITOLO = 'Il capitolo 21 del libro chiama così la provenienza di un dato: non ' +
    'l’ha dato la persona rispondendo, viene da una deduzione. Finché non rispondi tu a questa ' +
    'domanda, il valore resta quello suggerito dal testo, e il risultato te lo segnala.';

  function disegnaTraccia(r) {
    var conEffetto = r.traccia.filter(function (t) { return t.spostamenti.length; });
    var senzaEffetto = r.traccia.length - conEffetto.length;

    if (!conEffetto.length) {
      q('traccia').innerHTML = '<p>Nessuna risposta ha spostato niente: stanno tutte nel mezzo.</p>';
      return;
    }
    q('traccia').innerHTML =
      '<table class="dati"><tr><th>Domanda</th><th>Risposta</th><th>Ha spostato</th></tr>' +
      conEffetto.map(function (t) {
        var dich = (t.dichiarati && t.dichiarati.length)
          ? '<br><span style="color:var(--inchiostro-3);font-size:12.5px">tocca anche ' +
            Lg.elenco(t.dichiarati.map(function (s) {
              return esc(s.nome) + ' (' + esc(valoreInChiaro(s)) + ')';
            })) + ' — ' +
            Lg.concorda(t.dichiarati.length, 'lo diciamo, ma non lo contiamo',
                        'lo diciamo, ma non li contiamo') + '</span>'
          : '';
        var prov = PROVENIENZA_ETICHETTA[t.provenienza]
          ? '<br><span style="color:var(--attenzione);font-size:12.5px" title="' + esc(PROVENIENZA_TITOLO) +
            '" data-parola="provenienza">' +
            esc(PROVENIENZA_ETICHETTA[t.provenienza]) + '</span>'
          : '';
        return '<tr><td>' + esc(t.testo) + prov + '</td><td>' + esc(t.risposta) + '</td><td>' +
          t.spostamenti.map(function (s) {
            /* un numero si attacca al nome, una parola vuole i due punti:
               «il corpo adesso −12», ma «il tipo di recupero: un rientro vero» */
            var separa = (typeof s.valore === 'number') ? ' ' : ': ';
            /* «l'attendibilità delle risposte» ha una voce di glossario propria
               (spiegazioni.js, chiave «attendibilita»): qui diventa cliccabile,
               come «provenienza» qualche riga sopra. */
            var nomeReso = (s.chiave === 'qualita')
              ? '<span data-parola="attendibilita">' + esc(s.nome) + '</span>'
              : esc(s.nome);
            return nomeReso + separa + '<strong>' + esc(valoreInChiaro(s)) + '</strong>';
          }).join('<br>') + dich + '</td></tr>';
      }).join('') + '</table>' +
      (r.secondari_dichiarati.length
        ? '<p class="nota"><strong>Ogni fatto conta una volta sola.</strong> ' +
          'Il capitolo 18 lo chiama <em>domicilio unico</em>. Ogni fatto ha una ' +
          'casa sola nel calcolo. Se tocca anche altro, lo si scrive, ma non lo si conta una ' +
          'seconda volta. ' +
          (r.secondari_dichiarati.length === 1
            ? 'Qui è successo una volta: un effetto in più è stato scritto, non sommato.'
            : 'Qui è successo ' + r.secondari_dichiarati.length + ' volte: altrettanti effetti ' +
              'in più sono stati scritti, non sommati.') +
          ' La ragione è semplice: la stessa stanchezza non può togliere punti due volte, ' +
          'una come corpo e una come carico che ti porti dietro.</p>'
        : '') +
      (senzaEffetto
        ? '<p class="nota">' + (senzaEffetto === 1
            ? 'Una risposta non ha spostato niente: stava nel mezzo.'
            : senzaEffetto + ' risposte non hanno spostato niente: stavano nel mezzo.') + '</p>'
        : '') +
      (r.senza_risposta.length
        ? '<p class="nota">' + (r.senza_risposta.length === 1
            ? 'È rimasta una domanda senza risposta: conta come neutra, e per questo la ' +
              'fiducia scende.'
            : 'Sono rimaste ' + r.senza_risposta.length + ' domande senza risposta: contano ' +
              'come neutre, e per questo la fiducia scende.') + '</p>'
        : '') +
      (r.avvisi.length ? '<div class="avviso"><strong>Segnalazioni</strong>' +
        r.avvisi.map(esc).join('<br>') + '</div>' : '');
  }

  function disegnaAggregazioni(r) {
    if (!r.aggregazioni.length) {
      q('aggregazioni').innerHTML = '<p>A questo livello ogni variabile ha una domanda sola, ' +
        'quindi non c’è niente da mettere insieme: il valore è quello della risposta.</p>';
      return;
    }
    var attenuate = r.aggregazioni.filter(function (a) { return a.rho < 1; });
    q('aggregazioni').innerHTML =
      '<p>Su alcune variabili il questionario fa più di una domanda. Sul corpo, per ' +
      'esempio, ne fa quattro o cinque. Non sono sottrazioni diverse, sono <strong>modi ' +
      'diversi di guardare la stessa cosa</strong>, e sommarle sarebbe un errore: come ' +
      'misurare cinque volte la stessa febbre e addizionare i risultati.</p>' +
      '<p>La regola è questa. <strong>La risposta più sfavorevole fissa il livello, e le ' +
      'altre lo correggono con un peso ridotto.</strong> Il peso non è scelto a mano: è ' +
      'quello che porta il caso peggiore esattamente al limite che il libro dichiara per ' +
      'quella variabile.</p>' +
      '<table class="dati"><tr><th>Variabile</th><th style="text-align:right">Domande</th>' +
      '<th style="text-align:right">Somma semplice</th><th style="text-align:right">Valore usato</th>' +
      '<th style="text-align:right">Peso</th></tr>' +
      r.aggregazioni.map(function (a) {
        return '<tr><td>' + esc(a.nome) + '</td><td class="num">' + a.domande + '</td>' +
          '<td class="num">' + segno(a.somma_semplice) + '</td>' +
          '<td class="num"><strong>' + segno(a.valore_aggregato) + '</strong></td>' +
          '<td class="num">' + (a.rho < 1 ? Lg.numero(a.rho, 2) : '—') + '</td></tr>';
      }).join('') + '</table>' +
      (attenuate.length ? '' : '<p class="nota">Nessuna variabile è stata attenuata. ' +
        'Attenuare vuol dire ridurre il peso delle risposte in più, e qui non serviva: ' +
        'stanno già tutte dentro i limiti che il libro dichiara.</p>') +
      (r.compressioni.length ? '<p class="nota">' +
        Lg.concorda(r.compressioni.length,
          'Una variabile è arrivata in fondo alla sua scala: ',
          'Queste variabili sono arrivate in fondo alla loro scala: ') +
        Lg.elenco(r.compressioni.map(function (c) { return esc(c.nome); })) +
        '. Vuol dire che rispondere ancora peggio non sposterebbe quasi niente. Il modello ' +
        'ha già registrato tutto quello che lì poteva registrare.</p>' : '');
  }

  function disegnaNodoTecnico(r) {
    var n = r.nodo_normalizzato, calc = r.calcolo;
    q('nodoTecnico').innerHTML =
      '<div class="formula-libro" data-formula="madre"></div>' +
      '<p class="formula-testo">Pn = clamp[5; 95]( ' + num(n.p0) + ' ' + segno(n.modificatori.energia_e) +
      ' ' + segno(n.modificatori.informazione_i) + ' ' + segno(n.modificatori.tempo_t) +
      ' ' + segno(n.modificatori.materiale_m) + ' ' + segno(n.modificatori.bonus_bp + n.stato_prima.bonus_bp) +
      ' − 5·' + n.modificatori.complessita_c + ' − ' + N.penalitaStr(n.stato_prima.stress_str) +
      ' − 5·' + n.stato_prima.debito_deb + ' ) = clamp( ' + num(calc.grezzo) +
      ' ) = <strong>' + calc.pn + '</strong></p>' +
      /* «clamp» compare due volte nella riga qui sopra, ed e' la prima volta
         che si vede in questa pagina: la spiegazione va qui, non altrove. */
      '<p class="nota"><strong>clamp</strong> è il nome che il libro dà al taglio ai bordi. ' +
      'Vuol dire questo: qualunque cosa dia la somma, il risultato non scende sotto 5 e ' +
      'non sale sopra 95.</p>' +
      '<table class="dati">' +
      '<tr><th>Campo del nodo</th><th style="text-align:right">Valore</th></tr>' +
      /* I NOMI DEI CAMPI RESTANO QUELLI DEL CODICE, I VALORI NO.
         Questo e' il pannello che si apre per vedere il nodo com'e' fatto
         dentro, e chi lo apre vuole proprio i nomi veri: `energia_e` e' la
         chiave che ritrova nel motore. Ma i VALORI erano chiavi anche loro —
         `macro_5_spirale_stabilizzata`, `non_disponibile`, `true` — e quelle
         non insegnano niente: il nucleo le sa tradurre, e le traduce qui. */
      [['p0', num(n.p0)],
       ['energia_e', segno(n.modificatori.energia_e)],
       ['informazione_i', segno(n.modificatori.informazione_i)],
       ['tempo_t', segno(n.modificatori.tempo_t)], ['materiale_m', segno(n.modificatori.materiale_m)],
       ['bonus_bp', n.modificatori.bonus_bp], ['complessita_c', n.modificatori.complessita_c],
       ['stress_str', n.stato_prima.stress_str], ['posizione_pos', n.stato_prima.posizione_pos],
       ['debito_deb', n.stato_prima.debito_deb],
       ['rip', N.inItaliano('rip', n.stato_prima.rip)],
       ['macro', N.inItaliano('macro', n.stato_prima.macro)],
       ['campo.attivo', n.campo.attivo ? 'sì, c’è qualcosa che reagisce' : 'no, niente reagisce'],
       ['campo.forza', n.campo.forza],
       ['supporto.tipo', N.inItaliano('supporto', n.supporto.tipo)],
       ['supporto.delega', N.inItaliano('delega', n.supporto.delega)],
       ['adattamento.disponibilita', N.inItaliano('disponibilita', n.adattamento.disponibilita)]
      ].map(function (p) {
        return '<tr><td><code>' + esc(p[0]) + '</code></td><td class="num">' + esc(String(p[1])) + '</td></tr>';
      }).join('') + '</table>' +
      '<p class="nota">A sinistra ci sono i nomi che il campo ha dentro il programma, ' +
      'quelli veri e non una parafrasi, così chi va a leggere il motore li ritrova uguali. A ' +
      'destra c’è quello che vogliono dire.</p>';
    /* Il riquadro della formula nasce adesso, e chi lo riempie ha gia' fatto
       il suo giro al caricamento della pagina: senza questa chiamata resta
       vuoto, e la formula composta non si vede. */
    if (window.FormuleVista) { window.FormuleVista.riempi(q('nodoTecnico')); }
  }

  /* ---------------------------------------------------------------
     IL TIRO
     --------------------------------------------------------------- */
  function tira() {
    if (!ultimo) { return; }
    var seme = semeDa(q('seme').value);
    var rng = new window.CasualePython(seme);
    var res = N.eseguiNodo(ultimo.nodo, { rng: rng });
    var e = S.esiti[res.esito];
    var col = S.colori[e.stato];

    q('scala').innerHTML = '<span class="fondo"></span>' +
      '<span class="riempita" style="width:' + res.pn + '%"></span>' +
      '<span class="marcatore" style="left:' + (res.tiro - 0.15) + '%"></span>' +
      '<span class="etichetta-marcatore" style="left:' + res.tiro + '%">dado ' + res.tiro + '</span>';

    q('esitoTiro').innerHTML =
      '<p style="margin:18px 0 10px"><span class="pillola pillola-esito">' +
      '<span class="punto" style="background:' + col + '"></span>' +
      '<span class="glifo" style="color:' + col + '">' + e.glifo + '</span>' + esc(e.titolo) + '</span></p>' +
      '<p>' + esc(e.umano) + '</p>' +
      '<p>Il dado ha dato <strong>' + res.tiro + '</strong> contro <strong>' + res.pn + '</strong>: ' +
      (res.successo_prima_del_campo ? 'sotto la soglia, quindi riuscito.' : 'sopra la soglia, quindi non riuscito.') +
      ' Il margine, cioè la distanza fra il dado e la soglia, è di ' +
      '<strong>' + num(Math.abs(res.margine_netto)) + '</strong>' +
      (Math.abs(res.margine_netto) < 10 ? ', ed è molto stretto: sarebbe bastato poco per ribaltarlo.' : '.') + '</p>';

    /* il racconto */
    var rng2 = new window.CasualePython(seme);
    var completo = window.Stato.eseguiNodoCompleto(ultimo.nodo, { rng: rng2 });
    q('racconto').innerHTML = window.VistaRacconto.disegna(
      window.Racconto.componiRacconto(completo, ultimo.nodo));
  }

  /* ---------------------------------------------------------------
     AVVIO
     --------------------------------------------------------------- */
  function tema() {
    var b = q('tema');
    b.addEventListener('click', function () {
      var scuro = document.documentElement.getAttribute('data-tema') === 'scuro';
      document.documentElement.setAttribute('data-tema', scuro ? 'chiaro' : 'scuro');
      b.textContent = scuro ? 'Tema scuro' : 'Tema chiaro';
    });
  }

  /* AUDIT 19/8 sera: il CSS di stampa esisteva già, mancava solo un
     controllo visibile che lo richiamasse. */
  function stampa() {
    q('stampa').addEventListener('click', function () { window.print(); });
  }

  disegnaSicurezza();
  disegnaP0();
  disegnaLivelli();
  disegnaDomande();
  collegaDomande();
  valutaSicurezza();
  tema();
  stampa();

  q('calcola').addEventListener('click', calcola);
  q('tira').addEventListener('click', tira);
  q('azzera').addEventListener('click', function () {
    risposte = {}; toccateAMano = {}; ultimo = null;
    q('bloccoRisultato').style.display = 'none';
    q('statoCalcolo').textContent = '';
    disegnaDomande();
  });
  var attesa = null;
  q('descrizione').addEventListener('input', function () {
    clearTimeout(attesa);
    attesa = setTimeout(function () {
      disegnaDomande();
      if (ultimo) { calcola(); }
    }, 350);
  });

})();
