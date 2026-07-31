param([string]$ProjectRoot = "C:\Users\Joe\FriendshipTree")
$ErrorActionPreference = "Stop"
$Here = Split-Path -Parent $MyInvocation.MyCommand.Path
$Brain = Join-Path $ProjectRoot ".studio\project-brain"
New-Item -ItemType Directory -Force -Path $Brain | Out-Null
& node (Join-Path $Here "project_brain_dependency_engine.js") --project-root $ProjectRoot --registry (Join-Path $Here "component-registry")
if ($LASTEXITCODE -ne 0) { throw "Dependency scan failed with exit code $LASTEXITCODE" }
Start-Process explorer.exe (Join-Path $Brain "exports")
