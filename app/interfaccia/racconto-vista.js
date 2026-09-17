/* =============================================================================
   SIMULATORE 3.0 — Come si mostra il racconto
   =============================================================================
   Un solo modo di disegnarlo, usato da tutte le pagine: il lettore deve
   riconoscerlo, non impararlo daccapo ogni volta.
   ========================================================================== */

(function (globale) {
  'use strict';

  function esc(t) {
    return String(t).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  /* il grassetto con i doppi asterischi è l'unica marcatura ammessa nei testi */
  function grassetto(t) {
    return esc(t).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  }

  var COLORE_REGISTRO = {
    completo: 'var(--aiuta)',
    breve:    'var(--attenzione)',
    stretto:  'var(--attenzione)',   /* il «breve» del livello settimana */
    minimo:   'var(--critico)',
    soglia:   'var(--critico)'       /* oltre il punto di non ritorno */
  };

  /* Il registro va spiegato con la frase giusta. Sul nodo e sulla catena il
     registro grave e' il piu' corto. Sulla settimana e' il piu' LUNGO: sopra
     85 il modello ha da dire la cosa piu' specifica che sappia dire. Usare
     la stessa frase per entrambi direbbe una cosa falsa al lettore. */
  /* CINQUE REGISTRI, CINQUE FRASI DIVERSE.
     Qui sopra c'e' gia' un commento che racconta una riga copiata e mai
     riletta: tutte e tre dicevano «Racconto ridotto», anche quella del
     racconto completo. Era stata corretta — e due righe sotto ne era rimasta
     un'altra identica: «stretto» e «breve» avevano lo stesso titolo e la
     stessa coda, parola per parola. Descrivono due situazioni diverse (uno
     e' il registro corto del gesto e della catena, l'altro quello della
     settimana), quindi devono dire due cose diverse.
     E tre titoli su cinque cominciavano con «Qui il racconto…»: letti di
     seguito facevano l'effetto di un modulo. Adesso ognuno apre a modo suo, e
     ognuno dice il PERCHE' invece di limitarsi a constatare la lunghezza —
     che e' poi la cosa che il lettore vuole sapere quando vede un testo
     piu' corto del solito. */
  /* OGNI FRASE SI LEGGE ATTACCATA AL MOTIVO CHE ARRIVA DA racconto.js, e le
     due meta' non si conoscevano: lette di seguito ripetevano la stessa parola
     a poche parole di distanza. «minimo»: «troppo compromesso… condizioni
     compromesse». «soglia»: «una cosa sola» tre volte in cinque righe. «breve»:
     «Le condizioni sono strette» e subito «Le condizioni non sono buone», con
     «poche cose» due volte. E «stretto» diceva «Sette giorni in poche righe»
     anche sotto la TRAIETTORIA, che di giorni ne ha quaranta o sessanta: il
     registro «stretto» lo usano tutti e due i livelli lunghi. */
  var FRASE_REGISTRO = {
    /* Frasi corte, e nessuna seconda persona: «quello che leggi qui» era
       l'unico «tu» della vista, in mezzo a un referto tutto impersonale. */
    /* Riscritte il 16/09/2026 con la voce da racconto: le stesse cose, ma in
       un periodo che respira, non in tre frasi a martello. */
    minimo:   { titolo: 'Qui il racconto si accorcia apposta.',
                coda: ' Più le condizioni peggiorano, più corto deve essere, perché quando ' +
                      'resta poco da fare dirlo in fretta vale più che spiegarlo a lungo.' },
    soglia:   { titolo: 'Qui il racconto dice una cosa sola.',
                coda: ' Non è più corto degli altri, è più stretto: tutto lo spazio va a ' +
                      'quella, perché oltre questa soglia è l’unica che sposti ancora qualcosa.' },
    stretto:  { titolo: 'Il racconto si stringe.',
                coda: ' Non è una sintesi frettolosa: a questa distanza contano le cose ' +
                      'che si ripetono, non i singoli giorni, e tutto il resto farebbe ' +
                      'soltanto rumore.' },
    breve:    { titolo: 'Il racconto resta sull’essenziale.',
                coda: ' Tre righe dette bene, adesso, servono più di un ragionamento lungo, ' +
                      'e quello che resta scritto è quello su cui si può ancora agire.' },
    completo: { titolo: 'Il racconto è per esteso.',
                coda: ' Le condizioni lo permettono, e allora vale la pena dire tutto: da ' +
                      'dove viene ogni numero, che cosa è costato, e che cosa resta al ' +
                      'gesto dopo.' }
  };


  function disegna(rac) {
    var h = '';

    /* la sintesi: chi legge una riga sola, legge questa */
    h += '<p class="racconto-sintesi">' + esc(rac.sintesi) + '</p>';

    /* quando il racconto si accorcia, il lettore deve sapere perché:
       un report breve non è un report svogliato */
    if (rac.registro.motivo) {
      var fr = FRASE_REGISTRO[rac.registro.nome] || FRASE_REGISTRO.completo;
      h += '<p class="racconto-registro" style="border-left-color:' +
        (COLORE_REGISTRO[rac.registro.nome] || 'var(--linea-base)') + '">' +
        '<strong>' + fr.titolo + '</strong> ' + esc(rac.registro.motivo) + fr.coda + '</p>';
    }

    rac.sezioni.forEach(function (s) {
      if (!s.testo) { return; }
      h += '<h4 class="racconto-titolo">' + esc(s.titolo) + '</h4>' +
        '<p class="racconto-testo">' + grassetto(s.testo) + '</p>';
    });

    if (rac.leve_disponibili && rac.leve_disponibili.leve.length) {
      h += '<h4 class="racconto-titolo">' + esc(rac.leve_disponibili.titolo) + '</h4>' +
        '<p class="racconto-testo">' + esc(rac.leve_disponibili.testo) + '</p>' +
        '<ul class="leve">' + rac.leve_disponibili.leve.map(function (l) {
          return '<li><strong>' + esc(l.azione) + '</strong> — ' + esc(l.perche) + '</li>';
        }).join('') + '</ul>';
    }

    if (rac.scogliere) {
      h += '<h4 class="racconto-titolo">' + esc(rac.scogliere.titolo) + '</h4>' +
        '<ul class="leve scogliere">' + rac.scogliere.righe.map(function (x) {
          return '<li>' + grassetto(x) + '</li>';
        }).join('') + '</ul>' +
        (rac.scogliere.nota ? '<p class="nota">' + esc(rac.scogliere.nota) + '</p>' : '');
    }

    if (rac.snodi && rac.snodi.length) {
      h += '<h4 class="racconto-titolo">' +
        (rac.snodi.length === 1 ? 'Lo snodo' : 'Gli snodi') + '</h4>' +
        '<ul class="leve snodi">' + rac.snodi.map(function (s) {
          return '<li>' + esc(s.testo) + '</li>';
        }).join('') + '</ul>';
    }

    if (rac.incastri) {
      h += '<h4 class="racconto-titolo">' + esc(rac.incastri.titolo) + '</h4>' +
        '<ul class="leve incastri">' + rac.incastri.righe.map(function (x) {
          return '<li>' + esc(x) + '</li>';
        }).join('') + '</ul>';
    }

    h += '<div class="racconto-azione">' +
      '<h4 class="racconto-titolo" style="margin-top:0">' + esc(rac.azione.titolo) + '</h4>' +
      '<p class="racconto-testo">' + grassetto(rac.azione.testo) + '</p>';
    if (rac.azione.priorita && rac.azione.priorita.length) {
      h += '<ol class="priorita">' + rac.azione.priorita.map(function (p) {
        return '<li>' + esc(p) + '</li>';
      }).join('') + '</ol>';
    }
    if (rac.azione.nota) {
      h += '<p class="nota" style="margin-top:10px">' + esc(rac.azione.nota) + '</p>';
    }
    h += '</div>';

    if (rac.tagliato && rac.tagliato.length) {
      h += '<details style="margin-top:10px"><summary style="cursor:pointer;font-size:12.5px;' +
        'color:var(--inchiostro-3)">Il racconto è stato accorciato: che cosa è stato tolto</summary>' +
        /* «registro» e' un termine del modello, e nel racconto completo — che
           non ha la frase di registro qui sopra — questa e' la prima volta che
           compare: si scioglie fra parentesi con le parole del glossario. */
        '<p class="nota">Il racconto è passato da ' + rac.parole_prima + ' a ' + rac.parole +
        ' parole, perché il registro (il tono, più o meno disteso, con cui il simulatore ' +
        'racconta) ne concede ' + rac.registro.budget_parole + '. Sono stati tolti, ' +
        'in quest’ordine: ' + esc(rac.tagliato.join(', ')) + '. Tre cose non si tolgono ' +
        'mai: che cosa è successo, che cosa è costato, che cosa fare.</p></details>';
    }

    /* IL CALCOLO PER ESTESO — chiuso per difetto, apposta.
       Il racconto sceglie quali condizioni raccontare; questa appendice le
       elenca tutte, comprese quelle che pesano poco, così chi vuole rifare
       il conto a mano ha ogni numero, non solo i più interessanti. Sta fuori
       dal budget di parole del racconto (vedi calcoloPerEsteso() in
       racconto.js), e per questo può restare completa anche quando il
       racconto sopra si è dovuto accorciare. */
    if (rac.calcolo && rac.calcolo.righe && rac.calcolo.righe.length) {
      h += '<details style="margin-top:10px"><summary style="cursor:pointer;font-size:12.5px;' +
        'color:var(--inchiostro-3)">' + esc(rac.calcolo.titolo) + ': come si arriva a ' +
        esc(rac.calcolo.pn) + '</summary>' +
        '<ul class="leve">' + rac.calcolo.righe.map(function (r) {
          return '<li>' + esc(r) + '</li>';
        }).join('') + '</ul>' +
        '<p class="nota">' + esc(rac.calcolo.nota) + '</p></details>';
    }
    return h;
  }

  globale.VistaRacconto = { disegna: disegna };

})(typeof window !== 'undefined' ? window : globalThis);
