import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@/src/app/App';
import { getSettings } from '@/src/db/settings';
import { initI18n } from '@/src/i18n';
import '@/src/styles/global.css';

async function bootstrap() {
  // Crea los ajustes por defecto la primera vez y fija el idioma antes de pintar.
  const settings = await getSettings();
  initI18n(settings.uiLanguage);
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void bootstrap();
