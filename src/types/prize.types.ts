export type TipoBeneficio = 'descuento_fijo' | 'precio_promocional' | 'producto_gratis' | 'sin_premio'

export interface Prize {
  id: string
  title: string
  description: string
  producto_id?: string | null
  producto_nombre?: string | null
  producto_precio?: number | null
  tier: 'tier_50_no_prize' | 'tier_40_promo' | 'tier_10_high_value'
  tipo_beneficio?: TipoBeneficio
  precio_promocional?: number | null
  descuento_monto?: number | null
  piezas_amparadas?: number | null
  weight: number
  badge_color?: string
  is_active: boolean
  created_at?: string
}
