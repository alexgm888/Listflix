import { describe, expect, it, vi } from 'vitest';
import { emptyProviders } from '../../domain/types';
import { SearchUrlWatchLinkProvider } from './search-url-provider';
import { buildSearchUrl, SEARCH_URLS } from './search-urls';

const item = {
  key: 'movie:603',
  mediaType: 'movie' as const,
  tmdbId: 603,
  title: 'Matrix & Co',
  originalTitle: 'The Matrix',
};

describe('SearchUrlWatchLinkProvider', () => {
  it('construye la URL de búsqueda de Netflix con el título codificado', async () => {
    const fetchProviders = vi.fn(async () => ({
      ...emptyProviders(),
      flatrate: [{ providerId: 8, providerName: 'Netflix', logoPath: '/n.png' }],
      tmdbLink: 'https://www.themoviedb.org/movie/603/watch?locale=ES',
    }));
    const links = await new SearchUrlWatchLinkProvider(fetchProviders).getLinks(item, 'ES');
    expect(fetchProviders).toHaveBeenCalledWith(item, 'ES');
    expect(links).toEqual([
      {
        providerId: 8,
        providerName: 'Netflix',
        logoPath: '/n.png',
        type: 'flatrate',
        url: 'https://www.netflix.com/search?q=Matrix%20%26%20Co',
        isDirect: false,
      },
    ]);
  });

  it('usa el enlace de TMDB si la plataforma no está en el mapa', async () => {
    const provider = new SearchUrlWatchLinkProvider(async () => ({
      ...emptyProviders(),
      rent: [{ providerId: 99999, providerName: 'Desconocida' }],
      tmdbLink: 'https://tmdb/where',
    }));
    const [link] = await provider.getLinks(item, 'ES');
    expect(link).toMatchObject({ type: 'rent', url: 'https://tmdb/where' });
  });

  it('ordena por tipo (suscripción, gratis, anuncios, alquiler, compra) y prioridad', async () => {
    const provider = new SearchUrlWatchLinkProvider(async () => ({
      ...emptyProviders(),
      buy: [{ providerId: 2, providerName: 'Apple TV' }],
      flatrate: [
        { providerId: 337, providerName: 'Disney Plus', displayPriority: 5 },
        { providerId: 8, providerName: 'Netflix', displayPriority: 1 },
      ],
      free: [{ providerId: 192, providerName: 'YouTube' }],
    }));
    const links = await provider.getLinks(item, 'ES');
    expect(links.map((l) => `${l.type}:${l.providerId}`)).toEqual([
      'flatrate:8',
      'flatrate:337',
      'free:192',
      'buy:2',
    ]);
  });

  it('respeta useOriginalTitle por plataforma', () => {
    expect(
      buildSearchUrl(
        { template: 'https://x/?q={q}', useOriginalTitle: true, verified: false },
        'Matrix',
        'The Matrix',
      ),
    ).toBe('https://x/?q=The%20Matrix');
  });

  it('todas las plantillas son https y contienen {q}', () => {
    for (const entry of Object.values(SEARCH_URLS)) {
      expect(entry.template.startsWith('https://')).toBe(true);
      expect(entry.template).toContain('{q}');
    }
  });
});
