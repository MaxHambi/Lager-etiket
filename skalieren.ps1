[CmdletBinding()]
param(
    [string]$Datei,
    [string]$Ordner,
    [double]$Hoehe,
    [string]$Output,
    [double]$Dpi = 300,
    [switch]$Overwrite
)

$ErrorActionPreference = "Stop"
$scriptDir  = Split-Path -Parent $MyInvocation.MyCommand.Path
$mainScript = Join-Path $scriptDir "skalieren.mjs"

# --- Protokollierung: jeder Lauf wird vollstaendig in eine Log-Datei geschrieben ---
$logDir = Join-Path $scriptDir "logs"
if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir | Out-Null }
$logFile = Join-Path $logDir ("skalieren_{0}.log" -f (Get-Date -Format "yyyyMMdd_HHmmss"))
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

function Invoke-Skalierer {
    param(
        [string]$Datei,
        [string]$Ordner,
        [double]$Hoehe,
        [string]$Output,
        [double]$Dpi,
        [bool]$Ueberschreiben
    )

    if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
        Write-Error "Node.js wurde nicht gefunden. Bitte Node.js 24 oder neuer installieren (https://nodejs.org) und PowerShell neu oeffnen."
        return 1
    }
    if (-not (Test-Path $mainScript)) {
        Write-Error "skalieren.mjs wurde nicht gefunden unter: $mainScript"
        return 1
    }

    $nodeArgs = @($mainScript, "--hoehe", $Hoehe, "--output", $Output, "--dpi", $Dpi)
    if ($Datei)  { $nodeArgs += @("--datei", $Datei) }
    if ($Ordner) { $nodeArgs += @("--ordner", $Ordner) }
    if ($Ueberschreiben) { $nodeArgs += "--overwrite" }

    & node @nodeArgs
    return $LASTEXITCODE
}

$exitCode = 0

if ($PSBoundParameters.Count -eq 0) {

    # ================= Interaktiver Modus =================
    Write-Host "=== Lager-Barcode-Generator: fertige Schilder skalieren ==="
    Write-Host ""

    $modus = Read-Host "Einzelne Datei oder ganzer Ordner skalieren? (d = Datei, o = Ordner)"
    if ($modus -match '^[oO]') {
        $Ordner = Read-Host "Pfad zum Ordner mit den Schildern (Enter = Dialog)"
        if ([string]::IsNullOrWhiteSpace($Ordner)) {
            $Ordner = Select-FolderDialog -Description "Ordner mit den fertigen Schildern auswaehlen"
        }
        if ([string]::IsNullOrWhiteSpace($Ordner)) {
            Write-Host "Kein Ordner ausgewaehlt. Abbruch."
            Stop-Transcript | Out-Null
            exit 1
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
    }

    $hoeheInput = Read-Host "Zielhoehe in mm (z. B. 15)"
    if (-not [double]::TryParse($hoeheInput, [ref]$Hoehe) -or $Hoehe -le 0) {
        Write-Host "Ungueltige Hoehe. Abbruch."
        Stop-Transcript | Out-Null
        exit 1
    }

    $Output = Read-Host "Ausgabeordner (Enter = Ordnerauswahl-Dialog)"
    if ([string]::IsNullOrWhiteSpace($Output)) {
        $Output = Select-FolderDialog -Description "Ausgabeordner fuer die skalierten Schilder auswaehlen"
    }
    if ([string]::IsNullOrWhiteSpace($Output)) {
        Write-Host "Kein Ausgabeordner ausgewaehlt. Abbruch."
        Stop-Transcript | Out-Null
        exit 1
    }

    $antwort = Read-Host "Vorhandene Dateien ueberschreiben? (j/N)"
    $ueberschreibenFlag = ($antwort -match '^[jJ]')

    Write-Host ""
    Write-Host "Starte Skalierung ..."
    Write-Host "  Quelle        : $(if ($Ordner) { $Ordner } else { $Datei })"
    Write-Host "  Zielhoehe     : $Hoehe mm bei $Dpi DPI"
    Write-Host "  Ausgabe       : $Output"
    Write-Host "  Ueberschreiben: $ueberschreibenFlag"
    Write-Host ""

    $exitCode = Invoke-Skalierer -Datei $Datei -Ordner $Ordner -Hoehe $Hoehe -Output $Output -Dpi $Dpi -Ueberschreiben $ueberschreibenFlag

    Write-Host ""
    Write-Host "Fertig. Protokoll gespeichert unter: $logFile"
    Read-Host "Enter druecken, um das Fenster zu schliessen"

}
else {

    # ================= Direkter Modus (mit Parametern) =================
    $hatQuelle = (-not [string]::IsNullOrWhiteSpace($Datei)) -or (-not [string]::IsNullOrWhiteSpace($Ordner))
    $hatBeide  = (-not [string]::IsNullOrWhiteSpace($Datei)) -and (-not [string]::IsNullOrWhiteSpace($Ordner))

    if (-not $hatQuelle -or $hatBeide -or $Hoehe -le 0 -or [string]::IsNullOrWhiteSpace($Output)) {
        Write-Error "Verwendung:`n  .\skalieren.ps1 -Datei <bild.png> -Hoehe <mm> -Output <ordner> [-Dpi 300] [-Overwrite]`n  .\skalieren.ps1 -Ordner <ordner>   -Hoehe <mm> -Output <ordner> [-Dpi 300] [-Overwrite]"
        $exitCode = 1
    }
    else {
        $exitCode = Invoke-Skalierer -Datei $Datei -Ordner $Ordner -Hoehe $Hoehe -Output $Output -Dpi $Dpi -Ueberschreiben $Overwrite.IsPresent
    }
}

Stop-Transcript | Out-Null
exit $exitCode
