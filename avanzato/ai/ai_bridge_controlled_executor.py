#!/usr/bin/env python3
"""
SIMULATORE 3.2 — AI BRIDGE CONTROLLED EXECUTOR v0.1
====================================================
Bridge locale code-first tra una IA esterna (Gemini/ChatGPT/Claude) e il simulatore Python.

Principio: l'IA NON esegue comandi shell liberi. L'IA prepara richieste JSON secondo una
lista di azioni consentite; questo bridge le mostra all'utente, chiede conferma e solo dopo
lancia runner/supervisore con argomenti whitelisted.

Uso tipico:
  python tools/ai_bridge_controlled_executor.py --request request.json --approve
  python tools/ai_bridge_controlled_executor.py --interactive
  python tools/ai_bridge_controlled_executor.py --make-example

Sicurezza:
- niente shell=True;
- niente comandi arbitrari;
- percorsi confinati nella cartella del progetto o in --workspace;
- azioni consentite: doctor, repair, verify, run_tick, run_supervisor_tick, pack_run;
- multiblock disabilitato di default;
- richiesta approvazione esplicita, salvo --yes per test locale controllato.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import shlex
import subprocess
import sys
import time
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

BRIDGE_VERSION = "AI_BRIDGE_CONTROLLED_EXECUTOR_0_9_M22_STDOUT_ARTIFACTS"
THIS_FILE = Path(__file__).resolve()
# Supporta sia pacchetto strutturato:
#   project/tools/ai_bridge_controlled_executor.py + project/core + project/runner
# sia cartella piatta con tutti i 10 file nello stesso punto.
ROOT = THIS_FILE.parents[1] if THIS_FILE.parent.name == "tools" else THIS_FILE.parent

def _first_existing_path(*candidates: Path) -> Path:
    for candidate in candidates:
        if candidate.exists():
            return candidate
    return candidates[0]

DEFAULT_CORE = _first_existing_path(
    ROOT / "core" / "simulatore_v31_core_finale.py",
    ROOT / "simulatore_v31_core_finale.py",
    ROOT / "simulatore_v31_core_finale (6).py",
)
DEFAULT_RUNNER = _first_existing_path(
    ROOT / "runner" / "simulatore_v31_time04_4_40_STEP8C_CODE_FIRST_runner.py",
    ROOT / "simulatore_v31_time04_4_40_STEP8C_CODE_FIRST_runner.py",
)
DEFAULT_SUPERVISOR = _first_existing_path(
    ROOT / "tools" / "code_first_safe_tick_supervisor.py",
    ROOT / "code_first_safe_tick_supervisor.py",
)
DEFAULT_LOCAL_EXECUTOR = _first_existing_path(
    ROOT / "tools" / "local_long_run_executor.py",
    ROOT / "local_long_run_executor.py",
)
DEFAULT_ARCHIVE_AUDIT = _first_existing_path(
    ROOT / "tools" / "archive_completeness_statistical_audit.py",
    ROOT / "archive_completeness_statistical_audit.py",
)
DEFAULT_FINAL_PIPELINE = _first_existing_path(
    ROOT / "tools" / "run_longrun_with_archive_audit.py",
    ROOT / "run_longrun_with_archive_audit.py",
)
DEFAULT_REQUEST_VALIDATOR = _first_existing_path(
    ROOT / "tools" / "ai_request_validator.py",
    ROOT / "ai_request_validator.py",
)
DEFAULT_WORKSPACE = ROOT / "runs_bridge"
ALLOWED_ACTIONS = {"doctor", "repair", "verify", "run_tick", "run_supervisor_tick", "run_local_longrun", "archive_audit", "run_final_pipeline", "validate_ai_request", "pack_run"}
SAFE_ID_RE = re.compile(r"^[A-Za-z0-9_.-]{1,80}$")
MAX_NODES_PER_TICK = 5000
MAX_TIMEOUT_SECONDS = 240


def load_json(path: Path) -> Dict[str, Any]:
    with path.open("r", encoding="utf-8") as f:
        data = json.load(f)
    if not isinstance(data, dict):
        raise ValueError("La request deve essere un oggetto JSON.")
    return data


def write_json(path: Path, data: Dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def safe_run_id(value: Any) -> str:
    # v0.3: run_id esplicito obbligatorio.
    # Un run_id vuoto non viene convertito in default per evitare collisioni o ambiguità
    # quando richieste arrivano da IA diverse.
    if value is None or str(value).strip() == "":
        raise ValueError("run_id obbligatorio e non vuoto. Usa solo lettere, numeri, punto, trattino, underscore.")
    run_id = str(value).strip()
    if not SAFE_ID_RE.match(run_id):
        raise ValueError(f"run_id non sicuro: {run_id!r}. Usa solo lettere, numeri, punto, trattino, underscore.")
    return run_id


def resolve_inside_workspace(workspace: Path, run_id: str) -> Path:
    workspace = workspace.resolve()
    target = (workspace / run_id).resolve()
    if workspace not in target.parents and target != workspace:
        raise ValueError("Percorso run fuori workspace bloccato.")
    return target


def existing_file_or_none(value: Any) -> Optional[Path]:
    if not value:
        return None
    path = Path(str(value)).expanduser().resolve()
    if not path.exists() or not path.is_file():
        raise ValueError(f"File non trovato: {path}")
    return path


def request_summary(req: Dict[str, Any], cmd: List[str], workspace: Path) -> str:
    lines = []
    lines.append(f"Bridge: {BRIDGE_VERSION}")
    lines.append(f"Azione richiesta: {req.get('action')}")
    lines.append(f"Workspace: {workspace}")
    lines.append("Comando che verrebbe eseguito:")
    lines.append("  " + " ".join(shlex.quote(part) for part in cmd))
    lines.append("Nota: il comando è costruito da whitelist, non da shell libera.")
    return "\n".join(lines)



def _run_m21_pre_validation(req: Dict[str, Any]) -> Dict[str, Any]:
    """Validazione M21 obbligatoria prima dell'esecuzione.

    Se il file validator è assente, il bridge non procede: in M21 la validazione
    anti-invenzione è parte del contratto code-first.
    """
    validator = DEFAULT_REQUEST_VALIDATOR.resolve()
    if not validator.exists():
        return {"ok": False, "error": "m21_validator_missing", "path": str(validator)}
    try:
        import importlib.util
        spec = importlib.util.spec_from_file_location("m21_ai_request_validator", str(validator))
        if spec is None or spec.loader is None:
            return {"ok": False, "error": "m21_validator_import_spec_failed", "path": str(validator)}
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)  # type: ignore[attr-defined]
        return mod.validate_request(req, mode=str(req.get("validator_mode", "strict")))
    except Exception as exc:
        return {"ok": False, "error": "m21_validator_exception", "exception": repr(exc), "path": str(validator)}

def build_command(req: Dict[str, Any], workspace: Path) -> Tuple[List[str], Path]:
    action = str(req.get("action", "")).strip()
    if action not in ALLOWED_ACTIONS:
        raise ValueError(f"Azione non consentita: {action!r}. Consentite: {sorted(ALLOWED_ACTIONS)}")

    runner = Path(str(req.get("runner") or DEFAULT_RUNNER)).resolve()
    core = Path(str(req.get("core") or DEFAULT_CORE)).resolve()
    supervisor = Path(str(req.get("supervisor") or DEFAULT_SUPERVISOR)).resolve()
    local_executor = Path(str(req.get("local_executor") or DEFAULT_LOCAL_EXECUTOR)).resolve()
    archive_audit = Path(str(req.get("archive_audit") or DEFAULT_ARCHIVE_AUDIT)).resolve()
    final_pipeline = Path(str(req.get("final_pipeline") or DEFAULT_FINAL_PIPELINE)).resolve()
    request_validator = Path(str(req.get("request_validator") or DEFAULT_REQUEST_VALIDATOR)).resolve()
    if not runner.exists():
        raise ValueError(f"Runner mancante: {runner}")
    if not core.exists():
        raise ValueError(f"Core mancante: {core}")
    if action == "run_supervisor_tick" and not supervisor.exists():
        raise ValueError(f"Supervisor mancante: {supervisor}")
    if action == "run_local_longrun" and not local_executor.exists():
        raise ValueError(f"Local executor M17/M19 mancante: {local_executor}")
    if action == "archive_audit" and not archive_audit.exists():
        raise ValueError(f"Archive audit M19 mancante: {archive_audit}")
    if action == "run_final_pipeline" and not final_pipeline.exists():
        raise ValueError(f"Final pipeline M20 mancante: {final_pipeline}")
    if action == "validate_ai_request" and not request_validator.exists():
        raise ValueError(f"AI request validator M21 mancante: {request_validator}")

    run_id = safe_run_id(req.get("run_id"))
    run_dir = resolve_inside_workspace(workspace, run_id)
    workspace.mkdir(parents=True, exist_ok=True)

    if action == "validate_ai_request":
        validation_payload = req.get("target_request") if isinstance(req.get("target_request"), dict) else req
        validation_dir = workspace / "_m21_validation_requests"
        validation_dir.mkdir(parents=True, exist_ok=True)
        validation_file = validation_dir / f"{run_id}.request.json"
        write_json(validation_file, validation_payload)
        mode = str(req.get("validator_mode", "strict"))
        if mode not in {"strict", "normal", "lenient"}:
            raise ValueError("validator_mode deve essere strict|normal|lenient")
        return [sys.executable, str(request_validator), "--request", str(validation_file), "--mode", mode, "--json-only"], run_dir

    timeout = int(req.get("timeout_seconds", 120))
    timeout = max(5, min(timeout, MAX_TIMEOUT_SECONDS))

    # metadata opzionali, solo se file esistenti. Non vengono interpretati dal bridge.
    metadata_args: List[str] = []
    for key, flag in [
        ("profile", "--profile"),
        ("semantic_trace", "--semantic-trace"),
        ("scenario_blueprint", "--scenario-blueprint"),
        ("initial_calibration", "--initial-calibration"),
        ("questionnaire", "--questionnaire"),
        ("notes", "--notes"),
    ]:
        p = existing_file_or_none(req.get(key))
        if p:
            metadata_args += [flag, str(p)]

    if action == "doctor":
        return [sys.executable, str(runner), "--doctor-run", str(run_dir), "--core", str(core)], run_dir
    if action == "repair":
        cmd = [sys.executable, str(runner), "--doctor-repair", str(run_dir), "--core", str(core)]
        if bool(req.get("dry_run", False)):
            cmd.append("--repair-dry-run")
        return cmd, run_dir
    if action == "verify":
        mode = str(req.get("full_json_check", "sample"))
        if mode not in {"all", "sample", "none"}:
            raise ValueError("full_json_check deve essere all|sample|none")
        return [sys.executable, str(runner), "--verify-run", str(run_dir), "--parent-full-json-check", mode, "--core", str(core)], run_dir
    if action == "pack_run":
        return [sys.executable, str(runner), "--pack-run", str(run_dir), "--core", str(core)], run_dir

    if action == "archive_audit":
        audit_mode = str(req.get("audit_mode", req.get("mode", "sample"))).strip().lower()
        if audit_mode not in {"quick", "sample", "all"}:
            raise ValueError("audit_mode/mode deve essere quick|sample|all")
        audit_out = (run_dir / "m19_archive_audit").resolve()
        if run_dir not in audit_out.parents and audit_out != run_dir:
            raise ValueError("audit out dir fuori run dir bloccato")
        return [
            sys.executable, str(archive_audit),
            "--run-dir", str(run_dir),
            "--out-dir", str(audit_out),
            "--mode", audit_mode,
        ], run_dir

    if action == "run_final_pipeline":
        total_nodes = int(req.get("nodes", 5000))
        max_allowed = int(req.get("max_allowed_nodes", 500000))
        if total_nodes < 1:
            raise ValueError("nodes deve essere >= 1")
        if total_nodes > max_allowed:
            raise ValueError("nodes supera max_allowed_nodes della richiesta.")
        block_size_local = int(req.get("block_size", MAX_NODES_PER_TICK))
        block_size_local = max(1, min(block_size_local, MAX_NODES_PER_TICK))
        max_ticks = int(req.get("max_ticks", 1))
        max_ticks = max(1, min(max_ticks, int(req.get("max_allowed_ticks_per_invocation", 100))))
        profile = str(req.get("profile_mode", req.get("execution_profile", "stable")))
        if profile not in {"stable", "efficient", "speed", "forensic"}:
            raise ValueError("profile_mode/execution_profile deve essere stable|efficient|speed|forensic")
        audit_mode = str(req.get("audit_mode", "sample"))
        if audit_mode not in {"quick", "sample", "all"}:
            raise ValueError("audit_mode deve essere quick|sample|all")
        audit_after = str(req.get("audit_after", "complete"))
        if audit_after not in {"complete", "verified", "always", "never"}:
            raise ValueError("audit_after deve essere complete|verified|always|never")
        cmd = [
            sys.executable, str(final_pipeline),
            "--runner", str(runner),
            "--core", str(core),
            "--local-executor", str(local_executor),
            "--archive-audit", str(archive_audit),
            "--run-id", run_id,
            "--out-dir", str(workspace),
            "--nodes", str(total_nodes),
            "--block-size", str(block_size_local),
            "--max-ticks", str(max_ticks),
            "--execution-profile", profile,
            "--tick-timeout-seconds", str(timeout),
            "--child-timeout-seconds", str(timeout),
            "--audit-mode", audit_mode,
            "--audit-after", audit_after,
            "--json-only",
        ] + metadata_args
        if bool(req.get("preflight_only", False)):
            cmd.append("--preflight-only")
        verify_every = int(req.get("verify_every", 0) or 0)
        if verify_every > 0:
            cmd += ["--verify-every", str(verify_every)]
        return cmd, run_dir

    nodes = int(req.get("nodes", MAX_NODES_PER_TICK))
    if nodes < 1:
        raise ValueError("nodes deve essere >= 1")
    if nodes > int(req.get("max_allowed_nodes", MAX_NODES_PER_TICK)):
        raise ValueError("nodes supera max_allowed_nodes della richiesta.")
    if nodes > MAX_NODES_PER_TICK:
        raise ValueError(f"Per sicurezza il bridge consente max {MAX_NODES_PER_TICK} nodi per tick.")
    block_size = int(req.get("block_size", min(nodes, MAX_NODES_PER_TICK)))
    block_size = max(1, min(block_size, MAX_NODES_PER_TICK))
    archive_mode = str(req.get("archive_mode", "both"))
    if archive_mode not in {"light", "full", "both"}:
        raise ValueError("archive_mode deve essere light|full|both")
    full_check = str(req.get("full_json_check", "sample"))
    if full_check not in {"all", "sample", "none"}:
        raise ValueError("full_json_check deve essere all|sample|none")

    # metadata opzionali, solo se file esistenti. Non vengono interpretati dal bridge.
    metadata_args: List[str] = []
    for key, flag in [
        ("profile", "--profile"),
        ("semantic_trace", "--semantic-trace"),
        ("scenario_blueprint", "--scenario-blueprint"),
        ("initial_calibration", "--initial-calibration"),
        ("questionnaire", "--questionnaire"),
        ("notes", "--notes"),
    ]:
        p = existing_file_or_none(req.get(key))
        if p:
            metadata_args += [flag, str(p)]

    if action == "run_tick":
        cmd = [
            sys.executable, str(runner),
            "--run-id", run_id,
            "--out-dir", str(workspace),
            "--core", str(core),
            "--nodes", str(nodes),
            "--block-size", str(block_size),
            "--archive-mode", archive_mode,
            "--parent-full-json-check", full_check,
            "--full-json-check", full_check,
            "--max-blocks-this-invocation", "1",
            "--child-timeout-seconds", str(timeout),
        ] + metadata_args
        if run_dir.exists() and bool(req.get("resume", True)):
            cmd.append("--resume")
        return cmd, run_dir


    if action == "run_local_longrun":
        total_nodes = int(req.get("nodes", 5000))
        max_allowed = int(req.get("max_allowed_nodes", 500000))
        if total_nodes < 1:
            raise ValueError("nodes deve essere >= 1")
        if total_nodes > max_allowed:
            raise ValueError("nodes supera max_allowed_nodes della richiesta.")
        block_size_local = int(req.get("block_size", MAX_NODES_PER_TICK))
        block_size_local = max(1, min(block_size_local, MAX_NODES_PER_TICK))
        max_ticks = int(req.get("max_ticks", 1))
        max_ticks = max(1, min(max_ticks, int(req.get("max_allowed_ticks_per_invocation", 100))))
        profile = str(req.get("profile_mode", req.get("execution_profile", "stable")))
        if profile not in {"stable", "efficient", "speed", "forensic"}:
            raise ValueError("profile_mode/execution_profile deve essere stable|efficient|speed|forensic")
        cmd = [
            sys.executable, str(local_executor),
            "--runner", str(runner),
            "--core", str(core),
            "--run-id", run_id,
            "--out-dir", str(workspace),
            "--nodes", str(total_nodes),
            "--block-size", str(block_size_local),
            "--max-ticks", str(max_ticks),
            "--execution-profile", profile,
            "--tick-timeout-seconds", str(timeout),
            "--child-timeout-seconds", str(timeout),
        ] + metadata_args
        if bool(req.get("preflight_only", False)):
            cmd.append("--preflight-only")
        if bool(req.get("doctor_every_tick", False)):
            cmd.append("--doctor-every-tick")
        verify_every = int(req.get("verify_every", 0) or 0)
        if verify_every > 0:
            cmd += ["--verify-every", str(verify_every)]
        return cmd, run_dir

    if action == "run_supervisor_tick":
        profile = str(req.get("profile_mode", "stable"))
        if profile not in {"stable", "efficient", "speed", "forensic"}:
            raise ValueError("profile_mode deve essere stable|efficient|speed|forensic")
        cmd = [
            sys.executable, str(supervisor),
            "--runner", str(runner),
            "--core", str(core),
            "--run-id", run_id,
            "--out-dir", str(workspace),
            "--nodes", str(nodes),
            "--block-size", str(block_size),
            "--profile", profile,
            "--max-ticks", "1",
            "--timeout-seconds", str(timeout),
        ] + metadata_args
        return cmd, run_dir

    raise AssertionError("azione non gestita")


def _safe_artifact_name(text: str) -> str:
    return re.sub(r"[^A-Za-z0-9_.-]+", "_", str(text or "run"))[:80] or "run"


def _write_text_artifact(path: Path, text: str) -> Dict[str, Any]:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text or "", encoding="utf-8", errors="replace")
    return {"path": str(path), "bytes": path.stat().st_size}


def execute(cmd: List[str], timeout: int, cwd: Path, *, artifact_dir: Optional[Path] = None) -> Dict[str, Any]:
    """Esegue il comando whitelisted preservando stdout/stderr completi su file.

    M22: il JSON restituito al chiamante contiene solo tail leggibili per l'IA,
    ma stdout e stderr completi sono salvati come artefatti. Questo evita che
    pipeline, audit o report lunghi vadano persi quando l'output supera la coda
    inclusa nel bridge_last_result. Non cambia core, runner o matematica.
    """
    t0 = time.time()
    artifact_dir = Path(artifact_dir) if artifact_dir else None
    if artifact_dir:
        artifact_dir.mkdir(parents=True, exist_ok=True)
        _write_text_artifact(artifact_dir / "command.txt", " ".join(shlex.quote(part) for part in cmd) + "\n")
        write_json(artifact_dir / "command.json", {"cmd": cmd, "cwd": str(cwd), "timeout": timeout, "created_ts": time.time()})
    try:
        proc = subprocess.run(cmd, cwd=str(cwd), text=True, capture_output=True, timeout=timeout)
        stdout = proc.stdout or ""
        stderr = proc.stderr or ""
        artifacts: Dict[str, Any] = {}
        if artifact_dir:
            artifacts["stdout"] = _write_text_artifact(artifact_dir / "stdout.full.txt", stdout)
            artifacts["stderr"] = _write_text_artifact(artifact_dir / "stderr.full.txt", stderr)
        return {
            "ok": proc.returncode == 0,
            "returncode": proc.returncode,
            "elapsed_seconds": round(time.time() - t0, 3),
            "stdout_tail": stdout[-20000:],
            "stderr_tail": stderr[-20000:],
            "stdout_bytes": len(stdout.encode("utf-8", errors="replace")),
            "stderr_bytes": len(stderr.encode("utf-8", errors="replace")),
            "artifacts": artifacts,
        }
    except subprocess.TimeoutExpired as exc:
        stdout = exc.stdout if isinstance(exc.stdout, str) else ""
        stderr = exc.stderr if isinstance(exc.stderr, str) else ""
        artifacts: Dict[str, Any] = {}
        if artifact_dir:
            artifacts["stdout"] = _write_text_artifact(artifact_dir / "stdout.full.txt", stdout)
            artifacts["stderr"] = _write_text_artifact(artifact_dir / "stderr.full.txt", stderr)
        return {
            "ok": False,
            "returncode": None,
            "elapsed_seconds": round(time.time() - t0, 3),
            "timeout": True,
            "stdout_tail": stdout[-20000:],
            "stderr_tail": stderr[-20000:],
            "stdout_bytes": len(stdout.encode("utf-8", errors="replace")),
            "stderr_bytes": len(stderr.encode("utf-8", errors="replace")),
            "artifacts": artifacts,
            "error": "bridge_timeout",
        }


def make_example(path: Path) -> None:
    example = {
        "action": "run_tick",
        "run_id": "bridge_demo_500",
        "nodes": 500,
        "block_size": 500,
        "archive_mode": "both",
        "full_json_check": "sample",
        "resume": True,
        "timeout_seconds": 120,
        "profile": str((ROOT / "metadata" / "profile.json").resolve()),
        "scenario_blueprint": str((ROOT / "metadata" / "scenario_blueprint.json").resolve()),
        "initial_calibration": str((ROOT / "metadata" / "initial_calibration.json").resolve()),
        "human_note": "Esempio sicuro: un solo tick, max 500 nodi. L'utente deve approvare prima dell'esecuzione.",
    }
    write_json(path, example)


def main() -> int:
    ap = argparse.ArgumentParser(description="AI Bridge controllato per Simulatore 3.2 code-first")
    ap.add_argument("--request", help="File JSON richiesta preparata da IA/utente")
    ap.add_argument("--workspace", default=str(DEFAULT_WORKSPACE), help="Cartella confinata per le run bridge")
    ap.add_argument("--yes", action="store_true", help="Esegue senza prompt umano. Solo per test locale controllato.")
    ap.add_argument("--dry-run", action="store_true", help="Mostra comando validato senza eseguirlo")
    ap.add_argument("--make-example", action="store_true", help="Crea bridge_request_example.json")
    ap.add_argument("--interactive", action="store_true", help="Modalità interattiva minimale: incolla JSON, conferma, esegui")
    ap.add_argument("--json-only", action="store_true", help="Stampa solo JSON macchina, senza riepilogo testuale. Utile per IA/pipe.")
    args = ap.parse_args()

    workspace = Path(args.workspace).expanduser().resolve()

    if args.make_example:
        out = ROOT / "bridge_request_example.json"
        make_example(out)
        print(json.dumps({"ok": True, "created": str(out)}, ensure_ascii=False, indent=2))
        return 0

    if args.interactive:
        print("Incolla una richiesta JSON su una riga e premi Invio:")
        raw = sys.stdin.readline()
        req = json.loads(raw)
    else:
        if not args.request:
            ap.error("serve --request oppure --interactive oppure --make-example")
        req = load_json(Path(args.request))

    try:
        if str(req.get("action", "")).strip() != "validate_ai_request":
            m21_validation = _run_m21_pre_validation(req)
            if not m21_validation.get("ok"):
                err = {"ok": False, "bridge_version": BRIDGE_VERSION, "error": "m21_request_validator_failed", "m21_validation": m21_validation, "request": req}
                print(json.dumps(err, ensure_ascii=False, indent=2))
                return 1
        cmd, run_dir = build_command(req, workspace)
    except Exception as exc:
        err = {"ok": False, "bridge_version": BRIDGE_VERSION, "error": "request_validation_failed", "exception": repr(exc), "request": req}
        print(json.dumps(err, ensure_ascii=False, indent=2))
        return 1
    timeout = max(5, min(int(req.get("timeout_seconds", 120)), MAX_TIMEOUT_SECONDS))
    if not args.json_only:
        print(request_summary(req, cmd, workspace))
    if args.dry_run:
        print(json.dumps({"ok": True, "dry_run": True, "cmd": cmd, "run_dir": str(run_dir)}, ensure_ascii=False, indent=2))
        return 0
    if not args.yes:
        ans = input("\nAutorizzi l'esecuzione di questo comando whitelisted? Scrivi SI per procedere: ").strip().upper()
        if ans != "SI":
            print(json.dumps({"ok": False, "cancelled_by_user": True}, ensure_ascii=False, indent=2))
            return 2
    run_id_safe = safe_run_id(req.get("run_id"))
    ts_label = time.strftime("%Y%m%d_%H%M%S")
    artifact_dir = workspace / "_bridge_artifacts" / run_id_safe / f"{ts_label}_{_safe_artifact_name(str(req.get('action')))}"
    result = execute(cmd, timeout=timeout + 10, cwd=ROOT, artifact_dir=artifact_dir)
    report = {
        "ok": bool(result.get("ok")),
        "bridge_version": BRIDGE_VERSION,
        "m22_artifact_preservation": {
            "enabled": True,
            "artifact_dir": str(artifact_dir),
            "stdout_full_path": str(artifact_dir / "stdout.full.txt"),
            "stderr_full_path": str(artifact_dir / "stderr.full.txt"),
            "rule": "stdout/stderr completi sempre salvati su file; nel JSON resta solo la coda leggibile",
        },
        "request": req,
        "command": cmd,
        "run_dir": str(run_dir),
        "result": result,
        "next_safe_actions": ["doctor", "verify", "repair se doctor segnala problemi", "nuovo run_tick se servono altri nodi"],
    }
    write_json(artifact_dir / "bridge_report.full.json", report)
    out_path = workspace / f"bridge_last_result_{run_id_safe}.json"
    write_json(out_path, report)
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0 if result.get("ok") else 1


if __name__ == "__main__":
    raise SystemExit(main())
