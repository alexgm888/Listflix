import { QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { HashRouter, Route, Routes } from 'react-router';
import { LibraryPage } from '../features/library/LibraryPage';
import { ListDetailPage } from '../features/lists/ListDetailPage';
import { ListsPage } from '../features/lists/ListsPage';
import { SearchPage } from '../features/search/SearchPage';
import { TitlePage } from '../features/title-detail/TitlePage';
import { Layout } from './Layout';
import { createQueryClient } from './query-client';
import { SettingsProvider } from './settings-context';

export function App() {
  const [queryClient] = useState(createQueryClient);
  return (
    <QueryClientProvider client={queryClient}>
      <SettingsProvider>
        <HashRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<LibraryPage />} />
              <Route path="search" element={<SearchPage />} />
              <Route path="title/:type/:id" element={<TitlePage />} />
              <Route path="lists" element={<ListsPage />} />
              <Route path="lists/:id" element={<ListDetailPage />} />
              <Route path="*" element={<LibraryPage />} />
            </Route>
          </Routes>
        </HashRouter>
      </SettingsProvider>
    </QueryClientProvider>
  );
}
