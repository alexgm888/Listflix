import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { SettingsProvider } from '@/src/app/settings-context';
import { getSettings } from '@/src/db/settings';
import { PlayerPage } from '@/src/features/player/PlayerPage';
import { initI18n } from '@/src/i18n';
import '@/src/styles/global.css';

async function bootstrap() {
  const settings = await getSettings();
  initI18n(settings.uiLanguage);
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <SettingsProvider>
        <PlayerPage />
      </SettingsProvider>
    </StrictMode>,
  );
}

void bootstrap();
