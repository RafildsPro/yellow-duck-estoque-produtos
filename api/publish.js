// Publica na Vitrine os produtos marcados no estoque (ver server/vitrineSync.js).
// POST { dryRun?: boolean }. Sem dryRun === false, só mostra o que mudaria e não grava nada.
import { createGitHub, GitHubError } from '../server/github.js'
import { computeSync, filePathOf, VITRINE_KEYS } from '../server/vitrineSync.js'

const REPO = process.env.VITRINE_REPO || 'RafildsPro/yellow-vitrine'
const BRANCH = process.env.VITRINE_BRANCH || 'main'

function send(res, status, body) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}

async function readBody(req) {
  const parse = (text) => {
    try {
      return text ? JSON.parse(text) : {}
    } catch {
      return {}
    }
  }
  if (req.body !== undefined) return typeof req.body === 'string' ? parse(req.body) : req.body ?? {}
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  return parse(Buffer.concat(chunks).toString('utf8'))
}

async function isLoggedIn(url, anonKey, token) {
  if (!token) return false
  const response = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${token}` },
  })
  return response.ok
}

// Só pede as colunas que a Vitrine usa: custo e quantidade de venda nunca saem daqui.
async function loadProducts(url, anonKey, bearer) {
  const headers = { apikey: anonKey, Authorization: `Bearer ${bearer}` }
  const query = (columns) =>
    `${url}/rest/v1/products?select=${columns}&order=created_at.desc&limit=5000`
  const columns = 'id,name,category,quantity,sale_price,photo_url'

  const full = await fetch(query(`${columns},store_status`), { headers })
  if (full.ok) return { products: await full.json(), hasStatus: true }

  const error = await full.json().catch(() => null)
  // 42703 = coluna inexistente: o SQL do status da Vitrine ainda não foi rodado.
  if (error?.code === '42703') {
    const basic = await fetch(query(columns), { headers })
    if (basic.ok) return { products: await basic.json(), hasStatus: false }
  }
  throw new Error(error?.message || `O Supabase respondeu ${full.status}.`)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { ok: false, error: 'Use POST.' })

  const url = process.env.VITE_SUPABASE_URL
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY
  if (!url || !anonKey) {
    return send(res, 500, { ok: false, code: 'config', error: 'Variáveis do Supabase não configuradas.' })
  }

  const body = await readBody(req)
  const dryRun = body.dryRun !== false
  const userToken = (req.headers.authorization || '').replace(/^Bearer\s+/i, '') || null

  // Com o login desativado qualquer um pode chamar. Quando o login voltar, definir
  // REQUIRE_LOGIN_TO_PUBLISH=true no Vercel para só aceitar quem está logado.
  if (process.env.REQUIRE_LOGIN_TO_PUBLISH === 'true' && !(await isLoggedIn(url, anonKey, userToken))) {
    return send(res, 401, { ok: false, code: 'login', error: 'Faça login para publicar.' })
  }

  const github = createGitHub({ token: process.env.VITRINE_GITHUB_TOKEN, repo: REPO, branch: BRANCH })
  if (!dryRun && !github.hasToken) {
    return send(res, 400, {
      ok: false,
      code: 'no_token',
      error: 'Falta configurar o token do GitHub (VITRINE_GITHUB_TOKEN) no Vercel.',
    })
  }

  try {
    const { products, hasStatus } = await loadProducts(url, anonKey, userToken || anonKey)

    // Sem a coluna, todo produto pareceria oculto e a publicação tiraria os itens da Vitrine.
    if (!hasStatus) {
      return send(res, 409, {
        ok: false,
        code: 'missing_status_column',
        error: 'O banco ainda não tem o controle da Vitrine. Rode o arquivo supabase/vitrine_status.sql no Supabase.',
      })
    }
    // Banco trancado ou vazio: não há o que comparar, então não mexe em nada.
    if (products.length === 0) {
      return send(res, 409, {
        ok: false,
        code: 'no_products',
        error: 'Nenhum produto foi lido do estoque, então não dá para publicar.',
      })
    }

    const paths = VITRINE_KEYS.map(filePathOf)
    const { headSha, texts } = await github.readSnapshot(paths)
    const files = Object.fromEntries(VITRINE_KEYS.map((key, i) => [key, texts[i]]))
    const result = computeSync(products, files)

    const preview = {
      ok: true,
      dryRun,
      committed: false,
      summary: result.summary,
      changes: result.changes,
      vitrineOnly: result.vitrineOnly,
    }

    if (dryRun || result.files.length === 0) return send(res, 200, preview)

    const commit = await github.commit({
      headSha,
      files: result.files,
      message: `Atualiza vitrine a partir do estoque (${result.files.length} ${
        result.files.length === 1 ? 'arquivo' : 'arquivos'
      })`,
    })
    return send(res, 200, { ...preview, committed: true, commit })
  } catch (err) {
    const status = err instanceof GitHubError && err.status === 409 ? 409 : 502
    return send(res, status, {
      ok: false,
      code: err instanceof GitHubError ? 'github' : 'supabase',
      error: String(err.message || err),
    })
  }
}
