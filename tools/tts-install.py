#!/usr/bin/env python3
"""
Übernimmt Vorbild-Aufnahmen aus dem Workflow „Vorbildstimme erzeugen“ nach public/tts/.

  python3 tools/tts-install.py --primary ordnerA [--fallback ordnerB] [--min 80] [--out public/tts]

Jeder Ordner ist ein entpacktes Release-Zip (tts/*.mp3, tts/manifest.json, auswahl.json).
Je Text gilt die Hauptstimme; nur wenn sie unter --min Punkten liegt und die Ersatzstimme
besser geprüft ist, wird die Ersatzstimme genommen (einheitlicher Klang vor Mischung).
"""
import argparse
import json
import os
import shutil

ap = argparse.ArgumentParser()
ap.add_argument('--primary', required=True)
ap.add_argument('--fallback')
ap.add_argument('--min', type=float, default=80)
ap.add_argument('--out', default='public/tts')
args = ap.parse_args()


def load(d):
    return (json.load(open(os.path.join(d, 'auswahl.json'), encoding='utf-8')),
            json.load(open(os.path.join(d, 'tts', 'manifest.json'), encoding='utf-8')))


p_sel, p_man = load(args.primary)
f_sel, f_man = load(args.fallback) if args.fallback else ({}, None)

shutil.rmtree(args.out, ignore_errors=True)
os.makedirs(args.out)
files, report, used_fallback = {}, [], 0
for key, sel in p_sel.items():
    src, score, who = args.primary, sel['score'], 'A'
    alt = f_sel.get(key)
    if score < args.min and alt and alt['score'] > score:
        src, score, who = args.fallback, alt['score'], 'B'
        used_fallback += 1
    name = key + '.mp3'
    shutil.copy(os.path.join(src, 'tts', name), os.path.join(args.out, name))
    files[key] = name
    report.append((score, who, sel['text']))

credit = p_man['credit'] + (f'; ergänzend {f_man["credit"]}' if f_man and used_fallback else '')
voice = p_man['voice'] + (f'+{f_man["voice"]}' if f_man and used_fallback else '')
json.dump({'voice': voice, 'credit': credit, 'format': 'mp3', 'files': files},
          open(os.path.join(args.out, 'manifest.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=0)

report.sort()
weak = [r for r in report if r[0] < args.min]
with open(os.path.join(args.out, 'PRUEFLISTE.txt'), 'w', encoding='utf-8') as f:
    f.write(f'Vorbildstimme: {credit}\n')
    f.write(f'{len(files)} Aufnahmen, Mittelwert {sum(r[0] for r in report) / len(report):.1f} Punkte, '
            f'Ersatzstimme bei {used_fallback} Texten.\n\nUnter {args.min:.0f} Punkten (bitte nachhören):\n')
    for score, who, text in weak:
        f.write(f'{score:5.0f}  {who}  {text}\n')
print(open(os.path.join(args.out, 'PRUEFLISTE.txt'), encoding='utf-8').read())
