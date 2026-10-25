import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Products from './pages/Products'
import Vendas from './pages/Vendas'
import Cardapio from './pages/Cardapio'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/produtos" element={<Products />} />
          <Route path="/vendas" element={<Vendas />} />
          <Route path="/cardapio" element={<Cardapio />} />
        </Route>
      </Route>
    </Routes>
  )
}

export default App
