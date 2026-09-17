"""
Simulatore V3.1 — TIME 04.4.5 SELF-CONTAINED ORPHAN RECOVERY RUNNER
Runner esterno, NON modifica il core. Helper incorporato, verify/doctor/resume severo, repair prudente, self-test automatico, recupero blocchi orfani con receipt atomica e quarantena dei sidecar temporanei .tmp-wal/.tmp-shm.

Miglioramento rispetto a TIME 04.3:
- LIGHT: SQLite partizionato in colonne, veloce da interrogare;
- FULL: JSONL.GZ sidecar per blocco, una riga JSON completa per nodo;
- niente BLOB gzip per ogni nodo dentro SQLite: molto più veloce e più adatto a giga di dati;
- processo figlio per blocco, checkpoint atomico, index.sqlite, manifest, events.jsonl;
- resume sicuro per 200k+ nodi.
"""
from __future__ import annotations

import argparse, base64, gzip, hashlib, importlib.util, json, os, pickle, random, re, shutil, signal, sqlite3, subprocess, sys, tarfile, time
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

VERSION = "TIME_04_4_40_STEP8C_METADATA_PERSISTENCE_ANTI_TIMEOUT_SAFE_TICK_S08_VERIFY_LIGHT_FIX"
DEFAULT_CORE = str(Path(__file__).with_name("simulatore_v31_core_finale.py"))
if not Path(DEFAULT_CORE).exists():
    DEFAULT_CORE = str(Path(__file__).with_name("00-simulatore_v31_core_finale (5).py"))
if not Path(DEFAULT_CORE).exists():
    DEFAULT_CORE = "/mnt/data/00-simulatore_v31_core_finale (5).py"
if not Path(DEFAULT_CORE).exists():
    DEFAULT_CORE = "/mnt/data/simulatore_v31_core_finale.py"
if not Path(DEFAULT_CORE).exists():
    DEFAULT_CORE = "/mnt/data/simulatore_v31_core_finale (4).py"
if not Path(DEFAULT_CORE).exists():
    DEFAULT_CORE = "/mnt/data/simulatore_v31_TIME_04_2_FINALE/simulatore_v31_core_finale.py"
if not Path(DEFAULT_CORE).exists():
    DEFAULT_CORE = "/mnt/data/simulatore_v31_core_TIME_04_3_baseline_no_core_change.py"
DEFAULT_OUT_DIR = "/mnt/data/v31_time04_4_1_runs"
DEFAULT_BLOCK_SIZE = 5000
MAX_BLOCK_SIZE = 5000

# TIME 04.4.1 self-contained: l'helper TIME 04.3 è incorporato qui.
# Il core resta esterno e NON viene modificato.
DEFAULT_HELPER = "__embedded_time043_helper__"


def _pdeathsig_preexec() -> None:
    """Linux-only guard: if the parent runner/wrapper dies, the child receives SIGTERM.

    This prevents long child writers from surviving an external timeout while the
    parent process has already been killed. It is best-effort and silently no-ops
    outside Linux/libc environments.
    """
    try:
        import ctypes
        libc = ctypes.CDLL("libc.so.6")
        PR_SET_PDEATHSIG = 1
        libc.prctl(PR_SET_PDEATHSIG, signal.SIGTERM)
    except Exception:
        pass


def load_module(path: str, name: str):
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        raise ImportError(path)
    mod = importlib.util.module_from_spec(spec)
    sys.modules[name] = mod
    spec.loader.exec_module(mod)  # type: ignore[attr-defined]
    return mod


LIGHT_SCHEMA_SQL = """
PRAGMA journal_mode=WAL;
PRAGMA synchronous=NORMAL;
CREATE TABLE IF NOT EXISTS nodes_light (
    global_step INTEGER PRIMARY KEY,
    run_id TEXT NOT NULL,
    block_no INTEGER NOT NULL,
    local_index INTEGER NOT NULL,
    node_id TEXT,
    description TEXT,
    family_code TEXT,
    p0 INTEGER,
    e INTEGER,
    i INTEGER,
    t INTEGER,
    m INTEGER,
    bp_node INTEGER,
    bp_state INTEGER,
    c INTEGER,
    str_before INTEGER,
    pos_before INTEGER,
    deb_before INTEGER,
    rip_before TEXT,
    pn INTEGER,
    roll INTEGER,
    success_before_field INTEGER,
    raw_margin INTEGER,
    field_margin INTEGER,
    net_margin INTEGER,
    kpd_active INTEGER,
    kpd_strength INTEGER,
    kpd_label TEXT,
    outcome TEXT,
    risk_level TEXT,
    str_after INTEGER,
    pos_after INTEGER,
    deb_after INTEGER,
    rip_after TEXT,
    hidden_cost_before INTEGER,
    hidden_cost_delta INTEGER,
    hidden_cost_after INTEGER,
    micro_action INTEGER,
    care_recovery INTEGER,
    damping REAL,
    or1_before REAL,
    or1_after REAL,
    ri4_before REAL,
    ri4_after REAL,
    floor1_after INTEGER,
    cooldown_after INTEGER,
    profile TEXT,
    support_kind TEXT,
    delegation_kind TEXT,
    adaptation_kind TEXT,
    levers_json TEXT,
    warnings_json TEXT,
    notes_json TEXT,
    created_ts REAL
);
CREATE INDEX IF NOT EXISTS idx_nodes_light_block ON nodes_light(block_no);
CREATE INDEX IF NOT EXISTS idx_nodes_light_outcome ON nodes_light(outcome);
CREATE INDEX IF NOT EXISTS idx_nodes_light_risk ON nodes_light(risk_level);
CREATE INDEX IF NOT EXISTS idx_nodes_light_family ON nodes_light(family_code);
"""

LIGHT_COLUMNS = [
    "global_step", "run_id", "block_no", "local_index", "node_id", "description", "family_code",
    "p0", "e", "i", "t", "m", "bp_node", "bp_state", "c",
    "str_before", "pos_before", "deb_before", "rip_before",
    "pn", "roll", "success_before_field", "raw_margin", "field_margin", "net_margin",
    "kpd_active", "kpd_strength", "kpd_label", "outcome", "risk_level",
    "str_after", "pos_after", "deb_after", "rip_after",
    "hidden_cost_before", "hidden_cost_delta", "hidden_cost_after",
    "micro_action", "care_recovery", "damping", "or1_before", "or1_after", "ri4_before", "ri4_after",
    "floor1_after", "cooldown_after", "profile", "support_kind", "delegation_kind", "adaptation_kind",
    "levers_json", "warnings_json", "notes_json", "created_ts",
]
LIGHT_INSERT_SQL = "INSERT INTO nodes_light (" + ",".join(LIGHT_COLUMNS) + ") VALUES (" + ",".join(["?"] * len(LIGHT_COLUMNS)) + ")"


def _enum_value(value: Any) -> str:
    return getattr(value, "value", str(value))


def _str_penalty_value(str_value: int) -> int:
    try:
        s = int(round(float(str_value)))
    except Exception:
        s = 0
    s = max(0, min(100, s))
    if s <= 39:
        return 0
    if s <= 59:
        return 5
    if s <= 69:
        return 10
    if s <= 79:
        return 15
    if s <= 89:
        return 20
    return 25


def helper_state_from_data(core: Any, data: Dict[str, Any]) -> Any:
    if hasattr(core, "state_from_dict"):
        return core.state_from_dict(data or {}).normalized()
    data = data or {}
    ri4 = data.get("ri4") or {}
    return core.SystemState(
        stress_str=data.get("stress_str", 45),
        position_pos=data.get("position_pos", 62),
        debt_deb=data.get("debt_deb", 0),
        protective_bonus_bp=data.get("protective_bonus_bp", 0),
        rip=data.get("rip", "assente"),
        or1_orientation=data.get("or1_orientation", 0.5),
        ri4=core.Ri4State(**{k: ri4.get(k, 0.5) for k in ["rientro", "riparazione", "riduzione", "ripresa"]}),
        macro=data.get("macro", "macro_0_episodio_isolato"),
        cooldown_remaining=data.get("cooldown_remaining", 0),
        floor1_active=data.get("floor1_active", False),
        floor1_reason=data.get("floor1_reason", ""),
        hidden_cost=data.get("hidden_cost", 0),
    ).normalized()


def helper_make_node(core: Any, rng: random.Random, step: int, state: Any) -> Any:
    families = list(core.LIFE_FAMILIES.keys())
    family = families[(step - 1) % len(families)]
    desc_pool = [
        "bere acqua lentamente",
        "appoggiarsi al tavolo",
        "password app OTP",
        "dialogo di coppia teso",
        "guidare con traffico",
        "pratica online ambigua",
        "cura persona fragile",
        "deadline lavoro",
        "spesa con folla",
        "bambino interrompe",
        "lavarsi il viso",
        "oggetto smarrito",
        "telefonata burocratica con attesa",
        "figli piccoli e urgenza",
        "suoceri genitori confini",
        "fare benzina con carta respinta",
    ]
    desc = desc_pool[(step - 1) % len(desc_pool)]
    p0 = rng.randint(30, 96)
    mods = core.Modifiers(
        energy_e=rng.randint(-20, 16),
        information_i=rng.randint(-16, 14),
        time_t=rng.randint(-18, 12),
        material_m=rng.randint(-14, 12),
        protective_bonus_bp=rng.randint(0, 12),
        complexity_c=rng.randint(0, 7),
    )
    kpd_active = rng.random() < 0.24
    field = core.FieldResponse(
        active=kpd_active,
        label=("campo attivo" if kpd_active else ""),
        strength=(rng.randint(1, 38) if kpd_active else 0),
    )
    support_kind = rng.choice([
        core.SupportKind.ASSENTE, core.SupportKind.PRATICO, core.SupportKind.INFORMATIVO,
        core.SupportKind.LOGISTICO, core.SupportKind.SIMBOLICO, core.SupportKind.INEFFICACE,
        core.SupportKind.INVASIVO, core.SupportKind.PROFESSIONALE,
    ])
    delegation_kind = rng.choice([
        core.DelegationKind.ASSENTE, core.DelegationKind.PARZIALE, core.DelegationKind.REALE,
        core.DelegationKind.FINTA, core.DelegationKind.TARDIVA, core.DelegationKind.INCOMPETENTE,
        core.DelegationKind.INVASIVA,
    ])
    support = core.SupportContext(
        support_kind=support_kind,
        delegation_kind=delegation_kind,
        load_reduction_score=rng.random() * 0.9,
        competence_score=rng.random() * 0.95,
        timely=rng.random() < 0.65,
        boundary_cost=rng.random() * 0.7,
    )
    adapt = core.AdaptationContext(
        kind=rng.choice(list(core.AdaptationKind)),
        availability=rng.choice(list(core.AvailabilityKind)),
        expected_load_reduction=rng.random() * 0.75,
        expected_clarity_gain=rng.randint(-4, 10),
        expected_time_gain=rng.randint(-5, 8),
        expected_complexity_reduction=rng.randint(0, 4),
        expected_material_gain=rng.randint(-3, 8),
        expected_energy_gain=rng.randint(-3, 8),
        creates_real_rip=rng.random() < 0.20,
        cost_of_adaptation=rng.randint(0, 20),
    )
    profile = rng.choice(list(core.HumanProfileKind))
    tags = ["stress", "longrun", "micro" if step % 13 == 0 else "ordinary", "time0441"]
    return core.NodeInput(f"node_{step}", desc, p0, mods, state, field, support, adapt, profile, family, tags).normalized()


def helper_light_row_from(core: Any, run_id: str, step: int, block_no: int, local_index: int, node: Any, result: Any, ts: float) -> tuple:
    sb = result.state_before.normalized()
    sa = result.state_after.normalized()
    md = result.levers.get("micro_action_v3_1", {}) if isinstance(result.levers, dict) else {}
    return (
        step, run_id, block_no, local_index, result.node_id, result.description, result.family_code,
        node.base_probability_p0, node.modifiers.energy_e, node.modifiers.information_i, node.modifiers.time_t, node.modifiers.material_m,
        node.modifiers.protective_bonus_bp, sb.protective_bonus_bp, node.modifiers.complexity_c,
        sb.stress_str, sb.position_pos, sb.debt_deb, _enum_value(sb.rip),
        result.probability_pn, result.roll, int(result.success_before_field), result.raw_margin, result.field_margin, result.net_margin,
        int(node.field_response.active), node.field_response.strength, node.field_response.label,
        _enum_value(result.outcome), _enum_value(result.risk_level),
        sa.stress_str, sa.position_pos, sa.debt_deb, _enum_value(sa.rip),
        sb.hidden_cost, result.hidden_cost_delta, sa.hidden_cost,
        int(bool(md.get("v3_1_micro_action"))), int(bool(md.get("v3_1_care_recovery_action"))), float(md.get("v3_1_damping_factor") or 1.0),
        sb.or1_orientation, sa.or1_orientation, sb.ri4.score, sa.ri4.score,
        int(sa.floor1_active), sa.cooldown_remaining,
        _enum_value(node.profile), _enum_value(node.support.support_kind), _enum_value(node.support.delegation_kind), _enum_value(node.adaptation.kind),
        json.dumps(core.to_plain_data(result.levers), ensure_ascii=False, separators=(",", ":")),
        json.dumps(result.warnings, ensure_ascii=False, separators=(",", ":")),
        json.dumps(result.operational_notes, ensure_ascii=False, separators=(",", ":")),
        ts,
    )


def helper_full_obj_from(core: Any, run_id: str, step: int, block_no: int, local_index: int, node: Any, result: Any, ts: float) -> Dict[str, Any]:
    return {
        "version": VERSION,
        "run_id": run_id,
        "global_step": step,
        "block_no": block_no,
        "local_index": local_index,
        "created_ts": ts,
        "node_input": core.to_plain_data(node),
        "node_result": core.to_plain_data(result),
        "canonical_formula": "Pn = clamp[5,95](P0 + E + I + T + M + BP - 5C - piSTR(STR) - 5DEB)",
    }


def helper_verify_block(db_path: Path, start_step: int, end_step: int, archive_mode: str = "light", full_json_check: str = "none") -> Dict[str, Any]:
    expected = end_step - start_step + 1
    if not Path(db_path).exists():
        return {
            "verified": False, "rows_light": 0, "rows_full": 0, "min_step": None, "max_step": None,
            "min_pn": None, "max_pn": None, "pn_out_of_clamp": expected,
            "formula_mismatches": expected, "margin_mismatches": expected, "json_bad": 0,
            "errors": [{"type": "missing_db", "path": str(db_path)}],
        }
    con = sqlite3.connect(str(db_path), timeout=60)
    con.row_factory = sqlite3.Row
    errors: List[Dict[str, Any]] = []
    try:
        base = con.execute(
            """
            SELECT COUNT(*) AS rows_light, COUNT(DISTINCT global_step) AS distinct_steps,
                   MIN(global_step) AS min_step, MAX(global_step) AS max_step,
                   MIN(pn) AS min_pn, MAX(pn) AS max_pn,
                   COALESCE(SUM(CASE WHEN pn < 5 OR pn > 95 THEN 1 ELSE 0 END),0) AS pn_out_of_clamp
            FROM nodes_light
            WHERE global_step BETWEEN ? AND ?
            """, (start_step, end_step)
        ).fetchone()
        rows_light = int(base["rows_light"] or 0)
        distinct_steps = int(base["distinct_steps"] or 0)
        min_step = base["min_step"]
        max_step = base["max_step"]
        min_pn = base["min_pn"]
        max_pn = base["max_pn"]
        pn_out = int(base["pn_out_of_clamp"] or 0)
        if rows_light != expected:
            errors.append({"type": "rows_light_mismatch", "expected": expected, "actual": rows_light})
        if distinct_steps != rows_light:
            errors.append({"type": "duplicate_steps", "rows": rows_light, "distinct": distinct_steps})
        if rows_light and min_step != start_step:
            errors.append({"type": "min_step_mismatch", "expected": start_step, "actual": min_step})
        if rows_light and max_step != end_step:
            errors.append({"type": "max_step_mismatch", "expected": end_step, "actual": max_step})
        formula_mismatches = int(con.execute(
            """
            WITH calc AS (
                SELECT global_step, pn,
                       CASE
                         WHEN raw_calc < 5 THEN 5
                         WHEN raw_calc > 95 THEN 95
                         ELSE CAST(ROUND(raw_calc) AS INTEGER)
                       END AS expected_pn
                FROM (
                    SELECT global_step, pn,
                           (p0 + e + i + t + m + bp_node + bp_state - 5*c
                            - CASE
                                WHEN str_before <= 39 THEN 0
                                WHEN str_before <= 59 THEN 5
                                WHEN str_before <= 69 THEN 10
                                WHEN str_before <= 79 THEN 15
                                WHEN str_before <= 89 THEN 20
                                ELSE 25
                              END
                            - 5*deb_before) AS raw_calc
                    FROM nodes_light
                    WHERE global_step BETWEEN ? AND ?
                )
            )
            SELECT COALESCE(SUM(CASE WHEN pn != expected_pn THEN 1 ELSE 0 END),0) FROM calc
            """, (start_step, end_step)
        ).fetchone()[0] or 0)
        margin_mismatches = int(con.execute(
            """
            SELECT COALESCE(SUM(CASE WHEN
                success_before_field != CASE WHEN roll <= pn THEN 1 ELSE 0 END
                OR raw_margin != ABS(pn - roll)
                OR net_margin != CASE WHEN roll <= pn THEN ABS(pn - roll) - field_margin ELSE -ABS(pn - roll) - field_margin END
            THEN 1 ELSE 0 END),0)
            FROM nodes_light
            WHERE global_step BETWEEN ? AND ?
            """, (start_step, end_step)
        ).fetchone()[0] or 0)
        rows_full = 0
        json_bad = 0
        # Compatibilità con TIME 04.3: se esiste nodes_full dentro SQLite, lo verifichiamo leggermente.
        has_nodes_full = con.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='nodes_full'").fetchone() is not None
        if has_nodes_full:
            rows_full = int(con.execute("SELECT COUNT(*) FROM nodes_full WHERE global_step BETWEEN ? AND ?", (start_step, end_step)).fetchone()[0] or 0)
            if archive_mode in {"full", "both"} and rows_full != expected:
                json_bad += abs(expected - rows_full)
            if full_json_check in {"all", "sample"}:
                q = "SELECT global_step, full_json_gz FROM nodes_full WHERE global_step BETWEEN ? AND ? ORDER BY global_step"
                cursor = con.execute(q, (start_step, end_step))
                for n, row in enumerate(cursor, start=1):
                    if full_json_check == "sample" and n > 25 and n <= max(25, rows_full - 25):
                        continue
                    try:
                        obj = json.loads(gzip.decompress(row["full_json_gz"]).decode("utf-8"))
                        if int(obj.get("global_step")) != int(row["global_step"]):
                            json_bad += 1
                    except Exception:
                        json_bad += 1
        verified = (
            rows_light == expected and distinct_steps == rows_light and min_step == start_step and max_step == end_step
            and pn_out == 0 and formula_mismatches == 0 and margin_mismatches == 0 and json_bad == 0
        )
        return {
            "verified": bool(verified),
            "rows_light": rows_light,
            "rows_full": rows_full,
            "min_step": min_step,
            "max_step": max_step,
            "min_pn": min_pn,
            "max_pn": max_pn,
            "pn_out_of_clamp": pn_out,
            "formula_mismatches": formula_mismatches,
            "margin_mismatches": margin_mismatches,
            "json_bad": json_bad,
            "errors": errors,
        }
    except Exception as e:
        return {
            "verified": False, "rows_light": 0, "rows_full": 0, "min_step": None, "max_step": None,
            "min_pn": None, "max_pn": None, "pn_out_of_clamp": 0,
            "formula_mismatches": 0, "margin_mismatches": 0, "json_bad": 0,
            "errors": [{"type": "verify_exception", "exception": repr(e)}],
        }
    finally:
        con.close()


class _EmbeddedHelper:
    LIGHT_SCHEMA_SQL = LIGHT_SCHEMA_SQL
    LIGHT_INSERT_SQL = LIGHT_INSERT_SQL
    make_node = staticmethod(helper_make_node)
    light_row_from = staticmethod(helper_light_row_from)
    full_obj_from = staticmethod(helper_full_obj_from)
    verify_block = staticmethod(helper_verify_block)
    state_from_data = staticmethod(helper_state_from_data)


h = _EmbeddedHelper()


def resolve_artifact_path(run_dir: Path, stored_path: Optional[str], subdir: str) -> Optional[Path]:
    if not stored_path:
        return None
    raw = Path(str(stored_path))
    # Le path in index.sqlite possono essere assolute e riferite alla run originale.
    # Verify/doctor devono controllare l'archivio corrente, quindi usano sempre run_dir.
    return run_dir / subdir / raw.name


