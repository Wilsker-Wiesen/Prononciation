/** Trainingsansicht: Hören – Nachsprechen – Vergleichen – Rückmeldung. */
import { useEffect, useMemo, useState } from 'react';
import { loadModel, navigate, useApp, useModelStatus } from '../state/appState';
import { ipaString } from '../phon/g2p';
import type { Pack } from '../types/content';
import { FindingsList, HighlightedText, Icon, PhoneRow, ScoreRing, Waveform, formatBytes } from './components';
import { useTrainer, type TrainItem } from './useTrainer';

export function trainItemsForLesson(pack: Pack, lessonId: string, kind: 'vocab' | 'text'): TrainItem[] {
  const lesson = pack.lessons.find((l) => l.id === lessonId);
  if (!lesson) return [];
  if (kind === 'vocab') {
    return lesson.vocab.filter((v) => v.fr.trim()).map((v) => ({
      id: v.id, kind: 'vocab', text: v.fr, de: v.de, ipaOverride: v.ipa, audioId: v.audioId, start: v.start, end: v.end, packId: pack.id, lessonId,
    }));
  }
  const items: TrainItem[] = [];
  for (const t of lesson.texts) {
    for (const s of t.sentences) {
      if (!s.fr.trim()) continue;
      items.push({
        id: s.id, kind: 'sentence', text: s.fr, de: s.de, ipaOverride: s.ipa,
        audioId: s.audioId ?? t.audioId, start: s.audioId ? undefined : s.start, end: s.audioId ? undefined : s.end,
        packId: pack.id, lessonId,
      });
    }
  }
  return items;
}

export function TrainerView({ pack, lessonId, kind, itemId, index }: { pack: Pack; lessonId: string; kind: 'vocab' | 'text'; itemId?: string; index?: number }) {
  const items = useMemo(() => trainItemsForLesson(pack, lessonId, kind), [pack, lessonId, kind]);
  const startIndex = itemId ? Math.max(0, items.findIndex((i) => i.id === itemId)) : index ?? 0;
  const [pos, setPos] = useState(Math.min(startIndex, Math.max(0, items.length - 1)));
  const item = items[pos];
  const lesson = pack.lessons.find((l) => l.id === lessonId);
  if (!item || !lesson) {
    return (
      <div className="card">
        <p>Keine Einträge zum Üben.</p>
        <button className="btn" onClick={() => navigate({ name: 'lesson', packId: pack.id, lessonId })}>Zurück</button>
      </div>
    );
  }
  return (
    <div>
      <div className="row between" style={{ marginBottom: 8 }}>
        <button className="btn ghost" onClick={() => navigate({ name: 'lesson', packId: pack.id, lessonId, tab: kind })}>
          <Icon.prev /> {lesson.title}
        </button>
        <span className="muted small">{pos + 1} / {items.length}</span>
      </div>
      <TrainerCard key={item.id} item={item} />
      <div className="row between" style={{ marginTop: 10 }}>
        <button className="btn" disabled={pos === 0} onClick={() => setPos(pos - 1)}><Icon.prev /> Zurück</button>
        <button className="btn primary" disabled={pos >= items.length - 1} onClick={() => setPos(pos + 1)}>Weiter <Icon.next /></button>
      </div>
    </div>
  );
}

