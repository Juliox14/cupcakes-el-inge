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
    const unitCost = Number(settingsMap.get('costo_produccion_cupcake') ?? 6.67)
    const unitPrice = Number(settingsMap.get('precio_venta_cupcake') ?? 20.00)

    // Cálculo financiero real
    const totalProductionCost = totalCupcakesSold * unitCost
    const totalGrossProfit = Math.max(0, totalRevenueMXN - totalProductionCost)
    
    // Descuentos bonificados por promociones/cupones (Diferencia entre precio regular e ingreso real en caja)
    const totalDiscountsGranted = purchases.reduce((acc, curr) => {
      const regularAmount = (curr.cantidad_cupcakes || 0) * unitPrice
      const realAmount = Number(curr.monto_total || 0)
      const diff = Math.max(0, regularAmount - realAmount)
      return acc + diff
    }, 0)

    const profitMargin = totalRevenueMXN > 0 
      ? Math.round((totalGrossProfit / totalRevenueMXN) * 100) 
      : 0

    const redemptionRate = totalCouponsIssued && totalCouponsIssued > 0
      ? Math.round(((totalCouponsRedeemed || 0) / totalCouponsIssued) * 100)
      : 0

    // Helper para obtener fecha local YYYY-MM-DD en la zona horaria de México
    const getLocalDateStr = (dateInput: string | Date | undefined, timeZone = 'America/Mexico_City'): string => {
      if (!dateInput) return ''
      const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
      if (isNaN(d.getTime())) return ''
      const formatter = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' })
      return formatter.format(d)
    }

    // Cálculo de Ventas Semanales (Últimos 7 días en horario local de México)
    const timeZone = 'America/Mexico_City'
    const now = new Date()
    const daysOfWeek = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
    const weeklyBreakdown = []
    let weeklyCupcakesSold = 0
    let weeklyRevenueMxn = 0

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      const dateStr = getLocalDateStr(d, timeZone)
      const dayName = daysOfWeek[new Date(dateStr + 'T12:00:00Z').getUTCDay()]
      const [, monthStr, dayStr] = dateStr.split('-')
      const label = `${dayName} ${parseInt(dayStr, 10)}/${parseInt(monthStr, 10)}`

      const dayPurchases = (purchases || []).filter(p => getLocalDateStr(p.fecha_creacion, timeZone) === dateStr)
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
        label,
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
      const totalAmount = Number(p.monto_total !== undefined ? p.monto_total : cupcakesQty * unitPrice)
      const spinsGranted = p.tiros_otorgados ?? 0
      const createdAt = p.fecha_creacion || new Date().toISOString()
      const regularSubtotal = cupcakesQty * unitPrice
      const discountGiven = Math.max(0, regularSubtotal - totalAmount)

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
        discount_amount: discountGiven,
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
      total_production_cost_mxn: Math.round(totalProductionCost * 100) / 100,
      total_gross_profit_mxn: Math.round(totalGrossProfit * 100) / 100,
      total_discounts_granted_mxn: Math.round(totalDiscountsGranted * 100) / 100,
      profit_margin: profitMargin,
      unit_cost_cupcake: unitCost,
      unit_price_cupcake: unitPrice,
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
    const admin_id = body.admin_id
    const couponTarget = body.coupon_id || body.coupon_code || body.couponId

    const qty = Number(cupcakes_qty)
    if (!qty || qty <= 0) {
      return c.json({ error: 'Se requiere una cantidad válida de cupcakes.' }, 400)
    }

    serverCache.invalidate('admin_metrics')

    const isAnonymous = !user_id || user_id === 'anonymous' || user_id === 'unregistered'
    
    // 1. Resolver cupón si se proporcionó
    let redeemedCoupon: any = null
    let couponDiscount = 0
    let isPromoCoupon = false
    let promoCoveredQty = 0

    if (couponTarget) {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(couponTarget).trim())
      let q = supabaseServer
        .from('cupones')
        .select('*, premio:premios(*, productos(*))')
        
      if (isUUID) {
        q = q.or(`id.eq.${couponTarget},codigo.eq.${couponTarget}`)
      } else {
        q = q.or(`codigo.eq.${couponTarget},token_qr.eq.${couponTarget},codigo.eq.${String(couponTarget).toUpperCase()}`)
      }

      const { data: cup } = await q.single()
      if (cup && cup.estado === 'activo') {
        redeemedCoupon = cup
        isPromoCoupon = true
        const p = cup.premio

        // Descuento exacto y piezas amparadas directamente desde la base de datos
        promoCoveredQty = Number(p?.piezas_amparadas ?? 1)
        
        if (p?.descuento_monto !== undefined && p?.descuento_monto !== null && Number(p.descuento_monto) > 0) {
          couponDiscount = Number(p.descuento_monto)
        } else if (p?.tipo_beneficio === 'precio_promocional' && p?.precio_promocional) {
          const regularPriceForPieces = (p?.productos?.precio ? Number(p.productos.precio) : unit_price) * promoCoveredQty
          couponDiscount = Math.max(0, regularPriceForPieces - Number(p.precio_promocional))
        } else if (p?.tipo_beneficio === 'producto_gratis') {
          const itemPrice = p?.productos?.precio ? Number(p.productos.precio) : unit_price
          couponDiscount = itemPrice * (promoCoveredQty || 1)
        } else if (p?.tipo_beneficio === 'descuento_fijo' && p?.descuento_monto) {
          couponDiscount = Number(p.descuento_monto)
        } else if (body.discount_amount !== undefined) {
          couponDiscount = Number(body.discount_amount)
        }

        // Marcar cupón como canjeado atómicamente
        await supabaseServer
          .from('cupones')
          .update({
            estado: 'canjeado',
            fecha_canje: new Date().toISOString(),
            canjeado_por: admin_id && admin_id.length === 36 ? admin_id : null
          })
          .eq('id', cup.id)
      }
    }

    // 2. Calcular monto total real a cobrar en caja (considerando descuentos)
    const baseSubtotal = qty * unit_price
    let total_amount = baseSubtotal
    if (body.total_amount !== undefined) {
      total_amount = Number(body.total_amount)
    } else if (couponDiscount > 0) {
      total_amount = Math.max(0, baseSubtotal - couponDiscount)
    }

    // 3. Regla de Negocio de Tiradas:
    // - Las promociones/descuentos NO otorgan tiradas de bono.
    // - Solo piezas regulares adicionales fuera de la promo otorgan 1 tiro por cada 2 pzas.
    // - Bono de Bienvenida: Si es la PRIMERA compra de un cliente registrado (total_cupcakes_comprados === 0),
    //   se le otorga automáticamente +1 tiro de bienvenida a la ruleta en mostrador.
    let isFirstPurchase = false
    let welcomeBonus = 0

    let clientProfileData: any = null
    if (!isAnonymous && user_id) {
      const { data: profile } = await supabaseServer
        .from('usuarios')
        .select('nombre_completo, tiros_disponibles, total_cupcakes_comprados')
        .eq('id', user_id)
        .single()
      
      if (profile) {
        clientProfileData = profile
        if ((profile.total_cupcakes_comprados || 0) === 0) {
          isFirstPurchase = true
          welcomeBonus = 1
        }
      }
    }

    let spinsGranted = 0
    if (body.spins_granted !== undefined) {
      spinsGranted = Number(body.spins_granted)
    } else if (isPromoCoupon) {
      const extraRegularQty = Math.max(0, qty - promoCoveredQty)
      spinsGranted = (isAnonymous ? 0 : Math.floor(extraRegularQty / 2)) + welcomeBonus
    } else {
      spinsGranted = (isAnonymous ? 0 : Math.floor(qty / 2)) + welcomeBonus
    }

    // 4. Si es cliente registrado y no tenemos su nombre, consultarlo y actualizar perfil
    let updatedProfile = null
    if (!isAnonymous && user_id && clientProfileData) {
      if (!client_name || client_name === 'Cliente' || client_name === 'Cliente Registrado') {
        client_name = clientProfileData.nombre_completo
      }
      const currentSpins = clientProfileData.tiros_disponibles || 0
      const currentCupcakes = clientProfileData.total_cupcakes_comprados || 0

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

    const finalClientName = isAnonymous 
      ? (client_name || 'Venta Directa') 
      : (client_name || 'Cliente Registrado')

    const producto_id = body.producto_id || body.productId

    // 5. Insertar registro de compra en tabla 'compras'
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

    // 6. Descontar del stock disponible en configuracion_sistema
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
      discount_amount: couponDiscount,
      redeemed_coupon: redeemedCoupon,
      current_stock: newStock,
      message: isAnonymous
        ? `Venta directa de ${qty} cupcake(s) ($${total_amount} MXN${couponDiscount > 0 ? ` - Ahorro: $${couponDiscount}` : ''}) registrada. Stock restante: ${newStock} pcs.`
        : `Compra de ${qty} cupcake(s) registrada a ${finalClientName}. +${spinsGranted} jugada(s) acreditada(s)${couponDiscount > 0 ? ` (Promo aplicada: -$${couponDiscount} MXN)` : ''}.`
    })

  } catch (err: any) {
    console.error('Error al registrar compra:', err)
    return c.json({ error: 'Error al procesar el registro de compra.' }, 500)
  }
}

