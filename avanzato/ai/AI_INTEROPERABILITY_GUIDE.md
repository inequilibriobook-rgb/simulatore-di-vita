# AI Interoperability Guide — Simulatore 3.2 M18

Questo pacchetto serve per far collaborare Gemini, ChatGPT, Claude, DeepSeek, Kimi o altre IA con il Simulatore in modalità **CODE-FIRST**.

## Principio operativo

Il codice Python è la fonte primaria. L’IA non è il motore matematico: legge lo scenario, propone domande, prepara JSON e interpreta gli output.

L’IA non deve inventare formule, variabili, indici, pesi, soglie, clamp, dadi o logiche nuove.

## File principali

- `simulatore_v31_core_finale.py`: core matematico.
- `simulatore_v31_time04_4_40_STEP8C_CODE_FIRST_runner.py`: runner, blocchi, checkpoint, LIGHT/FULL, doctor, repair, verify.
- `local_long_run_executor.py`: esecutore locale per run lunghe.
- `ai_bridge_controlled_executor.py`: bridge controllato fra IA e codice.
- `AI_CODE_FIRST_PROTOCOL.md`: regole del ruolo dell’IA.
- `AI_BRIDGE_REQUEST_CONTRACT.md`: formato JSON delle richieste IA → bridge.

## M18 — uso locale per run lunghe

Per 500.000 o 1.000.000 nodi non bisogna dipendere dalla chat. Si usa `local_long_run_executor.py` sul computer locale.

Regola: **1 tick = 1 blocco = massimo 5.000 nodi**.

Comando 500k:

```bash
python3 local_long_run_executor.py --run-id local_500k_stable --nodes 500000 --block-size 5000 --max-ticks 100 --execution-profile stable --verify-every 10 --budget-seconds 86400 --tick-timeout-seconds 600 --child-timeout-seconds 600 --verify-timeout-seconds 1200
```

Comando 1M:

```bash
python3 local_long_run_executor.py --run-id local_1m_stable --nodes 1000000 --block-size 5000 --max-ticks 200 --execution-profile stable --verify-every 10 --budget-seconds 172800 --tick-timeout-seconds 600 --child-timeout-seconds 600 --verify-timeout-seconds 1800
```

Se il processo viene interrotto, rilancia lo stesso comando: riparte dal checkpoint sicuro.

## Ruolo delle IA

L’IA deve:

1. leggere la descrizione dell’utente;
2. fare domande di taratura;
3. preparare metadata/JSON;
4. chiedere autorizzazione;
5. leggere output, doctor, verify e report;
6. spiegare il risultato senza modificare il simulatore.

L’IA non deve:

- modificare Python;
- inventare formule;
- lanciare shell libera;
- superare 5.000 nodi per tick;
- trasformare metadata descrittivi in effetti matematici.

---

# M19 — Archive audit statistico

Il pacchetto include `archive_completeness_statistical_audit.py`, strumento read-only per verificare che LIGHT e FULL contengano davvero i dati completi della run.

L'azione bridge corrispondente è:

```json
{
  "action": "archive_audit",
  "run_id": "nome_run_esistente",
  "audit_mode": "sample"
}
```

Modalità:

- `quick`: controllo strutturale rapido;
- `sample`: controllo consigliato per uso ordinario;
- `all`: controllo completo, più lento, consigliato sul Mac per report finale 500k/1M.

L'audit non modifica core, runner, checkpoint, index, LIGHT o FULL.

## Prompt multi-IA integrato

Leggi attentamente questi file. Il simulatore è CODE-FIRST: il codice Python è la fonte primaria.

Tu puoi essere Gemini, ChatGPT, Claude, DeepSeek, Kimi o un'altra IA, ma il tuo ruolo resta lo stesso: supportare il simulatore, non sostituirlo.

Non inventare formule. Non inventare variabili. Non inventare indici. Non modificare Python. Non trasformare metadata descrittivi in effetti matematici.

Prima spiega cosa hai capito di core, runner, local executor, archive audit e bridge. Poi prepara solo richieste JSON whitelisted per `ai_bridge_controlled_executor.py`. Non eseguire nulla: l'esecuzione reale passa dal bridge locale e dall'autorizzazione dell'utente.


## M20 — Pipeline finale lunga + audit archivistico-statistico

Dal Miglioramento 20 esiste anche `run_longrun_with_archive_audit.py`. Questo script non cambia core, runner o formula: coordina `local_long_run_executor.py` e, quando la run è completa o verificata secondo la policy scelta, lancia `archive_completeness_statistical_audit.py`.

Uso locale 500k:

```bash
python run_longrun_with_archive_audit.py \
  --run-id local_500k_final \
  --nodes 500000 \
  --block-size 5000 \
  --max-ticks 100 \
  --execution-profile stable \
  --verify-every 10 \
  --audit-mode all \
  --audit-after complete
```

Regola: l'IA può preparare la request JSON per `run_final_pipeline`, ma l'esecuzione passa sempre dal bridge/utente. Nessuna IA deve modificare formula, core, runner o pesi.


