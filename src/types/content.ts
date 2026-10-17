/**
 * Datenmodell für Inhalte (Lehrwerk-Pakete, Lektionen, Vokabeln, Texte).
 *
 * Die App enthält selbst kein Verlagsmaterial. Lehrkräfte legen Pakete an
 * (Vokabellisten, Lektionstexte, zugehörige Audiodateien) und geben sie als
 * ZIP-Datei an ihre Lerngruppe weiter. Alles bleibt auf dem Endgerät.
 */

export const PACK_FORMAT_VERSION = 1;

export interface Pack {
  id: string;
  /** Anzeigename, z. B. „Découvertes 1 – Unité 1–3“ */
  title: string;
  /** Freitext, z. B. „Klett, Découvertes 1 (2020)“ – nur Metadatum, kein Verlagsinhalt */
  source?: string;
  /** Jahrgangsstufe oder Band, z. B. „Klasse 7“ */
  level?: string;
  author?: string;
  /** Hinweis zu Rechten an den Audiodateien, wird im Paket mitgeführt */
  rightsNote?: string;
  formatVersion: number;
  createdAt: string;
  updatedAt: string;
  lessons: Lesson[];
}

export interface Lesson {
  id: string;
  /** z. B. „Unité 2 – Au collège“ */
  title: string;
  /** Optionale Untergliederung, z. B. „Approches“, „Atelier A“ */
  sections?: Section[];
  vocab: VocabEntry[];
  texts: TextItem[];
}

export interface Section {
  id: string;
  title: string;
}

export interface VocabEntry {
  id: string;
  /** Französische Form inkl. Artikel, z. B. „le collège“, „aller à l'école“ */
  fr: string;
  /** Deutsche Bedeutung */
  de: string;
  /** Lautschrift-Override durch die Lehrkraft; leer = automatische Transkription */
  ipa?: string;
  /** Referenz auf die Modellaufnahme (Lehrwerk-Audio) in der Audio-Ablage */
  audioId?: string;
  /** Zeitfenster in Sekunden innerhalb von audioId (bei zerteilten Tracks) */
  start?: number;
  end?: number;
  sectionId?: string;
  /** Beispielsatz */
  example?: string;
  exampleAudioId?: string;
  /** Didaktische Markierungen, z. B. „liaison“, „nasal“, „h-aspiré“ */
  tags?: string[];
  /** Form, mit der die Aussprache nicht verwechselt werden darf (z. B. Singular zu „ils prennent“) */
  contrast?: string;
}

export interface TextItem {
  id: string;
  title: string;
  /** Audio des gesamten Textes (optional); Sätze können eigene Audios oder Zeitfenster haben */
  audioId?: string;
  sentences: Sentence[];
}

export interface Sentence {
  id: string;
  fr: string;
  de?: string;
  ipa?: string;
  audioId?: string;
  /** Zeitfenster in Sekunden innerhalb von TextItem.audioId */
  start?: number;
  end?: number;
}

/** Audiodatei in der lokalen Ablage (IndexedDB). */
export interface AudioAsset {
  id: string;
  packId: string;
  mime: string;
  blob: Blob;
  durationMs?: number;
  /** ursprünglicher Dateiname, hilft bei der Zuordnung im Editor */
  fileName?: string;
}

export type ItemKind = 'vocab' | 'sentence';

/** Ein Trainingsversuch (lokale Lernstatistik). */
export interface Attempt {
  id: string;
  ts: string;
  packId: string;
  lessonId: string;
  itemId: string;
  kind: ItemKind;
  text: string;
  /** 0–100, Gesamtwert */
  overall: number;
  /** Teilwerte 0–100, soweit berechnet */
  phoneme?: number;
  similarity?: number;
  tempo?: number;
  /** Kurzform der Diagnosen (IDs), z. B. ['final-consonant', 'nasal'] */
  issues?: string[];
}

export interface StoredRecording {
  /** = itemId; es wird nur die jeweils letzte Aufnahme behalten */
  itemId: string;
  packId: string;
  ts: string;
  mime: string;
  blob: Blob;
  sampleRate: number;
}

export interface Settings {
  /** Phonem-Bewertung mit lokalem Modell aktiv */
  assessmentEnabled: boolean;
  /** gewähltes Modell (siehe asr/models.ts) */
  modelId: 'multilingual' | 'french' | 'custom';
  /** eigene Quelle (nur bei modelId = custom) */
  modelBaseUrl: string;
  modelFile: string;
  modelVocabFile: string;
  /** Aufnahmen behalten (nur lokal) */
  keepRecordings: boolean;
  /** System-Sprachausgabe als Ersatz, wenn keine Modellaufnahme vorliegt */
  ttsFallback: boolean;
  /** Lehrkraft-Modus (Editor sichtbar) */
  teacherMode: boolean;
  /** Anzeige der Lautschrift für Lernende */
  showIpa: boolean;
  /** Name der Lernenden/des Lernenden für Export (freiwillig) */
  learnerName: string;
  /** zuletzt installierte Version des eingebauten Konjugationspakets */
  conjugationVersion: number;
  /** Töne und Vibration bei Erfolgen */
  soundEnabled: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  assessmentEnabled: true,
  modelId: 'french',
  modelBaseUrl: '',
  modelFile: 'model.onnx',
  modelVocabFile: 'vocab.json',
  keepRecordings: true,
  ttsFallback: true,
  teacherMode: false,
  showIpa: true,
  learnerName: '',
  conjugationVersion: 0,
  soundEnabled: true,
};

export function newId(prefix = ''): string {
  const rnd =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return prefix ? `${prefix}_${rnd}` : rnd;
}
