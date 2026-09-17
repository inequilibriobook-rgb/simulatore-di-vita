#!/usr/bin/env python3
"""
M20 — Final Long-Run Pipeline + Archive Statistical Audit
=========================================================
Pipeline locale CODE-FIRST per Simulatore 3.2.

Esegue in sequenza controllata:
1. local_long_run_executor.py  → tick/resume/doctor/verify;
2. archive_completeness_statistical_audit.py → audit archivistico-statistico LIGHT/FULL;
3. pacchetto report finale senza includere gli archivi pesanti.

Non modifica core, runner, formula, pesi, clamp, dado o logica dei margini.
"""
from __future__ import annotations
import argparse, json, os, re, subprocess, sys, time, zipfile
from pathlib import Path
from typing import Any, Dict, List, Optional
VERSION = "M20_FINAL_PIPELINE_ARCHIVE_AUDIT_0_1"
ROOT = Path(__file__).resolve().parent
DEFAULT_CORE = ROOT / "simulatore_v31_core_finale.py"
DEFAULT_RUNNER = ROOT / "simulatore_v31_time04_4_40_STEP8C_CODE_FIRST_runner.py"
DEFAULT_LOCAL_EXECUTOR = ROOT / "local_long_run_executor.py"
DEFAULT_ARCHIVE_AUDIT = ROOT / "archive_completeness_statistical_audit.py"
DEFAULT_OUT_DIR = ROOT / "runs_local_longrun"
SAFE_ID_RE = re.compile(r"^[A-Za-z0-9_.-]{1,80}$")
MAX_BLOCK_SIZE = 5000

def read_json(path: Path) -> Dict[str, Any]:
    try: return json.loads(path.read_text(encoding='utf-8'))
    except Exception: return {}

def write_json_atomic(path: Path, data: Dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + '.tmp')
    tmp.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')
    os.replace(tmp, path)

def run_process(cmd: List[str], timeout: int, label: str, cwd: Path) -> Dict[str, Any]:
    started = time.time()
    try:
        proc = subprocess.run(cmd, cwd=str(cwd), text=True, capture_output=True, timeout=timeout)
        stdout = proc.stdout or ''; stderr = proc.stderr or ''
        parsed: Optional[Dict[str, Any]] = None
        try: parsed = json.loads(stdout) if stdout.strip() else None
        except Exception: parsed = None
        return {'label': label, 'ok': proc.returncode == 0, 'returncode': proc.returncode, 'elapsed_seconds': round(time.time()-started,3), 'timeout': False, 'stdout_json': parsed, 'stdout_tail': stdout[-20000:], 'stderr_tail': stderr[-20000:], 'cmd_tail': cmd[-18:]}
    except subprocess.TimeoutExpired as exc:
        return {'label': label, 'ok': False, 'returncode': None, 'elapsed_seconds': round(time.time()-started,3), 'timeout': True, 'stdout_json': None, 'stdout_tail': (exc.stdout or '')[-20000:] if isinstance(exc.stdout, str) else '', 'stderr_tail': (exc.stderr or '')[-20000:] if isinstance(exc.stderr, str) else '', 'error': 'pipeline_timeout', 'cmd_tail': cmd[-18:]}

def safe_run_id(value: str) -> str:
    if value is None or str(value).strip() == '': raise ValueError('run_id obbligatorio e non vuoto')
    run_id = str(value).strip()
    if not SAFE_ID_RE.match(run_id): raise ValueError('run_id non sicuro: usa solo lettere, numeri, punto, trattino, underscore')
    return run_id

def completed_nodes(run_dir: Path) -> int:
    try: return int((read_json(run_dir/'checkpoint.json')).get('completed_nodes') or 0)
    except Exception: return 0

def path_size(path: Path) -> int:
    if not path.exists(): return 0
    if path.is_file(): return path.stat().st_size
    return sum(p.stat().st_size for p in path.rglob('*') if p.is_file())

def make_reports_zip(run_dir: Path, pipeline_out: Path, zip_path: Path) -> Path:
    zip_path.parent.mkdir(parents=True, exist_ok=True)
    if zip_path.exists(): zip_path.unlink()
    include_files: List[Path] = []
    for name in ['manifest.json','checkpoint.json','report_latest.json','local_long_run_executor_latest.json','local_long_run_executor_events.jsonl']:
        p = run_dir/name
        if p.exists() and p.is_file(): include_files.append(p)
    for root in [pipeline_out, run_dir/'m19_archive_audit']:
        if root.exists(): include_files.extend([p for p in root.rglob('*') if p.is_file()])
    with zipfile.ZipFile(zip_path, 'w', compression=zipfile.ZIP_DEFLATED) as zf:
        for p in include_files:
            if run_dir in p.parents or p == run_dir: arc = Path('run') / p.relative_to(run_dir)
            elif pipeline_out in p.parents or p == pipeline_out: arc = Path('pipeline_reports') / p.relative_to(pipeline_out)
            else: arc = p.name
            zf.write(p, arcname=str(arc))
    return zip_path

