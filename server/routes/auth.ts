/// <reference types="node" />
import { Hono } from 'hono'
import { setCookie, getCookie, deleteCookie } from 'hono/cookie'
import { supabaseServer } from '../lib/supabase.js'
import * as crypto from 'crypto'
import { 
  createJWT, 
  verifyJWT, 
  hashPassword, 
  requireAuth, 
  requireAdmin,
  extractToken 
} from '../lib/authMiddleware.js'
import { rateLimiter } from '../lib/rateLimit.js'

export const authRouter = new Hono()

// 1. REGISTRO DE NUEVO USUARIO (Con Correo, Teléfono y Contraseña)
// Rate limiting: máximo 3 registros cada 10 minutos por IP
authRouter.post('/register', rateLimiter(3, 10 * 60 * 1000, 'Demasiados intentos de registro. Por seguridad, espera 10 minutos.'), async (c) => {
  try {
    const { full_name, email, phone, password } = await c.req.json()

    if (!full_name || !email || !phone || !password) {
      return c.json({ error: 'Todos los campos son obligatorios: Nombre, Correo, Teléfono y Contraseña.' }, 400)
    }

    const cleanPhone = phone.toString().replace(/\D/g, '').slice(-10)
    if (cleanPhone.length < 10) {
      return c.json({ error: 'El número de teléfono debe tener 10 dígitos.' }, 400)
    }

    const cleanEmail = email.toString().trim().toLowerCase()
    if (!cleanEmail.includes('@')) {
      return c.json({ error: 'Por favor ingresa un correo electrónico válido.' }, 400)
    }

    if (password.length < 4) {
      return c.json({ error: 'La contraseña debe tener al menos 4 caracteres.' }, 400)
    }

    const hashedPassword = hashPassword(password)
    const newUserId = crypto.randomUUID()
    const now = new Date().toISOString()

    const newUserData = {
      id: newUserId,
      nombre_completo: full_name.trim(),
      correo: cleanEmail,
      telefono: cleanPhone,
      password_hash: hashedPassword,
      rol: 'cliente',
      tiros_disponibles: 0, // 0 tiros iniciales (el tiro de bienvenida se desbloquea en su 1ra compra en mostrador)
      total_cupcakes_comprados: 0,
      fecha_creacion: now,
      fecha_actualizacion: now
    }

    // Registrar en tabla 'usuarios' de Supabase
    let createdUser = null
    const { data: dbUser, error: insertError } = await supabaseServer
      .from('usuarios')
      .insert(newUserData)
      .select()
      .single()

    if (insertError) {
      console.error('Error insertando en Supabase usuarios:', insertError)
      if (insertError.code === '23505') {
        return c.json({ error: 'Ya existe una cuenta registrada con este correo o número de teléfono. Inicia sesión.' }, 409)
      }
      return c.json({ error: `Error en base de datos: ${insertError.message}` }, 500)
    }

    createdUser = {
      id: dbUser.id,
      full_name: dbUser.nombre_completo,
      email: dbUser.correo,
      phone: dbUser.telefono,
      role: dbUser.rol === 'admin' ? 'admin' : 'client',
      spins_available: dbUser.tiros_disponibles,
      total_cupcakes_purchased: dbUser.total_cupcakes_comprados,
      created_at: dbUser.fecha_creacion,
      updated_at: dbUser.fecha_actualizacion
    }

    const token = createJWT({
      id: createdUser.id,
      email: createdUser.email,
      phone: createdUser.phone,
      full_name: createdUser.full_name,
      role: createdUser.role
    })

    // Establecer Cookie Segura httpOnly
    setCookie(c, 'inge_token', token, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Lax',
      maxAge: 60 * 60 * 24 * 14 // 14 días
    })

    return c.json({
      success: true,
      token,
      user: createdUser,
      coupons: [],
      message: '¡Registro exitoso! Te regalamos 1 jugada en la ruleta 🥕'
    })

  } catch (err: any) {
    console.error('Error en /api/auth/register:', err)
    return c.json({ error: 'Error interno al registrar usuario.' }, 500)
  }
})

