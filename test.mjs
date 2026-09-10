import { barcode } from "etiket/barcode";
import sharp from "sharp";
import fs from "fs";

const text = "01A01";
const svg = barcode(text, {
  type: "code128",
  showText: true,
  text: text,
  height: 180,
  barWidth: 4,
  margin: 20,
  fontSize: 54,
  fontFamily: "Arial, Helvetica, sans-serif",
  textAlign: "center",
  textPosition: "bottom",
  color: "#000000",
  background: "transparent",
});

await sharp(Buffer.from(svg), { density: 300 })
  .png()
  .toFile("test-barcode.png");

console.log("Fertig: test-barcode.png erzeugt");
