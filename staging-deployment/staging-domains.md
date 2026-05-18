# מפת דומיינים — Staging

> כל הדומיינים הם תת־דומיינים של `staging.catering.co.il`. רשומות ה-DNS מנוהלות
> דרך Terraform (`terraform/dns.tf`) על Cloudflare.

## טבלת שירותים

| Subdomain                         | שירות                          | פורט פנימי | Proxy CF |
|-----------------------------------|--------------------------------|------------|----------|
| `staging.catering.co.il`          | Frontend (חנות / לקוחות)       | 3000       | כן       |
| `api.staging.catering.co.il`      | REST API + Webhooks            | 4000       | כן       |
| `portal.staging.catering.co.il`   | Portal לבעלי catering          | 3100       | כן       |
| `admin.staging.catering.co.il`    | Back-office אדמין              | 3200       | כן       |
| `ws.staging.catering.co.il`       | WebSocket (orders, kitchen)    | 4001       | לא       |
| `grafana.staging.catering.co.il`  | Grafana                        | 3300       | כן       |
| `metrics.staging.catering.co.il`  | Prometheus (פנימי)             | 9090       | לא       |
| `media.staging.catering.co.il`    | CDN ל-R2 (uploads ציבוריים)    | —          | כן       |

## הגנות

- **TLS:** Let's Encrypt דרך certbot, חידוש אוטומטי ב-cron יומי בשעה 03:30.
- **HSTS:** `max-age=31536000; includeSubDomains; preload`.
- **CAA:** רק `letsencrypt.org` רשאי לחתום על staging.
- **Cloudflare zone:** SSL=strict, Min TLS=1.2, TLS 1.3 on, Always HTTPS on.
- **Admin / Metrics:** מומלץ allow-list על IP חברה / VPN — דרך `admin_ssh_cidrs`.

## הוספת subdomain חדש

1. ערוך `terraform/dns.tf` ב-`locals.staging_subdomains`.
2. `terraform plan -var-file=staging.tfvars`
3. `terraform apply -var-file=staging.tfvars`
4. הוסף server block ל-`ansible/roles/nginx/templates/staging.conf.j2`
5. `ansible-playbook ansible/playbook.yml --tags nginx`
6. הריצה תכלול חידוש cert וקריאה ל-`certbot --expand`.

## בדיקה מהירה

```bash
for d in staging api.staging portal.staging admin.staging grafana.staging; do
  echo "=== ${d}.catering.co.il ==="
  curl -sI "https://${d}.catering.co.il" | head -1
done
```
