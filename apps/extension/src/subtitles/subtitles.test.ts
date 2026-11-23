import { describe, expect, it } from 'vitest';
import { parseCues, parseTimestamp, shiftCues, srtToVtt } from './convert';
import { decodeSubtitleBytes } from './decode';

const SRT =
  '1\r\n00:00:01,500 --> 00:00:03,000\r\n¡Hola, José!\r\n\r\n2\r\n00:01:02,250 --> 00:01:04,000\r\nLínea uno\r\nLínea dos\r\n';

describe('subtítulos', () => {
  it('convierte SRT a VTT', () => {
    expect(srtToVtt(SRT)).toBe(
      'WEBVTT\n\n1\n00:00:01.500 --> 00:00:03.000\n¡Hola, José!\n\n2\n00:01:02.250 --> 00:01:04.000\nLínea uno\nLínea dos\n',
    );
  });

  it('extrae las cues de SRT y de VTT', () => {
    const cues = parseCues(SRT);
    expect(cues).toEqual([
      { start: 1.5, end: 3, text: '¡Hola, José!' },
      { start: 62.25, end: 64, text: 'Línea uno\nLínea dos' },
    ]);
    const vtt = 'WEBVTT\n\nNOTE comentario\n\n00:05.000 --> 00:06.000 align:start\nCorto\n';
    expect(parseCues(vtt)).toEqual([{ start: 5, end: 6, text: 'Corto' }]);
  });

  it('parsea marcas de tiempo', () => {
    expect(parseTimestamp('01:02:03.4')).toBeCloseTo(3723.4);
    expect(parseTimestamp('nada')).toBeNull();
  });

  it('aplica el desfase', () => {
    const cues = [
      { start: 0.2, end: 1, text: 'a' },
      { start: 2, end: 3, text: 'b' },
    ];
    expect(shiftCues(cues, 0.5)).toEqual([
      { start: 0.7, end: 1.5, text: 'a' },
      { start: 2.5, end: 3.5, text: 'b' },
    ]);
    expect(shiftCues(cues, -1.5)).toEqual([{ start: 0.5, end: 1.5, text: 'b' }]);
  });

  it('decodifica un .srt en windows-1252 con tildes', () => {
    // "Acción: ñandú" en windows-1252
    const bytes = new Uint8Array([
      0x41, 0x63, 0x63, 0x69, 0xf3, 0x6e, 0x3a, 0x20, 0xf1, 0x61, 0x6e, 0x64, 0xfa,
    ]);
    expect(decodeSubtitleBytes(bytes)).toBe('Acción: ñandú');
  });

  it('decodifica UTF-8 y quita el BOM', () => {
    const bytes = new TextEncoder().encode('﻿Acción');
    expect(decodeSubtitleBytes(bytes)).toBe('Acción');
  });
});
