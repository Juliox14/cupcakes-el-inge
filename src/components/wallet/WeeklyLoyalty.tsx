import React, { useState, useEffect } from 'react'
import { Sparkles, CheckCircle2 } from 'lucide-react'
import confetti from 'canvas-confetti'
import type { UserProfile } from '../../types'
import { claimWeeklyRewardApi } from '../../services'
import { toast } from '../../context/ToastContext'

interface WeeklyLoyaltyProps {
  userProfile: UserProfile
  onOpenGames: () => void
  onRewardClaimed?: () => void
}

function getYearWeekKey(): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 4 - (d.getDay() || 7))
  const yearStart = new Date(d.getFullYear(), 0, 1)
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  return `${d.getFullYear()}-W${weekNo}`
}

export const WeeklyLoyalty: React.FC<WeeklyLoyaltyProps> = ({
  userProfile,
  onOpenGames,
  onRewardClaimed,
}) => {
  const [claiming, setClaiming] = useState(false)

  const weekKey = getYearWeekKey()
  const storageKey = `inge_claimed_week_${userProfile.id}_${weekKey}`
  const [isClaimed, setIsClaimed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return Boolean(localStorage.getItem(storageKey))
  })

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = Boolean(localStorage.getItem(storageKey))
      setIsClaimed(prev => (prev !== stored ? stored : prev))
    }
  }, [userProfile.id, storageKey])

  const rawWeekly = userProfile.total_cupcakes_purchased % 5
  const currentWeeklyCupcakes = rawWeekly === 0 && userProfile.total_cupcakes_purchased > 0 ? 5 : rawWeekly
  const isGoalReached = userProfile.total_cupcakes_purchased >= 5 && currentWeeklyCupcakes === 5
  const cupcakesNeeded = 5 - currentWeeklyCupcakes

  const handleClaimReward = async () => {
    if (claiming || isClaimed || !isGoalReached) return
    setClaiming(true)

    try {
      if (userProfile.id !== 'guest') {
        await claimWeeklyRewardApi(userProfile.id)
      }

      confetti({
        particleCount: 90,
        spread: 70,
        origin: { y: 0.6 }
      })

      localStorage.setItem(storageKey, 'true')
      setIsClaimed(true)
      toast.success('¡Felicidades! Reclamaste tu tiro extra semanal 🧁✨')

      if (onRewardClaimed) {
        onRewardClaimed()
      }
    } catch (err: any) {
      console.error('Error al reclamar recompensa:', err)
      toast.error(err.message || 'Error al reclamar la recompensa.')
    } finally {
      setClaiming(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl p-5 text-center shadow-sm border border-gray-100 space-y-4">
      {/* 5 Cupcakes visuales */}
      <div className="flex items-center justify-center gap-3">
        {[1, 2, 3, 4, 5].map((slotIndex) => {
          const isEarned = isClaimed ? false : (slotIndex <= currentWeeklyCupcakes)
          return (
            <div key={slotIndex} className="w-12 h-12 flex items-center justify-center">
              <img
                src={isEarned ? '/cupcake-color.webp' : '/cupcake-gris.webp'}
                alt={isEarned ? "Sello completado" : "Sello pendiente"}
                width={36}
                height={36}
                decoding="async"
                className={`w-11 h-11 object-contain transition-all ${isEarned ? 'scale-105 filter drop-shadow-sm' : 'opacity-60'}`}
              />
            </div>
          )
        })}
      </div>

      {/* Textos dinámicos */}
      <div className="space-y-1">
        {isClaimed ? (
          <>
            <p className="text-xs text-[#2E7D32] font-bold leading-tight flex items-center justify-center gap-1">
              <CheckCircle2 size={14} className="text-[#2E7D32]" />
              ¡Muchas gracias por su preferencia!
            </p>
            <p className="text-[11px] text-gray-600 font-medium">
              Has alcanzado la recompensa de esta semana. El contador se reiniciará para la próxima semana 🥕✨
            </p>
          </>
        ) : isGoalReached ? (
          <>
            <p className="text-xs text-[#2E7D32] font-bold">
              ¡Felicidades! Completaste tus 5 cupcakes de la semana 🎉
            </p>
            <p className="text-[11px] text-gray-500">
              Presiona el botón verde para reclamar tu tirada extra de regalo.
            </p>
          </>
        ) : (
          <>
            <p className="text-xs text-gray-800 font-normal">
              ¡Llevas <strong className="font-bold">{currentWeeklyCupcakes} cupcake{currentWeeklyCupcakes === 1 ? '' : 's'}</strong> esta semana!
            </p>
            <p className="text-[11px] text-gray-500">
              Compra {cupcakesNeeded} más y obtén una tirada extra 🥕
            </p>
          </>
        )}
      </div>

      {/* Botón interactivo */}
      {isClaimed ? (
        <button
          disabled
          className="w-full max-w-xs py-2.5 px-6 rounded-xl bg-gray-100 border border-gray-200 text-gray-400 font-semibold text-xs cursor-not-allowed flex items-center justify-center gap-1.5 mx-auto"
        >
          ✓ Recompensa de la semana reclamada
        </button>
      ) : isGoalReached ? (
        <button
          onClick={handleClaimReward}
          disabled={claiming}
          className="w-full max-w-xs py-3 px-6 rounded-xl bg-[#2E7D32] hover:bg-[#1B5E20] text-white font-bold text-xs tracking-wide transition shadow-lg shadow-green-600/30 active:scale-98 animate-bounce flex items-center justify-center gap-2 mx-auto cursor-pointer"
        >
          <Sparkles size={16} className="text-yellow-300" />
          {claiming ? 'Acreditando tirada...' : '¡Reclamar +1 Tirada Gratis!'}
        </button>
      ) : (
        <button
          onClick={onOpenGames}
          className="w-full max-w-xs py-2.5 px-6 rounded-xl bg-[#333333] hover:bg-[#1E1E24] text-white font-medium text-xs tracking-wide transition shadow-md active:scale-98 mx-auto"
        >
          Reclamar recompensa
        </button>
      )}
    </div>
  )
}
