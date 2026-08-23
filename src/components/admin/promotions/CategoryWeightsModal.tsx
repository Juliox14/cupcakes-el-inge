import React from 'react'
import { Settings, X, CheckCircle2, AlertTriangle } from 'lucide-react'

interface CategoryWeightsModalProps {
  isOpen: boolean
  onClose: () => void
  categoryWeights: {
    sin_premio: number
    promocion: number
    alto_valor: number
  }
  setCategoryWeights: React.Dispatch<React.SetStateAction<{
    sin_premio: number
    promocion: number
    alto_valor: number
  }>>
  activePrizesCount: {
    tier_50_no_prize: number
    tier_40_promo: number
    tier_10_high_value: number
  }
  savingCategoryWeights: boolean
  categoryModalError: string | null
  categorySuccessMsg: string | null
  onSave: (e: React.FormEvent) => void
}

export const CategoryWeightsModal: React.FC<CategoryWeightsModalProps> = ({
  isOpen,
  onClose,
  categoryWeights,
  setCategoryWeights,
  activePrizesCount,
  savingCategoryWeights,
  categoryModalError,
  categorySuccessMsg,
  onSave,
}) => {
  if (!isOpen) return null

  const sumWeights =
    Number(categoryWeights.sin_premio || 0) +
    Number(categoryWeights.promocion || 0) +
    Number(categoryWeights.alto_valor || 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-gray-200 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-gray-200">
          <div className="flex items-center gap-2 text-[#0A2540]">
            <div className="p-2 bg-slate-100 rounded-lg">
              <Settings size={18} />
            </div>
            <div>
              <h3 className="font-bold text-sm">Ajustar Probabilidades por Categoría</h3>
              <p className="text-[11px] text-gray-500">
                Se distribuyen equitativamente entre las opciones activas.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Alerta de Suma Total (Debe ser 100%) */}
        <div
          className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
            sumWeights === 100
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-amber-50 border-amber-300 text-amber-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {sumWeights === 100 ? (
              <CheckCircle2 size={16} className="text-emerald-600" />
            ) : (
              <AlertTriangle size={16} className="text-amber-600" />
            )}
            <span className="font-semibold">
              {sumWeights === 100
                ? 'Distribución equilibrada (100%)'
                : `Suma total: ${sumWeights}% (Recomendado: 100%)`}
            </span>
          </div>
          <strong className="font-mono font-black">{sumWeights}%</strong>
        </div>

        {categoryModalError && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg font-bold">
            {categoryModalError}
          </div>
        )}

        {categorySuccessMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg font-bold">
            {categorySuccessMsg}
          </div>
        )}

        <form onSubmit={onSave} className="space-y-4">
          {/* 1. Sin Premio */}
          <div className="p-3.5 rounded-xl border border-gray-200 bg-gray-50/70 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-gray-400" />
                <span>🎯 Sin Premio / Sigue Intentando</span>
              </label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={categoryWeights.sin_premio}
                  onChange={(e) =>
                    setCategoryWeights((prev) => ({
                      ...prev,
                      sin_premio: Number(e.target.value),
                    }))
                  }
                  className="w-16 px-2 py-1 border border-gray-300 rounded-md text-xs font-mono font-bold text-center bg-white"
                />
                <span className="text-xs font-bold text-gray-500">%</span>
              </div>
            </div>
            <p className="text-[11px] text-gray-500">
              Repartido entre <strong>{activePrizesCount.tier_50_no_prize}</strong> opciones activas (~
              {activePrizesCount.tier_50_no_prize > 0
                ? Math.round((categoryWeights.sin_premio / activePrizesCount.tier_50_no_prize) * 10) / 10
                : 0}
              % cada una).
            </p>
          </div>

          {/* 2. Promociones */}
          <div className="p-3.5 rounded-xl border border-orange-200 bg-orange-50/40 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-orange-900 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#F56B2A]" />
                <span>🏷️ Promociones & Descuentos (2x$35, $5 MXN, etc.)</span>
              </label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={categoryWeights.promocion}
                  onChange={(e) =>
                    setCategoryWeights((prev) => ({
                      ...prev,
                      promocion: Number(e.target.value),
                    }))
                  }
                  className="w-16 px-2 py-1 border border-orange-300 rounded-md text-xs font-mono font-bold text-center bg-white text-orange-900"
                />
                <span className="text-xs font-bold text-gray-500">%</span>
              </div>
            </div>
            <p className="text-[11px] text-orange-800/80">
              Repartido entre <strong>{activePrizesCount.tier_40_promo}</strong> promociones activas (~
              {activePrizesCount.tier_40_promo > 0
                ? Math.round((categoryWeights.promocion / activePrizesCount.tier_40_promo) * 10) / 10
                : 0}
              % cada una).
            </p>
          </div>

          {/* 3. Alto Valor */}
          <div className="p-3.5 rounded-xl border border-red-200 bg-red-50/40 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-red-900 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                <span>🎁 Alto Valor / Cupcake Gratis</span>
              </label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={categoryWeights.alto_valor}
                  onChange={(e) =>
                    setCategoryWeights((prev) => ({
                      ...prev,
                      alto_valor: Number(e.target.value),
                    }))
                  }
                  className="w-16 px-2 py-1 border border-red-300 rounded-md text-xs font-mono font-bold text-center bg-white text-red-900"
                />
                <span className="text-xs font-bold text-gray-500">%</span>
              </div>
            </div>
            <p className="text-[11px] text-red-800/80">
              Repartido entre <strong>{activePrizesCount.tier_10_high_value}</strong> premios activos (~
              {activePrizesCount.tier_10_high_value > 0
                ? Math.round((categoryWeights.alto_valor / activePrizesCount.tier_10_high_value) * 10) / 10
                : 0}
              % cada uno).
            </p>
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-xs font-bold text-gray-700 hover:bg-gray-50 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={savingCategoryWeights}
              className="px-4 py-2 bg-[#0A2540] hover:bg-slate-800 text-white rounded-md text-xs font-bold shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {savingCategoryWeights ? 'Guardando y rebalanceando...' : 'Guardar y Redistribuir'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
