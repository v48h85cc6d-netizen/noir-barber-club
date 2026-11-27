# Tighten narration pauses (cap long silences) and export speech-segment timings.
#   python3 tighten.py <in.wav> <out.wav> <segments.json>
import sys, json, subprocess, numpy as np
src, dst, segf = sys.argv[1:4]
SR = 48000
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', src, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True).stdout
a = np.frombuffer(raw, dtype=np.float32).copy()
hop = int(SR * 0.01)
env = np.array([np.sqrt(np.mean(a[i:i + hop] ** 2)) for i in range(0, len(a), hop)])
db = 20 * np.log10(env + 1e-9)
voiced = db > -38
# silences of >= 0.28 s
sil, i, n = [], 0, len(voiced)
while i < n:
    if not voiced[i]:
        j = i
        while j < n and not voiced[j]: j += 1
        if (j - i) * 0.01 >= 0.14 or i == 0 or j == n: sil.append((i, j))
        i = j
    else: i += 1
import os
CAP, KEEP = float(os.environ.get("CAP", 0.62)), float(os.environ.get("KEEP", 0.52))
out, segs, t, prev = [], [], 0.0, 0
for k, (s, e) in enumerate(sil):
    speech = a[prev * hop:s * hop]
    if len(speech):
        segs.append([round(t, 3), round(t + len(speech) / SR, 3)]); out.append(speech); t += len(speech) / SR
    dur = (e - s) * 0.01
    if s == 0: keep = 0.04
    elif e == n: keep = 0.15
    else: keep = dur if dur <= CAP else KEEP
    ks = int(keep * SR); mid = (s * hop + e * hop) // 2
    out.append(a[max(s * hop, mid - ks // 2): max(s * hop, mid - ks // 2) + ks]); t += ks / SR
    prev = e
if prev < n:
    speech = a[prev * hop:]; segs.append([round(t, 3), round(t + len(speech) / SR, 3)]); out.append(speech); t += len(speech) / SR
y = np.concatenate(out)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-', dst], input=y.astype(np.float32).tobytes(), check=True)
json.dump({'duration': round(len(y) / SR, 3), 'segments': segs}, open(segf, 'w'))
print(src, 'orig', round(len(a) / SR, 2), '→', round(len(y) / SR, 2), 'segments', len(segs))
