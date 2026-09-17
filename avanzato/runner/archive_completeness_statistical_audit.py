#!/usr/bin/env python3
"""
M19 — Archive Completeness & Statistical Audit
==============================================
Audit esterno, code-first, read-only, per run del Simulatore 3.2/TIME STEP8C.

Scopo:
- non modifica core, runner, checkpoint, index, LIGHT o FULL;
- legge manifest/checkpoint/index, blocchi LIGHT SQLite e FULL JSONL.GZ;
- produce report di completezza archivistica, coerenza matematica e riepilogo statistico;
- esporta JSON summary, CSV summary e report Markdown.

Uso:
  python tools/archive_completeness_statistical_audit.py --run-dir path/to/run --out-dir reports --mode sample
  python tools/archive_completeness_statistical_audit.py --run-dir path/to/run --out-dir reports --mode all --full-scan all

Modalità:
- mode=quick: controlli strutturali + index/checkpoint + qualche statistica LIGHT.
- mode=sample: come quick + campionamento FULL per blocco.
- mode=all: scansione completa LIGHT e FULL. Più lenta, consigliata per report finale locale.
"""
from __future__ import annotations

import argparse
import csv
import gzip
import hashlib
import json
import math
import os
import re
import sqlite3
import statistics
import sys
import time
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Tuple

VERSION = "M19_ARCHIVE_COMPLETENESS_STATISTICAL_AUDIT_0_1"
BLOCK_RE = re.compile(r"^block_(\d{6})_(\d+)_(\d+)\.sqlite$")
FULL_RE = re.compile(r"^block_(\d{6})_(\d+)_(\d+)\.jsonl\.gz$")

NUMERIC_COLUMNS = [
    "p0", "e", "i", "t", "m", "bp_node", "bp_state", "c",
    "str_before", "pos_before", "deb_before", "pn", "roll",
    "raw_margin", "field_margin", "net_margin", "kpd_strength",
    "str_after", "pos_after", "deb_after", "hidden_cost_before",
    "hidden_cost_delta", "hidden_cost_after", "damping", "or1_before",
    "or1_after", "ri4_before", "ri4_after", "floor1_after", "cooldown_after",
]
CATEGORICAL_COLUMNS = [
    "family_code", "outcome", "risk_level", "rip_before", "rip_after",
    "kpd_active", "micro_action", "care_recovery", "profile",
    "support_kind", "delegation_kind", "adaptation_kind",
]
REQUIRED_LIGHT_COLUMNS = [
    "global_step", "run_id", "block_no", "local_index", "node_id", "description", "family_code",
    "p0", "e", "i", "t", "m", "bp_node", "bp_state", "c",
    "str_before", "pos_before", "deb_before", "rip_before", "pn", "roll",
    "success_before_field", "raw_margin", "field_margin", "net_margin", "kpd_active",
    "kpd_strength", "kpd_label", "outcome", "risk_level", "str_after", "pos_after",
    "deb_after", "rip_after", "hidden_cost_before", "hidden_cost_delta", "hidden_cost_after",
    "micro_action", "care_recovery", "damping", "or1_before", "or1_after", "ri4_before",
    "ri4_after", "floor1_after", "cooldown_after", "profile", "support_kind",
    "delegation_kind", "adaptation_kind", "levers_json", "warnings_json", "notes_json", "created_ts",
]


def read_json(path: Path) -> Dict[str, Any]:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}


def write_json(path: Path, data: Dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    os.replace(tmp, path)


def sha256_file(path: Path, chunk_size: int = 1024 * 1024) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(chunk_size), b""):
            h.update(chunk)
    return h.hexdigest()


def file_size(path: Path) -> int:
    try:
        return path.stat().st_size
    except Exception:
        return 0


def human_bytes(n: int) -> str:
    units = ["B", "KB", "MB", "GB", "TB"]
    f = float(n)
    for u in units:
        if f < 1024 or u == units[-1]:
            return f"{f:.2f} {u}" if u != "B" else f"{int(f)} B"
        f /= 1024
    return f"{n} B"


