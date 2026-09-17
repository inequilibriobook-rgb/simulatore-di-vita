/* =============================================================================
   SIMULATORE 3.0 — Le regole dell'italiano che il simulatore scrive
   =============================================================================
   PERCHE' ESISTE QUESTO FILE

   Il simulatore non stampa numeri: stampa frasi. E una frase montata a pezzi,
   con un numero incollato a una parola, in italiano si rompe piu' spesso che
   in inglese. In inglese «1 items» e' brutto ma si capisce; in italiano
   «1 gesti» e' sbagliato, e chi legge lo vede subito.

   Il 10/09/2026 una revisione ha trovato DICIOTTO punti in cui il simulatore
   scriveva cose come «1 gesti», «1 tiri», «Mancano 1 risposte su 5», «La notte
   ha restituito 1 punti». Tutti nello stesso modo: numero + spazio + plurale.
   E li scriveva proprio nei momenti piu' delicati — al primo tiro, alla prima
   risposta, quando manca l'ultima cosa.

   La risposta poteva essere diciotto piccole toppe, una per punto. Sarebbe
   stato sbagliato: la diciannovesima frase scritta domani sarebbe nata rotta
   come le altre. Le regole dell'italiano stanno scritte QUI, in un posto solo,
   e chi monta una frase le chiede a questo file.

   Vale la stessa cosa per i numeri: in italiano il separatore dei decimali e'
   la virgola. «2.7 secondi» e' un numero inglese, e a schermo conviveva con
   «4,6 %» a due centimetri di distanza.
   ========================================================================== */

