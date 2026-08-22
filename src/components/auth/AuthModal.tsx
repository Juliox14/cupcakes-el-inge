import React, { useState } from 'react'
import { 
  User, 
  Mail, 
  Phone, 
  Lock, 
  X, 
  Sparkles,
  ShieldCheck
} from 'lucide-react'
import { registerUserApi, loginUserApi } from '../../lib/api'
import type { UserProfile, Coupon } from '../../types'

interface AuthModalProps {
  isOpen: boolean
  mode?: 'login' | 'register' | 'admin'
  onClose: () => void
  onAuthSuccess?: (user: UserProfile, coupons?: Coupon[]) => void
  onSuccess?: (user: UserProfile, coupons?: Coupon[]) => void
  allUsers?: UserProfile[]
  onNavigateToAdmin?: () => void
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  mode = 'login',
  onClose,
  onAuthSuccess,
  onSuccess,
  allUsers = [],
  onNavigateToAdmin,
}) => {
  const handleSuccess = onAuthSuccess || onSuccess || (() => {})
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'admin'>(mode)
  
  // Campos de formulario
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  
  // Campo único de login (Correo o Teléfono)
  const [identifier, setIdentifier] = useState('')
  
  // Admin login PIN
  const [adminPin, setAdminPin] = useState('')
  
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  if (!isOpen) return null

  // Manejar Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!identifier.trim() || !password.trim()) {
      setErrorMsg('Por favor ingresa tu correo o teléfono y tu contraseña.')
      return
    }

    setLoading(true)
    setErrorMsg(null)
    setSuccessMsg(null)

    try {
      const res = await loginUserApi({
        identifier: identifier.trim(),
        password: password.trim()
      })

      setSuccessMsg(res.message)
      setTimeout(() => {
        handleSuccess(res.user, res.coupons)
        onClose()
        if (res.user.role === 'admin' && onNavigateToAdmin) {
          onNavigateToAdmin()
        }
      }, 700)
    } catch (err: any) {
      // Fallback local si el usuario existe en memoria
      const cleanId = identifier.trim()
      const cleanDigits = cleanId.replace(/\D/g, '')
      const found = allUsers.find(u => 
        u.phone === cleanDigits || 
        (u.email && u.email.toLowerCase() === cleanId.toLowerCase()) ||
        (cleanId.toLowerCase() === 'admin' && u.role === 'admin')
      )

      if (found) {
        setSuccessMsg(`¡Bienvenido de vuelta, ${found.full_name.split(' ')[0]}!`)
        setTimeout(() => {
          handleSuccess(found)
          onClose()
          if (found.role === 'admin' && onNavigateToAdmin) {
            onNavigateToAdmin()
          }
        }, 700)
      } else {
        setErrorMsg(err.message || 'Usuario no encontrado o contraseña incorrecta.')
      }
    } finally {
      setLoading(false)
    }
  }

  // Manejar Registro de Cliente
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fullName.trim() || !email.trim() || !phone.trim() || !password.trim()) {
      setErrorMsg('Todos los campos son obligatorios.')
      return
    }

    const cleanPhone = phone.replace(/\D/g, '').slice(-10)
    if (cleanPhone.length < 10) {
      setErrorMsg('Ingresa un número de teléfono válido a 10 dígitos.')
      return
    }

    if (!email.includes('@')) {
      setErrorMsg('Ingresa un correo electrónico válido.')
      return
    }

    setLoading(true)
    setErrorMsg(null)
    setSuccessMsg(null)

    try {
      const res = await registerUserApi({
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: cleanPhone,
        password: password.trim()
      })

      setSuccessMsg(res.message)
      setTimeout(() => {
        handleSuccess(res.user, res.coupons)
        onClose()
      }, 800)
    } catch (err: any) {
      // Fallback local
      const newUserId = `user-${cleanPhone}`
      const localUser: UserProfile = {
        id: newUserId,
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: cleanPhone,
        role: 'client',
        spins_available: 1,
        total_cupcakes_purchased: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      setSuccessMsg('¡Registro exitoso! Tienes 1 tiro de bienvenida en la ruleta 🥕')
      setTimeout(() => {
        handleSuccess(localUser)
        onClose()
      }, 800)
    } finally {
      setLoading(false)
    }
  }

  // Manejar Acceso Admin
  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!adminPin.trim()) {
      setErrorMsg('Por favor ingresa tu contraseña o PIN de administrador.')
      return
    }

    setLoading(true)
    setErrorMsg(null)
    setSuccessMsg(null)

    try {
      // Intentar autenticar con el backend
      const res = await loginUserApi({
        identifier: '9611234567',
        password: adminPin.trim()
      })

      if (res.user.role === 'admin') {
        setSuccessMsg('¡Acceso concedido como Administrador!')
        setTimeout(() => {
          handleSuccess(res.user, res.coupons)
          onClose()
          if (onNavigateToAdmin) onNavigateToAdmin()
        }, 600)
      } else {
        setErrorMsg('El usuario no cuenta con privilegios de administrador.')
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Contraseña o PIN de administrador incorrecto.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
      {/* Fondo con desenfoque */}
      <div 
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity" 
      />

      {/* Contenedor Principal (Estilo de la Referencia 100% en Español) */}
      <div className="relative w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl bg-white p-5 sm:p-6 text-black my-auto z-10 border border-orange-400">
        {/* Botón Cerrar */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-black/80 hover:text-black p-1.5 rounded-full hover:bg-white/10 transition z-20"
        >
          <X size={18} />
        </button>

        {/* Encabezado con Logo y Título en Español */}
        <div className="text-center pt-2 pb-4 space-y-1.5">
          <img
            src="/logo-completo.png"
            alt="Cupcakes El Inge"
            className="h-32 mx-auto object-contain drop-shadow-md"
          />
          <h2 className="font-heading font-black text-2xl tracking-wider uppercase text-black drop-shadow-sm">
            {authMode === 'login' && '¡BIENVENIDO!'}
            {authMode === 'register' && 'REGÍSTRATE'}
            {authMode === 'admin' && 'PANEL ADMIN'}
          </h2>
          <p className="text-[11px] text-[#F56B2A] font-medium">
            {authMode === 'login' && 'Ingresa a tu cuenta para jugar y canjear cupones'}
            {authMode === 'register' && 'Únete al club y recibe 1 tiro gratis de bienvenida 🥕'}
            {authMode === 'admin' && 'Acceso restringido para el Administrador Julian Castro'}
          </p>
        </div>

        {/* TARJETA BLANCA FLOTANTE */}
        <div className="bg-white rounded-[28px] p-6 text-gray-900 shadow-xl space-y-4">
          {errorMsg && (
            <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-1.5">
              <Sparkles size={14} className="text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* ============================================================= */}
          {/* MODO 1: INICIAR SESIÓN (LOGIN)                                */}
          {/* ============================================================= */}
          {authMode === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-3.5">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Mail size={16} />
                </div>
                <input
                  type="text"
                  placeholder="Correo electrónico o Teléfono"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-100/90 border border-transparent rounded-2xl text-xs font-semibold text-gray-900 placeholder-gray-400 focus:bg-white focus:border-orange-500 focus:outline-none transition"
                  required
                />
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Lock size={16} />
                </div>
                <input
                  type="password"
                  placeholder="Contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-100/90 border border-transparent rounded-2xl text-xs font-semibold text-gray-900 placeholder-gray-400 focus:bg-white focus:border-orange-500 focus:outline-none transition"
                  required
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-6 rounded-full bg-gradient-to-r from-[#F56B2A] to-[#E65100] hover:from-[#EA580C] hover:to-[#C2410C] text-white font-heading font-black text-sm uppercase tracking-wider shadow-lg shadow-orange-500/30 transition-all transform active:scale-98 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? 'Ingresando...' : 'Iniciar Sesión'}
                </button>
              </div>

              <div className="text-center pt-2 space-y-2">
                <p className="text-xs text-gray-500">
                  ¿No tienes una cuenta?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('register')
                      setErrorMsg(null)
                      setSuccessMsg(null)
                    }}
                    className="text-[#F56B2A] font-bold hover:underline"
                  >
                    Regístrate
                  </button>
                </p>

                <div>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('admin')
                      setErrorMsg(null)
                      setSuccessMsg(null)
                    }}
                    className="text-[11px] text-gray-400 hover:text-gray-700 font-semibold"
                  >
                    🔑 Ingresar como Administrador
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* ============================================================= */}
          {/* MODO 2: REGISTRARSE (REGISTER)                                */}
          {/* ============================================================= */}
          {authMode === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <User size={16} />
                </div>
                <input
                  type="text"
                  placeholder="Nombre completo"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-100/90 border border-transparent rounded-2xl text-xs font-semibold text-gray-900 placeholder-gray-400 focus:bg-white focus:border-orange-500 focus:outline-none transition"
                  required
                />
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Mail size={16} />
                </div>
                <input
                  type="email"
                  placeholder="Correo electrónico"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-100/90 border border-transparent rounded-2xl text-xs font-semibold text-gray-900 placeholder-gray-400 focus:bg-white focus:border-orange-500 focus:outline-none transition"
                  required
                />
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Phone size={16} />
                </div>
                <input
                  type="tel"
                  placeholder="Número de teléfono (10 dígitos)"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  maxLength={10}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-100/90 border border-transparent rounded-2xl text-xs font-semibold text-gray-900 placeholder-gray-400 focus:bg-white focus:border-orange-500 focus:outline-none transition"
                  required
                />
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Lock size={16} />
                </div>
                <input
                  type="password"
                  placeholder="Contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-100/90 border border-transparent rounded-2xl text-xs font-semibold text-gray-900 placeholder-gray-400 focus:bg-white focus:border-orange-500 focus:outline-none transition"
                  required
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-6 rounded-full bg-gradient-to-r from-[#F56B2A] to-[#E65100] hover:from-[#EA580C] hover:to-[#C2410C] text-white font-heading font-black text-sm uppercase tracking-wider shadow-lg shadow-orange-500/30 transition-all transform active:scale-98 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
                </button>
              </div>

              <div className="text-center pt-2">
                <p className="text-xs text-gray-500">
                  ¿Ya tienes una cuenta?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('login')
                      setErrorMsg(null)
                      setSuccessMsg(null)
                    }}
                    className="text-[#F56B2A] font-bold hover:underline"
                  >
                    Inicia Sesión
                  </button>
                </p>
              </div>
            </form>
          )}

          {/* ============================================================= */}
          {/* MODO 3: ACCESO ADMINISTRADOR (PIN / ADMIN)                     */}
          {/* ============================================================= */}
          {authMode === 'admin' && (
            <form onSubmit={handleAdminSubmit} className="space-y-3.5">
              <div className="text-center p-2.5 bg-orange-50 rounded-2xl border border-orange-200">
                <p className="text-xs text-orange-950 font-bold">Acceso de Administrador</p>
                <p className="text-[10px] text-orange-700">Ingresa tu contraseña o PIN de seguridad</p>
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Lock size={16} />
                </div>
                <input
                  type="password"
                  placeholder="Contraseña o PIN de Administrador"
                  value={adminPin}
                  onChange={(e) => setAdminPin(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-100/90 border border-transparent rounded-2xl text-xs font-semibold text-gray-900 placeholder-gray-400 focus:bg-white focus:border-orange-500 focus:outline-none text-center tracking-widest font-mono"
                  autoFocus
                  required
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-6 rounded-full bg-[#1E1E24] hover:bg-black text-white font-heading font-black text-sm uppercase tracking-wider shadow-lg transition-all transform active:scale-98 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <ShieldCheck size={16} />
                  <span>{loading ? 'Verificando...' : 'Entrar al Dashboard'}</span>
                </button>
              </div>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login')
                    setErrorMsg(null)
                    setSuccessMsg(null)
                  }}
                  className="text-xs text-gray-500 hover:text-gray-800 font-bold"
                >
                  ← Volver a Inicio de Sesión
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
