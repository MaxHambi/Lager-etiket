/**
 * Persistence-Tests (Issue #23): areaAuto wird wie showArea in localStorage
 * persistiert und beim Start wiederhergestellt.
 *
 * Die Module view-settings/persistence/config sind DOM-gebunden; wir testen
 * sie im node-Environment gegen minimale localStorage/DOM-Stubs
 * (Verhalten: Wiederherstellung beim Init, Save-Trigger bei change,
 * disabled-Synchronisierung der Zielfelder via toggleAreaFields).
 */
import { describe, expect, it, beforeEach, vi } from "vitest"

/** Minimaler localStorage-Ersatz. */
class MemoryStorage {
  private map = new Map<string, string>()
  getItem(key: string): string | null {
    return this.map.get(key) ?? null
  }
  setItem(key: string, value: string): void {
    this.map.set(key, value)
  }
  removeItem(key: string): void {
    this.map.delete(key)
  }
}

/** Minimaler Checkbox-/Input-Ersatz mit change-Listener-Registry. */
function fakeInput() {
  const listeners: Array<() => void> = []
  return {
    checked: false,
    value: "",
    disabled: false,
    placeholder: "",
    addEventListener: (_: string, fn: () => void): void => {
      listeners.push(fn)
    },
    fire(): void {
      for (const fn of listeners) fn()
    },
  }
}

type Dom = Record<"areaAuto" | "showArea" | "cfgWidth" | "cfgHeight2", ReturnType<typeof fakeInput>>

function makeDom(): Dom {
  return {
    areaAuto: fakeInput(),
    showArea: fakeInput(),
    cfgWidth: fakeInput(),
    cfgHeight2: fakeInput(),
  }
}

const stubLog = {
  info: () => {},
  warn: () => {},
  ok: () => {},
  err: () => {},
  save: () => {},
}

/** Lädt die Module frisch mit gestubbten Globals (isoliert pro Test). */
async function loadModules(storage: MemoryStorage, dom: Dom) {
  vi.resetModules()
  vi.stubGlobal("localStorage", storage as unknown as Storage)
  vi.stubGlobal("document", {
    getElementById: (id: string): unknown => dom[id as keyof Dom] ?? null,
    querySelector: (): null => null,
    createElement: (): object => ({}),
  })
  const persistence = await import("../src/ui/persistence.ts")
  const config = await import("../src/ui/config.ts")
  const viewSettings = await import("../src/ui/view-settings.ts")
  return { persistence, config, viewSettings }
}

function initView(mod: Awaited<ReturnType<typeof loadModules>>): void {
  // Stubs statt echter Klassen-Instanzen (Logger/TemplateGallery sind DOM-gebunden)
  mod.viewSettings.initViewSettings(
    stubLog as unknown as import("../src/ui/logger.ts").Logger,
    {
      onChange: () => {},
      restoreLast: () => {},
      manifest: [],
    } as unknown as import("../src/ui/template-gallery.ts").TemplateGallery,
  )
}

describe("Issue #23: areaAuto-Persistenz", () => {
  let storage: MemoryStorage

  beforeEach(() => {
    storage = new MemoryStorage()
    vi.unstubAllGlobals()
  })

  it("persistence.ts exportiert KEY_AREA_AUTO mit dem erwarteten Key-Namen", async () => {
    const { persistence } = await loadModules(storage, makeDom())
    expect(persistence.KEY_AREA_AUTO).toBe("lager-etiket-area-auto")
  })

  it("gespeicherter Zustand '1' setzt die Checkbox beim Init (Reload-Szenario)", async () => {
    storage.setItem("lager-etiket-area-auto", "1")
    const dom = makeDom()
    const mod = await loadModules(storage, dom)
    initView(mod)
    expect(dom.areaAuto.checked).toBe(true)
    // toggleAreaFields muss gefolgt sein: manuelle Felder gesperrt
    expect(dom.cfgWidth.disabled).toBe(true)
    expect(dom.cfgHeight2.disabled).toBe(true)
  })

  it("gespeicherter Zustand '0' hält die Checkbox aus (manuelle Felder frei)", async () => {
    storage.setItem("lager-etiket-area-auto", "0")
    const dom = makeDom()
    const mod = await loadModules(storage, dom)
    initView(mod)
    expect(dom.areaAuto.checked).toBe(false)
    expect(dom.cfgWidth.disabled).toBe(false)
  })

  it("fehlender Eintrag ändert nichts (erster Besuch)", async () => {
    const dom = makeDom()
    const mod = await loadModules(storage, dom)
    initView(mod)
    expect(dom.areaAuto.checked).toBe(false)
    expect(storage.getItem("lager-etiket-area-auto")).toBeNull()
  })

  it("ein change-Event schreibt den aktuellen Zustand in localStorage", async () => {
    const dom = makeDom()
    const mod = await loadModules(storage, dom)
    initView(mod)

    dom.areaAuto.checked = true
    dom.areaAuto.fire()
    expect(storage.getItem("lager-etiket-area-auto")).toBe("1")

    dom.areaAuto.checked = false
    dom.areaAuto.fire()
    expect(storage.getItem("lager-etiket-area-auto")).toBe("0")
  })

  it("toggleAreaFields synchronisiert disabled + Placeholder der Zielfelder", async () => {
    const dom = makeDom()
    const { config } = await loadModules(storage, dom)

    dom.areaAuto.checked = true
    config.toggleAreaFields()
    expect(dom.cfgWidth.disabled).toBe(true)
    expect(dom.cfgHeight2.disabled).toBe(true)
    expect(dom.cfgWidth.placeholder).toBe("automatisch")
    expect(dom.cfgHeight2.placeholder).toBe("automatisch")

    dom.areaAuto.checked = false
    config.toggleAreaFields()
    expect(dom.cfgWidth.disabled).toBe(false)
    expect(dom.cfgHeight2.disabled).toBe(false)
    expect(dom.cfgWidth.placeholder).toBe("")
    expect(dom.cfgHeight2.placeholder).toBe("")
  })
})
