# Themes

Ein Theme ist **eine CSS-Datei, die ausschließlich CSS-Variablen** unter
`:root[data-theme="…"]` definiert. Layout und Komponenten (`base.css`,
`components.css`) nutzen nur diese Variablen — nie harte Farben.

## Verfügbare Themes: Catppuccin (offizielle Palette)

Alle vier Catppuccin-Flavors sind als eigene Themes eingebaut — Farben
stammen unverändert aus der offiziellen Palette
([catppuccin/palette](https://github.com/catppuccin/palette), v1.8.0):

| Theme-ID | Datei | Flavor |
|---|---|---|
| `catppuccin-mocha` | `catppuccin-mocha.css` | 🌸 Mocha (dunkel, Default) |
| `catppuccin-macchiato` | `catppuccin-macchiato.css` | ☕ Macchiato (dunkel) |
| `catppuccin-frappe` | `catppuccin-frappe.css` | 🌿 Frappé (dunkel) |
| `catppuccin-latte` | `catppuccin-latte.css` | 🌻 Latte (hell) |

Umschaltung: Dropdown „Theme (Catppuccin)" im Protokoll-Panel
(`packages/ui/src/theme.ts`), persistiert in `localStorage`
(Key `lager-etiket-theme`). Das Default entspricht dem bisherigen Design
(alte `catppuccin.css` = Mocha-Werte).

**Initial-Fallback:** Ohne gespeicherte Wahl entscheidet
`prefers-color-scheme` — helle Systeme starten mit Latte, dunkle mit
Mocha. Die System-Präferenz wird nicht persistiert; erst eine manuelle
Wahl übersteuert sie dauerhaft.

## Neues Theme in 3 Schritten

1. `catppuccin-mocha.css` kopieren, z. B. zu `light.css`.
2. `data-theme`-Wert und Variablenwerte anpassen.
3. In `index.html` eine Zeile ergänzen:

   ```html
   <link rel="stylesheet" href="assets/css/themes/light.css">
   ```

   Für eine Option im Umschalter zusätzlich einen `<option>`-Eintrag im
   `themeSelect` (index.html) setzen.

Aktivieren per Attribut am `<html>`-Element:

```html
<html lang="de" data-theme="light">
```

## Pflicht-Variablen

| Gruppe | Variablen |
|---|---|
| Flächen | `--base` `--mantle` `--crust` `--surface0` `--surface1` `--surface2` |
| Text | `--text` `--subtext1` `--subtext0` `--overlay0` `--overlay1` `--overlay2` |
| Akzente | `--mauve` `--blue` `--green` `--red` `--yellow` `--peach` `--pink` `--teal` |
| Form | `--radius` `--font-ui` `--font-mono` |
| Spezial | `--checker-a` `--checker-b` (Schachbrett hinter transparenten PNGs), `--preview-overlay` (gestrichelte Zielbereich-Markierung in der Vorschau) |

Fehlt eine Variable, fällt der Browser auf den Initialwert zurück (meist
schwarz/transparent) — die Komponenten selbst bleiben funktionsfähig.

## Rollen (wo wird welche Variable genutzt?)

- `--crust` — Seiten-/Splash-Hintergrund
- `--base` — Card-Hintergrund
- `--mantle` — Log-Panel-Hintergrund
- `--surface0/1/2` — Inputs, Chips, Trennlinien, Dropzone-Rand
- `--text` / `--subtext*` / `--overlay*` — Text-Hierarchie (stark → schwach)
- `--mauve` — primäre Akzentfarbe (Fokus, Buttons, Links in Thumbnails)
- `--green` — Erfolg (`btn-green`, Badge, Log OK)
- `--red` / `--yellow` — Fehler/Warnung im Log, Splash-Akzent
- `--blue` — Textlinks