def parse_block_file(path: Path, kind: str) -> Optional[Tuple[int, int, int]]:
    m = (BLOCK_RE if kind == "light" else FULL_RE).match(path.name)
    if not m:
        return None
    return int(m.group(1)), int(m.group(2)), int(m.group(3))


def str_penalty_value(str_value: Any) -> int:
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


def expected_pn(row: sqlite3.Row) -> int:
    raw = (
        int(row["p0"] or 0) + int(row["e"] or 0) + int(row["i"] or 0) + int(row["t"] or 0) + int(row["m"] or 0)
        + int(row["bp_node"] or 0) + int(row["bp_state"] or 0)
        - 5 * int(row["c"] or 0)
        - str_penalty_value(row["str_before"])
        - 5 * int(row["deb_before"] or 0)
    )
    return max(5, min(95, int(round(raw))))


def expected_margins(row: sqlite3.Row) -> Tuple[int, int, int]:
    pn = int(row["pn"] or 0)
    roll = int(row["roll"] or 0)
    success = 1 if roll <= pn else 0
    raw_margin = abs(pn - roll)
    field_margin = int(row["field_margin"] or 0)
    net_margin = raw_margin - field_margin if success else -raw_margin - field_margin
    return success, raw_margin, net_margin


class NumericAgg:
    __slots__ = ("n", "missing", "min", "max", "sum", "sum_sq")
    def __init__(self) -> None:
        self.n = 0
        self.missing = 0
        self.min: Optional[float] = None
        self.max: Optional[float] = None
        self.sum = 0.0
        self.sum_sq = 0.0
    def add(self, value: Any) -> None:
        if value is None:
            self.missing += 1
            return
        try:
            x = float(value)
        except Exception:
            self.missing += 1
            return
        if not math.isfinite(x):
            self.missing += 1
            return
        self.n += 1
        self.sum += x
        self.sum_sq += x * x
        self.min = x if self.min is None else min(self.min, x)
        self.max = x if self.max is None else max(self.max, x)
    def to_dict(self) -> Dict[str, Any]:
        mean = self.sum / self.n if self.n else None
        var = (self.sum_sq / self.n - mean * mean) if self.n and mean is not None else None
        if var is not None and var < 0 and abs(var) < 1e-9:
            var = 0.0
        return {
            "n": self.n,
            "missing": self.missing,
            "min": self.min,
            "max": self.max,
            "mean": mean,
            "std": math.sqrt(var) if var is not None and var >= 0 else None,
        }


def scan_index(run_dir: Path) -> Dict[str, Any]:
    index_path = run_dir / "index.sqlite"
    out: Dict[str, Any] = {"exists": index_path.exists(), "path": str(index_path), "blocks": [], "summary": {}, "errors": []}
    if not index_path.exists():
        out["errors"].append({"type": "index_missing"})
        return out
    try:
        con = sqlite3.connect(str(index_path), timeout=60)
        con.row_factory = sqlite3.Row
        rows = con.execute("SELECT * FROM blocks ORDER BY block_no").fetchall()
        out["blocks"] = [dict(r) for r in rows]
        s = con.execute(
            """
            SELECT COUNT(*) AS block_count,
                   COALESCE(SUM(rows_light),0) AS rows_light,
                   COALESCE(SUM(rows_full),0) AS rows_full,
                   MIN(start_step) AS min_step,
                   MAX(end_step) AS max_step,
                   COALESCE(SUM(pn_out_of_clamp),0) AS pn_out_of_clamp,
                   COALESCE(SUM(formula_mismatches),0) AS formula_mismatches,
                   COALESCE(SUM(margin_mismatches),0) AS margin_mismatches,
                   COALESCE(SUM(json_bad),0) AS json_bad,
                   COALESCE(SUM(sqlite_bytes),0) AS sqlite_bytes_total,
                   COALESCE(SUM(full_bytes),0) AS full_bytes_total
            FROM blocks WHERE verified=1
            """
        ).fetchone()
        out["summary"] = dict(s) if s else {}
        con.close()
    except Exception as e:
        out["errors"].append({"type": "index_read_error", "error": repr(e)})
    return out