// 2. INICIO DE SESIÓN (Login con Correo o Teléfono + Contraseña)
// Rate limiting: máximo 5 intentos por minuto por IP para prevenir ataques de diccionario / fuerza bruta
authRouter.post('/login', rateLimiter(5, 60 * 1000, 'Demasiados intentos de inicio de sesión. Por seguridad, espera 1 minuto.'), async (c) => {
  try {
    const { identifier, password } = await c.req.json()

    if (!identifier || !password) {
      return c.json({ error: 'Por favor ingresa tu correo/teléfono y tu contraseña.' }, 400)
    }

    const cleanId = identifier.toString().trim()
    const isEmail = cleanId.includes('@')
    const cleanPhone = cleanId.replace(/\D/g, '').slice(-10)

    // Buscar usuario en Supabase estrictamente en la base de datos
    let foundUser = null
    let { data: dbUser } = isEmail
      ? await supabaseServer.from('usuarios').select('*').eq('correo', cleanId.toLowerCase()).single()
      : await supabaseServer.from('usuarios').select('*').eq('telefono', cleanPhone).single()

    if (!dbUser) {
      // Fallback a 'profiles'
      const { data: profUser } = isEmail
        ? await supabaseServer.from('profiles').select('*').eq('email', cleanId.toLowerCase()).single()
        : await supabaseServer.from('profiles').select('*').eq('phone', cleanPhone).single()
      
      if (profUser) {
        // Validar contraseña si tiene password_hash
        const hashed = hashPassword(password)
        if (profUser.password_hash && profUser.password_hash !== hashed) {
          return c.json({ error: 'Contraseña incorrecta.' }, 401)
        }

        foundUser = {
          id: profUser.id,
          full_name: profUser.full_name,
          email: profUser.email || `${cleanPhone}@cupcakes.mx`,
          phone: profUser.phone,
          role: profUser.role,
          spins_available: profUser.spins_available,
          total_cupcakes_purchased: profUser.total_cupcakes_purchased,
          created_at: profUser.created_at,
          updated_at: profUser.updated_at
        }
      }
    } else {
      // Validar contraseña estrictamente con hash
      const hashed = hashPassword(password)
      if (dbUser.password_hash) {
        if (dbUser.password_hash !== hashed) {
          return c.json({ error: 'Contraseña incorrecta.' }, 401)
        }
      }

      foundUser = {
        id: dbUser.id,
        full_name: dbUser.nombre_completo,
        email: dbUser.correo,
        phone: dbUser.telefono,
        role: dbUser.rol === 'admin' ? 'admin' : 'client',
        spins_available: dbUser.tiros_disponibles,
        total_cupcakes_comprados: dbUser.total_cupcakes_comprados,
        created_at: dbUser.fecha_creacion,
        updated_at: dbUser.fecha_actualizacion
      }
    }

    if (!foundUser) {
      return c.json({ error: 'Usuario no encontrado. Por favor regístrate.' }, 404)
    }

    // Cargar cupones del usuario
    const { data: userCoupons } = await supabaseServer
      .from('cupones')
      .select('*, premio:premios(*)')
      .eq('usuario_id', foundUser.id)

    const token = createJWT({
      id: foundUser.id,
      email: foundUser.email,
      phone: foundUser.phone,
      full_name: foundUser.full_name,
      role: foundUser.role
    })

    setCookie(c, 'inge_token', token, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Lax',
      maxAge: 60 * 60 * 24 * 14
    })

    return c.json({
      success: true,
      token,
      user: foundUser,
      coupons: userCoupons || [],
      message: `¡Bienvenido de vuelta, ${foundUser.full_name.split(' ')[0]}!`
    })

  } catch (err: any) {
    console.error('Error en /api/auth/login:', err)
    return c.json({ error: 'Error al iniciar sesión.' }, 500)
  }
})

