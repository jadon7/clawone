import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AuthOptionDefinition, OpenClawConfig } from '../types';

interface ConfigStep2Props {
  authOptions: AuthOptionDefinition[];
  config: Partial<OpenClawConfig>;
  updateConfig: (updates: Partial<OpenClawConfig>) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function ConfigStep2({ authOptions, config, updateConfig, onNext, onBack }: ConfigStep2Props) {
  const { t, i18n } = useTranslation();
  const selectedOption = useMemo(
    () => authOptions.find((option) => option.id === config.ai?.authChoice),
    [authOptions, config.ai?.authChoice],
  );
  const [values, setValues] = useState<Record<string, string>>(config.ai?.values || {});
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; details?: string } | null>(null);

  useEffect(() => {
    const nextValues = { ...(config.ai?.values || {}) };
    for (const field of selectedOption?.fields || []) {
      if (field.inputType === 'select' && !nextValues[field.id] && field.options?.[0]) {
        nextValues[field.id] = field.options[0].value;
      }
    }
    setValues(nextValues);
  }, [config.ai?.values, selectedOption]);

  const updateValue = (fieldId: string, value: string) => {
    setValues((prev) => ({
      ...prev,
      [fieldId]: value,
    }));
    setTestResult(null);
  };

  const testConnection = async () => {
    if (!selectedOption) return;

    setTesting(true);
    setTestResult(null);

    try {
      const result = await window.electronAPI.testApiConnection({
        authChoice: selectedOption.id,
        provider: i18n.language.startsWith('zh') ? selectedOption.labelZh : selectedOption.label,
        providerId: selectedOption.providerId,
        values,
        apiKey: values.apiKey || '',
      });
      setTestResult(result);
    } catch (error) {
      setTestResult({
        success: false,
        message: t('config.step2.connectionFailed'),
        details: (error as Error).message,
      });
    } finally {
      setTesting(false);
    }
  };

  const handleNext = () => {
    if (!selectedOption) return;
    updateConfig({
      ai: {
        authChoice: selectedOption.id,
        provider: i18n.language.startsWith('zh') ? selectedOption.labelZh : selectedOption.label,
        providerId: selectedOption.providerId,
        values,
        apiKey: values.apiKey || '',
      }
    });
    onNext();
  };

  const canContinue = () => {
    if (!selectedOption) return false;
    return selectedOption.fields.every((field) => {
      if (!field.required) return true;
      return Boolean(values[field.id]?.trim());
    });
  };

  const renderField = (fieldId: string) => {
    const field = selectedOption?.fields.find((item) => item.id === fieldId);
    if (!field) return null;
    const localizedLabel = i18n.language.startsWith('zh') ? field.labelZh : field.label;
    const localizedHelp = i18n.language.startsWith('zh') ? field.helpZh : field.help;

    return (
      <div key={field.id} className="form-group">
        <label className="form-label">{localizedLabel}</label>
        {field.inputType === 'select' ? (
          <select
            className="form-select"
            value={values[field.id] || field.options?.[0]?.value || ''}
            onChange={(event) => updateValue(field.id, event.target.value)}
          >
            {(field.options || []).map((option) => (
              <option key={option.value} value={option.value}>
                {i18n.language.startsWith('zh') ? option.labelZh : option.label}
              </option>
            ))}
          </select>
        ) : field.inputType === 'textarea' ? (
          <textarea
            className="form-input"
            rows={4}
            value={values[field.id] || ''}
            onChange={(event) => updateValue(field.id, event.target.value)}
            placeholder={field.placeholder}
          />
        ) : (
          <input
            type={field.secret ? 'password' : 'text'}
            className="form-input"
            value={values[field.id] || ''}
            onChange={(event) => updateValue(field.id, event.target.value)}
            placeholder={field.placeholder}
          />
        )}
        {localizedHelp && (
          <p style={{ fontSize: '14px', color: '#718096', marginTop: '8px', marginBottom: '0' }}>
            {localizedHelp}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="page">
      <div className="step-indicator">
        <div className="step-dot active"></div>
        <div className="step-dot active"></div>
        <div className="step-dot"></div>
        <div className="step-dot"></div>
      </div>

      <h1>{t('config.step2.title')}</h1>
      <p>{t('config.step2.description')}</p>

      {!selectedOption ? (
        <div
          style={{
            background: '#fff5f5',
            border: '2px solid #fc8181',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '24px'
          }}
        >
          <strong style={{ color: '#c53030' }}>{t('config.step2.selectAuthFirst')}</strong>
        </div>
      ) : (
        <>
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

          {selectedOption.fields.map((field) => renderField(field.id))}

          <button
            className="button button-secondary"
            onClick={testConnection}
            disabled={!canContinue() || testing}
            style={{ marginBottom: '24px' }}
          >
            {testing ? t('config.step2.testing') : t('config.step2.testConnection')}
          </button>

          {testResult && (
            <div
              style={{
                background: testResult.success ? '#f0fff4' : '#fff5f5',
                border: `2px solid ${testResult.success ? '#48bb78' : '#fc8181'}`,
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '24px'
              }}
            >
              <strong style={{ color: testResult.success ? '#22543d' : '#c53030' }}>
                {testResult.success ? t('config.step2.connectionSuccess') : t('config.step2.connectionFailed')}
              </strong>
              <p style={{ marginTop: '8px', marginBottom: '0' }}>{testResult.message}</p>
              {testResult.details && (
                <p style={{ marginTop: '8px', marginBottom: '0', color: '#4a5568' }}>{testResult.details}</p>
              )}
            </div>
          )}
        </>
      )}

      <div className="button-group">
        <button className="button button-secondary" onClick={onBack}>
          {t('config.step2.back')}
        </button>
        <button
          className="button"
          onClick={handleNext}
          disabled={!canContinue()}
        >
          {t('config.step2.next')}
        </button>
      </div>
    </div>
  );
}
