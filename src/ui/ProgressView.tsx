/** Lernstand: Versuche, Bestwerte, häufige Fehler; Export als CSV/JSON. */
import { useEffect, useMemo, useState } from 'react';
import { clearAttempts, listAllAttempts } from '../storage/db';
import { useApp } from '../state/appState';
import type { Attempt } from '../types/content';
import { Badge } from './components';
import { useGame } from './MissionsView';
import { BADGES, levelFor } from '../game/rewards';
import { navigate } from '../state/appState';

const ISSUE_LABEL: Record<string, string> = {
  'silent-final': 'Stummer Endkonsonant',
  'ent-ending': 'Verbendung -ent',
  'silent-e': 'Stummes e',
  nasal: 'Nasalvokal',
  'u-ou': 'u / ou',
  r: 'Französisches r',
  'j-zh': 'j / g [ʒ]',
  'final-voicing': 'Stimmhafter Auslaut',
  'h-aspire': 'h gesprochen',
  'liaison-missing': 'Liaison fehlt',
  'liaison-false': 'Falsche Liaison',
  'glottal-stop': 'Knacklaut statt Bindung',
  'plural-stem': 'Pluralstamm (ils prennent)',
  'ez-ending': 'Endung -ez/-er/-é',
  'glide-ui': 'ui [ɥi]',
  ch: 'ch [ʃ]',
  'e-ouvert-ferme': 'e / è',
  eu: 'eu [ø/œ]',
  'missing-sound': 'Laut fehlt',
};

export function ProgressView() {
  const { packs, settings, updateSettings } = useApp();
  const game = useGame();
  const level = levelFor(game.points);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [now] = useState(() => Date.now());
  useEffect(() => { listAllAttempts().then(setAttempts); }, []);

  const stats = useMemo(() => {
    const byItem = new Map<string, { text: string; best: number; last: number; n: number; lessonId: string; packId: string }>();
    const issues = new Map<string, number>();
    for (const a of attempts) {
      const e = byItem.get(a.itemId) ?? { text: a.text, best: 0, last: 0, n: 0, lessonId: a.lessonId, packId: a.packId };
      e.best = Math.max(e.best, a.overall);
      e.last = a.overall;
      e.n++;
      byItem.set(a.itemId, e);
      for (const i of a.issues ?? []) issues.set(i, (issues.get(i) ?? 0) + 1);
    }
    const avg = attempts.length ? Math.round(attempts.reduce((s, a) => s + a.overall, 0) / attempts.length) : 0;
    const last7 = attempts.filter((a) => now - Date.parse(a.ts) < 7 * 86400e3).length;
    return { byItem, issues: [...issues.entries()].sort((a, b) => b[1] - a[1]), avg, last7 };
  }, [attempts, now]);

  const lessonTitle = (packId: string, lessonId: string) => {
    const p = packs.find((x) => x.id === packId);
    const l = p?.lessons.find((x) => x.id === lessonId);
    return l ? `${p?.title} – ${l.title}` : '';
  };

  const exportCsv = () => {
    const rows = [['Zeit', 'Name', 'Paket', 'Lektion', 'Text', 'Gesamt', 'Laute', 'Ähnlichkeit', 'Tempo', 'Hinweise']];
    for (const a of attempts) {
      rows.push([a.ts, settings.learnerName, packs.find((p) => p.id === a.packId)?.title ?? a.packId, lessonTitle(a.packId, a.lessonId), a.text, String(a.overall), a.phoneme?.toString() ?? '', a.similarity?.toFixed(0) ?? '', a.tempo?.toFixed(0) ?? '', (a.issues ?? []).join(' ')]);
    }
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(';')).join('\n');
    download(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }), `prononciation-lernstand-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  return (
    <div>
      <h1>Mein Lernstand</h1>
      <div className="card">
        <div className="row between">
          <div className="row" style={{ gap: 20 }}>
            <div className="stat"><b>{game.points}</b><span className="muted small">Punkte</span></div>
            <div className="stat"><b>Lv. {level.level}</b><span className="muted small">{level.title}</span></div>
            <div className="stat"><b>{game.streakDays} 🔥</b><span className="muted small">Tage in Folge</span></div>
            <div className="stat"><b>{game.badges.length} / {BADGES.length}</b><span className="muted small">Abzeichen</span></div>
          </div>
          <button className="btn" onClick={() => navigate({ name: 'mission' })}>Missionen</button>
        </div>
        <div className="progress" style={{ marginTop: 8 }}><div style={{ width: `${Math.round(level.progress * 100)}%` }} /></div>
      </div>
      <div className="card">
        <div className="row" style={{ gap: 28 }}>
          <div className="stat"><b>{attempts.length}</b><span className="muted small">Versuche</span></div>
          <div className="stat"><b>{stats.last7}</b><span className="muted small">in den letzten 7 Tagen</span></div>
          <div className="stat"><b>{stats.avg}</b><span className="muted small">Ø Punkte</span></div>
          <div className="stat"><b>{stats.byItem.size}</b><span className="muted small">geübte Einträge</span></div>
        </div>
      </div>
      {stats.issues.length > 0 && (
        <div className="card">
          <h2>Woran du noch arbeiten kannst</h2>
          <ul className="list">
            {stats.issues.slice(0, 6).map(([id, n]) => (
              <li key={id}><span className="fr">{ISSUE_LABEL[id] ?? id}</span><span className="spacer" /><span className="muted">{n}×</span></li>
            ))}
          </ul>
        </div>
      )}
      <div className="card">
        <h2>Einträge</h2>
        {stats.byItem.size === 0 && <p className="muted">Noch keine Versuche. Starte ein Training!</p>}
        <ul className="list">
          {[...stats.byItem.entries()].sort((a, b) => a[1].best - b[1].best).map(([id, e]) => (
            <li key={id}>
              <div>
                <div className="fr">{e.text}</div>
                <div className="de small">{lessonTitle(e.packId, e.lessonId)} · {e.n}× geübt</div>
              </div>
              <span className="spacer" />
              <span className="muted small">zuletzt {e.last}</span>
              <Badge score={e.best} />
            </li>
          ))}
        </ul>
      </div>
      <div className="card">
        <h2>Weitergeben</h2>
        <label className="field">
          Name (freiwillig, nur für den Export)
          <input value={settings.learnerName} onChange={(e) => void updateSettings({ learnerName: e.target.value })} />
        </label>
        <div className="row" style={{ marginTop: 10 }}>
          <button className="btn" onClick={exportCsv} disabled={!attempts.length}>Als CSV exportieren</button>
          <button className="btn" onClick={() => download(new Blob([JSON.stringify(attempts, null, 2)], { type: 'application/json' }), 'prononciation-lernstand.json')} disabled={!attempts.length}>Als JSON exportieren</button>
          <button className="btn danger" onClick={async () => { if (confirm('Alle Versuche löschen?')) { await clearAttempts(); setAttempts([]); } }} disabled={!attempts.length}>Löschen</button>
        </div>
        <p className="muted small" style={{ marginTop: 8 }}>Der Lernstand bleibt auf diesem Gerät. Du entscheidest, ob und was du deiner Lehrkraft zeigst.</p>
      </div>
    </div>
  );
}

export function download(blob: Blob, name: string): void {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 10000);
}