// 3. REGISTRO O LOGIN RÁPIDO POR TELÉFONO (Para venta en punto de venta / Caja)
authRouter.post('/register-or-login', requireAdmin, async (c) => {
  try {
    const { phone, full_name } = await c.req.json()

    if (!phone) {
      return c.json({ error: 'El número de teléfono es obligatorio.' }, 400)
    }

    const cleanPhone = phone.toString().replace(/\D/g, '').slice(-10)
    if (cleanPhone.length < 10) {
      return c.json({ error: 'El número de teléfono debe tener 10 dígitos.' }, 400)
    }

    const cleanName = full_name ? full_name.toString().trim() : ''

    // 1. Buscar en 'usuarios'
    let { data: existingUser } = await supabaseServer
      .from('usuarios')
      .select('*')
      .eq('telefono', cleanPhone)
      .single()

    // 2. Si no existe en 'usuarios', buscar en 'profiles'
    if (!existingUser) {
      const { data: profUser } = await supabaseServer
        .from('profiles')
        .select('*')
        .eq('phone', cleanPhone)
        .single()
      
      if (profUser) {
        existingUser = {
          id: profUser.id,
          nombre_completo: profUser.full_name,
          correo: profUser.email || `${cleanPhone}@cupcakes.mx`,
          telefono: profUser.phone,
          rol: profUser.role,
          tiros_disponibles: profUser.spins_available,
          total_cupcakes_comprados: profUser.total_cupcakes_purchased,
          fecha_creacion: profUser.created_at,
          fecha_actualizacion: profUser.updated_at
        }
      }
    }

    if (existingUser) {
      if (cleanName && (!existingUser.nombre_completo || existingUser.nombre_completo.startsWith('Cliente '))) {
        await supabaseServer
          .from('usuarios')
          .update({ nombre_completo: cleanName, fecha_actualizacion: new Date().toISOString() })
          .eq('id', existingUser.id)
        existingUser.nombre_completo = cleanName
      }

      const formattedUser = {
        id: existingUser.id,
        full_name: existingUser.nombre_completo || `Cliente ${cleanPhone.slice(-4)}`,
        email: existingUser.correo || `${cleanPhone}@cupcakes.mx`,
        phone: existingUser.telefono,
        role: existingUser.rol === 'admin' ? 'admin' : 'client',
        spins_available: existingUser.tiros_disponibles,
        total_cupcakes_purchased: existingUser.total_cupcakes_comprados,
        created_at: existingUser.fecha_creacion,
        updated_at: existingUser.fecha_actualizacion
      }

      const { data: userCoupons } = await supabaseServer
        .from('cupones')
        .select('*, premio:premios(*)')
        .eq('usuario_id', formattedUser.id)

      return c.json({
        success: true,
        is_new: false,
        user: formattedUser,
        coupons: userCoupons || [],
        message: `Cliente existente: ${formattedUser.full_name}`
      })
    }

    // 3. Crear nuevo usuario cliente
    const newUserId = crypto.randomUUID()
    const defaultName = cleanName || `Cliente ${cleanPhone.slice(-4)}`
    const now = new Date().toISOString()

    const newUserData = {
      id: newUserId,
      nombre_completo: defaultName,
      correo: `${cleanPhone}@cupcakes.mx`,
      telefono: cleanPhone,
      password_hash: null,
      rol: 'cliente',
      tiros_disponibles: 1, // 1 tiro de bienvenida
      total_cupcakes_comprados: 0,
      fecha_creacion: now,
      fecha_actualizacion: now
    }

    const { data: createdUser, error: insertError } = await supabaseServer
      .from('usuarios')
      .insert(newUserData)
      .select()
      .single()

    if (insertError) {
      console.error('Error creando usuario en Supabase usuarios:', insertError)
      return c.json({ error: 'Error al registrar el nuevo cliente.' }, 500)
    }

    const formattedCreated = {
      id: createdUser.id,
      full_name: createdUser.nombre_completo,
      email: createdUser.correo,
      phone: createdUser.telefono,
      role: createdUser.rol === 'admin' ? 'admin' : 'client',
      spins_available: createdUser.tiros_disponibles,
      total_cupcakes_purchased: createdUser.total_cupcakes_comprados,
      created_at: createdUser.fecha_creacion,
      updated_at: createdUser.fecha_actualizacion
    }

    return c.json({
      success: true,
      is_new: true,
      user: formattedCreated,
      coupons: [],
      message: `Nuevo cliente registrado: ${formattedCreated.full_name} (+1 tiro gratis de bienvenida)`
    })

  } catch (err: any) {
    console.error('Error en /api/auth/register-or-login:', err)
    return c.json({ error: 'Error interno en autenticación de cliente.' }, 500)
  }
})

