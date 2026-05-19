#!/usr/bin/env python3
"""בדיקת הצפנת PII: ת"ז, חשבון בנק, שכר ושאר נתונים רגישים חייבים להיות מוצפנים at-rest.

תקנות הגנת הפרטיות (אבטחת מידע) תשע"ז-2017 + תקנות 2025.

הסקריפט סורק:
- קוד מקור (DDL/migrations) לעמודות PII בלי הצפנה
- DB live (אם DATABASE_URL נתון) — דגימת ערכים לבדיקה אם הם cleartext
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

PII_COLUMN_PATTERNS = [
    # English
    r"\b(israeli_?id|teudat_?zehut|tz|national_?id|personal_?id)\b",
    r"\b(bank_?account|iban|swift)\b",
    r"\b(credit_?card|card_?number|cc_?number|pan)\b",
    r"\b(cvv|cvc|cvv2)\b",
    r"\b(salary|wage|income|net_?pay)\b",
    r"\b(phone|mobile|cellphone)\b",
    r"\b(passport_?number|drivers_?license)\b",
    r"\b(medical|diagnosis|health_?condition)\b",
    # Hebrew
    r"(תעודת_זהות|ת_ז|מספר_זהות|חשבון_בנק|שכר|משכורת|כרטיס_אשראי)",
]

ENCRYPTION_HINTS = [
    r"\bbytea\b",  # postgres encrypted blob
    r"\bvarbinary\b",
    r"crypto\.|pgp_sym_encrypt|AES_ENCRYPT",
    r"encrypted_",
    r"@encrypted",
    r"@Column.*transformer.*[Ee]ncrypt",
    r"vault://",
]


def scan_source_files(root: Path) -> list[dict]:
    findings: list[dict] = []
    skip_dirs = {"node_modules", ".git", "dist", "build", "vendor", "__pycache__"}

    for fp in root.rglob("*"):
        if any(part in skip_dirs for part in fp.parts):
            continue
        if not fp.is_file():
            continue
        if fp.suffix.lower() not in {".sql", ".ts", ".js", ".py", ".prisma", ".graphql", ".yaml", ".yml"}:
            continue

        try:
            content = fp.read_text(encoding="utf-8", errors="ignore")
        except Exception:
            continue

        for line_no, line in enumerate(content.splitlines(), 1):
            for col_pattern in PII_COLUMN_PATTERNS:
                if re.search(col_pattern, line, re.IGNORECASE):
                    # Check encryption hint in this line OR nearby
                    context_start = max(0, line_no - 4)
                    context_lines = content.splitlines()[context_start:line_no + 4]
                    context = "\n".join(context_lines)

                    has_encryption = any(re.search(h, context, re.IGNORECASE) for h in ENCRYPTION_HINTS)
                    if not has_encryption:
                        findings.append({
                            "file": str(fp.relative_to(root)),
                            "line": line_no,
                            "column_pattern": col_pattern,
                            "snippet": line.strip()[:200],
                            "severity": "high",
                            "issue": "PII column without encryption hint",
                        })
                    break

    return findings


def scan_database_samples(db_url: str) -> list[dict]:
    """Sample rows from PII-named columns to check if values look encrypted."""
    findings: list[dict] = []
    try:
        import psycopg2  # type: ignore
    except ImportError:
        return [{"severity": "info", "issue": "psycopg2 not installed; skipping live DB scan"}]

    try:
        conn = psycopg2.connect(db_url)
        cur = conn.cursor()
        cur.execute("""
            SELECT table_schema, table_name, column_name, data_type
            FROM information_schema.columns
            WHERE table_schema NOT IN ('pg_catalog','information_schema')
              AND (column_name ~* '(israeli_?id|teudat|tz|bank_account|iban|credit_card|cvv|salary|phone)')
        """)
        for schema, table, column, dtype in cur.fetchall():
            if dtype in ("bytea",):
                continue  # likely encrypted
            cur.execute(f'SELECT "{column}" FROM "{schema}"."{table}" WHERE "{column}" IS NOT NULL LIMIT 5')
            for (val,) in cur.fetchall():
                s = str(val)
                # Heuristic: encrypted values are base64-ish or hex, longer than plaintext
                if re.fullmatch(r"\d{9}", s):  # 9-digit ת"ז in cleartext
                    findings.append({
                        "table": f"{schema}.{table}",
                        "column": column,
                        "severity": "critical",
                        "issue": f"Israeli ID stored in cleartext ({s[:3]}***)",
                    })
                elif re.fullmatch(r"\d{6,}", s):
                    findings.append({
                        "table": f"{schema}.{table}",
                        "column": column,
                        "severity": "high",
                        "issue": f"Numeric PII appears cleartext ({s[:3]}***)",
                    })
        conn.close()
    except Exception as e:
        findings.append({"severity": "info", "issue": f"DB scan failed: {e}"})

    return findings


def main() -> int:
    parser = argparse.ArgumentParser(description="בדיקת הצפנת PII ישראלי")
    parser.add_argument("--root", default=".", help="Source root to scan")
    parser.add_argument("--db-url", help="DATABASE_URL for live sample (optional)")
    parser.add_argument("--out", default="security-audit/reports/pii-encryption.json")
    args = parser.parse_args()

    print("=== בדיקת הצפנת PII ===")
    source_findings = scan_source_files(Path(args.root))
    print(f"Source findings: {len(source_findings)}")

    db_findings = []
    if args.db_url or os.environ.get("DATABASE_URL"):
        db_findings = scan_database_samples(args.db_url or os.environ["DATABASE_URL"])
        print(f"DB findings: {len(db_findings)}")

    report = {
        "tool": "pii-encryption-check",
        "regulation": "תקנות הגנת הפרטיות (אבטחת מידע) תשע\"ז-2017",
        "scanned_at": datetime.now(timezone.utc).isoformat(),
        "source_findings": source_findings,
        "db_findings": db_findings,
        "total": len(source_findings) + len(db_findings),
    }

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Report: {out}")

    return 1 if report["total"] > 0 else 0


if __name__ == "__main__":
    sys.exit(main())
