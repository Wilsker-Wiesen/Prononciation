#!/usr/bin/env python3
"""
Baut aus einem Importordner (Wortliste + Audiodateien) fertige App-Pakete (ZIP), je Einheit eines.
Läuft lokal auf dem Rechner der Lehrkraft, nur mit der Python-Standardbibliothek.

  python3 tools/build-packs.py "<Importordner>" "<Zielordner>"

Wortliste (*.tsv/*.csv/*.txt im Importordner), Tab-getrennt, Kopfzeile:
  französisch ⇥ deutsch ⇥ Lektion ⇥ Audiodateiname ⇥ IPA
„Lektion“ hat die Form „D1 Unité 3 – Vokabeln“: vor dem Gedankenstrich die Einheit (= ein Paket),
dahinter der Lektionstitel im Paket. Die Reihenfolge der Zeilen bleibt erhalten (Buchreihenfolge).

IDs sind stabil (aus Einheit und Dateiname abgeleitet): Ein neu gebautes Paket ersetzt beim Import
das alte, der Lernstand bleibt erhalten.

Die Pakete enthalten Verlagsmaterial. Sie gehören nie in ein Git-Repository und nicht auf einen
öffentlichen Server; der Zielordner sollte außerhalb des Repositorys liegen.
"""
from __future__ import annotations

import json
import os
import re
import sys
import unicodedata
import zipfile
from datetime import datetime, timezone

PACK_FORMAT_VERSION = 1  # wie src/types/content.ts
AUDIO_EXT = {'.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.aac': 'audio/aac'}
RIGHTS = 'Lehrwerk-Audio: nur für den eigenen Unterricht, Weitergabe nur mit ausdrücklicher Lizenz.'


def slug(s: str) -> str:
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode()
    return re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')


def split_title(title: str) -> tuple[str, str]:
    i = title.find(' – ')
    return (title[:i].strip(), title[i + 3:].strip()) if i > 0 else (title.strip(), title.strip())


def read_rows(folder: str) -> list[dict]:
    lists = sorted(f for f in os.listdir(folder) if f.lower().endswith(('.tsv', '.csv', '.txt')))
    if not lists:
        sys.exit(f'Keine Wortliste in {folder}')
    rows = []
    for name in lists:
        with open(os.path.join(folder, name), encoding='utf-8-sig') as fh:
            lines = [l.rstrip('\r\n') for l in fh if l.strip()]
        for n, line in enumerate(lines):
            cols = [c.strip() for c in line.split('\t')]
            cols += [''] * (5 - len(cols))
            fr, de, lesson, audio, ipa = cols[:5]
            if n == 0 and fr.lower().startswith(('franz', 'fr')) and de.lower().startswith(('deutsch', 'de')):
                continue  # Kopfzeile
            if not fr:
                continue
            ipa = re.sub(r'^[\[/]|[\]/]$', '', ipa).strip()
            rows.append({'fr': unicodedata.normalize('NFC', fr), 'de': unicodedata.normalize('NFC', de), 'lesson': lesson or 'Import',
                         'audio': audio, 'ipa': unicodedata.normalize('NFC', ipa)})
    return rows


def build(folder: str, out: str) -> None:
    rows = read_rows(folder)
    files = {unicodedata.normalize('NFC', f): f for f in os.listdir(folder)}
    os.makedirs(out, exist_ok=True)
    units: dict[str, dict[str, list[dict]]] = {}
    missing = []
    for r in rows:
        unit, part = split_title(r['lesson'])
        units.setdefault(unit, {}).setdefault(part, []).append(r)
        if r['audio'] and unicodedata.normalize('NFC', r['audio']) not in files:
            missing.append(r['audio'])
    if missing:
        print(f'Warnung: {len(missing)} Audiodateien fehlen, z. B. {missing[:5]}')

    now = datetime.now(timezone.utc).isoformat()
    total_audio = 0
    for index, (unit, parts) in enumerate(units.items()):
        band = unit.split()[0] if unit.split() else ''
        pack_id = f'pack_{slug(unit)}'
        lessons, audio_files = [], []
        for part, entries in parts.items():
            vocab = []
            for r in entries:
                base = os.path.splitext(r['audio'])[0] if r['audio'] else slug(r['fr'])[:40]
                entry = {'id': f'v_{slug(unit)}_{slug(base)}', 'fr': r['fr'], 'de': r['de']}
                if r['ipa']:
                    entry['ipaRef'] = r['ipa']
                src = files.get(unicodedata.normalize('NFC', r['audio'])) if r['audio'] else None
                if src:
                    ext = os.path.splitext(src)[1].lower()
                    asset_id = f'a_{slug(unit)}_{slug(base)}'
                    entry['audioId'] = asset_id
                    audio_files.append((os.path.join(folder, src), f'audio/{asset_id}{ext if ext in AUDIO_EXT else ".mp3"}'))
                vocab.append(entry)
            lessons.append({'id': f'les_{slug(unit)}_{slug(part)}', 'title': part, 'sections': [], 'vocab': vocab, 'texts': []})
        m = re.fullmatch(r'D(\d)', band)
        pack = {
            'id': pack_id, 'title': unit, 'level': f'Lernjahr {m.group(1)}' if m else None,
            'source': 'Klett, Découvertes (Lehrwerk-Audio)' if m else None, 'rightsNote': RIGHTS,
            'sortKey': f'{band}-{index:03d}', 'formatVersion': PACK_FORMAT_VERSION,
            'createdAt': now, 'updatedAt': now, 'lessons': lessons,
        }
        pack = {k: v for k, v in pack.items() if v is not None}
        target = os.path.join(out, f'{slug(unit) or "paket"}.zip')
        # Audio ist schon komprimiert (mp3): speichern statt erneut packen
        with zipfile.ZipFile(target, 'w', compression=zipfile.ZIP_STORED) as z:
            z.writestr('pack.json', json.dumps(pack, ensure_ascii=False, indent=1), compress_type=zipfile.ZIP_DEFLATED)
            z.writestr('LIESMICH.txt', f'Prononciation – Inhaltspaket „{unit}“\n\nImport: App öffnen → Pakete → ZIP-Datei auswählen.\n\nRechtehinweis: {RIGHTS}\n')
            for path, arc in audio_files:
                z.write(path, arc)
        total_audio += len(audio_files)
        size = os.path.getsize(target) / 1_048_576
        print(f'{unit:28s} {sum(len(l["vocab"]) for l in lessons):5d} Einträge  {len(audio_files):5d} Audio  {size:6.1f} MB  → {target}')
    print(f'\n{len(units)} Pakete, {len(rows)} Einträge, {total_audio} Audiodateien.')


if __name__ == '__main__':
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    build(sys.argv[1], sys.argv[2])
