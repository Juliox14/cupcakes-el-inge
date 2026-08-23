import { API_BASE, handleApiResponse } from './api.client'
import type { Coupon, CouponRedemptionResult } from '../types'

export async function verifyCouponApi(codeOrToken: string): Promise<{
  valid: boolean
  coupon?: Coupon
  message: string
}> {
  const res = await fetch(`${API_BASE}/coupons/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code_or_token: codeOrToken, code: codeOrToken }),
  })
  return handleApiResponse(res, 'Error al verificar el cupón.')
}

export async function redeemCouponApi(
  codeOrToken: string,
  adminId?: string
): Promise<CouponRedemptionResult> {
  const res = await fetch(`${API_BASE}/coupons/redeem`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      coupon_id: codeOrToken, 
      code: codeOrToken, 
      code_or_token: codeOrToken,
      admin_id: adminId 
    }),
  })
  return handleApiResponse(res, 'Error al canjear el cupón.')
}
