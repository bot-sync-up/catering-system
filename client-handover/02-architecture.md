<div dir="rtl">

# 02 — ארכיטקטורת המערכת

## 1. תרשים מערכת כללי (High-Level Architecture)

```mermaid
graph TB
    subgraph "Clients"
        WEB[Web App<br/>Next.js]
        MOBILE[Mobile App<br/>Expo/React Native]
        PORTAL[Customer Portal]
    end

    subgraph "Edge"
        CDN[Cloudflare CDN]
        WAF[WAF + DDoS]
    end

    subgraph "Application Layer"
        API[REST/GraphQL API<br/>Node.js]
        WS[WebSocket Gateway<br/>Real-time]
        WORKER[Background Workers<br/>BullMQ]
    end

    subgraph "Data Layer"
        PG[(PostgreSQL<br/>Primary)]
        PGR[(PostgreSQL<br/>Read Replica)]
        REDIS[(Redis<br/>Cache + Queue)]
        S3[(S3 / R2<br/>Files + Backups)]
    end

    subgraph "External Services"
        ICOUNT[iCount<br/>Invoicing]
        CARDCOM[Cardcom<br/>Payments]
        WA[WhatsApp Business]
        SG[SendGrid<br/>Email]
        TWILIO[Twilio<br/>SMS]
        AI[Anthropic<br/>Claude API]
    end

    WEB --> CDN
    MOBILE --> CDN
    PORTAL --> CDN
    CDN --> WAF
    WAF --> API
    WAF --> WS
    API --> PG
    API --> PGR
    API --> REDIS
    API --> S3
    WORKER --> PG
    WORKER --> REDIS
    API --> ICOUNT
    API --> CARDCOM
    API --> WA
    API --> SG
    API --> TWILIO
    API --> AI
```

## 2. תרשים זרימת הזמנה (Order Flow)

```mermaid
sequenceDiagram
    participant C as Customer
    participant P as Portal
    participant API as API
    participant DB as PostgreSQL
    participant K as Kitchen
    participant D as Driver
    participant WA as WhatsApp

    C->>P: יוצר הזמנה
    P->>API: POST /orders
    API->>DB: INSERT order (status=pending)
    API->>WA: שליחת אישור ללקוח
    API->>K: התראה במסך מטבח
    K->>API: עדכון סטטוס (preparing)
    API->>WA: עדכון ללקוח
    K->>API: סיום הכנה (ready)
    API->>D: שיוך אוטומטי לנהג
    D->>API: יציאה למשלוח (out_for_delivery)
    API->>WA: לינק למעקב Real-time
    D->>API: אישור מסירה + חתימה + תמונה
    API->>DB: סטטוס=delivered
    API->>WA: בקשת ביקורת
```

## 3. מודל נתונים — ישויות עיקריות (ERD)

```mermaid
erDiagram
    TENANT ||--o{ USER : has
    TENANT ||--o{ CUSTOMER : has
    TENANT ||--o{ MENU : has
    CUSTOMER ||--o{ ORDER : places
    ORDER ||--o{ ORDER_ITEM : contains
    MENU ||--o{ MENU_ITEM : contains
    MENU_ITEM ||--o{ ORDER_ITEM : referenced_by
    ORDER ||--|| DELIVERY : has
    DELIVERY }o--|| DRIVER : assigned_to
    ORDER ||--o{ PAYMENT : has
    ORDER ||--|| INVOICE : produces

    TENANT {
        uuid id PK
        string name
        string subdomain
        string plan
        jsonb settings
    }
    USER {
        uuid id PK
        uuid tenant_id FK
        string email
        string role
    }
    CUSTOMER {
        uuid id PK
        uuid tenant_id FK
        string name
        string phone
        string tax_id
    }
    ORDER {
        uuid id PK
        uuid customer_id FK
        decimal total
        string status
        timestamp scheduled_at
    }
```

## 4. שכבות (Layered Architecture)

```mermaid
graph LR
    subgraph "Presentation"
        UI[Web UI / Mobile UI]
    end
    subgraph "Application"
        CTRL[Controllers / Resolvers]
        USE[Use-Cases / Services]
    end
    subgraph "Domain"
        ENT[Entities + Domain Logic]
    end
    subgraph "Infrastructure"
        REPO[Repositories]
        EXT[External Adapters]
    end

    UI --> CTRL
    CTRL --> USE
    USE --> ENT
    USE --> REPO
    REPO --> EXT
```

## 5. Multi-Tenancy

- **Shared DB, Shared Schema** עם הפרדה מלאה ב-`tenant_id` בכל טבלה
- **Row-Level Security (RLS)** ב-PostgreSQL כשכבת הגנה שנייה
- **Tenant-aware Middleware** חולץ את ה-tenant מ-JWT / subdomain
- **Plan-based Feature Flags** — חבילות תכונות לפי תוכנית

## 6. אבטחה (Security Layers)

```mermaid
graph TD
    A[Client] -->|HTTPS TLS 1.3| B[Cloudflare WAF]
    B -->|mTLS אופציונלי| C[API Gateway]
    C -->|JWT + RBAC| D[Application]
    D -->|RLS + Audit| E[Database]
    E -->|Encrypted at Rest AES-256| F[Disk]
```

- Authentication: JWT + Refresh Token
- Authorization: RBAC + ABAC (Attribute-Based)
- Secrets: Vault / Doppler (לא ב-Git)
- Audit Log: כל פעולה רגישה נשמרת ב-immutable log
- Rate Limiting: 100 req/min לכל user, 1000 req/min לכל tenant

## 7. Deployment

```mermaid
graph LR
    DEV[Developer] -->|push| GH[GitHub]
    GH -->|CI| CI[GitHub Actions]
    CI -->|tests pass| BUILD[Docker Build]
    BUILD -->|push| REG[Registry]
    REG -->|deploy| STAGING[Staging]
    STAGING -->|manual approval| PROD[Production]
    PROD --> MON[Monitoring<br/>Grafana + Sentry]
```

## 8. Observability

- **Logs** — structured JSON, נשלח ל-Loki
- **Metrics** — Prometheus + Grafana
- **Traces** — OpenTelemetry → Tempo
- **Errors** — Sentry
- **Uptime** — UptimeRobot / BetterStack

</div>