def scan_light_block(path: Path, start: int, end: int, mode: str) -> Dict[str, Any]:
    out: Dict[str, Any] = {
        "path": str(path), "exists": path.exists(), "size_bytes": file_size(path),
        "start_step": start, "end_step": end, "rows": 0, "distinct_steps": 0,
        "min_step": None, "max_step": None, "columns": [], "missing_required_columns": [],
        "formula_mismatches": 0, "margin_mismatches": 0, "pn_out_of_clamp": 0,
        "null_counts": {}, "numeric": {}, "categorical": {}, "errors": []
    }
    if not path.exists():
        out["errors"].append({"type": "light_missing"})
        return out
    try:
        con = sqlite3.connect(str(path), timeout=60)
        con.row_factory = sqlite3.Row
        cols = [r[1] for r in con.execute("PRAGMA table_info(nodes_light)").fetchall()]
        out["columns"] = cols
        out["missing_required_columns"] = [c for c in REQUIRED_LIGHT_COLUMNS if c not in cols]
        if out["missing_required_columns"]:
            out["errors"].append({"type": "missing_light_columns", "columns": out["missing_required_columns"]})
        base = con.execute(
            """
            SELECT COUNT(*) AS rows, COUNT(DISTINCT global_step) AS distinct_steps,
                   MIN(global_step) AS min_step, MAX(global_step) AS max_step,
                   COALESCE(SUM(CASE WHEN pn < 5 OR pn > 95 THEN 1 ELSE 0 END),0) AS pn_out_of_clamp
            FROM nodes_light WHERE global_step BETWEEN ? AND ?
            """, (start, end)
        ).fetchone()
        out.update({k: base[k] for k in base.keys()})
        if out["rows"] != end - start + 1:
            out["errors"].append({"type": "light_row_count_mismatch", "expected": end - start + 1, "actual": out["rows"]})
        if out["rows"] != out["distinct_steps"]:
            out["errors"].append({"type": "duplicate_global_steps", "rows": out["rows"], "distinct": out["distinct_steps"]})
        if out["min_step"] != start or out["max_step"] != end:
            out["errors"].append({"type": "light_range_mismatch", "expected": [start, end], "actual": [out["min_step"], out["max_step"]]})

        # SQL check veloce per mismatch formula/margini, all rows.
        fm = con.execute(
            """
            WITH calc AS (
                SELECT global_step, pn,
                       CASE WHEN raw_calc < 5 THEN 5 WHEN raw_calc > 95 THEN 95 ELSE CAST(ROUND(raw_calc) AS INTEGER) END AS expected_pn
                FROM (
                    SELECT global_step, pn,
                           (p0 + e + i + t + m + bp_node + bp_state - 5*c
                            - CASE WHEN str_before <= 39 THEN 0 WHEN str_before <= 59 THEN 5 WHEN str_before <= 69 THEN 10 WHEN str_before <= 79 THEN 15 WHEN str_before <= 89 THEN 20 ELSE 25 END
                            - 5*deb_before) AS raw_calc
                    FROM nodes_light WHERE global_step BETWEEN ? AND ?
                )
            )
            SELECT COALESCE(SUM(CASE WHEN pn != expected_pn THEN 1 ELSE 0 END),0) AS mismatches FROM calc
            """, (start, end)
        ).fetchone()[0]
        mm = con.execute(
            """
            SELECT COALESCE(SUM(CASE WHEN
                success_before_field != CASE WHEN roll <= pn THEN 1 ELSE 0 END
                OR raw_margin != ABS(pn - roll)
                OR net_margin != CASE WHEN roll <= pn THEN ABS(pn - roll) - field_margin ELSE -ABS(pn - roll) - field_margin END
            THEN 1 ELSE 0 END),0) AS mismatches
            FROM nodes_light WHERE global_step BETWEEN ? AND ?
            """, (start, end)
        ).fetchone()[0]
        out["formula_mismatches"] = int(fm or 0)
        out["margin_mismatches"] = int(mm or 0)
        if out["formula_mismatches"]:
            out["errors"].append({"type": "formula_mismatches", "count": out["formula_mismatches"]})
        if out["margin_mismatches"]:
            out["errors"].append({"type": "margin_mismatches", "count": out["margin_mismatches"]})
        if out["pn_out_of_clamp"]:
            out["errors"].append({"type": "pn_out_of_clamp", "count": out["pn_out_of_clamp"]})

        # Stats: for all light rows (250k/1M ok enough, using aggregates).
        numeric_aggs = {c: NumericAgg() for c in NUMERIC_COLUMNS if c in cols}
        cat_counts = {c: Counter() for c in CATEGORICAL_COLUMNS if c in cols}
        null_counts = Counter()
        select_cols = ["global_step"] + list(numeric_aggs) + list(cat_counts)
        select_cols = list(dict.fromkeys(select_cols))
        q = "SELECT " + ",".join(select_cols) + " FROM nodes_light WHERE global_step BETWEEN ? AND ? ORDER BY global_step"
        for row in con.execute(q, (start, end)):
            for c, agg in numeric_aggs.items():
                v = row[c]
                if v is None:
                    null_counts[c] += 1
                agg.add(v)
            for c, counter in cat_counts.items():
                v = row[c]
                if v is None:
                    null_counts[c] += 1
                    counter["<NULL>"] += 1
                else:
                    counter[str(v)] += 1
        out["numeric"] = {c: agg.to_dict() for c, agg in numeric_aggs.items()}
        out["categorical"] = {c: dict(counter.most_common(100)) for c, counter in cat_counts.items()}
        out["null_counts"] = dict(null_counts)
        con.close()
    except Exception as e:
        out["errors"].append({"type": "light_scan_error", "error": repr(e)})
    return out


