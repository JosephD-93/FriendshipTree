param([switch]$LaunchLastGood)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.IO.Compression.FileSystem

$SystemRoot = Split-Path -Parent $PSScriptRoot
$ProjectRoot = Split-Path -Parent $SystemRoot
$StatePath = Join-Path $SystemRoot "studio-state.json"
$VersionsRoot = Join-Path $SystemRoot "Versions"
$LogsRoot = Join-Path $SystemRoot "Logs"
$UpdatesRoot = Join-Path $SystemRoot "Updates"
$InboxRoot = Join-Path $UpdatesRoot "Inbox"
$InstalledRoot = Join-Path $UpdatesRoot "Installed"
$RejectedRoot = Join-Path $UpdatesRoot "Rejected"
$StagingRoot = Join-Path $UpdatesRoot "Staging"
$ReleaseRoot = Join-Path $UpdatesRoot "Release"

$AndroidRoot = Join-Path $ProjectRoot "android"
$DocumentationRoot = Join-Path $ProjectRoot "Documentation"
$CanonicalForgePath = Join-Path $PSScriptRoot "FriendshipTree-Forge.ps1"

function New-LauncherShortcut {
    try {
        $Shell = New-Object -ComObject WScript.Shell
        $PowerShellExe = Join-Path $PSHOME "powershell.exe"
        $ShortcutTargets = @(
            (Join-Path ([Environment]::GetFolderPath("Desktop")) "FriendshipTree Launcher.lnk"),
            (Join-Path (Join-Path ([Environment]::GetFolderPath("StartMenu")) "Programs") "FriendshipTree Launcher.lnk")
        )

        $IconCandidates = @(
            (Join-Path $ProjectRoot "Assets\FriendshipTree.ico"),
            (Join-Path $ProjectRoot "FriendshipTreeStudio\FriendshipTree.ico"),
            (Join-Path $ProjectRoot "FriendshipTreeStudio\icon.ico")
        )
        $IconPath = $IconCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1

        foreach ($ShortcutPath in $ShortcutTargets) {
            $Shortcut = $Shell.CreateShortcut($ShortcutPath)
            $Shortcut.TargetPath = $PowerShellExe
            $Shortcut.Arguments = '-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "' + $CanonicalForgePath + '"'
            $Shortcut.WorkingDirectory = $PSScriptRoot
            $Shortcut.Description = "FriendshipTree Launcher, Studio updates and recovery"
            if ($IconPath) {
                $Shortcut.IconLocation = $IconPath
            } else {
                $Shortcut.IconLocation = "$env:SystemRoot\System32\SHELL32.dll,44"
            }
            $Shortcut.Save()
        }

        Write-ForgeLog "Created permanent Launcher shortcuts."
        [System.Windows.Forms.MessageBox]::Show(
            "The permanent FriendshipTree Launcher shortcut has been created on your Desktop and in the Start Menu.`r`n`r`nRight-click the Desktop shortcut and choose Pin to taskbar.",
            "Shortcut created"
        ) | Out-Null
    } catch {
        Write-ForgeLog "Shortcut creation failed: $($_.Exception.Message)"
        [System.Windows.Forms.MessageBox]::Show(
            "The shortcut could not be created.`r`n`r`n$($_.Exception.Message)",
            "Shortcut failed"
        ) | Out-Null
    }
}

@($VersionsRoot,$LogsRoot,$InboxRoot,$InstalledRoot,$RejectedRoot,$StagingRoot,$ReleaseRoot) |
    ForEach-Object { New-Item -ItemType Directory -Force -Path $_ | Out-Null }

$LogPath = Join-Path $LogsRoot ("forge-" + (Get-Date -Format "yyyy-MM-dd") + ".log")

function Write-ForgeLog {
    param([string]$Text)
    Add-Content -LiteralPath $LogPath -Value "$(Get-Date -Format o)  $Text"
}

