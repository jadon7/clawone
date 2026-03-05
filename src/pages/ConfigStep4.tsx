import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { OpenClawConfig } from '../types';

interface ConfigStep4Props {
  config: Partial<OpenClawConfig>;
  updateConfig: (updates: Partial<OpenClawConfig>) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function ConfigStep4({ config, updateConfig, onNext, onBack }: ConfigStep4Props) {
  const { t } = useTranslation();
  const [channels, setChannels] = useState(config.channels || {});
  const [saving, setSaving] = useState(false);

  const toggleChannel = (channel: string) => {
    setChannels(prev => ({
      ...prev,
      [channel]: !prev[channel as keyof typeof prev]
    }));
  };

  const handleFinish = async () => {
    setSaving(true);

    const finalConfig: OpenClawConfig = {
      ai: config.ai!,
      workspace: config.workspace!,
      channels
    };

    updateConfig({ channels });

    try {
      await window.electronAPI.writeConfig(finalConfig);
      onNext();
    } catch (error) {
      alert('Failed to save configuration: ' + (error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const channelOptions = [
    { id: 'whatsapp', label: 'WhatsApp' },
    { id: 'telegram', label: 'Telegram' },
    { id: 'discord', label: 'Discord' },
    { id: 'slack', label: 'Slack' }
  ];

  return (
    <div className="page">
      <div className="step-indicator">
        <div className="step-dot active"></div>
        <div className="step-dot active"></div>
        <div className="step-dot active"></div>
        <div className="step-dot active"></div>
      </div>

      <h1>{t('config.step4.title')}</h1>
      <p>{t('config.step4.description')}</p>

      <div className="checkbox-group" style={{ marginBottom: '24px' }}>
        {channelOptions.map((channel) => (
          <label key={channel.id} className="checkbox-item">
            <input
              type="checkbox"
              checked={channels[channel.id as keyof typeof channels] || false}
              onChange={() => toggleChannel(channel.id)}
            />
            <span>{channel.label}</span>
          </label>
        ))}
      </div>

      <div
        style={{
          background: '#fffaf0',
          border: '2px solid #f6ad55',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '24px'
        }}
      >
        <strong style={{ color: '#7c2d12' }}>{t('config.step4.optionalConfig')}</strong>
        <p style={{ color: '#744210', marginTop: '8px', marginBottom: '0' }}>
          {t('config.step4.optionalInfo')}
        </p>
      </div>

      <div className="button-group">
        <button className="button button-secondary" onClick={onBack}>
          {t('config.step4.back')}
        </button>
        <button
          className="button"
          onClick={handleFinish}
          disabled={saving}
        >
          {saving ? t('config.step4.saving') : t('config.step4.finish')}
        </button>
      </div>
    </div>
  );
}
