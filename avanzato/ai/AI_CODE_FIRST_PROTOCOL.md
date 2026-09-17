# Simulatore 3.2 / STEP 8C — Protocollo CODE-FIRST per Gemini, ChatGPT, Claude, DeepSeek, Kimi e altre AI

## Regola madre
L'intelligenza artificiale NON è il motore matematico. Il motore matematico è il codice Python.

L'AI deve fare solo quattro cose:
1. leggere la descrizione dell'utente;
2. proporre una taratura/questionario proporzionato;
3. compilare JSON di input coerenti con il simulatore;
4. leggere e spiegare l'output prodotto dal codice.

L'AI NON deve:
- inventare formule;
- modificare Pn;
- riscrivere il core;
- cambiare pesi, soglie, clamp, margini o dadi;
- applicare profili direttamente ai nodi se il codice non lo prevede;
- trasformare metadata descrittivi in effetti matematici.

## Formula canonica
`Pn = clamp[5,95](P0 + E + I + T + M + BP - 5C - piSTR(STR) - 5DEB)`

Questa formula appartiene al core Python. L'AI può spiegarla, ma non calcolarla in modo autonomo quando il codice è disponibile.

## Ruoli

### Core Python
Calcola nodo, Pn, dado, margini, esito, costo, stato successivo.

### Runner Python
Gestisce blocchi, checkpoint, LIGHT, FULL, manifest, metadata, verify, doctor, repair, resume.

### Supervisore
Esegue il runner a tick brevi per evitare timeout. Regola prudente: 1 tick = 1 blocco da 5.000 nodi.

### AI
Interpreta linguaggio naturale, prepara questionario e JSON, legge report, segnala incertezza.

## Granularità nodi
L'AI deve evitare due errori:
- troppi nodi per azioni brevissime, producendo nodi vuoti distinti solo dal dado;
- troppo pochi nodi per scene lunghe, complesse, ripetute o multi-persona.

Esempi:
- "mi alzo e accendo la TV" → 1-5 nodi;
- "bagno, denti, bisogni, doccia" → 5-60 nodi;
- "giornata lavorativa stressante" → decine/centinaia di nodi o cluster;
- "settimana complessa" → centinaia/migliaia, con clustering;
- milioni di nodi solo se esiste una reale granularità temporale/semantica o analisi Monte Carlo/sensibilità.

## Questionario dinamico
Il questionario deve cambiare in base a:
- durata della scena;
- numero di persone;
- rischio fisico/relazionale;
- complessità tecnica;
- presenza di corpo, dolore, sonno, stress, tempo, supporto, delega;
- quantità di nodi richiesta;
- obiettivo: nodo, scena, catena, giornata, settimana, traiettoria.

## Principio di non invenzione
Se manca un dato essenziale, l'AI deve:
- chiedere una domanda mirata; oppure
- dichiarare un'ipotesi prudente; oppure
- usare un intervallo/incertezza.

Non deve mascherare una stima come dato oggettivo.


## M21 — Non-Invention Guard

Ogni IA esterna deve produrre richieste JSON validabili. Prima dell'esecuzione, `ai_request_validator.py` controlla che la richiesta non contenga formule alternative, variabili nuove, indici inventati, override matematici, shell libera o granularità incompatibile con la scena dichiarata. Se manca un dato, l'IA deve chiedere una domanda mirata o dichiarare incertezza; non deve trasformare stime in effetti matematici diretti.
