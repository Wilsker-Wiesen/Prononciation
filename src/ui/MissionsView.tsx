/** Missionen: Übersicht und Durchlauf (Einführung → Hörquiz → Sprechrunde → Ergebnis). */
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { playText as playModelText } from '../audio/modelVoice';
import { missionAvailability, planMission, type ListeningTask, type MissionPlan } from '../game/missions';
import { BADGES, levelFor, starsFromScore } from '../game/rewards';
import { gameSnapshot, loadGame, recordListen, recordMission, subscribeGame } from '../game/store';
import { PATH, nextMission } from '../game/path';
import { MascotSays } from './Mascot';
import { confetti, sfx } from './fx';
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
  const next = nextMission(game.missionStars);
  return (
    <div>
      <h1>Lernpfad</h1>
      <div className="card">
        <div className="hud">
          <span className="chip">⭐ Lv. {level.level} · {level.title}</span>
          <span className="chip">⚡ {game.points} XP</span>
          <span className="chip flame">🔥 {game.streakDays}</span>
          <span className="chip">🏅 {game.badges.length}/{BADGES.length}</span>
        </div>
        <div className="progress" style={{ marginTop: 8 }}><div style={{ width: `${Math.round(level.progress * 100)}%` }} /></div>
        <div className="muted small">Nächstes Level bei {level.next} XP</div>
      </div>
      <div className="path">
        {PATH.map((unit, ui) => (
          <div key={unit.id} style={{ width: '100%' }}>
            <div className="path-unit">
              <h3>{unit.title}</h3>
              <div className="muted small" style={{ marginTop: 4 }}>{unit.subtitle}</div>
            </div>
            <div className="path" style={{ padding: 0 }}>
              {unit.missions.map((id, i) => {
                const p = PHENOMENA.find((x) => x.id === id)!;
                const stars = game.missionStars[id] ?? 0;
                const av = availability[id];
                const cls = stars >= 3 ? 'done' : id === next ? 'next' : stars > 0 ? 'started' : '';
                // Schlangenlinie wie ein Pfad
                const offset = Math.round(Math.sin((i + ui) * 1.1) * 70);
                return (
                  <div key={id} className={`path-node ${cls}`} style={{ transform: `translateX(${offset}px)` }}>
                    {id === next && <div className="small" style={{ fontWeight: 800, color: 'var(--good)' }}>Weiter hier!</div>}
                    <button aria-label={`Mission ${p.title}`} title={`${p.title} · ${av.total} Wörter`} onClick={() => navigate({ name: 'mission', phenomenonId: id })}>{p.emoji}</button>
                    <div className="stars">{'★'.repeat(stars)}{'☆'.repeat(3 - stars)}</div>
                    <div className="label">{p.short}</div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
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
    await playModelText(text, { audioId, start, end, ttsFallback: settings.ttsFallback, voiceName: settings.ttsVoice || undefined }).catch(() => undefined);
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
    sfx.fanfare();
    if (stars >= 2 || r.goalReachedNow || r.newBadges.length) confetti();
  };

  if (stage === 'intro') {
    return (
      <div>
        <button className="btn ghost" onClick={() => navigate({ name: 'mission' })}><Icon.prev /> Lernpfad</button>
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
    const sameSound = task.options.length === 2 && task.options[0]!.ipa === task.options[1]!.ipa;
    const isCorrect = (i: number) => sameSound || i === task.correct;
    return (
      <div>
        <div className="row between"><span className="muted small">Hörquiz {li + 1} / {plan.listening.length}</span><span className="muted small">{listenHits} richtig</span></div>
        <div className="card">
          <h2>{id === 'plural-3' ? 'Singular oder Plural – was hörst du?' : 'Welches Wort hörst du?'}</h2>
          {id === 'plural-3' && <p className="muted small">Achtung: Manchmal klingen beide Formen gleich. Dann ist jede Antwort richtig – und genau das ist die Regel.</p>}
          <button className="btn big" onClick={() => void playText(task.play.text, task.play.audioId, task.play.start, task.play.end)}><Icon.play /> Abspielen</button>
          <div className="row" style={{ marginTop: 14, gap: 14 }}>
            {task.options.map((o, i) => {
              const state = picked === null ? '' : isCorrect(i) ? 'good' : i === picked ? 'bad' : '';
              return (
                <button key={i} className={`btn big ${state === 'good' ? 'primary' : ''}`} style={state === 'bad' ? { borderColor: 'var(--bad)', color: 'var(--bad)' } : undefined} disabled={picked !== null}
                  onClick={() => { setPicked(i); const ok = isCorrect(i); if (ok) { setListenHits((h) => h + 1); sfx.success(); } else sfx.soft(); void recordListen(ok); }}>
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
              <div className={`badge ${isCorrect(picked) ? 'good' : 'bad'}`}>{sameSound ? 'Richtig – beide klingen genau gleich! Nur die Schrift unterscheidet sie.' : isCorrect(picked) ? 'Richtig!' : `Es war „${task.options[task.correct]!.text}“.`}</div>
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
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <MascotSays mood={(last?.stars ?? 0) >= 2 ? 'cheer' : (last?.stars ?? 0) >= 1 ? 'happy' : 'encourage'} fr={(last?.stars ?? 0) >= 3 ? 'Incroyable !' : (last?.stars ?? 0) >= 1 ? 'Mission accomplie !' : 'On recommence ensemble ?'} de={(last?.stars ?? 0) >= 1 ? 'Mission geschafft!' : 'Nochmal zusammen?'} />
        </div>
        <div style={{ fontSize: '3rem', color: '#e8b84a' }}>{'★'.repeat(last?.stars ?? 0)}{'☆'.repeat(3 - (last?.stars ?? 0))}</div>
        <h1>{(last?.stars ?? 0) >= 3 ? 'Bravo !' : (last?.stars ?? 0) >= 1 ? 'Bien joué !' : 'Encore une fois ?'}</h1>
        <p>Hörquiz: {Math.round((last?.listening ?? 0) * 100)} % richtig · Sprechen: {last && last.speaking >= 0 ? `${Math.round(last.speaking)} Punkte` : 'nicht bewertet'} · +{last?.points ?? 0} XP</p>
        {newBadges.length > 0 && (
          <div className="banner" style={{ marginTop: 8 }}>
            Neues Abzeichen: {newBadges.map((b) => { const d = BADGES.find((x) => x.id === b); return d ? `${d.emoji} ${d.title}` : b; }).join(', ')}
          </div>
        )}
        <div className="row" style={{ justifyContent: 'center', marginTop: 12 }}>
          <button className="btn" onClick={() => navigate({ name: 'mission' })}>Zum Lernpfad</button>
          <button className="btn primary" onClick={() => { location.hash = '#/'; setTimeout(() => navigate({ name: 'mission', phenomenonId: id }), 0); }}><Icon.retry /> Noch einmal</button>
        </div>
      </div>
    </div>
  );
}
