import React from 'react'
import { Sparkles, X, Gift } from 'lucide-react'

interface MajorPrizeModalProps {
  prizeTitle: string
  couponCode?: string
  onClose: () => void
}

export const MajorPrizeModal: React.FC<MajorPrizeModalProps> = ({
  prizeTitle,
  couponCode,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-sm bg-gradient-to-b from-[#FFF5ED] via-white to-[#FFF9F2] rounded-[32px] p-6 text-center shadow-2xl border-4 border-[#F56B2A] space-y-4 animate-scale-up overflow-hidden">
        {/* Destellos decorativos de fondo */}
        <div className="absolute -top-10 -left-10 w-32 h-32 bg-orange-400/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-amber-400/20 rounded-full blur-2xl pointer-events-none" />

        {/* Botón Cerrar */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 transition p-1.5 rounded-full hover:bg-black/5 z-10 cursor-pointer"
        >
          <X size={20} />
        </button>

        {/* Encabezado con Destellos */}
        <div className="space-y-1 pt-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-full text-[11px] font-black tracking-wider uppercase shadow-md animate-bounce">
            <Sparkles size={13} />
            <span>¡PREMIO MAYOR!</span>
            <Sparkles size={13} />
          </div>
          <h2 className="font-heading font-black text-2xl text-gray-900 leading-tight pt-1">
            {prizeTitle}
          </h2>
        </div>

        {/* GIF DEL GATO BAILANDO */}
        <div className="relative py-1 flex items-center justify-center">
          <div className="p-2 bg-orange-100/60 rounded-3xl border-2 border-dashed border-orange-300 shadow-inner">
            <img
              src="/cat-dancing.gif"
              alt="Gato Bailando El Inge"
              className="w-48 h-48 object-contain rounded-2xl mx-auto drop-shadow-md"
            />
          </div>
        </div>

        {/* Mensaje y Código */}
        <div className="space-y-2">
          <p className="text-xs text-gray-600 font-medium">
            ¡Felicidades! Se ha generado tu cupón de regalo en tu billetera digital.
          </p>

          {couponCode && (
            <div className="p-2.5 bg-orange-50 rounded-2xl border border-orange-200">
              <span className="text-[10px] text-gray-500 uppercase tracking-widest block font-bold">
                Código de Canje
              </span>
              <strong className="font-mono text-base font-black text-orange-950 tracking-wider">
                {couponCode}
              </strong>
            </div>
          )}
        </div>

        {/* Botón de Reclamar */}
        <button
          onClick={onClose}
          className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#F56B2A] to-[#E65100] hover:from-[#EA580C] hover:to-[#C2410C] text-white font-heading font-black text-sm uppercase tracking-wider shadow-lg shadow-orange-500/30 transition transform active:scale-98 cursor-pointer flex items-center justify-center gap-2"
        >
          <Gift size={16} />
          <span>¡Genial, Reclamar Premio!</span>
        </button>
      </div>
    </div>
  )
}