function Get-ForgeState {
    if (!(Test-Path -LiteralPath $StatePath)) { throw "studio-state.json is missing." }
    $State = Get-Content -Raw -LiteralPath $StatePath | ConvertFrom-Json
    foreach ($Pair in @(
        @("previous",$null),
        @("pendingPackage",$null),
        @("pending",$null),
        @("failedVersions",@()),
        @("protectedVersions",@())
    )) {
        if ($null -eq $State.PSObject.Properties[$Pair[0]]) {
            $State | Add-Member -NotePropertyName $Pair[0] -NotePropertyValue $Pair[1]
        }
    }
    if ($null -eq $State.PSObject.Properties["forgeVersion"]) {
        $State | Add-Member -NotePropertyName forgeVersion -NotePropertyValue "2.2.0"
    } else {
        $State.forgeVersion = "2.2.0"
    }
    return $State
}

function Save-ForgeState {
    param($State)
    $Temp = "$StatePath.tmp"
    $State | ConvertTo-Json -Depth 30 | Set-Content -LiteralPath $Temp -Encoding UTF8
    Move-Item -Force -LiteralPath $Temp -Destination $StatePath
}

function Copy-DownloadedUpdates {
    # Intentionally disabled. Forge only reads StudioSystem\Updates\Inbox.
    return
}

function Get-InboxPackages {
    return @(
        Get-ChildItem -LiteralPath $InboxRoot -File -ErrorAction SilentlyContinue |
            Where-Object { $_.Extension.ToLowerInvariant() -in @(".ftupdate",".zip") } |
            Sort-Object LastWriteTime
    )
}

