export const API_BASE = '/api'

export async function handleApiResponse<T>(res: Response, fallbackError: string): Promise<T> {
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.error || fallbackError)
  }
  return data as T
}
