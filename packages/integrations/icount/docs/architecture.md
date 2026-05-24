# ארכיטקטורה

## שכבות

```
┌─────────────────────────────────────────┐
│ Application (Anah HaShoel)             │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│ AdapterFactory  → IntegrationProvider   │
└────────────────┬────────────────────────┘
                 │
   ┌─────────────┼─────────────┐
   │             │             │
┌──▼──┐      ┌───▼───┐     ┌───▼───┐
│iCount│     │ Green │     │Rivhit │
└──┬──┘      └───┬───┘     └───┬───┘
   │             │             │
┌──▼─────────────▼─────────────▼──┐
│   RestClient (axios+retry)      │
└──────────────┬──────────────────┘
               │
   ┌───────────┼───────────┐
   │           │           │
┌──▼──┐   ┌────▼────┐  ┌───▼────┐
│ VAT │   │Allocation│  │Customer│
│Svc  │   │  Svc     │  │ Sync   │
└─────┘   └──────────┘  └────────┘

┌────────────────────────────────────┐
│ Cross-cutting:                     │
│  - WebhookReceiver (HMAC)         │
│  - IntegrationQueue (BullMQ)      │
│  - IntegrationLogs (audit trail)  │
└────────────────────────────────────┘
```

## עקרונות
- **Adapter Pattern** - הפעלה אחידה לכל ספק
- **Type-safe** - כל input/output מוגדר עם Zod או TypeScript
- **Resilient** - retry אקספוננציאלי + queue + logs
- **Compliant** - מספרי הקצאה ו-PCN874 מובנים
- **Testable** - שכבות נפרדות, mock-ים עם nock
