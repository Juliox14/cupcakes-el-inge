import { API_BASE, handleApiResponse } from './api.client'
import type { Prize, AdminMetrics, Coupon } from '../types'

export async function getAdminMetricsApi(): Promise<AdminMetrics & { metrics: AdminMetrics }> {
  const res = await fetch(`${API_BASE}/admin/metrics`)
  const data = await handleApiResponse<any>(res, 'Error al obtener métricas del administrador.')
  const metricsData = data.metrics || data
  return {
    ...metricsData,
    metrics: metricsData
  }
}

export async function toggleKillSwitchApi(isActive: boolean): Promise<{ success: boolean; config: any }> {
  return updateSystemConfigApi({ is_active: isActive })
}

export async function updateStockApi(stock: number): Promise<{ success: boolean; config: any }> {
  return updateSystemConfigApi({ stock_limit: stock })
}

export async function registerPurchaseApi(
  clientOrParams: {
    user_id?: string
    client_name: string
    producto_id?: string
    cupcakes_qty: number
    unit_price: number
    total_amount: number
    spins_granted: number
    coupon_id?: string
    coupon_code?: string
    discount_amount?: number
    admin_id?: string
  } | string,
  qty?: number,
  adminId?: string,
  unitPrice?: number
): Promise<{
  success: boolean
  purchase: any
  spins_granted: number
  discount_amount?: number
  redeemed_coupon?: any
  message: string
}> {
  let payload: any
  if (typeof clientOrParams === 'object') {
    payload = clientOrParams
  } else {
    const cupcakesQty = qty || 1
    const price = unitPrice || 20
    payload = {
      user_id: clientOrParams,
      client_name: 'Cliente Registrado',
      cupcakes_qty: cupcakesQty,
      unit_price: price,
      total_amount: cupcakesQty * price,
      spins_granted: cupcakesQty >= 2 ? Math.floor(cupcakesQty / 2) : 0,
      admin_id: adminId || '00000000-0000-0000-0000-000000000001'
    }
  }

  const res = await fetch(`${API_BASE}/admin/purchases`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return handleApiResponse(res, 'Error al registrar la compra.')
}

export async function updateSystemConfigApi(params: {
  is_active?: boolean
  stock_limit?: number
  unit_price?: number
}): Promise<{ success: boolean; config: any }> {
  const res = await fetch(`${API_BASE}/admin/config`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  return handleApiResponse(res, 'Error al actualizar la configuración del sistema.')
}

export async function getPrizesApi(): Promise<{ prizes: Prize[] }> {
  const res = await fetch(`${API_BASE}/admin/prizes`)
  return handleApiResponse(res, 'Error al obtener promociones y premios.')
}

export async function createPrizeApi(params: {
  title: string
  description?: string
  producto_id?: string | null
  tier: Prize['tier']
  tipo_beneficio?: Prize['tipo_beneficio']
  precio_promocional?: number | null
  descuento_monto?: number | null
  piezas_amparadas?: number | null
  weight?: number
  badge_color?: string
}): Promise<{ success: boolean; prize: Prize }> {
  const res = await fetch(`${API_BASE}/admin/prizes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  return handleApiResponse(res, 'Error al crear la promoción.')
}

export async function updatePrizeApi(
  id: string,
  params: Partial<Omit<Prize, 'id' | 'created_at'>>
): Promise<{ success: boolean; prize: Prize }> {
  const res = await fetch(`${API_BASE}/admin/prizes/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  return handleApiResponse(res, 'Error al actualizar la promoción.')
}

export async function updatePrizeWeightApi(
  id: string,
  weight: number
): Promise<{ success: boolean; prize: Prize }> {
  const res = await fetch(`${API_BASE}/admin/prizes/${id}/weight`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ weight }),
  })
  return handleApiResponse(res, 'Error al actualizar la probabilidad.')
}

export async function deletePrizeApi(id: string): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}/admin/prizes/${id}`, {
    method: 'DELETE',
  })
  return handleApiResponse(res, 'Error al eliminar la promoción.')
}

export async function getCategoryWeightsApi(): Promise<{
  success: boolean
  weights: {
    sin_premio: number
    promocion: number
    alto_valor: number
  }
}> {
  const res = await fetch(`${API_BASE}/admin/prizes/category-weights`)
  return handleApiResponse(res, 'Error al consultar probabilidades por categoría.')
}

export async function updateCategoryWeightsApi(weights: {
  sin_premio: number
  promocion: number
  alto_valor: number
}): Promise<{
  success: boolean
  message: string
  weights: {
    sin_premio: number
    promocion: number
    alto_valor: number
  }
}> {
  const res = await fetch(`${API_BASE}/admin/prizes/category-weights`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(weights),
  })
  return handleApiResponse(res, 'Error al actualizar probabilidades por categoría.')
}

export async function grantSpinsApi(
  userId: string,
  spinsToAdd: number
): Promise<{
  success: boolean
  message: string
  spins_available: number
  user: any
}> {
  const res = await fetch(`${API_BASE}/admin/grant-spins`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, spins_to_add: spinsToAdd }),
  })
  return handleApiResponse(res, 'Error al modificar los tiros del cliente.')
}

export async function getAdminCouponsApi(): Promise<{
  success: boolean
  coupons: Coupon[]
}> {
  const res = await fetch(`${API_BASE}/admin/coupons`)
  return handleApiResponse(res, 'Error al consultar cupones de clientes.')
}


