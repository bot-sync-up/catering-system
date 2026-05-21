<div dir="rtl" lang="he">

# פתרון בעיות נפוצות

מאגר של 30+ בעיות שכיחות בהתקנה, הרצה ועדכון של מערכת הקייטרינג.

---

## 🛑 בעיות בהתקנה מקומית

### 1. `docker: command not found`
**פתרון**: התקן Docker Desktop מ-<https://docker.com/products/docker-desktop>. בלינוקס: `sudo apt install docker.io docker-compose-plugin`.

### 2. `Cannot connect to the Docker daemon`
Docker Desktop לא רץ.
**פתרון**: הפעל את Docker Desktop ובדוק עם `docker info`. בלינוקס: `sudo systemctl start docker`.

### 3. `permission denied while trying to connect to the Docker daemon socket`
**פתרון**: הוסף את המשתמש שלך ל-docker group:
```bash
sudo usermod -aG docker $USER
newgrp docker
```

### 4. `pnpm: command not found`
**פתרון**:
```bash
corepack enable
corepack prepare pnpm@9 --activate
# או:
npm install -g pnpm
```

### 5. `Node version mismatch`
המערכת דורשת Node 22+.
**פתרון**: התקן nvm והרץ `nvm install 22 && nvm use 22`.

### 6. `EADDRINUSE: port 3000 already in use`
תהליך אחר משתמש בפורט.
**פתרון**:
```bash
# Linux/Mac:
lsof -ti:3000 | xargs kill -9
# Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### 7. `Port 5432 already allocated` (Postgres)
Postgres מקומי מתנגש עם container.
**פתרון**: עצור את Postgres המקומי או שנה ב-`docker-compose.yml` ל-`5433:5432`.

### 8. `ERR_PNPM_FROZEN_LOCKFILE_WITH_OUTDATED_LOCKFILE`
**פתרון**: `pnpm install` ללא `--frozen-lockfile`.

### 9. ההתקנה תקועה ב-`docker compose up`
ייתכן downloading איטי.
**פתרון**: בדוק עם `docker compose logs -f` בטרמינל נוסף. שקול להגדיר Docker Hub mirror.

### 10. `Error: getaddrinfo ENOTFOUND postgres`
האפליקציה לא רואה את ה-DB container.
**פתרון**: ודא ש-`DATABASE_URL` מצביע ל-`postgres:5432` (שם השירות ב-compose), ושכל ה-containers על אותה network.

---

## 🪟 בעיות Windows

### 11. `Hyper-V is not available on Windows Home`
**פתרון**: השתמש ב-WSL2 backend ב-Docker Desktop. אם אין WSL2:
```powershell
wsl --install
# הפעל מחדש את המחשב
```

### 12. `Execution policy prevents running scripts`
**פתרון**:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
# או חד-פעמי:
powershell -ExecutionPolicy Bypass -File install-local.ps1
```

### 13. `LF will be replaced by CRLF` ב-git
**פתרון**:
```bash
git config --global core.autocrlf input
```

### 14. WSL2 צורך זיכרון רב
**פתרון**: צור `%USERPROFILE%\.wslconfig`:
```
[wsl2]
memory=4GB
processors=2
```
ואז `wsl --shutdown` והרץ שוב.

---

## ☁️ בעיות VPS

### 15. `certbot: DNS problem: NXDOMAIN looking up A for ...`
**פתרון**: A record של ה-domain לא הוגדר או עדיין מתפשט. בדוק: `dig +short your-domain.com`. המתן 5-30 דקות.

### 16. `nginx: [emerg] bind() to 0.0.0.0:80 failed (98: Address already in use)`
**פתרון**: Apache או שירות אחר תופס את 80.
```bash
sudo systemctl stop apache2
sudo systemctl disable apache2
sudo systemctl restart nginx
```

### 17. `fail2ban` חסם אותך מ-SSH
**פתרון** (מ-IP אחר או מקונסול VPS):
```bash
sudo fail2ban-client unban <your-ip>
# או:
sudo iptables -D fail2ban-sshd -s <your-ip> -j REJECT
```

