param([switch]$LaunchLastGood)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$SystemRoot = Split-Path -Parent $PSScriptRoot
$StatePath = Join-Path $SystemRoot "studio-state.json"
$VersionsRoot = Join-Path $SystemRoot "Versions"
$LogsRoot = Join-Path $SystemRoot "Logs"
$UpdatesInbox = Join-Path $SystemRoot "Updates\Inbox"

New-Item -ItemType Directory -Force -Path $LogsRoot | Out-Null
New-Item -ItemType Directory -Force -Path $UpdatesInbox | Out-Null

$LogPath = Join-Path $LogsRoot ("forge-" + (Get-Date -Format "yyyy-MM-dd") + ".log")

function Write-ForgeLog {
    param([string]$Text)
    Add-Content -LiteralPath $LogPath -Value "$(Get-Date -Format o)  $Text"
}

function Get-ForgeState {
    if (!(Test-Path -LiteralPath $StatePath)) {
        throw "studio-state.json is missing."
    }

    return Get-Content -Raw -LiteralPath $StatePath | ConvertFrom-Json
}

function Save-ForgeState {
    param($State)

    $TempPath = "$StatePath.tmp"
    $State | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $TempPath -Encoding UTF8
    Move-Item -Force -LiteralPath $TempPath -Destination $StatePath
}

function Find-Electron {
    param(
        [string]$VersionPath,
        [string]$ProjectRoot
    )

    $Candidates = @(
        (Join-Path $VersionPath "node_modules\.bin\electron.cmd"),
        (Join-Path $VersionPath "node_modules\electron\dist\electron.exe"),
        (Join-Path $ProjectRoot "node_modules\.bin\electron.cmd"),
        (Join-Path $ProjectRoot "node_modules\electron\dist\electron.exe"),
        (Join-Path $ProjectRoot "FriendshipTreeStudio\node_modules\.bin\electron.cmd"),
        (Join-Path $ProjectRoot "FriendshipTreeStudio\node_modules\electron\dist\electron.exe")
    )

    foreach ($Candidate in $Candidates) {
        if (Test-Path -LiteralPath $Candidate) {
            return $Candidate
        }
    }

    return $null
}

function Start-StudioVersion {
    param([string]$Version)

    if ([string]::IsNullOrWhiteSpace($Version)) {
        [System.Windows.Forms.MessageBox]::Show(
            "No Studio version has been registered yet.",
            "FriendshipTree Forge"
        ) | Out-Null
        return $false
    }

    $State = Get-ForgeState
    $VersionPath = Join-Path $VersionsRoot $Version
    $PackageJson = Join-Path $VersionPath "package.json"

    if (!(Test-Path -LiteralPath $PackageJson)) {
        Write-ForgeLog "Version '$Version' is missing package.json."
        [System.Windows.Forms.MessageBox]::Show(
            "Version '$Version' is incomplete or missing.",
            "FriendshipTree Forge"
        ) | Out-Null
        return $false
    }

    $Electron = Find-Electron -VersionPath $VersionPath -ProjectRoot ([string]$State.projectRoot)

    if (!$Electron) {
        [System.Windows.Forms.MessageBox]::Show(
            "Electron could not be found.`r`n`r`nThe protected Studio copy is safe, but it cannot be launched until its node_modules dependency is available.",
            "FriendshipTree Forge"
        ) | Out-Null
        return $false
    }

    try {
        Write-ForgeLog "Launching $Version from $VersionPath"
        Start-Process -FilePath $Electron -ArgumentList @($VersionPath) -WorkingDirectory $VersionPath | Out-Null
        return $true
    }
    catch {
        Write-ForgeLog "Launch failed for ${Version}: $($_.Exception.Message)"
        [System.Windows.Forms.MessageBox]::Show(
            "Studio could not be launched.`r`n`r`n$($_.Exception.Message)",
            "FriendshipTree Forge"
        ) | Out-Null
        return $false
    }
}

function Restore-LastGood {
    $State = Get-ForgeState

    if ([string]::IsNullOrWhiteSpace([string]$State.lastGood)) {
        [System.Windows.Forms.MessageBox]::Show(
            "There is no last-working version recorded.",
            "FriendshipTree Forge"
        ) | Out-Null
        return
    }

    $State.current = $State.lastGood
    $State.pending = $null
    Save-ForgeState -State $State
    Write-ForgeLog "Restored current version to $($State.lastGood)"

    [System.Windows.Forms.MessageBox]::Show(
        "Current Studio restored to '$($State.lastGood)'.",
        "FriendshipTree Forge"
    ) | Out-Null

    Update-StatusLabels
}

$script:CurrentLabel = $null
$script:GoodLabel = $null
$script:PendingLabel = $null

