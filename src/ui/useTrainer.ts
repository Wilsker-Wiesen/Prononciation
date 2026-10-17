/**
 * Trainingslogik für ein Element (Vokabel oder Satz):
 * Modellaufnahme laden, eigene Aufnahme machen, vergleichen und bewerten.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { assess, type Assessment } from '../asr/assess';
import { recognizer } from '../asr/client';
import { decodeAudioFile, encodeWav, resampleTo } from '../audio';
import { Recorder, RecorderError } from '../audio/recorder';
import { player } from '../audio/player';
import { speakFrench, ttsAvailable } from '../audio/tts';
import { audioBlob } from '../content/pack';
import { compareRecordings, type SimilarityResult } from '../dsp/compare';
import { trimSilence } from '../dsp/trim';
import { transcribe, type Transcription } from '../phon/g2p';
import { addAttempt, getRecording, putRecording } from '../storage/db';
import { newId, type Attempt, type ItemKind, type Settings } from '../types/content';

export interface TrainItem {
  id: string;
  kind: ItemKind;
  text: string;
  de?: string;
  ipaOverride?: string;
  /** Kontrastform für den Verwechslungs-Check */
  contrast?: string;
  audioId?: string;
  /** Zeitfenster innerhalb der Audio-Datei (Sekunden) */
  start?: number;
  end?: number;
  packId: string;
  lessonId: string;
}

export interface TrainResult {
  overall: number;
  assessment: Assessment | null;
  similarity: SimilarityResult | null;
  ownPcm16k: Float32Array;
  ownBlob: Blob;
  modelPcm16k: Float32Array | null;
  recognitionMs?: number;
}

export type TrainerPhase = 'idle' | 'recording' | 'analyzing' | 'done';

export interface TrainerState {
  phase: TrainerPhase;
  level: number;
  seconds: number;
  result: TrainResult | null;
  error: string | null;
  hasModelAudio: boolean;
  transcription: Transcription;
  playing: boolean;
  previousBlob: Blob | null;
}

const PHONEME_WEIGHT = 0.7;

