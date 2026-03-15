import React from 'react'

type Props = {
  theme: 'dark' | 'light'
  onToggle: () => void
}

export default function ThemeToggle({ theme, onToggle }: Props) {
  return (
    <button
      className="btn-icon"
      onClick={onToggle}
      title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      style={{ fontSize: 18 }}
    >
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  )
}
