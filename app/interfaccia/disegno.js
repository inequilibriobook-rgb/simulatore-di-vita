/* =============================================================================
   SIMULATORE 3.0 — Gli attrezzi per disegnare
   =============================================================================
   Script classico, nessuna libreria, nessuna rete: SVG scritto a mano.

   PERCHE' ESISTE
   Ogni pagina si era disegnata i propri grafici per conto suo. Le funzioni
   erano diverse ma facevano le stesse quattro cose — mettere una griglia,
   incolonnare delle barre, tirare una linea, scrivere un'etichetta — e ogni
   copia aveva le sue misure, i suoi colori, i suoi difetti. Con diciassette
   figure nuove sarebbero diventate diciassette copie.

   Qui quelle quattro cose stanno una volta sola. Il vantaggio non e' la
   brevita': e' che tutte le figure del pacchetto hanno adesso lo stesso
   passo, lo stesso peso di linea, la stessa aria intorno — e che una
   correzione tipografica si fa in un posto e vale per tutte.

   COME SI USA
       var g = D.tela({ larghezza: 760, altezza: 260 });
       g.griglia([0, 25, 50, 75, 100]);
       g.linea(punti, { colore: 'var(--ostacola)' });
       elemento.innerHTML = g.chiudi('Che cosa mostra la figura');

   Le coordinate si danno nei valori VERI del dominio — carico 43, settimana
   6 — e le funzioni x() e y() li trasformano in pixel. Chi disegna non fa
   mai aritmetica di pixel a mano: e' li' che nascono i grafici storti.
   ========================================================================== */
