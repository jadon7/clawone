import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { OpenClawConfig } from '../types';

interface DashboardProps {
  config: OpenClawConfig;
}

export default function Dashboard({ config }: DashboardProps) {
  const { t } = useTranslation();
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
    setLogs([t('dashboard.starting')]);
    try {
      await window.electronAPI.startOpenClaw();
      setServiceRunning(true);
      setLogs(prev => [...prev, t('dashboard.startSuccess')]);
    } catch (error) {
      setLogs(prev => [...prev, `Error: ${(error as Error).message}`]);
    }
  };

  const stopService = async () => {
    try {
      await window.electronAPI.stopOpenClaw();
      setServiceRunning(false);
      setLogs(prev => [...prev, t('dashboard.stopSuccess')]);
    } catch (error) {
      setLogs(prev => [...prev, `Error: ${(error as Error).message}`]);
    }
  };

  return (
    <div className="page">
      <h1>{t('dashboard.title')}</h1>
      <p>{t('dashboard.description')}</p>

      <div className="dashboard-grid">
        <div className="dashboard-card">
          <h3>{t('dashboard.serviceStatus')}</h3>
          <div className="service-status">
            <div className={`status-indicator ${serviceRunning ? 'status-running' : 'status-stopped'}`}></div>
            <span>{serviceRunning ? t('dashboard.running') : t('dashboard.stopped')}</span>
          </div>
          <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
            {!serviceRunning ? (
              <button className="button" onClick={startService}>
                {t('dashboard.startService')}
              </button>
            ) : (
              <button className="button button-secondary" onClick={stopService}>
                {t('dashboard.stopService')}
              </button>
            )}
            <button
              className="button button-secondary"
              onClick={checkStatus}
              disabled={checking}
            >
              {t('dashboard.refresh')}
            </button>
          </div>
        </div>

        <div className="dashboard-card">
          <h3>{t('dashboard.configuration')}</h3>
          <div style={{ fontSize: '14px', color: '#4a5568' }}>
            <p><strong>{t('dashboard.provider')}:</strong> {config.ai.provider}</p>
            <p><strong>{t('dashboard.workspace')}:</strong> {config.workspace}</p>
            <p>
              <strong>{t('dashboard.channels')}:</strong>{' '}
              {Object.entries(config.channels || {})
                .filter(([_, enabled]) => enabled)
                .map(([name]) => name)
                .join(', ') || t('dashboard.none')}
            </p>
          </div>
        </div>
      </div>

      <div className="dashboard-card" style={{ marginBottom: '24px' }}>
        <h3>{t('dashboard.serviceLogs')}</h3>
        <div className="log-container" style={{ maxHeight: '200px' }}>
          {logs.length === 0 ? (
            <div style={{ color: '#718096' }}>{t('dashboard.noLogs')}</div>
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
        <strong style={{ color: '#22543d' }}>{t('dashboard.setupComplete')}</strong>
        <p style={{ color: '#276749', marginTop: '8px', marginBottom: '0' }}>
          {t('dashboard.setupCompleteInfo')} <code style={{ background: '#c6f6d5', padding: '2px 6px', borderRadius: '4px' }}>openclaw start</code> {t('dashboard.fromTerminal')}
        </p>
      </div>
    </div>
  );
}
