import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@/src/styles/global.css';

function App() {
  return (
    <main className="grid min-h-screen place-items-center">
      <h1 className="text-4xl font-bold text-red-500">Listflix</h1>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
