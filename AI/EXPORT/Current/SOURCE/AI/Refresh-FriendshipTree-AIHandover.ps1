param(
    [string]$ProjectRoot = "C:\Users\Joe\FriendshipTree"
)

$ErrorActionPreference = "Stop"

$AiRoot       = Join-Path $ProjectRoot "AI"
$LauncherRoot = Join-Path $ProjectRoot "FriendshipTreeLauncher"
$ExportRoot   = Join-Path $AiRoot "EXPORT"
$CurrentRoot  = Join-Path $ExportRoot "Current"
$SourceAiRoot = Join-Path $CurrentRoot "SOURCE\AI"
$ZipPath      = Join-Path $ExportRoot "FriendshipTree-AI-Workspace.zip"
$Timestamp    = Get-Date -Format "yyyyMMdd-HHmmss"
$BackupRoot   = Join-Path $ExportRoot "Backup-$Timestamp"

function Assert-Path {
    param([string]$Path, [string]$Description)
    if (-not (Test-Path -LiteralPath $Path)) {
        throw "$Description was not found: $Path"
    }
}

Assert-Path $AiRoot "AI root"
Assert-Path $LauncherRoot "Launcher root"
Assert-Path (Join-Path $AiRoot "PROJECT_CONSTITUTION.md") "Project constitution"

Write-Host ""
Write-Host "FriendshipTree AI handover refresh" -ForegroundColor Cyan
Write-Host "Project: $ProjectRoot"
Write-Host ""

# Preserve the existing export before replacing anything.
New-Item -ItemType Directory -Path $ExportRoot -Force | Out-Null
New-Item -ItemType Directory -Path $BackupRoot -Force | Out-Null

if (Test-Path -LiteralPath $CurrentRoot) {
    Copy-Item -LiteralPath $CurrentRoot -Destination (Join-Path $BackupRoot "Current") -Recurse -Force
}

if (Test-Path -LiteralPath $ZipPath) {
    Copy-Item -LiteralPath $ZipPath -Destination (Join-Path $BackupRoot "FriendshipTree-AI-Workspace.zip") -Force
}

Write-Host "1/5 Running the existing JavaScript workspace refresh..." -ForegroundColor Yellow
Push-Location $LauncherRoot
try {
    & node -e "const w=require('./ai/workspace'); const r=w.refresh(); console.log(JSON.stringify(r,null,2));"
    if ($LASTEXITCODE -ne 0) {
        throw "The existing workspace refresh returned exit code $LASTEXITCODE."
    }
}
finally {
    Pop-Location
}

Write-Host "2/5 Synchronising every top-level AI Markdown/JSON document..." -ForegroundColor Yellow
New-Item -ItemType Directory -Path $SourceAiRoot -Force | Out-Null

$AiDocuments = Get-ChildItem -LiteralPath $AiRoot -File |
    Where-Object { $_.Extension -in @(".md", ".json") } |
    Sort-Object Name

foreach ($Document in $AiDocuments) {
    Copy-Item -LiteralPath $Document.FullName -Destination (Join-Path $SourceAiRoot $Document.Name) -Force
}

$Required = @(
    "PROJECT_CONSTITUTION.md",
    "AI_SPECIFICATION.md",
    "MANIFEST.json",
    "ARCHITECTURE.md",
    "DEVELOPMENT_RULES.md",
    "CURRENT_STATE.md",
    "FILE_INDEX.json"
)

foreach ($Name in $Required) {
    Assert-Path (Join-Path $SourceAiRoot $Name) "Required exported AI document"
}

Write-Host "3/5 Generating a fresh 00-READ-FIRST.md..." -ForegroundColor Yellow

$PreferredOrder = @(
    "PROJECT_CONSTITUTION.md",
    "AI_SPECIFICATION.md",
    "MANIFEST.json",
    "ARCHITECTURE.md",
    "DEVELOPMENT_RULES.md",
    "CURRENT_STATE.md",
    "KNOWN_ISSUES.md",
    "NEXT_TASKS.md",
    "CHANGELOG.md",
    "FILE_INDEX.json",
    "VALIDATION_REPORT.md",
    "WORKSPACE_STATUS.json"
)

