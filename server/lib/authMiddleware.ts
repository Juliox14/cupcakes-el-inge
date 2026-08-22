import { Context, Next } from 'hono'
import { getCookie } from 'hono/cookie'
import * as crypto from 'crypto'

export const JWT_SECRET = process.env.JWT_SECRET || 'cupcakes-el-inge-secret-key-2026-tuxtla-chiapas'

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  console.warn('⚠️ [ADVERTENCIA DE SEGURIDAD] JWT_SECRET no está configurado en las variables de entorno de producción. Se recomienda definir una clave segura de al menos 64 caracteres.')
}

export interface AuthUserPayload {
  id: string
  email?: string
  phone?: string
  full_name?: string
  role: 'client' | 'admin'
  exp?: number
}

// Funciones criptográficas para JWT y Hasheo de contraseñas
export function hashPassword(password: string, salt: string = 'inge_salt_2026'): string {
  return crypto.pbkdf2Sync(password, salt, 1000, 32, 'sha256').toString('hex')
}

export function createJWT(payload: object): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + (14 * 86400) })).toString('base64url')
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url')
  return `${header}.${body}.${signature}`
}

export function verifyJWT(token: string): AuthUserPayload | null {
  try {
    const [header, body, signature] = token.split('.')
    if (!header || !body || !signature) return null
    const expectedSig = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url')
    if (signature !== expectedSig) return null
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString()) as AuthUserPayload
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null
    return payload
  } catch {
    return null
  }
}

// Helper para extraer token desde Cookie o Header Authorization
export function extractToken(c: Context): string | null {
  const cookieToken = getCookie(c, 'inge_token')
  if (cookieToken) return cookieToken

  const authHeader = c.req.header('Authorization')
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim()
  }

  return null
}

// Middleware: Exige que el usuario esté autenticado (Cliente o Admin)
export async function requireAuth(c: Context, next: Next) {
  const token = extractToken(c)

  if (!token) {
    return c.json({ error: 'No autorizado. Se requiere iniciar sesión.' }, 401)
  }

  const user = verifyJWT(token)
  if (!user) {
    return c.json({ error: 'Sesión inválida o expirada. Por favor ingresa nuevamente.' }, 401)
  }

  c.set('user', user)
  await next()
}

// Middleware: Exige que el usuario tenga rol de Administrador
export async function requireAdmin(c: Context, next: Next) {
  const token = extractToken(c)

  if (!token) {
    return c.json({ error: 'No autorizado. Se requiere iniciar sesión como administrador.' }, 401)
  }

  const user = verifyJWT(token)
  if (!user) {
    return c.json({ error: 'Sesión de administrador inválida o expirada.' }, 401)
  }

  if (user.role !== 'admin') {
    return c.json({ error: 'Acceso denegado. Se requieren permisos de administrador.' }, 403)
  }

  c.set('user', user)
  await next()
}
