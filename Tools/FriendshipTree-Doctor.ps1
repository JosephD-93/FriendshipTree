param(
    [string]$ProjectPath = "C:\Users\Joe\FriendshipTree",
    [string]$StudioPath = "C:\Users\Joe\FriendshipTreeStudio",
    [string]$DrivePath = "G:\My Drive\FriendshipTree"
)

$ErrorActionPreference = "Continue"
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$reportRoot = Join-Path $env:USERPROFILE "Desktop\FriendshipTree_Doctor_$timestamp"

New-Item -ItemType Directory -Force -Path $reportRoot | Out-Null

$summaryFile = Join-Path $reportRoot "SUMMARY.txt"
$packageReport = Join-Path $reportRoot "PACKAGE_JSON_REPORT.txt"
$filesCsv = Join-Path $reportRoot "ALL_FILES.csv"
$foldersCsv = Join-Path $reportRoot "ALL_FOLDERS.csv"
$cleanupCsv = Join-Path $reportRoot "CLEANUP_CANDIDATES.csv"
$versionsFile = Join-Path $reportRoot "TOOL_VERSIONS.txt"
$adbFile = Join-Path $reportRoot "ADB_STATUS.txt"
$treeFile = Join-Path $reportRoot "FOLDER_TREE.txt"

function Add-Section {
    param([string]$Title)
    Add-Content $summaryFile ""
    Add-Content $summaryFile ("=" * 78)
    Add-Content $summaryFile $Title
    Add-Content $summaryFile ("=" * 78)
}

function Friendly-Size {
    param([long]$Bytes)
    if ($Bytes -ge 1GB) { return "{0:N2} GB" -f ($Bytes / 1GB) }
    if ($Bytes -ge 1MB) { return "{0:N2} MB" -f ($Bytes / 1MB) }
    if ($Bytes -ge 1KB) { return "{0:N2} KB" -f ($Bytes / 1KB) }
    return "$Bytes bytes"
}

"FriendshipTree Doctor Report" | Set-Content $summaryFile
"Created: $(Get-Date)" | Add-Content $summaryFile
"Computer: $env:COMPUTERNAME" | Add-Content $summaryFile
"User: $env:USERNAME" | Add-Content $summaryFile

$roots = @($ProjectPath, $StudioPath, $DrivePath)

Add-Section "ROOT PATHS"
foreach ($root in $roots) {
    if (Test-Path $root) {
        "FOUND: $root" | Add-Content $summaryFile
    } else {
        "MISSING: $root" | Add-Content $summaryFile
    }
}

$existingRoots = @($roots | Where-Object { Test-Path $_ })

$allFiles = foreach ($root in $existingRoots) {
    Get-ChildItem -LiteralPath $root -Recurse -Force -File -ErrorAction SilentlyContinue |
        Select-Object @{
            Name="Root"; Expression={$root}
        }, FullName, Name, Extension, Length, @{
            Name="Size"; Expression={Friendly-Size $_.Length}
        }, CreationTime, LastWriteTime
}

$allFolders = foreach ($root in $existingRoots) {
    Get-ChildItem -LiteralPath $root -Recurse -Force -Directory -ErrorAction SilentlyContinue |
        Select-Object @{
            Name="Root"; Expression={$root}
        }, FullName, Name, CreationTime, LastWriteTime
}

$allFiles | Export-Csv -NoTypeInformation -Encoding UTF8 $filesCsv
$allFolders | Export-Csv -NoTypeInformation -Encoding UTF8 $foldersCsv

Add-Section "ROOT SIZE SUMMARY"
foreach ($root in $existingRoots) {
    $files = @($allFiles | Where-Object Root -eq $root)
    $size = ($files | Measure-Object Length -Sum).Sum
    "Root: $root" | Add-Content $summaryFile
    "Files: $($files.Count)" | Add-Content $summaryFile
    "Folders: $(@($allFolders | Where-Object Root -eq $root).Count)" | Add-Content $summaryFile
    "Total size: $(Friendly-Size $size)" | Add-Content $summaryFile
    "" | Add-Content $summaryFile
}

Add-Section "TOOL VERSIONS"
$commands = @(
    @{ Name = "node"; Args = @("--version") },
    @{ Name = "npm.cmd"; Args = @("--version") },
    @{ Name = "java"; Args = @("-version") },
    @{ Name = "git"; Args = @("--version") },
    @{ Name = "adb"; Args = @("version") }
)

foreach ($cmd in $commands) {
    "### $($cmd.Name)" | Add-Content $versionsFile
    try {
        & $cmd.Name @($cmd.Args) 2>&1 | Out-String | Add-Content $versionsFile
    } catch {
        "NOT FOUND: $($_.Exception.Message)" | Add-Content $versionsFile
    }
    "" | Add-Content $versionsFile
}

Add-Section "ADB STATUS"
try {
    adb devices -l 2>&1 | Out-String | Set-Content $adbFile
} catch {
    "ADB not available: $($_.Exception.Message)" | Set-Content $adbFile
}

Add-Section "IMPORTANT FILES"
$importantNames = @(
    "package.json",
    "package-lock.json",
    "vite.config.js",
    "vite.config.ts",
    "capacitor.config.json",
    "capacitor.config.ts",
    "FriendshipTree-PackageManager.ps1",
    "main.js",
    "preload.js",
    "renderer.js",
    "index.html",
    "styles.css"
)

foreach ($name in $importantNames) {
    $matches = @($allFiles | Where-Object Name -eq $name)
    if ($matches.Count -eq 0) {
        "NOT FOUND: $name" | Add-Content $summaryFile
    } else {
        foreach ($match in $matches) {
            "FOUND: $($match.FullName)" | Add-Content $summaryFile
        }
    }
}

