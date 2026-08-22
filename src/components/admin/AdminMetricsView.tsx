import React, { useState, useMemo } from 'react'
import { 
  TrendingUp, 
  DollarSign, 
  Power, 
  PackageCheck, 
  Calendar, 
  Layers, 
  RefreshCw, 
  ShoppingBag,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react'
import type { AdminMetrics } from '../../types'
import { toggleKillSwitchApi, updateStockApi } from '../../lib/api'

interface AdminMetricsViewProps {
  metrics: AdminMetrics | null
  loading: boolean
  onRefresh: () => void
}

type PurchaseSortField = 'fecha_creacion' | 'nombre_cliente' | 'is_anonymous' | 'cantidad_cupcakes' | 'monto_total' | 'tiros_otorgados'

export const AdminMetricsView: React.FC<AdminMetricsViewProps> = ({
  metrics,
  loading,
  onRefresh,
}) => {
  const [editingStock, setEditingStock] = useState(false)
  const [newStockVal, setNewStockVal] = useState<number>(metrics?.current_stock ?? 24)
  const [updatingStock, setUpdatingStock] = useState(false)

  // Estado optimista local para Stock y Kill Switch (0ms)
  const [localGamesEnabled, setLocalGamesEnabled] = useState<boolean>(metrics?.games_enabled ?? true)
  const [localStock, setLocalStock] = useState<number>(metrics?.current_stock ?? 24)

  React.useEffect(() => {
    if (metrics) {
      setLocalGamesEnabled(metrics.games_enabled ?? true)
      setLocalStock(metrics.current_stock ?? 24)
      setNewStockVal(metrics.current_stock ?? 24)
    }
  }, [metrics])

  // Estado de ordenamiento de compras recientes
  const [sortField, setSortField] = useState<PurchaseSortField>('fecha_creacion')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  const handleSort = (field: PurchaseSortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  // Lista ordenada de compras recientes
  const sortedPurchases = useMemo(() => {
    if (!metrics?.recent_purchases) return []
    const list = [...metrics.recent_purchases]

    return list.sort((a: any, b: any) => {
      let comparison = 0

      switch (sortField) {
        case 'fecha_creacion':
          const timeA = new Date(a.fecha_creacion || a.created_at || 0).getTime()
          const timeB = new Date(b.fecha_creacion || b.created_at || 0).getTime()
          comparison = timeA - timeB
          break
        case 'nombre_cliente':
          const nameA = a.nombre_cliente || a.customer_name || a.client_name || 'Venta Directa'
          const nameB = b.nombre_cliente || b.customer_name || b.client_name || 'Venta Directa'
          comparison = nameA.localeCompare(nameB, 'es', { sensitivity: 'base' })
          break
        case 'is_anonymous':
          const anonA = a.is_anonymous ? 1 : 0
          const anonB = b.is_anonymous ? 1 : 0
          comparison = anonA - anonB
          break
        case 'cantidad_cupcakes':
          const qtyA = Number(a.cantidad_cupcakes ?? a.cupcakes_qty ?? 1)
          const qtyB = Number(b.cantidad_cupcakes ?? b.cupcakes_qty ?? 1)
          comparison = qtyA - qtyB
          break
        case 'monto_total':
          const totalA = Number(a.monto_total ?? a.total_amount ?? 0)
          const totalB = Number(b.monto_total ?? b.total_amount ?? 0)
          comparison = totalA - totalB
          break
        case 'tiros_otorgados':
          const spinsA = Number(a.tiros_otorgados ?? a.spins_granted ?? 0)
          const spinsB = Number(b.tiros_otorgados ?? b.spins_granted ?? 0)
          comparison = spinsA - spinsB
          break
      }

      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [metrics?.recent_purchases, sortField, sortDirection])

  const handleToggleKillSwitch = async () => {
    const newStatus = !localGamesEnabled
    setLocalGamesEnabled(newStatus) // Optimista en 0ms

    try {
      await toggleKillSwitchApi(newStatus)
      onRefresh()
    } catch (err) {
      console.error(err)
      setLocalGamesEnabled(!newStatus) // Revertir si hay error
    }
  }

  const handleUpdateStock = async (e: React.FormEvent) => {
    e.preventDefault()
    setUpdatingStock(true)
    setLocalStock(newStockVal) // Optimista en 0ms
    setEditingStock(false)

    try {
      await updateStockApi(newStockVal)
      onRefresh()
    } catch (err) {
      console.error(err)
      setLocalStock(metrics?.current_stock ?? 24) // Revertir si hay error
    } finally {
      setUpdatingStock(false)
    }
  }

  const cupcakesSold = metrics?.total_cupcakes_sold || 0
  const dailyLimit = metrics?.daily_production_limit || 24
  const currentStock = localStock
  const revenue = metrics?.total_revenue_mxn || 0
  const weeklyCupcakes = metrics?.weekly_cupcakes_sold || 0
  const weeklyRevenue = metrics?.weekly_revenue_mxn || 0
  const estimatedCost = Math.round(cupcakesSold * 6.67)
  const estimatedProfit = revenue - estimatedCost

  const weeklyBreakdown = metrics?.weekly_breakdown || []
  const maxDayCupcakes = Math.max(...weeklyBreakdown.map((d: any) => d.cupcakes), 1)

  return (
    <div className="space-y-6">
      {/* 1. ENCABEZADO DE PÁGINA */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#0A2540] tracking-tight">
            Ventas de la Semana & Control de Stock
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Monitoreo en tiempo real de inventario disponible, ventas generales y rendimiento operativo.
          </p>
        </div>

        <button
          onClick={onRefresh}
          className="px-3.5 py-2 rounded-md bg-white border border-gray-300 text-gray-700 font-semibold text-xs flex items-center gap-1.5 hover:bg-gray-50 transition shadow-2xs"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Actualizar Métricas</span>
        </button>
      </div>

      {/* 2. BARRA DE STOCK DISPONIBLE & KILL SWITCH */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* CONTROL DE STOCK EN TIEMPO REAL */}
        <div className={`p-5 rounded-md border shadow-2xs space-y-3 transition-all ${
          currentStock > 5 
            ? 'bg-blue-50/70 border-blue-200 text-blue-950' 
            : currentStock > 0 
            ? 'bg-amber-50/80 border-amber-300 text-amber-950'
            : 'bg-red-50/80 border-red-300 text-red-950'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Layers size={15} />
              <span>Stock Disponible Hoy</span>
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
              currentStock > 5
                ? 'bg-blue-100 text-blue-800 border-blue-200'
                : currentStock > 0
                ? 'bg-amber-200 text-amber-900 border-amber-300'
                : 'bg-red-200 text-red-900 border-red-300'
            }`}>
              {currentStock > 0 ? `${currentStock} pcs listas` : 'Agotado'}
            </span>
          </div>

          <div className="flex items-baseline justify-between">
            <div>
              <p className="text-3xl font-black text-[#0A2540]">{currentStock} <span className="text-xs font-semibold text-gray-500">piezas</span></p>
              <p className="text-[10px] text-gray-500 mt-0.5">Se descuenta automáticamente con cada venta</p>
            </div>

            {!editingStock ? (
              <button
                onClick={() => {
                  setNewStockVal(currentStock)
                  setEditingStock(true)
                }}
                className="px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-800 font-bold text-xs rounded-md shadow-2xs transition"
              >
                Ajustar Stock
              </button>
            ) : (
              <form onSubmit={handleUpdateStock} className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={newStockVal}
                  onChange={(e) => setNewStockVal(Number(e.target.value))}
                  className="w-16 px-2 py-1 bg-white border border-gray-300 rounded-md font-bold text-xs text-center"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={updatingStock}
                  className="px-2.5 py-1 bg-[#0A2540] text-white font-bold text-xs rounded-md"
                >
                  {updatingStock ? '...' : 'OK'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingStock(false)}
                  className="px-1.5 py-1 text-xs text-gray-500"
                >
                  ✕
                </button>
              </form>
            )}
          </div>
        </div>

        {/* KILL SWITCH (LÍMITE DIARIO 24 CUPCAKES) */}
        <div className={`lg:col-span-2 p-5 rounded-md border shadow-2xs flex flex-wrap items-center justify-between gap-4 transition-all ${
          metrics?.games_enabled
            ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950'
            : 'bg-red-50/70 border-red-300 text-red-950'
        }`}>
          <div className="flex items-center gap-3.5">
            <div className={`p-3 rounded-md shadow-2xs shrink-0 ${
              metrics?.games_enabled ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
            }`}>
              <Power size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm">Capacidad de Producción Diaria</h3>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase border ${
                  metrics?.games_enabled ? 'bg-emerald-100 border-emerald-300 text-emerald-800' : 'bg-red-100 border-red-300 text-red-800'
                }`}>
                  {metrics?.games_enabled ? 'Sorteos Habilitados' : 'Juegos Pausados'}
                </span>
              </div>
              <p className="text-xs text-gray-600 mt-0.5">
                Capacidad artesanal: <strong>{dailyLimit} cupcakes al día</strong>. Pausa la ruleta si el stock se agota.
              </p>
            </div>
          </div>

          <button
            onClick={handleToggleKillSwitch}
            className={`px-4 py-2 rounded-md font-bold text-xs uppercase tracking-wider text-white shadow-2xs transition ${
              metrics?.games_enabled
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-[#0A2540] hover:bg-[#081C30]'
            }`}
          >
            {metrics?.games_enabled ? 'Pausar Minijuegos' : 'Reactivar Minijuegos'}
          </button>
        </div>
      </div>

      {/* 3. RESUMEN GENERAL DE LA SEMANA (KPIs SEMANALES) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Cupcakes Vendidos esta Semana */}
        <div className="bg-white p-4 rounded-md border border-gray-200 shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Ventas de la Semana</span>
            <PackageCheck size={16} className="text-[#F56B2A]" />
          </div>
          <p className="text-2xl font-bold text-[#0A2540]">
            {loading ? '...' : `${weeklyCupcakes} pcs`}
          </p>
          <p className="text-[10px] text-gray-400">Últimos 7 días de operación</p>
        </div>

        {/* Ingresos Semanales */}
        <div className="bg-white p-4 rounded-md border border-gray-200 shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Ingresos de la Semana</span>
            <DollarSign size={16} className="text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-emerald-700">
            {loading ? '...' : `$${weeklyRevenue} MXN`}
          </p>
          <p className="text-[10px] text-gray-400">Total cobrado en mostrador</p>
        </div>

        {/* Total Histórico */}
        <div className="bg-white p-4 rounded-md border border-gray-200 shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Acumulado</span>
            <TrendingUp size={16} className="text-[#0A2540]" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {loading ? '...' : `${cupcakesSold} pcs`}
          </p>
          <p className="text-[10px] text-gray-400">${revenue} MXN históricos</p>
        </div>

        {/* Ganancia Estimada */}
        <div className="bg-white p-4 rounded-md border border-emerald-200 bg-emerald-50/30 shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-900">Ganancia Neta</span>
            <TrendingUp size={16} className="text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-emerald-700">
            {loading ? '...' : `+$${estimatedProfit} MXN`}
          </p>
          <p className="text-[10px] text-gray-400">Costo unitario: $6.67 (Costos: ${estimatedCost})</p>
        </div>
      </div>

      {/* 4. GRÁFICO VISUAL: DESGLOSE DE VENTAS POR DÍA DE LA SEMANA */}
      <div className="bg-white p-6 rounded-md border border-gray-200 shadow-2xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-base text-[#0A2540] flex items-center gap-2">
              <Calendar size={18} className="text-[#F56B2A]" />
              <span>Desglose de Ventas por Día (Semana)</span>
            </h3>
            <p className="text-xs text-gray-500">
              Comparativa de cupcakes vendidos por día (Venta a Clientes vs Venta Directa en Facultades / Encargos)
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-[#0A2540]" />
              <span className="text-gray-700">Venta a Cliente</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-[#F56B2A]" />
              <span className="text-gray-700">Venta Directa</span>
            </div>
          </div>
        </div>

        {/* Barras de Ventas por Día */}
        <div className="grid grid-cols-7 gap-3 pt-4">
          {weeklyBreakdown.map((dayData: any, idx: number) => {
            const heightPercent = maxDayCupcakes > 0 
              ? Math.max(12, Math.round((dayData.cupcakes / maxDayCupcakes) * 100)) 
              : 12

            return (
              <div key={idx} className="flex flex-col items-center gap-2">
                <span className="text-xs font-bold text-gray-800">
                  {dayData.cupcakes} <span className="text-[10px] font-normal text-gray-500">pcs</span>
                </span>

                {/* Contenedor de la barra */}
                <div className="w-full h-32 bg-gray-100 rounded-md flex flex-col justify-end p-1 relative overflow-hidden">
                  {/* Barra apilada: Venta a Clientes (Azul) + Venta Directa (Naranja) */}
                  <div
                    style={{ height: `${heightPercent}%` }}
                    className="w-full flex flex-col justify-end rounded-xs overflow-hidden transition-all duration-500 shadow-2xs"
                  >
                    {/* Segmento Venta Directa (Naranja) */}
                    {dayData.unregistered_cupcakes > 0 && (
                      <div
                        style={{
                          height: `${(dayData.unregistered_cupcakes / (dayData.cupcakes || 1)) * 100}%`,
                        }}
                        className="w-full bg-[#F56B2A]"
                        title={`Venta Directa: ${dayData.unregistered_cupcakes} pcs`}
                      />
                    )}
                    {/* Segmento Venta a Clientes (Azul Oscuro) */}
                    {dayData.registered_cupcakes > 0 && (
                      <div
                        style={{
                          height: `${(dayData.registered_cupcakes / (dayData.cupcakes || 1)) * 100}%`,
                        }}
                        className="w-full bg-[#0A2540]"
                        title={`Venta a Clientes: ${dayData.registered_cupcakes} pcs`}
                      />
                    )}
                  </div>
                </div>

                <div className="text-center">
                  <p className="text-[11px] font-bold text-gray-700">{dayData.label.split(' ')[0]}</p>
                  <p className="text-[10px] text-gray-400 font-mono">{dayData.label.split(' ')[1]}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 5. HISTORIAL DE VENTAS RECIENTES DE LA SEMANA */}
      <div className="bg-white rounded-md border border-gray-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-bold text-sm text-[#0A2540] flex items-center gap-2">
            <ShoppingBag size={16} className="text-[#0A2540]" />
            <span>Últimas Transacciones Registradas</span>
          </h3>
          <span className="text-xs text-gray-400 font-mono">
            {sortedPurchases.length} registros
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAFC] text-gray-600 text-[11px] uppercase tracking-wider border-b border-gray-200 font-bold select-none">
              <tr>
                <th 
                  onClick={() => handleSort('fecha_creacion')} 
                  className="py-3 px-4 cursor-pointer hover:bg-slate-200/60 transition group"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Fecha / Hora</span>
                    {sortField === 'fecha_creacion' ? (
                      sortDirection === 'asc' ? <ArrowUp size={13} className="text-[#0A2540]" /> : <ArrowDown size={13} className="text-[#0A2540]" />
                    ) : (
                      <ArrowUpDown size={13} className="text-gray-400 group-hover:text-gray-600" />
                    )}
                  </div>
                </th>

                <th 
                  onClick={() => handleSort('nombre_cliente')} 
                  className="py-3 px-4 cursor-pointer hover:bg-slate-200/60 transition group"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Cliente / Referencia</span>
                    {sortField === 'nombre_cliente' ? (
                      sortDirection === 'asc' ? <ArrowUp size={13} className="text-[#0A2540]" /> : <ArrowDown size={13} className="text-[#0A2540]" />
                    ) : (
                      <ArrowUpDown size={13} className="text-gray-400 group-hover:text-gray-600" />
                    )}
                  </div>
                </th>

                <th 
                  onClick={() => handleSort('is_anonymous')} 
                  className="py-3 px-4 text-center cursor-pointer hover:bg-slate-200/60 transition group"
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span>Tipo de Venta</span>
                    {sortField === 'is_anonymous' ? (
                      sortDirection === 'asc' ? <ArrowUp size={13} className="text-[#0A2540]" /> : <ArrowDown size={13} className="text-[#0A2540]" />
                    ) : (
                      <ArrowUpDown size={13} className="text-gray-400 group-hover:text-gray-600" />
                    )}
                  </div>
                </th>

                <th 
                  onClick={() => handleSort('cantidad_cupcakes')} 
                  className="py-3 px-4 text-center cursor-pointer hover:bg-slate-200/60 transition group"
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span>Cantidad</span>
                    {sortField === 'cantidad_cupcakes' ? (
                      sortDirection === 'asc' ? <ArrowUp size={13} className="text-[#0A2540]" /> : <ArrowDown size={13} className="text-[#0A2540]" />
                    ) : (
                      <ArrowUpDown size={13} className="text-gray-400 group-hover:text-gray-600" />
                    )}
                  </div>
                </th>

                <th 
                  onClick={() => handleSort('monto_total')} 
                  className="py-3 px-4 text-center cursor-pointer hover:bg-slate-200/60 transition group"
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span>Total Cobrado</span>
                    {sortField === 'monto_total' ? (
                      sortDirection === 'asc' ? <ArrowUp size={13} className="text-[#0A2540]" /> : <ArrowDown size={13} className="text-[#0A2540]" />
                    ) : (
                      <ArrowUpDown size={13} className="text-gray-400 group-hover:text-gray-600" />
                    )}
                  </div>
                </th>

                <th 
                  onClick={() => handleSort('tiros_otorgados')} 
                  className="py-3 px-4 text-right cursor-pointer hover:bg-slate-200/60 transition group"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Tiros Otorgados</span>
                    {sortField === 'tiros_otorgados' ? (
                      sortDirection === 'asc' ? <ArrowUp size={13} className="text-[#0A2540]" /> : <ArrowDown size={13} className="text-[#0A2540]" />
                    ) : (
                      <ArrowUpDown size={13} className="text-gray-400 group-hover:text-gray-600" />
                    )}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium text-gray-800">
              {sortedPurchases.length > 0 ? (
                sortedPurchases.map((p: any) => {
                  const isAnon = p.is_anonymous !== undefined 
                    ? p.is_anonymous 
                    : ((!p.usuario_id && !p.user_id) || p.usuario_id === 'anonymous' || p.user_id === 'anonymous' || p.usuario_id === 'unregistered')

                  const clientName = p.nombre_cliente || p.customer_name || (isAnon ? 'Venta Directa' : 'Cliente Registrado')
                  const clientPhone = p.customer_phone || p.telefono || (p.usuarios?.telefono ?? '')
                  const qty = p.cantidad_cupcakes ?? p.cupcakes_qty ?? 1
                  const total = p.monto_total ?? p.total_amount ?? (qty * 20)
                  const spins = p.tiros_otorgados ?? p.spins_granted ?? 0

                  const dateRaw = p.fecha_creacion || p.created_at
                  let formattedDate = 'Reciente'
                  if (dateRaw) {
                    const parsed = new Date(dateRaw)
                    if (!isNaN(parsed.getTime())) {
                      formattedDate = parsed.toLocaleString('es-MX', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })
                    }
                  }

                  return (
                    <tr key={p.id || `${dateRaw}-${qty}`} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 text-gray-500 font-mono text-[11px]">
                        {formattedDate}
                      </td>

                      <td className="py-3 px-4 font-bold text-gray-900">
                        <div className="flex flex-col">
                          <span>{clientName}</span>
                          {clientPhone ? (
                            <span className="text-[10px] text-gray-400 font-normal font-mono">
                              {clientPhone}
                            </span>
                          ) : null}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${
                          isAnon 
                            ? 'bg-amber-100 text-amber-900 border border-amber-300' 
                            : 'bg-blue-100 text-blue-900 border border-blue-300'
                        }`}>
                          {isAnon ? '🧁 Venta Directa' : '👤 Venta a Cliente'}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center font-bold">
                        {qty} {qty === 1 ? 'pc' : 'pcs'}
                      </td>

                      <td className="py-3 px-4 text-center font-mono font-bold text-emerald-700">
                        ${total} MXN
                      </td>

                      <td className="py-3 px-4 text-right font-bold text-[#E65100]">
                        {spins > 0 ? `+${spins} ${spins === 1 ? 'tiro' : 'tiros'}` : '-'}
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-gray-400 text-xs italic">
                    Aún no hay compras registradas en el sistema.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
