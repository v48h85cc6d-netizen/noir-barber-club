// Captures the REAL NOIR BARBER CLUB interfaces (local production build) as
// high-resolution stills + tap positions for the promo compositor.
// Nothing in the app is modified: this only drives a browser against it.
//   node promo/capture/capture.cjs <baseUrl> <outDir>
// The email code for the customer step is read from the local Resend test
// double (scratch capture server); no real inbox is shown in the video.
const { chromium, devices } = require('playwright');
const fs = require('fs');
const B = process.argv[2] || 'http://localhost:8899';
const OUT = process.argv[3] || './cap';
const CAPTURE = process.env.CAPTURE || 'http://127.0.0.1:8897';
fs.mkdirSync(OUT, { recursive: true });
const manifest = {};
const wait = (p, ms = 700) => p.waitForTimeout(ms);

async function shot(p, name, taps = []) {
  await p.screenshot({ path: `${OUT}/${name}.jpg`, type: 'jpeg', quality: 93 });
  const vp = p.viewportSize();
  manifest[name] = { w: vp.width, h: vp.height, taps };
  console.log('shot', name);
}
async function box(loc) {
  const b = await loc.boundingBox();
  return b ? { x: b.x + b.width / 2, y: b.y + b.height / 2 } : null;
}
async function tap(p, loc) {
  await loc.scrollIntoViewIfNeeded();
  const b = await box(loc);
  await loc.click();
  return b;
}

async function website(br) {
  const ctx = await br.newContext({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  await p.goto(B + '/'); await p.evaluate(() => localStorage.setItem('noir.locale', 'en'));
  await p.reload(); await wait(p, 4500);
  await shot(p, 'web-hero');
  const h = await p.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < h; y += 300) { await p.evaluate((y) => window.scrollTo(0, y), y); await wait(p, 80); }
  await wait(p, 2000);
  for (const id of ['club', 'barbers', 'services', 'gallery', 'gift-cards', 'membership', 'reviews', 'visit']) {
    await p.evaluate((id) => window.scrollTo(0, document.getElementById(id).getBoundingClientRect().top + scrollY + 1), id);
    await wait(p, 1400);
    await shot(p, `web-${id}`);
  }
  for (const loc of ['de', 'sq']) {
    await p.evaluate((l) => { localStorage.setItem('noir.locale', l); window.scrollTo(0, 0) }, loc);
    await p.reload(); await wait(p, 4200);
    await shot(p, `web-hero-${loc}`);
  }
  await ctx.close();
  // phone version of the site
  const m = await br.newContext({ ...devices['iPhone 14'] });
  const q = await m.newPage();
  await q.goto(B + '/'); await q.evaluate(() => localStorage.setItem('noir.locale', 'en'));
  await q.reload(); await wait(q, 4500);
  await shot(q, 'web-m-hero');
  for (const id of ['services', 'barbers']) {
    const hh = await q.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < hh; y += 400) { await q.evaluate((y) => window.scrollTo(0, y), y); await wait(q, 60); }
    await q.evaluate((id) => window.scrollTo(0, document.getElementById(id).getBoundingClientRect().top + scrollY + 1), id);
    await wait(q, 1400);
    await shot(q, `web-m-${id}`);
  }
  await m.close();
}

