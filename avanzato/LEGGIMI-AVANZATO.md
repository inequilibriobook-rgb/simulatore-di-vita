# Cartella avanzata — core Python e runner

A pagina 5 il libro dice: *«Il libro accompagnerà un simulatore scaricabile, con
una guida, un core Python, un runner e alcuni esempi.»* Questa cartella è quella
promessa.

**Non serve aprirla per usare il simulatore.** Il libro stesso lo dice del primo
livello di lettore: *«Non deve installare sistemi complicati. Non serve conoscere
Python, JSON, runner o archivi.»* Per quello basta fare doppio clic su
`APRI-QUI.html`, nella cartella principale.

Questa cartella serve a chi vuole andare oltre: leggere il codice, modificarlo,
lanciare sequenze lunghe con archivio e checkpoint.

## Che cosa c'è

    core-python/simulatore_v31_core_finale.py
        Il motore. Formula canonica, dado, margini, nove esiti, stato dopo il nodo.
        Nessuna dipendenza esterna: solo la libreria standard.

    runner/runner.py
        Esecuzione a blocchi con archivio, checkpoint, receipt, doctor, verify,
        repair, resume. Serve per le sequenze molto lunghe.
    runner/local_long_run_executor.py
        Orchestratore: esegue il runner a tick brevi.
    runner/run_longrun_with_archive_audit.py
        Esecuzione più audit dell'archivio in un solo comando.
    runner/archive_completeness_statistical_audit.py
        Controllo di completezza sull'archivio prodotto.

    ai/ai_request_validator.py
        Il controllo che precede l'esecuzione di una richiesta preparata da un'AI.
    ai/ai_bridge_controlled_executor.py
        Il ponte con conferma umana.
    ai/AI_CODE_FIRST_PROTOCOL.md
        La regola madre: l'intelligenza artificiale non è il motore matematico.

    esempi/verifica_parita.py
        Genera il file di riferimento con cui si verifica che la versione nel
        browser dia gli stessi identici numeri di quella Python.

## Come si parte

Serve Python 3.8 o più recente. Da terminale, dentro questa cartella:

    python3 core-python/simulatore_v31_core_finale.py

Il core espone una facciata (`SimulatorAppCore`) e funzioni dirette
(`calculate_pn`, `run_node`, `run_scene`). Ogni funzione accetta un generatore
casuale esplicito: passandogli lo stesso seme si riottengono gli stessi risultati.

## Un avvertimento sulle run lunghe

Il runner permette sequenze molto grandi. Il libro, al Capitolo 23, mette in
guardia: *«Milioni di nodi possono sembrare affascinanti, ma quantità non
significa qualità. Se i nodi sono vuoti, ripetitivi o semanticamente poveri, il
risultato cresce solo in volume.»*

Prima di lanciare una run lunga vale la pena leggere il Capitolo 27 del Canone,
sui due assi: quanti nodi *distinti* ha davvero la scena, e quante volte la si
sta rigiocando. Sono due cose diverse e non vanno sommate.

## Sicurezza

Il ponte AI (`ai_bridge_controlled_executor.py`) esegue comandi sulla macchina
dopo conferma. Va usato solo su richieste che hai letto. Non lasciarlo in
ascolto e non passargli percorsi che non conosci.