export function useTrainer(item: TrainItem, settings: Settings) {
  const [phase, setPhase] = useState<TrainerPhase>('idle');
  const [level, setLevel] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [result, setResult] = useState<TrainResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modelBlob, setModelBlob] = useState<Blob | null>(null);
  const [modelPcm, setModelPcm] = useState<Float32Array | null>(null);
  const [playing, setPlaying] = useState(false);
  const [previousBlob, setPreviousBlob] = useState<Blob | null>(null);
  const recorderRef = useRef<Recorder | null>(null);
  const transcription = useMemo<Transcription>(() => transcribe(item.text), [item.text]);

  // Modellaufnahme und ggf. frühere eigene Aufnahme laden (die aufrufende Komponente
  // wird pro Element neu erzeugt, daher kein Zurücksetzen nötig)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const blob = await audioBlob(item.audioId);
      if (cancelled) return;
      setModelBlob(blob ?? null);
      if (blob) {
        try {
          const dec = await decodeAudioFile(blob);
          if (cancelled) return;
          let pcm = dec.pcm;
          if (item.start !== undefined || item.end !== undefined) {
            const s = Math.floor((item.start ?? 0) * dec.sampleRate);
            const e = Math.floor((item.end ?? dec.pcm.length / dec.sampleRate) * dec.sampleRate);
            pcm = dec.pcm.slice(Math.max(0, s), Math.min(dec.pcm.length, e));
          }
          const p16 = resampleTo(pcm, dec.sampleRate, 16000);
          setModelPcm(trimSilence(p16, 16000).pcm);
        } catch {
          // Modellaudio nicht dekodierbar – nur Wiedergabe
        }
      }
      const prev = await getRecording(item.id);
      if (!cancelled && prev) setPreviousBlob(prev.blob);
    })();
    return () => { cancelled = true; };
  }, [item.id, item.text, item.audioId, item.start, item.end]);

  useEffect(() => player.onChange(setPlaying), []);

  const playModel = useCallback(async (rate = 1) => {
    setError(null);
    if (modelBlob) {
      await player.play(modelBlob, { start: item.start, end: item.end, rate });
    } else if (settings.ttsFallback && ttsAvailable()) {
      try {
        await speakFrench(item.text, { rate: rate < 1 ? 0.7 : 0.9 });
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Keine französische Stimme verfügbar');
      }
    } else {
      setError('Keine Modellaufnahme vorhanden.');
    }
  }, [modelBlob, settings.ttsFallback, item.text, item.start, item.end]);

  const playOwn = useCallback(async () => {
    const blob = result?.ownBlob ?? previousBlob;
    if (blob) await player.play(blob);
  }, [result, previousBlob]);

  const startRecording = useCallback(async () => {
    if (phase === 'recording') return;
    setError(null);
    player.stop();
    const rec = new Recorder({
      maxSeconds: item.kind === 'vocab' ? 8 : 20,
      onLevel: (r) => setLevel(Math.min(1, r * 4)),
      onTick: (s) => setSeconds(s),
    });
    recorderRef.current = rec;
    try {
      await rec.start();
      setPhase('recording');
      setSeconds(0);
    } catch (e) {
      recorderRef.current = null;
      const code = e instanceof RecorderError ? e.code : 'unknown';
      setError(
        code === 'permission-denied'
          ? 'Der Mikrofonzugriff wurde abgelehnt. Bitte in den Browser-Einstellungen erlauben.'
          : code === 'not-found'
            ? 'Kein Mikrofon gefunden.'
            : code === 'unsupported'
              ? 'Dieser Browser unterstützt keine Aufnahme.'
              : `Aufnahme nicht möglich: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }, [phase, item.kind]);

  const stopRecording = useCallback(async () => {
    const rec = recorderRef.current;
    if (!rec) return;
    recorderRef.current = null;
    setPhase('analyzing');
    try {
      const r = await rec.stop();
      const pcm16 = resampleTo(r.pcm, r.sampleRate, 16000);
      const trimmed = trimSilence(pcm16, 16000).pcm;
      if (trimmed.length < 1600) {
        setError('Die Aufnahme war zu leise oder zu kurz. Bitte noch einmal.');
        setPhase('idle');
        return;
      }
      const ownBlob = encodeWav(r.pcm, r.sampleRate);
      let similarity: SimilarityResult | null = null;
      if (modelPcm && modelPcm.length > 1600) {
        try { similarity = compareRecordings(modelPcm, trimmed, 16000); } catch { similarity = null; }
      }
      let assessment: Assessment | null = null;
      let recognitionMs: number | undefined;
      if (settings.assessmentEnabled && recognizer.state === 'ready') {
        try {
          const { phones, ms } = await recognizer.recognize(trimmed);
          recognitionMs = ms;
          const text = item.ipaOverride ? item.text : item.text;
          assessment = assess(text, phones, item.ipaOverride ? transcribeWithOverride(item.text, item.ipaOverride) : transcription, recognizer.vocab.size ? recognizer.vocab : undefined, { contrast: item.contrast });
        } catch (e) {
          setError(`Bewertung fehlgeschlagen: ${e instanceof Error ? e.message : String(e)}`);
        }
      }
      let overall: number;
      if (assessment && similarity) overall = Math.round(PHONEME_WEIGHT * assessment.overall + (1 - PHONEME_WEIGHT) * similarity.similarity);
      else if (assessment) overall = assessment.overall;
      else if (similarity) overall = Math.round(0.8 * similarity.similarity + 0.2 * similarity.tempo);
      else overall = -1;
      const res: TrainResult = { overall, assessment, similarity, ownPcm16k: trimmed, ownBlob, modelPcm16k: modelPcm, recognitionMs };
      setResult(res);
      setPhase('done');
      if (overall >= 0) {
        const attempt: Attempt = {
          id: newId('att'),
          ts: new Date().toISOString(),
          packId: item.packId,
          lessonId: item.lessonId,
          itemId: item.id,
          kind: item.kind,
          text: item.text,
          overall,
          phoneme: assessment?.overall,
          similarity: similarity?.similarity,
          tempo: similarity?.tempo,
          issues: assessment?.findings.map((f) => f.id),
        };
        void addAttempt(attempt);
      }
      if (settings.keepRecordings) {
        void putRecording({ itemId: item.id, packId: item.packId, ts: new Date().toISOString(), mime: 'audio/wav', blob: ownBlob, sampleRate: r.sampleRate });
      }
    } catch (e) {
      setError(`Aufnahme fehlgeschlagen: ${e instanceof Error ? e.message : String(e)}`);
      setPhase('idle');
    }
  }, [modelPcm, settings.assessmentEnabled, settings.keepRecordings, item, transcription]);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
    setPhase('idle');
  }, []);

  useEffect(() => () => { recorderRef.current?.cancel(); player.stop(); }, []);

  const state: TrainerState = {
    phase, level, seconds, result, error,
    hasModelAudio: !!modelBlob,
    transcription,
    playing,
    previousBlob,
  };
  return { state, playModel, playOwn, startRecording, stopRecording, reset };
}

/** Lautschrift-Override der Lehrkraft in eine Transkription umsetzen (ganzes Element, ein Wort). */
function transcribeWithOverride(text: string, ipa: string): Transcription {
  const chars = [...ipa.replace(/[\s.ˈˌ‿]/g, '')];
  const phones: Transcription['words'][number]['phones'] = [];
  for (let i = 0; i < chars.length; i++) {
    let p = chars[i]!;
    while (chars[i + 1] === '̃') p += chars[++i];
    if ((p === 'd' && chars[i + 1] === 'ʒ') || (p === 't' && chars[i + 1] === 'ʃ')) p += chars[++i];
    phones.push({ ipa: p, start: 0, end: text.length, optional: p === 'ə' });
  }
  return { text, words: [{ orth: text, lower: text.toLowerCase(), start: 0, end: text.length, phones }] };
}
