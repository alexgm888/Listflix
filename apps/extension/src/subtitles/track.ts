import { shiftCues, type SubtitleCue } from './convert';

/** Sustituye las cues de una pista aplicando un desfase, sin recargar el vídeo. */
export function applyCuesToTrack(track: TextTrack, cues: SubtitleCue[], offset: number): void {
  if (track.cues) {
    for (const cue of Array.from(track.cues)) track.removeCue(cue);
  }
  for (const c of shiftCues(cues, offset)) {
    track.addCue(new VTTCue(c.start, c.end, c.text));
  }
}

/** Idioma probable a partir del nombre del archivo (`película.es.srt`, `movie.eng.srt`…). */
export function guessSubtitleLanguage(fileName: string): string | undefined {
  const match = /[._-]([a-z]{2,3})(?:[._-](?:forced|sdh|cc))?\.(?:srt|vtt)$/i.exec(fileName);
  const code = match?.[1]?.toLowerCase();
  const map: Record<string, string> = {
    spa: 'es',
    esp: 'es',
    eng: 'en',
    fre: 'fr',
    fra: 'fr',
    ger: 'de',
    deu: 'de',
    ita: 'it',
    por: 'pt',
  };
  if (!code) return undefined;
  return map[code] ?? (code.length === 2 ? code : undefined);
}
