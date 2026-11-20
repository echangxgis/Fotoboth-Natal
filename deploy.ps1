param(
  [switch]$Preview
)

# =========================================================
#  Deploy Photobooth Natal ke Vercel
#  Pemakaian:
#    .\deploy.ps1            -> deploy produksi
#    .\deploy.ps1 -Preview   -> deploy preview (untuk tes)
# =========================================================

Set-Location $PSScriptRoot

if (-not (Get-Command npx -ErrorAction SilentlyContinue)) {
  Write-Host "Node.js / npm tidak ditemukan." -ForegroundColor Red
  Write-Host "Install dulu dari https://nodejs.org lalu jalankan lagi."
  exit 1
}

Write-Host ""
Write-Host "  Deploy Photobooth Natal" -ForegroundColor Yellow
Write-Host "  Folder: $PSScriptRoot"
Write-Host ""

if ($Preview) {
  npx vercel
} else {
  npx vercel --prod
}

if ($LASTEXITCODE -eq 0) {
  Write-Host ""
  Write-Host "  Selesai. Buka URL di atas di HP atau laptop." -ForegroundColor Green
  Write-Host "  Jangan lupa tes satu foto sebelum acara." -ForegroundColor Yellow
  Write-Host ""
} else {
  Write-Host ""
  Write-Host "  Deploy gagal. Baca pesan di atas." -ForegroundColor Red
  Write-Host ""
}
