import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { OpenClawConfig } from '../types';
import { buildChannelCommand, CHANNEL_CATALOG, normalizeChannelDrafts } from '../channelCatalog';

interface ConfigStep4Props {
  config: Partial<OpenClawConfig>;
  updateConfig: (updates: Partial<OpenClawConfig>) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function ConfigStep4({ config, updateConfig, onNext, onBack }: ConfigStep4Props) {
  const { t, i18n } = useTranslation();
  const [channels, setChannels] = useState(() => normalizeChannelDrafts(config.channels));
  const [selectedChannelId, setSelectedChannelId] = useState(CHANNEL_CATALOG[0]?.id || '');
  const [saving, setSaving] = useState(false);

  const toggleChannel = (channelId: string) => {
    setChannels(prev => ({
      ...prev,
      [channelId]: {
        ...prev[channelId],
        enabled: !prev[channelId]?.enabled,
        values: prev[channelId]?.values || {},
      },
    }));
  };

  const updateField = (channelId: string, fieldId: string, value: string) => {
    setChannels((prev) => ({
      ...prev,
      [channelId]: {
        enabled: prev[channelId]?.enabled || false,
        values: {
          ...(prev[channelId]?.values || {}),
          [fieldId]: value,
        },
      },
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
    ...CHANNEL_CATALOG
  ];
  const selectedChannel = channelOptions.find((channel) => channel.id === selectedChannelId) || channelOptions[0];
  if (!selectedChannel) {
    return null;
  }
  const selectedDraft = channels[selectedChannel.id];
  const setupSteps = i18n.language.startsWith('zh') ? selectedChannel.stepsZh : selectedChannel.steps;
  const setupSummary = i18n.language.startsWith('zh') ? selectedChannel.summaryZh : selectedChannel.summary;
  const setupLabel = i18n.language.startsWith('zh') ? selectedChannel.setupLabelZh : selectedChannel.setupLabel;
  const commandPreview = buildChannelCommand(selectedChannel, selectedDraft);
  const enabledCount = Object.values(channels).filter((draft) => draft.enabled).length;

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

      <div className="channel-flow">
        <div className="channel-list">
          <div className="channel-list-header">
            <div>
              <strong>{t('config.step4.catalogTitle')}</strong>
              <p>{t('config.step4.catalogInfo', { count: channelOptions.length })}</p>
            </div>
            <span className="channel-count">{t('config.step4.enabledCount', { count: enabledCount })}</span>
          </div>

          <div className="channel-grid">
            {channelOptions.map((channel) => {
              const draft = channels[channel.id];
              const localizedName = i18n.language.startsWith('zh') ? channel.nameZh : channel.name;
              const localizedSetup = i18n.language.startsWith('zh') ? channel.setupLabelZh : channel.setupLabel;
              return (
                <button
                  key={channel.id}
                  type="button"
                  className={`channel-card ${selectedChannelId === channel.id ? 'selected' : ''} ${draft?.enabled ? 'enabled' : ''}`}
                  onClick={() => setSelectedChannelId(channel.id)}
                >
                  <div className="channel-card-header">
                    <strong>{localizedName}</strong>
                    <span className="channel-card-badge">{localizedSetup}</span>
                  </div>
                  <small>{draft?.enabled ? t('config.step4.selected') : t('config.step4.notSelected')}</small>
                </button>
              );
            })}
          </div>
        </div>

        <div className="channel-detail">
          <div className="channel-detail-header">
            <div>
              <span className="channel-detail-kicker">{setupLabel}</span>
              <h3>{i18n.language.startsWith('zh') ? selectedChannel.nameZh : selectedChannel.name}</h3>
            </div>
            <label className="channel-toggle">
              <input
                type="checkbox"
                checked={selectedDraft?.enabled || false}
                onChange={() => toggleChannel(selectedChannel.id)}
              />
              <span>{selectedDraft?.enabled ? t('config.step4.selected') : t('config.step4.enableChannel')}</span>
            </label>
          </div>

          <p className="channel-detail-summary">{setupSummary}</p>

          <div className="channel-detail-actions">
            <button
              className="button button-secondary"
              onClick={() => window.electronAPI.openExternal(selectedChannel.docsUrl)}
            >
              {t('config.step4.openDocs')}
            </button>
          </div>

          {selectedChannel.fields.length > 0 && (
            <div className="channel-field-grid">
              {selectedChannel.fields.map((field) => (
                <div key={field.id} className="form-group">
                  <label className="form-label">
                    {i18n.language.startsWith('zh') ? field.labelZh : field.label}
                  </label>
                  <input
                    type={field.secret ? 'password' : 'text'}
                    className="form-input"
                    value={selectedDraft?.values[field.id] || ''}
                    onChange={(event) => updateField(selectedChannel.id, field.id, event.target.value)}
                    placeholder={field.placeholder}
                  />
                </div>
              ))}
            </div>
          )}

          <div className="channel-step-list">
            {setupSteps.map((step, index) => (
              <div key={step} className="channel-step-item">
                <span>{index + 1}</span>
                <p>{step}</p>
              </div>
            ))}
          </div>

          <div className="channel-command-box">
            <strong>{t('config.step4.commandPreview')}</strong>
            <code>{commandPreview}</code>
          </div>
        </div>
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
