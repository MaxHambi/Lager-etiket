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

# Hinweis: -Debug ist bereits ein von [CmdletBinding()] automatisch bereitgestellter
# gemeinsamer Parameter (setzt $DebugPreference) - deshalb hier nicht erneut als
# eigener [switch]$Debug deklariert, sondern ueber $PSBoundParameters abgegriffen.
$DebugModus = $PSBoundParameters.ContainsKey('Debug')
if ($DebugModus) { $DebugPreference = 'Continue' }

$ErrorActionPreference = "Stop"
$scriptDir  = Split-Path -Parent $MyInvocation.MyCommand.Path
# CLI-Skripte liegen im Monorepo unter packages/tools (self-contained:
# Templates, config.json, Eintragslisten und output/ liegen dort ebenfalls)
$toolsDir            = Join-Path $scriptDir "packages\tools"
$mainScript          = Join-Path $toolsDir "barcode.mjs"
$skalierenScript    = Join-Path $toolsDir "skalieren.mjs"
$pruefenScript      = Join-Path $toolsDir "pruefen.mjs"
$konvertierenScript = Join-Path $toolsDir "konvertieren.mjs"
# Standard-Config ebenfalls im tools-Ordner suchen, wenn nicht explizit gesetzt
if ($Config -eq "config.json") { $Config = Join-Path $toolsDir "config.json" }

# --- Protokollierung: jeder Lauf wird vollstaendig in eine Log-Datei geschrieben ---
$logDir = Join-Path $scriptDir "log"
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
        [bool]$Ueberschreiben,
        [bool]$Debuggen = $false
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
    if ($Debuggen) { $nodeArgs += "--debug" }

    # Wichtig: "& node @nodeArgs" NICHT direkt als letzte Anweisung stehen
    # lassen. Wird das Ergebnis dieser Funktion einer Variable zugewiesen
    # (wie unten bei "$exitCode = Invoke-Generator ..."), fasst PowerShell
    # ALLE waehrend der Funktion erzeugten Ausgabeobjekte zusammen - also
    # auch jede einzelne Konsolenzeile von node/winston - nicht nur den
    # "return"-Wert. $exitCode wuerde dann zu einem Array aus Log-Text plus
    # Exitcode statt einer einfachen Zahl, wodurch spaeter "$exitCode -eq 0"
    # falsch auswertet und (a) das Aktionsmenue nie erscheint und (b) die
    # eigentliche node-Ausgabe auf der Konsole verschwindet, statt live
    # angezeigt zu werden. Durch die explizite Weiterleitung an Write-Host
    # (Konsole+Fehlerstrom zusammengefuehrt via 2>&1) bleibt die Ausgabe
    # sofort sichtbar, ohne den Funktions-Rueckgabewert zu verunreinigen.
    & node @nodeArgs 2>&1 | ForEach-Object { Write-Host $_ }
    return $LASTEXITCODE
}

function Invoke-Skalieren {
    param([string]$QuellOrdner, [bool]$Debuggen = $false)

    if (-not (Test-Path $skalierenScript)) {
        Write-Warning "skalieren.mjs wurde nicht gefunden unter: $skalierenScript"
        return
    }

    $hoehe = Read-Host "Zielhoehe in mm"
    if ([string]::IsNullOrWhiteSpace($hoehe)) {
        Write-Host "Keine Zielhoehe angegeben. Abbruch."
        return
    }

    $standardZiel = Join-Path $QuellOrdner "skaliert"
    $ziel = Read-Host "Zielordner (Enter = $standardZiel)"
    if ([string]::IsNullOrWhiteSpace($ziel)) { $ziel = $standardZiel }

    $antwort = Read-Host "Vorhandene Dateien ueberschreiben? (j/N)"
    $overwriteFlag = ($antwort -match '^[jJ]')

    $nodeArgs = @($skalierenScript, "--ordner", $QuellOrdner, "--hoehe", $hoehe, "--output", $ziel)
    if ($overwriteFlag) { $nodeArgs += "--overwrite" }
    if ($Debuggen) { $nodeArgs += "--debug" }

    Write-Host ""
    # Wie bei Invoke-Generator: explizit an Write-Host weiterleiten, damit
    # die Ausgabe live sichtbar bleibt und nicht in einen Funktions- oder
    # Schleifen-Rueckgabewert einfliesst (wichtig, seit Show-Aktionsmenue in
    # einer Schleife wiederholt aufgerufen wird).
    & node @nodeArgs 2>&1 | ForEach-Object { Write-Host $_ }
}

function Invoke-Pruefen {
    param([string]$QuellOrdner, [string]$Eintraege, [bool]$Debuggen = $false)

    if (-not (Test-Path $pruefenScript)) {
        Write-Warning "pruefen.mjs wurde nicht gefunden unter: $pruefenScript"
        return
    }

    $nodeArgs = @($pruefenScript, "--ordner", $QuellOrdner)

    if (-not [string]::IsNullOrWhiteSpace($Eintraege) -and (Test-Path $Eintraege)) {
        $antwort = Read-Host "Vollstaendigkeit gegen '$Eintraege' pruefen? (J/n)"
        if ($antwort -notmatch '^[nN]') {
            $nodeArgs += "--eintraege"
            $nodeArgs += $Eintraege
        }
    }
    if ($Debuggen) { $nodeArgs += "--debug" }

    Write-Host ""
    # Wie bei Invoke-Generator: explizit an Write-Host weiterleiten, damit
    # die Ausgabe live sichtbar bleibt und nicht in einen Funktions- oder
    # Schleifen-Rueckgabewert einfliesst (wichtig, seit Show-Aktionsmenue in
    # einer Schleife wiederholt aufgerufen wird).
    & node @nodeArgs 2>&1 | ForEach-Object { Write-Host $_ }
}

