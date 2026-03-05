import { useState } from 'react';
import { Page, OpenClawConfig } from './types';
import Welcome from './pages/Welcome';
import Environment from './pages/Environment';
import Install from './pages/Install';
import ConfigStep1 from './pages/ConfigStep1';
import ConfigStep2 from './pages/ConfigStep2';
import ConfigStep3 from './pages/ConfigStep3';
import ConfigStep4 from './pages/ConfigStep4';
import Dashboard from './pages/Dashboard';
import './App.css';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('welcome');
  const [config, setConfig] = useState<Partial<OpenClawConfig>>({
    workspace: '~/.openclaw/workspace'
  });

  const updateConfig = (updates: Partial<OpenClawConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'welcome':
        return <Welcome onNext={() => setCurrentPage('environment')} />;
      case 'environment':
        return <Environment onNext={() => setCurrentPage('install')} />;
      case 'install':
        return <Install onNext={() => setCurrentPage('config-step1')} />;
      case 'config-step1':
        return (
          <ConfigStep1
            config={config}
            updateConfig={updateConfig}
            onNext={() => setCurrentPage('config-step2')}
          />
        );
      case 'config-step2':
        return (
          <ConfigStep2
            config={config}
            updateConfig={updateConfig}
            onNext={() => setCurrentPage('config-step3')}
            onBack={() => setCurrentPage('config-step1')}
          />
        );
      case 'config-step3':
        return (
          <ConfigStep3
            config={config}
            updateConfig={updateConfig}
            onNext={() => setCurrentPage('config-step4')}
            onBack={() => setCurrentPage('config-step2')}
          />
        );
      case 'config-step4':
        return (
          <ConfigStep4
            config={config}
            updateConfig={updateConfig}
            onNext={() => setCurrentPage('dashboard')}
            onBack={() => setCurrentPage('config-step3')}
          />
        );
      case 'dashboard':
        return <Dashboard config={config as OpenClawConfig} />;
      default:
        return <Welcome onNext={() => setCurrentPage('environment')} />;
    }
  };

  return (
    <div className="app">
      {renderPage()}
    </div>
  );
}

export default App;
