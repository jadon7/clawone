# ClawOne

One-click installer for OpenClaw. Built with Electron, React, and TypeScript.

## Features

- 🔍 Environment detection (Node.js ≥22, npm, Git)
- ⚡ One-click OpenClaw installation
- 🧙 Configuration wizard with 4 steps
- 🎛️ Service management dashboard
- 📜 Real-time installation logs

## Quick Start

Download the latest release from [Releases](../../releases) and run the installer.

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run electron:dev

# Build for production
npm run electron:build
```

## Requirements

- Node.js ≥22
- npm or pnpm or bun
- Git

## Configuration Steps

1. **AI Provider**: Select your AI model (Anthropic, OpenAI, Ollama, etc.)
2. **API Key**: Enter your API credentials
3. **Workspace**: Configure workspace directory
4. **Channels**: Select messaging channels (optional)

## Tech Stack

- Electron 28+
- React 18+
- TypeScript 5+
- Vite
- electron-builder

## Roadmap

See [Issues](../../issues) for planned features and improvements.

## License

MIT
