import { describe, expect, it } from 'vitest';
import { demoPack } from '../content/demo';
import { transcribe } from '../phon/g2p';
import { PHENOMENA, detectPhenomena } from '../phon/phenomena';
import { missionAvailability, planMission } from './missions';
import { levelFor, pointsForAttempt, starsFromScore, touchStreak, EMPTY_GAME } from './rewards';

describe('Phänomenerkennung', () => {
  it('erkennt die wichtigsten Phänomene', () => {
    const ph = (t: string) => [...detectPhenomena(transcribe(t))];
    expect(ph('petit')).toContain('silent-final');
    expect(ph('la classe')).toContain('silent-e');
    expect(ph('ils chantent')).toContain('ent-ending');
    expect(ph('bon')).toContain('nasal');
    expect(ph('tu')).toContain('u-ou');
    expect(ph('les amis')).toContain('liaison');
    expect(ph('rouge')).toContain('final-voicing');
    expect(ph('huit')).toContain('glide-ui');
    expect(ph('moi')).toContain('oi');
    expect(ph('bonne')).not.toContain('nasal');
  });
  it('hat für jedes Phänomen Regel, Tipp und Beispiele', () => {
    for (const p of PHENOMENA) {
      expect(p.rule.length).toBeGreaterThan(20);
      expect(p.tip.length).toBeGreaterThan(10);
      expect(p.examples.length).toBeGreaterThanOrEqual(3);
      for (const pair of p.pairs) expect(pair.a).not.toBe(pair.b);
    }
  });
});

describe('Missionen', () => {
  const packs = [demoPack()];
  it('zählt verfügbare Wörter je Phänomen', () => {
    const av = missionAvailability(packs);
    expect(av.nasal.total).toBeGreaterThan(5);
    expect(av['silent-final'].total).toBeGreaterThan(5);
  });
  it('plant Hörquiz und Sprechrunde', () => {
    const plan = planMission(packs, 'nasal');
    expect(plan.listening.length).toBe(6);
    expect(plan.speaking.length).toBe(5);
    for (const task of plan.listening) {
      expect(task.options).toHaveLength(2);
      expect(task.options[task.correct]!.text).toBe(task.play.text);
    }
    expect(plan.speaking.every((i) => detectPhenomena(transcribe(i.text)).has('nasal'))).toBe(true);
  });
  it('funktioniert auch ohne passende Wörter', () => {
    const plan = planMission([], 'u-ou');
    expect(plan.listening.length).toBeGreaterThan(0);
    expect(plan.speaking.length).toBe(0);
  });
});

describe('Belohnungen', () => {
  it('vergibt Sterne, Punkte und Level', () => {
    expect(starsFromScore(90)).toBe(3);
    expect(starsFromScore(72)).toBe(2);
    expect(starsFromScore(40)).toBe(0);
    expect(pointsForAttempt(-1)).toBe(2);
    expect(pointsForAttempt(88)).toBe(9);
    expect(levelFor(0).level).toBe(1);
    expect(levelFor(160).level).toBe(3);
  });
  it('zählt Serien tageweise (lokale Zeit)', () => {
    const g0 = { ...EMPTY_GAME };
    // Di 13.10.2026
    const g1 = touchStreak(g0, new Date(2026, 9, 13, 10));
    expect(g1.streakDays).toBe(1);
    expect(touchStreak(g1, new Date(2026, 9, 13, 23, 30)).streakDays).toBe(1);
    expect(touchStreak(g1, new Date(2026, 9, 14, 7)).streakDays).toBe(2);
    expect(touchStreak(g1, new Date(2026, 9, 16, 9)).streakDays).toBe(1);
  });
});
