/**
 * Tagesmechanik nach dem Vorbild erfolgreicher Lern-Apps, ethisch angepasst:
 * Tagesziel (XP), Tagesquests, Serie mit Serienschutz, Kombo, Croissants als
 * Währung, Shop für Maskottchen-Outfits. Keine Ranglisten, keine Leben/Strafen.
 * Reine Funktionen (testbar); Persistenz in store.ts.
 */
import type { PhenomenonId } from '../phon/phenomena';

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

export type QuestKind = 'records' | 'good' | 'mission' | 'phenomenon' | 'combo' | 'listen' | 'blitz';

export interface Quest {
  id: string;
  kind: QuestKind;
  title: string;
  target: number;
  progress: number;
  done: boolean;
  /** nur bei kind = phenomenon */
  phenomenon?: PhenomenonId;
  reward: number; // Croissants
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
  questDay: string;
  quests: Quest[];
  croissants: number;
  /** Serienschutz (max. 2) */
  freezes: number;
  /** am wievielten Tag zuletzt ein Schutz verbraucht wurde (für die Anzeige) */
  freezeUsedDay: string;
  bestStreak: number;
  outfits: string[];
  outfit: string;
  bestCombo: number;
  recordings: number;
  bestBlitz: number;
}

export const EMPTY_DAILY: DailyState = {
  xpDay: '',
  xpToday: 0,
  dailyGoal: 30,
  goalReachedDay: '',
  goalDays: 0,
  questDay: '',
  quests: [],
  croissants: 0,
  freezes: 1,
  freezeUsedDay: '',
  bestStreak: 0,
  outfits: [],
  outfit: '',
  bestCombo: 0,
  recordings: 0,
  bestBlitz: 0,
};

export const GOAL_OPTIONS = [
  { xp: 20, label: 'Locker', hint: '≈ 3 Minuten' },
  { xp: 30, label: 'Normal', hint: '≈ 5 Minuten' },
  { xp: 50, label: 'Ernsthaft', hint: '≈ 8 Minuten' },
  { xp: 80, label: 'Intensiv', hint: '≈ 12 Minuten' },
];

// ---------- Streak mit Serienschutz ----------

export interface StreakState {
  streakDays: number;
  lastActiveDay: string;
}

/**
 * Serie fortschreiben. Wochenenden unterbrechen die Serie nie (Schulkontext).
 * Ein verpasster Schultag wird durch einen Serienschutz überbrückt, falls
 * vorhanden; bei längeren Pausen beginnt die Serie neu, die Bestleistung bleibt.
 */
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

export function advanceStreak<T extends StreakState & Pick<DailyState, 'freezes' | 'freezeUsedDay' | 'bestStreak'>>(g: T, today = localDay()): T {
  if (g.lastActiveDay === today) return g;
  let streakDays: number;
  let freezes = g.freezes;
  let freezeUsedDay = g.freezeUsedDay;
  const missed = missedWeekdays(g.lastActiveDay, today);
  if (missed === 0) streakDays = g.streakDays + 1;
  else if (missed === 1 && freezes > 0) {
    freezes -= 1;
    freezeUsedDay = addDays(today, -1);
    streakDays = g.streakDays + 1;
  } else streakDays = 1;
  return { ...g, streakDays, lastActiveDay: today, freezes, freezeUsedDay, bestStreak: Math.max(g.bestStreak, streakDays) };
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
      croissants: g.croissants + (goalReachedNow ? 10 : 0),
    },
    goalReachedNow,
  };
}

