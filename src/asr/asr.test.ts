import { describe, expect, it } from 'vitest';
import { transcribe } from '../phon/g2p';
import { assess } from './assess';
import { ctcGreedyDecode, type RecognizedPhone } from './ctc';
import { align } from './align';
import { buildAlignTargets } from './score';

/** Erkannte Phone aus einer IPA-Zeichenkette (Modellraum) erzeugen. */
function rec(ipa: string, conf = 0.95): RecognizedPhone[] {
  const out: RecognizedPhone[] = [];
  const chars = [...ipa.replace(/\s+/g, '')];
  let f = 0;
  for (let i = 0; i < chars.length; i++) {
    let p = chars[i]!;
    while (chars[i + 1] === '̃') p += chars[++i];
    if ((p === 'd' && chars[i + 1] === 'ʒ') || (p === 't' && chars[i + 1] === 'ʃ')) p += chars[++i];
    out.push({ ipa: p, token: p, startFrame: f, endFrame: f + 3, conf });
    f += 3;
  }
  return out;
}

describe('CTC-Dekodierung', () => {
  it('fasst Wiederholungen zusammen und entfernt Blank', () => {
    const vocab = ['<pad>', 'a', 'b'];
    // Frames: a a <pad> b b b <pad> a
    const rows = [[0, 5, 0], [0, 5, 0], [5, 0, 0], [0, 0, 5], [0, 0, 5], [0, 0, 5], [5, 0, 0], [0, 5, 0]];
    const logits = new Float32Array(rows.flat());
    const r = ctcGreedyDecode(logits, rows.length, 3, vocab);
    expect(r.map((p) => p.ipa)).toEqual(['a', 'b', 'a']);
    expect(r[1]!.startFrame).toBe(3);
    expect(r[1]!.endFrame).toBe(6);
    expect(r[0]!.conf).toBeGreaterThan(0.9);
  });
  it('erkennt Blank-Token [PAD] und fügt Nasal-Tilde an', () => {
    const vocab = ['a', '[PAD]', 'ɛ', '\u0303', 'n'];
    const rows = [[0, 5, 0, 0, 0], [0, 0, 5, 0, 0], [0, 5, 0, 0, 0], [0, 0, 0, 5, 0], [0, 5, 0, 0, 0], [0, 0, 0, 0, 5]];
    const r = ctcGreedyDecode(new Float32Array(rows.flat()), rows.length, 5, vocab);
    expect(r.map((p) => p.ipa)).toEqual(['ɛ̃', 'n']);
  });
  it('normalisiert Längenzeichen und g', () => {
    const vocab = ['<pad>', 'iː', 'g'];
    const logits = new Float32Array([0, 5, 0, 0, 0, 5]);
    const r = ctcGreedyDecode(logits, 2, 3, vocab);
    expect(r.map((p) => p.ipa)).toEqual(['i', 'ɡ']);
  });
});

describe('Alignment', () => {
  it('ordnet identische Folgen vollständig zu', () => {
    const t = transcribe('bonjour');
    const { targets } = buildAlignTargets(t);
    const ops = align(targets, rec('bɔ̃ʒuʁ'));
    expect(ops.every((o) => o.type === 'match')).toBe(true);
  });
  it('überspringt fakultative Phone ohne Strafe', () => {
    const t = transcribe('le petit');
    const { targets } = buildAlignTargets(t);
    const ops = align(targets, rec('lpti'));
    expect(ops.filter((o) => o.type === 'del').length).toBe(2);
    const a = assess('le petit', rec('lpti'));
    expect(a.overall).toBeGreaterThanOrEqual(90);
  });
});

