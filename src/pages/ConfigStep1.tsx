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
    'openai', 'anthropic', 'chutes', 'vllm', 'minimax', 'moonshot',
    'google', 'xai', 'mistral', 'volcengine', 'byteplus', 'openrouter',
    'kilo', 'qwen', 'zai', 'qianfan', 'copilot', 'vercel', 'opencode-zen',
    'xiaomi', 'synthetic', 'together', 'huggingface', 'venice', 'litellm',
    'cloudflare', 'custom'
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
            <option key={provider} value={provider}>
              {t(`config.step1.providers.${provider}`)}
            </option>
          ))}
        </select>
      </div>

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
