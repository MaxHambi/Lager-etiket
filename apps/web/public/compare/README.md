# Pixelvergleich: CLI-Schild vs. Browser-Schild

Werkzeug zur pixelweisen Gegenüberstellung eines CLI-erzeugten Schilds
(`packages/tools/barcode.mjs` + sharp) und des Browser-Schilds (echte
`composeLabel`-Pipeline aus `@lager-etiket/core`). Hintergrund und Messergebnisse:
`docs/ANALYSE-MIGRATION-UND-VERGLEICHE.md` §3.

## Dateien

| Datei | Zweck | Committet? |
|---|---|---|
| `packages/tools/compare.ts` | Browser-Logik: lädt CLI-PNG, rendert Browser-Schild, vergleicht pixelweise, erzeugt Differenz-PNG | ✅ ja |
| `scripts/build-compare.mjs` | Baut `compare.html` als **self-contained Inline-Seite** (esbuild-Bundle + beide PNGs als Base64-Data-URIs eingebettet) | ✅ ja |
| `apps/web/public/compare/compare.html` | Gebaute Vergleichsseite | ❌ ignoriert (bau-bar) |
| `apps/web/public/compare/cli-*.png` | CLI-Schild (Testbild) | ❌ ignoriert (Testdaten) |
| `apps/web/public/compare/template.png` | Kopie der Vorlage | ❌ ignoriert (Testdaten) |

Warum inline? Der sichere HTML-Preview-Server (Freebuff) liefert nur die
einzelne `.html`-Datei aus — referenzierte JS-/PNG-Dateien würden 404 laufen.
Deshalb bettet `build-compare.mjs` alles direkt in die HTML-Datei ein.

## Vergleich durchführen

```bash
# 1) CLI-Schild erzeugen (Lagerplatz + Vorlage + Config anpassen)
echo "01A01" > /tmp/eintraege.txt
cd packages/tools
node barcode.mjs /tmp/eintraege.txt ../../Templates/MV.png /tmp/out --config ../../config.json

# 2) Artefakte an die erwarteten Stellen kopieren
cp /tmp/out/01A01.png apps/web/public/compare/cli-01A01.png
cp Templates/MV.png apps/web/public/compare/template.png   # aus Repo-Root

# 3) Inline-Seite bauen (aus Repo-Root)
node scripts/build-compare.mjs

# 4) apps/web/public/compare/compare.html im Browser öffnen
```

Die Seite zeigt beide Schilder nebeneinander, meldet Abmessungen,
Differenzpixel-Anzahl/-Prozent, max. Kanal-Delta, die erste dunkle Zeile
(vertikaler Versatz) und bietet ein rotes Differenzbild zum Download an.

## Bekanntes Ergebnis (Stand 16.09.2026, nach renderDpi)

Seit `output.renderDpi` (ADR-0002) nutzen beide Pipelines denselben konfigurierbaren
Rasterungs-Parameter. Verbleibende Differenz: **~5,96 % der Pixel**, Barcode-Breite
622 px (Browser) vs. 632 px (CLI), Ratio 1,016.

Ursache: librsvg (sharp) rechnet `density` auf 72-dpi-Basis (400-px-SVG bei 600 →
3333 px), der standardkonforme Browser-SVG-Kontext auf 96-dpi-Basis (→ 2500 px).
Die Abweichung ist **bewusst akzeptiert** — der Browser rendert das etiket-SVG
treue zur Quelle, an ihm wird nichts geändert.

Details: `docs/decisions/ADR-0002-renderdpi-und-rasterungsabweichung.md`,
Analyse-Dokument §3.4–3.6.
