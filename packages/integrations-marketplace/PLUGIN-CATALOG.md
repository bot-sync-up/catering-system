# קטלוג פלאגינים

סך הכל: **33 פלאגינים** ב-8 קטגוריות.

## יומנים (Calendar)

| מזהה | שם | ספק | אימות | Webhook | תיאור |
|---|---|---|---|---|---|
| `google-calendar` | גוגל קלנדר | Google | OAuth2 | כן | סנכרון דו-כיווני, push channels |
| `outlook` | יומן אאוטלוק | Microsoft | OAuth2 | כן | Microsoft Graph API |
| `apple` | יומן אפל (iCal) | Apple | ללא | לא | פיד ICS למנוי |

## חשבונאות (Accounting)

| מזהה | שם | ספק | אימות | Webhook | תיאור |
|---|---|---|---|---|---|
| `icount` | iCount | iCount | API Key | כן | הפקת חשבוניות וקבלות |
| `greeninvoice` | חשבונית ירוקה | Green Invoice | API Key (JWT) | כן | חשבוניות דיגיטליות |
| `rivhit` | ריווחית | Rivhit Systems | API Key | לא | ERP ישראלי |
| `hashavshevet` | חשבשבת | חשבשבת | ללא (CSV/DBF) | לא | החלפת קבצים |
| `abm` | ABM (אבן מורן) | Even Moran | ללא (Excel) | לא | החלפת קבצים |

## סליקה (Payment)

| מזהה | שם | ספק | אימות | Webhook | תיאור |
|---|---|---|---|---|---|
| `cardcom` | קארדקום | Cardcom | API Key | כן | Low Profile / Direct |
| `tranzila` | טרנזילה | Tranzila | API Key | כן | TranzilaToken |
| `payplus` | PayPlus | PayPlus | API Key | כן | Checkout + Tokenization |
| `yaad-sarig` | יעד שריג | Hyp | API Key | לא | סליקה ישראלית |
| `grow` | Grow (משולם) | Grow | API Key | כן | סליקה ישראלית |
| `stripe` | Stripe | Stripe | API Key | כן | סליקה גלובלית |

## BI ודוחות (BI)

| מזהה | שם | ספק | אימות | Webhook | תיאור |
|---|---|---|---|---|---|
| `power-bi` | Power BI | Microsoft | OAuth2 | לא | Streaming datasets |
| `google-sheets` | גוגל שיטס | Google | OAuth2 | לא | קריאה/כתיבה |
| `excel-export` | ייצוא לאקסל | Sync Up | ללא | לא | יצוא XLSX |
| `looker-studio` | Looker Studio | Google | API Key | לא | Community Connector |

## שיווק (Marketing)

| מזהה | שם | ספק | אימות | Webhook | תיאור |
|---|---|---|---|---|---|
| `mailchimp` | Mailchimp | Intuit Mailchimp | API Key | כן | אנשי קשר וקמפיינים |
| `activecampaign` | ActiveCampaign | ActiveCampaign | API Key | כן | אוטומציית שיווק + CRM |
| `hubspot` | HubSpot | HubSpot | OAuth2 | כן | CRM ומכירות |
| `facebook-lead-ads` | לידים מפייסבוק | Meta | OAuth2 | כן | קליטת לידים בזמן אמת |
| `google-ads-conversion` | המרות גוגל אדס | Google | OAuth2 | לא | העלאת המרות אופליין |

## תפעול (Operations)

| מזהה | שם | ספק | אימות | Webhook | תיאור |
|---|---|---|---|---|---|
| `waze-business` | Waze for Business | Waze | API Key | לא | סגירות והתראות |
| `wolt-for-business` | Wolt for Business | Wolt | API Key | כן | משלוחי Wolt Drive |
| `cibus` | סיבוס (Cibus) | Pluxee Israel | API Key | לא | טעינות ודוחות לעובדים |
| `teneo` | Teneo | Artificial Solutions | API Key | לא | Conversational AI |
| `peppermint` | Peppermint | Peppermint Labs | API Key | כן | ticketing קוד פתוח |

## תקשורת (Communication)

| מזהה | שם | ספק | אימות | Webhook | תיאור |
|---|---|---|---|---|---|
| `slack` | Slack | Slack Technologies | OAuth2 | כן | הודעות וקבלת אירועים |
| `teams` | Microsoft Teams | Microsoft | OAuth2 | כן | הודעות בערוצים |
| `discord` | Discord | Discord | API Key (Bot) | כן | הודעות וקבלת events |

## אחסון (Storage)

| מזהה | שם | ספק | אימות | Webhook | תיאור |
|---|---|---|---|---|---|
| `dropbox` | Dropbox | Dropbox | OAuth2 | כן | קריאה/כתיבה |
| `google-drive` | Google Drive | Google | OAuth2 | כן | קריאה/כתיבה |
| `onedrive` | OneDrive | Microsoft | OAuth2 | כן | OneDrive + SharePoint |

---

## הוספת פלאגין

ראו [`src/sdk/template-plugin.ts`](./src/sdk/template-plugin.ts) להתחלה מהירה.
ראו [`README.md`](./README.md) להוראות אינטגרציה כלליות.