/** XP für eine Aufnahme: Mühe zählt (Mindest-XP), gutes Ergebnis mehr, Kombo gibt Bonus. */
export function xpForAttempt(overall: number, combo: number): number {
  const base = overall < 0 ? 3 : overall >= 95 ? 10 : overall >= 85 ? 8 : overall >= 70 ? 6 : overall >= 50 ? 4 : 3;
  const bonus = combo >= 5 ? 1 : combo >= 3 ? 0.5 : 0;
  return Math.round(base * (1 + bonus));
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

// ---------- Tagesquests ----------

const QUEST_PHENOMENA: PhenomenonId[] = ['nasal', 'u-ou', 'silent-final', 'liaison', 'plural-3', 'verb-endings', 'j-zh', 'silent-e'];
const PHENOMENON_LABEL: Partial<Record<PhenomenonId, string>> = {
  nasal: 'Nasalvokalen',
  'u-ou': 'u oder ou',
  'silent-final': 'stummen Endungen',
  liaison: 'Liaison',
  'plural-3': 'ils/elles-Formen',
  'verb-endings': 'Endungen -ez/-ons',
  'j-zh': 'j/g wie in „journal“',
  'silent-e': 'stummem e',
};

/** Deterministischer Zufall aus dem Datum (alle Geräte bekommen am selben Tag dieselben Quests). */
function seeded(day: string): () => number {
  let h = 2166136261;
  for (const c of day) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

export function questsForDay(day: string): Quest[] {
  const rnd = seeded(day);
  const ph = QUEST_PHENOMENA[Math.floor(rnd() * QUEST_PHENOMENA.length)]!;
  const pool: Quest[] = [
    { id: 'q-records', kind: 'records', title: 'Mach 6 Aufnahmen', target: 6, progress: 0, done: false, reward: 5 },
    { id: 'q-good', kind: 'good', title: 'Schaffe 3-mal mindestens 85 Punkte', target: 3, progress: 0, done: false, reward: 8 },
    { id: 'q-mission', kind: 'mission', title: 'Schließe eine Mission ab', target: 1, progress: 0, done: false, reward: 8 },
    { id: 'q-phenomenon', kind: 'phenomenon', title: `Übe 4 Wörter mit ${PHENOMENON_LABEL[ph] ?? ph}`, target: 4, progress: 0, done: false, phenomenon: ph, reward: 6 },
    { id: 'q-combo', kind: 'combo', title: 'Schaffe eine 3er-Kombo (3 × 85+ am Stück)', target: 3, progress: 0, done: false, reward: 8 },
    { id: 'q-listen', kind: 'listen', title: 'Beantworte 8 Hörfragen richtig', target: 8, progress: 0, done: false, reward: 6 },
    { id: 'q-blitz', kind: 'blitz', title: 'Spiele eine Ohren-Blitzrunde', target: 1, progress: 0, done: false, reward: 5 },
  ];
  // Erste Quest immer „Aufnahmen“ (Kern der App), dann zwei zufällige weitere
  const rest = pool.slice(1);
  for (let i = rest.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [rest[i], rest[j]] = [rest[j]!, rest[i]!]; }
  return [pool[0]!, rest[0]!, rest[1]!];
}

export type GameEvent =
  | { type: 'attempt'; score: number; phenomena: PhenomenonId[]; combo: number }
  | { type: 'mission' }
  | { type: 'listen-correct' }
  | { type: 'blitz' };

export function ensureQuests<T extends DailyState>(g: T, today = localDay()): T {
  return g.questDay === today && g.quests.length ? g : { ...g, questDay: today, quests: questsForDay(today) };
}

/** Quest-Fortschritt für ein Ereignis. Gibt neu abgeschlossene Quests zurück. */
export function applyQuestEvent<T extends DailyState>(g: T, ev: GameEvent, today = localDay()): { state: T; completed: Quest[] } {
  const s = ensureQuests(g, today);
  const completed: Quest[] = [];
  const quests = s.quests.map((q) => {
    if (q.done) return q;
    let inc = 0;
    let set: number | undefined;
    if (ev.type === 'attempt') {
      if (q.kind === 'records') inc = 1;
      if (q.kind === 'good' && ev.score >= 85) inc = 1;
      if (q.kind === 'phenomenon' && q.phenomenon && ev.phenomena.includes(q.phenomenon)) inc = 1;
      if (q.kind === 'combo') set = Math.max(q.progress, ev.combo);
    }
    if (ev.type === 'mission' && q.kind === 'mission') inc = 1;
    if (ev.type === 'listen-correct' && q.kind === 'listen') inc = 1;
    if (ev.type === 'blitz' && q.kind === 'blitz') inc = 1;
    const progress = Math.min(q.target, set ?? q.progress + inc);
    const done = progress >= q.target;
    const nq = { ...q, progress, done };
    if (done && !q.done) completed.push(nq);
    return nq;
  });
  const croissants = s.croissants + completed.reduce((a, q) => a + q.reward, 0);
  return { state: { ...s, quests, croissants }, completed };
}

// ---------- Shop ----------

export interface ShopItem {
  id: string;
  title: string;
  price: number;
  kind: 'outfit' | 'freeze';
  description: string;
}

export const SHOP: ShopItem[] = [
  { id: 'freeze', title: 'Serienschutz', price: 15, kind: 'freeze', description: 'Rettet deine Serie, wenn du einen Tag verpasst (max. 2).' },
  { id: 'beret', title: 'Béret', price: 20, kind: 'outfit', description: 'Die klassische Baskenmütze.' },
  { id: 'sunglasses', title: 'Lunettes de soleil', price: 25, kind: 'outfit', description: 'Für die Côte d’Azur.' },
  { id: 'mariniere', title: 'Marinière', price: 30, kind: 'outfit', description: 'Das gestreifte Shirt aus der Bretagne.' },
  { id: 'baguette', title: 'Baguette', price: 35, kind: 'outfit', description: 'Unverzichtbar.' },
  { id: 'echarpe', title: 'Écharpe tricolore', price: 40, kind: 'outfit', description: 'Bleu, blanc, rouge.' },
  { id: 'headphones', title: 'Casque audio', price: 45, kind: 'outfit', description: 'Für echte Ohren-Profis.' },
  { id: 'crown', title: 'Couronne', price: 100, kind: 'outfit', description: 'Le roi de la prononciation.' },
];

export function buy<T extends DailyState>(g: T, itemId: string): { state: T; ok: boolean; reason?: string } {
  const item = SHOP.find((i) => i.id === itemId);
  if (!item) return { state: g, ok: false, reason: 'Unbekannter Artikel' };
  if (g.croissants < item.price) return { state: g, ok: false, reason: 'Nicht genug Croissants' };
  if (item.kind === 'freeze') {
    if (g.freezes >= 2) return { state: g, ok: false, reason: 'Du hast schon 2 Serienschutze' };
    return { state: { ...g, croissants: g.croissants - item.price, freezes: g.freezes + 1 }, ok: true };
  }
  if (g.outfits.includes(item.id)) return { state: g, ok: false, reason: 'Schon gekauft' };
  return { state: { ...g, croissants: g.croissants - item.price, outfits: [...g.outfits, item.id], outfit: item.id }, ok: true };
}
