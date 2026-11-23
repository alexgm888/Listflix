import { describe, expect, it } from 'vitest';
import { mapWithConcurrency } from './concurrency';

describe('mapWithConcurrency', () => {
  it('respeta el límite y conserva el orden', async () => {
    let active = 0;
    let maxActive = 0;
    const res = await mapWithConcurrency([1, 2, 3, 4, 5], 2, async (n) => {
      active++;
      maxActive = Math.max(maxActive, active);
      await new Promise((r) => setTimeout(r, 5));
      active--;
      if (n === 3) throw new Error('x');
      return n * 2;
    });
    expect(maxActive).toBe(2);
    expect(res.map((r) => (r.status === 'fulfilled' ? r.value : 'err'))).toEqual([
      2,
      4,
      'err',
      8,
      10,
    ]);
  });

  it('funciona con listas vacías', async () => {
    expect(await mapWithConcurrency([], 3, async () => 1)).toEqual([]);
  });
});
