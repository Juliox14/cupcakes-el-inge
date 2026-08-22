import React from 'react'
import { QrCode } from 'lucide-react'
import type { Coupon } from '../../types'

interface CouponCardProps {
  coupon: Coupon
  onSelect: (coupon: Coupon) => void
}

export const CouponCard: React.FC<CouponCardProps> = ({ coupon, onSelect }) => {
  const prizeTitle = coupon.prize?.title || (coupon as any).premio?.titulo || 'Cupón El Inge'
  const prizeDesc = coupon.prize?.description || (coupon as any).premio?.descripcion || 'Promoción especial de cupcakes'
  const badgeColor = coupon.prize?.badge_color || (coupon as any).premio?.color_distintivo || '#F56B2A'
  const isHighValue = coupon.prize?.tier === 'tier_10_high_value' || (coupon as any).premio?.categoria_nivel === 'alto_valor'

  return (
    <div
      onClick={() => onSelect(coupon)}
      className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm hover:border-[#F56B2A] transition cursor-pointer flex flex-col justify-between min-h-[130px] space-y-2 relative overflow-hidden group"
    >
      <div className="space-y-1">
        <span
          className="inline-block text-[9px] font-bold px-1.5 py-0.5 rounded text-white"
          style={{ backgroundColor: badgeColor }}
        >
          {isHighValue ? 'Alto Valor' : 'Promo'}
        </span>
        <h4 className="font-bold text-xs text-gray-900 leading-tight group-hover:text-[#F56B2A] transition">
          {prizeTitle}
        </h4>
        <p className="text-[10px] text-gray-500 leading-normal">
          {prizeDesc}
        </p>
      </div>

      <div className="flex items-center justify-between pt-1.5 border-t border-gray-100 text-[10px] text-gray-400 shrink-0">
        <span className="font-mono font-semibold text-gray-600 text-[9px]">{coupon.code || (coupon as any).codigo}</span>
        <QrCode size={14} className="text-[#F56B2A] shrink-0 group-hover:scale-110 transition" />
      </div>
    </div>
  )
}