// Montar en ambos endpoints para total retrocompatibilidad
adminRouter.post('/register-purchase', handleRegisterPurchase)
adminRouter.post('/purchases', handleRegisterPurchase)

// Añadir o ajustar tiradas a un cliente manualmente por el Administrador
adminRouter.post('/grant-spins', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}))
    const { user_id, spins_to_add, spins } = body
    const targetUserId = user_id || body.id

    if (!targetUserId) {
      return c.json({ error: 'Se requiere el ID del cliente.' }, 400)
    }

    const qtyToAdd = spins_to_add !== undefined ? Number(spins_to_add) : Number(spins || 0)
    if (isNaN(qtyToAdd)) {
      return c.json({ error: 'Cantidad de tiros inválida.' }, 400)
    }

    // Obtener usuario actual
    const { data: user, error: fetchErr } = await supabaseServer
      .from('usuarios')
      .select('*')
      .eq('id', targetUserId)
      .single()

    if (fetchErr || !user) {
      return c.json({ error: 'Cliente no encontrado en la base de datos.' }, 404)
    }

    const currentSpins = user.tiros_disponibles || 0
    const newSpins = Math.max(0, currentSpins + qtyToAdd)

    const { data: updatedUser, error: updateErr } = await supabaseServer
      .from('usuarios')
      .update({
        tiros_disponibles: newSpins,
        fecha_actualizacion: new Date().toISOString()
      })
      .eq('id', targetUserId)
      .select('*')
      .single()

    if (updateErr || !updatedUser) {
      return c.json({ error: 'Error al actualizar los tiros del cliente.' }, 500)
    }

    serverCache.invalidate('admin_metrics')

    return c.json({
      success: true,
      message: `¡Se ${qtyToAdd >= 0 ? 'acreditaron +' : 'descontaron '}${qtyToAdd} tiros a ${updatedUser.nombre_completo}! (Total: ${newSpins} tiros)`,
      spins_available: newSpins,
      user: {
        id: updatedUser.id,
        full_name: updatedUser.nombre_completo,
        email: updatedUser.email,
        phone: updatedUser.telefono,
        role: updatedUser.rol === 'administrador' ? 'admin' : 'client',
        spins_available: updatedUser.tiros_disponibles,
        total_cupcakes_purchased: updatedUser.total_cupcakes_comprados || 0,
        created_at: updatedUser.fecha_creacion,
        updated_at: updatedUser.fecha_actualizacion
      }
    })
  } catch (err: any) {
    console.error('Error al otorgar tiros:', err)
    return c.json({ error: 'Error interno en el servidor.' }, 500)
  }
})

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
      // Usar Math.round para respetar el tipo INTEGER de la columna en PostgreSQL
      const weightPerPrize = ids.length > 0 ? Math.round(totalCatWeight / ids.length) : 0
      
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
    serverCache.invalidate('public_prizes')
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

