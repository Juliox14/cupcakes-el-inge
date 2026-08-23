import React from 'react'
import { SlideOver } from '../SlideOver'
import type { Producto } from '../../../types'

interface ProductFormState {
  nombre: string
  descripcion: string
  precio: number
  rendimiento_tanda: number
  tipo_unidad: string
  activo?: boolean
}

interface ProductFormSlideOverProps {
  isOpen: boolean
  onClose: () => void
  editingProduct: Producto | null
  productForm: ProductFormState
  setProductForm: React.Dispatch<React.SetStateAction<any>>
  onSubmit: (e: React.FormEvent) => void
}

export const ProductFormSlideOver: React.FC<ProductFormSlideOverProps> = ({
  isOpen,
  onClose,
  editingProduct,
  productForm,
  setProductForm,
  onSubmit,
}) => {
  return (
    <SlideOver
      isOpen={isOpen}
      onClose={onClose}
      title={editingProduct ? 'Editar Producto' : 'Registrar Nuevo Producto'}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="text-xs font-bold text-gray-700 block mb-1">Nombre del Producto *</label>
          <input
            type="text"
            required
            value={productForm.nombre}
            onChange={(e) => setProductForm((prev: any) => ({ ...prev, nombre: e.target.value }))}
            placeholder="Ej. Pastel de Zanahoria Tradicional, Cupcakes con Nuez"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-xs font-semibold focus:outline-none focus:border-[#0A2540]"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-gray-700 block mb-1">Descripción / Sabor</label>
          <textarea
            rows={3}
            value={productForm.descripcion}
            onChange={(e) => setProductForm((prev: any) => ({ ...prev, descripcion: e.target.value }))}
            placeholder="Detalles del pastel, cobertura de queso crema, tamaño..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-xs font-medium focus:outline-none focus:border-[#0A2540]"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1">
              Rendimiento de Receta *
            </label>
            <input
              type="number"
              min={1}
              required
              value={productForm.rendimiento_tanda}
              onChange={(e) => setProductForm((prev: any) => ({ ...prev, rendimiento_tanda: Number(e.target.value) }))}
              placeholder="24 para cupcakes, 1 para pastel"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-xs font-bold text-[#0A2540] focus:outline-none focus:border-[#0A2540]"
            />
            <span className="text-[10px] text-gray-500 mt-0.5 block">Ej: 24 (cupcakes) o 1 (pastel)</span>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1">
              Tipo de Unidad *
            </label>
            <input
              type="text"
              required
              value={productForm.tipo_unidad}
              onChange={(e) => setProductForm((prev: any) => ({ ...prev, tipo_unidad: e.target.value }))}
              placeholder="cupcakes, pasteles, piezas"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-xs font-semibold focus:outline-none focus:border-[#0A2540]"
            />
            <span className="text-[10px] text-gray-500 mt-0.5 block">Ej: pasteles, cupcakes, rebanadas</span>
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-gray-700 block mb-1">Precio de Venta al Público (MXN) *</label>
          <div className="relative">
            <span className="absolute left-3 top-2 text-gray-500 font-bold">$</span>
            <input
              type="number"
              min={1}
              required
              value={productForm.precio}
              onChange={(e) => setProductForm((prev: any) => ({ ...prev, precio: Number(e.target.value) }))}
              className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md text-xs font-bold text-emerald-700 focus:outline-none focus:border-[#0A2540]"
            />
          </div>
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
            {editingProduct ? 'Guardar Cambios' : 'Crear Producto'}
          </button>
        </div>
      </form>
    </SlideOver>
  )
}
