import { Hono } from 'hono'
import { supabaseServer } from '../lib/supabase.js'
import { serverCache } from '../lib/cache.js'
import { requireAdmin } from '../lib/authMiddleware.js'

export const productsRouter = new Hono()

// Tipos de magnitudes para conversiones
type UnitCategory = 'masa' | 'volumen' | 'unidades' | 'desconocido'

interface UnitInfo {
  category: UnitCategory
  baseFactor: number // factor para llevar a la unidad base (gr, ml, pzas)
  baseUnit: string
}

export function getUnitCategory(unitStr?: string | null): UnitInfo {
  if (!unitStr) return { category: 'desconocido', baseFactor: 1, baseUnit: '' }
  const u = unitStr.trim().toLowerCase()

  // Masa / Peso -> Base: gramos (gr)
  if (['kg', 'kilo', 'kilos', 'kilogramo', 'kilogramos'].includes(u)) {
    return { category: 'masa', baseFactor: 1000, baseUnit: 'gr' }
  }
  if (['gr', 'g', 'gramo', 'gramos'].includes(u)) {
    return { category: 'masa', baseFactor: 1, baseUnit: 'gr' }
  }
  if (['mg', 'miligramo', 'miligramos'].includes(u)) {
    return { category: 'masa', baseFactor: 0.001, baseUnit: 'gr' }
  }

  // Volumen / Líquidos -> Base: mililitros (ml)
  if (['litro', 'litros', 'lt', 'l', 'lts'].includes(u)) {
    return { category: 'volumen', baseFactor: 1000, baseUnit: 'ml' }
  }
  if (['ml', 'mililitro', 'mililitros', 'cc'].includes(u)) {
    return { category: 'volumen', baseFactor: 1, baseUnit: 'ml' }
  }

  // Conteo / Piezas -> Base: piezas (pzas)
  if (['pza', 'pzas', 'pieza', 'piezas', 'unidad', 'unidades'].includes(u)) {
    return { category: 'unidades', baseFactor: 1, baseUnit: 'pzas' }
  }
  if (['docena', 'docenas'].includes(u)) {
    return { category: 'unidades', baseFactor: 12, baseUnit: 'pzas' }
  }
  if (['cda', 'cdas', 'cucharada', 'cucharadas'].includes(u)) {
    return { category: 'masa', baseFactor: 15, baseUnit: 'gr' }
  }
  if (['cdita', 'cditas', 'cucharadita', 'cucharaditas'].includes(u)) {
    return { category: 'masa', baseFactor: 5, baseUnit: 'gr' }
  }

  return { category: 'desconocido', baseFactor: 1, baseUnit: u }
}

// Cálculo del costo de un insumo en una receta con validación de compatibilidad de unidades
export function calculateIngredientRecipeCost(
  precioCompra: number,
  cantidadCompra: number,
  unidadCompra: string,
  cantidadReceta: number,
  unidadReceta: string
): { costo: number; valida: boolean; error?: string } {
  if (precioCompra <= 0 || cantidadCompra <= 0 || cantidadReceta <= 0) {
    return { costo: 0, valida: true }
  }

  const compInfo = getUnitCategory(unidadCompra)
  const recInfo = getUnitCategory(unidadReceta)

  // Validación: si ambas son conocidas pero de categorías diferentes (ej. masa vs volumen vs unidades)
  if (
    compInfo.category !== 'desconocido' && 
    recInfo.category !== 'desconocido' && 
    compInfo.category !== recInfo.category
  ) {
    return {
      costo: 0,
      valida: false,
      error: `Conversión imposible: no se puede convertir de '${unidadCompra}' (${compInfo.category}) a '${unidadReceta}' (${recInfo.category}).`
    }
  }

  // Total base de compra (ej. 1 kg * 1000 = 1000 gr; 190 gr * 1 = 190 gr)
  const totalBaseComprado = cantidadCompra * compInfo.baseFactor
  // Total base usado en la receta (ej. 350 gr * 1 = 350 gr; 0.5 kg * 1000 = 500 gr)
  const totalBaseUsado = cantidadReceta * recInfo.baseFactor

  if (totalBaseComprado <= 0) {
    return { costo: 0, valida: false, error: 'Cantidad de compra inválida.' }
  }

  const costoPorBase = precioCompra / totalBaseComprado
  const costoTotal = costoPorBase * totalBaseUsado

  return {
    costo: Math.round(costoTotal * 100) / 100,
    valida: true
  }
}

