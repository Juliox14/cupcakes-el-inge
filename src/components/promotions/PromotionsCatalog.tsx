import React from 'react'
import type { Prize } from '../../types'

interface PromotionsCatalogProps {
  prizes: Prize[]
  onOpenGames: () => void
}

export const PromotionsCatalog: React.FC<PromotionsCatalogProps> = ({
  prizes,
  onOpenGames,
}) => {
  const activePrizes = prizes.filter(p => p.is_active && p.tier !== 'tier_50_no_prize')

  return (
    <div className="p-4 space-y-4 max-w-md mx-auto animate-fade-in pb-24">
      <div className="text-center py-3">
        <h2 className="font-heading font-black text-2xl text-gray-900">
          Promociones y Recompensas 🥕
        </h2>
        <p className="text-xs text-gray-500">
          Gana cupones jugando a la ruleta o en tu compra semanal de cupcakes
        </p>
      </div>

      <div className="space-y-3">
        {activePrizes.map((prize) => (
          <div 
            key={prize.id} 
            className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm flex items-center justify-between gap-3 hover:border-orange-300 transition"
          >
            <div className="space-y-1">
              <span 
                className="inline-block text-[10px] font-bold px-2 py-0.5 rounded text-white"
                style={{ backgroundColor: prize.badge_color || '#F56B2A' }}
              >
                {prize.tier === 'tier_10_high_value' ? 'Premio Especial' : 'Promoción'}
              </span>
              <h3 className="font-bold text-sm text-gray-900">{prize.title}</h3>
              <p className="text-xs text-gray-500">{prize.description}</p>
            </div>
            <button
              onClick={onOpenGames}
              className="px-3 py-1.5 rounded-xl bg-orange-100 hover:bg-orange-200 text-[#F56B2A] font-bold text-xs shrink-0 transition"
            >
              ¡Ganar!
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
