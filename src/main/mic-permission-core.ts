// Pure permission rule for microphone access. No Electron imports, so it runs under plain Node.
// Only audio capture from the app's own pages is allowed. Everything else is denied.

export interface PermissionRequest {
  permission: string
  mediaTypes?: string[]
  requestingUrl?: string
}

// The app loads its own pages from the dev server (http://localhost) or from file://.
export function isAppOrigin(url: string | undefined, allowedOrigins: readonly string[]): boolean {
  if (!url) return false
  try {
    const origin = url.startsWith('file://') ? 'file://' : new URL(url).origin
    return allowedOrigins.includes(origin)
  } catch {
    return false
  }
}

export function allowMicrophone(req: PermissionRequest, allowedOrigins: readonly string[]): boolean {
  if (req.permission !== 'media') return false
  // Audio only. Camera and screen capture are never granted.
  const types = req.mediaTypes ?? []
  if (types.length === 0 || types.some((t) => t !== 'audio')) return false
  return isAppOrigin(req.requestingUrl, allowedOrigins)
}
