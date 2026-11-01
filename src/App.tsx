import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ProtectedRoute, SignedOutOnly } from './components/ProtectedRoute'
import { ScrollToTop } from './components/ScrollToTop'
import { ToastProvider } from './components/ToastProvider'
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
      <ToastProvider>
        <BrowserRouter>
          <ScrollToTop />
          <Layout>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/shop" element={<Shop />} />
              <Route
                path="/auth"
                element={
                  <SignedOutOnly>
                    <Auth />
                  </SignedOutOnly>
                }
              />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute requireAdmin>
                    <Admin />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Layout>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  )
}
