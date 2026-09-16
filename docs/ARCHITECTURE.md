# Architektur — Lagerplatz-Barcode-Generator (HTML-Tool)

Dieses Dokument beschreibt die Architektur des browserbasierten HTML-Tools:
Module, Build-Pipeline, Authentifizierung und Datenfluss.

> Kommandozeilen-Werkzeuge (`barcode.ps1`, `barcode.mjs`, `skalieren.mjs`,
> `pruefen.mjs`, `konvertieren.mjs`) sind separat dokumentiert in der
> [Haupt-README](../README.md).

---

## 1. Systemübersicht

```mermaid
graph TB
    subgraph Browser["Browser (100 % offline)"]
        direction TB
        HTML["index.html<br/>(Markup + CSS-Verweise)"]
        CSS["assets/css/<br/>base + components + theme"]
        JS["dist/app.js<br/>(esbuild-Bundle)"]

        subgraph App["Anwendung (src/)"]
            direction TB
            ENTRY["main.ts<br/>(Einstieg)"]
            UI["ui/ — DOM-Module<br/>Logger · TemplatePicker · EntriesUI<br/>ConfigUI · PreviewUI · GeneratorUI"]
            CORE["core/ — DOM-freie Logik<br/>entries · compose · barcode<br/>png · zip · crc32 · download"]
            TYPES["types/config.ts<br/>AppConfig (kompatibel zu config.json)"]
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

### core/ — DOM-freie Logik

Alle Funktionen sind rein bzw. arbeiten nur mit Blob/ArrayBuffer und sind
deshalb einzeln unit-testbar (`test/unit/`).

| Modul | Exporte | Zweck |
|---|---|---|
| `entries.ts` | `parseEntries`, `sanitizeFileName` | Eintragsparsing (Kommentare, Trim, Duplikat-Abbruch), Dateinamen-Bereinigung |
| `compose.ts` | `composeLabel`, `ComposeResult` | **Herzstück**: Skalierung + Zentrierung des Barcodes im Zielbereich; Formel bewusst identisch zu `barcode.mjs` (`composeLabel`, Zeile 105) |
| `barcode.ts` | `renderBarcodeCanvas`, `canvasToPngBlob` | JsBarcode-Wrapper (CODE128) |
| `png.ts` | `injectPhysDpi` | pHYs-Chunk (DPI) in PNG injizieren |
| `zip.ts` | `makeZip`, `ZipEntry` | Store-only ZIP-Writer |
| `crc32.ts` | `crc32` | CRC32 (IEEE) für ZIP + PNG |
| `config.ts` | `readConfig`, `applyConfig`, `toggleAreaFields` | Formular ↔ `AppConfig` |
| `download.ts` | `downloadBlob` | Browser-Download auslösen |

### ui/ — DOM-Module

| Modul | Klasse/Funktionen | Zuständig für |
|---|---|---|
| `dom.ts` | `$()` | `getElementById` mit Fehler bei fehlender ID |
| `logger.ts` | `Logger` | Protokoll-Panel (info/ok/warn/err), Speichern als .txt |
| `splash.ts` | `initSplash` | Begrüßungs-Overlay bis Klick |
| `template-picker.ts` | `TemplatePicker` | Dropzone, Vorlagen-Vorschau, Change-Events |
| `entries-ui.ts` | `EntriesUI` | Textarea/.txt-Import, Duplikat-Anzeige, Vorschau-Select |
| `config-ui.ts` | `ConfigUI` | config.json Import/Export/Reset |
| `preview.ts` | `PreviewUI` | Einzelvorschau + Zielbereich-Overlay (Theme-Farbe `--preview-overlay`) |
| `generator.ts` | `GeneratorUI` | Stapel-Lauf, Progressbar, Thumbnails, ZIP-Download |
| `auth-ui.ts` | `showLogin`, `hideLogin`, `reportLoginError` | Login-Overlay (nur geschützter Build) |

### Einstiegspunkte

| Datei | Wird gebaut als | Zweck |
|---|---|---|
| `src/main.ts` | `npm run build` (unverschlüsselt) | Direkte App-Initialisierung |
| `src/auth.ts` | `node build.mjs --password "…"` (geschützt) | Login + Entschlüsselung, führt dann das `main.ts`-Bundle aus |

---

## 3. Build-Pipeline

```mermaid
flowchart LR
    subgraph Quellcode
        SRC["src/**/*.ts"]
        CSS["assets/css/**"]
        HTML["index.html"]
    end

    subgraph Entwicklung["Entwicklungs-Build (npm run build)"]
        TSC["tsc --noEmit<br/>(Typcheck)"]
        DEV["esbuild<br/>main.ts → dist/app.js<br/>(IIFE, Sourcemap)"]
    end

    subgraph Geschützt["Geschützter Build (node build.mjs --password)"]
        MIN["esbuild<br/>main.ts → IIFE (minifiziert)"]
        ENC["node:crypto<br/>PBKDF2-SHA256 ×210k<br/>AES-256-GCM"]
        VAULT["src/generated/vault.ts<br/>(base64-Ciphertext, gitignored)"]
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
- `src/generated/vault.ts` entsteht nur beim geschützten Build und ist
  gitignored — im Repository liegt niemals ein Ciphertext oder Passwort.
- Der Dev-Build schreibt einen leeren Vault-Stub, damit `tsc` `auth.ts`
  typchecken kann.

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
    TA["entriesText-Textarea<br/>(oder .txt-Import)"]
    E["parseEntries()<br/>Trim · Kommentare · Duplikat-Abbruch"]
    IMG["TemplatePicker<br/>PNG-Vorlage (Image)"]
    FORM["Formular → readConfig() → AppConfig"]
    CFG["config.json<br/>(Import/Export, kompatibel zu barcode.ps1)"]

    subgraph ProEintrag["Pro Eintrag (GeneratorUI)"]
        CB["renderBarcodeCanvas()<br/>JsBarcode CODE128"]
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
    subgraph CI["ci.yml (3 parallele Jobs)"]
        LINT["lint<br/>ESLint"]
        TEST["test<br/>node --test (22 Tests)"]
        BUILD["build<br/>tsc + esbuild → Artefakt"]
    end
    subgraph PAGES["sync-pages.yml"]
        BUILDP["npm ci + Build<br/>(APP_PASSWORD-Secret →<br/>geschützter Build)"]
        SYNC["index.html, config.json,<br/>assets/, dist/ → gh-pages"]
    end
    PUSH --> LINT & TEST & BUILD
    PUSH --> BUILDP --> SYNC --> LIVE["GitHub Pages live"]
```

Details und Command-Referenz: [Haupt-README](../README.md),
Modul-Referenz: [docs/api/README.md](api/README.md).
