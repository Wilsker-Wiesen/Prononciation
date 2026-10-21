import { describe, expect, it } from 'vitest';
import { makeQuestion, makeRound } from './listening';

const v = (id: string, fr: string, de = '') => ({ id, fr, de });
const seq = () => { let i = 0; return () => ((i++ * 0.37) % 1); };

const sentences = [
  v('s1', 'Léo habite à Paris avec sa famille.'),
  v('s2', 'Il cherche son chat dans la cuisine.'),
  v('s3', 'Aujourd’hui, nous allons au collège.'),
  v('s4', 'Elle mange une pomme rouge.'),
];

describe('Hörverstehen', () => {
  it('Lücke: Antwort steht im Satz, Satz lässt sich zusammensetzen', () => {
    const q = makeQuestion(sentences[0]!, sentences, seq())!;
    expect(q.type).toBe('gap');
    expect(q.before! + q.answer + q.after!).toBe(sentences[0]!.fr);
    expect(q.answer).not.toBe('Léo'); // keine Eigennamen
    expect(q.answer.length).toBeGreaterThanOrEqual(3);
  });

  it('Lücke: Ablenker sind verschieden und kommen im Satz nicht vor', () => {
    for (const s of sentences) {
      const q = makeQuestion(s, sentences, seq())!;
      expect(new Set(q.options.map((o) => o.toLowerCase())).size).toBe(q.options.length);
      expect(q.options).toContain(q.answer);
      const words = s.fr.toLowerCase().match(/\p{L}+(?:-\p{L}+)*/gu)!;
      for (const o of q.options) if (o !== q.answer) expect(words).not.toContain(o.toLowerCase());
    }
  });

  it('Bedeutung: deutsche Übersetzung mit Ablenkern aus der Lektion', () => {
    const vocab = [v('a', 'le chat', 'die Katze'), v('b', 'le chien', 'der Hund'), v('c', 'la rue', 'die Straße'), v('d', 'la souris', 'die Maus')];
    const q = makeQuestion(vocab[0]!, vocab, seq())!;
    expect(q.type).toBe('meaning');
    expect(q.answer).toBe('die Katze');
    expect(q.options).toHaveLength(4);
  });

  it('ohne genug Ablenker keine Frage', () => {
    expect(makeQuestion(v('a', 'le chat', 'die Katze'), [v('a', 'le chat', 'die Katze')])).toBeNull();
  });

  it('keine Bruchstücke aus aujourd’hui, Wörter nach Elision schon', () => {
    for (let i = 0; i < 20; i++) {
      const q = makeQuestion(v('x', 'Aujourd’hui, l’école ferme.'), sentences, () => (i * 0.13) % 1)!;
      expect(['école', 'ferme']).toContain(q.answer);
    }
  });

  it('Runde begrenzt die Anzahl', () => {
    expect(makeRound(sentences, sentences, 2, seq())).toHaveLength(2);
  });
});
