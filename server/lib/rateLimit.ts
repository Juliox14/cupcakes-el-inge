import { Context, Next } from 'hono'

interface RateLimitRecord {
  count: number
  resetTime: number
}

const ipStore = new Map<string, RateLimitRecord>()

// Limpieza periódica de registros antiguos cada 5 minutos
setInterval(() => {
  const now = Date.now()
  for (const [key, record] of ipStore.entries()) {
    if (now > record.resetTime) {
      ipStore.delete(key)
    }
  }
}, 5 * 60 * 1000)

/**
 * Middleware para limitar la tasa de peticiones por IP
 * @param maxRequests Número máximo de peticiones permitidas en la ventana
 * @param windowMs Ventana de tiempo en milisegundos (por defecto 60,000 ms = 1 min)
 * @param message Mensaje personalizado de error
 */
export function rateLimiter(
  maxRequests: number = 10,
  windowMs: number = 60 * 1000,
  message: string = 'Demasiadas solicitudes. Por favor espera un momento antes de reintentar.'
) {
  return async (c: Context, next: Next) => {
    // Obtener IP del cliente (con soporte para proxies e IPs directas)
    const ip = 
      c.req.header('x-forwarded-for')?.split(',')[0].trim() ||
      c.req.header('x-real-ip') ||
      c.req.header('cf-connecting-ip') ||
      'unknown-ip'

    const key = `${c.req.path}:${ip}`
    const now = Date.now()
    const record = ipStore.get(key)

    if (!record || now > record.resetTime) {
      ipStore.set(key, { count: 1, resetTime: now + windowMs })
    } else {
      record.count += 1
      if (record.count > maxRequests) {
        const retryAfterSeconds = Math.ceil((record.resetTime - now) / 1000)
        c.header('Retry-After', retryAfterSeconds.toString())
        return c.json({
          error: message,
          retry_after_seconds: retryAfterSeconds
        }, 429)
      }
    }

    await next()
  }
}