Add-Section "PACKAGE.JSON CHECK"
$packageFiles = @($allFiles | Where-Object Name -eq "package.json")
foreach ($package in $packageFiles) {
    "File: $($package.FullName)" | Add-Content $packageReport
    try {
        $json = Get-Content -LiteralPath $package.FullName -Raw | ConvertFrom-Json
        "Name: $($json.name)" | Add-Content $packageReport
        "Version: $($json.version)" | Add-Content $packageReport

        if ($json.scripts) {
            "Scripts:" | Add-Content $packageReport
            $json.scripts.PSObject.Properties | ForEach-Object {
                "  $($_.Name): $($_.Value)" | Add-Content $packageReport
            }
        } else {
            "Scripts: NONE" | Add-Content $packageReport
        }
    } catch {
        "ERROR: $($_.Exception.Message)" | Add-Content $packageReport
    }
    "" | Add-Content $packageReport
}

Add-Section "LIKELY STUDIO PATH PROBLEM"
$studioPackages = @(
    $packageFiles |
    Where-Object { $_.FullName -like "$StudioPath*" }
)

if ($studioPackages.Count -eq 0) {
    "No package.json was found below $StudioPath" | Add-Content $summaryFile
} else {
    foreach ($pkg in $studioPackages) {
        "Studio package found: $($pkg.FullName)" | Add-Content $summaryFile
        try {
            $json = Get-Content -LiteralPath $pkg.FullName -Raw | ConvertFrom-Json
            if ($json.scripts.start) {
                "Start script: $($json.scripts.start)" | Add-Content $summaryFile
            } else {
                "WARNING: This package.json has no start script." | Add-Content $summaryFile
            }
        } catch {
            "WARNING: Could not parse this package.json." | Add-Content $summaryFile
        }
    }
}

Add-Section "CLEANUP CANDIDATES — NOTHING WAS DELETED"
$candidates = @()

foreach ($file in $allFiles) {
    $reason = $null
    $risk = "Review"

    if ($file.Extension -in @(".log", ".tmp", ".bak", ".old")) {
        $reason = "Log, temporary, backup or old file"
        $risk = "Usually safe after review"
    }
    elseif ($file.Name -match "^(npm-debug|yarn-debug|yarn-error).*\.log$") {
        $reason = "Package-manager error log"
        $risk = "Usually safe"
    }
    elseif ($file.Extension -eq ".zip" -and $file.FullName -notmatch "Incoming Updates|Installed Updates|Failed Updates") {
        $reason = "ZIP inside a working folder"
        $risk = "Move or delete after confirming it is archived"
    }
    elseif ($file.Name -match "\(\d+\)") {
        $reason = "Filename looks like a duplicate download"
        $risk = "Review carefully"
    }

    if ($reason) {
        $candidates += [PSCustomObject]@{
            Type = "File"
            Path = $file.FullName
            Size = $file.Size
            Reason = $reason
            Risk = $risk
        }
    }
}

foreach ($folder in $allFolders) {
    $name = $folder.Name.ToLowerInvariant()
    $reason = $null
    $risk = "Review"

    if ($name -eq "node_modules") {
        $reason = "Re-creatable npm dependency folder"
        $risk = "Safe only while related apps are closed"
    }
    elseif ($name -in @("dist", "build", ".vite", ".cache", "coverage")) {
        $reason = "Generated build or cache folder"
        $risk = "Usually safe; tools rebuild it"
    }
    elseif ($name -in @("package-staging", "staging", "temp", "tmp")) {
        $reason = "Temporary or staging folder"
        $risk = "Review first"
    }

    if ($reason) {
        $size = (
            Get-ChildItem -LiteralPath $folder.FullName -Recurse -Force -File -ErrorAction SilentlyContinue |
            Measure-Object Length -Sum
        ).Sum

        $candidates += [PSCustomObject]@{
            Type = "Folder"
            Path = $folder.FullName
            Size = Friendly-Size $size
            Reason = $reason
            Risk = $risk
        }
    }
}

$candidates | Export-Csv -NoTypeInformation -Encoding UTF8 $cleanupCsv
"Cleanup candidates found: $($candidates.Count)" | Add-Content $summaryFile

Add-Section "LARGEST FILES"
$allFiles |
    Sort-Object Length -Descending |
    Select-Object -First 40 FullName, Size, LastWriteTime |
    Format-Table -AutoSize |
    Out-String -Width 400 |
    Add-Content $summaryFile

Add-Section "FOLDER TREE"
foreach ($root in $existingRoots) {
    "ROOT: $root" | Add-Content $treeFile
    cmd /c "tree `"$root`" /F /A" 2>&1 | Add-Content $treeFile
    "" | Add-Content $treeFile
}

Add-Section "WHAT TO SEND BACK"
@"
Please upload these files from the report folder:

1. SUMMARY.txt
2. PACKAGE_JSON_REPORT.txt
3. TOOL_VERSIONS.txt
4. ADB_STATUS.txt

Nothing was deleted or changed.
"@ | Add-Content $summaryFile

Write-Host ""
Write-Host "FriendshipTree Doctor finished." -ForegroundColor Green
Write-Host "Report folder:" -ForegroundColor Cyan
Write-Host $reportRoot
Write-Host ""
Write-Host "Upload SUMMARY.txt and PACKAGE_JSON_REPORT.txt first." -ForegroundColor Yellow
Write-Host ""
explorer.exe $reportRoot
