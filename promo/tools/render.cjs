// Deterministic frame renderer: serves the compositor, seeks every frame and
// pipes JPEG frames into ffmpeg.
//   node render.cjs --w 1920 --h 1080 --cap <dir> --out video.mp4 [--from 0 --to 10] [--stills 3,40,90 --stillsDir d]
const http = require('http')
const fs = require('fs')
const path = require('path')
const { spawn } = require('child_process')
const { chromium } = require('playwright')

const A = Object.fromEntries(process.argv.slice(2).reduce((acc, v, i, a) => (v.startsWith('--') ? [...acc, [v.slice(2), a[i + 1]]] : acc), []))
const W = +A.w || 1920, H = +A.h || 1080
const ROOT = path.resolve(__dirname, '..')
const CAP = path.resolve(A.cap)
const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' }
const srv = http.createServer((req, res) => {
  const u = decodeURIComponent(new URL(req.url, 'http://x').pathname)
  let f
  if (u.startsWith('/cap/')) f = path.join(CAP, u.slice(5))
  else if (u.startsWith('/build/')) f = path.join(ROOT, 'build', u.slice(7))
  else f = path.join(ROOT, 'compositor', u === '/' ? 'index.html' : u)
  fs.readFile(f, (e, d) => (e ? res.writeHead(404).end() : res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' }).end(d)))
})

;(async () => {
  await new Promise((r) => srv.listen(0, r))
  const port = srv.address().port
  const br = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'] })
  const p = await br.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 })
  p.on('pageerror', (e) => console.error('PAGEERROR', e.message))
  p.on('console', (m) => m.type() === 'error' && console.error('CONSOLE', m.text()))
  await p.goto(`http://127.0.0.1:${port}/?w=${W}&h=${H}`)
  await p.waitForFunction(() => window.READY === true, null, { timeout: 120000 })
  const total = await p.evaluate(() => window.TOTAL)
  const fps = +A.fps || (await p.evaluate(() => window.FPS))
  const cdp = await p.context().newCDPSession(p)
  const grab = async () => Buffer.from((await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 94, clip: { x: 0, y: 0, width: W, height: H, scale: 1 } })).data, 'base64')

  if (A.taps) { fs.writeFileSync(A.taps, JSON.stringify(await p.evaluate(() => window.TAPS))); console.log('taps written') } else if (A.stills) {
    fs.mkdirSync(A.stillsDir, { recursive: true })
    for (const s of A.stills.split(',').map(Number)) {
      await p.evaluate((t) => window.renderAt(t), s)
      fs.writeFileSync(path.join(A.stillsDir, `${W}x${H}-${String(s.toFixed(2)).padStart(7, '0')}.jpg`), await grab())
      console.log('still', s)
    }
  } else {
    const from = +A.from || 0, to = A.to ? +A.to : total
    const n = Math.round((to - from) * fps)
    const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '14', '-pix_fmt', 'yuv420p', '-r', String(fps), A.out], { stdio: ['pipe', 'inherit', 'inherit'] })
    const t0 = Date.now()
    for (let i = 0; i < n; i++) {
      const t = from + i / fps
      await p.evaluate((t) => window.renderAt(t), t)
      const buf = await grab()
      if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r))
      if (i % 150 === 0) console.log(`${W}x${H} frame ${i}/${n} t=${t.toFixed(2)} ${((Date.now() - t0) / 1000 / (i + 1)).toFixed(3)}s/frame`)
    }
    ff.stdin.end()
    await new Promise((r) => ff.on('close', r))
    console.log('done', A.out, ((Date.now() - t0) / 1000).toFixed(0) + 's')
  }
  await br.close()
  srv.close()
})().catch((e) => { console.error('CRASH', e); process.exit(2) })
