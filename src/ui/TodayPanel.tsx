/** „Heute“: Coco, Tagesziel, Serie, Einstieg in Pfad und Blitzrunde. */
import { useMemo } from 'react';
import { STREAK_GRACE_DAYS, localDay, missedWeekdays } from '../game/daily';
import { nextMission } from '../game/path';
import { levelFor } from '../game/rewards';
import { PHENOMENON_BY_ID } from '../phon/phenomena';
import { navigate } from '../state/appState';
import { GoalRing, Icon } from './components';
import { MascotSays, pickLine } from './Mascot';
import { useGame } from './MissionsView';

export function TodayPanel() {
  const g = useGame();
  const today = localDay();
  const xpToday = g.xpDay === today ? g.xpToday : 0;
  const active = g.lastActiveDay === today;
  // Serie gilt als lebendig, solange höchstens ein Schultag fehlt (Wochenenden zählen nicht)
  const streakAlive = active || (g.streakDays > 0 && missedWeekdays(g.lastActiveDay, today) <= STREAK_GRACE_DAYS);
  const next = PHENOMENON_BY_ID[nextMission(g.missionStars)];
  const level = levelFor(g.points);
  const greet = useMemo(() => {
    if (xpToday >= g.dailyGoal) return { mood: 'cheer' as const, ...pickLine('welcomeDone', 0) };
    if (g.streakDays >= 2 && streakAlive) return { mood: 'happy' as const, ...pickLine('welcomeStreak', 0) };
    return { mood: 'happy' as const, ...pickLine('welcome', Number(today.slice(-2)) / 31) };
  }, [xpToday, g.dailyGoal, g.streakDays, streakAlive, today]);

  return (
    <div className="card">
      <div className="row between" style={{ alignItems: 'flex-start' }}>
        <MascotSays mood={greet.mood} fr={greet.fr} de={greet.de} size={86} />
        <GoalRing value={xpToday} max={g.dailyGoal} />
      </div>
      <div className="hud" style={{ marginTop: 8 }}>
        <span className={`chip flame${streakAlive && g.streakDays ? '' : ' off'}`} title="Tage in Folge geübt">🔥 {streakAlive ? g.streakDays : 0} {g.streakDays === 1 ? 'Tag' : 'Tage'}</span>
        <span className="chip" title={`Level ${level.level}: ${level.title}`}>⭐ Lv. {level.level}</span>
      </div>
      <div className="row" style={{ marginTop: 12 }}>
        <button className="btn primary big" onClick={() => navigate({ name: 'mission', phenomenonId: next.id })}>
          {next.emoji} Weiter: {next.short} <Icon.next />
        </button>
        <button className="btn big" onClick={() => navigate({ name: 'blitz' })}>⚡ Ohren-Blitz</button>
      </div>
    </div>
  );
}
