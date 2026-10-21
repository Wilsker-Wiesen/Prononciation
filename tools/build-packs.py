#!/usr/bin/env python3
"""
Baut aus einem Importordner (Wortliste + Audiodateien) fertige App-Pakete (ZIP).
Läuft lokal auf dem Rechner der Lehrkraft, nur mit der Python-Standardbibliothek.

  python3 tools/build-packs.py "<Importordner>" "<Zielordner>" [--per-unit]

Standard: ein Paket je Band (z. B. „Découvertes 1“) mit Lektionen wie „Unité 3 – Vokabeln“.
Mit --per-unit: ein Paket je Einheit (früheres Verhalten).

Wortliste (*.tsv/*.csv/*.txt im Importordner), Tab-getrennt, Kopfzeile:
  französisch ⇥ deutsch ⇥ Lektion ⇥ Audiodateiname ⇥ IPA [⇥ Abschnitt]
„Abschnitt“ ist optional (z. B. „Atelier A“, „Volet 2“) und erscheint in der App als Zwischenüberschrift.
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
            cols += [''] * (6 - len(cols))
            fr, de, lesson, audio, ipa, section = cols[:6]
            if n == 0 and fr.lower().startswith(('franz', 'fr')) and de.lower().startswith(('deutsch', 'de')):
                continue  # Kopfzeile
            if not fr:
                continue
            ipa = re.sub(r'^[\[/]|[\]/]$', '', ipa).strip()
            rows.append({'fr': unicodedata.normalize('NFC', fr), 'de': unicodedata.normalize('NFC', de), 'lesson': lesson or 'Import',
                         'audio': audio, 'ipa': unicodedata.normalize('NFC', ipa), 'section': unicodedata.normalize('NFC', section)})
    return rows


def write_pack(pack: dict, audio_files: list, target: str, label: str) -> None:
    # Audio ist schon komprimiert (mp3): speichern statt erneut packen
    with zipfile.ZipFile(target, 'w', compression=zipfile.ZIP_STORED) as z:
        z.writestr('pack.json', json.dumps(pack, ensure_ascii=False, indent=1), compress_type=zipfile.ZIP_DEFLATED)
        z.writestr('LIESMICH.txt', f'Prononciation – Inhaltspaket „{label}“\n\nImport: App öffnen → Pakete → ZIP-Datei(en) auswählen.\n\nRechtehinweis: {RIGHTS}\n')
        for path, arc in audio_files:
            z.write(path, arc)


def build(folder: str, out: str, per_unit: bool = False) -> None:
    rows = read_rows(folder)
    files = {unicodedata.normalize('NFC', f): f for f in os.listdir(folder)}
    os.makedirs(out, exist_ok=True)
    # Einheit → Teil → Einträge, in Buchreihenfolge
    units: dict[str, dict[str, list[dict]]] = {}
    missing = []
    for r in rows:
        unit, part = split_title(r['lesson'])
        units.setdefault(unit, {}).setdefault(part, []).append(r)
        if r['audio'] and unicodedata.normalize('NFC', r['audio']) not in files:
            missing.append(r['audio'])
    if missing:
        print(f'Warnung: {len(missing)} Audiodateien fehlen, z. B. {missing[:5]}')

    # Paketbildung: je Band (Standard, z. B. „D1“) oder je Einheit (--per-unit)
    packs: dict[str, list[tuple[str, dict[str, list[dict]]]]] = {}
    for unit, parts in units.items():
        key = unit if per_unit else (unit.split()[0] if unit.split() else unit)
        packs.setdefault(key, []).append((unit, parts))

    now = datetime.now(timezone.utc).isoformat()
    total_audio = 0
    for index, (key, unit_list) in enumerate(packs.items()):
        band = key.split()[0] if key.split() else ''
        m = re.fullmatch(r'D(\d)', band)
        lessons, audio_files = [], []
        for unit, parts in unit_list:
            rest = unit[len(band):].strip() if not per_unit else ''
            for part, entries in parts.items():
                vocab = []
                # Abschnitte in Buchreihenfolge (erstes Auftreten)
                sections = []
                for r in entries:
                    if r['section'] and r['section'] not in sections:
                        sections.append(r['section'])
                for r in entries:
                    # IDs wie bei den früheren Einheiten-Paketen: Lernstand bleibt gültig
                    base = os.path.splitext(r['audio'])[0] if r['audio'] else slug(r['fr'])[:40]
                    entry = {'id': f'v_{slug(unit)}_{slug(base)}', 'fr': r['fr'], 'de': r['de']}
                    if r['ipa']:
                        entry['ipaRef'] = r['ipa']
                    if r['section']:
                        entry['sectionId'] = f'sec_{sections.index(r["section"]) + 1}'
                    src = files.get(unicodedata.normalize('NFC', r['audio'])) if r['audio'] else None
                    if src:
                        ext = os.path.splitext(src)[1].lower()
                        asset_id = f'a_{slug(unit)}_{slug(base)}'
                        entry['audioId'] = asset_id
                        audio_files.append((os.path.join(folder, src), f'audio/{asset_id}{ext if ext in AUDIO_EXT else ".mp3"}'))
                    vocab.append(entry)
                title = f'{rest} – {part}' if rest else part
                lessons.append({'id': f'les_{slug(unit)}_{slug(part)}', 'title': title, 'sections': [{'id': f'sec_{i + 1}', 'title': t} for i, t in enumerate(sections)], 'vocab': vocab, 'texts': []})
        title = key if per_unit else (f'Découvertes {m.group(1)}' if m else key)
        pack = {
            'id': f'pack_{slug(key)}', 'title': title, 'level': f'Lernjahr {m.group(1)}' if m else None,
            'source': 'Klett, Découvertes (Lehrwerk-Audio)' if m else None, 'rightsNote': RIGHTS,
            'sortKey': f'{band}-{index:03d}', 'formatVersion': PACK_FORMAT_VERSION,
            'createdAt': now, 'updatedAt': now, 'lessons': lessons,
            # frühere Einheiten-Pakete desselben Bandes: beim Import ersetzen, Lernstand übernehmen
            'replaces': None if per_unit else [f'pack_{slug(u)}' for u, _ in unit_list],
        }
        pack = {k: v for k, v in pack.items() if v is not None}
        target = os.path.join(out, f'{slug(title) or "paket"}.zip')
        write_pack(pack, audio_files, target, title)
        total_audio += len(audio_files)
        size = os.path.getsize(target) / 1_048_576
        print(f'{title:28s} {sum(len(l["vocab"]) for l in lessons):5d} Einträge  {len(lessons):3d} Lektionen  {len(audio_files):5d} Audio  {size:6.1f} MB  → {target}')
    print(f'\n{len(packs)} Paket(e), {len(rows)} Einträge, {total_audio} Audiodateien.')


if __name__ == '__main__':
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    if len(args) != 2:
        sys.exit(__doc__)
    build(args[0], args[1], per_unit='--per-unit' in sys.argv)
