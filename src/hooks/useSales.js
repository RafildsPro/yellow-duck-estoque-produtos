import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { MISSING_SETUP_CODES, deleteSaleRpc, registerSaleRpc, updateSaleRpc } from '../lib/salesApi'

export function useSales() {
  const [sales, setSales] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  // true enquanto o supabase/vendas.sql não foi rodado: as telas avisam em vez de quebrar.
  const [missingSetup, setMissingSetup] = useState(false)

  const fetchSales = useCallback(async () => {
    const { data, error } = await supabase
      .from('sales')
      .select('*')
      .order('sold_at', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(5000)

    if (error) {
      if (MISSING_SETUP_CODES.includes(error.code)) setMissingSetup(true)
      else setError(error.message)
    } else {
      setSales(data)
      setMissingSetup(false)
      setError('')
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchSales()
  }, [fetchSales])

  async function registerSale(sale) {
    const id = await registerSaleRpc(sale)
    await fetchSales()
    return id
  }

  async function updateSale(id, sale) {
    await updateSaleRpc(id, sale)
    await fetchSales()
  }

  async function deleteSale(id) {
    await deleteSaleRpc(id)
    await fetchSales()
  }

  return { sales, loading, error, missingSetup, refetch: fetchSales, registerSale, updateSale, deleteSale }
}
