# FriendshipTree Canonical Organisation
# Run from: C:\Users\Joe\FriendshipTree
# This script keeps the active React/Capacitor app at the project root so existing builds do not break.

$ErrorActionPreference = "Stop"

$Root = (Get-Location).Path
$Expected = "C:\Users\Joe\FriendshipTree"

if ($Root -ne $Expected) {
    Write-Host "You are currently in: $Root" -ForegroundColor Yellow
    $answer = Read-Host "Continue anyway? Type YES to continue"
    if ($answer -ne "YES") {
        Write-Host "Cancelled." -ForegroundColor Yellow
        exit
    }
}

$Folders = @(
    "Docs",
    "Scripts",
    "Assets",
    "Packages",
    "Tests",
    "Generated Builds"
)

foreach ($Folder in $Folders) {
    $Path = Join-Path $Root $Folder
    if (!(Test-Path -LiteralPath $Path)) {
        New-Item -ItemType Directory -Path $Path | Out-Null
        Write-Host "Created: $Folder" -ForegroundColor Green
    }
}

function Move-Safely {
    param(
        [Parameter(Mandatory=$true)][string]$SourceName,
        [Parameter(Mandatory=$true)][string]$DestinationFolder
    )

    $Source = Join-Path $Root $SourceName
    if (!(Test-Path -LiteralPath $Source)) {
        Write-Host "Not found or already moved: $SourceName" -ForegroundColor DarkGray
        return
    }

    $DestinationRoot = Join-Path $Root $DestinationFolder
    $Destination = Join-Path $DestinationRoot (Split-Path $Source -Leaf)

    if (Test-Path -LiteralPath $Destination) {
        Write-Host "Already exists at destination: $Destination" -ForegroundColor Yellow
        return
    }

    Move-Item -LiteralPath $Source -Destination $DestinationRoot
    Write-Host "Moved: $SourceName -> $DestinationFolder" -ForegroundColor Green
}

# Keep old production output rather than deleting it.
if (Test-Path -LiteralPath (Join-Path $Root "dist")) {
    $Timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
    $Destination = Join-Path $Root "Generated Builds\dist-$Timestamp"
    Move-Item -LiteralPath (Join-Path $Root "dist") -Destination $Destination
    Write-Host "Preserved old dist output as: Generated Builds\dist-$Timestamp" -ForegroundColor Green
}

# Move active helper scripts/documentation into Scripts.
Move-Safely "START FRIENDSHIPTREE STUDIO.bat" "Scripts"
Move-Safely "QUICK BUILD APK ONLY.bat" "Scripts"
Move-Safely "BUILD-STEPS.md" "Scripts"

# Move the temporary root inventory after cleanup.
Move-Safely "Current-Root-Contents.txt" "Archive"

# Create README placeholders where useful.
$Readmes = @{
    "Assets\README.md" = @"
# Assets

Permanent visual assets used by FriendshipTree, including icons, mascot artwork, Lottie files and reference images.

Do not put generated screenshots or temporary exports here.
"@
    "Packages\README.md" = @"
# Packages

FriendshipTree update packages and package-building output.

The live Forge inbox remains:

StudioSystem\Updates\Inbox

Do not move that live Inbox until Forge and its configuration are intentionally updated together.
"@
    "Tests\README.md" = @"
# Tests

Test packages, diagnostics and repeatable test instructions.

Temporary one-off experiments should go in Archive rather than remaining here indefinitely.
"@
    "Generated Builds\README.md" = @"
# Generated Builds

Preserved production outputs such as old `dist` folders and APK build artefacts.

These files are not the editable source of the application.
"@
}

foreach ($RelativePath in $Readmes.Keys) {
    $FullPath = Join-Path $Root $RelativePath
    if (!(Test-Path -LiteralPath $FullPath)) {
        Set-Content -LiteralPath $FullPath -Value $Readmes[$RelativePath] -Encoding UTF8
        Write-Host "Created: $RelativePath" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "Organisation complete." -ForegroundColor Green
Write-Host ""
Write-Host "Important: the active app remains at the project root." -ForegroundColor Cyan
Write-Host "The following were intentionally NOT moved:" -ForegroundColor Cyan
Write-Host "  src, public, android, package.json, package-lock.json"
Write-Host "  FriendshipTreeStudio, StudioSystem, Tools"
Write-Host ""
Write-Host "This avoids breaking Vite, Capacitor, Android or Forge paths."
