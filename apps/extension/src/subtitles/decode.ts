/**
 * Decodifica un archivo de subtítulos. Intenta UTF-8 (estricto) y, si hay bytes
 * inválidos, usa windows-1252 (habitual en .srt antiguos en español).
 */
export function decodeSubtitleBytes(bytes: ArrayBuffer | Uint8Array): string {
  const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  try {
    return stripBom(new TextDecoder('utf-8', { fatal: true }).decode(data));
  } catch {
    return stripBom(new TextDecoder('windows-1252').decode(data));
  }
}

function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}
