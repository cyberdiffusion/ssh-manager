import type { SshManagerAPI } from '../../electron/preload'

declare global {
  interface Window {
    sshManager: SshManagerAPI
  }
}

export const ipc: SshManagerAPI = window.sshManager
