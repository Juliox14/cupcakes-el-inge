import React, { useState, useMemo } from 'react'
import { 
  Search, 
  Plus, 
  MessageCircle, 
  ShoppingBag, 
  Sparkles, 
  ChevronLeft, 
  ChevronRight,
  Eye,
  QrCode,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react'
import type { UserProfile, Coupon, ProductoConCosto } from '../../types'
import { registerPurchaseApi, getProductsApi, grantSpinsApi } from '../../lib/api'
import { toast } from '../../context/ToastContext'
import { ClientPurchaseSlideOver } from './clients/ClientPurchaseSlideOver'
import { ClientSpinsSlideOver } from './clients/ClientSpinsSlideOver'
import { ClientDetailSlideOver } from './clients/ClientDetailSlideOver'

interface AdminClientsTableProps {
  clients: UserProfile[]
  adminUser?: UserProfile
  allCoupons?: Coupon[]
  onRefresh: () => void
  onOpenScanner?: () => void
}

type ClientSortField = 'id' | 'full_name' | 'phone' | 'spins_available' | 'total_cupcakes_purchased'

export const AdminClientsTable: React.FC<AdminClientsTableProps> = ({
  clients,
  adminUser,
  allCoupons = [],
  onRefresh,
  onOpenScanner,
}) => {
  // Estado local para actualizaciones optimistas instantáneas (0ms)
  const [localClients, setLocalClients] = useState<UserProfile[]>(clients)
  React.useEffect(() => {
    setLocalClients(clients)
  }, [clients])

  const [searchTerm, setSearchTerm] = useState('')
  const [rowsPerPage, setRowsPerPage] = useState<number>(10)
  const [currentPage, setCurrentPage] = useState<number>(1)

  // Estado de ordenamiento
  const [sortField, setSortField] = useState<ClientSortField>('full_name')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  const handleSort = (field: ClientSortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const getSortIcon = (field: ClientSortField) => {
    if (sortField !== field) return <ArrowUpDown size={13} className="text-gray-400" />
    return sortDirection === 'asc' ? <ArrowUp size={13} className="text-[#0A2540]" /> : <ArrowDown size={13} className="text-[#0A2540]" />
  }

  // Productos disponibles para venta
  const [availableProducts, setAvailableProducts] = useState<ProductoConCosto[]>([])
  const [selectedProductId, setSelectedProductId] = useState<string>('')

  // Slide-Over: Registrar Compra a Cliente
  const [isPurchaseSlideOverOpen, setIsPurchaseSlideOverOpen] = useState(false)
  const [purchaseMode, setPurchaseMode] = useState<'registered' | 'unregistered'>('registered')
  const [selectedClientForPurchase, setSelectedClientForPurchase] = useState<UserProfile | null>(null)
  const [selectedCouponId, setSelectedCouponId] = useState<string>('')
  const [unregisteredName, setUnregisteredName] = useState('')
  const [cupcakesQty, setCupcakesQty] = useState<number>(2)
  const [registering, setRegistering] = useState(false)
  const [purchaseMsg, setPurchaseMsg] = useState<string | null>(null)

  // Slide-Over: Añadir Tiradas Manuales a Cliente
  const [isSpinsSlideOverOpen, setIsSpinsSlideOverOpen] = useState(false)
  const [selectedClientForSpins, setSelectedClientForSpins] = useState<UserProfile | null>(null)
  const [spinsAmountToAdd, setSpinsAmountToAdd] = useState<number>(1)
  const [grantingSpins, setGrantingSpins] = useState(false)

  // Cargar catálogo de productos al montar
  React.useEffect(() => {
    getProductsApi()
      .then(res => {
        if (res.success && res.products.length > 0) {
          setAvailableProducts(res.products)
          setSelectedProductId(res.products[0].id)
        }
      })
      .catch(console.error)
  }, [])

  // Slide-Over: Detalle de Cliente
  const [isDetailSlideOverOpen, setIsDetailSlideOverOpen] = useState(false)
  const [selectedClientDetail, setSelectedClientDetail] = useState<UserProfile | null>(null)

  // Función para otorgar tiradas manuales
  const handleGrantSpinsSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!selectedClientForSpins || spinsAmountToAdd === 0) return

    setGrantingSpins(true)
    const targetClient = selectedClientForSpins
    const amount = spinsAmountToAdd

    // Actualización optimista instantánea en UI
    setLocalClients(prev =>
      prev.map(c =>
        c.id === targetClient.id
          ? { ...c, spins_available: Math.max(0, (c.spins_available || 0) + amount) }
          : c
      )
    )

    if (selectedClientDetail && selectedClientDetail.id === targetClient.id) {
      setSelectedClientDetail(prev =>
        prev ? { ...prev, spins_available: Math.max(0, (prev.spins_available || 0) + amount) } : null
      )
    }

    try {
      const res = await grantSpinsApi(targetClient.id, amount)
      toast.success(
        '¡Tiros Actualizados!',
        res.message || `Se acreditaron ${amount > 0 ? `+${amount}` : amount} tiros a ${targetClient.full_name}.`
      )
      setIsSpinsSlideOverOpen(false)
      onRefresh()
    } catch (err: any) {
      toast.error('Error al actualizar tiros', err.message || 'No se pudieron asignar los tiros.')
      onRefresh()
    } finally {
      setGrantingSpins(false)
    }
  }

  // Otorgar giros rápidos (+1, +2, +5) con un solo tap
  const handleQuickAddSpins = async (client: UserProfile, amount: number) => {
    // Actualización optimista instantánea
    setLocalClients(prev =>
      prev.map(c =>
        c.id === client.id
          ? { ...c, spins_available: Math.max(0, (c.spins_available || 0) + amount) }
          : c
      )
    )

    if (selectedClientDetail && selectedClientDetail.id === client.id) {
      setSelectedClientDetail(prev =>
        prev ? { ...prev, spins_available: Math.max(0, (prev.spins_available || 0) + amount) } : null
      )
    }

    try {
      const res = await grantSpinsApi(client.id, amount)
      toast.success(
        '¡Tiros Asignados!',
        res.message || `+${amount} tiro${amount === 1 ? '' : 's'} asignado${amount === 1 ? '' : 's'} a ${client.full_name}.`
      )
      onRefresh()
    } catch (err: any) {
      toast.error('Error al asignar tiros', err.message || 'No se pudieron actualizar los tiros.')
      onRefresh()
    }
  }

  const handleOpenSpinsSlideOver = (client?: UserProfile) => {
    const target = client || (filteredAndSortedClients.length > 0 ? filteredAndSortedClients[0] : null)
    setSelectedClientForSpins(target)
    setSpinsAmountToAdd(1)
    setIsSpinsSlideOverOpen(true)
  }

  // Filtrado y ordenamiento de clientes
  const filteredAndSortedClients = useMemo(() => {
    const result = localClients
      .filter(c => c.role !== 'admin' && c.id !== 'guest')
      .filter((c) => {
        const matchQuery =
          c.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (c.phone && c.phone.includes(searchTerm)) ||
          c.id.includes(searchTerm)

        return matchQuery
      })

    return result.sort((a, b) => {
      let comparison = 0

      switch (sortField) {
        case 'id':
          comparison = a.id.localeCompare(b.id)
          break
        case 'full_name':
          comparison = a.full_name.localeCompare(b.full_name, 'es', { sensitivity: 'base' })
          break
        case 'phone':
          comparison = (a.phone || '').localeCompare(b.phone || '')
          break
        case 'spins_available':
          comparison = Number(a.spins_available || 0) - Number(b.spins_available || 0)
          break
        case 'total_cupcakes_purchased':
          comparison = Number(a.total_cupcakes_purchased || 0) - Number(b.total_cupcakes_purchased || 0)
          break
      }

      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [localClients, searchTerm, sortField, sortDirection])

  // Paginación
  const totalPages = Math.ceil(filteredAndSortedClients.length / rowsPerPage) || 1
  const paginatedClients = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage
    return filteredAndSortedClients.slice(start, start + rowsPerPage)
  }, [filteredAndSortedClients, currentPage, rowsPerPage])

  // Abrir Slide-Over para compra
  const handleOpenPurchaseSlideOver = (client?: UserProfile, isAnonymous = false) => {
    if (isAnonymous || !client) {
      setPurchaseMode(isAnonymous ? 'unregistered' : 'registered')
      setSelectedClientForPurchase(clients[0] || null)
    } else {
      setPurchaseMode('registered')
      setSelectedClientForPurchase(client)
    }
    setUnregisteredName('Cliente Mostrador')
    setCupcakesQty(2)
    setPurchaseMsg(null)
    setIsPurchaseSlideOverOpen(true)
  }

  // Abrir Slide-Over para detalle
  const handleOpenDetailSlideOver = (client: UserProfile) => {
    setSelectedClientDetail(client)
    setIsDetailSlideOverOpen(true)
  }

  // Registrar compra desde Slide-Over
  const handleRegisterPurchase = async (e: React.FormEvent) => {
    e.preventDefault()
    if (cupcakesQty <= 0) return

    setRegistering(true)
    setPurchaseMsg(null)

    const isAnon = purchaseMode === 'unregistered'
    const targetUserId = isAnon ? null : (selectedClientForPurchase ? selectedClientForPurchase.id : null)
    const targetName = isAnon ? (unregisteredName.trim() || 'Venta Directa') : (selectedClientForPurchase?.full_name || 'Cliente')

    const selProduct = availableProducts.find(p => p.id === selectedProductId)
    const unitPrice = selProduct ? Number(selProduct.precio_venta || 20) : 20
    const regularAmount = cupcakesQty * unitPrice

    try {
      const res = await registerPurchaseApi({
        user_id: targetUserId || undefined,
        client_name: targetName,
        producto_id: selectedProductId || undefined,
        cupcakes_qty: cupcakesQty,
        unit_price: unitPrice,
        total_amount: regularAmount, // El backend ajusta automáticamente según el cupón
        coupon_id: (!isAnon && selectedCouponId) ? selectedCouponId : undefined,
        spins_granted: undefined as any, // El backend aplica la regla exacta de 0 tiros para promos
        admin_id: adminUser?.id || '00000000-0000-0000-0000-000000000001'
      })
      const spinsGranted = res.spins_granted !== undefined ? res.spins_granted : (isAnon ? 0 : Math.floor(cupcakesQty / 2))
      const chargedAmount = res.purchase?.monto_total ?? regularAmount
      const discount = res.discount_amount ?? 0

      // Actualización optimista de clientes
      if (!isAnon && targetUserId) {
        setLocalClients(prev => prev.map(c => {
          if (c.id === targetUserId) {
            return {
              ...c,
              spins_available: (c.spins_available || 0) + spinsGranted,
              total_cupcakes_purchased: (c.total_cupcakes_purchased || 0) + cupcakesQty
            }
          }
          return c
        }))
      }
      
      const finalMsg = isAnon 
        ? `¡Venta directa registrada exitosamente! (${cupcakesQty} cupcakes - $${chargedAmount} MXN).`
        : `¡Compra registrada! Cobrado: $${chargedAmount} MXN${discount > 0 ? ` (Promo: -$${discount})` : ''} · +${spinsGranted} jugada(s) a ${targetName}.`
      
      setPurchaseMsg(finalMsg)
      toast.success(finalMsg)
      onRefresh()
      setTimeout(() => {
        setIsPurchaseSlideOverOpen(false)
        setPurchaseMsg(null)
        setSelectedCouponId('')
      }, 1000)
    } catch (err: any) {
      const errMsg = `Error: ${err.message}`
      setPurchaseMsg(errMsg)
      toast.error(errMsg)
      onRefresh() // revertir
    } finally {
      setRegistering(false)
    }
  }

  // Cupones del cliente seleccionado
  const clientCoupons = useMemo(() => {
    if (!selectedClientDetail) return []
    return allCoupons.filter(c => c.user_id === selectedClientDetail.id)
  }, [selectedClientDetail, allCoupons])

  return (
    <div className="space-y-6">
      {/* 1. ENCABEZADO DE PÁGINA (Estilo SIPAD Portal) */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#0A2540] tracking-tight">
            Directorio de Clientes
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Gestiona los clientes registrados, tiros de ruleta acumulados y registro de compras.
          </p>
        </div>

        {/* Botones de Acción Superiores */}
        <div className="flex items-center gap-3">
          {onOpenScanner && (
            <button
              onClick={onOpenScanner}
              className="px-4 py-2 bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 font-semibold text-xs rounded-md shadow-2xs flex items-center gap-2 transition cursor-pointer"
            >
              <QrCode size={16} className="text-[#F56B2A]" />
              <span>Escanear QR</span>
            </button>
          )}

          <button
            onClick={() => handleOpenSpinsSlideOver()}
            className="px-4 py-2 bg-linear-to-r from-[#F56B2A] to-carrot-600 hover:from-[#EA580C] hover:to-[#C2410C] text-white font-semibold text-xs rounded-md shadow-sm flex items-center gap-1.5 transition cursor-pointer"
          >
            <Sparkles size={15} />
            <span>+ Añadir Giros</span>
          </button>

          <button
            onClick={() => handleOpenPurchaseSlideOver()}
            className="px-4 py-2 bg-[#0A2540] hover:bg-[#081C30] text-white font-semibold text-xs rounded-md shadow-sm flex items-center gap-2 transition cursor-pointer"
          >
            <Plus size={16} />
            <span>Registrar Compra</span>
          </button>
        </div>
      </div>

      {/* 2. BARRA DE BÚSQUEDA (Estilo SIPAD) */}
      <div className="bg-white p-3 rounded-md border border-gray-200 shadow-2xs">
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar cliente por nombre, teléfono o IngeID..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              setCurrentPage(1)
            }}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-md text-xs font-medium focus:outline-none focus:border-[#0A2540] focus:ring-1 focus:ring-[#0A2540] transition"
          />
        </div>
      </div>

      {/* 3. TABLA PRINCIPAL DE CLIENTES */}
      <div className="bg-white rounded-md border border-gray-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-gray-200 text-gray-700 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4 w-10 text-center">
                  <input type="checkbox" className="rounded-sm border-gray-300 text-[#0A2540]" />
                </th>
                <th 
                  onClick={() => handleSort('id')}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition select-none"
                >
                  <div className="flex items-center gap-1">
                    <span>Clave (IngeID)</span>
                    <span className="text-gray-400">{getSortIcon('id')}</span>
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('full_name')}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition select-none"
                >
                  <div className="flex items-center gap-1">
                    <span>Nombre</span>
                    <span className="text-gray-400">{getSortIcon('full_name')}</span>
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('phone')}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition select-none"
                >
                  <div className="flex items-center gap-1">
                    <span>Teléfono</span>
                    <span className="text-gray-400">{getSortIcon('phone')}</span>
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('spins_available')}
                  className="py-3 px-4 text-center cursor-pointer hover:bg-slate-100 transition select-none"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Tiros Ruleta</span>
                    <span className="text-gray-400">{getSortIcon('spins_available')}</span>
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('total_cupcakes_purchased')}
                  className="py-3 px-4 text-center cursor-pointer hover:bg-slate-100 transition select-none"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Cupcakes Totales</span>
                    <span className="text-gray-400">{getSortIcon('total_cupcakes_purchased')}</span>
                  </div>
                </th>
                <th className="py-3 px-4 text-center">
                  <span>Estado</span>
                </th>
                <th className="py-3 px-4 text-right">
                  <span>Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedClients.length > 0 ? (
                paginatedClients.map((client) => {
                  const ingeId = client.phone
                    ? `INGE-${client.phone.slice(-4)}`
                    : `DYLH${client.id.slice(-2).toUpperCase()}`

                  const waUrl = client.phone
                    ? `https://wa.me/52${client.phone.replace(/\D/g, '')}?text=¡Hola%20${encodeURIComponent(client.full_name)}!%20En%20Cupcakes%20El%20Inge%20tenemos%20nuevos%20sabores%20artesanales%20disponibles%20hoy%20🥕🧁`
                    : '#'

                  return (
                    <tr key={client.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4 text-center">
                        <input type="checkbox" className="rounded-sm border-gray-300 text-[#0A2540]" />
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-[#0A2540]">
                        {ingeId}
                      </td>

                      <td className="py-3.5 px-4 font-semibold text-gray-900">
                        {client.full_name}
                      </td>

                      <td className="py-3.5 px-4 font-mono">
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-emerald-700 hover:text-emerald-900 hover:underline"
                        >
                          <MessageCircle size={13} className="text-emerald-600" />
                          <span>{client.phone}</span>
                        </a>
                      </td>

                      {/* Tiros Ruleta con botón de ajuste rápido */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenSpinsSlideOver(client)}
                            className="inline-flex items-center gap-1 font-bold text-carrot-600 px-2 py-0.5 rounded-full hover:bg-orange-50 transition cursor-pointer"
                            title="Modificar tiros de este cliente"
                          >
                            <Sparkles size={12} />
                            <span>{client.spins_available}</span>
                          </button>
                          <button
                            onClick={() => handleQuickAddSpins(client, 1)}
                            className="w-5 h-5 rounded-full bg-orange-100 hover:bg-orange-200 text-carrot-600 flex items-center justify-center text-[11px] font-black transition cursor-pointer shadow-2xs"
                            title="Añadir +1 giro rápido"
                          >
                            +
                          </button>
                        </div>
                      </td>

                      {/* Cupcakes Totales */}
                      <td className="py-3.5 px-4 text-center font-semibold text-gray-700">
                        {client.total_cupcakes_purchased} pzas
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-[#DCFCE7] text-[#15803D] border border-green-200 inline-block">
                          Activo
                        </span>
                      </td>

                      {/* Acciones */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => handleOpenSpinsSlideOver(client)}
                            className="p-1.5 rounded-md text-amber-600 hover:bg-amber-50 transition cursor-pointer"
                            title="Añadir Tiradas Manuales"
                          >
                            <Sparkles size={15} />
                          </button>
                          <button
                            onClick={() => handleOpenPurchaseSlideOver(client)}
                            className="p-1.5 rounded-md text-orange-600 hover:bg-orange-50 transition cursor-pointer"
                            title="Registrar Compra a Cliente"
                          >
                            <ShoppingBag size={15} />
                          </button>
                          <button
                            onClick={() => handleOpenDetailSlideOver(client)}
                            className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100 transition cursor-pointer"
                            title="Ver Detalle"
                          >
                            <Eye size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-gray-400 text-xs">
                    No se encontraron clientes registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        <div className="p-3 border-t border-gray-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-gray-500">Filas por página:</span>
            <select
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(Number(e.target.value))
                setCurrentPage(1)
              }}
              className="px-2 py-1 bg-white border border-gray-300 rounded-md text-xs font-semibold focus:outline-none focus:border-[#0A2540]"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-2.5 py-1 rounded-md bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-40 flex items-center gap-1"
            >
              <ChevronLeft size={13} />
              <span>Anterior</span>
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setCurrentPage(p)}
                className={`w-7 h-7 rounded-md font-bold ${
                  currentPage === p
                    ? 'bg-[#0A2540] text-white'
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {p}
              </button>
            ))}

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-2.5 py-1 rounded-md bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-40 flex items-center gap-1"
            >
              <span>Próximo</span>
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* SlideOver: Registrar Compra a Cliente */}
      <ClientPurchaseSlideOver
        isOpen={isPurchaseSlideOverOpen}
        onClose={() => setIsPurchaseSlideOverOpen(false)}
        purchaseMode={purchaseMode}
        setPurchaseMode={setPurchaseMode}
        selectedClientForPurchase={selectedClientForPurchase}
        setSelectedClientForPurchase={setSelectedClientForPurchase}
        clients={clients}
        clientCoupons={allCoupons}
        selectedCouponId={selectedCouponId}
        setSelectedCouponId={setSelectedCouponId}
        unregisteredName={unregisteredName}
        setUnregisteredName={setUnregisteredName}
        availableProducts={availableProducts}
        selectedProductId={selectedProductId}
        setSelectedProductId={setSelectedProductId}
        cupcakesQty={cupcakesQty}
        setCupcakesQty={setCupcakesQty}
        registering={registering}
        purchaseMsg={purchaseMsg}
        onSubmit={handleRegisterPurchase}
      />

      {/* SlideOver: Añadir Tiradas Manuales a Cliente */}
      <ClientSpinsSlideOver
        isOpen={isSpinsSlideOverOpen}
        onClose={() => setIsSpinsSlideOverOpen(false)}
        selectedClientForSpins={selectedClientForSpins}
        setSelectedClientForSpins={setSelectedClientForSpins}
        clients={filteredAndSortedClients}
        spinsAmountToAdd={spinsAmountToAdd}
        setSpinsAmountToAdd={setSpinsAmountToAdd}
        grantingSpins={grantingSpins}
        onSubmit={handleGrantSpinsSubmit}
      />

      {/* SlideOver: Detalles del Cliente e Historial */}
      <ClientDetailSlideOver
        isOpen={isDetailSlideOverOpen}
        onClose={() => setIsDetailSlideOverOpen(false)}
        selectedClientDetail={selectedClientDetail}
        clientCoupons={clientCoupons}
        onQuickAddSpins={handleQuickAddSpins}
        onOpenSpinsSlideOver={handleOpenSpinsSlideOver}
      />
    </div>
  )
}
