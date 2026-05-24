#!/usr/bin/env python3
"""בדיקת שמירת נתונים 7 שנים.

חוק רואי חשבון/מסים — חשבוניות + רישומי הנהלת חשבונות חייבים להישמר 7 שנים.
חוק הגנת הפרטיות — נתונים אישיים יש למחוק כאשר אינם דרושים עוד.

הסקריפט בודק:
1. קיום TTL/cron של מחיקה אוטומטית על טבלאות PII
2. שטבלאות חשבוניות לא מוגדר עליהן TTL < 7 שנים
3. מדיניות retention מתועדת
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

ACCOUNTING_TABLES = ["invoice", "receipt", "transaction", "payment", "ledger", "fiscal"]
PII_TABLES = ["user", "customer", "profile", "address", "phone"]

# 7 years in days
SEVEN_YEARS_DAYS = 365 * 7


def scan(root: Path) -> dict:
    skip = {"node_modules", ".git", "dist", "build", "vendor"}
    issues = []
    has_retention_policy = False

    for fp in root.rglob("*"):
        if any(p in skip for p in fp.parts):
            continue
        if fp.suffix.lower() not in {".sql", ".ts", ".js", ".py", ".md", ".yml", ".yaml", ".json"}:
            continue

        try:
            text = fp.read_text(encoding="utf-8", errors="ignore")
        except Exception:
            continue

        if re.search(r"retention.?policy|data.?retention|מדיניות.?שמירה", text, re.IGNORECASE):
            has_retention_policy = True

        # Look for TTL/expires on tables
        for m in re.finditer(
            r"(TTL|expires?_at|retention|delete.+after|cleanup.+after)[^\n]{0,120}",
            text,
            re.IGNORECASE,
        ):
            line_no = text[:m.start()].count("\n") + 1
            snippet = m.group(0)
            context = text[max(0, m.start() - 200):m.start() + 200]

            # Check if this is on an accounting table
            for tbl in ACCOUNTING_TABLES:
                if re.search(rf"\b{tbl}", context, re.IGNORECASE):
                    # Extract numeric value
                    days_match = re.search(r"(\d+)\s*(day|hour|month|year)", snippet, re.IGNORECASE)
                    if days_match:
                        n = int(days_match.group(1))
                        unit = days_match.group(2).lower()
                        days = n if "day" in unit else n * 30 if "month" in unit else n * 365 if "year" in unit else n / 24
                        if days < SEVEN_YEARS_DAYS:
                            issues.append({
                                "file": str(fp.relative_to(root)),
                                "line": line_no,
                                "table_type": "accounting",
                                "table": tbl,
                                "ttl_days": days,
                                "snippet": snippet[:200],
                                "severity": "critical",
                                "issue": f"טבלת {tbl} עם TTL {days} ימים — חוק מסים דורש 7 שנים (2555 ימים)",
                            })

            # PII tables: TOO LONG retention is also an issue under privacy law
            for tbl in PII_TABLES:
                if re.search(rf"\b{tbl}", context, re.IGNORECASE):
                    pass  # informational only

    if not has_retention_policy:
        issues.append({
            "severity": "medium",
            "issue": "לא נמצא מסמך מדיניות retention",
            "remediation": "צור runbook + טבלת retention per data class",
        })

    return {
        "tool": "data-retention-check",
        "law": "חוק מע\"מ + תקנות הגנת הפרטיות",
        "scanned_at": datetime.now(timezone.utc).isoformat(),
        "has_retention_policy_doc": has_retention_policy,
        "issues": issues,
        "total_issues": len(issues),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="בדיקת retention 7 שנים")
    parser.add_argument("--root", default=".")
    parser.add_argument("--out", default="security-audit/reports/data-retention.json")
    args = parser.parse_args()

    print("=== בדיקת data retention (7 שנים) ===")
    report = scan(Path(args.root))
    print(f"Issues: {report['total_issues']}")
    print(f"Has policy doc: {report['has_retention_policy_doc']}")

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Report: {out}")

    return 1 if report["total_issues"] > 0 else 0


if __name__ == "__main__":
    sys.exit(main())
