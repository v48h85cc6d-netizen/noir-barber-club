// NOIR BARBER CLUB — promo compositor.
// Every frame is a pure function of time t (seconds): window.renderAt(t).
// Screens are the REAL captured interfaces (see promo/capture/capture.cjs);
// this file only stages them in 3D (Three.js) with GSAP easing curves.
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js'
import { gsap } from 'gsap'
import logoSvg from './assets/logo-mark.svg'

const Q = new URLSearchParams(location.search)
const W = +Q.get('w') || 1920
const H = +Q.get('h') || 1080
const V = H > W // vertical (9:16) layout
const CAP = Q.get('cap') || '/cap/'
const TL = await (await fetch(Q.get('timeline') || '/build/timeline.json')).json()
const MAN = await (await fetch(CAP + 'manifest.json')).json()

/* ───────────── helpers ───────────── */
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x))
const lerp = (a, b, k) => a + (b - a) * k
const E = {
  io: gsap.parseEase('power2.inOut'),
  o3: gsap.parseEase('power3.out'),
  i3: gsap.parseEase('power3.in'),
  sine: gsap.parseEase('sine.inOut'),
  expo: gsap.parseEase('expo.out'),
}
const prog = (t, a, b, ease = E.io) => ease(clamp((t - a) / (b - a)))
const lerpRect = (r0, r1, k) => r0.map((v, i) => lerp(v, r1[i], k))
const CH = Object.fromEntries(TL.chapters.map((c) => [c.id, c]))
const cue = (ch, i) => CH[ch].cues[i].start
const cueEnd = (ch, i) => CH[ch].cues[i].end
const PX = 0.01 // world units per output pixel at z = 0

/* ───────────── renderer / camera ───────────── */
const canvas = document.getElementById('gl')
canvas.width = W
canvas.height = H
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true, alpha: false })
renderer.setPixelRatio(1)
renderer.setSize(W, H, false)
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.0
const scene = new THREE.Scene()
const CAMZ = 20
const camera = new THREE.PerspectiveCamera((2 * Math.atan((H * PX) / 2 / CAMZ) * 180) / Math.PI, W / H, 0.1, 200)
camera.position.set(0, 0, CAMZ)
const pmrem = new THREE.PMREMGenerator(renderer)
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
const keyLight = new THREE.DirectionalLight(0xfff1d6, 2.2)
keyLight.position.set(-6, 8, 10)
scene.add(keyLight)
const sweep = new THREE.PointLight(0xffe2b0, 0, 30, 1.6)
scene.add(sweep)

