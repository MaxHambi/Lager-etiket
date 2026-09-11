# Lager-Barcode-Generator

Erzeugt aus einer Liste von Lagerplatz-Bezeichnungen (z. B. `01A01`) fertige
Etiketten-Bilder: pro Zeile ein **Code-128-Barcode** mit lesbarem Klartext
darunter, mittig zentriert in einer eigenen PNG-Vorlage.

Es gibt zwei gleichwertige Wege, das Tool zu benutzen:

| Werkzeug | Wofür |
|---|---|
| `barcode.ps1` / `barcode.mjs` (PowerShell / Node.js) | Produktionsläufe, große Stückzahlen, automatisierbar |
| `Lagerplatz-Barcode-Generator.html` | Schnelle Einzeltests oder kleine Stapel direkt im Browser, komplett offline, keine Installation |

Beide verwenden **exakt dieselbe Positionierungs- und Skalierungslogik**, damit
Ergebnisse aus beiden Wegen identisch aussehen.

---

## Inhaltsverzeichnis

1. [Projektstruktur](#projektstruktur)
2. [Voraussetzungen](#voraussetzungen)
3. [Schnellstart (PowerShell/Node)](#schnellstart-powershellnode)
4. [Schnellstart (HTML-Tool)](#schnellstart-html-tool)
5. [Eintragsdatei-Format](#eintragsdatei-format)
6. [config.json — alle Einstellungen](#configjson--alle-einstellungen)
7. [Workflow: Neue Vorlage einrichten](#workflow-neue-vorlage-einrichten)
8. [Workflow: Layout anpassen](#workflow-layout-anpassen)
9. [Workflow: config.json ändern](#workflow-configjson-ändern)
10. [Workflow: Skript (barcode.mjs) ändern](#workflow-skript-barcodemjs-ändern)
11. [Workflow: HTML-Tool anpassen](#workflow-html-tool-anpassen)
12. [Fertige Schilder nachträglich skalieren (skalieren.mjs)](#fertige-schilder-nachträglich-skalieren-skalierenmjs)
13. [Barcode automatisch scannen & prüfen (pruefen.mjs)](#barcode-automatisch-scannen--prüfen-pruefenmjs)
14. [Bilder normalisieren (konvertieren.mjs)](#bilder-normalisieren-konvertierenmjs)
15. [Logging & --debug](#logging--debug)
16. [Kommandozeilen-Referenz](#kommandozeilen-referenz)
17. [Troubleshooting](#troubleshooting)
18. [Produktionsprüfung vor dem großen Lauf](#produktionsprüfung-vor-dem-großen-lauf)
19. [Quellen / Lizenzen](#quellen--lizenzen)

---

## Projektstruktur

```text
lager-barcode-generator/
├── barcode.ps1                          PowerShell-Wrapper (interaktiv + Parameter); bietet am Ende ein
│                                          Auswahlmenü für Skalieren/Prüfen/Konvertieren an
├── barcode.mjs                           Eigentliche Generator-Logik (Node.js)
├── skalieren.mjs                         Skalierungs-Logik (Node.js, Zielhöhe in mm), direkt per `node`
│                                          ausgeführt — normalisiert Bilder vor dem Skalieren automatisch
├── pruefen.mjs                           Prüflogik (Node.js, dekodiert Code 128 per zxing-wasm), direkt
│                                          per `node` ausgeführt — normalisiert Bilder vor dem Scan automatisch
├── konvertieren.mjs                      Bild-Normalisierung (Transparenz entfernen, sRGB, 8-Bit-PNG);
│                                          eigenständig nutzbar UND automatisch von skalieren.mjs/pruefen.mjs verwendet
├── logger.mjs                            Gemeinsames Logging-Modul (winston) für alle .mjs-Skripte —
│                                          nicht direkt aufrufen, wird von den anderen Skripten importiert
├── config.json                           Layout-Konfiguration (Barcode, Position, Ausgabe)
├── eintraege.txt                         Liste der Lagerplätze, eine pro Zeile
├── package.json / package-lock.json      Node-Abhängigkeiten (etiket, sharp, zxing-wasm, winston)
├── templates/                            Eigene PNG-Vorlagen hier ablegen
│   ├── MV-AB.png
│   └── MV-C.png
├── output/                               Fertige Schilder landen hier
├── log/                                  Protokoll jedes einzelnen Skriptlaufs (barcode/skalieren/pruefen/
│                                          konvertieren.mjs), siehe [Logging & --debug](#logging--debug)
├── logs/                                 Vollständiges PowerShell-Transkript jedes barcode.ps1-Laufs
│                                          (eigener, älterer Mechanismus — nicht zu verwechseln mit log/)
├── Lagerplatz-Barcode-Generator.html     Interaktives Offline-Tool für den Browser
└── README.md                             Diese Anleitung
```

`skalieren.ps1` und `pruefen.ps1` (PowerShell-Wrapper) gibt es bewusst nicht
mehr — `skalieren.mjs` und `pruefen.mjs` werden direkt per `node` aufgerufen.
`barcode.ps1` selbst bleibt erhalten und bietet nach jedem erfolgreichen Lauf
ein Menü an, über das sich Skalieren, Prüfen und Konvertieren ohne manuellen
`node`-Aufruf anstoßen lassen (siehe
[Kommandozeilen-Referenz](#kommandozeilen-referenz)).

---

## Voraussetzungen

- **Nur für den PowerShell/Node-Weg:** Node.js **24 oder neuer**
  ([nodejs.org](https://nodejs.org)), Windows PowerShell.
- **Für das HTML-Tool:** nichts weiter als ein aktueller Browser (Chrome,
  Edge, Firefox). Keine Installation, keine Internetverbindung nötig.

Nach der Node-Installation einmalig prüfen:

```powershell
node --version   # muss >= 24 sein
npm --version
```

---

## Schnellstart (PowerShell/Node)

```powershell
cd C:\Lager\lager-barcode-generator
npm install                # nur einmalig, benötigt Internet
npm test                    # Selbsttest: 3 Beispielschilder in self-test\output

.\barcode.ps1 .\eintraege.txt .\templates\vorlage1.png .\output
```

Ohne Parameter gestartet (`.\barcode.ps1`) fragt das Skript interaktiv nach
Eintragsdatei, Vorlage und Ausgabeordner und öffnet dafür bei Bedarf
Dateiauswahl-Dialoge.

Ergebnis: für jede Zeile in `eintraege.txt` entsteht eine Datei
`output\lagerplatz_<Eintrag>.png`.

---

## Schnellstart (HTML-Tool)

1. `Lagerplatz-Barcode-Generator.html` per Doppelklick öffnen (startet im
   Standardbrowser).
2. Vorlage per Klick oder Drag & Drop in die Dropzone laden.
3. Lagerplätze eintragen oder per „Datei laden (.txt)" importieren.
4. Layout bei Bedarf anpassen (siehe [config.json](#configjson--alle-einstellungen) —
   dieselben Felder stehen im Formular).
5. „Vorschau erzeugen" zum Testen eines einzelnen Eintrags.
6. „Alle Schilder erzeugen" → danach „Alle als ZIP herunterladen".

Die aktuelle Konfiguration lässt sich im HTML-Tool über „config.json
exportieren" sichern und über „config.json laden" wieder einspielen — so
lassen sich Einstellungen zwischen Browser-Tool und PowerShell-Skript
austauschen.

---

## Eintragsdatei-Format

Reine Textdatei, UTF-8, ein Lagerplatz pro Zeile:

```text
# Kommentarzeilen beginnen mit #
01A01
01A02
01A03
02B01
```

Regeln:

- Ein Eintrag pro Zeile.
- Führende Nullen bleiben erhalten (`01A01` bleibt `01A01`).
- Leerzeilen werden ignoriert.
- Zeilen, die mit `#` beginnen, sind Kommentare und werden ignoriert.
- **Doppelte Einträge führen absichtlich zum Abbruch** (`barcode.mjs`,
  Funktion `readEntries`) — so werden nie versehentlich zwei Schilder mit
  demselben Barcode erzeugt. Fehlermeldung nennt Zeilennummer und Datei.

---

## config.json — alle Einstellungen

```json
{
  "barcode": {
    "height": 180,
    "barWidth": 4,
    "margin": 20,
    "fontSize": 54,
    "fontFamily": "Arial, Helvetica, sans-serif",
    "color": "#000000",
    "background": "transparent",
    "textMargin": 6
  },
  "placement": {
    "area": { "left": 642, "top": 50, "width": 1068, "height": 756 },
    "maxWidthPercent": 90,
    "maxHeightPercent": 90,
    "offsetX": 0,
    "offsetY": 0
  },
  "output": {
    "prefix": "lagerplatz_",
    "dpi": 300,
    "overwrite": false
  }
}
```

### `barcode` — Aussehen von Barcode + Text

| Feld | Bedeutung |
|---|---|
| `height` | Höhe der Barcode-Balken in Pixel |
| `barWidth` | Breite (Dicke) eines einzelnen Barcode-Moduls |
| `margin` | Innenabstand rund um Barcode + Text vor dem Zuschnitt |
| `fontSize` | Schriftgröße des Klartexts unter dem Barcode |
| `fontFamily` | Schriftfamilie des Klartexts |
| `color` | Farbe von Balken und Text (Hex) |
| `background` | Hintergrund des Barcode-Bilds selbst — `"transparent"` empfohlen |
| `textMargin` | Abstand zwischen Barcode-Balken und Klartext |

### `placement` — Position auf der Vorlage

| Feld | Bedeutung |
|---|---|
| `area.left` / `area.top` | Pixel-Offset der oberen linken Ecke des Zielbereichs auf der Vorlage |
| `area.width` / `area.height` | Größe des Zielbereichs in Pixel. **`null`** = automatisch bis zum Vorlagenrand (`Vorlagenbreite − left` bzw. `Vorlagenhöhe − top`) |
| `maxWidthPercent` / `maxHeightPercent` | Wie viel Prozent des Zielbereichs der Barcode maximal einnehmen darf. Relativ, passt sich also automatisch an, wenn sich der Zielbereich ändert |
| `offsetX` / `offsetY` | Zusätzliche Feinjustierung nach rechts/unten (auch negativ möglich) |

Der Barcode wird nie größer als die Vorlage selbst skaliert (`scale` ist immer
`≤ 1`, siehe `composeLabel` in `barcode.mjs`, Zeile 105) — er wird nur verkleinert,
nie über die Originalgröße hinaus vergrößert.

Passt der konfigurierte Zielbereich nicht in die tatsächliche Vorlagengröße,
geben sowohl `barcode.mjs`/`barcode.ps1` als auch das HTML-Tool automatisch
eine Warnung im Log aus (kein Abbruch, aber ein deutlicher Hinweis zum Nachjustieren).

### `output` — Dateiausgabe

| Feld | Bedeutung |
|---|---|
| `prefix` | Vorangestellter Text im Dateinamen, z. B. `lagerplatz_` → `lagerplatz_01A01.png` |
| `dpi` | In die PNG-Metadaten geschriebene Auflösung (wichtig für exaktes Druckformat) |
| `overwrite` | `true` = vorhandene Dateien im Ausgabeordner werden überschrieben. Kann pro Lauf auch über `-Overwrite` (PowerShell) übersteuert werden |

---

## Workflow: Neue Vorlage einrichten

1. PNG-Vorlage nach `templates\` kopieren.
2. Bereich hinter dem Barcode sollte weiß/hell und frei von Linien, Logos
   oder Mustern sein — die Ruhezonen links/rechts vom Barcode dürfen nicht
   überlagert werden, sonst leidet die Scanbarkeit.
3. Zielbereich in `config.json` festlegen — entweder:
   - **Automatisch:** `"width": null, "height": null` setzen → Bereich
     füllt automatisch alles ab `left`/`top` bis zum Vorlagenrand.
   - **Manuell:** feste Pixelwerte für `left`, `top`, `width`, `height`
     eintragen, z. B. wenn der Barcode nur in einer bestimmten Ecke stehen
     soll.
4. Mit 2–3 Testeinträgen einen Probelauf machen, bevor die volle Liste
   verarbeitet wird (siehe [Produktionsprüfung](#produktionsprüfung-vor-dem-großen-lauf)).

## Workflow: Layout anpassen

Häufige Anpassungen und welches Feld dafür zu ändern ist:

| Wunsch | Einstellung |
|---|---|
| Größere Barcode-Balken | `barcode.height` erhöhen |
| Breitere Barcode-Module | `barcode.barWidth` erhöhen |
| Größerer Klartext | `barcode.fontSize` erhöhen |
| Mehr Abstand zwischen Barcode und Text | `barcode.textMargin` erhöhen |
| Andere Schrift | `barcode.fontFamily` ändern |
| Barcode weiter nach unten/rechts verschieben | `placement.offsetY` / `placement.offsetX` erhöhen |
| Barcode kleiner relativ zur Vorlage | `placement.maxWidthPercent` / `maxHeightPercent` verkleinern |
| Barcode nur in einem Teilbereich der Vorlage | `placement.area.left/top/width/height` manuell setzen statt `null` |
| Vorlage ändert nur ihre Größe, Layout bleibt gleich | `width`/`height` auf `null` lassen — passt sich automatisch an |
| Andere Dateibenennung | `output.prefix` ändern |
| Andere Druckauflösung | `output.dpi` ändern |

Nach jeder Änderung: kurze Vorschau/Testlauf machen (PowerShell: 2–3
Testeinträge; HTML-Tool: „Vorschau erzeugen" für einen einzelnen Eintrag),
bevor der komplette Bestand erzeugt wird.

## Workflow: config.json ändern

1. `config.json` mit einem Texteditor öffnen.
2. Gewünschtes Feld ändern (siehe Tabellen oben). Gültiges JSON beachten —
   Kommas zwischen Feldern, keine Kommentare erlaubt.
3. Speichern.
4. Testlauf:
   ```powershell
   .\barcode.ps1 .\eintraege-test.txt .\templates\vorlage1.png .\test-output
   ```
   oder im HTML-Tool „config.json laden" verwenden, um die geänderte Datei
   direkt zu importieren und per „Vorschau erzeugen" zu prüfen.
5. Ergebnis visuell kontrollieren (Zentrierung, Lesbarkeit, keine Überlappung
   mit Vorlagenelementen).
6. Erst danach den vollständigen Bestand verarbeiten.

Eine eigene Konfiguration für eine zweite Vorlage lässt sich als separate
Datei speichern, z. B. `config-MV-C.json`, und gezielt aufrufen:

```powershell
.\barcode.ps1 .\eintraege.txt .\templates\MV-C.png .\output -Config config-MV-C.json
```

## Workflow: Skript (barcode.mjs) ändern

`barcode.mjs` enthält die komplette Erzeugungslogik in drei Funktionen:

| Funktion | Zuständig für |
|---|---|
| `readEntries()` | Einlesen und Validieren der Eintragsdatei (Duplikat-Prüfung, Kommentare, Leerzeilen) |
| `buildLabelPng()` | Erzeugen des Barcode-Bilds selbst (ruft `etiket`'s `barcode()` auf, rendert via `sharp`) |
| `composeLabel()` | Skalierung + Zentrierung des Barcodes im Zielbereich, Zusammenfügen mit der Vorlage |
| `main()` | Kommandozeilen-Argumente, Datei-Prüfungen, Schleife über alle Einträge |

Typische Änderungen:

- **Neues Ausgabeformat statt PNG:** in `composeLabel()`/`main()` `.png()`
  durch z. B. `.jpeg({ quality: 90 })` ersetzen (sharp unterstützt weitere
  Formate) und die Dateiendung in `main()` anpassen.
- **Andere Barcode-Symbologie:** `type: "code128"` im `barcode(...)`-Aufruf
  in `buildLabelPng()` ändern — sofern von `etiket` unterstützt.
- **Zusätzliche Metadaten ins Bild schreiben:** `.withMetadata({...})` in
  `composeLabel()` erweitern.

Vorgehen bei Änderungen:

1. Kopie der Original-Datei sichern (`barcode.mjs.bak`), damit ein Rollback
   möglich ist.
2. Änderung vornehmen.
3. Direkt über Node testen, ohne den PowerShell-Wrapper:
   ```powershell
   node .\barcode.mjs .\eintraege-test.txt .\templates\vorlage1.png .\test-output
   ```
4. Bei Fehlern gibt `main().catch(...)` (letzte Zeilen der Datei) die
   Fehlermeldung direkt in der Konsole aus.
5. Erst nach erfolgreichem Test den PowerShell-Wrapper (`barcode.ps1`) wieder
   verwenden — er ruft intern exakt dasselbe `barcode.mjs` auf.

`barcode.ps1` selbst muss für reine Layout-/Logik-Änderungen **nicht**
angepasst werden — es reicht immer, `barcode.mjs` bzw. `config.json` zu
ändern. Der PowerShell-Wrapper ist nur für Bedienung (interaktiver Modus,
Dateiauswahl-Dialoge, Protokollierung in `logs\`) zuständig.

## Workflow: HTML-Tool anpassen

Das HTML-Tool ist eine einzelne, in sich geschlossene Datei
(`Lagerplatz-Barcode-Generator.html`) mit eingebettetem CSS/JS und der
inline eingebetteten Bibliothek [JsBarcode](https://github.com/lindell/JsBarcode)
für die Code-128-Erzeugung im Browser. Die zentrale Logik
(`composeLabel()` in der Datei) ist bewusst identisch zu `barcode.mjs`
aufgebaut, damit beide Werkzeuge dieselben Ergebnisse liefern.

Wichtig bei Anpassungen:

- Änderungen direkt in der `<script>`-Sektion der HTML-Datei vornehmen (kein
  Build-Schritt nötig — einfach speichern und Browser neu laden/aktualisieren).
- Die Positions-/Skalierungsformel in `composeLabel()` sollte bei Änderungen
  an `barcode.mjs` synchron gehalten werden, sonst weichen Browser- und
  PowerShell-Ergebnisse voneinander ab.
- Da alles offline laufen soll, dürfen keine externen `<script src="https://...">`-
  Verweise eingefügt werden — neue Bibliotheken müssten wie JsBarcode direkt
  in die Datei eingebettet werden.
- Nach jeder Änderung: Datei im Browser neu laden, Vorlage laden,
  „Vorschau erzeugen" klicken und das Ergebnis visuell prüfen.

---

## Fertige Schilder nachträglich skalieren (skalieren.mjs)

Werden dieselben Schilder an unterschiedlichen Orten angebracht, ist oft eine
andere physische Größe nötig. `skalieren.mjs` skaliert bereits fertige
PNG-Schilder (Vorlage + Barcode, schon zusammengefügt) auf eine gewünschte
**Zielhöhe in Millimetern** — die Breite wird dabei exakt proportional
mitskaliert, das Seitenverhältnis bleibt unverändert. Vor dem Skalieren wird
jedes Bild automatisch über `konvertieren.mjs` normalisiert (siehe
[Bilder normalisieren](#bilder-normalisieren-konvertierenmjs)).

Es gibt keinen eigenen PowerShell-Wrapper mehr — `skalieren.mjs` wird direkt
per `node` aufgerufen. Über `barcode.ps1` lässt sich Skalieren nach jedem Lauf
aber weiterhin bequem über ein Menü anstatt per Kommandozeile anstoßen (siehe
[Kommandozeilen-Referenz](#kommandozeilen-referenz)).

### Verwendung

Einzelne Datei:

```powershell
node .\skalieren.mjs --datei .\output\lagerplatz_01A01.png --hoehe 15 --output .\output-15mm
```

Ganzer Ordner (alle `.png`-Dateien darin):

```powershell
node .\skalieren.mjs --ordner .\output --hoehe 15 --output .\output-15mm
```

### Wie die Umrechnung funktioniert

```text
Zielhöhe_px = round(Zielhöhe_mm / 25.4 * DPI)
Skalierungsfaktor = Zielhöhe_px / Originalhöhe_px
Zielbreite_px = round(Originalbreite_px * Skalierungsfaktor)
```

Die Umrechnung erfolgt standardmäßig mit **300 DPI** (identisch zur
Standard-Ausgabeauflösung von `barcode.mjs`) und lässt sich mit `-Dpi`
übersteuern, falls die Original-Schilder mit einer anderen Auflösung erzeugt
wurden. Die resultierende PNG-Datei erhält dieselbe DPI-Angabe in den
Metadaten, damit sie beim Drucken in tatsächlicher Größe exakt die
gewünschte Höhe ergibt.

### Bleibt der Barcode danach lesbar?

Ja — solange die Verkleinerung nicht zu extrem ausfällt. Das Skript skaliert
mit einem hochwertigen Resampling-Filter (`lanczos3`), das Barcode-Kanten
deutlich schärfer hält als einfache Verfahren. Wird ein Schild auf **unter
50 % der Originalgröße** verkleinert, gibt das Skript automatisch eine
Warnung aus, da die Barcode-Balken dann so dünn werden können, dass
Scanner Probleme bekommen. Beispiel aus einem echten Testlauf:

```text
Skaliert: lagerplatz_01A01.png  200x100 -> 94x47 px (47% der Originalgröße)
  Warnung: "lagerplatz_01A01.png" wird auf unter 50% der Originalgröße verkleinert. ...
```

Bei einer solchen Warnung unbedingt vor dem vollständigen Lauf ein paar
skalierte Testschilder mit einem echten Scanner prüfen (siehe
[Produktionsprüfung](#produktionsprüfung-vor-dem-großen-lauf)) — dieselbe
Grundregel gilt letztlich für jede Skalierung, auch ohne Warnung.

### Parameter-Referenz

| Option | Pflicht | Bedeutung |
|---|---|---|
| `--datei` | ja (oder `--ordner`) | Pfad zu einem einzelnen fertigen Schild (PNG) |
| `--ordner` | ja (oder `--datei`) | Ordner mit mehreren fertigen Schildern — alle `.png`-Dateien darin werden verarbeitet |
| `--hoehe` | ja | Zielhöhe in Millimetern |
| `--output` | ja | Ausgabeordner für die skalierten Schilder (wird bei Bedarf angelegt) |
| `--dpi` | nein | Auflösung für die mm→Pixel-Umrechnung, Standard `300` |
| `--overwrite` | nein | Vorhandene Dateien im Ausgabeordner überschreiben |
| `--debug` | nein | Höchste Logging-Stufe aktivieren (siehe [Logging & --debug](#logging--debug)) |

`--datei` und `--ordner` schließen sich gegenseitig aus — es muss genau eine
der beiden Optionen angegeben werden.

```powershell
node .\skalieren.mjs --ordner .\output --hoehe 15 --output .\output-15mm --dpi 300 --overwrite
```

---

## Barcode automatisch scannen & prüfen (pruefen.mjs)

Statt nur nach Augenmaß zu prüfen, ob ein Barcode noch "gut aussieht",
dekodiert `pruefen.mjs` den Barcode auf einem fertigen
Schild wirklich — also so, wie es später ein Scanner im Lager tun würde —
und vergleicht das Ergebnis mit dem erwarteten Lagerplatz-Code. Das
funktioniert für frisch erzeugte Schilder aus `barcode.mjs` genauso wie für
bereits skalierte Schilder aus `skalieren.mjs` — damit lässt sich nach jeder
Skalierung automatisiert bestätigen, dass der Barcode noch korrekt lesbar
ist. Vor dem Scan wird jedes Bild automatisch über `konvertieren.mjs`
normalisiert (siehe [Bilder normalisieren](#bilder-normalisieren-konvertierenmjs)).

### Verwendung

Einzelne Datei (erwarteter Code wird automatisch aus dem Dateinamen abgeleitet):

```powershell
node .\pruefen.mjs --datei .\output\lagerplatz_01A01.png
```

Ganzer Ordner, inklusive Vollständigkeitsabgleich gegen die Eintragsdatei
und CSV-Bericht:

```powershell
node .\pruefen.mjs --ordner .\output-15mm --eintraege .\eintraege.txt --report .\pruefbericht.csv
```

Die Konsolen-Ausgabe zeigt für jedes Schild Dateiname, erwarteten Code,
tatsächlich dekodierten Code und einen Status (`OK` / `FEHLER`), zum
Beispiel:

```text
Datei                 Erwartet   Dekodiert   Status  Hinweis
--------------------------------------------------------------------------------
lagerplatz_01A01.png  01A01      01A01       OK
lagerplatz_01A02.png  01A02      01A02       OK

2 von 2 Schildern korrekt geprüft.
```

Wird ein Barcode gar nicht gefunden oder stimmt der dekodierte Text nicht
mit dem erwarteten Lagerplatz-Code überein, meldet das Skript `FEHLER` für
dieses Schild und beendet sich am Ende mit Exit-Code `1` — nützlich, um den
Lauf z. B. in einem eigenen Batch-Skript automatisch abzubrechen, falls
irgendein Schild nicht in Ordnung ist.

### Woher der Decoder kommt

Zum Dekodieren wird [`zxing-wasm`](https://www.npmjs.com/package/zxing-wasm)
verwendet — ein WebAssembly-Port der etablierten ZXing-Bibliothek. Das ist
kein zufällig gewähltes Werkzeug: Das `etiket`-Projekt, das für die
Barcode-Erzeugung in `barcode.mjs`/`skalieren.mjs` sorgt, verifiziert seine
eigenen erzeugten Code-128-Barcodes in seiner Testsuite ebenfalls per
Round-Trip-Scan mit `zxing-wasm` (neben `rxing` und `gozxing`) — siehe die
[etiket-Projektseite](https://github.com/productdevbook/etiket), Abschnitt
"Verified formats". `pruefen.mjs` wendet also denselben Prüfansatz auf die
fertigen, bereits mit der Vorlage zusammengesetzten Schilder an. `zxing-wasm`
läuft rein in WebAssembly ohne native Abhängigkeiten (kein `zbar`/`libzbar`
nötig) und funktioniert identisch unter Windows, macOS und Linux.

### Einmalige Einrichtung

`zxing-wasm` muss einmalig als Abhängigkeit installiert werden:

```powershell
cd C:\Lager\lager-barcode-generator
npm install zxing-wasm
```

Danach steht `pruefen.mjs` wie gewohnt zur Verfügung.

### Wie zuverlässig ist die Prüfung bei kleinen Schildern?

Bei eigenen Tests mit einem echten, produktionsgroßen Schild (2362×856 px,
DPI 300) wurde derselbe Barcode-Inhalt bis herunter zu einer skalierten
Zielhöhe von 15mm noch zuverlässig korrekt dekodiert, bei 10mm und darunter
nicht mehr. Dieser konkrete Schwellenwert gilt nur für diesen einen Test und
hängt von Vorlage, Barcode-Länge und `config.json`-Einstellungen
(`moduleSize` etc.) ab — er ersetzt keine eigene Prüfung. Genau deshalb ist
`pruefen.mjs` nach jeder Skalierung hilfreich: Statt sich auf einen
pauschalen Prozentsatz zu verlassen, wird für jedes tatsächlich erzeugte
Schild einzeln bestätigt, ob der Barcode noch korrekt ausgelesen werden
kann. Eine erfolgreiche Software-Dekodierung ist ein starkes Indiz, ersetzt
aber bei sehr kleinen oder für den späteren Einsatzort kritischen Schildern
nicht den echten Scannertest aus der
[Produktionsprüfung](#produktionsprüfung-vor-dem-großen-lauf).

### Parameter-Referenz

| Option | Pflicht | Bedeutung |
|---|---|---|
| `--datei` | ja (oder `--ordner`) | Pfad zu einem einzelnen zu prüfenden Schild (PNG) |
| `--ordner` | ja (oder `--datei`) | Ordner mit mehreren Schildern — alle `.png`-Dateien darin werden geprüft |
| `--erwartet` | nein | Erwarteter Barcode-Inhalt (nur bei `--datei`; sonst aus Dateiname abgeleitet) |
| `--praefix` | nein | Dateiname-Präfix vor dem Lagerplatz-Code, Standard `lagerplatz_` (passend zu `config.json` → `output.prefix`) |
| `--eintraege` | nein | Pfad zu einer `eintraege.txt` — prüft zusätzlich, dass jeder dort gelistete Lagerplatz auch als korrekt lesbares Schild vorhanden ist |
| `--report` | nein | Schreibt das Ergebnis zusätzlich als CSV-Datei |
| `--debug` | nein | Höchste Logging-Stufe aktivieren (siehe [Logging & --debug](#logging--debug)) |

```powershell
node .\pruefen.mjs --ordner .\output-15mm --eintraege .\eintraege.txt --report .\pruefbericht.csv
```

---

## Bilder normalisieren (konvertieren.mjs)

`konvertieren.mjs` nimmt ein beliebiges Bild (PNG mit Transparenz, 16-Bit-
Farbtiefe, Paletten-PNG, ungewöhnliches ICC-Profil, ...) und macht daraus
ein robustes, einfaches Bild:

1. Ein eventuell vorhandener Alphakanal wird auf einem festen Hintergrund
   (Standard: Weiß) plattgemacht (`flatten`).
2. Der Farbraum wird auf sRGB vereinheitlicht.
3. Das Ergebnis wird als einfaches 8-Bit-PNG neu kodiert.

Das nimmt nachgelagerten Schritten — dem Barcode-Scan in `pruefen.mjs`, der
Skalierung in `skalieren.mjs` — von vornherein eine ganze Klasse
ungewöhnlicher Eingaben ab, die dort zu Problemen führen könnten (z. B.
wenn ein Barcode-Scanner mit transparenten oder exotisch kodierten PNGs
nicht zurechtkommt). **`pruefen.mjs` und `skalieren.mjs` verwenden diese
Normalisierung bereits automatisch** — ein manueller Aufruf ist normalerweise
nicht nötig. `konvertieren.mjs` steht aber auch eigenständig zur Verfügung,
z. B. um eine problematische Vorlage einmalig zu bereinigen.

### Verwendung

Einzelne Datei:

```powershell
node .\konvertieren.mjs --datei .\templates\vorlage1.png --output .\templates-normalisiert
```

Ganzer Ordner:

```powershell
node .\konvertieren.mjs --ordner .\output --output .\output-normalisiert
```

### Parameter-Referenz

| Option | Pflicht | Bedeutung |
|---|---|---|
| `--datei` | ja (oder `--ordner`) | Pfad zu einem einzelnen Bild |
| `--ordner` | ja (oder `--datei`) | Ordner mit mehreren Bildern (`.png`, `.jpg`, `.jpeg`, `.webp`, `.tif`, `.tiff`) |
| `--output` | ja | Ausgabeordner für die normalisierten PNGs (wird bei Bedarf angelegt) |
| `--hintergrund` | nein | Hintergrundfarbe für Transparenz, Standard `#ffffff` |
| `--overwrite` | nein | Vorhandene Dateien im Ausgabeordner überschreiben |
| `--debug` | nein | Höchste Logging-Stufe aktivieren (siehe [Logging & --debug](#logging--debug)) |

---

## Logging & --debug

Jedes der vier `.mjs`-Skripte (`barcode.mjs`, `skalieren.mjs`, `pruefen.mjs`,
`konvertieren.mjs`) protokolliert seinen Lauf über ein gemeinsames Modul
(`logger.mjs`, basiert auf [winston](https://github.com/winstonjs/winston))
gleichzeitig an zwei Stellen:

- **Konsole** — wie bisher, farbig, zur direkten Kontrolle während des Laufs.
- **Log-Datei** — zusätzlich unter `log/<skriptname>_<zeitstempel>.log`, z. B.
  `log/barcode_20260911_110152_483.log` (Zeitstempel bis auf die Millisekunde
  genau, damit zwei Läufe in derselben Sekunde nie dieselbe Datei
  überschreiben). Dieser `log/`-Ordner liegt direkt neben
  den Skripten und ist **nicht** derselbe wie `logs/` (Plural) — Letzterer
  enthält weiterhin die vollständigen PowerShell-Transkripte von
  `barcode.ps1`. Beide Ordner bestehen unabhängig voneinander.

Es gibt zwei Logging-Stufen:

| Stufe | Wann aktiv | Was wird erfasst |
|---|---|---|
| **Normal** (Standard) | ohne `--debug` | Allgemeine, nützliche Informationen: Start/Ende eines Laufs, Anzahl verarbeiteter Dateien, Ergebnis je Datei, Warnungen, Fehler |
| **Debug** (höchste Stufe) | mit `--debug` | Zusätzlich alle Detailinformationen: geparste Kommandozeilen-Argumente, geladene `config.json`, Bildmetadaten vor/nach der Normalisierung, genaue Skalierungs- und Platzierungsberechnungen, rohe Dekodier-Treffer bei der Prüfung, Timing pro Datei und pro Lauf, vollständige Fehler-Stacktraces |

Beispiel:

```powershell
# Normal — allgemeine Informationen
node .\pruefen.mjs --ordner .\output

# Debug — maximale Detailtiefe, zusätzlich in log/pruefen_<zeitstempel>.log
node .\pruefen.mjs --ordner .\output --debug
```

Die Konsolen-Ausgabe im Normal-Modus bleibt dabei unverändert zum bisherigen
Verhalten — `--debug` fügt nur zusätzliche `[DEBUG]`-Zeilen hinzu und schreibt
mehr Details in die Log-Datei; nichts, was vorher sichtbar war, verschwindet.

Jeder Lauf erzeugt eine eigene, neue Log-Datei (Zeitstempel im Dateinamen) —
alte Log-Dateien werden nie überschrieben oder automatisch gelöscht. Bei
vielen Läufen empfiehlt es sich, den `log/`-Ordner von Zeit zu Zeit manuell
aufzuräumen.

### Warum winston statt eines Eigenbaus

[winston](https://www.npmjs.com/package/winston) ist eine etablierte,
weit verbreitete Node.js-Logging-Bibliothek (mehrere Millionen wöchentliche
Downloads) mit nativer Unterstützung für mehrere gleichzeitige Ziele
("Transports") — hier Konsole **und** Datei parallel —, Log-Stufen-Filterung
und flexiblem, gut lesbarem Textformat. Das ursprünglich vorgeschlagene
Paket [`abstract-logging`](https://www.npmjs.com/package/abstract-logging)
wurde geprüft, ist aber für diesen Zweck nicht geeignet: Es ist laut eigener
Beschreibung nur eine No-Op-Schnittstelle ("This module provides an
interface for modules to include so that they can support logging via an
external logger... All methods are no operation functions") — ein reiner
Platzhalter für Bibliotheken, die selbst keinen Logger mitbringen wollen. Es
schreibt nichts in eine Datei und kennt keine Stufen, weshalb winston hier
die passende Wahl ist.

### Einmalige Einrichtung

`winston` muss einmalig als Abhängigkeit installiert werden (wie zuvor schon
bei `zxing-wasm`):

```powershell
cd C:\Lager\lager-barcode-generator
npm install winston
```

Danach steht das Logging in allen vier Skripten automatisch zur Verfügung —
keine weitere Einrichtung nötig.

---

## Kommandozeilen-Referenz

```powershell
.\barcode.ps1 <Eintraege-Datei> <Vorlage-Datei> <Ausgabe-Ordner> [-Config <Pfad>] [-Overwrite] [-Debug]
```

| Parameter | Pflicht | Bedeutung |
|---|---|---|
| `Eintraege-Datei` | ja | Pfad zur `.txt`-Datei mit den Lagerplätzen |
| `Vorlage-Datei` | ja | Pfad zur PNG-Vorlage |
| `Ausgabe-Ordner` | ja | Zielordner für die fertigen Schilder (wird bei Bedarf angelegt) |
| `-Config` | nein | Alternative `config.json`, Standard: `config.json` im Skriptordner |
| `-Overwrite` | nein | Vorhandene Dateien im Ausgabeordner überschreiben |
| `-Debug` | nein | Wird durchgereicht an `node barcode.mjs --debug` — höchste Logging-Stufe (siehe [Logging & --debug](#logging--debug)) |

Ohne jeden Parameter startet der interaktive Modus mit Dateiauswahl-Dialogen.

### Aktionsmenü nach dem interaktiven Lauf

Wird `barcode.ps1` **ohne Parameter** (also im interaktiven Modus) gestartet
und die Schilder wurden erfolgreich erzeugt, erscheint am Ende automatisch
ein Auswahlmenü:

```text
Was möchtest du als Nächstes tun?
  (1) Skalieren
  (2) Prüfen
  (3) Konvertieren
  (0) Fertig / Verlassen
Auswahl (0-3):
```

| Auswahl | Wirkung |
|---|---|
| `1` Skalieren | Fragt nach Zielhöhe (mm), Zielordner (Standard `<Ausgabe>\skaliert`) und ob überschrieben werden soll, dann `node skalieren.mjs ...` |
| `2` Prüfen | Fragt optional nach der Eintragsdatei für den Vollständigkeitsabgleich, dann `node pruefen.mjs ...` |
| `3` Konvertieren | Fragt nach Zielordner (Standard `<Ausgabe>\konvertiert`), Hintergrundfarbe (Standard `#ffffff`) und ob überschrieben werden soll, dann `node konvertieren.mjs ...` |
| `0` / Enter | Menü verlassen, Skript endet |

Das Menü **erscheint nach jeder Aktion erneut** — du kannst also z. B. erst
`1` (Skalieren) und danach direkt noch `2` (Prüfen) wählen, ohne `barcode.ps1`
zwischendurch neu zu starten. Erst eine explizite `0` oder leeres Enter
beendet die Schleife.

Das Menü erscheint **nur im interaktiven Modus** — wird `barcode.ps1` mit
den drei Pflichtparametern (oder über `node barcode.mjs`) direkt aufgerufen,
z. B. aus einem eigenen Automatisierungs-Skript, entfällt es, damit
automatisierte Läufe nicht auf eine Benutzereingabe warten.

Direkter Aufruf ohne PowerShell (z. B. wenn `Set-ExecutionPolicy` blockiert):

```powershell
node .\barcode.mjs .\eintraege.txt .\templates\vorlage1.png .\output --config config.json --overwrite --debug
```

Falls PowerShell die Ausführung von `.ps1`-Dateien verweigert, einmalig:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

---

## Troubleshooting

| Problem | Ursache / Lösung |
|---|---|
| `Node.js wurde nicht gefunden` | Node.js installieren, PowerShell-Fenster neu öffnen |
| `Doppelter Eintrag "..." in Zeile N` | Eintragsdatei enthält denselben Lagerplatz zweimal — bewusst als Fehler, um doppelte Schilder zu verhindern; Duplikat entfernen |
| `Vorlagendatei nicht gefunden` / `Eintragsdatei nicht gefunden` | Pfad prüfen, ggf. mit Anführungszeichen bei Leerzeichen im Pfad |
| Warnung „Zielbereich ... reicht über die Vorlagengröße ... hinaus" | `placement.area` in `config.json` passt nicht zur tatsächlichen Vorlagengröße — Werte anpassen oder `width`/`height` auf `null` setzen |
| Schild wird nicht überschrieben | `output.overwrite` ist `false` und `-Overwrite` wurde nicht gesetzt — Datei existiert bereits im Ausgabeordner |
| Barcode scannt schlecht | Ruhezonen (freier Bereich links/rechts vom Barcode) durch Vorlagenelemente überlappt, Vorlage zu dunkel/gemustert hinter dem Barcode, oder Etikett zu klein gedruckt — in tatsächlicher Größe drucken, nicht „An Seite anpassen" |
| HTML-Tool: Vorschau bleibt leer/weiß | Zielbereich (`left`/`top`/`width`/`height`) liegt außerhalb der geladenen Testvorlage — bei kleinen Testbildern `left`/`top` auf `0` setzen oder „Zielbereich automatisch" aktivieren |

---

## Produktionsprüfung vor dem großen Lauf

1. Zuerst nur 5 bis 10 Testschilder erzeugen.
2. Kurze, typische **und** besonders lange Lagerplatznummern testen.
3. Prüfen, ob Dateiname, sichtbarer Text und Scanner-Ergebnis übereinstimmen.
4. In tatsächlicher Größe drucken, nicht mit „An Seite anpassen".
5. Mit den real im Lager verwendeten Scannern testen.
6. Unter der tatsächlichen Lagerbeleuchtung und aus üblicher Entfernung testen.
7. Auch das endgültige Material bzw. die Laminierung testen.
8. Sicherstellen, dass die weißen Ruhezonen erhalten bleiben.
9. Barcodes nicht über Kanten, Falten, Nähte, raue oder stark reflektierende
   Flächen kleben.
10. Erst danach den vollständigen Durchlauf mit der kompletten Eintragsliste starten.

Nach erfolgreicher Abnahme: Skripte, `config.json`, Vorlage, Eintragsdatei
und `package-lock.json` gemeinsam archivieren, damit sich dieselben Schilder
später exakt reproduzieren lassen.

---

## Quellen / Lizenzen

- [etiket](https://github.com/productdevbook/etiket) — Barcode-/SVG-Erzeugung
  (PowerShell/Node-Weg)
- [sharp](https://github.com/lubien/sharp) / [sharp.pixelplumbing.com](https://sharp.pixelplumbing.com/) — Bildkomposition und PNG-Export
- [JsBarcode](https://github.com/lindell/JsBarcode) (MIT-Lizenz) — Code-128-
  Erzeugung im Browser, inline eingebettet im HTML-Tool
- [Node.js](https://nodejs.org) — Laufzeitumgebung für `barcode.mjs`
