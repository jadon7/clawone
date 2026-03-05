import { useState, useEffect } from 'react';

interface EnvironmentProps {
  onNext: () => void;
}

interface CheckResult {
  installed: boolean;
  version: string | null;
  valid?: boolean;
}

export default function Environment({ onNext }: EnvironmentProps) {
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
          <span className="status-badge status-warning">Checking...</span>
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
              ? '✓ Installed'
              : '⚠ Version too old'
            : '✗ Not found'}
        </span>
      </div>
    );
  };

  return (
    <div className="page">
      <h1>Environment Check</h1>
      <p>
        Checking your system for required dependencies. Please ensure all items
        are installed before continuing.
      </p>

      <div style={{ marginBottom: '32px' }}>
        {renderCheckItem('Node.js (≥22)', nodeCheck)}
        {renderCheckItem('npm', npmCheck)}
        {renderCheckItem('Git', gitCheck)}
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
          <strong style={{ color: '#c53030' }}>Installation Required</strong>
          <p style={{ color: '#742a2a', marginTop: '8px', marginBottom: '0' }}>
            Please install the missing dependencies:
            <br />
            {!nodeCheck?.installed && '• Node.js: https://nodejs.org/'}
            {nodeCheck?.installed && !nodeCheck?.valid && '• Node.js ≥22 required'}
            <br />
            {!gitCheck?.installed && '• Git: https://git-scm.com/'}
          </p>
        </div>
      )}

      <div className="button-group">
        <button className="button button-secondary" onClick={checkEnvironment}>
          Recheck
        </button>
        <button
          className="button"
          onClick={onNext}
          disabled={!allChecksPass()}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