/* ───────────── background (charcoal, champagne light, grain, vignette) ───────────── */
const bgMat = new THREE.ShaderMaterial({
  depthWrite: false,
  depthTest: false,
  uniforms: { uT: { value: 0 }, uRes: { value: new THREE.Vector2(W, H) }, uFlash: { value: 0 }, uFade: { value: 1 }, uWarm: { value: 0.5 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.9999, 1.0); }`,
  fragmentShader: `
    varying vec2 vUv; uniform float uT, uFlash, uFade, uWarm; uniform vec2 uRes;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
    void main(){
      vec2 p = vUv; float asp = uRes.x/uRes.y;
      vec2 q = (p - .5) * vec2(asp, 1.);
      vec3 col = mix(vec3(.030,.028,.026), vec3(.075,.068,.060), smoothstep(1.1, .0, length(q*vec2(.8,1.1))));
      // drifting champagne light pools
      vec2 a = vec2(sin(uT*.11)*.55*asp, .28 + sin(uT*.07)*.12);
      vec2 b = vec2(cos(uT*.09)*.6*asp, -.32 + cos(uT*.13)*.1);
      vec3 gold = vec3(.82,.66,.42);
      col += gold * .16 * uWarm * exp(-dot(q-a,q-a)*3.2);
      col += gold * .09 * exp(-dot(q-b,q-b)*4.0);
      // faint floor horizon reflection band
      col += vec3(.06,.05,.04) * exp(-pow((p.y-.18)*9.,2.)) * .6;
      // chapter light sweep
      float s = exp(-pow((q.x + q.y*.35) - (uFlash*2.6-1.3)*asp, 2.) * 22.) * sin(uFlash*3.14159);
      col += gold * s * .35;
      // vignette + grain
      col *= mix(.55, 1., smoothstep(1.25, .25, length(q*vec2(.9,1.))));
      col += (h(p*uRes + fract(uT*7.13)*91.7) - .5) * .022;
      gl_FragColor = vec4(col * uFade, 1.);
    }`,
})
const bg = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), bgMat)
bg.frustumCulled = false
bg.renderOrder = -10
scene.add(bg)

/* ───────────── textures (lazy, cached) ───────────── */
const texCache = new Map()
const maxAniso = renderer.capabilities.getMaxAnisotropy()
function tex(name) {
  if (texCache.has(name)) return texCache.get(name)
  const entry = { tex: null, promise: null, used: 0 }
  entry.promise = (async () => {
    const img = new Image()
    img.src = CAP + name + '.jpg'
    await img.decode()
    const t = new THREE.Texture(img)
    t.colorSpace = THREE.SRGBColorSpace
    t.flipY = false
    t.anisotropy = maxAniso
    t.generateMipmaps = true
    t.minFilter = THREE.LinearMipmapLinearFilter
    t.needsUpdate = true
    entry.tex = t
  })()
  texCache.set(name, entry)
  return entry
}
function evict(keep) {
  for (const [k, e] of texCache) if (!keep.has(k) && e.tex && texCache.size > 10) { e.tex.dispose(); texCache.delete(k) }
}

/* ───────────── screen shader (rounded glass panel, crossfade, sheen, rim) ───────────── */
const screenVS = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`
const screenFS = `
  varying vec2 vUv;
  uniform sampler2D tA, tB; uniform float uMix, uOpacity, uDim, uSheen, uReflect, uRad, uPhone;
  uniform vec2 uSize; // panel size in px
  uniform vec4 uCrop; // phone: content rect inside screen (uv)
  float rbox(vec2 p, vec2 b, float r){ vec2 q = abs(p) - b + r; return length(max(q,0.)) + min(max(q.x,q.y),0.) - r; }
  vec4 samp(sampler2D t, vec2 uv){
    if (uPhone > .5) { vec2 c = (uv - uCrop.xy) / uCrop.zw; if (c.y < 0.) return texture2D(t, vec2(.015, .002)); if (c.y > 1.) return texture2D(t, vec2(.015, .998)); return texture2D(t, c); }
    return texture2D(t, uv);
  }
  void main(){
    vec2 uv = vUv; if (uReflect > .5) uv.y = 1. - uv.y;
    vec2 p = (uv - .5) * uSize;
    float d = rbox(p, uSize*.5, uRad);
    float a = 1. - smoothstep(-1., .5, d);
    vec2 tuv = vec2(uv.x, 1. - uv.y);
    vec3 c = mix(samp(tA, tuv).rgb, samp(tB, tuv).rgb, uMix);
    if (uPhone > .5) {
      // dynamic island + home indicator drawn on the device glass
      vec2 pi = p - vec2(0., uSize.y*.5 - 0.034*uSize.x - 0.032*uSize.x);
      float isl = rbox(pi, vec2(.155, .045)*uSize.x, .045*uSize.x);
      c = mix(c, vec3(0.), 1. - smoothstep(-1., .5, isl));
      vec2 ph = p - vec2(0., -uSize.y*.5 + .028*uSize.x);
      float hom = rbox(ph, vec2(.17, .007)*uSize.x, .007*uSize.x);
      float lum = dot(samp(tA, vec2(.5,.995)).rgb, vec3(.3,.59,.11));
      c = mix(c, vec3(lum > .5 ? .08 : .92), (1. - smoothstep(-1., .5, hom)) * .85);
    }
    c *= 1. - uDim;
    // glass sheen sweeping across
    float s = exp(-pow((uv.x*.9 + (1.-uv.y)*.45) - uSheen, 2.) * 60.);
    c += vec3(1.,.95,.86) * s * .07;
    // champagne rim
    float rim = smoothstep(2.2, .0, abs(d + 1.2));
    c = mix(c, vec3(.86,.72,.5), rim * .55 * (1. - uPhone));
    float alpha = a * uOpacity;
    if (uReflect > .5) alpha *= .16 * smoothstep(.55, 1., uv.y);
    gl_FragColor = vec4(c, alpha);
  }`
const BLANK = new THREE.DataTexture(new Uint8Array([10, 10, 10, 255]), 1, 1)
BLANK.needsUpdate = true
function screenMaterial(phone = false) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      tA: { value: BLANK }, tB: { value: BLANK }, uMix: { value: 0 }, uOpacity: { value: 1 }, uDim: { value: 0 },
      uSheen: { value: -1 }, uReflect: { value: 0 }, uRad: { value: 18 }, uSize: { value: new THREE.Vector2(1, 1) },
      uPhone: { value: phone ? 1 : 0 }, uCrop: { value: new THREE.Vector4(0, 0, 1, 1) },
    },
    vertexShader: screenVS,
    fragmentShader: screenFS,
  })
}

/* glow / shadow card behind a panel */
const glowMat = () =>
  new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uSize: { value: new THREE.Vector2(1, 1) }, uOpacity: { value: 1 } },
    vertexShader: screenVS,
    fragmentShader: `varying vec2 vUv; uniform vec2 uSize; uniform float uOpacity;
      float rbox(vec2 p, vec2 b, float r){ vec2 q = abs(p) - b + r; return length(max(q,0.)) + min(max(q.x,q.y),0.) - r; }
      void main(){ vec2 p = (vUv-.5)*uSize; float d = rbox(p, uSize*.5 - 120., 30.);
        float sh = exp(-max(d,0.)/55.) * .55; float gl = exp(-max(d,0.)/140.) * .10;
        gl_FragColor = vec4(mix(vec3(0.), vec3(.85,.68,.42), gl/(sh+gl+1e-4)), (sh + gl) * uOpacity); }`,
  })

/* ───────────── panel (desktop screen) pool ───────────── */
class Panel {
  constructor() {
    this.g = new THREE.Group()
    this.mat = screenMaterial(false)
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.mat)
    this.rmat = screenMaterial(false)
    this.rmat.uniforms.uReflect.value = 1
    this.refl = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.rmat)
    this.gmat = glowMat()
    this.glow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.gmat)
    this.glow.position.z = -0.05
    this.g.add(this.glow, this.refl, this.mesh)
    scene.add(this.g)
    this.g.visible = false
  }
  set({ w, h, x, y, z = 0, ry = 0, rx = 0, opacity = 1, a, b, mix = 0, dim = 0, sheen = -1, reflect = true, rad = 16, order = 0 }) {
    this.g.visible = opacity > 0.002
    this.g.position.set(x * PX, y * PX, z)
    this.g.rotation.set(rx, ry, 0)
    this.mesh.scale.set(w * PX, h * PX, 1)
    this.refl.scale.set(w * PX, h * PX, 1)
    this.refl.position.y = -(h + 18) * PX
    this.refl.visible = reflect
    this.glow.scale.set((w + 240) * PX, (h + 240) * PX, 1)
    for (const m of [this.mat, this.rmat]) {
      const u = m.uniforms
      u.tA.value = a || BLANK
      u.tB.value = b || a || BLANK
      u.uMix.value = mix
      u.uOpacity.value = opacity
      u.uDim.value = dim
      u.uSheen.value = sheen
      u.uSize.value.set(w, h)
      u.uRad.value = rad
    }
    this.gmat.uniforms.uSize.value.set(w + 240, h + 240)
    this.gmat.uniforms.uOpacity.value = opacity
    this.mesh.renderOrder = order * 3 + 2
    this.refl.renderOrder = order * 3 + 1
    this.glow.renderOrder = order * 3
    return this
  }
  uvToScreen(u, v) {
    const p = new THREE.Vector3(u - 0.5, 0.5 - v, 0).applyMatrix4(this.mesh.matrixWorld).project(camera)
    return [((p.x + 1) / 2) * W, ((1 - p.y) / 2) * H]
  }
}
const panels = Array.from({ length: 8 }, () => new Panel())

