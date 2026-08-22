import { Hono } from 'hono'
import { supabaseServer } from '../lib/supabase.js'
import { serverCache } from '../lib/cache.js'
import { requireAdmin } from '../lib/authMiddleware.js'

export const adminRouter = new Hono()

// Middleware de seguridad: Exigir rol de Administrador en todos los endpoints de admin
adminRouter.use('*', requireAdmin)

// Métrica global del Dashboard de Administración (con caché en memoria e invalidación por eventos)
adminRouter.get('/metrics', async (c) => {
  try {
    const cachedMetrics = serverCache.get<any>('admin_metrics')
    if (cachedMetrics) {
      return c.json({ metrics: cachedMetrics, cached: true })
    }

    // Ejecutar todas las consultas independientes concurrentemente en paralelo
    const [
      usersCountRes,
      couponsIssuedRes,
      couponsRedeemedRes,
      purchasesRes,
      settingsRes
    ] = await Promise.all([
      supabaseServer.from('usuarios').select('id', { count: 'exact' }).eq('rol', 'cliente'),
      supabaseServer.from('cupones').select('id', { count: 'exact' }),
      supabaseServer.from('cupones').select('id', { count: 'exact' }).eq('estado', 'canjeado'),
      supabaseServer.from('compras').select(`
        id,
        usuario_id,
        nombre_cliente,
        cantidad_cupcakes,
        monto_total,
        tiros_otorgados,
        registrado_por,
        fecha_creacion,
        usuarios:usuario_id (
          nombre_completo,
          telefono
        )
      `).order('fecha_creacion', { ascending: false }),
      supabaseServer.from('configuracion_sistema').select('*')
    ])

    const totalUsers = usersCountRes.count || 0
    const totalCouponsIssued = couponsIssuedRes.count || 0
    const totalCouponsRedeemed = couponsRedeemedRes.count || 0
    const purchases = purchasesRes.data || []
    const settings = settingsRes.data || []

    const totalCupcakesSold = purchases.reduce((acc, curr) => acc + (curr.cantidad_cupcakes || 0), 0)
    const totalRevenueMXN = purchases.reduce((acc, curr) => acc + Number(curr.monto_total || 0), 0)

    const settingsMap = new Map(settings.map(s => [s.clave, s.valor]))

    const gamesEnabled = settingsMap.has('juegos_habilitados') ? Boolean(settingsMap.get('juegos_habilitados')) : true
    const dailyLimit = Number(
      settingsMap.get('limite_produccion_diario') ?? 
      settingsMap.get('limite_produccion_diaria') ?? 
      24
    )
    const currentStock = settingsMap.has('stock_actual') ? Number(settingsMap.get('stock_actual')) : 24

    const redemptionRate = totalCouponsIssued && totalCouponsIssued > 0
      ? Math.round(((totalCouponsRedeemed || 0) / totalCouponsIssued) * 100)
      : 0

    // Cálculo de Ventas Semanales (Últimos 7 días / Días de la semana)
    const now = new Date()
    const daysOfWeek = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
    const weeklyBreakdown = []
    let weeklyCupcakesSold = 0
    let weeklyRevenueMxn = 0

    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(now.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      const dayName = daysOfWeek[d.getDay()]

      const dayPurchases = (purchases || []).filter(p => (p.fecha_creacion || '').startsWith(dateStr))
      const dayCupcakes = dayPurchases.reduce((sum, p) => sum + (p.cantidad_cupcakes || 0), 0)
      const dayRevenue = dayPurchases.reduce((sum, p) => sum + Number(p.monto_total || 0), 0)
      
      const regCupcakes = dayPurchases
        .filter(p => p.usuario_id && p.usuario_id !== 'anonymous' && p.usuario_id !== 'unregistered')
        .reduce((sum, p) => sum + (p.cantidad_cupcakes || 0), 0)

      const unregCupcakes = dayPurchases
        .filter(p => !p.usuario_id || p.usuario_id === 'anonymous' || p.usuario_id === 'unregistered')
        .reduce((sum, p) => sum + (p.cantidad_cupcakes || 0), 0)

      weeklyCupcakesSold += dayCupcakes
      weeklyRevenueMxn += dayRevenue

      weeklyBreakdown.push({
        day: dateStr,
        label: `${dayName} ${d.getDate()}/${d.getMonth() + 1}`,
        cupcakes: dayCupcakes,
        revenue: dayRevenue,
        registered_cupcakes: regCupcakes,
        unregistered_cupcakes: unregCupcakes,
      })
    }

    // Normalizar y formatear las últimas transacciones para la vista de métricas
    const recentPurchases = (purchases || []).slice(0, 30).map((p: any) => {
      const isAnon = !p.usuario_id || p.usuario_id === 'anonymous' || p.usuario_id === 'unregistered'
      const clientName = p.usuarios?.nombre_completo || p.nombre_cliente || (isAnon ? 'Venta Directa' : 'Cliente Registrado')
      const clientPhone = p.usuarios?.telefono || ''
      const cupcakesQty = p.cantidad_cupcakes || 0
      const totalAmount = Number(p.monto_total || cupcakesQty * 20)
      const spinsGranted = p.tiros_otorgados ?? (isAnon ? 0 : Math.floor(cupcakesQty / 2))
      const createdAt = p.fecha_creacion || new Date().toISOString()

      return {
        id: p.id,
        created_at: createdAt,
        fecha_creacion: createdAt,
        user_id: p.usuario_id,
        usuario_id: p.usuario_id,
        is_anonymous: isAnon,
        customer_name: clientName,
        nombre_cliente: clientName,
        customer_phone: clientPhone,
        cupcakes_qty: cupcakesQty,
        cantidad_cupcakes: cupcakesQty,
        total_amount: totalAmount,
        monto_total: totalAmount,
        spins_granted: spinsGranted,
        tiros_otorgados: spinsGranted,
        registrado_por: p.registrado_por,
      }
    })

    const metricsResult = {
      total_users: totalUsers || 0,
      total_coupons_issued: totalCouponsIssued || 0,
      total_coupons_redeemed: totalCouponsRedeemed || 0,
      redemption_rate: redemptionRate,
      total_cupcakes_sold: totalCupcakesSold,
      total_revenue_mxn: totalRevenueMXN,
      games_enabled: gamesEnabled,
      daily_production_limit: dailyLimit,
      current_stock: currentStock,
      weekly_cupcakes_sold: weeklyCupcakesSold,
      weekly_revenue_mxn: weeklyRevenueMxn,
      weekly_breakdown: weeklyBreakdown,
      recent_purchases: recentPurchases
    }

    serverCache.set('admin_metrics', metricsResult, 60)

    return c.json({
      metrics: metricsResult
    })

  } catch (err: any) {
    console.error('Error al obtener métricas de admin:', err)
    return c.json({ error: 'Error al consultar métricas administrativas.' }, 500)
  }
})

