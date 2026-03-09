import { useTranslation } from 'react-i18next';
import { AuthOptionDefinition, OpenClawConfig } from '../types';

interface ConfigStep1Props {
  authOptions: AuthOptionDefinition[];
  config: Partial<OpenClawConfig>;
  updateConfig: (updates: Partial<OpenClawConfig>) => void;
  onNext: () => void;
}

export default function ConfigStep1({ authOptions, config, updateConfig, onNext }: ConfigStep1Props) {
  const { t, i18n } = useTranslation();

  const handleProviderChange = (authChoice: string) => {
    const option = authOptions.find((item) => item.id === authChoice);
    updateConfig({
      ai: {
        authChoice,
        provider: i18n.language.startsWith('zh') ? option?.labelZh || authChoice : option?.label || authChoice,
        providerId: option?.providerId,
        values: {},
        apiKey: '',
      }
    });
  };

  const canContinue = () => {
    return Boolean(config.ai?.authChoice);
  };

  const selectedOption = authOptions.find((item) => item.id === config.ai?.authChoice);

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
          value={config.ai?.authChoice || ''}
          onChange={(e) => handleProviderChange(e.target.value)}
        >
          <option value="">{t('config.step1.selectProvider')}</option>
          {authOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {i18n.language.startsWith('zh') ? option.labelZh : option.label}
            </option>
          ))}
        </select>
      </div>

      {selectedOption && (
        <div
          style={{
            background: '#f7fafc',
            border: '2px solid #e2e8f0',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '24px'
          }}
        >
          <strong style={{ color: '#2d3748' }}>
            {i18n.language.startsWith('zh') ? selectedOption.labelZh : selectedOption.label}
          </strong>
          <p style={{ color: '#4a5568', marginTop: '8px', marginBottom: '0' }}>
            {i18n.language.startsWith('zh') ? selectedOption.descriptionZh : selectedOption.description}
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
