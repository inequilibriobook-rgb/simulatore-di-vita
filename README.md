# Simulatore di vita 3.0 — il sito

Questo repository è **il sito pubblicato** del simulatore che accompagna il libro
*Simulatore di vita*: le dodici pagine, l'app installabile (manifesto, icone, cache
per l'uso senza rete) e il pacchetto da scaricare (`scarica/SIMULATORE-3.0.zip`).

- Indirizzo: https://inequilibriobook-rgb.github.io/simulatore-di-vita/
- Ingresso: `index.html` manda subito ad `APRI-QUI.html`.
- Come si installa e come si usa: lo dice la pagina di apertura, e l'Apparato I del libro.

**Non si modifica a mano.** I sorgenti (con le suite di prova) stanno nella cartella di
sviluppo `SIMULATORE-3.0-SVILUPPO/`, che non è su GitHub; questa cartella viene
rigenerata da `scripts/prepara_sito.py` e poi pubblicata con un commit.

Un repository per ogni prodotto: `simulatore-di-vita` è questo; i prossimi libri e
simulatori avranno ciascuno il proprio, con lo stesso schema (nome del prodotto, sito
nella radice, `scarica/` per il pacchetto).