$ExportedNames = @(Get-ChildItem -LiteralPath $SourceAiRoot -File |
    Where-Object { $_.Extension -in @(".md", ".json") } |
    Select-Object -ExpandProperty Name)

$ReadingOrder = New-Object System.Collections.Generic.List[string]

foreach ($Name in $PreferredOrder) {
    if ($ExportedNames -contains $Name) {
        $ReadingOrder.Add($Name)
    }
}

foreach ($Name in ($ExportedNames | Sort-Object)) {
    if (-not $ReadingOrder.Contains($Name)) {
        $ReadingOrder.Add($Name)
    }
}

$Lines = New-Object System.Collections.Generic.List[string]
$Lines.Add("# FriendshipTree — Read First")
$Lines.Add("")
$Lines.Add("This export is a transport snapshot. Exact current source remains authoritative for implementation facts.")
$Lines.Add("")
$Lines.Add("Read in this order:")

$Index = 1
foreach ($Name in $ReadingOrder) {
    $Lines.Add("$Index. ``SOURCE/AI/$Name``")
    $Index++
}

$Lines.Add("$Index. The exact source files relevant to the requested task.")
$Lines.Add("")
$Lines.Add("Authority and safety rules:")
$Lines.Add("")
$Lines.Add("- Read ``PROJECT_CONSTITUTION.md`` before proposing architectural changes.")
$Lines.Add("- Do not infer current behaviour from historical handovers.")
$Lines.Add("- Report conflicts between source, constitution and summaries.")
$Lines.Add("- Preserve Forge candidate confirmation and rollback.")
$Lines.Add("- Label untested runtime behaviour as ``NOT VERIFIED``.")
$Lines.Add("")
$Lines.Add("Generated: $(Get-Date -Format 'dd/MM/yyyy, HH:mm:ss')")
$Lines.Add("AI documents included: $($ExportedNames.Count)")

$ReadFirstPath = Join-Path $CurrentRoot "00-READ-FIRST.md"
$Lines | Set-Content -LiteralPath $ReadFirstPath -Encoding UTF8

Write-Host "4/5 Rebuilding the ZIP from the refreshed Current export..." -ForegroundColor Yellow
if (Test-Path -LiteralPath $ZipPath) {
    Remove-Item -LiteralPath $ZipPath -Force
}

Compress-Archive -Path (Join-Path $CurrentRoot "*") -DestinationPath $ZipPath -CompressionLevel Optimal -Force

Write-Host "5/5 Verifying the finished handover..." -ForegroundColor Yellow
Assert-Path $ZipPath "Finished handover ZIP"

$CheckRoot = Join-Path $env:TEMP "FriendshipTree-AI-Handover-Check-$Timestamp"
Expand-Archive -LiteralPath $ZipPath -DestinationPath $CheckRoot -Force

$CheckConstitution = Join-Path $CheckRoot "SOURCE\AI\PROJECT_CONSTITUTION.md"
$CheckReadFirst    = Join-Path $CheckRoot "00-READ-FIRST.md"

Assert-Path $CheckConstitution "Constitution inside the finished ZIP"
Assert-Path $CheckReadFirst "Read-first file inside the finished ZIP"

$ReadFirstText = Get-Content -LiteralPath $CheckReadFirst -Raw
if ($ReadFirstText -notmatch "SOURCE/AI/PROJECT_CONSTITUTION\.md") {
    throw "The finished read-first file does not reference PROJECT_CONSTITUTION.md."
}

$ZipInfo = Get-Item -LiteralPath $ZipPath

Write-Host ""
Write-Host "SUCCESS" -ForegroundColor Green
Write-Host "Latest handover:"
Write-Host "  $ZipPath" -ForegroundColor Cyan
Write-Host "Size:"
Write-Host "  $([math]::Round($ZipInfo.Length / 1MB, 2)) MB"
Write-Host "Backup of the previous export:"
Write-Host "  $BackupRoot"
Write-Host "Verified:"
Write-Host "  - PROJECT_CONSTITUTION.md is inside the ZIP"
Write-Host "  - 00-READ-FIRST.md names it first"
Write-Host "  - all top-level AI Markdown/JSON documents were copied"
Write-Host ""
Write-Host "Upload this ZIP to the new ChatGPT project:"
Write-Host "  $ZipPath" -ForegroundColor Cyan
