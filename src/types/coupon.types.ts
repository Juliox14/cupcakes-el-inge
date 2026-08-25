import type { Prize } from './prize.types'

export interface Coupon {
  id: string
  code: string
  user_id: string
  prize_id?: string
  qr_token?: string
  token_qr?: string
  status: 'active' | 'redeemed' | 'expired' | 'activo' | 'canjeado' | 'expirado'
  expires_at?: string
  redeemed_at?: string
  created_at?: string
  codigo?: string
  usuario_id?: string
  fecha_expiracion?: string
  fecha_canje?: string
  fecha_creacion?: string
  prize?: Prize
  premio?: any
}

export interface CouponRedemptionResult {
  success: boolean
  message: string
  coupon?: Coupon
  client_name?: string
  prize_title?: string
}
