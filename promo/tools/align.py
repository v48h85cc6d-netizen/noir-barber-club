# Align cue texts to measured speech segments (DP over pause boundaries) and
# emit the master timeline + SRT.   python3 align.py <cues.json> <audioDir> <outDir>
import sys, json
cfg = json.load(open(sys.argv[1])); AD = sys.argv[2]; OUT = sys.argv[3]
def align(cues, segs):
    """Split the speech segments into len(cues) contiguous groups so that each cue's
    spoken length best matches its text length at the chapter's speaking rate."""
    n, m = len(cues), len(segs)
    if n > m: raise SystemExit('more cues than speech segments')
    tot = sum(e - s for s, e in segs); rate = sum(len(c) for c in cues) / tot
    want = [len(c) / rate for c in cues]
    span = lambda a, b: sum(segs[i][1] - segs[i][0] for i in range(a, b))
    from functools import lru_cache
    @lru_cache(None)
    def best(k, a):  # cues k.. starting at segment a
        if k == n - 1: return ((span(a, m) - want[k]) / want[k]) ** 2, (m,)
        out = None
        for b in range(a + 1, m - (n - k - 1) + 1):
            c, rest = best(k + 1, b)
            c += ((span(a, b) - want[k]) / want[k]) ** 2
            if out is None or c < out[0]: out = (c, (b,) + rest)
        return out
    edges = (0,) + best(0, 0)[1]
    return [(segs[edges[i]][0], segs[edges[i + 1] - 1][1]) for i in range(n)]
t = cfg['intro']; chapters = []; srt = []; idx = 1
def ts(x):
    ms = int(round(x * 1000)); return f"{ms//3600000:02}:{ms//60000%60:02}:{ms//1000%60:02},{ms%1000:03}"
for ch in cfg['chapters']:
    meta = json.load(open(f"{AD}/{ch['vo']}.json"))
    spans = align(ch['cues'], meta['segments'])
    cues = [{'text': c, 'start': round(t + s, 3), 'end': round(t + e, 3)} for c, (s, e) in zip(ch['cues'], spans)]
    chapters.append({**{k: ch[k] for k in ('id', 'num', 'title', 'vo')}, 'start': round(t, 3), 'voDur': meta['duration'], 'cues': cues})
    for i, c in enumerate(cues):
        end = cues[i + 1]['start'] - 0.05 if i + 1 < len(cues) else c['end'] + 0.6
        srt.append(f"{idx}\n{ts(c['start'])} --> {ts(end)}\n{c['text']}\n"); idx += 1
    t += meta['duration'] + cfg['gap'] + (cfg.get('extraBeforeEnd', 0.3) if ch['id'] == 'customer' else 0)
total = round(chapters[-1]['start'] + chapters[-1]['voDur'] + cfg['outroHold'], 2)
json.dump({'total': total, 'fps': 30, 'chapters': chapters}, open(f"{OUT}/timeline.json", 'w'), indent=1)
open(f"{OUT}/subtitles.en.srt", 'w').write('\n'.join(srt))
for ch in chapters:
    print(ch['id'], ch['start'])
    for c in ch['cues']: print(f"   {c['start']:7.2f}-{c['end']:7.2f}  {c['text']}")
print('total', total)
