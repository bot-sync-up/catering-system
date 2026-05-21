# =============================================================================
#  install-local.ps1 — Catering Management System (Windows)
#  שימוש:
#    iwr https://raw.githubusercontent.com/bot-sync-up/catering/main/install-local.ps1 -UseBasicParsing | iex
#  או:
#    powershell -ExecutionPolicy Bypass -File install-local.ps1
# =============================================================================

#Requires -Version 5.1
[CmdletBinding()]
param(
    [string]$RepoUrl   = 'https://github.com/bot-sync-up/catering.git',
    [string]$Branch    = 'main',
    [string]$TargetDir = (Join-Path $HOME 'catering')
)

$ErrorActionPreference = 'Stop'

# ---------- צבעים + עברית ----------
function Write-OK   ($msg) { Write-Host "🟢 $msg" -ForegroundColor Green }
function Write-Fail ($msg) { Write-Host "🔴 $msg" -ForegroundColor Red }
function Write-Warn2($msg) { Write-Host "🟡 $msg" -ForegroundColor Yellow }
function Write-Info ($msg) { Write-Host "ℹ️  $msg" -ForegroundColor Cyan }
function Write-Step ($msg) { Write-Host ""; Write-Host "⭐ $msg" -ForegroundColor Magenta -BackgroundColor Black }

function Test-Cmd($name) {
    $null = Get-Command $name -ErrorAction SilentlyContinue
    return $?
}

# ---------- פתיחה ----------
Clear-Host
Write-Host "╔══════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   מערכת ניהול קייטרינג — התקנה מקומית (Windows / YOLO)          ║" -ForegroundColor Cyan
Write-Host "║   Catering Management System — Local Install                     ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# ---------- 1. Pre-flight ----------
Write-Step "שלב 1/9: בדיקת דרישות מקדימות"

$missing = $false

# Hyper-V / WSL2
try {
    $wsl = wsl --status 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-OK "WSL זמין"
    } else {
        Write-Warn2 "WSL לא זמין — Docker Desktop ידרוש Hyper-V או WSL2"
    }
} catch {
    Write-Warn2 "לא ניתן לבדוק WSL"
}

# Docker
if (Test-Cmd docker) {
    Write-OK "Docker: $(docker --version)"
    try {
        $null = docker info 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Fail "Docker Desktop לא רץ. הפעל אותו ונסה שוב."
            $missing = $true
        }
    } catch {
        Write-Fail "Docker לא רץ"
        $missing = $true
    }
} else {
    Write-Fail "חסר: Docker Desktop — הורד מ-https://docker.com/products/docker-desktop"
    $missing = $true
}

# docker compose v2
$dcv2 = docker compose version 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-OK "docker compose v2 נמצא"
} else {
    Write-Warn2 "docker compose v2 חסר"
}

# Git
if (Test-Cmd git) {
    Write-OK "git: $(git --version)"
} else {
    Write-Fail "חסר: git — הורד מ-https://git-scm.com"
    $missing = $true
}

# Node
if (Test-Cmd node) {
    $nodeVer = (node -v).TrimStart('v')
    $major = [int]($nodeVer.Split('.')[0])
    if ($major -lt 22) {
        Write-Warn2 "Node $nodeVer מותקן, מומלץ 22+"
    } else {
        Write-OK "Node: v$nodeVer"
    }
} else {
    Write-Fail "חסר: Node 22+ — הורד מ-https://nodejs.org"
    $missing = $true
}

# pnpm
if (-not (Test-Cmd pnpm)) {
    Write-Warn2 "pnpm חסר — מנסה corepack"
    if (Test-Cmd corepack) {
        corepack enable
        corepack prepare pnpm@9 --activate
        Write-OK "pnpm הותקן"
    } else {
        Write-Fail "התקן ידנית: npm install -g pnpm"
        $missing = $true
    }
} else {
    Write-OK "pnpm: $(pnpm -v)"
}

