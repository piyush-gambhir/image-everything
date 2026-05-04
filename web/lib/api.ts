const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? ""

export function apiUrl(path: string): string {
  if (!path.startsWith("/")) path = `/${path}`
  return `${API_BASE}${path}`
}
