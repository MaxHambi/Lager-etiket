/**
 * Build-Script für den Lagerplatz-Barcode-Generator (HTML-Tool).
 *
 * Zwei Modi:
 *
 * 1. Entwicklung (ohne Passwort):
 *      node build.mjs
 *    → dist/app.js ist das unverschlüsselte Bundle, kein Login.
 *
 * 2. Geschützt (mit Passwort):
 *      node build.mjs --password "..."     (oder Umgebungsvariable APP_PASSWORD)
 *    → Das App-Bundle wird mit AES-256-GCM verschlüsselt (Schlüsselableitung
 *      per PBKDF2-SHA256, 210000 Iterationen). dist/app.js enthält nur den
 *      Ciphertext + die Entschlüsselungs-/Login-Logik. Ohne korrektes
 *      Passwort ist die App-Logik nicht im Klartext vorhanden.
 *    → Kein Sourcemap im verschlüsselten Modus (würde Klartext leaken).
 *
 * Im Watch-Modus ist die Verschlüsselung deaktiviert (Entwicklung).
 *
 * Aufruf:
 *   node build.mjs --watch            – Watch-Modus (nur Entwicklung)
 *   node build.mjs                    – Entwicklungs-Build
 *   node build.mjs --password "pw"    – geschützter Build
 */
import * as esbuild from "esbuild"
import { pbkdf2Sync, randomBytes, createCipheriv } from "node:crypto"
import { writeFileSync, mkdirSync } from "node:fs"

const watch = process.argv.includes("--watch")

// Passwort aus --password oder APP_PASSWORD (Build-Parameter, nie committet)
let password = null
const pwFlagIdx = process.argv.indexOf("--password")
if (pwFlagIdx !== -1 && process.argv[pwFlagIdx + 1]) {
  password = process.argv[pwFlagIdx + 1]
} else if (process.env.APP_PASSWORD) {
  password = process.env.APP_PASSWORD
}

/** PBKDF2-Parameter — MUSSEN mit src/ui/auth.ts übereinstimmen. */
const PBKDF2_ITERATIONS = 210_000
const SALT_BYTES = 16
const IV_BYTES = 12

/**
 * Verschlüsselt den Klartext mit AES-256-GCM.
 * Format des Rückgabewerts (base64): salt[16] | iv[12] | ciphertext+tag
 *
 * @param {string} plaintext App-Bundle (Klartext)
 * @param {string} password Passwort für die Schlüsselableitung
 * @returns {string} base64-codierter Vault-Inhalt
 */
function encryptBundle(plaintext, password) {
  const salt = randomBytes(SALT_BYTES)
  const iv = randomBytes(IV_BYTES)

  // PBKDF2 → AES-GCM-Schlüssel (identisch zur Browser-Seite in auth.ts)
  const key = pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, 32, "sha256")

  const cipher = createCipheriv("aes-256-gcm", key, iv)
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
    cipher.getAuthTag(), // 16 Bytes GCM-Tag ans Ende
  ])

  const out = Buffer.concat([salt, iv, encrypted])
  return out.toString("base64")
}

if (watch) {
  const ctx = await esbuild.context({
    entryPoints: ["src/main.ts"],
    bundle: true,
    outfile: "dist/app.js",
    format: "iife",
    target: ["es2020"],
    sourcemap: true,
    minify: false,
    legalComments: "inline",
    logLevel: "info",
  })
  await ctx.watch()
  console.log("[build] Watch-Modus aktiv — Änderungen an src/ werden automatisch gebaut.")
} else if (password) {
  // ---------- Geschützter Build ----------
  // 1. App-Bundle (IIFE, damit es nach der Entschlüsselung per new Function startet)
  const inner = await esbuild.build({
    entryPoints: ["src/main.ts"],
    bundle: true,
    write: false,
    format: "iife",
    target: ["es2020"],
    minify: true, // verkleinert den Ciphertext
    legalComments: "none",
    logLevel: "silent",
  })
  const plaintext = inner.outputFiles[0].text

  // 2. Verschlüsseln + generierte Vault-Datei schreiben (gitignored)
  const vaultB64 = await encryptBundle(plaintext, password)
  mkdirSync("src/generated", { recursive: true })
  writeFileSync(
    "src/generated/vault.ts",
    "// AUTO-GENERIERT von build.mjs — nicht editieren, nicht committen.\n" +
      `export const VAULT: string = ${JSON.stringify(vaultB64)};\n`,
  )

  // 3. Loader-Bundle: auth.ts (Login + Entschlüsselung) importiert den Vault
  await esbuild.build({
    entryPoints: ["src/auth.ts"],
    bundle: true,
    outfile: "dist/app.js",
    format: "esm",
    target: ["es2020"],
    sourcemap: false, // Sourcemap würde den Klartext leaken!
    minify: false,
    legalComments: "inline",
    logLevel: "silent",
  })

  console.log(
    `[build] dist/app.js erstellt (GESCHÜTZT: AES-256-GCM, PBKDF2 ×${PBKDF2_ITERATIONS}). ` +
      `Klartext-Bundle: ${(plaintext.length / 1024).toFixed(1)} kb → Ciphertext: ${(vaultB64.length / 1024).toFixed(1)} kb.`,
  )
} else {
  // ---------- Entwicklungs-Build (unverschlüsselt, kein Login) ----------
  // vault.ts-Stub sicherstellen, damit tsc auth.ts prüfen kann
  // (echter Vault entsteht nur im geschützten Build)
  mkdirSync("src/generated", { recursive: true })
  writeFileSync(
    "src/generated/vault.ts",
    "// AUTO-GENERIERT von build.mjs — Entwicklungs-Stub, kein geschützter Build.\n" +
      'export const VAULT: string = "";\n',
  )

  await esbuild.build({
    entryPoints: ["src/main.ts"],
    bundle: true,
    outfile: "dist/app.js",
    format: "iife",
    target: ["es2020"],
    sourcemap: true,
    minify: false,
    legalComments: "inline",
    logLevel: "info",
  })
  console.log("[build] dist/app.js erstellt (Entwicklungsmodus, kein Passwortschutz).")
}
