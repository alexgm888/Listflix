import { useTranslation } from 'react-i18next';
import { checkCompatibility } from '../../local-media/file-access';

export function CompatibilityNotice({ fileName }: { fileName: string }) {
  const { t } = useTranslation();
  const result = checkCompatibility(fileName, (mime) =>
    document.createElement('video').canPlayType(mime),
  );
  if (result === 'supported') return null;
  return (
    <p role="status" className="rounded-md bg-amber-950/60 p-2 text-sm text-amber-100">
      {result === 'unsupported' ? t('player.unsupported') : t('player.mayNotPlay')}
    </p>
  );
}
