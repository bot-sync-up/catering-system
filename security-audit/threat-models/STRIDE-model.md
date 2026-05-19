<div dir="rtl">

# מודל איום STRIDE

לכל מודול במערכת — איומים, mitigations, ו-residual risk.

STRIDE = **S**poofing / **T**ampering / **R**epudiation / **I**nformation disclosure / **D**enial of service / **E**levation of privilege

---

## מודול: Authentication (login + signup + 2FA)

| איום | קטגוריה | תרחיש | Mitigation | Residual |
|---|---|---|---|---|
| Credential stuffing | S | תוקף משתמש ב-database leaks | rate-limit + breach API (HaveIBeenPwned) + MFA | Low |
| Phishing | S | אתר מתחזה גונב סיסמה | WebAuthn / passkeys (עתיד) | Medium |
| Session token theft | S | XSS גונב cookie | HttpOnly + Secure + SameSite + CSP | Low |
| Brute force | S | ניסיונות סיסמה | account lockout אחרי 5 + CAPTCHA | Low |
| Password DB leak | I | SQL injection / dump | bcrypt cost ≥12 + הצפנת DB at-rest | Low |
| Reset token replay | E | שימוש חוזר ב-link | חד-פעמי + תוקף 15 דק׳ | Low |
| OTP bombing | D | הצפת SMS לקורבן | cooldown 60s per phone + cap יומי | Low |
| JWT alg confusion | E | RS256→HS256 | whitelist alg + key by kid | Low |
| Account takeover via email change | E | תוקף משנה אימייל בלי אישור | confirmation לאימייל הישן + הודעה | Low |

---

## מודול: Billing (חשבוניות + תשלומים)

| איום | קטגוריה | תרחיש | Mitigation | Residual |
|---|---|---|---|---|
| Negative price | T | client שולח -100 | server-side validation + clamp | Low |
| Discount stacking | T | חזרה על קופון | idempotency key per coupon | Low |
| Currency tampering | T | החלפת ILS→USD | resolve price+currency server-side | Low |
| Payment skip | E | mark order paid ללא webhook | order.status רק מ-webhook | Low |
| Webhook spoofing | T | תוקף שולח fake webhook | חתימת HMAC + IP allowlist | Low |
| Invoice tampering | T | שינוי PDF | חתימה דיגיטלית + hash במסד | Medium |
| Race condition (double-spend) | T | 2 קניות במקביל | SELECT FOR UPDATE / optimistic lock | Low |
| חוסר תיעוד | R | תוקף מכחיש פעולה | audit_log immutable + WORM | Low |
| VAT bypass | T | client שולח VAT=0 | מחושב server-side (0.18 hard-coded) | Low |
| Chargeback fraud | R | קונה טוען לא קיבל | webhook proof + delivery confirmation | Medium |

---

## מודול: API Gateway

| איום | קטגוריה | תרחיש | Mitigation | Residual |
|---|---|---|---|---|
| Unauthorized access | E | יציאה ללא token | middleware על כל /api/* | Low |
| DDoS | D | flood | CloudFlare + rate-limit per IP | Medium |
| SSRF | I | URL controlled by user | allowlist + DNS resolution check | Low |
| SQL/NoSQL injection | T | payload בקלט | parameterized + sanitize | Low |
| Mass assignment | E | PATCH role=admin | whitelist allowed fields | Low |
| IDOR | E | גישה לרשומה זרה | ownership check בכל read | Low |
| Path traversal | I | ../etc/passwd | path.resolve + allowlist | Low |
| Verb tampering | E | HEAD/OPTIONS עוקפים auth | middleware ALL methods | Low |
| Slowloris | D | חיבורים פתוחים | timeout + connection limit | Medium |

---

## מודול: File Upload

| איום | קטגוריה | תרחיש | Mitigation | Residual |
|---|---|---|---|---|
| RCE via upload | E | PHP/JSP shell | type+magic-bytes whitelist + S3 separate bucket | Low |
| Malware | I | virus to other users | ClamAV scan + sandbox preview | Low |
| Filename injection | I | ../etc/passwd | UUID filenames | Low |
| Storage exhaustion | D | upload גדול | size limit + quota | Low |
| SSRF via XML/SVG | I | parsed file fetches URL | disable external entities | Low |
| Image bombs | D | zip bomb / decompression | size + resolution caps | Low |

---

## מודול: Data store (Postgres)

| איום | קטגוריה | תרחיש | Mitigation | Residual |
|---|---|---|---|---|
| Data leak via backup | I | snapshot exposed | encrypted backups + access control | Low |
| Insider threat | I | DBA reads PII | row-level encryption + audit + need-to-know | Medium |
| Schema migration disaster | T | bad migration drops data | review + backup before | Medium |
| SQL injection | T | as above | parameterize | Low |
| Replication lag → stale reads | I | stale data | read-from-primary for sensitive | Low |

---

## מודול: 3rd-party integrations (Cardcom, iCount, SendGrid)

| איום | קטגוריה | תרחיש | Mitigation | Residual |
|---|---|---|---|---|
| API key leak | I | committed to git | gitleaks + Vault | Low |
| Provider breach | I | ספק נפרץ | minimum data sent + rotate periodically | Medium |
| Webhook spoofing | T | fake callback | HMAC signature verify | Low |
| Vendor downtime | D | Cardcom down | retry + queue + degraded mode | Medium |
| MitM | I | intercept TLS | TLS 1.3 + cert pinning (mobile) | Low |

---

## Mitigation summary

### חובה לפני production
- [ ] WAF (CloudFlare/AWS)
- [ ] CSP strict (no unsafe-inline)
- [ ] All cookies: HttpOnly + Secure + SameSite=Strict
- [ ] rate-limit על login + register + reset + OTP
- [ ] PII encryption at-rest (ת"ז, בנק, ק.אשראי)
- [ ] audit_log על כל פעולת admin + PII access
- [ ] backup מוצפן + tested restore
- [ ] secrets ב-Vault (לא env files)
- [ ] dependency scan ב-CI חוסם merge על high+
- [ ] WAF rule for SQL injection patterns

### תוך 90 יום ראשונים
- [ ] WebAuthn / passkeys
- [ ] SIEM (Datadog / Sentinel)
- [ ] BugCrowd / HackerOne (אם budget)
- [ ] tabletop incident response

</div>
