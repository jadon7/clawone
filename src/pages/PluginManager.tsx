import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plugin } from '../types';

interface PluginManagerProps {
  onBack: () => void;
}

const AVAILABLE_PLUGINS: Omit<Plugin, 'installed' | 'enabled'>[] = [
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    description: 'Connect to WhatsApp for messaging automation',
    icon: '💬',
    category: 'messaging',
    packageName: '@openclaw/plugin-whatsapp'
  },
  {
    id: 'telegram',
    name: 'Telegram',
    description: 'Integrate with Telegram Bot API',
    icon: '✈️',
    category: 'messaging',
    packageName: '@openclaw/plugin-telegram'
  },
  {
    id: 'discord',
    name: 'Discord',
    description: 'Connect to Discord servers and channels',
    icon: '🎮',
    category: 'messaging',
    packageName: '@openclaw/plugin-discord'
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'Integrate with Slack workspaces',
    icon: '💼',
    category: 'messaging',
    packageName: '@openclaw/plugin-slack'
  },
  {
    id: 'github',
    name: 'GitHub',
    description: 'Automate GitHub workflows and issues',
    icon: '🐙',
    category: 'integration',
    packageName: '@openclaw/plugin-github'
  },
  {
    id: 'email',
    name: 'Email',
    description: 'Send and receive emails',
    icon: '📧',
    category: 'messaging',
    packageName: '@openclaw/plugin-email'
  },
  {
    id: 'scheduler',
    name: 'Scheduler',
    description: 'Schedule tasks and reminders',
    icon: '⏰',
    category: 'utility',
    packageName: '@openclaw/plugin-scheduler'
  },
  {
    id: 'web-scraper',
    name: 'Web Scraper',
    description: 'Extract data from websites',
    icon: '🕷️',
    category: 'utility',
    packageName: '@openclaw/plugin-web-scraper'
  }
];

export default function PluginManager({ onBack }: PluginManagerProps) {
  const { t } = useTranslation();
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [loading, setLoading] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [filter, setFilter] = useState<'all' | 'messaging' | 'integration' | 'utility'>('all');

  useEffect(() => {
    loadPlugins();

    window.electronAPI.onPluginLog((log: string) => {
      setLogs(prev => [...prev, log]);
    });
  }, []);

  const loadPlugins = async () => {
    try {
      const installed = await window.electronAPI.getInstalledPlugins();

      const pluginConfig = JSON.parse(localStorage.getItem('pluginConfig') || '{}');

      const pluginList: Plugin[] = AVAILABLE_PLUGINS.map(p => ({
        ...p,
        installed: installed.includes(p.id),
        enabled: pluginConfig[p.id]?.enabled || false
      }));

      setPlugins(pluginList);
    } catch (error) {
      console.error('Failed to load plugins:', error);
    }
  };

  const installPlugin = async (plugin: Plugin) => {
    setLoading(plugin.id);
    setLogs([`Installing ${plugin.name}...`]);

    try {
      const result = await window.electronAPI.installPlugin(plugin.id);

      if (result.success) {
        setLogs(prev => [...prev, `${plugin.name} installed successfully!`]);
        await loadPlugins();
      } else {
        setLogs(prev => [...prev, `Error: ${result.error}`]);
      }
    } catch (error) {
      setLogs(prev => [...prev, `Error: ${(error as Error).message}`]);
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
        setLogs(prev => [...prev, `${plugin.name} uninstalled successfully!`]);
        await loadPlugins();
      } else {
        setLogs(prev => [...prev, `Error: ${result.error}`]);
      }
    } catch (error) {
      setLogs(prev => [...prev, `Error: ${(error as Error).message}`]);
    } finally {
      setLoading(null);
    }
  };

  const togglePlugin = (plugin: Plugin) => {
    const pluginConfig = JSON.parse(localStorage.getItem('pluginConfig') || '{}');
    pluginConfig[plugin.id] = {
      ...pluginConfig[plugin.id],
      enabled: !plugin.enabled
    };
    localStorage.setItem('pluginConfig', JSON.stringify(pluginConfig));

    setPlugins(prev =>
      prev.map(p =>
        p.id === plugin.id ? { ...p, enabled: !p.enabled } : p
      )
    );

    setLogs(prev => [...prev, `${plugin.name} ${!plugin.enabled ? 'enabled' : 'disabled'}`]);
  };

  const filteredPlugins = plugins.filter(p =>
    filter === 'all' ? true : p.category === filter
  );

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1>🔌 {t('pluginManager.title')}</h1>
        <button className="button button-secondary" onClick={onBack}>
          {t('pluginManager.backToDashboard')}
        </button>
      </div>

      <p style={{ marginBottom: '24px' }}>
        {t('pluginManager.description')}
      </p>

      {/* Filter tabs */}
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

      {/* Plugin grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        {filteredPlugins.map(plugin => (
          <div
            key={plugin.id}
            className="dashboard-card"
            style={{
              padding: '20px',
              position: 'relative',
              opacity: loading === plugin.id ? 0.6 : 1
            }}
          >
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>
              {plugin.icon}
            </div>
            <h3 style={{ marginBottom: '8px', fontSize: '18px' }}>
              {plugin.name}
            </h3>
            <p style={{ fontSize: '14px', color: '#4a5568', marginBottom: '16px', minHeight: '40px' }}>
              {plugin.description}
            </p>

            {plugin.installed && (
              <div style={{ marginBottom: '12px' }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}>
                  <input
                    type="checkbox"
                    checked={plugin.enabled}
                    onChange={() => togglePlugin(plugin)}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <span style={{ color: plugin.enabled ? '#48bb78' : '#718096' }}>
                    {plugin.enabled ? t('pluginManager.enabled') : t('pluginManager.disabled')}
                  </span>
                </label>
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px' }}>
              {!plugin.installed ? (
                <button
                  className="button"
                  onClick={() => installPlugin(plugin)}
                  disabled={loading === plugin.id}
                  style={{ width: '100%', padding: '8px' }}
                >
                  {loading === plugin.id ? t('pluginManager.installing') : t('pluginManager.install')}
                </button>
              ) : (
                <button
                  className="button button-secondary"
                  onClick={() => uninstallPlugin(plugin)}
                  disabled={loading === plugin.id}
                  style={{ width: '100%', padding: '8px' }}
                >
                  {loading === plugin.id ? t('pluginManager.uninstalling') : t('pluginManager.uninstall')}
                </button>
              )}
            </div>

            {plugin.installed && (
              <div style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                background: '#48bb78',
                color: 'white',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: '600'
              }}>
                {t('pluginManager.installed')}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Installation logs */}
      {logs.length > 0 && (
        <div className="dashboard-card" style={{ marginBottom: '24px' }}>
          <h3>{t('pluginManager.installationLogs')}</h3>
          <div className="log-container" style={{ maxHeight: '150px' }}>
            {logs.map((log, index) => (
              <div key={index} className="log-line">
                {log}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
