/** Missionen: Übersicht und Durchlauf (Einführung → Hörquiz → Sprechrunde → Ergebnis). */
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { player } from '../audio/player';
import { speakFrench, ttsAvailable } from '../audio/tts';
import { audioBlob } from '../content/pack';
import { missionAvailability, planMission, type ListeningTask, type MissionPlan } from '../game/missions';
import { BADGES, levelFor, starsFromScore } from '../game/rewards';
import { gameSnapshot, loadGame, recordMission, subscribeGame } from '../game/store';
import { PHENOMENA, type PhenomenonId } from '../phon/phenomena';
import { navigate, useApp } from '../state/appState';
import { newId } from '../types/content';
import { Icon } from './components';
import { TrainerCard } from './TrainerView';
import type { TrainItem } from './useTrainer';

export function useGame() {
  useEffect(() => { void loadGame(); }, []);
  return useSyncExternalStore(subscribeGame, gameSnapshot);
}

export function MissionsView({ phenomenonId }: { phenomenonId?: PhenomenonId }) {
  const { packs } = useApp();
  const game = useGame();
  const availability = useMemo(() => missionAvailability(packs), [packs]);
  if (phenomenonId) return <MissionRun id={phenomenonId} />;
  const level = levelFor(game.points);
  return (
    <div>
      <h1>Missionen</h1>
      <div className="card">
        <div className="row between">
          <div className="row" style={{ gap: 16 }}>
            <div className="stat"><b>{game.points}</b><span className="muted small">Punkte</span></div>
            <div className="stat"><b>Lv. {level.level}</b><span className="muted small">{level.title}</span></div>
            <div className="stat"><b>{game.streakDays} 🔥</b><span className="muted small">Tage in Folge</span></div>
            <div className="stat"><b>{game.badges.length}</b><span className="muted small">Abzeichen</span></div>
          </div>
        </div>
        <div className="progress" style={{ marginTop: 8 }}><div style={{ width: `${Math.round(level.progress * 100)}%` }} /></div>
        <div className="muted small">Nächste Stufe bei {level.next} Punkten</div>
      </div>
      <p className="muted">Jede Mission nimmt sich eine Aussprache-Regel vor: erst verstehen, dann hören, dann selbst sprechen. Wörter kommen aus deinen Lektionen.</p>
      <div className="grid">
        {PHENOMENA.map((p) => {
          const stars = game.missionStars[p.id] ?? 0;
          const av = availability[p.id];
          const ready = av.total >= 3 || p.pairs.length >= 2;
          return (
            <div className="card" key={p.id} style={{ marginBottom: 0 }}>
              <div className="row between">
                <h3 style={{ margin: 0 }}>{p.emoji} {p.title}</h3>
                <span title={`${stars} von 3 Sternen`}>{'★'.repeat(stars)}{'☆'.repeat(3 - stars)}</span>
              </div>
              <p className="small muted" style={{ margin: '6px 0' }}>{p.rule}</p>
              <div className="row between">
                <span className="muted small">{av.total} Wörter{av.withAudio ? ` · ${av.withAudio} mit Audio` : ''}</span>
                <button className="btn primary" disabled={!ready} onClick={() => navigate({ name: 'mission', phenomenonId: p.id })}>Starten</button>
              </div>
            </div>
          );
        })}
      </div>
      <div className="card" style={{ marginTop: 14 }}>
        <h2>Abzeichen</h2>
        <div className="row" style={{ gap: 12 }}>
          {BADGES.map((b) => {
            const has = game.badges.includes(b.id);
            return (
              <div key={b.id} title={b.description} style={{ opacity: has ? 1 : 0.35, textAlign: 'center', width: 96 }}>
                <div style={{ fontSize: '2rem' }}>{b.emoji}</div>
                <div className="small">{b.title}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

type Stage = 'intro' | 'listen' | 'speak' | 'result';

function MissionRun({ id }: { id: PhenomenonId }) {
  const { packs, settings } = useApp();
  const [plan] = useState<MissionPlan>(() => planMission(packs, id));
  const [stage, setStage] = useState<Stage>('intro');
  const [li, setLi] = useState(0);
  const [listenHits, setListenHits] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [si, setSi] = useState(0);
  const [speakScores, setSpeakScores] = useState<number[]>([]);
  const [newBadges, setNewBadges] = useState<string[]>([]);
  const ph = plan.phenomenon;

  const playText = async (text: string, audioId?: string, start?: number, end?: number) => {
    const blob = await audioBlob(audioId);
    if (blob) await player.play(blob, { start, end });
    else if (settings.ttsFallback && ttsAvailable()) await speakFrench(text, { rate: 0.85 }).catch(() => undefined);
  };

  const finish = async (scores: number[]) => {
    const listening = plan.listening.length ? listenHits / plan.listening.length : 1;
    const speaking = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    const rated = scores.filter((s) => s >= 0);
    const speakingRated = rated.length ? rated.reduce((a, b) => a + b, 0) / rated.length : -1;
    const combined = speakingRated >= 0 ? Math.round(0.4 * listening * 100 + 0.6 * speakingRated) : Math.round(listening * 100);
    const stars = starsFromScore(combined);
    const points = 10 + stars * 15 + Math.round(listening * 10);
    const r = await recordMission({ id: newId('m'), phenomenon: id, ts: new Date().toISOString(), stars, listening, speaking: speakingRated >= 0 ? speakingRated : speaking, points });
    setNewBadges(r.newBadges);
    setStage('result');
  };

  if (stage === 'intro') {
    return (
      <div>
        <button className="btn ghost" onClick={() => navigate({ name: 'mission' })}><Icon.prev /> Missionen</button>
        <div className="card">
          <h1>{ph.emoji} {ph.title}</h1>
          <p><b>Regel:</b> {ph.rule}</p>
          <p><b>So geht’s:</b> {ph.tip}</p>
          <p className="muted"><b>Typischer Fehler:</b> {ph.pitfall}</p>
          <h3>Hör mal rein</h3>
          <ul className="list">
            {(plan.examples.length ? plan.examples.map((e) => ({ fr: e.text, ipa: e.ipaOverride, audioId: e.audioId, start: e.start, end: e.end })) : ph.examples.map((e) => ({ fr: e.fr, ipa: e.ipa, audioId: undefined, start: undefined, end: undefined }))).map((e, i) => (
              <li key={i}>
                <button className="btn ghost" aria-label="Anhören" onClick={() => void playText(e.fr, e.audioId, e.start, e.end)}><Icon.play /></button>
                <span className="fr">{e.fr}</span>
                <span className="ipa muted">[{e.ipa ?? ''}]</span>
              </li>
            ))}
          </ul>
          <div className="row" style={{ marginTop: 10 }}>
            <button className="btn primary big" onClick={() => setStage(plan.listening.length ? 'listen' : 'speak')}>Los geht’s <Icon.next /></button>
          </div>
        </div>
      </div>
    );
  }

  if (stage === 'listen') {
    const task: ListeningTask | undefined = plan.listening[li];
    if (!task) { setStage('speak'); return null; }
    return (
      <div>
        <div className="row between"><span className="muted small">Hörquiz {li + 1} / {plan.listening.length}</span><span className="muted small">{listenHits} richtig</span></div>
        <div className="card">
          <h2>Welches Wort hörst du?</h2>
          <button className="btn big" onClick={() => void playText(task.play.text, task.play.audioId, task.play.start, task.play.end)}><Icon.play /> Abspielen</button>
          <div className="row" style={{ marginTop: 14, gap: 14 }}>
            {task.options.map((o, i) => {
              const state = picked === null ? '' : i === task.correct ? 'good' : i === picked ? 'bad' : '';
              return (
                <button key={i} className={`btn big ${state === 'good' ? 'primary' : ''}`} style={state === 'bad' ? { borderColor: 'var(--bad)', color: 'var(--bad)' } : undefined} disabled={picked !== null}
                  onClick={() => { setPicked(i); if (i === task.correct) setListenHits((h) => h + 1); }}>
                  <span>
                    <div>{o.text}</div>
                    <div className="small muted">[{o.ipa}]{o.de ? ` · ${o.de}` : ''}</div>
                  </span>
                </button>
              );
            })}
          </div>
          {picked !== null && (
            <div style={{ marginTop: 12 }}>
              <div className={`badge ${picked === task.correct ? 'good' : 'bad'}`}>{picked === task.correct ? 'Richtig!' : `Es war „${task.options[task.correct]!.text}“.`}</div>
              <div className="row" style={{ marginTop: 10 }}>
                <button className="btn primary" onClick={() => { setPicked(null); if (li + 1 < plan.listening.length) setLi(li + 1); else setStage('speak'); }}>Weiter <Icon.next /></button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (stage === 'speak') {
    const item: TrainItem | undefined = plan.speaking[si];
    if (!item) { void finish(speakScores); return null; }
    return (
      <div>
        <div className="row between"><span className="muted small">Sprechen {si + 1} / {plan.speaking.length}</span><span className="muted small">Fokus: {ph.short}</span></div>
        <TrainerCard key={item.id} item={item} onResult={(score) => setSpeakScores((s) => { const n = s.slice(); n[si] = score; return n; })} />
        <div className="row between" style={{ marginTop: 10 }}>
          <span className="muted small">{ph.tip}</span>
          <button className="btn primary" onClick={() => { const scores = speakScores.slice(); if (scores[si] === undefined) scores[si] = -1; setSpeakScores(scores); if (si + 1 < plan.speaking.length) setSi(si + 1); else void finish(scores); }}>
            {si + 1 < plan.speaking.length ? 'Nächstes Wort' : 'Mission abschließen'} <Icon.next />
          </button>
        </div>
      </div>
    );
  }

  const last = gameSnapshot().missions[gameSnapshot().missions.length - 1];
  return (
    <div>
      <div className="card" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '3rem' }}>{'★'.repeat(last?.stars ?? 0)}{'☆'.repeat(3 - (last?.stars ?? 0))}</div>
        <h1>{(last?.stars ?? 0) >= 3 ? 'Bravo !' : (last?.stars ?? 0) >= 1 ? 'Bien joué !' : 'Encore une fois ?'}</h1>
        <p>Hörquiz: {Math.round((last?.listening ?? 0) * 100)} % richtig · Sprechen: {last && last.speaking >= 0 ? `${Math.round(last.speaking)} Punkte` : 'nicht bewertet'} · +{last?.points ?? 0} Punkte</p>
        {newBadges.length > 0 && (
          <div className="banner" style={{ marginTop: 8 }}>
            Neues Abzeichen: {newBadges.map((b) => { const d = BADGES.find((x) => x.id === b); return d ? `${d.emoji} ${d.title}` : b; }).join(', ')}
          </div>
        )}
        <div className="row" style={{ justifyContent: 'center', marginTop: 12 }}>
          <button className="btn" onClick={() => navigate({ name: 'mission' })}>Zu den Missionen</button>
          <button className="btn primary" onClick={() => { location.hash = '#/'; setTimeout(() => navigate({ name: 'mission', phenomenonId: id }), 0); }}><Icon.retry /> Noch einmal</button>
        </div>
      </div>
    </div>
  );
}
