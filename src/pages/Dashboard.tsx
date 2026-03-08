import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { OpenClawConfig, Page } from '../types';

interface DashboardProps {
  config: OpenClawConfig;
  onNavigate: (page: Page) => void;
}

export default function Dashboard({ config, onNavigate }: DashboardProps) {
  const { t } = useTranslation();
  const [serviceRunning, setServiceRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [checking, setChecking] = useState(false);

  // Update state
  const [updateChecking, setUpdateChecking] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<any>(null);
  const [updateDownloading, setUpdateDownloading] = useState(false);
  const [updateDownloaded, setUpdateDownloaded] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [updateError, setUpdateError] = useState<string | null>(null);

  useEffect(() => {
    checkStatus();

    window.electronAPI.onServiceLog((log: string) => {
      setLogs(prev => [...prev, log]);
    });

    // Setup update listeners
    window.electronAPI.onUpdateChecking(() => {
      setUpdateChecking(true);
      setUpdateError(null);
    });

    window.electronAPI.onUpdateAvailable((info: any) => {
      setUpdateChecking(false);
      setUpdateAvailable(true);
      setUpdateInfo(info);
    });

    window.electronAPI.onUpdateNotAvailable(() => {
      setUpdateChecking(false);
      setUpdateAvailable(false);
    });

    window.electronAPI.onUpdateError((error: string) => {
      setUpdateChecking(false);
      setUpdateDownloading(false);
      setUpdateError(error);
    });

    window.electronAPI.onUpdateDownloadProgress((progress: any) => {
      setDownloadProgress(Math.round(progress.percent));
    });

    window.electronAPI.onUpdateDownloaded((info: any) => {
      setUpdateDownloading(false);
      setUpdateDownloaded(true);
      setUpdateInfo(info);
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

  const checkForUpdates = async () => {
    setUpdateChecking(true);
    setUpdateError(null);
    try {
      await window.electronAPI.checkForUpdates();
    } catch (error) {
      setUpdateError((error as Error).message);
      setUpdateChecking(false);
    }
  };

  const downloadUpdate = async () => {
    setUpdateDownloading(true);
    setUpdateError(null);
    try {
      await window.electronAPI.downloadUpdate();
    } catch (error) {
      setUpdateError((error as Error).message);
      setUpdateDownloading(false);
    }
  };

  const installUpdate = () => {
    window.electronAPI.installUpdate();
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

      {/* Quick actions */}
      <div style={{ marginBottom: '24px', display: 'flex', gap: '12px', justifyContent: 'center' }}>
        <button
          className="button"
          onClick={() => onNavigate('plugin-manager')}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          🔌 Plugin Manager
        </button>
        <button
          className="button button-secondary"
          onClick={() => alert(t('dashboard.downloadOnlineConfigComingSoon'))}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          ☁️ {t('dashboard.downloadOnlineConfig')}
        </button>
        <button
          className="button button-secondary"
          onClick={checkForUpdates}
          disabled={updateChecking}
        >
          {updateChecking ? 'Checking for updates...' : '🔄 Check for Updates'}
        </button>
      </div>

      {/* Update notification card */}
      {(updateAvailable || updateDownloaded || updateError) && (
        <div className="dashboard-card" style={{ marginBottom: '24px' }}>
          <h3>🔄 Software Update</h3>
          {updateError && (
            <div style={{
              background: '#fff5f5',
              border: '2px solid #fc8181',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '12px'
            }}>
              <strong style={{ color: '#c53030' }}>Update Error</strong>
              <p style={{ color: '#742a2a', marginTop: '4px', marginBottom: '0', fontSize: '14px' }}>
                {updateError}
              </p>
            </div>
          )}

          {updateAvailable && !updateDownloaded && (
            <div style={{
              background: '#ebf8ff',
              border: '2px solid #4299e1',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '12px'
            }}>
              <strong style={{ color: '#2c5282' }}>New Version Available</strong>
              <p style={{ color: '#2c5282', marginTop: '4px', marginBottom: '8px', fontSize: '14px' }}>
                Version {updateInfo?.version} is available for download.
              </p>
              {updateDownloading ? (
                <div>
                  <div style={{ marginBottom: '8px', fontSize: '14px', color: '#2c5282' }}>
                    Downloading: {downloadProgress}%
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${downloadProgress}%` }}></div>
                  </div>
                </div>
              ) : (
                <button className="button" onClick={downloadUpdate}>
                  Download Update
                </button>
              )}
            </div>
          )}

          {updateDownloaded && (
            <div style={{
              background: '#f0fff4',
              border: '2px solid #48bb78',
              borderRadius: '8px',
              padding: '12px'
            }}>
              <strong style={{ color: '#22543d' }}>Update Ready</strong>
              <p style={{ color: '#276749', marginTop: '4px', marginBottom: '8px', fontSize: '14px' }}>
                Version {updateInfo?.version} has been downloaded and is ready to install.
              </p>
              <button className="button" onClick={installUpdate}>
                Restart & Install
              </button>
            </div>
          )}
        </div>
      )}

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
