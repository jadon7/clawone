import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { OpenClawConfig } from '../types';

interface ConfigStep3Props {
  config: Partial<OpenClawConfig>;
  updateConfig: (updates: Partial<OpenClawConfig>) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function ConfigStep3({ config, updateConfig, onNext, onBack }: ConfigStep3Props) {
  const { t } = useTranslation();
  const [workspace, setWorkspace] = useState(config.workspace || '~/.openclaw/workspace');

  const handleNext = () => {
    updateConfig({ workspace });
    onNext();
  };

  return (
    <div className="page">
      <div className="step-indicator">
        <div className="step-dot active"></div>
        <div className="step-dot active"></div>
        <div className="step-dot active"></div>
        <div className="step-dot"></div>
      </div>

      <h1>{t('config.step3.title')}</h1>
      <p>{t('config.step3.description')}</p>

      <div className="form-group">
        <label className="form-label">{t('config.step3.workspacePath')}</label>
        <input
          type="text"
          className="form-input"
          value={workspace}
          onChange={(e) => setWorkspace(e.target.value)}
          placeholder="~/.openclaw/workspace"
        />
        <p style={{ fontSize: '14px', color: '#718096', marginTop: '8px' }}>
          {t('config.step3.workspaceInfo')}
        </p>
      </div>

      <div
        style={{
          background: '#f7fafc',
          border: '2px solid #e2e8f0',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '24px'
        }}
      >
        <strong style={{ color: '#2d3748' }}>{t('config.step3.defaultLocation')}</strong>
        <p style={{ color: '#4a5568', marginTop: '8px', marginBottom: '0' }}>
          {t('config.step3.defaultInfo')}
        </p>
      </div>

      <div className="button-group">
        <button className="button button-secondary" onClick={onBack}>
          {t('config.step3.back')}
        </button>
        <button
          className="button"
          onClick={handleNext}
          disabled={!workspace}
        >
          {t('config.step3.next')}
        </button>
      </div>
    </div>
  );
}
