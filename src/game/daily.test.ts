import { describe, expect, it } from 'vitest';
import { EMPTY_DAILY, addDays, addXp, advanceStreak, applyQuestEvent, buy, ensureQuests, improvementBonus, localDay, missedWeekdays, questsForDay, xpForAttempt } from './daily';

const base = { ...EMPTY_DAILY, streakDays: 0, lastActiveDay: '' };

describe('Serie mit Serienschutz', () => {
  it('zählt aufeinanderfolgende Tage', () => {
    let g = advanceStreak(base, '2026-10-17');
    g = advanceStreak(g, '2026-10-18');
    expect(g.streakDays).toBe(2);
    expect(advanceStreak(g, '2026-10-18').streakDays).toBe(2);
  });
  it('überbrückt einen verpassten Schultag mit Serienschutz', () => {
    // Mo 19.10. aktiv, Di 20.10. verpasst, Mi 21.10. aktiv
    let g = advanceStreak({ ...base, freezes: 1 }, '2026-10-19');
    g = advanceStreak(g, '2026-10-21');
    expect(g.streakDays).toBe(2);
    expect(g.freezes).toBe(0);
    expect(g.freezeUsedDay).toBe('2026-10-20');
  });
  it('beginnt neu ohne Schutz, behält die Bestleistung', () => {
    // Mo 12.10., Di 13.10. aktiv, dann bis Fr 16.10. Pause (Mi, Do verpasst)
    let g = advanceStreak({ ...base, freezes: 0 }, '2026-10-12');
    g = advanceStreak(g, '2026-10-13');
    g = advanceStreak(g, '2026-10-16');
    expect(g.streakDays).toBe(1);
    expect(g.bestStreak).toBe(2);
  });
  it('lässt Wochenenden die Serie nicht unterbrechen', () => {
    // Fr 16.10.2026 → Mo 19.10.2026
    expect(missedWeekdays('2026-10-16', '2026-10-19')).toBe(0);
    let g = advanceStreak({ ...base, freezes: 0 }, '2026-10-15');
    g = advanceStreak(g, '2026-10-16');
    g = advanceStreak(g, '2026-10-19');
    expect(g.streakDays).toBe(3);
  });
  it('rechnet mit lokalen Kalendertagen über Monatsgrenzen', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2027-01-01', -1)).toBe('2026-12-31');
    expect(localDay(new Date(2026, 9, 17, 23, 59))).toBe('2026-10-17');
  });
});

describe('XP und Tagesziel', () => {
  it('meldet das Erreichen des Tagesziels genau einmal und belohnt es', () => {
    let s = { ...EMPTY_DAILY, dailyGoal: 20 };
    let r = addXp(s, 15, '2026-10-17');
    expect(r.goalReachedNow).toBe(false);
    r = addXp(r.state, 8, '2026-10-17');
    expect(r.goalReachedNow).toBe(true);
    expect(r.state.croissants).toBe(10);
    r = addXp(r.state, 8, '2026-10-17');
    expect(r.goalReachedNow).toBe(false);
    s = r.state;
    r = addXp(s, 5, '2026-10-18');
    expect(r.state.xpToday).toBe(5);
  });
  it('belohnt Verbesserung gegenüber dem letzten Versuch', () => {
    expect(improvementBonus(undefined, 80)).toBe(0);
    expect(improvementBonus(50, 80)).toBe(6);
    expect(improvementBonus(70, 82)).toBe(4);
    expect(improvementBonus(90, 88)).toBe(0);
  });
  it('belohnt Mühe und Kombos', () => {
    expect(xpForAttempt(-1, 0)).toBe(3);
    expect(xpForAttempt(40, 0)).toBe(3);
    expect(xpForAttempt(90, 0)).toBe(8);
    expect(xpForAttempt(90, 3)).toBe(12);
    expect(xpForAttempt(97, 5)).toBe(20);
  });
});

describe('Tagesquests', () => {
  it('erzeugt drei Quests, deterministisch je Tag', () => {
    const a = questsForDay('2026-10-17');
    expect(a).toHaveLength(3);
    expect(a[0]!.kind).toBe('records');
    expect(questsForDay('2026-10-17')).toEqual(a);
    expect(new Set(a.map((q) => q.id)).size).toBe(3);
  });
  it('zählt Fortschritt und vergibt Croissants', () => {
    let s = ensureQuests({ ...EMPTY_DAILY }, '2026-10-17');
    const before = s.croissants;
    let completed = 0;
    for (let i = 0; i < 6; i++) {
      const r = applyQuestEvent(s, { type: 'attempt', score: 90, phenomena: ['nasal'], combo: i + 1 }, '2026-10-17');
      s = r.state;
      completed += r.completed.length;
    }
    const rec = s.quests.find((q) => q.kind === 'records')!;
    expect(rec.done).toBe(true);
    expect(completed).toBeGreaterThanOrEqual(1);
    expect(s.croissants).toBeGreaterThan(before);
  });
});

describe('Shop', () => {
  it('kauft Outfits und Serienschutz mit Croissants', () => {
    let s = { ...EMPTY_DAILY, croissants: 50, freezes: 1 };
    let r = buy(s, 'beret');
    expect(r.ok).toBe(true);
    expect(r.state.outfit).toBe('beret');
    expect(r.state.croissants).toBe(30);
    s = r.state;
    r = buy(s, 'beret');
    expect(r.ok).toBe(false);
    r = buy(s, 'freeze');
    expect(r.ok).toBe(true);
    expect(r.state.freezes).toBe(2);
    expect(buy(r.state, 'freeze').ok).toBe(false);
    expect(buy({ ...EMPTY_DAILY, croissants: 5 }, 'crown').ok).toBe(false);
  });
});
