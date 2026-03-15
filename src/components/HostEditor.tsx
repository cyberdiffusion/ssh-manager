import React, { useState, useEffect, useCallback } from 'react'
import type { SSHHost } from '../lib/sshConfig'
import { buildSSHCommand } from '../lib/sshConfig'
import { ipc } from '../lib/ipc'

type Props = {
  host: SSHHost
  availableKeys: string[]
  onSave: (host: SSHHost) => void
  onCancel: () => void
  isNew: boolean
}

type TestStatus = 'idle' | 'testing' | 'success' | 'reachable' | 'error'

export default function HostEditor({ host, availableKeys, onSave, onCancel, isNew }: Props) {
  const [form, setForm] = useState<SSHHost>(host)
  const [testStatus, setTestStatus] = useState<TestStatus>('idle')
  const [testMsg, setTestMsg] = useState('')
  const [toast, setToast] = useState('')

  useEffect(() => {
    setForm(host)
    setTestStatus('idle')
  }, [host.id])

  const set = (field: keyof SSHHost) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }))
  }

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2000)
  }, [])

  const handleSave = (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!form.alias.trim()) return
    onSave(form)
    showToast('Host saved!')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault()
      handleSave()
    }
  }

  const handleTest = async () => {
    setTestStatus('testing')
    setTestMsg('')
    const result = await ipc.testConnection(form.alias || `${form.user}@${form.hostname}`)
    if (result.success) {
      setTestStatus('success')
    } else if (result.reachable) {
      setTestStatus('reachable')
    } else {
      setTestStatus('error')
    }
    setTestMsg(result.message ?? '')
  }

  const handleOpenTerminal = async () => {
    const alias = form.alias.trim()
    if (!alias) return
    const result = await ipc.openTerminal(alias)
    if (!result.success) showToast(`Terminal açılamadı: ${result.error}`)
  }

  const handleCopyCmd = () => {
    navigator.clipboard.writeText(buildSSHCommand(form))
    showToast('SSH command copied!')
  }

  const handleBrowseKey = async () => {
    const result = await ipc.openKeyDialog()
    if (result.success && result.keyPath) {
      setForm(prev => ({ ...prev, identityFile: result.keyPath! }))
    }
  }

  const keyBaseName = (p: string) => p.split('/').pop() ?? p

  return (
    <form className="form-panel" onSubmit={handleSave} onKeyDown={handleKeyDown}>
      <div className="form-header">
        <h2 className="form-title">{isNew ? 'New Host' : `Edit — ${host.alias}`}</h2>
        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          <button type="button" className="btn btn-secondary" onClick={handleCopyCmd}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
            Copy SSH
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleOpenTerminal}
            disabled={!form.alias.trim()}
            title="Open SSH session in Terminal / iTerm2"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/>
            </svg>
            Open in Terminal
          </button>
          <button type="submit" className="btn btn-secondary">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            Save
          </button>
        </div>
      </div>

      <p className="section-title">Connection</p>
      <div className="form-grid">
        <div className="form-group">
          <label htmlFor="alias">Host Alias *</label>
          <input
            id="alias"
            type="text"
            value={form.alias}
            onChange={set('alias')}
            placeholder="vidi"
            required
            autoFocus
          />
        </div>
        <div className="form-group">
          <label htmlFor="hostname">HostName</label>
          <input
            id="hostname"
            type="text"
            value={form.hostname}
            onChange={set('hostname')}
            placeholder="192.168.1.1"
          />
        </div>
        <div className="form-group">
          <label htmlFor="user">User</label>
          <input
            id="user"
            type="text"
            value={form.user}
            onChange={set('user')}
            placeholder="root"
          />
        </div>
        <div className="form-group">
          <label htmlFor="port">Port</label>
          <input
            id="port"
            type="number"
            value={form.port}
            onChange={set('port')}
            placeholder="22"
            min="1"
            max="65535"
          />
        </div>
      </div>

      <p className="section-title">Authentication</p>
      <div className="form-grid">
        <div className="form-group full-width">
          <label htmlFor="identityFile">Identity File</label>
          <div className="input-with-btn">
            <input
              id="identityFile"
              type="text"
              value={form.identityFile}
              onChange={set('identityFile')}
              placeholder="~/.ssh/id_ed25519"
            />
            {availableKeys.length > 0 && (
              <select
                style={{ width: 'auto', flexShrink: 0 }}
                value=""
                onChange={e => {
                  if (e.target.value) setForm(prev => ({ ...prev, identityFile: e.target.value }))
                }}
                title="Pick from ~/.ssh/ keys"
              >
                <option value="">Pick key…</option>
                {availableKeys.map(k => (
                  <option key={k} value={k}>{keyBaseName(k)}</option>
                ))}
              </select>
            )}
            <button type="button" className="btn btn-secondary" onClick={handleBrowseKey} style={{ flexShrink: 0 }}>
              Browse
            </button>
          </div>
        </div>

        <div className="form-group full-width">
          <div className="toggle-row">
            <span className="toggle-label">ForwardAgent</span>
            <label className="toggle">
              <input
                type="checkbox"
                checked={form.forwardAgent}
                onChange={e => setForm(prev => ({ ...prev, forwardAgent: e.target.checked }))}
              />
              <span className="toggle-slider"/>
            </label>
          </div>
        </div>
      </div>

      <div className="divider"/>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={handleTest}
          disabled={testStatus === 'testing' || !form.alias}
        >
          {testStatus === 'testing' ? (
            <><span className="spinner"/> Testing…</>
          ) : (
            <>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
              </svg>
              Test Connection
            </>
          )}
        </button>

        {testStatus === 'success' && (
          <span className="status-bar success" style={{ margin: 0 }}>✅ {testMsg}</span>
        )}
        {testStatus === 'reachable' && (
          <span className="status-bar warning" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            🟡 {testMsg}
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleOpenTerminal}
              style={{ padding: '3px 10px', fontSize: 12, flexShrink: 0 }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/>
              </svg>
              Connect
            </button>
          </span>
        )}
        {testStatus === 'error' && (
          <span className="status-bar error" style={{ margin: 0 }}>❌ {testMsg}</span>
        )}
      </div>

      {toast && <div className="toast">{toast}</div>}
    </form>
  )
}
