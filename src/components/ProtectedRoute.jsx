import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute() {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-navy-950 text-gold-500">
        Carregando...
      </div>
    )
  }

  if (!session) return <Navigate to="/login" replace />

  return <Outlet />
}