/* ───────────── phone (3D body + screen) ───────────── */
const PH_ASPECT = (664 + 78) / 390 // screenshot + status/home areas
function roundedShape(w, h, r) {
  const s = new THREE.Shape()
  s.moveTo(-w / 2 + r, -h / 2)
  s.lineTo(w / 2 - r, -h / 2)
  s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r)
  s.lineTo(w / 2, h / 2 - r)
  s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2)
  s.lineTo(-w / 2 + r, h / 2)
  s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r)
  s.lineTo(-w / 2, -h / 2 + r)
  s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2)
  return s
}
const phone = new THREE.Group()
{
  const sw = 1, sh = PH_ASPECT, bez = 0.045
  const body = new THREE.Mesh(
    new THREE.ExtrudeGeometry(roundedShape(sw + bez * 2, sh + bez * 2, 0.15), { depth: 0.07, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.02, bevelSegments: 4, curveSegments: 10 }),
    new THREE.MeshPhysicalMaterial({ color: 0xb59a6e, metalness: 1, roughness: 0.26, clearcoat: 0.6, clearcoatRoughness: 0.2 }),
  )
  body.position.z = -0.1
  const glass = new THREE.Mesh(new THREE.ShapeGeometry(roundedShape(sw + bez * 1.3, sh + bez * 1.3, 0.13), 10), new THREE.MeshBasicMaterial({ color: 0x050505 }))
  glass.position.z = -0.008
  phone.add(body, glass)
}
const phoneMat = screenMaterial(true)
phoneMat.uniforms.uCrop.value.set(0, 34 / 742, 1, 664 / 742)
const phoneScreen = new THREE.Mesh(new THREE.PlaneGeometry(1, PH_ASPECT), phoneMat)
phoneScreen.renderOrder = 50
phone.add(phoneScreen)
phone.children[0].renderOrder = 48
phone.children[1].renderOrder = 49
const phoneShadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), glowMat())
phoneShadow.renderOrder = 47
phoneShadow.position.z = -0.2
phone.add(phoneShadow)
scene.add(phone)
phone.visible = false
function setPhone({ hpx, x, y, z = 0, ry = 0, rx = 0, rz = 0, opacity = 1, a, b, mix = 0, sheen = -1 }) {
  phone.visible = opacity > 0.002
  const s = (hpx / PH_ASPECT) * PX // screen width in world units
  phone.scale.set(s, s, s)
  phone.position.set(x * PX, y * PX, z)
  phone.rotation.set(rx, ry, rz)
  const u = phoneMat.uniforms
  u.tA.value = a || BLANK
  u.tB.value = b || a || BLANK
  u.uMix.value = mix
  u.uOpacity.value = opacity
  u.uSheen.value = sheen
  u.uSize.value.set(hpx / PH_ASPECT, hpx)
  u.uRad.value = (0.11 * hpx) / PH_ASPECT
  phoneShadow.scale.set(1.9, PH_ASPECT + 0.9, 1)
  phoneShadow.material.uniforms.uSize.value.set(560, 560 * ((PH_ASPECT + 0.9) / 1.9))
  phoneShadow.material.uniforms.uOpacity.value = opacity
  phone.children[0].material.opacity = opacity
  phone.children[0].material.transparent = opacity < 1
  phone.children[1].material.opacity = opacity
  phone.children[1].material.transparent = opacity < 1
}
function phoneUvToScreen(cu, cv) {
  // cu, cv: position inside the screenshot (0..1)
  const crop = phoneMat.uniforms.uCrop.value
  const u = crop.x + cu * crop.z
  const v = crop.y + cv * crop.w
  const p = new THREE.Vector3(u - 0.5, (0.5 - v) * PH_ASPECT, 0).applyMatrix4(phoneScreen.matrixWorld).project(camera)
  return [((p.x + 1) / 2) * W, ((1 - p.y) / 2) * H]
}

/* ───────────── 3D gold logo ───────────── */
const logo = new THREE.Group()
{
  const data = new SVGLoader().parse(logoSvg)
  const shapes = data.paths.flatMap((p) => SVGLoader.createShapes(p))
  const geo = new THREE.ExtrudeGeometry(shapes, { depth: 70, bevelEnabled: true, bevelThickness: 10, bevelSize: 6, bevelSegments: 3, curveSegments: 8 })
  geo.computeBoundingBox()
  const bb = geo.boundingBox
  geo.translate(-(bb.max.x + bb.min.x) / 2, -(bb.max.y + bb.min.y) / 2, -35)
  const mesh = new THREE.Mesh(
    geo,
    new THREE.MeshPhysicalMaterial({ color: 0xd9bb85, metalness: 1, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.12, transparent: true }),
  )
  mesh.scale.set(1, -1, 1) // SVG y-down
  logo.add(mesh)
  logo.userData.w = bb.max.x - bb.min.x
}
scene.add(logo)
logo.visible = false
function setLogo({ wpx, x = 0, y = 0, z = 0, ry = 0, rx = 0, opacity = 1 }) {
  logo.visible = opacity > 0.002
  const s = (wpx * PX) / logo.userData.w
  logo.scale.set(s, s, s)
  logo.position.set(x * PX, y * PX, z)
  logo.rotation.set(rx, ry, 0)
  logo.children[0].material.opacity = opacity
  logo.children[0].renderOrder = 60
}

