import { Outlet } from 'react-router-dom'

// Login desativado de novo a pedido do usuário, até ele terminar de configurar a senha.
// Para reativar: restaurar a checagem de sessão (versão do commit 86679a5) e, só depois de
// conseguir entrar, rodar supabase/trancar_acesso.sql.
export default function ProtectedRoute() {
  return <Outlet />
}
