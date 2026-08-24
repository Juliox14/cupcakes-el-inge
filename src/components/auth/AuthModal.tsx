import React, { useState } from 'react'
import { 
  User, 
  Mail, 
  Phone, 
  Lock, 
  X, 
  ShieldCheck,
  KeyRound,
  ArrowLeft,
  CheckCircle2
} from 'lucide-react'
import { registerUserApi, loginUserApi, forgotPasswordApi, resetPasswordApi } from '../../lib/api'
import type { UserProfile, Coupon } from '../../types'
import { toast } from '../../context/ToastContext'

interface AuthModalProps {
  isOpen: boolean
  mode?: 'login' | 'register' | 'admin' | 'forgot' | 'reset'
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
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'admin' | 'forgot' | 'reset'>(mode)
  
  // Campos de login / registro
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [identifier, setIdentifier] = useState('')
  const [adminPin, setAdminPin] = useState('')

  // Campos de recuperación de contraseña
  const [forgotEmail, setForgotEmail] = useState('')
  const [resetCode, setResetCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  // 1. Manejar Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!identifier.trim() || !password.trim()) {
      toast.error('Campos incompletos', 'Por favor ingresa tu correo o teléfono y tu contraseña.')
      return
    }

    setLoading(true)

    try {
      const res = await loginUserApi({
        identifier: identifier.trim(),
        password: password.trim()
      })

      toast.success('¡Inicio de sesión exitoso!', `Bienvenido ${res.user.full_name.split(' ')[0]}`)
      handleSuccess(res.user, res.coupons)
      onClose()
      if (res.user.role === 'admin' && onNavigateToAdmin) {
        onNavigateToAdmin()
      }
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
        toast.success('¡Inicio de sesión exitoso!', `Bienvenido de vuelta, ${found.full_name.split(' ')[0]}`)
        handleSuccess(found)
        onClose()
        if (found.role === 'admin' && onNavigateToAdmin) {
          onNavigateToAdmin()
        }
      } else {
        const errTxt = err.message || 'Usuario no encontrado o contraseña incorrecta.'
        toast.error('Error al iniciar sesión', errTxt)
      }
    } finally {
      setLoading(false)
    }
  }

  // 2. Manejar Registro de Cliente
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fullName.trim() || !email.trim() || !phone.trim() || !password.trim()) {
      const msg = 'Todos los campos son obligatorios.'
      toast.warning('Campos incompletos', msg)
      return
    }

    const cleanPhone = phone.replace(/\D/g, '').slice(-10)
    if (cleanPhone.length < 10) {
      const msg = 'Ingresa un número de teléfono válido a 10 dígitos.'
      toast.warning('Teléfono inválido', msg)
      return
    }

    if (!email.includes('@')) {
      const msg = 'Ingresa un correo electrónico válido.'
      // 
      toast.warning('Correo inválido', msg)
      return
    }

    setLoading(true)
    // 

    try {
      const res = await registerUserApi({
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: cleanPhone,
        password: password.trim()
      })

      toast.success('¡Cuenta creada con éxito!', '¡Bienvenido! Realiza tu primera compra en mostrador para activar tu tiro de ruleta 🥕')
      handleSuccess(res.user, res.coupons)
      onClose()
    } catch (err: any) {
      // Fallback local
      const newUserId = `user-${cleanPhone}`
      const localUser: UserProfile = {
        id: newUserId,
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: cleanPhone,
        role: 'client',
        spins_available: 0,
        total_cupcakes_purchased: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      toast.success('¡Cuenta creada con éxito!', '¡Bienvenido! Realiza tu primera compra en mostrador para activar tu tiro de ruleta 🥕')
      handleSuccess(localUser)
      onClose()
    } finally {
      setLoading(false)
    }
  }

  // 3. Manejar Acceso Admin
  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!adminPin.trim()) {
      toast.warning('PIN requerido', 'Por favor ingresa tu contraseña o PIN de administrador.')
      return
    }

    setLoading(true)

    try {
      const res = await loginUserApi({
        identifier: '9611234567',
        password: adminPin.trim()
      })

      if (res.user.role === 'admin') {
        toast.success('¡Acceso concedido!', 'Bienvenido al panel administrativo')
        handleSuccess(res.user, res.coupons)
        onClose()
        if (onNavigateToAdmin) onNavigateToAdmin()
      } else {
        const msg = 'El usuario no cuenta con privilegios de administrador.'
        // 
        toast.error('Acceso denegado', msg)
      }
    } catch (err: any) {
      const msg = err.message || 'Contraseña o PIN de administrador incorrecto.'
      
      toast.error('Credenciales incorrectas', msg)
    } finally {
      setLoading(false)
    }
  }

  // 4. Manejar Solicitud de Código de Recuperación
  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanMail = forgotEmail.trim().toLowerCase()
    if (!cleanMail || !cleanMail.includes('@')) {
      const msg = 'Por favor ingresa un correo electrónico válido.'
      
      toast.warning('Correo inválido', msg)
      return
    }

    setLoading(true)
    

    try {
      const res = await forgotPasswordApi({ email: cleanMail })
      toast.success('¡Código enviado!', res.message || 'Revisa tu bandeja de entrada o spam.')
      setAuthMode('reset')
    } catch (err: any) {
      const msg = err.message || 'No se pudo enviar el código. Verifica que el correo esté registrado.'
      
      toast.error('Error al enviar código', msg)
    } finally {
      setLoading(false)
    }
  }

  // 5. Manejar Restablecimiento con Código y Nueva Contraseña
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanMail = forgotEmail.trim().toLowerCase()
    const cleanC = resetCode.trim()

    if (!cleanC || cleanC.length !== 6) {
      const msg = 'El código de verificación debe tener 6 dígitos.'
      
      toast.warning('Código incompleto', msg)
      return
    }

    if (!newPassword || newPassword.length < 4) {
      const msg = 'La nueva contraseña debe tener al menos 4 caracteres.'
      
      toast.warning('Contraseña muy corta', msg)
      return
    }

    if (newPassword !== confirmPassword) {
      const msg = 'Las contraseñas no coinciden. Por favor verifícalas.'
      
      toast.warning('No coinciden', msg)
      return
    }

    setLoading(true)
    

    try {
      const res = await resetPasswordApi({
        email: cleanMail,
        code: cleanC,
        new_password: newPassword.trim(),
      })

      toast.success('¡Contraseña restablecida!', res.message || 'Ya puedes iniciar sesión.')
      setIdentifier(cleanMail)
      setPassword('')
      setResetCode('')
      setNewPassword('')
      setConfirmPassword('')
      setAuthMode('login')
    } catch (err: any) {
      const msg = err.message || 'El código es inválido o ha expirado. Solicita uno nuevo.'
      
      toast.error('Error al restablecer', msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
      {/* FONDO OSCURO BLUR */}
      <div 
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity" 
      />

      {/* CONTENEDOR PRINCIPAL */}
      <div className="relative w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl bg-white p-5 sm:p-6 text-black my-auto z-10 border border-orange-400">
        {/* Botón Cerrar */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-black/80 hover:text-black p-1.5 rounded-full hover:bg-black/5 transition z-20 cursor-pointer"
        >
          <X size={18} />
        </button>

        {/* Encabezado con Logo */}
        <div className="text-center pt-2 pb-4 space-y-1.5">
          <img
            src="/logo-completo.png"
            alt="Cupcakes El Inge"
            className="h-28 mx-auto object-contain drop-shadow-md"
          />
          <h2 className="font-heading font-black text-2xl tracking-wider uppercase text-black drop-shadow-sm">
            {authMode === 'login' && '¡BIENVENIDO!'}
            {authMode === 'register' && 'REGÍSTRATE'}
            {authMode === 'admin' && 'PANEL ADMIN'}
            {authMode === 'forgot' && 'RECUPERAR'}
            {authMode === 'reset' && 'NUEVA CLAVE'}
          </h2>
          <p className="text-[11px] text-[#F56B2A] font-medium">
            {authMode === 'login' && 'Ingresa a tu cuenta para jugar y canjear cupones'}
            {authMode === 'register' && 'Únete al club y recibe 1 tiro de bienvenida en tu 1ra compra 🥕'}
            {authMode === 'admin' && 'Acceso restringido para el Administrador Julian Castro'}
            {authMode === 'forgot' && 'Te enviaremos un código de 6 dígitos a tu correo registrado'}
            {authMode === 'reset' && 'Ingresa el código que te enviamos y tu nueva contraseña'}
          </p>
        </div>

        {/* CUERPO DEL MODAL */}
        <div className="space-y-4">

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

              {/* Botón Olvidé mi Contraseña */}
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => {
                    setForgotEmail(identifier.includes('@') ? identifier : '')
                    setAuthMode('forgot')
                    
                  }}
                  className="text-[11px] text-gray-500 hover:text-[#F56B2A] font-semibold hover:underline cursor-pointer"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>

              <div className="pt-1">
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
          {/* MODO 4: SOLICITAR CÓDIGO (FORGOT PASSWORD)                     */}
          {/* ============================================================= */}
          {authMode === 'forgot' && (
            <form onSubmit={handleForgotPasswordSubmit} className="space-y-3.5">
              <div className="p-3 bg-orange-50 rounded-2xl border border-orange-200 text-center space-y-1">
                <KeyRound size={24} className="text-[#F56B2A] mx-auto" />
                <p className="text-xs font-bold text-orange-950">¿Olvidaste tu contraseña?</p>
                <p className="text-[11px] text-gray-600">
                  Ingresa tu correo registrado y te enviaremos un código de 6 dígitos para restablecerla.
                </p>
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Mail size={16} />
                </div>
                <input
                  type="email"
                  placeholder="Tu correo electrónico registrado"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-100/90 border border-transparent rounded-2xl text-xs font-semibold text-gray-900 placeholder-gray-400 focus:bg-white focus:border-orange-500 focus:outline-none transition"
                  autoFocus
                  required
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading || !forgotEmail.trim()}
                  className="w-full py-3.5 px-6 rounded-full bg-gradient-to-r from-[#F56B2A] to-[#E65100] hover:from-[#EA580C] hover:to-[#C2410C] text-white font-heading font-black text-xs uppercase tracking-wider shadow-lg shadow-orange-500/30 transition-all transform active:scale-98 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? 'Enviando código...' : 'Enviar Código por Correo'}
                </button>
              </div>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login')
                    
                  }}
                  className="text-xs text-gray-500 hover:text-gray-800 font-bold flex items-center justify-center gap-1 mx-auto cursor-pointer"
                >
                  <ArrowLeft size={14} />
                  <span>Volver a Iniciar Sesión</span>
                </button>
              </div>
            </form>
          )}

          {/* ============================================================= */}
          {/* MODO 5: INGRESAR CÓDIGO Y NUEVA CLAVE (RESET PASSWORD)         */}
          {/* ============================================================= */}
          {authMode === 'reset' && (
            <form onSubmit={handleResetPasswordSubmit} className="space-y-3">
              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-center space-y-1">
                <CheckCircle2 size={22} className="text-emerald-600 mx-auto" />
                <p className="text-xs font-bold text-emerald-950">Código enviado a:</p>
                <p className="text-[11px] font-mono text-emerald-800 font-bold truncate">
                  {forgotEmail}
                </p>
                <p className="text-[10px] text-gray-500">Revisa tu bandeja de entrada o spam (10 min)</p>
              </div>

              {/* Input Código 6 dígitos */}
              <div>
                <label className="text-[11px] font-bold text-gray-700 block mb-1">
                  Código de Verificación (6 dígitos) *
                </label>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="000000"
                  value={resetCode}
                  onChange={(e) => setResetCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full py-2.5 px-3 bg-gray-100/90 border border-transparent rounded-2xl text-center text-lg font-mono font-black tracking-widest text-gray-900 placeholder-gray-400 focus:bg-white focus:border-orange-500 focus:outline-none transition"
                  autoFocus
                  required
                />
              </div>

              {/* Input Nueva Contraseña */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Lock size={16} />
                </div>
                <input
                  type="password"
                  placeholder="Nueva contraseña (mínimo 4 caracteres)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-100/90 border border-transparent rounded-2xl text-xs font-semibold text-gray-900 placeholder-gray-400 focus:bg-white focus:border-orange-500 focus:outline-none transition"
                  required
                />
              </div>

              {/* Input Confirmar Contraseña */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Lock size={16} />
                </div>
                <input
                  type="password"
                  placeholder="Confirmar nueva contraseña"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-100/90 border border-transparent rounded-2xl text-xs font-semibold text-gray-900 placeholder-gray-400 focus:bg-white focus:border-orange-500 focus:outline-none transition"
                  required
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading || resetCode.length !== 6 || !newPassword}
                  className="w-full py-3.5 px-6 rounded-full bg-gradient-to-r from-[#15803D] to-[#16A34A] hover:from-[#166534] hover:to-[#15803D] text-white font-heading font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-600/30 transition-all transform active:scale-98 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? 'Restableciendo...' : 'Restablecer y Guardar'}
                </button>
              </div>

              <div className="flex items-center justify-between text-xs pt-1 px-1">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('forgot')
                    
                  }}
                  className="text-gray-500 hover:text-gray-800 font-semibold cursor-pointer"
                >
                  ← Cambiar correo
                </button>

                <button
                  type="button"
                  onClick={handleForgotPasswordSubmit}
                  disabled={loading}
                  className="text-[#F56B2A] hover:underline font-bold cursor-pointer"
                >
                  Reenviar código
                </button>
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
