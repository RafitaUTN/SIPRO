$ErrorActionPreference = 'Continue'
$projectRoot = Split-Path -Parent $PSScriptRoot
$auditEnvPath = Join-Path $projectRoot '.env.audit'

if (-not (Test-Path -LiteralPath $auditEnvPath)) {
  throw 'Falta .env.audit. Copie .env.audit.example y use solo credenciales locales.'
}

Get-Content -LiteralPath $auditEnvPath | ForEach-Object {
  if ($_ -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$') {
    [Environment]::SetEnvironmentVariable($matches[1], $matches[2], 'Process')
  }
}

if ($env:SUPABASE_URL -notmatch '^http://(127\.0\.0\.1|localhost)(:\d+)?/?$') {
  throw 'start:audit se niega a usar una URL que no sea local.'
}

Set-Location -LiteralPath $projectRoot
# La service_role local solo se usa para aprovisionar usuarios Auth ficticios.
$localStatus = (& npx supabase status -o env) 2>$null
$serviceLine = $localStatus | Where-Object { $_ -match '^SERVICE_ROLE_KEY=' }
if ($serviceLine) {
  $env:SUPABASE_SERVICE_ROLE_KEY = ($serviceLine -replace '^SERVICE_ROLE_KEY=', '').Trim().Trim('"')
}
$localUsers = @(
  @{ nombre='Administración Local'; email='admin.local@example.invalid'; password='AuditOnly-Admin-123!'; rol='admin' },
  @{ nombre='Encargado Local'; email='encargado.local@example.invalid'; password='AuditOnly-Manager-123!'; rol='encargado' },
  @{ nombre='Inventario Local'; email='inventario.local@example.invalid'; password='AuditOnly-Stock-123!'; rol='inventario' },
  @{ nombre='Consulta Local'; email='consulta.local@example.invalid'; password='AuditOnly-Read-123!'; rol='consulta' }
)
$env:SIPRO_USERS_JSON = $localUsers | ConvertTo-Json -Compress
node scripts/provision-sipro-users.js
Remove-Item Env:SUPABASE_SERVICE_ROLE_KEY -ErrorAction SilentlyContinue
Remove-Item Env:SIPRO_USERS_JSON -ErrorAction SilentlyContinue
npx electron-forge start
