import { useEffect } from 'react';

/** Título de la pestaña: «Sección — Listflix». */
export function useDocumentTitle(title: string | undefined): void {
  useEffect(() => {
    document.title = title ? `${title} — Listflix` : 'Listflix';
  }, [title]);
}
