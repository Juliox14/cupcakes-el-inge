import React, { useState, useMemo, useEffect } from 'react'
import { 
  Plus, 
  Edit3, 
  Trash2, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  Package,
  Settings,
  SlidersHorizontal,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  X,
  Gift,
  Tag,
  HelpCircle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Cake
} from 'lucide-react'
import { SlideOver } from './SlideOver'
import type { Prize, ProductoConCosto } from '../../types'
import { 
  createPrizeApi, 
  updatePrizeApi, 
  deletePrizeApi,
  getCategoryWeightsApi,
  updateCategoryWeightsApi,
  getProductsApi
} from '../../lib/api'

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

    // Actualización optimista inmediata
    if (editingPrize) {
      setLocalPrizes(prev => prev.map(p => p.id === editingPrize.id ? {
        ...p,
        title,
        description: description || title,
        tier,
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
          producto_id: finalProductId,
          badge_color: badgeColor,
          is_active: isActive,
        })
      } else {
        await createPrizeApi({
          title,
          description: description || title,
          tier,
          producto_id: finalProductId,
          badge_color: badgeColor,
        })
      }

      onRefresh()
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al guardar la promoción.')
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

      setCategorySuccessMsg(res.message || 'Probabilidades actualizadas y repartidas equitativamente.')
      onRefresh()
      setTimeout(() => {
        setIsCategoryModalOpen(false)
        setCategorySuccessMsg(null)
      }, 800)
    } catch (err: any) {
      setCategoryModalError(err.message || 'Error al actualizar las probabilidades.')
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
      onRefresh()
    } catch (err) {
      console.error(err)
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
      onRefresh()
    } catch (err) {
      console.error(err)
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
  const sumWeights = Number(categoryWeights.sin_premio || 0) + Number(categoryWeights.promocion || 0) + Number(categoryWeights.alto_valor || 0)

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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Categoría: Sin Premio */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-gray-100 text-gray-600">
              <HelpCircle size={20} />
            </div>
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Sin Premio</span>
              <strong className="text-gray-900 text-sm font-bold">
                {activePrizesCount.tier_50_no_prize} {activePrizesCount.tier_50_no_prize === 1 ? 'opción' : 'opciones'}
              </strong>
              <span className="text-[11px] text-gray-500 block">
                {activePrizesCount.tier_50_no_prize > 0 
                  ? `~${Math.round((categoryWeights.sin_premio / activePrizesCount.tier_50_no_prize) * 10) / 10}% por opción`
                  : 'Sin opciones activas'}
              </span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xl font-black text-gray-800 font-mono">{categoryWeights.sin_premio}%</span>
            <span className="text-[10px] text-gray-400 block">Total Cat.</span>
          </div>
        </div>

        {/* Categoría: Promociones & Descuentos */}
        <div className="bg-white p-4 rounded-xl border border-orange-200 bg-orange-50/20 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-orange-100 text-[#F56B2A]">
              <Tag size={20} />
            </div>
            <div>
              <span className="text-[10px] font-bold text-orange-800 uppercase tracking-wider block">Promociones & Descuentos</span>
              <strong className="text-gray-900 text-sm font-bold">
                {activePrizesCount.tier_40_promo} {activePrizesCount.tier_40_promo === 1 ? 'promoción' : 'promociones'}
              </strong>
              <span className="text-[11px] text-gray-500 block">
                {activePrizesCount.tier_40_promo > 0 
                  ? `~${Math.round((categoryWeights.promocion / activePrizesCount.tier_40_promo) * 10) / 10}% c/u`
                  : 'Sin promociones activas'}
              </span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xl font-black text-[#F56B2A] font-mono">{categoryWeights.promocion}%</span>
            <span className="text-[10px] text-orange-600 block">Total Cat.</span>
          </div>
        </div>

        {/* Categoría: Alto Valor / Gratis */}
        <div className="bg-white p-4 rounded-xl border border-red-200 bg-red-50/20 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-red-100 text-red-600">
              <Gift size={20} />
            </div>
            <div>
              <span className="text-[10px] font-bold text-red-800 uppercase tracking-wider block">Alto Valor (Gratis)</span>
              <strong className="text-gray-900 text-sm font-bold">
                {activePrizesCount.tier_10_high_value} {activePrizesCount.tier_10_high_value === 1 ? 'premio' : 'premios'}
              </strong>
              <span className="text-[11px] text-gray-500 block">
                {activePrizesCount.tier_10_high_value > 0 
                  ? `~${Math.round((categoryWeights.alto_valor / activePrizesCount.tier_10_high_value) * 10) / 10}% c/u`
                  : 'Sin premios activos'}
              </span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xl font-black text-red-600 font-mono">{categoryWeights.alto_valor}%</span>
            <span className="text-[10px] text-red-500 block">Total Cat.</span>
          </div>
        </div>
      </div>

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

      {/* ===================================================================== */}
      {/* MODAL: CONFIGURACIÓN DE PROBABILIDADES POR CATEGORÍA (ENGRANE)       */}
      {/* ===================================================================== */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 space-y-5 animate-scale-up">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-[#0A2540] text-amber-400">
                  <SlidersHorizontal size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-base text-[#0A2540]">
                    Probabilidades por Categoría
                  </h3>
                  <p className="text-xs text-gray-500">
                    El peso total se dividirá equitativamente entre las opciones activas de cada categoría.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsCategoryModalOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            {categorySuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold rounded-lg flex items-center gap-2">
                <CheckCircle2 size={16} />
                <span>{categorySuccessMsg}</span>
              </div>
            )}

            {categoryModalError && (
              <div className="p-3 bg-red-50 border border-red-300 text-red-800 text-xs font-bold rounded-lg flex items-center gap-2">
                <AlertTriangle size={16} />
                <span>{categoryModalError}</span>
              </div>
            )}

            {/* Barra Visual Apilada de Distribución */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-gray-700">Distribución Porcentual:</span>
                <span className={`font-mono ${sumWeights === 100 ? 'text-emerald-700' : 'text-amber-600'}`}>
                  Suma Total: {sumWeights}% {sumWeights === 100 ? '✓' : '(Recomendado: 100%)'}
                </span>
              </div>
              <div className="w-full h-3 rounded-full overflow-hidden bg-gray-100 flex shadow-inner">
                <div 
                  style={{ width: `${(categoryWeights.sin_premio / (sumWeights || 1)) * 100}%` }}
                  className="bg-gray-400 transition-all duration-300"
                  title={`Sin Premio: ${categoryWeights.sin_premio}%`}
                />
                <div 
                  style={{ width: `${(categoryWeights.promocion / (sumWeights || 1)) * 100}%` }}
                  className="bg-[#F56B2A] transition-all duration-300"
                  title={`Promociones: ${categoryWeights.promocion}%`}
                />
                <div 
                  style={{ width: `${(categoryWeights.alto_valor / (sumWeights || 1)) * 100}%` }}
                  className="bg-red-500 transition-all duration-300"
                  title={`Alto Valor: ${categoryWeights.alto_valor}%`}
                />
              </div>
            </div>

            {/* Formulario de Pesos */}
            <form onSubmit={handleSaveCategoryWeights} className="space-y-4">
              {/* 1. Sin Premio */}
              <div className="p-3.5 rounded-xl border border-gray-200 bg-gray-50/70 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-gray-400" />
                    <span>🎯 Sin Premio / Sigue Intentando</span>
                  </label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={categoryWeights.sin_premio}
                      onChange={(e) => setCategoryWeights(prev => ({ ...prev, sin_premio: Number(e.target.value) }))}
                      className="w-16 px-2 py-1 border border-gray-300 rounded-md text-xs font-mono font-bold text-center bg-white"
                    />
                    <span className="text-xs font-bold text-gray-500">%</span>
                  </div>
                </div>
                <p className="text-[11px] text-gray-500">
                  Repartido entre <strong>{activePrizesCount.tier_50_no_prize}</strong> opciones activas (~
                  {activePrizesCount.tier_50_no_prize > 0 ? Math.round((categoryWeights.sin_premio / activePrizesCount.tier_50_no_prize) * 10) / 10 : 0}% cada una).
                </p>
              </div>

              {/* 2. Promociones */}
              <div className="p-3.5 rounded-xl border border-orange-200 bg-orange-50/40 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-orange-900 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#F56B2A]" />
                    <span>🏷️ Promociones & Descuentos (2x$35, $5 MXN, etc.)</span>
                  </label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={categoryWeights.promocion}
                      onChange={(e) => setCategoryWeights(prev => ({ ...prev, promocion: Number(e.target.value) }))}
                      className="w-16 px-2 py-1 border border-orange-300 rounded-md text-xs font-mono font-bold text-center bg-white text-orange-900"
                    />
                    <span className="text-xs font-bold text-gray-500">%</span>
                  </div>
                </div>
                <p className="text-[11px] text-orange-800/80">
                  Repartido entre <strong>{activePrizesCount.tier_40_promo}</strong> promociones activas (~
                  {activePrizesCount.tier_40_promo > 0 ? Math.round((categoryWeights.promocion / activePrizesCount.tier_40_promo) * 10) / 10 : 0}% cada una).
                </p>
              </div>

              {/* 3. Alto Valor */}
              <div className="p-3.5 rounded-xl border border-red-200 bg-red-50/40 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-red-900 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                    <span>🎁 Alto Valor / Cupcake Gratis</span>
                  </label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={categoryWeights.alto_valor}
                      onChange={(e) => setCategoryWeights(prev => ({ ...prev, alto_valor: Number(e.target.value) }))}
                      className="w-16 px-2 py-1 border border-red-300 rounded-md text-xs font-mono font-bold text-center bg-white text-red-900"
                    />
                    <span className="text-xs font-bold text-gray-500">%</span>
                  </div>
                </div>
                <p className="text-[11px] text-red-800/80">
                  Repartido entre <strong>{activePrizesCount.tier_10_high_value}</strong> premios activos (~
                  {activePrizesCount.tier_10_high_value > 0 ? Math.round((categoryWeights.alto_valor / activePrizesCount.tier_10_high_value) * 10) / 10 : 0}% cada uno).
                </p>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-xs font-bold text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingCategoryWeights}
                  className="px-4 py-2 bg-[#0A2540] hover:bg-slate-800 text-white rounded-md text-xs font-bold shadow-sm flex items-center gap-1.5"
                >
                  {savingCategoryWeights ? 'Guardando y rebalanceando...' : 'Guardar y Redistribuir'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* SLIDE-OVER: REGISTRAR / EDITAR PROMOCIÓN                             */}
      {/* ===================================================================== */}
      <SlideOver
        isOpen={isSlideOverOpen}
        onClose={() => setIsSlideOverOpen(false)}
        title={editingPrize ? 'Editar Promoción' : 'Registrar Promoción'}
        icon={<Package size={20} />}
        footer={
          <>
            <button
              type="button"
              onClick={() => setIsSlideOverOpen(false)}
              className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 font-semibold text-xs hover:bg-gray-50 transition"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading || !title.trim()}
              className="px-5 py-2 rounded-md bg-[#0A2540] hover:bg-[#081C30] text-white font-bold text-xs transition shadow-sm"
            >
              {loading ? 'Guardando...' : editingPrize ? 'Actualizar Promoción' : 'Guardar Promoción'}
            </button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
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

          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1">
              Descripción para el Cliente
            </label>
            <textarea
              rows={3}
              placeholder="Ej. Llévate 2 cupcakes artesanales por $35 MXN en tu próxima compra."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-xs focus:outline-none focus:border-[#0A2540]"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1">
              Categoría de Probabilidad *
            </label>
            <select
              value={tier}
              onChange={(e: any) => {
                const newTier = e.target.value
                setTier(newTier)
                if (newTier === 'tier_50_no_prize') {
                  setProductId('')
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-xs font-semibold focus:outline-none focus:border-[#0A2540]"
            >
              <option value="tier_40_promo">🏷️ Promoción / Descuento (Peso total: {categoryWeights.promocion}%)</option>
              <option value="tier_10_high_value">🎁 Alto Valor / Cupcake Gratis (Peso total: {categoryWeights.alto_valor}%)</option>
              <option value="tier_50_no_prize">🎯 Sin Premio / Sigue Intentando (Peso total: {categoryWeights.sin_premio}%)</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1 flex items-center justify-between">
              <span>Producto Asociado a la Promoción</span>
              {tier === 'tier_50_no_prize' ? (
                <span className="text-[10px] text-gray-400 font-normal">No aplica en Sin Premio</span>
              ) : (
                <span className="text-[10px] text-emerald-600 font-normal font-semibold">Opcional</span>
              )}
            </label>
            <select
              value={tier === 'tier_50_no_prize' ? '' : (productId || '')}
              disabled={tier === 'tier_50_no_prize'}
              onChange={(e) => setProductId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-xs font-semibold focus:outline-none focus:border-[#0A2540] disabled:bg-gray-100 disabled:text-gray-400"
            >
              <option value="">Ninguno / General (Aplica a toda la tienda)</option>
              {availableProducts.map(p => (
                <option key={p.id} value={p.id}>
                  {p.nombre} (${p.precio_venta}.00 MXN)
                </option>
              ))}
            </select>
            <span className="text-[10px] text-gray-500 mt-1 block">
              {tier === 'tier_50_no_prize' 
                ? 'El producto queda deshabilitado (null) al ser una casilla sin premio.' 
                : 'Indica si este premio o descuento aplica para un producto específico (ej. Pastel de Zanahoria o Cupcake).'}
            </span>
          </div>

          {/* Tarjeta de Reparto Equitativo Automático */}
          <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-lg text-xs space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-amber-900">
              <Sparkles size={14} className="text-amber-600" />
              <span>División Equitativa Automática:</span>
            </div>
            <p className="text-amber-800 leading-relaxed text-[11px]">
              Al guardar en esta categoría (peso total <strong>{predicted.totalCat}%</strong>), se dividirá equitativamente entre las <strong>{predicted.nextCount} promociones activas</strong>, asignando aproximadamente <strong>~{predicted.individual}%</strong> a cada una.
            </p>
          </div>

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

          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-300 text-red-700 rounded-md text-xs">
              {errorMsg}
            </div>
          )}
        </form>
      </SlideOver>
    </div>
  )
}
