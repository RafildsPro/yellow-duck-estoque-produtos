// Chamado uma vez por dia pelo Vercel Cron (ver vercel.json) para o projeto gratuito do
// Supabase não ficar parado e ser pausado por inatividade. Não devolve nenhum dado do estoque.
export default async function handler(req, res) {
  const url = process.env.VITE_SUPABASE_URL
  const key = process.env.VITE_SUPABASE_ANON_KEY

  res.setHeader('Content-Type', 'application/json')

  if (!url || !key) {
    res.statusCode = 500
    res.end(JSON.stringify({ ok: false, error: 'Variáveis do Supabase não configuradas.' }))
    return
  }

  try {
    const response = await fetch(`${url}/rest/v1/products?select=id&limit=1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    })
    res.statusCode = response.ok ? 200 : 502
    res.end(JSON.stringify({ ok: response.ok, status: response.status }))
  } catch (err) {
    res.statusCode = 502
    res.end(JSON.stringify({ ok: false, error: String(err.message || err) }))
  }
}
