/** Zahlwörter 0–999 999 in französischer Schreibung (für Zahlen im Text). */

const UNITS = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
const TENS = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante', 'quatre-vingt', 'quatre-vingt'];

function below100(n: number): string {
  if (n < 20) return UNITS[n]!;
  const t = Math.floor(n / 10);
  const u = n % 10;
  if (t === 7 || t === 9) {
    // 70–79 und 90–99 zählen von 60 bzw. 80 aus weiter
    const base = TENS[t]!;
    const rest = UNITS[10 + u]!;
    if (t === 7 && u === 1) return 'soixante et onze';
    return `${base}-${rest}`;
  }
  if (u === 0) return t === 8 ? 'quatre-vingts' : TENS[t]!;
  if (u === 1 && t !== 8) return `${TENS[t]} et un`;
  return `${TENS[t]}-${UNITS[u]}`;
}

function below1000(n: number): string {
  if (n < 100) return below100(n);
  const h = Math.floor(n / 100);
  const r = n % 100;
  const head = h === 1 ? 'cent' : `${UNITS[h]} cent`;
  if (r === 0) return h > 1 ? `${head}s` : head;
  return `${head} ${below100(r)}`;
}

export function numberToFrench(n: number): string {
  if (!Number.isFinite(n) || n < 0) return String(n);
  n = Math.floor(n);
  if (n < 1000) return below1000(n);
  if (n < 1_000_000) {
    const k = Math.floor(n / 1000);
    const r = n % 1000;
    const head = k === 1 ? 'mille' : `${below1000(k)} mille`;
    return r === 0 ? head : `${head} ${below1000(r)}`;
  }
  return String(n);
}

/** Ersetzt Ziffernfolgen im Text durch Zahlwörter („14 h“ → „quatorze h“). */
export function expandNumbers(text: string): string {
  return text.replace(/\d+/g, (m) => numberToFrench(parseInt(m, 10)));
}