function Update-StatusLabels {
    $State = Get-ForgeState

    $CurrentText = if ($State.current) { [string]$State.current } else { "None" }
    $GoodText = if ($State.lastGood) { [string]$State.lastGood } else { "None" }
    $PendingText = if ($State.pending) { [string]$State.pending } else { "None" }

    if ($script:CurrentLabel) { $script:CurrentLabel.Text = "Current version: $CurrentText" }
    if ($script:GoodLabel) { $script:GoodLabel.Text = "Last working: $GoodText" }
    if ($script:PendingLabel) { $script:PendingLabel.Text = "Pending update: $PendingText" }
}

if ($LaunchLastGood) {
    $State = Get-ForgeState
    [void](Start-StudioVersion -Version ([string]$State.lastGood))
    exit
}

$Form = New-Object System.Windows.Forms.Form
$Form.Text = "FriendshipTree Forge"
$Form.Size = New-Object System.Drawing.Size(620,470)
$Form.StartPosition = "CenterScreen"
$Form.BackColor = [System.Drawing.Color]::FromArgb(245,248,246)
$Form.Font = New-Object System.Drawing.Font("Segoe UI",10)

$Title = New-Object System.Windows.Forms.Label
$Title.Text = "FriendshipTree Forge"
$Title.Font = New-Object System.Drawing.Font("Segoe UI Semibold",20)
$Title.AutoSize = $true
$Title.Location = New-Object System.Drawing.Point(28,22)
$Form.Controls.Add($Title)

$Subtitle = New-Object System.Windows.Forms.Label
$Subtitle.Text = "Stable launcher, rollback and recovery - separate from Studio"
$Subtitle.AutoSize = $true
$Subtitle.Location = New-Object System.Drawing.Point(31,62)
$Form.Controls.Add($Subtitle)

$script:CurrentLabel = New-Object System.Windows.Forms.Label
$script:CurrentLabel.AutoSize = $true
$script:CurrentLabel.Location = New-Object System.Drawing.Point(32,108)
$Form.Controls.Add($script:CurrentLabel)

$script:GoodLabel = New-Object System.Windows.Forms.Label
$script:GoodLabel.AutoSize = $true
$script:GoodLabel.Location = New-Object System.Drawing.Point(32,136)
$Form.Controls.Add($script:GoodLabel)

$script:PendingLabel = New-Object System.Windows.Forms.Label
$script:PendingLabel.AutoSize = $true
$script:PendingLabel.Location = New-Object System.Drawing.Point(32,164)
$Form.Controls.Add($script:PendingLabel)

function Add-ForgeButton {
    param(
        [string]$Text,
        [int]$X,
        [int]$Y,
        [int]$Width,
        [scriptblock]$Handler
    )

    $Button = New-Object System.Windows.Forms.Button
    $Button.Text = $Text
    $Button.Location = New-Object System.Drawing.Point($X,$Y)
    $Button.Size = New-Object System.Drawing.Size($Width,46)
    $Button.Add_Click($Handler)
    $Form.Controls.Add($Button)
}

Add-ForgeButton -Text "Launch current Studio" -X 32 -Y 210 -Width 250 -Handler {
    $State = Get-ForgeState

    if (!(Start-StudioVersion -Version ([string]$State.current))) {
        $Answer = [System.Windows.Forms.MessageBox]::Show(
            "The current version could not be launched.`r`n`r`nOpen the last-working version instead?",
            "FriendshipTree Forge",
            [System.Windows.Forms.MessageBoxButtons]::YesNo,
            [System.Windows.Forms.MessageBoxIcon]::Warning
        )

        if ($Answer -eq [System.Windows.Forms.DialogResult]::Yes) {
            [void](Start-StudioVersion -Version ([string]$State.lastGood))
        }
    }
}

Add-ForgeButton -Text "Launch last-working Studio" -X 310 -Y 210 -Width 250 -Handler {
    $State = Get-ForgeState
    [void](Start-StudioVersion -Version ([string]$State.lastGood))
}

Add-ForgeButton -Text "Restore last-working version" -X 32 -Y 274 -Width 250 -Handler {
    Restore-LastGood
}

Add-ForgeButton -Text "Open StudioSystem folder" -X 310 -Y 274 -Width 250 -Handler {
    Start-Process -FilePath "explorer.exe" -ArgumentList @($SystemRoot)
}

Add-ForgeButton -Text "Open update inbox" -X 32 -Y 338 -Width 250 -Handler {
    Start-Process -FilePath "explorer.exe" -ArgumentList @($UpdatesInbox)
}

Add-ForgeButton -Text "Open logs" -X 310 -Y 338 -Width 250 -Handler {
    Start-Process -FilePath "explorer.exe" -ArgumentList @($LogsRoot)
}

Update-StatusLabels
[void]$Form.ShowDialog()
