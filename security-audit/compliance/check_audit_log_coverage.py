#!/usr/bin/env python3
"""בדיקת כיסוי לוג ביקורת (audit log).

תקנות הגנת הפרטיות דורשות תיעוד של:
- כל פעולת login/logout
- שינויי הרשאות
- גישה ל-PII
- פעולות מנהלים
- מחיקות + עדכוני שדות רגישים

הסקריפט סורק קוד routes/handlers ובודק שכל אחד מפעיל audit log call.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

# Patterns identifying a sensitive route handler
SENSITIVE_ROUTE_PATTERNS = [
    (r"app\.(post|put|patch|delete)\s*\(\s*['\"]([^'\"]+)['\"]", "express"),
    (r"router\.(post|put|patch|delete)\s*\(\s*['\"]([^'\"]+)['\"]", "express-router"),
    (r"@(Post|Put|Patch|Delete)\(['\"]([^'\"]+)['\"]\)", "nest"),
    (r"@app\.route\(['\"]([^'\"]+)['\"].*methods=\[.*(POST|PUT|PATCH|DELETE)", "flask"),
]

# Patterns indicating audit-log call is present
AUDIT_CALL_PATTERNS = [
    r"audit_?log\.",
    r"auditLog\(",
    r"logger\.audit\(",
    r"writeAuditEvent\(",
    r"AuditService\.",
    r"@AuditLogged",
    r"recordAuditEvent\(",
]

SENSITIVE_PATH_KEYWORDS = [
    "login", "logout", "auth", "admin", "user", "users", "permission",
    "role", "delete", "transfer", "payment", "invoice", "settings",
    "password", "2fa", "mfa", "token",
]


def scan(root: Path) -> dict:
    skip = {"node_modules", ".git", "dist", "build", "test", "__tests__"}
    routes_found = []
    routes_missing_audit = []

    for fp in root.rglob("*"):
        if any(p in skip for p in fp.parts):
            continue
        if fp.suffix not in {".js", ".ts", ".py"}:
            continue

        try:
            text = fp.read_text(encoding="utf-8", errors="ignore")
        except Exception:
            continue

        lines = text.splitlines()
        for pattern, framework in SENSITIVE_ROUTE_PATTERNS:
            for m in re.finditer(pattern, text):
                groups = m.groups()
                # Get path
                path = next((g for g in groups if g and "/" in g), "")
                if not path:
                    continue
                if not any(kw in path.lower() for kw in SENSITIVE_PATH_KEYWORDS):
                    continue

                # Find handler body (next ~50 lines)
                start_pos = m.start()
                line_no = text[:start_pos].count("\n") + 1
                handler_body = "\n".join(lines[line_no - 1:line_no + 50])

                has_audit = any(re.search(p, handler_body) for p in AUDIT_CALL_PATTERNS)

                entry = {
                    "file": str(fp.relative_to(root)),
                    "line": line_no,
                    "framework": framework,
                    "path": path,
                    "method_group_0": groups[0],
                    "has_audit_call": has_audit,
                }
                routes_found.append(entry)
                if not has_audit:
                    routes_missing_audit.append(entry)

    return {
        "tool": "audit-log-coverage",
        "regulation": "תקנות הגנת הפרטיות (אבטחת מידע) — דרישת תיעוד פעולות",
        "scanned_at": datetime.now(timezone.utc).isoformat(),
        "total_sensitive_routes": len(routes_found),
        "routes_missing_audit": routes_missing_audit,
        "coverage_pct": round(
            100 * (len(routes_found) - len(routes_missing_audit)) / max(1, len(routes_found)), 1
        ),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="בדיקת כיסוי audit log")
    parser.add_argument("--root", default=".")
    parser.add_argument("--out", default="security-audit/reports/audit-log-coverage.json")
    parser.add_argument("--min-coverage", type=float, default=95.0, help="Required coverage %")
    args = parser.parse_args()

    print("=== בדיקת כיסוי audit log ===")
    report = scan(Path(args.root))
    print(f"Sensitive routes: {report['total_sensitive_routes']}")
    print(f"Missing audit: {len(report['routes_missing_audit'])}")
    print(f"Coverage: {report['coverage_pct']}%")

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")

    if report["coverage_pct"] < args.min_coverage:
        print(f"FAIL: coverage {report['coverage_pct']}% < {args.min_coverage}%")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
