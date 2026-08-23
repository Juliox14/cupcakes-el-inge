import React from 'react'
import { Sparkles } from 'lucide-react'
import { SlideOver } from '../SlideOver'
import type { UserProfile } from '../../../types'

interface ClientSpinsSlideOverProps {
  isOpen: boolean
  onClose: () => void
  selectedClientForSpins: UserProfile | null
  setSelectedClientForSpins: (client: UserProfile | null) => void
  clients: UserProfile[]
  spinsAmountToAdd: number
  setSpinsAmountToAdd: (amount: number) => void
  grantingSpins: boolean
  onSubmit: (e?: React.FormEvent) => void
}

export const ClientSpinsSlideOver: React.FC<ClientSpinsSlideOverProps> = ({
  isOpen,
  onClose,
  selectedClientForSpins,
  setSelectedClientForSpins,
  clients,
  spinsAmountToAdd,
  setSpinsAmountToAdd,
  grantingSpins,
  onSubmit,
}) => {
  return (
    <SlideOver
      isOpen={isOpen}
      onClose={onClose}
      title="Añadir Tiradas de Ruleta"
      icon={<Sparkles size={20} className="text-[#F56B2A]" />}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 font-semibold text-xs hover:bg-gray-50 transition cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => onSubmit()}
            disabled={grantingSpins || !selectedClientForSpins || spinsAmountToAdd === 0}
            className="px-5 py-2 rounded-md bg-gradient-to-r from-[#F56B2A] to-[#E65100] hover:from-[#EA580C] hover:to-[#C2410C] text-white font-bold text-xs transition shadow-sm cursor-pointer disabled:opacity-50"
          >
            {grantingSpins ? 'Asignando...' : 'Confirmar y Guardar Giros'}
          </button>
        </>
      }
    >
      <form onSubmit={(e) => { e.preventDefault(); onSubmit(e); }} className="space-y-4">
        <div>
          <label className="text-xs font-bold text-gray-700 block mb-1">
            Seleccionar Cliente
          </label>
          <select
            value={selectedClientForSpins?.id || ''}
            onChange={(e) => {
              const found = clients.find(c => c.id === e.target.value)
              if (found) setSelectedClientForSpins(found)
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-xs font-semibold focus:outline-none focus:border-[#0A2540]"
          >
            {clients.map(c => (
              <option key={c.id} value={c.id}>
                {c.full_name} ({c.phone}) — {c.spins_available} tiros actuales
              </option>
            ))}
          </select>
        </div>

        {selectedClientForSpins && (
          <div className="p-3 bg-orange-50 rounded-xl border border-orange-200 flex items-center justify-between text-xs">
            <div>
              <p className="font-bold text-orange-950">{selectedClientForSpins.full_name}</p>
              <p className="text-gray-500 font-mono text-[11px]">{selectedClientForSpins.phone}</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-gray-500 block uppercase font-semibold">Saldo Actual</span>
              <strong className="text-base text-[#F56B2A] font-black">
                {selectedClientForSpins.spins_available} tiros
              </strong>
            </div>
          </div>
        )}

        <div>
          <label className="text-xs font-bold text-gray-700 block mb-1">
            Cantidad de Tiradas a Otorgar:
          </label>
          <div className="flex items-center gap-3 mb-2">
            <input
              type="number"
              min="-50"
              max="100"
              value={spinsAmountToAdd}
              onChange={(e) => setSpinsAmountToAdd(parseInt(e.target.value) || 0)}
              className="w-28 px-3 py-2 border border-gray-300 rounded-md text-xs font-bold focus:outline-none focus:border-[#F56B2A]"
            />
            <span className="text-xs font-semibold text-gray-500">giros</span>
          </div>

          {/* Presets rápidos */}
          <div className="grid grid-cols-5 gap-1.5">
            {[1, 2, 3, 5, 10].map(n => (
              <button
                key={n}
                type="button"
                onClick={() => setSpinsAmountToAdd(n)}
                className={`py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer ${
                  spinsAmountToAdd === n
                    ? 'bg-[#F56B2A] text-white border-[#F56B2A] shadow-xs'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-orange-50 hover:text-[#F56B2A]'
                }`}
              >
                +{n} 🥕
              </button>
            ))}
          </div>
        </div>

        {selectedClientForSpins && (
          <div className="p-3 bg-slate-50 rounded-xl border border-gray-200 text-xs flex justify-between items-center">
            <span className="font-semibold text-gray-700">Nuevo Saldo Resultante:</span>
            <strong className="text-sm font-black text-emerald-700">
              {Math.max(0, (selectedClientForSpins.spins_available || 0) + spinsAmountToAdd)} tiros
            </strong>
          </div>
        )}
      </form>
    </SlideOver>
  )
}
