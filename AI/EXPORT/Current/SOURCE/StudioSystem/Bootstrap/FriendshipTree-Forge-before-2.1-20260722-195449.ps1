param([switch]$LaunchLastGood)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.IO.Compression.FileSystem

$SystemRoot = Split-Path -Parent $PSScriptRoot
$StatePath = Join-Path $SystemRoot "studio-state.json"
$VersionsRoot = Join-Path $SystemRoot "Versions"
$LogsRoot = Join-Path $SystemRoot "Logs"
$UpdatesRoot = Join-Path $SystemRoot "Updates"
$InboxRoot = Join-Path $UpdatesRoot "Inbox"
$InstalledRoot = Join-Path $UpdatesRoot "Installed"
$RejectedRoot = Join-Path $UpdatesRoot "Rejected"
$StagingRoot = Join-Path $UpdatesRoot "Staging"
$DownloadsRoot = [Environment]::GetFolderPath("UserProfile") + "\Downloads"

@($VersionsRoot,$LogsRoot,$InboxRoot,$InstalledRoot,$RejectedRoot,$StagingRoot) |
    ForEach-Object { New-Item -ItemType Directory -Force -Path $_ | Out-Null }

$LogPath = Join-Path $LogsRoot ("forge-" + (Get-Date -Format "yyyy-MM-dd") + ".log")

function Write-ForgeLog {
    param([string]$Text)
    Add-Content -LiteralPath $LogPath -Value "$(Get-Date -Format o)  $Text"
}

function Get-ForgeState {
    if (!(Test-Path -LiteralPath $StatePath)) { throw "studio-state.json is missing." }
    $State = Get-Content -Raw -LiteralPath $StatePath | ConvertFrom-Json

    # Upgrade older state files safely.
    if ($null -eq $State.PSObject.Properties["previous"]) {
        $State | Add-Member -NotePropertyName previous -NotePropertyValue $null
    }
    if ($null -eq $State.PSObject.Properties["pendingPackage"]) {
        $State | Add-Member -NotePropertyName pendingPackage -NotePropertyValue $null
    }
    if ($null -eq $State.PSObject.Properties["forgeVersion"]) {
        $State | Add-Member -NotePropertyName forgeVersion -NotePropertyValue "2.0.0"
    } else {
        $State.forgeVersion = "2.0.0"
    }
    return $State
}

function Save-ForgeState {
    param($State)
    $Temp = "$StatePath.tmp"
    $State | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath $Temp -Encoding UTF8
    Move-Item -Force -LiteralPath $Temp -Destination $StatePath
}

function Copy-DownloadedUpdates {
    if (!(Test-Path -LiteralPath $DownloadsRoot)) { return }
    Get-ChildItem -LiteralPath $DownloadsRoot -Filter "*.ftupdate" -File -ErrorAction SilentlyContinue |
        ForEach-Object {
            $Destination = Join-Path $InboxRoot $_.Name
            if (!(Test-Path -LiteralPath $Destination)) {
                Copy-Item -LiteralPath $_.FullName -Destination $Destination
                Write-ForgeLog "Imported update from Downloads: $($_.Name)"
            }
        }
}

function Get-InboxPackages {
    Copy-DownloadedUpdates
    return @(Get-ChildItem -LiteralPath $InboxRoot -Filter "*.ftupdate" -File -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime)
}

function Find-Electron {
    param([string]$VersionPath,[string]$ProjectRoot)
    $Candidates = @(
        (Join-Path $VersionPath "node_modules\.bin\electron.cmd"),
        (Join-Path $VersionPath "node_modules\electron\dist\electron.exe"),
        (Join-Path $ProjectRoot "node_modules\.bin\electron.cmd"),
        (Join-Path $ProjectRoot "node_modules\electron\dist\electron.exe"),
        (Join-Path $ProjectRoot "FriendshipTreeStudio\node_modules\.bin\electron.cmd"),
        (Join-Path $ProjectRoot "FriendshipTreeStudio\node_modules\electron\dist\electron.exe")
    )
    foreach ($Candidate in $Candidates) {
        if (Test-Path -LiteralPath $Candidate) { return $Candidate }
    }
    return $null
}

