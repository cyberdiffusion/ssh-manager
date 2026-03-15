import { contextBridge, ipcRenderer } from 'electron'

export type GenerateKeyOpts = {
  name: string
  algorithm: 'ed25519' | 'rsa'
  comment: string
  passphrase: string
}

const api = {
  readConfig: (): Promise<{ success: boolean; data?: string; error?: string }> =>
    ipcRenderer.invoke('ssh:readConfig'),

  writeConfig: (content: string): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('ssh:writeConfig', content),

  listKeys: (): Promise<{ success: boolean; data?: string[]; error?: string }> =>
    ipcRenderer.invoke('ssh:listKeys'),

  testConnection: (host: string): Promise<{ success: boolean; reachable?: boolean; message?: string }> =>
    ipcRenderer.invoke('ssh:testConnection', host),

  openTerminal: (alias: string): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('ssh:openTerminal', alias),

  generateKey: (opts: GenerateKeyOpts): Promise<{ success: boolean; publicKey?: string; keyPath?: string; error?: string }> =>
    ipcRenderer.invoke('ssh:generateKey', opts),

  openKeyDialog: (): Promise<{ success: boolean; keyPath?: string }> =>
    ipcRenderer.invoke('ssh:openKeyDialog'),
}

contextBridge.exposeInMainWorld('sshManager', api)

export type SshManagerAPI = typeof api
