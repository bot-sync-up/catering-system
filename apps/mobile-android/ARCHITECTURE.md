<div dir="rtl">

# ארכיטקטורה - אפליקציית קייטרינג

מסמך זה מתאר את החלוקה לשכבות, את זרימות הנתונים, ואת הקבצים המרכזיים בכל שכבה. כל הדיאגרמות ב-Mermaid.

---

## סקירה - שכבות

</div>

```mermaid
flowchart TD
    UI["Presentation<br/>(Compose Screens + ViewModels)"]
    Domain["Domain<br/>(Models + UseCases + Repository interfaces)"]
    Data["Data<br/>(Repository impls + Retrofit + Room + Mappers)"]
    Core["Core<br/>(Network / Storage / Auth / Sync / Notif / Location / DND)"]

    UI --> Domain
    Domain --> Data
    Data --> Core
    Data -->|Retrofit| Backend[(REST API)]
    Core -->|FCM| FCM[(Firebase Cloud Messaging)]
    Core -->|Geofence| GMS[(Google Play Services)]
```

<div dir="rtl">

- **Presentation** - לא יודע על Retrofit/Room. רק מודלי Domain.
- **Domain** - אינו תלוי באנדרואיד פרט ל-Coroutines + Flow.
- **Data** - מממש את ה-interfaces של Domain. מנהל cache/queue.
- **Core** - תשתית: HTTP client, DB, EncryptedSharedPreferences, ערוצי התראות.

---

## חבילה (Package) מרכזיות

</div>

```mermaid
flowchart LR
    subgraph presentation
      Auth[auth/]
      Manager[manager/]
      Agent[agent/]
      Kitchen[kitchen/]
      Shift[shift/]
      Driver[driver/]
      Customer[customer/]
      Shared[shared/]
      Components[components/]
      Theme[theme/]
      Nav[navigation/]
    end
    subgraph domain
      Models[model/]
      UseCases[usecase/]
      RepoIfaces[repository/]
    end
    subgraph data
      RepoImpls[repository/]
      Remote[remote/]
      Local[local/]
      Mappers[Mappers.kt]
    end
    subgraph core
      Network[network/]
      Storage[storage/]
      AuthCore[auth/]
      Sync[sync/]
      Notif[notifications/]
      Location[location/]
      Dnd[dnd/]
      Camera[camera/]
      I18n[i18n/]
    end
```

<div dir="rtl">

---

## זרימת התחברות

</div>

```mermaid
sequenceDiagram
    actor User as משתמש
    participant UI as LoginScreen
    participant VM as LoginViewModel
    participant UC as LoginUseCase
    participant Repo as AuthRepository
    participant API as AuthApi
    participant Store as TokenStore (Encrypted)

    User->>UI: דוא"ל + סיסמה
    UI->>VM: submit()
    VM->>UC: invoke(email, password)
    UC->>Repo: login(...)
    Repo->>API: POST /auth/login
    API-->>Repo: {accessToken, refreshToken, role, userId}
    Repo->>Store: save tokens (AES256_GCM)
    Repo-->>UC: User
    UC-->>VM: Result.success(User)
    VM->>UI: onLoggedIn(role)
    UI->>UI: navigate לפי תפקיד
```

<div dir="rtl">

---

## זרימת Offline-First (פעולה ללא רשת)

</div>

```mermaid
sequenceDiagram
    actor User as נהג
    participant Screen as DeliveriesScreen
    participant Repo as DeliveryRepository
    participant API as DeliveryApi
    participant Queue as OfflineQueueDao
    participant Worker as OfflineQueueWorker (WorkManager)

    User->>Screen: סמן "נמסר"
    Screen->>Repo: deliver(id)
    Repo->>API: POST /delivery/{id}/delivered
    alt רשת קיימת
      API-->>Repo: 200 OK
      Repo-->>Screen: Success
    else רשת לא קיימת
      API-x Repo: IOException
      Repo->>Queue: enqueue("delivered", payload)
      Repo-->>Screen: שמור מקומית
    end
    Note over Worker: בעת חיבור - Worker מסנכרן
    Worker->>Queue: next()
    Queue-->>Worker: items
    loop כל item
      Worker->>API: dispatch
      API-->>Worker: OK / Fail
      Worker->>Queue: ack(id) / fail(id)
    end
```

