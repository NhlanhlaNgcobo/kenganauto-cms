# KenganAuto × Acme Cars — presentation launcher (Windows PowerShell)
# Usage:  right-click → Run with PowerShell   (or)   powershell -ExecutionPolicy Bypass -File .\start-demo.ps1
# Optional: .\start-demo.ps1 -Reseed   → resets the demo dealership to a clean, repeatable dataset first

param([switch]$Reseed)

$root = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "Preparing database..." -ForegroundColor Yellow
Push-Location "$root\backend"
npx knex migrate:latest
if ($Reseed) { node scripts/seed_demo.js }
Pop-Location

Write-Host "Starting servers in separate windows..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList '-NoExit', '-Command', "Set-Location '$root\backend'; `$host.UI.RawUI.WindowTitle='KenganAuto API :3000'; node index.js"
Start-Process powershell -ArgumentList '-NoExit', '-Command', "Set-Location '$root\frontend'; `$host.UI.RawUI.WindowTitle='KenganAuto dashboard :5173'; npx vite --port 5173"
Start-Process powershell -ArgumentList '-NoExit', '-Command', "Set-Location '$root\dealer-site'; `$host.UI.RawUI.WindowTitle='Acme Cars website :5174'; if (-not (Test-Path node_modules)) { npm install }; npx vite --port 5174"

Start-Sleep -Seconds 6
Start-Process "http://localhost:5174/"
Start-Process "http://localhost:5173/login"

Write-Host ""
Write-Host "Acme Cars website : http://localhost:5174" -ForegroundColor Green
Write-Host "Dealer dashboard  : http://localhost:5173  (click 'Explore the demo', or admin@enterprise-demo.co.za / demo1234)" -ForegroundColor Green