// Ajustar o Reabastecer Stock de Cupcakes Disponibles
adminRouter.post('/settings/stock', async (c) => {
  try {
    const { stock } = await c.req.json()

    if (stock === undefined || Number(stock) < 0) {
      return c.json({ error: 'Cantidad de stock inválida.' }, 400)
    }

    serverCache.invalidate('admin_metrics')

    const { error } = await supabaseServer
      .from('configuracion_sistema')
      .upsert({
        clave: 'stock_actual',
        valor: Number(stock),
        fecha_actualizacion: new Date().toISOString()
      })

    if (error) {
      return c.json({ error: 'Error al guardar el stock.' }, 500)
    }

    return c.json({ success: true, current_stock: Number(stock) })
  } catch (err: any) {
    return c.json({ error: 'Error al actualizar el stock.' }, 500)
  }
})

// Actualizar configuración unificada del sistema (/config)
const handleConfigUpdate = async (c: any) => {
  try {
    const body = await c.req.json()
    const { is_active, stock_limit, unit_price, daily_limit, key, value } = body
    const updates = []

    serverCache.invalidate('admin_metrics')

    if (key && value !== undefined) {
      updates.push(
        supabaseServer.from('configuracion_sistema').upsert({
          clave: key,
          valor: value,
          fecha_actualizacion: new Date().toISOString()
        })
      )
    }

    if (is_active !== undefined) {
      updates.push(
        supabaseServer.from('configuracion_sistema').upsert({
          clave: 'juegos_habilitados',
          valor: Boolean(is_active),
          fecha_actualizacion: new Date().toISOString()
        })
      )
    }

    if (stock_limit !== undefined) {
      updates.push(
        supabaseServer.from('configuracion_sistema').upsert({
          clave: 'stock_actual',
          valor: Number(stock_limit),
          fecha_actualizacion: new Date().toISOString()
        })
      )
    }

    if (daily_limit !== undefined) {
      updates.push(
        supabaseServer.from('configuracion_sistema').upsert({
          clave: 'limite_produccion_diario',
          valor: Number(daily_limit),
          fecha_actualizacion: new Date().toISOString()
        })
      )
    }

    if (unit_price !== undefined) {
      updates.push(
        supabaseServer.from('configuracion_sistema').upsert({
          clave: 'precio_venta_cupcake',
          valor: Number(unit_price),
          fecha_actualizacion: new Date().toISOString()
        })
      )
    }

    await Promise.all(updates)
    return c.json({ success: true, message: 'Configuración actualizada correctamente.' })
  } catch (err: any) {
    console.error('Error al actualizar configuración:', err)
    return c.json({ error: 'Error al actualizar configuración.' }, 500)
  }
}

