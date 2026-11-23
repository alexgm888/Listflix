import { browser } from 'wxt/browser';

export const LIBRARY_PATH = '/library.html';

/**
 * Enfoca la pestaña de la biblioteca si ya existe; si no, la crea.
 * Usa `runtime.getContexts` (Chrome 116+), que devuelve las pestañas con
 * páginas de la propia extensión sin necesitar el permiso `tabs`.
 */
export async function openOrFocusLibrary(): Promise<void> {
  const libraryUrl = browser.runtime.getURL(LIBRARY_PATH);
  try {
    const contexts = await browser.runtime.getContexts({ contextTypes: ['TAB'] });
    const existing = contexts.find(
      (ctx) => ctx.tabId >= 0 && ctx.documentUrl?.startsWith(libraryUrl),
    );
    if (existing) {
      await browser.tabs.update(existing.tabId, { active: true });
      if (existing.windowId >= 0)
        await browser.windows.update(existing.windowId, { focused: true });
      return;
    }
  } catch {
    // Si getContexts no está disponible, se abre una pestaña nueva.
  }
  await browser.tabs.create({ url: libraryUrl });
}