def validate_args(args: argparse.Namespace) -> Dict[str, Any]:
    problems: List[Dict[str, Any]] = []
    try: safe_run_id(args.run_id)
    except Exception as exc: problems.append({'type':'bad_run_id','exception':repr(exc)})
    for label, p in [('core', Path(args.core)),('runner', Path(args.runner)),('local_executor', Path(args.local_executor)),('archive_audit', Path(args.archive_audit))]:
        if not p.exists() or not p.is_file(): problems.append({'type':f'{label}_missing','path':str(p)})
    if int(args.nodes) < 1: problems.append({'type':'bad_nodes','value':args.nodes})
    if int(args.block_size) < 1 or int(args.block_size) > MAX_BLOCK_SIZE: problems.append({'type':'bad_block_size','value':args.block_size,'max':MAX_BLOCK_SIZE})
    return {'ok': len(problems)==0, 'version': VERSION, 'problems': problems}

def build_local_executor_cmd(args: argparse.Namespace) -> List[str]:
    cmd = [sys.executable, str(Path(args.local_executor).resolve()), '--runner', str(Path(args.runner).resolve()), '--core', str(Path(args.core).resolve()), '--out-dir', str(Path(args.out_dir).resolve()), '--run-id', safe_run_id(args.run_id), '--nodes', str(int(args.nodes)), '--block-size', str(int(args.block_size)), '--max-ticks', str(int(args.max_ticks)), '--execution-profile', str(args.execution_profile), '--tick-timeout-seconds', str(int(args.tick_timeout_seconds)), '--child-timeout-seconds', str(int(args.child_timeout_seconds)), '--verify-every', str(int(args.verify_every))]
    if bool(args.doctor_every_tick): cmd.append('--doctor-every-tick')
    if bool(args.preflight_only): cmd.append('--preflight-only')
    for attr, flag in [('profile','--profile'),('semantic_trace','--semantic-trace'),('scenario_blueprint','--scenario-blueprint'),('initial_calibration','--initial-calibration'),('questionnaire','--questionnaire'),('notes','--notes')]:
        value = getattr(args, attr, None)
        if value: cmd += [flag, str(value)]
    return cmd

def should_run_audit(args: argparse.Namespace, local_result: Dict[str, Any], run_dir: Path) -> bool:
    if args.audit_after == 'never' or args.preflight_only: return False
    if args.audit_after == 'always': return True
    lr = local_result.get('stdout_json') or {}
    if args.audit_after == 'complete': return bool(lr.get('ok')) and int(lr.get('completed_nodes') or completed_nodes(run_dir)) >= int(args.nodes)
    if args.audit_after == 'verified': return bool(lr.get('ok')) and completed_nodes(run_dir) > 0
    return False

