import React, { useState, useRef, useEffect, useCallback } from 'react'
import type { SSHHost } from '../lib/sshConfig'
import { buildSSHCommand } from '../lib/sshConfig'
import { ipc } from '../lib/ipc'

type Props = {
  hosts: SSHHost[]
  selectedId: string | null
  onSelect: (id: string) => void
  onAdd: () => void
  onEdit: (id: string) => void
  onDelete: (id: string) => void
}

type CtxMenu = {
  x: number
  y: number
  hostId: string
}

export default function HostList({ hosts, selectedId, onSelect, onAdd, onEdit, onDelete }: Props) {
  const [search, setSearch] = useState('')
  const [ctxMenu, setCtxMenu] = useState<CtxMenu | null>(null)
  const [toast, setToast] = useState('')
  const menuRef = useRef<HTMLDivElement>(null)

  const filtered = hosts.filter(h =>
    h.alias.toLowerCase().includes(search.toLowerCase()) ||
    h.hostname.toLowerCase().includes(search.toLowerCase()) ||
    h.user.toLowerCase().includes(search.toLowerCase())
  )

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2000)
  }, [])

  const openCtx = (e: React.MouseEvent, hostId: string) => {
    e.preventDefault()
    e.stopPropagation()
    setCtxMenu({ x: e.clientX, y: e.clientY, hostId })
  }

  const closeCtx = () => setCtxMenu(null)

  useEffect(() => {
    const handleClick = () => closeCtx()
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

  const copySSHCommand = (host: SSHHost) => {
    const cmd = buildSSHCommand(host)
    navigator.clipboard.writeText(cmd)
    showToast('SSH command copied!')
    closeCtx()
  }

  const openInTerminal = async (host: SSHHost) => {
    closeCtx()
    await ipc.openTerminal(host.alias)
  }

  const handleDelete = (id: string) => {
    if (confirm('Delete this host?')) {
      onDelete(id)
    }
    closeCtx()
  }

  return (
    <>
      <div className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-top">
            <span className="sidebar-label">Hosts</span>
            <button className="btn-icon" onClick={onAdd} title="Add new host">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </button>
          </div>
          <div className="search-wrap">
            <span className="search-icon">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </span>
            <input
              type="text"
              placeholder="Search hosts…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="sidebar-list">
          {filtered.length === 0 && (
            <div className="empty-list">
              {search ? 'No matching hosts' : 'No hosts yet.\nClick + to add one.'}
            </div>
          )}
          {filtered.map(host => (
            <div
              key={host.id}
              className={`host-item${selectedId === host.id ? ' active' : ''}`}
              onClick={() => onSelect(host.id)}
              onContextMenu={e => openCtx(e, host.id)}
            >
              <div className="host-icon">⚡</div>
              <div className="host-info">
                <div className="host-alias">{host.alias}</div>
                <div className="host-meta">
                  {host.user ? `${host.user}@` : ''}{host.hostname || '—'}
                  {host.port && host.port !== '22' ? `:${host.port}` : ''}
                </div>
              </div>
              <button
                className="host-item-menu-btn"
                onClick={e => openCtx(e, host.id)}
                title="More options"
              >
                ···
              </button>
            </div>
          ))}
        </div>
      </div>

      {ctxMenu && (
        <div
          ref={menuRef}
          className="ctx-menu"
          style={{ top: ctxMenu.y, left: ctxMenu.x }}
          onClick={e => e.stopPropagation()}
        >
          {(() => {
            const host = hosts.find(h => h.id === ctxMenu.hostId)
            if (!host) return null
            return (
              <>
                <div className="ctx-menu-item" onClick={() => { onEdit(ctxMenu.hostId); closeCtx() }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                  Edit
                </div>
                <div className="ctx-menu-item" onClick={() => openInTerminal(host)}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/>
                  </svg>
                  Open in Terminal
                </div>
                <div className="ctx-menu-item" onClick={() => copySSHCommand(host)}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                  </svg>
                  Copy SSH Command
                </div>
                <div className="ctx-menu-sep"/>
                <div className="ctx-menu-item danger" onClick={() => handleDelete(ctxMenu.hostId)}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                    <path d="M10 11v6M14 11v6"/>
                    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                  </svg>
                  Delete
                </div>
              </>
            )
          })()}
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </>
  )
}