/* ───────────── layout targets ───────────── */
// Desktop screenshots are 1600×900 CSS px. A "focus" rect [x, y, w, h] (0..1) is
// fitted into the target area; 9:16 uses its own focus rects (intelligent reframe).
const TARGET = V ? { x: 0, y: 70, w: 1000, h: 1240 } : { x: 0, y: 18, w: 1520, h: 820 }
const SHOT_ASPECT = 900 / 1600
function fitFocus(f, target = TARGET) {
  const [fx, fy, fw, fh] = f
  const s = Math.min(target.w / fw, target.h / (fh * SHOT_ASPECT)) // px per normalized width
  const w = s
  const h = s * SHOT_ASPECT
  const cx = (fx + fw / 2 - 0.5) * w
  const cy = (0.5 - (fy + fh / 2)) * h
  return { w, h, x: target.x - cx, y: target.y - cy }
}

/* ───────────── storyboard ───────────── */
const FULL = [0, 0, 1, 1]
const KB = [0.035, 0.035, 0.93, 0.93]
// [start, end, frames, focus16 [from,to], focus9 [from,to], opts]
const S = []
const shot = (start, end, frames, f16, f9, o = {}) => S.push({ start, end, frames: typeof frames === 'string' ? [[start, frames]] : frames, f16, f9, ...o })
// 01 WEBSITE
const ws = CH.website.start
shot(ws - 0.35, cue('website', 2), 'web-hero', [FULL, KB], [[0, 0, 0.5, 1], [0.5, 0, 0.5, 1]], { label: 'Home' })
shot(cue('website', 2), cue('website', 2) + 2.3, 'web-barbers', [FULL, KB], [[0.0, 0, 0.56, 1], [0.44, 0, 0.56, 1]], { label: 'The barbers' })
shot(cue('website', 2) + 2.3, cue('website', 3), 'web-services', [KB, [0, 0.02, 0.9, 0.9]], [[0, 0.02, 0.6, 0.96], [0, 0.1, 0.5, 0.85]], { label: 'Services & prices' })
{
  const a = cue('website', 3), b = cue('website', 4), d = (b - a) / 3
  shot(a, a + d, 'web-gallery', [FULL, KB], [[0.25, 0, 0.6, 1], [0.38, 0, 0.6, 1]], { label: 'Gallery' })
  shot(a + d, a + 2 * d, 'web-membership', [FULL, KB], [[0, 0, 0.55, 1], [0.2, 0, 0.55, 1]], { label: 'Membership' })
  shot(a + 2 * d, b, 'web-gift-cards', [FULL, KB], [[0.0, 0, 0.55, 1], [0.45, 0, 0.55, 1]], { label: 'Gift cards' })
}
shot(cue('website', 4), cue('website', 5), 'web-visit', [FULL, KB], [[0, 0, 0.55, 1], [0.45, 0, 0.55, 1]], { label: 'Find the shop' })
// languages, then desktop + phone (special layout)
shot(cue('website', 5), CH.owner.start - 0.1,
  [[cue('website', 5), 'web-hero'], [cue('website', 5) + 0.7, 'web-hero-de'], [cue('website', 5) + 1.5, 'web-hero-sq'], [cue('website', 5) + 2.3, 'web-hero']],
  [FULL, FULL], [[0, 0, 0.55, 1], [0, 0, 0.55, 1]], { label: 'EN · DE · SQ', duo: true })
