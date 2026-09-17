#!/usr/bin/env python3
"""
SIMULATORE 3.2 — LOCAL LONG-RUN EXECUTOR M18
============================================
Esecutore locale autonomo per run lunghe del Simulatore in modalità CODE-FIRST.

Scopo:
- eseguire run da 50k / 250k / 500k / 1M nodi senza dipendere dal wrapper della chat;
- lanciare sempre un tick sicuro alla volta;
- fare doctor/repair/verify con regole conservative;
- produrre report JSONL/JSON leggibili da Gemini, ChatGPT, Claude, DeepSeek, Kimi o altre IA;
- non modificare core, formula, pesi, clamp, dado, margini o logica matematica.

Regola operativa:
  1 tick = 1 blocco = massimo 5.000 nodi

Uso tipico locale:
  python local_long_run_executor.py --run-id test_500k --nodes 500000 --max-ticks 100

Rilanciando lo stesso comando, l'esecutore riparte dal checkpoint sicuro.
"""
from __future__ import annotations

import argparse
import json
import os
import signal
import subprocess
import re
import sys
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

VERSION = "M18_LOCAL_LONG_RUN_EXECUTOR_1_3_LOCAL_FINALIZATION_READY"
THIS_FILE = Path(__file__).resolve()
ROOT = THIS_FILE.parents[1] if THIS_FILE.parent.name in {"tools", "bin"} else THIS_FILE.parent

MAX_BLOCK_SIZE = 5000
DEFAULT_BLOCK_SIZE = 5000
SAFE_RUN_ID_RE = re.compile(r"^[A-Za-z0-9_.-]{1,80}$")
DEFAULT_TIMEOUT_SECONDS = 240
DEFAULT_BUDGET_SECONDS = 3600


def first_existing(*candidates: Path) -> Path:
    for c in candidates:
        if c.exists():
            return c
    return candidates[0]


DEFAULT_RUNNER = first_existing(
    ROOT / "runner" / "simulatore_v31_time04_4_40_STEP8C_CODE_FIRST_runner.py",
    ROOT / "simulatore_v31_time04_4_40_STEP8C_CODE_FIRST_runner.py",
)
DEFAULT_CORE = first_existing(
    ROOT / "core" / "simulatore_v31_core_finale.py",
    ROOT / "simulatore_v31_core_finale.py",
    ROOT / "simulatore_v31_core_finale (6).py",
)
DEFAULT_OUT_DIR = ROOT / "runs_local_longrun"


def read_json(path: Path) -> Dict[str, Any]:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}


