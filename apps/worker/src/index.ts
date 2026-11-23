import { handleRequest, type Env } from './handler';

export default {
  async fetch(request, env, ctx): Promise<Response> {
    try {
      return await handleRequest(request, env, {
        fetch: (input, init) => fetch(input, init),
        cache: caches.default,
        waitUntil: (promise) => ctx.waitUntil(promise),
      });
    } catch {
      return new Response(
        JSON.stringify({ error: { code: 'internal_error', message: 'Unexpected error' } }),
        { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } },
      );
    }
  },
} satisfies ExportedHandler<Env>;