def doctor_run_dir(run_dir: Path, mode: str = "sample") -> Dict[str, Any]:
    run_dir = Path(run_dir)
    if not run_dir.exists():
        return {
            "ok": False,
            "version": VERSION,
            "run_dir": str(run_dir),
            "manifest_version": None,
            "checkpoint_completed_nodes": 0,
            "checkpoint_completed_blocks": 0,
            "checkpoint_status": None,
            "safe_completed_nodes": 0,
            "safe_completed_blocks": 0,
            "can_resume_strictly": False,
            "next_start_step": 1,
            "disk": {"sqlite_files": [], "sqlite_tmp": [], "full_files": [], "full_tmp": [], "sqlite_count": 0, "full_count": 0, "sqlite_tmp_count": 0, "full_tmp_count": 0},
            "verified_rows_contiguous": 0,
            "verified_full_rows_contiguous": 0,
            "pn_out_of_clamp": 0,
            "formula_mismatches": 0,
            "margin_mismatches": 0,
            "json_bad": 0,
            "problems": [{"type": "run_dir_missing", "path": str(run_dir)}],
            "warnings": [],
            "checked_blocks": 0,
            "block_details_sample": [],
        }
    checkpoint_path = run_dir / "checkpoint.json"
    index_path = run_dir / "index.sqlite"
    manifest_path = run_dir / "manifest.json"
    blocks_dir = run_dir / "blocks"
    full_dir = run_dir / "full"
    cp = read_json(checkpoint_path) or {}
    manifest = read_json(manifest_path) or {}
    problems: List[Dict[str, Any]] = []
    warnings: List[Dict[str, Any]] = []
    receipts_dir = run_dir / "receipts"
    disk = {
        "sqlite_files": sorted(str(p) for p in blocks_dir.glob("*.sqlite")) if blocks_dir.exists() else [],
        "sqlite_tmp": sorted(str(p) for p in blocks_dir.glob("*.tmp*")) if blocks_dir.exists() else [],
        "full_files": sorted(str(p) for p in full_dir.glob("*.jsonl.gz")) if full_dir.exists() else [],
        "full_tmp": sorted(str(p) for p in full_dir.glob("*.tmp*")) if full_dir.exists() else [],
        "receipt_files": sorted(str(p) for p in receipts_dir.glob("*.receipt.json")) if receipts_dir.exists() else [],
    }
    disk.update({"sqlite_count": len(disk["sqlite_files"]), "full_count": len(disk["full_files"]), "sqlite_tmp_count": len(disk["sqlite_tmp"]), "full_tmp_count": len(disk["full_tmp"]), "receipt_count": len(disk["receipt_files"])})
    if disk["sqlite_tmp"] or disk["full_tmp"]:
        problems.append({"type": "tmp_files_present", "sqlite_tmp": disk["sqlite_tmp"][:10], "full_tmp": disk["full_tmp"][:10]})
    if not checkpoint_path.exists():
        warnings.append({"type": "checkpoint_missing", "path": str(checkpoint_path)})
    if not index_path.exists():
        if disk["sqlite_files"]:
            problems.append({"type": "index_missing_but_blocks_exist", "path": str(index_path)})
        return {
            "ok": len(problems) == 0,
            "version": VERSION,
            "run_dir": str(run_dir),
            "manifest_version": manifest.get("version"),
            "checkpoint_completed_nodes": int(cp.get("completed_nodes") or 0),
            "checkpoint_completed_blocks": int(cp.get("completed_blocks") or 0),
            "checkpoint_status": cp.get("status"),
            "safe_completed_nodes": 0,
            "safe_completed_blocks": 0,
            "can_resume_strictly": len(problems) == 0 and not disk["sqlite_files"],
            "next_start_step": 1,
            "disk": disk,
            "verified_rows_contiguous": 0,
            "verified_full_rows_contiguous": 0,
            "pn_out_of_clamp": 0,
            "formula_mismatches": 0,
            "margin_mismatches": 0,
            "json_bad": 0,
            "problems": problems,
            "warnings": warnings,
            "checked_blocks": 0,
            "block_details_sample": [],
        }
    con = init_index_db(index_path)
    rows = con.execute("SELECT block_no,start_step,end_step,rows_light,rows_full,sqlite_path,full_path,sqlite_sha256,full_sha256,pn_out_of_clamp,formula_mismatches,margin_mismatches,json_bad,verified FROM blocks ORDER BY block_no").fetchall()
    con.close()
    expected_start = 1
    safe_nodes = 0
    safe_blocks = 0
    verified_full_rows = 0
    totals = {"pn_out_of_clamp": 0, "formula_mismatches": 0, "margin_mismatches": 0, "json_bad": 0}
    details: List[Dict[str, Any]] = []
    for row in rows:
        block_no,start_step,end_step,rows_light,rows_full,sqlite_path,full_path,sqlite_sha256,full_sha256,pn_bad,formula_bad,margin_bad,json_bad,verified = row
        d = {"block_no": block_no, "start_step": start_step, "end_step": end_step, "rows_light": rows_light, "rows_full": rows_full, "sqlite_path": sqlite_path, "full_path": full_path, "problems": []}
        if int(verified) != 1:
            d["problems"].append("index_not_verified")
        if start_step != expected_start:
            d["problems"].append(f"gap_or_overlap_expected_start_{expected_start}")
        sp = resolve_artifact_path(run_dir, sqlite_path, "blocks")
        d["sqlite_resolved_path"] = str(sp) if sp else None
        if not sp or not sp.exists():
            d["problems"].append("sqlite_missing")
        elif sqlite_sha256 and sha256_file(sp) != sqlite_sha256:
            d["problems"].append("sqlite_sha256_mismatch")
        if full_path:
            fp = resolve_artifact_path(run_dir, full_path, "full")
            d["full_resolved_path"] = str(fp) if fp else None
            if not fp or not fp.exists():
                d["problems"].append("full_missing")
            elif full_sha256 and sha256_file(fp) != full_sha256:
                d["problems"].append("full_sha256_mismatch")
            if fp and fp.exists() and mode in {"all", "sample"}:
                fv = verify_full_jsonl_gz(fp, start_step, end_step, mode=mode)
                if int(fv.get("json_bad") or 0) != 0 or int(fv.get("rows_full") or 0) != int(rows_full or 0):
                    d["problems"].append({"full_reverify_failed": fv})
        if not d["problems"] and sp and sp.exists():
            lv = verify_light_db(sp, start_step, end_step)
            if not lv.get("verified"):
                d["problems"].append({"light_reverify_failed": lv})
        if d["problems"]:
            problems.append({"type": "block_invalid", "block_no": block_no, "details": d})
            details.append(d)
            break
        safe_nodes = int(end_step)
        safe_blocks = int(block_no)
        verified_full_rows += int(rows_full or 0)
        totals["pn_out_of_clamp"] += int(pn_bad or 0)
        totals["formula_mismatches"] += int(formula_bad or 0)
        totals["margin_mismatches"] += int(margin_bad or 0)
        totals["json_bad"] += int(json_bad or 0)
        expected_start = int(end_step) + 1
        if len(details) < 5:
            details.append(d)
    cp_nodes = int(cp.get("completed_nodes") or 0)
    cp_blocks = int(cp.get("completed_blocks") or 0)
    if cp_nodes and cp_nodes != safe_nodes:
        problems.append({"type": "checkpoint_index_completed_nodes_mismatch", "checkpoint": cp_nodes, "safe_index": safe_nodes})
    if cp_blocks and cp_blocks != safe_blocks:
        problems.append({"type": "checkpoint_index_completed_blocks_mismatch", "checkpoint": cp_blocks, "safe_index": safe_blocks})
    # TIME 04.4.5: rileva blocchi finali fisicamente presenti ma non coperti da index/checkpoint sicuro.
    # Sono il caso tipico post-child/pre-checkpoint: non sono .tmp, ma possono restare orfani.
    orphan_final_blocks = detect_orphan_final_blocks(run_dir, safe_blocks=safe_blocks, safe_nodes=safe_nodes)
    if orphan_final_blocks:
        problems.append({"type": "orphan_final_blocks_present", "count": len(orphan_final_blocks), "sample": orphan_final_blocks[:5]})
    if any(v != 0 for v in totals.values()):
        problems.append({"type": "index_error_counters_nonzero", **totals})
    return {
        "ok": len(problems) == 0,
        "version": VERSION,
        "run_dir": str(run_dir),
        "manifest_version": manifest.get("version"),
        "checkpoint_completed_nodes": cp_nodes,
        "checkpoint_completed_blocks": cp_blocks,
        "checkpoint_status": cp.get("status"),
        "safe_completed_nodes": safe_nodes,
        "safe_completed_blocks": safe_blocks,
        "can_resume_strictly": len(problems) == 0,
        "next_start_step": safe_nodes + 1,
        "disk": disk,
        "orphan_final_blocks": orphan_final_blocks,
        "verified_rows_contiguous": safe_nodes,
        "verified_full_rows_contiguous": verified_full_rows,
        **totals,
        "problems": problems,
        "warnings": warnings,
        "checked_blocks": safe_blocks,
        "block_details_sample": details,
    }


def doctor_bootstrap(args: argparse.Namespace) -> Dict[str, Any]:
    core_path = str(Path(args.core)) if args.core else DEFAULT_CORE
    out_dir = Path(args.out_dir)
    checks: Dict[str, Any] = {
        "version": VERSION,
        "runner_path": str(Path(__file__)),
        "runner_readable": Path(__file__).exists(),
        "core_path": core_path,
        "core_exists": Path(core_path).exists(),
        "helper_mode": "embedded",
        "out_dir": str(out_dir),
        "out_dir_writable": False,
        "core_import_ok": False,
        "problems": [],
        "warnings": [],
    }
    try:
        out_dir.mkdir(parents=True, exist_ok=True)
        probe = out_dir / ".doctor_write_probe.tmp"
        probe.write_text("ok", encoding="utf-8")
        probe.unlink(missing_ok=True)
        checks["out_dir_writable"] = True
    except Exception as e:
        checks["problems"].append({"type": "out_dir_not_writable", "exception": repr(e)})
    if not checks["core_exists"]:
        checks["problems"].append({"type": "core_missing", "path": core_path})
    else:
        try:
            load_module(core_path, f"doctor_core_{os.getpid()}")
            checks["core_import_ok"] = True
        except Exception as e:
            checks["problems"].append({"type": "core_import_failed", "exception": repr(e)})
    tmp_files = []
    if out_dir.exists():
        for p in out_dir.rglob("*.tmp*"):
            rel = str(p.relative_to(out_dir))
            if "quarantine" in rel or "orphan_blocks" in rel:
                continue
            tmp_files.append(str(p))
    if tmp_files:
        checks["warnings"].append({"type": "tmp_files_present", "count": len(tmp_files), "sample": tmp_files[:10]})
    run_dir = out_dir / args.run_id
    if run_dir.exists():
        checks["run_dir_doctor"] = doctor_run_dir(run_dir, mode=getattr(args, "parent_full_json_check", "sample"))
    checks["ok"] = len(checks["problems"]) == 0
    return checks
