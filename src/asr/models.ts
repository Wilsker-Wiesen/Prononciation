/**
 * Verfügbare Erkennungsmodelle und ihre Quellen (mit Ausweichquellen).
 * Primär: GitHub-Release dieses Repositories (vom Workflow „Modelle beschaffen
 * und prüfen“ erzeugt), Ausweich: Hugging Face.
 */
import type { ModelSource } from './modelLoader';

export type ModelId = 'multilingual' | 'french' | 'custom';

export interface ModelOption {
  id: ModelId;
  label: string;
  description: string;
  /** ungefähre Größe in MB */
  sizeMb: number;
  sources: ModelSource[];
}

const RELEASE_BASE = 'https://github.com/Wilsker-Wiesen/Prononciation/releases/download/models-v1/';

export const MODEL_OPTIONS: ModelOption[] = [
  {
    id: 'french',
    label: 'Französisch (wav2vec2-french-phonemizer, ≈ 86 MB) – empfohlen',
    description: 'Nur Französisch, klein und schnell. Prüfstand mit echten Wortaufnahmen: 82 Punkte im Mittel, Nasalvokale werden sicher erkannt, ≈ 120 ms je Wort.',
    sizeMb: 86,
    sources: [{ baseUrl: RELEASE_BASE, modelFile: 'wav2vec2-french-phonemizer.onnx', vocabFile: 'wav2vec2-french-phonemizer.vocab.json' }],
  },
  {
    id: 'multilingual',
    label: 'Mehrsprachig (wav2vec2-lv-60-espeak, ≈ 190 MB)',
    description: 'Phonemerkennung für 60 Sprachen. Prüfstand mit echten Wortaufnahmen: 66 Punkte im Mittel, ≈ 350 ms je Wort. Als Vergleich und Ausweichmodell.',
    sizeMb: 190,
    sources: [
      { baseUrl: RELEASE_BASE, modelFile: 'wav2vec2-lv-60-espeak-cv-ft.onnx', vocabFile: 'wav2vec2-lv-60-espeak-cv-ft.vocab.json' },
      { baseUrl: 'https://huggingface.co/onnx-community/wav2vec2-lv-60-espeak-cv-ft-ONNX/resolve/main/', modelFile: 'onnx/model_quantized.onnx', vocabFile: `${import.meta.env.BASE_URL}models/wav2vec2-lv-60-espeak-cv-ft/vocab.json` },
    ],
  },
  {
    id: 'custom',
    label: 'Eigene Quelle',
    description: 'Basis-URL, Modell- und Vokabulardatei selbst angeben (z. B. Schulserver).',
    sizeMb: 0,
    sources: [],
  },
];

export function modelOption(id: ModelId): ModelOption {
  return MODEL_OPTIONS.find((m) => m.id === id) ?? MODEL_OPTIONS[0]!;
}
