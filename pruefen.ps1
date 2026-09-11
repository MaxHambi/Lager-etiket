[CmdletBinding()]
param(
    [string]$Datei,
    [string]$Ordner,
    [string]$Erwartet,
    [string]$Praefix = "lagerplatz_",
    [string]$Eintraege,
    [string]$Report
)

$ErrorActionPreference = "Stop"
$scriptDir  = Split-Path -Parent $MyInvocation.MyCommand.Path
$mainScript = Join-Path $scriptDir "pruefen.mjs"

# --- Protokollierung: jeder Lauf wird vollstaendig in eine Log-Datei geschrieben ---
$logDir = Join-Path $scriptDir "logs"
if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir | Out-Null }
$logFile = Join-Path $logDir ("pruefen_{0}.log" -f (Get-Date -Format "yyyyMMdd_HHmmss"))
Start-Transcript -Path $logFile -Append | Out-Null

function Select-FileDialog {
    param([string]$Title, [string]$Filter)
    Add-Type -AssemblyName System.Windows.Forms
    $dialog = New-Object System.Windows.Forms.OpenFileDialog
    $dialog.Title = $Title
    $dialog.Filter = $Filter
    $dialog.Multiselect = $false
    if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
        return $dialog.FileName
    }
    return $null
}

function Select-FolderDialog {
    param([string]$Description)
    Add-Type -AssemblyName System.Windows.Forms
    $dialog = New-Object System.Windows.Forms.FolderBrowserDialog
    $dialog.Description = $Description
    if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
        return $dialog.SelectedPath
    }
    return $null
}

function Invoke-Pruefung {
    param(
        [string]$Datei,
        [string]$Ordner,
        [string]$Erwartet,
        [string]$Praefix,
        [string]$Eintraege,
        [string]$Report
    )

    if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
        Write-Error "Node.js wurde nicht gefunden. Bitte Node.js 24 oder neuer installieren (https://nodejs.org) und PowerShell neu oeffnen."
        return 1
    }
    if (-not (Test-Path $mainScript)) {
        Write-Error "pruefen.mjs wurde nicht gefunden unter: $mainScript"
        return 1
    }

    $nodeArgs = @($mainScript, "--praefix", $Praefix)
    if ($Datei)     { $nodeArgs += @("--datei", $Datei) }
    if ($Ordner)    { $nodeArgs += @("--ordner", $Ordner) }
    if ($Erwartet)  { $nodeArgs += @("--erwartet", $Erwartet) }
    if ($Eintraege) { $nodeArgs += @("--eintraege", $Eintraege) }
    if ($Report)    { $nodeArgs += @("--report", $Report) }

    & node @nodeArgs
    return $LASTEXITCODE
}

$exitCode = 0

if ($PSBoundParameters.Count -eq 0) {

    # ================= Interaktiver Modus =================
    Write-Host "=== Lager-Barcode-Generator: fertige Schilder pruefen (Barcode scannen) ==="
    Write-Host ""

    $modus = Read-Host "Einzelne Datei oder ganzer Ordner pruefen? (d = Datei, o = Ordner)"
    if ($modus -match '^[oO]') {
        $Ordner = Read-Host "Pfad zum Ordner mit den Schildern (Enter = Dialog)"
        if ([string]::IsNullOrWhiteSpace($Ordner)) {
            $Ordner = Select-FolderDialog -Description "Ordner mit den zu pruefenden Schildern auswaehlen"
        }
        if ([string]::IsNullOrWhiteSpace($Ordner)) {
            Write-Host "Kein Ordner ausgewaehlt. Abbruch."
            Stop-Transcript | Out-Null
            exit 1
        }

        $eintraegeInput = Read-Host "Optional: Pfad zu einer eintraege.txt fuer die Vollstaendigkeitspruefung (Enter = ueberspringen)"
        if (-not [string]::IsNullOrWhiteSpace($eintraegeInput)) {
            $Eintraege = $eintraegeInput
        }
    }
    else {
        $Datei = Read-Host "Pfad zur PNG-Datei (Enter = Dateiauswahl-Dialog)"
        if ([string]::IsNullOrWhiteSpace($Datei)) {
            $Datei = Select-FileDialog -Title "Schild auswaehlen" -Filter "PNG-Bilder (*.png)|*.png|Alle Dateien (*.*)|*.*"
        }
        if ([string]::IsNullOrWhiteSpace($Datei)) {
            Write-Host "Keine Datei ausgewaehlt. Abbruch."
            Stop-Transcript | Out-Null
            exit 1
        }

        $erwartetInput = Read-Host "Erwarteter Lagerplatz-Code (Enter = automatisch aus Dateiname ableiten)"
        if (-not [string]::IsNullOrWhiteSpace($erwartetInput)) {
            $Erwartet = $erwartetInput
        }
    }

    Write-Host ""
    Write-Host "Starte Pruefung ..."
    Write-Host "  Quelle   : $(if ($Ordner) { $Ordner } else { $Datei })"
    Write-Host "  Praefix  : $Praefix"
    Write-Host ""

    $exitCode = Invoke-Pruefung -Datei $Datei -Ordner $Ordner -Erwartet $Erwartet -Praefix $Praefix -Eintraege $Eintraege -Report $Report

    Write-Host ""
    Write-Host "Fertig. Protokoll gespeichert unter: $logFile"
    Read-Host "Enter druecken, um das Fenster zu schliessen"

}
else {

    # ================= Direkter Modus (mit Parametern) =================
    $hatQuelle = (-not [string]::IsNullOrWhiteSpace($Datei)) -or (-not [string]::IsNullOrWhiteSpace($Ordner))
    $hatBeide  = (-not [string]::IsNullOrWhiteSpace($Datei)) -and (-not [string]::IsNullOrWhiteSpace($Ordner))

    if (-not $hatQuelle -or $hatBeide) {
        Write-Error "Verwendung:`n  .\pruefen.ps1 -Datei <bild.png> [-Erwartet <code>]`n  .\pruefen.ps1 -Ordner <ordner> [-Praefix lagerplatz_] [-Eintraege <eintraege.txt>] [-Report <bericht.csv>]"
        $exitCode = 1
    }
    else {
        $exitCode = Invoke-Pruefung -Datei $Datei -Ordner $Ordner -Erwartet $Erwartet -Praefix $Praefix -Eintraege $Eintraege -Report $Report
    }
}

Stop-Transcript | Out-Null
exit $exitCode