// 02 OWNER
const os = CH.owner.start
shot(os - 0.35, cue('owner', 1), 'own-login', [FULL, [0.4, 0.04, 0.6, 0.6]], [[0.5, 0.0, 0.5, 1], [0.58, 0.12, 0.38, 0.7]], { label: 'Staff sign in' })
shot(cue('owner', 1), cue('owner', 2), 'own-login-filled', [[0.4, 0.04, 0.6, 0.6], [0.5, 0.1, 0.5, 0.6]], [[0.58, 0.12, 0.38, 0.7], [0.6, 0.15, 0.36, 0.65]], { label: 'Staff sign in', taps: [[cue('owner', 2) - 0.45, 'own-login-filled', 0]] })
shot(cue('owner', 2), cue('owner', 3), 'own-overview', [FULL, [0.17, 0.0, 0.83, 0.62]], [[0.2, 0.06, 0.42, 0.6], [0.56, 0.06, 0.42, 0.6]], { label: 'Overview' })
shot(cue('owner', 3), cue('owner', 4), 'own-appointments', [FULL, [0.2, 0.04, 0.8, 0.5]], [[0.22, 0.04, 0.4, 0.5], [0.58, 0.04, 0.4, 0.5]], { label: 'Appointments · day board' })
{
  const a = cue('owner', 4), b = cue('owner', 5), d = (b - a) / 3
  shot(a, a + d, 'own-clients', [FULL, KB], [[0.06, 0.1, 0.45, 0.9], [0.3, 0.1, 0.45, 0.9]], { label: 'Clients' })
  shot(a + d, b, [[a + d, 'own-barbers'], [a + 2 * d, 'own-barbers-create']], [FULL, [0.2, 0, 0.8, 0.8]], [[0.14, 0.1, 0.46, 0.9], [0.55, 0.0, 0.45, 1]], { label: 'Barbers · accounts & hours', taps: [[a + 2 * d - 0.35, 'own-barbers-create', 0]] })
}
shot(cue('owner', 5), cue('owner', 6), 'own-services', [FULL, [0.18, 0.05, 0.82, 0.82]], [[0.2, 0.1, 0.45, 0.85], [0.5, 0.1, 0.45, 0.85]], { label: 'Services & prices' })
{
  const a = cue('owner', 6), b = cue('owner', 7), d = (b - a) / 3
  shot(a, a + d, 'own-revenue', [FULL, KB], [[0.18, 0.08, 0.5, 0.62], [0.48, 0.08, 0.5, 0.62]], { label: 'Revenue' })
  shot(a + d, a + 2 * d, 'own-gift-cards', [FULL, KB], [[0.18, 0.08, 0.5, 0.62], [0.48, 0.08, 0.5, 0.62]], { label: 'Gift cards' })
  shot(a + 2 * d, b, 'own-memberships', [FULL, KB], [[0.18, 0.08, 0.5, 0.62], [0.48, 0.08, 0.5, 0.62]], { label: 'Memberships' })
}
shot(cue('owner', 7), CH.barber.start - 0.1, 'own-overview', [FULL, FULL], [FULL, FULL], { label: 'One workspace', ensemble: true })
// 03 BARBER
const bs = CH.barber.start
const BCARD16 = [0.2, 0.06, 0.6, 0.64]
const BCARD9 = [0.3, 0.08, 0.4, 0.58]
shot(bs - 0.35, cue('barber', 1), 'bar-login-filled', [FULL, [0.4, 0.04, 0.6, 0.6]], [[0.5, 0.0, 0.5, 1], [0.58, 0.12, 0.38, 0.7]], { label: 'Staff sign in', taps: [[cue('barber', 1) - 0.5, 'bar-login-filled', 0]] })
shot(cue('barber', 1), cue('barber', 2), 'bar-today', [FULL, [0.1, 0, 0.8, 0.62]], [[0.28, 0, 0.44, 0.75], [0.3, 0.0, 0.42, 0.7]], { label: 'Idris · own workspace' })
{
  const a = cue('barber', 3), b = cue('barber', 4)
  shot(cue('barber', 2), b,
    [[cue('barber', 2), 'bar-step1'], [a + 1.25, 'bar-step2'], [a + 2.6, 'bar-step3'], [a + 3.95, 'bar-step4']],
    [[0.2, 0.04, 0.6, 0.66], BCARD16], [BCARD9, BCARD9],
    { label: 'Today · next client', taps: [[a + 0.8, 'bar-step2', 0], [a + 2.15, 'bar-step3', 0], [a + 3.5, 'bar-step4', 0]] })
}
shot(cue('barber', 4), cue('barber', 4) + 1.9, 'bar-calendar', [FULL, KB], [[0.27, 0, 0.46, 0.9], [0.27, 0.05, 0.46, 0.9]], { label: 'Calendar' })
shot(cue('barber', 4) + 1.9, CH.customer.start - 0.1, 'bar-schedule', [FULL, KB], [[0.27, 0, 0.46, 0.9], [0.27, 0.05, 0.46, 0.9]], { label: 'Schedule' })

// 04 CUSTOMER — phone frames [time, screenshot]
const cs = CH.customer.start
const PF = [
  [cs - 0.4, 'cus-register'],
  [cue('customer', 1) + 1.2, 'cus-register-filled'],
  [cue('customer', 2) - 0.2, 'cus-verify'],
  [cue('customer', 3) + 0.4, 'cus-verify-code'],
  [cue('customer', 3) + 2.3, 'cus-verified'],
  [cue('customer', 4), 'cus-login'],
  [cue('customer', 5), 'cus-b-barber'],
  [cue('customer', 6) - 0.4, 'cus-b-service'],
  [cue('customer', 6) + 0.5, 'cus-b-service2'],
  [cue('customer', 7) - 0.1, 'cus-b-date2'],
  [cue('customer', 7) + 1.1, 'cus-b-time2'],
  [cue('customer', 8) - 0.1, 'cus-b-review2'],
  [cue('customer', 9) - 0.15, 'cus-b-confirmed'],
  [cue('customer', 10), 'cus-appts'],
  [cue('customer', 10) + 2.7, 'cus-appt-sheet'],
  [cue('customer', 11) + 0.1, 'cus-appt-sheet2'],
]
const PT = [
  [cue('customer', 2) - 0.75, 'cus-register-filled'],
  [cue('customer', 3) + 1.8, 'cus-verify-code'],
  [cue('customer', 5) - 0.5, 'cus-login'],
  [cue('customer', 6) - 0.85, 'cus-b-barber'],
  [cue('customer', 7) - 0.55, 'cus-b-service2'],
  [cue('customer', 7) + 0.65, 'cus-b-date2'],
  [cue('customer', 8) - 0.55, 'cus-b-time2'],
  [cue('customer', 9) - 0.6, 'cus-b-review2'],
  [cue('customer', 10) + 2.2, 'cus-appts'],
]
const STEPS = [
  [cs - 0.3, '', 'On their phone'],
  [cue('customer', 1), '01', 'Create an account'],
  [cue('customer', 2), '02', 'Verify the email'],
  [cue('customer', 4), '03', 'Sign in'],
  [cue('customer', 5), '04', 'Barber · service'],
  [cue('customer', 7), '05', 'Date · time'],
  [cue('customer', 8), '06', 'Review · confirm'],
  [cue('customer', 10), '07', 'My appointments'],
]
const ALLTAPS = []
for (const s of S) for (const tp of s.taps || []) ALLTAPS.push(tp[0])
for (const tp of PT) ALLTAPS.push(tp[0])
window.TAPS = ALLTAPS.sort((a, b) => a - b)