// 1. GET /api/products -> Catálogo de productos con análisis de recetas y costos (con caché en memoria)
productsRouter.get('/', async (c) => {
  try {
    const cachedProducts = serverCache.get<any[]>('products_full')
    if (cachedProducts) {
      return c.json({ success: true, products: cachedProducts, cached: true })
    }

    const [prodRes, recetasRes] = await Promise.all([
      supabaseServer
        .from('productos')
        .select('*')
        .order('fecha_creacion', { ascending: true }),
      supabaseServer
        .from('producto_ingredientes')
        .select(`
          id,
          producto_id,
          ingrediente_id,
          cantidad_necesaria,
          unidad_medida,
          ingredientes (
            id,
            nombre,
            precio,
            cantidad,
            cantidad_numerica,
            unidad_medida,
            proveedor,
            descripcion
          )
        `)
    ])

    if (prodRes.error) {
      return c.json({ error: 'Error al consultar productos.' }, 500)
    }

    const productos = prodRes.data || []
    const recetas = recetasRes.data || []

    const productosConCostos = productos.map((prod) => {
      const batchSize = Math.max(1, Number(prod.rendimiento_tanda || 24))
      const tipoUnidad = prod.tipo_unidad || 'piezas'
      const ingredientesReceta = (recetas || []).filter((r) => r.producto_id === prod.id)
      
      let costoTotalTanda = 0
      const desgloseIngredientes = ingredientesReceta.map((r: any) => {
        const ing = r.ingredientes
        const precioPaquete = Number(ing?.precio || 0)
        
        let cantidadCompra = Number(ing?.cantidad_numerica || 0)
        let unidadCompra = ing?.unidad_medida || 'kg'
        
        // Si no tiene cantidad_numerica estructurada, intentar parsear del string 'cantidad'
        if (cantidadCompra <= 0 && ing?.cantidad) {
          const m = ing.cantidad.match(/[\d.]+/)
          cantidadCompra = m ? parseFloat(m[0]) : 1
          if (ing.cantidad.toLowerCase().includes('kg')) unidadCompra = 'kg'
          else if (ing.cantidad.toLowerCase().includes('gr')) unidadCompra = 'gr'
          else if (ing.cantidad.toLowerCase().includes('litro') || ing.cantidad.toLowerCase().includes('lt')) unidadCompra = 'litros'
          else if (ing.cantidad.toLowerCase().includes('ml')) unidadCompra = 'ml'
          else if (ing.cantidad.toLowerCase().includes('pza')) unidadCompra = 'pzas'
        }

        if (cantidadCompra <= 0) cantidadCompra = 1

        const cantidadEnTanda = Number(r.cantidad_necesaria || 0)
        const unidadEnTanda = r.unidad_medida || unidadCompra || 'gr'

        const calc = calculateIngredientRecipeCost(
          precioPaquete,
          cantidadCompra,
          unidadCompra,
          cantidadEnTanda,
          unidadEnTanda
        )

        costoTotalTanda += calc.costo

        return {
          id: r.id,
          ingrediente_id: r.ingrediente_id,
          nombre_ingrediente: ing?.nombre || 'Ingrediente',
          proveedor: ing?.proveedor,
          precio_paquete: precioPaquete,
          presentacion_paquete: ing?.cantidad || `${cantidadCompra} ${unidadCompra}`,
          cantidad_compra: cantidadCompra,
          unidad_compra: unidadCompra,
          cantidad_en_tanda: cantidadEnTanda,
          unidad_medida: unidadEnTanda,
          costo_tanda: calc.costo,
          costo_unitario: Math.round((calc.costo / batchSize) * 100) / 100,
          conversion_valida: calc.valida,
          error_conversion: calc.error || null
        }
      })

      const precioVenta = Number(prod.precio || 20)
      const costoUnitario = batchSize > 0 ? costoTotalTanda / batchSize : costoTotalTanda
      const ingresoPorTanda = precioVenta * batchSize
      const gananciaPorTanda = ingresoPorTanda - costoTotalTanda
      const gananciaUnitaria = precioVenta - costoUnitario
      const margenPorcentaje = precioVenta > 0 ? Math.round((gananciaUnitaria / precioVenta) * 100) : 0

      return {
        ...prod,
        rendimiento_tanda: batchSize,
        tipo_unidad: tipoUnidad,
        batch_size: batchSize,
        precio_venta: precioVenta,
        costo_tanda: Math.round(costoTotalTanda * 100) / 100,
        costo_unitario: Math.round(costoUnitario * 100) / 100,
        ingreso_tanda: ingresoPorTanda,
        ganancia_tanda: Math.round(gananciaPorTanda * 100) / 100,
        ganancia_unitaria: Math.round(gananciaUnitaria * 100) / 100,
        margen_porcentaje: margenPorcentaje,
        ingredientes_count: ingredientesReceta.length,
        receta: desgloseIngredientes
      }
    })

    serverCache.set('products_full', productosConCostos, 300)
    return c.json({ success: true, products: productosConCostos })
  } catch (err: any) {
    console.error('Error en GET /products:', err)
    return c.json({ error: 'Error al consultar productos y costos.' }, 500)
  }
})

