import React, { useState, useEffect, useCallback } from 'react'
import HostList from './components/HostList'
import HostEditor from './components/HostEditor'
import KeyGenerator from './components/KeyGenerator'
import ThemeToggle from './components/ThemeToggle'
import { ipc } from './lib/ipc'
import { parseSSHConfig, stringifySSHConfig, createEmptyHost, type SSHHost } from './lib/sshConfig'
import './styles/globals.css'

type Tab = 'hosts' | 'keygen'
type Theme = 'dark' | 'light'

export default function App() {
  const [hosts, setHosts] = useState<SSHHost[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editingHost, setEditingHost] = useState<SSHHost | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [availableKeys, setAvailableKeys] = useState<string[]>([])
  const [tab, setTab] = useState<Tab>('hosts')
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem('theme') as Theme) ?? 'dark'
  })
  const [saveError, setSaveError] = useState('')

  // Apply theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  // Load SSH config & keys on mount
  const loadConfig = useCallback(async () => {
    const result = await ipc.readConfig()
    if (result.success && result.data !== undefined) {
      setHosts(parseSSHConfig(result.data))
    }
    const keysResult = await ipc.listKeys()
    if (keysResult.success && keysResult.data) {
      setAvailableKeys(keysResult.data)
    }
  }, [])

  useEffect(() => {
    loadConfig()
  }, [loadConfig])

  // Save all hosts to disk
  const saveConfig = useCallback(async (updatedHosts: SSHHost[]) => {
    const content = stringifySSHConfig(updatedHosts)
    const result = await ipc.writeConfig(content)
    if (!result.success) {
      setSaveError(result.error ?? 'Failed to save')
    } else {
      setSaveError('')
    }
    return result.success
  }, [])

  const selectedHost = hosts.find(h => h.id === selectedId) ?? null

  // ── Host actions ────────────────────────────────────────────────────────────

  const handleSelect = (id: string) => {
    setSelectedId(id)
    setEditingHost(hosts.find(h => h.id === id) ?? null)
    setIsNew(false)
  }

  const handleAdd = () => {
    const newHost = createEmptyHost()
    setEditingHost(newHost)
    setIsNew(true)
    setSelectedId(null)
  }

  const handleEdit = (id: string) => {
    const h = hosts.find(h => h.id === id)
    if (h) {
      setEditingHost({ ...h })
      setSelectedId(id)
      setIsNew(false)
    }
  }

  const handleSave = async (updated: SSHHost) => {
    let newHosts: SSHHost[]
    if (isNew) {
      newHosts = [...hosts, updated]
    } else {
      newHosts = hosts.map(h => h.id === updated.id ? updated : h)
    }
    const ok = await saveConfig(newHosts)
    if (ok) {
      setHosts(newHosts)
      setSelectedId(updated.id)
      setEditingHost(updated)
      setIsNew(false)
    }
  }

  const handleDelete = async (id: string) => {
    const newHosts = hosts.filter(h => h.id !== id)
    const ok = await saveConfig(newHosts)
    if (ok) {
      setHosts(newHosts)
      if (selectedId === id) {
        setSelectedId(null)
        setEditingHost(null)
      }
    }
  }

  const handleCancel = () => {
    if (isNew) {
      setEditingHost(null)
      setIsNew(false)
    } else if (selectedId) {
      setEditingHost(hosts.find(h => h.id === selectedId) ?? null)
    }
  }

  return (
    <div className="app">
      {/* Title Bar */}
      <div className="titlebar">
        <span className="titlebar-title">SSH Manager</span>
        <div className="titlebar-actions">
          <ThemeToggle theme={theme} onToggle={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} />
        </div>
      </div>

      {/* Tab Bar */}
      <div className="tab-bar" style={{ paddingLeft: 0 }}>
        <div className="tab-bar" style={{ borderBottom: 'none', padding: '0 4px' }}>
          <button
            className={`tab${tab === 'hosts' ? ' active' : ''}`}
            onClick={() => setTab('hosts')}
          >
            Hosts
          </button>
          <button
            className={`tab${tab === 'keygen' ? ' active' : ''}`}
            onClick={() => setTab('keygen')}
          >
            Key Generator
          </button>
        </div>
      </div>

      {/* Main Layout */}
      <div className="main-layout">
        {tab === 'hosts' ? (
          <>
            <HostList
              hosts={hosts}
              selectedId={editingHost?.id ?? null}
              onSelect={handleSelect}
              onAdd={handleAdd}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
            <div className="content">
              {saveError && (
                <div className="status-bar error" style={{ margin: '12px 24px 0', borderRadius: 6 }}>
                  ⚠️ {saveError}
                </div>
              )}
              {editingHost ? (
                <HostEditor
                  key={editingHost.id}
                  host={editingHost}
                  availableKeys={availableKeys}
                  onSave={handleSave}
                  onCancel={handleCancel}
                  isNew={isNew}
                />
              ) : (
                <div className="empty-state">
                  <div className="empty-state-icon">⚡</div>
                  <h2>No host selected</h2>
                  <p>Select a host from the list or click + to add a new one.</p>
                  <button className="btn btn-primary" onClick={handleAdd}>
                    + Add Host
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="content">
            <KeyGenerator />
          </div>
        )}
      </div>
    </div>
  )
}
