import React, { useState } from 'react'
import { ipc } from '../lib/ipc'

type Algorithm = 'ed25519' | 'rsa'

export default function KeyGenerator() {
  const [name, setName] = useState('')
  const [algo, setAlgo] = useState<Algorithm>('ed25519')
  const [comment, setComment] = useState('')
  const [passphrase, setPassphrase] = useState('')
  const [status, setStatus] = useState<'idle' | 'generating' | 'done' | 'error'>('idle')
  const [pubKey, setPubKey] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [copied, setCopied] = useState(false)

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setStatus('generating')
    setErrorMsg('')
    setPubKey('')

    const result = await ipc.generateKey({
      name: name.trim(),
      algorithm: algo,
      comment: comment.trim(),
      passphrase,
    })

    if (result.success && result.publicKey) {
      setStatus('done')
      setPubKey(result.publicKey)
    } else {
      setStatus('error')
      setErrorMsg(result.error ?? 'Unknown error')
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(pubKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <form className="keygen-panel" onSubmit={handleGenerate}>
      <div className="form-header">
        <h2 className="form-title">Generate SSH Key</h2>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={status === 'generating' || !name.trim()}
        >
          {status === 'generating' ? (
            <><span className="spinner"/> Generating…</>
          ) : (
            <>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              Generate Key
            </>
          )}
        </button>
      </div>

      <p className="section-title">Key Options</p>
      <div className="form-grid">
        <div className="form-group">
          <label htmlFor="keyname">Key Name *</label>
          <input
            id="keyname"
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="id_ed25519_myserver"
            required
            autoFocus
          />
        </div>
        <div className="form-group">
          <label htmlFor="algo">Algorithm</label>
          <select id="algo" value={algo} onChange={e => setAlgo(e.target.value as Algorithm)}>
            <option value="ed25519">Ed25519 (recommended)</option>
            <option value="rsa">RSA 4096</option>
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="comment">Comment</label>
          <input
            id="comment"
            type="text"
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="user@hostname"
          />
        </div>
        <div className="form-group">
          <label htmlFor="passphrase">Passphrase (optional)</label>
          <input
            id="passphrase"
            type="password"
            value={passphrase}
            onChange={e => setPassphrase(e.target.value)}
            placeholder="Leave blank for no passphrase"
          />
        </div>
      </div>

      {status === 'error' && (
        <div className="status-bar error">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {errorMsg}
        </div>
      )}

      {status === 'done' && pubKey && (
        <>
          <div className="status-bar success">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            Key generated successfully in ~/.ssh/
          </div>

          <div className="divider"/>

          <p className="section-title">Public Key</p>
          <div className="pubkey-display">
            <pre className="pubkey-text">{pubKey}</pre>
            <button
              type="button"
              className="btn btn-secondary pubkey-copy"
              onClick={handleCopy}
            >
              {copied ? '✅ Copied!' : 'Copy'}
            </button>
          </div>
        </>
      )}
    </form>
  )
}
