import React from 'react'
import { Package, Sparkles, AlertCircle, Calculator } from 'lucide-react'
import { SlideOver } from '../SlideOver'
import type { Prize, ProductoConCosto, TipoBeneficio } from '../../../types'

interface PromotionFormSlideOverProps {
  isOpen: boolean
  onClose: () => void
  editingPrize: Prize | null
  title: string
  setTitle: (title: string) => void
  description: string
  setDescription: (desc: string) => void
  tier: Prize['tier']
  setTier: (tier: Prize['tier']) => void
  tipoBeneficio: TipoBeneficio
  setTipoBeneficio: (tipo: TipoBeneficio) => void
  precioPromocional: number | ''
  setPrecioPromocional: (p: number | '') => void
  descuentoMonto: number | ''
  setDescuentoMonto: (d: number | '') => void
  piezasAmparadas: number | ''
  setPiezasAmparadas: (n: number | '') => void
  productId: string
  setProductId: (id: string) => void
  isActive: boolean
  setIsActive: (active: boolean) => void
  badgeColor: string
  setBadgeColor: (color: string) => void
  categoryWeights: {
    sin_premio: number
    promocion: number
    alto_valor: number
  }
  predicted: {
    totalCat: number
    nextCount: number
    individual: number
  }
  availableProducts: ProductoConCosto[]
  loading: boolean
  onSubmit: (e: React.FormEvent) => void
}