adminRouter.put('/config', handleConfigUpdate)
adminRouter.post('/config', handleConfigUpdate)

// Manejador centralizado para registrar compras de clientes y mostrador
const handleRegisterPurchase = async (c: any) => {
  try {
    const body = await c.req.json()
    const user_id = body.user_id || body.usuario_id
    let client_name = body.client_name || body.customer_name || body.nombre_cliente
    const cupcakes_qty = Number(body.cupcakes_qty || body.cantidad_cupcakes || 1)
    const unit_price = Number(body.unit_price || 20.00)
    const total_amount = Number(body.total_amount || body.monto_total || cupcakes_qty * unit_price)
    const admin_id = body.admin_id

    const qty = Number(cupcakes_qty)
    if (!qty || qty <= 0) {
      return c.json({ error: 'Se requiere una cantidad válida de cupcakes.' }, 400)
    }

    serverCache.invalidate('admin_metrics')

    const isAnonymous = !user_id || user_id === 'anonymous' || user_id === 'unregistered'
    const spinsGranted = body.spins_granted !== undefined 
      ? Number(body.spins_granted) 
      : (isAnonymous ? 0 : Math.floor(qty / 2))

    // Si es cliente registrado y no tenemos su nombre, consultarlo
    let updatedProfile = null
    if (!isAnonymous && user_id) {
      const { data: profile } = await supabaseServer
        .from('usuarios')
        .select('nombre_completo, tiros_disponibles, total_cupcakes_comprados')
        .eq('id', user_id)
        .single()

      if (profile) {
        if (!client_name || client_name === 'Cliente' || client_name === 'Cliente Registrado') {
          client_name = profile.nombre_completo
        }
        const currentSpins = profile.tiros_disponibles || 0
        const currentCupcakes = profile.total_cupcakes_comprados || 0

        const { data: updated } = await supabaseServer
          .from('usuarios')
          .update({
            tiros_disponibles: currentSpins + spinsGranted,
            total_cupcakes_comprados: currentCupcakes + qty,
            fecha_actualizacion: new Date().toISOString()
          })
          .eq('id', user_id)
          .select()
          .single()

        updatedProfile = updated
      }
    }

    const finalClientName = isAnonymous 
      ? (client_name || 'Venta Directa') 
      : (client_name || 'Cliente Registrado')

    const producto_id = body.producto_id || body.productId

    // 1. Insertar registro de compra en tabla 'compras'
    const { data: purchaseData, error: purchaseError } = await supabaseServer
      .from('compras')
      .insert({
        usuario_id: isAnonymous ? null : user_id,
        nombre_cliente: finalClientName,
        producto_id: producto_id || null,
        cantidad: qty,
        cantidad_cupcakes: qty,
        monto_total: total_amount,
        tiros_otorgados: spinsGranted,
        registrado_por: admin_id && admin_id.length === 36 ? admin_id : null
      })
      .select()
      .single()

    if (purchaseError) {
      console.error('Error insertando compra en Supabase:', purchaseError)
    }

    // 2. Descontar del stock disponible en configuracion_sistema
    const { data: stockSetting } = await supabaseServer
      .from('configuracion_sistema')
      .select('valor')
      .eq('clave', 'stock_actual')
      .single()

    const prevStock = stockSetting ? Number(stockSetting.valor) : 24
    const newStock = Math.max(0, prevStock - qty)

    await supabaseServer
      .from('configuracion_sistema')
      .upsert({
        clave: 'stock_actual',
        valor: newStock,
        fecha_actualizacion: new Date().toISOString()
      })

    return c.json({
      success: true,
      purchase: purchaseData,
      is_anonymous: isAnonymous,
      spins_granted: spinsGranted,
      total_spins: updatedProfile?.tiros_disponibles || 0,
      total_amount: total_amount,
      current_stock: newStock,
      message: isAnonymous
        ? `Venta directa de ${qty} cupcake(s) ($${total_amount} MXN) registrada. Stock restante: ${newStock} pcs.`
        : `Compra de ${qty} cupcake(s) registrada a ${finalClientName}. +${spinsGranted} jugada(s) acreditada(s).`
    })

  } catch (err: any) {
    console.error('Error al registrar compra:', err)
    return c.json({ error: 'Error al procesar el registro de compra.' }, 500)
  }
}

