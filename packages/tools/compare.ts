/**
 * Pixelvergleich: CLI-Schild (barcode.mjs + sharp) gegen das Browser-Schild
 * (composeLabel + Canvas) desselben Lagerplatzes (01A01).
 *
 * Beide Pfade nutzen denselben etiket-SVG-Renderer; der Unterschied liegt in
 * der Rasterung (sharp mit density vs. Browser-SVG-Dekodierung) und in der
 * Skalierung. Der Vergleich zeigt, wo die Pipelines auseinanderlaufen.
 */
import { composeLabel } from "@lager-etiket/core";
import { DEFAULT_CONFIG } from "@lager-etiket/types";

// Diese Konstanten werden vom Inline-Build (scripts/build-compare.mjs) eingesetzt:
declare const CLI_PNG_SRC: string;
declare const TPL_PNG_SRC: string;

const out = document.getElementById("out") as HTMLPreElement;
const log = (msg: string, cls = ""): void => {
  out.innerHTML += '\n<span class="' + cls + '">' + msg + "</span>";
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Ladefehler: " + src));
    img.src = src;
  });
}

/** PNG-Blob ins Canvas zeichnen und ImageData zurückgeben. */
async function blobToImageData(blob: Blob): Promise<ImageData> {
  const bmp = await createImageBitmap(blob);
  const c = document.createElement("canvas");
  c.width = bmp.width;
  c.height = bmp.height;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(bmp, 0, 0);
  return ctx.getImageData(0, 0, c.width, c.height);
}

function run(): void {
  void (async () => {
    try {
      // 1) CLI-Schild laden (vom CLI-Lauf erzeugt, mit 600-DPI-pHYs-Chunk)
      const cliBlob = await (await fetch(CLI_PNG_SRC)).blob();
      const cliData = await blobToImageData(cliBlob);
      (document.getElementById("cliImg") as HTMLImageElement).src = URL.createObjectURL(cliBlob);
      log("CLI-Schild geladen: " + cliData.width + "×" + cliData.height + " px", "ok");

      // 2) Browser-Pipeline mit derselben Vorlage + Konfiguration
      const tpl = await loadImage(TPL_PNG_SRC);
      const cfg = structuredClone(DEFAULT_CONFIG);
      cfg.barcode.height = 180;
      cfg.barcode.barWidth = 4;
      cfg.barcode.margin = 20;
      cfg.barcode.fontSize = 150;
      cfg.barcode.fontFamily = "consolas, monospace";
      cfg.barcode.color = "#000000";
      cfg.barcode.background = "transparent";
      cfg.placement.area = { left: 748, top: 20, width: 748, height: 669 };
      cfg.placement.maxWidthPercent = 90;
      cfg.placement.maxHeightPercent = 90;
      cfg.placement.offsetX = 0;
      cfg.placement.offsetY = 0;
      cfg.output.dpi = 600;
      cfg.output.renderDpi = 600;

      const result = await composeLabel("01A01", tpl, cfg);
      const bc = document.getElementById("browserCanvas") as HTMLCanvasElement;
      bc.width = result.canvas.width;
      bc.height = result.canvas.height;
      bc.getContext("2d")!.drawImage(result.canvas, 0, 0);
      const browserData = bc.getContext("2d")!.getImageData(0, 0, bc.width, bc.height);
      log("Browser-Schild erzeugt: " + browserData.width + "×" + browserData.height + " px", "ok");

      // 3) Abmessungen vergleichen
      if (cliData.width !== browserData.width || cliData.height !== browserData.height) {
        log(
          "✗ Abmessungen weichen ab: CLI " + cliData.width + "×" + cliData.height +
          " vs. Browser " + browserData.width + "×" + browserData.height,
          "bad",
        );
        log("→ Ursache: unterschiedliche Rasterungs-DPI/Skalierung zwischen sharp und Browser-SVG-Dekoder.", "warn");
      } else {
        log("✓ Abmessungen identisch: " + cliData.width + "×" + cliData.height, "ok");
      }

      // 4) Pixelvergleich im gemeinsamen Bereich
      const w = Math.min(cliData.width, browserData.width);
      const h = Math.min(cliData.height, browserData.height);
      let diff = 0;
      let maxDelta = 0;
      const diffCanvas = document.createElement("canvas");
      diffCanvas.width = w;
      diffCanvas.height = h;
      const dctx = diffCanvas.getContext("2d")!;
      const diffImg = dctx.createImageData(w, h);

      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4;
          const dr = Math.abs(cliData.data[i]! - browserData.data[i]!);
          const dg = Math.abs(cliData.data[i + 1]! - browserData.data[i + 1]!);
          const db = Math.abs(cliData.data[i + 2]! - browserData.data[i + 2]!);
          const da = Math.abs(cliData.data[i + 3]! - browserData.data[i + 3]!);
          const delta = Math.max(dr, dg, db, da);
          if (delta > 0) {
            diff++;
            if (delta > maxDelta) maxDelta = delta;
            // Differenzpixel rot markieren
            diffImg.data[i] = 255;
            diffImg.data[i + 1] = 0;
            diffImg.data[i + 2] = 0;
            diffImg.data[i + 3] = 255;
          } else {
            diffImg.data[i + 3] = 60;
          }
        }
      }
      dctx.putImageData(diffImg, 0, 0);

      const total = w * h;
      const pct = ((diff / total) * 100).toFixed(3);
      log("─── Pixelvergleich (" + w + "×" + h + " = " + total + " px) ───");
      if (diff === 0) {
        log("✓✓ BYTE-IDENTISCH: 0 differierende Pixel von " + total, "ok");
      } else {
        log("✗ " + diff + " von " + total + " Pixeln differieren (" + pct + " %), max. Kanal-Delta: " + maxDelta, "bad");
        log("Differenzbild: " + diffCanvas.toDataURL("image/png"));
        const url = URL.createObjectURL(await new Promise<Blob>((r) => diffCanvas.toBlob((b) => r(b as Blob), "image/png")));
        const a = document.createElement("a");
        a.href = url;
        a.download = "diff.png";
        a.textContent = "→ diff.png herunterladen";
        document.body.appendChild(a);
      }

      // 5) Barcode-Position in beiden Bildern finden (erste dunkle Zeile)
      const firstDarkRow = (d: ImageData): number => {
        for (let y = 0; y < d.height; y++) {
          for (let x = 0; x < d.width; x++) {
            const i = (y * d.width + x) * 4;
            if (d.data[i]! < 100 && d.data[i + 3]! > 200) return y;
          }
        }
        return -1;
      };
      const cliRow = firstDarkRow(cliData);
      const bRow = firstDarkRow(browserData);
      log("Erste dunkle Pixelzeile — CLI: " + cliRow + ", Browser: " + bRow + (cliRow === bRow ? " ✓" : " ✗ (vertikaler Versatz)"), cliRow === bRow ? "ok" : "bad");
    } catch (err) {
      log("FEHLER: " + (err as Error).message, "bad");
      console.error(err);
    }
  })();
}

run();
