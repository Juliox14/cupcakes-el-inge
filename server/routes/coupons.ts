import { Hono } from 'hono'
import { supabaseServer } from '../lib/supabase'
import { serverCache } from '../lib/cache'
import { requireAdmin } from '../lib/authMiddleware'

export const couponsRouter = new Hono()

// Validar cupón por código alfanumérico o token QR
couponsRouter.post('/verify', async (c) => {
  try {
    const { code_or_token } = await c.req.json()

    if (!code_or_token || typeof code_or_token !== 'string') {
      return c.json({ error: 'Proporcione un código o QR válido.' }, 400)
    }

    const cleanInput = code_or_token.trim()

    // Buscar cupón por código o por token_qr
    const { data: coupon, error } = await supabaseServer
      .from('cupones')
      .select(`
        *,
        premio:premios(*),
        usuario:usuarios(*)
      `)
      .or(`codigo.eq.${cleanInput},token_qr.eq.${cleanInput}`)
      .single()

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
})

// Canjear cupón en tiempo real (exclusivo para Administrador / Caja)
couponsRouter.post('/redeem', requireAdmin, async (c) => {
  try {
    const authUser: any = (c.get as any)('user')
    const { coupon_id, admin_id } = await c.req.json()

    if (!coupon_id) {
      return c.json({ error: 'Faltan parámetros requeridos para el canje.' }, 400)
    }

    // Actualizar estado del cupón
    const { data: updatedCoupon, error: updateError } = await supabaseServer
      .from('cupones')
      .update({
        estado: 'canjeado',
        fecha_canje: new Date().toISOString(),
        canjeado_por: authUser?.id || (admin_id && admin_id.length === 36 ? admin_id : null)
      })
      .eq('id', coupon_id)
      .select('*, premio:premios(*), usuario:usuarios(*)')
      .single()

    if (updateError) {
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
