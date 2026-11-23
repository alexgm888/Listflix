/**
 * Ejecuta `worker` para cada elemento con un máximo de `limit` tareas a la vez.
 * Los errores de cada tarea se recogen sin detener al resto.
 */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  let next = 0;
  const run = async () => {
    while (next < items.length) {
      const index = next++;
      try {
        results[index] = { status: 'fulfilled', value: await worker(items[index] as T, index) };
      } catch (reason) {
        results[index] = { status: 'rejected', reason };
      }
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, run));
  return results;
}