// Montar en ambos endpoints para total retrocompatibilidad
adminRouter.post('/register-purchase', handleRegisterPurchase)
adminRouter.post('/purchases', handleRegisterPurchase)

// Ajustar pesos de probabilidad de premios
adminRouter.post('/update-prize-weight', async (c) => {
  try {
    const { prize_id, weight, is_active } = await c.req.json()

    if (!prize_id) {
      return c.json({ error: 'Se requiere ID del premio.' }, 400)
    }

    const updates: any = {}
    if (weight !== undefined) updates.peso_probabilidad = Number(weight)
    if (is_active !== undefined) updates.activo = Boolean(is_active)

    const { data, error } = await supabaseServer
      .from('premios')
      .update(updates)
      .eq('id', prize_id)
      .select()
      .single()

    if (error) {
      return c.json({ error: 'Error al actualizar el premio.' }, 500)
    }

    return c.json({ success: true, prize: data })
  } catch (err: any) {
    return c.json({ error: 'Error al actualizar probabilidad del premio.' }, 500)
  }
})

// Funciones auxiliares para mapeo de categorías con la restricción CHECK de PostgreSQL
function toDbTier(tier?: string | null): 'sin_premio' | 'promocion' | 'alto_valor' {
  if (!tier) return 'promocion'
  const t = tier.trim().toLowerCase()
  if (t === 'tier_50_no_prize' || t === 'sin_premio') return 'sin_premio'
  if (t === 'tier_10_high_value' || t === 'alto_valor') return 'alto_valor'
  return 'promocion'
}

function toAppTier(tier?: string | null): 'tier_50_no_prize' | 'tier_40_promo' | 'tier_10_high_value' {
  if (!tier) return 'tier_40_promo'
  const t = tier.trim().toLowerCase()
  if (t === 'sin_premio' || t === 'tier_50_no_prize') return 'tier_50_no_prize'
  if (t === 'alto_valor' || t === 'tier_10_high_value') return 'tier_10_high_value'
  return 'tier_40_promo'
}

// Rebalancear automáticamente el peso de las promociones de forma equitativa por categoría
export async function rebalancePrizesByCategory() {
  try {
    const [configRes, prizesRes] = await Promise.all([
      supabaseServer
        .from('configuracion_sistema')
        .select('valor')
        .eq('clave', 'probabilidades_categoria')
        .maybeSingle(),
      supabaseServer
        .from('premios')
        .select('id, categoria_nivel')
        .eq('activo', true)
    ])

    const categoryWeights: Record<string, number> = configRes.data?.valor || {
      sin_premio: 50,
      promocion: 40,
      alto_valor: 10
    }

    const prizes = prizesRes.data
    if (!prizes || prizes.length === 0) return

    const groups: Record<'sin_premio' | 'promocion' | 'alto_valor', string[]> = {
      sin_premio: [],
      promocion: [],
      alto_valor: []
    }

    // Normalizar siempre con toDbTier para evitar discrepancias
    prizes.forEach(p => {
      const normalizedCat = toDbTier(p.categoria_nivel)
      groups[normalizedCat].push(p.id)
    })

    // Actualizar todas las categorías en paralelo en una sola consulta por categoría
    const updatePromises = Object.entries(groups).map(async ([cat, ids]) => {
      if (ids.length === 0) return
      const totalCatWeight = categoryWeights[cat] !== undefined ? Number(categoryWeights[cat]) : 0
      const weightPerPrize = Math.round((totalCatWeight / ids.length) * 100) / 100
      
      return supabaseServer
        .from('premios')
        .update({ 
          peso_probabilidad: weightPerPrize,
          categoria_nivel: cat
        })
        .in('id', ids)
    })

    await Promise.all(updatePromises)
  } catch (err) {
    console.error('Error al rebalancear probabilidades por categoría:', err)
  }
}

