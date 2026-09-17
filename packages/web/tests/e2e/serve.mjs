/**
 * Minimaler statischer HTTP-Server für den Playwright-Smoke-Test.
 *
 * Serve packages/web/ auf 127.0.0.1:8931 — bewusst ohne Cache-Header,
 * damit jeder Test-Lauf frische Daten liefert (Issue #16).
 */
import { createServer } from "node:http"
import { readFile, stat } from "node:fs/promises"
import { extname, join, normalize } from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = fileURLToPath(new URL("../..", import.meta.url))
const PORT = 8931

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", `http://127.0.0.1:${PORT}`)
    let path = decodeURIComponent(url.pathname)
    if (path.endsWith("/")) path += "index.html"
    const file = normalize(join(ROOT, path))
    if (!file.startsWith(ROOT)) {
      res.writeHead(403).end("Forbidden")
      return
    }
    const st = await stat(file).catch(() => null)
    if (!st || st.isDirectory()) {
      res.writeHead(404).end("Not Found")
      return
    }
    const body = await readFile(file)
    res.writeHead(200, {
      "Content-Type": MIME[extname(file)] ?? "application/octet-stream",
      // Bewusst KEINE Cache-Header — jeder Lauf liefert frisch aus
      "Cache-Control": "no-store",
    })
    res.end(body)
  } catch (err) {
    res.writeHead(500).end(String(err))
  }
})

server.listen(PORT, "127.0.0.1", () => {
  console.log(`[serve] packages/web on http://127.0.0.1:${PORT}`)
})
