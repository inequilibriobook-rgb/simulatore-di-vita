#!/usr/bin/env python3
"""
SIMULATORE 3.2 — M21 AI REQUEST VALIDATOR / NON-INVENTION GUARD
===============================================================

Modulo read-only e code-first. Non modifica core, runner, formula o archivi.
Controlla richieste JSON preparate da IA esterne prima che arrivino al Bridge.

Obiettivi:
- bloccare formule inventate o variabili nuove dichiarate come operative;
- bloccare azioni non whitelisted e run_id ambigui;
- impedire nodi/tick oltre i limiti di sicurezza;
- segnalare granularità incoerente quando la richiesta fornisce scenario/granularity hints;
- ricordare che metadata descrittivi non producono effetti matematici.

Uso:
  python ai_request_validator.py --request request.json --json-only
  python ai_request_validator.py --make-examples
"""
from __future__ import annotations

import argparse
import json
import math
import re
import sys
from pathlib import Path
from typing import Any, Dict, Iterable, List, Tuple

VALIDATOR_VERSION = "M21_AI_REQUEST_VALIDATOR_0_1_NON_INVENTION_GUARD"
SAFE_ID_RE = re.compile(r"^[A-Za-z0-9_.-]{1,80}$")
CANONICAL_FORMULA = "Pn = clamp[5,95](P0 + E + I + T + M + BP - 5C - piSTR(STR) - 5DEB)"
MAX_NODES_PER_TICK = 5000
ALLOWED_ACTIONS = {
    "doctor", "repair", "verify", "run_tick", "run_supervisor_tick", "run_local_longrun",
    "archive_audit", "run_final_pipeline", "pack_run", "validate_ai_request",
}
ALLOWED_ARCHIVE_MODE = {"light", "full", "both"}
ALLOWED_FULL_CHECK = {"all", "sample", "none"}
ALLOWED_AUDIT_MODE = {"quick", "sample", "all"}
ALLOWED_PROFILES = {"stable", "efficient", "speed", "forensic"}
METADATA_ONLY_FIELDS = {"profile", "semantic_trace", "scenario_blueprint", "initial_calibration", "questionnaire", "notes"}

# Campi che indicano tentativo di cambiare matematica o creare dominio parallelo.
FORBIDDEN_TOP_LEVEL_KEYS = {
    "formula", "formula_override", "canonical_formula_override", "new_formula", "math_override",
    "math_overrides", "weights", "weight_overrides", "clamp", "clamp_override", "dice_override",
    "margin_override", "pn_formula", "p_formula", "core_patch", "runner_patch", "python_patch",
    "new_variables", "custom_variables", "new_indices", "custom_indices", "invented_variables",
    "node_math", "apply_metadata_to_math", "metadata_math_effects", "direct_node_effects",
}
FORBIDDEN_SUBSTRINGS = [
    "modifica la formula", "cambia la formula", "nuova formula", "formula alternativa",
    "nuova variabile", "nuove variabili", "nuovo indice", "nuovi indici",
    "riscrivi il core", "modifica il core", "patcha il core", "cambia i pesi", "modifica i pesi",
    "cambia clamp", "modifica clamp", "shell libera", "rm -rf", "sudo ", "delete all",
]

GRANULARITY_LIMITS = {
    "micro_simple": (1, 5),
    "routine_composite": (5, 60),
    "day_complex": (20, 1000),
    "week_or_longer": (100, 5000000),
    "monte_carlo_or_sensitivity": (1000, 100000000),
}


def load_json(path: Path) -> Dict[str, Any]:
    with path.open("r", encoding="utf-8") as f:
        data = json.load(f)
    if not isinstance(data, dict):
        raise ValueError("La richiesta deve essere un oggetto JSON.")
    return data


def safe_int(value: Any, default: int = 0) -> int:
    try:
        if value is None:
            return default
        n = int(value)
        return n
    except Exception:
        return default


