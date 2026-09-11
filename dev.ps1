Write-Host "=======================================" -ForegroundColor Cyan
Write-Host "   NEEI-Box - Servidor de Desenvolvimento" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host "A iniciar em http://localhost:3000 ..." -ForegroundColor Green
Set-Location "$PSScriptRoot\src"
npm run dev
