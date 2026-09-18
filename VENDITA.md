# Distribuzione e vendita — il piano (18/09/2026)

Igor: «predisponi anche per uno scaricamento a pagamento; portiamoci avanti,
in prospettiva futura, in grande». Questo è ciò che è già pronto e ciò che
resta da decidere. Niente di quanto sotto è attivo finché non lo si accende.

## Che cosa c'è già
- **La vetrina** (`index.html`): benvenuto a schermo intero, poi «Che cosa fa»,
  «Come funziona», «Il libro», «Come si ottiene», piede con licenza e contatto.
  Metadati per i social e per i motori (descrizione, immagine).
- **Un posto solo per il canale** (`app/dati/vetrina.js`): tre modalità —
  `libro` (oggi: si scrive all'autore con la ricevuta), `vendita` (tasto
  «Acquista» verso una pagina di pagamento), `aperto` (si entra e basta) — più
  l'indirizzo del libro su Amazon e il prezzo. Cambiare canale = cambiare quel
  file e rigenerare il sito.
- **I termini d'uso** (`LICENZA.txt` nel pacchetto): uso personale, niente
  ridistribuzione, niente uso medico, privacy. Da far leggere a chi di dovere
  prima di vendere.
- **Il pacchetto scaricabile** (`scarica/SIMULATORE-3.0.zip`), rigenerato a ogni
  pubblicazione, con il manifesto delle impronte (SHA-256) dentro.
- **L'app installabile** (manifest + service worker): funziona senza rete,
  si aggiorna da sola con la striscia «Aggiorna adesso».

## Come vendere il pacchetto (quando si vorrà)
La strada più semplice, senza server e senza codice: un negozio digitale che
consegna un file dopo il pagamento e gestisce IVA e fatture.
1. Aprire un conto su **Payhip** o **Gumroad** (entrambi gestiscono l'IVA
   europea sul digitale; Payhip ha commissioni più basse sul piano gratuito).
2. Caricare `scarica/SIMULATORE-3.0.zip` come prodotto; nel testo del
   prodotto scrivere l'indirizzo del simulatore online.
3. In `app/dati/vetrina.js`: `modalita: 'vendita'`, `acquisto.url` = la pagina
   del prodotto, `acquisto.prezzo` = «9,90 €» (o quello che si decide).
4. `python3 scripts/prepara_sito.py`, commit, push. La vetrina mostra
   «Acquista»; il resto non cambia.
5. Aggiornare il libro (Apparato I, «Come si ottiene») con la nuova strada e
   ricostruire PDF/ePub.
Ogni nuova versione: ricaricare lo zip nel negozio (i clienti la ricevono).

## Il limite da sapere
GitHub Pages è un sito pubblico: **l'indirizzo del simulatore online non si
può proteggere con una password**. Chi lo conosce entra. Oggi la protezione
è l'indirizzo non pubblicizzato più i termini d'uso. Tre livelli possibili:
- **Lasciare così** (consigliato per un libro): il valore è nel libro, il
  simulatore lo accompagna; chi paga riceve anche il pacchetto sul disco.
- **Chiave nel collegamento**: ogni acquirente riceve un indirizzo con la sua
  chiave (`?chiave=…`) che il simulatore controlla contro un elenco di
  impronte. Deterrente, non sicurezza: la chiave si può passare ad altri.
- **Accesso vero** (utente e password): serve un servizio con un server
  (Cloudflare Access, Netlify Identity, un piccolo backend). Costo e
  manutenzione; da valutare solo se le vendite lo giustificano.

## Il dominio proprio
1. Comprare il dominio (per esempio `simulatoredivita.it`, ~10 €/anno, da un
   registrar italiano: Register.it, Aruba, o Cloudflare Registrar per i .com).
2. Nel DNS del dominio: un record `CNAME` da `www` a
   `inequilibriobook-rgb.github.io`, e per il dominio nudo i quattro record A
   di GitHub Pages (185.199.108.153 / .109 / .110 / .111).
3. Nel repository: file `CNAME` con il dominio (una riga); su GitHub →
   Settings → Pages → Custom domain, e spuntare «Enforce HTTPS».
4. Aggiornare `vetrina.js` (`indirizzo`), il libro (Apparato I e il codice QR:
   `LIBRO/CANONE/immagini/qr-simulatore.png` va rigenerato) e l'ePub/PDF.
`prepara_sito.py` non tocca il file `CNAME`.

## Da decidere, prima di vendere
- Regime fiscale della vendita digitale (occasionale o con partita IVA):
  chiederlo a un commercialista; i negozi digitali emettono loro la fattura
  al cliente ma i ricavi vanno dichiarati.
- Prezzo, e se il pacchetto è incluso nel prezzo del libro o venduto a parte.
- Se pubblicare anche la pagina del libro su Amazon (`libro.url`).
