import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { OpenClawConfig, Page } from '../types';
import { getChannelName, getEnabledChannels } from '../channelCatalog';

interface DashboardProps {
  config: OpenClawConfig;
  onNavigate: (page: Page) => void;
}

export default function Dashboard({ config, onNavigate }: DashboardProps) {
  const { t, i18n } = useTranslation();
  const [serviceRunning, setServiceRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [checking, setChecking] = useState(false);
  const [downloadingConfig, setDownloadingConfig] = useState(false);
  const [uninstalling, setUninstalling] = useState(false);

  const [updateChecking, setUpdateChecking] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<any>(null);
  const [updateDownloading, setUpdateDownloading] = useState(false);
  const [updateDownloaded, setUpdateDownloaded] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const enabledChannels = getEnabledChannels(config.channels).map((channelId) => getChannelName(channelId, i18n.language));

  useEffect(() => {
    checkStatus();

    window.electronAPI.onServiceLog((log: string) => {
      setLogs((prev) => [...prev, log]);
    });

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
    } catch {
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
      setLogs((prev) => [...prev, t('dashboard.startSuccess')]);
    } catch (error) {
      setLogs((prev) => [...prev, `Error: ${(error as Error).message}`]);
    }
  };

  const stopService = async () => {
    try {
      await window.electronAPI.stopOpenClaw();
      setServiceRunning(false);
      setLogs((prev) => [...prev, t('dashboard.stopSuccess')]);
    } catch (error) {
      setLogs((prev) => [...prev, `Error: ${(error as Error).message}`]);
    }
  };

  const uninstallOpenClaw = async () => {
    const ok = window.confirm(t('dashboard.confirmUninstall'));
    if (!ok) return;

    setUninstalling(true);
    setLogs((prev) => [...prev, t('dashboard.uninstalling')]);
    try {
      const result = await window.electronAPI.uninstallOpenClaw();
      if (!result.success) {
        setLogs((prev) => [...prev, `Error: ${result.error || 'Uninstall failed'}`]);
        return;
      }
      setServiceRunning(false);
      setLogs((prev) => [...prev, t('dashboard.uninstallSuccess')]);
    } catch (error) {
      setLogs((prev) => [...prev, `Error: ${(error as Error).message}`]);
    } finally {
      setUninstalling(false);
    }
  };

  const downloadOnlineConfig = async () => {
    const sourceUrl = window.prompt(t('dashboard.configUrlPrompt'));
    if (!sourceUrl?.trim()) return;

    setDownloadingConfig(true);
    setLogs((prev) => [...prev, `${t('dashboard.downloadingConfig')} ${sourceUrl.trim()}`]);

    try {
      const result = await window.electronAPI.downloadOnlineConfig(sourceUrl.trim());
      if (!result.success) {
        setLogs((prev) => [...prev, `Error: ${result.error || 'Download failed'}`]);
        return;
      }
      setLogs((prev) => [...prev, t('dashboard.downloadConfigSuccess')]);
    } catch (error) {
      setLogs((prev) => [...prev, `Error: ${(error as Error).message}`]);
    } finally {
      setDownloadingConfig(false);
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
    <div className="page dashboard-page">
      <div className="dashboard-banner">
        <div>
          <h1>{t('dashboard.title')}</h1>
          <p>{t('dashboard.description')}</p>
        </div>
        <div className={`dashboard-status-pill ${serviceRunning ? 'running' : 'stopped'}`}>
          <span className="status-dot" />
          {serviceRunning ? t('dashboard.running') : t('dashboard.stopped')}
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-card service-card">
          <h3>{t('dashboard.serviceStatus')}</h3>
          <div className="service-controls">
            {!serviceRunning ? (
              <button className="button" onClick={startService}>
                {t('dashboard.startService')}
              </button>
            ) : (
              <button className="button button-secondary" onClick={stopService}>
                {t('dashboard.stopService')}
              </button>
            )}
            <button className="button button-secondary" onClick={checkStatus} disabled={checking}>
              {t('dashboard.refresh')}
            </button>
          </div>
        </div>

        <div className="dashboard-card">
          <h3>{t('dashboard.configuration')}</h3>
          <div className="config-row">
            <span>{t('dashboard.provider')}</span>
            <strong>{config.ai?.provider || t('dashboard.none')}</strong>
          </div>
          <div className="config-row">
            <span>{t('dashboard.workspace')}</span>
            <strong>{config.workspace}</strong>
          </div>
          <div className="config-row">
            <span>{t('dashboard.channels')}</span>
            <strong>{enabledChannels.join(', ') || t('dashboard.none')}</strong>
          </div>
        </div>
      </div>

      <div className="dashboard-quick-actions">
        <button className="button" onClick={() => onNavigate('plugin-manager')}>
          Plugin Manager
        </button>
        <button className="button button-secondary" onClick={downloadOnlineConfig} disabled={downloadingConfig}>
          {downloadingConfig ? t('dashboard.downloadingConfig') : t('dashboard.downloadOnlineConfig')}
        </button>
        <button className="button button-secondary" onClick={checkForUpdates} disabled={updateChecking}>
          {updateChecking ? t('dashboard.checkingUpdates') : t('dashboard.checkUpdates')}
        </button>
        <button className="button button-danger" onClick={uninstallOpenClaw} disabled={uninstalling}>
          {uninstalling ? t('dashboard.uninstalling') : t('dashboard.uninstallOpenClaw')}
        </button>
      </div>

      {(updateAvailable || updateDownloaded || updateError) && (
        <div className="dashboard-card" style={{ marginBottom: '24px' }}>
          <h3>{t('dashboard.softwareUpdate')}</h3>
          {updateError && <p style={{ color: '#8a2f26' }}>{updateError}</p>}

          {updateAvailable && !updateDownloaded && (
            <div>
              <p>{t('dashboard.newVersion')}: {updateInfo?.version}</p>
              {updateDownloading ? (
                <div>
                  <div style={{ marginBottom: '8px' }}>{t('dashboard.downloadingProgress')} {downloadProgress}%</div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${downloadProgress}%` }} />
                  </div>
                </div>
              ) : (
                <button className="button" onClick={downloadUpdate}>{t('dashboard.downloadUpdate')}</button>
              )}
            </div>
          )}

          {updateDownloaded && (
            <div>
              <p>{t('dashboard.updateReady')} {updateInfo?.version}</p>
              <button className="button" onClick={installUpdate}>{t('dashboard.restartInstall')}</button>
            </div>
          )}
        </div>
      )}

      <div className="dashboard-card" style={{ marginBottom: '24px' }}>
        <h3>{t('dashboard.serviceLogs')}</h3>
        <div className="log-container" style={{ maxHeight: '240px' }}>
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

      <div className="dashboard-tip">
        <strong>{t('dashboard.setupComplete')}</strong>
        <p>
          {t('dashboard.setupCompleteInfo')} <code>openclaw gateway start</code> {t('dashboard.fromTerminal')}
        </p>
      </div>
    </div>
  );
}