/* ───────────── DOM overlays ───────────── */
const $ = (id) => document.getElementById(id)
const css = (el, o) => Object.assign(el.style, o)
document.body.classList.add(V ? 'v' : 'h')
const ui = { sub: $('sub'), title: $('title'), tnum: $('tnum'), tname: $('tname'), chapters: $('chapters'), label: $('label'), note: $('note'), step: $('step'), snum: $('snum'), sname: $('sname'), end: $('end'), endA: $('endA'), endB: $('endB'), three: $('three'), taps: $('taps') }
const CHIDS = ['website', 'owner', 'barber', 'customer']
ui.chapters.innerHTML = CHIDS.map((id) => `<span data-id="${id}"><i>${CH[id].num}</i>${CH[id].title.replace('The ', '')}</span>`).join('')
const tapEls = Array.from({ length: 3 }, () => {
  const d = document.createElement('div')
  d.className = 'tap'
  ui.taps.appendChild(d)
  return d
})

function frameAt(frames, t, xf = 0.32) {
  let i = 0
  for (let k = 0; k < frames.length; k++) if (t >= frames[k][0]) i = k
  const cur = frames[i][1]
  const prev = i > 0 ? frames[i - 1][1] : cur
  const mix = i > 0 ? E.io(clamp((t - frames[i][0]) / xf)) : 1
  return { a: prev, b: cur, mix }
}

