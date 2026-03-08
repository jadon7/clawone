import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface EnvironmentProps {
  onNext: () => void;
}

interface CheckResult {
  installed: boolean;
  version: string | null;
  valid?: boolean;
  debug?: string;
}

export default function Environment({ onNext }: EnvironmentProps) {
  const { t } = useTranslation();
  const [nodeCheck, setNodeCheck] = useState<CheckResult | null>(null);
  const [npmCheck, setNpmCheck] = useState<CheckResult | null>(null);
  const [gitCheck, setGitCheck] = useState<CheckResult | null>(null);
  const [checking, setChecking] = useState(true);
  const [showDebug, setShowDebug] = useState(true); // 默认展开调试信息
  const [debugLogs, setDebugLogs] = useState<string[]>([]);

  useEffect(() => {
    checkEnvironment();
  }, []);

  const addLog = (msg: string) => {
    setDebugLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const checkEnvironment = async () => {
    setChecking(true);
    setNodeCheck(null);
    setNpmCheck(null);
    setGitCheck(null);
    setDebugLogs([]);

    addLog('Starting environment checks...');

    // Check Node.js
    try {
      addLog('Checking Node.js...');
      const node = await window.electronAPI.checkNode();
      setNodeCheck(node);
      if (node.installed) {
        addLog(`✓ Node.js found: v${node.version} (valid: ${node.valid})`);
      } else {
        addLog(`✗ Node.js not found. ${node.debug || ''}`);
      }
    } catch (err) {
      const msg = (err as Error).message;
      addLog(`✗ Node.js check error: ${msg}`);
      setNodeCheck({ installed: false, version: null, valid: false, debug: msg });
    }

    // Check npm
    try {
      addLog('Checking npm...');
      const npm = await window.electronAPI.checkPackageManager('npm');
      setNpmCheck(npm);
      if (npm.installed) {
        addLog(`✓ npm found: ${npm.version}`);
      } else {
        addLog(`✗ npm not found. ${npm.debug || ''}`);
      }
    } catch (err) {
      const msg = (err as Error).message;
      addLog(`✗ npm check error: ${msg}`);
      setNpmCheck({ installed: false, version: null, debug: msg });
    }

    // Check Git
    try {
      addLog('Checking Git...');
      const git = await window.electronAPI.checkGit();
      setGitCheck(git);
      if (git.installed) {
        addLog(`✓ Git found: ${git.version}`);
      } else {
        addLog(`✗ Git not found. ${git.debug || ''}`);
      }
    } catch (err) {
      const msg = (err as Error).message;
      addLog(`✗ Git check error: ${msg}`);
      setGitCheck({ installed: false, version: null, debug: msg });
    }

    addLog('Environment check complete.');
    setChecking(false);
  };

  const allChecksPass = () =>
    nodeCheck?.installed && nodeCheck?.valid && npmCheck?.installed && gitCheck?.installed;

  const renderCheckItem = (name: string, check: CheckResult | null) => {
    if (!check) {
      return (
        <div className="check-item">
          <div className="check-item-info">
            <div className="check-item-name">{name}</div>
          </div>
          <span className="status-badge status-warning">{t('environment.checking')}</span>
        </div>
      );
    }

    const status = check.installed
      ? check.valid !== false ? 'success' : 'warning'
      : 'error';

    return (
      <div className="check-item">
        <div className="check-item-info">
          <div>
            <div className="check-item-name">{name}</div>
            {check.version && (
              <div className="check-item-version">{check.version}</div>
            )}
            {!check.installed && check.debug && (
              <div style={{ fontSize: '12px', color: '#a0aec0', marginTop: '2px' }}>
                {check.debug}
              </div>
            )}
          </div>
        </div>
        <span className={`status-badge status-${status}`}>
          {check.installed
            ? check.valid !== false
              ? t('environment.installed')
              : t('environment.versionTooOld')
            : t('environment.notFound')}
        </span>
      </div>
    );
  };

  return (
    <div className="page">
      <h1>{t('environment.title')}</h1>
      <p>{t('environment.description')}</p>

      <div style={{ marginBottom: '32px' }}>
        {renderCheckItem(t('environment.nodeItem'), nodeCheck)}
        {renderCheckItem(t('environment.npmItem'), npmCheck)}
        {renderCheckItem(t('environment.gitItem'), gitCheck)}
      </div>

      {!checking && !allChecksPass() && (
        <div style={{
          background: '#fff5f5',
          border: '2px solid #fc8181',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '24px'
        }}>
          <strong style={{ color: '#c53030' }}>{t('environment.installationRequired')}</strong>
          <p style={{ color: '#742a2a', marginTop: '8px', marginBottom: '12px' }}>
            {t('environment.pleaseInstall')}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {(!nodeCheck?.installed || (nodeCheck?.installed && !nodeCheck?.valid)) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ color: '#742a2a', minWidth: '120px' }}>
                  {!nodeCheck?.installed ? 'Node.js (≥22)' : t('environment.nodeRequired')}
                </span>
                <button
                  onClick={() => window.electronAPI.openExternal('https://nodejs.org/')}
                  style={{
                    background: '#3182ce',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '6px 14px',
                    fontSize: '13px',
                    cursor: 'pointer',
                    fontWeight: 500
                  }}
                >
                  {t('environment.downloadNode')}
                </button>
              </div>
            )}
            {!npmCheck?.installed && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ color: '#742a2a', minWidth: '120px' }}>npm</span>
                <span style={{ color: '#742a2a', fontSize: '13px' }}>{t('environment.npmIncluded')}</span>
              </div>
            )}
            {!gitCheck?.installed && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ color: '#742a2a', minWidth: '120px' }}>Git</span>
                <button
                  onClick={() => window.electronAPI.openExternal('https://git-scm.com/downloads')}
                  style={{
                    background: '#3182ce',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '6px 14px',
                    fontSize: '13px',
                    cursor: 'pointer',
                    fontWeight: 500
                  }}
                >
                  {t('environment.downloadGit')}
                </button>
              </div>
            )}
          </div>
          <p style={{ color: '#742a2a', marginTop: '12px', marginBottom: '0', fontSize: '13px' }}>
            {t('environment.afterInstall')}
          </p>
        </div>
      )}

      {/* Debug panel */}
      <div style={{ marginBottom: '24px' }}>
        <button
          onClick={() => setShowDebug(v => !v)}
          style={{
            background: 'none',
            border: '1px solid #cbd5e0',
            borderRadius: '6px',
            padding: '6px 12px',
            fontSize: '13px',
            color: '#718096',
            cursor: 'pointer'
          }}
        >
          {showDebug ? '▲ Hide' : '▼ Show'} Debug Info
        </button>

        {showDebug && (
          <div style={{
            marginTop: '8px',
            background: '#1a202c',
            color: '#e2e8f0',
            borderRadius: '8px',
            padding: '12px',
            fontFamily: 'Monaco, Menlo, monospace',
            fontSize: '12px',
            maxHeight: '200px',
            overflowY: 'auto'
          }}>
            {debugLogs.length === 0
              ? <span style={{ color: '#718096' }}>No logs yet...</span>
              : debugLogs.map((log, i) => (
                  <div key={i} style={{
                    marginBottom: '4px',
                    color: log.includes('✓') ? '#68d391' : log.includes('✗') ? '#fc8181' : '#e2e8f0'
                  }}>
                    {log}
                  </div>
                ))
            }
          </div>
        )}
      </div>

      <div className="button-group">
        <button
          className="button button-secondary"
          onClick={checkEnvironment}
          disabled={checking}
        >
          {checking ? t('environment.checking') : t('environment.recheck')}
        </button>
        <button
          className="button"
          onClick={onNext}
          disabled={!allChecksPass() || checking}
        >
          {t('environment.continue')}
        </button>
      </div>
    </div>
  );
}
