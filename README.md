# Lager-Barcode-Generator

Erzeugt aus einer Liste von Lagerplatz-Bezeichnungen (z. B. `01A01`) fertige
Etiketten-Bilder: pro Zeile ein **Code-128-Barcode** mit lesbarem Klartext
darunter.

## Architektur — Lagerplatz-Barcode-Generator (Monorepo)

Dieses Dokument beschreibt die Architektur des Projekts als **Monorepo**
(npm Workspaces + Turborepo): Module, Build-Pipeline, Authentifizierung
und Datenfluss.

---

## 1. Systemübersicht

```mermaid
graph TB
    subgraph Browser["Browser (100 % offline)"]
        direction TB
        HTML["index.html<br/>(Markup + CSS-Verweise)"]
        CSS["assets/css/<br/>base + components + theme"]
        JS["dist/app.js<br/>(esbuild-Bundle)"]

        subgraph App["Anwendung (Workspaces)"]
            direction TB
            ENTRY["apps/web — main.ts<br/>(Einstieg) + auth.ts (Login)"]
            UI["@lager-etiket/ui — DOM-Module<br/>Logger · TemplatePicker · EntriesUI<br/>ConfigUI · PreviewUI · GeneratorUI"]
            CORE["@lager-etiket/core — DOM-freie Logik<br/>entries · compose · barcode<br/>png · zip · crc32 · download"]
            TYPES["@lager-etiket/types<br/>AppConfig (kompatibel zu config.json)"]
        end

        WCRYPT["Web Crypto API<br/>(nur geschützter Build)"]
    end

    subgraph Build["Build (Node.js, lokal/CI)"]
        ESBUILD["esbuild"]
        NODECRYPT["node:crypto<br/>(AES-256-GCM)"]
    end

    INPUTS["Eingaben<br/>PNG-Vorlage · Eintragsliste · Formular"]
    OUTPUTS["Ausgaben<br/>PNG-Schilder · ZIP · config.json · Protokoll"]

    HTML --> JS
    HTML -.-> CSS
    JS --> ENTRY
    ENTRY --> UI
    ENTRY --> CORE
    CORE --> TYPES
    UI --> CORE

    INPUTS --> UI
    UI --> OUTPUTS
    CORE --> OUTPUTS

    ESBUILD --> JS
    NODECRYPT -.->|"nur mit --password"| JS
    WCRYPT -.->|"nur geschützter Build"| JS
```

---

## 2. Module und Verantwortlichkeiten

### @lager-etiket/core — DOM-freie Logik

Alle Funktionen sind rein bzw. arbeiten nur mit Blob/ArrayBuffer und sind
deshalb einzeln unit-testbar (`packages/core/test/`).

| Modul               | Exporte                                                     | Zweck                                                                                                                           |
| ------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `entries.ts`        | `parseEntries`, `sanitizeFileName`                          | Eintragsparsing (Kommentare, Trim, Duplikat-Abbruch), Dateinamen-Bereinigung                                                    |
| `validate.ts`       | `validateEntry`, `findInvalidEntries`, `MAX_CODE_LENGTH`    | **Eingabegate** (ADR-0003): Druckbarkeit + etiket-Encoder als finale Instanz, bevor ein Code gerendert wird                     |
| `errors.ts`         | `AppError`, `describeError`, etiket-Fehler-Re-Exports       | **Zentrale Fehlertaxonomie** (ADR-0004): etiket-Fehler + Projekt-Fehler + Meldungs-Mapper für alle Ausgabestellen               |
| `ranges.ts`         | `expandRange`, `findDuplicates`, `MAX_RANGE_SIZE`           | Start/Ende-Bereiche expandieren (Präfix + Ziffern-Suffix), Duplikate über Bereiche finden                                       |
| `compose.ts`        | `composeLabel` (async), `ComposeResult`                     | **Herzstück**: Skalierung + Zentrierung des Barcodes im Zielbereich; Formel bewusst identisch zu `barcode.mjs` (`composeLabel`) |
| `barcode.ts`        | `renderBarcodeSvg`, `renderBarcodeImage`, `canvasToPngBlob` | etiket-Wrapper (CODE128, SVG-Rendering; `renderBarcodeImage` rastert mit `renderDpi`, siehe ADR-0002)                           |
| `png.ts`            | `injectPhysDpi`                                             | pHYs-Chunk (DPI) in PNG injizieren                                                                                              |
| `zip.ts`            | `makeZip`, `ZipEntry`                                       | Store-only ZIP-Writer                                                                                                           |
| `crc32.ts`          | `crc32`                                                     | CRC32 (IEEE) für ZIP + PNG                                                                                                      |
| `config.ts` (in ui) | `readConfig`, `applyConfig`, `toggleAreaFields`             | Formular ↔ `AppConfig`                                                                                                          |
| `download.ts`       | `downloadBlob`                                              | Browser-Download auslösen                                                                                                       |