---

# M21 — Validatore richieste AI / Non-Invention Guard

Prima che una richiesta preparata da una IA arrivi al Bridge, il pacchetto M21 può validarla con `ai_request_validator.py`.

Il validatore blocca:

- `run_id` vuoti o non sicuri;
- azioni non whitelisted;
- formule alternative o campi come `formula`, `math_override`, `new_variables`, `new_indices`;
- tick oltre 5.000 nodi;
- metadata che pretendono effetti matematici diretti;
- granularità assurde dichiarate dalla IA, per esempio 50.000 nodi per una micro-azione semplice.

Comando diretto:

```bash
python ai_request_validator.py --request request.json --json-only
```

Tramite bridge:

```json
{
  "action": "validate_ai_request",
  "run_id": "validazione_prova",
  "target_request": {
    "action": "run_tick",
    "run_id": "test_micro_5",
    "nodes": 5,
    "block_size": 5,
    "granularity": {
      "scenario_class": "micro_simple",
      "recommended_nodes": 5
    }
  }
}
```

La validazione M21 è obbligatoria nel bridge M21 prima dell'esecuzione di azioni diverse da `validate_ai_request`.

---

# Contratto richiesta AI → Bridge accorpato

# Contratto richiesta AI → Bridge — M16

La IA deve produrre solo JSON conformi a questo contratto. Non deve chiedere shell libera.

## Azioni consentite

```json
"doctor|repair|verify|run_tick|run_local_longrun|pack_run"
```

## Campi comuni

```json
{
  "action": "run_tick",
  "run_id": "nome_sicuro_senza_spazi",
  "nodes": 5000,
  "block_size": 5000,
  "archive_mode": "both",
  "full_json_check": "sample",
  "resume": true,
  "timeout_seconds": 120,
  "profile": "metadata/profile.json",
  "scenario_blueprint": "metadata/scenario_blueprint.json",
  "initial_calibration": "metadata/initial_calibration.json",
  "questionnaire": null,
  "notes": null
}
```

## Run breve: `run_tick`

- massimo 5.000 nodi;
- una sola finestra sicura;
- utile per test, prove, resume controllati.

## Run lunga locale: `run_local_longrun`

```json
{
  "action": "run_local_longrun",
  "run_id": "run_500k_locale",
  "nodes": 500000,
  "max_allowed_nodes": 500000,
  "block_size": 5000,
  "max_ticks": 100,
  "max_allowed_ticks_per_invocation": 100,
  "profile_mode": "stable",
  "timeout_seconds": 240,
  "verify_every": 10,
  "doctor_every_tick": false
}
```

## Regole

- `run_id` obbligatorio, non vuoto, solo lettere, numeri, `_`, `-`, `.`.
- Nessun comando shell libero.
- Nessuna modifica a core, formula, pesi, clamp, dado o margini.
- Ogni tick massimo 5.000 nodi.
- Per run lunghe usare `run_local_longrun`, non loop manuali improvvisati.
- Dopo problemi: `doctor`, poi `repair`, poi di nuovo `doctor`.
- Non dichiarare conclusa una run senza `verify`.

## Azione M19: archive_audit

Per chiedere un audit archivistico/statistico di una run già esistente:

```json
{
  "action": "archive_audit",
  "run_id": "nome_run_esistente",
  "audit_mode": "sample",
  "timeout_seconds": 240
}
```

Regole:

- `run_id` deve indicare una run già presente nel workspace del bridge.
- `audit_mode` può essere `quick`, `sample` o `all`.
- `all` è più lento e va usato per certificazione finale locale.
- L'audit è read-only: non modifica archivi né matematica.


## Azione M20: `run_final_pipeline`

```json
{
  "action": "run_final_pipeline",
  "run_id": "local_500k_final",
  "nodes": 500000,
  "max_allowed_nodes": 500000,
  "block_size": 5000,
  "max_ticks": 100,
  "execution_profile": "stable",
  "verify_every": 10,
  "audit_mode": "all",
  "audit_after": "complete",
  "timeout_seconds": 180
}
```

Regole: run_id obbligatorio; block_size massimo 5.000; audit_after=complete lancia M19 solo se la run arriva al target; speed resta solo esplorativo.

## M22 — preservazione output completi

Dal Miglioramento 22 il bridge non conserva più soltanto la coda di `stdout` e `stderr` nel JSON principale.
Per ogni esecuzione autorizzata crea anche una cartella:

```text
runs_bridge/_bridge_artifacts/<run_id>/<timestamp>_<action>/
```

Dentro vengono salvati:

- `command.txt` — comando whitelisted in forma leggibile;
- `command.json` — comando, cwd e timeout;
- `stdout.full.txt` — stdout completo;
- `stderr.full.txt` — stderr completo;
- `bridge_report.full.json` — report completo del bridge.

Nel JSON restituito all'IA restano solo `stdout_tail` e `stderr_tail`, così le risposte non diventano enormi, ma nessun dettaglio operativo viene perso.
