param(
  [switch]$LastGood,
  [switch]$SafeMode
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$StatePath = Join-Path $Root "studio-state.json"
$LogDir = Join-Path $Root "Logs"
$HealthDir = Join-Path $Root "Health"
New-Item -ItemType Directory -Force -Path $LogDir, $HealthDir | Out-Null
$LogPath = Join-Path $LogDir ("bootstrap-" + (Get-Date -Format "yyyy-MM-dd") + ".log")

function Write-Log([string]$Message) {
  $line = "$(Get-Date -Format o)  $Message"
  Add-Content -LiteralPath $LogPath -Value $line
}

function Save-State($State) {
  $temp = "$StatePath.tmp"
  $State | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $temp -Encoding UTF8
  Move-Item -Force -LiteralPath $temp -Destination $StatePath
}

function Load-State {
  if (Test-Path -LiteralPath $StatePath) {
    try { return Get-Content -Raw -LiteralPath $StatePath | ConvertFrom-Json }
    catch { Write-Log "State file unreadable; recreating it." }
  }
  return [pscustomobject]@{
    current = "3.0.0"
    lastGood = "2.5.0"
    pending = $null
    failedVersions = @()
  }
}

function Find-Electron {
  $candidates = @(
    (Join-Path $Root "node_modules\.bin\electron.cmd"),
    (Join-Path (Split-Path -Parent $Root) "node_modules\.bin\electron.cmd")
  )
  foreach ($candidate in $candidates) {
    if (Test-Path -LiteralPath $candidate) { return $candidate }
  }
  $command = Get-Command electron.cmd -ErrorAction SilentlyContinue
  if ($command) { return $command.Source }
  $command = Get-Command electron -ErrorAction SilentlyContinue
  if ($command) { return $command.Source }
  return $null
}

function Start-StudioVersion([string]$Version, [bool]$HealthCheck) {
  $VersionDir = Join-Path $Root "Versions\$Version"
  if (!(Test-Path -LiteralPath (Join-Path $VersionDir "package.json"))) {
    Write-Log "Version $Version is missing."
    return $false
  }

  $Electron = Find-Electron
  if (!$Electron) {
    Add-Type -AssemblyName PresentationFramework
    [System.Windows.MessageBox]::Show(
      "Electron could not be found.`n`nKeep the existing node_modules folder beside this launcher, or run npm install once.",
      "FriendshipTree Studio",
      "OK",
      "Error"
    ) | Out-Null
    return $false
  }

  $ReadyFile = Join-Path $HealthDir ("ready-" + $Version + "-" + [guid]::NewGuid().ToString("N") + ".json")
  $env:FT_STUDIO_READY_FILE = $ReadyFile
  $env:FT_STUDIO_SAFE_MODE = $(if ($SafeMode) { "1" } else { "0" })

  Write-Log "Launching version $Version. Health check: $HealthCheck"
  $process = Start-Process -FilePath $Electron -ArgumentList @("`"$VersionDir`"") -WorkingDirectory $VersionDir -PassThru

  if (!$HealthCheck) { return $true }

  $deadline = (Get-Date).AddSeconds(25)
  while ((Get-Date) -lt $deadline) {
    Start-Sleep -Milliseconds 250
    if (Test-Path -LiteralPath $ReadyFile) {
      Write-Log "Version $Version reported ready."
      Remove-Item -Force -ErrorAction SilentlyContinue $ReadyFile
      return $true
    }
    if ($process.HasExited) {
      Write-Log "Version $Version exited before reporting ready. Exit code: $($process.ExitCode)"
      return $false
    }
  }

  Write-Log "Version $Version did not report ready within 25 seconds."
  try { Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue } catch {}
  return $false
}

$state = Load-State
if ($LastGood) {
  $chosen = [string]$state.lastGood
  if (Start-StudioVersion $chosen $false) { exit 0 }
  exit 1
}

$current = [string]$state.current
$lastGood = [string]$state.lastGood

if (Start-StudioVersion $current $true) {
  $state.lastGood = $current
  $state.pending = $null
  Save-State $state
  exit 0
}

Write-Log "Current version $current failed. Rolling back to $lastGood."
$failed = @($state.failedVersions)
if ($failed -notcontains $current) { $failed += $current }
$state.failedVersions = $failed
$state.current = $lastGood
$state.pending = $null
Save-State $state

Add-Type -AssemblyName PresentationFramework
[System.Windows.MessageBox]::Show(
  "Studio $current failed its startup check.`n`nThe previous working version $lastGood will open instead.",
  "FriendshipTree Studio restored",
  "OK",
  "Warning"
) | Out-Null

if (Start-StudioVersion $lastGood $false) { exit 0 }
exit 1
