import { Outlet } from 'react-router-dom'

// Login temporariamente desativado a pedido do usuário (senha esquecida).
// Para reativar: restaurar a checagem de sessão abaixo.
export default function ProtectedRoute() {
  return <Outlet />
}
