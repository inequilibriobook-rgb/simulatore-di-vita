/* =============================================================================
   SIMULATORE 3.0 — La vetrina: come si presenta e come si ottiene (18/09/2026)
   =============================================================================
   Igor: «predisponi anche per uno scaricamento a pagamento; portiamoci avanti,
   facciamo le cose in prospettiva futura». Tutto quello che la pagina di
   benvenuto (index.html) dice su COME SI OTTIENE il simulatore sta qui, in un
   posto solo, cosi' cambiare canale di vendita non richiede di toccare la
   pagina. Tre modalita':

     'libro'    — chi ha il libro scrive all'autore con la ricevuta e riceve
                  l'indirizzo. Era quella fino al 26/11/2026.
     'vendita'  — acquisto diretto: un tasto «Acquista» porta alla pagina di
                  pagamento (Gumroad, Payhip, Stripe: l'indirizzo va in
                  `acquisto.url`), che consegna il pacchetto e l'indirizzo.
     'aperto'   — nessun vincolo: si entra e basta. QUELLA DI OGGI.

   PERCHE' 'aperto' (26/11/2026, Igor: «fai come credi migliore»). La
   modalita' 'libro' era una barriera di carta: il libro stampa l'indirizzo e
   il QR, e la pagina di benvenuto ha il tasto «Entra» per tutti. Una
   password vera su GitHub Pages non si puo' mettere, e una scritta nella
   pagina si legge nel codice, che e' pubblico. Meglio dire la verita': e'
   libero.

   Il libro (Apparato I, e la nota in testa) descrive la modalita' 'aperto'.
   Se si cambia modalita' va aggiornato anche il libro: _test/libro.js
   controlla che le due cose dicano lo stesso.
   ========================================================================== */
(function (globale) {
  'use strict';
  globale.Vetrina = {
    modalita: 'aperto',
    autore: 'Igor De Guglielmo',
    contatto: 'inequilibriobook@gmail.com',
    libro: {
      titolo: 'Simulatore di vita 3.0 — Il prezzo nascosto di ogni cosa',
      /* l'indirizzo della pagina del libro (Amazon KDP), quando ci sara' */
      url: ''
    },
    acquisto: {
      /* l'indirizzo della pagina di pagamento, quando ci sara'; e il prezzo
         scritto come lo si vuole vedere sul tasto («9,90 €») */
      url: '',
      prezzo: ''
    },
    /* l'indirizzo pubblico del simulatore, quello stampato nel libro e nel
       QR. Dal 26/11/2026 e' il dominio di Igor (un CNAME su Aruba verso
       GitHub Pages): se un giorno il sito cambia casa, si sposta il CNAME e
       i libri stampati continuano a funzionare. Il vecchio indirizzo
       inequilibriobook-rgb.github.io/simulatore-di-vita rimanda qui da solo. */
    indirizzo: 'simulatore.igordeguglielmo.it'
  };
}(typeof window !== 'undefined' ? window : this));