// Obtener todos los cupones para el panel administrativo (con datos de usuario y premio)
adminRouter.get('/coupons', async (c) => {
  try {
    const { data: coupons, error } = await supabaseServer
      .from('cupones')
      .select(`
        *,
        premio:premios(*),
        usuario:usuarios!cupones_usuario_id_fkey(*)
      `)
      .order('fecha_creacion', { ascending: false })

    if (error) {
      console.error('Error obteniendo cupones admin:', error)
      return c.json({ error: 'Error al consultar cupones.' }, 500)
    }

    const mappedCoupons = (coupons || []).map((c: any) => ({
      id: c.id,
      code: c.codigo,
      user_id: c.usuario_id,
      token_qr: c.token_qr,
      status: c.estado,
      expires_at: c.fecha_expiracion,
      redeemed_at: c.fecha_canje,
      created_at: c.fecha_creacion,
      prize: c.premio ? {
        id: c.premio.id,
        title: c.premio.titulo,
        description: c.premio.descripcion,
        tier: c.premio.categoria_nivel,
        badge_color: c.premio.color_distintivo,
        tipo_beneficio: c.premio.tipo_beneficio,
        precio_promocional: c.premio.precio_promocional !== null ? Number(c.premio.precio_promocional) : null,
        descuento_monto: c.premio.descuento_monto !== null ? Number(c.premio.descuento_monto) : 0,
        piezas_amparadas: c.premio.piezas_amparadas !== null ? Number(c.premio.piezas_amparadas) : 1,
        producto_id: c.premio.producto_id
      } : undefined,
      user_profile: c.usuario ? {
        id: c.usuario.id,
        full_name: c.usuario.nombre_completo,
        email: c.usuario.correo,
        phone: c.usuario.telefono
      } : undefined
    }))

    return c.json({
      success: true,
      coupons: mappedCoupons
    })
  } catch (err: any) {
    console.error('Error en GET /api/admin/coupons:', err)
    return c.json({ error: 'Error interno al consultar cupones.' }, 500)
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

    const [prizesRes, configRes] = await Promise.all([
      supabaseServer
        .from('premios')
        .select(`
          *,
          productos (
            id,
            nombre
          )
        `)
        .order('fecha_creacion', { ascending: true }),
      supabaseServer
        .from('configuracion_sistema')
        .select('valor')
        .eq('clave', 'probabilidades_categoria')
        .maybeSingle()
    ])

    if (prizesRes.error) {
      return c.json({ error: 'Error al consultar premios.' }, 500)
    }

    const categoryWeights: Record<string, number> = configRes.data?.valor || {
      sin_premio: 60,
      promocion: 30,
      alto_valor: 10
    }

    const prizes = prizesRes.data || []
    const activeCountByCat: Record<string, number> = { sin_premio: 0, promocion: 0, alto_valor: 0 }
    prizes.filter(p => p.activo).forEach((p: any) => {
      const cat = toDbTier(p.categoria_nivel)
      activeCountByCat[cat] = (activeCountByCat[cat] || 0) + 1
    })

    const formatted = prizes.map((p: any) => {
      const cat = toDbTier(p.categoria_nivel)
      const count = activeCountByCat[cat] || 1
      const totalCatWeight = categoryWeights[cat] !== undefined ? Number(categoryWeights[cat]) : 0
      const exactWeight = p.activo ? Math.round((totalCatWeight / count) * 100) / 100 : 0

      return {
        id: p.id,
        title: p.titulo,
        description: p.descripcion,
        producto_id: p.producto_id || null,
        producto_nombre: p.productos?.nombre || null,
        producto_precio: p.productos?.precio || null,
        tier: toAppTier(p.categoria_nivel),
        tipo_beneficio: p.tipo_beneficio || 'descuento_fijo',
        precio_promocional: p.precio_promocional !== undefined && p.precio_promocional !== null ? Number(p.precio_promocional) : null,
        descuento_monto: p.descuento_monto !== undefined && p.descuento_monto !== null ? Number(p.descuento_monto) : 0,
        piezas_amparadas: p.piezas_amparadas !== undefined && p.piezas_amparadas !== null ? Number(p.piezas_amparadas) : 1,
        weight: exactWeight,
        badge_color: p.color_distintivo,
        is_active: p.activo,
        created_at: p.fecha_creacion
      }
    })

    serverCache.set('admin_prizes', formatted, 300)
    return c.json({ prizes: formatted })
  } catch (err: any) {
    return c.json({ error: 'Error al obtener catálogo de premios.' }, 500)
  }
})

