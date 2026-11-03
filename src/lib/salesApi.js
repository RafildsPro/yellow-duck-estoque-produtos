import { supabase } from './supabase'

// O banco devolve estes códigos quando o supabase/vendas.sql ainda não foi rodado.
export const MISSING_SETUP_CODES = ['PGRST205', 'PGRST202', '42P01']

function friendly(error) {
  if (MISSING_SETUP_CODES.includes(error.code)) {
    return 'Falta rodar o arquivo supabase/vendas.sql no Supabase.'
  }
  return error.message
}

// Registra a venda e, se for produto físico, dá baixa no estoque, tudo numa operação só.
export async function registerSaleRpc(sale) {
  const { data, error } = await supabase.rpc('register_sale', {
    p_kind: sale.kind,
    p_description: sale.description ?? null,
    p_product_id: sale.productId ?? null,
    p_quantity: sale.quantity ?? 1,
    p_amount: sale.amount,
    p_discount: sale.discount ?? 0,
    p_fee: 0,
    p_channel: sale.channel ?? null,
    p_account: sale.account ?? null,
    p_sold_at: sale.soldAt ?? null,
    p_base_amount: sale.baseAmount ?? null,
    p_commission_pct: sale.commissionPct ?? null,
    p_unit_cost: null,
    p_notes: sale.notes ?? null,
  })
  if (error) throw new Error(friendly(error))
  return data
}

// Desfaz a venda e devolve as unidades ao estoque, se era produto físico.
export async function deleteSaleRpc(id) {
  const { error } = await supabase.rpc('delete_sale', { p_sale_id: id })
  if (error) throw new Error(friendly(error))
}
