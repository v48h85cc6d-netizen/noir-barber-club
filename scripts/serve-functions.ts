/**
 * Local test server: serves the built site (dist/) and runs the Netlify
 * Functions under /api/* with the same code that runs on Netlify.
 *
 *   npm run build && npx tsx scripts/serve-functions.ts
 *
 * Configure email delivery with the same environment variables as on
 * Netlify (RESEND_API_KEY or SMTP_*, VERIFICATION_SECRET). Set
 * VERIFICATION_STORE=memory to keep verification state in memory.
 */
import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'
import send from '../netlify/functions/verification-send.mts'
import verify from '../netlify/functions/verification-verify.mts'

const PORT = Number(process.env.PORT ?? 8888)
const ROOT = join(import.meta.dirname, '..', 'dist')
const routes: Record<string, (req: Request, ctx: never) => Promise<Response>> = {
  '/api/verification/send': send as never,
  '/api/verification/verify': verify as never,
}
const types: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.woff2': 'font/woff2', '.ico': 'image/x-icon' }

createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host}`)
  const fn = routes[url.pathname]
  if (fn) {
    const chunks: Buffer[] = []
    for await (const c of req) chunks.push(c as Buffer)
    const request = new Request(url, { method: req.method, headers: req.headers as HeadersInit, body: req.method === 'GET' || req.method === 'HEAD' ? undefined : Buffer.concat(chunks) })
    const out = await fn(request, { ip: req.socket.remoteAddress ?? '127.0.0.1' } as never)
    res.writeHead(out.status, Object.fromEntries(out.headers))
    res.end(Buffer.from(await out.arrayBuffer()))
    return
  }
  // static files, SPA fallback to index.html (like public/_redirects)
  let file = normalize(join(ROOT, decodeURIComponent(url.pathname)))
  if (!file.startsWith(ROOT)) file = join(ROOT, 'index.html')
  try {
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html')
  } catch {
    file = join(ROOT, 'index.html')
  }
  try {
    const body = await readFile(file)
    res.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream' })
    res.end(body)
  } catch {
    res.writeHead(404).end()
  }
}).listen(PORT, () => console.log(`site + functions on http://localhost:${PORT}`))
