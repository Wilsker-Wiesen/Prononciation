/** Persistenz des Spielstands (IndexedDB, Store „settings“ mit eigenem Schlüssel). */
import { getDb, listAllAttempts } from '../storage/db';
import { EMPTY_GAME, evaluateBadges, pointsForAttempt, touchStreak, type GameState, type MissionResult } from './rewards';

const KEY = 'game';
const listeners = new Set<() => void>();
let cached: GameState | null = null;

export async function loadGame(): Promise<GameState> {
  if (cached) return cached;
  const db = await getDb();
  const row = (await db.get('settings', KEY)) as { key: string; value: unknown } | undefined;
  cached = { ...EMPTY_GAME, ...((row?.value as Partial<GameState>) ?? {}) };
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

/** Nach einem Trainingsversuch: Punkte, Streak, Abzeichen. Gibt die gewonnenen Punkte und neue Abzeichen zurück. */
export async function recordAttemptReward(overall: number): Promise<{ points: number; newBadges: string[] }> {
  const g = touchStreak(await loadGame());
  const points = pointsForAttempt(overall);
  const attempts = await listAllAttempts();
  const next: GameState = { ...g, points: g.points + points };
  const badges = evaluateBadges(next, attempts);
  const newBadges = badges.filter((b) => !g.badges.includes(b));
  next.badges = Array.from(new Set([...g.badges, ...badges]));
  await saveGame(next);
  return { points, newBadges };
}

export async function recordMission(result: MissionResult): Promise<{ newBadges: string[] }> {
  const g = touchStreak(await loadGame());
  const prevStars = g.missionStars[result.phenomenon] ?? 0;
  const next: GameState = {
    ...g,
    points: g.points + result.points,
    missions: [...g.missions, result].slice(-200),
    missionStars: { ...g.missionStars, [result.phenomenon]: Math.max(prevStars, result.stars) },
  };
  const attempts = await listAllAttempts();
  const badges = evaluateBadges(next, attempts);
  const newBadges = badges.filter((b) => !g.badges.includes(b));
  next.badges = Array.from(new Set([...g.badges, ...badges]));
  await saveGame(next);
  return { newBadges };
}

export async function resetGame(): Promise<void> {
  await saveGame({ ...EMPTY_GAME });
}
