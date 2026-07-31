[CmdletBinding()]
param(
    [string]$ProjectRoot = 'C:\Users\Joe\FriendshipTree'
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path -LiteralPath $ProjectRoot -PathType Container)) {
    throw "Project root not found: $ProjectRoot"
}

$git = Get-Command git -ErrorAction SilentlyContinue
if (-not $git) {
    throw 'Git is not available in this PowerShell session.'
}

$gitRoot = (& git -C $ProjectRoot rev-parse --show-toplevel 2>$null).Trim()
if (-not $gitRoot) {
    throw "No Git repository found at: $ProjectRoot"
}

$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$reportDir = Join-Path $ProjectRoot '.cleanup-audit'
New-Item -ItemType Directory -Force -Path $reportDir | Out-Null
$reportPath = Join-Path $reportDir "repository-audit-$timestamp.md"

$status = @(& git -C $ProjectRoot status --short)
$tracked = @(& git -C $ProjectRoot ls-files)
$ignored = @(& git -C $ProjectRoot status --ignored --short)
$branch = (& git -C $ProjectRoot branch --show-current).Trim()
$head = (& git -C $ProjectRoot log -1 --pretty=format:'%h %s').Trim()
$remote = (& git -C $ProjectRoot remote get-url origin 2>$null).Trim()

$topFolders = Get-ChildItem -LiteralPath $ProjectRoot -Directory -Force |
    Sort-Object Name |
    ForEach-Object {
        $relative = $_.Name + '/'
        $trackedCount = @($tracked | Where-Object { $_ -like "$($_.Name)/*" }).Count
        $statusCount = @($status | Where-Object { $_ -match [regex]::Escape($_.Name + '/') }).Count
        [pscustomobject]@{
            Name = $_.Name
            TrackedFiles = $trackedCount
            WorkingChanges = $statusCount
        }
    }

$knownClassification = @{
    '.github'='Track: repository automation'
    'src'='Track: app source'
    'public'='Track: app public source'
    'android'='Track: native Android source; ignore generated output'
    'FriendshipTreeStudio'='Track: canonical Studio source'
    'FriendshipTreeLauncher'='Track: canonical Launcher source'
    'Scripts'='Track after review: developer scripts'
    'Tools'='Track after review: developer tools'
    'Tests'='Track after review: test definitions'
    'AI'='Track selected canonical knowledge; ignore exports'
    'Assets'='Track selected original assets'
    'Docs'='Track current documentation'
    'Documentation'='Review/merge with Docs'
    '_V3_Documentation'='Review for unique historical material'
    'StudioSystem'='Mixed: track bootstrap/source only; ignore Versions/Updates/state'
    'Archive'='Ignore: historical archive'
    'Generated Builds'='Ignore: generated output'
    'Packages'='Ignore: generated packages'
    'downloads'='Ignore: temporary downloads'
    '.studio'='Ignore: generated Studio state/indexes'
    '.friendshiptree'='Ignore: local runtime state'
    '.cleanup-audit'='Ignore: generated audit reports'
    '.migration-v3'='Ignore: migration state'
    '.friendshiptree-patches'='Ignore: temporary patches'
}

$lines = New-Object System.Collections.Generic.List[string]
$lines.Add('# FriendshipTree Live Repository Audit')
$lines.Add('')
$lines.Add("Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss zzz')")
$lines.Add('')
$lines.Add('## Repository')
$lines.Add('')
$lines.Add("- Root: `$gitRoot`")
$lines.Add("- Remote: `$remote`")
$lines.Add("- Branch: `$branch`")
$lines.Add("- HEAD: `$head`")
$lines.Add("- Tracked files: $($tracked.Count)")
$lines.Add("- Working-tree entries: $($status.Count)")
$lines.Add('')
$lines.Add('## Top-level folders')
$lines.Add('')
$lines.Add('| Folder | Tracked files | Working entries | Classification |')
$lines.Add('|---|---:|---:|---|')
foreach ($folder in $topFolders) {
    $classification = $knownClassification[$folder.Name]
    if (-not $classification) { $classification = 'Unclassified: manual review required' }
    $lines.Add("| `$($folder.Name)/` | $($folder.TrackedFiles) | $($folder.WorkingChanges) | $classification |")
}
$lines.Add('')
$lines.Add('## Current Git status')
$lines.Add('')
$lines.Add('```text')
if ($status.Count -eq 0) { $lines.Add('(clean)') } else { foreach ($entry in $status) { $lines.Add($entry) } }
$lines.Add('```')
$lines.Add('')
$lines.Add('## Safety notes')
$lines.Add('')
$lines.Add('- This script does not add, remove, restore, commit, pull or push anything.')
$lines.Add('- Review mixed folders before staging them.')
$lines.Add('- Do not use `git add .` at the project root.')

[System.IO.File]::WriteAllLines($reportPath, $lines, [System.Text.UTF8Encoding]::new($false))
Write-Host "Repository audit written to:" -ForegroundColor Green
Write-Host $reportPath
Start-Process notepad.exe -ArgumentList $reportPath
