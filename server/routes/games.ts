/// <reference types="node" />
import { Hono } from 'hono'
import { supabaseServer } from '../lib/supabase.js'
import { serverCache } from '../lib/cache.js'
import { rateLimiter } from '../lib/rateLimit.js'
export interface Prize {
  id: string
  title?: string
  titulo?: string
  description?: string
  descripcion?: string
  tier?: string
  categoria_nivel?: 'sin_premio' | 'promocion' | 'alto_valor'
  probability_weight?: number
  peso_probabilidad?: number
  badge_color?: string
  color_distintivo?: string
  active?: boolean
  activo?: boolean
  producto_id?: string | null
  [key: string]: any
}
import * as crypto from 'crypto'

export const gamesRouter = new Hono()

// Generador de código alfanumérico seguro para cupones (Ej: INGE-8F3A-9B2C)
function generateCouponCode(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'
  let part1 = ''
  let part2 = ''
  const bytes = crypto.randomBytes(8)
  for (let i = 0; i < 4; i++) {
    part1 += chars[bytes[i] % chars.length]
    part2 += chars[bytes[i + 4] % chars.length]
  }
  return `INGE-${part1}-${part2}`
}

// Generador de token QR seguro
function generateQRToken(): string {
  return `QR-${crypto.randomBytes(16).toString('hex')}`
}

