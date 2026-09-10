[CmdletBinding()]
param(
    [Parameter(Position = 0)]
    [string]$EintraegeDatei,

    [Parameter(Position = 1)]
    [string]$VorlageDatei,

    [Parameter(Position = 2)]
    [string]$AusgabeOrdner,

    [string]$Config = "config.json",

    [switch]$Overwrite
)

$ErrorActionPreference = "Stop"
$scriptDir  = Split-Path -Parent $MyInvocation.MyCommand.Path
$mainScript = Join-Path $scriptDir "barcode.mjs"

# --- Protokollierung: jeder Lauf wird vollstaendig in eine Log-Datei geschrieben ---
$logDir = Join-Path $scriptDir "logs"
if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir | Out-Null }
$logFile = Join-Path $logDir ("lauf_{0}.log" -f (Get-Date -Format "yyyyMMdd_HHmmss"))
Start-Transcript -Path $logFile -Append | Out-Null

function Show-Banner {
    Clear-Host
    Write-Host @'
   ______          __    ______   ____     ________  _ __        __ 
  / ____/___  ____/ /__ <  /__ \ ( __ )   / ____/ /_(_) /_____  / /_
 / /   / __ \/ __  / _ \/ /__/ // __  |  / __/ / __/ / //_/ _ \/ __/
/ /___/ /_/ / /_/ /  __/ // __// /_/ /  / /___/ /_/ / ,< /  __/ /_  
\____/\____/\__,_/\___/_//____/\____/  /_____/\__/_/_/|_|\___/\__/  
   ______  __  ___              __  __                __    _       
  / ____ \/  |/  /___ __  __   / / / /___ _____ ___  / /_  (_)      
 / / __ `/ /|_/ / __ `/ |/_/  / /_/ / __ `/ __ `__ \/ __ \/ /       
/ / /_/ / /  / / /_/ />  <   / __  / /_/ / / / / / / /_/ / /        
\ \__,_/_/  /_/\__,_/_/|_|  /_/ /_/\__,_/_/ /_/ /_/_.___/_/         
 \____/
'@
    Write-Host ""
}

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

function Invoke-Generator {
    param(
        [string]$Eintraege,
        [string]$Vorlage,
        [string]$Ausgabe,
        [string]$Cfg,
        [bool]$Ueberschreiben
    )

    if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
        Write-Error "Node.js wurde nicht gefunden. Bitte Node.js 24 oder neuer installieren (https://nodejs.org) und PowerShell neu oeffnen."
        return 1
    }
    if (-not (Test-Path $mainScript)) {
        Write-Error "barcode.mjs wurde nicht gefunden unter: $mainScript"
        return 1
    }

    $nodeArgs = @($mainScript, $Eintraege, $Vorlage, $Ausgabe, "--config", $Cfg)
    if ($Ueberschreiben) { $nodeArgs += "--overwrite" }

    & node @nodeArgs
    return $LASTEXITCODE
}

$exitCode = 0

if ($PSBoundParameters.Count -eq 0) {

    # ================= Interaktiver Modus =================
    Show-Banner

    $EintraegeDatei = Read-Host "Pfad zur Eintraege-Datei (Enter = Dateiauswahl-Dialog)"
    if ([string]::IsNullOrWhiteSpace($EintraegeDatei)) {
        $EintraegeDatei = Select-FileDialog -Title "Eintraege-Datei auswaehlen" -Filter "Textdateien (*.txt)|*.txt|Alle Dateien (*.*)|*.*"
    }
    if ([string]::IsNullOrWhiteSpace($EintraegeDatei)) {
        Write-Host "Keine Eintraege-Datei ausgewaehlt. Abbruch."
        Stop-Transcript | Out-Null
        exit 1
    }

    $VorlageDatei = Read-Host "Pfad zur Vorlage-Datei (Enter = Dateiauswahl-Dialog)"
    if ([string]::IsNullOrWhiteSpace($VorlageDatei)) {
        $VorlageDatei = Select-FileDialog -Title "Vorlage-Datei auswaehlen" -Filter "PNG-Bilder (*.png)|*.png|Alle Dateien (*.*)|*.*"
    }
    if ([string]::IsNullOrWhiteSpace($VorlageDatei)) {
        Write-Host "Keine Vorlage-Datei ausgewaehlt. Abbruch."
        Stop-Transcript | Out-Null
        exit 1
    }

    $AusgabeOrdner = Read-Host "Ausgabeordner (Enter = Ordnerauswahl-Dialog)"
    if ([string]::IsNullOrWhiteSpace($AusgabeOrdner)) {
        $AusgabeOrdner = Select-FolderDialog -Description "Ausgabeordner auswaehlen"
    }
    if ([string]::IsNullOrWhiteSpace($AusgabeOrdner)) {
        Write-Host "Kein Ausgabeordner ausgewaehlt. Abbruch."
        Stop-Transcript | Out-Null
        exit 1
    }

    $antwort = Read-Host "Vorhandene Dateien ueberschreiben? (j/N)"
    $ueberschreibenFlag = ($antwort -match '^[jJ]')

    Write-Host ""
    Write-Host "Starte Verarbeitung ..."
    Write-Host "  Eintraege     : $EintraegeDatei"
    Write-Host "  Vorlage       : $VorlageDatei"
    Write-Host "  Ausgabe       : $AusgabeOrdner"
    Write-Host "  Ueberschreiben: $ueberschreibenFlag"
    Write-Host ""

    $exitCode = Invoke-Generator -Eintraege $EintraegeDatei -Vorlage $VorlageDatei -Ausgabe $AusgabeOrdner -Cfg $Config -Ueberschreiben $ueberschreibenFlag

    Write-Host ""
    Write-Host "Fertig. Protokoll gespeichert unter: $logFile"
    Read-Host "Enter druecken, um das Fenster zu schliessen"

}
else {

    # ================= Direkter Modus (mit Parametern) =================
    if ([string]::IsNullOrWhiteSpace($EintraegeDatei) -or [string]::IsNullOrWhiteSpace($VorlageDatei) -or [string]::IsNullOrWhiteSpace($AusgabeOrdner)) {
        Write-Error "Verwendung: .\barcode.ps1 <Eintraege-Datei> <Vorlage-Datei> <Ausgabe-Ordner> [-Config config.json] [-Overwrite]"
        $exitCode = 1
    }
    else {
        $exitCode = Invoke-Generator -Eintraege $EintraegeDatei -Vorlage $VorlageDatei -Ausgabe $AusgabeOrdner -Cfg $Config -Ueberschreiben $Overwrite.IsPresent
    }
}

Stop-Transcript | Out-Null
exit $exitCode