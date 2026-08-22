import React from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { X, Calendar } from 'lucide-react'
import type { Coupon } from '../../types'

interface CouponQRModalProps {
  coupon: Coupon | null
  onClose: () => void
}

export const CouponQRModal: React.FC<CouponQRModalProps> = ({ coupon, onClose }) => {
  if (!coupon) return null

  const prizeTitle = coupon.prize?.title || (coupon as any).premio?.titulo || 'Cupón de Descuento'
  const prizeDesc = coupon.prize?.description || (coupon as any).premio?.descripcion || 'Válido en tu próxima compra de cupcakes'
  const couponCode = coupon.code || (coupon as any).codigo
  const qrValue = coupon.qr_token || (coupon as any).token_qr || couponCode
  const expiresAt = coupon.expires_at || (coupon as any).fecha_expiracion

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl relative border-4 border-orange-100">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition p-1"
        >
          <X size={20} />
        </button>

        <div className="space-y-1 pt-2">
          <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded bg-orange-100 text-[#F56B2A]">
            CUPÓN DE PROMOCIÓN
          </span>
          <h3 className="font-heading font-black text-xl text-gray-900 leading-tight">
            {prizeTitle}
          </h3>
          <p className="text-xs text-gray-500">
            {prizeDesc}
          </p>
        </div>

        {/* QR Destacado */}
        <div className="p-4 bg-orange-50/50 rounded-2xl border border-orange-100 inline-block shadow-inner">
          <QRCodeSVG
            value={qrValue}
            size={180}
            bgColor="#FFFFFF"
            fgColor="#1E1E24"
            level="H"
            className="p-2 bg-white rounded-xl shadow-xs"
          />
        </div>

        <div className="space-y-1">
          <p className="text-[11px] font-mono uppercase tracking-widest text-gray-400">
            Código de Canje
          </p>
          <p className="font-mono font-bold text-lg text-gray-900 tracking-wider bg-gray-100 py-1.5 px-3 rounded-xl">
            {couponCode}
          </p>
        </div>

        {expiresAt && (
          <div className="flex items-center justify-center gap-1 text-[11px] text-gray-400">
            <Calendar size={12} />
            <span>Vence el {new Date(expiresAt).toLocaleDateString('es-MX')}</span>
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full py-3 rounded-xl bg-[#F56B2A] text-white font-bold text-xs shadow-md shadow-orange-500/20 hover:bg-orange-600 transition"
        >
          Listo
        </button>
      </div>
    </div>
  )
}