<div dir="rtl">

---

## פתרון קונפליקטים

</div>

```mermaid
flowchart TD
    A[סנכרון של רשומה] --> B{מקומי dirty?}
    B -->|כן| C{local.updatedAt > remote.updatedAt?}
    C -->|כן| D[שמור מקומי + flag לסקירה ידנית]
    C -->|לא| E[החלף ב-remote]
    B -->|לא| F[Last-Write-Wins לפי updatedAt]
```

<div dir="rtl">

האסטרטגיה: **last-write-wins על בסיס updatedAt + flag להתערבות ידנית** במקרה ש-`dirty` ועדיין מאוחר יותר מהשרת. לוגיקה ב-`ConflictResolver`.

---

## ערוצי התראות

</div>

```mermaid
flowchart LR
    FCM[FCM Message] --> Service[CateringFcmService]
    Service --> DND{DND פעיל?<br/>22:00-08:00}
    DND -->|כן, אך category=geofence| Show[הצג ב-channel המתאים]
    DND -->|כן ולא geofence| Drop[הפסק - שעות שקטות]
    DND -->|לא| Show
    Show --> CH1[orders]
    Show --> CH2[payments]
    Show --> CH3[shifts]
    Show --> CH4[tasks]
    Show --> CH5[geofence]
```

<div dir="rtl">

---

## ניווט לפי תפקיד

</div>

```mermaid
flowchart TD
    Start[App Start] --> Logged{מחובר?}
    Logged -->|לא| Login[LoginScreen]
    Login --> Logged
    Logged -->|כן| Role{תפקיד?}
    Role -->|MANAGER| MD[ManagerDashboard]
    Role -->|AGENT| CRM[CrmScreen]
    Role -->|KITCHEN| Prep[PrepTasksScreen]
    Role -->|SHIFT| Clock[ClockScreen]
    Role -->|DRIVER| Deliveries[DeliveriesScreen]
    Role -->|CUSTOMER| MyOrders[MyOrdersScreen]
```

<div dir="rtl">

---

## טבלת קבצים מרכזיים

| תחום | קבצים |
|------|-------|
| Application | `CateringApp.kt`, `MainActivity.kt` |
| Network | `core/network/AuthInterceptor.kt`, `TokenAuthenticator.kt`, `ApiResult.kt`, `di/NetworkModule.kt` |
| Auth | `core/auth/TokenStore.kt`, `BiometricAuthenticator.kt`, `data/repository/AuthRepositoryImpl.kt` |
| DB | `core/storage/CateringDatabase.kt`, `entity/*`, `data/local/*Dao.kt` |
| Sync | `core/sync/OfflineQueueManager.kt`, `OfflineQueueWorker.kt`, `ConflictResolver.kt` |
| Notifications | `core/notifications/NotificationChannels.kt`, `CateringFcmService.kt`, `core/dnd/DndGate.kt` |
| Location | `core/location/LocationProvider.kt`, `GeofenceManager.kt`, `GeofenceBroadcastReceiver.kt` |
| Camera+OCR | `core/camera/CameraXManager.kt`, `data/remote/OcrApi.kt`, `presentation/screens/shared/CameraOcrScreen.kt` |
| Signature | `presentation/components/SignaturePad.kt`, `presentation/screens/driver/SignatureScreen.kt` |
| i18n | `core/i18n/RtlHelpers.kt`, `res/values-he/strings.xml`, `res/xml/locales_config.xml` |

</div>