### @lager-etiket/ui — DOM-Module

| Modul                 | Klasse/Funktionen                            | Zuständig für                                                                                                                                    |
| --------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `dom.ts`              | `$()`                                        | `getElementById` mit Fehler bei fehlender ID                                                                                                     |
| `logger.ts`           | `Logger`                                     | Protokoll-Panel (info/ok/warn/err), Speichern als .txt                                                                                           |
| `splash.ts`           | `initSplash`                                 | Begrüßungs-Overlay bis Klick                                                                                                                     |
| `template-picker.ts`  | `TemplatePicker`                             | Dropzone, Vorlagen-Vorschau, Change-Events                                                                                                       |
| `entries-ui.ts`       | `EntriesUI`                                  | Textarea/.txt-Import, Duplikat-Anzeige, Vorschau-Select                                                                                          |
| `config-ui.ts`        | `ConfigUI`                                   | config.json Import/Export/Reset                                                                                                                  |
| `preview.ts`          | `PreviewUI`                                  | Einzelvorschau + Zielbereich-Overlay (Theme-Farbe `--preview-overlay`)                                                                           |
| `generator.ts`        | `GeneratorUI`                                | Stapel-Lauf (Batches mit je eigener Config), Progressbar, Thumbnails, ZIP-Download                                                               |
| `template-gallery.ts` | `TemplateGallery`                            | Vorlagen-Galerie aus `public/templates/templates.json`, klickbare Karten, `restoreLast()` für Persistenz                                         |
| `config-library.ts`   | `ConfigLibrary`                              | Dropdown aus `public/configs/configs.json`, lädt gewählte Config ins Formular, `applyDefault()` lädt den Projekt-Standard beim Start             |
| `theme.ts`            | `initThemeSwitcher`                          | Catppuccin-Theme-Umschalter (4 Flavors), Persistenz in localStorage, Initial-Fallback über `prefers-color-scheme` (hell → Latte, dunkel → Mocha) |
| `persistence.ts`      | `loadSetting` u. a.                          | Sichere localStorage-Helfer (try/catch, offline-tolerant)                                                                                        |
| `view-settings.ts`    | `initViewSettings`                           | Stellt Overlay-Modus („Zielbereich einzeichnen") und zuletzt gewählte Galerie-Vorlage beim Start wieder her                                      |
| `batches-ui.ts`       | `BatchesUI`                                  | Einzelfeld ↔ Unterkategorien-Umschalter, Start/Ende-Bereiche, Batch-Config-Dropdowns                                                             |
| `lightbox.ts`         | `initLightbox`, `openLightbox`               | Großansicht für Vorschau/Thumbnails (Klick, ×, Esc)                                                                                              |
| `auth-ui.ts`          | `showLogin`, `hideLogin`, `reportLoginError` | Login-Overlay (nur geschützter Build)                                                                                                            |

### Einstiegspunkte

| Datei                  | Wird gebaut als                             | Zweck                                                        |
| ---------------------- | ------------------------------------------- | ------------------------------------------------------------ |
| `apps/web/src/main.ts` | `npm run build:web` (unverschlüsselt)       | Direkte App-Initialisierung                                  |
| `apps/web/src/auth.ts` | `node build.mjs --password "…"` (geschützt) | Login + Entschlüsselung, führt dann das `main.ts`-Bundle aus |

---

## 3. Build-Pipeline

```mermaid
flowchart LR
    subgraph Quellcode
        SRC["packages/*/src/**/*.ts<br/>apps/web/src/**"]
        CSS["apps/web/assets/css/**"]
        HTML["apps/web/index.html"]
    end

    subgraph Entwicklung["Entwicklungs-Build (npm run build:web)"]
        TSC["tsc --noEmit<br/>(Typcheck)"]
        DEV["esbuild<br/>main.ts → dist/app.js<br/>(IIFE, Sourcemap)"]
    end

    subgraph Geschützt["Geschützter Build (node build.mjs --password)"]
        MIN["esbuild<br/>main.ts → IIFE (minifiziert)"]
        ENC["node:crypto<br/>PBKDF2-SHA256 ×210k<br/>AES-256-GCM"]
        VAULT["apps/web/src/generated/vault.ts<br/>(base64-Ciphertext, gitignored)"]
        LOADER["esbuild<br/>auth.ts + Vault → dist/app.js<br/>(ohne Sourcemap!)"]
    end

    SRC --> TSC
    TSC --> DEV
    DEV --> PLAIN["dist/app.js<br/>(Klartext, kein Login)"]

    SRC --> MIN
    MIN --> ENC
    ENC --> VAULT
    VAULT --> LOADER
    LOADER --> CIPHER["dist/app.js<br/>(Loader + Ciphertext)"]

    PLAIN & CIPHER --> GH["GitHub Pages<br/>(via sync-pages.yml)"]
    CSS --> GH
    HTML --> GH
```

**Regeln:**

- Im geschützten Modus wird **kein Sourcemap** erzeugt (would leak den
  Klartext) und minifiziert (kleinerer Ciphertext).
- `apps/web/src/generated/vault.ts` entsteht nur beim geschützten Build und ist
  gitignored — im Repository liegt niemals ein Ciphertext oder Passwort.
- Der Dev-Build schreibt einen leeren Vault-Stub, damit `tsc` `auth.ts`
  typchecken kann (`scripts/gen-vault-stub.mjs`).

---

## 4. Authentifizierungs-Flow (geschützter Build)

```mermaid
sequenceDiagram
    autonumber
    participant U as Nutzer
    participant L as Login-Overlay<br/>(auth-ui.ts)
    participant A as auth.ts
    participant C as Web Crypto
    participant S as sessionStorage
    participant App as main.ts-Bundle<br/>(Klartext)

    U->>L: Splash-Klick / Seite laden
    L->>A: boot()
    A->>S: sessionKey vorhanden?

    alt Sitzung vorhanden (Reload im selben Tab)
        A->>C: importKey(Rohbytes aus Sitzung)
        A->>C: AES-GCM decrypt(Vault)
        A-->>App: runApp(Klartext)
        A->>L: hideLogin()
    else Keine Sitzung
        A->>L: showLogin()
        U->>L: Passwort eingeben
        L->>A: handleLogin(passwort)
        A->>C: PBKDF2-SHA256 ×210 000 (Salt aus Vault)
        A->>C: AES-GCM decrypt(Vault)
        alt Entschlüsselung erfolgreich
            Note over A,C: GCM-Tag prüft das Passwort implizit —<br/>kein Passwort-/Hash-Vergleich im Code
            A->>S: exportKey → Rohbytes speichern
            A-->>App: runApp(Klartext)
            A->>L: hideLogin()
        else Falsches Passwort
            C-->>A: OperationError
            A->>L: reportLoginError("Falsches Passwort…")
        end
    end
```

**Sicherheitsmodell:**

- Das Passwort wird **nirgends gespeichert** — auch nicht als Hash. Die
  Gültigkeit wird implizit durch den GCM-Authentifizierungs-Tag geprüft.
- In `sessionStorage` liegen nur die **abgeleiteten Schlüsselrohbytes**
  (nicht das Passwort); sie sterben mit dem Tab.
- Grenzen: Clientseitig ist das das Maximum — nach dem Entsperren liegt
  der Klartext im Browser-Speicher. Gegen einen Angreifer mit
  Rechnerzugriff hilft nur Server-Authentifizierung.

---

## 5. Datenfluss der Schilder-Erzeugung

```mermaid
flowchart TD
    TA["Lagerplätze<br/>Einzelfeld oder Unterkategorien<br/>(Start/Ende → expandRange())"]
    E["Duplikat-Prüfung<br/>über alle Unterkategorien"]
    IMG["TemplatePicker<br/>PNG-Vorlage (Image)"]
    FORM["Formular → readConfig() → AppConfig"]
    CFG["config.json<br/>(Import/Export, kompatibel zu barcode.ps1)"]

    subgraph ProEintrag["Pro Eintrag (GeneratorUI)"]
        CB["renderBarcodeSvg()/renderBarcodeImage()<br/>etiket CODE128 (SVG → Canvas)"]
        CP["composeLabel()<br/>Skalierung ≤ 1, Zentrierung, Offset"]
        PNG["canvasToPngBlob()"]
        DPI["injectPhysDpi()<br/>pHYs-Chunk"]
        NAME["sanitizeFileName() + output.prefix"]
    end

    TH["thumbgrid<br/>Thumbnail + Einzel-Download"]
    ZIP["makeZip()<br/>(Store-only, CRC32)"]
    LOG["Logger<br/>(info/ok/warn/err)"]

    TA --> E
    IMG & FORM --> CP
    CFG -.-> FORM
    E --> CB
    CB --> CP --> PNG --> DPI --> NAME --> TH
    TH --> ZIP
    CP -.->|"Zielbereich > Vorlage"| LOG
    CB & CP & PNG & DPI -.-> LOG
```

---

## 6. CI/CD

```mermaid
flowchart LR
    PUSH["Push / PR auf master"]
    subgraph CI["ci.yml (4 parallele Jobs, via Turbo)"]
        LINT["lint<br/>ESLint (alle Workspaces)"]
        TEST["test<br/>node --test (packages/core)"]
        BUILD["build<br/>turbo run build → Artefakt"]
        DOCS["docs<br/>TypeDoc-Referenz"]
    end
    subgraph PAGES["sync-pages.yml"]
        BUILDP["npm ci + turbo build<br/>(APP_PASSWORD-Secret →<br/>geschützter Build)"]
        SYNC["index.html, config.json,<br/>assets/, dist/ → gh-pages"]
    end
    PUSH --> LINT & TEST & BUILD & DOCS
    PUSH --> BUILDP --> SYNC --> LIVE["GitHub Pages live"]
```

Modul-Referenz: [docs/api/README.md](api/README.md).

---

## 7. Architekturentscheidungen (ADRs)

Wichtige Design-Entscheidungen mit Begründung und Alternativen sind als
ADR festgehalten (`docs/decisions/`):

| ADR                                                                       | Entscheidung                                                                                                            |
| ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| [ADR-0001](docs/decisions/ADR-0001-etiket-ersetzt-jsbarcode.md)           | etiket ersetzt JsBarcode als Barcode-Renderer (eine Bibliothek für beide Pipelines)                                     |
| [ADR-0002](docs/decisions/ADR-0002-renderdpi-und-rasterungsabweichung.md) | `output.renderDpi` als gemeinsamer Rasterungs-Parameter; akzeptierte Browser/CLI-Größendifferenz (librsvg-72-dpi-Quirk) |
| [ADR-0003](docs/decisions/ADR-0003-eingabegate-validateEntry.md)          | Eingabegate (`validateEntry`) in UI + CLI, damit ungültige Codes vor dem Rendern abgelehnt werden                       |
| [ADR-0004](docs/decisions/ADR-0004-zentrale-fehlertaxonomie.md)           | Zentrale Fehlertaxonomie (`AppError`, etiket-Fehler-Integration, `describeError()`-Mapper)                              |

Weitere Querschnitts-Doku: [docs/ERROR-HANDLING.md](ERROR-HANDLING.md)
(Fehlerfluss, ErrorCode-Referenz, Anleitung für neue Fehlerstellen) und
[docs/ANALYSE-MIGRATION-UND-VERGLEICHE.md](ANALYSE-MIGRATION-UND-VERGLEICHE.md)
(etiket-Migration, Eingabegate-Analyse, Pixelvergleich CLI ↔ Browser).
