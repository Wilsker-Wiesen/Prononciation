/** Lektionsansicht: Vokabeln und Texte mit Vorhören und Einstieg ins Training. */
import { useEffect, useMemo, useState } from 'react';
import { playText as playModelText } from '../audio/modelVoice';
import { ipaString, transcribe } from '../phon/g2p';
import { navigate, useApp } from '../state/appState';
import { listAttemptsForPack } from '../storage/db';
import type { Attempt, Pack } from '../types/content';
import { Badge, Icon } from './components';
import { PHENOMENA, detectPhenomena } from '../phon/phenomena';

export function LessonView({ pack, lessonId, tab }: { pack: Pack; lessonId: string; tab?: string }) {
  const { settings } = useApp();
  const lesson = pack.lessons.find((l) => l.id === lessonId);
  const [best, setBest] = useState<Map<string, number>>(new Map());
  const [focus, setFocus] = useState('');
  const active = tab === 'text' ? 'text' : 'vocab';
  const focusCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const v of lesson?.vocab ?? []) for (const ph of detectPhenomena(transcribe(v.fr))) counts.set(ph, (counts.get(ph) ?? 0) + 1);
    return counts;
  }, [lesson]);
  useEffect(() => {
    listAttemptsForPack(pack.id).then((rows: Attempt[]) => {
      const m = new Map<string, number>();
      for (const r of rows) if (r.lessonId === lessonId) m.set(r.itemId, Math.max(m.get(r.itemId) ?? 0, r.overall));
      setBest(m);
    });
  }, [pack.id, lessonId]);
  if (!lesson) return <div className="card">Lektion nicht gefunden.</div>;

  const playItem = async (text: string, audioId?: string, start?: number, end?: number) => {
    await playModelText(text, { audioId, start, end, ttsFallback: settings.ttsFallback, voiceName: settings.ttsVoice || undefined }).catch(() => undefined);
  };

  return (
    <div>
      <button className="btn ghost" onClick={() => navigate({ name: 'home' })}><Icon.prev /> {pack.title}</button>
      <h1 style={{ marginTop: 8 }}>{lesson.title}</h1>
      <div className="tabs">
        <button className={active === 'vocab' ? 'active' : ''} onClick={() => navigate({ name: 'lesson', packId: pack.id, lessonId, tab: 'vocab' })}>Vokabeln ({lesson.vocab.length})</button>
        <button className={active === 'text' ? 'active' : ''} onClick={() => navigate({ name: 'lesson', packId: pack.id, lessonId, tab: 'text' })}>Texte ({lesson.texts.length})</button>
      </div>
      {active === 'vocab' && (
        <div className="card">
          <div className="row between" style={{ marginBottom: 8 }}>
            <h2 style={{ margin: 0 }}>Vokabeln</h2>
            <div className="row">
              <select value={focus} onChange={(e) => setFocus(e.target.value)} aria-label="Fokus" style={{ padding: 8, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)' }}>
                <option value="">Alle Wörter</option>
                {PHENOMENA.filter((p) => (focusCounts.get(p.id) ?? 0) > 0).map((p) => (
                  <option key={p.id} value={p.id}>{p.emoji} {p.short} ({focusCounts.get(p.id)})</option>
                ))}
              </select>
              <button className="btn primary" disabled={!lesson.vocab.length} onClick={() => navigate({ name: 'train', packId: pack.id, lessonId, kind: 'vocab', focus: focus || undefined })}>
                <Icon.mic /> Training starten
              </button>
            </div>
          </div>
          {lesson.sections?.length ? (
            lesson.sections.map((sec) => (
              <div key={sec.id}>
                <h3 className="muted" style={{ marginTop: 12 }}>{sec.title}</h3>
                <VocabList pack={pack} lessonId={lessonId} entries={lesson.vocab.filter((v) => v.sectionId === sec.id)} best={best} play={playItem} showIpa={settings.showIpa} />
              </div>
            ))
          ) : null}
          <VocabList pack={pack} lessonId={lessonId} entries={lesson.vocab.filter((v) => !v.sectionId || !lesson.sections?.some((s) => s.id === v.sectionId))} best={best} play={playItem} showIpa={settings.showIpa} />
        </div>
      )}
      {active === 'text' && (
        <div className="stack">
          {lesson.texts.length === 0 && <div className="card muted">Keine Texte in dieser Lektion.</div>}
          {lesson.texts.map((t) => (
            <div className="card" key={t.id}>
              <div className="row between">
                <h2 style={{ margin: 0 }}>{t.title}</h2>
                <div className="row">
                  {t.audioId && <button className="btn" onClick={() => void playItem('', t.audioId)}><Icon.play /> Ganzer Text</button>}
                  <button className="btn primary" onClick={() => navigate({ name: 'train', packId: pack.id, lessonId, kind: 'text', itemId: t.sentences[0]?.id })}><Icon.mic /> Satz für Satz üben</button>
                </div>
              </div>
              <ul className="list" style={{ marginTop: 8 }}>
                {t.sentences.map((s) => (
                  <li key={s.id}>
                    <button className="btn ghost" aria-label="Anhören" onClick={() => void playItem(s.fr, s.audioId ?? t.audioId, s.audioId ? undefined : s.start, s.audioId ? undefined : s.end)}><Icon.play /></button>
                    <div>
                      <div className="fr">{s.fr}</div>
                      {s.de && <div className="de small">{s.de}</div>}
                    </div>
                    <span className="spacer" />
                    {best.has(s.id) && <Badge score={best.get(s.id)} />}
                    <button className="btn ghost" onClick={() => navigate({ name: 'train', packId: pack.id, lessonId, kind: 'text', itemId: s.id })}><Icon.mic /></button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function VocabList({ pack, lessonId, entries, best, play, showIpa }: { pack: Pack; lessonId: string; entries: Pack['lessons'][number]['vocab']; best: Map<string, number>; play: (text: string, audioId?: string, start?: number, end?: number) => Promise<void>; showIpa: boolean }) {
  if (!entries.length) return null;
  return (
    <ul className="list">
      {entries.map((v) => (
        <li key={v.id}>
          <button className="btn ghost" aria-label="Anhören" onClick={() => void play(v.fr, v.audioId, v.start, v.end)}><Icon.play /></button>
          <div>
            <div className="fr">{v.fr}</div>
            <div className="de small">{v.de}{showIpa && <span className="ipa muted"> · [{v.ipa ?? ipaString(transcribe(v.fr))}]</span>}</div>
          </div>
          <span className="spacer" />
          {best.has(v.id) && <Badge score={best.get(v.id)} />}
          <button className="btn ghost" aria-label="Üben" onClick={() => navigate({ name: 'train', packId: pack.id, lessonId, kind: 'vocab', itemId: v.id })}><Icon.mic /></button>
        </li>
      ))}
    </ul>
  );
}