// 4. VERIFICAR SESIÓN ACTIVA (ME)
authRouter.get('/me', async (c) => {
  const token = extractToken(c)

  if (!token) {
    return c.json({ authenticated: false, user: null, coupons: [] })
  }

  const payload = verifyJWT(token)
  if (!payload) {
    return c.json({ authenticated: false, user: null, coupons: [] })
  }

  try {
    const { data: dbUser } = await supabaseServer
      .from('usuarios')
      .select('*')
      .eq('id', payload.id)
      .single()

    if (!dbUser) {
      return c.json({ authenticated: false, user: null, coupons: [] })
    }

    const user = {
      id: dbUser.id,
      full_name: dbUser.nombre_completo,
      email: dbUser.correo,
      phone: dbUser.telefono,
      role: dbUser.rol === 'admin' ? 'admin' : 'client',
      spins_available: dbUser.tiros_disponibles,
      total_cupcakes_purchased: dbUser.total_cupcakes_comprados,
      created_at: dbUser.fecha_creacion,
      updated_at: dbUser.fecha_actualizacion
    }

    const { data: userCoupons } = await supabaseServer
      .from('cupones')
      .select('*, premio:premios(*)')
      .eq('usuario_id', user.id)

    return c.json({
      authenticated: true,
      user,
      coupons: userCoupons || []
    })

  } catch {
    return c.json({
      authenticated: true,
      user: payload,
      coupons: []
    })
  }
})

// 5. CERRAR SESIÓN (LOGOUT)
authRouter.post('/logout', async (c) => {
  deleteCookie(c, 'inge_token', { 
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Lax'
  })
  return c.json({ success: true, message: 'Sesión cerrada exitosamente.' })
})

// 6. OBTENER TODOS LOS CLIENTES (Exclusivo para Administrador)
authRouter.get('/all-clients', requireAdmin, async (c) => {
  try {
    let { data: users } = await supabaseServer
      .from('usuarios')
      .select('*')
      .order('fecha_creacion', { ascending: false })

    if (!users || users.length === 0) {
      const { data: profs } = await supabaseServer
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
      users = profs || []
    }

    const formatted = (users || []).map(u => ({
      id: u.id,
      full_name: u.nombre_completo || u.full_name,
      email: u.correo || u.email,
      phone: u.telefono || u.phone,
      role: u.rol || u.role,
      spins_available: u.tiros_disponibles !== undefined ? u.tiros_disponibles : u.spins_available,
      total_cupcakes_purchased: u.total_cupcakes_comprados !== undefined ? u.total_cupcakes_comprados : u.total_cupcakes_purchased,
      created_at: u.fecha_creacion || u.created_at,
      updated_at: u.fecha_actualizacion || u.updated_at
    }))

    return c.json({ success: true, users: formatted })
  } catch (err: any) {
    return c.json({ error: 'Error al consultar usuarios.' }, 500)
  }
})

