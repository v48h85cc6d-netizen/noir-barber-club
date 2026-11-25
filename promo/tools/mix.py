# Audio mix: narration (placed per chapter), music (re-edited + ducked),
# synthesized UI sound effects. Output 48 kHz stereo WAV.
#   python3 mix.py <timeline.json> <taps.json> <audioDir (raw music.mp3)> <tightVoDir> <out.wav>
import sys, json, subprocess
import numpy as np

TLf, TAPf, AD, VD, OUT = sys.argv[1:6]
TL = json.load(open(TLf)); TAPS = json.load(open(TAPf))
SR = 48000
N = int((TL['total'] + 0.5) * SR)
rng = np.random.default_rng(7)

def load(path, ch=2):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-ac', str(ch), '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, ch).copy()

def place(buf, x, t, gain=1.0):
    i = int(t * SR); j = min(len(buf), i + len(x))
    if j > i: buf[i:j] += x[: j - i] * gain

# ── narration ──
vo = np.zeros((N, 2), np.float32)
for ch in TL['chapters']:
    v = load(f"{VD}/{ch['vo']}.wav", 1)
    place(vo, np.repeat(v, 2, axis=1), ch['start'])
# normalise narration peaks to -3 dBFS
vo *= 0.708 / max(1e-6, np.abs(vo).max())

# ── music: [0, 59.9] + [21.9, 92] (cut before the hits), stretched to the film length ──
m = load(f"{AD}/music.mp3")
def seg(a, b): return m[int(a * SR): int(b * SR)]
A, B = seg(0, 59.9), seg(21.9, 93.5)
xf = int(0.35 * SR); w = np.linspace(0, 1, xf)[:, None]
music = np.concatenate([A[:-xf], A[-xf:] * (1 - w) + B[:xf] * w, B[xf:]])
stretch = (TL['total'] + 0.3) / (len(music) / SR - 1.6)
tmp = OUT + '.music.f32'
music.astype(np.float32).tofile(tmp)
raw = subprocess.run(['ffmpeg', '-v', 'error', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', tmp, '-af', f'atempo={1 / stretch:.5f}', '-f', 'f32le', '-'], capture_output=True, check=True).stdout
music = np.frombuffer(raw, np.float32).reshape(-1, 2).copy()
print('music tempo factor', round(1 / stretch, 4), 'length', round(len(music) / SR, 2))
mus = np.zeros((N, 2), np.float32); place(mus, music, 0.0)
# fade tail
fade = int(1.6 * SR); end = int(TL['total'] * SR)
mus[end - fade:end] *= np.linspace(1, 0, fade)[:, None]; mus[end:] = 0

# ducking from the narration envelope (attack 60 ms, release 450 ms)
env = np.abs(vo[:, 0])
hop = 480; e = np.array([env[i:i + hop].max() for i in range(0, N, hop)])
sm = np.zeros_like(e); a_att, a_rel = np.exp(-1 / (0.06 * 100)), np.exp(-1 / (0.45 * 100)); s = 0
for i, x in enumerate(e):
    s = a_att * s + (1 - a_att) * x if x > s else a_rel * s + (1 - a_rel) * x
    sm[i] = s
duck = np.interp(np.arange(N), np.arange(len(sm)) * hop, np.clip(sm / 0.12, 0, 1))
MUS_FULL, MUS_DUCK = 0.50, 0.25  # relative to normalised music
mus_peak = np.abs(music).max()
# level the music bed (slow RMS levelling so later, louder sections don't crowd the voice)
mono = mus[:, 0] ** 2
win = int(0.5 * SR); r = np.sqrt(np.array([mono[i:i + win].mean() for i in range(0, N, win)]) + 1e-12)
k = 8; rs = np.convolve(np.pad(r, (k // 2, k // 2), mode='edge'), np.ones(k) / k, mode='valid')[: len(r)]
target = np.median(r[r > 1e-4])
lev = np.clip(target / rs, 0.45, 1.6)
mus *= np.interp(np.arange(N), np.arange(len(lev)) * win + win / 2, lev)[:, None]
mus *= ((MUS_FULL - (MUS_FULL - MUS_DUCK) * duck)[:, None] / mus_peak) * 1.4

# ── sound effects (synthesised; no paid SFX) ──
sfx = np.zeros((N, 2), np.float32)
def tick():
    n = int(0.06 * SR); t = np.arange(n) / SR
    body = np.sin(2 * np.pi * 1900 * t) * np.exp(-t * 90) * 0.5 + np.sin(2 * np.pi * 950 * t) * np.exp(-t * 60) * 0.35
    noise = rng.standard_normal(n) * np.exp(-t * 400) * 0.25
    x = (body + noise).astype(np.float32); return np.stack([x * 0.95, x], 1)
def whoosh(dur=1.1, bright=1.0):
    n = int(dur * SR); t = np.arange(n) / SR
    x = rng.standard_normal(n)
    # moving one-pole low-pass for a sweep
    y = np.zeros(n); s0 = 0
    cut = 0.02 + 0.25 * bright * np.sin(np.pi * t / dur) ** 2
    for i in range(n): s0 += cut[i] * (x[i] - s0); y[i] = s0
    envl = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 2
    y = y * envl; y /= np.abs(y).max() + 1e-9
    pan = np.linspace(-0.6, 0.6, n)
    return np.stack([y * (1 - pan) * 0.5, y * (1 + pan) * 0.5], 1).astype(np.float32)
def shimmer(dur=2.4):
    n = int(dur * SR); t = np.arange(n) / SR
    x = sum(np.sin(2 * np.pi * f * t + p) * a for f, a, p in [(1318.5, .3, 0), (1975.5, .22, 1), (2637, .16, 2), (3951, .1, 3)])
    x = x * (1 - np.exp(-t * 30)) * np.exp(-t * 1.6)
    return np.stack([x, np.roll(x, 240)], 1).astype(np.float32)
def boom(dur=2.5):
    n = int(dur * SR); t = np.arange(n) / SR
    f = 55 * np.exp(-t * 0.6)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 2.2) * (1 - np.exp(-t * 80))
    return np.stack([x, x], 1).astype(np.float32)

for t in TAPS: place(sfx, tick(), t, 0.16)
for ch in TL['chapters']:
    if ch['id'] in ('website',): continue
    place(sfx, whoosh(1.2), ch['start'] - 0.75, 0.10)
place(sfx, boom(), 0.25, 0.35); place(sfx, shimmer(), 0.9, 0.07)
endS = TL['chapters'][-1]['start']
place(sfx, whoosh(1.4, 0.7), endS - 0.9, 0.09); place(sfx, boom(), endS - 0.1, 0.28); place(sfx, shimmer(3.0), endS + 0.4, 0.06)
place(sfx, shimmer(3.0), TL['chapters'][-1]['cues'][2]['start'] - 0.1, 0.05)

mix = vo + mus + sfx
peak = np.abs(mix).max(); print('peak before limit', round(float(peak), 3))
mix = np.tanh(mix * 1.0) if peak > 0.98 else mix
mix.astype(np.float32).tofile(tmp)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', tmp,
                '-af', 'loudnorm=I=-15:TP=-1.5:LRA=11', '-ar', str(SR), '-c:a', 'pcm_s24le', OUT], check=True)
for stem, x in (('vo', vo), ('music', mus), ('sfx', sfx)):
    x.astype(np.float32).tofile(tmp)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', tmp, '-c:a', 'pcm_s16le', OUT.replace('.wav', f'.stem-{stem}.wav')], check=True)
import os; os.remove(tmp)
print('wrote', OUT)
