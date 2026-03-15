# SSH Manager

A macOS desktop app for managing your `~/.ssh/config` file with a clean GUI.

Built with **Electron + React + TypeScript**.

![SSH Manager](https://img.shields.io/badge/platform-macOS-lightgrey)
![License](https://img.shields.io/badge/license-MIT-blue)

## Features

- 📋 **Host List** — browse, search, and filter all SSH hosts
- ✏️ **Host Editor** — add/edit hosts with a form (alias, hostname, user, port, identity file, ForwardAgent)
- 🔌 **Connection Test** — checks if a host is reachable
- 💻 **Open in Terminal** — launch `ssh <alias>` directly in Terminal.app or iTerm2
- 🔑 **Key Generator** — generate Ed25519 or RSA 4096 keys via `ssh-keygen`
- 🌙 **Dark / Light theme** — persisted in localStorage
- 💾 **Auto backup** — saves `~/.ssh/config.bak` before every write

## Download

Grab the latest `.dmg` from [Releases](../../releases).

## Development

```bash
npm install
npm run dev       # Electron + Vite HMR
```

## Build

```bash
npm run build     # Produces release/SSH Manager-x.x.x-universal.dmg
```

Requires macOS. Produces a universal binary (arm64 + x64).

## Security

- `contextIsolation: true`, `nodeIntegration: false`
- All Node.js operations run in the main process via IPC
- User input is sanitized before being passed to shell commands

## License

MIT
