import { API_BASE, handleApiResponse } from './api.client'
import type { Producto, ProductoConCosto, Ingrediente } from '../types'

// 1. Obtener catálogo de productos con desglose de costos por tanda de 24
export async function getProductsApi(): Promise<{
  success: boolean
  products: ProductoConCosto[]
}> {
  const res = await fetch(`${API_BASE}/products`)
  return handleApiResponse(res, 'Error al consultar productos.')
}

// 2. Crear o actualizar producto
export async function saveProductApi(product: Partial<Producto>): Promise<{
  success: boolean
  product: Producto
  message: string
}> {
  const res = await fetch(`${API_BASE}/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(product),
  })
  return handleApiResponse(res, 'Error al guardar el producto.')
}

// 3. Eliminar / Desactivar producto
export async function deleteProductApi(id: string): Promise<{
  success: boolean
  message: string
}> {
  const res = await fetch(`${API_BASE}/products/${id}`, {
    method: 'DELETE',
  })
  return handleApiResponse(res, 'Error al eliminar el producto.')
}

// 4. Obtener catálogo de ingredientes
export async function getIngredientsApi(): Promise<{
  success: boolean
  ingredients: Ingrediente[]
}> {
  const res = await fetch(`${API_BASE}/products/ingredients`)
  return handleApiResponse(res, 'Error al consultar ingredientes.')
}

// 5. Crear o actualizar ingrediente
export async function saveIngredientApi(ingredient: Partial<Ingrediente>): Promise<{
  success: boolean
  ingredient: Ingrediente
  message: string
}> {
  const res = await fetch(`${API_BASE}/products/ingredients`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ingredient),
  })
  return handleApiResponse(res, 'Error al guardar el ingrediente.')
}

// 6. Eliminar ingrediente
export async function deleteIngredientApi(id: string): Promise<{
  success: boolean
  message: string
}> {
  const res = await fetch(`${API_BASE}/products/ingredients/${id}`, {
    method: 'DELETE',
  })
  return handleApiResponse(res, 'Error al eliminar el ingrediente.')
}

// 7. Guardar o actualizar la receta de un producto (tandas de 24)
export async function saveRecipeApi(
  producto_id: string,
  items: Array<{
    ingrediente_id: string
    cantidad_necesaria: number
    unidad_medida: string
  }>
): Promise<{
  success: boolean
  message: string
}> {
  const res = await fetch(`${API_BASE}/products/recipe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ producto_id, items }),
  })
  return handleApiResponse(res, 'Error al guardar la receta del producto.')
}
