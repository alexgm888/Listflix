export interface SubtitleCue {
  start: number; // segundos
  end: number;
  text: string;
}

function normalizeNewlines(text: string): string {
  return text.replace(/\r\n?/g, '\n');
}

/**
 * Convierte SRT a WebVTT: cabecera `WEBVTT`, `,` → `.` en las marcas de tiempo y
 * saltos de línea normalizados.
 */
export function srtToVtt(srt: string): string {
  const body = normalizeNewlines(srt)
    .trim()
    .replace(/(\d{1,2}:\d{2}:\d{2}),(\d{1,3})/g, '$1.$2');
  return `WEBVTT\n\n${body}\n`;
}

export function isVtt(text: string): boolean {
  return /^\uFEFF?WEBVTT/.test(text);
}

const TIME_RE = /(?:(\d{1,2}):)?(\d{1,2}):(\d{2})[.,](\d{1,3})/;

export function parseTimestamp(value: string): number | null {
  const m = TIME_RE.exec(value.trim());
  if (!m) return null;
  const [, h = '0', min, s, ms] = m;
  return Number(h) * 3600 + Number(min) * 60 + Number(s) + Number(ms!.padEnd(3, '0')) / 1000;
}

/** Extrae las cues de un texto WebVTT (o SRT, que se convierte antes). */
export function parseCues(input: string): SubtitleCue[] {
  const vtt = isVtt(input) ? normalizeNewlines(input) : srtToVtt(input);
  const blocks = vtt.split(/\n{2,}/);
  const cues: SubtitleCue[] = [];
  for (const block of blocks) {
    const lines = block.split('\n');
    const timingIndex = lines.findIndex((l) => l.includes('-->'));
    if (timingIndex === -1) continue;
    const [startRaw, endRaw] = lines[timingIndex]!.split('-->');
    const start = parseTimestamp(startRaw ?? '');
    const end = parseTimestamp((endRaw ?? '').trim().split(/\s+/)[0] ?? '');
    if (start === null || end === null || end <= start) continue;
    const text = lines
      .slice(timingIndex + 1)
      .join('\n')
      .trim();
    if (text) cues.push({ start, end, text });
  }
  return cues;
}

/** Desplaza las cues `offset` segundos (positivo = más tarde). Descarta las que quedan antes de 0. */
export function shiftCues(cues: SubtitleCue[], offset: number): SubtitleCue[] {
  return cues
    .map((c) => ({ ...c, start: c.start + offset, end: c.end + offset }))
    .filter((c) => c.end > 0)
    .map((c) => ({ ...c, start: Math.max(0, c.start) }));
}
