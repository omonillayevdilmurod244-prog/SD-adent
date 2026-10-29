import React, { useState, useEffect } from 'react'
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import Navbar from './components/Navbar'
import BottomNav from './components/BottomNav'
import ToastContainer from './components/ToastContainer'
import { useApp } from './context/AppContext'

import LoginPage from './pages/LoginPage'
import AdminPage from './pages/AdminPage'
import HomePage from './pages/HomePage'
import OutletsPage from './pages/OutletsPage'
import OrderCreatePage from './pages/OrderCreatePage'
import OrdersPage from './pages/OrdersPage'
import PaymentsPage from './pages/PaymentsPage'
import WarehousePage from './pages/WarehousePage'
import ReportsPage from './pages/ReportsPage'
import SettingsPage from './pages/SettingsPage'

import {
  getAgentProfile,
  getCategories,
  getProducts,
  getOutlets,
  getOrders,
  getPayments,
  checkInVisit,
  createOrder as apiCreateOrder,
  createPayment as apiCreatePayment,
  createOutlet as apiCreateOutlet,
  syncData,
  formatSum,
  getMe,
  logoutUser,
  TOKEN_KEY,
  AUTH_EXPIRED_EVENT,
} from './services/api'

export default function App() {
  const navigate = useNavigate()
  const location = useLocation()
  const { addToast } = useApp()

  // Authentication State: foydalanuvchi FAQAT administrator ruxsat bergan token bilan kira oladi
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('sd_agent_user')
      const token = localStorage.getItem(TOKEN_KEY)
      return saved && token ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })
  // Saqlangan sessiya serverda hali yaroqlimi — tekshirib bo'lguncha ma'lumot yuklamaymiz
  const [authChecking, setAuthChecking] = useState(() => Boolean(localStorage.getItem(TOKEN_KEY) && localStorage.getItem('sd_agent_user')))

  const [loading, setLoading] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)

  const [agent, setAgent] = useState(null)
  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState([])
  const [outlets, setOutlets] = useState([])
  const [orders, setOrders] = useState([])
  const [payments, setPayments] = useState([])

  // Load all initial data from backend
  const loadData = async () => {
    try {
      setLoading(true)
      const [agentRes, catRes, prodRes, outRes, ordRes, payRes] = await Promise.all([
        getAgentProfile(),
        getCategories(),
        getProducts(),
        getOutlets(),
        getOrders(),
        getPayments(),
      ])

      setAgent(agentRes)
      setCategories(catRes)
      setProducts(prodRes)
      setOutlets(outRes)
      setOrders(ordRes)
      setPayments(payRes)
    } catch (err) {
      console.error('Error fetching data from SD Agent backend:', err)
      addToast('Server bilan bog\'lanishda xatolik yuz berdi', 'error')
    } finally {
      setLoading(false)
    }
  }

  const clearSession = () => {
    localStorage.removeItem('sd_agent_user')
    localStorage.removeItem(TOKEN_KEY)
    setCurrentUser(null)
    setAgent(null)
  }

  // Sahifa ochilganda: saqlangan token serverda hali amalda ekanini tekshiramiz
  useEffect(() => {
    if (!authChecking) return
    let cancelled = false
    getMe()
      .then((user) => {
        if (cancelled) return
        localStorage.setItem('sd_agent_user', JSON.stringify(user))
        setCurrentUser(user)
      })
      .catch((err) => {
        if (cancelled) return
        // 401 bo'lsa sessiya yaroqsiz (interceptor ham xabar beradi). Tarmoq xatosida foydalanuvchini qoldiramiz.
        if (err.response?.status === 401) clearSession()
      })
      .finally(() => {
        if (!cancelled) setAuthChecking(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Server sessiyani bekor qilsa (muddat tugadi, admin chiqarib yubordi, bloklandi) — darhol chiqaramiz
  useEffect(() => {
    const onExpired = (e) => {
      clearSession()
      addToast(e.detail || 'Sessiya tugadi. Qayta kiring.', 'error')
      navigate('/')
    }
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired)
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired)
  }, [])

  useEffect(() => {
    if (currentUser && !authChecking) {
      loadData()
    }
  }, [currentUser, authChecking])

  // Login handler (administrator ruxsat bergandan keyingina chaqiriladi)
  const handleLoginSuccess = (user, token) => {
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem('sd_agent_user', JSON.stringify(user))
    setCurrentUser(user)
  }

  // Logout handler
  const handleLogout = async () => {
    try {
      await logoutUser()
    } catch {
      // server javob bermasa ham, mahalliy sessiyani tozalaymiz
    }
    clearSession()
    addToast('Tizimdan muvaffaqiyatli chiqdingiz', 'info')
    navigate('/')
  }

  // Action: Check-in at outlet
  const handleCheckIn = async (outletId) => {
    try {
      const res = await checkInVisit(outletId)
      if (res && res.outlet) {
        setOutlets(prev => prev.map(o => o.id === outletId ? { ...o, status: 'visited', lastVisit: res.outlet.lastVisit } : o))
        const updatedAgent = await getAgentProfile()
        setAgent(updatedAgent)
        addToast(`📍 ${res.outlet.name} ga tashrif muvaffaqiyatli qayd etildi!`, 'success')
      }
    } catch (err) {
      console.error('Check-in failed:', err)
      addToast('Tashrifni qayd etishda xatolik', 'error')
    }
  }

  // Action: Create Order
  const handleCreateOrder = async (orderPayload) => {
    try {
      const res = await apiCreateOrder(orderPayload)
      if (res && res.order) {
        setOrders(prev => [res.order, ...prev])
        const [updatedOutlets, updatedProds, updatedAgent] = await Promise.all([
          getOutlets(),
          getProducts(),
          getAgentProfile(),
        ])
        setOutlets(updatedOutlets)
        setProducts(updatedProds)
        setAgent(updatedAgent)
        addToast(`🛒 Buyurtma (${res.order.id}) qabul qilindi va ombordan chegirildi!`, 'success')
        return res
      }
    } catch (err) {
      console.error('Order creation failed:', err)
      addToast('Buyurtma yaratishda xatolik yuz berdi', 'error')
    }
  }

  // Action: Create Payment
  const handleCreatePayment = async (paymentPayload) => {
    try {
      const res = await apiCreatePayment(paymentPayload)
      if (res && res.payment) {
        setPayments(prev => [res.payment, ...prev])
        const [updatedOutlets, updatedAgent] = await Promise.all([
          getOutlets(),
          getAgentProfile(),
        ])
        setOutlets(updatedOutlets)
        setAgent(updatedAgent)
        addToast(`💵 ${formatSum(paymentPayload.amount)} qabul qilindi (${res.payment.receiptNumber})!`, 'cash')
      }
    } catch (err) {
      console.error('Payment creation failed:', err)
      addToast('To\'lovni qabul qilishda xatolik', 'error')
    }
  }

  // Action: Create New Outlet
  const handleCreateOutlet = async (outletPayload) => {
    try {
      const newOut = await apiCreateOutlet(outletPayload)
      if (newOut) {
        setOutlets(prev => [...prev, newOut])
        addToast(`🏪 Yangi savdo nuqtasi: ${newOut.name} qo'shildi!`, 'success')
      }
    } catch (err) {
      console.error('Outlet creation failed:', err)
      addToast('Do\'kon qo\'shishda xatolik yuz berdi', 'error')
    }
  }

  // Action: Sync
  const handleSync = async () => {
    try {
      setIsSyncing(true)
      await syncData()
      await loadData()
      addToast('🔄 Barcha ma\'lumotlar server bilan muvaffaqiyatli sinxronlandi!', 'info')
    } catch (err) {
      console.error('Sync failed:', err)
      addToast('Sinxronlashda xatolik yuz berdi', 'error')
    } finally {
      setIsSyncing(false)
    }
  }

  // Admin panel (alohida kirish: admin kaliti bilan)
  if (location.pathname.startsWith('/admin')) {
    return (
      <>
        <ToastContainer />
        <AdminPage />
      </>
    )
  }

  if (authChecking) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
        Sessiya tekshirilmoqda...
      </div>
    )
  }

  // If not logged in, show LoginPage
  if (!currentUser) {
    return (
      <>
        <ToastContainer />
        <LoginPage onLoginSuccess={handleLoginSuccess} />
      </>
    )
  }

  if (loading && !agent) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '50%', border: '4px solid rgba(37,99,235,0.2)', borderTopColor: '#2563eb', animation: 'spin 1s linear infinite' }} />
        <div style={{ fontSize: '18px', fontWeight: 700, color: '#fff' }}>SD Agent yuklanmoqda...</div>
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Sales Doctor 2.0 ma'lumotlar bazasi bilan ulanilmoqda</div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <ToastContainer />
      <Navbar
        agent={agent}
        currentUser={currentUser}
        onSync={handleSync}
        isSyncing={isSyncing}
        onLogout={handleLogout}
      />

      <main style={{ flex: 1 }}>
        <Routes>
          <Route
            path="/"
            element={
              <HomePage
                agent={agent}
                currentUser={currentUser}
                outlets={outlets}
                orders={orders}
              />
            }
          />
          <Route
            path="/outlets"
            element={
              <OutletsPage
                outlets={outlets}
                onCheckIn={handleCheckIn}
                onCreateOutlet={handleCreateOutlet}
                onOpenPayment={(outlet) => navigate(`/payments?outletId=${outlet.id}`)}
              />
            }
          />
          <Route
            path="/order-create"
            element={
              <OrderCreatePage
                outlets={outlets}
                products={products}
                categories={categories}
                onSubmitOrder={handleCreateOrder}
              />
            }
          />
          <Route
            path="/orders"
            element={<OrdersPage orders={orders} />}
          />
          <Route
            path="/payments"
            element={
              <PaymentsPage
                payments={payments}
                outlets={outlets}
                onCreatePayment={handleCreatePayment}
              />
            }
          />
          <Route
            path="/warehouse"
            element={
              <WarehousePage
                products={products}
                categories={categories}
              />
            }
          />
          <Route
            path="/reports"
            element={
              <ReportsPage
                agent={agent}
                currentUser={currentUser}
                orders={orders}
                payments={payments}
                products={products}
              />
            }
          />
          <Route
            path="/settings"
            element={
              <SettingsPage
                agent={agent}
                currentUser={currentUser}
                onSync={handleSync}
                isSyncing={isSyncing}
                onLogout={handleLogout}
              />
            }
          />
        </Routes>
      </main>

      <BottomNav />
    </div>
  )
}
