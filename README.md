# Simulatore di vita 3.0 — il sito

Questo repository è il **sito pubblicato** del simulatore che accompagna il libro
*Simulatore di vita 3.0 — Il prezzo nascosto di ogni cosa* (Igor De Guglielmo).
Indirizzo: **https://simulatore.igordeguglielmo.it/** (dal 26/11/2026: un CNAME
su Aruba, `simulatore` → `inequilibriobook-rgb.github.io`, e il file `CNAME` qui;
il vecchio indirizzo `inequilibriobook-rgb.github.io/simulatore-di-vita/` rimanda
al nuovo da solo). Il file `CNAME` non si tocca: senza, il dominio si stacca.

- Non si modifica a mano: lo genera `scripts/prepara_sito.py` dalla cartella di
  sviluppo (`SIMULATORE-3.0-SVILUPPO`), che ricostruisce il pacchetto, la cache
  (`sw.js`) e lo zip in `scarica/`.
- `index.html` è la pagina di benvenuto e la vetrina; `APRI-QUI.html` la porta del
  simulatore; `LEGGIMI.txt` spiega il pacchetto; `LICENZA.txt` i termini d'uso.
- `VENDITA.md` (solo qui, non nel pacchetto) è il piano per la distribuzione a
  pagamento e per il dominio proprio.

Regola dell'account: **un repository per prodotto**. Altri libri e altri
simulatori avranno ciascuno il proprio repository, con lo stesso schema.
