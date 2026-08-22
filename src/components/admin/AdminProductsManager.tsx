import React, { useState, useEffect, useMemo, useRef } from 'react'
import { 
  Package, 
  ChefHat, 
  UtensilsCrossed, 
  Plus, 
  Edit3, 
  Trash2, 
  Calculator, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  X,
  Cake,
  Check,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react'
import { 
  getProductsApi, 
  saveProductApi, 
  deleteProductApi, 
  getIngredientsApi, 
  saveIngredientApi, 
  deleteIngredientApi, 
  saveRecipeApi 
} from '../../services'
import type { ProductoConCosto, Ingrediente } from '../../types'
import { SlideOver } from './SlideOver'

// Helper de magnitudes y compatibilidad de unidades en el Frontend
type UnitMagnitude = 'masa' | 'volumen' | 'unidades' | 'desconocido'

function getUnitMagnitude(unitStr?: string | null): { magnitude: UnitMagnitude; baseFactor: number; baseUnit: string } {
  if (!unitStr) return { magnitude: 'desconocido', baseFactor: 1, baseUnit: '' }
  const u = unitStr.trim().toLowerCase()

  // Masa -> Base: gramos (gr)
  if (['kg', 'kilo', 'kilos', 'kilogramo'].includes(u)) return { magnitude: 'masa', baseFactor: 1000, baseUnit: 'gr' }
  if (['gr', 'g', 'gramo', 'gramos'].includes(u)) return { magnitude: 'masa', baseFactor: 1, baseUnit: 'gr' }
  if (['mg', 'miligramo'].includes(u)) return { magnitude: 'masa', baseFactor: 0.001, baseUnit: 'gr' }
  if (['cda', 'cdas', 'cucharada'].includes(u)) return { magnitude: 'masa', baseFactor: 15, baseUnit: 'gr' }
  if (['cdita', 'cditas', 'cucharadita'].includes(u)) return { magnitude: 'masa', baseFactor: 5, baseUnit: 'gr' }

  // Volumen -> Base: mililitros (ml)
  if (['litro', 'litros', 'lt', 'l', 'lts'].includes(u)) return { magnitude: 'volumen', baseFactor: 1000, baseUnit: 'ml' }
  if (['ml', 'mililitro', 'mililitros', 'cc'].includes(u)) return { magnitude: 'volumen', baseFactor: 1, baseUnit: 'ml' }

  // Conteo -> Base: piezas (pzas)
  if (['pza', 'pzas', 'pieza', 'piezas', 'unidad', 'unidades'].includes(u)) return { magnitude: 'unidades', baseFactor: 1, baseUnit: 'pzas' }
  if (['docena', 'docenas'].includes(u)) return { magnitude: 'unidades', baseFactor: 12, baseUnit: 'pzas' }

  return { magnitude: 'desconocido', baseFactor: 1, baseUnit: u }
}

function calculateLiveIngredientCost(
  precioCompra: number,
  cantidadCompra: number,
  unidadCompra: string,
  cantidadReceta: number,
  unidadReceta: string
): { costo: number; compatible: boolean; errorMsg?: string } {
  if (precioCompra <= 0 || cantidadCompra <= 0 || cantidadReceta <= 0) {
    return { costo: 0, compatible: true }
  }

  const compInfo = getUnitMagnitude(unidadCompra)
  const recInfo = getUnitMagnitude(unidadReceta)

  if (
    compInfo.magnitude !== 'desconocido' && 
    recInfo.magnitude !== 'desconocido' && 
    compInfo.magnitude !== recInfo.magnitude
  ) {
    return {
      costo: 0,
      compatible: false,
      errorMsg: `Conversión imposible: no se puede convertir de '${unidadCompra}' (${compInfo.magnitude}) a '${unidadReceta}' (${recInfo.magnitude}).`
    }
  }

  const totalBaseComprado = cantidadCompra * compInfo.baseFactor
  const totalBaseUsado = cantidadReceta * recInfo.baseFactor

  if (totalBaseComprado <= 0) {
    return { costo: 0, compatible: false, errorMsg: 'Cantidad de compra inválida.' }
  }

  const costoPorBase = precioCompra / totalBaseComprado
  const costoTotal = costoPorBase * totalBaseUsado

  return {
    costo: Math.round(costoTotal * 100) / 100,
    compatible: true
  }
}

export const AdminProductsManager: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'products' | 'recipe_editor' | 'ingredients'>('products')
  const [products, setProducts] = useState<ProductoConCosto[]>([])
  const [ingredients, setIngredients] = useState<Ingrediente[]>([])
  const [loading, setLoading] = useState(false)
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  // 1. Modales / Slide-Overs para Productos
  const [isProductSlideOverOpen, setIsProductSlideOverOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<ProductoConCosto | null>(null)
  const [productForm, setProductForm] = useState({
    nombre: '',
    descripcion: '',
    precio: 20,
    rendimiento_tanda: 24,
    tipo_unidad: 'cupcakes',
    activo: true
  })

  // 2. Modales / Slide-Overs para Ingredientes (con cantidad numérica y unidad separadas)
  const [isIngredientSlideOverOpen, setIsIngredientSlideOverOpen] = useState(false)
  const [editingIngredient, setEditingIngredient] = useState<Ingrediente | null>(null)
  const [ingredientForm, setIngredientForm] = useState({
    nombre: '',
    descripcion: '',
    proveedor: '',
    precio: 0,
    cantidad_numerica: 1,
    unidad_medida: 'kg'
  })

  // 3. Estado del Editor de Recetas
  const [selectedProductForRecipe, setSelectedProductForRecipe] = useState<ProductoConCosto | null>(null)
  const [recipeItems, setRecipeItems] = useState<Array<{
    ingrediente_id: string
    cantidad_necesaria: number
    unidad_medida: string
  }>>([])

  // Selector para agregar nuevo insumo que aún no esté en la receta
  const [pendingIngredientToAdd, setPendingIngredientToAdd] = useState<string>('')

  // Ordenamiento de la tabla de insumos
  type IngredientSortField = 'nombre' | 'proveedor' | 'cantidad' | 'precio'
  const [ingSortField, setIngSortField] = useState<IngredientSortField>('nombre')
  const [ingSortDirection, setIngSortDirection] = useState<'asc' | 'desc'>('asc')

  const handleIngSort = (field: IngredientSortField) => {
    if (ingSortField === field) {
      setIngSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setIngSortField(field)
      setIngSortDirection('asc')
    }
  }

  const sortedIngredients = useMemo(() => {
    const list = [...ingredients]
    return list.sort((a, b) => {
      let comparison = 0
      switch (ingSortField) {
        case 'nombre':
          comparison = a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' })
          break
        case 'proveedor':
          comparison = (a.proveedor || '').localeCompare(b.proveedor || '', 'es', { sensitivity: 'base' })
          break
        case 'cantidad':
          const cantA = Number(a.cantidad_numerica || 1)
          const cantB = Number(b.cantidad_numerica || 1)
          comparison = cantA - cantB
          break
        case 'precio':
          comparison = Number(a.precio || 0) - Number(b.precio || 0)
          break
      }
      return ingSortDirection === 'asc' ? comparison : -comparison
    })
  }, [ingredients, ingSortField, ingSortDirection])

  // Ordenamiento de la tabla de recetas
  type RecipeSortField = 'nombre' | 'presentacion' | 'cantidad' | 'costo'
  const [recipeSortField, setRecipeSortField] = useState<RecipeSortField>('nombre')
  const [recipeSortDirection, setRecipeSortDirection] = useState<'asc' | 'desc'>('asc')

  const handleRecipeSort = (field: RecipeSortField) => {
    if (recipeSortField === field) {
      setRecipeSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setRecipeSortField(field)
      setRecipeSortDirection('asc')
    }
  }

  // Insumos disponibles que aún no han sido agregados a la receta actual
  const availableIngredientsForRecipe = useMemo(() => {
    const usedIds = new Set(recipeItems.map(item => item.ingrediente_id))
    return ingredients.filter(ing => !usedIds.has(ing.id))
  }, [ingredients, recipeItems])

  // Cargar datos
  const loadAllData = async () => {
    setLoading(true)
    try {
      const [prodRes, ingRes] = await Promise.all([
        getProductsApi(),
        getIngredientsApi()
      ])

      if (prodRes.success) {
        setProducts(prodRes.products)
        if (!selectedProductForRecipe && prodRes.products.length > 0) {
          setSelectedProductForRecipe(prodRes.products[0])
        } else if (selectedProductForRecipe) {
          const updated = prodRes.products.find(p => p.id === selectedProductForRecipe.id)
          if (updated) setSelectedProductForRecipe(updated)
        }
      }

      if (ingRes.success) {
        setIngredients(ingRes.ingredients)
      }
    } catch (err: any) {
      console.error(err)
      setFeedbackMsg({ text: 'Error al cargar productos e ingredientes.', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAllData()
  }, [])

  // Sincronizar items de receta al cambiar de producto seleccionado
  useEffect(() => {
    if (selectedProductForRecipe && selectedProductForRecipe.receta) {
      setRecipeItems(
        selectedProductForRecipe.receta.map(r => ({
          ingrediente_id: r.ingrediente_id,
          cantidad_necesaria: r.cantidad_en_tanda,
          unidad_medida: r.unidad_medida
        }))
      )
    } else {
      setRecipeItems([])
    }
  }, [selectedProductForRecipe?.id])

  // Actualizar pendingIngredientToAdd al cambiar los disponibles
  useEffect(() => {
    if (availableIngredientsForRecipe.length > 0) {
      setPendingIngredientToAdd(availableIngredientsForRecipe[0].id)
    } else {
      setPendingIngredientToAdd('')
    }
  }, [availableIngredientsForRecipe])

  // Auto-guardado de la receta al modificar items
  const autoSaveTimeoutRef = useRef<any>(null)

  const triggerAutoSaveRecipe = (newItems: typeof recipeItems) => {
    if (!selectedProductForRecipe) return

    setAutoSaveStatus('saving')
    if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current)

    autoSaveTimeoutRef.current = setTimeout(async () => {
      try {
        await saveRecipeApi(selectedProductForRecipe.id, newItems)
        setAutoSaveStatus('saved')
        
        // Recargar productos silenciosamente para sincronizar costos
        const prodRes = await getProductsApi()
        if (prodRes.success) {
          setProducts(prodRes.products)
          const updated = prodRes.products.find(p => p.id === selectedProductForRecipe.id)
          if (updated) setSelectedProductForRecipe(updated)
        }

        setTimeout(() => setAutoSaveStatus('idle'), 2500)
      } catch (err: any) {
        console.error('Error en auto-guardado:', err)
        setAutoSaveStatus('error')
        setFeedbackMsg({ text: 'Error al auto-guardar la receta.', type: 'error' })
      }
    }, 400)
  }

  // Manejar Producto (Crear / Editar)
  const handleOpenProductModal = (product?: ProductoConCosto) => {
    if (product) {
      setEditingProduct(product)
      setProductForm({
        nombre: product.nombre,
        descripcion: product.descripcion || '',
        precio: product.precio_venta || 20,
        rendimiento_tanda: product.rendimiento_tanda || 24,
        tipo_unidad: product.tipo_unidad || 'cupcakes',
        activo: product.activo ?? true
      })
    } else {
      setEditingProduct(null)
      setProductForm({
        nombre: '',
        descripcion: '',
        precio: 20,
        rendimiento_tanda: 24,
        tipo_unidad: 'cupcakes',
        activo: true
      })
    }
    setIsProductSlideOverOpen(true)
  }

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!productForm.nombre.trim()) return

    try {
      const res = await saveProductApi({
        id: editingProduct ? editingProduct.id : undefined,
        nombre: productForm.nombre,
        descripcion: productForm.descripcion,
        precio: Number(productForm.precio),
        rendimiento_tanda: Math.max(1, Number(productForm.rendimiento_tanda || 1)),
        tipo_unidad: productForm.tipo_unidad || 'piezas',
        activo: productForm.activo
      })

      setFeedbackMsg({ text: res.message, type: 'success' })
      setIsProductSlideOverOpen(false)
      loadAllData()
    } catch (err: any) {
      setFeedbackMsg({ text: err.message || 'Error al guardar producto.', type: 'error' })
    }
  }

  const handleDeleteProduct = async (id: string) => {
    if (!window.confirm('¿Seguro que deseas eliminar este producto?')) return
    
    // Eliminación optimista inmediata en 0ms
    setProducts(prev => prev.filter(p => p.id !== id))
    setFeedbackMsg({ text: 'Producto eliminado.', type: 'success' })

    try {
      await deleteProductApi(id)
      loadAllData()
    } catch (err: any) {
      setFeedbackMsg({ text: err.message || 'Error al eliminar producto.', type: 'error' })
      loadAllData() // revertir
    }
  }

  // Manejar Ingrediente (Crear / Editar con cantidad numérica y unidad separadas)
  const handleOpenIngredientModal = (ing?: Ingrediente) => {
    if (ing) {
      setEditingIngredient(ing)
      
      let cantNum = Number(ing.cantidad_numerica || 1)
      let unit = ing.unidad_medida || 'kg'
      if (!ing.cantidad_numerica && ing.cantidad) {
        const m = ing.cantidad.match(/[\d.]+/)
        if (m) cantNum = parseFloat(m[0])
        const low = ing.cantidad.toLowerCase()
        if (low.includes('kg')) unit = 'kg'
        else if (low.includes('gr')) unit = 'gr'
        else if (low.includes('litro') || low.includes('lt')) unit = 'litros'
        else if (low.includes('ml')) unit = 'ml'
        else if (low.includes('pza')) unit = 'pzas'
      }

      setIngredientForm({
        nombre: ing.nombre,
        descripcion: ing.descripcion || '',
        proveedor: ing.proveedor || '',
        precio: Number(ing.precio || 0),
        cantidad_numerica: cantNum,
        unidad_medida: unit
      })
    } else {
      setEditingIngredient(null)
      setIngredientForm({
        nombre: '',
        descripcion: '',
        proveedor: '',
        precio: 0,
        cantidad_numerica: 1,
        unidad_medida: 'kg'
      })
    }
    setIsIngredientSlideOverOpen(true)
  }

  const handleSaveIngredient = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ingredientForm.nombre.trim()) return

    setIsIngredientSlideOverOpen(false)

    try {
      const res = await saveIngredientApi({
        id: editingIngredient ? editingIngredient.id : undefined,
        nombre: ingredientForm.nombre,
        descripcion: ingredientForm.descripcion,
        proveedor: ingredientForm.proveedor,
        precio: Number(ingredientForm.precio),
        cantidad_numerica: Number(ingredientForm.cantidad_numerica || 1),
        unidad_medida: ingredientForm.unidad_medida || 'kg',
        cantidad: `${ingredientForm.cantidad_numerica} ${ingredientForm.unidad_medida}`
      })

      setFeedbackMsg({ text: res.message, type: 'success' })
      loadAllData()
    } catch (err: any) {
      setFeedbackMsg({ text: err.message || 'Error al guardar ingrediente.', type: 'error' })
    }
  }

  const handleDeleteIngredient = async (id: string) => {
    if (!window.confirm('¿Seguro que deseas eliminar este ingrediente?')) return
    
    // Eliminación optimista inmediata en 0ms
    setIngredients(prev => prev.filter(i => i.id !== id))
    setFeedbackMsg({ text: 'Ingrediente eliminado.', type: 'success' })

    try {
      await deleteIngredientApi(id)
      loadAllData()
    } catch (err: any) {
      setFeedbackMsg({ text: err.message || 'Error al eliminar ingrediente.', type: 'error' })
      loadAllData() // revertir
    }
  }

  // Manejar Items de Receta con Auto-Guardado y Filtrado
  const handleAddSelectedIngredient = () => {
    if (!pendingIngredientToAdd) return
    const targetIng = ingredients.find(i => i.id === pendingIngredientToAdd)
    if (!targetIng) return

    const defaultUnit = targetIng.unidad_medida === 'kg' ? 'gr' : (targetIng.unidad_medida || 'gr')
    const defaultQty = targetIng.unidad_medida === 'kg' ? 100 : (targetIng.unidad_medida === 'pzas' ? 1 : 50)

    const newItems = [
      ...recipeItems,
      {
        ingrediente_id: pendingIngredientToAdd,
        cantidad_necesaria: defaultQty,
        unidad_medida: defaultUnit
      }
    ]

    setRecipeItems(newItems)
    triggerAutoSaveRecipe(newItems)
  }

  const handleUpdateRecipeItem = (index: number, field: string, value: any) => {
    const next = [...recipeItems]
    next[index] = { ...next[index], [field]: value }
    setRecipeItems(next)
    triggerAutoSaveRecipe(next)
  }

  const handleRemoveRecipeItem = (index: number) => {
    const next = recipeItems.filter((_, i) => i !== index)
    setRecipeItems(next)
    triggerAutoSaveRecipe(next)
  }

  // Cálculos dinámicos en vivo para la receta en edición
  const calculateLiveRecipeCost = () => {
    let totalTanda = 0
    let hasConversionError = false

    recipeItems.forEach(item => {
      const ing = ingredients.find(i => i.id === item.ingrediente_id)
      if (!ing) return
      
      const precio = Number(ing.precio || 0)
      let cantidadCompra = Number(ing.cantidad_numerica || 0)
      let unidadCompra = ing.unidad_medida || 'kg'
      
      if (cantidadCompra <= 0 && ing.cantidad) {
        const m = ing.cantidad.match(/[\d.]+/)
        cantidadCompra = m ? parseFloat(m[0]) : 1
        const low = ing.cantidad.toLowerCase()
        if (low.includes('kg')) unidadCompra = 'kg'
        else if (low.includes('gr')) unidadCompra = 'gr'
        else if (low.includes('litro') || low.includes('lt')) unidadCompra = 'litros'
        else if (low.includes('ml')) unidadCompra = 'ml'
        else if (low.includes('pza')) unidadCompra = 'pzas'
      }

      if (cantidadCompra <= 0) cantidadCompra = 1

      const res = calculateLiveIngredientCost(
        precio,
        cantidadCompra,
        unidadCompra,
        Number(item.cantidad_necesaria || 0),
        item.unidad_medida || unidadCompra
      )

      if (!res.compatible) hasConversionError = true
      totalTanda += res.costo
    })

    const yieldQty = selectedProductForRecipe ? Math.max(1, Number(selectedProductForRecipe.rendimiento_tanda || 24)) : 24
    const unitCost = totalTanda / yieldQty
    const price = selectedProductForRecipe ? Number(selectedProductForRecipe.precio_venta || 20) : 20
    const batchRevenue = price * yieldQty
    const batchProfit = batchRevenue - totalTanda
    const unitProfit = price - unitCost
    const margin = price > 0 ? Math.round((unitProfit / price) * 100) : 0

    return {
      yieldQty,
      yieldUnit: selectedProductForRecipe?.tipo_unidad || 'piezas',
      totalTanda: Math.round(totalTanda * 100) / 100,
      unitCost: Math.round(unitCost * 100) / 100,
      batchRevenue,
      batchProfit: Math.round(batchProfit * 100) / 100,
      unitProfit: Math.round(unitProfit * 100) / 100,
      margin,
      hasConversionError
    }
  }

  const liveMetrics = calculateLiveRecipeCost()

  return (
    <div className="space-y-6">
      {/* 1. ENCABEZADO DE SECCIÓN */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ChefHat className="text-[#F56B2A]" size={28} />
            <h2 className="text-2xl font-bold text-[#0A2540] tracking-tight">
              Control de Productos, Recetas & Costos
            </h2>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Gestión precisa de insumos con unidades separadas, formulación de recetas con guardado automático y validación de conversiones.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Indicador de Auto-guardado */}
          {autoSaveStatus === 'saving' && (
            <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200 flex items-center gap-1.5 animate-pulse">
              <RefreshCw size={12} className="animate-spin" />
              Guardando cambios...
            </span>
          )}
          {autoSaveStatus === 'saved' && (
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 flex items-center gap-1.5 animate-fade-in">
              <Check size={12} className="text-emerald-600 stroke-[3]" />
              Guardado automáticamente
            </span>
          )}
          {autoSaveStatus === 'error' && (
            <span className="text-[11px] font-bold text-red-700 bg-red-50 px-2.5 py-1 rounded-full border border-red-200 flex items-center gap-1.5">
              <AlertTriangle size={12} />
              Error al guardar
            </span>
          )}

          <button
            onClick={loadAllData}
            className="p-2 rounded-md bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 transition shadow-2xs"
            title="Recargar datos"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* FEEDBACK ALERT */}
      {feedbackMsg && (
        <div className={`p-3 rounded-lg border text-xs font-semibold flex items-center justify-between ${
          feedbackMsg.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <div className="flex items-center gap-2">
            {feedbackMsg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
            <span>{feedbackMsg.text}</span>
          </div>
          <button onClick={() => setFeedbackMsg(null)} className="hover:opacity-70">
            <X size={14} />
          </button>
        </div>
      )}

      {/* 2. SUB-PESTAÑAS DE NAVEGACIÓN */}
      <div className="flex border-b border-gray-200 text-xs font-bold gap-6">
        <button
          onClick={() => setActiveSubTab('products')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition ${
            activeSubTab === 'products'
              ? 'border-[#0A2540] text-[#0A2540]'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Package size={16} />
          <span>Catálogo de Productos ({products.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('recipe_editor')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition ${
            activeSubTab === 'recipe_editor'
              ? 'border-[#0A2540] text-[#0A2540]'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Calculator size={16} />
          <span>Calculadora de Recetas</span>
        </button>

        <button
          onClick={() => setActiveSubTab('ingredients')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition ${
            activeSubTab === 'ingredients'
              ? 'border-[#0A2540] text-[#0A2540]'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <UtensilsCrossed size={16} />
          <span>Insumos ({ingredients.length})</span>
        </button>
      </div>

      {/* ===================================================================== */}
      {/* PESTAÑA 1: CATÁLOGO DE PRODUCTOS & MARGEN DE GANANCIA                */}
      {/* ===================================================================== */}
      {activeSubTab === 'products' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-gray-800">
              Productos Registrados y Análisis de Rentabilidad
            </h3>
            <button
              onClick={() => handleOpenProductModal()}
              className="px-3 py-1.5 rounded-md bg-[#0A2540] hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-sm"
            >
              <Plus size={14} />
              <span>Nuevo Producto</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((prod) => {
              const yieldQty = prod.rendimiento_tanda || 24
              const yieldUnit = prod.tipo_unidad || 'piezas'
              const isCake = yieldQty === 1 || yieldUnit.includes('pastel')

              return (
                <div 
                  key={prod.id} 
                  className="bg-white rounded-xl border border-gray-200 shadow-xs hover:shadow-md transition p-5 flex flex-col justify-between space-y-4"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 pb-2 border-b border-gray-100">
                      <div>
                        <div className="flex items-center gap-1.5">
                          {isCake ? <Cake size={16} className="text-[#0A2540]" /> : <Package size={16} className="text-[#F56B2A]" />}
                          <h4 className="font-bold text-base text-[#0A2540] leading-tight">
                            {prod.nombre}
                          </h4>
                        </div>
                        <p className="text-[11px] text-gray-500 line-clamp-2 mt-1">
                          {prod.descripcion || 'Sin descripción'}
                        </p>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-800 shrink-0">
                        ${prod.precio_venta}.00 MXN
                      </span>
                    </div>

                    {/* RENDIMIENTO DE LA RECETA */}
                    <div className="mt-2 flex items-center justify-between text-[11px] font-semibold text-slate-600 bg-slate-100/70 px-2.5 py-1 rounded-md">
                      <span>Rendimiento por receta:</span>
                      <strong className="text-[#0A2540] font-bold">{yieldQty} {yieldUnit}</strong>
                    </div>

                    {/* DESGLOSE FINANCIERO: UNITARIO */}
                    <div className="grid grid-cols-2 gap-2 text-center text-xs mt-3 pt-1">
                      <div className="bg-slate-50 p-2.5 rounded-lg border border-gray-200">
                        <span className="text-[10px] text-gray-500 font-medium block">Costo / {isCake ? 'Pastel' : 'Pieza'}</span>
                        <strong className="text-gray-900 text-sm font-bold">${prod.costo_unitario}</strong>
                      </div>
                      <div className="bg-emerald-50 p-2.5 rounded-lg border border-emerald-200">
                        <span className="text-[10px] text-emerald-800 font-medium block">Ganancia / {isCake ? 'Pastel' : 'Pieza'}</span>
                        <strong className="text-emerald-700 text-sm font-bold">+${prod.ganancia_unitaria}</strong>
                      </div>
                    </div>

                    {/* RENDIMIENTO POR PREPARACIÓN COMPLETA */}
                    <div className="bg-amber-50/70 p-3 rounded-lg border border-amber-200/80 mt-3 space-y-1.5 text-xs">
                      <div className="flex justify-between items-center text-amber-900 font-semibold text-[11px]">
                        <span>Receta Completa ({yieldQty} {yieldUnit}):</span>
                        <span className="font-bold text-emerald-700">{prod.margen_porcentaje}% margen</span>
                      </div>
                      <div className="flex justify-between text-gray-600 text-[11px]">
                        <span>Costo insumos preparación:</span>
                        <strong className="text-gray-900 font-mono">${prod.costo_tanda} MXN</strong>
                      </div>
                      <div className="flex justify-between text-gray-600 text-[11px]">
                        <span>Venta total preparación:</span>
                        <strong className="text-gray-900 font-mono">${prod.ingreso_tanda} MXN</strong>
                      </div>
                      <div className="flex justify-between text-emerald-800 font-bold border-t border-amber-200/80 pt-1 text-xs">
                        <span>Ganancia neta preparación:</span>
                        <span className="font-mono text-emerald-700">+${prod.ganancia_tanda} MXN</span>
                      </div>
                    </div>
                  </div>

                  {/* BOTONES DE ACCIÓN */}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100 gap-2">
                    <button
                      onClick={() => {
                        setSelectedProductForRecipe(prod)
                        setActiveSubTab('recipe_editor')
                      }}
                      className="flex-1 py-1.5 px-3 rounded-lg bg-orange-50 hover:bg-orange-100 text-[#F56B2A] font-bold text-xs flex items-center justify-center gap-1.5 transition"
                    >
                      <Calculator size={13} />
                      <span>Receta ({prod.ingredientes_count} insumos)</span>
                    </button>

                    <button
                      onClick={() => handleOpenProductModal(prod)}
                      className="p-1.5 rounded-lg text-gray-500 hover:text-[#0A2540] hover:bg-gray-100 transition"
                      title="Editar datos del producto"
                    >
                      <Edit3 size={15} />
                    </button>

                    <button
                      onClick={() => handleDeleteProduct(prod.id)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition"
                      title="Eliminar producto"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* PESTAÑA 2: CALCULADORA DE RECETA CON FILTRO Y AUTO-GUARDADO         */}
      {/* ===================================================================== */}
      {activeSubTab === 'recipe_editor' && (
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

              {/* Indicador de Auto-guardado en la barra */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-gray-500 font-medium">
                  ⚡ Los cambios en insumos y cantidades se guardan al instante.
                </span>
              </div>
            </div>

            {/* Selector de Insumos Disponibles (Excluye los ya añadidos a la receta) */}
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
                    onClick={handleAddSelectedIngredient}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-2xs shrink-0"
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
                      onClick={() => handleRecipeSort('nombre')} 
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
                      onClick={() => handleRecipeSort('presentacion')} 
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
                      onClick={() => handleRecipeSort('cantidad')} 
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
                      onClick={() => handleRecipeSort('costo')} 
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
                        item.cantidad_necesaria,
                        item.unidad_medida
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
                              value={item.cantidad_necesaria}
                              onChange={(e) => handleUpdateRecipeItem(idx, 'cantidad_necesaria', Number(e.target.value))}
                              className="w-24 px-2 py-1 bg-white border border-gray-300 rounded text-center font-bold text-xs text-gray-900 focus:outline-none focus:border-[#0A2540]"
                            />
                          </td>

                          <td className="py-3 px-4 text-center">
                            <select
                              value={item.unidad_medida}
                              onChange={(e) => handleUpdateRecipeItem(idx, 'unidad_medida', e.target.value)}
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
                              onClick={() => handleRemoveRecipeItem(idx)}
                              className="p-1 rounded text-red-500 hover:text-red-700 hover:bg-red-50 transition"
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
      )}

      {/* ===================================================================== */}
      {/* PESTAÑA 3: INVENTARIO DE INGREDIENTES CON CANTIDAD Y UNIDAD          */}
      {/* ===================================================================== */}
      {activeSubTab === 'ingredients' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-gray-800">
              Directorio de Insumos, Materia Prima y Presentaciones de Compra
            </h3>
            <button
              onClick={() => handleOpenIngredientModal()}
              className="px-3 py-1.5 rounded-md bg-[#0A2540] hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-sm"
            >
              <Plus size={14} />
              <span>Nuevo Insumo</span>
            </button>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-gray-600 text-[11px] uppercase font-bold border-b border-gray-200 select-none">
                <tr>
                  <th 
                    onClick={() => handleIngSort('nombre')} 
                    className="py-3 px-4 cursor-pointer hover:bg-slate-200/60 transition group"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Insumo</span>
                      {ingSortField === 'nombre' ? (
                        ingSortDirection === 'asc' ? <ArrowUp size={13} className="text-[#0A2540]" /> : <ArrowDown size={13} className="text-[#0A2540]" />
                      ) : (
                        <ArrowUpDown size={13} className="text-gray-400 group-hover:text-gray-600" />
                      )}
                    </div>
                  </th>

                  <th 
                    onClick={() => handleIngSort('proveedor')} 
                    className="py-3 px-4 cursor-pointer hover:bg-slate-200/60 transition group"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Proveedor / Origen</span>
                      {ingSortField === 'proveedor' ? (
                        ingSortDirection === 'asc' ? <ArrowUp size={13} className="text-[#0A2540]" /> : <ArrowDown size={13} className="text-[#0A2540]" />
                      ) : (
                        <ArrowUpDown size={13} className="text-gray-400 group-hover:text-gray-600" />
                      )}
                    </div>
                  </th>

                  <th 
                    onClick={() => handleIngSort('cantidad')} 
                    className="py-3 px-4 cursor-pointer hover:bg-slate-200/60 transition group"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Presentación / Cantidad Comprada</span>
                      {ingSortField === 'cantidad' ? (
                        ingSortDirection === 'asc' ? <ArrowUp size={13} className="text-[#0A2540]" /> : <ArrowDown size={13} className="text-[#0A2540]" />
                      ) : (
                        <ArrowUpDown size={13} className="text-gray-400 group-hover:text-gray-600" />
                      )}
                    </div>
                  </th>

                  <th 
                    onClick={() => handleIngSort('precio')} 
                    className="py-3 px-4 text-center cursor-pointer hover:bg-slate-200/60 transition group"
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      <span>Precio de Compra</span>
                      {ingSortField === 'precio' ? (
                        ingSortDirection === 'asc' ? <ArrowUp size={13} className="text-[#0A2540]" /> : <ArrowDown size={13} className="text-[#0A2540]" />
                      ) : (
                        <ArrowUpDown size={13} className="text-gray-400 group-hover:text-gray-600" />
                      )}
                    </div>
                  </th>

                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium text-gray-800">
                {sortedIngredients.length > 0 ? (
                  sortedIngredients.map((ing) => {
                    const cantNum = ing.cantidad_numerica || (ing.cantidad ? parseFloat(ing.cantidad) : 1)
                    const unit = ing.unidad_medida || (ing.cantidad?.toLowerCase().includes('kg') ? 'kg' : (ing.cantidad?.toLowerCase().includes('litro') ? 'litros' : 'gr'))

                    return (
                      <tr key={ing.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-4">
                          <strong className="font-bold text-[#0A2540] text-sm block">{ing.nombre}</strong>
                          {ing.descripcion && <span className="text-[11px] text-gray-500">{ing.descripcion}</span>}
                        </td>

                        <td className="py-3 px-4 text-gray-600">
                          {ing.proveedor || 'Sin proveedor'}
                        </td>

                        <td className="py-3 px-4 font-mono font-semibold text-gray-800">
                          <span className="px-2 py-0.5 bg-slate-100 rounded text-gray-700 font-bold">
                            {cantNum} {unit}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-center font-mono font-bold text-emerald-700">
                          ${ing.precio}.00 MXN
                        </td>

                        <td className="py-3 px-4 text-right space-x-1">
                          <button
                            onClick={() => handleOpenIngredientModal(ing)}
                            className="p-1.5 rounded-md text-gray-500 hover:text-[#0A2540] hover:bg-gray-100 transition"
                            title="Editar insumo"
                          >
                            <Edit3 size={15} />
                          </button>
                          <button
                            onClick={() => handleDeleteIngredient(ing.id)}
                            className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition"
                            title="Eliminar insumo"
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-400 text-xs italic">
                      No hay insumos registrados. Haz clic en <strong>+ Nuevo Insumo</strong>.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SLIDE-OVER: CREAR / EDITAR PRODUCTO */}
      <SlideOver
        isOpen={isProductSlideOverOpen}
        onClose={() => setIsProductSlideOverOpen(false)}
        title={editingProduct ? 'Editar Producto' : 'Registrar Nuevo Producto'}
      >
        <form onSubmit={handleSaveProduct} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1">Nombre del Producto *</label>
            <input
              type="text"
              required
              value={productForm.nombre}
              onChange={(e) => setProductForm(prev => ({ ...prev, nombre: e.target.value }))}
              placeholder="Ej. Pastel de Zanahoria Tradicional, Cupcakes con Nuez"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-xs font-semibold focus:outline-none focus:border-[#0A2540]"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1">Descripción / Sabor</label>
            <textarea
              rows={3}
              value={productForm.descripcion}
              onChange={(e) => setProductForm(prev => ({ ...prev, descripcion: e.target.value }))}
              placeholder="Detalles del pastel, cobertura de queso crema, tamaño..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-xs font-medium focus:outline-none focus:border-[#0A2540]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">
                Rendimiento de Receta *
              </label>
              <input
                type="number"
                min={1}
                required
                value={productForm.rendimiento_tanda}
                onChange={(e) => setProductForm(prev => ({ ...prev, rendimiento_tanda: Number(e.target.value) }))}
                placeholder="24 para cupcakes, 1 para pastel"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-xs font-bold text-[#0A2540] focus:outline-none focus:border-[#0A2540]"
              />
              <span className="text-[10px] text-gray-500 mt-0.5 block">Ej: 24 (cupcakes) o 1 (pastel)</span>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">
                Tipo de Unidad *
              </label>
              <input
                type="text"
                required
                value={productForm.tipo_unidad}
                onChange={(e) => setProductForm(prev => ({ ...prev, tipo_unidad: e.target.value }))}
                placeholder="cupcakes, pasteles, piezas"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-xs font-semibold focus:outline-none focus:border-[#0A2540]"
              />
              <span className="text-[10px] text-gray-500 mt-0.5 block">Ej: pasteles, cupcakes, rebanadas</span>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1">Precio de Venta al Público (MXN) *</label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-500 font-bold">$</span>
              <input
                type="number"
                min={1}
                required
                value={productForm.precio}
                onChange={(e) => setProductForm(prev => ({ ...prev, precio: Number(e.target.value) }))}
                className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md text-xs font-bold text-emerald-700 focus:outline-none focus:border-[#0A2540]"
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-2 border-t border-gray-200">
            <button
              type="button"
              onClick={() => setIsProductSlideOverOpen(false)}
              className="px-4 py-2 border border-gray-300 rounded-md text-xs font-bold text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#0A2540] hover:bg-slate-800 text-white rounded-md text-xs font-bold shadow-sm"
            >
              {editingProduct ? 'Guardar Cambios' : 'Crear Producto'}
            </button>
          </div>
        </form>
      </SlideOver>

      {/* SLIDE-OVER: CREAR / EDITAR INGREDIENTE CON CANTIDAD NUMÉRICA Y UNIDAD SEPARADAS */}
      <SlideOver
        isOpen={isIngredientSlideOverOpen}
        onClose={() => setIsIngredientSlideOverOpen(false)}
        title={editingIngredient ? 'Editar Insumo' : 'Registrar Nuevo Insumo'}
      >
        <form onSubmit={handleSaveIngredient} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1">Nombre del Insumo *</label>
            <input
              type="text"
              required
              value={ingredientForm.nombre}
              onChange={(e) => setIngredientForm(prev => ({ ...prev, nombre: e.target.value }))}
              placeholder="Ej. Zanahorias Frescas, Queso Crema, Harina"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-xs font-semibold focus:outline-none focus:border-[#0A2540]"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1">Proveedor / Lugar de Compra</label>
            <input
              type="text"
              value={ingredientForm.proveedor}
              onChange={(e) => setIngredientForm(prev => ({ ...prev, proveedor: e.target.value }))}
              placeholder="Ej. Mercado San Juan, Abarrotes Central"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-xs font-medium focus:outline-none focus:border-[#0A2540]"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1">Costo de Compra del Paquete (MXN) *</label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-500 font-bold">$</span>
              <input
                type="number"
                min={0}
                step="any"
                required
                value={ingredientForm.precio}
                onChange={(e) => setIngredientForm(prev => ({ ...prev, precio: Number(e.target.value) }))}
                className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md text-xs font-bold text-emerald-700 focus:outline-none focus:border-[#0A2540]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">
                Cantidad Comprada *
              </label>
              <input
                type="number"
                min={0.01}
                step="any"
                required
                value={ingredientForm.cantidad_numerica}
                onChange={(e) => setIngredientForm(prev => ({ ...prev, cantidad_numerica: Number(e.target.value) }))}
                placeholder="Ej. 1, 190, 500"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-xs font-bold text-gray-900 focus:outline-none focus:border-[#0A2540]"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">
                Unidad de Medida *
              </label>
              <select
                value={ingredientForm.unidad_medida}
                onChange={(e) => setIngredientForm(prev => ({ ...prev, unidad_medida: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-xs font-bold text-gray-900 bg-white focus:outline-none focus:border-[#0A2540]"
              >
                <optgroup label="Masa / Peso">
                  <option value="kg">kg (Kilogramos)</option>
                  <option value="gr">gr (Gramos)</option>
                </optgroup>
                <optgroup label="Volumen / Líquidos">
                  <option value="litros">litros (Litros)</option>
                  <option value="ml">ml (Mililitros)</option>
                </optgroup>
                <optgroup label="Conteo">
                  <option value="pzas">pzas (Piezas)</option>
                </optgroup>
              </select>
            </div>
          </div>

          <div className="p-2.5 bg-slate-50 border border-gray-200 rounded-md text-[11px] text-gray-600">
            <span>Presentación registrada: </span>
            <strong className="text-gray-900 font-bold">
              {ingredientForm.cantidad_numerica || 1} {ingredientForm.unidad_medida || 'kg'} por ${ingredientForm.precio || 0}.00 MXN
            </strong>
          </div>

          <div className="pt-4 flex justify-end gap-2 border-t border-gray-200">
            <button
              type="button"
              onClick={() => setIsIngredientSlideOverOpen(false)}
              className="px-4 py-2 border border-gray-300 rounded-md text-xs font-bold text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#0A2540] hover:bg-slate-800 text-white rounded-md text-xs font-bold shadow-sm"
            >
              {editingIngredient ? 'Guardar Cambios' : 'Registrar Insumo'}
            </button>
          </div>
        </form>
      </SlideOver>
    </div>
  )
}
