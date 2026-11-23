import { QueryClient } from '@tanstack/react-query';
import { ApiRequestError } from '@listflix/shared';

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 10 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          if (error instanceof ApiRequestError && [400, 404, 429].includes(error.status)) {
            return false;
          }
          return failureCount < 2;
        },
      },
    },
  });
}
