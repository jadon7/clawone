import { useState, useEffect } from 'react';
import { OpenClawConfig } from '../types';

interface DashboardProps {
  config: OpenClawConfig;
}

export default function Dashboard({ config }: DashboardProps) {
  const [serviceRunning, setServiceRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    checkStatus();

    window.electronAPI.onServiceLog((log: string) => {
      setLogs(prev => [...prev, log]);
    });
  }, []);

  const checkStatus = async () => {
    setChecking(true);
    try {
      const status = await window.electronAPI.getServiceStatus();
      setServiceRunning(status.running);
    } catch (error) {
      setServiceRunning(false);
    } finally {
      setChecking(false);
    }
  };

  const startService = async () => {
    setLogs(['Starting OpenClaw service...']);
    try {
      await window.electronAPI.startOpenClaw();
      setServiceRunning(true);
      setLogs(prev => [...prev, 'Service started successfully!']);
    } catch (error) {
      setLogs(prev => [...prev, `Error: ${(error as Error).message}`]);
    }
  };

  const stopService = async () => {
    try {
      await window.electronAPI.stopOpenClaw();
      setServiceRunning(false);
      setLogs(prev => [...prev, 'Service stopped.']);
    } catch (error) {
      setLogs(prev => [...prev, `Error: ${(error as Error).message}`]);
    }
  };

  return (
    <div className="page">
      <h1>ClawOne Dashboard</h1>
      <p>Your OpenClaw installation is complete and ready to use!</p>

      <div className="dashboard-grid">
        <div className="dashboard-card">
          <h3>Service Status</h3>
          <div className="service-status">
            <div className={`status-indicator ${serviceRunning ? 'status-running' : 'status-stopped'}`}></div>
            <span>{serviceRunning ? 'Running' : 'Stopped'}</span>
          </div>
          <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
            {!serviceRunning ? (
              <button className="button" onClick={startService}>
                Start Service
              </button>
            ) : (
              <button className="button button-secondary" onClick={stopService}>
                Stop Service
              </button>
            )}
            <button
              className="button button-secondary"
              onClick={checkStatus}
              disabled={checking}
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="dashboard-card">
          <h3>Configuration</h3>
          <div style={{ fontSize: '14px', color: '#4a5568' }}>
            <p><strong>Provider:</strong> {config.ai.provider}</p>
            <p><strong>Workspace:</strong> {config.workspace}</p>
            <p>
              <strong>Channels:</strong>{' '}
              {Object.entries(config.channels || {})
                .filter(([_, enabled]) => enabled)
                .map(([name]) => name)
                .join(', ') || 'None'}
            </p>
          </div>
        </div>
      </div>

      <div className="dashboard-card" style={{ marginBottom: '24px' }}>
        <h3>Service Logs</h3>
        <div className="log-container" style={{ maxHeight: '200px' }}>
          {logs.length === 0 ? (
            <div style={{ color: '#718096' }}>No logs yet...</div>
          ) : (
            logs.map((log, index) => (
              <div key={index} className="log-line">
                {log}
              </div>
            ))
          )}
        </div>
      </div>

      <div
        style={{
          background: '#f0fff4',
          border: '2px solid #48bb78',
          borderRadius: '8px',
          padding: '16px'
        }}
      >
        <strong style={{ color: '#22543d' }}>✓ Setup Complete!</strong>
        <p style={{ color: '#276749', marginTop: '8px', marginBottom: '0' }}>
          OpenClaw is now installed and configured. You can start the service
          above or run <code style={{ background: '#c6f6d5', padding: '2px 6px', borderRadius: '4px' }}>openclaw start</code> from
          your terminal.
        </p>
      </div>
    </div>
  );
}
