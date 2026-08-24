import { API_BASE, handleApiResponse } from './api.client'
import type { UserProfile, Coupon } from '../types'

export async function loginUserApi(params: {
  identifier: string
  password?: string
}): Promise<{
  success: boolean
  token?: string
  user: UserProfile
  coupons?: Coupon[]
  message: string
}> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      identifier: params.identifier, 
      password: params.password || '' 
    }),
  })
  return handleApiResponse(res, 'Error al iniciar sesión.')
}

export async function registerUserApi(params: {
  full_name: string
  email: string
  phone: string
  password?: string
}): Promise<{
  success: boolean
  token?: string
  user: UserProfile
  coupons?: Coupon[]
  message: string
}> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  return handleApiResponse(res, 'Error al registrar el usuario.')
}

export async function registerOrLoginApi(phone: string, fullName?: string): Promise<{
  success: boolean
  is_new: boolean
  user: UserProfile
  coupons: Coupon[]
  message: string
}> {
  const res = await fetch(`${API_BASE}/auth/register-or-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, full_name: fullName }),
  })
  return handleApiResponse(res, 'Error al registrar o autenticar cliente.')
}

export async function checkAuthMeApi(): Promise<{
  authenticated: boolean
  user: UserProfile | null
  coupons?: Coupon[]
}> {
  try {
    const res = await fetch(`${API_BASE}/auth/me`)
    if (!res.ok) return { authenticated: false, user: null, coupons: [] }
    return await res.json()
  } catch {
    return { authenticated: false, user: null, coupons: [] }
  }
}

export async function logoutUserApi(): Promise<{ success: boolean }> {
  try {
    const res = await fetch(`${API_BASE}/auth/logout`, { method: 'POST' })
    return await res.json()
  } catch {
    return { success: true }
  }
}

export async function getAllClientsApi(): Promise<{
  success: boolean
  users: UserProfile[]
}> {
  const res = await fetch(`${API_BASE}/auth/all-clients`)
  return handleApiResponse(res, 'Error al obtener lista de clientes.')
}

export async function getClientByQueryApi(query: string): Promise<{
  success: boolean
  user: UserProfile
  coupons: Coupon[]
}> {
  const res = await fetch(`${API_BASE}/auth/user/${encodeURIComponent(query)}`)
  return handleApiResponse(res, 'Cliente no encontrado o código QR inválido.')
}

export async function claimWeeklyRewardApi(userId: string): Promise<{
  success: boolean
  spins_available: number
  message: string
}> {
  const res = await fetch(`${API_BASE}/auth/claim-weekly-reward`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId }),
  })
  return handleApiResponse(res, 'Error al reclamar la recompensa semanal.')
}

export async function forgotPasswordApi(params: {
  email: string
}): Promise<{
  success: boolean
  message: string
  expires_in_minutes: number
}> {
  const res = await fetch(`${API_BASE}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  return handleApiResponse(res, 'Error al solicitar código de recuperación.')
}

export async function resetPasswordApi(params: {
  email: string
  code: string
  new_password: string
}): Promise<{
  success: boolean
  message: string
}> {
  const res = await fetch(`${API_BASE}/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  return handleApiResponse(res, 'Error al restablecer la contraseña.')
}

