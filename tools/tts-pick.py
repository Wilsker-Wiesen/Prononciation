#!/usr/bin/env python3
"""
Wählt je Text die beste Synthese-Variante (höchste Prüfpunktzahl des Phonem-Erkenners).

  python3 tools/tts-pick.py --texts texts.json --out final --min 80 variante1 variante2 ...

Jede Variante ist ein Ordner mit wav/<key>.wav und report.json (validate-model.mjs).
Ergebnis: final/wav/<key>.wav, final/auswahl.json und final/pruefliste.txt mit allen
Texten, die in keiner Variante die Mindestpunktzahl erreichen (zum Nachhören).
"""
import argparse
import json
import os
import shutil

ap = argparse.ArgumentParser()
ap.add_argument('--texts', required=True)
ap.add_argument('--out', required=True)
ap.add_argument('--min', type=float, default=80)
ap.add_argument('variants', nargs='+')
args = ap.parse_args()

texts = {r['key']: r['text'] for r in json.load(open(args.texts, encoding='utf-8'))}
scores = {}  # key -> [(score, variant, heard)]
for v in args.variants:
    rep = json.load(open(os.path.join(v, 'report.json'), encoding='utf-8'))
    for row in rep['rows']:
        scores.setdefault(row['key'], []).append((row['overall'], v, row['heard']))

os.makedirs(os.path.join(args.out, 'wav'), exist_ok=True)
choice, check = {}, []
for key, text in texts.items():
    cands = sorted(scores.get(key, []), key=lambda c: -c[0])
    if not cands:
        check.append(f'FEHLT  {text}')
        continue
    best, variant, heard = cands[0]
    shutil.copy(os.path.join(variant, 'wav', key + '.wav'), os.path.join(args.out, 'wav', key + '.wav'))
    choice[key] = {'text': text, 'score': best, 'variant': os.path.basename(variant), 'heard': heard}
    if best < args.min:
        check.append(f'{best:3.0f}  {text}  (gehört [{heard}], Variante {os.path.basename(variant)})')

json.dump(choice, open(os.path.join(args.out, 'auswahl.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
with open(os.path.join(args.out, 'pruefliste.txt'), 'w', encoding='utf-8') as f:
    f.write(f'Texte unter {args.min:.0f} Punkten in allen Varianten (bitte nachhören):\n\n')
    f.write('\n'.join(check) + '\n')
mean = sum(c['score'] for c in choice.values()) / max(1, len(choice))
print(f'{len(choice)} Texte, Mittelwert {mean:.1f}, {len(check)} auf der Prüfliste')
print('\n'.join(check))