def scan_full_block(path: Path, start: int, end: int, mode: str) -> Dict[str, Any]:
    out: Dict[str, Any] = {
        "path": str(path), "exists": path.exists(), "size_bytes": file_size(path),
        "start_step": start, "end_step": end, "rows": 0, "json_bad": 0,
        "first_step": None, "last_step": None, "sampled_rows": 0,
        "field_presence": Counter(), "node_result_presence": Counter(), "errors": []
    }
    if not path.exists():
        out["errors"].append({"type": "full_missing"})
        out["json_bad"] = end - start + 1
        return out
    expected = end - start + 1
    try:
        with gzip.open(path, "rt", encoding="utf-8") as f:
            for line_no, line in enumerate(f, start=1):
                out["rows"] += 1
                do_parse = mode == "all" or line_no <= 25 or line_no > max(25, expected - 25)
                if not do_parse and mode in {"quick", "sample"}:
                    continue
                out["sampled_rows"] += 1
                try:
                    obj = json.loads(line)
                    step = int(obj.get("global_step"))
                    if out["first_step"] is None:
                        out["first_step"] = step
                    out["last_step"] = step
                    if step < start or step > end:
                        out["json_bad"] += 1
                    for key in ["version", "run_id", "global_step", "block_no", "local_index", "created_ts", "node_input", "node_result", "canonical_formula"]:
                        if key in obj:
                            out["field_presence"][key] += 1
                    nr = obj.get("node_result") or {}
                    if isinstance(nr, dict):
                        for key in ["probability_pn", "roll", "raw_margin", "field_margin", "net_margin", "outcome", "risk_level", "state_before", "state_after", "levers"]:
                            if key in nr:
                                out["node_result_presence"][key] += 1
                except Exception:
                    out["json_bad"] += 1
        if out["rows"] != expected:
            out["json_bad"] += abs(expected - out["rows"])
            out["errors"].append({"type": "full_row_count_mismatch", "expected": expected, "actual": out["rows"]})
        if mode in {"sample", "all"}:
            if out["first_step"] not in {None, start}:
                out["json_bad"] += 1
                out["errors"].append({"type": "full_first_step_mismatch", "expected": start, "actual": out["first_step"]})
            if out["last_step"] not in {None, end}:
                out["json_bad"] += 1
                out["errors"].append({"type": "full_last_step_mismatch", "expected": end, "actual": out["last_step"]})
        if out["json_bad"]:
            out["errors"].append({"type": "full_json_bad", "count": out["json_bad"]})
    except Exception as e:
        out["errors"].append({"type": "full_scan_error", "error": repr(e)})
        out["json_bad"] += max(1, expected - int(out["rows"] or 0))
    out["field_presence"] = dict(out["field_presence"])
    out["node_result_presence"] = dict(out["node_result_presence"])
    return out


