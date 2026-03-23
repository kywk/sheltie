const base = import.meta.env.BASE_URL.replace(/\/$/, '')

export function apiUrl(path: string): string {
  return `${base}${path}`
}

export function wsUrl(path: string): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${window.location.host}${base}${path}`
}
