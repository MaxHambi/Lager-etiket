/**
 * Auth-Einstiegspunkt des geschützten Builds.
 *
 * Ablauf:
 * 1. Sitzung prüfen (sessionStorage) — schon entsperrt? Dann Vault entschlüsseln.
 * 2. Sonst Login-Overlay zeigen; Eingabe leitet per PBKDF2 den AES-Schlüssel ab.
 * 3. Entschlüsselung schlägt fehl (GCM-Tag prüft das Passwort) → Fehlermeldung,
 *    Feld leeren, neue Salt/IV kämen erst beim nächsten Build.
 * 4. Erfolg: Klartext-Bundle als IIFE ausführen → die echte App startet,
 *    Login-Overlay blendet aus, Sitzung wird gemerkt (sessionStorage).
 *
 * Der Vault (src/generated/vault.ts) wird von build.mjs erzeugt und ist
 * gitignored — ohne Build-Parameter gibt es ihn nicht.
 */
import { VAULT } from "./generated/vault.ts"
import { showLogin, hideLogin, reportLoginError } from "./ui/auth-ui.ts"
import { initSplash } from "./ui/splash.ts"

/** Muss mit build.mjs übereinstimmen. */
const PBKDF2_ITERATIONS = 210_000
const SALT_BYTES = 16
const IV_BYTES = 12
const SESSION_KEY = "barcode-vault-key"

/** Base64 → Bytes. */
function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

/** Bytes → Base64 (für sessionStorage). */
function bytesToB64(bytes: Uint8Array): string {
  let bin = ""
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin)
}

/**
 * Leitet aus dem Passwort den AES-GCM-Schlüssel ab (PBKDF2-SHA256).
 *
 * @param password Eingabe des Nutzers
 * @param salt Salt aus dem Vault
 * @returns CryptoKey für AES-GCM (encrypt/decrypt)
 */
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  )
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt as BufferSource, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    baseKey,
    { name: "AES-GCM", length: 256 },
    true, // extractable: Schlüsselrohbytes werden (statt des Passworts) in sessionStorage gelegt
    ["encrypt", "decrypt"],
  )
}

/**
 * Versucht, den Vault zu entschlüsseln.
 *
 * @param key AES-GCM-Schlüssel (aus Passwort oder Sitzung)
 * @returns Klartext-JS des App-Bundles
 * @throws Error wenn Passwort/Schlüssel falsch ist (GCM-Tag-Prüfung)
 */
async function decryptVault(key: CryptoKey): Promise<string> {
  const data = b64ToBytes(VAULT)
  const iv = data.slice(SALT_BYTES, SALT_BYTES + IV_BYTES)
  const ciphertext = data.slice(SALT_BYTES + IV_BYTES)

  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    ciphertext as BufferSource,
  )
  return new TextDecoder().decode(plain)
}

/** Führt das entschlüsselte App-Bundle aus (IIFE-Klartext). */
function runApp(plaintext: string): void {
  const run = new Function(plaintext)
  run()
}

/**
 * Startet die App mit den gegebenen Schlüsselbytes (aus Passwort oder Sitzung).
 * Löst aus, wenn der Schlüssel nicht mehr passt (z. B. neuer Vault nach Rebuild).
 *
 * @param keyBytes Rohbytes des AES-Schlüssels aus der Sitzung
 * @returns true wenn erfolgreich gestartet
 */
async function startWithKeyBytes(keyBytes: Uint8Array): Promise<boolean> {
  try {
    const key = await crypto.subtle.importKey("raw", keyBytes as BufferSource, "AES-GCM", false, [
      "decrypt",
    ])
    const plaintext = await decryptVault(key)
    runApp(plaintext)
    hideLogin()
    return true
  } catch {
    // Gespeicherte Sitzung passt nicht mehr zum aktuellen Vault
    sessionStorage.removeItem(SESSION_KEY)
    return false
  }
}

/**
 * Behandelt eine Login-Eingabe: Schlüssel ableiten, Vault entschlüsseln,
 * bei Erfolg App starten + Sitzung speichern, bei Fehler UI melden.
 *
 * @param password Eingegebenes Passwort
 */
async function handleLogin(password: string): Promise<void> {
  const data = b64ToBytes(VAULT)
  const salt = data.slice(0, SALT_BYTES)
  try {
    const key = await deriveKey(password, salt)
    const plaintext = await decryptVault(key)
    // Rohbytes des Schlüssels für die Sitzung exportieren (nicht das Passwort!)
    const raw = await crypto.subtle.exportKey("raw", key)
    sessionStorage.setItem(SESSION_KEY, bytesToB64(new Uint8Array(raw)))
    runApp(plaintext)
    hideLogin()
  } catch {
    reportLoginError("Falsches Passwort. Bitte erneut versuchen.")
  }
}

async function boot(): Promise<void> {
  initSplash()

  // 1. Bestehende Sitzung? (gilt pro Tab bis zum Schließen)
  const sessionB64 = sessionStorage.getItem(SESSION_KEY)
  if (sessionB64) {
    const ok = await startWithKeyBytes(b64ToBytes(sessionB64))
    if (ok) return
  }

  // 2. Sonst Login zeigen
  showLogin(handleLogin)
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot)
} else {
  void boot()
}