def merge_numeric(global_aggs: Dict[str, NumericAgg], block_stats: Dict[str, Any]) -> None:
    # Approximate merge from stored n/sum not available. We'll instead rescan all blocks individually aggregated; here use mean/std cannot be merged exactly without sum/sq.
    # Block-level numeric dict already loses sum; global light stats computed separately from block scans would be expensive. We compute global via weighted mean only for reporting.
    pass


def audit_run(run_dir: Path, out_dir: Path, mode: str = "sample") -> Dict[str, Any]:
    started = time.time()
    run_dir = run_dir.resolve()
    out_dir = out_dir.resolve()
    out_dir.mkdir(parents=True, exist_ok=True)
    manifest = read_json(run_dir / "manifest.json")
    checkpoint = read_json(run_dir / "checkpoint.json")
    index = scan_index(run_dir)
    blocks_dir = run_dir / "blocks"
    full_dir = run_dir / "full"
    tmp_files = sorted([str(p) for p in run_dir.rglob("*.tmp*") if "quarantine" not in str(p)])

    light_files = sorted(blocks_dir.glob("*.sqlite")) if blocks_dir.exists() else []
    full_files = sorted(full_dir.glob("*.jsonl.gz")) if full_dir.exists() else []
    light_map: Dict[Tuple[int, int, int], Path] = {}
    full_map: Dict[Tuple[int, int, int], Path] = {}
    for p in light_files:
        parsed = parse_block_file(p, "light")
        if parsed:
            light_map[parsed] = p
    for p in full_files:
        parsed = parse_block_file(p, "full")
        if parsed:
            full_map[parsed] = p

    if index.get("blocks"):
        block_keys = [(int(b["block_no"]), int(b["start_step"]), int(b["end_step"])) for b in index["blocks"]]
    else:
        block_keys = sorted(light_map.keys())

    block_reports: List[Dict[str, Any]] = []
    problems: List[Dict[str, Any]] = []
    total_light_rows = 0
    total_full_rows = 0
    total_formula_mismatches = 0
    total_margin_mismatches = 0
    total_pn_out = 0
    total_json_bad = 0
    total_light_bytes = sum(file_size(p) for p in light_files)
    total_full_bytes = sum(file_size(p) for p in full_files)
    ranges: List[Tuple[int, int]] = []
    global_cats: Dict[str, Counter] = {c: Counter() for c in CATEGORICAL_COLUMNS}
    global_numeric_weighted: Dict[str, Dict[str, Any]] = {}

    for block_no, start, end in block_keys:
        lf = light_map.get((block_no, start, end)) or (blocks_dir / f"block_{block_no:06d}_{start}_{end}.sqlite")
        ff = full_map.get((block_no, start, end)) or (full_dir / f"block_{block_no:06d}_{start}_{end}.jsonl.gz")
        light = scan_light_block(lf, start, end, mode=mode)
        full = scan_full_block(ff, start, end, mode=("all" if mode == "all" else "sample")) if mode != "quick" else {"exists": ff.exists(), "rows": None, "json_bad": 0, "errors": [], "size_bytes": file_size(ff), "path": str(ff)}
        total_light_rows += int(light.get("rows") or 0)
        if full.get("rows") is not None:
            total_full_rows += int(full.get("rows") or 0)
        total_formula_mismatches += int(light.get("formula_mismatches") or 0)
        total_margin_mismatches += int(light.get("margin_mismatches") or 0)
        total_pn_out += int(light.get("pn_out_of_clamp") or 0)
        total_json_bad += int(full.get("json_bad") or 0)
        ranges.append((start, end))
        for c, counts in (light.get("categorical") or {}).items():
            global_cats.setdefault(c, Counter()).update(counts)
        # Weighted global numeric summaries (mean approximation exact if block means are exact; min/max exact; std not global exact).
        for c, st in (light.get("numeric") or {}).items():
            d = global_numeric_weighted.setdefault(c, {"n": 0, "min": None, "max": None, "weighted_sum": 0.0})
            n = int(st.get("n") or 0)
            mean = st.get("mean")
            if n and mean is not None:
                d["n"] += n
                d["weighted_sum"] += float(mean) * n
                d["min"] = st.get("min") if d["min"] is None else min(d["min"], st.get("min"))
                d["max"] = st.get("max") if d["max"] is None else max(d["max"], st.get("max"))
        if light.get("errors") or full.get("errors"):
            problems.append({"block_no": block_no, "start_step": start, "end_step": end, "light_errors": light.get("errors", []), "full_errors": full.get("errors", [])})
        block_reports.append({"block_no": block_no, "start_step": start, "end_step": end, "light": light, "full": full})

    gaps: List[Dict[str, Any]] = []
    expected_start = 1
    for start, end in sorted(ranges):
        if start != expected_start:
            gaps.append({"expected_start": expected_start, "actual_start": start, "previous_end": expected_start - 1})
        expected_start = end + 1

    cp_nodes = int(checkpoint.get("completed_nodes") or 0) if checkpoint else 0
    cp_blocks = int(checkpoint.get("completed_blocks") or 0) if checkpoint else 0
    idx_summary = index.get("summary") or {}
    idx_rows_light = int(idx_summary.get("rows_light") or 0)
    idx_rows_full = int(idx_summary.get("rows_full") or 0)
    idx_block_count = int(idx_summary.get("block_count") or 0)

    global_numeric = {}
    for c, d in global_numeric_weighted.items():
        n = d["n"]
        global_numeric[c] = {"n": n, "min": d["min"], "max": d["max"], "mean": d["weighted_sum"] / n if n else None, "std": None, "note": "std globale non calcolata in merge leggero; usare mode=all con export analitico se serve std esatta."}

    ok = True
    fatal_checks = []
    def check(cond: bool, label: str, details: Any = None) -> None:
        nonlocal ok
        if not cond:
            ok = False
            fatal_checks.append({"check": label, "details": details})

    check(run_dir.exists(), "run_dir_exists", str(run_dir))
    check((run_dir / "manifest.json").exists(), "manifest_exists")
    check((run_dir / "checkpoint.json").exists(), "checkpoint_exists")
    check((run_dir / "index.sqlite").exists(), "index_exists")
    check(len(tmp_files) == 0, "no_tmp_files", tmp_files[:20])
    check(len(gaps) == 0, "no_range_gaps", gaps)
    check(total_formula_mismatches == 0, "formula_mismatches_zero", total_formula_mismatches)
    check(total_margin_mismatches == 0, "margin_mismatches_zero", total_margin_mismatches)
    check(total_pn_out == 0, "pn_out_of_clamp_zero", total_pn_out)
    check(total_json_bad == 0, "json_bad_zero", total_json_bad)
    check(not problems, "no_block_errors", problems[:3])
    if cp_nodes:
        check(total_light_rows == cp_nodes, "light_rows_equal_checkpoint", {"light": total_light_rows, "checkpoint": cp_nodes})
        if mode != "quick":
            check(total_full_rows == cp_nodes, "full_rows_equal_checkpoint", {"full": total_full_rows, "checkpoint": cp_nodes})
    if idx_rows_light:
        check(total_light_rows == idx_rows_light, "light_rows_equal_index", {"scan": total_light_rows, "index": idx_rows_light})
    if idx_rows_full and mode != "quick":
        check(total_full_rows == idx_rows_full, "full_rows_equal_index", {"scan": total_full_rows, "index": idx_rows_full})

    summary = {
        "version": VERSION,
        "ok": ok,
        "status": "PASS" if ok else "FAIL",
        "mode": mode,
        "run_dir": str(run_dir),
        "generated_at": time.time(),
        "elapsed_seconds": round(time.time() - started, 3),
        "manifest": {
            "exists": bool(manifest),
            "version": manifest.get("version"),
            "run_id": manifest.get("run_id"),
            "target_nodes": manifest.get("target_nodes"),
            "block_size": manifest.get("block_size"),
            "archive_mode": manifest.get("archive_mode"),
            "metadata_inputs": manifest.get("metadata_inputs", {}),
        },
        "checkpoint": {
            "exists": bool(checkpoint),
            "completed_nodes": cp_nodes,
            "completed_blocks": cp_blocks,
            "status": checkpoint.get("status"),
        },
        "index_summary": idx_summary,
        "archive_sizes": {
            "light_sqlite_files": len(light_files),
            "full_jsonl_gz_files": len(full_files),
            "light_bytes_total": total_light_bytes,
            "full_bytes_total": total_full_bytes,
            "total_archive_bytes": total_light_bytes + total_full_bytes,
            "light_human": human_bytes(total_light_bytes),
            "full_human": human_bytes(total_full_bytes),
            "total_human": human_bytes(total_light_bytes + total_full_bytes),
            "avg_light_bytes_per_node": (total_light_bytes / total_light_rows) if total_light_rows else None,
            "avg_full_bytes_per_node": (total_full_bytes / total_full_rows) if total_full_rows else None,
        },
        "row_counts": {
            "light_rows_scanned": total_light_rows,
            "full_rows_scanned": total_full_rows if mode != "quick" else None,
            "blocks_scanned": len(block_reports),
            "index_blocks": idx_block_count,
            "checkpoint_nodes": cp_nodes,
        },
        "math_integrity": {
            "pn_out_of_clamp": total_pn_out,
            "formula_mismatches": total_formula_mismatches,
            "margin_mismatches": total_margin_mismatches,
            "json_bad": total_json_bad,
        },
        "filesystem_integrity": {
            "tmp_files_count": len(tmp_files),
            "tmp_files_sample": tmp_files[:20],
            "gaps": gaps,
            "problems": problems[:50],
        },
        "statistics": {
            "numeric": global_numeric,
            "categorical_top": {c: dict(cnt.most_common(50)) for c, cnt in global_cats.items()},
        },
        "fatal_checks": fatal_checks,
        "block_reports": block_reports,
    }
    return summary


