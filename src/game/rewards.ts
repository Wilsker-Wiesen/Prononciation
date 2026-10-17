/**
 * Spielmechanik: Punkte, Sterne, Serien (Streaks) und Abzeichen.
 * Alles lokal; die Werte werden aus den Versuchen abgeleitet und ergänzt.
 */
import type { Attempt } from '../types/content';
import type { PhenomenonId } from '../phon/phenomena';

export interface MissionResult {
  id: string;
  phenomenon: PhenomenonId;
  ts: string;
  /** 0–3 Sterne */
  stars: number;
  /** Trefferquote Hörquiz 0–1 */
  listening: number;
  /** mittlerer Sprechwert 0–100 */
  speaking: number;
  points: number;
}

export interface GameState {
  points: number;
  /** beste Sterne je Mission */
  missionStars: Partial<Record<PhenomenonId, number>>;
  missions: MissionResult[];
  /** aufeinanderfolgende Übungstage */
  streakDays: number;
  lastActiveDay: string;
  badges: string[];
}

export const EMPTY_GAME: GameState = { points: 0, missionStars: {}, missions: [], streakDays: 0, lastActiveDay: '', badges: [] };

export function starsFromScore(score: number): number {
  if (score >= 85) return 3;
  if (score >= 70) return 2;
  if (score >= 50) return 1;
  return 0;
}

/** Punkte für einen Übungsversuch (Trainer): 1–10 je nach Ergebnis, Mindestlohn fürs Üben. */
export function pointsForAttempt(overall: number): number {
  if (overall < 0) return 2; // nur geübt, nicht bewertet
  return Math.max(2, Math.round(overall / 10));
}

function dayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

/** Streak fortschreiben; gibt neuen Zustand zurück. */
export function touchStreak(g: GameState, now = new Date()): GameState {
  const today = dayKey(now);
  if (g.lastActiveDay === today) return g;
  const yesterday = dayKey(new Date(now.getTime() - 86400e3));
  const streakDays = g.lastActiveDay === yesterday ? g.streakDays + 1 : 1;
  return { ...g, streakDays, lastActiveDay: today };
}

export interface BadgeDef {
  id: string;
  title: string;
  emoji: string;
  description: string;
  test: (g: GameState, attempts: Attempt[]) => boolean;
}

export const BADGES: BadgeDef[] = [
  { id: 'first-steps', title: 'Premiers pas', emoji: '👣', description: 'Erste Aufnahme gemacht.', test: (_g, a) => a.length >= 1 },
  { id: 'ten', title: 'Dix fois', emoji: '🔟', description: '10 Übungsversuche.', test: (_g, a) => a.length >= 10 },
  { id: 'fifty', title: 'Cinquante', emoji: '5️⃣0️⃣', description: '50 Übungsversuche.', test: (_g, a) => a.length >= 50 },
  { id: 'streak3', title: 'Trois jours', emoji: '🔥', description: 'An drei Tagen hintereinander geübt.', test: (g) => g.streakDays >= 3 },
  { id: 'streak7', title: 'Une semaine', emoji: '🏆', description: 'Sieben Tage am Stück.', test: (g) => g.streakDays >= 7 },
  { id: 'perfect', title: 'Parfait !', emoji: '💯', description: 'Ein Eintrag mit 95 Punkten oder mehr.', test: (_g, a) => a.some((x) => x.overall >= 95) },
  { id: 'nasal-pro', title: 'Nasal-Profi', emoji: '👃', description: 'Mission Nasalvokale mit drei Sternen.', test: (g) => (g.missionStars.nasal ?? 0) >= 3 },
  { id: 'u-ou-pro', title: 'tu ≠ tout', emoji: '👄', description: 'Mission u/ou mit drei Sternen.', test: (g) => (g.missionStars['u-ou'] ?? 0) >= 3 },
  { id: 'silent-pro', title: 'Stumm-Meister', emoji: '🤫', description: 'Mission Stumme Enden mit drei Sternen.', test: (g) => (g.missionStars['silent-final'] ?? 0) >= 3 },
  { id: 'liaison-pro', title: 'Liaison-Künstler', emoji: '🔗', description: 'Mission Liaison mit drei Sternen.', test: (g) => (g.missionStars.liaison ?? 0) >= 3 },
  { id: 'all-missions', title: 'Tour complet', emoji: '🗺️', description: 'Jede Mission mindestens einmal bestanden.', test: (g) => Object.values(g.missionStars).filter((s) => (s ?? 0) >= 1).length >= 10 },
];

export function evaluateBadges(g: GameState, attempts: Attempt[]): string[] {
  return BADGES.filter((b) => b.test(g, attempts)).map((b) => b.id);
}

/** Level aus Punkten (jede Stufe braucht mehr). */
export function levelFor(points: number): { level: number; title: string; next: number; progress: number } {
  const thresholds = [0, 50, 150, 300, 500, 800, 1200, 1700, 2300, 3000];
  const titles = ['Débutant·e', 'Apprenti·e', 'Curieux·se', 'Parleur·se', 'Bavard·e', 'Confirmé·e', 'Expert·e', 'Virtuose', 'Maître', 'Légende'];
  let level = 0;
  while (level + 1 < thresholds.length && points >= thresholds[level + 1]!) level++;
  const base = thresholds[level]!;
  const next = thresholds[level + 1] ?? base;
  const progress = next > base ? (points - base) / (next - base) : 1;
  return { level: level + 1, title: titles[level]!, next, progress };
}
