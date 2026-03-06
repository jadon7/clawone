# ClawOne

One-click installer for OpenClaw. Built with Electron, React, and TypeScript.

## Features

- 🔍 Environment detection (Node.js ≥22, npm, Git)
- ⚡ One-click OpenClaw installation
- 🧙 Configuration wizard with 4 steps
- 🎛️ Service management dashboard
- 📜 Real-time installation logs
- 🔄 Auto-update functionality (GitHub Releases)
- 🔌 Plugin management system
- 🌐 Multi-language support (English & Chinese)

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
- electron-updater

## Auto-Update

ClawOne includes automatic update functionality powered by electron-updater:

- **Automatic checks**: The app checks for updates on startup
- **Manual checks**: Click "Check for Updates" in the Dashboard
- **Download control**: Updates are downloaded only when you approve
- **Install control**: Choose when to restart and install updates
- **GitHub Releases**: Updates are distributed via GitHub Releases

### For Developers

To publish a new release with auto-update support:

```bash
# 1. Update version in package.json
npm version patch  # or minor, major

# 2. Build and publish to GitHub Releases
npm run publish

# Note: Requires GH_TOKEN environment variable with repo access
export GH_TOKEN=your_github_token
npm run publish
```

## Plugin Management

ClawOne includes a powerful plugin management system:

- **Plugin Marketplace**: Browse and install plugins from the Plugin Manager
- **Categories**: Messaging, Integration, and Utility plugins
- **One-Click Install**: Install plugins via npm with a single click
- **Enable/Disable**: Toggle plugins without uninstalling
- **Configuration Storage**: Plugin settings stored in localStorage

### Available Plugins

**Messaging:**
- WhatsApp - Connect to WhatsApp for messaging automation
- Telegram - Integrate with Telegram Bot API
- Discord - Connect to Discord servers and channels
- Slack - Integrate with Slack workspaces
- Email - Send and receive emails

**Integration:**
- GitHub - Automate GitHub workflows and issues

**Utility:**
- Scheduler - Schedule tasks and reminders
- Web Scraper - Extract data from websites

### Managing Plugins

1. Open ClawOne Dashboard
2. Click "🔌 Plugin Manager"
3. Browse plugins by category
4. Click "Install" to add a plugin
5. Toggle the checkbox to enable/disable
6. Click "Uninstall" to remove a plugin

## Platform Support

ClawOne supports the following platforms:
- ✅ Windows 10+ (64-bit)
- ✅ macOS 10.13+ (Intel & Apple Silicon)
- ✅ Linux (Ubuntu 18.04+, Debian 10+, Fedora 32+)

## Roadmap

See [Issues](../../issues) for planned features and improvements.

## License

MIT