def write_markdown_report(path: Path, summary: Dict[str, Any]) -> None:
    a = summary["archive_sizes"]
    rc = summary["row_counts"]
    mi = summary["math_integrity"]
    fs = summary["filesystem_integrity"]
    lines = []
    lines.append(f"# M19 — Archive Completeness & Statistical Audit")
    lines.append("")
    lines.append(f"**Verdetto:** {summary['status']}  ")
    lines.append(f"**Run:** `{summary['run_dir']}`  ")
    lines.append(f"**Modalità:** `{summary['mode']}`  ")
    lines.append("")
    lines.append("## Completezza archivio")
    lines.append(f"- Blocchi scansionati: **{rc['blocks_scanned']}**")
    lines.append(f"- LIGHT rows: **{rc['light_rows_scanned']}**")
    lines.append(f"- FULL rows: **{rc['full_rows_scanned']}**")
    lines.append(f"- Checkpoint nodes: **{rc['checkpoint_nodes']}**")
    lines.append(f"- Dimensione LIGHT: **{a['light_human']}**")
    lines.append(f"- Dimensione FULL: **{a['full_human']}**")
    lines.append(f"- Dimensione totale archivio: **{a['total_human']}**")
    lines.append("")
    lines.append("## Integrità matematica")
    for k, v in mi.items():
        lines.append(f"- `{k}`: **{v}**")
    lines.append("")
    lines.append("## Integrità filesystem")
    lines.append(f"- `.tmp` non quarantinati: **{fs['tmp_files_count']}**")
    lines.append(f"- Gap: **{len(fs['gaps'])}**")
    lines.append(f"- Problemi blocchi: **{len(fs['problems'])}**")
    lines.append("")
    lines.append("## Distribuzioni principali")
    cats = summary.get("statistics", {}).get("categorical_top", {})
    for col in ["outcome", "risk_level", "family_code", "micro_action", "kpd_active", "support_kind", "delegation_kind", "adaptation_kind"]:
        if col in cats:
            lines.append(f"### {col}")
            for key, count in list(cats[col].items())[:20]:
                lines.append(f"- `{key}`: {count}")
            lines.append("")
    lines.append("## Note")
    lines.append("Questo audit è read-only: non modifica core, runner, checkpoint, index, LIGHT o FULL.")
    lines.append("Per una certificazione finale locale su 500k/1M usare `--mode all`.")
    if summary.get("fatal_checks"):
        lines.append("")
        lines.append("## Fatal checks")
        lines.append("```json")
        lines.append(json.dumps(summary["fatal_checks"], ensure_ascii=False, indent=2))
        lines.append("```")
    path.write_text("\n".join(lines), encoding="utf-8")