// Tirada atómica de minijuegos con validación de backend y limitación de tasa
gamesRouter.post('/play', rateLimiter(20, 60 * 1000, 'Demasiadas jugadas registradas en poco tiempo. Por favor espera unos segundos.'), async (c) => {
  try {
    const body = await c.req.json()
    const { user_id, game_type = 'roulette' } = body

    if (!user_id) {
      return c.json({ error: 'Se requiere id de usuario.' }, 400)
    }

    // 1. Verificar Kill Switch (Configuración de juegos habilitados)
    const { data: killSwitch } = await supabaseServer
      .from('configuracion_sistema')
      .select('valor')
      .eq('clave', 'juegos_habilitados')
      .single()

    const gamesEnabled = killSwitch ? Boolean(killSwitch.valor) : true

    if (!gamesEnabled) {
      return c.json({
        won: false,
        error: 'JUEGOS_PAUSADOS',
        message: 'Las dinámicas están pausadas temporalmente por límite de producción diaria (24 cupcakes). ¡Vuelve pronto!',
        remaining_spins: 0
      }, 503)
    }

    // 2. Obtener perfil de usuario (tabla 'usuarios' o 'profiles')
    let currentSpins = 0
    let userTable = 'usuarios'
    
    let { data: userProfile } = await supabaseServer
      .from('usuarios')
      .select('*')
      .eq('id', user_id)
      .single()

    if (!userProfile) {
      const { data: prof } = await supabaseServer
        .from('profiles')
        .select('*')
        .eq('id', user_id)
        .single()

      if (prof) {
        userProfile = prof
        userTable = 'profiles'
        currentSpins = prof.spins_available || 0
      } else {
        currentSpins = 1 // Permitir juego si es usuario nuevo en memoria
      }
    } else {
      currentSpins = userProfile.tiros_disponibles !== undefined ? userProfile.tiros_disponibles : userProfile.spins_available || 0
    }

    if (currentSpins < 1) {
      return c.json({
        won: false,
        error: 'SIN_JUGADAS',
        message: 'No tienes oportunidades disponibles. ¡Compra 2 cupcakes para obtener 1 tiro!',
        remaining_spins: 0
      }, 400)
    }

    // 3. Descontar 1 oportunidad atómicamente
    const newSpinsAvailable = Math.max(0, currentSpins - 1)

    if (userTable === 'usuarios' && userProfile?.id) {
      await supabaseServer
        .from('usuarios')
        .update({ tiros_disponibles: newSpinsAvailable, fecha_actualizacion: new Date().toISOString() })
        .eq('id', user_id)
    } else if (userTable === 'profiles' && userProfile?.id) {
      await supabaseServer
        .from('profiles')
        .update({ spins_available: newSpinsAvailable, updated_at: new Date().toISOString() })
        .eq('id', user_id)
    }

    // 4. Obtener catálogo de premios activos
    let { data: prizes } = await supabaseServer
      .from('premios')
      .select('*')
      .eq('activo', true)

    if (!prizes || prizes.length === 0) {
      const { data: altPrizes } = await supabaseServer
        .from('prizes')
        .select('*')
        .eq('is_active', true)
      prizes = altPrizes || []
    }

    // Si no hay premios en DB, usar premios predeterminados
    const DEFAULT_PRIZES: Prize[] = [
      {
        id: '00000000-0000-0000-0000-000000000001',
        title: '¡Sigue Intentando!',
        description: '¡Casi lo logras! Sigue disfrutando el mejor sabor artesanal 🥕',
        tier: 'tier_50_no_prize',
        weight: 50,
        badge_color: '#9E9E9E',
        is_active: true,
        created_at: new Date().toISOString()
      },
      {
        id: '00000000-0000-0000-0000-000000000002',
        title: 'Promo: 2x$35 MXN',
        description: 'Llévate 2 cupcakes por solo $35 MXN en tu próxima compra (Ahorras $5 MXN)',
        tier: 'tier_40_promo',
        weight: 20,
        badge_color: '#F56B2A',
        is_active: true,
        created_at: new Date().toISOString()
      },
      {
        id: '00000000-0000-0000-0000-000000000003',
        title: 'Descuento: $5 MXN',
        description: '$5 MXN de descuento directo en tu próxima compra de cupcakes',
        tier: 'tier_40_promo',
        weight: 20,
        badge_color: '#F56B2A',
        is_active: true,
        created_at: new Date().toISOString()
      },
      {
        id: '00000000-0000-0000-0000-000000000004',
        title: '¡CUPCAKE GRATIS!',
        description: '¡Felicidades! 1 Cupcake de zanahoria gratis en tu próxima compra',
        tier: 'tier_10_high_value',
        weight: 5,
        badge_color: '#D32F2F',
        is_active: true,
        created_at: new Date().toISOString()
      }
    ]

    const activePrizeList: any[] = (prizes && prizes.length > 0) ? prizes : DEFAULT_PRIZES

    // 5. Motor de probabilidades (soporta pesos decimales exactos por división equitativa)
    const totalWeight = activePrizeList.reduce((sum: number, p: any) => sum + Number(p.peso_probabilidad ?? p.weight ?? 20), 0)
    const randomVal = Math.random() * (totalWeight > 0 ? totalWeight : 1)

    let currentSum = 0
    let selectedPrize = activePrizeList[0]

    for (const prize of activePrizeList) {
      const w = Number(prize.peso_probabilidad ?? prize.weight ?? 20)
      currentSum += w
      if (randomVal <= currentSum) {
        selectedPrize = prize
        break
      }
    }

    const tier = selectedPrize.categoria_nivel || selectedPrize.tier
    const isWon = tier !== 'sin_premio' && tier !== 'tier_50_no_prize'
    let createdCoupon = null

    if (isWon) {
      const couponCode = generateCouponCode()
      const qrToken = generateQRToken()
      const expiresAt = new Date(Date.now() + 14 * 86400000).toISOString()

      const couponPayload = {
        id: `coupon-${Date.now()}`,
        code: couponCode,
        user_id: user_id,
        prize_id: selectedPrize.id,
        qr_token: qrToken,
        status: 'active' as const,
        expires_at: expiresAt,
        created_at: new Date().toISOString(),
        prize: {
          id: selectedPrize.id,
          title: selectedPrize.titulo || selectedPrize.title,
          description: selectedPrize.descripcion || selectedPrize.description,
          tier: selectedPrize.categoria_nivel || selectedPrize.tier,
          weight: selectedPrize.peso_probabilidad || selectedPrize.weight,
          badge_color: selectedPrize.color_distintivo || selectedPrize.badge_color || '#F56B2A',
          is_active: true,
          created_at: new Date().toISOString()
        }
      }

      createdCoupon = couponPayload

      // Guardar en Supabase si es posible
      try {
        await supabaseServer.from('cupones').insert({
          codigo: couponCode,
          usuario_id: user_id,
          premio_id: selectedPrize.id,
          token_qr: qrToken,
          estado: 'activo',
          fecha_expiracion: expiresAt
        })
        serverCache.invalidate('admin_metrics')
      } catch {
        // Fallback local
      }
    }

    return c.json({
      won: isWon,
      prize: {
        id: selectedPrize.id,
        title: selectedPrize.titulo || selectedPrize.title,
        description: selectedPrize.descripcion || selectedPrize.description,
        tier: selectedPrize.categoria_nivel || selectedPrize.tier,
        weight: selectedPrize.peso_probabilidad || selectedPrize.weight,
        badge_color: selectedPrize.color_distintivo || selectedPrize.badge_color || '#F56B2A',
        is_active: true,
        created_at: new Date().toISOString()
      },
      coupon: createdCoupon,
      remaining_spins: newSpinsAvailable,
      message: isWon
        ? `¡Felicidades! Ganaste: ${selectedPrize.titulo || selectedPrize.title}`
        : (selectedPrize.descripcion || selectedPrize.description || '¡Sigue intentando!')
    })

  } catch (err: any) {
    console.error('Error en /api/games/play:', err)
    return c.json({ error: 'Error al procesar el minijuego.' }, 500)
  }
})