function Start-StudioVersion {
    param([string]$Version)

    if ([string]::IsNullOrWhiteSpace($Version)) {
        [System.Windows.Forms.MessageBox]::Show("No Studio version is selected.","FriendshipTree Forge") | Out-Null
        return $false
    }

    $State = Get-ForgeState
    $VersionPath = Join-Path $VersionsRoot $Version
    $PackageJson = Join-Path $VersionPath "package.json"

    if (!(Test-Path -LiteralPath $PackageJson)) {
        Write-ForgeLog "Version '$Version' is missing package.json."
        [System.Windows.Forms.MessageBox]::Show("Version '$Version' is incomplete or missing.","FriendshipTree Forge") | Out-Null
        return $false
    }

    $Electron = Find-Electron -VersionPath $VersionPath -ProjectRoot ([string]$State.projectRoot)
    if (!$Electron) {
        [System.Windows.Forms.MessageBox]::Show(
            "Electron could not be found. The Studio version remains safe and unchanged.",
            "FriendshipTree Forge"
        ) | Out-Null
        return $false
    }

    try {
        Write-ForgeLog "Launching $Version from $VersionPath"
        Start-Process -FilePath $Electron -ArgumentList @($VersionPath) -WorkingDirectory $VersionPath | Out-Null
        return $true
    } catch {
        Write-ForgeLog "Launch failed for ${Version}: $($_.Exception.Message)"
        return $false
    }
}

function Test-SafeRelativePath {
    param([string]$Path)
    if ([string]::IsNullOrWhiteSpace($Path)) { return $false }
    if ([System.IO.Path]::IsPathRooted($Path)) { return $false }
    if ($Path -match '(^|[\\/])\.\.([\\/]|$)') { return $false }
    return $true
}

function Expand-UpdateSafely {
    param([string]$Archive,[string]$Destination)

    if (Test-Path -LiteralPath $Destination) {
        Remove-Item -Recurse -Force -LiteralPath $Destination
    }
    New-Item -ItemType Directory -Force -Path $Destination | Out-Null

    $ArchiveObject = [System.IO.Compression.ZipFile]::OpenRead($Archive)
    try {
        $DestinationFull = [System.IO.Path]::GetFullPath($Destination + [System.IO.Path]::DirectorySeparatorChar)

        foreach ($Entry in $ArchiveObject.Entries) {
            if ([string]::IsNullOrEmpty($Entry.FullName)) { continue }
            if (!(Test-SafeRelativePath $Entry.FullName)) {
                throw "Unsafe path in update: $($Entry.FullName)"
            }

            $Output = [System.IO.Path]::GetFullPath((Join-Path $Destination $Entry.FullName))
            if (!$Output.StartsWith($DestinationFull,[System.StringComparison]::OrdinalIgnoreCase)) {
                throw "Update attempted to write outside staging."
            }

            if ($Entry.FullName.EndsWith("/")) {
                New-Item -ItemType Directory -Force -Path $Output | Out-Null
            } else {
                $Parent = Split-Path -Parent $Output
                New-Item -ItemType Directory -Force -Path $Parent | Out-Null
                [System.IO.Compression.ZipFileExtensions]::ExtractToFile($Entry,$Output,$true)
            }
        }
    } finally {
        $ArchiveObject.Dispose()
    }
}

