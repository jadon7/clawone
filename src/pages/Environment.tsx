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

  useEffect(() => {
    checkEnvironment();
  }, []);

  const checkEnvironment = async () => {
    setChecking(true);

    const node = await window.electronAPI.checkNode();
    setNodeCheck(node);

    const npm = await window.electronAPI.checkPackageManager('npm');
    setNpmCheck(npm);

    const git = await window.electronAPI.checkGit();
    setGitCheck(git);

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

      {!checking && !allChecksPass() && (
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
        <button className="button button-secondary" onClick={checkEnvironment}>
          {t('environment.recheck')}
        </button>
        <button
          className="button"
          onClick={onNext}
          disabled={!allChecksPass()}
        >
          {t('environment.continue')}
        </button>
      </div>
    </div>
  );
}