export const PromotionFormSlideOver: React.FC<PromotionFormSlideOverProps> = ({
  isOpen,
  onClose,
  editingPrize,
  title,
  setTitle,
  description,
  setDescription,
  tier,
  setTier,
  tipoBeneficio,
  setTipoBeneficio,
  precioPromocional,
  setPrecioPromocional,
  descuentoMonto,
  setDescuentoMonto,
  piezasAmparadas,
  setPiezasAmparadas,
  productId,
  setProductId,
  isActive,
  setIsActive,
  badgeColor,
  setBadgeColor,
  categoryWeights,
  predicted,
  availableProducts,
  loading,
  onSubmit,
}) => {
  const selectedProduct = availableProducts.find(p => p.id === productId)
  const productPrice = selectedProduct ? Number(selectedProduct.precio_venta) : 20.00
  const pieces = typeof piezasAmparadas === 'number' ? piezasAmparadas : 1

  // Cálculo de ahorro/descuento en tiempo real para visualización
  let calculatedDiscount = 0
  if (tipoBeneficio === 'precio_promocional' && typeof precioPromocional === 'number') {
    const regularCost = productPrice * pieces
    calculatedDiscount = Math.max(0, regularCost - precioPromocional)
  } else if (tipoBeneficio === 'descuento_fijo' && typeof descuentoMonto === 'number') {
    calculatedDiscount = descuentoMonto
  } else if (tipoBeneficio === 'producto_gratis') {
    calculatedDiscount = typeof descuentoMonto === 'number' && descuentoMonto > 0 ? descuentoMonto : productPrice
  }

  return (
    <SlideOver
      isOpen={isOpen}
      onClose={onClose}
      title={editingPrize ? 'Editar Promoción' : 'Registrar Promoción'}
      icon={<Package size={20} />}
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
            onClick={onSubmit}
            disabled={loading || !title.trim()}
            className="px-5 py-2 rounded-md bg-[#0A2540] hover:bg-[#081C30] text-white font-bold text-xs transition shadow-sm cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Guardando...' : editingPrize ? 'Actualizar Promoción' : 'Guardar Promoción'}
          </button>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {/* Nombre de la Promoción */}
        <div>
          <label className="text-xs font-bold text-gray-700 block mb-1">
            Nombre de la Promoción *
          </label>
          <input
            type="text"
            placeholder="Ej. Promo: 2x$35 MXN o $5 Descuento"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-xs font-semibold focus:outline-none focus:border-[#0A2540]"
            required
          />
        </div>

        {/* Descripción para el Cliente */}
        <div>
          <label className="text-xs font-bold text-gray-700 block mb-1">
            Descripción para el Cliente
          </label>
          <textarea
            rows={2}
            placeholder="Ej. Llévate 2 cupcakes por solo $35 MXN en tu próxima compra."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-xs focus:outline-none focus:border-[#0A2540]"
          />
        </div>

        {/* Categoría de Probabilidad */}
        <div>
          <label className="text-xs font-bold text-gray-700 block mb-1">
            Categoría de Probabilidad en Ruleta *
          </label>
          <select
            value={tier}
            onChange={(e: any) => {
              const newTier = e.target.value
              setTier(newTier)
              if (newTier === 'tier_50_no_prize') {
                setTipoBeneficio('sin_premio')
                setProductId('')
                setDescuentoMonto(0)
                setPiezasAmparadas(0)
              } else if (tipoBeneficio === 'sin_premio') {
                setTipoBeneficio('descuento_fijo')
                setPiezasAmparadas(1)
              }
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-xs font-semibold focus:outline-none focus:border-[#0A2540]"
          >
            <option value="tier_40_promo">🏷️ Promoción / Descuento (Peso total: {categoryWeights.promocion}%)</option>
            <option value="tier_10_high_value">🎁 Alto Valor / Cupcake Gratis (Peso total: {categoryWeights.alto_valor}%)</option>
            <option value="tier_50_no_prize">🎯 Sin Premio / Sigue Intentando (Peso total: {categoryWeights.sin_premio}%)</option>
          </select>
        </div>

        {/* Producto Asociado */}
        {tier !== 'tier_50_no_prize' && (
          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1 flex items-center justify-between">
              <span>Producto del Catálogo Asociado</span>
              <span className="text-[10px] text-emerald-600 font-semibold">Base de cálculo</span>
            </label>
            <select
              value={productId || ''}
              onChange={(e) => setProductId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-xs font-semibold focus:outline-none focus:border-[#0A2540]"
            >
              <option value="">General / Cupcake Estándar ($20.00 MXN)</option>
              {availableProducts.map(p => (
                <option key={p.id} value={p.id}>
                  {p.nombre} — Precio regular: ${p.precio_venta}.00 MXN (Costo: ${p.costo_unitario} MXN)
                </option>
              ))}
            </select>
          </div>
        )}

        {/* MECÁNICA Y BENEFICIO FINANCIERO ESTRUCTURADO */}
        {tier !== 'tier_50_no_prize' && (
          <div className="p-3.5 bg-orange-50/70 border border-orange-200 rounded-xl space-y-3">
            <label className="text-xs font-bold text-orange-950 flex items-center gap-1.5">
              <Calculator size={14} className="text-[#F56B2A]" />
              <span>Mecánica Financiera del Beneficio</span>
            </label>

            {/* Selector de Tipo de Beneficio */}
            <div>
              <label className="text-[11px] font-bold text-gray-700 block mb-1">
                Tipo de Promoción:
              </label>
              <select
                value={tipoBeneficio}
                onChange={(e: any) => {
                  const t = e.target.value
                  setTipoBeneficio(t)
                  if (t === 'producto_gratis') {
                    setDescuentoMonto(productPrice)
                  }
                }}
                className="w-full px-3 py-2 bg-white border border-orange-300 rounded-md text-xs font-bold text-gray-900 focus:outline-none focus:border-[#0A2540]"
              >
                <option value="precio_promocional">💸 Precio Paquete Promo (ej. 2x$35, 3x$50, Pastel $320)</option>
                <option value="descuento_fijo">🏷️ Descuento Directo en Dinero (ej. $5 MXN, $50 MXN)</option>
                <option value="producto_gratis">🎁 Producto 100% Gratis (ej. 1 Cupcake Gratis, 2 en Docena)</option>
              </select>
            </div>

            {/* Inputs según el tipo de beneficio */}
            <div className="grid grid-cols-2 gap-3">
              {tipoBeneficio === 'precio_promocional' ? (
                <div>
                  <label className="text-[11px] font-bold text-gray-700 block mb-1">
                    Precio a Cobrar en Caja ($ MXN) *
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    placeholder="Ej. 35 o 320"
                    value={precioPromocional}
                    onChange={(e) => {
                      const val = e.target.value === '' ? '' : parseFloat(e.target.value)
                      setPrecioPromocional(val)
                      if (typeof val === 'number') {
                        const reg = productPrice * pieces
                        setDescuentoMonto(Math.max(0, reg - val))
                      }
                    }}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-xs font-bold focus:outline-none focus:border-[#0A2540]"
                    required
                  />
                </div>
              ) : (
                <div>
                  <label className="text-[11px] font-bold text-gray-700 block mb-1">
                    Monto de Descuento ($ MXN) *
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    placeholder="Ej. 5.00 o 20.00"
                    value={descuentoMonto}
                    onChange={(e) => setDescuentoMonto(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-xs font-bold focus:outline-none focus:border-[#0A2540]"
                    required
                  />
                </div>
              )}

              <div>
                <label className="text-[11px] font-bold text-gray-700 block mb-1">
                  Piezas Amparadas (0 Tiros) *
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  placeholder="Ej. 2 para 2x$35"
                  value={piezasAmparadas}
                  onChange={(e) => {
                    const val = e.target.value === '' ? '' : parseInt(e.target.value)
                    setPiezasAmparadas(val)
                    if (tipoBeneficio === 'precio_promocional' && typeof precioPromocional === 'number' && typeof val === 'number') {
                      const reg = productPrice * val
                      setDescuentoMonto(Math.max(0, reg - precioPromocional))
                    }
                  }}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-xs font-bold focus:outline-none focus:border-[#0A2540]"
                  required
                />
              </div>
            </div>

            {/* Resumen dinámico del beneficio financiero */}
            <div className="p-2.5 bg-white rounded-lg border border-orange-200 text-xs space-y-1">
              <div className="flex justify-between text-gray-600">
                <span>Precio Regular de las {pieces} pza(s):</span>
                <span className="font-semibold">${(productPrice * pieces).toFixed(2)} MXN</span>
              </div>
              <div className="flex justify-between text-emerald-700 font-bold">
                <span>Ahorro Real para el Cliente:</span>
                <span>-${calculatedDiscount.toFixed(2)} MXN</span>
              </div>
              {tipoBeneficio === 'precio_promocional' && typeof precioPromocional === 'number' && (
                <div className="flex justify-between text-gray-900 font-black pt-1 border-t border-gray-100">
                  <span>Monto Cobrado en Caja:</span>
                  <span className="text-[#16A34A]">${precioPromocional.toFixed(2)} MXN</span>
                </div>
              )}
            </div>

            <p className="text-[10px] text-amber-900 flex items-start gap-1 font-medium">
              <AlertCircle size={12} className="text-amber-700 shrink-0 mt-0.5" />
              <span>Por política, las {pieces} pieza(s) cubiertas por esta promo otorgarán <strong>0 tiradas de ruleta</strong> en caja.</span>
            </p>
          </div>
        )}

        {/* Tarjeta de Reparto Equitativo Automático */}
        <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-lg text-xs space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-amber-900">
            <Sparkles size={14} className="text-amber-600" />
            <span>División Equitativa Automática:</span>
          </div>
          <p className="text-amber-800 leading-relaxed text-[11px]">
            Al guardar en esta categoría (peso total <strong>{predicted.totalCat}%</strong>), se dividirá equitativamente entre las <strong>{predicted.nextCount} opciones activas</strong>, asignando aproximadamente <strong>~{predicted.individual}%</strong> a cada una.
          </p>
        </div>

        {/* Estado y Color */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1">
              Estado
            </label>
            <select
              value={isActive ? 'true' : 'false'}
              onChange={(e) => setIsActive(e.target.value === 'true')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-xs font-semibold focus:outline-none focus:border-[#0A2540]"
            >
              <option value="true">Activo</option>
              <option value="false">Pausado</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1">
              Color Distintivo
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={badgeColor}
                onChange={(e) => setBadgeColor(e.target.value)}
                className="w-8 h-8 rounded border border-gray-300 p-0.5 cursor-pointer"
              />
              <span className="text-xs font-mono font-bold text-gray-600">{badgeColor}</span>
            </div>
          </div>
        </div>
      </form>
    </SlideOver>
  )
}
