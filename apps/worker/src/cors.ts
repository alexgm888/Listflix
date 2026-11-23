/**
 * `ALLOWED_ORIGINS` es una lista separada por comas. Admite comodines al final,
 * p. ej. `chrome-extension://*` para desarrollo.
 * Ojo: el origen se puede falsificar fuera del navegador; esto no es seguridad real,
 * solo evita el uso desde otras webs.
 */
export function parseAllowedOrigins(raw: string | undefined): string[] {
  return (raw ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
}

export function isOriginAllowed(origin: string | null, allowed: string[]): boolean {
  if (!origin) return false;
  return allowed.some((rule) =>
    rule.endsWith('*') ? origin.startsWith(rule.slice(0, -1)) : origin === rule,
  );
}

export function corsHeaders(origin: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Accept, Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}
