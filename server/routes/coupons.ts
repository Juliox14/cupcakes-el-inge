import { Hono } from 'hono'
import { supabaseServer } from '../lib/supabase.js'
import { serverCache } from '../lib/cache.js'
import { requireAdmin } from '../lib/authMiddleware.js'

export const couponsRouter = new Hono()

// Helper de verificación de cupón
async function verifyCouponByInput(rawInput: string, c: any) {
  try {
    if (!rawInput || typeof rawInput !== 'string') {
      return c.json({ error: 'Proporcione un código o QR válido.' }, 400)
    }

    const cleanInput = rawInput.trim()
    const cleanUpper = cleanInput.toUpperCase()
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanInput)

    let query = supabaseServer
      .from('cupones')
      .select(`
        *,
        premio:premios(*),
        usuario:usuarios!cupones_usuario_id_fkey(*)
      `)

    if (isUUID) {
      query = query.or(`id.eq.${cleanInput},codigo.eq.${cleanInput},token_qr.eq.${cleanInput},codigo.eq.${cleanUpper}`)
    } else {
      query = query.or(`codigo.eq.${cleanInput},token_qr.eq.${cleanInput},codigo.eq.${cleanUpper},token_qr.eq.${cleanUpper}`)
    }

    const { data: coupon, error } = await query.single()

    if (error || !coupon) {
      return c.json({ 
        valid: false, 
        message: 'Código de cupón no encontrado o inválido.',
        status: 'not_found'
      }, 404)
    }

    // Verificar si el cupón está vencido por fecha
    const isExpiredByDate = new Date(coupon.fecha_expiracion) < new Date()
    
    if (coupon.estado === 'canjeado') {
      return c.json({
        valid: false,
        message: `Este cupón ya fue canjeado el ${new Date(coupon.fecha_canje).toLocaleString('es-MX')}.`,
        status: 'redeemed',
        coupon: {
          id: coupon.id,
          code: coupon.codigo,
          user_id: coupon.usuario_id,
          prize: {
            title: coupon.premio?.titulo,
            description: coupon.premio?.descripcion,
            tier: coupon.premio?.categoria_nivel
          },
          status: coupon.estado
        }
      })
    }

    if (coupon.estado === 'expirado' || isExpiredByDate) {
      return c.json({
        valid: false,
        message: `El cupón expiró el ${new Date(coupon.fecha_expiracion).toLocaleDateString('es-MX')}.`,
        status: 'expired',
        coupon: {
          id: coupon.id,
          code: coupon.codigo,
          user_id: coupon.usuario_id,
          prize: {
            title: coupon.premio?.titulo,
            description: coupon.premio?.descripcion,
            tier: coupon.premio?.categoria_nivel
          },
          status: coupon.estado
        }
      })
    }

    return c.json({
      valid: true,
      message: '¡Cupón VÁLIDO y listo para canjear!',
      status: 'active',
      coupon: {
        id: coupon.id,
        code: coupon.codigo,
        user_id: coupon.usuario_id,
        prize: {
          title: coupon.premio?.titulo,
          description: coupon.premio?.descripcion,
          tier: coupon.premio?.categoria_nivel,
          badge_color: coupon.premio?.color_distintivo
        },
        status: coupon.estado,
        user_profile: {
          full_name: coupon.usuario?.nombre_completo,
          phone: coupon.usuario?.telefono
        }
      }
    })

  } catch (err: any) {
    console.error('Error al verificar cupón:', err)
    return c.json({ error: 'Error al verificar el cupón.' }, 500)
  }
}

// 1. Validar cupón por POST body { code_or_token } o { code }
couponsRouter.post('/verify', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const code = body.code_or_token || body.code || body.token_qr || ''
  return verifyCouponByInput(code, c)
})

// 2. Validar cupón por GET /api/coupons/verify/:code
couponsRouter.get('/verify/:code', async (c) => {
  const code = c.req.param('code')
  return verifyCouponByInput(code, c)
})

// 3. Canjear cupón en tiempo real (exclusivo para Administrador / Caja)
couponsRouter.post('/redeem', requireAdmin, async (c) => {
  try {
    const authUser: any = (c.get as any)('user')
    const body = await c.req.json().catch(() => ({}))
    const rawTarget = body.coupon_id || body.code || body.code_or_token || body.id || ''

    if (!rawTarget) {
      return c.json({ error: 'Faltan parámetros requeridos para el canje.' }, 400)
    }

    const cleanInput = String(rawTarget).trim()
    const cleanUpper = cleanInput.toUpperCase()
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanInput)

    // Si no es UUID, resolver ID primero
    let targetId = cleanInput
    if (!isUUID) {
      const { data: found } = await supabaseServer
        .from('cupones')
        .select('id')
        .or(`codigo.eq.${cleanInput},token_qr.eq.${cleanInput},codigo.eq.${cleanUpper},token_qr.eq.${cleanUpper}`)
        .single()

      if (!found) {
        return c.json({ error: 'Cupón no encontrado para canjear.' }, 404)
      }
      targetId = found.id
    }

    // Actualizar estado del cupón
    const { data: updatedCoupon, error: updateError } = await supabaseServer
      .from('cupones')
      .update({
        estado: 'canjeado',
        fecha_canje: new Date().toISOString(),
        canjeado_por: authUser?.id || (body.admin_id && body.admin_id.length === 36 ? body.admin_id : null)
      })
      .eq('id', targetId)
      .select('*, premio:premios(*), usuario:usuarios!cupones_usuario_id_fkey(*)')
      .single()

    if (updateError) {
      console.error('Error al canjear cupón en Supabase:', updateError)
      return c.json({ error: 'Error al procesar el canje del cupón.' }, 500)
    }

    serverCache.invalidate('admin_metrics')

    return c.json({
      success: true,
      message: `¡Premio "${updatedCoupon.premio?.titulo || 'Cupón'}" canjeado con éxito!`,
      coupon: updatedCoupon
    })

  } catch (err: any) {
    console.error('Error al canjear cupón:', err)
    return c.json({ error: 'Error en el servidor al canjear cupón.' }, 500)
  }
})
