import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import en from './en.json';
import es from './es.json';

function flatten(obj: object, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === 'object' ? flatten(v as object, `${prefix}${k}.`) : [`${prefix}${k}`],
  );
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx)$/.test(name) && !name.endsWith('.test.ts') ? [path] : [];
  });
}

const esKeys = new Set(flatten(es));
const enKeys = new Set(flatten(en));
/** Una clave existe si está tal cual o con sufijos de plural. */
const has = (keys: Set<string>, key: string) =>
  keys.has(key) || keys.has(`${key}_one`) || keys.has(`${key}_other`);

describe('i18n', () => {
  it('es y en tienen las mismas claves', () => {
    expect([...esKeys].filter((k) => !enKeys.has(k))).toEqual([]);
    expect([...enKeys].filter((k) => !esKeys.has(k))).toEqual([]);
  });

  it('todas las claves literales usadas en el código existen', () => {
    const root = join(__dirname, '..', '..');
    const files = [...sourceFiles(join(root, 'src')), ...sourceFiles(join(root, 'entrypoints'))];
    const missing: string[] = [];
    const re = /\bt\(\s*'([a-zA-Z0-9_.]+)'/g;
    for (const file of files) {
      const text = readFileSync(file, 'utf8');
      for (const match of text.matchAll(re)) {
        const key = match[1]!;
        if (!has(esKeys, key) || !has(enKeys, key)) missing.push(`${key} (${file})`);
      }
    }
    expect(missing).toEqual([]);
  });
});
