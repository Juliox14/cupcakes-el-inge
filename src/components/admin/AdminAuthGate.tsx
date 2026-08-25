import React, { useState } from 'react'
import { ShieldCheck, Lock, ArrowLeft, KeyRound, Eye, EyeOff } from 'lucide-react'
import { loginUserApi } from '../../services/auth.service'
import { toast } from '../../context/ToastContext'
import type { UserProfile, Coupon } from '../../types'

interface AdminAuthGateProps {
  onSuccess: (user: UserProfile, coupons?: Coupon[]) => void
  onReturnToApp: () => void
}

export const AdminAuthGate: React.FC<AdminAuthGateProps> = ({
  onSuccess,
  onReturnToApp,
}) => {
  const [pin, setPin] = useState('')
  const [showPin, setShowPin] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pin.trim()) {
      toast.warning('PIN requerido', 'Por favor ingresa tu contraseña o PIN de administrador.')
      return
    }

    setLoading(true)
    

    try {
      const res = await loginUserApi({
        identifier: '9611234567',
        password: pin.trim(),
      })

      if (res.user.role === 'admin') {
        toast.success('¡Acceso Concedido!', 'Bienvenido al panel administrativo 🥕')
        onSuccess(res.user, res.coupons)
      } else {
        const msg = 'El usuario no cuenta con credenciales de administrador.'
        
        toast.error('Acceso Denegado', msg)
      }
    } catch (err: any) {
      const msg = err.message || 'Contraseña o PIN de administrador incorrecto.'
      
      toast.error('Credenciales incorrectas', msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#141419] flex items-center justify-center p-4 selection:bg-[#F56B2A] selection:text-white">
      {/* Fondo con textura sutil */}
      <div className="absolute inset-0 bg-[radial-gradient(#F56B2A_1px,transparent_1px)] bg-size[24px_24px] opacity-10 pointer-events-none" />

      <div className="relative w-full max-w-md bg-[#1E1E26] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 text-white z-10 animate-fade-in">
        {/* Encabezado */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-[#F56B2A]/15 border border-[#F56B2A]/30 text-[#F56B2A] rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-orange-500/10 mb-3">
            <ShieldCheck size={32} />
          </div>
          <span className="inline-block px-3 py-1 bg-red-500/15 border border-red-500/30 text-red-400 font-mono text-[10px] font-bold tracking-widest uppercase rounded-full">
            Área Restringida
          </span>
          <h1 className="font-heading font-black text-2xl tracking-wider text-white">
            PANEL ADMINISTRATIVO
          </h1>
          <p className="text-xs text-gray-400 max-w-xs mx-auto">
            Ingresa tu contraseña o PIN de seguridad para acceder al panel de control de Cupcakes El Inge.
          </p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-300">
              PIN / Contraseña de Seguridad
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                <KeyRound size={18} />
              </div>
              <input
                type={showPin ? 'text' : 'password'}
                placeholder="••••••••••••"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="w-full pl-11 pr-11 py-3.5 bg-black/40 border border-white/15 rounded-2xl text-sm font-mono tracking-widest text-white placeholder-gray-600 focus:outline-none focus:border-[#F56B2A] focus:ring-1 focus:ring-[#F56B2A] transition"
                autoFocus
                required
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-200 transition cursor-pointer"
                title={showPin ? 'Ocultar contraseña' : 'Ver contraseña'}
              >
                {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 px-6 rounded-2xl bg-linear-to-r from-[#F56B2A] to-carrot-600 hover:from-[#EA580C] hover:to-[#C2410C] text-white font-heading font-black text-sm uppercase tracking-wider shadow-lg shadow-orange-500/30 transition transform active:scale-98 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
          >
            <Lock size={16} />
            <span>{loading ? 'Verificando credenciales...' : 'Desbloquear Panel Admin'}</span>
          </button>
        </form>

        {/* Botón Volver */}
        <div className="pt-2 text-center border-t border-white/5">
          <button
            onClick={onReturnToApp}
            className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition font-semibold"
          >
            <ArrowLeft size={14} />
            <span>Volver a la App del Cliente</span>
          </button>
        </div>
      </div>
    </div>
  )
}
