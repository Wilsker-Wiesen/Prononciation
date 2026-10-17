/** Persistenz des Spielstands (IndexedDB, Store „settings“ mit eigenem Schlüssel). */
import type { PhenomenonId } from '../phon/phenomena';
import { getDb, listAllAttempts } from '../storage/db';
import { addXp, applyQuestEvent, buy, ensureQuests, improvementBonus, xpForAttempt, type GameEvent, type Quest } from './daily';
import { EMPTY_GAME, evaluateBadges, touchStreak, type GameState, type MissionResult } from './rewards';

const KEY = 'game';
const listeners = new Set<() => void>();
let cached: GameState | null = null;
/** Kombo der laufenden Sitzung (nicht gespeichert: neue Sitzung, neues Glück) */
let sessionCombo = 0;

export async function loadGame(): Promise<GameState> {
  if (cached) return cached;
  const db = await getDb();
  const row = (await db.get('settings', KEY)) as { key: string; value: unknown } | undefined;
  cached = ensureQuests({ ...EMPTY_GAME, ...((row?.value as Partial<GameState>) ?? {}) });
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

export function currentCombo(): number {
  return sessionCombo;
}

export interface RewardResult {
  xp: number;
  /** Bonus-XP für Verbesserung gegenüber dem letzten Versuch */
  improvement?: number;
  combo: number;
  newBadges: string[];
  goalReachedNow: boolean;
  questsCompleted: Quest[];
}

async function finish(prev: GameState, next: GameState, xp: number, ev: GameEvent | null): Promise<RewardResult> {
  let state = next;
  let questsCompleted: Quest[] = [];
  if (ev) {
    const q = applyQuestEvent(state, ev);
    state = q.state;
    questsCompleted = q.completed;
  }
  const questXp = questsCompleted.length * 5;
  const x = addXp(state, xp + questXp);
  state = { ...x.state, points: state.points + xp + questXp };
  const badges = evaluateBadges(state, await listAllAttempts());
  const newBadges = badges.filter((b) => !prev.badges.includes(b));
  state.badges = Array.from(new Set([...prev.badges, ...badges]));
  await saveGame(state);
  return { xp: xp + questXp, combo: sessionCombo, newBadges, goalReachedNow: x.goalReachedNow, questsCompleted };
}

/** Nach einer Aufnahme: XP (Mühe + Ergebnis + Kombo), Serie, Quests, Abzeichen. */
export async function recordAttemptReward(overall: number, phenomena: PhenomenonId[] = [], previous?: number): Promise<RewardResult> {
  const prev = await loadGame();
  sessionCombo = overall >= 85 ? sessionCombo + 1 : 0;
  const g = touchStreak(prev);
  const improvement = improvementBonus(previous, overall);
  const xp = xpForAttempt(overall, sessionCombo) + improvement;
  const next: GameState = { ...g, recordings: g.recordings + 1, bestCombo: Math.max(g.bestCombo, sessionCombo) };
  const r = await finish(prev, next, xp, { type: 'attempt', score: overall, phenomena, combo: sessionCombo });
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
    croissants: g.croissants + result.stars * 2,
  };
  return finish(prev, next, result.points, { type: 'mission' });
}

/** Richtige Antwort im Hörquiz: kleiner XP-Beitrag, Quest-Fortschritt. */
export async function recordListen(correct: boolean): Promise<RewardResult | null> {
  if (!correct) return null;
  const prev = await loadGame();
  return finish(prev, touchStreak(prev), 2, { type: 'listen-correct' });
}

export async function recordBlitz(correct: number): Promise<RewardResult & { newBest: boolean }> {
  const prev = await loadGame();
  const g = touchStreak(prev);
  const newBest = correct > prev.bestBlitz;
  const r = await finish(prev, { ...g, bestBlitz: Math.max(g.bestBlitz, correct) }, 5 + correct * 2, { type: 'blitz' });
  return { ...r, newBest };
}

export async function buyItem(id: string): Promise<{ ok: boolean; reason?: string; newBadges: string[] }> {
  const prev = await loadGame();
  const r = buy(prev, id);
  if (!r.ok) return { ok: false, reason: r.reason, newBadges: [] };
  const badges = evaluateBadges(r.state, await listAllAttempts());
  const newBadges = badges.filter((b) => !prev.badges.includes(b));
  await saveGame({ ...r.state, badges: Array.from(new Set([...prev.badges, ...badges])) });
  return { ok: true, newBadges };
}

export async function setOutfit(id: string): Promise<void> {
  const g = await loadGame();
  if (id && !g.outfits.includes(id)) return;
  await saveGame({ ...g, outfit: id });
}

export async function setDailyGoal(xp: number): Promise<void> {
  const g = await loadGame();
  await saveGame({ ...g, dailyGoal: xp });
}

export async function resetGame(): Promise<void> {
  sessionCombo = 0;
  await saveGame(ensureQuests({ ...EMPTY_GAME }));
}
