// Leitura e gravação dos arquivos da Vitrine pela API do GitHub.
const API = 'https://api.github.com'

export class GitHubError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status
  }
}

export function createGitHub({ token, repo, branch }) {
  async function request(path, { method = 'GET', body } = {}) {
    const response = await fetch(`${API}/repos/${repo}${path}`, {
      method,
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'yellow-duck-estoque',
        'X-GitHub-Api-Version': '2022-11-28',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    })
    const data = await response.json().catch(() => null)
    if (!response.ok) {
      throw new GitHubError(data?.message || `O GitHub respondeu ${response.status}.`, response.status)
    }
    return data
  }

  return {
    hasToken: Boolean(token),

    // Lê os arquivos exatamente como estão em um commit só, e guarda qual commit foi esse.
    // Assim, se alguém editar a Vitrine no meio do caminho, a gravação é recusada em vez de sobrescrever.
    async readSnapshot(paths) {
      const ref = await request(`/git/ref/heads/${encodeURIComponent(branch)}`)
      const headSha = ref.object.sha
      const texts = await Promise.all(
        paths.map(async (path) => {
          try {
            const data = await request(`/contents/${path}?ref=${headSha}`)
            return Buffer.from(data.content, 'base64').toString('utf8')
          } catch (err) {
            if (err.status === 404) return null
            throw err
          }
        })
      )
      return { headSha, texts }
    },

    // Um único commit com todos os arquivos alterados.
    async commit({ headSha, files, message }) {
      const head = await request(`/git/commits/${headSha}`)
      const tree = await request('/git/trees', {
        method: 'POST',
        body: {
          base_tree: head.tree.sha,
          tree: files.map((f) => ({ path: f.path, mode: '100644', type: 'blob', content: f.text })),
        },
      })
      const commit = await request('/git/commits', {
        method: 'POST',
        body: { message, tree: tree.sha, parents: [headSha] },
      })
      try {
        await request(`/git/refs/heads/${encodeURIComponent(branch)}`, {
          method: 'PATCH',
          body: { sha: commit.sha },
        })
      } catch (err) {
        if (err.status === 422) {
          throw new GitHubError(
            'A Vitrine mudou enquanto publicávamos. Veja de novo o que vai mudar e publique outra vez.',
            409
          )
        }
        throw err
      }
      return { sha: commit.sha, url: `https://github.com/${repo}/commit/${commit.sha}` }
    },
  }
}
