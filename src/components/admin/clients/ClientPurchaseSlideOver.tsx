import React from 'react'
import { ShoppingBag, Sparkles, Tag, Gift, AlertCircle } from 'lucide-react'
import { SlideOver } from '../SlideOver'
import type { UserProfile, ProductoConCosto, Coupon } from '../../../types'

interface ClientPurchaseSlideOverProps {
  isOpen: boolean
  onClose: () => void
  purchaseMode: 'registered' | 'unregistered'
  setPurchaseMode: (mode: 'registered' | 'unregistered') => void
  selectedClientForPurchase: UserProfile | null
  setSelectedClientForPurchase: (client: UserProfile | null) => void
  clients: UserProfile[]
  clientCoupons?: Coupon[]
  selectedCouponId?: string
  setSelectedCouponId?: (id: string) => void
  unregisteredName: string
  setUnregisteredName: (name: string) => void
  availableProducts: ProductoConCosto[]
  selectedProductId: string
  setSelectedProductId: (id: string) => void
  cupcakesQty: number
  setCupcakesQty: (qty: number) => void
  registering: boolean
  purchaseMsg: string | null
  onSubmit: (e: React.FormEvent) => void
}

export const ClientPurchaseSlideOver: React.FC<ClientPurchaseSlideOverProps> = ({
  isOpen,
  onClose,
  purchaseMode,
  setPurchaseMode,
  selectedClientForPurchase,
  setSelectedClientForPurchase,
  clients,
  clientCoupons = [],
  selectedCouponId = '',
  setSelectedCouponId,
  unregisteredName,
  setUnregisteredName,
  availableProducts,
  selectedProductId,
  setSelectedProductId,
  cupcakesQty,
  setCupcakesQty,
  registering,
  purchaseMsg,
  onSubmit,
}) => {
  const product = availableProducts.find(p => p.id === selectedProductId)
  const unitPrice = product ? Number(product.precio_venta) : 20.00
  const unitCost = product ? Number(product.costo_unitario) : 6.67
  const regularSubtotal = cupcakesQty * unitPrice
  const totalCost = cupcakesQty * unitCost

  // Filtrar cupones activos del cliente seleccionado
  const activeClientCoupons = (clientCoupons || []).filter(c => {
    const isOwner = purchaseMode === 'registered' && selectedClientForPurchase && (c.user_id === selectedClientForPurchase.id || (c as any).usuario_id === selectedClientForPurchase.id)
    return isOwner && c.status === 'active'
  })

  // Resolver cupón seleccionado
  const appliedCoupon = activeClientCoupons.find(c => c.id === selectedCouponId)
  let discountAmount = 0
  let isPromoApplied = false
  let promoCoveredQty = 0

  if (appliedCoupon) {
    isPromoApplied = true
    const p = (appliedCoupon.prize || (appliedCoupon as any).premio) as any
    promoCoveredQty = Number(p?.piezas_amparadas ?? 1)

    if (p?.descuento_monto !== undefined && p?.descuento_monto !== null && Number(p.descuento_monto) > 0) {
      discountAmount = Number(p.descuento_monto)
    } else if (p?.tipo_beneficio === 'precio_promocional' && p?.precio_promocional) {
      discountAmount = Math.max(0, (unitPrice * promoCoveredQty) - Number(p.precio_promocional))
    } else if (p?.tipo_beneficio === 'producto_gratis') {
      discountAmount = unitPrice * promoCoveredQty
    } else if (p?.tipo_beneficio === 'descuento_fijo' && p?.descuento_monto) {
      discountAmount = Number(p.descuento_monto)
    } else {
      discountAmount = 5.00
    }
  }

  const finalTotalCharged = Math.max(0, regularSubtotal - discountAmount)
  const realNetProfit = finalTotalCharged - totalCost

  // Cálculo de tiradas (Regla de negocio: Promociones NO generan tiradas, 1ra compra da +1 de bienvenida)
  const isFirstPurchase = purchaseMode === 'registered' && selectedClientForPurchase && (selectedClientForPurchase.total_cupcakes_purchased || 0) === 0
  const welcomeSpinBonus = isFirstPurchase ? 1 : 0

  let baseSpins = 0
  if (purchaseMode === 'registered') {
    if (isPromoApplied) {
      const extraRegularQty = Math.max(0, cupcakesQty - promoCoveredQty)
      baseSpins = Math.floor(extraRegularQty / 2)
    } else {
      baseSpins = Math.floor(cupcakesQty / 2)
    }
  }
  const spins = baseSpins + welcomeSpinBonus

  return (
    <SlideOver
      isOpen={isOpen}
      onClose={onClose}
      title="Registrar Compra a Cliente"
      icon={<ShoppingBag size={20} />}
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
            disabled={registering || (purchaseMode === 'registered' && !selectedClientForPurchase)}
            className="px-5 py-2 rounded-md bg-[#0A2540] hover:bg-[#081C30] text-white font-bold text-xs transition shadow-sm cursor-pointer disabled:opacity-50"
          >
            {registering ? 'Registrando...' : 'Confirmar Compra'}
          </button>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="text-xs font-bold text-gray-700 block mb-1">
            Tipo de Venta
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setPurchaseMode('registered')
                if (setSelectedCouponId) setSelectedCouponId('')
              }}
              className={`py-2 rounded-md border text-xs font-bold transition cursor-pointer ${
                purchaseMode === 'registered'
                  ? 'bg-[#0A2540] text-white border-[#0A2540]'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              👤 Venta a Cliente
            </button>
            <button
              type="button"
              onClick={() => {
                setPurchaseMode('unregistered')
                if (setSelectedCouponId) setSelectedCouponId('')
              }}
              className={`py-2 rounded-md border text-xs font-bold transition cursor-pointer ${
                purchaseMode === 'unregistered'
                  ? 'bg-[#0A2540] text-white border-[#0A2540]'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              🧁 Venta Directa
            </button>
          </div>
        </div>

        {purchaseMode === 'registered' ? (
          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1">
              Seleccionar Cliente
            </label>
            <select
              value={selectedClientForPurchase?.id || ''}
              onChange={(e) => {
                const found = clients.find(c => c.id === e.target.value)
                if (found) {
                  setSelectedClientForPurchase(found)
                  if (setSelectedCouponId) setSelectedCouponId('')
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-xs font-semibold focus:outline-none focus:border-[#0A2540]"
            >
              {clients.map(c => (
                <option key={c.id} value={c.id}>
                  {c.full_name} ({c.phone})
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1">
              Nombre de Referencia (Opcional)
            </label>
            <input
              type="text"
              placeholder="Ej. Mostrador / Cliente Local"
              value={unregisteredName}
              onChange={(e) => setUnregisteredName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-xs font-semibold focus:outline-none focus:border-[#0A2540]"
            />
          </div>
        )}

        {/* Canje de Cupón / Promoción del Cliente */}
        {purchaseMode === 'registered' && (
          <div className="p-3 bg-orange-50/60 rounded-xl border border-orange-200/80 space-y-2">
            <label className="text-xs font-bold text-orange-950 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Gift size={14} className="text-[#F56B2A]" />
                <span>Aplicar Cupón / Promoción del Cliente</span>
              </span>
              {activeClientCoupons.length > 0 && (
                <span className="text-[10px] font-mono bg-orange-200/70 text-orange-900 px-1.5 py-0.5 rounded-full font-bold">
                  {activeClientCoupons.length} disponible{activeClientCoupons.length === 1 ? '' : 's'}
                </span>
              )}
            </label>

            {activeClientCoupons.length > 0 ? (
              <select
                value={selectedCouponId}
                onChange={(e) => {
                  if (setSelectedCouponId) setSelectedCouponId(e.target.value)
                }}
                className="w-full px-3 py-2 bg-white border border-orange-300 rounded-md text-xs font-bold text-gray-900 focus:outline-none focus:border-[#0A2540]"
              >
                <option value="">Ninguno (Venta regular a precio normal)</option>
                {activeClientCoupons.map(c => {
                  const title = c.prize?.title || (c as any).premio?.titulo || 'Cupón'
                  return (
                    <option key={c.id} value={c.id}>
                      🎟️ {title} (Cód: {c.code})
                    </option>
                  )
                })}
              </select>
            ) : (
              <p className="text-[11px] text-gray-500 italic">
                El cliente no tiene cupones activos pendientes de canje.
              </p>
            )}

            {isPromoApplied && (
              <div className="flex items-start gap-1.5 text-[11px] text-amber-900 bg-amber-100/70 p-2 rounded-md font-medium">
                <AlertCircle size={14} className="text-amber-700 shrink-0 mt-0.5" />
                <span>
                  <strong>Cupón aplicado:</strong> Se descuenta <strong>${discountAmount.toFixed(2)} MXN</strong> del cobro en caja. Por política, la promo no genera tiradas gratis de ruleta.
                </span>
              </div>
            )}
          </div>
        )}

        {/* Selector de Producto del Catálogo */}
        <div>
          <label className="text-xs font-bold text-gray-700 block mb-1">
            Producto / Sabor Vendido
          </label>
          <select
            value={selectedProductId}
            onChange={(e) => setSelectedProductId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-xs font-semibold focus:outline-none focus:border-[#0A2540]"
          >
            {availableProducts.map(p => (
              <option key={p.id} value={p.id}>
                {p.nombre} — ${p.precio_venta} MXN (Costo insumos: ${p.costo_unitario} MXN)
              </option>
            ))}
          </select>
        </div>

        {/* Cantidad de Cupcakes */}
        <div>
          <label className="text-xs font-bold text-gray-700 block mb-1">
            Cantidad de Cupcakes / Piezas
          </label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min="1"
              max="50"
              value={cupcakesQty}
              onChange={(e) => setCupcakesQty(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-24 px-3 py-2 border border-gray-300 rounded-md text-xs font-bold focus:outline-none focus:border-[#0A2540]"
            />
            <div className="flex gap-1.5">
              {[1, 2, 3, 5, 10, 12].map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setCupcakesQty(n)}
                  className={`px-2.5 py-1 rounded text-xs font-bold border transition cursor-pointer ${
                    cupcakesQty === n
                      ? 'bg-[#0A2540] text-white border-[#0A2540]'
                      : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Desglose Financiero y Contable en Vivo */}
        <div className="p-3.5 bg-slate-50 rounded-xl border border-gray-200 space-y-2 text-xs">
          <div className="flex justify-between text-gray-600">
            <span>Subtotal Regular ({cupcakesQty} x ${unitPrice}):</span>
            <span className="font-semibold">${regularSubtotal.toFixed(2)} MXN</span>
          </div>

          {discountAmount > 0 && (
            <div className="flex justify-between text-emerald-700 font-bold bg-emerald-50 px-2 py-1 rounded">
              <span className="flex items-center gap-1">
                <Tag size={13} /> Descuento de Promoción:
              </span>
              <span>-${discountAmount.toFixed(2)} MXN</span>
            </div>
          )}

          <div className="flex justify-between text-gray-600">
            <span>Costo Total de Insumos ({cupcakesQty} x ${unitCost.toFixed(2)}):</span>
            <span className="font-semibold text-rose-700">-${totalCost.toFixed(2)} MXN</span>
          </div>

          <div className="flex justify-between text-gray-900 font-black pt-1.5 border-t border-gray-200 text-sm">
            <span>Monto Real a Cobrar en Caja:</span>
            <span className="text-[#16A34A]">${finalTotalCharged.toFixed(2)} MXN</span>
          </div>

          <div className="flex justify-between text-emerald-800 font-bold bg-emerald-100/70 p-2 rounded-lg">
            <span>Ganancia Neta Real:</span>
            <span className="font-mono text-sm">
              {realNetProfit >= 0 ? `+$${realNetProfit.toFixed(2)} MXN` : `-$${Math.abs(realNetProfit).toFixed(2)} MXN`}
            </span>
          </div>

          <div className="flex justify-between text-gray-700 font-bold bg-slate-100 p-2 rounded-lg items-center">
            <span className="flex items-center gap-1.5">
              <Sparkles size={14} className={spins > 0 ? "text-[#F56B2A]" : "text-gray-400"} />
              <span>Tiradas de Ruleta Otorgadas:</span>
            </span>
            {isPromoApplied && spins === 0 ? (
              <span className="text-amber-800 text-[11px] font-semibold">0 (Promo aplicada)</span>
            ) : (
              <div className="text-right">
                <span className="font-bold text-[#F56B2A]">+{spins} jugada{spins === 1 ? '' : 's'}</span>
                {welcomeSpinBonus > 0 && (
                  <span className="block text-[10px] text-emerald-700 font-semibold">(🎁 Incluye +1 Tiro de Bienvenida)</span>
                )}
              </div>
            )}
          </div>
        </div>

        {purchaseMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-md text-xs font-bold">
            {purchaseMsg}
          </div>
        )}
      </form>
    </SlideOver>
  )
}
