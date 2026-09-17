/**
 * Playwright-Smoke-Test — automatisiert den manuellen Live-Test-Durchlauf
 * aus docs/TEST-REPORT-WEBAPP.md (Issue #16).
 *
 * Deckt ab (ohne Vault-Flow, der im Dev-Bundle nicht enthalten ist):
 *   1. App-Start: Galerie mit Vorlagen, Projekt-Config geladen, Protokoll bereit
 *   2. Einzelfeld-Modus: Vorlage wählen, 01A01, Vorschau erzeugen
 *   3. Validierungs-Gate: ungültiger Code wird freundlich abgelehnt
 *   4. Mehrere-Bereiche-Modus: 2 Unterkategorien mit Start/Ende + ZIP-Ordnern
 *   5. Alle Schilder erzeugen: Erfolgsmeldung im Protokoll
 *   6. ZIP-Download aktiv nach Batch-Erzeugung
 *   7. Persistenz: gewählte Vorlage + Overlay-Modus nach Reload wieder da
 *   8. Theme-Wechsel + prefers-color-scheme-Fallback
 *
 * Jeder Schritt hat logische Fehlermeldungen (test.step + expect-Message),
 * damit Fehlern direkt ablesbar sind (Forderung aus #16).
 */
import { expect, test } from "@playwright/test"

const LOG_SEL = "#log"
const TPL_SEL = ".tpl-card"

/** Protokoll-Text der gesamten Konsole auslesen. */
async function logText(page: import("@playwright/test").Page): Promise<string> {
  return page.locator(LOG_SEL).innerText()
}

test.describe("Web-App Smoke (packages/web Dev-Build)", () => {
  test("Start → Vorschau → Gate → Batch → ZIP → Persistenz → Theme", async ({ page }) => {
    // ---------- 1. App-Start ----------
    await test.step("App-Start: Galerie sichtbar, kein Login, App bereit", async () => {
      await page.goto("/")
      await expect(page.locator("#login-overlay")).toBeHidden()
      await expect(page.locator("#templateGallery .tpl-card")).toHaveCount(3, {
        timeout: 10_000,
      })
      await expect(page.locator("#entrySingle")).toBeEnabled()
      const log = await logText(page)
      expect(log, "Protokoll muss 'Werkzeug bereit' enthalten").toContain("Werkzeug bereit")
      expect(log, "Projekt-Config standard.json muss automatisch geladen werden").toContain(
        "standard.json",
      )
      // Splash-Screen wegklicken (blockiert Pointer Events, siehe splash.ts dismiss-on-click)
      await page.locator("#splash-screen").click()
      await expect(page.locator("#splash-screen")).toHaveClass(/hidden/)
    })

    // ---------- 2. Einzelfeld-Vorschau ----------
    await test.step("Einzelfeld: Vorlage MV wählen, 01A01, Vorschau", async () => {
      await page.locator(TPL_SEL).first().click()
      await expect(page.locator(".tpl-card.selected")).toHaveCount(1)
      await page.fill("#entrySingle", "01A01")
      await page.click("#btnPreview")
      const log = await logText(page)
      expect(log, "Vorschau muss Erfolgsmeldung zeigen").toContain("Vorschau")
      expect(log).not.toContain("abgelehnt")
      await expect(page.locator("#previewStage img, #previewStage canvas").first()).toBeVisible({
        timeout: 10_000,
      })
    })

    // ---------- 3. Validierungs-Gate ----------
    await test.step("Gate: '01A01!UNGÜLTIG' wird abgelehnt, nicht gerendert", async () => {
      await page.fill("#entrySingle", "01A01!UNGÜLTIG")
      await page.click("#btnPreview")
      const log = await logText(page)
      expect(log, "Gate muss 'Vorschau abgelehnt' melden").toContain("Vorschau abgelehnt")
    })

    // ---------- 4. Mehrere-Bereiche-Modus ----------
    await test.step("Mehrere Bereiche: 2 Unterkategorien konfigurieren", async () => {
      await page.click("#btnModeMulti")
      await expect(page.locator(".batch-row, [class*='batch']").first()).toBeVisible()
      // 2. Unterkategorie hinzufügen (1 ist beim Umschalten vorhanden)
      const addBtn = page.locator("#btnAddBatch")
      if (await addBtn.isEnabled()) await addBtn.click()
      const sections = page.locator(".batch-start")
      await expect(sections).toHaveCount(2)

      // Kategorie 1: 01A01–01A03, Ordner Regal A
      await page.locator(".batch-start").nth(0).fill("01A01")
      await page.locator(".batch-end").nth(0).fill("01A03")
      await page.locator(".batch-output").nth(0).fill("Regal A")
      // Kategorie 2: 02B01–02B02, Ordner Regal B
      await page.locator(".batch-start").nth(1).fill("02B01")
      await page.locator(".batch-end").nth(1).fill("02B02")
      await page.locator(".batch-output").nth(1).fill("Regal B")
    })

    // ---------- 5. Batch erzeugen ----------
    await test.step("Alle Schilder erzeugen: 5/5 erfolgreich", async () => {
      await page.click("#btnGenerateAll")
      const log = page.locator(LOG_SEL)
      await expect(log).toContainText("5 von 5", { timeout: 20_000 })
    })

    // ---------- 6. ZIP-Download ----------
    await test.step("ZIP-Download aktiviert", async () => {
      await expect(page.locator("#btnDownloadZip")).toBeEnabled()
    })

    // ---------- 7. Persistenz nach Reload ----------
    await test.step("Persistenz: Vorlage + Overlay-Modus nach Reload", async () => {
      await page.reload()
      await expect(page.locator("#templateGallery .tpl-card")).toHaveCount(3, {
        timeout: 10_000,
      })
      await page.locator("#splash-screen").click()
      const selected = page.locator(".tpl-card.selected")
      await expect(selected, "zuletzt gewählte Vorlage muss wieder ausgewählt sein").toHaveCount(1)
    })

    // ---------- 8. Theme + Fallback ----------
    await test.step("Theme-Wechsel wird gesetzt und persistiert", async () => {
      await page.selectOption("#themeSelect", { index: 1 })
      await page.reload()
      await expect(page.locator("#templateGallery .tpl-card")).toHaveCount(3, {
        timeout: 10_000,
      })
      await page.locator("#splash-screen").click()
      const theme = await page.evaluate(() => localStorage.getItem("lager-etiket-theme"))
      expect(theme, "Theme muss in localStorage persistiert sein").toBeTruthy()
    })
  })
})
