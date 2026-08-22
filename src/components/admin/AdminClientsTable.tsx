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
  User,
  Phone,
  Ticket,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react'
import { SlideOver } from './SlideOver'
import type { UserProfile, Coupon, ProductoConCosto } from '../../types'
import { registerPurchaseApi, getProductsApi } from '../../lib/api'

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

  // Productos disponibles para venta
  const [availableProducts, setAvailableProducts] = useState<ProductoConCosto[]>([])
  const [selectedProductId, setSelectedProductId] = useState<string>('')

  // Slide-Over: Registrar Compra a Cliente
  const [isPurchaseSlideOverOpen, setIsPurchaseSlideOverOpen] = useState(false)
  const [purchaseMode, setPurchaseMode] = useState<'registered' | 'unregistered'>('registered')
  const [selectedClientForPurchase, setSelectedClientForPurchase] = useState<UserProfile | null>(null)
  const [unregisteredName, setUnregisteredName] = useState('')
  const [cupcakesQty, setCupcakesQty] = useState<number>(2)
  const [registering, setRegistering] = useState(false)
  const [purchaseMsg, setPurchaseMsg] = useState<string | null>(null)

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
    const totalAmount = cupcakesQty * unitPrice

    // Actualización optimista inmediata en 0ms
    if (!isAnon && targetUserId) {
      setLocalClients(prev => prev.map(c => {
        if (c.id === targetUserId) {
          return {
            ...c,
            spins_available: (c.spins_available || 0) + Math.floor(cupcakesQty / 2),
            total_cupcakes_purchased: (c.total_cupcakes_purchased || 0) + cupcakesQty
          }
        }
        return c
      }))
    }

    try {
      const res = await registerPurchaseApi({
        user_id: targetUserId || undefined,
        client_name: targetName,
        producto_id: selectedProductId || undefined,
        cupcakes_qty: cupcakesQty,
        unit_price: unitPrice,
        total_amount: totalAmount,
        spins_granted: isAnon ? 0 : Math.floor(cupcakesQty / 2),
        admin_id: adminUser?.id || '00000000-0000-0000-0000-000000000001'
      })
      const spinsGranted = res.spins_granted !== undefined ? res.spins_granted : (isAnon ? 0 : Math.floor(cupcakesQty / 2))
      
      setPurchaseMsg(
        isAnon 
          ? `¡Venta directa registrada exitosamente! (${cupcakesQty} cupcakes - $${totalAmount} MXN).`
          : `¡Compra registrada! Se acreditaron +${spinsGranted} jugada(s) a ${targetName}.`
      )
      onRefresh()
      setTimeout(() => {
        setIsPurchaseSlideOverOpen(false)
        setPurchaseMsg(null)
      }, 1000)
    } catch (err: any) {
      setPurchaseMsg(`Error: ${err.message}`)
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
              className="px-4 py-2 bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 font-semibold text-xs rounded-md shadow-2xs flex items-center gap-2 transition"
            >
              <QrCode size={16} className="text-[#F56B2A]" />
              <span>Escanear QR</span>
            </button>
          )}

          <button
            onClick={() => handleOpenPurchaseSlideOver()}
            className="px-4 py-2 bg-[#0A2540] hover:bg-[#081C30] text-white font-semibold text-xs rounded-md shadow-sm flex items-center gap-2 transition"
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

      {/* 3. TABLA DE CLIENTES (Estilo SIPAD Exacto) */}
      <div className="bg-white rounded-md border border-gray-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            {/* Encabezado SIPAD */}
            <thead className="bg-[#F8FAFC] text-gray-600 text-[11px] uppercase tracking-wider border-b border-gray-200 font-bold select-none">
              <tr>
                <th className="py-3.5 px-4 w-10 text-center">
                  <input type="checkbox" className="rounded-sm border-gray-300 text-[#0A2540]" />
                </th>
                
                <th 
                  onClick={() => handleSort('id')} 
                  className="py-3.5 px-4 cursor-pointer hover:bg-slate-200/60 transition group"
                >
                  <div className="flex items-center gap-1.5">
                    <span>CLAVE</span>
                    {sortField === 'id' ? (
                      sortDirection === 'asc' ? <ArrowUp size={13} className="text-[#0A2540]" /> : <ArrowDown size={13} className="text-[#0A2540]" />
                    ) : (
                      <ArrowUpDown size={13} className="text-gray-400 group-hover:text-gray-600" />
                    )}
                  </div>
                </th>

                <th 
                  onClick={() => handleSort('full_name')} 
                  className="py-3.5 px-4 cursor-pointer hover:bg-slate-200/60 transition group"
                >
                  <div className="flex items-center gap-1.5">
                    <span>NOMBRE DEL CLIENTE</span>
                    {sortField === 'full_name' ? (
                      sortDirection === 'asc' ? <ArrowUp size={13} className="text-[#0A2540]" /> : <ArrowDown size={13} className="text-[#0A2540]" />
                    ) : (
                      <ArrowUpDown size={13} className="text-gray-400 group-hover:text-gray-600" />
                    )}
                  </div>
                </th>

                <th 
                  onClick={() => handleSort('phone')} 
                  className="py-3.5 px-4 cursor-pointer hover:bg-slate-200/60 transition group"
                >
                  <div className="flex items-center gap-1.5">
                    <span>TELÉFONO (WHATSAPP)</span>
                    {sortField === 'phone' ? (
                      sortDirection === 'asc' ? <ArrowUp size={13} className="text-[#0A2540]" /> : <ArrowDown size={13} className="text-[#0A2540]" />
                    ) : (
                      <ArrowUpDown size={13} className="text-gray-400 group-hover:text-gray-600" />
                    )}
                  </div>
                </th>

                <th 
                  onClick={() => handleSort('spins_available')} 
                  className="py-3.5 px-4 text-center cursor-pointer hover:bg-slate-200/60 transition group"
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span>TIROS RULETA</span>
                    {sortField === 'spins_available' ? (
                      sortDirection === 'asc' ? <ArrowUp size={13} className="text-[#0A2540]" /> : <ArrowDown size={13} className="text-[#0A2540]" />
                    ) : (
                      <ArrowUpDown size={13} className="text-gray-400 group-hover:text-gray-600" />
                    )}
                  </div>
                </th>

                <th 
                  onClick={() => handleSort('total_cupcakes_purchased')} 
                  className="py-3.5 px-4 text-center cursor-pointer hover:bg-slate-200/60 transition group"
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span>CUPCAKES</span>
                    {sortField === 'total_cupcakes_purchased' ? (
                      sortDirection === 'asc' ? <ArrowUp size={13} className="text-[#0A2540]" /> : <ArrowDown size={13} className="text-[#0A2540]" />
                    ) : (
                      <ArrowUpDown size={13} className="text-gray-400 group-hover:text-gray-600" />
                    )}
                  </div>
                </th>

                <th className="py-3.5 px-4 text-center">ESTADO</th>
                <th className="py-3.5 px-4 text-right">ACCIONES</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100 font-medium text-gray-800">
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

                      {/* Clave / IngeID */}
                      <td className="py-3.5 px-4 font-mono font-bold text-[#0A2540]">
                        {ingeId}
                      </td>

                      {/* Nombre */}
                      <td className="py-3.5 px-4 font-semibold text-gray-900">
                        {client.full_name}
                      </td>

                      {/* Teléfono WhatsApp */}
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

                      {/* Tiros Ruleta */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center gap-1 font-bold text-[#E65100]">
                          <Sparkles size={12} />
                          {client.spins_available}
                        </span>
                      </td>

                      {/* Cupcakes Totales */}
                      <td className="py-3.5 px-4 text-center font-semibold text-gray-700">
                        {client.total_cupcakes_purchased} pcs
                      </td>

                      {/* Estado SIPAD (Pill Verde Activo) */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-[#DCFCE7] text-[#15803D] border border-green-200 inline-block">
                          Activo
                        </span>
                      </td>

                      {/* Acciones */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => handleOpenPurchaseSlideOver(client)}
                            className="p-1 rounded-md text-orange-600 hover:bg-orange-50 transition"
                            title="Registrar Compra a Cliente"
                          >
                            <ShoppingBag size={15} />
                          </button>
                          <button
                            onClick={() => handleOpenDetailSlideOver(client)}
                            className="p-1 rounded-md text-slate-500 hover:bg-slate-100 transition"
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

        {/* 4. FOOTER PAGINACIÓN (Estilo SIPAD) */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-3.5 bg-[#F8FAFC] border-t border-gray-200 text-xs text-gray-600">
          <div className="flex items-center gap-2">
            <span>Líneas por página:</span>
            <select
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(Number(e.target.value))
                setCurrentPage(1)
              }}
              className="px-2 py-1 bg-white border border-gray-300 rounded-md text-xs font-semibold"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
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

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
              <button
                key={num}
                onClick={() => setCurrentPage(num)}
                className={`w-6 h-6 rounded-md font-bold text-xs ${
                  currentPage === num
                    ? 'bg-[#0A2540] text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {num}
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

          <div className="text-gray-400">
            Exhibiendo {filteredAndSortedClients.length > 0 ? (currentPage - 1) * rowsPerPage + 1 : 0}-
            {Math.min(currentPage * rowsPerPage, filteredAndSortedClients.length)} de {filteredAndSortedClients.length} registros
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* SLIDE-OVER: REGISTRAR COMPRA A CLIENTE (Estilo SIPAD Imagen 2)       */}
      {/* ===================================================================== */}
      <SlideOver
        isOpen={isPurchaseSlideOverOpen}
        onClose={() => setIsPurchaseSlideOverOpen(false)}
        title="Registrar Compra a Cliente"
        icon={<ShoppingBag size={20} />}
        footer={
          <>
            <button
              type="button"
              onClick={() => setIsPurchaseSlideOverOpen(false)}
              className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 font-semibold text-xs hover:bg-gray-50 transition"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleRegisterPurchase}
              disabled={registering || !selectedClientForPurchase}
              className="px-5 py-2 rounded-md bg-[#0A2540] hover:bg-[#081C30] text-white font-bold text-xs transition shadow-sm"
            >
              {registering ? 'Registrando...' : 'Confirmar Compra'}
            </button>
          </>
        }
      >
        <form onSubmit={handleRegisterPurchase} className="space-y-4">
          {/* Tipo de Venta */}
          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1">
              Tipo de Venta
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPurchaseMode('registered')}
                className={`py-2 rounded-md border text-xs font-bold transition ${
                  purchaseMode === 'registered'
                    ? 'bg-[#0A2540] text-white border-[#0A2540]'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                👤 Venta a Cliente
              </button>
              <button
                type="button"
                onClick={() => setPurchaseMode('unregistered')}
                className={`py-2 rounded-md border text-xs font-bold transition ${
                  purchaseMode === 'unregistered'
                    ? 'bg-[#0A2540] text-white border-[#0A2540]'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                🧁 Venta Directa
              </button>
            </div>
          </div>

          {/* Cliente Registrado */}
          {purchaseMode === 'registered' ? (
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">
                Seleccionar Cliente
              </label>
              <select
                value={selectedClientForPurchase?.id || ''}
                onChange={(e) => {
                  const found = clients.find(c => c.id === e.target.value)
                  if (found) setSelectedClientForPurchase(found)
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
                Referencia / Lugar de Venta (Opcional)
              </label>
              <input
                type="text"
                value={unregisteredName}
                onChange={(e) => setUnregisteredName(e.target.value)}
                placeholder="Ej. Venta en Fac. de Ingeniería, Encargo, etc."
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-xs font-medium focus:outline-none focus:border-[#0A2540]"
              />
            </div>
          )}

          {/* Selector de Producto */}
          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1">
              Producto a Vender
            </label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-xs font-semibold focus:outline-none focus:border-[#0A2540]"
            >
              {availableProducts.length > 0 ? (
                availableProducts.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} — ${p.precio_venta}.00 MXN / pc
                  </option>
                ))
              ) : (
                <option value="">Cupcake de Zanahoria Artesanal ($20.00 MXN)</option>
              )}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1">
              Cantidad de Piezas
            </label>
            <input
              type="number"
              min={1}
              max={24}
              value={cupcakesQty}
              onChange={(e) => setCupcakesQty(Number(e.target.value))}
              placeholder="Ej. 2"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-xs font-bold focus:outline-none focus:border-[#0A2540]"
            />
          </div>

          <div className="grid grid-cols-4 gap-2">
            {[1, 2, 4, 6].map(qty => (
              <button
                key={qty}
                type="button"
                onClick={() => setCupcakesQty(qty)}
                className={`py-1.5 rounded-md border text-xs font-bold transition ${
                  cupcakesQty === qty
                    ? 'bg-[#0A2540] text-white border-[#0A2540]'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {qty} pcs
              </button>
            ))}
          </div>

          {(() => {
            const selProd = availableProducts.find(p => p.id === selectedProductId)
            const unitP = selProd ? Number(selProd.precio_venta || 20) : 20
            const total = cupcakesQty * unitP
            const spins = Math.floor(cupcakesQty / 2)

            return (
              <div className="p-3 bg-slate-50 border border-gray-200 rounded-md space-y-1 text-xs">
                <div className="flex justify-between text-gray-600">
                  <span>Precio unitario (${unitP}.00 MXN / pc):</span>
                  <strong className="text-gray-900 font-mono">${total}.00 MXN</strong>
                </div>
                <div className="flex justify-between text-[#E65100] font-bold">
                  <span>Tiros a otorgar (1 x cada 2):</span>
                  <span>+{spins} jugada(s)</span>
                </div>
              </div>
            )
          })()}

          {purchaseMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-md text-xs font-bold">
              {purchaseMsg}
            </div>
          )}
        </form>
      </SlideOver>

      {/* ===================================================================== */}
      {/* SLIDE-OVER: DETALLES DE CLIENTE E HISTORIAL (Estilo SIPAD)            */}
      {/* ===================================================================== */}
      <SlideOver
        isOpen={isDetailSlideOverOpen}
        onClose={() => setIsDetailSlideOverOpen(false)}
        title="Detalles del Cliente"
        icon={<User size={20} />}
      >
        {selectedClientDetail && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-gray-200">
              <div className="w-10 h-10 rounded-full bg-[#16A34A] text-white flex items-center justify-center font-bold text-sm">
                {selectedClientDetail.full_name.charAt(0)}
              </div>
              <div>
                <h4 className="font-bold text-sm text-gray-900">{selectedClientDetail.full_name}</h4>
                <p className="text-xs text-gray-500 font-mono flex items-center gap-1">
                  <Phone size={12} /> {selectedClientDetail.phone}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-gray-50 rounded-md border border-gray-200">
                <span className="text-gray-500 block text-[10px] uppercase">Tiros Disponibles</span>
                <strong className="text-base text-[#F56B2A] font-black">
                  {selectedClientDetail.spins_available}
                </strong>
              </div>
              <div className="p-3 bg-gray-50 rounded-md border border-gray-200">
                <span className="text-gray-500 block text-[10px] uppercase">Cupcakes Totales</span>
                <strong className="text-base text-gray-900 font-black">
                  {selectedClientDetail.total_cupcakes_purchased} pcs
                </strong>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <h5 className="font-bold text-xs text-gray-900 flex items-center gap-1.5">
                <Ticket size={14} className="text-[#F56B2A]" />
                <span>Cupones del Cliente ({clientCoupons.length})</span>
              </h5>
              {clientCoupons.length > 0 ? (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {clientCoupons.map(c => (
                    <div key={c.id} className="p-2.5 rounded-md border border-gray-200 bg-gray-50 text-xs flex justify-between items-center">
                      <div>
                        <p className="font-bold text-gray-800">{c.prize?.title || 'Cupón'}</p>
                        <p className="font-mono text-[10px] text-gray-500">{c.code}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        c.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-600'
                      }`}>
                        {c.status === 'active' ? 'Activo' : 'Canjeado'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400 italic">Sin cupones activos.</p>
              )}
            </div>
          </div>
        )}
      </SlideOver>
    </div>
  )
}
