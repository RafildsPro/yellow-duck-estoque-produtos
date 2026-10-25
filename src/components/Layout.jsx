import { NavLink, Outlet } from 'react-router-dom'
import { LayoutDashboard, Package, History, FileText, LogOut } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const navItem =
  'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors'

export default function Layout() {
  const { signOut, session } = useAuth()

  return (
    <div className="min-h-screen bg-navy-950">
      <header className="border-b border-navy-700 bg-navy-900">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold tracking-tight text-gold-500">
              Yellow Duck <span className="text-gray-300">TCG</span>
            </span>
            <span className="hidden text-xs text-gray-500 sm:inline">Controle de Estoque</span>
          </div>

          <nav className="flex items-center gap-1">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `${navItem} ${isActive ? 'bg-gold-500/10 text-gold-500' : 'text-gray-300 hover:bg-navy-700'}`
              }
            >
              <LayoutDashboard size={16} />
              Dashboard
            </NavLink>
            <NavLink
              to="/produtos"
              className={({ isActive }) =>
                `${navItem} ${isActive ? 'bg-gold-500/10 text-gold-500' : 'text-gray-300 hover:bg-navy-700'}`
              }
            >
              <Package size={16} />
              Produtos
            </NavLink>
            <NavLink
              to="/vendas"
              className={({ isActive }) =>
                `${navItem} ${isActive ? 'bg-gold-500/10 text-gold-500' : 'text-gray-300 hover:bg-navy-700'}`
              }
            >
              <History size={16} />
              Vendas
            </NavLink>
            <NavLink
              to="/cardapio"
              className={({ isActive }) =>
                `${navItem} ${isActive ? 'bg-gold-500/10 text-gold-500' : 'text-gray-300 hover:bg-navy-700'}`
              }
            >
              <FileText size={16} />
              Cardápio
            </NavLink>
          </nav>

          {session && (
            <div className="flex items-center gap-3">
              <span className="hidden text-xs text-gray-500 md:inline">{session.user?.email}</span>
              <button
                onClick={signOut}
                className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm text-gray-300 hover:bg-navy-700 hover:text-gold-500"
              >
                <LogOut size={16} />
                Sair
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