// 2. POST /api/products -> Crear o actualizar producto (Solo Admin)
productsRouter.post('/', requireAdmin, async (c) => {
  try {
    const { id, nombre, descripcion, precio, rendimiento_tanda, tipo_unidad, activo } = await c.req.json()

    if (!nombre) {
      return c.json({ error: 'El nombre del producto es obligatorio.' }, 400)
    }

    const payload: any = {
      nombre: nombre.trim(),
      descripcion: descripcion || '',
      precio: Number(precio || 20),
      rendimiento_tanda: Math.max(1, Number(rendimiento_tanda || 24)),
      tipo_unidad: tipo_unidad || 'piezas',
      activo: activo !== undefined ? Boolean(activo) : true,
    }

    // Invalidar caché de productos y métricas
    serverCache.invalidate('products_full')
    serverCache.invalidate('admin_metrics')

    if (id) {
      const { data, error } = await supabaseServer
        .from('productos')
        .update(payload)
        .eq('id', id)
        .select()
        .single()

      if (error) return c.json({ error: error.message }, 500)
      return c.json({ success: true, product: data, message: 'Producto actualizado exitosamente.' })
    } else {
      const { data, error } = await supabaseServer
        .from('productos')
        .insert(payload)
        .select()
        .single()

      if (error) return c.json({ error: error.message }, 500)
      return c.json({ success: true, product: data, message: 'Producto creado exitosamente.' })
    }
  } catch (err: any) {
    return c.json({ error: 'Error al guardar producto.' }, 500)
  }
})

// 3. DELETE /api/products/:id -> Desactivar o eliminar producto (Solo Admin)
productsRouter.delete('/:id', requireAdmin, async (c) => {
  try {
    const id = c.req.param('id')
    serverCache.invalidate('products_full')
    serverCache.invalidate('admin_metrics')

    const { error } = await supabaseServer
      .from('productos')
      .delete()
      .eq('id', id)

    if (error) {
      await supabaseServer.from('productos').update({ activo: false }).eq('id', id)
    }

    return c.json({ success: true, message: 'Producto eliminado correctamente.' })
  } catch (err: any) {
    return c.json({ error: 'Error al eliminar producto.' }, 500)
  }
})

// 4. GET /api/products/ingredients -> Lista de ingredientes (con caché)
productsRouter.get('/ingredients', async (c) => {
  try {
    const cached = serverCache.get<any[]>('ingredients_list')
    if (cached) {
      return c.json({ success: true, ingredients: cached, cached: true })
    }

    const { data: ingredientes, error } = await supabaseServer
      .from('ingredientes')
      .select('*')
      .order('nombre', { ascending: true })

    if (error) return c.json({ error: error.message }, 500)
    
    serverCache.set('ingredients_list', ingredientes || [], 300)
    return c.json({ success: true, ingredients: ingredientes || [] })
  } catch (err: any) {
    return c.json({ error: 'Error al consultar ingredientes.' }, 500)
  }
})