function Get-PackageManifest {
    param([string]$PackagePath)
    $Temp = Join-Path $StagingRoot ("inspect-" + [guid]::NewGuid().ToString("N"))
    New-Item -ItemType Directory -Force -Path $Temp | Out-Null
    try {
        $Zip = [System.IO.Compression.ZipFile]::OpenRead($PackagePath)
        try {
            $Entry = $Zip.GetEntry("manifest.json")
            if (!$Entry) { throw "manifest.json is missing." }
            $Reader = New-Object System.IO.StreamReader($Entry.Open())
            try { return ($Reader.ReadToEnd() | ConvertFrom-Json) }
            finally { $Reader.Dispose() }
        } finally { $Zip.Dispose() }
    } finally {
        Remove-Item -Recurse -Force -LiteralPath $Temp -ErrorAction SilentlyContinue
    }
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
    if ([string]::IsNullOrWhiteSpace($Version)) { return $false }

    $State = Get-ForgeState
    $VersionPath = Join-Path $VersionsRoot $Version
    if (!(Test-Path -LiteralPath (Join-Path $VersionPath "package.json"))) { return $false }

    $Electron = Find-Electron -VersionPath $VersionPath -ProjectRoot ([string]$State.projectRoot)
    if (!$Electron) {
        [System.Windows.Forms.MessageBox]::Show("Electron could not be found.","FriendshipTree Launcher") | Out-Null
        return $false
    }

    try {
        Write-ForgeLog "Launching $Version"
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
    if (Test-Path -LiteralPath $Destination) { Remove-Item -Recurse -Force -LiteralPath $Destination }
    New-Item -ItemType Directory -Force -Path $Destination | Out-Null

    $ArchiveObject = [System.IO.Compression.ZipFile]::OpenRead($Archive)
    try {
        $DestinationFull = [System.IO.Path]::GetFullPath($Destination + [System.IO.Path]::DirectorySeparatorChar)
        foreach ($Entry in $ArchiveObject.Entries) {
            if ([string]::IsNullOrEmpty($Entry.FullName)) { continue }
            if (!(Test-SafeRelativePath $Entry.FullName)) { throw "Unsafe path in update: $($Entry.FullName)" }

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
    } finally { $ArchiveObject.Dispose() }
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
    $Destination = Join-Path $RejectedRoot ((Get-Date -Format "yyyyMMdd-HHmmss") + "-" + $Name)
    if (Test-Path -LiteralPath $PackagePath) { Move-Item -Force -LiteralPath $PackagePath -Destination $Destination }
    [System.Windows.Forms.MessageBox]::Show(
        "The update was rejected. Your working Studio was not changed.`r`n`r`nReason:`r`n$Reason",
        "Update rejected"
    ) | Out-Null
}

function Install-UpdatePackage {
    param([string]$PackagePath)
    $StagePath = Join-Path $StagingRoot ([guid]::NewGuid().ToString("N"))
    try {
        Expand-UpdateSafely -Archive $PackagePath -Destination $StagePath
        $ManifestPath = Join-Path $StagePath "manifest.json"
        if (!(Test-Path -LiteralPath $ManifestPath)) { throw "manifest.json is missing." }

        $Manifest = Get-Content -Raw -LiteralPath $ManifestPath | ConvertFrom-Json
        if ([string]$Manifest.format -ne "friendshiptree-update-v1") { throw "Unsupported update format." }
        if ([string]$Manifest.type -ne "studio") { throw "Only Studio updates are supported." }
        if ([string]$Manifest.version -notmatch '^[A-Za-z0-9._-]+$') { throw "Unsafe version name." }

        $PayloadRoot = Join-Path $StagePath "payload"
        if (!(Test-Path -LiteralPath $PayloadRoot)) { throw "payload folder is missing." }

        foreach ($Relative in @($Manifest.requiredFiles)) {
            if (!(Test-SafeRelativePath ([string]$Relative))) { throw "Unsafe required file path." }
            if (!(Test-Path -LiteralPath (Join-Path $PayloadRoot ([string]$Relative)))) {
                throw "Required file missing: $Relative"
            }
        }

        if ($Manifest.checksums) {
            foreach ($Property in $Manifest.checksums.PSObject.Properties) {
                $Relative = [string]$Property.Name
                if (!(Test-SafeRelativePath $Relative)) { throw "Unsafe checksum path." }
                $FilePath = Join-Path $PayloadRoot $Relative
                if (!(Test-Path -LiteralPath $FilePath)) { throw "Checksummed file missing: $Relative" }
                if ((Get-FileSha256 $FilePath) -ne ([string]$Property.Value).ToLowerInvariant()) {
                    throw "Checksum failed: $Relative"
                }
            }
        }

        $Version = [string]$Manifest.version
        $Target = Join-Path $VersionsRoot $Version
        if (Test-Path -LiteralPath $Target) { throw "Version '$Version' is already installed." }

        Copy-Item -Recurse -Force -LiteralPath $PayloadRoot -Destination $Target

        $State = Get-ForgeState
        $State.previous = $State.current
        $State.current = $Version
        $State.pending = $Version
        $State.pendingPackage = [System.IO.Path]::GetFileName($PackagePath)
        Save-ForgeState $State

        $InstalledName = (Get-Date -Format "yyyyMMdd-HHmmss") + "-" + [System.IO.Path]::GetFileName($PackagePath)
        Move-Item -Force -LiteralPath $PackagePath -Destination (Join-Path $InstalledRoot $InstalledName)
        Remove-Item -Recurse -Force -LiteralPath $StagePath -ErrorAction SilentlyContinue

        Write-ForgeLog "Installed candidate $Version"
        [System.Windows.Forms.MessageBox]::Show(
            "Studio $Version was installed beside the working version.`r`n`r`nLaunch it, test it, then confirm it works or roll back.",
            "Update installed"
        ) | Out-Null
        Update-ForgeDisplay
    } catch {
        Reject-Update -PackagePath $PackagePath -Reason $_.Exception.Message -StagePath $StagePath
        Update-ForgeDisplay
    }
}


function Invoke-AutomaticUpdateCheck {
    try {
        $State = Get-ForgeState

        # Do not replace an unconfirmed candidate with another update.
        if ($State.pending) {
            return
        }

        $Packages = Get-InboxPackages
        if ($Packages.Count -eq 0) { return }

        # Install one candidate at a time. After it is confirmed or rolled back,
        # the next package will be handled automatically.
        $Package = $Packages[0]
        Write-ForgeLog "Automatically installing detected package: $($Package.Name)"
        Install-UpdatePackage -PackagePath $Package.FullName
    } catch {
        Write-ForgeLog "Automatic update check failed: $($_.Exception.Message)"
    }
}

function Confirm-CurrentWorking {
    $State = Get-ForgeState
    if (!$State.pending) {
        [System.Windows.Forms.MessageBox]::Show("No candidate is awaiting confirmation.","FriendshipTree Launcher") | Out-Null
        return
    }
    $State.lastGood = $State.current
    $State.pending = $null
    $State.pendingPackage = $null
    Save-ForgeState $State
    Write-ForgeLog "Confirmed $($State.lastGood)"
    Update-ForgeDisplay
}

function Rollback-Current {
    $State = Get-ForgeState
    $Target = if ($State.previous) { [string]$State.previous } else { [string]$State.lastGood }
    if (!$Target) {
        [System.Windows.Forms.MessageBox]::Show("No rollback version is available.","FriendshipTree Launcher") | Out-Null
        return
    }

    $Failed = [string]$State.current
    $State.current = $Target
    $State.pending = $null
    $State.pendingPackage = $null
    $State.previous = $null
    $FailedList = @($State.failedVersions)
    if ($Failed -and $FailedList -notcontains $Failed) { $FailedList += $Failed }
    $State.failedVersions = $FailedList
    Save-ForgeState $State
    Write-ForgeLog "Rolled back from $Failed to $Target"
    Update-ForgeDisplay
}

function Build-WorkflowTestPackage {
    $State = Get-ForgeState
    $SourceVersion = if ($State.lastGood) { [string]$State.lastGood } else { [string]$State.current }
    if (!$SourceVersion) { throw "No source version is available." }

    $Source = Join-Path $VersionsRoot $SourceVersion
    if (!(Test-Path -LiteralPath $Source)) { throw "Source version folder is missing." }

    $TestVersion = "$SourceVersion-workflow-test-" + (Get-Date -Format "yyyyMMddHHmmss")
    $Stage = Join-Path $StagingRoot ("builder-" + [guid]::NewGuid().ToString("N"))
    $Payload = Join-Path $Stage "payload"
    New-Item -ItemType Directory -Force -Path $Payload | Out-Null

    try {
        Copy-Item -Recurse -Force -Path (Join-Path $Source "*") -Destination $Payload
        Set-Content -LiteralPath (Join-Path $Payload "FORGE_UPDATE_TEST_SUCCESS.txt") -Encoding UTF8 -Value @"
FriendshipTree Forge package workflow test
Candidate version: $TestVersion
Source version: $SourceVersion
Created: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
"@

        $Required = @("package.json")
        foreach ($Name in @("main.js","preload.js","renderer.js","index.html","styles.css")) {
            if (Test-Path -LiteralPath (Join-Path $Payload $Name)) { $Required += $Name }
        }

        $Checksums = [ordered]@{}
        Get-ChildItem -LiteralPath $Payload -Recurse -File | ForEach-Object {
            $Relative = $_.FullName.Substring($Payload.Length + 1).Replace("\","/")
            $Checksums[$Relative] = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
        }

        $Manifest = [ordered]@{
            format = "friendshiptree-update-v1"
            type = "studio"
            version = $TestVersion
            name = "FriendshipTree Studio workflow test"
            releaseDate = (Get-Date -Format "yyyy-MM-dd")
            author = "FriendshipTree Launcher"
            minimumForgeVersion = "2.1.0"
            description = "Harmless package-manager workflow test."
            changelog = @(
                "Creates a new isolated candidate version",
                "Adds FORGE_UPDATE_TEST_SUCCESS.txt",
                "Leaves the working version untouched"
            )
            sourceVersion = $SourceVersion
            requiredFiles = $Required
            checksums = $Checksums
        }
        $Manifest | ConvertTo-Json -Depth 100 | Set-Content -LiteralPath (Join-Path $Stage "manifest.json") -Encoding UTF8

        $Output = Join-Path $InboxRoot ("FriendshipTree-Studio-" + $TestVersion + ".ftupdate")
        if (Test-Path -LiteralPath $Output) { Remove-Item -Force -LiteralPath $Output }
        [System.IO.Compression.ZipFile]::CreateFromDirectory($Stage,$Output,[System.IO.Compression.CompressionLevel]::Optimal,$false)

        [System.Windows.Forms.MessageBox]::Show(
            "A real test package was created directly in the Forge Inbox.`r`n`r`n$Output",
            "Package created"
        ) | Out-Null
        Update-ForgeDisplay
    } finally {
        Remove-Item -Recurse -Force -LiteralPath $Stage -ErrorAction SilentlyContinue
    }
}

function Get-VersionRows {
    $State = Get-ForgeState
    $Protected = @($State.protectedVersions)
    $Failed = @($State.failedVersions)
    $Rows = @()

    Get-ChildItem -LiteralPath $VersionsRoot -Directory -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime -Descending |
        ForEach-Object {
            $Status = @()
            if ($_.Name -eq [string]$State.current) { $Status += "Current" }
            if ($_.Name -eq [string]$State.lastGood) { $Status += "Last working" }
            if ($_.Name -eq [string]$State.pending) { $Status += "Candidate" }
            if ($Protected -contains $_.Name) { $Status += "Protected" }
            if ($Failed -contains $_.Name) { $Status += "Failed" }

            $Size = (Get-ChildItem -LiteralPath $_.FullName -Recurse -File -ErrorAction SilentlyContinue |
                Measure-Object -Property Length -Sum).Sum
            if ($null -eq $Size) { $Size = 0 }

            $Rows += [pscustomobject]@{
                Version = $_.Name
                Status = ($Status -join ", ")
                SizeMB = [math]::Round($Size / 1MB,1)
                Modified = $_.LastWriteTime
            }
        }
    return $Rows
}

$script:CurrentLabel = $null
$script:GoodLabel = $null
$script:PendingLabel = $null
$script:InboxLabel = $null
$script:UpdateList = $null
$script:VersionGrid = $null

function Update-ForgeDisplay {
    $State = Get-ForgeState
    $Packages = Get-InboxPackages

    if ($script:CurrentLabel) { $script:CurrentLabel.Text = "Current Studio: " + ($(if ($State.current) {$State.current} else {"None"})) }
    if ($script:GoodLabel) { $script:GoodLabel.Text = "Last confirmed working: " + ($(if ($State.lastGood) {$State.lastGood} else {"None"})) }
    if ($script:PendingLabel) { $script:PendingLabel.Text = "Candidate: " + ($(if ($State.pending) {$State.pending} else {"None"})) }
    if ($script:InboxLabel) { $script:InboxLabel.Text = "Available updates: $($Packages.Count)" }

    if ($script:UpdateList) {
        $script:UpdateList.Items.Clear()
        foreach ($Package in $Packages) {
            try {
                $Manifest = Get-PackageManifest $Package.FullName
                $Description = [string]$Manifest.description
                $Item = New-Object System.Windows.Forms.ListViewItem([string]$Manifest.version)
                [void]$Item.SubItems.Add([string]$Manifest.name)
                [void]$Item.SubItems.Add($Description)
                [void]$Item.SubItems.Add($Package.Name)
                $Item.Tag = $Package.FullName
                [void]$script:UpdateList.Items.Add($Item)
            } catch {
                $Item = New-Object System.Windows.Forms.ListViewItem("Invalid")
                [void]$Item.SubItems.Add("Unreadable package")
                [void]$Item.SubItems.Add($_.Exception.Message)
                [void]$Item.SubItems.Add($Package.Name)
                $Item.Tag = $Package.FullName
                [void]$script:UpdateList.Items.Add($Item)
            }
        }
    }

    if ($script:VersionGrid) {
        $script:VersionGrid.Rows.Clear()
        foreach ($Row in Get-VersionRows) {
            [void]$script:VersionGrid.Rows.Add($Row.Version,$Row.Status,$Row.SizeMB,$Row.Modified)
        }
    }
}

if ($LaunchLastGood) {
    $State = Get-ForgeState
    [void](Start-StudioVersion ([string]$State.lastGood))
    exit
}

$Form = New-Object System.Windows.Forms.Form
$Form.Text = "FriendshipTree Launcher 2.2.0"
$Form.Size = New-Object System.Drawing.Size(1040,790)
$Form.MinimumSize = New-Object System.Drawing.Size(960,740)
$Form.StartPosition = "CenterScreen"
$Form.BackColor = [System.Drawing.Color]::FromArgb(245,248,246)
$Form.Font = New-Object System.Drawing.Font("Segoe UI",9)

$Title = New-Object System.Windows.Forms.Label
$Title.Text = "FriendshipTree Launcher"
$Title.Font = New-Object System.Drawing.Font("Segoe UI Semibold",22)
$Title.AutoSize = $true
$Title.Location = New-Object System.Drawing.Point(24,16)
$Form.Controls.Add($Title)

$Subtitle = New-Object System.Windows.Forms.Label
$Subtitle.Text = "Studio · Updates · Versions · Recovery"
$Subtitle.ForeColor = [System.Drawing.Color]::FromArgb(75,95,82)
$Subtitle.AutoSize = $true
$Subtitle.Location = New-Object System.Drawing.Point(28,53)
$Form.Controls.Add($Subtitle)

$VersionBadge = New-Object System.Windows.Forms.Label
$VersionBadge.Text = "Forge 2.2.0"
$VersionBadge.ForeColor = [System.Drawing.Color]::FromArgb(45,115,62)
$VersionBadge.Font = New-Object System.Drawing.Font("Segoe UI Semibold",10)
$VersionBadge.AutoSize = $true
$VersionBadge.Location = New-Object System.Drawing.Point(900,25)
$Form.Controls.Add($VersionBadge)

$script:CurrentLabel = New-Object System.Windows.Forms.Label
$script:CurrentLabel.AutoSize = $true
$script:CurrentLabel.Location = New-Object System.Drawing.Point(28,82)
$Form.Controls.Add($script:CurrentLabel)

$script:GoodLabel = New-Object System.Windows.Forms.Label
$script:GoodLabel.AutoSize = $true
$script:GoodLabel.Location = New-Object System.Drawing.Point(28,105)
$Form.Controls.Add($script:GoodLabel)

$script:PendingLabel = New-Object System.Windows.Forms.Label
$script:PendingLabel.AutoSize = $true
$script:PendingLabel.Location = New-Object System.Drawing.Point(28,128)
$Form.Controls.Add($script:PendingLabel)

$script:InboxLabel = New-Object System.Windows.Forms.Label
$script:InboxLabel.AutoSize = $true
$script:InboxLabel.Location = New-Object System.Drawing.Point(28,151)
$Form.Controls.Add($script:InboxLabel)

$script:UpdateList = New-Object System.Windows.Forms.ListView
$script:UpdateList.Location = New-Object System.Drawing.Point(28,187)
$script:UpdateList.Size = New-Object System.Drawing.Size(970,155)
$script:UpdateList.View = "Details"
$script:UpdateList.FullRowSelect = $true
$script:UpdateList.GridLines = $true
[void]$script:UpdateList.Columns.Add("Version",130)
[void]$script:UpdateList.Columns.Add("Name",190)
[void]$script:UpdateList.Columns.Add("Description",360)
[void]$script:UpdateList.Columns.Add("Package",210)
$Form.Controls.Add($script:UpdateList)

function Add-Button {
    param([string]$Text,[int]$X,[int]$Y,[int]$W,[scriptblock]$Handler)
    $B = New-Object System.Windows.Forms.Button
    $B.Text = $Text
    $B.Location = New-Object System.Drawing.Point($X,$Y)
    $B.Size = New-Object System.Drawing.Size($W,40)
    $B.Add_Click($Handler)
    $Form.Controls.Add($B)
}

Add-Button "Install selected update" 28 354 210 {
    if ($script:UpdateList.SelectedItems.Count -eq 0) {
        [System.Windows.Forms.MessageBox]::Show("Select an update first.","Forge") | Out-Null
    } else {
        Install-UpdatePackage ([string]$script:UpdateList.SelectedItems[0].Tag)
    }
}
Add-Button "Refresh" 250 354 120 { Update-ForgeDisplay }
Add-Button "Create workflow test package" 382 354 240 { Build-WorkflowTestPackage }
Add-Button "Open Inbox" 634 354 140 { Start-Process explorer.exe -ArgumentList @($InboxRoot) }
Add-Button "Open logs" 786 354 152 { Start-Process explorer.exe -ArgumentList @($LogsRoot) }

$script:VersionGrid = New-Object System.Windows.Forms.DataGridView
$script:VersionGrid.Location = New-Object System.Drawing.Point(28,412)
$script:VersionGrid.Size = New-Object System.Drawing.Size(970,180)
$script:VersionGrid.AllowUserToAddRows = $false
$script:VersionGrid.AllowUserToDeleteRows = $false
$script:VersionGrid.ReadOnly = $true
$script:VersionGrid.SelectionMode = "FullRowSelect"
$script:VersionGrid.MultiSelect = $false
[void]$script:VersionGrid.Columns.Add("Version","Version")
[void]$script:VersionGrid.Columns.Add("Status","Status")
[void]$script:VersionGrid.Columns.Add("SizeMB","Size (MB)")
[void]$script:VersionGrid.Columns.Add("Modified","Modified")
$script:VersionGrid.Columns[0].Width = 260
$script:VersionGrid.Columns[1].Width = 250
$script:VersionGrid.Columns[2].Width = 100
$script:VersionGrid.Columns[3].Width = 240
$Form.Controls.Add($script:VersionGrid)

Add-Button "Launch current" 28 607 150 {
    $State = Get-ForgeState
    if (!(Start-StudioVersion ([string]$State.current))) { Rollback-Current }
}
Add-Button "Launch last working" 190 607 170 {
    $State = Get-ForgeState
    [void](Start-StudioVersion ([string]$State.lastGood))
}
Add-Button "Confirm candidate works" 372 607 190 { Confirm-CurrentWorking }
Add-Button "Roll back" 574 607 150 { Rollback-Current }
Add-Button "Open Versions" 736 607 202 { Start-Process explorer.exe -ArgumentList @($VersionsRoot) }


Add-Button "Open project" 28 662 150 {
    Start-Process explorer.exe -ArgumentList @($ProjectRoot)
}
Add-Button "Open Android" 190 662 150 {
    if (Test-Path -LiteralPath $AndroidRoot) {
        Start-Process explorer.exe -ArgumentList @($AndroidRoot)
    } else {
        [System.Windows.Forms.MessageBox]::Show("The Android project folder was not found.","FriendshipTree Launcher") | Out-Null
    }
}
Add-Button "Open documentation" 352 662 180 {
    if (!(Test-Path -LiteralPath $DocumentationRoot)) {
        New-Item -ItemType Directory -Force -Path $DocumentationRoot | Out-Null
    }
    Start-Process explorer.exe -ArgumentList @($DocumentationRoot)
}
Add-Button "Create pinnable shortcut" 544 662 210 {
    New-LauncherShortcut
}
Add-Button "Open Forge folder" 766 662 172 {
    Start-Process explorer.exe -ArgumentList @($PSScriptRoot)
}

$UpdateWatcher = New-Object System.Windows.Forms.Timer
$UpdateWatcher.Interval = 10000
$UpdateWatcher.Add_Tick({
    Invoke-AutomaticUpdateCheck
    Update-ForgeDisplay
})

$Form.Add_Shown({
    Invoke-AutomaticUpdateCheck
    Update-ForgeDisplay
    $UpdateWatcher.Start()
})

$Form.Add_FormClosed({
    $UpdateWatcher.Stop()
    $UpdateWatcher.Dispose()
})

[void]$Form.ShowDialog()
