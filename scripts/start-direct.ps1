$ErrorActionPreference = 'Continue'
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectRoot
$status = (& npx supabase status -o env) 2>$null
$apiLine = $status | Where-Object { $_ -match '^API_URL=' }
if (-not $apiLine) { throw 'Supabase local no esta disponible.' }
$env:SUPABASE_URL = ($apiLine -replace '^API_URL=', '').Trim().Trim('"')
$anonLine = $status | Where-Object { $_ -match '^ANON_KEY=' }
if (-not $anonLine) { throw 'No se encontró la anon key local.' }
$env:SUPABASE_ANON_KEY = ($anonLine -replace '^ANON_KEY=', '').Trim().Trim('"')
& npx electron SRC/index.js