(function (globale) {
  'use strict';

  /* --------------------------------------------------------------------------
     IL GENERE, E COME SI INDOVINA SENZA UN DIZIONARIO
     --------------------------------------------------------------------------
     Per scrivere «una volta» e non «un volta» bisogna sapere se la parola e'
     maschile o femminile, e in italiano il genere non sta scritto da nessuna
     parte: sta nella testa di chi parla. Un dizionario qui dentro non ci puo'
     stare — il pacchetto si apre da un doppio clic e non scarica niente.

     Per fortuna non serve un dizionario, serve una regola, e in italiano la
     regola tiene quasi sempre: i nomi che finiscono in -a sono femminili.
     Le eccezioni vere sono poche, quasi tutte di origine greca, e stanno
     scritte qui sotto per nome. Quando la parola finisce in -e il genere non
     si puo' indovinare («la chiave» e «il fiore» finiscono uguale): in quel
     caso il genere si dichiara, ed e' l'ultimo argomento delle funzioni. */
  var MASCHILI_IN_A = ['problema', 'sistema', 'programma', 'schema', 'tema',
    'clima', 'dilemma', 'diagramma', 'panorama', 'poema', 'dramma'];

  function eFemminile(parola, genere) {
    if (genere === 'f' || genere === 'femminile') { return true; }
    if (genere === 'm' || genere === 'maschile') { return false; }
    var p = String(parola).toLowerCase();
    if (MASCHILI_IN_A.indexOf(p) >= 0) { return false; }
    return /a$/.test(p);
  }

  /* Le parole davanti a cui il maschile non dice «il» ma «lo», e il
     femminile non elide: s seguita da consonante («lo sbaglio»), z («lo
     zaino»), gn, pn, ps («lo psicologo»), x, y, e la «i» semiconsonantica,
     quella che davanti a un'altra vocale suona come una consonante — «lo
     iodio», «la iena», e non «l’iodio», «l’iena». */
  var GRUPPO_DIFFICILE = /^(?:s[bcdfglmnpqrtvz]|z|gn|pn|ps|x|y|i[aeiouàèéìòù])/i;
  var VOCALE = /^[aeiouàèéìòù]/i;

  /* Il segno meno della matematica (−), che non e' il trattino della
     tastiera (-). Il perche' sta piu' sotto, insieme ai numeri. */
  var MENO = '−';

  /* --------------------------------------------------------------------------
     IL PLURALE
     --------------------------------------------------------------------------
     Si usa cosi':
         Lingua.plurale(n, 'gesto', 'gesti')        ->  «1 gesto» / «3 gesti»
         Lingua.plurale(n, 'gesto', 'gesti', true)  ->  «un gesto» / «3 gesti»
         Lingua.plurale(n, 'volta', 'volte', true)  ->  «una volta» / «3 volte»
         Lingua.plurale(n, 'chiave', 'chiavi', 'una')  ->  «una chiave»

     Il quarto argomento serve perche' in italiano, quando il numero e' uno,
     spesso si scrive la parola e non la cifra: «Manca una risposta» si legge
     meglio di «Manca 1 risposta». Non sempre pero': in una tabella di conteggi
     la cifra e' quello che serve, e allineata. Percio' e' una scelta, non un
     automatismo.

     ⚠️ IL DIFETTO CHE C'ERA QUI, E CHE ERA GRAVE.
     Fino al 10/09/2026 quel quarto argomento scriveva sempre «un», qualunque
     fosse la parola. Cioe' la funzione nata per non far scrivere «1 gesti»
     scriveva «un volta», «un ora», «un risposta» — e proprio l'esempio del
     commento qui sopra, «Manca una risposta», sarebbe uscito sbagliato. Il
     motivo per cui non se ne era accorto nessuno e' che nessuno l'aveva
     ancora usato con una parola femminile: un difetto che aspettava.
     Adesso l'articolo lo sceglie l'italiano, non la funzione: se serve
     scriverlo a mano, si passa la parola voluta invece di `true`. */
  function plurale(n, uno, molti, aParole) {
    if (typeof n !== 'number' || !isFinite(n)) {
      throw new Error('Lingua.plurale: n deve essere un numero finito, non ' +
        JSON.stringify(n) + '.');
    }
    if (n !== 1) { return quanti(n) + ' ' + molti; }
    if (!aParole) { return '1 ' + uno; }
    if (typeof aParole === 'string') { return aParole + ' ' + uno; }
    return unaCosaSola(uno);
  }

  /* Il numero davanti al plurale si scrive come lo scrive l'italiano: le
     migliaia con il punto («1.200 gesti»), i decimali con la virgola
     («0,5 punti»), il meno con il segno meno e non con il trattino. */
  function quanti(n) {
    var x = Number(n);
    if (!isFinite(x)) { return String(n); }
    if (x === Math.round(x)) { return intero(x); }
    return String(x).replace('.', ',').replace(/^-/, MENO);
  }

  /* «un gesto», «uno sbaglio», «una volta», «un’ora», «uno iato».
     L'apostrofo va solo al femminile: «un albero» non lo vuole, «un’ora» si'.
     E' l'errore d'ortografia piu' comune dell'italiano scritto in fretta. */
  function unaCosaSola(parola, genere) {
    if (typeof parola !== 'string' || !parola) {
      throw new Error('Lingua.unaCosaSola: parola deve essere una stringa non vuota, non ' +
        JSON.stringify(parola) + '.');
    }
    var f = eFemminile(parola, genere);
    if (GRUPPO_DIFFICILE.test(parola)) { return (f ? 'una ' : 'uno ') + parola; }
    if (VOCALE.test(parola))           { return (f ? 'un’' : 'un ') + parola; }
    return (f ? 'una ' : 'un ') + parola;
  }

  /* La stessa cosa quando il numero NON va scritto: serve solo la parola
     giusta. «Il gesto che resta» contro «i 3 gesti che restano».
     Lo zero in italiano vuole il plurale — «0 gesti», non «0 gesto» — e
     anche i numeri con la virgola: «0,5 punti», mai «0,5 punto». */
  function concorda(n, uno, molti) { return n === 1 ? uno : molti; }

  /* --------------------------------------------------------------------------
     I NUMERI
     --------------------------------------------------------------------------
     In italiano i decimali si separano con la virgola. Il punto e' inglese, e
     in mezzo a una frase italiana si legge come un punto fermo.

     ATTENZIONE, e' il tranello di questo file: dentro il CSS e dentro l'SVG il
     punto ci vuole per forza — «width: 50,5%» non e' un errore di stile, e'
     una regola che il browser butta via. Percio' questa funzione si usa per i
     numeri che l'utente LEGGE, mai per i numeri che il browser DISEGNA.

     E LO STESSO VALE PER IL MENO.
     Il trattino della tastiera (-) e il segno meno della matematica (−) sono
     due caratteri diversi, e si vede: il trattino e' corto e sta in basso,
     il meno e' lungo quanto il piu' e sta all'altezza delle cifre. Il resto
     del simulatore scrive «−5 punti» con il segno giusto in quasi cento
     punti; questa funzione invece restituiva «-3,3», e i due segni finivano
     nella stessa riga a due centimetri di distanza.

     E QUANDO IL NUMERO NON C'E'.
     Un calcolo che non ha prodotto niente qui arrivava come «NaN», e «NaN»
     e' una parola che non vuol dire niente per chi legge. Al suo posto c'e'
     una lineetta, che in italiano si legge «non c'e' un numero». */
  function numero(x, decimali) {
    var d = (decimali === undefined) ? 1 : decimali;
    var n = Number(x);
    if (!isFinite(n)) { return '—'; }
    return n.toFixed(d).replace('.', ',').replace(/^-/, MENO);
  }

  /* Un intero non ha decimali, ma i numeri grandi vogliono il punto delle
     migliaia: «12.400 valutazioni», non «12400 valutazioni». */
  function intero(x) {
    var n = Number(x);
    if (!isFinite(n)) { return '—'; }
    return String(Math.round(n))
      .replace(/\B(?=(\d{3})+(?!\d))/g, '.')
      .replace(/^-/, MENO);
  }

  /* --------------------------------------------------------------------------
     GLI ELENCHI
     --------------------------------------------------------------------------
     Un elenco italiano non finisce con una virgola: finisce con «e».
     «il gesto, la catena, la settimana e la traiettoria» — non
     «il gesto, la catena, la settimana, la traiettoria», che resta sospeso
     come se mancasse ancora qualcosa.

     Un elenco di una voce sola e' quella voce e basta, senza virgole e senza
     «e»; un elenco di due voci non ha nessuna virgola, solo la congiunzione:
     «il gesto e la catena». Le voci vuote si buttano prima di contare, se no
     un buco in mezzo all'elenco esce come una virgola sospesa. */
  function elenco(voci, congiunzione) {
    var e = congiunzione || 'e';
    var v = (voci && voci.length)
      ? [].slice.call(voci).filter(function (x) {
          return x !== null && x !== undefined && String(x).trim() !== '';
        })
      : [];
    if (!v.length) { return ''; }
    if (v.length === 1) { return v[0]; }
    return v.slice(0, -1).join(', ') + ' ' + e + ' ' + v[v.length - 1];
  }

  /* --------------------------------------------------------------------------
     L'ARTICOLO E L'ELISIONE
     --------------------------------------------------------------------------
     Davanti a vocale l'articolo si elide, e l'apostrofo e' quello tipografico
     (’), non quello dritto: e' lo stesso segno che usa il libro stampato.
     Le eccezioni vere dell'italiano sono poche e note: davanti a s+consonante,
     z, gn, ps, x si dice «lo» e non «il».

     ⚠️ QUESTA FUNZIONE CONOSCEVA SOLO IL MASCHILE.
     Scriveva «lo scala», «lo spesa», «lo psicologia»: tre parole femminili
     con l'articolo di un'altra lingua. E non conosceva la «i» che suona come
     una consonante, quella di «iodio»: diceva «l’iodio» invece di «lo iodio».
     Adesso il genere lo indovina dalla parola, e quando la parola non basta
     — i nomi in -e sono maschili e femminili allo stesso modo — si dichiara
     con l'ultimo argomento: articolo('chiave', false, 'f') -> «la chiave».

     Il terzo argomento vale 'f' oppure 'm'. Il secondo serve a chi comincia
     una frase: articolo('ora', true) -> «L’ora». */
  function articolo(parola, maiuscolo, genere) {
    if (typeof parola !== 'string' || !parola) {
      throw new Error('Lingua.articolo: parola deve essere una stringa non vuota, non ' +
        JSON.stringify(parola) + '.');
    }
    var f = eFemminile(parola, genere), a;
    if (GRUPPO_DIFFICILE.test(parola)) { a = f ? 'la ' : 'lo '; }
    else if (VOCALE.test(parola))      { a = 'l’'; }
    else                                { a = f ? 'la ' : 'il '; }
    if (maiuscolo) { a = a.charAt(0).toUpperCase() + a.slice(1); }
    return a + parola;
  }

  /* L'articolo indeterminativo, quello che serve quando la cosa e' una sola
     e non si sa ancora quale: «un gesto», «uno sbaglio», «una volta»,
     «un’ora». E' la stessa funzione che usa plurale() con il quarto
     argomento, e sta qui perche' serve anche da sola. */
  function unArticolo(parola, genere) { return unaCosaSola(parola, genere); }

  var API = {
    plurale: plurale,
    concorda: concorda,
    numero: numero,
    intero: intero,
    elenco: elenco,
    articolo: articolo,
    unArticolo: unArticolo,
    eFemminile: eFemminile
  };

  globale.Lingua = API;
  if (typeof module !== 'undefined' && module.exports) { module.exports = API; }

})(typeof window !== 'undefined' ? window : globalThis);
