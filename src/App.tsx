import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Page, OpenClawConfig } from './types';
import Welcome from './pages/Welcome';
import Environment from './pages/Environment';
import Install from './pages/Install';
import ConfigStep1 from './pages/ConfigStep1';
import ConfigStep2 from './pages/ConfigStep2';
import ConfigStep3 from './pages/ConfigStep3';
import ConfigStep4 from './pages/ConfigStep4';
import Dashboard from './pages/Dashboard';
import PluginManager from './pages/PluginManager';
import { getEnabledChannels } from './channelCatalog';
import './App.css';

const SETUP_PAGES: Page[] = [
  'welcome',
  'environment',
  'install',
  'config-step1',
  'config-step2',
  'config-step3',
  'config-step4',
  'dashboard',
];

function App() {
  const { i18n, t } = useTranslation();
  const [currentPage, setCurrentPage] = useState<Page>('welcome');
  const [availablePages, setAvailablePages] = useState<Page[]>(['welcome']);
  const [config, setConfig] = useState<Partial<OpenClawConfig>>({
    workspace: '~/.openclaw/workspace'
  });

  useEffect(() => {
    window.electronAPI.readConfig().then((savedConfig) => {
      if (!savedConfig) return;
      setConfig(savedConfig);
      setAvailablePages([...SETUP_PAGES, 'plugin-manager']);
      setCurrentPage('dashboard');
    }).catch(() => undefined);
  }, []);

  const unlockPage = (page: Page) => {
    setAvailablePages((prev) => {
      const next = new Set(prev);
      if (SETUP_PAGES.includes(page)) {
        const unlockIndex = SETUP_PAGES.indexOf(page);
        for (let index = 0; index <= unlockIndex; index += 1) {
          next.add(SETUP_PAGES[index]);
        }
      } else {
        next.add(page);
      }
      return Array.from(next);
    });
  };

  const navigateTo = (page: Page) => {
    unlockPage(page);
    setCurrentPage(page);
  };

  const updateConfig = (updates: Partial<OpenClawConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'zh' : 'en';
    i18n.changeLanguage(newLang);
    localStorage.setItem('language', newLang);
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'welcome':
        return <Welcome onNext={() => navigateTo('environment')} />;
      case 'environment':
        return <Environment onNext={() => navigateTo('install')} />;
      case 'install':
        return <Install onNext={() => navigateTo('config-step1')} />;
      case 'config-step1':
        return (
          <ConfigStep1
            config={config}
            updateConfig={updateConfig}
            onNext={() => navigateTo('config-step2')}
          />
        );
      case 'config-step2':
        return (
          <ConfigStep2
            config={config}
            updateConfig={updateConfig}
            onNext={() => navigateTo('config-step3')}
            onBack={() => navigateTo('config-step1')}
          />
        );
      case 'config-step3':
        return (
          <ConfigStep3
            config={config}
            updateConfig={updateConfig}
            onNext={() => navigateTo('config-step4')}
            onBack={() => navigateTo('config-step2')}
          />
        );
      case 'config-step4':
        return (
          <ConfigStep4
            config={config}
            updateConfig={updateConfig}
            onNext={() => navigateTo('dashboard')}
            onBack={() => navigateTo('config-step3')}
          />
        );
      case 'dashboard':
        return <Dashboard config={config as OpenClawConfig} onNavigate={navigateTo} />;
      case 'plugin-manager':
        return <PluginManager onBack={() => navigateTo('dashboard')} />;
      default:
        return <Welcome onNext={() => navigateTo('environment')} />;
    }
  };

  const navigationItems: Array<{ page: Page; label: string; caption: string }> = [
    { page: 'welcome', label: t('navigation.overview'), caption: t('navigation.overviewCaption') },
    { page: 'environment', label: t('navigation.environment'), caption: t('navigation.environmentCaption') },
    { page: 'install', label: t('navigation.install'), caption: t('navigation.installCaption') },
    { page: 'config-step1', label: t('navigation.ai'), caption: t('navigation.aiCaption') },
    { page: 'config-step2', label: t('navigation.credentials'), caption: t('navigation.credentialsCaption') },
    { page: 'config-step3', label: t('navigation.workspace'), caption: t('navigation.workspaceCaption') },
    { page: 'config-step4', label: t('navigation.channels'), caption: t('navigation.channelsCaption') },
    { page: 'dashboard', label: t('navigation.dashboard'), caption: t('navigation.dashboardCaption') },
    { page: 'plugin-manager', label: t('navigation.plugins'), caption: t('navigation.pluginsCaption') },
  ];

  const enabledChannelCount = getEnabledChannels(config.channels).length;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-kicker">ClawOne</div>
          <h1>{t('navigation.shellTitle')}</h1>
          <p>{t('navigation.shellDescription')}</p>
        </div>

        <div className="sidebar-status">
          <span>{t('navigation.providerStatus')}</span>
          <strong>{config.ai?.provider || t('navigation.pending')}</strong>
        </div>
        <div className="sidebar-status">
          <span>{t('navigation.channelStatus')}</span>
          <strong>{enabledChannelCount > 0 ? `${enabledChannelCount}` : t('navigation.pending')}</strong>
        </div>

        <nav className="sidebar-nav">
          {navigationItems.map((item, index) => {
            const isActive = currentPage === item.page;
            const isUnlocked = availablePages.includes(item.page);
            return (
              <button
                key={item.page}
                className={`sidebar-link ${isActive ? 'active' : ''}`}
                onClick={() => navigateTo(item.page)}
                disabled={!isUnlocked}
              >
                <span className="sidebar-link-index">{String(index + 1).padStart(2, '0')}</span>
                <span className="sidebar-link-copy">
                  <strong>{item.label}</strong>
                  <small>{item.caption}</small>
                </span>
              </button>
            );
          })}
        </nav>

        <button
          onClick={toggleLanguage}
          className="language-toggle"
          title={i18n.language === 'en' ? 'Switch to Chinese' : '切换到英文'}
        >
          <span className="language-text">{i18n.language === 'en' ? '中文' : 'English'}</span>
        </button>
      </aside>

      <main className="content-shell">
        <div className="content-header">
          <div>
            <span className="content-kicker">{t('navigation.currentStage')}</span>
            <h2>{navigationItems.find((item) => item.page === currentPage)?.label}</h2>
          </div>
          <div className="content-meta">
            <span>{t('navigation.workspaceStatus')}</span>
            <strong>{config.workspace || '~/.openclaw/workspace'}</strong>
          </div>
        </div>
        <div className="content-body">{renderPage()}</div>
      </main>
    </div>
  );
}

export default App;
