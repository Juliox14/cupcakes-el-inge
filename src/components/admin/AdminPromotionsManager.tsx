import React, { useState, useMemo, useEffect } from 'react'
import { 
  Plus, 
  Edit3, 
  Trash2, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  Settings,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Cake
} from 'lucide-react'
import type { Prize, ProductoConCosto } from '../../types'
import { 
  createPrizeApi, 
  updatePrizeApi, 
  deletePrizeApi,
  getCategoryWeightsApi,
  updateCategoryWeightsApi,
  getProductsApi
} from '../../lib/api'
import { toast } from '../../context/ToastContext'
import { PromotionsStatsCards } from './promotions/PromotionsStatsCards'
import { CategoryWeightsModal } from './promotions/CategoryWeightsModal'
import { PromotionFormSlideOver } from './promotions/PromotionFormSlideOver'

interface AdminPromotionsManagerProps {
  prizes: Prize[]
  onRefresh: () => void
}

type PrizeSortField = 'title' | 'tier' | 'weight' | 'probability' | 'is_active' | 'product'

export const AdminPromotionsManager: React.FC<AdminPromotionsManagerProps> = ({
  prizes,
  onRefresh,
}) => {
  // Estado local para actualizaciones optimistas instantáneas (0ms)
  const [localPrizes, setLocalPrizes] = useState<Prize[]>(prizes)
  useEffect(() => {
    setLocalPrizes(prizes)
  }, [prizes])

  const [searchTerm, setSearchTerm] = useState('')
  const [rowsPerPage, setRowsPerPage] = useState<number>(10)
  const [currentPage, setCurrentPage] = useState<number>(1)

  // Productos disponibles del catálogo
  const [availableProducts, setAvailableProducts] = useState<ProductoConCosto[]>([])
  const [productId, setProductId] = useState<string>('')

  // Estado de ordenamiento
  const [sortField, setSortField] = useState<PrizeSortField>('tier')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  const handleSort = (field: PrizeSortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  // 1. Modal: Configuración de Probabilidades por Categoría (Engrane)
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [categoryWeights, setCategoryWeights] = useState({
    sin_premio: 50,
    promocion: 40,
    alto_valor: 10
  })
  const [savingCategoryWeights, setSavingCategoryWeights] = useState(false)
  const [categoryModalError, setCategoryModalError] = useState<string | null>(null)
  const [categorySuccessMsg, setCategorySuccessMsg] = useState<string | null>(null)

  // 2. Slide-Over: Crear o Editar Promoción
  const [isSlideOverOpen, setIsSlideOverOpen] = useState(false)
  const [editingPrize, setEditingPrize] = useState<Prize | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [tier, setTier] = useState<Prize['tier']>('tier_40_promo')
  const [tipoBeneficio, setTipoBeneficio] = useState<Prize['tipo_beneficio']>('descuento_fijo')
  const [precioPromocional, setPrecioPromocional] = useState<number | ''>('')
  const [descuentoMonto, setDescuentoMonto] = useState<number | ''>('')
  const [piezasAmparadas, setPiezasAmparadas] = useState<number | ''>(1)
  const [isActive, setIsActive] = useState<boolean>(true)
  const [badgeColor, setBadgeColor] = useState('#F56B2A')
  
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Cargar pesos de categoría y productos al montar
  const loadInitialData = async () => {
    try {
      const [weightsRes, prodRes] = await Promise.allSettled([
        getCategoryWeightsApi(),
        getProductsApi()
      ])

      if (weightsRes.status === 'fulfilled' && weightsRes.value.success && weightsRes.value.weights) {
        setCategoryWeights({
          sin_premio: Number(weightsRes.value.weights.sin_premio ?? 50),
          promocion: Number(weightsRes.value.weights.promocion ?? 40),
          alto_valor: Number(weightsRes.value.weights.alto_valor ?? 10)
        })
      }

      if (prodRes.status === 'fulfilled' && prodRes.value.success) {
        setAvailableProducts(prodRes.value.products)
      }
    } catch (err) {
      console.error('Error cargando datos de promociones:', err)
    }
  }

  useEffect(() => {
    loadInitialData()
  }, [])

  // Conteo de premios activos por categoría
  const activePrizesCount = useMemo(() => {
    const counts = {
      tier_50_no_prize: 0,
      tier_40_promo: 0,
      tier_10_high_value: 0
    }
    localPrizes.filter(p => p.is_active).forEach(p => {
      if (p.tier in counts) counts[p.tier]++
    })
    return counts
  }, [localPrizes])

  // Obtener el peso total asignado a la categoría del premio
  const getCategoryTotalWeight = (pTier: Prize['tier']) => {
    if (pTier === 'tier_10_high_value') return Number(categoryWeights.alto_valor || 10)
    if (pTier === 'tier_40_promo') return Number(categoryWeights.promocion || 40)
    return Number(categoryWeights.sin_premio || 50)
  }

  // Obtener el peso equitativo exacto de un premio activo
  const getFairShareWeight = (prize: Prize) => {
    if (!prize.is_active) return 0
    const count = activePrizesCount[prize.tier] || 1
    const catTotal = getCategoryTotalWeight(prize.tier)
    return Math.round((catTotal / count) * 100) / 100
  }

  // Suma total de los pesos de categorías activas (usualmente 100)
  const totalWeight = useMemo(() => {
    let sum = 0
    if (activePrizesCount.tier_50_no_prize > 0) sum += Number(categoryWeights.sin_premio || 50)
    if (activePrizesCount.tier_40_promo > 0) sum += Number(categoryWeights.promocion || 40)
    if (activePrizesCount.tier_10_high_value > 0) sum += Number(categoryWeights.alto_valor || 10)
    return sum || 100
  }, [activePrizesCount, categoryWeights])

  // Filtrado y ordenamiento de premios
  const filteredAndSortedPrizes = useMemo(() => {
    const result = localPrizes.filter(p => 
      p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.producto_nombre && p.producto_nombre.toLowerCase().includes(searchTerm.toLowerCase()))
    )

    return result.sort((a, b) => {
      let comparison = 0

      switch (sortField) {
        case 'title':
          comparison = a.title.localeCompare(b.title, 'es', { sensitivity: 'base' })
          break
        case 'tier':
          const tierRank = { tier_10_high_value: 1, tier_40_promo: 2, tier_50_no_prize: 3 }
          comparison = (tierRank[a.tier] || 2) - (tierRank[b.tier] || 2)
          break
        case 'weight':
          comparison = Number(getFairShareWeight(a)) - Number(getFairShareWeight(b))
          break
        case 'probability':
          const probA = totalWeight > 0 ? (getFairShareWeight(a) / totalWeight) * 100 : 0
          const probB = totalWeight > 0 ? (getFairShareWeight(b) / totalWeight) * 100 : 0
          comparison = probA - probB
          break
        case 'is_active':
          comparison = (a.is_active === b.is_active ? 0 : a.is_active ? -1 : 1)
          break
        case 'product':
          const prodA = a.producto_nombre || ''
          const prodB = b.producto_nombre || ''
          comparison = prodA.localeCompare(prodB, 'es', { sensitivity: 'base' })
          break
      }

      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [localPrizes, searchTerm, sortField, sortDirection, totalWeight, categoryWeights, activePrizesCount])

  // Paginación
  const totalPages = Math.ceil(filteredAndSortedPrizes.length / rowsPerPage) || 1
  const paginatedPrizes = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage
    return filteredAndSortedPrizes.slice(start, start + rowsPerPage)
  }, [filteredAndSortedPrizes, currentPage, rowsPerPage])

  // Abrir Slide-Over para Nueva Promoción
  const handleOpenCreate = () => {
    setEditingPrize(null)
    setTitle('')
    setDescription('')
    setTier('tier_40_promo')
    setTipoBeneficio('descuento_fijo')
    setPrecioPromocional('')
    setDescuentoMonto('')
    setPiezasAmparadas(1)
    setProductId('')
    setIsActive(true)
    setBadgeColor('#F56B2A')
    setErrorMsg(null)
    setIsSlideOverOpen(true)
  }

  // Abrir Slide-Over para Editar Promoción
  const handleOpenEdit = (prize: Prize) => {
    setEditingPrize(prize)
    setTitle(prize.title)
    setDescription(prize.description)
    setTier(prize.tier)
    setTipoBeneficio(prize.tipo_beneficio || (prize.tier === 'tier_50_no_prize' ? 'sin_premio' : 'descuento_fijo'))
    setPrecioPromocional(prize.precio_promocional !== undefined && prize.precio_promocional !== null ? prize.precio_promocional : '')
    setDescuentoMonto(prize.descuento_monto !== undefined && prize.descuento_monto !== null ? prize.descuento_monto : '')
    setPiezasAmparadas(prize.piezas_amparadas !== undefined && prize.piezas_amparadas !== null ? prize.piezas_amparadas : 1)
    setProductId(prize.producto_id || '')
    setIsActive(prize.is_active)
    setBadgeColor(prize.badge_color || '#F56B2A')
    setErrorMsg(null)
    setIsSlideOverOpen(true)
  }

  // Guardar (Crear o Editar con actualización optimista en 0ms)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    setLoading(true)
    setErrorMsg(null)

    const finalProductId = (tier === 'tier_50_no_prize' || !productId) ? null : productId
    const linkedProd = availableProducts.find(p => p.id === finalProductId)

    const finalPrecioPromo = precioPromocional === '' ? null : Number(precioPromocional)
    const finalDescuento = descuentoMonto === '' ? 0 : Number(descuentoMonto)
    const finalPiezas = piezasAmparadas === '' ? 1 : Number(piezasAmparadas)

    // Actualización optimista inmediata
    if (editingPrize) {
      setLocalPrizes(prev => prev.map(p => p.id === editingPrize.id ? {
        ...p,
        title,
        description: description || title,
        tier,
        tipo_beneficio: tipoBeneficio,
        precio_promocional: finalPrecioPromo,
        descuento_monto: finalDescuento,
        piezas_amparadas: finalPiezas,
        producto_id: finalProductId,
        producto_nombre: linkedProd ? linkedProd.nombre : null,
        badge_color: badgeColor,
        is_active: isActive
      } : p))
    } else {
      const tempId = `temp-${Date.now()}`
      const newTempPrize: Prize = {
        id: tempId,
        title,
        description: description || title,
        tier,
        tipo_beneficio: tipoBeneficio,
        precio_promocional: finalPrecioPromo,
        descuento_monto: finalDescuento,
        piezas_amparadas: finalPiezas,
        producto_id: finalProductId,
        producto_nombre: linkedProd ? linkedProd.nombre : null,
        badge_color: badgeColor,
        is_active: true,
        weight: 10
      }
      setLocalPrizes(prev => [newTempPrize, ...prev])
    }

    setIsSlideOverOpen(false)

    try {
      if (editingPrize) {
        await updatePrizeApi(editingPrize.id, {
          title,
          description: description || title,
          tier,
          tipo_beneficio: tipoBeneficio,
          precio_promocional: finalPrecioPromo,
          descuento_monto: finalDescuento,
          piezas_amparadas: finalPiezas,
          producto_id: finalProductId,
          badge_color: badgeColor,
          is_active: isActive,
        })
        toast.success(`Promoción "${title}" actualizada con éxito.`)
      } else {
        await createPrizeApi({
          title,
          description: description || title,
          tier,
          tipo_beneficio: tipoBeneficio,
          precio_promocional: finalPrecioPromo,
          descuento_monto: finalDescuento,
          piezas_amparadas: finalPiezas,
          producto_id: finalProductId,
          badge_color: badgeColor,
        })
        toast.success(`Promoción "${title}" creada con éxito.`)
      }

      onRefresh()
    } catch (err: any) {
      const msg = err.message || 'Error al guardar la promoción.'
      setErrorMsg(msg)
      toast.error(msg)
      onRefresh() // revertir
    } finally {
      setLoading(false)
    }
  }

  // Guardar Probabilidades por Categoría desde el Modal del Engrane
  const handleSaveCategoryWeights = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingCategoryWeights(true)
    setCategoryModalError(null)

    try {
      const res = await updateCategoryWeightsApi({
        sin_premio: Number(categoryWeights.sin_premio),
        promocion: Number(categoryWeights.promocion),
        alto_valor: Number(categoryWeights.alto_valor)
      })

      const msg = res.message || 'Probabilidades actualizadas y repartidas equitativamente.'
      setCategorySuccessMsg(msg)
      toast.success(msg)
      onRefresh()
      setTimeout(() => {
        setIsCategoryModalOpen(false)
        setCategorySuccessMsg(null)
      }, 800)
    } catch (err: any) {
      const msg = err.message || 'Error al actualizar las probabilidades.'
      setCategoryModalError(msg)
      toast.error(msg)
    } finally {
      setSavingCategoryWeights(false)
    }
  }

  // Alternar Estado Activo (Optimista en 0ms)
  const handleToggleActive = async (prize: Prize) => {
    // 1. Actualización optimista inmediata
    setLocalPrizes(prev => prev.map(p => p.id === prize.id ? { ...p, is_active: !p.is_active } : p))

    // 2. Enviar en segundo plano
    try {
      await updatePrizeApi(prize.id, { is_active: !prize.is_active })
      toast.success(`Promoción ${!prize.is_active ? 'activada' : 'pausada'} correctamente.`)
      onRefresh()
    } catch (err: any) {
      console.error(err)
      toast.error('Error al cambiar estado de la promoción.')
      onRefresh() // revertir
    }
  }

  // Eliminar (Optimista en 0ms)
  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Seguro que deseas desactivar esta promoción? Su peso se repartirá entre las restantes de su categoría.')) return

    // 1. Eliminar inmediatamente de la vista
    setLocalPrizes(prev => prev.filter(p => p.id !== id))

    // 2. Ejecutar en segundo plano
    try {
      await deletePrizeApi(id)
      toast.success('Promoción eliminada y probabilidades redistribuidas.')
      onRefresh()
    } catch (err: any) {
      console.error(err)
      toast.error('Error al eliminar la promoción.')
      onRefresh() // revertir
    }
  }

  // Cálculo del peso predictivo para el Slide-Over
  const getPredictedCategoryWeight = (selectedTier: Prize['tier']) => {
    let totalCat = 40
    let currentCount = 0

    if (selectedTier === 'tier_50_no_prize') {
      totalCat = categoryWeights.sin_premio
      currentCount = activePrizesCount.tier_50_no_prize
    } else if (selectedTier === 'tier_10_high_value') {
      totalCat = categoryWeights.alto_valor
      currentCount = activePrizesCount.tier_10_high_value
    } else {
      totalCat = categoryWeights.promocion
      currentCount = activePrizesCount.tier_40_promo
    }

    const nextCount = editingPrize ? (editingPrize.tier === selectedTier ? currentCount : currentCount + 1) : currentCount + 1
    const individual = nextCount > 0 ? Math.round((totalCat / nextCount) * 100) / 100 : totalCat

    return {
      totalCat,
      nextCount: Math.max(1, nextCount),
      individual
    }
  }

  const predicted = getPredictedCategoryWeight(tier)

  return (
    <div className="space-y-6">
      {/* 1. ENCABEZADO DE PÁGINA (Con Botón de Engrane de Probabilidades) */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#0A2540] tracking-tight">
            Catálogo de Promociones & Ruleta
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Las probabilidades se dividen equitativamente entre las promociones activas de cada categoría.
          </p>
        </div>

        {/* Botones de Acción: Engrane de Configuración + Nueva Promoción */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsCategoryModalOpen(true)}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-[#0A2540] border border-gray-300 font-bold text-xs rounded-md shadow-2xs flex items-center gap-2 transition"
            title="Configurar Probabilidades por Categoría"
          >
            <Settings size={16} className="text-[#0A2540]" />
            <span>Ajustar Probabilidades</span>
          </button>

          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 bg-[#0A2540] hover:bg-[#081C30] text-white font-bold text-xs rounded-md shadow-sm flex items-center gap-2 transition"
          >
            <Plus size={16} />
            <span>Nueva Promoción</span>
          </button>
        </div>
      </div>

      {/* 2. RESUMEN DE PROBABILIDADES POR CATEGORÍA EN TIEMPO REAL */}
      <PromotionsStatsCards
        activePrizesCount={activePrizesCount}
        categoryWeights={categoryWeights}
      />

      {/* 3. BARRA DE BÚSQUEDA */}
      <div className="bg-white p-3 rounded-md border border-gray-200 shadow-2xs">
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar promoción por título o descripción..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              setCurrentPage(1)
            }}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-md text-xs font-medium focus:outline-none focus:border-[#0A2540] focus:ring-1 focus:ring-[#0A2540] transition"
          />
        </div>
      </div>

      {/* 4. TABLA DE PROMOCIONES */}
      <div className="bg-white rounded-md border border-gray-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAFC] text-gray-600 text-[11px] uppercase tracking-wider border-b border-gray-200 font-bold select-none">
              <tr>
                <th className="py-3.5 px-4 w-10 text-center">
                  <input type="checkbox" className="rounded-sm border-gray-300 text-[#0A2540]" />
                </th>
                <th className="py-3.5 px-4">CLAVE</th>
                
                <th 
                  onClick={() => handleSort('title')} 
                  className="py-3.5 px-4 cursor-pointer hover:bg-slate-200/60 transition group"
                >
                  <div className="flex items-center gap-1.5">
                    <span>TÍTULO DE LA PROMOCIÓN</span>
                    {sortField === 'title' ? (
                      sortDirection === 'asc' ? <ArrowUp size={13} className="text-[#0A2540]" /> : <ArrowDown size={13} className="text-[#0A2540]" />
                    ) : (
                      <ArrowUpDown size={13} className="text-gray-400 group-hover:text-gray-600" />
                    )}
                  </div>
                </th>

                <th 
                  onClick={() => handleSort('tier')} 
                  className="py-3.5 px-4 cursor-pointer hover:bg-slate-200/60 transition group"
                >
                  <div className="flex items-center gap-1.5">
                    <span>CATEGORÍA ASIGNADA</span>
                    {sortField === 'tier' ? (
                      sortDirection === 'asc' ? <ArrowUp size={13} className="text-[#0A2540]" /> : <ArrowDown size={13} className="text-[#0A2540]" />
                    ) : (
                      <ArrowUpDown size={13} className="text-gray-400 group-hover:text-gray-600" />
                    )}
                  </div>
                </th>

                <th 
                  onClick={() => handleSort('weight')} 
                  className="py-3.5 px-4 text-center cursor-pointer hover:bg-slate-200/60 transition group"
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span>PESO INDIVIDUAL</span>
                    {sortField === 'weight' ? (
                      sortDirection === 'asc' ? <ArrowUp size={13} className="text-[#0A2540]" /> : <ArrowDown size={13} className="text-[#0A2540]" />
                    ) : (
                      <ArrowUpDown size={13} className="text-gray-400 group-hover:text-gray-600" />
                    )}
                  </div>
                </th>

                <th 
                  onClick={() => handleSort('probability')} 
                  className="py-3.5 px-4 text-center cursor-pointer hover:bg-slate-200/60 transition group"
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span>PROBABILIDAD EN RULETA</span>
                    {sortField === 'probability' ? (
                      sortDirection === 'asc' ? <ArrowUp size={13} className="text-[#0A2540]" /> : <ArrowDown size={13} className="text-[#0A2540]" />
                    ) : (
                      <ArrowUpDown size={13} className="text-gray-400 group-hover:text-gray-600" />
                    )}
                  </div>
                </th>

                <th 
                  onClick={() => handleSort('is_active')} 
                  className="py-3.5 px-4 text-center cursor-pointer hover:bg-slate-200/60 transition group"
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span>ESTADO</span>
                    {sortField === 'is_active' ? (
                      sortDirection === 'asc' ? <ArrowUp size={13} className="text-[#0A2540]" /> : <ArrowDown size={13} className="text-[#0A2540]" />
                    ) : (
                      <ArrowUpDown size={13} className="text-gray-400 group-hover:text-gray-600" />
                    )}
                  </div>
                </th>

                <th className="py-3.5 px-4 text-right">ACCIONES</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100 font-medium text-gray-800">
              {paginatedPrizes.length > 0 ? (
                paginatedPrizes.map((prize, idx) => {
                  const fairWeight = getFairShareWeight(prize)
                  const probability = prize.is_active ? Math.round((fairWeight / totalWeight) * 1000) / 10 : 0
                  const claveCode = `PR-${(idx + 1).toString().padStart(2, '0')}`

                  return (
                    <tr key={prize.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4 text-center">
                        <input type="checkbox" className="rounded-sm border-gray-300 text-[#0A2540]" />
                      </td>

                      {/* Clave */}
                      <td className="py-3.5 px-4 font-mono font-bold text-[#0A2540]">
                        {claveCode}
                      </td>

                      {/* Título y Color */}
                      <td className="py-3.5 px-4 font-semibold text-gray-900">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: prize.badge_color || '#F56B2A' }}
                          />
                          <div>
                            <span className="block">{prize.title}</span>
                            {prize.description && (
                              <span className="block text-[10px] text-gray-400 font-normal">
                                {prize.description}
                              </span>
                            )}
                            {prize.producto_nombre ? (
                              <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-900 border border-amber-200">
                                <Cake size={11} className="text-amber-700" />
                                <span>{prize.producto_nombre}</span>
                              </span>
                            ) : (
                              prize.tier !== 'tier_50_no_prize' ? (
                                <span className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.2 text-[9px] font-medium text-gray-500 bg-gray-50 rounded border border-gray-200">
                                  General (Toda la tienda)
                                </span>
                              ) : null
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Categoría / Tier */}
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          prize.tier === 'tier_10_high_value' 
                            ? 'bg-red-50 text-red-800 border-red-200' 
                            : prize.tier === 'tier_40_promo'
                            ? 'bg-orange-50 text-orange-800 border-orange-200'
                            : 'bg-gray-100 text-gray-700 border-gray-200'
                        }`}>
                          {prize.tier === 'tier_10_high_value' && '🎁 Alto Valor (Gratis)'}
                          {prize.tier === 'tier_40_promo' && '🏷️ Promo / Descuento'}
                          {prize.tier === 'tier_50_no_prize' && '🎯 Sin Premio'}
                        </span>
                      </td>

                      {/* Peso Individual (Reparto Equitativo) */}
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-gray-700">
                        {fairWeight} pts
                        <span className="block text-[9px] text-gray-400 font-normal">
                          equitativo
                        </span>
                      </td>

                      {/* Probabilidad Real */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="font-bold text-[#E65100] font-mono text-sm">
                          {probability}%
                        </span>
                      </td>

                      {/* Estado SIPAD */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => handleToggleActive(prize)}
                          className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold border transition ${
                            prize.is_active 
                              ? 'bg-[#DCFCE7] text-[#15803D] border-green-200 hover:bg-green-200' 
                              : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200'
                          }`}
                        >
                          {prize.is_active ? 'Activo' : 'Pausado'}
                        </button>
                      </td>

                      {/* Acciones */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(prize)}
                            className="p-1 rounded-md text-slate-600 hover:bg-slate-100 transition"
                            title="Editar"
                          >
                            <Edit3 size={15} />
                          </button>
                          <button
                            onClick={() => handleDelete(prize.id)}
                            className="p-1 rounded-md text-red-500 hover:bg-red-50 transition"
                            title="Desactivar"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-gray-400 text-xs">
                    No se encontraron promociones registradas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 5. FOOTER PAGINACIÓN */}
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
            Exhibiendo {filteredAndSortedPrizes.length > 0 ? (currentPage - 1) * rowsPerPage + 1 : 0}-
            {Math.min(currentPage * rowsPerPage, filteredAndSortedPrizes.length)} de {filteredAndSortedPrizes.length} registros
          </div>
        </div>
      </div>

      {/* Modal de Configuración de Probabilidades por Categoría (Engrane) */}
      <CategoryWeightsModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        categoryWeights={categoryWeights}
        setCategoryWeights={setCategoryWeights}
        activePrizesCount={activePrizesCount}
        savingCategoryWeights={savingCategoryWeights}
        categoryModalError={categoryModalError}
        categorySuccessMsg={categorySuccessMsg}
        onSave={handleSaveCategoryWeights}
      />

      {/* SlideOver: Registrar / Editar Promoción */}
      <PromotionFormSlideOver
        isOpen={isSlideOverOpen}
        onClose={() => setIsSlideOverOpen(false)}
        editingPrize={editingPrize}
        title={title}
        setTitle={setTitle}
        description={description}
        setDescription={setDescription}
        tier={tier}
        setTier={setTier}
        tipoBeneficio={tipoBeneficio || 'descuento_fijo'}
        setTipoBeneficio={setTipoBeneficio}
        precioPromocional={precioPromocional}
        setPrecioPromocional={setPrecioPromocional}
        descuentoMonto={descuentoMonto}
        setDescuentoMonto={setDescuentoMonto}
        piezasAmparadas={piezasAmparadas}
        setPiezasAmparadas={setPiezasAmparadas}
        productId={productId}
        setProductId={setProductId}
        isActive={isActive}
        setIsActive={setIsActive}
        badgeColor={badgeColor}
        setBadgeColor={setBadgeColor}
        categoryWeights={categoryWeights}
        predicted={predicted}
        availableProducts={availableProducts}
        loading={loading}
        errorMsg={errorMsg}
        onSubmit={handleSubmit}
      />
    </div>
  )
}
