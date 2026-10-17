# Entwicklung

## Stack

- Vite 8, React 19, TypeScript (strict), vitest, ESLint
- onnxruntime-web (WASM) im Web Worker für die Phonemerkennung
- idb (IndexedDB), jszip (Pakete), vite-plugin-pwa (Offline)

## Module

```
src/
  types/content.ts     Datenmodell (Pack, Lesson, VocabEntry, TextItem, Attempt, Settings)
  storage/db.ts        IndexedDB-Zugriff
  content/pack.ts      ZIP-Import/-Export, Dateinamen-Zuordnung
  content/demo.ts      Beispielpaket
  phon/ipa.ts          Phoneminventar, Merkmalsdistanz, Modellraum-Abbildung
  phon/lexicon.ts      Ausnahmelexikon, h aspiré, -ent-Listen
  phon/numbers.ts      Zahlwörter
  phon/g2p.ts          Graphem-Phonem-Transducer, Tokenisierung, Liaison
  dsp/                 FFT, MFCC, DTW, Stillebeschneidung, Ähnlichkeitsvergleich
  audio/               Recorder (AudioWorklet), Resampling, WAV, Player, TTS
  asr/ctc.ts           CTC-Greedy-Dekodierung
  asr/align.ts         Needleman-Wunsch-Alignment
  asr/score.ts         Punktwerte je Phon/Wort/Äußerung
  asr/diagnostics.ts   Didaktische Diagnosen (deutsch)
  asr/assess.ts        Gesamtablauf
  asr/modelLoader.ts   Download + Cache-API
  asr/worker.ts        onnxruntime-web im Worker
  asr/client.ts        Hauptthread-Schnittstelle
  state/appState.tsx   Einstellungen, Pakete, Modellstatus, Hash-Routing
  ui/                  Ansichten und Bausteine
tools/
  fixtures/words.txt            Testkorpus (970 Einträge)
  espeak-reference.mjs          erzeugt eSpeak-Referenz (GPL-Werkzeug, nicht Teil der App)
  g2p-compare.ts                Vergleich G2P ↔ eSpeak:  npx tsx tools/g2p-compare.ts [--all]
```

## Befehle

```bash
npm run dev          # Entwicklung
npm test             # 180 Unit-Tests
npm run lint         # ESLint
npm run typecheck    # tsc
npm run build        # Produktion (BASE_PATH=/ für Hosting unter der Domain-Wurzel)
node tools/espeak-reference.mjs && npx tsx tools/g2p-compare.ts   # G2P-Kalibrierung
```

## Modell

Die App erwartet ein CTC-Modell mit Eingabe `input_values` `[1, samples]` (16 kHz, normiert) und Ausgabe
`logits` `[1, frames, vocab]`, Vokabular in `public/models/wav2vec2-lv-60-espeak-cv-ft/vocab.json`
(392 Tokens, Blank = `<pad>` = 0). Ein anderes Modell (z. B. ein kleineres, nur auf Französisch feinjustiertes)
lässt sich über die Einstellungen (Basis-URL, Modelldatei) und ein passendes `vocab.json` einbinden; die Abbildung
Zielphone → Modellzeichensatz steht in `phon/ipa.ts` (`toModelSpace`).

Hinweis zum Hugging-Face-Repository: `onnx-community/wav2vec2-lv-60-espeak-cv-ft-ONNX` enthält keine
`tokenizer.json`; die App nutzt daher ein eigenes `vocab.json` und dekodiert CTC selbst.

**Multithreading**: onnxruntime-web nutzt mehrere Threads nur, wenn die Seite cross-origin-isoliert ist
(Header `Cross-Origin-Opener-Policy: same-origin` und `Cross-Origin-Embedder-Policy: require-corp`). GitHub Pages
setzt diese Header nicht; beim Hosting auf einem eigenen Server lohnt sich das Setzen (Erkennung 2–4× schneller).

## Offene Punkte / bekannte Lücken

- Das Zusammenspiel mit dem echten ONNX-Modell wurde in der Entwicklungsumgebung ohne Zugriff auf huggingface.co nur
  mit einem synthetischen Testmodell geprüft (Ladepfad, Caching, Inferenz, Dekodierung, Anzeige). Erster Lauf mit dem
  echten Modell: Einstellungen → Modell herunterladen; bei Fehlern Konsole prüfen (Eingabenamen, Opset).
- Die Gewichte der Bewertung (`PHONEME_WEIGHT`, `SIMILARITY_SCALE`, Alignment-Kosten) sind Heuristiken, die an
  Schüleraufnahmen kalibriert werden sollten.
- Das G2P-Modul kennt keinen Wortakzent; prosodische Bewertung fehlt.
- Kein Mehrbenutzerbetrieb auf einem Gerät (Lernstand ist gerätegebunden; Profile wären ein nächster Schritt).
