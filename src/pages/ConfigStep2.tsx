import { useState } from 'react';
import { OpenClawConfig } from '../types';

interface ConfigStep2Props {
  config: Partial<OpenClawConfig>;
  updateConfig: (updates: Partial<OpenClawConfig>) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function ConfigStep2({ config, updateConfig, onNext, onBack }: ConfigStep2Props) {
  const [apiKey, setApiKey] = useState(config.ai?.apiKey || '');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleApiKeyChange = (value: string) => {
    setApiKey(value);
    setTestResult(null);
  };

  const testConnection = async () => {
    if (!apiKey || !config.ai?.provider) return;

    setTesting(true);
    setTestResult(null);

    try {
      const result = await window.electronAPI.testApiConnection(
        config.ai.provider,
        apiKey
      );
      setTestResult(result);
    } catch (error) {
      setTestResult({
        success: false,
        message: (error as Error).message
      });
    } finally {
      setTesting(false);
    }
  };

  const handleNext = () => {
    updateConfig({
      ai: {
        ...config.ai!,
        apiKey
      }
    });
    onNext();
  };

  const canContinue = () => {
    if (config.ai?.provider === 'ollama') return true;
    return apiKey.length > 0;
  };

  const needsApiKey = config.ai?.provider !== 'ollama';

  return (
    <div className="page">
      <div className="step-indicator">
        <div className="step-dot active"></div>
        <div className="step-dot active"></div>
        <div className="step-dot"></div>
        <div className="step-dot"></div>
      </div>

      <h1>Configuration - Step 2</h1>
      <p>Enter your API credentials</p>

      {needsApiKey ? (
        <>
          <div className="form-group">
            <label className="form-label">
              API Key for {config.ai?.provider}
            </label>
            <input
              type="password"
              className="form-input"
              value={apiKey}
              onChange={(e) => handleApiKeyChange(e.target.value)}
              placeholder="Enter your API key..."
            />
          </div>

          <button
            className="button button-secondary"
            onClick={testConnection}
            disabled={!apiKey || testing}
            style={{ marginBottom: '24px' }}
          >
            {testing ? 'Testing...' : 'Test Connection'}
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
                {testResult.success ? '✓ Connection Successful' : '✗ Connection Failed'}
              </strong>
              <p style={{ marginTop: '8px', marginBottom: '0' }}>
                {testResult.message}
              </p>
            </div>
          )}
        </>
      ) : (
        <div
          style={{
            background: '#ebf8ff',
            border: '2px solid #4299e1',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '24px'
          }}
        >
          <strong style={{ color: '#2c5282' }}>No API Key Required</strong>
          <p style={{ color: '#2d3748', marginTop: '8px', marginBottom: '0' }}>
            Ollama runs locally and doesn't require an API key.
          </p>
        </div>
      )}

      <div className="button-group">
        <button className="button button-secondary" onClick={onBack}>
          Back
        </button>
        <button
          className="button"
          onClick={handleNext}
          disabled={!canContinue()}
        >
          Next
        </button>
      </div>
    </div>
  );
}
