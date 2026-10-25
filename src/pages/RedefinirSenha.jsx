import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const inputClass =
  'w-full rounded-lg border border-navy-600 bg-navy-800 px-3 py-2 text-gray-100 outline-none focus:border-gold-500'

const MIN_LENGTH = 8

function Shell({ children }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-navy-950 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-navy-700 bg-navy-900 p-8 shadow-xl">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-gold-500">Yellow Duck TCG</h1>
          <p className="mt-1 text-sm text-gray-400">Nova senha</p>
        </div>
        {children}
      </div>
    </div>
  )
}

// O link do e-mail traz a pessoa para cá já com uma sessão de recuperação aberta pelo Supabase.
export default function RedefinirSenha() {
  const { session, loading, updatePassword } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  if (loading) {
    return (
      <Shell>
        <p className="text-center text-sm text-gray-400">Carregando...</p>
      </Shell>
    )
  }

  if (!session) {
    const expired = window.location.hash.includes('otp_expired')
    return (
      <Shell>
        <p className="text-sm text-red-400">
          {expired
            ? 'Esse link expirou.'
            : 'Esse link não é válido ou já foi usado.'}{' '}
          Peça um novo na tela de login, em "Esqueci minha senha".
        </p>
        <Link
          to="/login"
          className="mt-4 block w-full rounded-lg bg-gold-500 py-2 text-center font-semibold text-navy-950 hover:bg-gold-400"
        >
          Ir para o login
        </Link>
      </Shell>
    )
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (password.length < MIN_LENGTH) {
      setError(`A senha precisa ter pelo menos ${MIN_LENGTH} caracteres.`)
      return
    }
    if (password !== confirm) {
      setError('As duas senhas não são iguais.')
      return
    }
    setSaving(true)
    const { error } = await updatePassword(password)
    setSaving(false)
    if (error) {
      setError('Não foi possível salvar a senha. Peça um novo link e tente de novo.')
      return
    }
    setDone(true)
    setTimeout(() => navigate('/', { replace: true }), 1500)
  }

  if (done) {
    return (
      <Shell>
        <p className="text-center text-sm text-green-400">Senha alterada! Entrando no sistema...</p>
      </Shell>
    )
  }

  return (
    <Shell>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm text-gray-300">Nova senha</label>
          <input
            type="password"
            required
            minLength={MIN_LENGTH}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
          />
          <p className="mt-1 text-xs text-gray-500">Mínimo de {MIN_LENGTH} caracteres.</p>
        </div>
        <div>
          <label className="mb-1 block text-sm text-gray-300">Repita a nova senha</label>
          <input
            type="password"
            required
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className={inputClass}
          />
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-lg bg-gold-500 py-2 font-semibold text-navy-950 transition-colors hover:bg-gold-400 disabled:opacity-60"
        >
          {saving ? 'Salvando...' : 'Salvar nova senha'}
        </button>
      </form>
    </Shell>
  )
}
