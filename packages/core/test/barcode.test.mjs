/**
 * Tests für die Barcode-Pipeline (packages/core/src/barcode.ts).
 *
 * Läuft DOM-frei via node --test: die SVG-Erzeugung (renderBarcodeSvg)
 * ist ein reiner String-Pfad und damit ohne Canvas prüfbar.
 * Die Image-Rasterung (renderBarcodeImage) braucht ein DOM und wird hier
 * nicht getestet — sie ist Teil der Browser-Pipeline.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { renderBarcodeSvg } from "../src/barcode.ts";
import { EtiketError } from "../src/errors.ts";

const CFG = {
  height: 180,
  barWidth: 4,
  margin: 20,
  fontSize: 54,
  fontFamily: "Arial, Helvetica, sans-serif",
  color: "#000000",
  background: "transparent",
  textMargin: 6,
};

test("renderBarcodeSvg erzeugt ein SVG mit Barcode-Struktur", () => {
  const svg = renderBarcodeSvg("01A01", CFG);
  assert.match(svg, /^<svg/);
  assert.match(svg, /width="/);
  assert.match(svg, /height="/);
  // Klartext muss im SVG enthalten sein
  assert.ok(svg.includes("01A01"), "SVG soll den Klartext enthalten");
});

test("renderBarcodeSvg: leerer Code liefert nur Hintergrund (kein Barcode-Muster)", () => {
  // etiket 0.12 wirft bei leerem Code keinen Fehler — deshalb fängt das
  // Eingabegate (validateEntry) leere Codes ab, BEVOR gerendert wird.
  const svg = renderBarcodeSvg("", CFG);
  const rects = (svg.match(/<rect/g) || []).length;
  // Nur Rahmen/Hintergrund-Elemente, keine Balkensequenz:
  const pure = (renderBarcodeSvg("1", CFG).match(/<rect/g) || []).length;
  assert.ok(rects < pure, "leerer Code muss weniger Elemente als echter Code liefern");
});

test("renderBarcodeSvg: etiket 0.12 droppt Zeichen > 127 stillschweigend (Dokumentation des Verhaltens)", () => {
  // etiket 0.12 kennt kein FNC4: "ä" wird still weggelassen. Deshalb lehnt
  // das Eingabegate (validateEntry) solche Codes vorher ab — der Renderer
  // selbst kann sich nicht darauf verlassen und wirft (noch) keinen Fehler.
  // Dieser Test dokumentiert das Verhalten und schlägt an, sobald eine
  // neuere etiket-Version FNC4 kann (dann Anzahl der Balken prüfen!).
  const pure = (renderBarcodeSvg("AB", CFG).match(/<rect/g) || []).length;
  const mixed = (renderBarcodeSvg("AÄB", CFG).match(/<rect/g) || []).length;
  assert.equal(mixed, pure, "etiket 0.12 muss 'AÄB' wie 'AB' kodieren (FNC4-Verhalten) — bei Wechsel der etiket-Version diesen Test aktualisieren");
});

test("renderBarcodeSvg: ASCII-Code erzeugt vollständiges Balkenmuster", () => {
  const svg = renderBarcodeSvg("01A01", CFG);
  const rects = (svg.match(/<rect/g) || []).length;
  assert.ok(rects > 15, "echter Code braucht eine Balkensequenz, hatte nur " + rects);
});