export function TrainerCard({ item }: { item: TrainItem }) {
  const { settings } = useApp();
  const model = useModelStatus();
  const { state, playModel, playOwn, startRecording, stopRecording, reset } = useTrainer(item, settings);
  const { phase, result } = state;
  const assessment = result?.assessment ?? null;
  const ipa = item.ipaOverride ?? ipaString(state.transcription);
  const canAssess = settings.assessmentEnabled;

  useEffect(() => {
    if (canAssess && model.state === 'idle') void loadModel(settings).catch(() => undefined);
  }, [canAssess, model.state, settings]);

  return (
    <div className="card">
      <HighlightedText text={item.text} words={assessment?.words ?? null} />
      {item.de && <div className="trainer-de">{item.de}</div>}
      {settings.showIpa && <div className="trainer-ipa ipa">[{ipa}]</div>}

      <div className="row" style={{ marginTop: 14 }}>
        <button className="btn big" onClick={() => void playModel(1)} disabled={phase === 'recording'} aria-label="Anhören">
          <Icon.play /> Anhören
        </button>
        <button className="btn" onClick={() => void playModel(0.7)} disabled={phase === 'recording'} aria-label="Langsam anhören">
          <Icon.slow /> Langsam
        </button>
        {!state.hasModelAudio && (
          <span className="muted small">{settings.ttsFallback ? 'Ersatzstimme des Geräts (keine Lehrwerk-Aufnahme)' : 'Keine Aufnahme vorhanden'}</span>
        )}
      </div>

      <div className="row" style={{ marginTop: 14 }}>
        {phase !== 'recording' ? (
          <button className="btn big record round" onClick={() => void startRecording()} disabled={phase === 'analyzing'} aria-label="Aufnahme starten">
            <Icon.mic />
          </button>
        ) : (
          <button className="btn big record round on" onClick={() => void stopRecording()} aria-label="Aufnahme beenden">
            <Icon.stop />
          </button>
        )}
        <div style={{ flex: 1, minWidth: 160 }}>
          {phase === 'recording' && (
            <>
              <div className="small">Aufnahme läuft … {state.seconds.toFixed(0)} s – zum Beenden tippen</div>
              <div className="meter"><div style={{ width: `${Math.round(state.level * 100)}%` }} /></div>
            </>
          )}
          {phase === 'idle' && !result && <div className="muted small">Tippe auf das Mikrofon, sprich nach, tippe erneut.</div>}
          {phase === 'analyzing' && <div className="small">Wird ausgewertet …</div>}
          {phase === 'done' && (
            <div className="row">
              <button className="btn" onClick={() => void playOwn()}><Icon.ear /> Meine Aufnahme</button>
              <button className="btn ghost" onClick={reset}><Icon.retry /> Nochmal</button>
            </div>
          )}
          {phase === 'idle' && !result && state.previousBlob && (
            <button className="btn ghost small" onClick={() => void playOwn()}><Icon.ear /> Letzte Aufnahme anhören</button>
          )}
        </div>
      </div>

      {state.error && <div className="banner error" style={{ marginTop: 12 }}>{state.error}</div>}

      {canAssess && model.state === 'loading' && (
        <div className="banner info small" style={{ marginTop: 12 }}>
          Bewertungsmodell wird geladen {model.progress && model.progress.total > 0 ? `(${formatBytes(model.progress.loaded)} von ${formatBytes(model.progress.total)})` : '…'} – Hören und Nachsprechen geht schon.
          {model.progress && model.progress.total > 0 && <div className="progress" style={{ marginTop: 6 }}><div style={{ width: `${Math.round((100 * model.progress.loaded) / model.progress.total)}%` }} /></div>}
        </div>
      )}
      {canAssess && model.state === 'error' && (
        <div className="banner error small" style={{ marginTop: 12 }}>
          Bewertungsmodell nicht verfügbar: {model.error}. <button className="btn ghost" onClick={() => void loadModel(settings).catch(() => undefined)}>Erneut versuchen</button>
        </div>
      )}

      {result && <ResultPanel result={result} />}
    </div>
  );
}

function ResultPanel({ result }: { result: NonNullable<ReturnType<typeof useTrainer>['state']['result']> }) {
  const a = result.assessment;
  const s = result.similarity;
  return (
    <div style={{ marginTop: 16 }}>
      <div className="row" style={{ gap: 18, alignItems: 'flex-start' }}>
        {result.overall >= 0 ? <ScoreRing score={result.overall} label="gesamt" /> : null}
        <div className="stack" style={{ flex: 1, minWidth: 200 }}>
          {a && <div className="row between"><span>Laute</span><b>{a.overall}</b></div>}
          {s && <div className="row between"><span>Ähnlichkeit zur Modellaufnahme</span><b>{Math.round(s.similarity)}</b></div>}
          {s && (
            <div className="row between">
              <span>Tempo</span>
              <b>{s.durationRatio > 1.25 ? 'zu langsam' : s.durationRatio < 0.8 ? 'zu schnell' : 'passend'} <span className="muted small">(×{s.durationRatio.toFixed(2)})</span></b>
            </div>
          )}
          {!a && !s && <div className="muted">Vergleiche deine Aufnahme mit dem Original: erst „Anhören“, dann „Meine Aufnahme“.</div>}
          {a && a.overall >= 85 && <div className="badge good">Très bien !</div>}
        </div>
      </div>
      {result.modelPcm16k && (
        <div className="stack" style={{ marginTop: 12 }}>
          <div className="small muted">Modell</div>
          <Waveform pcm={result.modelPcm16k} />
          <div className="small muted">Deine Aufnahme</div>
          <Waveform pcm={result.ownPcm16k} color="#c83e3e" />
        </div>
      )}
      {a && (
        <div style={{ marginTop: 12 }}>
          <PhoneRow words={a.words} />
          <div className="muted small ipa" style={{ marginTop: 6 }}>Gehört: [{a.recognizedIpa || '–'}]</div>
          <div style={{ marginTop: 12 }}><FindingsList findings={a.findings} /></div>
        </div>
      )}
    </div>
  );
}
