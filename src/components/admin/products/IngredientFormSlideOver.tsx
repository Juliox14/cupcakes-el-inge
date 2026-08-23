import React from 'react'
import { SlideOver } from '../SlideOver'
import type { Ingrediente } from '../../../types'

interface IngredientFormState {
  nombre: string
  descripcion?: string
  proveedor: string
  precio: number
  cantidad_numerica: number
  unidad_medida: string
}

interface IngredientFormSlideOverProps {
  isOpen: boolean
  onClose: () => void
  editingIngredient: Ingrediente | null
  ingredientForm: IngredientFormState
  setIngredientForm: React.Dispatch<React.SetStateAction<any>>
  onSubmit: (e: React.FormEvent) => void
}

export const IngredientFormSlideOver: React.FC<IngredientFormSlideOverProps> = ({
  isOpen,
  onClose,
  editingIngredient,
  ingredientForm,
  setIngredientForm,
  onSubmit,
}) => {
  return (
    <SlideOver
      isOpen={isOpen}
      onClose={onClose}
      title={editingIngredient ? 'Editar Insumo' : 'Registrar Nuevo Insumo'}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="text-xs font-bold text-gray-700 block mb-1">Nombre del Insumo *</label>
          <input
            type="text"
            required
            value={ingredientForm.nombre}
            onChange={(e) => setIngredientForm((prev: any) => ({ ...prev, nombre: e.target.value }))}
            placeholder="Ej. Zanahorias Frescas, Queso Crema, Harina"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-xs font-semibold focus:outline-none focus:border-[#0A2540]"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-gray-700 block mb-1">Proveedor / Lugar de Compra</label>
          <input
            type="text"
            value={ingredientForm.proveedor}
            onChange={(e) => setIngredientForm((prev: any) => ({ ...prev, proveedor: e.target.value }))}
            placeholder="Ej. Mercado San Juan, Abarrotes Central"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-xs font-medium focus:outline-none focus:border-[#0A2540]"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-gray-700 block mb-1">Costo de Compra del Paquete (MXN) *</label>
          <div className="relative">
            <span className="absolute left-3 top-2 text-gray-500 font-bold">$</span>
            <input
              type="number"
              min={0}
              step="any"
              required
              value={ingredientForm.precio}
              onChange={(e) => setIngredientForm((prev: any) => ({ ...prev, precio: Number(e.target.value) }))}
              className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md text-xs font-bold text-emerald-700 focus:outline-none focus:border-[#0A2540]"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1">
              Cantidad Comprada *
            </label>
            <input
              type="number"
              min={0.01}
              step="any"
              required
              value={ingredientForm.cantidad_numerica}
              onChange={(e) => setIngredientForm((prev: any) => ({ ...prev, cantidad_numerica: Number(e.target.value) }))}
              placeholder="Ej. 1, 190, 500"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-xs font-bold text-gray-900 focus:outline-none focus:border-[#0A2540]"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1">
              Unidad de Medida *
            </label>
            <select
              value={ingredientForm.unidad_medida}
              onChange={(e) => setIngredientForm((prev: any) => ({ ...prev, unidad_medida: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-xs font-bold text-gray-900 bg-white focus:outline-none focus:border-[#0A2540]"
            >
              <optgroup label="Masa / Peso">
                <option value="kg">kg (Kilogramos)</option>
                <option value="gr">gr (Gramos)</option>
              </optgroup>
              <optgroup label="Volumen / Líquidos">
                <option value="litros">litros (Litros)</option>
                <option value="ml">ml (Mililitros)</option>
              </optgroup>
              <optgroup label="Conteo">
                <option value="pzas">pzas (Piezas)</option>
              </optgroup>
            </select>
          </div>
        </div>

        <div className="p-2.5 bg-slate-50 border border-gray-200 rounded-md text-[11px] text-gray-600">
          <span>Presentación registrada: </span>
          <strong className="text-gray-900 font-bold">
            {ingredientForm.cantidad_numerica || 1} {ingredientForm.unidad_medida || 'kg'} por ${ingredientForm.precio || 0}.00 MXN
          </strong>
        </div>

        <div className="pt-4 flex justify-end gap-2 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-xs font-bold text-gray-700 hover:bg-gray-50 cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-[#0A2540] hover:bg-slate-800 text-white rounded-md text-xs font-bold shadow-sm cursor-pointer"
          >
            {editingIngredient ? 'Guardar Cambios' : 'Registrar Insumo'}
          </button>
        </div>
      </form>
    </SlideOver>
  )
}
