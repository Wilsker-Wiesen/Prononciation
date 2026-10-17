/** Schlüssel für vorab erzeugte Vorbild-Aufnahmen (gemeinsam für App und Werkzeuge). */

/** Text für den Schlüssel normalisieren (Apostroph, Leerraum, Auslassungspunkte). */
export function normalizeTtsText(text: string): string {
  return text
    .normalize('NFC')
    .replace(/[’‘ʼ]/g, "'")
    .replace(/\s*…\s*$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Stabiler Schlüssel (FNV-1a, 32 bit, hex) für einen Text. */
export function ttsKey(text: string): string {
  let h = 0x811c9dc5;
  for (const ch of normalizeTtsText(text)) {
    h ^= ch.codePointAt(0)!;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}
