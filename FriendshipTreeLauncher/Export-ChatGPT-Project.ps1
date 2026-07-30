$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Windows.Forms

$ProjectRoot = "C:\Users\Joe\FriendshipTree"
$SystemRoot = Join-Path $ProjectRoot "StudioSystem"
$LauncherRoot = Join-Path $ProjectRoot "FriendshipTreeLauncher"
$DocumentationRoot = Join-Path $ProjectRoot "Documentation"
$ExportRoot = Join-Path $ProjectRoot "AI-Handover"
$Desktop = [Environment]::GetFolderPath("Desktop")
$ContextPath = Join-Path $ExportRoot "FriendshipTree_ChatGPT_Project_Context.txt"
$DesktopContextPath = Join-Path $Desktop "FriendshipTree_ChatGPT_Project_Context.txt"
$InstructionsPath = Join-Path $ExportRoot "FriendshipTree_Project_Instructions.txt"

New-Item -ItemType Directory -Force -Path $ExportRoot | Out-Null

function Read-TextSafe {
    param([string]$Path, [int]$MaxChars = 180000)
    if (!(Test-Path -LiteralPath $Path)) {
        return "[NOT FOUND: $Path]"
    }
    try {
        $value = [IO.File]::ReadAllText($Path)
        if ($value.Length -gt $MaxChars) {
            return $value.Substring(0, $MaxChars) + "`r`n[TRUNCATED: original file had $($value.Length) characters]"
        }
        return $value
    } catch {
        return "[COULD NOT READ: $Path — $($_.Exception.Message)]"
    }
}

