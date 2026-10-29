import axios from 'axios'

// Production da VITE_API_URL=https://sd-agent-backend.onrender.com bo'ladi
// Dev da Vite proxy /api → localhost:5000 ga yo'naltiradi
const API_BASE = (import.meta.env.VITE_API_URL || '') + '/api'

export const TOKEN_KEY = 'sd_agent_token'
export const AUTH_EXPIRED_EVENT = 'sd-auth-expired'

const client = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Har bir so'rovga tasdiqlangan sessiya tokenini qo'shamiz
client.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Server sessiyani yaroqsiz desa (muddat tugagan / admin uzgan / bloklangan) — tizimdan chiqaramiz
client.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401 && error.response?.data?.code === 'SESSION_INVALID') {
      window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT, { detail: error.response.data.message }))
    }
    return Promise.reject(error)
  },
)

// Number formatter for Uzbek So'm (UZS)
export const formatSum = (amount) => {
  if (amount === undefined || amount === null) return '0 so\'m'
  return new Intl.NumberFormat('uz-UZ').format(amount) + ' so\'m'
}

// Format short sum (e.g. 1.2M, 450K)
export const formatShortSum = (amount) => {
  if (!amount) return '0'
  if (amount >= 1000000) return (amount / 1000000).toFixed(1) + ' mln'
  if (amount >= 1000) return (amount / 1000).toFixed(0) + ' ming'
  return amount.toString()
}

// 0. Auth & Company API
// Kirish va ro'yxatdan o'tish endi to'g'ridan-to'g'ri kirgizmaydi: administratorga so'rov yuboradi
export const loginUser = async (credentials) => {
  const { data } = await client.post('/auth/login', credentials)
  return data
}

export const registerUser = async (userData) => {
  const { data } = await client.post('/auth/register', userData)
  return data
}

// Administrator qarorini so'rash (pollKey faqat so'rovni yuborgan qurilmada bor)
export const getLoginRequestStatus = async (requestId, pollKey) => {
  const { data } = await client.get(`/auth/request/${requestId}`, { headers: { 'x-poll-key': pollKey } })
  return data
}

export const cancelLoginRequest = async (requestId, pollKey) => {
  const { data } = await client.post(`/auth/request/${requestId}/cancel`, {}, { headers: { 'x-poll-key': pollKey } })
  return data
}

export const getMe = async () => {
  const { data } = await client.get('/auth/me')
  return data.user
}

export const logoutUser = async () => {
  const { data } = await client.post('/auth/logout')
  return data
}

export const getCompanies = async (search = '') => {
  const { data } = await client.get('/companies', { params: { search } })
  return data.companies
}

export const saveCompany = async (companyData) => {
  const { data } = await client.post('/companies', companyData)
  return data.company
}

// Admin panel API (x-admin-key sarlavhasi bilan)
export const ADMIN_KEY_STORAGE = 'sd_admin_key'
const adminHeaders = (key) => ({ 'x-admin-key': key })

export const adminCheck = async (key) => {
  const { data } = await client.post('/admin/check', {}, { headers: adminHeaders(key) })
  return data
}

export const adminOverview = async (key) => {
  const { data } = await client.get('/admin/overview', { headers: adminHeaders(key) })
  return data
}

export const adminDecide = async (key, requestId, decision) => {
  const { data } = await client.post(`/admin/requests/${requestId}/${decision}`, {}, { headers: adminHeaders(key) })
  return data
}

export const adminRevokeSession = async (key, sessionId) => {
  const { data } = await client.post(`/admin/sessions/${sessionId}/revoke`, {}, { headers: adminHeaders(key) })
  return data
}

export const adminBlockUser = async (key, userId, blocked) => {
  const { data } = await client.post(`/admin/users/${userId}/block`, { blocked }, { headers: adminHeaders(key) })
  return data
}

// 1. Agent & KPI API
export const getAgentProfile = async () => {
  const { data } = await client.get('/agent')
  return data.agent
}

// 2. Categories & Products API
export const getCategories = async () => {
  const { data } = await client.get('/categories')
  return data.categories
}

export const getProducts = async (params = {}) => {
  const { data } = await client.get('/products', { params })
  return data.products
}

export const getProductById = async (id) => {
  const { data } = await client.get(`/products/${id}`)
  return data.product
}

// 3. Outlets (Savdo Nuqtalari / Do'konlar) API
export const getOutlets = async (params = {}) => {
  const { data } = await client.get('/outlets', { params })
  return data.outlets
}

export const getOutletById = async (id) => {
  const { data } = await client.get(`/outlets/${id}`)
  return data.outlet
}

export const createOutlet = async (outletData) => {
  const { data } = await client.post('/outlets', outletData)
  return data.outlet
}

export const checkInVisit = async (outletId, visitData = {}) => {
  const { data } = await client.post(`/outlets/${outletId}/visit`, visitData)
  return data
}

// 4. Orders (Buyurtmalar) API
export const getOrders = async () => {
  const { data } = await client.get('/orders')
  return data.orders
}

export const createOrder = async (orderData) => {
  const { data } = await client.post('/orders', orderData)
  return data
}

// 5. Payments (Inkassatsiya / Qarz so'ndirish) API
export const getPayments = async () => {
  const { data } = await client.get('/payments')
  return data.payments
}

export const createPayment = async (paymentData) => {
  const { data } = await client.post('/payments', paymentData)
  return data
}

// 6. Warehouse (Ombor) API
export const getWarehouse = async () => {
  const { data } = await client.get('/warehouse')
  return data
}

// 7. Sync
export const syncData = async (payload) => {
  if (payload) {
    const { data } = await client.post('/sync', payload)
    return data
  }
  const { data } = await client.get('/sync')
  return data
}

export default client
