param(
  [Parameter(Mandatory = $true)]
  [string]$Url,

  [string]$Token = 'NTL-7f3a9c2e'
)

# =========================================================
#  Tes koneksi Photobooth -> Google Apps Script -> Drive
#  Contoh pemakaian:
#    .\tes-koneksi.ps1 -Url "https://script.google.com/macros/s/AKfy.../exec"
# =========================================================

$ErrorActionPreference = 'Stop'

$Url = $Url.Trim()

if ($Url -notmatch '/exec(\?|$)') {
  Write-Host ""
  Write-Host "URL harus berakhiran /exec" -ForegroundColor Red
  Write-Host "URL yang Anda masukkan: $Url"
  Write-Host "Kalau berakhiran /dev, ambil URL lain dari Deploy > Manage deployments."
  exit 1
}

Write-Host ""
Write-Host "  Tes Photobooth Natal" -ForegroundColor Yellow
Write-Host "  URL  : $Url"
Write-Host "  Token: $Token"
Write-Host ""

# ---------- 1. ping ----------
Write-Host "[1/2] Menghubungi server..." -NoNewline
try {
  $ping = Invoke-RestMethod -Uri "${Url}?ping=1" -Method Get -TimeoutSec 25
} catch {
  Write-Host " GAGAL" -ForegroundColor Red
  Write-Host ""
  Write-Host "  Alasan: $($_.Exception.Message)" -ForegroundColor Red
  Write-Host ""
  Write-Host "  Kemungkinan penyebab:"
  Write-Host "  - Deploy belum memakai akses 'Anyone'"
  Write-Host "  - URL salah atau sudah kedaluwarsa"
  Write-Host "  - Tidak ada koneksi internet"
  exit 1
}

if (-not $ping.ok) {
  Write-Host " GAGAL" -ForegroundColor Red
  Write-Host "  Server menjawab tapi tidak dikenali: $($ping | ConvertTo-Json -Compress)"
  exit 1
}

Write-Host " OK" -ForegroundColor Green
Write-Host "      Service : $($ping.service)"
Write-Host "      Folder  : $($ping.folderId)"

# ---------- 2. upload gambar uji ----------
Write-Host "[2/2] Mengirim gambar uji ke Drive..." -NoNewline

Add-Type -AssemblyName System.Drawing

$bmp = New-Object System.Drawing.Bitmap 600, 400
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.Clear([System.Drawing.Color]::FromArgb(70, 12, 20))
$font = New-Object System.Drawing.Font('Arial', 26, [System.Drawing.FontStyle]::Bold)
$brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(232, 194, 106))
$g.DrawString('TES PHOTOBOOTH', $font, $brush, 90, 150)
$g.DrawString((Get-Date -Format 'yyyy-MM-dd HH:mm'), (New-Object System.Drawing.Font('Arial', 16)), $brush, 170, 210)
$g.Dispose()

$ms = New-Object System.IO.MemoryStream
$bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Jpeg)
$bmp.Dispose()
$b64 = [Convert]::ToBase64String($ms.ToArray())
$ms.Dispose()

$body = @{
  token    = $Token
  code     = 'TES-001'
  filename = 'tes-koneksi.jpg'
  mimeType = 'image/jpeg'
  data     = $b64
} | ConvertTo-Json -Compress

try {
  $res = Invoke-RestMethod -Uri $Url -Method Post -ContentType 'text/plain;charset=utf-8' -Body $body -TimeoutSec 60
} catch {
  Write-Host " GAGAL" -ForegroundColor Red
  Write-Host ""
  Write-Host "  Alasan: $($_.Exception.Message)" -ForegroundColor Red
  exit 1
}

if (-not $res.ok) {
  Write-Host " GAGAL" -ForegroundColor Red
  Write-Host ""
  Write-Host "  Server menolak: $($res.error)" -ForegroundColor Red
  Write-Host ""
  if ($res.error -match 'Token') {
    Write-Host "  Periksa: nilai TOKEN di Code.gs harus sama dengan -Token di sini."
  }
  exit 1
}

Write-Host " OK" -ForegroundColor Green
Write-Host ""
Write-Host "  File tersimpan : $($res.name)"
Write-Host "  Link file      : $($res.url)"
Write-Host "  Link folder    : $($res.folderUrl)"
Write-Host ""
Write-Host "  Buka folder Drive dan pastikan 'tes-koneksi.jpg' muncul." -ForegroundColor Yellow
Write-Host ""
