# Builds the AI Mockup Generator into a standalone Windows .exe.
#
# Prereqs (must exist on the build machine):
#   - Python 3.12 on PATH        (python --version)
#   - Node.js 18+ / npm          (node --version)
#
# Usage (from repo root):
#   powershell -ExecutionPolicy Bypass -File desktop\build.ps1
#
# Output: dist\AIMockupGenerator\AIMockupGenerator.exe

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root
Write-Host "==> Repo root: $root" -ForegroundColor Cyan

# --- 1. Python venv + deps -------------------------------------------------
if (-not (Test-Path ".venv")) {
    Write-Host "==> Creating Python venv" -ForegroundColor Cyan
    python -m venv .venv
}
$py = ".\.venv\Scripts\python.exe"
& $py -m pip install --upgrade pip
& $py -m pip install -r backend\requirements.txt
& $py -m pip install -r desktop\requirements-build.txt

# --- 2. Build the static Next.js UI ---------------------------------------
Write-Host "==> Building frontend (static export)" -ForegroundColor Cyan
Push-Location frontend
if (-not (Test-Path "node_modules")) { npm install }
$env:BUILD_STATIC = "1"
$env:NEXT_PUBLIC_API_URL = ""        # same-origin: UI served by the backend
npm run build
Pop-Location
if (-not (Test-Path "frontend\out\index.html")) {
    throw "frontend\out was not produced — check the Next.js build output."
}

# --- 3. Package with PyInstaller ------------------------------------------
Write-Host "==> Packaging with PyInstaller" -ForegroundColor Cyan
& $py -m PyInstaller desktop\app.spec --noconfirm --distpath dist --workpath build\pyi

$exe = "dist\AIMockupGenerator\AIMockupGenerator.exe"
if (Test-Path $exe) {
    Write-Host "==> Done: $exe" -ForegroundColor Green
    Write-Host "    Double-click it (or run from a terminal) to launch the app." -ForegroundColor Green
} else {
    throw "Build finished but $exe is missing."
}
