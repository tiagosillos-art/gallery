$artesDir = Join-Path $PSScriptRoot '..\artes'
$artesDir = (Resolve-Path $artesDir).Path
$indexFile = Join-Path $artesDir 'index.json'

$files = Get-ChildItem -Path $artesDir -Filter *.jpg | Sort-Object Name | ForEach-Object { $_.Name }
$files | ConvertTo-Json | Set-Content -Path $indexFile -Encoding UTF8
Write-Host "index.json gerado com $($files.Count) arquivo(s)."
