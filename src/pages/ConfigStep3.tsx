import { useState } from 'react';
import { OpenClawConfig } from '../types';

interface ConfigStep3Props {
  config: Partial<OpenClawConfig>;
  updateConfig: (updates: Partial<OpenClawConfig>) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function ConfigStep3({ config, updateConfig, onNext, onBack }: ConfigStep3Props) {
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

      <h1>Configuration - Step 3</h1>
      <p>Configure your workspace directory</p>

      <div className="form-group">
        <label className="form-label">Workspace Path</label>
        <input
          type="text"
          className="form-input"
          value={workspace}
          onChange={(e) => setWorkspace(e.target.value)}
          placeholder="~/.openclaw/workspace"
        />
        <p style={{ fontSize: '14px', color: '#718096', marginTop: '8px' }}>
          This is where OpenClaw will store its data and logs.
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
        <strong style={{ color: '#2d3748' }}>Default Location</strong>
        <p style={{ color: '#4a5568', marginTop: '8px', marginBottom: '0' }}>
          The default workspace location is recommended for most users. You can
          change this later in the configuration file.
        </p>
      </div>

      <div className="button-group">
        <button className="button button-secondary" onClick={onBack}>
          Back
        </button>
        <button
          className="button"
          onClick={handleNext}
          disabled={!workspace}
        >
          Next
        </button>
      </div>
    </div>
  );
}
