# Limpia node_modules y reinstala dependencias del frontend
# Ejecutar en PowerShell desde la carpeta frontend: .\reinstall.ps1

Write-Host "Eliminando node_modules..." -ForegroundColor Yellow
if (Test-Path node_modules) {
    Remove-Item -Recurse -Force node_modules
    Write-Host "  Listo." -ForegroundColor Green
} else {
    Write-Host "  No existia, se omite." -ForegroundColor Gray
}

Write-Host "Instalando dependencias (npm install)..." -ForegroundColor Yellow
npm install

Write-Host "Listo. Ejecuta: npm start" -ForegroundColor Green
