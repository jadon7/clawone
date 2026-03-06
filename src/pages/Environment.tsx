import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface EnvironmentProps {
  onNext: () => void;
}

interface CheckResult {
  installed: boolean;
  version: string | null;
  valid?: boolean;
}

export default function Environment({ onNext }: EnvironmentProps) {
  const { t } = useTranslation();
  const [nodeCheck, setNodeCheck] = useState<CheckResult | null>(null);
  const [npmCheck, setNpmCheck] = useState<CheckResult | null>(null);
  const [gitCheck, setGitCheck] = useState<CheckResult | null>(null);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkEnvironment();
  }, []);

  const checkEnvironment = async () => {
    setChecking(true);
    setError(null);
    setNodeCheck(null);
    setNpmCheck(null);
    setGitCheck(null);

    // Check Node.js
    try {
      const node = await window.electronAPI.checkNode();
      console.log('[Environment] node result:', node);
      setNodeCheck(node);
    } catch (err) {
      console.error('[Environment] node check failed:', err);
      setNodeCheck({ installed: false, version: null, valid: false });
    }

    // Check npm
    try {
      const npm = await window.electronAPI.checkPackageManager('npm');
      console.log('[Environment] npm result:', npm);
      setNpmCheck(npm);
    } catch (err) {
      console.error('[Environment] npm check failed:', err);
      setNpmCheck({ installed: false, version: null });
    }

    // Check Git
    try {
      const git = await window.electronAPI.checkGit();
      console.log('[Environment] git result:', git);
      setGitCheck(git);
    } catch (err) {
      console.error('[Environment] git check failed:', err);
      setGitCheck({ installed: false, version: null });
    }

    setChecking(false);
  };

  const allChecksPass = () => {
    return (
      nodeCheck?.installed &&
      nodeCheck?.valid &&
      npmCheck?.installed &&
      gitCheck?.installed
    );
  };

  const renderCheckItem = (
    name: string,
    check: CheckResult | null
  ) => {
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
      ? check.valid !== false
        ? 'success'
        : 'warning'
      : 'error';

    return (
      <div className="check-item">
        <div className="check-item-info">
          <div>
            <div className="check-item-name">{name}</div>
            {check.version && (
              <div className="check-item-version">{check.version}</div>
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
      <p>
        {t('environment.description')}
      </p>

      <div style={{ marginBottom: '32px' }}>
        {renderCheckItem(t('environment.nodeItem'), nodeCheck)}
        {renderCheckItem(t('environment.npmItem'), npmCheck)}
        {renderCheckItem(t('environment.gitItem'), gitCheck)}
      </div>

      {error && (
        <div
          style={{
            background: '#fff5f5',
            border: '2px solid #fc8181',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '24px'
          }}
        >
          <strong style={{ color: '#c53030' }}>Error</strong>
          <p style={{ color: '#742a2a', marginTop: '8px', marginBottom: '0' }}>
            {error}
          </p>
        </div>
      )}

      {!checking && !error && !allChecksPass() && (
        <div
          style={{
            background: '#fff5f5',
            border: '2px solid #fc8181',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '24px'
          }}
        >
          <strong style={{ color: '#c53030' }}>{t('environment.installationRequired')}</strong>
          <p style={{ color: '#742a2a', marginTop: '8px', marginBottom: '0' }}>
            {t('environment.pleaseInstall')}
            <br />
            {!nodeCheck?.installed && t('environment.nodeUrl')}
            {nodeCheck?.installed && !nodeCheck?.valid && `• ${t('environment.nodeRequired')}`}
            <br />
            {!gitCheck?.installed && t('environment.gitUrl')}
          </p>
        </div>
      )}

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
