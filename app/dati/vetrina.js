/* =============================================================================
   SIMULATORE 3.0 — La vetrina: come si presenta e come si ottiene (18/09/2026)
   =============================================================================
   Igor: «predisponi anche per uno scaricamento a pagamento; portiamoci avanti,
   facciamo le cose in prospettiva futura». Tutto quello che la pagina di
   benvenuto (index.html) dice su COME SI OTTIENE il simulatore sta qui, in un
   posto solo, cosi' cambiare canale di vendita non richiede di toccare la
   pagina. Tre modalita':

     'libro'    — quella di oggi: il simulatore accompagna il libro; chi ha il
                  libro scrive all'autore con la ricevuta e riceve l'indirizzo.
     'vendita'  — acquisto diretto: un tasto «Acquista» porta alla pagina di
                  pagamento (Gumroad, Payhip, Stripe: l'indirizzo va in
                  `acquisto.url`), che consegna il pacchetto e l'indirizzo.
     'aperto'   — nessun vincolo: si entra e basta.

   Il libro (Apparato I) descrive la modalita' 'libro'. Se si cambia
   modalita' va aggiornato anche il libro: _test/libro.js lo ricorda.
   ========================================================================== */
(function (globale) {
  'use strict';
  globale.Vetrina = {
    modalita: 'libro',
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
    /* l'indirizzo pubblico del simulatore, quello stampato nel libro */
    indirizzo: 'inequilibriobook-rgb.github.io/simulatore-di-vita'
  };
}(typeof window !== 'undefined' ? window : this));
