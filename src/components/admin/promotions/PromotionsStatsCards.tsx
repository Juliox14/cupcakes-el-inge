import React from 'react'
import { HelpCircle, Tag, Gift } from 'lucide-react'

interface PromotionsStatsCardsProps {
  activePrizesCount: {
    tier_50_no_prize: number
    tier_40_promo: number
    tier_10_high_value: number
  }
  categoryWeights: {
    sin_premio: number
    promocion: number
    alto_valor: number
  }
}

export const PromotionsStatsCards: React.FC<PromotionsStatsCardsProps> = ({
  activePrizesCount,
  categoryWeights,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Categoría: Sin Premio */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-gray-100 text-gray-600">
            <HelpCircle size={20} />
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Sin Premio</span>
            <strong className="text-gray-900 text-sm font-bold">
              {activePrizesCount.tier_50_no_prize} {activePrizesCount.tier_50_no_prize === 1 ? 'opción' : 'opciones'}
            </strong>
            <span className="text-[11px] text-gray-500 block">
              {activePrizesCount.tier_50_no_prize > 0 
                ? `~${Math.round((categoryWeights.sin_premio / activePrizesCount.tier_50_no_prize) * 10) / 10}% por opción`
                : 'Sin opciones activas'}
            </span>
          </div>
        </div>
        <div className="text-right">
          <span className="text-xl font-black text-gray-800 font-mono">{categoryWeights.sin_premio}%</span>
          <span className="text-[10px] text-gray-400 block">Total Cat.</span>
        </div>
      </div>

      {/* Categoría: Promociones & Descuentos */}
      <div className="bg-white p-4 rounded-xl border border-orange-200 bg-orange-50/20 shadow-2xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-orange-100 text-[#F56B2A]">
            <Tag size={20} />
          </div>
          <div>
            <span className="text-[10px] font-bold text-orange-800 uppercase tracking-wider block">Promociones & Descuentos</span>
            <strong className="text-gray-900 text-sm font-bold">
              {activePrizesCount.tier_40_promo} {activePrizesCount.tier_40_promo === 1 ? 'promoción' : 'promociones'}
            </strong>
            <span className="text-[11px] text-gray-500 block">
              {activePrizesCount.tier_40_promo > 0 
                ? `~${Math.round((categoryWeights.promocion / activePrizesCount.tier_40_promo) * 10) / 10}% c/u`
                : 'Sin promociones activas'}
            </span>
          </div>
        </div>
        <div className="text-right">
          <span className="text-xl font-black text-[#F56B2A] font-mono">{categoryWeights.promocion}%</span>
          <span className="text-[10px] text-orange-600 block">Total Cat.</span>
        </div>
      </div>

      {/* Categoría: Alto Valor / Gratis */}
      <div className="bg-white p-4 rounded-xl border border-red-200 bg-red-50/20 shadow-2xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-red-100 text-red-600">
            <Gift size={20} />
          </div>
          <div>
            <span className="text-[10px] font-bold text-red-800 uppercase tracking-wider block">Alto Valor (Gratis)</span>
            <strong className="text-gray-900 text-sm font-bold">
              {activePrizesCount.tier_10_high_value} {activePrizesCount.tier_10_high_value === 1 ? 'premio' : 'premios'}
            </strong>
            <span className="text-[11px] text-gray-500 block">
              {activePrizesCount.tier_10_high_value > 0 
                ? `~${Math.round((categoryWeights.alto_valor / activePrizesCount.tier_10_high_value) * 10) / 10}% c/u`
                : 'Sin premios activos'}
            </span>
          </div>
        </div>
        <div className="text-right">
          <span className="text-xl font-black text-red-600 font-mono">{categoryWeights.alto_valor}%</span>
          <span className="text-[10px] text-red-500 block">Total Cat.</span>
        </div>
      </div>
    </div>
  )
}
