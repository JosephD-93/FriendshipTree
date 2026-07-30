param(
    [ValidateSet("Initialize","Refresh","Validate","RequestedFile","Open","CopyInstructions")]
    [string]$Mode = "Initialize"
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.IO.Compression.FileSystem

$ProjectRoot = "C:\Users\Joe\FriendshipTree"
$AIRoot = Join-Path $ProjectRoot "AI"
$ExportRoot = Join-Path $AIRoot "EXPORT"
$CurrentExport = Join-Path $ExportRoot "Current"
$SourceExport = Join-Path $CurrentExport "SOURCE"
$RequestedRoot = Join-Path $ExportRoot "Requested-Files"
$ZipPath = Join-Path $ExportRoot "FriendshipTree-AI-Workspace.zip"

$ManifestPath = Join-Path $AIRoot "MANIFEST.json"
$ArchitecturePath = Join-Path $AIRoot "ARCHITECTURE.md"
$RulesPath = Join-Path $AIRoot "DEVELOPMENT_RULES.md"
$SpecPath = Join-Path $AIRoot "AI_SPECIFICATION.md"
$StatePath = Join-Path $AIRoot "CURRENT_STATE.md"
$IssuesPath = Join-Path $AIRoot "KNOWN_ISSUES.md"
$TasksPath = Join-Path $AIRoot "NEXT_TASKS.md"
$ChangePath = Join-Path $AIRoot "CHANGELOG.md"
$IndexPath = Join-Path $AIRoot "FILE_INDEX.json"
$StatusPath = Join-Path $AIRoot "WORKSPACE_STATUS.json"
$ValidationPath = Join-Path $AIRoot "VALIDATION_REPORT.md"

$ExcludedDirectoryNames = @(
    "node_modules",".git",".gradle","dist","build","coverage",
    ".idea",".vscode","Archive","Backups","Quarantine","Staging",
    "EXPORT"
)
$ExcludedExtensions = @(
    ".apk",".aab",".keystore",".jks",".class",".dex",".so",".dll",
    ".exe",".msi",".zip",".ftupdate",".7z",".rar",".tmp"
)
$IncludedExtensions = @(
    ".js",".jsx",".ts",".tsx",".json",".md",".txt",".css",".html",
    ".ps1",".cmd",".bat",".xml",".gradle",".properties",".yml",".yaml",
    ".toml",".env",".gitignore",".npmrc",".svg"
)
$AlwaysIncludeNames = @(
    "package.json","package-lock.json","vite.config.js","vite.config.ts",
    "capacitor.config.json","capacitor.config.js","capacitor.config.ts",
    "tailwind.config.js","postcss.config.js","AndroidManifest.xml",
    "settings.gradle","build.gradle","gradle.properties"
)

$ProjectInstructions = @'
You are the technical partner for the FriendshipTree software project.

READING ORDER
1. Read AI/AI_SPECIFICATION.md.
2. Read AI/MANIFEST.json.
3. Read AI/ARCHITECTURE.md and AI/DEVELOPMENT_RULES.md.
4. Read AI/CURRENT_STATE.md, AI/KNOWN_ISSUES.md and AI/NEXT_TASKS.md.
5. Use AI/FILE_INDEX.json to locate files.
6. Inspect the exact relevant file in SOURCE before editing.

SOURCE-OF-TRUTH RULES
- Exact current source files override summaries.
- Canonical AI documents override old chat summaries.
- Never ask the user for information already present in the AI workspace.
- Never invent a path, package format, IPC contract, launcher, updater, recovery system, build command or architecture when the project defines one.
- When information conflicts, flag the conflict and prefer the newest exact source plus the canonical AI specification.

SYSTEM BOUNDARIES
- FriendshipTree app: React/Vite application packaged for Android with Capacitor.
- FriendshipTree Studio: developer-facing desktop environment.
- Electron Launcher: user-facing dashboard and taskbar entry.
- Forge PowerShell: canonical Studio update, validation, candidate confirmation and rollback engine.
- Do not create competing launchers, updaters, Core applications or parallel Studio projects without explicit approval.

UPDATE AND DATA SAFETY
- Studio updates use the actual Forge .ftupdate contract.
- A valid package contains manifest.json and payload/ at archive root, requiredFiles and SHA-256 checksums.
- Inspect the live Forge source before creating an update.
- Install new Studio versions beside the confirmed version and preserve rollback.
- Back up canonical files before replacement.
- Preserve user data and existing persistence systems.

WINDOWS AND POWERSHELL
- Give complete copy-pasteable PowerShell commands.
- Quote Windows paths correctly.
- State the exact working directory before npm, Vite, Capacitor or Gradle commands.
- Do not embed Markdown or large raw PowerShell payloads inside CMD parsing.
- Do not run npm commands from C:\Users\Joe unless package.json is there.

EDITING WORKFLOW
1. Identify the exact current file and canonical path.
2. Inspect it before editing.
3. Modify incrementally and reversibly.
4. State every file changed and its destination.
5. Update canonical AI documentation after architectural or workflow changes.
6. If a required file is missing, request its exact canonical path from FILE_INDEX.json. The user can use Launcher > Export requested file.
7. Distinguish confirmed facts, implementation status and assumptions.
'@

function Write-Utf8 {
    param([string]$Path,[string]$Text)
    $parent = Split-Path -Parent $Path
    if ($parent) { New-Item -ItemType Directory -Force -Path $parent | Out-Null }
    [IO.File]::WriteAllText($Path,$Text,(New-Object Text.UTF8Encoding($false)))
}

function Ensure-CanonicalDocuments {
    New-Item -ItemType Directory -Force -Path $AIRoot,$ExportRoot,$RequestedRoot | Out-Null

    if (!(Test-Path -LiteralPath $SpecPath)) {
        Write-Utf8 $SpecPath @'
# FriendshipTree AI Specification v1

This folder is the permanent canonical knowledge system for AI-assisted FriendshipTree development.

## Authority order

1. Exact current source files.
2. `AI_SPECIFICATION.md`
3. `MANIFEST.json`
4. `ARCHITECTURE.md`
5. `DEVELOPMENT_RULES.md`
6. `CURRENT_STATE.md`, `KNOWN_ISSUES.md`, `NEXT_TASKS.md`
7. Historical handovers and chat summaries.

## Permanent AI subsystem

Canonical files live in:

`C:\Users\Joe\FriendshipTree\AI`

Exports live in:

`C:\Users\Joe\FriendshipTree\AI\EXPORT`

The canonical AI files remain in the project. Export packages are disposable snapshots generated from them and current source.

## Required maintenance

Whenever a change affects architecture, package formats, file locations, build commands, persistence, update safety or system responsibilities:

1. update the relevant canonical AI document;
2. add a dated entry to `CHANGELOG.md`;
3. refresh and validate the AI workspace;
4. replace stale files in the ChatGPT Project.

## Missing-file workflow

A ChatGPT Project cannot directly read the local Windows filesystem. It must request the exact canonical path. The Launcher action **Export requested file** creates an upload copy and receipt without altering the source.
'@
    }

    if (!(Test-Path -LiteralPath $ArchitecturePath)) {
        Write-Utf8 $ArchitecturePath @'
# FriendshipTree Architecture

## FriendshipTree app
React/Vite application packaged for Android using Capacitor.

## FriendshipTree Studio
Developer-facing desktop environment. Installed Studio versions live under `StudioSystem\Versions`.

## Electron Launcher
Polished user-facing dashboard and taskbar entry.

## Forge
Canonical Studio package validation, staging, candidate confirmation and rollback engine:

`StudioSystem\Bootstrap\FriendshipTree-Forge.ps1`

## Update flow

Approved `.ftupdate`
→ `StudioSystem\Updates\Inbox`
→ Forge validates `manifest.json`, `payload/`, required files and SHA-256 checksums
→ installs beside the confirmed Studio version
→ confirms or rolls back candidate

## Boundaries

- Launcher may invoke Forge but must not replace Forge's safety contract.
- No competing launcher, updater, Core application or duplicate Studio.
- User data must not be stored only inside disposable application-version folders.
'@
    }

    if (!(Test-Path -LiteralPath $RulesPath)) {
        Write-Utf8 $RulesPath $ProjectInstructions
    }
    if (!(Test-Path -LiteralPath $IssuesPath)) {
        Write-Utf8 $IssuesPath "# Known Issues`r`n`r`nRecord only confirmed current issues, evidence and status."
    }
    if (!(Test-Path -LiteralPath $TasksPath)) {
        Write-Utf8 $TasksPath "# Next Tasks`r`n`r`nRecord agreed next tasks. Keep speculative ideas separate."
    }
    if (!(Test-Path -LiteralPath $ChangePath)) {
        Write-Utf8 $ChangePath "# AI Subsystem Changelog`r`n`r`n## $(Get-Date -Format 'yyyy-MM-dd')`r`n- Created the permanent FriendshipTree AI subsystem."
    }
}

function Test-IsExcludedPath {
    param([string]$Path)
    $relative = $Path.Substring($ProjectRoot.Length).TrimStart("\")
    foreach ($part in ($relative -split "\\")) {
        if ($ExcludedDirectoryNames -contains $part) { return $true }
    }
    return $false
}

function Test-ShouldIncludeFile {
    param([System.IO.FileInfo]$File)
    if (Test-IsExcludedPath $File.FullName) { return $false }
    if ($ExcludedExtensions -contains $File.Extension.ToLowerInvariant()) { return $false }
    if ($AlwaysIncludeNames -contains $File.Name) { return $true }
    if ($IncludedExtensions -contains $File.Extension.ToLowerInvariant()) { return $true }
    if ($File.Name -in @(".gitignore",".aiignore")) { return $true }
    return $false
}

function Get-Role {
    param([string]$RelativePath)
    switch -Regex ($RelativePath.Replace("/","\")) {
        '^AI\\' { return "Canonical AI project knowledge and workflow" }
        '^StudioSystem\\Bootstrap\\FriendshipTree-Forge\.ps1$' { return "Canonical Forge update and recovery engine" }
        '^FriendshipTreeLauncher\\main\.js$' { return "Electron Launcher main process and IPC" }
        '^FriendshipTreeLauncher\\preload\.js$' { return "Electron Launcher secure renderer bridge" }
        '^FriendshipTreeLauncher\\renderer\.js$' { return "Electron Launcher interface logic" }
        '^FriendshipTreeLauncher\\index\.html$' { return "Electron Launcher interface structure" }
        '^FriendshipTreeLauncher\\styles\.css$' { return "Electron Launcher interface styling" }
        '^src\\' { return "FriendshipTree React application source" }
        '^android\\' { return "Capacitor Android source or configuration" }
        '^FriendshipTreeStudio\\' { return "FriendshipTree Studio source" }
        '^Documentation\\|^Docs\\' { return "Project documentation" }
        '^package\.json$' { return "Root dependencies and scripts" }
        default { return "Project source or configuration" }
    }
}

function Build-FileIndex {
    $records = New-Object System.Collections.Generic.List[object]
    Get-ChildItem -LiteralPath $ProjectRoot -File -Recurse -Force -ErrorAction SilentlyContinue |
        Where-Object { Test-ShouldIncludeFile $_ } |
        Sort-Object FullName |
        ForEach-Object {
            $relative = $_.FullName.Substring($ProjectRoot.Length).TrimStart("\")
            $records.Add([pscustomobject]@{
                path = $relative
                canonicalPath = $_.FullName
                role = Get-Role $relative
                includedInExport = $true
                sizeBytes = $_.Length
                modifiedUtc = $_.LastWriteTimeUtc.ToString("o")
                sha256 = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
            })
        }
    return @($records)
}

function Update-CanonicalState {
    $records = @(Build-FileIndex)
    $manifest = [ordered]@{
        format = "friendshiptree-ai-system-v1"
        generatedUtc = [DateTime]::UtcNow.ToString("o")
        projectName = "FriendshipTree"
        canonicalRoot = $ProjectRoot
        aiRoot = $AIRoot
        canonicalDocuments = @(
            "AI\AI_SPECIFICATION.md",
            "AI\MANIFEST.json",
            "AI\ARCHITECTURE.md",
            "AI\DEVELOPMENT_RULES.md",
            "AI\CURRENT_STATE.md",
            "AI\KNOWN_ISSUES.md",
            "AI\NEXT_TASKS.md",
            "AI\CHANGELOG.md",
            "AI\FILE_INDEX.json"
        )
        systems = [ordered]@{
            app = [ordered]@{path=$ProjectRoot;role="React/Vite application packaged with Capacitor Android"}
            studio = [ordered]@{path=(Join-Path $ProjectRoot "FriendshipTreeStudio");versions=(Join-Path $ProjectRoot "StudioSystem\Versions")}
            launcher = [ordered]@{path=(Join-Path $ProjectRoot "FriendshipTreeLauncher");role="User-facing Electron dashboard"}
            forge = [ordered]@{path=(Join-Path $ProjectRoot "StudioSystem\Bootstrap\FriendshipTree-Forge.ps1");role="Canonical update and recovery engine"}
        }
        export = [ordered]@{
            currentFolder = $CurrentExport
            zip = $ZipPath
            requestedFiles = $RequestedRoot
        }
        indexedFileCount = $records.Count
    }

    $index = [ordered]@{
        format = "friendshiptree-file-index-v1"
        generatedUtc = [DateTime]::UtcNow.ToString("o")
        canonicalRoot = $ProjectRoot
        missingFileInstruction = "Request the exact canonicalPath, then use Launcher > Export requested file."
        files = $records
    }

    $state = @"
# Current State

Generated from the live project: $([DateTime]::Now.ToString("yyyy-MM-dd HH:mm:ss K"))

- Canonical root: `$ProjectRoot`
- Canonical AI folder: `$AIRoot`
- Indexed editable/configuration/documentation files: $($records.Count)
- Current export folder: `$CurrentExport`
- Current transport ZIP: `$ZipPath`

This file is generated. Confirm behavioural status against exact source and test results.
"@

    Write-Utf8 $StatePath $state
    Write-Utf8 $ManifestPath ($manifest | ConvertTo-Json -Depth 10)
    Write-Utf8 $IndexPath ($index | ConvertTo-Json -Depth 10)
    return $records
}

function Validate-Workspace {
    Ensure-CanonicalDocuments
    $required = @($SpecPath,$ManifestPath,$ArchitecturePath,$RulesPath,$StatePath,$IssuesPath,$TasksPath,$ChangePath,$IndexPath)
    $results = New-Object System.Collections.Generic.List[object]
    foreach ($file in $required) {
        $exists = Test-Path -LiteralPath $file
        $results.Add([pscustomobject]@{
            check = "Required canonical file"
            target = $file
            passed = $exists
            detail = $(if ($exists) {"Present"} else {"Missing"})
        })
    }

    $forge = Join-Path $ProjectRoot "StudioSystem\Bootstrap\FriendshipTree-Forge.ps1"
    $launcher = Join-Path $ProjectRoot "FriendshipTreeLauncher\main.js"
    foreach ($pair in @(
        @("Canonical Forge source",$forge),
        @("Electron Launcher main process",$launcher)
    )) {
        $exists = Test-Path -LiteralPath $pair[1]
        $results.Add([pscustomobject]@{check=$pair[0];target=$pair[1];passed=$exists;detail=$(if($exists){"Present"}else{"Missing"})})
    }

    $failed = @($results | Where-Object { !$_.passed })
    $status = [ordered]@{
        validatedUtc = [DateTime]::UtcNow.ToString("o")
        healthy = ($failed.Count -eq 0)
        passed = @($results | Where-Object {$_.passed}).Count
        failed = $failed.Count
        results = $results
    }
    Write-Utf8 $StatusPath ($status | ConvertTo-Json -Depth 8)

    $reportLines = @(
        "# AI Workspace Validation Report",
        "",
        "Generated: $([DateTime]::Now.ToString("yyyy-MM-dd HH:mm:ss K"))",
        "",
        "Overall: **$(if ($failed.Count -eq 0) {"PASS"} else {"FAIL"})**",
        ""
    )
    foreach ($r in $results) {
        $reportLines += "- $(if ($r.passed) {"PASS"} else {"FAIL"}): $($r.check) — ``$($r.target)`` ($($r.detail))"
    }
    Write-Utf8 $ValidationPath ($reportLines -join "`r`n")
    return $status
}

function Refresh-Export {
    Ensure-CanonicalDocuments
    $records = @(Update-CanonicalState)
    $status = Validate-Workspace

    if (Test-Path -LiteralPath $CurrentExport) { Remove-Item -LiteralPath $CurrentExport -Recurse -Force }
    New-Item -ItemType Directory -Force -Path $SourceExport | Out-Null

    foreach ($record in $records) {
        $source = $record.canonicalPath
        $destination = Join-Path $SourceExport $record.path
        New-Item -ItemType Directory -Force -Path (Split-Path -Parent $destination) | Out-Null
        Copy-Item -LiteralPath $source -Destination $destination -Force
    }

    $readFirst = @"
# FriendshipTree — Read First

This is a generated snapshot of the permanent AI subsystem and current editable source.

Read in this order:

1. `SOURCE\AI\AI_SPECIFICATION.md`
2. `SOURCE\AI\MANIFEST.json`
3. `SOURCE\AI\ARCHITECTURE.md`
4. `SOURCE\AI\DEVELOPMENT_RULES.md`
5. `SOURCE\AI\CURRENT_STATE.md`
6. `SOURCE\AI\FILE_INDEX.json`
7. the exact relevant source file

Exact source overrides summaries. Do not ask the user for facts already present here.

Workspace validation: $(if ($status.healthy) {"PASS"} else {"FAIL"})
Generated: $([DateTime]::Now.ToString("yyyy-MM-dd HH:mm:ss K"))
"@
    Write-Utf8 (Join-Path $CurrentExport "00-READ-FIRST.md") $readFirst
    Write-Utf8 (Join-Path $CurrentExport "PROJECT-INSTRUCTIONS.txt") $ProjectInstructions

    if (Test-Path -LiteralPath $ZipPath) { Remove-Item -LiteralPath $ZipPath -Force }
    [IO.Compression.ZipFile]::CreateFromDirectory($CurrentExport,$ZipPath,[IO.Compression.CompressionLevel]::Optimal,$false)

    Set-Clipboard -Value $ProjectInstructions
    Start-Process explorer.exe -ArgumentList @("/select,`"$ZipPath`"")
    [System.Windows.Forms.MessageBox]::Show(
        "The permanent AI system was refreshed and validated.`r`n`r`nCanonical files:`r`n$AIRoot`r`n`r`nUpload package:`r`n$ZipPath`r`n`r`nValidation: $(if ($status.healthy) {"PASS"} else {"FAIL — open VALIDATION_REPORT.md"})",
        "FriendshipTree AI Workspace"
    ) | Out-Null
}

function Export-RequestedFile {
    Ensure-CanonicalDocuments
    New-Item -ItemType Directory -Force -Path $RequestedRoot | Out-Null
    $dialog = New-Object System.Windows.Forms.OpenFileDialog
    $dialog.Title = "Select the exact FriendshipTree file requested by the AI"
    $dialog.InitialDirectory = $ProjectRoot
    $dialog.Filter = "Source and text files|*.js;*.jsx;*.ts;*.tsx;*.json;*.md;*.txt;*.css;*.html;*.ps1;*.xml;*.gradle;*.properties;*.yml;*.yaml|All files|*.*"
    if ($dialog.ShowDialog() -ne [System.Windows.Forms.DialogResult]::OK) { return }

    $selected = [IO.Path]::GetFullPath($dialog.FileName)
    if (!$selected.StartsWith([IO.Path]::GetFullPath($ProjectRoot),[StringComparison]::OrdinalIgnoreCase)) {
        throw "The selected file is outside the FriendshipTree project."
    }
    $relative = $selected.Substring($ProjectRoot.Length).TrimStart("\")
    $destination = Join-Path $RequestedRoot ($relative.Replace("\","__"))
    Copy-Item -LiteralPath $selected -Destination $destination -Force
    $receipt = [ordered]@{
        exportedUtc=[DateTime]::UtcNow.ToString("o")
        canonicalPath=$selected
        relativePath=$relative
        exportedCopy=$destination
        sha256=(Get-FileHash -LiteralPath $selected -Algorithm SHA256).Hash.ToLowerInvariant()
    }
    Write-Utf8 ($destination + ".receipt.json") ($receipt | ConvertTo-Json -Depth 5)
    Start-Process explorer.exe -ArgumentList @("/select,`"$destination`"")
}

switch ($Mode) {
    "Initialize" {
        Ensure-CanonicalDocuments
        Update-CanonicalState | Out-Null
        Validate-Workspace | Out-Null
    }
    "Refresh" { Refresh-Export }
    "Validate" {
        Ensure-CanonicalDocuments
        Update-CanonicalState | Out-Null
        $status = Validate-Workspace
        Start-Process explorer.exe -ArgumentList @("/select,`"$ValidationPath`"")
        [System.Windows.Forms.MessageBox]::Show(
            "Validation $(if ($status.healthy) {"passed"} else {"found missing requirements"}).`r`n`r`n$ValidationPath",
            "FriendshipTree AI Workspace"
        ) | Out-Null
    }
    "RequestedFile" { Export-RequestedFile }
    "Open" {
        Ensure-CanonicalDocuments
        Start-Process explorer.exe -ArgumentList @($AIRoot)
    }
    "CopyInstructions" {
        Set-Clipboard -Value $ProjectInstructions
        [System.Windows.Forms.MessageBox]::Show("Project instructions copied.","FriendshipTree AI Workspace") | Out-Null
    }
}