function Get-FileSha256 {
    param([string]$Path)
    return (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant()
}

function Reject-Update {
    param([string]$PackagePath,[string]$Reason,[string]$StagePath)

    Write-ForgeLog "Rejected update '$PackagePath': $Reason"
    if ($StagePath -and (Test-Path -LiteralPath $StagePath)) {
        Remove-Item -Recurse -Force -LiteralPath $StagePath -ErrorAction SilentlyContinue
    }

    $Name = [System.IO.Path]::GetFileName($PackagePath)
    $Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $Destination = Join-Path $RejectedRoot ($Stamp + "-" + $Name)
    if (Test-Path -LiteralPath $PackagePath) {
        Move-Item -Force -LiteralPath $PackagePath -Destination $Destination
    }

    [System.Windows.Forms.MessageBox]::Show(
        "The update was rejected and your working Studio was not changed.`r`n`r`nReason:`r`n$Reason",
        "Update rejected",
        [System.Windows.Forms.MessageBoxButtons]::OK,
        [System.Windows.Forms.MessageBoxIcon]::Warning
    ) | Out-Null
}

function Install-UpdatePackage {
    param([string]$PackagePath)

    $StageName = [System.IO.Path]::GetFileNameWithoutExtension($PackagePath) + "-" + (Get-Date -Format "yyyyMMddHHmmss")
    $StagePath = Join-Path $StagingRoot $StageName

    try {
        Expand-UpdateSafely -Archive $PackagePath -Destination $StagePath

        $ManifestPath = Join-Path $StagePath "manifest.json"
        if (!(Test-Path -LiteralPath $ManifestPath)) { throw "manifest.json is missing." }

        $Manifest = Get-Content -Raw -LiteralPath $ManifestPath | ConvertFrom-Json
        if ([string]$Manifest.format -ne "friendshiptree-update-v1") { throw "Unsupported update format." }
        if ([string]$Manifest.type -ne "studio") { throw "This Forge build accepts Studio updates only." }
        if ([string]::IsNullOrWhiteSpace([string]$Manifest.version)) { throw "The update version is missing." }
        if ([string]$Manifest.version -notmatch '^[A-Za-z0-9._-]+$') { throw "The update version contains unsafe characters." }

        $PayloadRoot = Join-Path $StagePath "payload"
        if (!(Test-Path -LiteralPath $PayloadRoot)) { throw "The payload folder is missing." }

        $Required = @($Manifest.requiredFiles)
        foreach ($Relative in $Required) {
            if (!(Test-SafeRelativePath ([string]$Relative))) { throw "Unsafe required file path: $Relative" }
            if (!(Test-Path -LiteralPath (Join-Path $PayloadRoot ([string]$Relative)))) {
                throw "Required file missing: $Relative"
            }
        }

        if ($Manifest.checksums) {
            foreach ($Property in $Manifest.checksums.PSObject.Properties) {
                $Relative = [string]$Property.Name
                $Expected = ([string]$Property.Value).ToLowerInvariant()
                if (!(Test-SafeRelativePath $Relative)) { throw "Unsafe checksum path: $Relative" }
                $FilePath = Join-Path $PayloadRoot $Relative
                if (!(Test-Path -LiteralPath $FilePath)) { throw "Checksummed file missing: $Relative" }
                $Actual = Get-FileSha256 -Path $FilePath
                if ($Actual -ne $Expected) { throw "Checksum failed: $Relative" }
            }
        }

        $Version = [string]$Manifest.version
        $Target = Join-Path $VersionsRoot $Version
        if (Test-Path -LiteralPath $Target) {
            throw "Version '$Version' is already installed."
        }

        $State = Get-ForgeState
        Copy-Item -Recurse -Force -LiteralPath $PayloadRoot -Destination $Target

        # Verify the installed copy too.
        foreach ($Relative in $Required) {
            if (!(Test-Path -LiteralPath (Join-Path $Target ([string]$Relative)))) {
                Remove-Item -Recurse -Force -LiteralPath $Target -ErrorAction SilentlyContinue
                throw "Installed copy failed verification: $Relative"
            }
        }

        $State.previous = $State.current
        $State.current = $Version
        $State.pending = $Version
        $State.pendingPackage = [System.IO.Path]::GetFileName($PackagePath)
        Save-ForgeState -State $State

        $InstalledName = (Get-Date -Format "yyyyMMdd-HHmmss") + "-" + [System.IO.Path]::GetFileName($PackagePath)
        Move-Item -Force -LiteralPath $PackagePath -Destination (Join-Path $InstalledRoot $InstalledName)
        Remove-Item -Recurse -Force -LiteralPath $StagePath -ErrorAction SilentlyContinue

        Write-ForgeLog "Installed candidate Studio version $Version. Previous: $($State.previous)"

        [System.Windows.Forms.MessageBox]::Show(
            "Studio $Version was installed beside your existing version.`r`n`r`nIt is now a candidate. Forge has NOT replaced the last-working version.`r`n`r`nLaunch it, test it, then click 'Confirm current version works'.",
            "Update installed safely",
            [System.Windows.Forms.MessageBoxButtons]::OK,
            [System.Windows.Forms.MessageBoxIcon]::Information
        ) | Out-Null

        Update-ForgeDisplay
    } catch {
        Reject-Update -PackagePath $PackagePath -Reason $_.Exception.Message -StagePath $StagePath
        Update-ForgeDisplay
    }
}

function Confirm-CurrentWorking {
    $State = Get-ForgeState
    if ([string]::IsNullOrWhiteSpace([string]$State.pending)) {
        [System.Windows.Forms.MessageBox]::Show("There is no candidate update awaiting confirmation.","FriendshipTree Forge") | Out-Null
        return
    }

    $State.lastGood = $State.current
    $State.pending = $null
    $State.pendingPackage = $null
    Save-ForgeState -State $State
    Write-ForgeLog "Confirmed last-working version: $($State.lastGood)"
    Update-ForgeDisplay
}

function Rollback-Current {
    $State = Get-ForgeState
    $RollbackTarget = if ($State.previous) { [string]$State.previous } else { [string]$State.lastGood }

    if ([string]::IsNullOrWhiteSpace($RollbackTarget)) {
        [System.Windows.Forms.MessageBox]::Show("No previous working version is available.","FriendshipTree Forge") | Out-Null
        return
    }

    $Failed = [string]$State.current
    $State.current = $RollbackTarget
    $State.pending = $null
    $State.pendingPackage = $null
    $State.previous = $null

    $FailedList = @($State.failedVersions)
    if ($Failed -and ($FailedList -notcontains $Failed)) {
        $FailedList += $Failed
    }
    $State.failedVersions = $FailedList
    Save-ForgeState -State $State

    Write-ForgeLog "Rolled back from $Failed to $RollbackTarget"
    Update-ForgeDisplay

    [System.Windows.Forms.MessageBox]::Show(
        "Restored Studio $RollbackTarget.`r`n`r`nThe failed candidate remains isolated in Versions and cannot overwrite the working version.",
        "Rollback complete"
    ) | Out-Null
}

function Install-NextInboxUpdate {
    $Packages = Get-InboxPackages
    if ($Packages.Count -eq 0) {
        [System.Windows.Forms.MessageBox]::Show(
            "No .ftupdate file was found.`r`n`r`nForge automatically checks both your Downloads folder and its Updates Inbox.",
            "No update found"
        ) | Out-Null
        return
    }

    $Package = $Packages[0]
    $Answer = [System.Windows.Forms.MessageBox]::Show(
        "Install this update safely?`r`n`r`n$($Package.Name)",
        "FriendshipTree Forge",
        [System.Windows.Forms.MessageBoxButtons]::YesNo,
        [System.Windows.Forms.MessageBoxIcon]::Question
    )
    if ($Answer -eq [System.Windows.Forms.DialogResult]::Yes) {
        Install-UpdatePackage -PackagePath $Package.FullName
    }
}

$script:CurrentLabel = $null
$script:GoodLabel = $null
$script:PendingLabel = $null
$script:InboxLabel = $null

function Update-ForgeDisplay {
    $State = Get-ForgeState
    $Packages = Get-InboxPackages

    $Current = if ($State.current) { [string]$State.current } else { "None" }
    $Good = if ($State.lastGood) { [string]$State.lastGood } else { "None" }
    $Pending = if ($State.pending) { [string]$State.pending } else { "None" }

    if ($script:CurrentLabel) { $script:CurrentLabel.Text = "Current Studio: $Current" }
    if ($script:GoodLabel) { $script:GoodLabel.Text = "Last confirmed working: $Good" }
    if ($script:PendingLabel) { $script:PendingLabel.Text = "Candidate awaiting confirmation: $Pending" }
    if ($script:InboxLabel) { $script:InboxLabel.Text = "Updates found: $($Packages.Count)" }
}

if ($LaunchLastGood) {
    $State = Get-ForgeState
    [void](Start-StudioVersion -Version ([string]$State.lastGood))
    exit
}

Copy-DownloadedUpdates

$Form = New-Object System.Windows.Forms.Form
$Form.Text = "FriendshipTree Forge 2"
$Form.Size = New-Object System.Drawing.Size(690,560)
$Form.StartPosition = "CenterScreen"
$Form.BackColor = [System.Drawing.Color]::FromArgb(245,248,246)
$Form.Font = New-Object System.Drawing.Font("Segoe UI",10)

$Title = New-Object System.Windows.Forms.Label
$Title.Text = "FriendshipTree Forge 2"
$Title.Font = New-Object System.Drawing.Font("Segoe UI Semibold",20)
$Title.AutoSize = $true
$Title.Location = New-Object System.Drawing.Point(28,20)
$Form.Controls.Add($Title)

$Subtitle = New-Object System.Windows.Forms.Label
$Subtitle.Text = "Safe updates, isolated versions and instant rollback"
$Subtitle.AutoSize = $true
$Subtitle.Location = New-Object System.Drawing.Point(31,60)
$Form.Controls.Add($Subtitle)

$script:CurrentLabel = New-Object System.Windows.Forms.Label
$script:CurrentLabel.AutoSize = $true
$script:CurrentLabel.Location = New-Object System.Drawing.Point(32,105)
$Form.Controls.Add($script:CurrentLabel)

$script:GoodLabel = New-Object System.Windows.Forms.Label
$script:GoodLabel.AutoSize = $true
$script:GoodLabel.Location = New-Object System.Drawing.Point(32,133)
$Form.Controls.Add($script:GoodLabel)

$script:PendingLabel = New-Object System.Windows.Forms.Label
$script:PendingLabel.AutoSize = $true
$script:PendingLabel.Location = New-Object System.Drawing.Point(32,161)
$Form.Controls.Add($script:PendingLabel)

$script:InboxLabel = New-Object System.Windows.Forms.Label
$script:InboxLabel.AutoSize = $true
$script:InboxLabel.Location = New-Object System.Drawing.Point(32,189)
$Form.Controls.Add($script:InboxLabel)

function Add-ForgeButton {
    param([string]$Text,[int]$X,[int]$Y,[int]$Width,[scriptblock]$Handler)
    $Button = New-Object System.Windows.Forms.Button
    $Button.Text = $Text
    $Button.Location = New-Object System.Drawing.Point($X,$Y)
    $Button.Size = New-Object System.Drawing.Size($Width,48)
    $Button.Add_Click($Handler)
    $Form.Controls.Add($Button)
}

Add-ForgeButton "Install downloaded update" 32 235 290 { Install-NextInboxUpdate }
Add-ForgeButton "Refresh update search" 350 235 290 { Update-ForgeDisplay }

Add-ForgeButton "Launch current Studio" 32 299 290 {
    $State = Get-ForgeState
    if (!(Start-StudioVersion -Version ([string]$State.current))) {
        Rollback-Current
    }
}
Add-ForgeButton "Launch last-working Studio" 350 299 290 {
    $State = Get-ForgeState
    [void](Start-StudioVersion -Version ([string]$State.lastGood))
}

Add-ForgeButton "Confirm current version works" 32 363 290 { Confirm-CurrentWorking }
Add-ForgeButton "Roll back current version" 350 363 290 { Rollback-Current }

Add-ForgeButton "Open version history folder" 32 427 290 {
    Start-Process -FilePath "explorer.exe" -ArgumentList @($VersionsRoot)
}
Add-ForgeButton "Open logs and rejected updates" 350 427 290 {
    Start-Process -FilePath "explorer.exe" -ArgumentList @($UpdatesRoot)
}

Update-ForgeDisplay

$StateAtOpen = Get-ForgeState
if ($StateAtOpen.pending) {
    [System.Windows.Forms.MessageBox]::Show(
        "Studio $($StateAtOpen.pending) is still a candidate.`r`n`r`nTest it and confirm it works, or roll back. The previous working version is still protected.",
        "Candidate update pending",
        [System.Windows.Forms.MessageBoxButtons]::OK,
        [System.Windows.Forms.MessageBoxIcon]::Information
    ) | Out-Null
}

[void]$Form.ShowDialog()