def flatten_strings(value: Any, limit: int = 20000) -> str:
    out: List[str] = []
    def walk(v: Any) -> None:
        if sum(len(x) for x in out) > limit:
            return
        if isinstance(v, str):
            out.append(v)
        elif isinstance(v, dict):
            for k, val in v.items():
                out.append(str(k))
                walk(val)
        elif isinstance(v, (list, tuple)):
            for item in v:
                walk(item)
    walk(value)
    return "\n".join(out).lower()


def add_issue(issues: List[Dict[str, Any]], level: str, code: str, field: str, message: str, suggestion: str = "") -> None:
    issues.append({"level": level, "code": code, "field": field, "message": message, "suggestion": suggestion})


def validate_request(req: Dict[str, Any], *, mode: str = "strict") -> Dict[str, Any]:
    issues: List[Dict[str, Any]] = []
    warnings: List[Dict[str, Any]] = []
    mode = (mode or "strict").lower().strip()
    if mode not in {"strict", "normal", "lenient"}:
        mode = "strict"

    action = str(req.get("action", "")).strip()
    if not action:
        add_issue(issues, "error", "missing_action", "action", "Campo action obbligatorio.", "Usare una delle azioni whitelisted.")
    elif action not in ALLOWED_ACTIONS:
        add_issue(issues, "error", "action_not_allowed", "action", f"Azione non consentita: {action!r}.", f"Azioni consentite: {sorted(ALLOWED_ACTIONS)}")

    run_id = req.get("run_id")
    if run_id is None or str(run_id).strip() == "":
        add_issue(issues, "error", "missing_run_id", "run_id", "run_id obbligatorio e non vuoto.", "Usare lettere, numeri, punto, trattino o underscore.")
    elif not SAFE_ID_RE.match(str(run_id).strip()):
        add_issue(issues, "error", "unsafe_run_id", "run_id", f"run_id non sicuro: {run_id!r}.", "Niente spazi, slash, path traversal o caratteri shell.")

    # Blocco non-invenzione: campi pericolosi o intenti matematici paralleli.
    for key in sorted(FORBIDDEN_TOP_LEVEL_KEYS):
        if key in req:
            add_issue(issues, "error", "forbidden_math_or_patch_field", key, f"Campo vietato in modalità CODE-FIRST: {key}.", "La matematica appartiene al core Python; usare metadata descrittivi o note, non override.")

    if "canonical_formula" in req:
        if str(req.get("canonical_formula")).strip() != CANONICAL_FORMULA:
            add_issue(issues, "error", "canonical_formula_mismatch", "canonical_formula", "Formula canonica diversa da quella ammessa.", CANONICAL_FORMULA)
        else:
            add_issue(warnings, "info", "canonical_formula_repeated", "canonical_formula", "Formula canonica ripetuta nella request; non è necessaria ma è coerente.", "Preferire documentazione/protocollo, non passare formula a ogni esecuzione.")

    text = flatten_strings(req)
    for bad in FORBIDDEN_SUBSTRINGS:
        if bad in text:
            add_issue(issues, "error", "forbidden_instruction_text", "text", f"Testo sospetto/vietato trovato: {bad!r}.", "L'IA deve preparare JSON e non chiedere modifiche a core/formula o shell libera.")

    # Metadata-only fields: se dichiarano effetti matematici, errore.
    for key in METADATA_ONLY_FIELDS:
        val = req.get(key)
        if isinstance(val, dict):
            nested_text = flatten_strings(val)
            if any(term in nested_text for term in ["pn_delta", "modify_pn", "math_effect", "direct_effect", "peso", "weight", "formula"]):
                add_issue(issues, "error", "metadata_math_effect", key, f"Il metadata {key} sembra contenere effetti matematici diretti.", "I metadata sono descrittivi/archiviati; il core decide la matematica.")

    # Parametri numerici e profili.
    nodes_present = "nodes" in req
    nodes = safe_int(req.get("nodes"), 0)
    block_size = safe_int(req.get("block_size"), 0) if "block_size" in req else 0
    max_allowed_nodes = safe_int(req.get("max_allowed_nodes"), MAX_NODES_PER_TICK)
    max_ticks = safe_int(req.get("max_ticks"), 1) if "max_ticks" in req else 1

    if action in {"run_tick", "run_supervisor_tick"}:
        if not nodes_present:
            add_issue(issues, "error", "missing_nodes", "nodes", "nodes obbligatorio per run_tick/run_supervisor_tick.", "Impostare nodes <= 5000.")
        elif nodes < 1:
            add_issue(issues, "error", "invalid_nodes", "nodes", "nodes deve essere >= 1.")
        elif nodes > MAX_NODES_PER_TICK:
            add_issue(issues, "error", "nodes_over_tick_limit", "nodes", f"run_tick consente massimo {MAX_NODES_PER_TICK} nodi.", "Per run lunghe usare run_local_longrun/run_final_pipeline con tick da 5000.")
    elif action in {"run_local_longrun", "run_final_pipeline"}:
        if nodes_present and nodes < 1:
            add_issue(issues, "error", "invalid_nodes", "nodes", "nodes deve essere >= 1.")
        if nodes_present and max_allowed_nodes and nodes > max_allowed_nodes:
            add_issue(issues, "error", "nodes_over_declared_max", "nodes", "nodes supera max_allowed_nodes dichiarato.", "Aumentare max_allowed_nodes solo con autorizzazione esplicita dell'utente.")
        if max_ticks < 1:
            add_issue(issues, "error", "invalid_max_ticks", "max_ticks", "max_ticks deve essere >= 1.")

    if block_size and block_size > MAX_NODES_PER_TICK:
        add_issue(issues, "error", "block_size_over_limit", "block_size", f"block_size massimo ammesso: {MAX_NODES_PER_TICK}.")
    if block_size and block_size < 1:
        add_issue(issues, "error", "invalid_block_size", "block_size", "block_size deve essere >= 1.")

    if "archive_mode" in req and str(req.get("archive_mode")) not in ALLOWED_ARCHIVE_MODE:
        add_issue(issues, "error", "invalid_archive_mode", "archive_mode", "archive_mode deve essere light|full|both.")
    if "full_json_check" in req and str(req.get("full_json_check")) not in ALLOWED_FULL_CHECK:
        add_issue(issues, "error", "invalid_full_json_check", "full_json_check", "full_json_check deve essere all|sample|none.")
    if "audit_mode" in req and str(req.get("audit_mode")) not in ALLOWED_AUDIT_MODE:
        add_issue(issues, "error", "invalid_audit_mode", "audit_mode", "audit_mode deve essere quick|sample|all.")
    profile = req.get("profile_mode", req.get("execution_profile"))
    if profile is not None and str(profile) not in ALLOWED_PROFILES:
        add_issue(issues, "error", "invalid_execution_profile", "profile_mode/execution_profile", "Profilo deve essere stable|efficient|speed|forensic.")
    if str(profile) == "speed":
        add_issue(warnings, "warning", "speed_not_for_promotion", "execution_profile", "speed è solo esplorativo e non vale per promozione finale.", "Per audit/promozione usare stable/efficient/forensic.")

    # Granularità: solo se l'AI esplicita scenario_class/recommended_nodes.
    granularity = req.get("granularity") or req.get("scenario_assessment") or {}
    if isinstance(granularity, dict):
        scenario_class = str(granularity.get("scenario_class") or granularity.get("class") or "").strip()
        recommended = safe_int(granularity.get("recommended_nodes", granularity.get("nodes", nodes or 0)), 0)
        if scenario_class in GRANULARITY_LIMITS:
            low, high = GRANULARITY_LIMITS[scenario_class]
            candidate = recommended or nodes
            if candidate:
                if candidate < low:
                    add_issue(warnings, "warning", "granularity_too_low", "granularity.recommended_nodes", f"{candidate} nodi sotto il range prudente per {scenario_class}: {low}-{high}.", "Dichiarare cluster/scala o aumentare nodi.")
                if candidate > high:
                    sev = "error" if mode == "strict" and scenario_class in {"micro_simple", "routine_composite"} else "warning"
                    target = issues if sev == "error" else warnings
                    add_issue(target, sev, "granularity_too_high", "granularity.recommended_nodes", f"{candidate} nodi sopra il range prudente per {scenario_class}: {low}-{high}.", "Ridurre nodi o spiegare perché è Monte Carlo/sensibilità reale.")
        elif scenario_class:
            add_issue(warnings, "warning", "unknown_scenario_class", "granularity.scenario_class", f"scenario_class non canonica: {scenario_class}.", f"Classi note: {sorted(GRANULARITY_LIMITS)}")

    # Richieste prive di granularità: avviso, non errore. L'AI può fare preflight/doctor/verify.
    if action in {"run_tick", "run_local_longrun", "run_final_pipeline"} and not granularity:
        add_issue(warnings, "warning", "missing_granularity_assessment", "granularity", "Manca una valutazione esplicita della granularità.", "Per scenari reali, aggiungere scenario_class, recommended_nodes e motivazione.")

    ok = not any(i["level"] == "error" for i in issues)
    return {
        "ok": ok,
        "validator_version": VALIDATOR_VERSION,
        "mode": mode,
        "canonical_formula": CANONICAL_FORMULA,
        "issues": issues,
        "warnings": warnings,
        "normalized_view": {
            "action": action,
            "run_id": str(run_id).strip() if run_id is not None else None,
            "nodes": nodes if nodes_present else None,
            "block_size": block_size or None,
            "max_ticks": max_ticks,
            "profile": profile,
            "metadata_only_fields_present": sorted([k for k in METADATA_ONLY_FIELDS if k in req]),
        },
        "non_invention_policy": {
            "ai_can_prepare": ["questionnaire", "metadata", "json_request", "output_interpretation"],
            "ai_must_not_modify": ["formula", "weights", "clamp", "dice", "margin_logic", "core", "runner_math"],
        },
    }


