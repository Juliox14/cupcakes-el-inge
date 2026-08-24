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
import { toast } from '../../context/ToastContext'
import { RecipeFormView } from './products/RecipeFormView'
import { ProductFormSlideOver } from './products/ProductFormSlideOver'
import { IngredientFormSlideOver } from './products/IngredientFormSlideOver'

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

      const msg = res.message || 'Producto guardado exitosamente.'
      setFeedbackMsg({ text: msg, type: 'success' })
      toast.success(msg)
      setIsProductSlideOverOpen(false)
      loadAllData()
    } catch (err: any) {
      const msg = err.message || 'Error al guardar producto.'
      setFeedbackMsg({ text: msg, type: 'error' })
      toast.error(msg)
    }
  }

  const handleDeleteProduct = async (id: string) => {
    if (!window.confirm('¿Seguro que deseas eliminar este producto?')) return
    
    // Eliminación optimista inmediata en 0ms
    setProducts(prev => prev.filter(p => p.id !== id))
    setFeedbackMsg({ text: 'Producto eliminado.', type: 'success' })
    toast.success('Producto eliminado correctamente.')

    try {
      await deleteProductApi(id)
      loadAllData()
    } catch (err: any) {
      const msg = err.message || 'Error al eliminar producto.'
      setFeedbackMsg({ text: msg, type: 'error' })
      toast.error(msg)
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

      const msg = res.message || 'Insumo guardado exitosamente.'
      setFeedbackMsg({ text: msg, type: 'success' })
      toast.success(msg)
      loadAllData()
    } catch (err: any) {
      const msg = err.message || 'Error al guardar ingrediente.'
      setFeedbackMsg({ text: msg, type: 'error' })
      toast.error(msg)
    }
  }

  const handleDeleteIngredient = async (id: string) => {
    if (!window.confirm('¿Seguro que deseas eliminar este ingrediente?')) return

    // Eliminación optimista inmediata en 0ms
    setIngredients(prev => prev.filter(i => i.id !== id))
    setFeedbackMsg({ text: 'Insumo eliminado.', type: 'success' })
    toast.success('Insumo eliminado correctamente.')

    try {
      await deleteIngredientApi(id)
      loadAllData()
    } catch (err: any) {
      const msg = err.message || 'Error al eliminar ingrediente.'
      setFeedbackMsg({ text: msg, type: 'error' })
      toast.error(msg)
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
      <div className="flex border-b border-gray-200 text-xs font-bold gap-4 sm:gap-6 overflow-x-auto whitespace-nowrap">
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
        <RecipeFormView
          products={products}
          selectedProductForRecipe={selectedProductForRecipe}
          setSelectedProductForRecipe={setSelectedProductForRecipe}
          availableIngredientsForRecipe={availableIngredientsForRecipe}
          pendingIngredientToAdd={pendingIngredientToAdd}
          setPendingIngredientToAdd={setPendingIngredientToAdd}
          onAddSelectedIngredient={handleAddSelectedIngredient}
          recipeItems={recipeItems}
          ingredients={ingredients}
          recipeSortField={recipeSortField}
          recipeSortDirection={recipeSortDirection}
          onRecipeSort={handleRecipeSort}
          onUpdateRecipeItem={handleUpdateRecipeItem}
          onRemoveRecipeItem={handleRemoveRecipeItem}
          liveMetrics={liveMetrics}
          calculateLiveIngredientCost={calculateLiveIngredientCost}
          getUnitMagnitude={getUnitMagnitude}
        />
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

      {/* SlideOver: Crear / Editar Producto */}
      <ProductFormSlideOver
        isOpen={isProductSlideOverOpen}
        onClose={() => setIsProductSlideOverOpen(false)}
        editingProduct={editingProduct}
        productForm={productForm}
        setProductForm={setProductForm}
        onSubmit={handleSaveProduct}
      />

      {/* SlideOver: Crear / Editar Insumo */}
      <IngredientFormSlideOver
        isOpen={isIngredientSlideOverOpen}
        onClose={() => setIsIngredientSlideOverOpen(false)}
        editingIngredient={editingIngredient}
        ingredientForm={ingredientForm}
        setIngredientForm={setIngredientForm}
        onSubmit={handleSaveIngredient}
      />
    </div>
  )
}