function Invoke-Konvertieren {
    param([string]$QuellOrdner, [bool]$Debuggen = $false)

    if (-not (Test-Path $konvertierenScript)) {
        Write-Warning "konvertieren.mjs wurde nicht gefunden unter: $konvertierenScript"
        return
    }

    $standardZiel = Join-Path $QuellOrdner "konvertiert"
    $ziel = Read-Host "Zielordner (Enter = $standardZiel)"
    if ([string]::IsNullOrWhiteSpace($ziel)) { $ziel = $standardZiel }

    $hintergrund = Read-Host "Hintergrundfarbe fuer Transparenz (Enter = #ffffff)"
    if ([string]::IsNullOrWhiteSpace($hintergrund)) { $hintergrund = "#ffffff" }

    $antwort = Read-Host "Vorhandene Dateien ueberschreiben? (j/N)"
    $overwriteFlag = ($antwort -match '^[jJ]')

    $nodeArgs = @($konvertierenScript, "--ordner", $QuellOrdner, "--output", $ziel, "--hintergrund", $hintergrund)
    if ($overwriteFlag) { $nodeArgs += "--overwrite" }
    if ($Debuggen) { $nodeArgs += "--debug" }

    Write-Host ""
    # Wie bei Invoke-Generator: explizit an Write-Host weiterleiten, damit
    # die Ausgabe live sichtbar bleibt und nicht in einen Funktions- oder
    # Schleifen-Rueckgabewert einfliesst (wichtig, seit Show-Aktionsmenue in
    # einer Schleife wiederholt aufgerufen wird).
    & node @nodeArgs 2>&1 | ForEach-Object { Write-Host $_ }
}

function Show-Aktionsmenue {
    param([string]$AusgabeOrdnerPfad, [string]$EintraegeDateiPfad, [bool]$Debuggen = $false)

    # Laeuft in einer Schleife, damit nacheinander mehrere Aktionen ausgefuehrt
    # werden koennen (z. B. erst Skalieren, danach gleich noch Pruefen), ohne
    # das Skript jedes Mal neu zu starten. Beendet wird die Schleife nur durch
    # explizite Auswahl von "0" oder durch einfaches Enter (leere Eingabe).
    while ($true) {
        Write-Host ""
        Write-Host "Was moechtest du als Naechstes tun?"
        Write-Host "  (1) Skalieren     - Schilder auf eine Zielhoehe (mm) skalieren"
        Write-Host "  (2) Pruefen       - Barcode scannen und Inhalt verifizieren"
        Write-Host "  (3) Konvertieren  - Bilder normalisieren (Transparenz entfernen, sRGB, 8-Bit-PNG)"
        Write-Host "  (0) Fertig / Verlassen"
        Write-Host ""
        $wahl = Read-Host "Auswahl (0-3)"

        if ([string]::IsNullOrWhiteSpace($wahl) -or $wahl -eq "0") {
            return
        }

        switch ($wahl) {
            "1" { Invoke-Skalieren -QuellOrdner $AusgabeOrdnerPfad -Debuggen $Debuggen }
            "2" { Invoke-Pruefen -QuellOrdner $AusgabeOrdnerPfad -Eintraege $EintraegeDateiPfad -Debuggen $Debuggen }
            "3" { Invoke-Konvertieren -QuellOrdner $AusgabeOrdnerPfad -Debuggen $Debuggen }
            default { Write-Host "Ungueltige Auswahl. Bitte 0, 1, 2 oder 3 eingeben." }
        }
    }
}

$exitCode = 0

# -Debug (gemeinsamer Parameter) selbst zaehlt bereits als "gebundener Parameter" -
# fuer die Erkennung des interaktiven Modus wird er deshalb hier herausgerechnet,
# damit ".\barcode.ps1 -Debug" (ohne weitere Parameter) weiterhin interaktiv startet.
$gebundenOhneDebug = $PSBoundParameters.Count - [int]$DebugModus

if ($gebundenOhneDebug -eq 0) {

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

    $exitCode = Invoke-Generator -Eintraege $EintraegeDatei -Vorlage $VorlageDatei -Ausgabe $AusgabeOrdner -Cfg $Config -Ueberschreiben $ueberschreibenFlag -Debuggen $DebugModus

    Write-Host ""
    Write-Host "Fertig. Protokoll gespeichert unter: $logFile"

    if ($exitCode -eq 0) {
        Show-Aktionsmenue -AusgabeOrdnerPfad $AusgabeOrdner -EintraegeDateiPfad $EintraegeDatei -Debuggen $DebugModus
    }

    Write-Host ""
    Read-Host "Enter druecken, um das Fenster zu schliessen"

}
else {

    # ================= Direkter Modus (mit Parametern) =================
    if ([string]::IsNullOrWhiteSpace($EintraegeDatei) -or [string]::IsNullOrWhiteSpace($VorlageDatei) -or [string]::IsNullOrWhiteSpace($AusgabeOrdner)) {
        Write-Error "Verwendung: .\barcode.ps1 <Eintraege-Datei> <Vorlage-Datei> <Ausgabe-Ordner> [-Config config.json] [-Overwrite] [-Debug]"
        $exitCode = 1
    }
    else {
        $exitCode = Invoke-Generator -Eintraege $EintraegeDatei -Vorlage $VorlageDatei -Ausgabe $AusgabeOrdner -Cfg $Config -Ueberschreiben $Overwrite.IsPresent -Debuggen $DebugModus
    }
}

Stop-Transcript | Out-Null
exit $exitCode