def write_json_atomic(path: Path, data: Dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    os.replace(tmp, path)


def append_jsonl(path: Path, data: Dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as f:
        f.write(json.dumps(data, ensure_ascii=False, separators=(",", ":")) + "\n")


def completed_nodes(run_dir: Path) -> int:
    cp = read_json(run_dir / "checkpoint.json")
    try:
        return int(cp.get("completed_nodes") or 0)
    except Exception:
        return 0


def safe_run_id(value: Any) -> str:
    if value is None or str(value).strip() == "":
        raise ValueError("run_id obbligatorio e non vuoto. Usa solo lettere, numeri, punto, trattino, underscore.")
    run_id = str(value).strip()
    if not SAFE_RUN_ID_RE.match(run_id):
        raise ValueError(f"run_id non sicuro: {run_id!r}. Usa solo lettere, numeri, punto, trattino, underscore; massimo 80 caratteri.")
    return run_id


def validate_args(args: argparse.Namespace) -> Dict[str, Any]:
    """Validazione severa M17: fallisce prima di toccare la run se input/percorso non sono sicuri."""
    issues: List[Dict[str, Any]] = []
    try:
        args.run_id = safe_run_id(args.run_id)
    except Exception as exc:
        issues.append({"level": "error", "field": "run_id", "message": str(exc)})
    runner = Path(str(args.runner)).expanduser().resolve()
    core = Path(str(args.core)).expanduser().resolve()
    out_dir = Path(str(args.out_dir)).expanduser().resolve()
    if not runner.is_file():
        issues.append({"level": "error", "field": "runner", "message": f"Runner mancante o non file: {runner}"})
    if not core.is_file():
        issues.append({"level": "error", "field": "core", "message": f"Core mancante o non file: {core}"})
    try:
        nodes = int(args.nodes)
        if nodes < 1:
            issues.append({"level": "error", "field": "nodes", "message": "nodes deve essere >= 1"})
    except Exception:
        nodes = 0
        issues.append({"level": "error", "field": "nodes", "message": "nodes deve essere intero"})
    try:
        block_size = int(args.block_size)
        if block_size < 1 or block_size > MAX_BLOCK_SIZE:
            issues.append({"level": "error", "field": "block_size", "message": f"block_size deve essere tra 1 e {MAX_BLOCK_SIZE}"})
    except Exception:
        block_size = 0
        issues.append({"level": "error", "field": "block_size", "message": "block_size deve essere intero"})
    try:
        max_ticks = int(args.max_ticks)
        if max_ticks < 1:
            issues.append({"level": "error", "field": "max_ticks", "message": "max_ticks deve essere >= 1"})
    except Exception:
        max_ticks = 0
        issues.append({"level": "error", "field": "max_ticks", "message": "max_ticks deve essere intero"})
    for name in ["tick_timeout_seconds", "child_timeout_seconds", "doctor_timeout_seconds", "repair_timeout_seconds", "verify_timeout_seconds", "budget_seconds"]:
        try:
            if int(getattr(args, name)) < 1:
                issues.append({"level": "error", "field": name, "message": f"{name} deve essere >= 1"})
        except Exception:
            issues.append({"level": "error", "field": name, "message": f"{name} deve essere intero"})
    for name in ["profile", "semantic_trace", "scenario_blueprint", "initial_calibration", "questionnaire", "notes"]:
        value = getattr(args, name, None)
        if value:
            fp = Path(str(value)).expanduser().resolve()
            if not fp.is_file():
                issues.append({"level": "error", "field": name, "message": f"Metadata file non trovato: {fp}"})
    ok = not any(i["level"] == "error" for i in issues)
    planned_remaining = max(0, nodes - completed_nodes(out_dir / str(getattr(args, "run_id", "")))) if ok else None
    planned_ticks = ((planned_remaining + block_size - 1) // block_size) if ok and block_size else None
    return {
        "ok": ok,
        "version": VERSION,
        "issues": issues,
        "resolved_paths": {"runner": str(runner), "core": str(core), "out_dir": str(out_dir)},
        "run_id": str(getattr(args, "run_id", "")),
        "target_nodes": nodes,
        "block_size": block_size,
        "max_ticks_this_invocation": max_ticks,
        "planned_remaining_nodes": planned_remaining,
        "planned_total_remaining_ticks": planned_ticks,
        "safety_rule": "1 tick = 1 block = max 5000 nodes; core/formula unchanged.",
    }


def safe_tail(text: Any, limit: int = 6000) -> str:
    if text is None:
        return ""
    if not isinstance(text, str):
        text = str(text)
    return text[-limit:]


def run_process(cmd: List[str], timeout: int, label: str, cwd: Path) -> Dict[str, Any]:
    started = time.time()
    proc = None
    try:
        proc = subprocess.Popen(
            cmd,
            cwd=str(cwd),
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            start_new_session=True,
        )
        try:
            stdout, stderr = proc.communicate(timeout=timeout)
            stdout = stdout or ""
            stderr = stderr or ""
            parsed = None
            try:
                parsed = json.loads(stdout) if stdout.strip().startswith("{") else None
            except Exception:
                parsed = None
            return {
                "label": label,
                "ok": proc.returncode == 0,
                "returncode": proc.returncode,
                "timeout": False,
                "elapsed_seconds": round(time.time() - started, 3),
                "stdout_json": parsed,
                "stdout_tail": safe_tail(stdout),
                "stderr_tail": safe_tail(stderr),
                "cmd_tail": cmd[-18:],
            }
        except subprocess.TimeoutExpired:
            kill_actions: List[str] = []
            try:
                os.killpg(proc.pid, signal.SIGTERM)
                kill_actions.append("sigterm_pgid")
                time.sleep(0.5)
            except Exception as exc:
                kill_actions.append(f"sigterm_error:{exc!r}")
            if proc.poll() is None:
                try:
                    os.killpg(proc.pid, signal.SIGKILL)
                    kill_actions.append("sigkill_pgid")
                except Exception as exc:
                    kill_actions.append(f"sigkill_error:{exc!r}")
            try:
                stdout, stderr = proc.communicate(timeout=5)
            except Exception:
                stdout, stderr = "", ""
            return {
                "label": label,
                "ok": False,
                "returncode": proc.returncode,
                "timeout": True,
                "kill_actions": kill_actions,
                "elapsed_seconds": round(time.time() - started, 3),
                "stdout_json": None,
                "stdout_tail": safe_tail(stdout),
                "stderr_tail": safe_tail(stderr),
                "cmd_tail": cmd[-18:],
            }
    except Exception as exc:
        return {
            "label": label,
            "ok": False,
            "returncode": getattr(proc, "returncode", None),
            "timeout": False,
            "exception": repr(exc),
            "elapsed_seconds": round(time.time() - started, 3),
            "stdout_json": None,
            "stdout_tail": "",
            "stderr_tail": "",
            "cmd_tail": cmd[-18:],
        }


def apply_profile(args: argparse.Namespace) -> None:
    profile = str(args.execution_profile or "stable").lower().strip()
    if profile == "speed":
        args.archive_mode = "light"
        args.full_json_check = "none"
        args.parent_full_json_check = "none"
    elif profile == "forensic":
        args.archive_mode = "both"
        args.full_json_check = "all"
        args.parent_full_json_check = "all"
    else:  # stable / efficient
        args.archive_mode = "both"
        args.full_json_check = "sample"
        args.parent_full_json_check = "sample"


def metadata_args(args: argparse.Namespace, include: bool) -> List[str]:
    if not include:
        return []
    fields = [
        ("--profile", args.profile),
        ("--semantic-trace", args.semantic_trace),
        ("--scenario-blueprint", args.scenario_blueprint),
        ("--initial-calibration", args.initial_calibration),
        ("--questionnaire", args.questionnaire),
        ("--notes", args.notes),
    ]
    out: List[str] = []
    for flag, value in fields:
        if value:
            out += [flag, str(value)]
    return out


def base_runner_cmd(args: argparse.Namespace) -> List[str]:
    return [
        sys.executable, str(Path(args.runner).resolve()),
        "--core", str(Path(args.core).resolve()),
        "--out-dir", str(Path(args.out_dir).resolve()),
        "--run-id", str(args.run_id),
        "--nodes", str(int(args.nodes)),
        "--block-size", str(int(args.block_size)),
        "--archive-mode", str(args.archive_mode),
        "--full-json-check", str(args.full_json_check),
        "--parent-full-json-check", str(args.parent_full_json_check),
    ]


def doctor_cmd(args: argparse.Namespace) -> List[str]:
    return base_runner_cmd(args) + ["--doctor-run", str(args.run_id)]


def repair_cmd(args: argparse.Namespace) -> List[str]:
    return base_runner_cmd(args) + ["--doctor-repair", str(args.run_id)]


def verify_cmd(args: argparse.Namespace) -> List[str]:
    return base_runner_cmd(args) + ["--verify-run", str(args.run_id)]


def tick_cmd(args: argparse.Namespace, include_metadata: bool) -> List[str]:
    # Una sola finestra sicura per invocazione del runner. Il runner ha comunque clamp interno.
    return base_runner_cmd(args) + [
        "--resume",
        "--max-blocks-this-invocation", "1",
        "--child-timeout-seconds", str(int(args.child_timeout_seconds)),
    ] + metadata_args(args, include_metadata)


def doctor_ok(result: Dict[str, Any]) -> bool:
    data = result.get("stdout_json") or {}
    if not result.get("ok"):
        return False
    return bool(data.get("can_resume_strictly", data.get("ok", False)))


def verify_ok(result: Dict[str, Any], expected_nodes: Optional[int] = None) -> bool:
    data = result.get("stdout_json") or {}
    if not result.get("ok") or not data.get("ok"):
        return False
    if expected_nodes is not None:
        try:
            if int(data.get("checkpoint_completed_nodes") or 0) != int(expected_nodes):
                return False
        except Exception:
            return False
    idx = data.get("index_summary") or {}
    bad_keys = ["pn_out_of_clamp", "formula_mismatches", "margin_mismatches", "json_bad"]
    return all(int(idx.get(k) or 0) == 0 for k in bad_keys) and int(data.get("full_reverify_bad") or 0) == 0


def run_local_longrun(args: argparse.Namespace) -> Dict[str, Any]:
    validation = validate_args(args)
    if getattr(args, "preflight_only", False):
        return {**validation, "status": "preflight_only" if validation.get("ok") else "preflight_failed"}
    if not validation.get("ok"):
        return {**validation, "status": "preflight_failed"}
    apply_profile(args)
    args.block_size = max(1, min(int(args.block_size), MAX_BLOCK_SIZE))
    args.nodes = int(args.nodes)
    args.max_ticks = int(args.max_ticks)
    args.budget_seconds = int(args.budget_seconds)
    args.tick_timeout_seconds = int(args.tick_timeout_seconds)
    args.doctor_timeout_seconds = int(args.doctor_timeout_seconds)
    args.repair_timeout_seconds = int(args.repair_timeout_seconds)
    args.verify_timeout_seconds = int(args.verify_timeout_seconds)

    out_dir = Path(args.out_dir).resolve()
    run_dir = out_dir / str(args.run_id)
    run_dir.mkdir(parents=True, exist_ok=True)
    report_path = run_dir / "local_long_run_executor_latest.json"
    events_path = run_dir / "local_long_run_executor_events.jsonl"
    started = time.time()
    steps: List[Dict[str, Any]] = []
    completed_start = completed_nodes(run_dir)

    def log(event: Dict[str, Any]) -> None:
        append_jsonl(events_path, {**event, "ts": time.time(), "version": VERSION})

    log({"event": "m18_start", "run_id": args.run_id, "target_nodes": args.nodes, "completed_start": completed_start, "profile": args.execution_profile, "block_size": args.block_size, "max_ticks": args.max_ticks})

    # Preflight doctor/repair se esiste una run già avviata.
    if (run_dir / "checkpoint.json").exists():
        d1 = run_process(doctor_cmd(args), args.doctor_timeout_seconds, "doctor_before", ROOT)
        steps.append(d1)
        if not doctor_ok(d1):
            r1 = run_process(repair_cmd(args), args.repair_timeout_seconds, "repair_before", ROOT)
            d2 = run_process(doctor_cmd(args), args.doctor_timeout_seconds, "doctor_after_repair_before", ROOT)
            steps.extend([r1, d2])
            if not doctor_ok(d2):
                result = final_report(args, run_dir, started, completed_start, steps, "doctor_repair_failed_before_ticks", False)
                write_json_atomic(report_path, result)
                log({"event": "m18_stop", "status": result["status"], "ok": False})
                return result

    ticks_done = 0
    no_progress = 0
    include_metadata = not (run_dir / "metadata_inputs").exists()
    while ticks_done < args.max_ticks:
        elapsed = time.time() - started
        if elapsed + int(args.safety_reserve_seconds) >= args.budget_seconds:
            log({"event": "budget_stop", "elapsed_seconds": elapsed})
            break
        before = completed_nodes(run_dir)
        if before >= args.nodes:
            break
        t = run_process(tick_cmd(args, include_metadata), args.tick_timeout_seconds, f"tick_{ticks_done+1}", ROOT)
        include_metadata = False
        after = completed_nodes(run_dir)
        ticks_done += 1
        steps.append(t)
        log({"event": "tick_end", "tick": ticks_done, "ok": t.get("ok"), "timeout": t.get("timeout"), "completed_before": before, "completed_after": after, "elapsed_seconds": t.get("elapsed_seconds")})

        # M18: report progressivo subito dopo ogni tick completato.
        # Se un wrapper esterno taglia la chiamata dopo il checkpoint ma prima del report finale,
        # local_long_run_executor_latest.json non resta fermo alla vecchia soglia.
        if (not t.get("timeout")) and t.get("ok") and after > before:
            progress_report = final_report(args, run_dir, started, completed_start, steps, "partial_tick_progress", True)
            progress_report["ticks_done_so_far"] = ticks_done
            progress_report["last_tick_completed_before"] = before
            progress_report["last_tick_completed_after"] = after
            write_json_atomic(report_path, progress_report)

        if t.get("timeout") or not t.get("ok"):
            d = run_process(doctor_cmd(args), args.doctor_timeout_seconds, "doctor_after_tick_problem", ROOT)
            r = run_process(repair_cmd(args), args.repair_timeout_seconds, "repair_after_tick_problem", ROOT)
            d2 = run_process(doctor_cmd(args), args.doctor_timeout_seconds, "doctor_after_problem_repair", ROOT)
            steps.extend([d, r, d2])
            result = final_report(args, run_dir, started, completed_start, steps, "tick_problem_repaired_exit", bool(doctor_ok(d2)))
            result["next_action"] = "Rilanciare lo stesso comando: l'esecutore riparte dal checkpoint sicuro."
            write_json_atomic(report_path, result)
            log({"event": "m18_stop", "status": result["status"], "ok": result["ok"], "completed_nodes": result.get("completed_nodes")})
            return result

        if after <= before:
            no_progress += 1
        else:
            no_progress = 0
        if no_progress >= 1:
            d = run_process(doctor_cmd(args), args.doctor_timeout_seconds, "doctor_no_progress", ROOT)
            r = run_process(repair_cmd(args), args.repair_timeout_seconds, "repair_no_progress", ROOT)
            steps.extend([d, r])
            result = final_report(args, run_dir, started, completed_start, steps, "no_progress_exit", False)
            write_json_atomic(report_path, result)
            log({"event": "m18_stop", "status": result["status"], "ok": False})
            return result

        if args.doctor_every_tick:
            d = run_process(doctor_cmd(args), args.doctor_timeout_seconds, f"doctor_after_tick_{ticks_done}", ROOT)
            steps.append(d)
            if not doctor_ok(d):
                r = run_process(repair_cmd(args), args.repair_timeout_seconds, f"repair_after_doctor_fail_{ticks_done}", ROOT)
                d2 = run_process(doctor_cmd(args), args.doctor_timeout_seconds, f"doctor_after_repair_{ticks_done}", ROOT)
                steps.extend([r, d2])
                if not doctor_ok(d2):
                    result = final_report(args, run_dir, started, completed_start, steps, "doctor_failed_after_tick", False)
                    write_json_atomic(report_path, result)
                    log({"event": "m18_stop", "status": result["status"], "ok": False})
                    return result

        if args.verify_every and ticks_done % int(args.verify_every) == 0:
            v = run_process(verify_cmd(args), args.verify_timeout_seconds, f"verify_periodic_{ticks_done}", ROOT)
            steps.append(v)
            if not verify_ok(v):
                result = final_report(args, run_dir, started, completed_start, steps, "verify_failed_periodic", False)
                write_json_atomic(report_path, result)
                log({"event": "m18_stop", "status": result["status"], "ok": False})
                return result

    # Final doctor + verify a fine invocazione.
    d_final = run_process(doctor_cmd(args), args.doctor_timeout_seconds, "doctor_final", ROOT)
    v_final = run_process(verify_cmd(args), args.verify_timeout_seconds, "verify_final", ROOT)
    steps.extend([d_final, v_final])
    final_completed = completed_nodes(run_dir)
    complete = final_completed >= args.nodes
    ok = bool(doctor_ok(d_final) and verify_ok(v_final) and (complete or ticks_done > 0))
    status = "complete" if complete and ok else ("partial_verified" if ok else "final_doctor_or_verify_failed")
    result = final_report(args, run_dir, started, completed_start, steps, status, ok)
    write_json_atomic(report_path, result)
    log({"event": "m18_stop", "status": status, "ok": ok, "completed_nodes": result.get("completed_nodes"), "ticks_done": ticks_done})
    return result


def final_report(args: argparse.Namespace, run_dir: Path, started: float, completed_start: int, steps: List[Dict[str, Any]], status: str, ok: bool) -> Dict[str, Any]:
    completed = completed_nodes(run_dir)
    last_doctor = next((s for s in reversed(steps) if str(s.get("label", "")).startswith("doctor")), None)
    last_verify = next((s for s in reversed(steps) if str(s.get("label", "")).startswith("verify")), None)
    verify_json = (last_verify or {}).get("stdout_json") or {}
    doctor_json = (last_doctor or {}).get("stdout_json") or {}
    return {
        "ok": bool(ok),
        "status": status,
        "version": VERSION,
        "run_id": args.run_id,
        "run_dir": str(run_dir),
        "target_nodes": int(args.nodes),
        "completed_nodes_start": completed_start,
        "completed_nodes": completed,
        "delta_nodes_this_invocation": completed - completed_start,
        "block_size": int(args.block_size),
        "execution_profile": args.execution_profile,
        "archive_mode": args.archive_mode,
        "full_json_check": args.full_json_check,
        "parent_full_json_check": args.parent_full_json_check,
        "elapsed_seconds": round(time.time() - started, 3),
        "doctor_final": doctor_json,
        "verify_final": verify_json,
        "steps_tail": steps[-12:],
        "safety_rule": "1 tick = 1 block = max 5000 nodes; formula/core unchanged; AI only prepares JSON/metadata and interprets output.",
    }


def parse_args() -> argparse.Namespace:
    ap = argparse.ArgumentParser(description="M18 Local Long-Run Executor per Simulatore 3.2 CODE-FIRST")
    ap.add_argument("--runner", default=str(DEFAULT_RUNNER))
    ap.add_argument("--core", default=str(DEFAULT_CORE))
    ap.add_argument("--out-dir", default=str(DEFAULT_OUT_DIR))
    ap.add_argument("--run-id", required=True)
    ap.add_argument("--nodes", type=int, required=True)
    ap.add_argument("--block-size", type=int, default=DEFAULT_BLOCK_SIZE)
    ap.add_argument("--max-ticks", type=int, default=1, help="Quanti tick eseguire in questa invocazione. In locale può essere 100+; in chat usare valori bassi.")
    ap.add_argument("--budget-seconds", type=int, default=DEFAULT_BUDGET_SECONDS)
    ap.add_argument("--safety-reserve-seconds", type=int, default=5)
    ap.add_argument("--tick-timeout-seconds", type=int, default=DEFAULT_TIMEOUT_SECONDS)
    ap.add_argument("--child-timeout-seconds", type=int, default=DEFAULT_TIMEOUT_SECONDS)
    ap.add_argument("--doctor-timeout-seconds", type=int, default=120)
    ap.add_argument("--repair-timeout-seconds", type=int, default=180)
    ap.add_argument("--verify-timeout-seconds", type=int, default=240)
    ap.add_argument("--execution-profile", choices=["stable", "efficient", "speed", "forensic"], default="stable")
    ap.add_argument("--archive-mode", choices=["light", "full", "both"], default="both")
    ap.add_argument("--full-json-check", choices=["all", "sample", "none"], default="sample")
    ap.add_argument("--parent-full-json-check", choices=["all", "sample", "none"], default="sample")
    ap.add_argument("--doctor-every-tick", action="store_true", help="Più sicuro ma più lento: doctor dopo ogni tick.")
    ap.add_argument("--verify-every", type=int, default=0, help="Verify periodico ogni N tick; 0 = solo finale.")
    ap.add_argument("--profile")
    ap.add_argument("--semantic-trace")
    ap.add_argument("--scenario-blueprint")
    ap.add_argument("--initial-calibration")
    ap.add_argument("--questionnaire")
    ap.add_argument("--notes")
    ap.add_argument("--preflight-only", action="store_true", help="Valida percorsi, run_id e piano tick senza eseguire il runner.")
    return ap.parse_args()


def main() -> int:
    args = parse_args()
    result = run_local_longrun(args)
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0 if result.get("ok") else 2


if __name__ == "__main__":
    raise SystemExit(main())
