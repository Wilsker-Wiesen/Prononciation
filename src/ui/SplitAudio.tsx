/**
 * Dialog: Einen langen Track (z. B. Vokabelaufnahmen einer Unité) an Pausen
 * zerteilen und die Abschnitte der Reihe nach Vokabeln oder Sätzen zuordnen.
 */
import { useEffect, useMemo, useState } from 'react';
import { player } from '../audio/player';
import { decodeAudioFile } from '../audio/resample';
import { detectSegments, mergeSegments, type Segment } from '../audio/segment';
import type { AudioAsset, Lesson } from '../types/content';
import { Icon, Waveform } from './components';

interface Props {
  asset: AudioAsset;
  lesson: Lesson;
  updateLesson: (fn: (l: Lesson) => void) => void;
  onClose: () => void;
}

type Target = { kind: 'vocab' } | { kind: 'text'; textId: string };

export function SplitAudio({ asset, lesson, updateLesson, onClose }: Props) {
  const [pcm, setPcm] = useState<Float32Array | null>(null);
  const [sampleRate, setSampleRate] = useState(16000);
  const [error, setError] = useState<string | null>(null);
  const [minSilence, setMinSilence] = useState(350);
  const [threshold, setThreshold] = useState(-35);
  // Erkannte Abschnitte werden aus den Parametern abgeleitet; manuelle Änderungen gelten nur für dieselben Parameter.
  const [edited, setEdited] = useState<{ key: string; segs: Segment[] } | null>(null);
  const [target, setTarget] = useState<Target>({ kind: 'vocab' });
  const [startIndex, setStartIndex] = useState(0);
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    decodeAudioFile(asset.blob)
      .then((d) => { if (!cancelled) { setPcm(d.pcm); setSampleRate(d.sampleRate); } })
      .catch((e) => setError(`Audio konnte nicht dekodiert werden: ${e instanceof Error ? e.message : String(e)}`));
    return () => { cancelled = true; };
  }, [asset]);

  const paramKey = `${minSilence}|${threshold}|${pcm?.length ?? 0}`;
  const detected = useMemo(
    () => (pcm ? detectSegments(pcm, sampleRate, { minSilenceMs: minSilence, thresholdDb: threshold }) : []),
    [pcm, sampleRate, minSilence, threshold],
  );
  const segments = edited && edited.key === paramKey ? edited.segs : detected;
  const setSegments = (segs: Segment[]) => setEdited({ key: paramKey, segs });

  const targets = useMemo(() => {
    if (target.kind === 'vocab') return lesson.vocab.map((v) => v.fr);
    return lesson.texts.find((t) => t.id === target.textId)?.sentences.map((s) => s.fr) ?? [];
  }, [target, lesson]);

  const assign = () => {
    let n = 0;
    updateLesson((l) => {
      if (target.kind === 'vocab') {
        segments.forEach((seg, i) => {
          const v = l.vocab[startIndex + i];
          if (v) { v.audioId = asset.id; v.start = round(seg.start); v.end = round(seg.end); n++; }
        });
      } else {
        const t = l.texts.find((x) => x.id === target.textId);
        if (t) {
          if (!t.audioId) t.audioId = asset.id;
          segments.forEach((seg, i) => {
            const s = t.sentences[startIndex + i];
            if (s) { s.audioId = t.audioId === asset.id ? undefined : asset.id; s.start = round(seg.start); s.end = round(seg.end); n++; }
          });
        }
      }
    });
    setDone(`${n} Abschnitte zugeordnet. Nicht vergessen: Speichern.`);
  };

  return (
    <div className="card" style={{ borderColor: 'var(--primary)' }}>
      <div className="row between">
        <h3 style={{ margin: 0 }}>Track zerteilen: {asset.fileName ?? asset.id}</h3>
        <button className="btn ghost" onClick={onClose}>Schließen</button>
      </div>
      {error && <div className="banner error small">{error}</div>}
      {!pcm && !error && <p className="muted small">Wird dekodiert …</p>}
      {pcm && (
        <>
          <Waveform pcm={pcm} />
          <div className="row" style={{ marginTop: 8 }}>
            <label className="field">Mindestpause (ms)
              <input type="number" value={minSilence} min={100} max={2000} step={50} onChange={(e) => setMinSilence(Number(e.target.value))} />
            </label>
            <label className="field">Schwelle (dB unter Maximum)
              <input type="number" value={threshold} min={-60} max={-10} step={1} onChange={(e) => setThreshold(Number(e.target.value))} />
            </label>
            <label className="field">Zuordnen zu
              <select value={target.kind === 'vocab' ? 'vocab' : target.textId} onChange={(e) => setTarget(e.target.value === 'vocab' ? { kind: 'vocab' } : { kind: 'text', textId: e.target.value })}>
                <option value="vocab">Vokabeln der Lektion</option>
                {lesson.texts.map((t) => <option key={t.id} value={t.id}>Text: {t.title}</option>)}
              </select>
            </label>
            <label className="field">ab Eintrag Nr.
              <input type="number" value={startIndex + 1} min={1} max={Math.max(1, targets.length)} onChange={(e) => setStartIndex(Math.max(0, Number(e.target.value) - 1))} />
            </label>
          </div>
          <p className="muted small" style={{ marginTop: 6 }}>
            {segments.length} Abschnitte gefunden, {targets.length - startIndex} Zieleinträge ab Nr. {startIndex + 1}.
            {segments.length !== targets.length - startIndex && ' Zahl stimmt nicht überein: Pause/Schwelle anpassen oder Abschnitte zusammenfassen.'}
          </p>
          <table className="tbl">
            <thead><tr><th>#</th><th>Abschnitt</th><th>Dauer</th><th>→ Eintrag</th><th></th></tr></thead>
            <tbody>
              {segments.map((seg, i) => (
                <tr key={i}>
                  <td>{i + 1}</td>
                  <td>
                    <button className="btn ghost small" onClick={() => void player.play(asset.blob, { start: seg.start, end: seg.end })}><Icon.play /></button>
                    {seg.start.toFixed(2)} – {seg.end.toFixed(2)} s
                  </td>
                  <td>{(seg.end - seg.start).toFixed(2)} s</td>
                  <td className={targets[startIndex + i] ? '' : 'muted'}>{targets[startIndex + i] ?? '– (kein Eintrag)'}</td>
                  <td>
                    {i < segments.length - 1 && <button className="btn ghost small" title="Mit dem nächsten Abschnitt zusammenfassen" onClick={() => setSegments(mergeSegments(segments, i))}>⤵ zusammenfassen</button>}
                    <button className="btn ghost small" title="Abschnitt entfernen" onClick={() => setSegments(segments.filter((_, k) => k !== i))}>×</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="row" style={{ marginTop: 10 }}>
            <button className="btn primary" disabled={!segments.length} onClick={assign}>Abschnitte der Reihe nach zuordnen</button>
            {done && <span className="small">{done}</span>}
          </div>
        </>
      )}
    </div>
  );
}

function round(x: number): number {
  return Math.round(x * 100) / 100;
}
