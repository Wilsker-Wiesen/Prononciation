import { describe, expect, it } from 'vitest';
import { EMPTY_DAILY, addDays, addXp, advanceStreak, improvementBonus, localDay, missedWeekdays, xpForAttempt } from './daily';

const base = { ...EMPTY_DAILY, streakDays: 0, lastActiveDay: '' };

describe('Serie', () => {
  it('zählt aufeinanderfolgende Tage', () => {
    let g = advanceStreak(base, '2026-10-17');
    g = advanceStreak(g, '2026-10-18');
    expect(g.streakDays).toBe(2);
    expect(advanceStreak(g, '2026-10-18').streakDays).toBe(2);
  });
  it('verzeiht einen verpassten Schultag', () => {
    // Mo 19.10. aktiv, Di 20.10. verpasst, Mi 21.10. aktiv
    let g = advanceStreak(base, '2026-10-19');
    g = advanceStreak(g, '2026-10-21');
    expect(g.streakDays).toBe(2);
  });
  it('beginnt nach zwei verpassten Schultagen neu, behält die Bestleistung', () => {
    // Mo 12.10., Di 13.10. aktiv, dann bis Fr 16.10. Pause (Mi, Do verpasst)
    let g = advanceStreak(base, '2026-10-12');
    g = advanceStreak(g, '2026-10-13');
    g = advanceStreak(g, '2026-10-16');
    expect(g.streakDays).toBe(1);
    expect(g.bestStreak).toBe(2);
  });
  it('lässt Wochenenden die Serie nicht unterbrechen', () => {
    // Fr 16.10.2026 → Mo 19.10.2026
    expect(missedWeekdays('2026-10-16', '2026-10-19')).toBe(0);
    let g = advanceStreak(base, '2026-10-15');
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
  it('meldet das Erreichen des Tagesziels genau einmal', () => {
    let s = { ...EMPTY_DAILY, dailyGoal: 20 };
    let r = addXp(s, 15, '2026-10-17');
    expect(r.goalReachedNow).toBe(false);
    r = addXp(r.state, 8, '2026-10-17');
    expect(r.goalReachedNow).toBe(true);
    expect(r.state.goalDays).toBe(1);
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
  it('belohnt Mühe und Ergebnis', () => {
    expect(xpForAttempt(-1)).toBe(3);
    expect(xpForAttempt(40)).toBe(3);
    expect(xpForAttempt(90)).toBe(8);
    expect(xpForAttempt(97)).toBe(10);
  });
});
