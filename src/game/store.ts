/** Persistenz des Spielstands (IndexedDB, Store „settings“ mit eigenem Schlüssel). */
import { getDb, listAllAttempts } from '../storage/db';
import { addXp, improvementBonus, xpForAttempt } from './daily';
import { EMPTY_GAME, evaluateBadges, touchStreak, type GameState, type MissionResult } from './rewards';

const KEY = 'game';
const listeners = new Set<() => void>();
let cached: GameState | null = null;

export async function loadGame(): Promise<GameState> {
  if (cached) return cached;
  const db = await getDb();
  const row = (await db.get('settings', KEY)) as { key: string; value: unknown } | undefined;
  cached = { ...EMPTY_GAME, ...((row?.value as Partial<GameState>) ?? {}) };
  for (const l of listeners) l();
  return cached;
}

async function saveGame(g: GameState): Promise<void> {
  cached = g;
  const db = await getDb();
  await db.put('settings', { key: KEY, value: g as unknown as never });
  for (const l of listeners) l();
}

export function subscribeGame(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function gameSnapshot(): GameState {
  return cached ?? EMPTY_GAME;
}

export interface RewardResult {
  xp: number;
  /** Bonus-XP für Verbesserung gegenüber dem letzten Versuch */
  improvement?: number;
  newBadges: string[];
  goalReachedNow: boolean;
}

async function finish(prev: GameState, next: GameState, xp: number): Promise<RewardResult> {
  const x = addXp(next, xp);
  const state = { ...x.state, points: next.points + xp };
  const badges = evaluateBadges(state, await listAllAttempts());
  const newBadges = badges.filter((b) => !prev.badges.includes(b));
  state.badges = Array.from(new Set([...prev.badges, ...badges]));
  await saveGame(state);
  return { xp, newBadges, goalReachedNow: x.goalReachedNow };
}

/** Nach einer Aufnahme: XP (Mühe + Ergebnis + Verbesserung), Serie, Abzeichen. */
export async function recordAttemptReward(overall: number, previous?: number): Promise<RewardResult> {
  const prev = await loadGame();
  const g = touchStreak(prev);
  const improvement = improvementBonus(previous, overall);
  const xp = xpForAttempt(overall) + improvement;
  const r = await finish(prev, { ...g, recordings: g.recordings + 1 }, xp);
  return { ...r, improvement };
}

export async function recordMission(result: MissionResult): Promise<RewardResult> {
  const prev = await loadGame();
  const g = touchStreak(prev);
  const prevStars = g.missionStars[result.phenomenon] ?? 0;
  const next: GameState = {
    ...g,
    missions: [...g.missions, result].slice(-200),
    missionStars: { ...g.missionStars, [result.phenomenon]: Math.max(prevStars, result.stars) },
  };
  return finish(prev, next, result.points);
}

/** Richtige Antwort im Hörquiz: kleiner XP-Beitrag. */
export async function recordListen(correct: boolean): Promise<RewardResult | null> {
  if (!correct) return null;
  const prev = await loadGame();
  return finish(prev, touchStreak(prev), 2);
}

export async function recordBlitz(correct: number): Promise<RewardResult & { newBest: boolean }> {
  const prev = await loadGame();
  const g = touchStreak(prev);
  const newBest = correct > prev.bestBlitz;
  const r = await finish(prev, { ...g, bestBlitz: Math.max(g.bestBlitz, correct) }, 5 + correct * 2);
  return { ...r, newBest };
}

export async function setDailyGoal(xp: number): Promise<void> {
  const g = await loadGame();
  await saveGame({ ...g, dailyGoal: xp });
}

export async function resetGame(): Promise<void> {
  await saveGame({ ...EMPTY_GAME });
}
