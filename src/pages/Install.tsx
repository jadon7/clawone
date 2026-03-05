import { useState, useEffect } from 'react';

interface InstallProps {
  onNext: () => void;
}

export default function Install({ onNext }: InstallProps) {
  const [installing, setInstalling] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    window.electronAPI.onInstallLog((log: string) => {
      setLogs(prev => [...prev, log]);
      setProgress(prev => Math.min(prev + 5, 90));
    });
  }, []);

  const startInstallation = async () => {
    setInstalling(true);
    setProgress(10);
    setLogs(['Starting OpenClaw installation...']);
    setError(null);

    try {
      await window.electronAPI.installOpenClaw();
      setProgress(100);
      setComplete(true);
      setLogs(prev => [...prev, 'Installation completed successfully!']);
    } catch (err) {
      setError((err as Error).message);
      setLogs(prev => [...prev, `Error: ${(err as Error).message}`]);
    } finally {
      setInstalling(false);
    }
  };

  return (
    <div className="page">
      <h1>Install OpenClaw</h1>
      <p>
        Click the button below to install OpenClaw globally on your system.
        This may take a few minutes.
      </p>

      {!installing && !complete && !error && (
        <button className="button" onClick={startInstallation}>
          Install OpenClaw
        </button>
      )}

      {(installing || complete || error) && (
        <>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="log-container">
            {logs.map((log, index) => (
              <div key={index} className="log-line">
                {log}
              </div>
            ))}
          </div>

          {error && (
            <div
              style={{
                background: '#fff5f5',
                border: '2px solid #fc8181',
                borderRadius: '8px',
                padding: '16px',
                marginTop: '16px'
              }}
            >
              <strong style={{ color: '#c53030' }}>Installation Failed</strong>
              <p style={{ color: '#742a2a', marginTop: '8px', marginBottom: '0' }}>
                {error}
              </p>
            </div>
          )}

          {complete && (
            <button className="button" onClick={onNext} style={{ marginTop: '24px' }}>
              Continue to Configuration
            </button>
          )}

          {error && (
            <button
              className="button button-secondary"
              onClick={startInstallation}
              style={{ marginTop: '24px' }}
            >
              Retry Installation
            </button>
          )}
        </>
      )}
    </div>
  );
}
