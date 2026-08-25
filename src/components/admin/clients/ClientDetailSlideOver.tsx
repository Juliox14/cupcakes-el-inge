import React from 'react'
import { User, Phone, Sparkles, Ticket, CheckCircle2, Clock, Gift, Tag, DollarSign } from 'lucide-react'
import { SlideOver } from '../SlideOver'
import type { UserProfile, Coupon } from '../../../types'

interface ClientDetailSlideOverProps {
  isOpen: boolean
  onClose: () => void
  selectedClientDetail: UserProfile | null
  clientCoupons: Coupon[]
  onQuickAddSpins: (client: UserProfile, amount: number) => void
  onOpenSpinsSlideOver: (client: UserProfile) => void
}

export const ClientDetailSlideOver: React.FC<ClientDetailSlideOverProps> = ({
  isOpen,
  onClose,
  selectedClientDetail,
  clientCoupons,
  onQuickAddSpins,
  onOpenSpinsSlideOver,
}) => {
  return (
    <SlideOver
      isOpen={isOpen}
      onClose={onClose}
      title="Detalles del Cliente"
      icon={<User size={20} />}
    >
      {selectedClientDetail && (
        <div className="space-y-4">
          {/* Header con Inicial, Nombre, Teléfono y Fecha de Registro */}
          <div className="flex items-center gap-3 pb-3 border-b border-gray-200">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#16A34A] to-emerald-700 text-white flex items-center justify-center font-bold text-base shadow-sm">
              {selectedClientDetail.full_name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="font-bold text-sm text-gray-900 truncate">{selectedClientDetail.full_name}</h4>
              <p className="text-xs text-gray-500 font-mono flex items-center gap-1 mt-0.5">
                <Phone size={12} className="text-emerald-600" /> {selectedClientDetail.phone}
              </p>
              {selectedClientDetail.created_at && (
                <p className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1">
                  <Clock size={11} /> Registrado el{' '}
                  {new Date(selectedClientDetail.created_at).toLocaleDateString('es-MX', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  })}
                </p>
              )}
            </div>
          </div>

          {/* Métricas del Cliente */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
              <span className="text-gray-500 block text-[10px] uppercase font-semibold">Tiros Disponibles</span>
              <strong className="text-lg text-[#F56B2A] font-black block mt-0.5">
                {selectedClientDetail.spins_available}
              </strong>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
              <span className="text-gray-500 block text-[10px] uppercase font-semibold">Cupcakes Totales</span>
              <strong className="text-lg text-gray-900 font-black block mt-0.5">
                {selectedClientDetail.total_cupcakes_purchased} pzas
              </strong>
            </div>
          </div>

          {/* Asignación Rápida de Tiros */}
          <div className="p-3 bg-orange-50/70 rounded-2xl border border-orange-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-orange-950 flex items-center gap-1">
                <Sparkles size={14} className="text-orange-500" />
                Asignar Giros a este Cliente
              </span>
              <span className="text-[11px] font-mono font-bold text-orange-600">
                {selectedClientDetail.spins_available} tiros actuales
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => onQuickAddSpins(selectedClientDetail, 1)}
                className="py-1.5 px-2 rounded-xl bg-white border border-orange-200 hover:bg-[#F56B2A] hover:text-white font-bold text-xs text-orange-900 transition shadow-2xs cursor-pointer active:scale-95 text-center"
              >
                +1 🥕
              </button>
              <button
                type="button"
                onClick={() => onQuickAddSpins(selectedClientDetail, 2)}
                className="py-1.5 px-2 rounded-xl bg-white border border-orange-200 hover:bg-[#F56B2A] hover:text-white font-bold text-xs text-orange-900 transition shadow-2xs cursor-pointer active:scale-95 text-center"
              >
                +2 🥕
              </button>
              <button
                type="button"
                onClick={() => onQuickAddSpins(selectedClientDetail, 5)}
                className="py-1.5 px-2 rounded-xl bg-white border border-orange-200 hover:bg-[#F56B2A] hover:text-white font-bold text-xs text-orange-900 transition shadow-2xs cursor-pointer active:scale-95 text-center"
              >
                +5 🎁
              </button>
              <button
                type="button"
                onClick={() => onOpenSpinsSlideOver(selectedClientDetail)}
                className="py-1.5 px-2 rounded-xl bg-[#0A2540] hover:bg-[#081C30] font-bold text-xs text-white transition shadow-2xs cursor-pointer active:scale-95 text-center"
              >
                Manual
              </button>
            </div>
          </div>

          {/* Listado Completo de Cupones del Cliente */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <h5 className="font-bold text-xs text-gray-900 flex items-center gap-1.5">
                <Ticket size={15} className="text-[#F56B2A]" />
                <span>Cupones del Cliente ({clientCoupons.length})</span>
              </h5>
              {clientCoupons.length > 0 && (
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  {clientCoupons.filter(c => c.status === 'active' || (c as any).estado === 'activo').length} activos
                </span>
              )}
            </div>

            {clientCoupons.length > 0 ? (
              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {clientCoupons.map(c => {
                  const title = c.prize?.title || (c as any).premio?.titulo || (c as any).title || 'Cupón de Recompensa'
                  const desc = c.prize?.description || (c as any).premio?.descripcion || ''
                  const code = c.code || (c as any).codigo || 'INGE-CUPON'
                  const status = c.status || (c as any).estado || 'active'
                  const isRedeemed = status === 'redeemed' || status === 'canjeado'
                  const isExpired = status === 'expired' || status === 'expirado'
                  const isActive = !isRedeemed && !isExpired
                  const benefitType = c.prize?.tipo_beneficio || (c as any).premio?.tipo_beneficio

                  return (
                    <div
                      key={c.id}
                      className={`p-3 rounded-xl border text-xs transition space-y-1.5 ${
                        isActive
                          ? 'bg-gradient-to-r from-orange-50/70 to-amber-50/40 border-orange-200 shadow-2xs'
                          : isRedeemed
                          ? 'bg-slate-50 border-gray-200 opacity-80'
                          : 'bg-rose-50/50 border-rose-200 opacity-70'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-bold text-gray-900 flex items-center gap-1.5 text-xs">
                            {benefitType === 'producto_gratis' && <Gift size={13} className="text-red-500 shrink-0" />}
                            {benefitType === 'descuento_fijo' && <Tag size={13} className="text-orange-500 shrink-0" />}
                            {benefitType === 'precio_promocional' && <DollarSign size={13} className="text-emerald-500 shrink-0" />}
                            <span className="truncate">{title}</span>
                          </p>
                          {desc && <p className="text-[11px] text-gray-500 line-clamp-1 mt-0.5">{desc}</p>}
                        </div>

                        {/* Status Badge */}
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black shrink-0 border ${
                            isActive
                              ? 'bg-emerald-100 border-emerald-200 text-emerald-800'
                              : isRedeemed
                              ? 'bg-slate-200 border-slate-300 text-slate-700'
                              : 'bg-rose-100 border-rose-200 text-rose-800'
                          }`}
                        >
                          {isActive ? 'Activo' : isRedeemed ? 'Canjeado' : 'Expirado'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-gray-200/60 text-[10px] text-gray-500 font-mono">
                        <span className="font-bold tracking-wider text-gray-700 bg-white/80 px-2 py-0.5 rounded border border-gray-200">
                          {code}
                        </span>

                        <span>
                          {isRedeemed && (c.redeemed_at || (c as any).fecha_canje) ? (
                            <span className="flex items-center gap-1 text-slate-600">
                              <CheckCircle2 size={11} className="text-slate-500" />
                              Canjeado:{' '}
                              {new Date(c.redeemed_at || (c as any).fecha_canje).toLocaleDateString('es-MX', {
                                day: '2-digit',
                                month: 'short'
                              })}
                            </span>
                          ) : (c.expires_at || (c as any).fecha_expiracion) ? (
                            <span>
                              Vence:{' '}
                              {new Date(c.expires_at || (c as any).fecha_expiracion).toLocaleDateString('es-MX', {
                                day: '2-digit',
                                month: 'short'
                              })}
                            </span>
                          ) : null}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-dashed border-gray-300 text-center space-y-1 bg-gray-50/50">
                <Ticket size={24} className="mx-auto text-gray-300" />
                <p className="text-xs font-semibold text-gray-500">Este cliente no tiene cupones registrados.</p>
                <p className="text-[10px] text-gray-400">Los cupones ganados en la ruleta se reflejarán aquí automáticamente.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </SlideOver>
  )
}
