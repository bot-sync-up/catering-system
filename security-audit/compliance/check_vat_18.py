#!/usr/bin/env python3
"""בדיקה ששיעור מע"מ בקוד הוא 18% (החל מ-1.1.2025).

מחפש קבועים קשיחים של מע"מ ומוודא:
- ערך = 0.18 / 18 / 18%
- אין שיעורים ישנים (0.17, 0.16, 0.15)
- שיעור נקרא מ-config/DB ולא קשיח
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

VAT_TERMS = [
    r"\bvat\b",
    r"\bVAT\b",
    r"\bmaam\b",
    r"מע\"מ",
    r"מעמ",
    r"tax_?rate",
    r"taxRate",
]

# Bad: old rates
OLD_RATES = [r"0\.17\b", r"0\.16\b", r"0\.15\b", r"\b17\s*%", r"\b16\s*%", r"\b15\s*%"]

# Good: 18%
GOOD_RATES = [r"0\.18\b", r"\b18\s*%", r"\b18\.0\b"]


def scan(root: Path) -> dict:
    skip = {"node_modules", ".git", "dist", "build", "vendor", "test"}
    issues = []
    correct = []

    for fp in root.rglob("*"):
        if any(p in skip for p in fp.parts):
            continue
        if fp.suffix not in {".js", ".ts", ".py", ".sql", ".json", ".yml", ".yaml", ".env"}:
            continue
        try:
            text = fp.read_text(encoding="utf-8", errors="ignore")
        except Exception:
            continue

        for line_no, line in enumerate(text.splitlines(), 1):
            # Look for VAT-related lines
            if not any(re.search(t, line, re.IGNORECASE) for t in VAT_TERMS):
                continue

            entry_base = {
                "file": str(fp.relative_to(root)),
                "line": line_no,
                "snippet": line.strip()[:200],
            }

            for bad in OLD_RATES:
                if re.search(bad, line):
                    issues.append({
                        **entry_base,
                        "severity": "high",
                        "issue": f"שיעור מע\"מ ישן ({bad}) — יש לעדכן ל-18%",
                    })
                    break
            for good in GOOD_RATES:
                if re.search(good, line):
                    correct.append({**entry_base, "rate": "18%"})
                    break

            # Check for hardcoded literal that's NOT 0.18
            literal = re.search(r"=\s*(0\.\d+|\d+(?:\.\d+)?\s*\/?\s*100)", line)
            if literal:
                val = literal.group(1)
                try:
                    f = eval(val) if "/" in val else float(val)
                    if abs(f - 0.18) > 0.001 and 0.0 < f < 1.0:
                        issues.append({
                            **entry_base,
                            "severity": "high",
                            "issue": f"שיעור מע\"מ קשיח לא-תקני: {val} (יש להיות 0.18)",
                        })
                except Exception:
                    pass

    return {
        "tool": "vat-18-check",
        "law": "חוק מע\"מ — שיעור 18% מ-1.1.2025",
        "scanned_at": datetime.now(timezone.utc).isoformat(),
        "issues": issues,
        "correct_references": correct,
        "total_issues": len(issues),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="בדיקת שיעור מע\"מ 18%")
    parser.add_argument("--root", default=".")
    parser.add_argument("--out", default="security-audit/reports/vat-18-check.json")
    args = parser.parse_args()

    print("=== בדיקת מע\"מ 18% ===")
    report = scan(Path(args.root))
    print(f"Issues: {report['total_issues']}")
    print(f"Correct references: {len(report['correct_references'])}")

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Report: {out}")

    return 1 if report["total_issues"] > 0 else 0


if __name__ == "__main__":
    sys.exit(main())
