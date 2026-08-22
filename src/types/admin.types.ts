export interface AdminMetrics {
  active_campaign?: boolean
  games_enabled?: boolean
  remaining_stock?: number
  current_stock?: number
  daily_production_limit?: number
  total_sales?: number
  total_users?: number
  cupcakes_sold?: number
  total_cupcakes_sold?: number
  weekly_cupcakes_sold?: number
  weekly_revenue_mxn?: number
  total_revenue_mxn?: number
  active_coupons?: number
  total_coupons_issued?: number
  total_coupons_redeemed?: number
  conversion_rate?: number
  redemption_rate?: number
  unit_price?: number
  weekly_breakdown?: Array<{ day: string; cupcakes: number; revenue: number }>
  recent_purchases?: Array<{
    id: string
    created_at: string
    user_id?: string
    client_name?: string
    cupcakes_qty?: number
    cantidad_cupcakes?: number
    total_amount?: number
    monto_total?: number
    spins_granted?: number
    tiros_otorgados?: number
  }>
}