// 1. Obtener probabilidades asignadas a cada categoría (con caché en memoria)
adminRouter.get('/prizes/category-weights', async (c) => {
  try {
    const cachedWeights = serverCache.get<any>('category_weights')
    if (cachedWeights) {
      return c.json({ success: true, weights: cachedWeights, cached: true })
    }

    const { data: configRow } = await supabaseServer
      .from('configuracion_sistema')
      .select('valor')
      .eq('clave', 'probabilidades_categoria')
      .single()

    const weights = configRow?.valor || {
      sin_premio: 50,
      promocion: 40,
      alto_valor: 10
    }

    serverCache.set('category_weights', weights, 300)
    return c.json({ success: true, weights })
  } catch (err: any) {
    return c.json({ error: 'Error al consultar probabilidades por categoría.' }, 500)
  }
})

// 2. Guardar probabilidades por categoría y redistribuir equitativamente
adminRouter.post('/prizes/category-weights', async (c) => {
  try {
    const { sin_premio, promocion, alto_valor } = await c.req.json()

    serverCache.invalidate('category_weights')
    serverCache.invalidate('admin_prizes')
    serverCache.invalidate('admin_metrics')

    const weights = {
      sin_premio: Math.max(0, Number(sin_premio ?? 50)),
      promocion: Math.max(0, Number(promocion ?? 40)),
      alto_valor: Math.max(0, Number(alto_valor ?? 10))
    }

    await supabaseServer
      .from('configuracion_sistema')
      .upsert({
        clave: 'probabilidades_categoria',
        valor: weights,
        fecha_actualizacion: new Date().toISOString()
      })

    // Redistribuir equitativamente entre las promociones activas
    await rebalancePrizesByCategory()

    return c.json({
      success: true,
      message: 'Probabilidades de categoría actualizadas y divididas equitativamente.',
      weights
    })
  } catch (err: any) {
    return c.json({ error: 'Error al actualizar probabilidades por categoría.' }, 500)
  }
})

// Obtener catálogo completo de premios (con caché en memoria)
adminRouter.get('/prizes', async (c) => {
  try {
    const cachedPrizes = serverCache.get<any[]>('admin_prizes')
    if (cachedPrizes) {
      return c.json({ prizes: cachedPrizes, cached: true })
    }

    // Rebalancear para garantizar sincronización de pesos antiguos
    await rebalancePrizesByCategory()

    const { data: prizes, error } = await supabaseServer
      .from('premios')
      .select(`
        *,
        productos (
          id,
          nombre
        )
      `)
      .order('fecha_creacion', { ascending: true })

    if (error) {
      return c.json({ error: 'Error al consultar premios.' }, 500)
    }

    const formatted = (prizes || []).map((p: any) => ({
      id: p.id,
      title: p.titulo,
      description: p.descripcion,
      producto_id: p.producto_id || null,
      producto_nombre: p.productos?.nombre || null,
      tier: toAppTier(p.categoria_nivel),
      weight: p.peso_probabilidad,
      badge_color: p.color_distintivo,
      is_active: p.activo,
      created_at: p.fecha_creacion
    }))

    serverCache.set('admin_prizes', formatted, 300)
    return c.json({ prizes: formatted })
  } catch (err: any) {
    return c.json({ error: 'Error al obtener catálogo de premios.' }, 500)
  }
})

