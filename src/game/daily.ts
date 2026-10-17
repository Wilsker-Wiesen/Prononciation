/**
 * Tagesmechanik, bewusst schlank: Tagesziel (XP) und Serie. Keine Währung,
 * kein Shop, keine Ranglisten, keine Leben/Strafen.
 * Reine Funktionen (testbar); Persistenz in store.ts.
 */

/** Lokaler Kalendertag (nicht UTC – sonst kippt die Serie um 1 bzw. 2 Uhr nachts). */
export function localDay(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addDays(day: string, n: number): string {
  const [y, m, d] = day.split('-').map(Number) as [number, number, number];
  return localDay(new Date(y, m - 1, d + n));
}

export interface DailyState {
  /** XP heute und Tag */
  xpDay: string;
  xpToday: number;
  /** Tagesziel in XP */
  dailyGoal: number;
  goalReachedDay: string;
  /** Anzahl Tage mit erreichtem Tagesziel */
  goalDays: number;
  bestStreak: number;
  recordings: number;
  bestBlitz: number;
}

export const EMPTY_DAILY: DailyState = {
  xpDay: '',
  xpToday: 0,
  dailyGoal: 30,
  goalReachedDay: '',
  goalDays: 0,
  bestStreak: 0,
  recordings: 0,
  bestBlitz: 0,
};

export const GOAL_OPTIONS = [
  { xp: 20, label: 'Locker', hint: '≈ 3 Minuten' },
  { xp: 30, label: 'Normal', hint: '≈ 5 Minuten' },
  { xp: 50, label: 'Ernsthaft', hint: '≈ 8 Minuten' },
  { xp: 80, label: 'Intensiv', hint: '≈ 12 Minuten' },
];

// ---------- Serie ----------

export interface StreakState {
  streakDays: number;
  lastActiveDay: string;
}

function isWeekend(day: string): boolean {
  const [y, m, d] = day.split('-').map(Number) as [number, number, number];
  const wd = new Date(y, m - 1, d).getDay();
  return wd === 0 || wd === 6;
}

/** Verpasste Schultage zwischen zwei Tagen (Wochenenden zählen nicht als verpasst). */
export function missedWeekdays(lastActive: string, today: string): number {
  if (!lastActive) return Infinity;
  let missed = 0;
  for (let d = addDays(lastActive, 1); d < today; d = addDays(d, 1)) {
    if (!isWeekend(d)) missed++;
    if (missed > 30) break;
  }
  return missed;
}

/** Wie viele verpasste Schultage die Serie verzeiht (ohne Shop, ohne Kauf). */
export const STREAK_GRACE_DAYS = 1;

/**
 * Serie fortschreiben. Wochenenden unterbrechen die Serie nie (Schulkontext),
 * ein einzelner verpasster Schultag wird stillschweigend verziehen; bei
 * längeren Pausen beginnt die Serie neu, die Bestleistung bleibt.
 */
export function advanceStreak<T extends StreakState & Pick<DailyState, 'bestStreak'>>(g: T, today = localDay()): T {
  if (g.lastActiveDay === today) return g;
  const streakDays = missedWeekdays(g.lastActiveDay, today) <= STREAK_GRACE_DAYS ? g.streakDays + 1 : 1;
  return { ...g, streakDays, lastActiveDay: today, bestStreak: Math.max(g.bestStreak, streakDays) };
}

// ---------- XP und Tagesziel ----------

export function addXp<T extends DailyState>(g: T, xp: number, today = localDay()): { state: T; goalReachedNow: boolean } {
  const fresh = g.xpDay === today ? g.xpToday : 0;
  const xpToday = fresh + xp;
  const goalReachedNow = fresh < g.dailyGoal && xpToday >= g.dailyGoal && g.goalReachedDay !== today;
  return {
    state: {
      ...g,
      xpDay: today,
      xpToday,
      goalReachedDay: goalReachedNow ? today : g.goalReachedDay,
      goalDays: g.goalDays + (goalReachedNow ? 1 : 0),
    },
    goalReachedNow,
  };
}

/** XP für eine Aufnahme: Mühe zählt (Mindest-XP), gutes Ergebnis mehr. */
export function xpForAttempt(overall: number): number {
  return overall < 0 ? 3 : overall >= 95 ? 10 : overall >= 85 ? 8 : overall >= 70 ? 6 : overall >= 50 ? 4 : 3;
}

/** Bonus für Verbesserung gegenüber dem letzten eigenen Versuch am selben Eintrag (Lernfortschritt statt nur Leistung). */
export function improvementBonus(previous: number | undefined, current: number): number {
  if (previous === undefined || previous < 0 || current < 0) return 0;
  const gain = current - previous;
  if (gain >= 25) return 6;
  if (gain >= 10) return 4;
  if (gain >= 5) return 2;
  return 0;
}
