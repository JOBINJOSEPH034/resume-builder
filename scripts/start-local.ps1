$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$runtimeDirectory = Join-Path $projectRoot '.runtime'
$pythonRuntime = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe'
$nodeRuntime = (Get-Command node -ErrorAction Stop).Source
if (-not (Test-Path -LiteralPath $pythonRuntime)) { throw 'Bundled Python is missing. See HOSTING.md for normal Python startup.' }
New-Item -ItemType Directory -Path $runtimeDirectory -Force | Out-Null

function Test-LocalPort([int]$port) {
    $connection = [System.Net.Sockets.TcpClient]::new()
    try {
        $attempt = $connection.ConnectAsync('127.0.0.1', $port)
        return ($attempt.Wait(700) -and $connection.Connected)
    } catch { return $false } finally { $connection.Dispose() }
}

if (-not (Test-LocalPort 8010)) {
    $backend = Start-Process -FilePath $pythonRuntime -ArgumentList @('-u', 'scripts/manage_local.py', 'runserver', '127.0.0.1:8010', '--noreload') -WorkingDirectory $projectRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $runtimeDirectory 'backend.log') -RedirectStandardError (Join-Path $runtimeDirectory 'backend-error.log') -PassThru
    Write-Output "Started Django (PID $($backend.Id))."
} else { Write-Output 'Port 8010 is already occupied; existing process retained.' }
if (-not (Test-LocalPort 5175)) {
    $frontend = Start-Process -FilePath $nodeRuntime -ArgumentList @('scripts/serve-build.mjs') -WorkingDirectory $projectRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $runtimeDirectory 'frontend.log') -RedirectStandardError (Join-Path $runtimeDirectory 'frontend-error.log') -PassThru
    Write-Output "Started frontend (PID $($frontend.Id))."
} else { Write-Output 'Port 5175 is already occupied; existing process retained.' }
Write-Output 'Application: http://127.0.0.1:5175/ | Admin: http://127.0.0.1:8010/admin/'
Write-Output 'Logs: .runtime/backend.log and .runtime/frontend.log. Verify these URLs before use.'
