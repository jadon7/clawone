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

### Platform-Specific Instructions

**Windows:**
- Download `ClawOne-Setup-{version}.exe` (installer) or `ClawOne-{version}.exe` (portable)
- Run the installer or portable executable
- Follow the setup wizard

**macOS:**
- Download `ClawOne-{version}.dmg` or `ClawOne-{version}-mac.zip`
- Open the DMG and drag ClawOne to Applications, or extract the ZIP
- Launch ClawOne from Applications

**Linux:**
- Download `ClawOne-{version}.AppImage` or `ClawOne_{version}_amd64.deb`
- For AppImage: `chmod +x ClawOne-{version}.AppImage && ./ClawOne-{version}.AppImage`
- For DEB: `sudo dpkg -i ClawOne_{version}_amd64.deb`

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

### Platform-Specific Requirements

**Windows:**
- Windows 10 or later (64-bit)
- Administrator privileges for global npm package installation

**macOS:**
- macOS 10.13 (High Sierra) or later

**Linux:**
- Ubuntu 18.04+ / Debian 10+ / Fedora 32+ or equivalent
- GLIBC 2.28 or later

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

## Platform Support

ClawOne supports the following platforms:
- ✅ Windows 10+ (64-bit)
- ✅ macOS 10.13+ (Intel & Apple Silicon)
- ✅ Linux (Ubuntu 18.04+, Debian 10+, Fedora 32+)

## Roadmap

See [Issues](../../issues) for planned features and improvements.

## License

MIT