# RAM
$ram = [math]::Round((Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory / 1GB, 1)
if ($ram -lt 4) {
    Write-Warn2 "זוהה רק ${ram}GB RAM — מומלץ 8GB"
} else {
    Write-OK "RAM: ${ram}GB"
}

# Disk
$drive = (Get-Item $HOME).PSDrive
$freeGB = [math]::Round($drive.Free / 1GB, 1)
if ($freeGB -lt 10) {
    Write-Warn2 "פחות מ-10GB פנויים בכונן $($drive.Name): ($freeGB GB)"
} else {
    Write-OK "מקום פנוי: ${freeGB}GB"
}

if ($missing) {
    Write-Fail "תקן את הדרישות המקדימות ונסה שוב."
    exit 1
}

# ---------- 2. Clone ----------
Write-Step "שלב 2/9: שיבוט הריפו"
if (Test-Path (Join-Path $TargetDir '.git')) {
    Write-Warn2 "תיקיה קיימת — מבצע git pull"
    git -C $TargetDir fetch --all --prune
    git -C $TargetDir checkout $Branch
    git -C $TargetDir pull --ff-only
} else {
    Write-Info "משבט $RepoUrl → $TargetDir"
    git clone --branch $Branch --depth 1 $RepoUrl $TargetDir
}
Write-OK "ריפו מוכן ב-$TargetDir"

Set-Location $TargetDir

# ---------- 3. Bootstrap ----------
Write-Step "שלב 3/9: bootstrap/fix-all.sh"
$bootstrap = Join-Path $TargetDir 'bootstrap\fix-all.sh'
if (Test-Path $bootstrap) {
    bash $bootstrap
    Write-OK "bootstrap הסתיים"
} else {
    Write-Warn2 "bootstrap/fix-all.sh לא נמצא — מדלג"
}

# ---------- 4. Patches ----------
Write-Step "שלב 4/9: החלת patches"
$patches = Join-Path $TargetDir 'patches-apply\scripts\apply-all-patches.sh'
if (Test-Path $patches) {
    bash $patches
    Write-OK "patches הוחלו"
} else {
    Write-Warn2 "אין patches — מדלג"
}

# ---------- 5. .env ----------
Write-Step "שלב 5/9: יצירת .env"
if (-not (Test-Path .env)) {
    if (Test-Path .env.dev.example) {
        Copy-Item .env.dev.example .env
        Write-OK ".env נוצר מ-.env.dev.example"
    } elseif (Test-Path .env.example) {
        Copy-Item .env.example .env
        Write-OK ".env נוצר מ-.env.example"
    } else {
        Write-Warn2 "לא נמצא קובץ דוגמה"
    }
} else {
    Write-Info ".env כבר קיים"
}

# ---------- 6. Docker ----------
Write-Step "שלב 6/9: Docker services"
$composeFile = $null
foreach ($f in @('docker-compose.dev.yml', 'docker-compose.yml', 'compose.yml', 'compose.yaml')) {
    if (Test-Path $f) { $composeFile = $f; break }
}
if ($composeFile) {
    Write-Info "משתמש ב-$composeFile"
    docker compose -f $composeFile up -d
    Write-OK "containers רצים"
    Start-Sleep -Seconds 10
} else {
    Write-Warn2 "אין docker-compose — מדלג"
}

# ---------- 7. install + migrate + seed ----------
Write-Step "שלב 7/9: pnpm install + migrate + seed"
try { pnpm install --frozen-lockfile } catch { pnpm install }
Write-OK "תלויות הותקנו"

try { pnpm db:migrate } catch { Write-Warn2 "db:migrate נכשל / לא קיים" }
try { pnpm db:seed }    catch { Write-Warn2 "db:seed נכשל / לא קיים" }

# ---------- 8. dev server ----------
Write-Step "שלב 8/9: dev server"
$logsDir = Join-Path $TargetDir '.yolo-logs'
New-Item -ItemType Directory -Force -Path $logsDir | Out-Null
$devLog = Join-Path $logsDir 'dev.log'
$devProc = Start-Process -FilePath 'pnpm' -ArgumentList 'dev' `
    -RedirectStandardOutput $devLog `
    -RedirectStandardError (Join-Path $logsDir 'dev.err.log') `
    -PassThru -WindowStyle Hidden
$devProc.Id | Out-File -FilePath (Join-Path $logsDir 'dev.pid') -Encoding ascii
Write-OK "dev server רץ ב-PID $($devProc.Id)"

# ---------- 9. Browser ----------
Write-Step "שלב 9/9: פתיחת הדפדפן"
$url = 'http://localhost:3000'
Start-Sleep -Seconds 3
Start-Process $url
Write-OK "הדפדפן נפתח: $url"

# ---------- סיכום ----------
Write-Host ""
Write-Host "══════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "  ✅ ההתקנה הסתיימה בהצלחה!" -ForegroundColor Green
Write-Host "══════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Write-Host "  🌐 כתובת:          $url"
Write-Host "  👤 משתמש דמו:      admin@demo.local"
Write-Host "  🔑 סיסמה:          admin1234"
Write-Host ""
Write-Host "  📁 פרויקט:         $TargetDir"
Write-Host "  📋 לוג:            $devLog"
Write-Host ""