def make_examples(root: Path) -> None:
    examples = {
        "valid_micro_5_nodes.json": {
            "action": "run_tick", "run_id": "m21_valid_micro_5", "nodes": 5, "block_size": 5,
            "archive_mode": "both", "full_json_check": "sample", "resume": True,
            "granularity": {"scenario_class": "micro_simple", "recommended_nodes": 5, "reason": "azione brevissima"},
        },
        "invalid_formula_override.json": {
            "action": "run_tick", "run_id": "m21_bad_formula", "nodes": 5,
            "formula": "Pn = P0 + nuovo_bonus", "granularity": {"scenario_class": "micro_simple", "recommended_nodes": 5},
        },
        "invalid_micro_50000_nodes.json": {
            "action": "run_final_pipeline", "run_id": "m21_bad_granularity", "nodes": 50000, "max_allowed_nodes": 50000,
            "granularity": {"scenario_class": "micro_simple", "recommended_nodes": 50000, "reason": "accendere TV"},
        },
    }
    root.mkdir(parents=True, exist_ok=True)
    for name, obj in examples.items():
        (root / name).write_text(json.dumps(obj, ensure_ascii=False, indent=2), encoding="utf-8")


def main() -> int:
    ap = argparse.ArgumentParser(description="M21 AI request validator / non-invention guard")
    ap.add_argument("--request", help="JSON request da validare")
    ap.add_argument("--mode", default="strict", choices=["strict", "normal", "lenient"])
    ap.add_argument("--json-only", action="store_true")
    ap.add_argument("--make-examples", action="store_true")
    args = ap.parse_args()
    if args.make_examples:
        out = Path("m21_request_examples")
        make_examples(out)
        print(json.dumps({"ok": True, "created": str(out.resolve())}, ensure_ascii=False, indent=2))
        return 0
    if not args.request:
        ap.error("serve --request o --make-examples")
    try:
        req = load_json(Path(args.request))
        report = validate_request(req, mode=args.mode)
    except Exception as exc:
        report = {"ok": False, "validator_version": VALIDATOR_VERSION, "error": "validator_exception", "exception": repr(exc)}
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0 if report.get("ok") else 1


if __name__ == "__main__":
    raise SystemExit(main())
