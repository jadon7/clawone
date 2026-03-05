import { useTranslation } from 'react-i18next';

interface WelcomeProps {
  onNext: () => void;
}

export default function Welcome({ onNext }: WelcomeProps) {
  const { t } = useTranslation();

  return (
    <div className="page">
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '48px', marginBottom: '24px' }}>
          🦅 {t('welcome.title')}
        </h1>
        <h2 style={{ fontSize: '24px', color: '#4a5568', marginBottom: '16px' }}>
          {t('welcome.subtitle')}
        </h2>
        <p style={{ fontSize: '18px', maxWidth: '600px', margin: '0 auto 48px' }}>
          {t('welcome.description')}
        </p>
        <button className="button" onClick={onNext}>
          {t('welcome.getStarted')}
        </button>
      </div>
    </div>
  );
}