function Get-FileHashSafe {
    param([string]$Path)
    if (!(Test-Path -LiteralPath $Path)) { return "MISSING" }
    try { return (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant() }
    catch { return "HASH FAILED" }
}

function Get-Tree {
    param([string]$Root, [int]$Depth = 3)
    if (!(Test-Path -LiteralPath $Root)) { return "[Folder not found: $Root]" }
    $rootItem = Get-Item -LiteralPath $Root
    $lines = New-Object System.Collections.Generic.List[string]
    $lines.Add($rootItem.FullName)
    Get-ChildItem -LiteralPath $Root -Recurse -Force -ErrorAction SilentlyContinue |
        Where-Object {
            $relative = $_.FullName.Substring($Root.Length).TrimStart('\')
            (($relative -split '\\').Count -le $Depth) -and
            ($_.FullName -notmatch '\\node_modules(\\|$)') -and
            ($_.FullName -notmatch '\\\.git(\\|$)') -and
            ($_.FullName -notmatch '\\build(\\|$)') -and
            ($_.FullName -notmatch '\\dist(\\|$)')
        } |
        Sort-Object FullName |
        ForEach-Object {
            $relative = $_.FullName.Substring($Root.Length).TrimStart('\')
            $level = ($relative -split '\\').Count
            $prefix = ("  " * $level) + $(if ($_.PSIsContainer) { "[DIR] " } else { "[FILE] " })
            $lines.Add($prefix + $relative)
        }
    return ($lines -join "`r`n")
}

$StatePath = Join-Path $SystemRoot "studio-state.json"
$StateText = Read-TextSafe $StatePath 30000
try { $State = $StateText | ConvertFrom-Json } catch { $State = $null }

$ForgePath = Join-Path $SystemRoot "Bootstrap\FriendshipTree-Forge.ps1"
$HandoverPath = Join-Path $DocumentationRoot "STUDIO-AND-FORGE-HANDOVER.md"

$ProjectInstructions = @'
You are the technical partner for the FriendshipTree software project.

SOURCE-OF-TRUTH RULES
1. Treat the uploaded FriendshipTree project context and its embedded canonical files as authoritative.
2. Before proposing or generating a change, identify the existing system, exact file path, current format and update workflow described in the project context.
3. Never invent a package format, folder, launcher, updater, command, IPC contract or architecture when the project context defines one.
4. Forge remains the update/recovery engine. The Electron Launcher is the user-facing dashboard. Studio is the development application. Do not create competing parallel systems unless the user explicitly approves an architectural replacement.
5. Preserve user data, installed versions, rollback capability and working behaviour. Back up before replacing canonical files.
6. Studio update packages must follow the actual Forge manifest, payload and checksum contract documented in the context. Do not substitute ZIP-only or CMD-embedded installation workflows.
7. On Windows, provide PowerShell commands with correct quoting, exact working directories and complete copy-pasteable commands. Do not mix Markdown text into executable CMD/PowerShell payloads.
8. When code is needed, inspect the current relevant source first. If the source is not present in project files or the current chat, request only the specific missing file—not a broad project re-upload.
9. Distinguish confirmed facts from assumptions. Validate assumptions against the project context before acting.
10. Every completed architectural or workflow change must update the project context/handover so future chats inherit the correction.

WORKING STYLE
- Give direct, ordered instructions.
- Prefer one reliable route over several speculative alternatives.
- Make incremental, reversible changes.
- State exactly what file is created or changed and where it belongs.
- Do not ask the user questions already answered by the project context.
'@

$Builder = New-Object Text.StringBuilder
[void]$Builder.AppendLine("FRIENDSHIPTREE — CHATGPT PROJECT CONTEXT")
[void]$Builder.AppendLine("Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss K')")
[void]$Builder.AppendLine("Project root: $ProjectRoot")
[void]$Builder.AppendLine("")
[void]$Builder.AppendLine("============================================================")
[void]$Builder.AppendLine("0. HOW CHATGPT MUST USE THIS FILE")
[void]$Builder.AppendLine("============================================================")
[void]$Builder.AppendLine($ProjectInstructions)
[void]$Builder.AppendLine("")
[void]$Builder.AppendLine("This file is an automatically generated snapshot. Exact embedded source files override prose summaries when they conflict.")
[void]$Builder.AppendLine("ChatGPT cannot access the user's live local disk. For a code change, use the embedded source if current; otherwise ask only for the exact changed file.")
[void]$Builder.AppendLine("")

[void]$Builder.AppendLine("============================================================")
[void]$Builder.AppendLine("1. CANONICAL SYSTEM MAP")
[void]$Builder.AppendLine("============================================================")
[void]$Builder.AppendLine(@"
FriendshipTree root:
$ProjectRoot

Canonical components:
- Android application/project: $ProjectRoot and $ProjectRoot\android
- Studio system state: $StatePath
- Installed Studio versions: $SystemRoot\Versions
- Studio update inbox: $SystemRoot\Updates\Inbox
- Forge source: $ForgePath
- Forge logs: $SystemRoot\Logs
- Forge backups: $SystemRoot\Backups
- Electron Launcher: $LauncherRoot
- Documentation: $DocumentationRoot
- AI handover exports: $ExportRoot

Architecture:
ChatGPT creates or edits a valid update/source patch
        ↓
StudioSystem\Updates\Inbox
        ↓
Forge validates manifest, required files and SHA-256 checksums
        ↓
Forge stages a new Studio version
        ↓
Candidate is tested and confirmed or rolled back

Launcher relationship:
- Electron Launcher = polished user-facing dashboard and taskbar entry.
- Forge PowerShell = canonical update, candidate confirmation and rollback engine.
- The Launcher may invoke Forge; it must not silently replace Forge's safety contract.
"@)

[void]$Builder.AppendLine("============================================================")
[void]$Builder.AppendLine("2. CURRENT STUDIO STATE")
[void]$Builder.AppendLine("============================================================")
[void]$Builder.AppendLine($StateText)
[void]$Builder.AppendLine("")

[void]$Builder.AppendLine("============================================================")
[void]$Builder.AppendLine("3. REQUIRED WINDOWS / POWERSHELL PRACTICES")
[void]$Builder.AppendLine("============================================================")
[void]$Builder.AppendLine(@'
- Use PowerShell for PowerShell scripts; do not embed large raw PowerShell/Markdown blocks inside CMD files.
- Use single-file .ps1 installers or the established .ftupdate workflow.
- Quote Windows paths containing spaces.
- Set the working directory before npm, Vite, Capacitor or Gradle commands.
- Canonical Android build sequence is project-dependent and must be checked against package.json before execution.
- Typical verified command pattern:
  Set-Location "C:\Users\Joe\FriendshipTree"
  npm run build
  npx cap copy android
  Set-Location ".\android"
  .\gradlew assembleDebug
- Never run npm commands from C:\Users\Joe unless package.json is actually there.
- Before replacing Forge or Launcher files, create a timestamped backup.
- A shortcut may be deleted; the canonical Forge script must not be deleted.
'@)
[void]$Builder.AppendLine("")

[void]$Builder.AppendLine("============================================================")
[void]$Builder.AppendLine("4. PROJECT INVENTORY")
[void]$Builder.AppendLine("============================================================")
[void]$Builder.AppendLine((Get-Tree $ProjectRoot 3))
[void]$Builder.AppendLine("")

[void]$Builder.AppendLine("============================================================")
[void]$Builder.AppendLine("5. CANONICAL FILE HASHES")
[void]$Builder.AppendLine("============================================================")
$HashFiles = @(
    $ForgePath,
    $HandoverPath,
    (Join-Path $LauncherRoot "package.json"),
    (Join-Path $LauncherRoot "main.js"),
    (Join-Path $LauncherRoot "preload.js"),
    (Join-Path $LauncherRoot "renderer.js"),
    (Join-Path $LauncherRoot "index.html"),
    (Join-Path $LauncherRoot "styles.css"),
    (Join-Path $ProjectRoot "package.json")
)
foreach ($File in $HashFiles) {
    [void]$Builder.AppendLine("$File")
    [void]$Builder.AppendLine("SHA-256: $(Get-FileHashSafe $File)")
}
[void]$Builder.AppendLine("")

[void]$Builder.AppendLine("============================================================")
[void]$Builder.AppendLine("6. STUDIO AND FORGE HANDOVER — AUTHORITATIVE DOCUMENT")
[void]$Builder.AppendLine("============================================================")
[void]$Builder.AppendLine((Read-TextSafe $HandoverPath 220000))
[void]$Builder.AppendLine("")

[void]$Builder.AppendLine("============================================================")
[void]$Builder.AppendLine("7. FORGE SOURCE — CANONICAL UPDATE CONTRACT")
[void]$Builder.AppendLine("============================================================")
[void]$Builder.AppendLine("FILE: $ForgePath")
[void]$Builder.AppendLine((Read-TextSafe $ForgePath 350000))
[void]$Builder.AppendLine("")

[void]$Builder.AppendLine("============================================================")
[void]$Builder.AppendLine("8. ELECTRON LAUNCHER SOURCE")
[void]$Builder.AppendLine("============================================================")
$LauncherFiles = @("package.json","main.js","preload.js","renderer.js","index.html","styles.css","README.md")
foreach ($Name in $LauncherFiles) {
    $Path = Join-Path $LauncherRoot $Name
    [void]$Builder.AppendLine("")
    [void]$Builder.AppendLine("---------------- FILE: $Path ----------------")
    [void]$Builder.AppendLine((Read-TextSafe $Path 220000))
}
[void]$Builder.AppendLine("")

[void]$Builder.AppendLine("============================================================")
[void]$Builder.AppendLine("9. ROOT BUILD CONFIGURATION")
[void]$Builder.AppendLine("============================================================")
foreach ($Name in @("package.json","vite.config.js","capacitor.config.ts","capacitor.config.js")) {
    $Path = Join-Path $ProjectRoot $Name
    [void]$Builder.AppendLine("")
    [void]$Builder.AppendLine("---------------- FILE: $Path ----------------")
    [void]$Builder.AppendLine((Read-TextSafe $Path 120000))
}

$Context = $Builder.ToString()
[IO.File]::WriteAllText($ContextPath, $Context, (New-Object Text.UTF8Encoding($true)))
Copy-Item -LiteralPath $ContextPath -Destination $DesktopContextPath -Force
[IO.File]::WriteAllText($InstructionsPath, $ProjectInstructions, (New-Object Text.UTF8Encoding($true)))

Set-Clipboard -Value $ProjectInstructions

[System.Windows.Forms.MessageBox]::Show(
    "Your ChatGPT Project handover is ready.`r`n`r`n1. Upload this ONE file to the ChatGPT Project:`r`n$DesktopContextPath`r`n`r`n2. Open Project settings and paste the Project instructions. They are already copied to your clipboard.`r`n`r`nThe export folder will now open.",
    "FriendshipTree AI handover ready"
) | Out-Null

Start-Process explorer.exe -ArgumentList @("/select,`"$DesktopContextPath`"")
