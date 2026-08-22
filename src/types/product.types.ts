export interface Producto {
  id: string
  nombre: string
  descripcion?: string | null
  precio?: number | null
  rendimiento_tanda?: number | null // ej: 24 para cupcakes, 1 para pastel
  tipo_unidad?: string | null // ej: 'cupcakes', 'pasteles', 'piezas'
  activo?: boolean
  fecha_creacion?: string
}

export interface Ingrediente {
  id: string
  nombre: string
  descripcion?: string | null
  proveedor?: string | null
  precio?: number | null
  cantidad?: string | null
  cantidad_numerica?: number | null
  unidad_medida?: string | null // 'kg', 'gr', 'litros', 'ml', 'pzas'
  fecha_creacion?: string
}

export interface ProductoIngrediente {
  id: string
  producto_id?: string | null
  ingrediente_id?: string | null
  cantidad_necesaria?: number | null
  unidad_medida?: string | null
  fecha_creacion?: string
  producto?: Producto
  ingrediente?: Ingrediente
}

export interface IngredienteRecetaDetalle {
  id: string
  ingrediente_id: string
  nombre_ingrediente: string
  proveedor?: string | null
  precio_paquete: number
  presentacion_paquete?: string | null
  cantidad_compra?: number | null
  unidad_compra?: string | null
  cantidad_en_tanda: number
  unidad_medida: string
  costo_tanda: number
  costo_unitario: number
  conversion_valida?: boolean
  error_conversion?: string | null
}

export interface ProductoConCosto extends Producto {
  rendimiento_tanda: number // ej: 24 para cupcakes, 1 para pastel
  tipo_unidad: string // ej: 'cupcakes', 'pasteles'
  batch_size: number
  precio_venta: number
  costo_tanda: number
  costo_unitario: number
  ingreso_tanda: number
  ganancia_tanda: number
  ganancia_unitaria: number
  margen_porcentaje: number
  ingredientes_count: number
  receta: IngredienteRecetaDetalle[]
}
