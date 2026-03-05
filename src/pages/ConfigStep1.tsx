import { useTranslation } from 'react-i18next';
import { OpenClawConfig } from '../types';

interface ConfigStep1Props {
  config: Partial<OpenClawConfig>;
  updateConfig: (updates: Partial<OpenClawConfig>) => void;
  onNext: () => void;
}

export default function ConfigStep1({ config, updateConfig, onNext }: ConfigStep1Props) {
  const { t } = useTranslation();
  const providers = [
    { value: 'anthropic', label: 'Anthropic Claude' },
    { value: 'openai', label: 'OpenAI' },
    { value: 'ollama', label: 'Ollama (Local)' },
    { value: 'azure', label: 'Azure OpenAI' },
    { value: 'google', label: 'Google Gemini' }
  ];

  const handleProviderChange = (provider: string) => {
    updateConfig({
      ai: {
        ...config.ai,
        provider,
        apiKey: config.ai?.apiKey || ''
      }
    });
  };

  const canContinue = () => {
    return config.ai?.provider;
  };

  return (
    <div className="page">
      <div className="step-indicator">
        <div className="step-dot active"></div>
        <div className="step-dot"></div>
        <div className="step-dot"></div>
        <div className="step-dot"></div>
      </div>

      <h1>{t('config.step1.title')}</h1>
      <p>{t('config.step1.description')}</p>

      <div className="form-group">
        <label className="form-label">{t('config.step1.aiProvider')}</label>
        <select
          className="form-select"
          value={config.ai?.provider || ''}
          onChange={(e) => handleProviderChange(e.target.value)}
        >
          <option value="">{t('config.step1.selectProvider')}</option>
          {providers.map((provider) => (
            <option key={provider.value} value={provider.value}>
              {provider.label}
            </option>
          ))}
        </select>
      </div>

      {config.ai?.provider === 'ollama' && (
        <div
          style={{
            background: '#ebf8ff',
            border: '2px solid #4299e1',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '24px'
          }}
        >
          <strong style={{ color: '#2c5282' }}>{t('config.step1.localModel')}</strong>
          <p style={{ color: '#2d3748', marginTop: '8px', marginBottom: '0' }}>
            {t('config.step1.ollamaInfo')}
          </p>
        </div>
      )}

      <div className="button-group">
        <button
          className="button"
          onClick={onNext}
          disabled={!canContinue()}
        >
          {t('config.step1.next')}
        </button>
      </div>
    </div>
  );
}
