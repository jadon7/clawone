interface WelcomeProps {
  onNext: () => void;
}

export default function Welcome({ onNext }: WelcomeProps) {
  return (
    <div className="page">
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '48px', marginBottom: '24px' }}>
          🦅 OpenClaw
        </h1>
        <h2 style={{ fontSize: '24px', color: '#4a5568', marginBottom: '16px' }}>
          Visual Installer
        </h2>
        <p style={{ fontSize: '18px', maxWidth: '600px', margin: '0 auto 48px' }}>
          Welcome to the OpenClaw installer. This wizard will guide you through
          setting up your AI-powered automation platform.
        </p>
        <button className="button" onClick={onNext}>
          Get Started
        </button>
      </div>
    </div>
  );
}
