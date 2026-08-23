import React from 'react'
import { Plus, Trash2, UtensilsCrossed, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import type { ProductoConCosto, Ingrediente } from '../../../types'

interface RecipeItemState {
  ingrediente_id: string
  cantidad_necesaria: number
  unidad_medida: string
}

interface RecipeFormViewProps {
  products: ProductoConCosto[]
  selectedProductForRecipe: ProductoConCosto | null
  setSelectedProductForRecipe: (prod: ProductoConCosto) => void
  availableIngredientsForRecipe: Ingrediente[]
  pendingIngredientToAdd: string
  setPendingIngredientToAdd: (id: string) => void
  onAddSelectedIngredient: () => void
  recipeItems: RecipeItemState[]
  ingredients: Ingrediente[]
  recipeSortField: 'nombre' | 'presentacion' | 'cantidad' | 'costo'
  recipeSortDirection: 'asc' | 'desc'
  onRecipeSort: (field: 'nombre' | 'presentacion' | 'cantidad' | 'costo') => void
  onUpdateRecipeItem: (index: number, field: keyof RecipeItemState, value: any) => void
  onRemoveRecipeItem: (index: number) => void
  liveMetrics: {
    totalTanda: number
    unitCost: number
    batchRevenue: number
    batchProfit: number
    margin: number
    yieldQty: number
    yieldUnit: string
  }
  calculateLiveIngredientCost: (
    precioCompra: number,
    cantidadCompra: number,
    unidadCompra: string,
    cantidadReceta: number,
    unidadReceta: string
  ) => { costo: number; compatible: boolean; errorMsg?: string }
  getUnitMagnitude: (u: string) => { magnitude: string }
}

export const RecipeFormView: React.FC<RecipeFormViewProps> = ({
  products,
  selectedProductForRecipe,
  setSelectedProductForRecipe,
  availableIngredientsForRecipe,
  pendingIngredientToAdd,
  setPendingIngredientToAdd,
  onAddSelectedIngredient,
  recipeItems,
  ingredients,
  recipeSortField,
  recipeSortDirection,
  onRecipeSort,
  onUpdateRecipeItem,
  onRemoveRecipeItem,
  liveMetrics,
  calculateLiveIngredientCost,
  getUnitMagnitude,
}) => {
  return (
    <div className="space-y-5">
      {/* Selector de Producto y Barra de Agregar Insumo No Duplicado */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <label className="text-xs font-bold text-gray-700 whitespace-nowrap">
              Producto a Formular:
            </label>
            <select
              value={selectedProductForRecipe?.id || ''}
              onChange={(e) => {
                const found = products.find(p => p.id === e.target.value)
                if (found) setSelectedProductForRecipe(found)
              }}
              className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs font-bold text-gray-900 focus:outline-none focus:border-[#0A2540]"
            >
              {products.map(p => (
                <option key={p.id} value={p.id}>
                  {p.nombre} (${p.precio_venta}.00 MXN — Rinde: {p.rendimiento_tanda || 24} {p.tipo_unidad || 'piezas'})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-gray-500 font-medium">
              ⚡ Los cambios en insumos y cantidades se guardan al instante.
            </span>
          </div>
        </div>

        {/* Selector de Insumos Disponibles */}
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <label className="text-xs font-bold text-gray-700 whitespace-nowrap flex items-center gap-1.5">
            <UtensilsCrossed size={14} className="text-[#F56B2A]" />
            <span>Añadir Insumo a la Receta:</span>
          </label>

          {availableIngredientsForRecipe.length > 0 ? (
            <div className="flex items-center gap-2 flex-1 max-w-lg">
              <select
                value={pendingIngredientToAdd}
                onChange={(e) => setPendingIngredientToAdd(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-semibold text-gray-900 focus:outline-none focus:border-[#0A2540]"
              >
                {availableIngredientsForRecipe.map(ing => (
                  <option key={ing.id} value={ing.id}>
                    {ing.nombre} (Comprado en: {ing.cantidad_numerica || 1} {ing.unidad_medida || 'kg'} — ${ing.precio} MXN)
                  </option>
                ))}
              </select>

              <button
                onClick={onAddSelectedIngredient}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-2xs shrink-0 cursor-pointer"
              >
                <Plus size={14} />
                <span>Añadir</span>
              </button>
            </div>
          ) : (
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
              ✓ Todos los insumos del catálogo ya están añadidos a esta receta.
            </span>
          )}
        </div>
      </div>

      {/* TABLA DE INGREDIENTES EN LA RECETA */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-[#F8FAFC]">
          <div>
            <h4 className="font-bold text-sm text-[#0A2540]">
              Formulación de Insumos para 1 Preparación ({liveMetrics.yieldQty} {liveMetrics.yieldUnit})
            </h4>
            <p className="text-[11px] text-gray-500">
              Ingresa las cantidades exactas necesarias para producir {liveMetrics.yieldQty} {liveMetrics.yieldUnit} de {selectedProductForRecipe?.nombre}.
            </p>
          </div>
          <span className="text-xs font-mono font-bold px-2 py-0.5 bg-blue-100 text-blue-800 rounded">
            {recipeItems.length} insumos en receta
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-gray-600 text-[11px] uppercase font-bold border-b border-gray-200 select-none">
              <tr>
                <th 
                  onClick={() => onRecipeSort('nombre')} 
                  className="py-3 px-4 cursor-pointer hover:bg-slate-200/60 transition group"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Ingrediente</span>
                    {recipeSortField === 'nombre' ? (
                      recipeSortDirection === 'asc' ? <ArrowUp size={13} className="text-[#0A2540]" /> : <ArrowDown size={13} className="text-[#0A2540]" />
                    ) : (
                      <ArrowUpDown size={13} className="text-gray-400 group-hover:text-gray-600" />
                    )}
                  </div>
                </th>

                <th 
                  onClick={() => onRecipeSort('presentacion')} 
                  className="py-3 px-4 cursor-pointer hover:bg-slate-200/60 transition group"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Compra / Presentación</span>
                    {recipeSortField === 'presentacion' ? (
                      recipeSortDirection === 'asc' ? <ArrowUp size={13} className="text-[#0A2540]" /> : <ArrowDown size={13} className="text-[#0A2540]" />
                    ) : (
                      <ArrowUpDown size={13} className="text-gray-400 group-hover:text-gray-600" />
                    )}
                  </div>
                </th>

                <th 
                  onClick={() => onRecipeSort('cantidad')} 
                  className="py-3 px-4 text-center cursor-pointer hover:bg-slate-200/60 transition group"
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span>Cantidad en Receta</span>
                    {recipeSortField === 'cantidad' ? (
                      recipeSortDirection === 'asc' ? <ArrowUp size={13} className="text-[#0A2540]" /> : <ArrowDown size={13} className="text-[#0A2540]" />
                    ) : (
                      <ArrowUpDown size={13} className="text-gray-400 group-hover:text-gray-600" />
                    )}
                  </div>
                </th>

                <th className="py-3 px-4 text-center">Unidad de Receta</th>

                <th 
                  onClick={() => onRecipeSort('costo')} 
                  className="py-3 px-4 text-right cursor-pointer hover:bg-slate-200/60 transition group"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Costo en Receta</span>
                    {recipeSortField === 'costo' ? (
                      recipeSortDirection === 'asc' ? <ArrowUp size={13} className="text-[#0A2540]" /> : <ArrowDown size={13} className="text-[#0A2540]" />
                    ) : (
                      <ArrowUpDown size={13} className="text-gray-400 group-hover:text-gray-600" />
                    )}
                  </div>
                </th>

                <th className="py-3 px-4 text-right">Costo / {liveMetrics.yieldQty === 1 ? 'Pieza' : 'Unidad'}</th>
                <th className="py-3 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium text-gray-800">
              {recipeItems.length > 0 ? (
                recipeItems.map((item, idx) => {
                  const currentIng = ingredients.find(i => i.id === item.ingrediente_id)
                  const precioCompra = Number(currentIng?.precio || 0)
                  let cantidadCompra = Number(currentIng?.cantidad_numerica || 0)
                  let unidadCompra = currentIng?.unidad_medida || 'kg'
                  
                  if (cantidadCompra <= 0 && currentIng?.cantidad) {
                    const m = currentIng.cantidad.match(/[\d.]+/)
                    cantidadCompra = m ? parseFloat(m[0]) : 1
                    const low = currentIng.cantidad.toLowerCase()
                    if (low.includes('kg')) unidadCompra = 'kg'
                    else if (low.includes('gr')) unidadCompra = 'gr'
                    else if (low.includes('litro') || low.includes('lt')) unidadCompra = 'litros'
                    else if (low.includes('ml')) unidadCompra = 'ml'
                    else if (low.includes('pza')) unidadCompra = 'pzas'
                  }

                  if (cantidadCompra <= 0) cantidadCompra = 1

                  const calc = calculateLiveIngredientCost(
                    precioCompra,
                    cantidadCompra,
                    unidadCompra,
                    item.cantidad_necesaria ?? 0,
                    item.unidad_medida ?? 'gr'
                  )

                  const itemUnitCost = Math.round((calc.costo / liveMetrics.yieldQty) * 100) / 100
                  const ingMagnitude = getUnitMagnitude(unidadCompra).magnitude

                  return (
                    <tr key={item.ingrediente_id} className={`hover:bg-slate-50/80 transition ${!calc.compatible ? 'bg-red-50/60' : ''}`}>
                      <td className="py-3 px-4">
                        <strong className="font-bold text-gray-900 block">
                          {currentIng?.nombre || 'Ingrediente'}
                        </strong>
                        {currentIng?.proveedor && (
                          <span className="text-[10px] text-gray-400 font-normal">
                            {currentIng.proveedor}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-gray-600 font-mono text-[11px]">
                        ${precioCompra}.00 MXN / {cantidadCompra} {unidadCompra}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <input
                          type="number"
                          min={0}
                          step="any"
                          value={item.cantidad_necesaria ?? 0}
                          onChange={(e) => onUpdateRecipeItem(idx, 'cantidad_necesaria', Number(e.target.value))}
                          className="w-24 px-2 py-1 bg-white border border-gray-300 rounded text-center font-bold text-xs text-gray-900 focus:outline-none focus:border-[#0A2540]"
                        />
                      </td>

                      <td className="py-3 px-4 text-center">
                        <select
                          value={item.unidad_medida ?? 'gr'}
                          onChange={(e) => onUpdateRecipeItem(idx, 'unidad_medida', e.target.value)}
                          className={`px-2.5 py-1 bg-white border rounded text-xs font-semibold ${
                            !calc.compatible ? 'border-red-500 text-red-700 bg-red-50 font-bold' : 'border-gray-300 text-gray-700'
                          }`}
                        >
                          {/* Unidades de Masa */}
                          {ingMagnitude === 'masa' && (
                            <>
                              <option value="gr">gr (gramos)</option>
                              <option value="kg">kg (kilos)</option>
                              <option value="cda">cda (~15 gr)</option>
                              <option value="cdita">cdita (~5 gr)</option>
                            </>
                          )}

                          {/* Unidades de Volumen */}
                          {ingMagnitude === 'volumen' && (
                            <>
                              <option value="ml">ml (mililitros)</option>
                              <option value="litros">litros</option>
                              <option value="cda">cda (~15 ml)</option>
                              <option value="cdita">cdita (~5 ml)</option>
                            </>
                          )}

                          {/* Unidades de Conteo */}
                          {ingMagnitude === 'unidades' && (
                            <>
                              <option value="pzas">pzas (piezas)</option>
                              <option value="docena">docenas (12 pzas)</option>
                            </>
                          )}

                          {/* Opciones generales si la magnitud es desconocida */}
                          {ingMagnitude === 'desconocido' && (
                            <>
                              <option value="gr">gr</option>
                              <option value="kg">kg</option>
                              <option value="ml">ml</option>
                              <option value="litros">litros</option>
                              <option value="pzas">pzas</option>
                            </>
                          )}
                        </select>

                        {!calc.compatible && (
                          <span className="block text-[10px] text-red-600 font-bold mt-1">
                            ⚠️ Incompatible
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right font-mono font-bold text-gray-900">
                        ${calc.costo} MXN
                      </td>

                      <td className="py-3 px-4 text-right font-mono font-bold text-gray-600 text-[11px]">
                        ${itemUnitCost} MXN
                      </td>

                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => onRemoveRecipeItem(idx)}
                          className="p-1 rounded text-red-500 hover:text-red-700 hover:bg-red-50 transition cursor-pointer"
                          title="Quitar de receta"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-400 text-xs italic">
                    No hay insumos en esta receta. Selecciona un insumo en la barra superior para añadirlo.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* RESUMEN FINANCIERO EN VIVO DE LA PREPARACIÓN */}
        <div className="bg-[#0A2540] text-white p-5 border-t border-slate-700 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div className="p-3 bg-white/5 rounded-lg border border-white/10">
            <span className="text-[10px] text-slate-300 uppercase font-bold block">Costo Total Receta ({liveMetrics.yieldQty} {liveMetrics.yieldUnit})</span>
            <strong className="text-lg font-mono font-bold text-amber-400">${liveMetrics.totalTanda} MXN</strong>
          </div>

          <div className="p-3 bg-white/5 rounded-lg border border-white/10">
            <span className="text-[10px] text-slate-300 uppercase font-bold block">Costo Insumos / {liveMetrics.yieldQty === 1 ? 'Pieza' : 'Unidad'}</span>
            <strong className="text-lg font-mono font-bold text-slate-100">${liveMetrics.unitCost} MXN</strong>
          </div>

          <div className="p-3 bg-white/5 rounded-lg border border-white/10">
            <span className="text-[10px] text-slate-300 uppercase font-bold block">Venta Total ({liveMetrics.yieldQty} x ${selectedProductForRecipe?.precio_venta || 20})</span>
            <strong className="text-lg font-mono font-bold text-blue-300">${liveMetrics.batchRevenue} MXN</strong>
          </div>

          <div className="p-3 bg-emerald-500/20 rounded-lg border border-emerald-400/30">
            <span className="text-[10px] text-emerald-300 uppercase font-bold block">Ganancia Neta Preparación</span>
            <strong className="text-lg font-mono font-bold text-emerald-400">+${liveMetrics.batchProfit} MXN</strong>
            <span className="text-[10px] text-emerald-300 block">({liveMetrics.margin}% margen)</span>
          </div>
        </div>
      </div>
    </div>
  )
}
