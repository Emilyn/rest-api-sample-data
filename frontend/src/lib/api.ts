const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:9800"

export class ApiError extends Error {}

type FetchOptions = {
  method?: string
  body?: unknown
  token?: string | null
  auth?: boolean
}

export async function apiFetch<T>(
  path: string,
  { method = "GET", body, token, auth = true }: FetchOptions = {}
): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (auth && token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    const message =
      data.error ?? (Array.isArray(data.errors) ? data.errors.join(", ") : null) ?? `Request failed (${res.status})`
    throw new ApiError(message)
  }

  return data as T
}

export { API_BASE }
