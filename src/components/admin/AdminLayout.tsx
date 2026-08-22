import React, { useState, useEffect } from 'react'
import {
  Users,
  Sliders,
  BarChart3,
  QrCode,
  ArrowLeft,
  RefreshCw,
  Power,
  ChevronLeft,
  ChefHat
} from 'lucide-react'
import { AdminClientsTable } from './AdminClientsTable'
import { AdminPromotionsManager } from './AdminPromotionsManager'
import { AdminProductsManager } from './AdminProductsManager'
import { AdminMetricsView } from './AdminMetricsView'
import { QRScannerModal } from './QRScannerModal'
import type { UserProfile, Prize, Coupon, AdminMetrics } from '../../types'
import { getAdminMetricsApi, getPrizesApi } from '../../lib/api'

interface AdminLayoutProps {
  adminUser?: UserProfile
  allUsers: UserProfile[]
  prizes: Prize[]
  allCoupons?: Coupon[]
  onReturnToApp?: () => void
  onNavigateToClient?: () => void
  onRefreshData?: () => void
  onRefreshUsers?: () => void
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  adminUser,
  allUsers,
  prizes: initialPrizes,
  allCoupons = [],
  onReturnToApp,
  onNavigateToClient,
  onRefreshData,
  onRefreshUsers,
}) => {
  const handleReturn = onNavigateToClient || onReturnToApp || (() => { window.location.href = '/' })
  const handleRefresh = onRefreshUsers || onRefreshData || (() => { })
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true)
  const [activeTab, setActiveTab] = useState<'clients' | 'promotions' | 'products' | 'metrics' | 'killswitch'>('clients')
  const [showQRModal, setShowQRModal] = useState(false)
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null)
  const [prizes, setPrizes] = useState<Prize[]>(initialPrizes)
  const [loading, setLoading] = useState(false)

  // Cargar métricas y catálogo de premios
  const loadData = async () => {
    setLoading(true)
    try {
      const [mRes, pRes] = await Promise.allSettled([
        getAdminMetricsApi(),
        getPrizesApi(),
      ])

      if (mRes.status === 'fulfilled' && mRes.value.metrics) {
        setMetrics(mRes.value.metrics)
      }
      if (pRes.status === 'fulfilled' && pRes.value.prizes) {
        setPrizes(pRes.value.prizes)
      }
    } catch {
      // Continuar con estado local
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleRefreshAll = () => {
    loadData()
    handleRefresh()
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#F8FAFC] flex text-gray-900 font-sans">
      {/* 1. SIDEBAR NAVBAR CON ANIMACIÓN SIPAD FLUIDA Y FONDO #F3F3F3 */}
      <div className={`shrink-0 h-screen sticky top-0 z-40 transition-all duration-300 ease-in-out ${isSidebarExpanded ? 'w-64' : 'w-20'}`}
      >
        {/* Botón Circular con rotación para Expandir / Contraer */}
        <button
          onClick={() => setIsSidebarExpanded(!isSidebarExpanded)}
          className="absolute top-5 -right-2.5 z-50 w-5 h-5 rounded-full flex items-center justify-center bg-[#F17B20] text-white shadow-md shadow-[#F17B20]/30 hover:scale-110 transition-transform duration-200 border border-white cursor-pointer"
          title={isSidebarExpanded ? 'Contraer menú' : 'Expandir menú'}
        >
          <ChevronLeft
            size={11}
            strokeWidth={3}
            className={`transition-transform duration-300 ${!isSidebarExpanded ? 'rotate-180' : ''}`}
          />
        </button>

        <aside className="relative flex flex-col h-full w-full font-sans select-none overflow-hidden bg-[#F3F3F3] border-r border-gray-200 rounded-r-2xl"
          style={{ boxShadow: '4px 0 24px rgba(6,15,92,0.15)' }}>
          {/* Header con Logo y Badge INGE */}
          <div className="flex items-center border-b border-gray-200 h-16 shrink-0 px-4 relative overflow-hidden">
            {/* Logo Completo letras.png (animado en expansión) */}
            <div className={`transition-all duration-300 ease-in-out whitespace-nowrap overflow-hidden flex items-center ${isSidebarExpanded ? 'opacity-100 max-w-[170px]' : 'opacity-0 max-w-0 pointer-events-none'
              }`}>
              <img
                src="/letras-cupcake.png"
                alt="El Inge Logo"
                className="h-10 object-contain"
              />
            </div>

            {/* Badge INGE compacto (animado en colapso) */}
            <div className={`transition-all duration-300 ease-in-out flex items-center justify-center absolute left-1/2 -translate-x-1/2 ${!isSidebarExpanded ? 'opacity-100 scale-100' : 'opacity-0 scale-75 pointer-events-none'
              }`}>
              <img
                src="/cupcake-color.png"
                alt="El Inge Logo"
                className="h-10 object-contain"
              />
            </div>
          </div>

          {/* Menú de Navegación Principal */}
          <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-3 space-y-1">
            {/* Título de Sección: Panel de Control */}
            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isSidebarExpanded ? 'max-h-8 opacity-100 mb-2 mt-1' : 'max-h-0 opacity-0 mb-0 mt-0 pointer-events-none'
              }`}>
              <p className="px-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest whitespace-nowrap">
                Panel de Control
              </p>
            </div>

            {/* Clientes */}
            <button
              onClick={() => setActiveTab('clients')}
              className={`w-full flex items-center rounded-xl text-xs font-semibold transition-all duration-300 group relative ${isSidebarExpanded ? 'px-3.5 py-2.5 gap-3 justify-start' : 'p-2.5 justify-center'
                } ${activeTab === 'clients'
                  ? 'bg-[#F17B20] text-white font-bold shadow-sm shadow-[#F17B20]/25'
                  : 'text-gray-700 hover:text-[#F17B20] hover:bg-orange-50/70'
                }`}
              title={!isSidebarExpanded ? "Clientes & Fidelidad" : undefined}
            >
              <Users size={18} className="shrink-0 transition-transform duration-200 group-hover:scale-105" />
              <span className={`whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out ${isSidebarExpanded ? 'opacity-100 max-w-[180px]' : 'opacity-0 max-w-0 pointer-events-none'
                }`}>
                Clientes & Fidelidad
              </span>
            </button>

            {/* Promociones & Ruleta */}
            <button
              onClick={() => setActiveTab('promotions')}
              className={`w-full flex items-center rounded-xl text-xs font-semibold transition-all duration-300 group relative ${isSidebarExpanded ? 'px-3.5 py-2.5 gap-3 justify-start' : 'p-2.5 justify-center'
                } ${activeTab === 'promotions'
                  ? 'bg-[#F17B20] text-white font-bold shadow-sm shadow-[#F17B20]/25'
                  : 'text-gray-700 hover:text-[#F17B20] hover:bg-orange-50/70'
                }`}
              title={!isSidebarExpanded ? "Promociones & Ruleta" : undefined}
            >
              <Sliders size={18} className="shrink-0 transition-transform duration-200 group-hover:scale-105" />
              <span className={`whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out ${isSidebarExpanded ? 'opacity-100 max-w-[180px]' : 'opacity-0 max-w-0 pointer-events-none'
                }`}>
                Promociones & Ruleta
              </span>
            </button>

            {/* Productos, Recetas & Costos */}
            <button
              onClick={() => setActiveTab('products')}
              className={`w-full flex items-center rounded-xl text-xs font-semibold transition-all duration-300 group relative ${isSidebarExpanded ? 'px-3.5 py-2.5 gap-3 justify-start' : 'p-2.5 justify-center'
                } ${activeTab === 'products'
                  ? 'bg-[#F17B20] text-white font-bold shadow-sm shadow-[#F17B20]/25'
                  : 'text-gray-700 hover:text-[#F17B20] hover:bg-orange-50/70'
                }`}
              title={!isSidebarExpanded ? "Productos & Costos" : undefined}
            >
              <ChefHat size={18} className="shrink-0 transition-transform duration-200 group-hover:scale-105" />
              <span className={`whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out ${isSidebarExpanded ? 'opacity-100 max-w-[180px]' : 'opacity-0 max-w-0 pointer-events-none'
                }`}>
                Productos & Costos
              </span>
            </button>

            {/* Métricas y Estadísticas */}
            <button
              onClick={() => setActiveTab('metrics')}
              className={`w-full flex items-center rounded-xl text-xs font-semibold transition-all duration-300 group relative ${isSidebarExpanded ? 'px-3.5 py-2.5 gap-3 justify-start' : 'p-2.5 justify-center'
                } ${activeTab === 'metrics'
                  ? 'bg-[#F17B20] text-white font-bold shadow-sm shadow-[#F17B20]/25'
                  : 'text-gray-700 hover:text-[#F17B20] hover:bg-orange-50/70'
                }`}
              title={!isSidebarExpanded ? "Métricas & Ventas" : undefined}
            >
              <BarChart3 size={18} className="shrink-0 transition-transform duration-200 group-hover:scale-105" />
              <span className={`whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out ${isSidebarExpanded ? 'opacity-100 max-w-[180px]' : 'opacity-0 max-w-0 pointer-events-none'
                }`}>
                Métricas & Ventas
              </span>
            </button>
          </nav>

          {/* Sección Inferior: SISTEMA */}
          <div className="shrink-0 px-3 pb-3 space-y-1.5 border-t border-gray-200 pt-3 bg-[#EAEAEA]/50">
            {/* Título de Sección: Sistema */}
            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isSidebarExpanded ? 'max-h-8 opacity-100 mb-1' : 'max-h-0 opacity-0 mb-0 pointer-events-none'
              }`}>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-3 whitespace-nowrap">
                Sistema
              </p>
            </div>

            {/* Escáner de Canje */}
            <button
              onClick={() => setShowQRModal(true)}
              className={`w-full flex items-center rounded-xl text-xs font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 transition-all duration-300 border border-emerald-300/60 shadow-2xs group ${isSidebarExpanded ? 'px-3.5 py-2.5 gap-3 justify-start' : 'p-2.5 justify-center'
                }`}
              title={!isSidebarExpanded ? "Escanear QR Caja" : undefined}
            >
              <QrCode size={18} className="shrink-0 text-emerald-700 group-hover:scale-105 transition-transform duration-200" />
              <span className={`whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out ${isSidebarExpanded ? 'opacity-100 max-w-[180px]' : 'opacity-0 max-w-0 pointer-events-none'
                }`}>
                Escanear QR Caja
              </span>
            </button>

            {/* Kill Switch Operativo */}
            <button
              onClick={() => setActiveTab('killswitch')}
              className={`w-full flex items-center rounded-xl text-xs font-semibold transition-all duration-300 group ${isSidebarExpanded ? 'px-3.5 py-2.5 gap-3 justify-start' : 'p-2.5 justify-center'
                } ${activeTab === 'killswitch'
                  ? 'bg-[#F17B20] text-white font-bold shadow-sm shadow-[#F17B20]/25'
                  : 'text-gray-700 hover:text-[#F17B20] hover:bg-orange-50/70'
                }`}
              title={!isSidebarExpanded ? "Kill Switch (24 pcs)" : undefined}
            >
              <Power size={18} className="shrink-0 transition-transform duration-200 group-hover:scale-105" />
              <span className={`whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out ${isSidebarExpanded ? 'opacity-100 max-w-[180px]' : 'opacity-0 max-w-0 pointer-events-none'
                }`}>
                Kill Switch (24 pcs)
              </span>
            </button>

            {/* User Profile Card */}
            <div className="pt-2">
              <div className={`flex items-center p-2 rounded-xl bg-white border border-gray-200 shadow-2xs transition-all duration-300 ${isSidebarExpanded ? 'justify-between' : 'justify-center p-1.5'
                }`}>
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-[#F17B20] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                    JC
                  </div>

                  {/* Nombre y Cargo (animación fluida de ancho y opacidad) */}
                  <div className={`overflow-hidden transition-all duration-300 ease-in-out min-w-0 ${isSidebarExpanded ? 'opacity-100 max-w-[130px]' : 'opacity-0 max-w-0 pointer-events-none'
                    }`}>
                    <p className="text-xs font-bold text-gray-900 truncate leading-tight whitespace-nowrap">Julian Castro</p>
                    <p className="text-[10px] text-gray-500 truncate whitespace-nowrap">Administrador</p>
                  </div>
                </div>

                {/* Botón Salir / Volver */}
                <button
                  onClick={handleReturn}
                  className={`text-gray-400 hover:text-[#F17B20] hover:bg-orange-50 rounded-lg transition-all duration-300 shrink-0 cursor-pointer overflow-hidden flex items-center justify-center ${isSidebarExpanded ? 'opacity-100 max-w-8 p-1.5 ml-1' : 'opacity-0 max-w-0 p-0 ml-0 pointer-events-none'
                    }`}
                  title="Volver a la App Móvil"
                >
                  <ArrowLeft size={16} />
                </button>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* 2. CONTENIDO PRINCIPAL CON SCROLL INDEPENDIENTE */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        {/* Topbar Navbar Color #F3F3F3 (Estilo SIPAD Portal) */}
        <header className="bg-[#F3F3F3] border-b border-gray-300/80 px-8 py-3.5 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <h1 className="font-heading font-black text-lg text-[#0A2540] tracking-tight">
              Portal Administrativo
            </h1>
          </div>

          <div className="flex items-center gap-4">
            {/* Botón Refrescar */}
            <button
              onClick={handleRefreshAll}
              className="p-2 rounded-md bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 transition shadow-2xs"
              title="Recargar datos"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </header>

        {/* Vistas según Tab activo */}
        <div className="p-8 flex-1 max-w-7xl w-full mx-auto space-y-6">
          {activeTab === 'clients' && (
            <AdminClientsTable
              clients={allUsers}
              adminUser={adminUser}
              allCoupons={allCoupons}
              onRefresh={handleRefreshAll}
              onOpenScanner={() => setShowQRModal(true)}
            />
          )}

          {activeTab === 'promotions' && (
            <AdminPromotionsManager
              prizes={prizes}
              onRefresh={handleRefreshAll}
            />
          )}

          {activeTab === 'products' && (
            <AdminProductsManager />
          )}

          {(activeTab === 'metrics' || activeTab === 'killswitch') && (
            <AdminMetricsView
              metrics={metrics}
              loading={loading}
              onRefresh={handleRefreshAll}
            />
          )}
        </div>
      </main>

      {/* Modal de Escáner QR de Doble Propósito */}
      {showQRModal && (
        <QRScannerModal
          adminId={adminUser?.id || '00000000-0000-0000-0000-000000000001'}
          allUsers={allUsers}
          onClose={() => setShowQRModal(false)}
          onRedeemedSuccess={handleRefreshAll}
          onPurchaseSuccess={handleRefreshAll}
        />
      )}
    </div>
  )
}