### 18. UFW חסם את כל החיבורים
**פתרון** (מקונסול VPS):
```bash
sudo ufw allow 22
sudo ufw reload
```

### 19. `docker compose` נכשל עם `permission denied` על `.env.production`
**פתרון**: ה-systemd unit רץ כ-`catering`. ודא בעלות:
```bash
sudo chown catering:catering /home/catering/app/.env.production
sudo chmod 600 /home/catering/app/.env.production
```

### 20. `Out of memory` בעת migrate
VPS עם 2GB RAM לא מספיק לבנייה.
**פתרון** הוסף swap:
```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### 21. `certbot --nginx` נכשל: `Could not bind to IPv4 or IPv6.`
**פתרון**: עצור nginx זמנית והשתמש ב-standalone:
```bash
sudo systemctl stop nginx
sudo certbot certonly --standalone -d your-domain.com
sudo systemctl start nginx
```

---

## 🗄️ בעיות מסד נתונים

### 22. `database "catering" does not exist`
**פתרון**:
```bash
docker exec -it $(docker ps -qf name=postgres) psql -U postgres
CREATE DATABASE catering;
CREATE USER catering WITH PASSWORD 'your-pw';
GRANT ALL PRIVILEGES ON DATABASE catering TO catering;
```

### 23. `password authentication failed for user`
**פתרון**: סיסמת ה-DB ב-`.env` לא תואמת לזו שב-docker volume. אופציות:
* שנה את הסיסמה ב-`.env`
* או מחק את ה-volume והרץ מחדש: `docker compose down -v && docker compose up -d` (⚠️ מחיקת נתונים)

### 24. migration נכשל באמצע — DB במצב לא עקבי
**פתרון**:
```bash
pnpm db:migrate:rollback
# בדוק שגיאה ותקן
pnpm db:migrate
```

### 25. Redis לא שומר נתונים אחרי restart
**פתרון**: ודא שיש volume ב-compose:
```yaml
redis:
  volumes:
    - redis-data:/data
```

---

## 🔐 בעיות SSL / HTTPS

### 26. תעודה פגה
**פתרון**:
```bash
sudo certbot renew --force-renewal
sudo systemctl reload nginx
```

### 27. `Mixed content` בדפדפן
חלק מהנכסים נטענים ב-HTTP על דף HTTPS.
**פתרון**: ודא ש-`PUBLIC_URL=https://...` ב-`.env.production` ושכל ה-asset URLs יחסיים.

---

## 🐛 בעיות אפליקציה

### 28. דף לבן בדפדפן
**פתרון**:
1. בדוק את ה-Console (F12) בדפדפן
2. בדוק לוגים: `bash release-bundle/bin/catering-logs`
3. ודא שה-build הסתיים: `pnpm build`

### 29. `WebSocket connection failed`
Nginx לא מעביר WebSocket.
**פתרון**: ודא ב-`/etc/nginx/sites-available/catering`:
```nginx
proxy_http_version 1.1;
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";
```

### 30. אימייל לא נשלח
**פתרון**: בדוק `SMTP_*` ב-`.env`. למבחנים — Mailtrap או Mailpit.

### 31. עברית מוצגת כסימני שאלה
**פתרון**: ודא ש-DB collation הוא `UTF-8`:
```sql
SELECT datname, datcollate FROM pg_database;
```
אם לא — צור DB חדש עם `CREATE DATABASE catering WITH ENCODING 'UTF8' LC_COLLATE = 'he_IL.UTF-8'`.

### 32. PDF נוצר ללא עברית
**פתרון**: התקן פונט עברי בקונטיינר. אם אתה משתמש ב-Puppeteer:
```dockerfile
RUN apt-get update && apt-get install -y fonts-noto-cjk fonts-noto-hebrew
```

---

## 🆘 כשכלום לא עוזר

```bash
# אסוף לוגים מלאים
bash release-bundle/bin/catering-logs > debug.log 2>&1
docker ps -a >> debug.log
docker compose config >> debug.log
uname -a >> debug.log
node -v && pnpm -v && docker --version >> debug.log
```

שלח את `debug.log` ל-<support@syncup.co.il>.

</div>
