import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import * as path from 'path'
import * as fs from 'fs'
import * as os from 'os'
import { execFile, spawn } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

const SSH_CONFIG_PATH = path.join(os.homedir(), '.ssh', 'config')
const SSH_DIR = path.join(os.homedir(), '.ssh')

function createWindow() {
  const isMac = process.platform === 'darwin'
  const win = new BrowserWindow({
    width: 1100,
    height: 700,
    minWidth: 800,
    minHeight: 500,
    backgroundColor: '#1a1a1a',
    ...(isMac ? {
      titleBarStyle: 'hiddenInset' as const,
      trafficLightPosition: { x: 16, y: 16 },
      vibrancy: 'sidebar' as const,
      visualEffectState: 'active' as const,
    } : {}),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL)
    win.webContents.openDevTools()
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

function openWindowsTerminal(command: string) {
  const proc = spawn(
    'cmd.exe',
    ['/c', 'start', '', 'cmd.exe', '/k', command],
    {
      detached: true,
      stdio: 'ignore',
      windowsHide: false,
    }
  )

  proc.unref()
}

// ── IPC Handlers ──────────────────────────────────────────────────────────────

// Read ~/.ssh/config
ipcMain.handle('ssh:readConfig', async () => {
  try {
    if (!fs.existsSync(SSH_CONFIG_PATH)) {
      fs.mkdirSync(SSH_DIR, { recursive: true, mode: 0o700 })
      fs.writeFileSync(SSH_CONFIG_PATH, '', { mode: 0o600 })
    }
    return { success: true, data: fs.readFileSync(SSH_CONFIG_PATH, 'utf-8') }
  } catch (err) {
    return { success: false, error: String(err) }
  }
})

// Write ~/.ssh/config (with backup)
ipcMain.handle('ssh:writeConfig', async (_event, content: string) => {
  try {
    if (fs.existsSync(SSH_CONFIG_PATH)) {
      fs.copyFileSync(SSH_CONFIG_PATH, SSH_CONFIG_PATH + '.bak')
    }
    fs.mkdirSync(SSH_DIR, { recursive: true, mode: 0o700 })
    fs.writeFileSync(SSH_CONFIG_PATH, content, { mode: 0o600 })
    return { success: true }
  } catch (err) {
    return { success: false, error: String(err) }
  }
})

// List private keys in ~/.ssh/
ipcMain.handle('ssh:listKeys', async () => {
  try {
    if (!fs.existsSync(SSH_DIR)) return { success: true, data: [] }
    const files = fs.readdirSync(SSH_DIR)
    // Filter: files that exist without .pub extension are likely private keys
    const keys = files.filter(f => {
      if (f.endsWith('.pub')) return false
      if (f === 'config' || f === 'config.bak' || f === 'known_hosts' || f === 'authorized_keys') return false
      const pubExists = files.includes(f + '.pub')
      return pubExists
    })
    return { success: true, data: keys.map(k => path.join(SSH_DIR, k)) }
  } catch (err) {
    return { success: false, error: String(err) }
  }
})

// Test SSH connection
// Returns: success=true (auth ok), reachable=true (host up but auth failed), success=false (unreachable)
ipcMain.handle('ssh:testConnection', async (_event, host: string) => {
  return new Promise(resolve => {
    const args = [
      '-o', 'ConnectTimeout=5',
      '-o', 'BatchMode=yes',
      '-o', 'StrictHostKeyChecking=no',
      host, 'exit'
    ]
    const proc = spawn('ssh', args)
    let stderr = ''
    proc.stderr.on('data', (d: Buffer) => { stderr += d.toString() })
    proc.on('close', code => {
      const msg = stderr.trim()
      if (code === 0) {
        resolve({ success: true, reachable: true, message: 'Connection successful' })
      } else if (
        msg.includes('Permission denied') ||
        msg.includes('publickey') ||
        msg.includes('password') ||
        msg.includes('keyboard-interactive')
      ) {
        // Host is reachable but authentication failed (expected in BatchMode)
        resolve({ success: false, reachable: true, message: 'Host reachable — auth failed (key/password required)' })
      } else {
        resolve({ success: false, reachable: false, message: msg || `Connection failed (exit ${code})` })
      }
    })
    proc.on('error', err => {
      resolve({ success: false, reachable: false, message: err.message })
    })
  })
})

// Open SSH session in a platform-appropriate terminal window
ipcMain.handle('ssh:openTerminal', async (_event, alias: string) => {
  try {
    // Sanitize: alias must not contain shell metacharacters
    if (!/^[\w\-_.@]+$/.test(alias)) {
      return { success: false, error: 'Invalid host alias' }
    }
    const cmd = `ssh ${alias}`

    if (process.platform === 'darwin') {
      const useITerm = fs.existsSync('/Applications/iTerm.app')
      const scriptArgs = useITerm
        ? [
            '-e', 'tell application "iTerm"',
            '-e', `create window with default profile command "${cmd}"`,
            '-e', 'end tell',
          ]
        : [
            '-e', 'tell application "Terminal"',
            '-e', `do script "${cmd}"`,
            '-e', 'activate',
            '-e', 'end tell',
          ]

      await execFileAsync('osascript', scriptArgs)
    } else if (process.platform === 'win32') {
      openWindowsTerminal(cmd)
    } else {
      return { success: false, error: `Unsupported platform: ${process.platform}` }
    }

    return { success: true }
  } catch (err) {
    return { success: false, error: String(err) }
  }
})

// Generate SSH key
ipcMain.handle('ssh:generateKey', async (_event, opts: {
  name: string
  algorithm: 'ed25519' | 'rsa'
  comment: string
  passphrase: string
}) => {
  try {
    const keyPath = path.join(SSH_DIR, opts.name)

    // Sanitize: only allow safe filename characters
    if (!/^[\w\-_.]+$/.test(opts.name)) {
      return { success: false, error: 'Invalid key name. Use only letters, numbers, hyphens, underscores, and dots.' }
    }

    const args = [
      '-t', opts.algorithm,
      '-f', keyPath,
      '-C', opts.comment,
      '-N', opts.passphrase,
    ]
    if (opts.algorithm === 'rsa') {
      args.push('-b', '4096')
    }

    await execFileAsync('ssh-keygen', args)
    const pubKey = fs.readFileSync(keyPath + '.pub', 'utf-8').trim()
    return { success: true, publicKey: pubKey, keyPath }
  } catch (err) {
    return { success: false, error: String(err) }
  }
})

// Open file dialog for key selection
ipcMain.handle('ssh:openKeyDialog', async () => {
  const result = await dialog.showOpenDialog({
    title: 'Select SSH Private Key',
    defaultPath: SSH_DIR,
    properties: ['openFile'],
    filters: [{ name: 'All Files', extensions: ['*'] }],
  })
  if (result.canceled || result.filePaths.length === 0) return { success: false }
  return { success: true, keyPath: result.filePaths[0] }
})
