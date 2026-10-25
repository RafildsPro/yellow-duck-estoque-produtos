import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useProducts() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) setError(error.message)
    else setProducts(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  async function createProduct(payload) {
    const { data, error } = await supabase.from('products').insert(payload).select().single()
    if (error) throw error
    setProducts((prev) => [data, ...prev])
    return data
  }

  async function updateProduct(id, payload) {
    const { data, error } = await supabase
      .from('products')
      .update(payload)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    setProducts((prev) => prev.map((p) => (p.id === id ? data : p)))
    return data
  }

  // Muda o status da Vitrine (hidden, visible, presale) de vários produtos de uma vez.
  async function setStoreStatus(ids, status) {
    const { error } = await supabase.from('products').update({ store_status: status }).in('id', ids)
    if (error) throw error
    const changed = new Set(ids)
    setProducts((prev) => prev.map((p) => (changed.has(p.id) ? { ...p, store_status: status } : p)))
  }

  async function deleteProduct(id) {
    const { error } = await supabase.from('products').delete().eq('id', id)
    if (error) throw error
    setProducts((prev) => prev.filter((p) => p.id !== id))
  }

  async function registerStockOut(product, quantityOut, reason) {
    const newQuantity = Math.max(product.quantity - quantityOut, 0)
    const updated = await updateProduct(product.id, { quantity: newQuantity })

    const { error } = await supabase.from('stock_movements').insert({
      product_id: product.id,
      quantity_change: -quantityOut,
      reason: reason || null,
    })
    if (error) throw error

    return updated
  }

  return {
    products,
    loading,
    error,
    refetch: fetchProducts,
    createProduct,
    updateProduct,
    setStoreStatus,
    deleteProduct,
    registerStockOut,
  }
}