// Crear nuevo premio o promoción (y rebalancear equitativamente en su categoría)
adminRouter.post('/prizes', async (c) => {
  try {
    const { 
      title, 
      description, 
      tier, 
      badge_color, 
      producto_id,
      tipo_beneficio,
      precio_promocional,
      descuento_monto,
      piezas_amparadas
    } = await c.req.json()

    if (!title || !tier) {
      return c.json({ error: 'Faltan campos obligatorios para el premio.' }, 400)
    }

    serverCache.invalidate('admin_prizes')
    serverCache.invalidate('public_prizes')
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
        tipo_beneficio: tipo_beneficio || 'descuento_fijo',
        precio_promocional: precio_promocional !== undefined && precio_promocional !== '' ? Number(precio_promocional) : null,
        descuento_monto: descuento_monto !== undefined && descuento_monto !== '' ? Number(descuento_monto) : 0,
        piezas_amparadas: piezas_amparadas !== undefined && piezas_amparadas !== '' ? Number(piezas_amparadas) : 1,
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
          nombre,
          precio
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
        producto_precio: prizeResult.productos?.precio || null,
        tier: toAppTier(prizeResult.categoria_nivel),
        tipo_beneficio: prizeResult.tipo_beneficio || 'descuento_fijo',
        precio_promocional: prizeResult.precio_promocional !== null ? Number(prizeResult.precio_promocional) : null,
        descuento_monto: prizeResult.descuento_monto !== null ? Number(prizeResult.descuento_monto) : 0,
        piezas_amparadas: prizeResult.piezas_amparadas !== null ? Number(prizeResult.piezas_amparadas) : 1,
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
    serverCache.invalidate('public_prizes')
    serverCache.invalidate('category_weights')
    serverCache.invalidate('admin_metrics')

    const updateData: any = {}
    if (body.title !== undefined) updateData.titulo = body.title
    if (body.description !== undefined) updateData.descripcion = body.description
    if (body.tier !== undefined) updateData.categoria_nivel = toDbTier(body.tier)
    if (body.badge_color !== undefined) updateData.color_distintivo = body.badge_color
    if (body.is_active !== undefined) updateData.activo = Boolean(body.is_active)
    if (body.tipo_beneficio !== undefined) updateData.tipo_beneficio = body.tipo_beneficio
    if (body.precio_promocional !== undefined) {
      updateData.precio_promocional = body.precio_promocional !== '' && body.precio_promocional !== null ? Number(body.precio_promocional) : null
    }
    if (body.descuento_monto !== undefined) {
      updateData.descuento_monto = body.descuento_monto !== '' && body.descuento_monto !== null ? Number(body.descuento_monto) : 0
    }
    if (body.piezas_amparadas !== undefined) {
      updateData.piezas_amparadas = body.piezas_amparadas !== '' && body.piezas_amparadas !== null ? Number(body.piezas_amparadas) : 1
    }
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
          nombre,
          precio
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
        producto_precio: prizeResult.productos?.precio || null,
        tier: toAppTier(prizeResult.categoria_nivel),
        tipo_beneficio: prizeResult.tipo_beneficio || 'descuento_fijo',
        precio_promocional: prizeResult.precio_promocional !== null ? Number(prizeResult.precio_promocional) : null,
        descuento_monto: prizeResult.descuento_monto !== null ? Number(prizeResult.descuento_monto) : 0,
        piezas_amparadas: prizeResult.piezas_amparadas !== null ? Number(prizeResult.piezas_amparadas) : 1,
        weight: prizeResult.peso_probabilidad,
        badge_color: prizeResult.color_distintivo,
        is_active: prizeResult.activo,
        created_at: prizeResult.fecha_creacion
      }
    })

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
    serverCache.invalidate('public_prizes')
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