/* ───────────── per-frame composition ───────────── */
async function renderAt(t) {
  const need = new Set()
  const jobs = [] // deferred setters after textures are ready
  let pi = 0
  let activeLabel = ''
  const tapsNow = []

  // background
  bgMat.uniforms.uT.value = t
  let flash = 0
  for (const id of CHIDS) { const c = CH[id].start; if (t > c - 0.6 && t < c + 0.9) flash = clamp((t - (c - 0.6)) / 1.5) }
  bgMat.uniforms.uFlash.value = flash
  bgMat.uniforms.uFade.value = prog(t, 0, 1.2, E.sine) * (1 - prog(t, TL.total - 1.0, TL.total, E.sine))

  // desktop shots
  const TIN = 0.62
  for (const s of S) {
    if (t < s.start - TIN / 2 || t > s.end + TIN / 2) continue
    const kin = E.o3(clamp((t - (s.start - TIN / 2)) / TIN))
    const kout = E.i3(clamp((t - (s.end - TIN / 2)) / TIN))
    const k = clamp((t - s.start) / (s.end - s.start))
    const [f0, f1] = V ? s.f9 : s.f16
    const f = lerpRect(f0, f1, E.sine(k))
    const fr = frameAt(s.frames, t)
    need.add(fr.a); need.add(fr.b)
    let L = fitFocus(f)
    let opacity = kin * (1 - kout)
    let x = L.x + (1 - kin) * 260 - kout * 260
    let y = L.y
    let z = -(1 - kin) * 2.2 - kout * 2.2
    let ry = (1 - kin) * -0.28 + kout * 0.28 + lerp(-0.035, 0.035, k)
    let rx = lerp(0.02, -0.01, k)
    let dim = 0
    if (s.duo) {
      // desktop shifts aside so the phone version can join
      const d = prog(t, s.start + 2.9, s.start + 3.7)
      const D = V ? { x: 0, y: 420, w: 1000, h: 560 } : { x: -250, y: 30, w: 1180, h: 680 }
      const L2 = fitFocus(V ? [0, 0, 1, 1] : [0, 0, 1, 1], D)
      L = { w: lerp(L.w, L2.w, d), h: lerp(L.h, L2.h, d), x: lerp(L.x, L2.x, d), y: lerp(L.y, L2.y, d) }
      x = L.x + (1 - kin) * 260 - kout * 260
      y = L.y
      ry += d * 0.12
      activeLabel = d > 0.5 ? 'Desktop · mobile' : s.label
    } else if (k > 0.02 && k < 0.98) activeLabel = s.label
    if (s.ensemble) {
      // one central workspace: the modules gather around the overview
      const e = prog(t, s.start, s.start + 1.4, E.o3)
      const mods = ['own-appointments', 'own-clients', 'own-services', 'own-revenue', 'own-gift-cards', 'own-memberships']
      const ring = V
        ? [[-300, 640], [300, 640], [-330, -40], [330, -40], [-300, -700], [300, -700]]
        : [[-640, 300], [0, 360], [640, 300], [-640, -300], [0, -360], [640, -300]]
      mods.forEach((m, i) => {
        need.add(m)
        const [mx, my] = ring[i]
        const w = V ? 520 : 560
        jobs.push(() => panels[pi++].set({
          w, h: w * SHOT_ASPECT, x: lerp(0, mx, e), y: lerp(0, my, e) + 18, z: -1.6 - (1 - e) * 2, ry: (mx / 640) * -0.18, rx: (my / 360) * 0.1,
          opacity: e * 0.9 * (1 - kout), a: texCache.get(m).tex, sheen: lerp(-0.5, 1.6, prog(t, s.start + 0.4, s.end)), reflect: false, order: 0,
        }))
      })
      const cw = V ? 820 : 900
      L = { w: cw, h: cw * SHOT_ASPECT, x: 0, y: 18 }
      x = L.x
      y = L.y
      z = lerp(0, 1.2, e)
      ry = 0
    }
    const ts = t
    jobs.push(() => {
      const p = panels[pi++]
      p.set({ w: L.w, h: L.h, x, y, z, ry, rx, opacity, a: texCache.get(fr.a).tex, b: texCache.get(fr.b).tex, mix: fr.mix, dim, sheen: lerp(-0.6, 1.8, clamp((ts - s.start) / 3.2)), order: 2, reflect: !V || true })
      p.g.updateMatrixWorld(true)
      for (const [tt, key, idx] of s.taps || []) {
        if (ts < tt - 0.25 || ts > tt + 0.7) continue
        const m = MAN[key]
        const tp = m.taps[idx]
        const [sx, sy] = p.uvToScreen(tp.x / m.w, tp.y / m.h)
        tapsNow.push({ x: sx, y: sy, k: (ts - tt) })
      }
    })
  }

  // phone
  let phoneOn = false
  {
    let P = null
    const duo = S.find((s) => s.duo)
    const pStartDuo = duo.start + 3.0
    if (t > pStartDuo - 0.3 && t < duo.end + 0.4) {
      const kin = prog(t, pStartDuo, pStartDuo + 0.9, E.o3)
      const kout = prog(t, duo.end - 0.2, duo.end + 0.4, E.i3)
      need.add('web-m-hero')
      P = { hpx: V ? 900 : 760, x: V ? 230 : 560, y: V ? -330 : 0, z: 1.2, ry: lerp(-0.9, -0.22, kin) - kout * 0.6, rx: 0.04, opacity: kin * (1 - kout), a: 'web-m-hero', mix: 0 }
    }
    const cStart = cs - 0.5
    const cEnd = CH.end.start + 0.2
    if (t > cStart && t < cEnd) {
      const kin = prog(t, cStart, cStart + 1.3, E.o3)
      const kout = prog(t, cEnd - 0.6, cEnd, E.i3)
      const fr = frameAt(PF, t, 0.3)
      need.add(fr.a); need.add(fr.b)
      const k = (t - cStart) / (cEnd - cStart)
      const float = Math.sin(t * 0.8) * 6
      P = {
        hpx: V ? 1250 : 860, x: V ? 0 : 300, y: (V ? -70 : 20) + float, z: lerp(-3, 0, kin) + kout * 2,
        ry: lerp(-1.1, -0.16, kin) + Math.sin(t * 0.35) * 0.05 + kout * 0.4, rx: lerp(0.25, 0.03, kin), rz: lerp(-0.08, 0, kin),
        opacity: clamp(kin * 1.4) * (1 - kout), a: fr.a, b: fr.b, mix: fr.mix, sheen: lerp(-0.5, 1.9, (k * 9) % 1),
      }
      for (const [tt, key] of PT) {
        if (t < tt - 0.25 || t > tt + 0.7) continue
        const m = MAN[key]
        tapsNow.push({ phone: true, cu: m.taps[0].x / m.w, cv: m.taps[0].y / m.h, k: t - tt })
      }
    }
    if (P) {
      phoneOn = true
      jobs.push(() => {
        setPhone({ ...P, a: texCache.get(P.a).tex, b: P.b ? texCache.get(P.b).tex : undefined })
        phone.updateMatrixWorld(true)
      })
    }
  }

  // intro + end: 3D logo, and the three experiences
  let logoOn = false
  {
    const endS = CH.end.start
    if (t < CH.website.start + 0.2) {
      const k = prog(t, 0, 2.6, E.expo)
      const out = prog(t, 2.35, 3.15, E.i3)
      setLogo({ wpx: (V ? 760 : 1000) * lerp(0.86, 1, k), y: 0, z: lerp(-6, 0, k) + out * 9, ry: lerp(0.75, 0, k) + Math.sin(t) * 0.02, rx: lerp(-0.25, 0, k), opacity: clamp(t / 0.8) * (1 - out) })
      sweep.intensity = 60
      sweep.position.set(lerp(-14, 12, prog(t, 0.2, 2.8, E.sine)), 3, 6)
      logoOn = true
    } else if (t > endS - 0.4) {
      const kin = prog(t, endS - 0.4, endS + 1.4, E.expo)
      const up = prog(t, cue('end', 1) - 0.2, cue('end', 1) + 0.8) * (1 - prog(t, cue('end', 2) - 0.3, cue('end', 2) + 0.9))
      const fin = prog(t, cue('end', 2) - 0.3, cue('end', 2) + 1.0)
      const W0 = V ? 760 : 1000
      setLogo({ wpx: W0 * lerp(1, 0.62, up) * lerp(1, 0.9, fin), y: lerp(V ? 40 : 40, V ? 640 : 330, up) + fin * (V ? 120 : 90), z: lerp(-8, 0, kin), ry: lerp(-0.9, 0, kin) + Math.sin(t * 0.6) * 0.04, rx: lerp(0.3, 0, kin), opacity: clamp((t - endS + 0.4) / 0.9) })
      sweep.intensity = 60
      sweep.position.set(lerp(-14, 14, prog(t, endS, endS + 3.2, E.sine)) + lerp(0, -28, prog(t, cue('end', 2), cue('end', 2) + 2.6, E.sine)), 2.5, 6)
      logoOn = true
      // three experiences
      if (up > 0.001) {
        const trio = [['own-overview', V ? [-40, 300] : [-560, -150]], ['bar-today', V ? [-120, -170] : [560, -150]]]
        trio.forEach(([m, [mx, my]], i) => {
          need.add(m)
          const w = V ? 720 : 620
          jobs.push(() => panels[pi++].set({ w, h: w * SHOT_ASPECT, x: mx * up + (i ? 80 : -80) * (1 - up), y: lerp(-80, my, up), z: -0.5, ry: (i ? -0.16 : 0.16) * (V ? 0.3 : 1), opacity: up, a: texCache.get(m).tex, reflect: false, sheen: lerp(-0.5, 1.6, up), order: 1 }))
        })
        need.add('cus-appts')
        const pin = up
        jobs.push(() => {
          setPhone({ hpx: V ? 700 : 560, x: V ? 290 : 0, y: (V ? -420 : -190) + (1 - pin) * -60, z: 0.6, ry: -0.12, rx: 0.04, opacity: pin, a: texCache.get('cus-appts').tex })
          phone.updateMatrixWorld(true)
        })
        phoneOn = true
      }
    }
    if (!logoOn) { logo.visible = false; sweep.intensity = 0 }
  }

  // load what this frame needs, then apply
  await Promise.all([...need].map((n) => tex(n).promise))
  evict(need)
  for (const p of panels) p.g.visible = false
  if (!phoneOn) phone.visible = false
  jobs.forEach((j) => j())

  renderer.render(scene, camera)

  /* ── overlays ── */
  // chapter title card
  let titleOp = 0, tch = null
  for (const id of CHIDS) {
    const c = CH[id].start
    const o = prog(t, c - 0.45, c + 0.25, E.o3) * (1 - prog(t, c + 2.0, c + 2.6, E.sine))
    if (o > titleOp) { titleOp = o; tch = CH[id] }
  }
  if (tch) { ui.tnum.textContent = tch.num; ui.tname.textContent = tch.title }
  css(ui.title, { opacity: titleOp, transform: `translateY(${(1 - titleOp) * 14}px)`, letterSpacing: `${lerp(0.5, 0.18, titleOp)}em` })
  // chapter rail
  const cur = [...CHIDS].reverse().find((id) => t >= CH[id].start - 0.4)
  const railOp = prog(t, CH.website.start - 0.2, CH.website.start + 0.6) * (1 - prog(t, CH.end.start - 0.6, CH.end.start))
  css(ui.chapters, { opacity: railOp })
  for (const el of ui.chapters.children) el.classList.toggle('on', el.dataset.id === cur)
  // label
  const labelOp = activeLabel && titleOp < 0.5 && t < CH.customer.start - 0.3 && t > CH.website.start ? 1 : 0
  ui.label.textContent = activeLabel
  css(ui.label, { opacity: labelOp })
  // subtitles
  let subText = '', subOp = 0
  for (const ch of TL.chapters) {
    ch.cues.forEach((c, i) => {
      const next = ch.cues[i + 1]
      const end = next ? next.start - 0.04 : c.end + 0.5
      if (t >= c.start - 0.08 && t < end) { subText = c.text; subOp = prog(t, c.start - 0.08, c.start + 0.12, E.sine) * (1 - prog(t, end - 0.12, end, E.sine)) }
    })
  }
  if (ui.sub.firstChild?.textContent !== subText) ui.sub.innerHTML = subText ? `<span>${subText}</span>` : ''
  css(ui.sub, { opacity: subOp })
  // honesty notes
  let note = ''
  if (t > CH.owner.start + 0.5 && t < CH.customer.start - 0.3) note = 'Dashboards shown with demo data · demo mode'
  if (t > cue('customer', 2) - 0.2 && t < cue('customer', 4)) note = 'Recorded locally: the code was read from a test mail capture, not a real inbox'
  if (t > cue('customer', 9) - 0.2 && t < CH.end.start - 0.5) note = 'Demo booking · stored in the browser · no payment taken'
  ui.note.textContent = note
  css(ui.note, { opacity: note ? 1 : 0 })
  // customer step
  let st = null
  for (const s of STEPS) if (t >= s[0]) st = s
  const stepOp = prog(t, cs - 0.4, cs + 0.4) * (1 - prog(t, CH.end.start - 0.6, CH.end.start - 0.1))
  if (st) { ui.snum.textContent = st[1]; ui.sname.textContent = st[2] }
  const sk = st ? clamp((t - st[0]) / 0.45) : 1
  css(ui.step, { opacity: stepOp * E.o3(sk), transform: `translateY(${(1 - E.o3(sk)) * 18}px)` })
  // end text
  const eA = prog(t, CH.end.start + 0.3, CH.end.start + 1.3) * (1 - prog(t, cue('end', 1) - 0.4, cue('end', 1)))
  const eB = prog(t, cue('end', 2) + 0.2, cue('end', 2) + 1.4)
  const e3 = prog(t, cue('end', 1) + 0.1, cue('end', 1) + 0.8) * (1 - prog(t, cue('end', 2) - 0.4, cue('end', 2) + 0.2))
  css(ui.endA, { opacity: eA })
  css(ui.endB, { opacity: eB, letterSpacing: `${lerp(0.42, 0.24, eB)}em` })
  css(ui.three, { opacity: e3 })
  css(ui.end, { opacity: 1 - prog(t, TL.total - 0.9, TL.total - 0.1, E.sine) })
  // taps
  tapEls.forEach((el, i) => {
    const tp = tapsNow[i]
    if (!tp) return css(el, { opacity: 0 })
    const [x, y] = tp.phone ? phoneUvToScreen(tp.cu, tp.cv) : [tp.x, tp.y]
    const press = tp.k < 0 ? E.o3(clamp((tp.k + 0.25) / 0.25)) : 1
    const ring = clamp(tp.k / 0.6)
    css(el, { left: x + 'px', top: y + 'px', opacity: tp.k < 0 ? press * 0.95 : (1 - ring) * 0.95, '--r': `${lerp(1, 2.4, E.o3(ring))}`, '--c': `${tp.k < 0 ? 1 : lerp(0.86, 1, ring)}` })
  })
}

window.renderAt = renderAt
window.TOTAL = TL.total
window.FPS = TL.fps
await document.fonts.ready
window.READY = true
