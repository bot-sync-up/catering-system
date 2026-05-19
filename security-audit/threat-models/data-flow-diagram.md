<div dir="rtl">

# Data Flow Diagram (DFD)

תיאור זרימת נתונים במערכת + trust boundaries לזיהוי איומים.

## רמה 0 — Context Diagram

```mermaid
flowchart LR
    User[משתמש קצה<br/>Browser/Mobile] -->|HTTPS| App[האפליקציה]
    Admin[מנהל מערכת] -->|HTTPS + 2FA| App
    App -->|API| Cardcom[Cardcom<br/>סליקה]
    App -->|API| Icount[iCount<br/>חשבונאות]
    App -->|SMTP/API| SendGrid
    App -->|API| SMS019[019 SMS]
    Researcher[חוקר אבטחה] -.->|disclosure| Sec[security@]
```

## רמה 1 — האפליקציה הפנימית

```mermaid
flowchart TB
    subgraph "Trust boundary: Public Internet"
        User[משתמש]
    end

    subgraph "Trust boundary: DMZ (CloudFlare WAF)"
        WAF[CloudFlare<br/>WAF + DDoS]
    end

    subgraph "Trust boundary: VPC"
        LB[ALB / Nginx]
        API[API Gateway<br/>Node.js]
        Web[SSR Web<br/>Next.js]
        Worker[Background<br/>Workers]
    end

    subgraph "Trust boundary: Data tier"
        Postgres[(Postgres<br/>encrypted)]
        Redis[(Redis<br/>sessions)]
        S3[(S3<br/>uploads)]
        Vault[(HashiCorp<br/>Vault)]
    end

    subgraph "Trust boundary: 3rd party"
        Cardcom
        Icount[iCount]
        Sendgrid[SendGrid]
    end

    User -->|HTTPS| WAF
    WAF -->|HTTPS| LB
    LB --> API
    LB --> Web
    Web -.->|server-side| API
    API -->|TLS| Postgres
    API -->|TLS| Redis
    API -->|HTTPS pre-signed| S3
    API -->|fetch| Vault
    API -->|HTTPS + HMAC| Cardcom
    API -->|HTTPS| Icount
    API -->|HTTPS| Sendgrid
    Worker -->|TLS| Postgres
    Worker -->|HTTPS| Sendgrid

    classDef boundary fill:#fef3c7,stroke:#f59e0b
```

## רמה 2 — תהליך הזמנה ותשלום

```mermaid
sequenceDiagram
    participant U as משתמש
    participant W as Web
    participant A as API
    participant DB as Postgres
    participant CC as Cardcom
    participant IC as iCount

    U->>W: בחר מוצר
    W->>A: POST /api/cart (item)
    A->>DB: validate price (server-side)
    DB-->>A: price=100 ILS
    A->>DB: INSERT cart_item
    A-->>W: cart total
    W-->>U: הצג סיכום

    U->>W: לחץ "תשלום"
    W->>A: POST /api/checkout
    A->>DB: INSERT order (status=pending)
    A->>CC: create payment intent (HMAC)
    CC-->>A: redirect URL
    A-->>W: redirect URL
    W-->>U: redirect to Cardcom

    U->>CC: הזן כרטיס + אישור
    CC->>A: POST /api/webhook/cardcom (HMAC)
    Note over A: verify HMAC<br/>verify IP allowlist
    A->>DB: UPDATE order set status=paid
    A->>IC: create invoice (API key from Vault)
    IC-->>A: invoice PDF + number
    A->>DB: INSERT invoice
    A->>U: email + SMS confirmation
```

## Trust Boundaries — נקודות בדיקה

| גבול | מאיים אפשרי | בדיקה נדרשת |
|---|---|---|
| Public → WAF | DDoS, scrapers, bots | rate-limit, CAPTCHA |
| WAF → LB | התחזות לקליינט | mTLS פנימי |
| LB → API | unauthorized | auth middleware |
| API → DB | SQL injection | parameterize |
| API → S3 | path traversal | pre-signed URLs only |
| API → Vault | sprawl of secrets | least-privilege policy |
| API → 3rd party | מפתחות API דלפו | rotate + monitor |
| 3rd party → API (webhook) | spoofing | HMAC + IP whitelist |

## רגישות נתונים

| סוג | סיווג | הצפנה at-rest | הצפנה in-transit | שמירה |
|---|---|---|---|---|
| ת"ז | סודי ביותר | AES-256-GCM + KMS | TLS 1.3 | מינימום |
| חשבון בנק | סודי ביותר | AES-256-GCM + KMS | TLS 1.3 | מינימום |
| כרטיס אשראי | PCI | לא נשמר אצלנו (PCI tokenization) | TLS 1.3 | n/a |
| שכר | סודי | AES-256-GCM | TLS 1.3 | 7 שנים |
| חשבונית | סודי | AES-256 | TLS 1.3 | 7 שנים |
| email/phone | פנימי | rest-only encrypted | TLS 1.3 | עד מחיקת חשבון |
| audit_log | פנימי | encrypted | TLS 1.3 | 7 שנים, immutable |

</div>
