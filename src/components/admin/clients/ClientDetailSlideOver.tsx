import React from 'react'
import { User, Phone, Sparkles, Ticket } from 'lucide-react'
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
          <div className="flex items-center gap-3 pb-3 border-b border-gray-200">
            <div className="w-10 h-10 rounded-full bg-[#16A34A] text-white flex items-center justify-center font-bold text-sm">
              {selectedClientDetail.full_name.charAt(0)}
            </div>
            <div>
              <h4 className="font-bold text-sm text-gray-900">{selectedClientDetail.full_name}</h4>
              <p className="text-xs text-gray-500 font-mono flex items-center gap-1">
                <Phone size={12} /> {selectedClientDetail.phone}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-gray-50 rounded-md border border-gray-200">
              <span className="text-gray-500 block text-[10px] uppercase">Tiros Disponibles</span>
              <strong className="text-base text-[#F56B2A] font-black">
                {selectedClientDetail.spins_available}
              </strong>
            </div>
            <div className="p-3 bg-gray-50 rounded-md border border-gray-200">
              <span className="text-gray-500 block text-[10px] uppercase">Cupcakes Totales</span>
              <strong className="text-base text-gray-900 font-black">
                {selectedClientDetail.total_cupcakes_purchased} pzas
              </strong>
            </div>
          </div>

          {/* SECCIÓN DE ASIGNACIÓN RÁPIDA DE TIROS EN EL DETALLE */}
          <div className="p-3 bg-orange-50/70 rounded-xl border border-orange-200 space-y-2">
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
                className="py-1.5 px-2 rounded-lg bg-white border border-orange-200 hover:bg-[#F56B2A] hover:text-white font-bold text-xs text-orange-900 transition shadow-2xs cursor-pointer"
              >
                +1 🥕
              </button>
              <button
                type="button"
                onClick={() => onQuickAddSpins(selectedClientDetail, 2)}
                className="py-1.5 px-2 rounded-lg bg-white border border-orange-200 hover:bg-[#F56B2A] hover:text-white font-bold text-xs text-orange-900 transition shadow-2xs cursor-pointer"
              >
                +2 🥕
              </button>
              <button
                type="button"
                onClick={() => onQuickAddSpins(selectedClientDetail, 5)}
                className="py-1.5 px-2 rounded-lg bg-white border border-orange-200 hover:bg-[#F56B2A] hover:text-white font-bold text-xs text-orange-900 transition shadow-2xs cursor-pointer"
              >
                +5 🎁
              </button>
              <button
                type="button"
                onClick={() => onOpenSpinsSlideOver(selectedClientDetail)}
                className="py-1.5 px-2 rounded-lg bg-[#0A2540] hover:bg-[#081C30] font-bold text-xs text-white transition shadow-2xs cursor-pointer"
              >
                Manual
              </button>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <h5 className="font-bold text-xs text-gray-900 flex items-center gap-1.5">
              <Ticket size={14} className="text-[#F56B2A]" />
              <span>Cupones del Cliente ({clientCoupons.length})</span>
            </h5>
            {clientCoupons.length > 0 ? (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {clientCoupons.map(c => (
                  <div key={c.id} className="p-2.5 rounded-md border border-gray-200 bg-gray-50 text-xs flex justify-between items-center">
                    <div>
                      <p className="font-bold text-gray-800">{c.prize?.title || 'Cupón'}</p>
                      <p className="font-mono text-[10px] text-gray-500">{c.code}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      c.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-600'
                    }`}>
                      {c.status === 'active' ? 'Activo' : 'Canjeado'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 italic">Sin cupones activos.</p>
            )}
          </div>
        </div>
      )}
    </SlideOver>
  )
}
