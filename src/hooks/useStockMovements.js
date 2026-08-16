import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useStockMovements() {
  const [movements, setMovements] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchMovements = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('stock_movements')
      .select('*, products(name, sale_price)')
      .order('created_at', { ascending: false })

    if (error) setError(error.message)
    else setMovements(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchMovements()
  }, [fetchMovements])

  return { movements, loading, error, refetch: fetchMovements }
}
