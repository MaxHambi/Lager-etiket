# Test-Report: Web-App Live-Test (2026-09-17)

> Voll umfänglicher manueller Live-Test der Web-App nach Abschluss der
> etiket-Migration (Phasen 1–5, siehe `docs/ROADMAP.md`). Getestet wurde der
> Dev-Build aus der neuen pnpm-Monorepo-Struktur (`packages/web`, konsumiert
> `@lager-etiket/lib` + `@lager-etiket/compose` über Workspace-Links) —
> derselbe Code-Pfad, der auch als verschlüsseltes Bundle auf GitHub Pages
> deployt wird.

**Umgebung:** Lokaler HTTP-Server (Port 8087), Chrome-Preview (DevTools-Snapshot

- Screenshot-Verifikation), Dev-Build (`node build.mjs`, unverschlüsselt,
  kein Login-Gate).

**Ergebnis: BESTANDEN — 10/10 Tests, 0 Konsolenfehler, 0 Netzwerkfehler.**

---

## 1. Test-Matrix

| #   | Test                                                                                                                                                                                                                         | Ergebnis | Beleg (Protokoll/DOM)                                                                                                                                                                                      |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **App-Start**: Galerie mit 3 Vorlagen (MV, MV-A, MV-B), Projekt-Config `standard.json` automatisch geladen, etiket v0.12 offline aktiv                                                                                       | ✅       | „3 Vorlage(n) in der Galerie gefunden", „1 Konfiguration(en) verfügbar", „Projekt-Standard geladen"                                                                                                        |
| 2   | **Einzelfeld-Modus**: Vorlage MV gewählt (2244×709 px erkannt), `01A01` → Vorschau                                                                                                                                           | ✅       | „Vorschau erzeugt für 01A01 — Barcode 627×602 px @ (809,54)", Screenshot: Barcode + Textzeile korrekt auf der Vorlage                                                                                      |
| 3   | **Validierungs-Gate**: `01A01!UNGÜLTIG` (mit Nicht-ASCII „Ü") → Ablehnung **vor** dem Rendern                                                                                                                                | ✅       | „Vorschau abgelehnt: Zeichen an Position 10 (Ü) ist kein ASCII … Bitte ASCII-Zeichen verwenden." — nutzerfreundlich, kein Crash, kein halbes Schild                                                        |
| 4   | **Mehrere-Bereiche-Modus**: Umschalten blendet Einzelfeld aus; 2 Unterkategorien mit Start/Ende, je eigene Konfig- + Vorlagen-Dropdowns (alle 3 Galerie-Vorlagen verfügbar), ZIP-Ordner-Feld, Erzeugen-Checkbox (default an) | ✅       | DOM-Snapshot: beide Karten vollständig gerendert                                                                                                                                                           |
| 5   | **„Alle Schilder erzeugen" aktiv** trotz reinen Unterkategorie-Vorlagen (keine globale Vorlage nötig)                                                                                                                        | ✅       | Button enabled — Regression aus Issue #2 bleibt gefixt                                                                                                                                                     |
| 6   | **Batch-Erzeugung**: K1 = 01A01–01A03 auf MV → `Regal A/`; K2 = 02B01–02B02 auf MV-A → `Regal B/`                                                                                                                            | ✅       | „5 Lagerplätze in 2 Bereich(en)", „Erstellt: lagerplatz_01A01.png → Regal A/" (×5), „Fertig. 5 von 5 Schildern erstellt."; 7 Thumbnail-Elemente im DOM                                                     |
| 7   | **ZIP-Download** inkl. Unterordner je Unterkategorie                                                                                                                                                                         | ✅       | „ZIP-Archiv heruntergeladen — Unterordner je Unterkategorie beachtet."                                                                                                                                     |
| 8   | **Persistenz nach Reload**: Theme, Zielbereich-Overlay, zuletzt gewählte Vorlage                                                                                                                                             | ✅       | localStorage: `lager-etiket-show-area=1`, `lager-etiket-theme=catppuccin-macchiato`, `lager-etiket-last-template=MV.png`; nach Reload: Overlay angehakt, Theme aktiv, Galerie-Karte „MV" wieder ausgewählt |
| 9   | **prefers-color-scheme-Fallback**: localStorage geleert + Reload                                                                                                                                                             | ✅       | automatisch `catppuccin-mocha` (System dunkel) — Fallback greift ohne gespeicherten Wert                                                                                                                   |
| 10  | **Konsole & Netzwerk**                                                                                                                                                                                                       | ✅       | 0 Fehler / 0 Warnungen; alle Requests 200/304 (templates.json, MV/A/B.png, standard.json, configs.json, Theme-CSS, SVG-Data-URIs, Blob-Thumbnails)                                                         |

## 2. Migrationsspezifische Verifikation

- Die App läuft aus der **neuen Monorepo-Struktur** (`packages/web`), nicht
  aus der alten `apps/web`-Verschachtelung.
- Der Rendering-Pfad ist die **3-stufige Pure-Functions-Pipeline**
  (`compute` → `renderSvg` → `raster` via etiket/png) — nicht der
  vorgenerierte Alt-Code. Die Barcode-SVGs kommen als Data-URIs mit
  korrekter Geometrie (im Netzwerk-Log sichtbar: 01A01…02B02).
- Das **Eingabegate** (`validateEntry`) greift vor jedem Renderpfad —
  Einzel- wie Batch-Modus.
- **Kein funktionaler Regression** gegenüber dem Stand vor der Migration;
  alle Fixes aus den Issue-#1–#3-Sessions funktionieren.

## 3. Nicht Gegenstand dieses Tests

| Punkt                                     | Grund                                                                                                                   | Wo verifiziert                                                 |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Verschlüsselter Live-Bundle-Login (Vault) | Passwort nur dem Betreiber bekannt; Ciphertext auf Pages strukturell verifiziert (AES-256-GCM, VAULT-Payload vorhanden) | Live-Checks im Session-Log; manuell beim nächsten echten Login |
| PowerShell-/alte mjs-CLI                  | wurde durch die citty-CLI ersetzt (`packages/cli`)                                                                      | CLI-Tests + Bytegleichheits-Check (`docs/ROADMAP.md`)          |
| Automatisierte E2E-Suite                  | manuell getestet; Automatisierung offen                                                                                 | Vorschlag: Playwright-Smoke-Test in CI (siehe Ausblick)        |

## 4. Offene Punkte / Ausblick

- **Playwright-Smoke-Test** für genau diesen Durchlauf in CI automatisieren.
- Live-Login-Flow (Vault) vom Betreiber einmal manuell gegen die
  Pages-Seite testen.
- gh-pages-Altlasten (`packages/web/index.html`-Rest) räumt der nächste
  sync-pages-Lauf ab (Workflow-Fix ist commitet).

## 5. Fazit

Die Web-App ist nach der etiket-Migration **voll funktionsfähig**. Alle
Features aus den Issue-#1–#3-Fixes funktionieren, das Eingabegate greift,
Persistenz und Theme-Fallback sind vollständig. Der Zielzustand des
Migrationsplans ist damit nicht nur per Build/Tests, sondern auch praktisch
im Browser bestätigt.
