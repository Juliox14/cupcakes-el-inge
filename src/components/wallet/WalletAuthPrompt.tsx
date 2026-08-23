import React from 'react'
import { Sparkles, Gift, QrCode, ShoppingBag, ArrowRight, UserPlus, LogIn } from 'lucide-react'

interface WalletAuthPromptProps {
  onOpenLogin: () => void
  onOpenRegister: () => void
  onOpenProducts: () => void
}

export const WalletAuthPrompt: React.FC<WalletAuthPromptProps> = ({
  onOpenLogin,
  onOpenRegister,
  onOpenProducts,
}) => {
  return (
    <div className="max-w-md mx-auto px-4 pt-4 pb-24 space-y-5 animate-fade-in">
      {/* 1. Tarjeta Preview de Fidelidad */}
      <div className="relative w-full rounded-3xl overflow-hidden shadow-xl bg-white p-6 text-center space-y-4">
        <div className="relative z-10 space-y-3">
          {/* Logo / Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/80 backdrop-blur-sm border border-orange-300 shadow-xs text-[11px] font-bold text-[#F56B2A]">
            <Sparkles size={13} className="text-[#F56B2A]" />
            <span>Club de lealtad</span>
          </div>

          <div className="w-20 h-20 mx-auto rounded-3xl bg-white shadow-md p-2 flex items-center justify-center border-2 border-orange-200">
            <img 
              src="/cupcake-color.png" 
              alt="Cupcakes El Inge" 
              className="w-14 h-14 object-contain drop-shadow"
            />
          </div>

          <div className="space-y-1">
            <h2 className="font-mono font-black text-xl text-gray-900">
              Tu Cartera de Cupones
            </h2>
            <p className="text-xs text-gray-600 max-w-xs mx-auto">
              Inicia sesión o regístrate para acumular sellos, desbloquear tu tiro de bienvenida en tu 1ra compra y ganar premios en la ruleta 🥕✨
            </p>
          </div>
        </div>

        {/* Botones de Autenticación */}
        <div className="relative z-10 space-y-2 pt-1">
          <button
            onClick={onOpenLogin}
            className="w-full py-3 px-4 rounded-2xl bg-[#F56B2A] hover:bg-carrot-600 text-white font-heading font-black text-xs uppercase tracking-wider shadow-lg shadow-orange-500/25 transition flex items-center justify-center gap-2 cursor-pointer active:scale-98"
          >
            <LogIn size={16} />
            <span>Iniciar Sesión</span>
          </button>

          <button
            onClick={onOpenRegister}
            className="w-full py-3 px-4 rounded-2xl bg-white hover:bg-orange-50 text-gray-900 font-heading font-black text-xs uppercase tracking-wider border-2 border-orange-200 shadow-sm transition flex items-center justify-center gap-2 cursor-pointer active:scale-98"
          >
            <UserPlus size={16} className="text-[#F56B2A]" />
            <span>Crear Cuenta Gratis</span>
          </button>
        </div>
      </div>

      {/* 2. Beneficios de tener cuenta */}
      <div className="bg-white rounded-2xl p-4 border border-gray-200/80 shadow-xs space-y-3">
        <h3 className="font-heading font-bold text-xs text-gray-900 uppercase tracking-wider text-center">
          ¿Qué obtienes con tu cuenta?
        </h3>

        <div className="space-y-2.5">
          <div className="flex items-start gap-3 p-2.5 rounded-xl bg-orange-50/60 border border-orange-100">
            <div className="w-8 h-8 rounded-lg bg-[#F56B2A] text-white flex items-center justify-center shrink-0 shadow-xs">
              <QrCode size={16} />
            </div>
            <div>
              <h4 className="font-bold text-xs text-gray-900">QR de Cliente Único</h4>
              <p className="text-[11px] text-gray-500 leading-tight">
                Escanéalo en mostrador y recibe sellos automáticos por tus cupcakes.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-2.5 rounded-xl bg-amber-50/60 border border-amber-100">
            <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Gift size={16} />
            </div>
            <div>
              <h4 className="font-bold text-xs text-gray-900">Gira la Ruleta de la Suerte</h4>
              <p className="text-[11px] text-gray-500 leading-tight">
                Gana premios, promociones y descuentos exclusivos jugando a la ruleta de la suerte.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Banner de Acceso Libre a Encargos y Menú */}
      <div className="bg-white rounded-2xl p-4 text-black shadow-md space-y-2.5">
        <div className="flex items-center gap-2">
          <ShoppingBag size={18} className="text-orange-400" />
          <span className="font-heading font-black text-xs uppercase tracking-wider text-orange-300">
            Encargos
          </span>
        </div>
        
        <p className="text-xs text-gray-600 leading-relaxed">
          ¿Quieres pedir cupcakes o pasteles para tu evento sin registrarte? Puedes consultar nuestro menú completo y ordenar directamente por WhatsApp.
        </p>

        <button
          onClick={onOpenProducts}
          className="w-full py-2.5 px-3 rounded-xl bg-[#F56B2A] hover:bg-carrot-600 hover:bg-carrot text-white font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-sm"
        >
          <span>Ver Menú y Hacer Encargo</span>
          <ArrowRight size={14} className="text-white" />
        </button>
      </div>
    </div>
  )
}