def write_csv_summary(path: Path, summary: Dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as f:
        w = csv.writer(f)
        w.writerow(["section", "metric", "value"])
        for section in ["archive_sizes", "row_counts", "math_integrity"]:
            for k, v in (summary.get(section) or {}).items():
                w.writerow([section, k, json.dumps(v, ensure_ascii=False) if isinstance(v, (dict, list)) else v])
        for k, v in (summary.get("filesystem_integrity") or {}).items():
            if k in {"tmp_files_sample", "gaps", "problems"}:
                v = len(v) if isinstance(v, list) else v
            w.writerow(["filesystem_integrity", k, v])
        cats = summary.get("statistics", {}).get("categorical_top", {})
        for col, counts in cats.items():
            for key, count in counts.items():
                w.writerow([f"categorical:{col}", key, count])


def main() -> int:
    ap = argparse.ArgumentParser(description="M19 Archive Completeness & Statistical Audit")
    ap.add_argument("--run-dir", required=True, help="Cartella run con manifest/checkpoint/index/blocks/full")
    ap.add_argument("--out-dir", required=True, help="Cartella output report M19")
    ap.add_argument("--mode", choices=["quick", "sample", "all"], default="sample", help="Intensità audit")
    ap.add_argument("--json-only", action="store_true", help="Stampa solo JSON summary su stdout")
    args = ap.parse_args()
    summary = audit_run(Path(args.run_dir), Path(args.out_dir), mode=args.mode)
    out_dir = Path(args.out_dir)
    write_json(out_dir / "m19_archive_audit_summary.json", summary)
    write_markdown_report(out_dir / "M19_ARCHIVE_AUDIT_REPORT.md", summary)
    write_csv_summary(out_dir / "m19_archive_audit_summary.csv", summary)
    if args.json_only:
        print(json.dumps({k: v for k, v in summary.items() if k != "block_reports"}, ensure_ascii=False, indent=2))
    else:
        print(json.dumps({
            "ok": summary["ok"],
            "status": summary["status"],
            "run_dir": summary["run_dir"],
            "out_dir": str(out_dir),
            "light_rows": summary["row_counts"]["light_rows_scanned"],
            "full_rows": summary["row_counts"]["full_rows_scanned"],
            "total_archive": summary["archive_sizes"]["total_human"],
            "formula_mismatches": summary["math_integrity"]["formula_mismatches"],
            "margin_mismatches": summary["math_integrity"]["margin_mismatches"],
            "json_bad": summary["math_integrity"]["json_bad"],
            "report": str(out_dir / "M19_ARCHIVE_AUDIT_REPORT.md"),
        }, ensure_ascii=False, indent=2))
    return 0 if summary["ok"] else 2


if __name__ == "__main__":
    raise SystemExit(main())