// 5. POST /api/products/ingredients -> Crear o actualizar ingrediente (Solo Admin)
productsRouter.post('/ingredients', requireAdmin, async (c) => {
  try {
    const { id, nombre, descripcion, proveedor, precio, cantidad_numerica, unidad_medida, cantidad } = await c.req.json()

    if (!nombre) {
      return c.json({ error: 'El nombre del ingrediente es obligatorio.' }, 400)
    }

    serverCache.invalidate('ingredients_list')
    serverCache.invalidate('products_full')

    const cantNum = Number(cantidad_numerica || (cantidad ? parseFloat(cantidad) : 1)) || 1
    const unitMed = unidad_medida || 'kg'
    const presentationStr = `${cantNum} ${unitMed}`

    const payload: any = {
      nombre: nombre.trim(),
      descripcion: descripcion || '',
      proveedor: proveedor || '',
      precio: Number(precio || 0),
      cantidad_numerica: cantNum,
      unidad_medida: unitMed,
      cantidad: presentationStr,
    }

    if (id) {
      const { data, error } = await supabaseServer
        .from('ingredientes')
        .update(payload)
        .eq('id', id)
        .select()
        .single()

      if (error) return c.json({ error: error.message }, 500)
      return c.json({ success: true, ingredient: data, message: 'Insumo actualizado exitosamente.' })
    } else {
      const { data, error } = await supabaseServer
        .from('ingredientes')
        .insert(payload)
        .select()
        .single()

      if (error) return c.json({ error: error.message }, 500)
      return c.json({ success: true, ingredient: data, message: 'Insumo registrado exitosamente.' })
    }
  } catch (err: any) {
    return c.json({ error: 'Error al guardar ingrediente.' }, 500)
  }
})

// 6. DELETE /api/products/ingredients/:id -> Eliminar ingrediente (Solo Admin)
productsRouter.delete('/ingredients/:id', requireAdmin, async (c) => {
  try {
    const id = c.req.param('id')
    serverCache.invalidate('ingredients_list')
    serverCache.invalidate('products_full')

    const { error } = await supabaseServer
      .from('ingredientes')
      .delete()
      .eq('id', id)

    if (error) return c.json({ error: error.message }, 500)
    return c.json({ success: true, message: 'Insumo eliminado.' })
  } catch (err: any) {
    return c.json({ error: 'Error al eliminar ingrediente.' }, 500)
  }
})

// 7. POST /api/products/recipe -> Guardar o actualizar la receta de un producto (Solo Admin)
productsRouter.post('/recipe', requireAdmin, async (c) => {
  try {
    const { producto_id, items } = await c.req.json()

    if (!producto_id) {
      return c.json({ error: 'Se requiere ID del producto.' }, 400)
    }

    serverCache.invalidate('products_full')

    // 1. Eliminar vínculos previos
    await supabaseServer
      .from('producto_ingredientes')
      .delete()
      .eq('producto_id', producto_id)

    // 2. Insertar nueva receta si hay items
    if (Array.isArray(items) && items.length > 0) {
      const rows = items.map((item: any) => ({
        producto_id,
        ingrediente_id: item.ingrediente_id,
        cantidad_necesaria: Number(item.cantidad_necesaria || 0),
        unidad_medida: item.unidad_medida || 'gr'
      }))

      const { error: insErr } = await supabaseServer
        .from('producto_ingredientes')
        .insert(rows)

      if (insErr) {
        return c.json({ error: `Error al guardar receta: ${insErr.message}` }, 500)
      }
    }

    return c.json({ success: true, message: 'Receta actualizada exitosamente.' })
  } catch (err: any) {
    return c.json({ error: 'Error al actualizar receta.' }, 500)
  }
})
