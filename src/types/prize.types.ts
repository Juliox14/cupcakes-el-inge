export interface Prize {
  id: string
  title: string
  description: string
  producto_id?: string | null
  producto_nombre?: string | null
  tier: 'tier_50_no_prize' | 'tier_40_promo' | 'tier_10_high_value'
  weight: number
  badge_color?: string
  is_active: boolean
  created_at?: string
}
