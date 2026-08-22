import { useState, useCallback, useEffect } from 'react'
import type { UserProfile, Prize, Coupon, PlayGameResult } from '../types'
import { 
  getAllClientsApi, 
  getPrizesApi, 
  checkAuthMeApi, 
  playGameApi 
} from '../services'

export function useAppData(
  currentUser: UserProfile,
  setCurrentUser: React.Dispatch<React.SetStateAction<UserProfile>>
) {
  const [allUsers, setAllUsers] = useState<UserProfile[]>([])
  const [prizes, setPrizes] = useState<Prize[]>([])
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Sincronizar catálogo, clientes y sesión activa desde Supabase
  const refreshAppData = useCallback(async () => {
    try {
      const [uRes, pRes, meRes] = await Promise.allSettled([
        getAllClientsApi(),
        getPrizesApi(),
        checkAuthMeApi()
      ])

      // 1. Sincronizar sesión activa por cookie JWT si existe
      if (meRes.status === 'fulfilled' && meRes.value.authenticated && meRes.value.user) {
        setCurrentUser(prev => ({ ...prev, ...meRes.value.user }))
        if (meRes.value.coupons) {
          setCoupons(meRes.value.coupons)
        }
      }

      // 2. Cargar clientes de Supabase y refrescar usuario activo
      if (uRes.status === 'fulfilled' && uRes.value.users) {
        setAllUsers(uRes.value.users)
        setCurrentUser(prev => {
          if (prev.id === 'guest') return prev
          const matching = uRes.value.users.find((u: any) => u.id === prev.id || (u.phone && u.phone === prev.phone))
          return matching ? { ...prev, ...matching } : prev
        })
      }

      // 3. Cargar catálogo de premios de Supabase
      if (pRes.status === 'fulfilled' && pRes.value.prizes) {
        setPrizes(pRes.value.prizes)
      }
    } catch (err) {
      console.error('Error al sincronizar con Supabase:', err)
    } finally {
      setIsLoading(false)
    }
  }, [setCurrentUser])

  useEffect(() => {
    refreshAppData()
  }, [refreshAppData])

  // Ejecutar tirada de ruleta o juego
  const handlePlayGame = useCallback(async (
    gameType: 'roulette' | 'scratch' | 'slots'
  ): Promise<PlayGameResult> => {
    // Reducción optimista inmediata en UI
    setCurrentUser(prev => ({
      ...prev,
      spins_available: Math.max(0, prev.spins_available - 1)
    }))

    try {
      const res = await playGameApi(currentUser.id, gameType)
      if (res.won && res.coupon) {
        setCoupons(prev => {
          const exists = prev.some(c => c.id === res.coupon!.id || c.code === res.coupon!.code)
          return exists ? prev : [res.coupon!, ...prev]
        })
      }
      return res
    } catch (err) {
      // Fallback local en caso de error de red
      const activePrizes = prizes.filter(p => p.is_active)
      const prize = activePrizes[0] || {
        id: 'local-fallback',
        title: '¡Sigue intentando!',
        description: 'Sigue participando',
        tier: 'tier_50_no_prize' as const,
        weight: 50,
        is_active: true
      }
      return {
        won: false,
        prize,
        remaining_spins: Math.max(0, currentUser.spins_available - 1),
        message: '¡Buen intento! Gracias por participar'
      }
    }
  }, [currentUser.id, currentUser.spins_available, prizes, setCurrentUser])

  const handleAuthSuccess = useCallback((user: UserProfile, newCoupons?: Coupon[]) => {
    setCurrentUser(user)
    if (newCoupons) {
      setCoupons(newCoupons)
    }
    refreshAppData()
  }, [setCurrentUser, refreshAppData])

  return {
    allUsers,
    prizes,
    coupons,
    isLoading,
    refreshAppData,
    handlePlayGame,
    handleAuthSuccess,
  }
}
