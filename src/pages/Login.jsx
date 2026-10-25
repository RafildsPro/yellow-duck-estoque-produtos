import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const inputClass =
  'w-full rounded-lg border border-navy-600 bg-navy-800 px-3 py-2 text-gray-100 outline-none focus:border-gold-500'

export default function Login() {
  const { session, signIn, resetPassword } = useAuth()
  const [forgot, setForgot] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(false)

  if (session) return <Navigate to="/" replace />

  function switchMode(next) {
    setForgot(next)
    setError('')
    setNotice('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setNotice('')
    setLoading(true)

    if (forgot) {
      const { error } = await resetPassword(email)
      setLoading(false)
      if (error) {
        setError(
          error.status === 429
            ? 'Muitos pedidos seguidos. Espere alguns minutos e tente de novo.'
            : 'Não foi possível enviar o e-mail agora. Tente de novo em instantes.'
        )
      } else {
        setNotice(
          'Se esse e-mail tiver cadastro, enviamos um link para criar uma nova senha. Olhe também o spam.'
        )
      }
      return
    }

    const { error } = await signIn(email, password)
    setLoading(false)
    if (error) setError('E-mail ou senha inválidos.')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-navy-950 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-navy-700 bg-navy-900 p-8 shadow-xl">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-gold-500">Yellow Duck TCG</h1>
          <p className="mt-1 text-sm text-gray-400">
            {forgot ? 'Recuperar senha' : 'Controle de Estoque'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-gray-300">E-mail</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              placeholder="voce@exemplo.com"
            />
          </div>

          {!forgot && (
            <div>
              <label className="mb-1 block text-sm text-gray-300">Senha</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
                placeholder="••••••••"
              />
            </div>
          )}

          {error && <p className="text-sm text-red-400">{error}</p>}
          {notice && <p className="text-sm text-green-400">{notice}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-gold-500 py-2 font-semibold text-navy-950 transition-colors hover:bg-gold-400 disabled:opacity-60"
          >
            {forgot
              ? loading
                ? 'Enviando...'
                : 'Enviar link para nova senha'
              : loading
                ? 'Entrando...'
                : 'Entrar'}
          </button>

          <button
            type="button"
            onClick={() => switchMode(!forgot)}
            className="w-full text-center text-sm text-gray-400 hover:text-gold-500"
          >
            {forgot ? 'Voltar para o login' : 'Esqueci minha senha'}
          </button>
        </form>
      </div>
    </div>
  )
}