def run_pipeline(args: argparse.Namespace) -> Dict[str, Any]:
    started = time.time(); validation = validate_args(args)
    out_dir = Path(args.out_dir).resolve(); run_id = safe_run_id(args.run_id); run_dir = out_dir/run_id
    pipeline_out = run_dir/'m20_final_pipeline'; pipeline_out.mkdir(parents=True, exist_ok=True)
    summary_path = pipeline_out/'m20_final_pipeline_summary.json'
    if not validation.get('ok'):
        write_json_atomic(summary_path, validation); return validation
    local_cmd = build_local_executor_cmd(args)
    local_result = run_process(local_cmd, int(args.local_timeout_seconds), 'local_long_run_executor', ROOT)
    audit_result = None; audit_cmd = None; audit_out_dir = run_dir/'m19_archive_audit'
    if should_run_audit(args, local_result, run_dir):
        audit_cmd = [sys.executable, str(Path(args.archive_audit).resolve()), '--run-dir', str(run_dir), '--out-dir', str(audit_out_dir), '--mode', str(args.audit_mode), '--json-only']
        audit_result = run_process(audit_cmd, int(args.audit_timeout_seconds), 'archive_completeness_statistical_audit', ROOT)
    run_complete = completed_nodes(run_dir) >= int(args.nodes)
    local_json = local_result.get('stdout_json') or {}; audit_json = (audit_result or {}).get('stdout_json') if audit_result else None
    audit_ok = None if audit_result is None else bool(audit_result.get('ok'))
    if args.preflight_only:
        final_ok = bool(local_result.get('ok'))
        status = 'preflight_only_ok' if final_ok else 'preflight_only_failed'
    else:
        final_ok = bool(local_result.get('ok')) and (run_complete or args.audit_after in {'verified','always','never'}) and (audit_ok is not False)
        if args.audit_after == 'complete' and not run_complete:
            final_ok = False
        status = 'complete_with_archive_audit' if final_ok and run_complete and audit_result else ('partial_verified' if local_result.get('ok') else 'local_executor_problem')
    zip_path = pipeline_out / f'{run_id}_M20_REPORTS_ONLY.zip'
    summary = {'ok': bool(final_ok), 'version': VERSION, 'status': status, 'run_id': run_id, 'run_dir': str(run_dir), 'target_nodes': int(args.nodes), 'completed_nodes': completed_nodes(run_dir), 'run_complete': bool(run_complete), 'execution_profile': args.execution_profile, 'block_size': int(args.block_size), 'max_ticks': int(args.max_ticks), 'audit_mode': args.audit_mode, 'audit_after': args.audit_after, 'archive_total_bytes_current': path_size(run_dir/'blocks') + path_size(run_dir/'full'), 'local_executor_result': local_json, 'local_executor_process': {k:v for k,v in local_result.items() if k != 'stdout_json'}, 'archive_audit_result': audit_json, 'archive_audit_process': ({k:v for k,v in audit_result.items() if k != 'stdout_json'} if audit_result else None), 'reports_zip': str(zip_path), 'elapsed_seconds': round(time.time()-started,3), 'commands': {'local_executor': local_cmd, 'archive_audit': audit_cmd}, 'safety_rule': 'Core/formula/runner math unchanged. M20 only orchestrates local long-run plus read-only M19 archive audit.'}
    write_json_atomic(summary_path, summary)
    make_reports_zip(run_dir, pipeline_out, zip_path)
    summary['reports_zip_size_bytes'] = zip_path.stat().st_size if zip_path.exists() else 0
    write_json_atomic(summary_path, summary)
    return summary

def parse_args() -> argparse.Namespace:
    ap = argparse.ArgumentParser(description='M20 Final Pipeline: long-run locale + audit archivistico-statistico')
    ap.add_argument('--runner', default=str(DEFAULT_RUNNER)); ap.add_argument('--core', default=str(DEFAULT_CORE)); ap.add_argument('--local-executor', default=str(DEFAULT_LOCAL_EXECUTOR)); ap.add_argument('--archive-audit', default=str(DEFAULT_ARCHIVE_AUDIT)); ap.add_argument('--out-dir', default=str(DEFAULT_OUT_DIR)); ap.add_argument('--run-id', required=True); ap.add_argument('--nodes', type=int, required=True); ap.add_argument('--block-size', type=int, default=5000); ap.add_argument('--max-ticks', type=int, default=1); ap.add_argument('--execution-profile', choices=['stable','efficient','speed','forensic'], default='stable'); ap.add_argument('--verify-every', type=int, default=10); ap.add_argument('--doctor-every-tick', action='store_true'); ap.add_argument('--tick-timeout-seconds', type=int, default=180); ap.add_argument('--child-timeout-seconds', type=int, default=180); ap.add_argument('--local-timeout-seconds', type=int, default=3600); ap.add_argument('--audit-timeout-seconds', type=int, default=1800); ap.add_argument('--audit-mode', choices=['quick','sample','all'], default='sample'); ap.add_argument('--audit-after', choices=['complete','verified','always','never'], default='complete'); ap.add_argument('--preflight-only', action='store_true'); ap.add_argument('--profile'); ap.add_argument('--semantic-trace'); ap.add_argument('--scenario-blueprint'); ap.add_argument('--initial-calibration'); ap.add_argument('--questionnaire'); ap.add_argument('--notes'); ap.add_argument('--json-only', action='store_true')
    return ap.parse_args()

def main() -> int:
    args = parse_args()
    try: summary = run_pipeline(args)
    except Exception as exc: summary = {'ok': False, 'version': VERSION, 'error': 'pipeline_exception', 'exception': repr(exc)}
    print(json.dumps(summary, ensure_ascii=False, indent=None if args.json_only else 2))
    return 0 if summary.get('ok') else 1
if __name__ == '__main__': raise SystemExit(main())