// 7. OBTENER CLIENTE POR ID O QR (Exclusivo para Administrador / Caja)
authRouter.get('/user/:query', requireAdmin, async (c) => {
  try {
    let query = c.req.param('query')
    if (!query) {
      return c.json({ error: 'Parámetro de búsqueda requerido.' }, 400)
    }

    let searchPhone = ''
    let searchId = ''

    if (query.startsWith('INGE-CLIENT:')) {
      const parts = query.split(':')
      if (parts.length >= 3) {
        searchPhone = parts[1]
        searchId = parts[2]
      } else if (parts.length === 2) {
        searchId = parts[1]
      }
    } else {
      const cleanDigits = query.replace(/\D/g, '')
      if (cleanDigits.length === 10) {
        searchPhone = cleanDigits
      } else {
        searchId = query
      }
    }

    let foundUser = null

    if (searchId) {
      const { data: u1 } = await supabaseServer.from('usuarios').select('*').eq('id', searchId).single()
      if (u1) foundUser = u1
    }
    if (!foundUser && searchPhone) {
      const { data: u2 } = await supabaseServer.from('usuarios').select('*').eq('telefono', searchPhone).single()
      if (u2) foundUser = u2
    }

    if (!foundUser) {
      if (searchId) {
        const { data: p1 } = await supabaseServer.from('profiles').select('*').eq('id', searchId).single()
        if (p1) foundUser = p1
      }
      if (!foundUser && searchPhone) {
        const { data: p2 } = await supabaseServer.from('profiles').select('*').eq('phone', searchPhone).single()
        if (p2) foundUser = p2
      }
    }

    if (!foundUser) {
      return c.json({ error: 'Cliente no encontrado.' }, 404)
    }

    const formattedUser: any = {
      id: foundUser.id,
      full_name: foundUser.nombre_completo || foundUser.full_name,
      email: foundUser.correo || foundUser.email,
      phone: foundUser.telefono || foundUser.phone,
      role: foundUser.rol || foundUser.role,
      spins_available: foundUser.tiros_disponibles !== undefined ? foundUser.tiros_disponibles : foundUser.spins_available,
      total_cupcakes_purchased: foundUser.total_cupcakes_comprados !== undefined ? foundUser.total_cupcakes_comprados : foundUser.total_cupcakes_purchased,
      created_at: foundUser.fecha_creacion || foundUser.created_at,
      updated_at: foundUser.fecha_actualizacion || foundUser.updated_at
    }

    let { data: coupons } = await supabaseServer
      .from('cupones')
      .select('*, premio:premios(*)')
      .eq('usuario_id', foundUser.id)

    if (!coupons || coupons.length === 0) {
      const { data: altCoupons } = await supabaseServer
        .from('coupons')
        .select('*, prize:prizes(*)')
        .eq('user_id', foundUser.id)
      coupons = altCoupons || []
    }

    return c.json({
      success: true,
      user: formattedUser,
      coupons: coupons || []
    })
  } catch (err: any) {
    return c.json({ error: 'Error al buscar cliente por código QR.' }, 500)
  }
})

// 8. RECLAMAR RECOMPENSA SEMANAL DE 5 CUPCAKES (+1 TIRO EXTRA)
authRouter.post('/claim-weekly-reward', requireAuth, async (c) => {
  try {
    const authUser: any = (c.get as any)('user')
    const { user_id } = await c.req.json()

    // Solo el propio usuario autenticado o un admin puede reclamar su recompensa
    if (authUser && authUser.role !== 'admin' && authUser.id !== user_id) {
      return c.json({ error: 'No autorizado para reclamar recompensas de otro usuario.' }, 403)
    }

    const { data: user, error: fetchErr } = await supabaseServer
      .from('usuarios')
      .select('*')
      .eq('id', user_id)
      .single()

    if (fetchErr || !user) {
      return c.json({ error: 'Usuario no encontrado.' }, 404)
    }

    const currentSpins = user.tiros_disponibles || 0
    const newSpins = currentSpins + 1

    await supabaseServer
      .from('usuarios')
      .update({
        tiros_disponibles: newSpins,
        fecha_actualizacion: new Date().toISOString()
      })
      .eq('id', user_id)

    return c.json({
      success: true,
      spins_available: newSpins,
      message: '¡Muchas gracias por su preferencia! Has alcanzado la recompensa de esta semana 🥕✨'
    })
  } catch (err: any) {
    return c.json({ error: 'Error al reclamar recompensa.' }, 500)
  }
})
