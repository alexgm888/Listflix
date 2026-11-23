// Comprueba que el bundle compilado no contiene credenciales ni llamadas directas a la API de TMDB.
// Uso: node scripts/check-bundle.mjs [.output/chrome-mv3]
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const dir = process.argv[2] ?? '.output/chrome-mv3';
const forbidden = [
  { name: 'llamada directa a api.themoviedb.org', re: /api\.themoviedb\.org/ },
  { name: 'parámetro api_key', re: /api_key=/ },
  { name: 'cabecera Authorization Bearer', re: /Bearer\s+[A-Za-z0-9._-]{20,}/ },
  {
    name: 'token JWT (formato del token v4 de TMDB)',
    re: /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/,
  },
  { name: 'variable TMDB_TOKEN', re: /TMDB_TOKEN/ },
];

function files(path) {
  return statSync(path).isDirectory()
    ? readdirSync(path).flatMap((f) => files(join(path, f)))
    : [path];
}

let problems = 0;
for (const file of files(dir).filter((f) => /\.(js|html|json|css)$/.test(f))) {
  const text = readFileSync(file, 'utf8');
  for (const { name, re } of forbidden) {
    if (re.test(text)) {
      console.error(`✗ ${file}: ${name}`);
      problems++;
    }
  }
}
if (problems > 0) process.exit(1);
console.log(`✓ Bundle limpio (${dir}): sin claves ni llamadas directas a TMDB.`);