INDEX_SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS blocks (
    block_no INTEGER PRIMARY KEY,
    start_step INTEGER NOT NULL,
    end_step INTEGER NOT NULL,
    rows_light INTEGER NOT NULL,
    rows_full INTEGER NOT NULL,
    sqlite_path TEXT NOT NULL,
    full_path TEXT,
    sqlite_sha256 TEXT NOT NULL,
    full_sha256 TEXT,
    min_pn INTEGER,
    max_pn INTEGER,
    pn_out_of_clamp INTEGER NOT NULL,
    formula_mismatches INTEGER NOT NULL,
    margin_mismatches INTEGER NOT NULL,
    json_bad INTEGER NOT NULL,
    verified INTEGER NOT NULL,
    archive_mode TEXT NOT NULL,
    elapsed_seconds REAL,
    sqlite_bytes INTEGER,
    full_bytes INTEGER,
    completed_ts REAL
);
"""

def fsync_file(path: Path) -> None:
    try:
        fd = os.open(str(path), os.O_RDONLY)
        try: os.fsync(fd)
        finally: os.close(fd)
    except Exception: pass

def atomic_write_json(path: Path, data: Dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.flush(); os.fsync(f.fileno())
    os.replace(tmp, path); fsync_file(path)

def append_jsonl(path: Path, data: Dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "a", encoding="utf-8") as f:
        f.write(json.dumps(data, ensure_ascii=False, separators=(",", ":")) + "\n")
        f.flush(); os.fsync(f.fileno())

def read_json(path: Path) -> Optional[Dict[str, Any]]:
    try:
        with open(path, "r", encoding="utf-8") as f: return json.load(f)
    except Exception: return None

def sha256_file(path: Path) -> str:
    hh = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1024*1024), b""):
            hh.update(chunk)
    return hh.hexdigest()

def b64_pickle(obj: Any) -> str:
    return base64.b64encode(pickle.dumps(obj, protocol=pickle.HIGHEST_PROTOCOL)).decode("ascii")

def unb64_pickle(text: str) -> Any:
    return pickle.loads(base64.b64decode(text.encode("ascii")))

def init_light_db(path: Path) -> sqlite3.Connection:
    path.parent.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(str(path), timeout=60)
    con.executescript(h.LIGHT_SCHEMA_SQL)
    con.commit()
    return con

def init_index_db(path: Path) -> sqlite3.Connection:
    path.parent.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(str(path), timeout=60)
    con.executescript(INDEX_SCHEMA_SQL)
    con.commit()
    return con

def upsert_index(index_path: Path, block: Dict[str, Any]) -> None:
    con = init_index_db(index_path)
    try:
        con.execute("INSERT OR REPLACE INTO blocks VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)", (
            block["block_no"], block["start_step"], block["end_step"], block["rows_light"], block["rows_full"],
            block["sqlite_path"], block.get("full_path"), block["sqlite_sha256"], block.get("full_sha256"),
            block.get("min_pn"), block.get("max_pn"), block["pn_out_of_clamp"], block["formula_mismatches"],
            block["margin_mismatches"], block["json_bad"], int(block["verified"]), block["archive_mode"],
            block.get("elapsed_seconds"), block.get("sqlite_bytes"), block.get("full_bytes"), block.get("completed_ts")
        ))
        con.commit()
    finally:
        con.close()

def verify_light_db(db_path: Path, start_step: int, end_step: int) -> Dict[str, Any]:
    v = h.verify_block(db_path, start_step, end_step, "light", full_json_check="none")
    return v

def verify_full_jsonl_gz(path: Path, start_step: int, end_step: int, mode: str = "all") -> Dict[str, Any]:
    expected = end_step - start_step + 1
    rows = 0; bad = 0; first = None; last = None
    if not path.exists():
        return {"rows_full": 0, "json_bad": expected, "first_step": None, "last_step": None, "error": "missing_full_file"}
    try:
        with gzip.open(path, "rt", encoding="utf-8") as f:
            for line in f:
                rows += 1
                if mode == "none":
                    continue
                if mode == "sample" and rows > 25 and rows < expected - 25:
                    continue
                try:
                    obj = json.loads(line)
                    step = int(obj.get("global_step"))
                    if first is None: first = step
                    last = step
                    if step < start_step or step > end_step:
                        bad += 1
                except Exception:
                    bad += 1
    except Exception as e:
        # File gzip troncato/corrotto: verify-run deve restituire JSON con ok=false, non crashare.
        bad += max(1, expected - rows)
        return {"rows_full": rows, "json_bad": bad, "first_step": first, "last_step": last, "error": repr(e)}
    if rows != expected:
        bad += abs(expected - rows)
    if mode != "none":
        if first not in {None, start_step}: bad += 1
        if last not in {None, end_step}: bad += 1
    return {"rows_full": rows, "json_bad": bad, "first_step": first, "last_step": last}

def pack_tar(src_dir: Path, out_path: Path) -> str:
    if out_path.exists(): out_path.unlink()
    with tarfile.open(out_path, "w:gz") as tar:
        tar.add(src_dir, arcname=src_dir.name)
    return str(out_path)

def state_from_data(core: Any, data: Dict[str, Any]) -> Any:
    return h.state_from_data(core, data)


# =============================================================================
# STEP 8C — METADATA-ONLY PERSISTENCE LAYER
# =============================================================================
# Questo strato è deliberatamente esterno alla formula e al core.
# Scopo: archiviare file opzionali per cooperazione AI/questionario e conservarli
# nel manifest anche dopo resume/doctor-repair, senza applicarli ai nodi.

CANONICAL_METADATA_KEYS = (
    "profile",
    "semantic_trace",
    "scenario_blueprint",
    "initial_calibration",
    "questionnaire",
    "notes",
)


def _metadata_optional_inputs_from_args(args: argparse.Namespace) -> Dict[str, Optional[str]]:
    return {
        "profile": getattr(args, "profile", None),
        "semantic_trace": getattr(args, "semantic_trace", None),
        "scenario_blueprint": getattr(args, "scenario_blueprint", None),
        "initial_calibration": getattr(args, "initial_calibration", None),
        "questionnaire": getattr(args, "questionnaire", None),
        "notes": getattr(args, "notes", None),
    }


def _metadata_is_relative_to(path: Path, root: Path) -> bool:
    try:
        path.resolve().relative_to(root.resolve())
        return True
    except ValueError:
        return False


def _metadata_entry_from_file(key: str, archived_path: Path, run_root: Path) -> Dict[str, Any]:
    stat = archived_path.stat()
    return {
        "provided": True,
        "archived": True,
        "key": key,
        "stored_path": str(archived_path.relative_to(run_root)) if _metadata_is_relative_to(archived_path, run_root) else str(archived_path),
        "filename": archived_path.name,
        "size_bytes": stat.st_size,
        "sha256": sha256_file(archived_path),
    }


def _first_existing_metadata_file(metadata_dir: Path, key: str) -> Optional[Path]:
    if not metadata_dir.exists():
        return None
    preferred_suffixes = (".json", ".md", ".txt", ".csv", ".yaml", ".yml", ".dat")
    for suffix in preferred_suffixes:
        candidate = metadata_dir / f"{key}{suffix}"
        if candidate.is_file():
            return candidate
    matches = sorted([p for p in metadata_dir.glob(f"{key}.*") if p.is_file()])
    if matches:
        return matches[0]
    subdir = metadata_dir / key
    if subdir.is_dir():
        files = sorted([p for p in subdir.rglob("*") if p.is_file()])
        if files:
            return files[0]
    return None


def copy_optional_metadata_inputs(
    run_root: Path,
    optional_inputs: Optional[Dict[str, Optional[str]]] = None,
    metadata_dir_name: str = "metadata_inputs",
) -> Dict[str, Any]:
    run_root = Path(run_root)
    metadata_dir = run_root / metadata_dir_name
    metadata_dir.mkdir(parents=True, exist_ok=True)
    entries: Dict[str, Any] = {}
    for key, src in (optional_inputs or {}).items():
        if src is None or str(src).strip() == "":
            # In resume l'assenza dell'argomento NON significa provided=False.
            continue
        src_p = Path(str(src))
        if not src_p.is_file():
            entries[key] = {
                "provided": False,
                "archived": False,
                "key": key,
                "source_path": str(src_p),
                "error": "source_file_missing",
            }
            continue
        dst = metadata_dir / f"{key}{src_p.suffix or '.dat'}"
        if src_p.resolve() != dst.resolve():
            shutil.copy2(src_p, dst)
        entry = _metadata_entry_from_file(key, dst, run_root)
        entry["source_path"] = str(src_p)
        entries[key] = entry
    return entries


def preserve_metadata_inputs_in_manifest(
    *,
    run_root: Path,
    previous_manifest: Optional[Dict[str, Any]],
    new_manifest: Dict[str, Any],
    optional_inputs: Optional[Dict[str, Optional[str]]] = None,
    metadata_dir_name: str = "metadata_inputs",
    canonical_keys: Tuple[str, ...] = CANONICAL_METADATA_KEYS,
) -> Dict[str, Any]:
    run_root = Path(run_root)
    metadata_dir = run_root / metadata_dir_name
    previous = dict((previous_manifest or {}).get("metadata_inputs", {}) or {})
    current = dict(new_manifest.get("metadata_inputs", {}) or {})
    copied = copy_optional_metadata_inputs(run_root, optional_inputs, metadata_dir_name)
    keys = set(canonical_keys) | set(previous) | set(current) | set(copied)
    merged: Dict[str, Any] = {}
    for key in sorted(keys):
        old_entry = dict(previous.get(key, {}) or {})
        new_entry = dict(current.get(key, {}) or {})
        copied_entry = dict(copied.get(key, {}) or {})
        archived_file = _first_existing_metadata_file(metadata_dir, key)
        entry: Dict[str, Any] = {}
        entry.update(old_entry)
        entry.update(new_entry)
        entry.update(copied_entry)
        entry.setdefault("key", key)
        old_true = bool(old_entry.get("provided"))
        new_true = bool(new_entry.get("provided"))
        copied_true = bool(copied_entry.get("provided"))
        archived_true = archived_file is not None
        # Regola centrale STEP 8C: TRUE non regredisce a FALSE dopo resume.
        if copied_true or new_true or old_true or archived_true:
            if archived_file is not None and not copied_true:
                archived_entry = _metadata_entry_from_file(key, archived_file, run_root)
                archived_entry.update({k: v for k, v in entry.items() if k not in ("provided", "archived", "stored_path", "filename", "size_bytes", "sha256")})
                entry = archived_entry
            entry["provided"] = True
            entry["archived"] = bool(entry.get("archived", False) or archived_true or copied_true)
            entry.pop("error", None)
        else:
            entry["provided"] = False
            entry.setdefault("archived", False)
        merged[key] = entry
    new_manifest["metadata_inputs"] = merged
    new_manifest["step8c_metadata_persistence"] = {
        "enabled": True,
        "rule": "provided_true_is_preserved_across_resume_when_manifest_or_metadata_inputs_contains_evidence",
        "metadata_dir": metadata_dir_name,
        "applies_to_nodes": False,
    }
    return new_manifest


def repair_manifest_metadata_from_archive(run_root: Path, manifest_path: Path, apply: bool = True) -> Dict[str, Any]:
    manifest = read_json(manifest_path) or {}
    repaired = preserve_metadata_inputs_in_manifest(
        run_root=Path(run_root),
        previous_manifest=manifest,
        new_manifest=manifest,
        optional_inputs=None,
    )
    if apply:
        atomic_write_json(manifest_path, repaired)
    return {
        "ok": True,
        "action": "repair_manifest_metadata_from_archive",
        "apply": apply,
        "provided_true_keys": sorted([k for k, v in (repaired.get("metadata_inputs", {}) or {}).items() if bool((v or {}).get("provided"))]),
        "metadata_inputs": repaired.get("metadata_inputs", {}),
    }


def write_manifest(root: Path, args: argparse.Namespace, core_path: str) -> None:
    manifest_path = root / "manifest.json"
    previous_manifest = read_json(manifest_path) or {}
    manifest = {
        "version": VERSION,
        "run_id": args.run_id,
        "core_path": core_path,
        "core_sha256": sha256_file(Path(core_path)) if Path(core_path).exists() else None,
        "archive_mode": args.archive_mode,
        "target_nodes": args.nodes,
        "block_size": args.block_size,
        "layout": {
            "checkpoint": "checkpoint.json",
            "events": "events.jsonl",
            "index": "index.sqlite",
            "light_blocks": "blocks/block_XXXXXX_start_end.sqlite",
            "full_blocks": "full/block_XXXXXX_start_end.jsonl.gz",
            "receipts": "receipts/block_XXXXXX_start_end.receipt.json",
        },
        "helper_mode": "embedded",
        "note": "Core non modificato; helper incorporato; FULL salvato come JSONL.GZ sidecar, LIGHT in SQLite. STEP 8C: metadata opzionali archiviati ma non applicati ai nodi.",
        "updated_at": time.time(),
    }
    manifest = preserve_metadata_inputs_in_manifest(
        run_root=root,
        previous_manifest=previous_manifest,
        new_manifest=manifest,
        optional_inputs=_metadata_optional_inputs_from_args(args),
    )
    atomic_write_json(manifest_path, manifest)

def run_block_child(args: argparse.Namespace) -> Dict[str, Any]:
    core = load_module(args.core, f"core_time044_child_{os.getpid()}")
    root = Path(args.out_dir) / args.run_id
    blocks_dir = root / "blocks"; full_dir = root / "full"; receipts_dir = root / "receipts"
    blocks_dir.mkdir(parents=True, exist_ok=True); full_dir.mkdir(parents=True, exist_ok=True); receipts_dir.mkdir(parents=True, exist_ok=True)
    db_path = blocks_dir / f"block_{args.block_no:06d}_{args.start_step}_{args.end_step}.sqlite"
    tmp_db = db_path.with_suffix(".sqlite.tmp")
    full_path = full_dir / f"block_{args.block_no:06d}_{args.start_step}_{args.end_step}.jsonl.gz" if args.archive_mode in {"full", "both"} else None
    tmp_full = full_path.with_suffix(".jsonl.gz.tmp") if full_path else None
    for p in [tmp_db, tmp_full]:
        if p and p.exists(): p.unlink()
    cp = read_json(Path(args.checkpoint)) or {}
    rng = random.Random(); rng.setstate(unb64_pickle(cp["rng_state_b64"]))
    state = state_from_data(core, cp.get("state") or {})
    con = init_light_db(tmp_db)
    light_rows: List[tuple] = []
    t0 = time.time(); last_step = args.start_step - 1
    gz = gzip.open(tmp_full, "wt", encoding="utf-8", compresslevel=3) if tmp_full else None
    try:
        try:
            for idx, step in enumerate(range(args.start_step, args.end_step + 1), start=1):
                node = h.make_node(core, rng, step, state)
                result = core.run_node(node, rng=rng)
                state = result.state_after.normalized()
                ts = time.time()
                light_rows.append(h.light_row_from(core, args.run_id, step, args.block_no, idx, node, result, ts))
                if gz is not None:
                    obj = h.full_obj_from(core, args.run_id, step, args.block_no, idx, node, result, ts)
                    gz.write(json.dumps(obj, ensure_ascii=False, separators=(",", ":")) + "\n")
                last_step = step
                if len(light_rows) >= args.batch_size:
                    con.executemany(h.LIGHT_INSERT_SQL, light_rows); light_rows.clear(); con.commit()
            if light_rows:
                con.executemany(h.LIGHT_INSERT_SQL, light_rows); light_rows.clear(); con.commit()
            con.execute("PRAGMA wal_checkpoint(TRUNCATE)"); con.commit()
        finally:
            if gz is not None: gz.close()
            con.close()
        light_v = verify_light_db(tmp_db, args.start_step, args.end_step)
        if not light_v["verified"]:
            return {"ok": False, "error": "light_verification_failed", "verification": light_v, "last_step": last_step}
        full_v = {"rows_full": 0, "json_bad": 0}
        if tmp_full:
            full_v = verify_full_jsonl_gz(tmp_full, args.start_step, args.end_step, mode=args.full_json_check)
            if full_v["json_bad"] != 0:
                return {"ok": False, "error": "full_verification_failed", "verification": full_v, "last_step": last_step}
        os.replace(tmp_db, db_path)
        if tmp_full and full_path:
            os.replace(tmp_full, full_path)
        elapsed = time.time() - t0
        block = {
            "block_no": args.block_no,
            "start_step": args.start_step,
            "end_step": args.end_step,
            "sqlite_path": str(db_path),
            "full_path": str(full_path) if full_path else None,
            "sqlite_sha256": sha256_file(db_path),
            "full_sha256": sha256_file(full_path) if full_path and full_path.exists() else None,
            "archive_mode": args.archive_mode,
            "elapsed_seconds": elapsed,
            "sqlite_bytes": db_path.stat().st_size,
            "full_bytes": full_path.stat().st_size if full_path and full_path.exists() else 0,
            "completed_ts": time.time(),
            "rows_light": light_v["rows_light"],
            "rows_full": full_v["rows_full"],
            "min_pn": light_v["min_pn"],
            "max_pn": light_v["max_pn"],
            "pn_out_of_clamp": light_v["pn_out_of_clamp"],
            "formula_mismatches": light_v["formula_mismatches"],
            "margin_mismatches": light_v["margin_mismatches"],
            "json_bad": int(full_v.get("json_bad") or 0),
            "verified": True,
        }
        # TIME 04.4.5: receipt atomica di blocco.
        # Se il parent viene interrotto dopo la promozione dei file finali ma prima del checkpoint,
        # doctor-repair può recuperare stato/RNG finali da questa ricevuta, senza toccare il core.
        state_data_after = core.to_plain_data(state.normalized())
        rng_state_b64_after = b64_pickle(rng.getstate())
        receipt = {
            "version": VERSION,
            "receipt_kind": "block_child_complete",
            "run_id": args.run_id,
            "block_no": args.block_no,
            "start_step": args.start_step,
            "end_step": args.end_step,
            "previous_completed_nodes": args.start_step - 1,
            "previous_completed_blocks": args.block_no - 1,
            "block": block,
            "state": state_data_after,
            "rng_state_b64": rng_state_b64_after,
            "child_pid": os.getpid(),
            "receipt_written_at": time.time(),
            "safety_note": "Receipt scritta dopo verifica child e promozione file finali; usabile per recupero orfani post-child/pre-checkpoint.",
        }
        receipt_path = receipts_dir / f"block_{args.block_no:06d}_{args.start_step}_{args.end_step}.receipt.json"
        atomic_write_json(receipt_path, receipt)
        fsync_file(receipts_dir)
        return {"ok": True, "version": VERSION, "block": block, "state": state_data_after, "rng_state_b64": rng_state_b64_after, "receipt_path": str(receipt_path)}
    except Exception as e:
        try: con.close()
        except Exception: pass
        try:
            if gz: gz.close()
        except Exception: pass
        return {"ok": False, "error": "child_exception", "exception": repr(e), "last_step": last_step}

def orchestrate(args: argparse.Namespace) -> Dict[str, Any]:
    if args.block_size > MAX_BLOCK_SIZE:
        return {"ok": False, "error": "block_size_too_large", "max_block_size": MAX_BLOCK_SIZE}
    root = Path(args.out_dir) / args.run_id
    root.mkdir(parents=True, exist_ok=True); (root/"blocks").mkdir(exist_ok=True); (root/"full").mkdir(exist_ok=True); (root/"receipts").mkdir(exist_ok=True)
    checkpoint_path = root / "checkpoint.json"; log_path = root / "events.jsonl"; report_path = root / "report_latest.json"; index_path = root / "index.sqlite"
    # Doctor/preflight integrato: non modifica il core, controlla solo ambiente e resume.
    boot = doctor_bootstrap(args)
    if not boot.get("ok"):
        return {"ok": False, "version": VERSION, "error": "doctor_bootstrap_failed", "doctor": boot}
    cp = read_json(checkpoint_path)
    if cp and args.resume:
        resume_doctor = doctor_run_dir(root, mode=args.parent_full_json_check)
        auto_repair = None
        if not resume_doctor.get("can_resume_strictly"):
            # TIME 04.4.40 — auto-repair prudente sul resume diretto.
            # Caso reale emerso nei 250k: il wrapper può tagliare il parent dopo
            # promozione file finali/receipt ma prima del checkpoint atomico.
            # Prima 04.4.39 rispondeva strict_resume_failed; ora prova lo stesso
            # percorso sicuro già usato da doctor-repair: quarantena .tmp, rebuild
            # index, recupero receipt e repair checkpoint. Non tocca core/formula.
            auto_repair = doctor_repair_run_dir(
                root,
                mode=args.parent_full_json_check,
                apply=True,
                rebuild_index=True,
                repair_checkpoint=True,
            )
            resume_doctor_after = doctor_run_dir(root, mode=args.parent_full_json_check)
            append_jsonl(log_path, {
                "event": "auto_repair_before_resume",
                "doctor_before_ok": resume_doctor.get("ok"),
                "doctor_before_can_resume": resume_doctor.get("can_resume_strictly"),
                "doctor_before_problems": resume_doctor.get("problems"),
                "repair_ok": auto_repair.get("ok") if isinstance(auto_repair, dict) else None,
                "repair_actions_count": len(auto_repair.get("actions") or []) if isinstance(auto_repair, dict) else None,
                "doctor_after_ok": resume_doctor_after.get("ok"),
                "doctor_after_can_resume": resume_doctor_after.get("can_resume_strictly"),
                "doctor_after_problems": resume_doctor_after.get("problems"),
                "ts": time.time(),
            })
            if not resume_doctor_after.get("can_resume_strictly"):
                return {"ok": False, "version": VERSION, "error": "strict_resume_failed_after_auto_repair", "doctor_before": resume_doctor, "auto_repair": auto_repair, "doctor_after": resume_doctor_after}
            resume_doctor = resume_doctor_after
    core = load_module(args.core, "core_time044_init")
    write_manifest(root, args, args.core)
    if cp and args.resume:
        completed_nodes = int(cp.get("completed_nodes") or 0); completed_blocks = int(cp.get("completed_blocks") or 0)
        rng_state_b64 = cp["rng_state_b64"]; state_data = cp.get("state") or {}
    else:
        completed_nodes = 0; completed_blocks = 0
        rng = random.Random(args.seed); rng_state_b64 = b64_pickle(rng.getstate())
        state_data = core.to_plain_data(core.SystemState(stress_str=45, position_pos=62, debt_deb=0).normalized())
        atomic_write_json(checkpoint_path, {"version": VERSION, "run_id": args.run_id, "archive_mode": args.archive_mode, "total_nodes_requested": args.nodes, "completed_nodes": 0, "completed_blocks": 0, "state": state_data, "rng_state_b64": rng_state_b64, "status": "initialized", "created_at": time.time()})
    append_jsonl(log_path, {"event":"orchestrator_start","completed_nodes":completed_nodes,"target":args.nodes,"ts":time.time()})
    errors = []; blocks_done = 0; t0 = time.time()
    while completed_nodes < args.nodes and blocks_done < args.max_blocks_this_invocation:
        block_no = completed_blocks + 1; start_step = completed_nodes + 1; end_step = min(args.nodes, completed_nodes + args.block_size)
        atomic_write_json(checkpoint_path, {"version": VERSION, "run_id": args.run_id, "archive_mode": args.archive_mode, "total_nodes_requested": args.nodes, "completed_nodes": completed_nodes, "completed_blocks": completed_blocks, "state": state_data, "rng_state_b64": rng_state_b64, "status": "before_child", "next_block_no": block_no, "next_start_step": start_step, "updated_at": time.time()})
        cmd = [sys.executable, __file__, "--child", "--run-id", args.run_id, "--out-dir", args.out_dir, "--core", args.core, "--archive-mode", args.archive_mode, "--block-no", str(block_no), "--start-step", str(start_step), "--end-step", str(end_step), "--batch-size", str(args.batch_size), "--checkpoint", str(checkpoint_path), "--full-json-check", args.full_json_check]
        append_jsonl(log_path, {"event":"block_started","block_no":block_no,"start_step":start_step,"end_step":end_step,"ts":time.time()})
        # TIME 04.4.34 — child FILE-IO guard anche dentro l'orchestrator.
        # Evita PIPE stdout/stderr per il child di blocco: con finestre lunghe/50k
        # le pipe potevano lasciare il parent appeso anche quando il blocco era già
        # stato scritto. Il core matematico resta invariato.
        stdout = ""; stderr = ""
        try:
            child_io_dir = root / "child_io"
            child_io_dir.mkdir(parents=True, exist_ok=True)
            stdout_path = child_io_dir / f"block_{block_no:06d}_{start_step}_{end_step}.stdout.json"
            stderr_path = child_io_dir / f"block_{block_no:06d}_{start_step}_{end_step}.stderr.txt"
            for _p in (stdout_path, stderr_path):
                try:
                    if _p.exists(): _p.unlink()
                except Exception:
                    pass
            with open(stdout_path, "w", encoding="utf-8") as out, open(stderr_path, "w", encoding="utf-8") as err:
                proc = subprocess.Popen(cmd, stdout=out, stderr=err, text=True, start_new_session=True, preexec_fn=_pdeathsig_preexec)
                deadline = time.time() + float(args.child_timeout_seconds)
                while proc.poll() is None and time.time() < deadline:
                    time.sleep(0.05)
                if proc.poll() is None:
                    kill_actions = []
                    try:
                        os.killpg(proc.pid, signal.SIGTERM)
                        kill_actions.append("sigterm_pgid")
                        time.sleep(0.5)
                    except ProcessLookupError:
                        kill_actions.append("already_gone_before_sigterm")
                    except Exception as e:
                        kill_actions.append(f"sigterm_error:{repr(e)}")
                    try:
                        if proc.poll() is None:
                            os.killpg(proc.pid, signal.SIGKILL)
                            kill_actions.append("sigkill_pgid")
                    except ProcessLookupError:
                        kill_actions.append("gone_before_sigkill")
                    except Exception as e:
                        kill_actions.append(f"sigkill_error:{repr(e)}")
                    try:
                        proc.wait(timeout=5)
                    except Exception:
                        pass
                    stdout = stdout_path.read_text(encoding="utf-8", errors="replace") if stdout_path.exists() else ""
                    stderr = stderr_path.read_text(encoding="utf-8", errors="replace") if stderr_path.exists() else ""
                    errors.append({"block_no": block_no, "error": "child_timeout_killed_process_group_fileio", "kill_actions": kill_actions, "stdout_tail": stdout[-2000:], "stderr_tail": stderr[-2000:], "stdout_path": str(stdout_path), "stderr_path": str(stderr_path)})
                    append_jsonl(log_path,{"event":"block_timeout_process_group_killed_fileio","block_no":block_no,"kill_actions":kill_actions,"ts":time.time()})
                    break
            stdout = stdout_path.read_text(encoding="utf-8", errors="replace") if stdout_path.exists() else ""
            stderr = stderr_path.read_text(encoding="utf-8", errors="replace") if stderr_path.exists() else ""
        except Exception as e:
            errors.append({"block_no": block_no, "error": "child_popen_fileio_exception", "exception": repr(e), "stdout_tail": stdout[-2000:], "stderr_tail": stderr[-2000:]})
            break
        if proc.returncode != 0:
            errors.append({"block_no":block_no,"error":"child_returncode","returncode":proc.returncode,"stderr_tail":stderr[-2000:]}); break
        try: child = json.loads(stdout)
        except Exception as e:
            errors.append({"block_no":block_no,"error":"child_bad_json","exception":repr(e),"stdout_tail":stdout[-2000:]}); break
        if not child.get("ok"):
            errors.append({"block_no":block_no,"error":"child_not_ok","child":child}); break
        b = child["block"]
        # parent re-verifies light and full sidecar
        pv = verify_light_db(Path(b["sqlite_path"]), b["start_step"], b["end_step"])
        fv = {"rows_full":0,"json_bad":0}
        if b.get("full_path"):
            fv = verify_full_jsonl_gz(Path(b["full_path"]), b["start_step"], b["end_step"], mode=args.parent_full_json_check)
        if not pv["verified"] or int(fv.get("json_bad") or 0) != 0:
            errors.append({"block_no":block_no,"error":"parent_verification_failed","light":pv,"full":fv}); break
        b.update({"rows_light": pv["rows_light"], "rows_full": fv.get("rows_full",0), "min_pn": pv["min_pn"], "max_pn": pv["max_pn"], "pn_out_of_clamp": pv["pn_out_of_clamp"], "formula_mismatches": pv["formula_mismatches"], "margin_mismatches": pv["margin_mismatches"], "json_bad": int(fv.get("json_bad") or 0), "verified": True})
        upsert_index(index_path, b)
        completed_nodes = int(b["end_step"]); completed_blocks = block_no; state_data = child["state"]; rng_state_b64 = child["rng_state_b64"]; blocks_done += 1
        atomic_write_json(checkpoint_path, {"version": VERSION, "run_id": args.run_id, "archive_mode": args.archive_mode, "total_nodes_requested": args.nodes, "completed_nodes": completed_nodes, "completed_blocks": completed_blocks, "state": state_data, "rng_state_b64": rng_state_b64, "status": "complete" if completed_nodes >= args.nodes else "partial", "last_block": b, "updated_at": time.time()})
        append_jsonl(log_path, {"event":"block_verified_and_checkpointed","block_no":block_no,"completed_nodes":completed_nodes,"ts":time.time()})
        # 04.4.7: progress report atomico dopo ogni blocco valido.
        # Serve al monitoraggio dopo timeout/kill esterni: il report_latest non resta obsoleto
        # mentre checkpoint/index sono già avanzati. Non tocca core né matematica.
        partial_idx = index_summary(index_path)
        partial_complete = completed_nodes >= args.nodes
        partial_report = {"ok": True, "complete": partial_complete, "status": "complete" if partial_complete else "partial_window_progress", "version": VERSION, "run_id": args.run_id, "archive_mode": args.archive_mode, "root": str(root), "total_nodes_requested": args.nodes, "completed_nodes": completed_nodes, "completed_blocks": completed_blocks, "blocks_done_this_invocation": blocks_done, "elapsed_seconds_this_invocation": time.time()-t0, "index_summary": partial_idx, "checkpoint_path": str(checkpoint_path), "manifest_path": str(root/"manifest.json"), "index_path": str(index_path), "log_path": str(log_path), "report_path": str(report_path), "errors": []}
        atomic_write_json(report_path, partial_report)
    idx = index_summary(index_path)
    complete = completed_nodes >= args.nodes and idx.get("verified_rows",0) >= args.nodes
    partial_window_complete = (completed_nodes < args.nodes and blocks_done >= args.max_blocks_this_invocation and not errors)
    ok = (complete or partial_window_complete) and not errors
    status = "complete" if complete else ("partial_window_complete" if partial_window_complete else "error")
    report = {"ok": ok, "complete": bool(complete), "status": status, "version": VERSION, "run_id": args.run_id, "archive_mode": args.archive_mode, "root": str(root), "total_nodes_requested": args.nodes, "completed_nodes": completed_nodes, "completed_blocks": completed_blocks, "blocks_done_this_invocation": blocks_done, "elapsed_seconds_this_invocation": time.time()-t0, "index_summary": idx, "checkpoint_path": str(checkpoint_path), "manifest_path": str(root/"manifest.json"), "index_path": str(index_path), "log_path": str(log_path), "report_path": str(report_path), "errors": errors}
    atomic_write_json(report_path, report); append_jsonl(log_path,{"event":"orchestrator_end","ok":ok,"complete":bool(complete),"status":status,"completed_nodes":completed_nodes,"errors":errors,"ts":time.time()})
    return report

def _empty_index_summary() -> Dict[str, Any]:
    return {
        "verified_blocks": 0, "verified_rows": 0, "verified_full_rows": 0,
        "min_step": None, "max_step": None, "pn_out_of_clamp": 0,
        "formula_mismatches": 0, "margin_mismatches": 0, "json_bad": 0,
        "sqlite_bytes_total": 0, "full_bytes_total": 0, "min_pn": None, "max_pn": None,
    }

def index_summary(index_path: Path) -> Dict[str, Any]:
    # Usata dal runner durante il run: può inizializzare index.sqlite se necessario.
    con = init_index_db(index_path)
    try:
        row = con.execute("SELECT COUNT(*), COALESCE(SUM(rows_light),0), COALESCE(SUM(rows_full),0), MIN(start_step), MAX(end_step), COALESCE(SUM(pn_out_of_clamp),0), COALESCE(SUM(formula_mismatches),0), COALESCE(SUM(margin_mismatches),0), COALESCE(SUM(json_bad),0), COALESCE(SUM(sqlite_bytes),0), COALESCE(SUM(full_bytes),0), MIN(min_pn), MAX(max_pn) FROM blocks WHERE verified=1").fetchone()
        return {"verified_blocks": int(row[0] or 0), "verified_rows": int(row[1] or 0), "verified_full_rows": int(row[2] or 0), "min_step": row[3], "max_step": row[4], "pn_out_of_clamp": int(row[5] or 0), "formula_mismatches": int(row[6] or 0), "margin_mismatches": int(row[7] or 0), "json_bad": int(row[8] or 0), "sqlite_bytes_total": int(row[9] or 0), "full_bytes_total": int(row[10] or 0), "min_pn": row[11], "max_pn": row[12]}
    finally: con.close()

def read_index_summary(index_path: Path) -> Dict[str, Any]:
    # Usata da verify/doctor: NON deve creare database vuoti per errore di percorso.
    if not index_path.exists():
        return _empty_index_summary()
    con = sqlite3.connect(str(index_path), timeout=60)
    try:
        row = con.execute("SELECT COUNT(*), COALESCE(SUM(rows_light),0), COALESCE(SUM(rows_full),0), MIN(start_step), MAX(end_step), COALESCE(SUM(pn_out_of_clamp),0), COALESCE(SUM(formula_mismatches),0), COALESCE(SUM(margin_mismatches),0), COALESCE(SUM(json_bad),0), COALESCE(SUM(sqlite_bytes),0), COALESCE(SUM(full_bytes),0), MIN(min_pn), MAX(max_pn) FROM blocks WHERE verified=1").fetchone()
        return {"verified_blocks": int(row[0] or 0), "verified_rows": int(row[1] or 0), "verified_full_rows": int(row[2] or 0), "min_step": row[3], "max_step": row[4], "pn_out_of_clamp": int(row[5] or 0), "formula_mismatches": int(row[6] or 0), "margin_mismatches": int(row[7] or 0), "json_bad": int(row[8] or 0), "sqlite_bytes_total": int(row[9] or 0), "full_bytes_total": int(row[10] or 0), "min_pn": row[11], "max_pn": row[12]}
    finally: con.close()

def resolve_run_dir(value: str, out_dir: str) -> Path:
    raw = Path(value)
    if raw.is_absolute() or raw.exists():
        return raw
    return Path(out_dir) / value

def verify_run_dir(run_dir: Path, mode: str="all") -> Dict[str, Any]:
    run_dir = Path(run_dir)
    problems: List[Dict[str, Any]] = []
    warnings: List[Dict[str, Any]] = []
    checkpoint_path = run_dir / "checkpoint.json"
    index_path = run_dir / "index.sqlite"
    if not run_dir.exists():
        problems.append({"type": "run_dir_missing", "path": str(run_dir)})
    if not checkpoint_path.exists():
        problems.append({"type": "checkpoint_missing", "path": str(checkpoint_path)})
    if not index_path.exists():
        problems.append({"type": "index_missing", "path": str(index_path)})
    if problems:
        return {
            "ok": False, "version": VERSION, "run_dir": str(run_dir),
            "checkpoint_completed_nodes": 0, "checkpoint_status": None,
            "index_summary": _empty_index_summary(), "gaps": [], "full_reverify_bad": 0,
            "blocks": 0, "problems": problems, "warnings": warnings,
        }
    idx = read_index_summary(index_path)
    cp = read_json(checkpoint_path) or {}
    con = sqlite3.connect(str(index_path), timeout=60)
    ranges = con.execute("SELECT start_step,end_step,rows_light,rows_full,sqlite_path,full_path FROM blocks WHERE verified=1 ORDER BY block_no").fetchall(); con.close()
    expected = 1; gaps=[]; full_bad=0
    for s,e,rl,rf,sp,fp in ranges:
        if s != expected: gaps.append({"expected_start": expected, "actual_start": s})
        expected = e + 1
        sp_resolved = resolve_artifact_path(run_dir, sp, "blocks")
        if not sp_resolved or not sp_resolved.exists():
            problems.append({"type": "sqlite_missing", "path": str(sp_resolved) if sp_resolved else str(sp), "start_step": s, "end_step": e})
        else:
            # S08-S10 hardening: verify-run deve riverificare anche il LIGHT SQLite,
            # non solo index_summary e FULL sidecar. Prima, un blocco SQLite corrotto
            # poteva essere intercettato da doctor ma non da verify-run.
            try:
                lv = verify_light_db(sp_resolved, int(s), int(e))
            except Exception as exc:
                lv = {"verified": False, "error": "light_reverify_exception", "exception": repr(exc)}
            if not lv.get("verified") or int(lv.get("rows_light") or 0) != int(rl or 0):
                problems.append({"type": "light_reverify_failed", "path": str(sp_resolved), "start_step": s, "end_step": e, "verification": lv})
        if fp:
            fp_resolved = resolve_artifact_path(run_dir, fp, "full")
            if not fp_resolved or not fp_resolved.exists():
                problems.append({"type": "full_missing", "path": str(fp_resolved) if fp_resolved else str(fp), "start_step": s, "end_step": e})
                full_bad += int(rf or 0)
            elif mode in {"all","sample"}:
                fv = verify_full_jsonl_gz(fp_resolved, s, e, mode=mode)
                if int(fv.get("json_bad") or 0) != 0 or int(fv.get("rows_full") or 0) != int(rf or 0):
                    problems.append({"type": "full_reverify_failed", "path": str(fp_resolved), "start_step": s, "end_step": e, "verification": fv})
                full_bad += int(fv.get("json_bad") or 0)
    ok = idx["verified_rows"] == int(cp.get("completed_nodes") or 0) and not gaps and full_bad == 0 and not problems and idx["pn_out_of_clamp"] == 0 and idx["formula_mismatches"] == 0 and idx["margin_mismatches"] == 0 and idx["json_bad"] == 0
    return {"ok": ok, "version": VERSION, "run_dir": str(run_dir), "checkpoint_completed_nodes": int(cp.get("completed_nodes") or 0), "checkpoint_status": cp.get("status"), "index_summary": idx, "gaps": gaps, "full_reverify_bad": full_bad, "blocks": len(ranges), "problems": problems, "warnings": warnings}



BLOCK_SQLITE_RE = re.compile(r"^block_(\d{6})_(\d+)_(\d+)\.sqlite$")


def parse_block_sqlite_name(path: Path) -> Optional[Tuple[int, int, int]]:
    m = BLOCK_SQLITE_RE.match(path.name)
    if not m:
        return None
    return int(m.group(1)), int(m.group(2)), int(m.group(3))


def find_full_for_block(run_dir: Path, block_no: int, start_step: int, end_step: int) -> Optional[Path]:
    full_dir = run_dir / "full"
    exact = full_dir / f"block_{block_no:06d}_{start_step}_{end_step}.jsonl.gz"
    if exact.exists():
        return exact
    matches = sorted(full_dir.glob(f"block_{block_no:06d}_{start_step}_{end_step}*.jsonl.gz"))
    return matches[0] if matches else None


def _insert_index_block(con: sqlite3.Connection, block: Dict[str, Any]) -> None:
    con.execute("INSERT OR REPLACE INTO blocks VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)", (
        block["block_no"], block["start_step"], block["end_step"], block["rows_light"], block["rows_full"],
        block["sqlite_path"], block.get("full_path"), block["sqlite_sha256"], block.get("full_sha256"),
        block.get("min_pn"), block.get("max_pn"), block["pn_out_of_clamp"], block["formula_mismatches"],
        block["margin_mismatches"], block["json_bad"], int(block["verified"]), block["archive_mode"],
        block.get("elapsed_seconds"), block.get("sqlite_bytes"), block.get("full_bytes"), block.get("completed_ts")
    ))


def quarantine_tmp_files(run_dir: Path, apply: bool = True) -> Dict[str, Any]:
    run_dir = Path(run_dir)
    ts = time.strftime("%Y%m%d_%H%M%S")
    quarantine_root = run_dir / "quarantine" / f"tmp_{ts}"
    moved: List[Dict[str, str]] = []
    candidates: List[Path] = []
    for sub in ("blocks", "full"):
        d = run_dir / sub
        if d.exists():
            candidates.extend(sorted(d.glob("*.tmp*")))
    if not candidates:
        return {"ok": True, "action": "quarantine_tmp", "apply": apply, "moved_count": 0, "moved": [], "quarantine_dir": None}
    for src in candidates:
        rel_sub = src.parent.name
        dst_dir = quarantine_root / rel_sub
        dst = dst_dir / src.name
        moved.append({"from": str(src), "to": str(dst)})
        if apply:
            dst_dir.mkdir(parents=True, exist_ok=True)
            # Non sovrascrive: conserva ogni prova diagnostica.
            final_dst = dst
            n = 1
            while final_dst.exists():
                final_dst = dst.with_name(dst.name + f".{n}")
                n += 1
            shutil.move(str(src), str(final_dst))
            moved[-1]["to"] = str(final_dst)
    return {"ok": True, "action": "quarantine_tmp", "apply": apply, "moved_count": len(moved), "moved": moved, "quarantine_dir": str(quarantine_root) if apply else str(quarantine_root)}



RECEIPT_RE = re.compile(r"^block_(\d{6})_(\d+)_(\d+)\.receipt\.json$")


def receipt_path_for_block(run_dir: Path, block_no: int, start_step: int, end_step: int) -> Path:
    return run_dir / "receipts" / f"block_{block_no:06d}_{start_step}_{end_step}.receipt.json"


def read_receipt_for_block(run_dir: Path, block_no: int, start_step: int, end_step: int) -> Optional[Dict[str, Any]]:
    path = receipt_path_for_block(run_dir, block_no, start_step, end_step)
    data = read_json(path)
    if not data:
        return None
    b = data.get("block") or {}
    if int(data.get("block_no") or b.get("block_no") or -1) != int(block_no):
        return None
    if int(data.get("start_step") or b.get("start_step") or -1) != int(start_step):
        return None
    if int(data.get("end_step") or b.get("end_step") or -1) != int(end_step):
        return None
    if not data.get("rng_state_b64") or not isinstance(data.get("state"), dict):
        return None
    return data


def list_final_blocks(run_dir: Path) -> List[Tuple[int, int, int, Path]]:
    blocks_dir = Path(run_dir) / "blocks"
    candidates: List[Tuple[int, int, int, Path]] = []
    if blocks_dir.exists():
        for db in sorted(blocks_dir.glob("*.sqlite")):
            parsed = parse_block_sqlite_name(db)
            if parsed:
                block_no, start_step, end_step = parsed
                candidates.append((block_no, start_step, end_step, db))
    candidates.sort(key=lambda x: (x[0], x[1], x[2]))
    return candidates


def detect_orphan_final_blocks(run_dir: Path, safe_blocks: int = 0, safe_nodes: int = 0) -> List[Dict[str, Any]]:
    orphans: List[Dict[str, Any]] = []
    for block_no, start_step, end_step, db in list_final_blocks(run_dir):
        if block_no > int(safe_blocks or 0) or start_step > int(safe_nodes or 0) + 1:
            fp = find_full_for_block(run_dir, block_no, start_step, end_step)
            rp = receipt_path_for_block(run_dir, block_no, start_step, end_step)
            orphans.append({
                "block_no": block_no,
                "start_step": start_step,
                "end_step": end_step,
                "sqlite_path": str(db),
                "full_path": str(fp) if fp and fp.exists() else None,
                "receipt_path": str(rp) if rp.exists() else None,
                "has_receipt": rp.exists(),
            })
    return orphans


def advance_checkpoint_from_receipts_if_safe(run_dir: Path, mode: str = "sample", apply: bool = True) -> Dict[str, Any]:
    """Avanza checkpoint usando receipt atomiche di blocco.

    Serve solo per il caso post-child/pre-checkpoint: i file finali del blocco sono validi,
    l'index è stato ricostruito fino a quel blocco, ma il checkpoint è rimasto indietro.
    Non ricostruisce stato/RNG dalla LIGHT/FULL: usa solo ricevute child complete.
    """
    run_dir = Path(run_dir)
    cp_path = run_dir / "checkpoint.json"
    cp = read_json(cp_path) or {}
    doc = doctor_run_dir(run_dir, mode=mode)
    cp_nodes = int(cp.get("completed_nodes") or 0)
    cp_blocks = int(cp.get("completed_blocks") or 0)
    safe_nodes = int(doc.get("safe_completed_nodes") or 0)
    safe_blocks = int(doc.get("safe_completed_blocks") or 0)
    target_nodes = int(cp.get("total_nodes_requested") or 0) or int((read_json(run_dir / "manifest.json") or {}).get("target_nodes") or 0) or safe_nodes
    if not cp or not cp.get("rng_state_b64") or not isinstance(cp.get("state"), dict):
        return {"ok": False, "action": "advance_checkpoint_from_receipts", "apply": apply, "reason": "checkpoint_missing_state_rng"}
    if safe_nodes <= cp_nodes and safe_blocks <= cp_blocks:
        return {"ok": True, "action": "advance_checkpoint_from_receipts", "apply": apply, "advanced": False, "reason": "checkpoint_not_behind_index", "checkpoint_completed_nodes": cp_nodes, "safe_completed_nodes": safe_nodes}
    if cp_nodes > safe_nodes or cp_blocks > safe_blocks:
        return {"ok": False, "action": "advance_checkpoint_from_receipts", "apply": apply, "reason": "checkpoint_ahead_of_safe_index", "checkpoint_completed_nodes": cp_nodes, "safe_completed_nodes": safe_nodes}
    index_path = run_dir / "index.sqlite"
    con = init_index_db(index_path)
    try:
        rows = con.execute("SELECT block_no,start_step,end_step FROM blocks WHERE block_no>? ORDER BY block_no", (cp_blocks,)).fetchall()
    finally:
        con.close()
    expected_start = cp_nodes + 1
    last_receipt: Optional[Dict[str, Any]] = None
    recovered: List[Dict[str, Any]] = []
    for block_no, start_step, end_step in rows:
        if int(start_step) != expected_start:
            return {"ok": False, "action": "advance_checkpoint_from_receipts", "apply": apply, "reason": "non_contiguous_receipt_recovery", "expected_start": expected_start, "actual_start": int(start_step), "recovered": recovered}
        receipt = read_receipt_for_block(run_dir, int(block_no), int(start_step), int(end_step))
        if not receipt:
            return {"ok": False, "action": "advance_checkpoint_from_receipts", "apply": apply, "reason": "missing_or_invalid_receipt", "block_no": int(block_no), "start_step": int(start_step), "end_step": int(end_step), "recovered": recovered}
        # Ricontrollo fisico del blocco prima di fidarsi della receipt.
        db = run_dir / "blocks" / f"block_{int(block_no):06d}_{int(start_step)}_{int(end_step)}.sqlite"
        lv = verify_light_db(db, int(start_step), int(end_step))
        if not lv.get("verified"):
            return {"ok": False, "action": "advance_checkpoint_from_receipts", "apply": apply, "reason": "light_not_verified_for_receipt", "block_no": int(block_no), "verification": lv}
        fp = find_full_for_block(run_dir, int(block_no), int(start_step), int(end_step))
        if fp and fp.exists():
            fv = verify_full_jsonl_gz(fp, int(start_step), int(end_step), mode=mode)
            if int(fv.get("json_bad") or 0) != 0:
                return {"ok": False, "action": "advance_checkpoint_from_receipts", "apply": apply, "reason": "full_not_verified_for_receipt", "block_no": int(block_no), "verification": fv}
        last_receipt = receipt
        recovered.append({"block_no": int(block_no), "start_step": int(start_step), "end_step": int(end_step)})
        expected_start = int(end_step) + 1
    if not last_receipt:
        return {"ok": False, "action": "advance_checkpoint_from_receipts", "apply": apply, "reason": "no_receipt_to_apply"}
    last_block = last_receipt.get("block") or {}
    new_nodes = int(last_block.get("end_step") or last_receipt.get("end_step") or safe_nodes)
    new_blocks = int(last_block.get("block_no") or last_receipt.get("block_no") or safe_blocks)
    if new_nodes != safe_nodes or new_blocks != safe_blocks:
        return {"ok": False, "action": "advance_checkpoint_from_receipts", "apply": apply, "reason": "receipt_target_not_equal_safe_index", "receipt_nodes": new_nodes, "safe_nodes": safe_nodes}
    new_cp = dict(cp)
    new_cp.update({
        "version": VERSION,
        "completed_nodes": new_nodes,
        "completed_blocks": new_blocks,
        "state": last_receipt["state"],
        "rng_state_b64": last_receipt["rng_state_b64"],
        "status": "complete" if target_nodes and new_nodes >= target_nodes else "partial",
        "next_block_no": new_blocks + 1,
        "next_start_step": new_nodes + 1,
        "last_block": last_block,
        "recovered_by": VERSION,
        "recovered_at": time.time(),
        "recovery_method": "block_receipt_orphan_recovery",
        "recovered_blocks_from_receipts": recovered,
    })
    backup_path = None
    if apply:
        backup_dir = run_dir / "repair_backups"
        backup_dir.mkdir(parents=True, exist_ok=True)
        if cp_path.exists():
            backup_path = backup_dir / f"checkpoint_before_receipt_recovery_{int(time.time())}.json"
            shutil.copy2(cp_path, backup_path)
        atomic_write_json(cp_path, new_cp)
    post = doctor_run_dir(run_dir, mode=mode) if apply else doc
    return {"ok": bool(post.get("can_resume_strictly")) if apply else True, "action": "advance_checkpoint_from_receipts", "apply": apply, "advanced": True, "backup_checkpoint": str(backup_path) if backup_path else None, "recovered_blocks": recovered, "safe_completed_nodes": new_nodes, "safe_completed_blocks": new_blocks, "can_resume_strictly_after_recovery": bool(post.get("can_resume_strictly")) if apply else None}


def quarantine_orphan_final_blocks_beyond_checkpoint(run_dir: Path, apply: bool = True) -> Dict[str, Any]:
    """Quarantena blocchi finali oltre il checkpoint quando manca la receipt sicura.

    Non cancella dati: sposta SQLite/FULL/receipt in orphan_blocks. Dopo questo, rebuild_index
    può tornare all'ultimo checkpoint matematicamente riprendibile.
    """
    run_dir = Path(run_dir)
    cp = read_json(run_dir / "checkpoint.json") or {}
    cp_nodes = int(cp.get("completed_nodes") or 0)
    cp_blocks = int(cp.get("completed_blocks") or 0)
    ts = time.strftime("%Y%m%d_%H%M%S")
    qroot = run_dir / "orphan_blocks" / f"orphan_after_cp_{cp_blocks}_{cp_nodes}_{ts}"
    candidates = []
    for block_no, start_step, end_step, db in list_final_blocks(run_dir):
        if block_no > cp_blocks or start_step > cp_nodes + 1:
            candidates.append((block_no, start_step, end_step, db))
    moved: List[Dict[str, Any]] = []
    for block_no, start_step, end_step, db in candidates:
        files = [("blocks", db)]
        fp = find_full_for_block(run_dir, block_no, start_step, end_step)
        if fp and fp.exists():
            files.append(("full", fp))
        rp = receipt_path_for_block(run_dir, block_no, start_step, end_step)
        if rp.exists():
            files.append(("receipts", rp))
        for sub, src in files:
            dst = qroot / sub / src.name
            moved.append({"block_no": block_no, "from": str(src), "to": str(dst)})
            if apply:
                dst.parent.mkdir(parents=True, exist_ok=True)
                final_dst = dst
                n = 1
                while final_dst.exists():
                    final_dst = dst.with_name(dst.name + f".{n}")
                    n += 1
                shutil.move(str(src), str(final_dst))
                moved[-1]["to"] = str(final_dst)
    return {"ok": True, "action": "quarantine_orphan_final_blocks", "apply": apply, "checkpoint_completed_nodes": cp_nodes, "checkpoint_completed_blocks": cp_blocks, "moved_count": len(moved), "moved": moved, "quarantine_dir": str(qroot) if candidates else None}


def rebuild_index_from_final_blocks(run_dir: Path, mode: str = "sample", apply: bool = True, require_full: Optional[bool] = None) -> Dict[str, Any]:
    """Ricostruisce index.sqlite dai soli blocchi finali verificabili.

    Prudenza 04.4.3:
    - usa solo file finali .sqlite e .jsonl.gz, mai .tmp;
    - se il manifest dice archive_mode=both/full richiede il FULL valido;
    - si ferma al primo gap, così il resume riparte solo dalla parte contigua sicura.
    """
    run_dir = Path(run_dir)
    blocks_dir = run_dir / "blocks"
    index_path = run_dir / "index.sqlite"
    manifest = read_json(run_dir / "manifest.json") or {}
    archive_mode = str(manifest.get("archive_mode") or "both")
    if require_full is None:
        require_full = archive_mode in {"both", "full"}
    candidates: List[Tuple[int, int, int, Path]] = []
    if blocks_dir.exists():
        for db in sorted(blocks_dir.glob("*.sqlite")):
            parsed = parse_block_sqlite_name(db)
            if parsed:
                block_no, start_step, end_step = parsed
                candidates.append((block_no, start_step, end_step, db))
    candidates.sort(key=lambda x: (x[0], x[1], x[2]))
    expected_block = 1
    expected_start = 1
    rebuilt_blocks: List[Dict[str, Any]] = []
    skipped: List[Dict[str, Any]] = []
    problems: List[Dict[str, Any]] = []
    for block_no, start_step, end_step, db in candidates:
        if block_no != expected_block or start_step != expected_start:
            problems.append({"type": "first_gap_or_non_contiguous_block", "expected_block": expected_block, "expected_start": expected_start, "actual_block": block_no, "actual_start": start_step, "path": str(db)})
            break
        light_v = verify_light_db(db, start_step, end_step)
        if not light_v.get("verified"):
            problems.append({"type": "light_block_not_verified", "block_no": block_no, "path": str(db), "verification": light_v})
            break
        full_path = find_full_for_block(run_dir, block_no, start_step, end_step)
        full_v = {"rows_full": 0, "json_bad": 0}
        if require_full:
            if not full_path or not full_path.exists():
                problems.append({"type": "full_missing_for_rebuild", "block_no": block_no, "start_step": start_step, "end_step": end_step})
                break
            full_v = verify_full_jsonl_gz(full_path, start_step, end_step, mode=mode)
            if int(full_v.get("json_bad") or 0) != 0 or int(full_v.get("rows_full") or 0) != (end_step - start_step + 1):
                problems.append({"type": "full_block_not_verified", "block_no": block_no, "path": str(full_path), "verification": full_v})
                break
        elif full_path and full_path.exists():
            full_v = verify_full_jsonl_gz(full_path, start_step, end_step, mode=mode)
        block = {
            "block_no": block_no,
            "start_step": start_step,
            "end_step": end_step,
            "rows_light": int(light_v.get("rows_light") or 0),
            "rows_full": int(full_v.get("rows_full") or 0),
            "sqlite_path": str(db),
            "full_path": str(full_path) if full_path else None,
            "sqlite_sha256": sha256_file(db),
            "full_sha256": sha256_file(full_path) if full_path and full_path.exists() else None,
            "min_pn": light_v.get("min_pn"),
            "max_pn": light_v.get("max_pn"),
            "pn_out_of_clamp": int(light_v.get("pn_out_of_clamp") or 0),
            "formula_mismatches": int(light_v.get("formula_mismatches") or 0),
            "margin_mismatches": int(light_v.get("margin_mismatches") or 0),
            "json_bad": int(full_v.get("json_bad") or 0),
            "verified": True,
            "archive_mode": archive_mode if archive_mode in {"light", "full", "both"} else "both",
            "elapsed_seconds": None,
            "sqlite_bytes": db.stat().st_size,
            "full_bytes": full_path.stat().st_size if full_path and full_path.exists() else 0,
            "completed_ts": db.stat().st_mtime,
        }
        rebuilt_blocks.append(block)
        expected_block += 1
        expected_start = end_step + 1
    if apply:
        backup_path = None
        if index_path.exists():
            backup_dir = run_dir / "repair_backups"
            backup_dir.mkdir(parents=True, exist_ok=True)
            backup_path = backup_dir / f"index_before_rebuild_{int(time.time())}.sqlite"
            shutil.copy2(index_path, backup_path)
        tmp_index = index_path.with_suffix(".sqlite.rebuild_tmp")
        if tmp_index.exists():
            tmp_index.unlink()
        con = init_index_db(tmp_index)
        try:
            for block in rebuilt_blocks:
                _insert_index_block(con, block)
            con.commit()
        finally:
            con.close()
        os.replace(tmp_index, index_path)
        fsync_file(index_path)
    else:
        backup_path = None
    return {
        "ok": len(problems) == 0,
        "action": "rebuild_index",
        "apply": apply,
        "run_dir": str(run_dir),
        "rebuilt_blocks": len(rebuilt_blocks),
        "rebuilt_rows_light": sum(int(b["rows_light"]) for b in rebuilt_blocks),
        "rebuilt_rows_full": sum(int(b["rows_full"]) for b in rebuilt_blocks),
        "last_safe_block": rebuilt_blocks[-1]["block_no"] if rebuilt_blocks else 0,
        "last_safe_step": rebuilt_blocks[-1]["end_step"] if rebuilt_blocks else 0,
        "require_full": bool(require_full),
        "archive_mode": archive_mode,
        "problems": problems,
        "skipped": skipped,
        "backup_index": str(backup_path) if backup_path else None,
    }


def repair_checkpoint_if_safe(run_dir: Path, target_nodes: Optional[int] = None, apply: bool = True) -> Dict[str, Any]:
    run_dir = Path(run_dir)
    checkpoint_path = run_dir / "checkpoint.json"
    cp = read_json(checkpoint_path) or {}
    doc = doctor_run_dir(run_dir, mode="sample")
    safe_nodes = int(doc.get("safe_completed_nodes") or 0)
    safe_blocks = int(doc.get("safe_completed_blocks") or 0)
    if target_nodes is None:
        target_nodes = int(cp.get("total_nodes_requested") or 0) or int((read_json(run_dir / "manifest.json") or {}).get("target_nodes") or 0) or safe_nodes
    can_repair = bool(cp) and int(cp.get("completed_nodes") or 0) == safe_nodes and int(cp.get("completed_blocks") or 0) == safe_blocks and bool(cp.get("rng_state_b64")) and isinstance(cp.get("state"), dict)
    if not can_repair:
        return {
            "ok": False,
            "action": "repair_checkpoint",
            "apply": apply,
            "reason": "checkpoint_state_rng_not_safely_aligned_with_verified_index",
            "checkpoint_completed_nodes": int(cp.get("completed_nodes") or 0),
            "checkpoint_completed_blocks": int(cp.get("completed_blocks") or 0),
            "safe_completed_nodes": safe_nodes,
            "safe_completed_blocks": safe_blocks,
            "can_resume_strictly_after_repair": bool(doc.get("can_resume_strictly")),
        }
    new_cp = dict(cp)
    new_cp.update({
        "version": VERSION,
        "completed_nodes": safe_nodes,
        "completed_blocks": safe_blocks,
        "status": "complete" if target_nodes and safe_nodes >= target_nodes else "partial",
        "next_block_no": safe_blocks + 1,
        "next_start_step": safe_nodes + 1,
        "repaired_by": VERSION,
        "repaired_at": time.time(),
    })
    if apply:
        backup_dir = run_dir / "repair_backups"
        backup_dir.mkdir(parents=True, exist_ok=True)
        if checkpoint_path.exists():
            backup_path = backup_dir / f"checkpoint_before_repair_{int(time.time())}.json"
            shutil.copy2(checkpoint_path, backup_path)
        else:
            backup_path = None
        atomic_write_json(checkpoint_path, new_cp)
    else:
        backup_path = None
    post = doctor_run_dir(run_dir, mode="sample") if apply else doc
    return {
        "ok": True,
        "action": "repair_checkpoint",
        "apply": apply,
        "backup_checkpoint": str(backup_path) if backup_path else None,
        "new_status": new_cp["status"],
        "safe_completed_nodes": safe_nodes,
        "safe_completed_blocks": safe_blocks,
        "next_start_step": safe_nodes + 1,
        "can_resume_strictly_after_repair": bool(post.get("can_resume_strictly")),
    }


def doctor_repair_run_dir(run_dir: Path, mode: str = "sample", apply: bool = True, rebuild_index: bool = True, repair_checkpoint: bool = True) -> Dict[str, Any]:
    run_dir = Path(run_dir)
    started = time.time()
    before = doctor_run_dir(run_dir, mode=mode)
    actions: List[Dict[str, Any]] = []
    if not run_dir.exists():
        return {"ok": False, "version": VERSION, "run_dir": str(run_dir), "apply": apply, "before": before, "actions": [], "after": before, "elapsed_seconds": time.time()-started}
    # 1. Quarantena prudente dei tmp: non vengono promossi, perché lo stato/RNG del child potrebbe mancare.
    q = quarantine_tmp_files(run_dir, apply=apply)
    actions.append(q)
    # 2. Ricostruzione index dai soli blocchi finali verificabili.
    if rebuild_index:
        rb = rebuild_index_from_final_blocks(run_dir, mode=mode, apply=apply)
        actions.append(rb)
    # 3. Se index è andato oltre checkpoint, proviamo prima il recupero sicuro da receipt atomiche.
    if repair_checkpoint:
        ar = advance_checkpoint_from_receipts_if_safe(run_dir, mode=mode, apply=apply)
        actions.append(ar)
        # 4. Se manca receipt, non blocchiamo la run: quaranteniamo gli orfani finali e ricostruiamo index al checkpoint.
        if not ar.get("ok") and ar.get("reason") in {"missing_or_invalid_receipt", "no_receipt_to_apply", "non_contiguous_receipt_recovery"}:
            qo = quarantine_orphan_final_blocks_beyond_checkpoint(run_dir, apply=apply)
            actions.append(qo)
            if rebuild_index:
                rb2 = rebuild_index_from_final_blocks(run_dir, mode=mode, apply=apply)
                actions.append(rb2)
        # 5. Riparazione checkpoint solo se già allineato al punto sicuro e contiene stato/RNG.
        rc = repair_checkpoint_if_safe(run_dir, apply=apply)
        actions.append(rc)
    # STEP 8C: repair metadata-only. Non tocca LIGHT/FULL, checkpoint, receipt, formula o core.
    mr = repair_manifest_metadata_from_archive(run_dir, run_dir / "manifest.json", apply=apply)
    actions.append(mr)
    after = doctor_run_dir(run_dir, mode=mode)
    result = {
        "ok": bool(after.get("can_resume_strictly")) and not bool(after.get("problems")),
        "version": VERSION,
        "run_dir": str(run_dir),
        "apply": apply,
        "before": before,
        "actions": actions,
        "after": after,
        "elapsed_seconds": time.time() - started,
        "next_action": "resume_or_verify" if bool(after.get("can_resume_strictly")) else "manual_review_required",
        "safety_note": "04.4.6 non promuove .tmp; recupera blocchi orfani finali solo con receipt atomica di stato/RNG; rileva e quarantena anche sidecar temporanei .tmp-wal/.tmp-shm.",
    }
    if apply:
        atomic_write_json(run_dir / "repair_latest.json", result)
    return result


def _tail_text(text: str, limit: int = 2400) -> str:
    text = text or ""
    return text[-limit:]


def _json_from_stdout(stdout: str) -> Optional[Dict[str, Any]]:
    try:
        return json.loads(stdout)
    except Exception:
        return None


def _run_selftest_cmd(label: str, cmd: List[str], timeout: int = 180, expect_ok_json: bool = False) -> Dict[str, Any]:
    started = time.time()
    try:
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
        stdout_json = _json_from_stdout(proc.stdout)
        ok = proc.returncode == 0
        if expect_ok_json:
            ok = ok and isinstance(stdout_json, dict) and bool(stdout_json.get("ok"))
        return {"label": label, "ok": ok, "returncode": proc.returncode, "elapsed_seconds": time.time() - started, "cmd": cmd, "stdout_json": stdout_json, "stdout_tail": _tail_text(proc.stdout), "stderr_tail": _tail_text(proc.stderr)}
    except subprocess.TimeoutExpired as e:
        return {"label": label, "ok": False, "error": "timeout", "timeout_seconds": timeout, "elapsed_seconds": time.time() - started, "cmd": cmd, "stdout_tail": _tail_text(e.stdout if isinstance(e.stdout, str) else ""), "stderr_tail": _tail_text(e.stderr if isinstance(e.stderr, str) else "")}
    except Exception as e:
        return {"label": label, "ok": False, "error": "exception", "exception": repr(e), "elapsed_seconds": time.time() - started, "cmd": cmd}


def _make_run_args(base_args: argparse.Namespace, **overrides: Any) -> argparse.Namespace:
    data = vars(base_args).copy()
    data.update({"child": False, "doctor": False, "self_test": False, "verify_run": None, "doctor_run": None, "doctor_repair": None, "pack_run": None, "longsafe": False, "resume": True})
    data.update(overrides)
    return argparse.Namespace(**data)


def _record_direct(results: List[Dict[str, Any]], label: str, fn, expect_ok: bool = True) -> Dict[str, Any]:
    t0 = time.time()
    try:
        value = fn()
        ok = True
        if expect_ok:
            ok = isinstance(value, dict) and bool(value.get("ok"))
        rec = {"label": label, "ok": ok, "elapsed_seconds": time.time() - t0, "result": value}
    except Exception as e:
        rec = {"label": label, "ok": False, "elapsed_seconds": time.time() - t0, "exception": repr(e)}
    results.append(rec)
    return rec


def run_self_test(args: argparse.Namespace) -> Dict[str, Any]:
    """Suite automatica TIME 04.4.4.

    Non modifica il core. Usa solo questo runner + il core indicato. Subprocess solo
    per py_compile/help/doctor bootstrap; i test archivio usano direttamente le
    funzioni del runner per evitare falsi timeout da wrapper annidati.
    """
    started = time.time()
    runner = str(Path(__file__).resolve())
    core = str(Path(args.core).resolve()) if args.core else DEFAULT_CORE
    base_out = Path(args.out_dir) / "self_tests" / f"selftest_{int(started)}"
    base_out.mkdir(parents=True, exist_ok=True)
    progress_path = base_out / "self_test_progress.jsonl"
    def progress(label: str) -> None:
        append_jsonl(progress_path, {"event": label, "ts": time.time()})
    progress("start")
    timeout = max(60, int(getattr(args, "self_test_timeout_seconds", 180)))
    level = str(getattr(args, "self_test_level", "quick") or "quick")
    results: List[Dict[str, Any]] = []
    problems: List[str] = []

    progress("cli_checks_start")
    results.append(_run_selftest_cmd("py_compile_runner_and_core", [sys.executable, "-m", "py_compile", runner, core], timeout=timeout))
    results.append(_run_selftest_cmd("help", [sys.executable, runner, "--help"], timeout=timeout))
    results.append(_run_selftest_cmd("doctor_bootstrap_cli", [sys.executable, runner, "--doctor", "--core", core, "--out-dir", str(base_out)], timeout=timeout, expect_ok_json=True))
    progress("cli_checks_done")

    progress("smoke_start")
    smoke_id = "selftest_smoke_1k"
    smoke_args = _make_run_args(args, nodes=1000, block_size=1000, batch_size=500, archive_mode="both", full_json_check="all", parent_full_json_check="all", run_id=smoke_id, out_dir=str(base_out), core=core, max_blocks_this_invocation=2, child_timeout_seconds=timeout, seed=431042)
    _record_direct(results, "run_smoke_1k", lambda: orchestrate(smoke_args))
    smoke_dir = base_out / smoke_id
    _record_direct(results, "verify_smoke_1k", lambda: verify_run_dir(smoke_dir, mode="all"))
    _record_direct(results, "doctor_smoke_1k", lambda: doctor_run_dir(smoke_dir, mode="all"))
    progress("smoke_done")

    progress("resume_start")
    resume_id = "selftest_resume_2k"
    resume_args_1 = _make_run_args(args, nodes=2000, block_size=1000, batch_size=500, archive_mode="both", full_json_check="all", parent_full_json_check="all", run_id=resume_id, out_dir=str(base_out), core=core, max_blocks_this_invocation=1, child_timeout_seconds=timeout, seed=431042)
    def _resume_part1():
        rep = orchestrate(resume_args_1)
        rep_ok = int(rep.get("completed_nodes") or 0) == 1000 and not bool(rep.get("errors"))
        rep["ok"] = rep_ok
        rep["expected_partial"] = True
        return rep
    _record_direct(results, "resume_part1_1k_of_2k", _resume_part1)
    resume_args_2 = _make_run_args(args, nodes=2000, block_size=1000, batch_size=500, archive_mode="both", full_json_check="all", parent_full_json_check="all", run_id=resume_id, out_dir=str(base_out), core=core, max_blocks_this_invocation=2, child_timeout_seconds=timeout, seed=431042)
    _record_direct(results, "resume_part2_to_2k", lambda: orchestrate(resume_args_2))
    resume_dir = base_out / resume_id
    _record_direct(results, "verify_resume_2k", lambda: verify_run_dir(resume_dir, mode="all"))
    _record_direct(results, "doctor_resume_2k", lambda: doctor_run_dir(resume_dir, mode="all"))
    progress("resume_done")

    progress("repair_start")
    repair_id = "selftest_repair_tmp"
    repair_dir = base_out / repair_id
    def _repair_tmp_case():
        if repair_dir.exists(): shutil.rmtree(repair_dir)
        shutil.copytree(smoke_dir, repair_dir)
        (repair_dir / "blocks" / "artificial_block.sqlite.tmp").write_text("tmp", encoding="utf-8")
        (repair_dir / "blocks" / "artificial_block.sqlite.tmp-wal").write_bytes(b"wal")
        (repair_dir / "blocks" / "artificial_block.sqlite.tmp-shm").write_bytes(b"shm")
        (repair_dir / "full" / "artificial_full.jsonl.gz.tmp").write_bytes(b"tmp")
        before = doctor_run_dir(repair_dir, mode="sample")
        dry = doctor_repair_run_dir(repair_dir, mode="sample", apply=False)
        real = doctor_repair_run_dir(repair_dir, mode="sample", apply=True)
        after = doctor_run_dir(repair_dir, mode="sample")
        qdir = repair_dir / "quarantine"
        quarantined = qdir.exists() and any(qdir.rglob("*.tmp"))
        ok = bool(before.get("disk", {}).get("sqlite_tmp_count") or before.get("disk", {}).get("full_tmp_count")) and bool(dry.get("actions")) and bool(real.get("actions")) and bool(after.get("can_resume_strictly")) and int(after.get("disk", {}).get("sqlite_tmp_count") or 0) == 0 and int(after.get("disk", {}).get("full_tmp_count") or 0) == 0 and quarantined
        return {"ok": ok, "before_ok_expected_false": before.get("ok"), "dry_ok": dry.get("ok"), "repair_ok": real.get("ok"), "after_ok": after.get("ok"), "quarantined": quarantined, "repair_dir": str(repair_dir)}
    _record_direct(results, "repair_tmp_quarantine", _repair_tmp_case)
    progress("repair_done")

    progress("rebuild_start")
    rebuild_id = "selftest_rebuild_index"
    rebuild_dir = base_out / rebuild_id
    def _rebuild_index_case():
        if rebuild_dir.exists(): shutil.rmtree(rebuild_dir)
        shutil.copytree(smoke_dir, rebuild_dir)
        idx = rebuild_dir / "index.sqlite"
        if idx.exists(): idx.unlink()
        before = doctor_run_dir(rebuild_dir, mode="sample")
        repair = doctor_repair_run_dir(rebuild_dir, mode="sample", apply=True, rebuild_index=True, repair_checkpoint=True)
        verify = verify_run_dir(rebuild_dir, mode="all")
        after = doctor_run_dir(rebuild_dir, mode="sample")
        ok = bool(before.get("problems")) and bool(repair.get("actions")) and bool(verify.get("ok")) and bool(after.get("can_resume_strictly")) and idx.exists()
        return {"ok": ok, "before_problems": before.get("problems"), "repair_ok": repair.get("ok"), "verify_ok": verify.get("ok"), "after_ok": after.get("ok"), "rebuild_dir": str(rebuild_dir)}
    _record_direct(results, "rebuild_index", _rebuild_index_case)
    progress("rebuild_done")

    progress("corrupt_start")
    corrupt_id = "selftest_corrupt_full"
    corrupt_dir = base_out / corrupt_id
    def _corrupt_full_case():
        if corrupt_dir.exists(): shutil.rmtree(corrupt_dir)
        shutil.copytree(smoke_dir, corrupt_dir)
        full_files = sorted((corrupt_dir / "full").glob("*.jsonl.gz"))
        if not full_files: raise RuntimeError("no_full_files_to_corrupt")
        p = full_files[0]
        data = p.read_bytes()
        p.write_bytes(data[:max(1, len(data)//3)])
        verify = verify_run_dir(corrupt_dir, mode="all")
        doctor = doctor_run_dir(corrupt_dir, mode="all")
        detected = (not bool(verify.get("ok"))) or bool(verify.get("problems")) or int(verify.get("full_reverify_bad") or 0) > 0 or bool(doctor.get("problems"))
        return {"ok": detected, "verify_ok_expected_false": verify.get("ok"), "verify_problems": verify.get("problems"), "full_reverify_bad": verify.get("full_reverify_bad"), "doctor_problems": doctor.get("problems"), "corrupt_dir": str(corrupt_dir)}
    _record_direct(results, "corrupt_full_detection", _corrupt_full_case)
    progress("corrupt_done")

    if level in {"standard", "all", "deep"}:
        progress("standard_alias_quick")
        results.append({"label": "standard_level_note", "ok": True, "note": "In TIME 04.4.4 lo standard è volutamente alias della quick suite stabile; i run medi/lunghi restano test esterni per evitare falsi timeout della suite."})

    progress("summary_start")
    for r in results:
        if not r.get("ok"):
            problems.append(str(r.get("label")))
    # Per il report finale manteniamo anche i risultati tecnici, ma il chiamante può leggere il summary in alto.
    summary = {"ok": len(problems) == 0, "version": VERSION, "mode": "self_test", "level": level, "runner": runner, "core": core, "self_test_root": str(base_out), "tests_total": len(results), "tests_ok": sum(1 for r in results if r.get("ok")), "tests_failed": problems, "elapsed_seconds": time.time() - started, "progress_log": str(progress_path), "results": results}
    atomic_write_json(base_out / "self_test_latest.json", summary)
    progress("complete")
    return summary


def _safe_parse_json_text(text: str) -> Optional[Dict[str, Any]]:
    try:
        return json.loads(text or "")
    except Exception:
        return None


def _stress_tmp_files_outside(run_dir: Path) -> List[str]:
    """Ritorna temporanei fuori da quarantine/orphan_blocks.

    TIME 04.4.11: la batteria stessa deve controllare .tmp, .tmp-wal, .tmp-shm e
    non deve confondere file già quarantinati con residui vivi della run.
    """
    found: List[str] = []
    for p in run_dir.rglob("*tmp*"):
        rel = p.relative_to(run_dir)
        parts = set(rel.parts)
        if "quarantine" in parts or "orphan_blocks" in parts:
            continue
        if p.is_file():
            found.append(str(rel))
    return sorted(found)


def _stress_checkpoint_nodes(run_dir: Path) -> int:
    cp = read_json(run_dir / "checkpoint.json") or {}
    return int(cp.get("completed_nodes") or 0)


def _stress_append_event(path: Path, event: Dict[str, Any]) -> None:
    data = dict(event)
    data.setdefault("ts", time.time())
    append_jsonl(path, data)


def _stress_run_cli(cmd: List[str], timeout: int) -> Dict[str, Any]:
    """Esegue un comando CLI della stress-suite con guardia anti-timeout reale.

    TIME 04.4.31: usa stdout/stderr su file temporanei invece di PIPE.
    Questo evita hang del wrapper sui 50k/10-tick quando il runner interno
    continua a produrre output o quando il processo viene tagliato.
    """
    started = time.time()
    proc = None
    stdout = ""
    stderr = ""
    try:
        import tempfile
        tmp_dir = Path(tempfile.mkdtemp(prefix="time04431_stress_cli_", dir="/mnt/data" if Path("/mnt/data").exists() else None))
        stdout_path = tmp_dir / "stdout.json"
        stderr_path = tmp_dir / "stderr.txt"
        with open(stdout_path, "w", encoding="utf-8") as out, open(stderr_path, "w", encoding="utf-8") as err:
            proc = subprocess.Popen(cmd, stdout=out, stderr=err, text=True, start_new_session=True, preexec_fn=_pdeathsig_preexec)
            deadline = time.time() + max(1, int(timeout))
            while True:
                if proc.poll() is not None:
                    break
                if time.time() >= deadline:
                    kill_actions = []
                    try:
                        os.killpg(proc.pid, signal.SIGTERM)
                        kill_actions.append("sigterm_pgid")
                    except ProcessLookupError:
                        kill_actions.append("already_gone_before_sigterm")
                    except Exception as e:
                        kill_actions.append(f"sigterm_error:{repr(e)}")
                    grace_deadline = time.time() + 5
                    while proc.poll() is None and time.time() < grace_deadline:
                        time.sleep(0.1)
                    if proc.poll() is None:
                        try:
                            os.killpg(proc.pid, signal.SIGKILL)
                            kill_actions.append("sigkill_pgid")
                        except ProcessLookupError:
                            kill_actions.append("gone_before_sigkill")
                        except Exception as e:
                            kill_actions.append(f"sigkill_error:{repr(e)}")
                        try:
                            proc.wait(timeout=5)
                        except Exception:
                            pass
                    stdout = stdout_path.read_text(encoding="utf-8", errors="replace") if stdout_path.exists() else ""
                    stderr = stderr_path.read_text(encoding="utf-8", errors="replace") if stderr_path.exists() else ""
                    return {
                        "ok": False,
                        "error": "cli_timeout_killed_process_group_fileio",
                        "timeout_seconds": timeout,
                        "elapsed_seconds": time.time() - started,
                        "returncode": proc.returncode,
                        "kill_actions": kill_actions,
                        "stdout_json": _safe_parse_json_text(stdout),
                        "stdout_tail": _tail_text(stdout, 1600),
                        "stderr_tail": _tail_text(stderr, 1600),
                        "stdout_path": str(stdout_path),
                        "stderr_path": str(stderr_path),
                        "cmd_tail": cmd[-12:],
                    }
                time.sleep(0.1)
        stdout = stdout_path.read_text(encoding="utf-8", errors="replace") if stdout_path.exists() else ""
        stderr = stderr_path.read_text(encoding="utf-8", errors="replace") if stderr_path.exists() else ""
        stdout_json = _safe_parse_json_text(stdout)
        semantic_ok = (proc.returncode == 0)
        if isinstance(stdout_json, dict) and stdout_json.get("ok") is False:
            semantic_ok = False
        return {
            "ok": semantic_ok,
            "returncode": proc.returncode,
            "elapsed_seconds": time.time() - started,
            "stdout_json": stdout_json,
            "stdout_tail": _tail_text(stdout, 1600),
            "stderr_tail": _tail_text(stderr, 1600),
            "stdout_path": str(stdout_path),
            "stderr_path": str(stderr_path),
            "cmd_tail": cmd[-12:],
        }
    except Exception as e:
        try:
            if proc is not None and proc.poll() is None:
                os.killpg(proc.pid, signal.SIGKILL)
        except Exception:
            pass
        return {"ok": False, "error": "cli_exception_fileio", "exception": repr(e), "elapsed_seconds": time.time() - started, "stdout_tail": _tail_text(stdout, 1600), "stderr_tail": _tail_text(stderr, 1600), "cmd_tail": cmd[-12:]}


def _stress_effective_timeout(user_timeout: int, window_blocks: int, block_size: int, phase: str = "resume") -> int:
    """TIME 04.4.39: timeout prudente/adattivo per evitare che il wrapper esterno
    tagli il supervisore prima del suo timeout interno.

    Non cambia il core, la formula o gli archivi: cambia solo il limite della
    singola invocazione CLI. Per i blocchi da 5000 osservati (~5-9 s/blocco),
    una finestra da 1 blocco resta intorno a 30 s; finestre maggiori hanno un
    tetto calcolato ma comunque non superiore al valore utente.
    """
    try:
        ub = int(user_timeout)
    except Exception:
        ub = 30
    try:
        wb = max(1, int(window_blocks))
    except Exception:
        wb = 1
    try:
        bs = max(1, int(block_size))
    except Exception:
        bs = 5000
    # Scala prudenziale: 5000 nodi ≈ 1 unità. Overhead doctor/SQLite/gzip incluso.
    block_units = max(1.0, bs / 5000.0)
    estimated = int(round(16 + 14 * wb * block_units))
    if phase in {"doctor", "repair"}:
        estimated = max(30, estimated)
    elif phase == "verify":
        # verify finale può leggere più file; resta più largo, ma non enorme.
        estimated = max(45, estimated)
    else:
        estimated = max(20, estimated)
    return max(10, min(max(10, ub), estimated))


def _stress_timeout_policy(user_timeout: int, window_blocks: int, block_size: int, phase: str = "resume") -> Dict[str, Any]:
    effective = _stress_effective_timeout(user_timeout, window_blocks, block_size, phase=phase)
    return {
        "phase": phase,
        "user_timeout_seconds": int(user_timeout),
        "effective_timeout_seconds": int(effective),
        "window_blocks": int(window_blocks),
        "block_size": int(block_size),
        "adaptive_timeout_applied": int(effective) != int(user_timeout),
        "policy": "TIME_04_4_39_adaptive_timeout_forensics_no_core_change",
    }

def _stress_kill_process_group(proc: subprocess.Popen, mode: str) -> Dict[str, Any]:
    """Termina il processo runner in modo controllato o brutale."""
    killed = False
    signal_used = None
    try:
        if proc.poll() is None:
            if mode == "sigterm":
                signal_used = "SIGTERM"
                os.killpg(proc.pid, signal.SIGTERM)
            else:
                signal_used = "SIGKILL"
                os.killpg(proc.pid, signal.SIGKILL)
            killed = True
    except ProcessLookupError:
        pass
    except Exception as e:
        return {"killed": killed, "signal": signal_used, "error": repr(e)}
    return {"killed": killed, "signal": signal_used}


def run_stress_interrupt_suite(args: argparse.Namespace) -> Dict[str, Any]:
    """Batteria stress interrupt incorporata, atomica e rilanciabile.

    Obiettivo: stressare timeout/interruzioni senza toccare il core. Ogni caso salva
    evento e summary su disco; se il wrapper interrompe la batteria, rilanciando con
    --stress-resume-suite si saltano i casi già completati.
    """
    started = time.time()
    invocation_id = f"stress_inv_{int(started)}_{os.getpid()}"
    runner = str(Path(__file__).resolve())
    core = str(Path(args.core).resolve()) if args.core else DEFAULT_CORE
    suite_id = str(getattr(args, "stress_suite_id", "") or f"stress0439_{int(started)}")
    suite_root = Path(args.out_dir) / suite_id
    runs_root = suite_root / "runs"
    suite_root.mkdir(parents=True, exist_ok=True)
    runs_root.mkdir(parents=True, exist_ok=True)
    events_path = suite_root / "stress_events.jsonl"
    summary_path = suite_root / "stress_summary.json"
    resume_suite = bool(getattr(args, "stress_resume_suite", False))
    rng = random.Random(int(getattr(args, "stress_seed", 4408)))
    total_cases = max(1, int(getattr(args, "stress_cases", 10)))
    only_case = int(getattr(args, "stress_only_case", 0) or 0)
    if only_case > 0:
        start_case_no = max(1, only_case)
        end_case_no = start_case_no
        total_cases = max(total_cases, end_case_no)
    else:
        start_case_no = max(1, int(getattr(args, "stress_start_case", 1) or 1))
        end_case_no = max(start_case_no, total_cases)
        total_cases = max(total_cases, end_case_no)
    expected_case_ids = {f"case_{j:04d}" for j in range(start_case_no, end_case_no + 1)}
    max_cases_this_invocation = max(1, int(getattr(args, "stress_max_cases_per_invocation", 1)))
    cases_done_this_invocation = 0
    target_nodes = max(100, int(getattr(args, "stress_target_nodes", 5000)))
    block_size = max(100, min(MAX_BLOCK_SIZE, int(getattr(args, "stress_block_size", 1000))))
    kill_min = max(0, int(getattr(args, "stress_kill_after_min_ms", 100)))
    kill_max = max(kill_min, int(getattr(args, "stress_kill_after_max_ms", 1500)))
    time_budget = max(5, int(getattr(args, "stress_time_budget_seconds", 120)))
    case_timeout_user = max(10, int(getattr(args, "stress_case_timeout_seconds", 30)))
    case_timeout = case_timeout_user
    resume_blocks = max(1, int(getattr(args, "stress_resume_window_blocks", 2)))
    first_max_blocks = max(1, int(getattr(args, "stress_first_run_max_blocks", 999999)))
    kill_mode_arg = str(getattr(args, "stress_kill_signal", "mixed") or "mixed")

    previous: Dict[str, Any] = {}
    results: List[Dict[str, Any]] = []
    completed_ids = set()
    pending_ids = set()
    if summary_path.exists() and resume_suite:
        previous = read_json(summary_path) or {}
        results = list(previous.get("results") or [])
        completed_ids = {str(r.get("case_id")) for r in results if r.get("case_complete")}
        pending_ids = {str(r.get("case_id")) for r in results if (r.get("pending_resume") or r.get("phase") == "process_running") and not r.get("case_complete")}

    _stress_append_event(events_path, {"event":"suite_start", "version": VERSION, "suite_id": suite_id, "resume_suite": resume_suite, "cases_requested": total_cases, "case_range": [start_case_no, end_case_no], "target_nodes": target_nodes, "block_size": block_size, "invocation_id": invocation_id, "runner_pid": os.getpid(), "timeout_policy": {"user_timeout_seconds": case_timeout_user, "effective_timeout_seconds": case_timeout, "default_changed_in": "TIME_04_4_39"}})

    def write_summary(status: str) -> Dict[str, Any]:
        scoped_results = [r for r in results if str(r.get("case_id")) in expected_case_ids]
        complete_scoped = [r for r in scoped_results if r.get("case_complete")]
        ok_cases = sum(1 for r in complete_scoped if r.get("ok"))
        failed = [r for r in complete_scoped if not r.get("ok")]
        summary = {
            "ok": len(failed) == 0 and len(complete_scoped) >= len(expected_case_ids),
            "version": VERSION,
            "mode": "stress_interrupt_suite",
            "status": status,
            "suite_id": suite_id,
            "suite_root": str(suite_root),
            "runs_root": str(runs_root),
            "runner": runner,
            "core": core,
            "cases_requested": total_cases,
            "case_range": [start_case_no, end_case_no],
            "expected_case_ids": sorted(expected_case_ids),
            "max_cases_this_invocation": max_cases_this_invocation,
            "cases_done_this_invocation": cases_done_this_invocation,
            "cases_recorded": len(results),
            "cases_complete": len(complete_scoped),
            "cases_ok": ok_cases,
            "cases_failed": len(failed),
            "failed_case_ids": [r.get("case_id") for r in failed],
            "elapsed_seconds": time.time() - started,
            "time_budget_seconds": time_budget,
            "events_path": str(events_path),
            "summary_path": str(summary_path),
            "results": results,
            "next_action": "complete" if len(failed) == 0 and len(complete_scoped) >= len(expected_case_ids) else "rerun_with_--stress-resume-suite",
        }
        atomic_write_json(summary_path, summary)
        return summary

    def stress_doctor_cli(run_id_value: str) -> Dict[str, Any]:
        cmd = [sys.executable, runner, "--doctor-run", run_id_value, "--out-dir", str(runs_root), "--core", core,
               "--parent-full-json-check", "sample", "--full-json-check", "sample"]
        rr = _stress_run_cli(cmd, timeout=_stress_effective_timeout(case_timeout, 1, block_size, phase="doctor"))
        data = rr.get("stdout_json") or {}
        if data:
            data.setdefault("_cli_ok", rr.get("ok"))
            data.setdefault("_cli_elapsed_seconds", rr.get("elapsed_seconds"))
            return data
        return {"ok": False, "can_resume_strictly": False, "problems": [rr.get("error") or "doctor_cli_failed"], "_cli_result": rr}

    def stress_repair_cli(run_id_value: str) -> Dict[str, Any]:
        cmd = [sys.executable, runner, "--doctor-repair", run_id_value, "--out-dir", str(runs_root), "--core", core,
               "--parent-full-json-check", "sample", "--full-json-check", "sample"]
        rr = _stress_run_cli(cmd, timeout=_stress_effective_timeout(case_timeout, 1, block_size, phase="repair"))
        data = rr.get("stdout_json") or {}
        if data:
            data.setdefault("_cli_ok", rr.get("ok"))
            data.setdefault("_cli_elapsed_seconds", rr.get("elapsed_seconds"))
            return data
        return {"ok": False, "actions": [], "problems": [rr.get("error") or "repair_cli_failed"], "_cli_result": rr}

    def stress_verify_cli(run_id_value: str) -> Dict[str, Any]:
        cmd = [sys.executable, runner, "--verify-run", run_id_value, "--out-dir", str(runs_root), "--core", core,
               "--full-json-check", "all"]
        rr = _stress_run_cli(cmd, timeout=_stress_effective_timeout(case_timeout, max(1, target_nodes // max(1, block_size)), block_size, phase="verify"))
        data = rr.get("stdout_json") or {}
        if data:
            data.setdefault("_cli_ok", rr.get("ok"))
            data.setdefault("_cli_elapsed_seconds", rr.get("elapsed_seconds"))
            return data
        return {"ok": False, "problems": [rr.get("error") or "verify_cli_failed"], "_cli_result": rr}

    def find_previous_case(case_id_value: str) -> Dict[str, Any]:
        for r in reversed(results):
            if str(r.get("case_id")) == case_id_value:
                return r
        return {}

    def kill_lingering_recorded_process(case_id_value: str) -> Dict[str, Any]:
        prev = find_previous_case(case_id_value)
        pid = prev.get("process_pid") or prev.get("process_pgid")
        if not pid:
            return {"attempted": False, "reason": "no_recorded_pid"}
        try:
            pid = int(pid)
        except Exception:
            return {"attempted": False, "reason": "bad_pid", "pid": str(pid)}
        actions = []
        try:
            os.killpg(pid, signal.SIGTERM)
            actions.append("sigterm_pgid")
            time.sleep(0.5)
        except ProcessLookupError:
            return {"attempted": True, "pid": pid, "already_gone": True, "actions": actions}
        except Exception as e:
            actions.append(f"sigterm_error:{repr(e)}")
        try:
            os.killpg(pid, signal.SIGKILL)
            actions.append("sigkill_pgid")
        except ProcessLookupError:
            actions.append("gone_before_sigkill")
        except Exception as e:
            actions.append(f"sigkill_error:{repr(e)}")
        return {"attempted": True, "pid": pid, "actions": actions}

    # Mantieni identica la sequenza random della suite completa: prima di partire
    # dal caso isolato consumiamo i randint dei casi precedenti.
    for _ in range(start_case_no - 1):
        rng.randint(0, max(0, kill_max-kill_min))

    for i in range(start_case_no - 1, end_case_no):
        case_id = f"case_{i+1:04d}"
        if case_id in completed_ids:
            continue
        if time.time() - started > time_budget and any(r.get("case_complete") for r in results):
            _stress_append_event(events_path, {"event":"suite_time_budget_stop", "case_next": case_id})
            return write_summary("partial_time_budget")

        run_id = f"{suite_id}_{case_id}"
        run_dir = runs_root / run_id
        if run_dir.exists() and not resume_suite:
            shutil.rmtree(run_dir)
        seed = int(getattr(args, "stress_seed", 4408)) + i * 17

        # TIME 04.4.11 — resume della suite robusto sui casi iniziati ma non registrati.
        # Se il wrapper interrompe la batteria dopo case_start/case_killed ma prima di
        # case_end/write_summary, al rilancio non dobbiamo ri-killare lo stesso caso sopra
        # una run con .tmp residui. Prima ripariamo la run esistente e la portiamo a
        # completamento; poi registriamo il caso come recovered_on_suite_resume.
        if resume_suite and (run_dir.exists() or case_id in pending_ids) and case_id not in completed_ids:
            # TIME 04.4.13 — caso kill ultra-precoce: il processo può essere ucciso
            # prima che crei run_dir/checkpoint. Se il summary contiene pending_resume,
            # NON dobbiamo ri-killare lo stesso caso: dobbiamo avviare un resume normale
            # da zero e completare/validare il caso.
            lingering_kill = kill_lingering_recorded_process(case_id)
            _stress_append_event(events_path, {"event":"case_resume_recovery_start", "case_id": case_id, "run_id": run_id, "run_dir_exists": run_dir.exists(), "pending_from_summary": case_id in pending_ids, "lingering_kill": lingering_kill, "tmp_outside": _stress_tmp_files_outside(run_dir)[:20] if run_dir.exists() else [], "checkpoint_nodes": _stress_checkpoint_nodes(run_dir) if run_dir.exists() else 0})
            if run_dir.exists():
                # TIME 04.4.33 — preflight repair obbligatorio per 50k/10-tick.
                # La scorciatoia 04.4.21 saltava il doctor quando non c'erano .tmp,
                # ma nei test 50k abbiamo trovato orfani finali con receipt valida e zero .tmp.
                # Quindi prima di ogni finestra stress-resume: doctor -> repair se serve -> doctor.
                before_doctor = stress_doctor_cli(run_id)
                if not bool(before_doctor.get("can_resume_strictly")):
                    repair = stress_repair_cli(run_id)
                    after_repair_doctor = stress_doctor_cli(run_id)
                else:
                    repair = {"ok": True, "actions": [], "skipped": True, "reason": "preflight_doctor_clean_no_repair_needed"}
                    after_repair_doctor = before_doctor
            else:
                before_doctor = {"ok": True, "problems": [], "note": "run_dir_missing_after_ultra_early_kill_resume_from_zero"}
                repair = {"ok": True, "actions": [], "note": "nothing_to_repair_run_dir_missing"}
                after_repair_doctor = before_doctor
            resume_reports: List[Dict[str, Any]] = []
            resume_ok = True
            for attempt in range(1):  # TIME 04.4.18: una sola finestra di resume per invocazione stress-resume-suite, anti-timeout
                completed = _stress_checkpoint_nodes(run_dir)
                if completed >= target_nodes:
                    break
                # TIME 04.4.24 — adaptive tick + repair guard.
                # La 04.4.21/04.4.22 usava sempre 1 blocco per finestra nella stress-suite:
                # massima sicurezza, ma lentezza alta. Qui onoriamo --stress-resume-window-blocks
                # per provare 2/3 tick, ma se la finestra va in timeout torniamo subito a 1 tick
                # nella stessa invocazione. Il core non cambia; cambia solo la dimensione della
                # finestra operativa di resume.
                requested_window_blocks_raw = max(1, int(getattr(args, "stress_resume_window_blocks", 1) or 1))
                # TIME 04.4.37 — safe window cap anti-wrapper-timeout.
                # Il test reale mostra che 10 tick ciechi possono superare il limite del wrapper
                # e lasciare .tmp mentre il runner è ancora sano. Accettiamo la richiesta 10-tick,
                # ma in stress-suite la traduciamo in sotto-finestre sicure da massimo 3 blocchi.
                # Il target resta identico; cambia solo la granularità operativa della finestra.
                requested_window_blocks = min(requested_window_blocks_raw, 3)
                resume_cmd = [sys.executable, runner,
                              "--nodes", str(target_nodes), "--block-size", str(block_size), "--batch-size", str(max(100, min(1000, block_size))),
                              "--archive-mode", "both", "--full-json-check", "sample", "--parent-full-json-check", "sample",
                              "--max-blocks-this-invocation", str(requested_window_blocks), "--child-timeout-seconds", str(_stress_effective_timeout(case_timeout, requested_window_blocks, block_size, phase="resume_child")),
                              "--out-dir", str(runs_root), "--run-id", run_id, "--seed", str(seed), "--core", core, "--resume"]
                forensic_window_id = f"{invocation_id}_{case_id}_resume_{attempt+1}_{completed}_{target_nodes}"
                _stress_append_event(events_path, {"event":"resume_window_cli_start", "case_id": case_id, "window_id": forensic_window_id, "invocation_id": invocation_id, "checkpoint_nodes_before": completed, "target_nodes": target_nodes, "requested_window_blocks_raw": requested_window_blocks_raw, "requested_window_blocks": requested_window_blocks, "case_timeout_seconds": case_timeout, "timeout_policy": _stress_timeout_policy(case_timeout, requested_window_blocks, block_size, phase="resume"), "cmd_tail": resume_cmd[-12:]})
                rr = _stress_run_cli(resume_cmd, timeout=_stress_effective_timeout(case_timeout, requested_window_blocks, block_size, phase="resume"))
                cp_after_forensic = _stress_checkpoint_nodes(run_dir) if run_dir.exists() else 0
                _stress_append_event(events_path, {"event":"resume_window_cli_end", "case_id": case_id, "window_id": forensic_window_id, "invocation_id": invocation_id, "checkpoint_nodes_before": completed, "checkpoint_nodes_after": cp_after_forensic, "ok": rr.get("ok"), "error": rr.get("error"), "elapsed_seconds": rr.get("elapsed_seconds"), "returncode": rr.get("returncode"), "stdout_json_summary": {k: (rr.get("stdout_json") or {}).get(k) for k in ["ok", "complete", "status", "completed_nodes", "completed_blocks", "errors"]}, "stderr_tail": rr.get("stderr_tail"), "stdout_path": rr.get("stdout_path"), "stderr_path": rr.get("stderr_path")})
                resume_reports.append({"attempt": attempt+1, "mode": "requested_window", "requested_window_blocks_raw": requested_window_blocks_raw, "requested_window_blocks": requested_window_blocks, "safe_window_cap_applied": requested_window_blocks_raw != requested_window_blocks, "ok": rr.get("ok"), "stdout_json_summary": {k: (rr.get("stdout_json") or {}).get(k) for k in ["ok", "complete", "status", "completed_nodes", "completed_blocks", "errors"]}, "error": rr.get("error"), "elapsed_seconds": rr.get("elapsed_seconds"), "checkpoint_nodes_after_forensic": cp_after_forensic})
                if (not rr.get("ok")) and requested_window_blocks > 1 and str(rr.get("error") or "").startswith("cli_timeout"):
                    # Fallback prudente: controlla lo stato e prova 1 solo tick. Se anche questo fallisce,
                    # la suite resta pending e il rilancio successivo riparte dal checkpoint sicuro.
                    fallback_doctor_before = stress_doctor_cli(run_id) if run_dir.exists() else {"ok": True, "note": "run_dir_missing_before_fallback"}
                    # TIME 04.4.24: se il timeout ha lasciato un blocco finale orfano
                    # post-child/pre-checkpoint, prima del fallback singolo serve repair.
                    # Altrimenti il fallback trova strict_resume_failed e stampa JSON ok=false.
                    fallback_repair = stress_repair_cli(run_id) if run_dir.exists() else {"ok": True, "note": "run_dir_missing_before_fallback_repair"}
                    fallback_doctor_after_repair = stress_doctor_cli(run_id) if run_dir.exists() else {"ok": True, "note": "run_dir_missing_after_fallback_repair"}
                    fallback_cmd = [sys.executable, runner,
                                    "--nodes", str(target_nodes), "--block-size", str(block_size), "--batch-size", str(max(100, min(1000, block_size))),
                                    "--archive-mode", "both", "--full-json-check", "sample", "--parent-full-json-check", "sample",
                                    "--max-blocks-this-invocation", "1", "--child-timeout-seconds", str(_stress_effective_timeout(case_timeout, 1, block_size, phase="fallback_child")),
                                    "--out-dir", str(runs_root), "--run-id", run_id, "--seed", str(seed), "--core", core, "--resume"]
                    fallback_window_id = f"{invocation_id}_{case_id}_fallback_{attempt+1}_{_stress_checkpoint_nodes(run_dir) if run_dir.exists() else 0}_{target_nodes}"
                    _stress_append_event(events_path, {"event":"fallback_single_tick_cli_start", "case_id": case_id, "window_id": fallback_window_id, "invocation_id": invocation_id, "checkpoint_nodes_before": _stress_checkpoint_nodes(run_dir) if run_dir.exists() else 0, "target_nodes": target_nodes, "requested_window_blocks": 1, "case_timeout_seconds": case_timeout, "timeout_policy": _stress_timeout_policy(case_timeout, 1, block_size, phase="fallback"), "cmd_tail": fallback_cmd[-12:]})
                    rr_fb = _stress_run_cli(fallback_cmd, timeout=_stress_effective_timeout(case_timeout, 1, block_size, phase="fallback"))
                    cp_after_fallback_forensic = _stress_checkpoint_nodes(run_dir) if run_dir.exists() else 0
                    _stress_append_event(events_path, {"event":"fallback_single_tick_cli_end", "case_id": case_id, "window_id": fallback_window_id, "invocation_id": invocation_id, "checkpoint_nodes_after": cp_after_fallback_forensic, "ok": rr_fb.get("ok"), "error": rr_fb.get("error"), "elapsed_seconds": rr_fb.get("elapsed_seconds"), "returncode": rr_fb.get("returncode"), "stdout_json_summary": {k: (rr_fb.get("stdout_json") or {}).get(k) for k in ["ok", "complete", "status", "completed_nodes", "completed_blocks", "errors"]}, "stderr_tail": rr_fb.get("stderr_tail"), "stdout_path": rr_fb.get("stdout_path"), "stderr_path": rr_fb.get("stderr_path")})
                    resume_reports.append({"attempt": attempt+1, "mode": "fallback_single_tick_after_timeout", "requested_window_blocks": 1, "doctor_before_fallback_ok": fallback_doctor_before.get("ok"), "doctor_before_fallback_can_resume": fallback_doctor_before.get("can_resume_strictly"), "fallback_repair_ok": fallback_repair.get("ok"), "fallback_repair_actions_count": len(fallback_repair.get("actions") or []), "doctor_after_repair_ok": fallback_doctor_after_repair.get("ok"), "doctor_after_repair_can_resume": fallback_doctor_after_repair.get("can_resume_strictly"), "ok": rr_fb.get("ok"), "stdout_json_summary": {k: (rr_fb.get("stdout_json") or {}).get(k) for k in ["ok", "complete", "status", "completed_nodes", "completed_blocks", "errors"]}, "error": rr_fb.get("error"), "elapsed_seconds": rr_fb.get("elapsed_seconds"), "checkpoint_nodes_after_forensic": cp_after_fallback_forensic})
                    rr = rr_fb
                if not rr.get("ok"):
                    resume_ok = False
                    break
            tmp_outside = _stress_tmp_files_outside(run_dir) if run_dir.exists() else []
            cp_nodes = _stress_checkpoint_nodes(run_dir) if run_dir.exists() else 0
            # TIME 04.4.17 — recovery davvero a finestra singola: non tentare di completare
            # un target alto nello stesso --stress-resume-suite. Questo evita che la
            # suite stessa vada in timeout. Ogni invocazione fa una sola finestra
            # breve, salva progresso atomico e chiede rilancio finché il target non
            # è raggiunto. Verify/doctor finali partono solo a target completo.
            if cp_nodes < target_nodes:  # TIME 04.4.18: anche se una finestra resume va in timeout, salva pending e rilancia
                results = [r for r in results if str(r.get("case_id")) != case_id]
                pending_result = {
                    "case_id": case_id,
                    "ok": False,
                    "case_complete": False,
                    "pending_resume": True,
                    "phase": "recovery_window_complete_pending_more_resume",
                    "recovered_on_suite_resume": True,
                    "lingering_kill": lingering_kill,
                    "run_id": run_id,
                    "run_dir": str(run_dir),
                    "checkpoint_nodes_after_resume": cp_nodes,
                    "target_nodes": target_nodes,
                    "before_doctor_ok": before_doctor.get("ok"),
                    "before_doctor_problems": before_doctor.get("problems"),
                    "repair_ok": repair.get("ok"),
                    "repair_actions_count": len(repair.get("actions") or []),
                    "after_repair_ok": after_repair_doctor.get("ok"),
                    "resume_ok": resume_ok,
                    "resume_attempts": len(resume_reports),
                    "resume_reports_tail": resume_reports[-5:],
                    "tmp_outside": tmp_outside,
                    "elapsed_seconds_case": time.time() - started,
                    "next_action": "rerun_with_--stress-resume-suite",
                }
                results.append(pending_result)
                _stress_append_event(events_path, {"event":"case_recovery_window_pending_more_resume", "case_id": case_id, "checkpoint_nodes": cp_nodes, "target_nodes": target_nodes, "tmp_outside_count": len(tmp_outside)})
                return write_summary("partial_case_recovery_window")

            verify = stress_verify_cli(run_id) if run_dir.exists() else {"ok": False, "problems": ["run_dir_missing"]}
            final_doctor = stress_doctor_cli(run_id) if run_dir.exists() else {"ok": False, "can_resume_strictly": False, "problems": ["run_dir_missing"]}
            tmp_outside = _stress_tmp_files_outside(run_dir) if run_dir.exists() else []
            cp_nodes = _stress_checkpoint_nodes(run_dir) if run_dir.exists() else 0
            ok = bool(resume_ok) and cp_nodes >= target_nodes and bool(verify.get("ok")) and bool(final_doctor.get("can_resume_strictly")) and not tmp_outside
            results = [r for r in results if str(r.get("case_id")) != case_id]
            completed_ids.discard(case_id)
            case_result = {
                "case_id": case_id,
                "ok": ok,
                "case_complete": True,
                "recovered_on_suite_resume": True,
                "lingering_kill": lingering_kill,
                "run_id": run_id,
                "run_dir": str(run_dir),
                "checkpoint_nodes_final": cp_nodes,
                "before_doctor_ok": before_doctor.get("ok"),
                "before_doctor_problems": before_doctor.get("problems"),
                "repair_ok": repair.get("ok"),
                "repair_actions_count": len(repair.get("actions") or []),
                "after_repair_ok": after_repair_doctor.get("ok"),
                "resume_ok": resume_ok,
                "resume_attempts": len(resume_reports),
                "resume_reports_tail": resume_reports[-5:],
                "verify_ok": verify.get("ok"),
                "verify_problems": verify.get("problems"),
                "doctor_ok": final_doctor.get("ok"),
                "can_resume_strictly": final_doctor.get("can_resume_strictly"),
                "doctor_problems": final_doctor.get("problems"),
                "tmp_outside": tmp_outside,
                "elapsed_seconds_case": time.time() - started,
            }
            results.append(case_result)
            completed_ids.add(case_id)
            _stress_append_event(events_path, {"event":"case_resume_recovery_end", "case_id": case_id, "ok": ok, "checkpoint_nodes_final": cp_nodes, "tmp_outside_count": len(tmp_outside), "verify_ok": verify.get("ok"), "doctor_can_resume": final_doctor.get("can_resume_strictly")})
            cases_done_this_invocation += 1
            write_summary("running")
            if cases_done_this_invocation >= max_cases_this_invocation and len([r for r in results if r.get("case_complete") and str(r.get("case_id")) in expected_case_ids]) < len(expected_case_ids):
                _stress_append_event(events_path, {"event":"suite_invocation_limit_stop", "cases_done_this_invocation": cases_done_this_invocation})
                return write_summary("partial_invocation_limit")
            continue
        kill_after = (kill_min + (rng.randint(0, max(0, kill_max-kill_min)))) / 1000.0
        if kill_mode_arg == "mixed":
            kill_mode = "sigterm" if i % 2 == 0 else "sigkill"
        else:
            kill_mode = kill_mode_arg
        _stress_append_event(events_path, {"event":"case_start", "case_id": case_id, "run_id": run_id, "kill_after_seconds": kill_after, "kill_mode": kill_mode})

        cmd = [sys.executable, runner,
               "--nodes", str(target_nodes), "--block-size", str(block_size), "--batch-size", str(max(100, min(1000, block_size))),
               "--archive-mode", "both", "--full-json-check", "sample", "--parent-full-json-check", "sample",
               "--max-blocks-this-invocation", str(first_max_blocks), "--child-timeout-seconds", str(_stress_effective_timeout(case_timeout, 1, block_size, phase="initial_child")),
               "--out-dir", str(runs_root), "--run-id", run_id, "--seed", str(seed), "--core", core, "--resume"]
        # TIME 04.4.36 — initial interrupt child file-I/O guard.
        # Anche la prima run programmata della stress-suite non usa più PIPE:
        # stdout/stderr vanno su file temporanei, così un child rumoroso o tagliato
        # non può appendere il supervisore prima del kill controllato.
        import tempfile
        initial_tmp_dir = Path(tempfile.mkdtemp(prefix="time04436_initial_cli_", dir="/mnt/data" if Path("/mnt/data").exists() else None))
        initial_stdout_path = initial_tmp_dir / "stdout.json"
        initial_stderr_path = initial_tmp_dir / "stderr.txt"
        initial_stdout_fh = open(initial_stdout_path, "w", encoding="utf-8")
        initial_stderr_fh = open(initial_stderr_path, "w", encoding="utf-8")
        proc = subprocess.Popen(cmd, stdout=initial_stdout_fh, stderr=initial_stderr_fh, text=True, start_new_session=True, preexec_fn=_pdeathsig_preexec)
        # TIME 04.4.14 — prima di aspettare/killare, salviamo atomicamente PID/PGID.
        # Se il wrapper esterno uccide la stress-suite in questo micro-intervallo,
        # il rilancio con --stress-resume-suite può trovare il processo orfano,
        # terminarlo e poi riparare/riprendere la run.
        running_result = {
            "case_id": case_id,
            "ok": False,
            "case_complete": False,
            "pending_resume": True,
            "phase": "process_running",
            "run_id": run_id,
            "run_dir": str(run_dir),
            "process_pid": proc.pid,
            "process_pgid": proc.pid,
            "kill_after_seconds": kill_after,
            "kill_mode": kill_mode,
            "next_action": "rerun_with_--stress-resume-suite_if_wrapper_interrupts",
        }
        results = [r for r in results if str(r.get("case_id")) != case_id]
        results.append(running_result)
        write_summary("case_process_running_pending_kill")
        time.sleep(kill_after)
        kill_result = _stress_kill_process_group(proc, kill_mode)
        try:
            proc.wait(timeout=8)
        except subprocess.TimeoutExpired:
            _stress_kill_process_group(proc, "sigkill")
            try:
                proc.wait(timeout=8)
            except Exception:
                pass
        try:
            initial_stdout_fh.close(); initial_stderr_fh.close()
        except Exception:
            pass
        stdout = initial_stdout_path.read_text(encoding="utf-8", errors="replace") if initial_stdout_path.exists() else ""
        stderr = initial_stderr_path.read_text(encoding="utf-8", errors="replace") if initial_stderr_path.exists() else ""
        initial_stdout_json = _safe_parse_json_text(stdout)
        _stress_append_event(events_path, {"event":"case_killed_or_finished", "case_id": case_id, "returncode": proc.returncode, "kill": kill_result, "checkpoint_nodes": _stress_checkpoint_nodes(run_dir), "tmp_outside": _stress_tmp_files_outside(run_dir)[:20]})

        # TIME 04.4.11 — modalità two-phase anti-timeout: dopo il kill programmato
        # non facciamo repair/resume pesanti nella stessa invocazione. Registriamo
        # atomicamente il caso come pending e usciamo. Il rilancio con --stress-resume-suite
        # recupera questo stesso case tramite receipt/checkpoint/index/.tmp e lo completa.
        pending_result = {
            "case_id": case_id,
            "ok": False,
            "case_complete": False,
            "pending_resume": True,
            "run_id": run_id,
            "run_dir": str(run_dir),
            "kill_after_seconds": kill_after,
            "kill_mode": kill_mode,
            "process_returncode_after_kill": proc.returncode,
            "kill_result": kill_result,
            "initial_stdout_json": initial_stdout_json,
            "initial_stdout_tail": _tail_text(stdout, 1000),
            "initial_stderr_tail": _tail_text(stderr, 1000),
            "checkpoint_nodes_after_kill": _stress_checkpoint_nodes(run_dir) if run_dir.exists() else 0,
            "tmp_outside_after_kill": _stress_tmp_files_outside(run_dir) if run_dir.exists() else [],
            "next_action": "rerun_with_--stress-resume-suite",
        }
        results = [r for r in results if str(r.get("case_id")) != case_id]
        results.append(pending_result)
        cases_done_this_invocation += 1
        _stress_append_event(events_path, {"event":"case_pending_resume", "case_id": case_id, "checkpoint_nodes_after_kill": pending_result["checkpoint_nodes_after_kill"], "tmp_outside_count": len(pending_result["tmp_outside_after_kill"])})
        return write_summary("partial_case_pending_resume")

        before_doctor = stress_doctor_cli(run_id) if run_dir.exists() else {"ok": False, "problems": ["run_dir_missing"]}
        repair = stress_repair_cli(run_id) if run_dir.exists() else {"ok": False, "problems": ["run_dir_missing"]}
        after_repair_doctor = stress_doctor_cli(run_id) if run_dir.exists() else {"ok": False, "problems": ["run_dir_missing"]}

        resume_reports: List[Dict[str, Any]] = []
        resume_ok = True
        for attempt in range(1):  # TIME 04.4.18: una sola finestra di resume per invocazione stress-resume-suite, anti-timeout
            completed = _stress_checkpoint_nodes(run_dir)
            if completed >= target_nodes:
                break
            resume_cmd = [sys.executable, runner,
                          "--nodes", str(target_nodes), "--block-size", str(block_size), "--batch-size", str(max(100, min(1000, block_size))),
                          "--archive-mode", "both", "--full-json-check", "sample", "--parent-full-json-check", "sample",
                          "--max-blocks-this-invocation", "1", "--child-timeout-seconds", str(_stress_effective_timeout(case_timeout, 1, block_size, phase="initial_resume_child")),
                          "--out-dir", str(runs_root), "--run-id", run_id, "--seed", str(seed), "--core", core, "--resume"]
            forensic_window_id = f"{invocation_id}_{case_id}_initial_resume_{attempt+1}_{completed}_{target_nodes}"
            _stress_append_event(events_path, {"event":"initial_resume_window_cli_start", "case_id": case_id, "window_id": forensic_window_id, "invocation_id": invocation_id, "checkpoint_nodes_before": completed, "target_nodes": target_nodes, "requested_window_blocks": 1, "case_timeout_seconds": case_timeout, "timeout_policy": _stress_timeout_policy(case_timeout, 1, block_size, phase="initial_resume"), "cmd_tail": resume_cmd[-12:]})
            rr = _stress_run_cli(resume_cmd, timeout=_stress_effective_timeout(case_timeout, 1, block_size, phase="initial_resume"))
            cp_after_forensic = _stress_checkpoint_nodes(run_dir) if run_dir.exists() else 0
            _stress_append_event(events_path, {"event":"initial_resume_window_cli_end", "case_id": case_id, "window_id": forensic_window_id, "invocation_id": invocation_id, "checkpoint_nodes_before": completed, "checkpoint_nodes_after": cp_after_forensic, "ok": rr.get("ok"), "error": rr.get("error"), "elapsed_seconds": rr.get("elapsed_seconds"), "returncode": rr.get("returncode"), "stdout_json_summary": {k: (rr.get("stdout_json") or {}).get(k) for k in ["ok", "complete", "status", "completed_nodes", "completed_blocks", "errors"]}, "stderr_tail": rr.get("stderr_tail"), "stdout_path": rr.get("stdout_path"), "stderr_path": rr.get("stderr_path")})
            resume_reports.append({"attempt": attempt+1, "ok": rr.get("ok"), "stdout_json_summary": {k: (rr.get("stdout_json") or {}).get(k) for k in ["ok", "complete", "status", "completed_nodes", "completed_blocks", "errors"]}, "error": rr.get("error"), "elapsed_seconds": rr.get("elapsed_seconds"), "checkpoint_nodes_after_forensic": cp_after_forensic})
            if not rr.get("ok"):
                resume_ok = False
                break
        verify = stress_verify_cli(run_id) if run_dir.exists() else {"ok": False, "problems": ["run_dir_missing"]}
        final_doctor = stress_doctor_cli(run_id) if run_dir.exists() else {"ok": False, "problems": ["run_dir_missing"]}
        tmp_outside = _stress_tmp_files_outside(run_dir) if run_dir.exists() else []
        cp_nodes = _stress_checkpoint_nodes(run_dir) if run_dir.exists() else 0
        ok = bool(resume_ok) and cp_nodes >= target_nodes and bool(verify.get("ok")) and bool(final_doctor.get("can_resume_strictly")) and not tmp_outside
        case_result = {
            "case_id": case_id,
            "ok": ok,
            "case_complete": True,
            "run_id": run_id,
            "run_dir": str(run_dir),
            "kill_after_seconds": kill_after,
            "kill_mode": kill_mode,
            "process_returncode_after_kill": proc.returncode,
            "kill_result": kill_result,
            "initial_stdout_json": initial_stdout_json,
            "initial_stdout_tail": _tail_text(stdout, 1000),
            "initial_stderr_tail": _tail_text(stderr, 1000),
            "checkpoint_nodes_final": cp_nodes,
            "before_doctor_ok": before_doctor.get("ok"),
            "before_doctor_problems": before_doctor.get("problems"),
            "repair_ok": repair.get("ok"),
            "repair_actions_count": len(repair.get("actions") or []),
            "after_repair_ok": after_repair_doctor.get("ok"),
            "resume_ok": resume_ok,
            "resume_attempts": len(resume_reports),
            "resume_reports_tail": resume_reports[-5:],
            "verify_ok": verify.get("ok"),
            "verify_problems": verify.get("problems"),
            "doctor_ok": final_doctor.get("ok"),
            "can_resume_strictly": final_doctor.get("can_resume_strictly"),
            "doctor_problems": final_doctor.get("problems"),
            "tmp_outside": tmp_outside,
            "elapsed_seconds_case": time.time() - started,
        }
        results.append(case_result)
        _stress_append_event(events_path, {"event":"case_end", "case_id": case_id, "ok": ok, "checkpoint_nodes_final": cp_nodes, "tmp_outside_count": len(tmp_outside), "verify_ok": verify.get("ok"), "doctor_can_resume": final_doctor.get("can_resume_strictly")})
        cases_done_this_invocation += 1
        write_summary("running")
        if cases_done_this_invocation >= max_cases_this_invocation and len([r for r in results if r.get("case_complete") and str(r.get("case_id")) in expected_case_ids]) < len(expected_case_ids):
            _stress_append_event(events_path, {"event":"suite_invocation_limit_stop", "cases_done_this_invocation": cases_done_this_invocation})
            return write_summary("partial_invocation_limit")
    _stress_append_event(events_path, {"event":"suite_end"})
    return write_summary("complete")


def analyze_stress_forensics(suite_root: Path) -> Dict[str, Any]:
    """Analizza stress_events.jsonl e individua finestre CLI iniziate ma non chiuse."""
    suite_root = Path(suite_root)
    events_path = suite_root / "stress_events.jsonl"
    if not events_path.exists():
        return {"ok": False, "error": "stress_events_missing", "suite_root": str(suite_root)}
    starts: Dict[str, Dict[str, Any]] = {}
    ends: Dict[str, Dict[str, Any]] = {}
    events = []
    with open(events_path, "r", encoding="utf-8", errors="replace") as fh:
        for line in fh:
            try:
                ev = json.loads(line)
            except Exception:
                continue
            events.append(ev)
            name = str(ev.get("event") or "")
            wid = ev.get("window_id")
            if wid and name.endswith("_start") and "cli" in name:
                starts[str(wid)] = ev
            if wid and name.endswith("_end") and "cli" in name:
                ends[str(wid)] = ev
    dangling = []
    for wid, st in starts.items():
        if wid not in ends:
            case_id = st.get("case_id")
            suite_id = suite_root.name
            run_id = f"{suite_id}_{case_id}" if case_id else None
            run_dir = suite_root / "runs" / run_id if run_id else None
            cp_nodes = _stress_checkpoint_nodes(run_dir) if run_dir and run_dir.exists() else None
            tmp_outside = _stress_tmp_files_outside(run_dir) if run_dir and run_dir.exists() else []
            dangling.append({"window_id": wid, "case_id": case_id, "classification": "external_or_unclosed_invocation", "checkpoint_before": st.get("checkpoint_nodes_before"), "checkpoint_now": cp_nodes, "tmp_outside_count": len(tmp_outside), "tmp_outside_sample": tmp_outside[:10], "start_event": st})
    return {"ok": True, "suite_root": str(suite_root), "events_count": len(events), "cli_windows_started": len(starts), "cli_windows_ended": len(ends), "dangling_cli_windows": dangling, "dangling_count": len(dangling)}

def supervise_long_archive(args: argparse.Namespace) -> Dict[str, Any]:
    """Esegue run lunghi in finestre brevi, checkpointate e verificabili.

    Non modifica il core e non cambia il formato archivio. Evita i timeout operativi
    perché ogni finestra esegue pochi blocchi e poi restituisce controllo al chiamante.
    Può essere rilanciato con gli stessi parametri: riparte dal checkpoint.
    """
    root = Path(args.out_dir) / args.run_id
    root.mkdir(parents=True, exist_ok=True)
    supervisor_log = root / "longsafe_supervisor_events.jsonl"
    started = time.time()
    deadline_seconds = max(10, int(getattr(args, "longsafe_seconds", 120)))
    requested_blocks_per_window = max(1, int(getattr(args, "longsafe_blocks", 1)))
    # STEP8C anti-timeout: per default un tick = un blocco. Più blocchi nella stessa invocazione
    # aumentano il rischio che il wrapper esterno tagli il parent mentre il child sta scrivendo.
    blocks_per_window = requested_blocks_per_window if bool(getattr(args, "unsafe_allow_multiblock_window", False)) else 1
    max_windows = max(1, int(getattr(args, "longsafe_max_windows", 1)))
    reports: List[Dict[str, Any]] = []
    windows = 0
    last_completed = -1
    append_jsonl(supervisor_log, {"event":"longsafe_start", "run_id": args.run_id, "target": args.nodes, "seconds": deadline_seconds, "requested_blocks_per_window": requested_blocks_per_window, "effective_blocks_per_window": blocks_per_window, "anti_timeout_safe_tick": not bool(getattr(args, "unsafe_allow_multiblock_window", False)), "ts": time.time()})
    while windows < max_windows:
        cp = read_json(root / "checkpoint.json") or {}
        completed_before = int(cp.get("completed_nodes") or 0)
        if completed_before >= int(args.nodes):
            break
        elapsed = time.time() - started
        if elapsed >= deadline_seconds and windows > 0:
            break
        if completed_before == last_completed and windows > 0:
            append_jsonl(supervisor_log, {"event":"longsafe_no_progress_stop", "completed": completed_before, "ts": time.time()})
            return {"ok": False, "version": VERSION, "error": "longsafe_no_progress", "run_id": args.run_id, "root": str(root), "completed_nodes": completed_before, "reports": reports}
        last_completed = completed_before
        window_args = argparse.Namespace(**vars(args))
        window_args.resume = True
        window_args.max_blocks_this_invocation = blocks_per_window
        # Nei run lunghi evitiamo falsi timeout del processo figlio su macchine lente.
        window_args.child_timeout_seconds = max(int(args.child_timeout_seconds), int(getattr(args, "longsafe_child_timeout_seconds", 180)))
        append_jsonl(supervisor_log, {"event":"longsafe_window_start", "window": windows+1, "completed_before": completed_before, "ts": time.time()})
        rep = orchestrate(window_args)
        window_errors = rep.get("errors", []) or []
        reports.append({
            "window_ok": len(window_errors) == 0,
            "target_complete_after_window": bool(rep.get("ok")),
            "completed_nodes": rep.get("completed_nodes"),
            "completed_blocks": rep.get("completed_blocks"),
            "blocks_done_this_invocation": rep.get("blocks_done_this_invocation"),
            "errors": window_errors,
        })
        windows += 1
        append_jsonl(supervisor_log, {"event":"longsafe_window_end", "window": windows, "report": reports[-1], "ts": time.time()})
        if rep.get("errors"):
            return {"ok": False, "version": VERSION, "error": "longsafe_window_error", "run_id": args.run_id, "root": str(root), "completed_nodes": rep.get("completed_nodes"), "report": rep, "reports": reports}
        cp_after = read_json(root / "checkpoint.json") or {}
        completed_after = int(cp_after.get("completed_nodes") or 0)
        if completed_after >= int(args.nodes):
            break
    verify = verify_run_dir(root, mode=args.parent_full_json_check)
    cp_final = read_json(root / "checkpoint.json") or {}
    completed_final = int(cp_final.get("completed_nodes") or 0)
    ok = completed_final >= int(args.nodes) and bool(verify.get("ok"))
    result = {
        "ok": ok,
        "version": VERSION,
        "mode": "longsafe_supervised",
        "run_id": args.run_id,
        "root": str(root),
        "target_nodes": int(args.nodes),
        "completed_nodes": completed_final,
        "completed_blocks": int(cp_final.get("completed_blocks") or 0),
        "windows_done": windows,
        "elapsed_seconds": time.time() - started,
        "deadline_seconds": deadline_seconds,
        "supervisor_log": str(supervisor_log),
        "verify": verify,
        "reports": reports[-10:],
        "status": "complete" if ok else "partial_or_failed",
        "next_action": "complete" if ok else "rerun_same_command_with_--longsafe_and_--resume",
    }
    atomic_write_json(root / "longsafe_latest.json", result)
    append_jsonl(supervisor_log, {"event":"longsafe_end", "result": {k:v for k,v in result.items() if k != "reports"}, "ts": time.time()})
    return result

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--child", action="store_true")
    ap.add_argument("--doctor", action="store_true")
    ap.add_argument("--self-test", action="store_true", help="Esegue la test suite automatica 04.4.4 senza modificare il core.")
    ap.add_argument("--self-test-level", choices=["quick", "standard", "all", "deep"], default="quick", help="Livello test suite: quick o standard/all/deep.")
    ap.add_argument("--self-test-timeout-seconds", type=int, default=180, help="Timeout per singolo comando interno della self-test suite.")
    ap.add_argument("--helper", default=DEFAULT_HELPER, help="Accettato per compatibilità; in 04.4.1 self-contained l'helper è incorporato.")
    ap.add_argument("--verify-run")
    ap.add_argument("--doctor-run")
    ap.add_argument("--doctor-repair", help="Ripara prudentemente una run: quarantena .tmp, rebuild index, repair checkpoint se sicuro.")
    ap.add_argument("--repair-dry-run", action="store_true", help="Mostra cosa farebbe --doctor-repair senza modificare i file.")
    ap.add_argument("--no-rebuild-index", action="store_true", help="Con --doctor-repair evita rebuild index.")
    ap.add_argument("--no-repair-checkpoint", action="store_true", help="Con --doctor-repair evita repair checkpoint.")
    ap.add_argument("--pack-run")
    ap.add_argument("--stress-forensics", help="Analizza stress_events.jsonl e individua finestre CLI iniziate ma non chiuse per timeout esterni/non previsti.")
    ap.add_argument("--longsafe", action="store_true", help="Esegue run lunghi in finestre brevi, checkpointate e rilanciabili.")
    ap.add_argument("--longsafe-seconds", type=int, default=120, help="Durata massima indicativa della finestra supervisor.")
    ap.add_argument("--longsafe-blocks", type=int, default=1, help="Blocchi da eseguire per ogni finestra interna. STEP8C anti-timeout: default 1 blocco/tick.")
    ap.add_argument("--longsafe-max-windows", type=int, default=1, help="Limite di finestre interne per singola invocazione. Default 1: una finestra breve e rilanciabile, più sicura contro timeout esterni.")
    ap.add_argument("--longsafe-child-timeout-seconds", type=int, default=180, help="Timeout minimo del child in modalità longsafe.")
    ap.add_argument("--unsafe-allow-multiblock-window", action="store_true", help="Disattiva il clamp anti-timeout e permette più blocchi nella stessa finestra longsafe/orchestrate.")
    ap.add_argument("--stress-interrupt-suite", action="store_true", help="Esegue batteria stress interrupt atomica/rilanciabile TIME 04.4.14.")
    ap.add_argument("--stress-resume-suite", action="store_true", help="Riprende una batteria stress interrupt già iniziata, saltando i casi completati.")
    ap.add_argument("--stress-suite-id", default="", help="ID cartella della batteria stress. Se vuoto ne crea uno con timestamp.")
    ap.add_argument("--stress-cases", type=int, default=10, help="Numero casi interrupt della batteria.")
    ap.add_argument("--stress-start-case", type=int, default=1, help="Caso iniziale da eseguire nella stress-suite, utile per isolare e ritestare lo stesso caso senza rifare i precedenti.")
    ap.add_argument("--stress-only-case", type=int, default=0, help="Esegue solo il caso indicato. Mantiene seed/kill timing identici alla suite completa.")
    ap.add_argument("--stress-max-cases-per-invocation", type=int, default=1, help="Quanti casi completare prima di uscire. Default 1: batteria anti-timeout e rilanciabile.")
    ap.add_argument("--stress-target-nodes", type=int, default=5000, help="Nodi target per ogni caso della batteria.")
    ap.add_argument("--stress-block-size", type=int, default=1000, help="Block size per casi stress, massimo 5000.")
    ap.add_argument("--stress-kill-after-min-ms", type=int, default=100, help="Kill minimo dopo N millisecondi.")
    ap.add_argument("--stress-kill-after-max-ms", type=int, default=1500, help="Kill massimo dopo N millisecondi.")
    ap.add_argument("--stress-kill-signal", choices=["sigterm", "sigkill", "mixed"], default="mixed", help="Segnale usato per interrompere il processo sotto test.")
    ap.add_argument("--stress-time-budget-seconds", type=int, default=120, help="Budget massimo indicativo per singola invocazione della suite.")
    ap.add_argument("--stress-case-timeout-seconds", type=int, default=30, help="Timeout per singola invocazione/resume nei casi stress. 04.4.39: default prudente anti-wrapper; usare valori bassi con finestre brevi.")
    ap.add_argument("--stress-resume-window-blocks", type=int, default=2, help="Blocchi per finestra di resume durante stress.")
    ap.add_argument("--stress-resume-max-invocations", type=int, default=20, help="Compatibilità: nella stress-suite 04.4.17 ogni invocazione usa una sola finestra resume; rilanciare --stress-resume-suite per continuare.")
    ap.add_argument("--stress-first-run-max-blocks", type=int, default=999999, help="Blocchi massimi nella prima run prima del kill programmato.")
    ap.add_argument("--stress-seed", type=int, default=4408, help="Seed batteria stress.")
    ap.add_argument("--nodes", type=int, default=20000)
    ap.add_argument("--block-size", type=int, default=DEFAULT_BLOCK_SIZE)
    ap.add_argument("--batch-size", type=int, default=1000)
    ap.add_argument("--archive-mode", choices=["light","full","both"], default="both")
    ap.add_argument("--full-json-check", choices=["all","sample","none"], default="sample")
    ap.add_argument("--parent-full-json-check", choices=["all","sample","none"], default="sample")
    ap.add_argument("--max-blocks-this-invocation", type=int, default=1)
    ap.add_argument("--child-timeout-seconds", type=int, default=180)
    ap.add_argument("--out-dir", default=DEFAULT_OUT_DIR)
    ap.add_argument("--run-id", default="time044_run")
    ap.add_argument("--seed", type=int, default=431042)
    ap.add_argument("--core", default=DEFAULT_CORE)
    # STEP 8C metadata-only: file opzionali archiviati nel manifest, mai applicati ai nodi.
    ap.add_argument("--profile", default=None, help="File profilo/utente da archiviare in metadata_inputs/profile.* senza applicarlo ai nodi.")
    ap.add_argument("--semantic-trace", default=None, help="File semantic trace AI da archiviare in metadata_inputs/semantic_trace.* senza applicarlo ai nodi.")
    ap.add_argument("--scenario-blueprint", default=None, help="File scenario blueprint da archiviare in metadata_inputs/scenario_blueprint.* senza applicarlo ai nodi.")
    ap.add_argument("--initial-calibration", default=None, help="File initial calibration da archiviare in metadata_inputs/initial_calibration.* senza applicarlo ai nodi.")
    ap.add_argument("--questionnaire", default=None, help="File questionario dinamico/adattivo da archiviare in metadata_inputs/questionnaire.* senza applicarlo ai nodi.")
    ap.add_argument("--notes", default=None, help="File note operative da archiviare in metadata_inputs/notes.* senza applicarlo ai nodi.")
    ap.add_argument("--resume", action="store_true")
    ap.add_argument("--block-no", type=int, default=1)
    ap.add_argument("--start-step", type=int, default=1)
    ap.add_argument("--end-step", type=int, default=5000)
    ap.add_argument("--checkpoint")
    args = ap.parse_args()
    # STEP8C anti-timeout safe tick: salvo opt-in esplicito, una invocazione processa un solo blocco.
    # Formula/core invariati; si riduce solo la finestra operativa per evitare tagli del wrapper.
    if not bool(getattr(args, "unsafe_allow_multiblock_window", False)):
        try:
            args.max_blocks_this_invocation = min(int(args.max_blocks_this_invocation), 1)
            args.longsafe_blocks = min(int(args.longsafe_blocks), 1)
        except Exception:
            args.max_blocks_this_invocation = 1
            args.longsafe_blocks = 1
    if args.self_test:
        print(json.dumps(run_self_test(args), ensure_ascii=False, indent=2)); return
    if args.doctor:
        print(json.dumps(doctor_bootstrap(args), ensure_ascii=False, indent=2)); return
    if args.doctor_run:
        print(json.dumps(doctor_run_dir(resolve_run_dir(args.doctor_run, args.out_dir), mode=args.parent_full_json_check), ensure_ascii=False, indent=2)); return
    if args.doctor_repair:
        print(json.dumps(doctor_repair_run_dir(resolve_run_dir(args.doctor_repair, args.out_dir), mode=args.parent_full_json_check, apply=not args.repair_dry_run, rebuild_index=not args.no_rebuild_index, repair_checkpoint=not args.no_repair_checkpoint), ensure_ascii=False, indent=2)); return
    if args.stress_forensics:
        print(json.dumps(analyze_stress_forensics(Path(args.stress_forensics)), ensure_ascii=False, indent=2)); return
    if args.verify_run:
        print(json.dumps(verify_run_dir(resolve_run_dir(args.verify_run, args.out_dir), mode=args.full_json_check), ensure_ascii=False, indent=2)); return
    if args.pack_run:
        src = Path(args.pack_run); out = Path(str(src) + ".tar.gz")
        print(json.dumps({"ok": True, "tar": pack_tar(src, out)}, ensure_ascii=False, indent=2)); return
    if args.stress_interrupt_suite or args.stress_resume_suite:
        print(json.dumps(run_stress_interrupt_suite(args), ensure_ascii=False, indent=2)); return
    if args.longsafe:
        print(json.dumps(supervise_long_archive(args), ensure_ascii=False, indent=2)); return
    if args.child:
        print(json.dumps(run_block_child(args), ensure_ascii=False)); return
    print(json.dumps(orchestrate(args), ensure_ascii=False, indent=2))
if __name__ == "__main__": main()
