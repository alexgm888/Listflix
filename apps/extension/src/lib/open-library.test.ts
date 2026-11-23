import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { openOrFocusLibrary } from './open-library';

describe('openOrFocusLibrary', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    vi.restoreAllMocks();
  });

  it('crea la pestaña si no hay ninguna abierta', async () => {
    (fakeBrowser.runtime as unknown as { getContexts: unknown }).getContexts = vi
      .fn()
      .mockResolvedValue([]);
    const create = vi.spyOn(fakeBrowser.tabs, 'create');
    await openOrFocusLibrary();
    expect(create).toHaveBeenCalledWith({ url: expect.stringContaining('/library.html') });
  });

  it('enfoca la pestaña existente en vez de duplicarla', async () => {
    const url = fakeBrowser.runtime.getURL('/library.html');
    (fakeBrowser.runtime as unknown as { getContexts: unknown }).getContexts = vi
      .fn()
      .mockResolvedValue([{ tabId: 7, windowId: 3, documentUrl: `${url}#/lists` }]);
    const create = vi.spyOn(fakeBrowser.tabs, 'create');
    const update = vi.spyOn(fakeBrowser.tabs, 'update').mockResolvedValue({} as never);
    const focus = vi.spyOn(fakeBrowser.windows, 'update').mockResolvedValue({} as never);
    await openOrFocusLibrary();
    expect(update).toHaveBeenCalledWith(7, { active: true });
    expect(focus).toHaveBeenCalledWith(3, { focused: true });
    expect(create).not.toHaveBeenCalled();
  });

  it('ignora las pestañas del reproductor', async () => {
    const playerUrl = fakeBrowser.runtime.getURL('/player.html');
    (fakeBrowser.runtime as unknown as { getContexts: unknown }).getContexts = vi
      .fn()
      .mockResolvedValue([{ tabId: 9, windowId: 1, documentUrl: `${playerUrl}?media=x` }]);
    const create = vi.spyOn(fakeBrowser.tabs, 'create');
    await openOrFocusLibrary();
    expect(create).toHaveBeenCalled();
  });
});
