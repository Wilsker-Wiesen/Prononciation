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
  asr/models.ts        Modelloptionen mit Quellen und Ausweichquellen
  phon/phenomena.ts    Aussprachephänomene: Erkennung im Wortschatz, Regeln, Tipps, Minimalpaare
  game/rewards.ts      Punkte, Sterne, Level, Serien, Abzeichen
  game/missions.ts     Missionsplanung (Beispiele, Hörquiz, Sprechrunde)
  game/store.ts        Spielstand (IndexedDB)
  content/bulkImport.ts Ordner-Import (Wortliste + Audio)
  state/appState.tsx   Einstellungen, Pakete, Modellstatus, Hash-Routing
  ui/                  Ansichten und Bausteine
tools/
  fixtures/words.txt            Testkorpus G2P (970 Einträge)
  fixtures/validation-words.txt Prüfwörter für Modelle
  espeak-reference.mjs          erzeugt eSpeak-Referenz (GPL-Werkzeug, nicht Teil der App)
  g2p-compare.ts                Vergleich G2P ↔ eSpeak:  npx tsx tools/g2p-compare.ts [--all]
  validate-model.mjs            Prüfstand: ONNX-Modell mit eSpeak-Synthese oder WAV-Ordner bewerten
  fetch-lingualibre.mjs         lädt CC-lizenzierte Wortaufnahmen (Lingua Libre) für den Prüfstand
.github/workflows/
  ci.yml       Lint, Typecheck, Tests, Build
  deploy.yml   GitHub Pages
  model.yml    Modelle beschaffen, exportieren, prüfen, als Release veröffentlichen (manuell)
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

## Prüfstand mit eigenen Aufnahmen

```bash
# WAV-Dateien (beliebige Abtastrate, 16 Bit), Dateiname = gesprochenes Wort, z. B. "le collège.wav"
npm install --no-save onnxruntime-node   # schneller als onnxruntime-web unter Node
npx tsx tools/validate-model.mjs --model modell.onnx --vocab vocab.json --audio-dir meine-aufnahmen --report bericht.json
```

Der Bericht enthält je Wort Ziel- und erkannte Lautung, Punktwert und Diagnosen – damit lassen sich Bewertungsgewichte
und Konfidenzschwellen an echten Schüleraufnahmen kalibrieren.

## Vorbildstimme (eigene Inhalte)

Konjugationspaket, Beispielpaket, Beispiele und Minimalpaare der Missionen haben keine Lehrwerk-Aufnahme.
Dafür erzeugt der Workflow **Vorbildstimme erzeugen** (`.github/workflows/tts.yml`) Aufnahmen mit freien
neuronalen Stimmen (Piper, Kokoro), je Text in drei Sprechtempi. Jede Fassung wird mit dem französischen
Phonem-Erkenner geprüft (`tools/validate-model.mjs --manifest`), die beste je Text übernommen
(`tools/tts-pick.py`). Texte unter 80 Punkten landen auf einer Prüfliste zum Nachhören.

```bash
# mode=sample: Hörproben aller Kandidaten (Release tts-samples); mode=full: alle Texte einer Stimme (Release tts-v1)
# Übernahme in die App (Hauptstimme, Ersatzstimme nur für schwache Texte):
python3 tools/tts-install.py --primary <entpacktes Zip A> --fallback <entpacktes Zip B> --out public/tts
```

Die App findet die Datei über einen Hash des normalisierten Textes (`src/audio/ttsKey.ts`). Rangfolge beim
Abspielen: Paket-Aufnahme, dann Vorbildstimme, dann Gerätestimme (`src/audio/modelVoice.ts`). Nach Änderungen
an eigenen Texten den Workflow erneut starten; fehlende Texte fallen automatisch auf die Gerätestimme zurück.

## Native Apps

Siehe [App.md](App.md). Kurz: `npm run native:ios` bzw. `npm run native:android` auf einem Rechner mit Xcode
bzw. Android Studio; in CI baut der Workflow **Native Apps** beide Plattformen.

## Offene Punkte / bekannte Lücken

- Beide Modelle wurden in GitHub Actions mit onnxruntime-node geladen und mit eSpeak-Synthese sowie echten
  Wortaufnahmen (Lingua Libre) geprüft; Ergebnisse siehe Release `models-v1` (report.txt). Der Browserpfad
  (Worker, Cache, Dekodierung, Anzeige) wurde mit einem synthetischen Testmodell geprüft.
- Die Gewichte der Bewertung (`PHONEME_WEIGHT`, `SIMILARITY_SCALE`, Alignment-Kosten) sind Heuristiken, die an
  Schüleraufnahmen kalibriert werden sollten.
- Das G2P-Modul kennt keinen Wortakzent; prosodische Bewertung fehlt.
- Kein Mehrbenutzerbetrieb auf einem Gerät (Lernstand ist gerätegebunden; Profile wären ein nächster Schritt).