(function (globale) {
  'use strict';

  function esc(t) {
    return String(t).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function num(v, d) {
    return Number(v).toLocaleString('it-IT', { maximumFractionDigits: d === undefined ? 1 : d });
  }
  /* i numeri finiscono dentro attributi SVG: mai notazione esponenziale,
     mai NaN. Un NaN in un attributo fa sparire l'intero elemento senza un
     errore in console, ed e' il difetto piu' difficile da vedere. */
  function n(v) {
    var x = Number(v);
    if (!isFinite(x)) { return '0'; }
    return (Math.round(x * 100) / 100).toString();
  }

  function tela(opzioni) {
    opzioni = opzioni || {};
    var W = opzioni.larghezza || 760;
    var H = opzioni.altezza || 260;
    var m = opzioni.margini || {};
    var L = m.sinistra === undefined ? 42 : m.sinistra;
    var R = m.destra === undefined ? 16 : m.destra;
    var T = m.alto === undefined ? 20 : m.alto;
    var B = m.basso === undefined ? 34 : m.basso;

    var dx = opzioni.x || [0, 1];
    var dy = opzioni.y || [0, 100];
    var pw = W - L - R, ph = H - T - B;

    var pezzi = [];
    var defs = [];

    function x(v) {
      var a = dx[0], b = dx[1];
      return b === a ? L + pw / 2 : L + (v - a) / (b - a) * pw;
    }
    function y(v) {
      var a = dy[0], b = dy[1];
      return b === a ? T + ph / 2 : T + ph - (v - a) / (b - a) * ph;
    }

    var api = {
      W: W, H: H, L: L, R: R, T: T, B: B, pw: pw, ph: ph, x: x, y: y,
      dominioX: dx, dominioY: dy,

      aggiungi: function (s) { pezzi.push(s); return api; },
      definisci: function (s) { defs.push(s); return api; },

      /* una sfumatura verticale, per le aree sotto le linee */
      sfumatura: function (id, colore, sopra, sotto) {
        defs.push('<linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1">' +
          '<stop offset="0" stop-color="' + colore + '" stop-opacity="' + (sopra === undefined ? 0.3 : sopra) + '"/>' +
          '<stop offset="1" stop-color="' + colore + '" stop-opacity="' + (sotto === undefined ? 0.02 : sotto) + '"/>' +
          '</linearGradient>');
        return api;
      },

      /* GRIGLIA ORIZZONTALE, con le etichette a sinistra.
         La riga dello zero e' piu' marcata delle altre: e' la linea di
         terra, e senza distinguerla un grafico che scende sotto zero non si
         legge. */
      griglia: function (valori, opz) {
        opz = opz || {};
        valori.forEach(function (v) {
          var terra = (v === (opz.terra === undefined ? dy[0] : opz.terra));
          pezzi.push('<line x1="' + n(L) + '" y1="' + n(y(v)) + '" x2="' + n(W - R) +
            '" y2="' + n(y(v)) + '" stroke="' + (terra ? 'var(--linea-base)' : 'var(--griglia)') +
            '" stroke-width="' + (terra ? 1.5 : 1) + '"/>');
          if (opz.etichette !== false) {
            pezzi.push('<text x="' + n(L - 8) + '" y="' + n(y(v) + 4) +
              '" text-anchor="end" font-size="10.5" fill="var(--inchiostro-3)">' +
              esc(opz.formato ? opz.formato(v) : num(v, 0)) + '</text>');
          }
        });
        return api;
      },

      /* le tacche in basso: si passa un elenco di [valore, etichetta].

         LA PRIMA E L'ULTIMA TACCA NON DEVONO SPORGERE.
         Un'etichetta centrata sul suo valore ha meta' larghezza a destra e
         meta' a sinistra del punto. Sull'ultimo valore del dominio quel
         punto e' il bordo del disegno, quindi meta' etichetta cade fuori
         dal viewBox — e fuori dal viewBox non si accorcia niente, si
         taglia. Misurato: «MS 100» nella figura dei margini perdeva la
         coda a destra.
         L'etichetta resta centrata: si sposta solo di quel tanto che serve
         a rientrare, e su tutte le tacche di mezzo non cambia niente. */
      asseX: function (tacche, titolo) {
        tacche.forEach(function (t) {
          /* meta' larghezza stimata: a 10,5 px il carattere di sistema non
             supera 0,52 em per lettera */
          var mezza = String(t[1]).length * 10.5 * 0.52 / 2;
          var px = Math.min(Math.max(x(t[0]), mezza + 2), W - mezza - 2);
          pezzi.push('<text x="' + n(px) + '" y="' + n(H - B + 15) +
            '" text-anchor="middle" font-size="10.5" fill="var(--inchiostro-3)">' +
            esc(t[1]) + '</text>');
        });
        if (titolo) {
          /* la riga di base a tre unita' dal fondo lasciava fuori le code
             delle lettere che scendono: misurato sulle figure della lettura,
             «il valore grezzo, prima del taglio», «il carico persistente»,
             «tiri fatti» perdevano un'unita' in basso, e la coda della «g»
             restava mozzata. Cinque bastano, e le tacche stanno molto piu'
             in alto (H − B + 15): non si toccano. */
          pezzi.push('<text x="' + n(L + pw / 2) + '" y="' + n(H - 5) +
            '" text-anchor="middle" font-size="10.5" fill="var(--inchiostro-3)">' +
            esc(titolo) + '</text>');
        }
        return api;
      },

      /* IL NOME DELL'ASSE VERTICALE.
         L'asse orizzontale aveva gia' asseX(), con il suo titolo: quello
         verticale no, e in quasi tutte le figure del pacchetto le tacche a
         sinistra erano numeri nudi — «0 25 50 75 100» — senza dire di che
         cosa. Chi guarda un grafico isolato, o chi lo sente letto da un
         lettore di schermo insieme al solo aria-label, non aveva modo di
         sapere se quei numeri fossero un carico, una quota di riuscite o
         un conteggio di giocate. Il testo gira di novanta gradi e sta
         appena dentro il margine sinistro, cosi' non serve allargarlo. */
      asseY: function (titolo) {
        if (!titolo) { return api; }
        pezzi.push('<text transform="translate(12,' + n(T + ph / 2) + ') rotate(-90)" ' +
          'text-anchor="middle" font-size="10.5" fill="var(--inchiostro-3)">' +
          esc(titolo) + '</text>');
        return api;
      },

      /* una fascia orizzontale colorata: le zone di lettura (fasce di
         margine, soglie del carico) */
      banda: function (da, a, colore, opacita) {
        pezzi.push('<rect x="' + n(L) + '" y="' + n(y(a)) + '" width="' + n(pw) +
          '" height="' + n(Math.abs(y(da) - y(a))) + '" fill="' + colore +
          '" opacity="' + (opacita === undefined ? 0.1 : opacita) + '"/>');
        return api;
      },
      /* e la sua sorella verticale */
      bandaX: function (da, a, colore, opacita) {
        pezzi.push('<rect x="' + n(x(da)) + '" y="' + n(T) + '" width="' +
          n(Math.abs(x(a) - x(da))) + '" height="' + n(ph) + '" fill="' + colore +
          '" opacity="' + (opacita === undefined ? 0.1 : opacita) + '"/>');
        return api;
      },

      /* una linea di riferimento, con la sua etichetta in una pillola.
         L'INCHIOSTRO DELLA TARGHETTA NON E' SEMPRE IL BIANCO.
         Era fisso a «#fff», e su --attenzione — un giallo chiaro — dava un
         contrasto di 1,8 contro 1: le due soglie della settimana e della
         traiettoria («il recupero comincia a non bastare», «ripetizione
         pesante») erano scritte in bianco su giallo, cioe' non erano
         scritte. Chi chiama una soglia su un fondo chiaro passa il suo
         inchiostro; per i fondi scuri il bianco resta giusto ed e' ancora
         il valore di partenza. */
      soglia: function (v, testo, colore, opz) {
        opz = opz || {};
        var c = colore || 'var(--inchiostro-3)';
        pezzi.push('<line x1="' + n(L) + '" y1="' + n(y(v)) + '" x2="' + n(W - R) +
          '" y2="' + n(y(v)) + '" stroke="' + c + '" stroke-width="1.5" stroke-dasharray="5 4"/>');
        if (testo) {
          var larga = Math.max(46, String(testo).length * 6 + 14);
          var px = opz.sinistra ? L + 4 : W - R - larga;
          pezzi.push('<rect x="' + n(px) + '" y="' + n(y(v) - 19) + '" width="' + n(larga) +
            '" height="16" rx="8" fill="' + c + '"/>');
          pezzi.push('<text x="' + n(px + larga / 2) + '" y="' + n(y(v) - 7) +
            '" text-anchor="middle" font-size="10" font-weight="700" fill="' +
            (opz.inchiostro || '#fff') + '">' + esc(testo) + '</text>');
        }
        return api;
      },
      sogliaX: function (v, testo, colore) {
        var c = colore || 'var(--inchiostro)';
        pezzi.push('<line x1="' + n(x(v)) + '" y1="' + n(T) + '" x2="' + n(x(v)) +
          '" y2="' + n(T + ph) + '" stroke="' + c + '" stroke-width="2"/>');
        if (testo) {
          pezzi.push('<text x="' + n(x(v)) + '" y="' + n(T - 5) +
            '" text-anchor="middle" font-size="11" font-weight="700" fill="' + c + '">' +
            esc(testo) + '</text>');
        }
        return api;
      },

      /* LINEA E AREA
         I punti si danno come [[valoreX, valoreY], ...]. L'area sotto la
         linea si disegna prima, cosi' la linea resta sopra e netta. */
      area: function (punti, riempimento, base) {
        if (!punti.length) { return api; }
        var b = base === undefined ? dy[0] : base;
        var d = 'M ' + n(x(punti[0][0])) + ' ' + n(y(b));
        punti.forEach(function (p) { d += ' L ' + n(x(p[0])) + ' ' + n(y(p[1])); });
        d += ' L ' + n(x(punti[punti.length - 1][0])) + ' ' + n(y(b)) + ' Z';
        pezzi.push('<path d="' + d + '" fill="' + riempimento + '"/>');
        return api;
      },
      linea: function (punti, opz) {
        opz = opz || {};
        if (!punti.length) { return api; }
        var d = 'M ' + n(x(punti[0][0])) + ' ' + n(y(punti[0][1]));
        for (var i = 1; i < punti.length; i++) {
          d += (opz.gradini ? ' H ' + n(x(punti[i][0])) + ' V ' + n(y(punti[i][1]))
                            : ' L ' + n(x(punti[i][0])) + ' ' + n(y(punti[i][1])));
        }
        pezzi.push('<path d="' + d + '" fill="none" stroke="' + (opz.colore || 'var(--azione)') +
          '" stroke-width="' + (opz.spessore || 2.4) + '" stroke-linejoin="round" ' +
          'stroke-linecap="round"' +
          (opz.tratteggio ? ' stroke-dasharray="' + opz.tratteggio + '"' : '') +
          (opz.opacita ? ' opacity="' + opz.opacita + '"' : '') + '/>');
        return api;
      },
      punti: function (elenco, opz) {
        opz = opz || {};
        elenco.forEach(function (p) {
          pezzi.push('<circle cx="' + n(x(p[0])) + '" cy="' + n(y(p[1])) + '" r="' +
            (opz.raggio || 3.4) + '" fill="' + (opz.pieno || 'var(--superficie)') +
            '" stroke="' + (opz.colore || 'var(--azione)') + '" stroke-width="2">' +
            (p[2] ? '<title>' + esc(p[2]) + '</title>' : '') + '</circle>');
        });
        return api;
      },

      /* BARRE INCOLONNATE
         Ogni barra e' [valoreX, altezza, titolo]. La larghezza si calcola
         dal passo del dominio, non si passa a mano: cosi' un istogramma con
         nove fasce e uno con quaranta hanno lo stesso aspetto. */
      barre: function (elenco, opz) {
        opz = opz || {};
        var passo = elenco.length > 1
          ? Math.abs(x(elenco[1][0]) - x(elenco[0][0]))
          : pw / 3;
        var larga = Math.max(1, passo * (opz.pienezza === undefined ? 0.86 : opz.pienezza));
        var base = opz.base === undefined ? dy[0] : opz.base;
        elenco.forEach(function (b) {
          if (b[1] === base) { return; }
          var alto = Math.abs(y(b[1]) - y(base));
          pezzi.push('<rect x="' + n(x(b[0]) - larga / 2) + '" y="' +
            n(Math.min(y(b[1]), y(base))) + '" width="' + n(larga) + '" height="' + n(alto) +
            '" rx="' + (opz.raggio === undefined ? 2.5 : opz.raggio) + '" fill="' +
            (typeof opz.colore === 'function' ? opz.colore(b) : (opz.colore || 'var(--azione)')) +
            '" opacity="' + (opz.opacita === undefined ? 0.88 : opz.opacita) + '">' +
            (b[2] ? '<title>' + esc(b[2]) + '</title>' : '') + '</rect>');
        });
        return api;
      },

      testo: function (vx, vy, t, opz) {
        opz = opz || {};
        pezzi.push('<text x="' + n(x(vx) + (opz.dx || 0)) + '" y="' + n(y(vy) + (opz.dy || 0)) +
          '" text-anchor="' + (opz.ancora || 'middle') + '" font-size="' + (opz.dimensione || 11) +
          '"' + (opz.peso ? ' font-weight="' + opz.peso + '"' : '') +
          ' fill="' + (opz.colore || 'var(--inchiostro-2)') + '">' + esc(t) + '</text>');
        return api;
      },

      /* IL TITOLO ANCHE DENTRO L'SVG, NON SOLO NELL'ARIA-LABEL.
         L'aria-label bastava ai lettori di schermo, ma non a chi apre l'SVG
         da solo — salvato, incollato altrove, ispezionato — ne' agli
         strumenti che cercano un nome accessibile nell'elemento <title>
         invece che nell'attributo. <title> e' anche cio' che il browser
         mostra come descrizione al passaggio del mouse su un'area senza un
         suo titolo piu' specifico. Ripete lo stesso testo dell'aria-label:
         non e' un doppione a vuoto, e' lo stesso nome offerto in due punti
         che gli strumenti diversi guardano. */
      chiudi: function (descrizione) {
        var d = descrizione || 'figura';
        return '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" ' +
          'style="max-width:100%;height:auto" role="img" aria-label="' + esc(d) + '">' +
          '<title>' + esc(d) + '</title>' +
          (defs.length ? '<defs>' + defs.join('') + '</defs>' : '') +
          pezzi.join('') + '</svg>';
      }
    };
    return api;
  }

  /* LA LEGENDA
     Voci come { testo, colore, forma } dove forma e' 'quadrato' (difetto),
     'linea' o 'tratteggio'.

     IL SEGNO PRENDE IL COLORE DELLA COSA CHE SPIEGA.
     Il tratteggio non lo passava a nessuno: il foglio di stile lo disegnava
     sempre rosso. Nelle due figure del capitolo sulla formula la linea
     tratteggiata e' grigia — «dove finirebbe senza il taglio», «una curva
     continua» — e la legenda accanto la mostrava rossa. Una legenda che non
     ha il colore del disegno non e' una legenda: e' una seconda cosa da
     capire. */
  function legenda(voci) {
    return '<div class="legenda">' + voci.map(function (v) {
      var classe = v.forma === 'linea' ? ' linea' : (v.forma === 'tratteggio' ? ' tratteggio' : '');
      var stile = v.forma === 'tratteggio'
        ? (v.colore ? ' style="border-top-color:' + v.colore + '"' : '')
        : ' style="background:' + v.colore + (v.opacita ? ';opacity:' + v.opacita : '') + '"';
      return '<span class="voce-legenda"><i class="segno' + classe + '"' + stile + '></i>' +
        esc(v.testo) + '</span>';
    }).join('') + '</div>';
  }

  var API = { tela: tela, legenda: legenda, esc: esc, num: num };
  globale.Disegno = API;
  if (typeof module !== 'undefined' && module.exports) { module.exports = API; }
}(typeof window !== 'undefined' ? window : this));