// Crear nuevo premio o promoción (y rebalancear equitativamente en su categoría)
adminRouter.post('/prizes', async (c) => {
  try {
    const { title, description, tier, badge_color, producto_id } = await c.req.json()

    if (!title || !tier) {
      return c.json({ error: 'Faltan campos obligatorios para el premio.' }, 400)
    }

    serverCache.invalidate('admin_prizes')
    serverCache.invalidate('category_weights')
    serverCache.invalidate('admin_metrics')

    const normTier = toDbTier(tier)
    const assignedProductId = (normTier === 'sin_premio' || !producto_id) ? null : producto_id

    const { data, error } = await supabaseServer
      .from('premios')
      .insert({
        titulo: title,
        descripcion: description || title,
        categoria_nivel: normTier,
        peso_probabilidad: 10, // Se recalculará inmediatamente
        color_distintivo: badge_color || '#F56B2A',
        producto_id: assignedProductId,
        activo: true
      })
      .select()
      .single()

    if (error) {
      console.error('Error insertando premio en Supabase:', error)
      return c.json({ error: `Error al crear promoción: ${error.message}` }, 500)
    }

    // Dividir equitativamente el peso de la categoría
    await rebalancePrizesByCategory()

    // Obtener premio actualizado con su peso rebalanceado y relación de producto
    const { data: updatedPrize } = await supabaseServer
      .from('premios')
      .select(`
        *,
        productos (
          id,
          nombre
        )
      `)
      .eq('id', data.id)
      .single()

    const prizeResult: any = updatedPrize || data

    return c.json({ 
      success: true, 
      prize: {
        id: prizeResult.id,
        title: prizeResult.titulo,
        description: prizeResult.descripcion,
        producto_id: prizeResult.producto_id || null,
        producto_nombre: prizeResult.productos?.nombre || null,
        tier: toAppTier(prizeResult.categoria_nivel),
        weight: prizeResult.peso_probabilidad,
        badge_color: prizeResult.color_distintivo,
        is_active: prizeResult.activo,
        created_at: prizeResult.fecha_creacion
      }
    })
  } catch (err: any) {
    return c.json({ error: 'Error interno al registrar el premio.' }, 500)
  }
})

// Editar premio o promoción existente
adminRouter.put('/prizes/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const body = await c.req.json()

    serverCache.invalidate('admin_prizes')
    serverCache.invalidate('category_weights')
    serverCache.invalidate('admin_metrics')

    const updateData: any = {}
    if (body.title !== undefined) updateData.titulo = body.title
    if (body.description !== undefined) updateData.descripcion = body.description
    if (body.tier !== undefined) updateData.categoria_nivel = toDbTier(body.tier)
    if (body.badge_color !== undefined) updateData.color_distintivo = body.badge_color
    if (body.is_active !== undefined) updateData.activo = Boolean(body.is_active)
    if (body.producto_id !== undefined) {
      updateData.producto_id = (body.tier === 'tier_50_no_prize' || !body.producto_id) ? null : body.producto_id
    }

    const { data, error } = await supabaseServer
      .from('premios')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error actualizando premio en Supabase:', error)
      return c.json({ error: `Error al actualizar promoción: ${error.message}` }, 500)
    }

    // Rebalancear equitativamente por si cambió de categoría o estado
    await rebalancePrizesByCategory()

    const { data: updatedPrize } = await supabaseServer
      .from('premios')
      .select(`
        *,
        productos (
          id,
          nombre
        )
      `)
      .eq('id', id)
      .single()

    const prizeResult: any = updatedPrize || data

    return c.json({ 
      success: true, 
      prize: {
        id: prizeResult.id,
        title: prizeResult.titulo,
        description: prizeResult.descripcion,
        producto_id: prizeResult.producto_id || null,
        producto_nombre: prizeResult.productos?.nombre || null,
        tier: toAppTier(prizeResult.categoria_nivel),
        weight: prizeResult.peso_probabilidad,
        badge_color: prizeResult.color_distintivo,
        is_active: prizeResult.activo,
        created_at: prizeResult.fecha_creacion
      }
    })
  } catch (err: any) {
    return c.json({ error: 'Error interno al editar el premio.' }, 500)
  }
})

// Desactivar / Eliminar premio y redistribuir entre los restantes
adminRouter.delete('/prizes/:id', async (c) => {
  try {
    const id = c.req.param('id')
    serverCache.invalidate('admin_prizes')
    serverCache.invalidate('category_weights')
    serverCache.invalidate('admin_metrics')

    const { error } = await supabaseServer
      .from('premios')
      .update({ activo: false, peso_probabilidad: 0 })
      .eq('id', id)

    if (error) {
      return c.json({ error: 'Error al desactivar el premio.' }, 500)
    }

    // Rebalancear las promociones activas restantes
    await rebalancePrizesByCategory()

    return c.json({ success: true, message: 'Premio desactivado y probabilidades redistribuidas.' })
  } catch (err: any) {
    return c.json({ error: 'Error al eliminar el premio.' }, 500)
  }
})