describe('Bewertung und Diagnose', () => {
  it('gibt 100 bei perfekter Aussprache', () => {
    const a = assess('la maison', rec('lamɛzɔ̃'));
    expect(a.overall).toBeGreaterThanOrEqual(95);
    expect(a.findings).toHaveLength(0);
    expect(a.words[1]!.score).toBeGreaterThanOrEqual(95);
  });
  it('erkennt gesprochene stumme Endkonsonanten', () => {
    const a = assess('petit', rec('pətit'));
    expect(a.findings.map((f) => f.id)).toContain('silent-final');
    expect(a.overall).toBeLessThan(100);
  });
  it('erkennt die stumme Verbendung -ent', () => {
    const a = assess('ils chantent', rec('ilʃɑ̃tɑ̃'));
    expect(a.findings.map((f) => f.id)).toContain('ent-ending');
  });
  it('erkennt Nasalvokal-Fehler (Vokal + n)', () => {
    const a = assess('bon', rec('bɔn'));
    expect(a.findings.map((f) => f.id)).toContain('nasal');
    expect(a.words[0]!.score).toBeLessThan(85);
  });
  it('erkennt u/ou-Verwechslung', () => {
    const a = assess('tu', rec('tu'));
    expect(a.findings[0]?.id).toBe('u-ou');
    const b = assess('tu', rec('ty'));
    expect(b.findings).toHaveLength(0);
  });
  it('erkennt deutsches j statt [ʒ]', () => {
    const a = assess('je', rec('jə'));
    expect(a.findings.map((f) => f.id)).toContain('j-zh');
  });
  it('erkennt fehlende Liaison', () => {
    const a = assess('les amis', rec('leami'));
    expect(a.findings.map((f) => f.id)).toContain('liaison-missing');
    const ok = assess('les amis', rec('lezami'));
    expect(ok.findings).toHaveLength(0);
    expect(ok.overall).toBeGreaterThanOrEqual(95);
  });
  it('erkennt Auslautverhärtung', () => {
    const a = assess('rouge', rec('ʁuʃ'));
    expect(a.findings.map((f) => f.id)).toContain('final-voicing');
  });
  it('erkennt gesprochenes h', () => {
    const a = assess('habiter', rec('habite'));
    expect(a.findings.map((f) => f.id)).toContain('h-aspire');
  });
  it('erkennt den deutschen Knacklaut vor Vokal', () => {
    const a = assess('il a', rec('ilʔa'));
    expect(a.findings.map((f) => f.id)).toContain('glottal-stop');
  });
  it('erkennt fehlenden Pluralstamm (ils prennent wie Singular)', () => {
    const a = assess('ils prennent', rec('ilpʁɑ̃'));
    expect(a.findings.map((f) => f.id)).toContain('plural-stem');
    const ok = assess('ils prennent', rec('ilpʁɛn'));
    expect(ok.findings).toHaveLength(0);
    expect(ok.overall).toBeGreaterThanOrEqual(95);
  });
  it('erkennt gesprochene Endung -ent bei ils parlent', () => {
    const a = assess('ils parlent', rec('ilpaʁlɑ̃'));
    expect(a.findings.map((f) => f.id)).toContain('ent-ending');
    const ok = assess('ils parlent', rec('ilpaʁl'));
    expect(ok.findings).toHaveLength(0);
  });
  it('erkennt fehlende Liaison bei ils aiment', () => {
    const a = assess('ils aiment', rec('ilɛm'));
    expect(a.findings.map((f) => f.id)).toContain('liaison-missing');
  });
  it('meldet, wenn die Aufnahme näher an der Kontrastform liegt', () => {
    const wrong = assess('ils prennent', rec('ilpʁɑ̃'), undefined, undefined, { contrast: 'il prend' });
    expect(wrong.contrast?.closerToContrast).toBe(true);
    expect(wrong.findings[0]?.id).toBe('plural-stem');
    expect(wrong.overall).toBeLessThanOrEqual(60);
    const right = assess('ils prennent', rec('ilpʁɛn'), undefined, undefined, { contrast: 'il prend' });
    expect(right.contrast?.closerToContrast).toBe(false);
    expect(right.overall).toBeGreaterThanOrEqual(95);
    const same = assess('ils parlent', rec('ilpaʁl'), undefined, undefined, { contrast: 'il parle' });
    expect(same.contrast).toBeUndefined();
  });
  it('bewertet vous parlez mit gesprochenem z oder offenem e deutlich schlechter', () => {
    expect(assess('vous parlez', rec('vupaʁle')).overall).toBeGreaterThanOrEqual(95);
    const z = assess('vous parlez', rec('vupaʁlez'));
    expect(z.findings.map((f) => f.id)).toContain('silent-final');
    expect(z.overall).toBeLessThan(85);
    const ts = assess('vous parlez', rec('vupaʁlɛts'));
    expect(ts.overall).toBeLessThan(75);
    const open = assess('vous parlez', rec('vupaʁlɛ'));
    expect(open.findings.map((f) => f.id)).toContain('ez-ending');
    expect(open.overall).toBeLessThan(95);
  });
  it('bewertet nous parlons mit [n] oder [s] schlechter', () => {
    expect(assess('nous parlons', rec('nupaʁlɔ̃')).overall).toBeGreaterThanOrEqual(95);
    expect(assess('nous parlons', rec('nupaʁlɔ̃s')).overall).toBeLessThan(85);
    expect(assess('nous parlons', rec('nupaʁlɔns')).overall).toBeLessThan(80);
  });
  it('erkennt gerolltes r', () => {
    const a = assess('rue', rec('ry'));
    expect(a.findings.map((f) => f.id)).toContain('r');
  });
  it('bewertet grob falsche Aussprache deutlich schlechter', () => {
    const good = assess('bonjour', rec('bɔ̃ʒuʁ')).overall;
    const bad = assess('bonjour', rec('bonjus')).overall;
    expect(bad).toBeLessThan(good - 25);
  });
  it('liefert Graphemspannen zur Markierung', () => {
    const a = assess('chanson', rec('ʃɑ̃sɔ̃'));
    expect(a.words[0]!.phones[1]!.start).toBe(2);
    expect(a.words[0]!.phones[1]!.end).toBe(4);
  });
  it('kommt mit leerer Erkennung zurecht', () => {
    const a = assess('bonjour', []);
    expect(a.overall).toBe(0);
    expect(a.words[0]!.phones.every((p) => p.status === 'missing' || p.status === 'skipped')).toBe(true);
  });
});
