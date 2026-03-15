export type SSHHost = {
  id: string
  alias: string
  hostname: string
  user: string
  port: string
  identityFile: string
  forwardAgent: boolean
  extraLines: string[]
}

/**
 * Parse raw ~/.ssh/config text into an array of SSHHost objects.
 * Preserves unrecognised directives in extraLines.
 */
export function parseSSHConfig(raw: string): SSHHost[] {
  const hosts: SSHHost[] = []
  let current: Partial<SSHHost> | null = null

  const lines = raw.split('\n')

  for (const line of lines) {
    const trimmed = line.trim()

    if (trimmed === '' || trimmed.startsWith('#')) continue

    const match = trimmed.match(/^(\S+)\s+(.*)$/)
    if (!match) continue

    const key = match[1].toLowerCase()
    const value = match[2].trim()

    if (key === 'host') {
      if (current && current.alias) {
        hosts.push(normalise(current))
      }
      current = {
        id: crypto.randomUUID(),
        alias: value,
        hostname: '',
        user: '',
        port: '22',
        identityFile: '',
        forwardAgent: false,
        extraLines: [],
      }
    } else if (current) {
      switch (key) {
        case 'hostname':
          current.hostname = value
          break
        case 'user':
          current.user = value
          break
        case 'port':
          current.port = value
          break
        case 'identityfile':
          current.identityFile = value
          break
        case 'forwardagent':
          current.forwardAgent = value.toLowerCase() === 'yes'
          break
        default:
          current.extraLines = [...(current.extraLines ?? []), line]
      }
    }
  }

  if (current && current.alias) {
    hosts.push(normalise(current))
  }

  return hosts
}

function normalise(h: Partial<SSHHost>): SSHHost {
  return {
    id: h.id ?? crypto.randomUUID(),
    alias: h.alias ?? '',
    hostname: h.hostname ?? '',
    user: h.user ?? '',
    port: h.port || '22',
    identityFile: h.identityFile ?? '',
    forwardAgent: h.forwardAgent ?? false,
    extraLines: h.extraLines ?? [],
  }
}

/**
 * Serialise an array of SSHHost objects back to ~/.ssh/config format.
 */
export function stringifySSHConfig(hosts: SSHHost[]): string {
  const blocks = hosts.map(h => {
    const lines: string[] = []
    lines.push(`Host ${h.alias}`)
    if (h.hostname) lines.push(`  HostName ${h.hostname}`)
    if (h.user) lines.push(`  User ${h.user}`)
    if (h.port && h.port !== '22') lines.push(`  Port ${h.port}`)
    if (h.identityFile) lines.push(`  IdentityFile ${h.identityFile}`)
    if (h.forwardAgent) lines.push(`  ForwardAgent yes`)
    if (h.extraLines.length > 0) lines.push(...h.extraLines)
    return lines.join('\n')
  })
  return blocks.join('\n\n') + (blocks.length > 0 ? '\n' : '')
}

/** Return the SSH command string for a host entry */
export function buildSSHCommand(host: SSHHost): string {
  const parts = ['ssh']
  if (host.port && host.port !== '22') parts.push(`-p ${host.port}`)
  if (host.identityFile) parts.push(`-i ${host.identityFile}`)
  if (host.user && host.hostname) {
    parts.push(`${host.user}@${host.hostname}`)
  } else {
    parts.push(host.alias)
  }
  return parts.join(' ')
}

/** Create a blank host template */
export function createEmptyHost(): SSHHost {
  return {
    id: crypto.randomUUID(),
    alias: '',
    hostname: '',
    user: '',
    port: '22',
    identityFile: '',
    forwardAgent: false,
    extraLines: [],
  }
}
