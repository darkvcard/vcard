import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ScrollToTop } from './components/ScrollToTop'
import { AuthProvider } from './context/AuthProvider'
import { Admin } from './pages/Admin'
import { Auth } from './pages/Auth'
import { Dashboard } from './pages/Dashboard'
import { Home } from './pages/Home'
import { NotFound } from './pages/NotFound'
import { Shop } from './pages/Shop'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ScrollToTop />
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/shop" element={<Shop />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </AuthProvider>
  )
}
