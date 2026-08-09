import { env } from "@/env"

const API_BASE = env.NEXT_PUBLIC_API_URL ?? ""
const API_KEY = env.NEXT_PUBLIC_API_KEY ?? ""

export const IMAGE_API_PREFIX = "/api/v1/images"

export function imageApiPath(operation: string): string {
  return `${IMAGE_API_PREFIX}/${operation.replace(/^\/+/, "")}`
}

export function apiUrl(path: string): string {
  if (!path.startsWith("/")) path = `/${path}`
  return `${API_BASE}${path}`
}

export function apiHeaders(): Record<string, string> {
  return API_KEY ? { Authorization: `Bearer ${API_KEY}` } : {}
}

export function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers)
  for (const [k, v] of Object.entries(apiHeaders())) headers.set(k, v)
  return fetch(apiUrl(path), { ...init, headers })
}
