import React from 'react'
import type { RouletteResultState } from './Roulette.types'

const RESULT_COLORS: Record<string, string> = {
  gift:  '#c0460e',
  promo: '#2A6E4E',
  disc:  '#2A6E4E',
  none:  '#7155C8',
}

interface RouletteResultCardProps {
  result: RouletteResultState
}

export const RouletteResultCard: React.FC<RouletteResultCardProps> = ({ result }) => {
  return (
    <div className="roulette-result-card animate-fade-in">
      <div className="roulette-result-emoji">
        {result.isWon ? `${result.slice.emoji} 🎉` : `${result.slice.emoji} 🥕`}
      </div>

      <p style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#9e9e9e', margin: '0' }}>
        Tu resultado
      </p>

      <h3
        className="roulette-result-title"
        style={{ color: RESULT_COLORS[result.slice.type] || (result.isWon ? '#F56B2A' : '#7155C8') }}
      >
        {result.apiResult?.prize?.title || result.slice.text}
      </h3>

      <p className="roulette-result-desc">
        {result.isWon
          ? '¡Felicidades! Muestra tu código QR en caja al pagar para canjear tu premio.'
          : '¡Buen intento! Sigue acumulando cupcakes con cada compra para obtener más oportunidades 🥕✨'}
      </p>

      {/* Código de Cupón SOLO si realmente ganó */}
      {result.isWon && result.apiResult?.coupon && (
        <div className="roulette-result-code">
          Código: {result.apiResult.coupon.code}
        </div>
      )}
    </div>
  )
}
