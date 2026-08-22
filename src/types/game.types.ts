import type { Prize } from './prize.types'
import type { Coupon } from './coupon.types'

export interface PlayGameResult {
  won: boolean
  prize: Prize
  coupon?: Coupon
  remaining_spins: number
  message: string
}
