import React, { useState, useEffect } from 'react'
import {
  Users,
  Ticket,
  TrendingUp,
  Power,
  PlusCircle,
  QrCode,
  RefreshCw,
  ShoppingBag,
  Sliders,
  DollarSign,
  MessageSquare
} from 'lucide-react'
import {
  getAdminMetricsApi,
  toggleKillSwitchApi,
  registerPurchaseApi,
  updatePrizeWeightApi
} from '../../lib/api'
import { QRScannerModal } from './QRScannerModal'
import type { UserProfile, AdminMetrics, Prize } from '../../types'

interface DashboardProps {
  adminUser: UserProfile
  allUsers: UserProfile[]
  prizes: Prize[]
  onRefreshData: () => void
}

export const Dashboard: React.FC<DashboardProps> = ({
  adminUser,
  allUsers,
  prizes,
  onRefreshData,
}) => {
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null)
  const [loadingMetrics, setLoadingMetrics] = useState(true)
  const [showQRModal, setShowQRModal] = useState(false)

  // Formulario Registro de Compra
  const [selectedUserId, setSelectedUserId] = useState(allUsers[0]?.id || '')
  const [cupcakesQty, setCupcakesQty] = useState<number>(2)
  const [registeringPurchase, setRegisteringPurchase] = useState(false)
  const [purchaseMsg, setPurchaseMsg] = useState<string | null>(null)

  // Cargar métricas
  const fetchMetrics = async () => {
    setLoadingMetrics(true)
    try {
      const res = await getAdminMetricsApi()
      setMetrics(res.metrics)
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingMetrics(false)
    }
  }

  useEffect(() => {
    fetchMetrics()
  }, [])

  // Toggling Kill Switch
  const handleToggleKillSwitch = async () => {
    if (!metrics) return
    const newStatus = !metrics.games_enabled
    try {
      await toggleKillSwitchApi(newStatus)
      setMetrics({ ...metrics, games_enabled: newStatus })
      fetchMetrics()
    } catch (err) {
      console.error(err)
    }
  }

  // Registrar Compra de Cliente
  const handleRegisterPurchase = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUserId || cupcakesQty <= 0) return

    setRegisteringPurchase(true)
    setPurchaseMsg(null)

    try {
      const res = await registerPurchaseApi({
        user_id: selectedUserId,
        client_name: 'Cliente Registrado',
        cupcakes_qty: cupcakesQty,
        unit_price: 20,
        total_amount: cupcakesQty * 20,
        spins_granted: Math.floor(cupcakesQty / 2),
        admin_id: adminUser.id
      })
      setPurchaseMsg(`¡Compra registrada! Se acreditaron ${res.spins_granted} jugadas nuevas.`)
      onRefreshData()
      fetchMetrics()
    } catch (err: any) {
      setPurchaseMsg(`Error: ${err.message}`)
    } finally {
      setRegisteringPurchase(false)
    }
  }

  // Cambiar peso de premio
  const handleWeightChange = async (prizeId: string, newWeight: number) => {
    try {
      await updatePrizeWeightApi(prizeId, newWeight)
      onRefreshData()
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Header Dashboard & Herramienta de Canje Rápidas */}
      <div className="bg-[#1E1E24] text-white p-6 rounded-3xl shadow-xl flex flex-wrap items-center justify-between gap-4 border border-orange-500/20">
        <div>
          <span className="text-[#FF6D00] text-xs font-extrabold uppercase tracking-wider">
            Panel de Control Operativo
          </span>
          <h2 className="text-2xl font-heading font-black text-white">Dashboard El Inge 🥕</h2>
          <p className="text-xs text-gray-400">Administración de lealtad, límite de 24 cupcakes y canje QR</p>
        </div>

        <button
          onClick={() => setShowQRModal(true)}
          className="px-5 py-3 rounded-2xl bg-[#FF6D00] text-white font-heading font-black text-xs uppercase tracking-wider shadow-lg hover:bg-[#E65100] transition flex items-center gap-2 animate-pulse-glow"
        >
          <QrCode size={18} />
          Escanear / Canjear QR
        </button>
      </div>

      {/* KILL SWITCH - Control de Capacidad Diaria (24 Cupcakes) */}
      <div className={`p-5 rounded-3xl shadow-lg border-2 flex items-center justify-between gap-4 transition-all ${
        metrics?.games_enabled
          ? 'bg-emerald-50 border-emerald-400 text-emerald-950'
          : 'bg-red-50 border-red-400 text-red-950'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-2xl ${metrics?.games_enabled ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
            <Power size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-heading font-black text-base">Kill Switch Minijuegos</h3>
              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase ${
                metrics?.games_enabled ? 'bg-emerald-200 text-emerald-900' : 'bg-red-200 text-red-900'
              }`}>
                {metrics?.games_enabled ? 'Sorteos Activos' : 'Sorteos Pausados'}
              </span>
            </div>
            <p className="text-xs text-gray-600">
              {metrics?.games_enabled
                ? 'Los clientes pueden girar la ruleta y ganar cupones normalmente.'
                : 'Juegos pausados al alcanzar el límite diario de 24 cupcakes para no saturar producción.'}
            </p>
          </div>
        </div>

        <button
          onClick={handleToggleKillSwitch}
          className={`px-4 py-2.5 rounded-xl font-heading font-extrabold text-xs uppercase tracking-wider text-white shadow-md transition ${
            metrics?.games_enabled
              ? 'bg-red-600 hover:bg-red-700'
              : 'bg-emerald-600 hover:bg-emerald-700'
          }`}
        >
          {metrics?.games_enabled ? 'Pausar Juegos' : 'Activar Juegos'}
        </button>
      </div>

      {/* Métricas Principales (Tarjetas Financieras y Operativas) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* 1. Ingresos Reales en Caja */}
        <div className="bg-white p-4 rounded-2xl shadow-md border border-gray-100 space-y-1">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-[11px] font-bold uppercase">Ingresos Reales</span>
            <DollarSign size={16} className="text-[#16A34A]" />
          </div>
          <p className="text-2xl font-heading font-black text-[#1E1E24]">
            ${loadingMetrics ? '...' : (metrics?.total_revenue_mxn ?? 0).toFixed(2)} MXN
          </p>
          <p className="text-[10px] text-gray-400">{metrics?.total_cupcakes_sold ?? 0} cupcakes vendidos</p>
        </div>

        {/* 2. Ganancia Neta Real */}
        <div className="bg-white p-4 rounded-2xl shadow-md border border-gray-100 space-y-1">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-[11px] font-bold uppercase">Utilidad Neta</span>
            <TrendingUp size={16} className="text-emerald-600" />
          </div>
          <p className="text-2xl font-heading font-black text-emerald-700">
            +${loadingMetrics ? '...' : (metrics?.total_gross_profit_mxn ?? 0).toFixed(2)} MXN
          </p>
          <p className="text-[10px] text-emerald-600 font-semibold">
            Margen: {loadingMetrics ? '...' : (metrics?.profit_margin ?? 0)}% real
          </p>
        </div>

        {/* 3. Descuentos Bonificados en Promos */}
        <div className="bg-white p-4 rounded-2xl shadow-md border border-gray-100 space-y-1">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-[11px] font-bold uppercase">Promos Bonificadas</span>
            <Ticket size={16} className="text-[#F56B2A]" />
          </div>
          <p className="text-2xl font-heading font-black text-[#F56B2A]">
            -${loadingMetrics ? '...' : (metrics?.total_discounts_granted_mxn ?? 0).toFixed(2)} MXN
          </p>
          <p className="text-[10px] text-gray-400">Ahorro otorgado a clientes</p>
        </div>

        {/* 4. Tasa de Canje de Cupones */}
        <div className="bg-white p-4 rounded-2xl shadow-md border border-gray-100 space-y-1">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-[11px] font-bold uppercase">Cupones Canjeados</span>
            <Users size={16} className="text-[#0A2540]" />
          </div>
          <p className="text-2xl font-heading font-black text-[#0A2540]">
            {loadingMetrics ? '...' : `${metrics?.total_coupons_redeemed ?? 0} / ${metrics?.total_coupons_issued ?? 0}`}
          </p>
          <p className="text-[10px] text-indigo-600 font-semibold">
            {loadingMetrics ? '...' : `${metrics?.redemption_rate ?? 0}% efectividad`}
          </p>
        </div>
      </div>

      {/* REGISTRO RÁPIDO DE COMPRAS (Otorga 1 tiro por cada 2 cupcakes) */}
      <div className="bg-white p-6 rounded-3xl shadow-lg border border-gray-100 space-y-4">
        <div className="flex items-center gap-2">
          <PlusCircle className="text-[#FF6D00]" size={20} />
          <h3 className="font-heading font-black text-lg text-[#1E1E24]">Registrar Nueva Compra de Cliente</h3>
        </div>

        <form onSubmit={handleRegisterPurchase} className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1">Seleccionar Cliente:</label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-xs font-medium focus:outline-none focus:border-[#FF6D00]"
            >
              {allUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name} ({u.phone})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1">Cantidad de Cupcakes:</label>
            <input
              type="number"
              min="1"
              max="24"
              value={cupcakesQty}
              onChange={(e) => setCupcakesQty(Number(e.target.value))}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-xs font-bold focus:outline-none focus:border-[#FF6D00]"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={registeringPurchase}
              className="w-full py-2.5 px-4 rounded-xl bg-[#1E1E24] text-white font-bold text-xs hover:bg-[#FF6D00] transition flex items-center justify-center gap-2"
            >
              {registeringPurchase ? <RefreshCw className="animate-spin" size={14} /> : <ShoppingBag size={14} />}
              Acreditar Jugadas
            </button>
          </div>
        </form>

        {purchaseMsg && (
          <p className="text-xs font-bold text-emerald-700 bg-emerald-50 p-3 rounded-xl border border-emerald-200">
            {purchaseMsg}
          </p>
        )}
      </div>

      {/* CONTROL DE PROBABILIDADES DE PREMIOS */}
      <div className="bg-white p-6 rounded-3xl shadow-lg border border-gray-100 space-y-4">
        <div className="flex items-center gap-2">
          <Sliders className="text-[#FF6D00]" size={20} />
          <h3 className="font-heading font-black text-lg text-[#1E1E24]">Matriz de Probabilidades del Backend</h3>
        </div>

        <div className="space-y-3">
          {prizes.map((prize) => (
            <div key={prize.id} className="p-3.5 rounded-2xl bg-gray-50 border border-gray-200 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <span
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: prize.badge_color }}
                />
                <div>
                  <p className="font-bold text-gray-800">{prize.title}</p>
                  <p className="text-[10px] text-gray-500">{prize.tier}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <label className="text-[11px] font-semibold text-gray-600">Peso Probabilidad:</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  defaultValue={prize.weight}
                  onBlur={(e) => handleWeightChange(prize.id, Number(e.target.value))}
                  className="w-16 px-2 py-1 rounded-lg border border-gray-300 font-bold text-center"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* TABLA DE CLIENTES PARA MARKETING DIRECTO (WhatsApp) */}
      <div className="bg-white p-6 rounded-3xl shadow-lg border border-gray-100 space-y-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="text-emerald-600" size={20} />
          <h3 className="font-heading font-black text-lg text-[#1E1E24]">Directorio de Clientes (WhatsApp/SMS)</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-100 text-gray-600 uppercase text-[10px] font-bold">
              <tr>
                <th className="p-3 rounded-l-xl">Nombre</th>
                <th className="p-3">Teléfono WhatsApp</th>
                <th className="p-3">Jugadas Disponibles</th>
                <th className="p-3 rounded-r-xl">Cupcakes Comprados</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium">
              {allUsers.map((user) => (
                <tr key={user.id} className="hover:bg-orange-50/50">
                  <td className="p-3 font-bold text-gray-900">{user.full_name}</td>
                  <td className="p-3 font-mono text-emerald-700">
                    <a 
                      href={`https://wa.me/52${user.phone}?text=¡Hola%20${encodeURIComponent(user.full_name)}!%20En%20Cupcakes%20El%20Inge%20tenemos%20nuevos%20sabores%20artesanales%20🥕`}
                      target="_blank"
                      rel="noreferrer"
                      className="underline flex items-center gap-1"
                    >
                      📱 {user.phone}
                    </a>
                  </td>
                  <td className="p-3 text-center font-bold text-[#FF6D00]">{user.spins_available}</td>
                  <td className="p-3 text-center">{user.total_cupcakes_purchased} pzas</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DE ESCÁNER QR DE CANJE Y REGISTRO DE COMPRAS */}
      {showQRModal && (
        <QRScannerModal
          adminId={adminUser.id}
          allUsers={allUsers}
          onClose={() => setShowQRModal(false)}
          onRedeemedSuccess={() => {
            fetchMetrics()
            onRefreshData()
          }}
          onPurchaseSuccess={() => {
            fetchMetrics()
            onRefreshData()
          }}
        />
      )}
    </div>
  )
}