async function owner(br) {
  const ctx = await br.newContext({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  await p.goto(B + '/staff-login'); await p.evaluate(() => { localStorage.clear(); localStorage.setItem('noir.locale', 'en') });
  await p.reload(); await wait(p, 1200);
  await shot(p, 'own-login');
  await p.fill('input[name=email]', 'Owner@gmail.com'); await p.fill('input[name=password]', 'Owner112233');
  const t = await box(p.locator('form button[type=submit]'));
  await shot(p, 'own-login-filled', [t]);
  await p.click('form button[type=submit]'); await p.waitForURL(/owner\/overview/); await wait(p, 2600);
  await shot(p, 'own-overview');
  for (const m of ['appointments', 'clients', 'barbers', 'services', 'revenue', 'gift-cards', 'memberships']) {
    await p.goto(`${B}/admin/owner/${m}`); await wait(p, 2000);
    await shot(p, `own-${m}`);
    if (m === 'barbers') {
      const b = p.getByRole('button', { name: /Create barber account/ });
      const tb = await tap(p, b); await wait(p, 1100);
      await shot(p, 'own-barbers-create', [tb]);
      await p.keyboard.press('Escape'); await wait(p, 600);
    }
  }
  await ctx.close();
}

async function barber(br) {
  const ctx = await br.newContext({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  // run the day from a morning time so a "next client" is due (time keeps flowing)
  const d = new Date(); d.setDate(d.getDate() + (d.getDay() === 3 ? 1 : 0)); d.setHours(10, 22, 0, 0);
  // shift only Date (not timers/rAF) so Motion animations run normally
  await p.addInitScript((target) => {
    const off = target - Date.now(); const R = Date;
    class D extends R { constructor(...a) { a.length ? super(...a) : super(R.now() + off) } static now() { return R.now() + off } }
    window.Date = D;
  }, d.getTime());
  await p.goto(B + '/staff-login'); await p.evaluate(() => { localStorage.clear(); localStorage.setItem('noir.locale', 'en') });
  await p.reload(); await wait(p, 1200);
  await p.fill('input[name=email]', 'Barber@gmail.com'); await p.fill('input[name=password]', 'Barber@gmail.com');
  const t = await box(p.locator('form button[type=submit]'));
  await shot(p, 'bar-login-filled', [t]);
  await p.click('form button[type=submit]'); await p.waitForURL(/barber\/today/); await wait(p, 2600);
  await shot(p, 'bar-today');
  // walk the focus card: whatever action the real card offers (Done / Arrived / Start)
  for (let i = 1; i <= 4; i++) {
    const btn = p.locator('main section').first().getByRole('button', { name: /^(Arrived|Start|Done)/ });
    if (!(await btn.count())) break;
    const label = (await btn.first().textContent()).trim();
    const tb = await tap(p, btn.first()); await wait(p, 1600);
    await shot(p, `bar-step${i}`, [tb]);
    manifest[`bar-step${i}`].label = label;
  }
  for (const m of ['calendar', 'schedule']) {
    await p.goto(`${B}/admin/barber/${m}`); await wait(p, 2000);
    await shot(p, `bar-${m}`);
  }
  await ctx.close();
}

async function customer(br) {
  const ctx = await br.newContext({ ...devices['iPhone 14'] });
  const p = await ctx.newPage();
  const C = { name: 'Sofia Laurent', email: `sofia.laurent.${Date.now().toString(36)}@example.com`, phone: '+31 6 1234 5678', password: 'NoirClub2026' };
  await p.goto(B + '/account/register'); await p.evaluate(() => { localStorage.clear(); localStorage.setItem('noir.locale', 'en') });
  await p.reload(); await wait(p, 1200);
  await shot(p, 'cus-register');
  for (const [k, v] of Object.entries({ name: C.name, email: C.email, phone: C.phone, password: C.password, confirm: C.password })) await p.fill(`input[name=${k}]`, v);
  await p.locator('form button[type=submit]').scrollIntoViewIfNeeded();
  await shot(p, 'cus-register-filled', [await box(p.locator('form button[type=submit]'))]);
  await p.click('form button[type=submit]'); await p.waitForURL(/\/account\/verify/); await wait(p, 1400);
  await shot(p, 'cus-verify');
  const code = await (await fetch(`${CAPTURE}/code?to=${encodeURIComponent(C.email)}`)).text();
  await p.locator('input[name=digit-1]').fill(code); await wait(p, 500);
  await shot(p, 'cus-verify-code', [await box(p.locator('form button[type=submit]'))]);
  await p.locator('form button[type=submit]').click(); await p.waitForURL(/\/account\/appointments/); await wait(p, 1500);
  await shot(p, 'cus-verified');
  // sign in again with email + password
  await p.getByRole('button', { name: 'Sign out' }).click(); await wait(p, 1000);
  await p.fill('input[name=email]', C.email); await p.fill('input[name=password]', C.password);
  await shot(p, 'cus-login', [await box(p.locator('form button[type=submit]'))]);
  await p.click('form button[type=submit]'); await wait(p, 1600);
  // book
  await p.getByRole('navigation', { name: 'Account menu' }).getByRole('link', { name: 'Book appointment' }).click(); await wait(p, 4800);
  const panel = p.locator('#booking-panel');
  await shot(p, 'cus-b-barber');
  const bb = panel.getByRole('button', { name: /Idris Haddad/ }).first();
  const tb1 = await tap(p, bb); await wait(p, 1100);
  manifest['cus-b-barber'].taps = [tb1];
  await shot(p, 'cus-b-service');
  const sv = panel.getByRole('button', { name: /Skin Fade/ }).first();
  await sv.scrollIntoViewIfNeeded(); await wait(p, 300);
  await shot(p, 'cus-b-service2', [await box(sv)]);
  await sv.click(); await wait(p, 1100);
  await shot(p, 'cus-b-date');
  let picked = false;
  for (let i = 3; i < 21 && !picked; i++) {
    const day = panel.locator('div.grid button[aria-pressed]').nth(i);
    if (!(await day.isEnabled())) continue;
    await day.scrollIntoViewIfNeeded(); await wait(p, 300);
    await shot(p, 'cus-b-date2', [await box(day)]);
    await day.click(); await wait(p, 1100);
    const slots = panel.locator('button.h-11[aria-pressed]:not([disabled])');
    if (await slots.count()) {
      await shot(p, 'cus-b-time');
      const s0 = slots.nth(Math.min(2, (await slots.count()) - 1));
      await s0.scrollIntoViewIfNeeded(); await wait(p, 300);
      await shot(p, 'cus-b-time2', [await box(s0)]);
      await s0.click(); await wait(p, 1100);
      picked = true;
    } else { await panel.getByRole('button', { name: 'Change date' }).click(); await wait(p, 800); }
  }
  await shot(p, 'cus-b-details');
  const cont = panel.getByRole('button', { name: /Continue/ });
  const tc = await tap(p, cont); await wait(p, 1100);
  manifest['cus-b-details'].taps = [tc];
  await shot(p, 'cus-b-review');
  await panel.locator('input[type=checkbox]').check(); await wait(p, 300);
  const cf = panel.getByRole('button', { name: /Confirm booking/ });
  await cf.scrollIntoViewIfNeeded(); await wait(p, 300);
  await shot(p, 'cus-b-review2', [await box(cf)]);
  await cf.click(); await wait(p, 1800);
  await shot(p, 'cus-b-confirmed');
  await panel.getByRole('link', { name: /My appointments/ }).click(); await wait(p, 1800);
  await shot(p, 'cus-appts');
  const item = p.locator('section[aria-labelledby=upcoming-h] li button').first();
  const ti = await tap(p, item); await wait(p, 1300);
  manifest['cus-appts'].taps = [ti];
  await shot(p, 'cus-appt-sheet');
  const sheet = p.locator('[role=dialog]');
  const cancel = sheet.getByRole('button', { name: /Cancel/ }).last();
  if (await cancel.count()) { await cancel.scrollIntoViewIfNeeded(); await wait(p, 400); await shot(p, 'cus-appt-sheet2'); }
  await ctx.close();
}

(async () => {
  const br = await chromium.launch();
  const only = process.env.ONLY ? process.env.ONLY.split(',') : ['website', 'owner', 'barber', 'customer'];
  for (const [n, f] of Object.entries({ website, owner, barber, customer })) if (only.includes(n)) await f(br);
  await br.close();
  const prev = fs.existsSync(`${OUT}/manifest.json`) ? JSON.parse(fs.readFileSync(`${OUT}/manifest.json`, 'utf8')) : {};
  fs.writeFileSync(`${OUT}/manifest.json`, JSON.stringify({ ...prev, ...manifest }, null, 1));
})().catch((e) => { console.error('CRASH', e.message.split('\n').slice(0, 8).join('\n')); process.exit(2); });
