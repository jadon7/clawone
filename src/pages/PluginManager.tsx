import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plugin } from '../types';

interface PluginManagerProps {
  onBack: () => void;
}

export default function PluginManager({ onBack }: PluginManagerProps) {
  const { t } = useTranslation();
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [loading, setLoading] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [filter, setFilter] = useState<'all' | 'messaging' | 'integration' | 'utility'>('all');
  const [installSpec, setInstallSpec] = useState('');

  useEffect(() => {
    loadPlugins();

    window.electronAPI.onPluginLog((log: string) => {
      setLogs((prev) => [...prev, log]);
    });
  }, []);

  const loadPlugins = async () => {
    try {
      const officialPlugins = await window.electronAPI.getPlugins();
      setPlugins(officialPlugins);
    } catch (error) {
      setLogs((prev) => [...prev, `Error: ${(error as Error).message}`]);
    }
  };

  const installPlugin = async () => {
    if (!installSpec.trim()) return;
    setLoading('install');
    setLogs([`Installing ${installSpec.trim()}...`]);

    try {
      const result = await window.electronAPI.installPlugin(installSpec.trim());
      if (result.success) {
        setInstallSpec('');
        await loadPlugins();
      } else {
        setLogs((prev) => [...prev, `Error: ${result.error}`]);
      }
    } catch (error) {
      setLogs((prev) => [...prev, `Error: ${(error as Error).message}`]);
    } finally {
      setLoading(null);
    }
  };

  const uninstallPlugin = async (plugin: Plugin) => {
    if (!confirm(`${t('pluginManager.confirmUninstall')} ${plugin.name}?`)) {
      return;
    }

    setLoading(plugin.id);
    setLogs([`Uninstalling ${plugin.name}...`]);

    try {
      const result = await window.electronAPI.uninstallPlugin(plugin.id);
      if (result.success) {
        await loadPlugins();
      } else {
        setLogs((prev) => [...prev, `Error: ${result.error}`]);
      }
    } catch (error) {
      setLogs((prev) => [...prev, `Error: ${(error as Error).message}`]);
    } finally {
      setLoading(null);
    }
  };

  const togglePlugin = async (plugin: Plugin) => {
    setLoading(plugin.id);
    setLogs([`${plugin.enabled ? 'Disabling' : 'Enabling'} ${plugin.name}...`]);

    try {
      const result = await window.electronAPI.setPluginEnabled(plugin.id, !plugin.enabled);
      if (result.success) {
        await loadPlugins();
      } else {
        setLogs((prev) => [...prev, `Error: ${result.error}`]);
      }
    } catch (error) {
      setLogs((prev) => [...prev, `Error: ${(error as Error).message}`]);
    } finally {
      setLoading(null);
    }
  };

  const filteredPlugins = useMemo(
    () => plugins.filter((plugin) => (filter === 'all' ? true : plugin.category === filter)),
    [filter, plugins],
  );

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1>🔌 {t('pluginManager.title')}</h1>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="button button-secondary" onClick={loadPlugins}>
            {t('pluginManager.refresh')}
          </button>
          <button className="button button-secondary" onClick={onBack}>
            {t('pluginManager.backToDashboard')}
          </button>
        </div>
      </div>

      <p style={{ marginBottom: '24px' }}>{t('pluginManager.description')}</p>

      <div
        className="dashboard-card"
        style={{ padding: '20px', marginBottom: '24px' }}
      >
        <div className="form-group" style={{ marginBottom: '12px' }}>
          <label className="form-label">{t('pluginManager.installSpecLabel')}</label>
          <input
            type="text"
            className="form-input"
            value={installSpec}
            onChange={(event) => setInstallSpec(event.target.value)}
            placeholder={t('pluginManager.installSpecPlaceholder')}
          />
        </div>
        <button
          className="button"
          onClick={installPlugin}
          disabled={!installSpec.trim() || loading === 'install'}
        >
          {loading === 'install' ? t('pluginManager.installing') : t('pluginManager.installBySpec')}
        </button>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
        <button
          className={`button ${filter === 'all' ? '' : 'button-secondary'}`}
          onClick={() => setFilter('all')}
          style={{ padding: '8px 16px', fontSize: '14px' }}
        >
          {t('pluginManager.all')}
        </button>
        <button
          className={`button ${filter === 'messaging' ? '' : 'button-secondary'}`}
          onClick={() => setFilter('messaging')}
          style={{ padding: '8px 16px', fontSize: '14px' }}
        >
          {t('pluginManager.messaging')}
        </button>
        <button
          className={`button ${filter === 'integration' ? '' : 'button-secondary'}`}
          onClick={() => setFilter('integration')}
          style={{ padding: '8px 16px', fontSize: '14px' }}
        >
          {t('pluginManager.integration')}
        </button>
        <button
          className={`button ${filter === 'utility' ? '' : 'button-secondary'}`}
          onClick={() => setFilter('utility')}
          style={{ padding: '8px 16px', fontSize: '14px' }}
        >
          {t('pluginManager.utility')}
        </button>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '16px',
          marginBottom: '24px'
        }}
      >
        {filteredPlugins.map((plugin) => (
          <div
            key={plugin.id}
            className="dashboard-card"
            style={{
              padding: '20px',
              position: 'relative',
              opacity: loading === plugin.id ? 0.6 : 1
            }}
          >
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>{plugin.icon}</div>
            <h3 style={{ marginBottom: '8px', fontSize: '18px' }}>{plugin.name}</h3>
            <p style={{ fontSize: '14px', color: '#4a5568', marginBottom: '12px', minHeight: '40px' }}>
              {plugin.description || plugin.id}
            </p>

            <div style={{ fontSize: '13px', color: '#4a5568', marginBottom: '16px' }}>
              <p style={{ margin: '0 0 4px 0' }}>
                <strong>{t('pluginManager.origin')}:</strong> {plugin.origin || t('pluginManager.unknown')}
              </p>
              <p style={{ margin: '0 0 4px 0' }}>
                <strong>{t('pluginManager.status')}:</strong> {plugin.status || t('pluginManager.unknown')}
              </p>
              {plugin.version && (
                <p style={{ margin: 0 }}>
                  <strong>{t('pluginManager.version')}:</strong> {plugin.version}
                </p>
              )}
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                className={`button ${plugin.enabled ? 'button-secondary' : ''}`}
                onClick={() => togglePlugin(plugin)}
                disabled={loading === plugin.id}
                style={{ flex: 1 }}
              >
                {plugin.enabled ? t('pluginManager.disable') : t('pluginManager.enable')}
              </button>
              {plugin.origin !== 'bundled' && (
                <button
                  className="button button-secondary"
                  onClick={() => uninstallPlugin(plugin)}
                  disabled={loading === plugin.id}
                  style={{ flex: 1 }}
                >
                  {t('pluginManager.uninstall')}
                </button>
              )}
            </div>

            {plugin.origin === 'bundled' && (
              <div
                style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  background: '#2d3748',
                  color: 'white',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: '600'
                }}
              >
                {t('pluginManager.bundled')}
              </div>
            )}
          </div>
        ))}
      </div>

      {logs.length > 0 && (
        <div className="dashboard-card" style={{ marginBottom: '24px' }}>
          <h3>{t('pluginManager.installationLogs')}</h3>
          <div className="log-container" style={{ maxHeight: '180px' }}>
            {logs.map((log, index) => (
              <div key={`${log}-${index}`} className="log-line">
                {log}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
