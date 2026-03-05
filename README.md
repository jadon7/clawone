# OpenClaw Installer

A visual installer for OpenClaw built with Electron, React, and TypeScript.

## Features

- Environment detection (Node.js, npm, Git)
- One-click OpenClaw installation
- Configuration wizard with 4 steps
- Service management dashboard
- Real-time installation logs

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

1. **Step 1**: Select AI model provider (Anthropic, OpenAI, Ollama, etc.)
2. **Step 2**: Enter API credentials
3. **Step 3**: Configure workspace directory
4. **Step 4**: Select messaging channels (optional)

## Tech Stack

- Electron 28+
- React 18+
- TypeScript 5+
- Vite (build tool)
- electron-builder (packaging)

## License

MIT
