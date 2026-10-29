import express from 'express'
import cors from 'cors'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { initialData } from './data.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const DB_FILE = path.join(__dirname, 'db.json')
const ADMIN_FILE = path.join(__dirname, 'admin.json')
const DIST_DIR = path.join(__dirname, '..', 'dist')

const app = express()
const PORT = process.env.PORT || 5000

// ===== SOZLAMALAR (hammasini .env / muhit o'zgaruvchilari orqali o'zgartirish mumkin) =====
const CONFIG = {
  sessionHours: Number(process.env.SESSION_HOURS) || 24, // tasdiqlangan kirish necha soat amal qiladi
  requestMinutes: Number(process.env.REQUEST_MINUTES) || 10, // so'rov necha daqiqa kutadi
}

const TG = {
  token: process.env.TELEGRAM_BOT_TOKEN || '',
  chat: String(process.env.TELEGRAM_CHAT_ID || ''),
  api: process.env.TELEGRAM_API || 'https://api.telegram.org',
}
const TG_ENABLED = Boolean(TG.token && TG.chat)

app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || true, // true = barcha origin'lar ruxsat (dev + Netlify)
  credentials: true,
}))

app.use(express.json({ limit: '2mb' }))

// ===== YORDAMCHI FUNKSIYALAR =====
const sha256 = (s) => crypto.createHash('sha256').update(String(s)).digest('hex')
const nowIso = () => new Date().toISOString()
const sleep = (ms) => new Promise(r => setTimeout(r, ms))

// Vaqt oralig'ini xavfsiz solishtirish (timing attack'dan himoya)
function safeEqual(a, b) {
  return crypto.timingSafeEqual(Buffer.from(sha256(a), 'hex'), Buffer.from(sha256(b), 'hex'))
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(String(password), salt, 64).toString('hex')
  return `scrypt$${salt}$${hash}`
}

function verifyPassword(password, stored) {
  if (typeof stored !== 'string') return false
  // Eski (ochiq matn) parollar uchun moslik — loadDb() ularni avtomatik xeshlaydi
  if (!stored.startsWith('scrypt$')) return safeEqual(password, stored)
  const [, salt, hash] = stored.split('$')
  const expected = Buffer.from(hash, 'hex')
  const actual = crypto.scryptSync(String(password), salt, expected.length)
  return crypto.timingSafeEqual(expected, actual)
}

function clientIp(req) {
  const remote = (req.socket.remoteAddress || 'unknown').replace('::ffff:', '')
  const fwd = req.headers['x-forwarded-for']
  // Faqat o'z kompyuteridagi proxy (Vite) dan kelgan sarlavhaga ishonamiz
  if (fwd && (remote === '127.0.0.1' || remote === '::1')) return String(fwd).split(',')[0].trim()
  return remote
}

const deviceInfo = (req) => String(req.headers['user-agent'] || 'noma\'lum').slice(0, 200)
const tashkentTime = (d = new Date()) => d.toLocaleString('uz-UZ', { timeZone: 'Asia/Tashkent' })

// Oddiy urinishlar cheklovchisi (brute-force va spamdan himoya)
const attempts = new Map()
function rlCount(key, windowMs) {
  const now = Date.now()
  const arr = (attempts.get(key) || []).filter(t => now - t < windowMs)
  attempts.set(key, arr)
  return arr.length
}
function rlHit(key) {
  const arr = attempts.get(key) || []
  arr.push(Date.now())
  attempts.set(key, arr)
}
setInterval(() => {
  const now = Date.now()
  for (const [k, arr] of attempts) {
    const fresh = arr.filter(t => now - t < 3600000)
    if (fresh.length) attempts.set(k, fresh)
    else attempts.delete(k)
  }
}, 600000).unref()

// ===== ADMIN KALITI =====
function loadAdminKey() {
  if (process.env.ADMIN_KEY) return process.env.ADMIN_KEY
  try {
    const j = JSON.parse(fs.readFileSync(ADMIN_FILE, 'utf-8'))
    if (j.adminKey) return j.adminKey
  } catch {
    // fayl yo'q — pastda yaratamiz
  }
  const key = crypto.randomBytes(9).toString('base64url')
  fs.writeFileSync(ADMIN_FILE, JSON.stringify({ adminKey: key }, null, 2), 'utf-8')
  return key
}
const ADMIN_KEY = loadAdminKey()

// ===== BAZA =====
let db = null

const publicUser = (u) => ({
  id: u.id,
  login: u.login,
  name: u.name,
  role: u.role,
  company: u.company,
  phone: u.phone,
  avatar: u.avatar,
})

// Mijozga yuboriladigan baza nusxasi: foydalanuvchilar, parollar, sessiyalar YO'Q
function publicDb() {
  const { users, sessions, loginRequests, ...rest } = db
  void users; void sessions; void loginRequests
  return rest
}

function loadDb() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, 'utf-8')
      try {
        db = JSON.parse(content)
      } catch (parseErr) {
        // Buzilgan faylni yo'qotib yubormaslik uchun nusxasini saqlab qo'yamiz
        const backup = `${DB_FILE}.broken-${Date.now()}`
        fs.copyFileSync(DB_FILE, backup)
        console.error(`⚠️  db.json o'qilmadi (${parseErr.message}). Nusxa saqlandi: ${backup}`)
        db = JSON.parse(JSON.stringify(initialData))
      }

      if (!db.companies || db.companies.length === 0) {
        db.companies = JSON.parse(JSON.stringify(initialData.companies))
      } else {
        for (const initComp of initialData.companies) {
          if (!db.companies.some(c => c.name.toLowerCase() === initComp.name.toLowerCase())) {
            db.companies.unshift(initComp)
          }
        }
      }

      if (!db.products || db.products.length === 0) {
        db.products = JSON.parse(JSON.stringify(initialData.products))
      } else {
        for (const initProd of initialData.products) {
          if (!db.products.some(p => p.id === initProd.id)) {
            db.products.unshift(initProd)
          }
        }
      }

      if (!db.categories) db.categories = JSON.parse(JSON.stringify(initialData.categories))
      console.log('💾 server/db.json yuklandi')
    } else {
      db = JSON.parse(JSON.stringify(initialData))
      console.log('🌱 Yangi server/db.json yaratildi')
    }
  } catch (err) {
    console.error('Bazani yuklashda xatolik, boshlang\'ich ma\'lumot ishlatiladi:', err)
    db = JSON.parse(JSON.stringify(initialData))
  }

  if (!Array.isArray(db.users)) db.users = []
  if (!Array.isArray(db.sessions)) db.sessions = []
  if (!Array.isArray(db.loginRequests)) db.loginRequests = []

  // Kompaniyalar: takrorlarni olib tashlash va id larni noyob qilish
  const seenNames = new Set()
  const seenIds = new Set()
  db.companies = db.companies.filter(c => {
    const k = c.name.trim().toLowerCase()
    if (seenNames.has(k)) return false
    seenNames.add(k)
    return true
  })
  db.companies.forEach((c, i) => {
    if (!c.id || seenIds.has(c.id)) c.id = `comp-${Date.now().toString(36)}-${i}`
    seenIds.add(c.id)
  })

  // Ochiq matndagi parollarni xeshlash (eski parollar o'z kuchida qoladi)
  let migrated = 0
  for (const u of db.users) {
    if (typeof u.password === 'string' && !u.password.startsWith('scrypt$')) {
      u.password = hashPassword(u.password)
      migrated++
    }
  }
  if (migrated) console.log(`🔒 ${migrated} ta parol xavfsiz xeshlandi`)

  saveDb()
}

function saveDb() {
  try {
    // Avval vaqtinchalik faylga yozib, keyin almashtiramiz — uzilib qolsa baza buzilmaydi
    const tmp = `${DB_FILE}.tmp`
    fs.writeFileSync(tmp, JSON.stringify(db, null, 2), 'utf-8')
    fs.renameSync(tmp, DB_FILE)
  } catch (err) {
    console.error('Bazani saqlashda xatolik:', err)
  }
}

loadDb()

// Helper: recalculate agent stats
function getAgentStats(currentUser) {
  const todayOrders = db.orders.filter(o => o.date.startsWith('2026-10-28'))
  const todayTotalSales = todayOrders.reduce((sum, o) => sum + o.totalAmount, 0)
  const todayCash = db.payments.reduce((sum, p) => sum + (p.paymentMethod.includes('Naqd') ? p.amount : 0), 0)
  const visitedCount = db.outlets.filter(o => o.status === 'visited' || o.status === 'order_placed').length

  const baseAgent = currentUser ? {
    id: currentUser.id,
    name: currentUser.name,
    role: currentUser.role || 'Savdo Agenti',
    company: currentUser.company || 'Hilol Kolbasalari',
    phone: currentUser.phone || '+998 90 123-45-67',
    avatar: currentUser.avatar || '👨‍💼',
    status: 'Online',
    territory: 'Toshkent shahar hududi',
  } : db.agent

  return {
    ...db.agent,
    ...baseAgent,
    achievedDaily: todayTotalSales,
    cashCollectedDaily: todayCash,
    completedVisitsDaily: visitedCount,
    totalVisitsDaily: db.outlets.length,
    dailyPercent: Math.round((todayTotalSales / db.agent.planDaily) * 100),
    monthlyPercent: Math.round(((db.agent.achievedMonthly + todayTotalSales) / db.agent.planMonthly) * 100),
  }
}

// ===== TASDIQLASH SO'ROVLARI =====
const STATUS_UZ = {
  pending: 'Kutilmoqda',
  approved: 'Ruxsat berildi',
  rejected: 'Rad etildi',
  expired: 'Muddati tugadi',
  cancelled: 'Bekor qilindi',
}

function requestForAdmin(r) {
  const user = db.users.find(u => u.id === r.userId)
  return {
    id: r.id,
    userId: r.userId,
    login: r.login,
    name: r.name,
    company: r.company,
    role: r.role,
    phone: r.phone,
    kind: r.kind,
    ip: r.ip,
    device: r.device,
    status: r.status,
    statusLabel: STATUS_UZ[r.status] || r.status,
    createdAt: r.createdAt,
    decidedAt: r.decidedAt || null,
    decidedBy: r.decidedBy || null,
    userBlocked: Boolean(user && user.blocked),
  }
}

function expireStale() {
  const now = Date.now()
  const limit = CONFIG.requestMinutes * 60000
  let changed = false
  for (const r of db.loginRequests) {
    if (r.status === 'pending' && now - new Date(r.createdAt).getTime() > limit) {
      r.status = 'expired'
      r.decidedAt = nowIso()
      r.decidedBy = 'tizim'
      changed = true
    }
    // Ruxsat berilgan, lekin foydalanuvchi 10 daqiqa ichida kirmagan
    if (r.status === 'approved' && !r.tokenIssued && r.decidedAt && now - new Date(r.decidedAt).getTime() > 600000) {
      r.status = 'expired'
      changed = true
    }
  }
  if (changed) saveDb()
}

function createLoginRequest(user, req, kind) {
  // Shu foydalanuvchining eski kutayotgan so'rovlari bekor qilinadi
  for (const r of db.loginRequests) {
    if (r.userId === user.id && r.status === 'pending') {
      r.status = 'cancelled'
      r.decidedAt = nowIso()
      r.decidedBy = 'tizim'
      tgMarkDecided(r)
    }
  }

  const pollKey = crypto.randomBytes(24).toString('hex')
  const request = {
    id: `REQ-${crypto.randomBytes(4).toString('hex')}`,
    userId: user.id,
    login: user.login,
    name: user.name,
    company: user.company,
    role: user.role,
    phone: user.phone,
    kind, // 'login' | 'register'
    ip: clientIp(req),
    device: deviceInfo(req),
    status: 'pending',
    createdAt: nowIso(),
    decidedAt: null,
    decidedBy: null,
    pollKeyHash: sha256(pollKey),
    tokenIssued: false,
  }

  db.loginRequests.unshift(request)
  if (db.loginRequests.length > 300) db.loginRequests.length = 300
  saveDb()

  console.log(`🔔 [${tashkentTime()}] YANGI SO'ROV ${request.id}: ${user.name} (${user.login}) | ${user.company} | IP: ${request.ip}`)
  tgNotify(request)

  return { request, pollKey }
}

function decideRequest(id, decision, by = 'admin') {
  expireStale()
  const r = db.loginRequests.find(x => x.id === id)
  if (!r) return { code: 404, error: 'So\'rov topilmadi' }
  if (r.status !== 'pending') {
    return { code: 409, error: `Bu so'rov allaqachon yopilgan: ${STATUS_UZ[r.status] || r.status}`, request: r }
  }
  r.status = decision === 'approve' ? 'approved' : 'rejected'
  r.decidedAt = nowIso()
  r.decidedBy = by
  saveDb()
  console.log(`${decision === 'approve' ? '✅ RUXSAT' : '⛔ RAD'} [${tashkentTime()}] ${r.id}: ${r.name} (${r.login}) — ${by}`)
  tgMarkDecided(r)
  return { request: r }
}

// ===== SESSIYALAR =====
function createSession(user, req, requestId) {
  const token = crypto.randomBytes(32).toString('hex')
  const now = Date.now()
  const session = {
    id: `SES-${crypto.randomBytes(4).toString('hex')}`,
    tokenHash: sha256(token),
    userId: user.id,
    requestId,
    ip: clientIp(req),
    device: deviceInfo(req),
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + CONFIG.sessionHours * 3600000).toISOString(),
    revoked: false,
  }
  db.sessions.push(session)
  // Eski sessiyalarni tozalash
  const cutoff = now - 7 * 24 * 3600000
  db.sessions = db.sessions.filter(s => new Date(s.expiresAt).getTime() > cutoff)
  saveDb()
  return { token, session }
}

const sessionActive = (s) => !s.revoked && new Date(s.expiresAt).getTime() > Date.now()

function requireSession(req, res, next) {
  const fail = (message) => res.status(401).json({ success: false, code: 'SESSION_INVALID', message })
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : ''
  if (!token) return fail('Tizimga kirish talab qilinadi')

  const tokenHash = sha256(token)
  const session = db.sessions.find(s => s.tokenHash === tokenHash)
  if (!session || !sessionActive(session)) {
    return fail('Sessiya tugagan yoki bekor qilingan. Qayta kiring va administrator ruxsatini kuting.')
  }
  const user = db.users.find(u => u.id === session.userId)
  if (!user || user.blocked) return fail('Hisob bloklangan yoki topilmadi')

  req.user = user
  req.session = session
  next()
}

function requireAdmin(req, res, next) {
  const ip = clientIp(req)
  if (rlCount(`admin:${ip}`, 600000) >= 10) {
    return res.status(429).json({ success: false, message: 'Juda ko\'p noto\'g\'ri urinish. 10 daqiqadan keyin qayta urinib ko\'ring.' })
  }
  const key = String(req.headers['x-admin-key'] || '')
  if (!key || !safeEqual(key, ADMIN_KEY)) {
    rlHit(`admin:${ip}`)
    return res.status(401).json({ success: false, code: 'ADMIN_INVALID', message: 'Admin kaliti noto\'g\'ri' })
  }
  next()
}

// ===== TELEGRAM (ixtiyoriy): so'rov telefoningizga keladi, tugma bilan ruxsat berasiz =====
async function tg(method, body, signal) {
  const r = await fetch(`${TG.api}/bot${TG.token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  })
  return r.json()
}

function tgText(r, footer = '') {
  const kind = r.kind === 'register' ? '🆕 Yangi hisob' : '🔑 Mavjud hisob'
  return [
    '🔔 Kirish so\'rovi',
    `${kind}`,
    `👤 ${r.name} (login: ${r.login})`,
    `🏢 ${r.company}`,
    `🌐 IP: ${r.ip}`,
    `🕐 ${tashkentTime(new Date(r.createdAt))}`,
    `🆔 ${r.id}`,
    footer,
  ].filter(Boolean).join('\n')
}

function tgNotify(r) {
  if (!TG_ENABLED) return
  tg('sendMessage', {
    chat_id: TG.chat,
    text: tgText(r),
    reply_markup: {
      inline_keyboard: [[
        { text: '✅ Ruxsat berish', callback_data: `a:${r.id}` },
        { text: '❌ Rad etish', callback_data: `r:${r.id}` },
      ]],
    },
  })
    .then(j => {
      if (j && j.ok) {
        r.tgMessageId = j.result.message_id
        saveDb()
      } else {
        console.error('Telegram xabar yuborilmadi:', j && j.description)
      }
    })
    .catch(e => console.error('Telegram xatosi:', e.message))
}

function tgMarkDecided(r) {
  if (!TG_ENABLED || !r.tgMessageId) return
  const label = r.status === 'approved' ? '✅ RUXSAT BERILDI' : r.status === 'rejected' ? '⛔ RAD ETILDI' : `ℹ️ ${STATUS_UZ[r.status]}`
  tg('editMessageText', {
    chat_id: TG.chat,
    message_id: r.tgMessageId,
    text: tgText(r, label),
    reply_markup: { inline_keyboard: [] },
  }).catch(() => {})
}

async function tgLoop() {
  let offset = 0
  console.log('📲 Telegram xabarnomasi yoqilgan')
  for (;;) {
    try {
      const j = await tg('getUpdates', { offset, timeout: 25, allowed_updates: ['callback_query'] })
      if (!j.ok) {
        console.error('Telegram getUpdates xatosi:', j.description)
        await sleep(8000)
        continue
      }
      for (const u of j.result) {
        offset = u.update_id + 1
        const cq = u.callback_query
        if (!cq) continue
        // Faqat siz ko'rsatgan chatdan kelgan bosishlar qabul qilinadi
        if (String(cq.message && cq.message.chat && cq.message.chat.id) !== TG.chat) {
          await tg('answerCallbackQuery', { callback_query_id: cq.id, text: 'Ruxsat yo\'q' }).catch(() => {})
          continue
        }
        const [action, id] = String(cq.data || '').split(':')
        if (!['a', 'r'].includes(action) || !id) continue
        const result = decideRequest(id, action === 'a' ? 'approve' : 'reject', 'telegram')
        await tg('answerCallbackQuery', {
          callback_query_id: cq.id,
          text: result.error ? result.error : (action === 'a' ? 'Ruxsat berildi ✅' : 'Rad etildi ⛔'),
        }).catch(() => {})
      }
    } catch (e) {
      console.error('Telegram ulanish xatosi:', e.message)
      await sleep(8000)
    }
  }
}

// ===== 0A. OCHIQ API: kompaniyalar ro'yxati, kirish, ro'yxatdan o'tish =====
app.get('/api/health', (req, res) => {
  res.json({ success: true, status: 'ok', time: nowIso() })
})

app.get('/api/companies', (req, res) => {
  const { search } = req.query
  let list = db.companies || []
  if (search && String(search).trim()) {
    const q = String(search).toLowerCase().trim()
    list = list
      .filter(c => c.name.toLowerCase().includes(q) || (c.industry || '').toLowerCase().includes(q))
      .sort((a, b) => {
        const as = a.name.toLowerCase().startsWith(q) ? 0 : 1
        const bs = b.name.toLowerCase().startsWith(q) ? 0 : 1
        return as - bs
      })
  }
  res.json({
    success: true,
    companies: list.map(c => ({ id: c.id, name: c.name, industry: c.industry, city: c.city })),
  })
})

function pendingResponse(res, request, pollKey, user, status = 200) {
  res.status(status).json({
    success: true,
    pending: true,
    requestId: request.id,
    pollKey,
    expiresInSeconds: CONFIG.requestMinutes * 60,
    user: { name: user.name, login: user.login, company: user.company },
    message: 'So\'rov administratorga yuborildi. Ruxsat berilishini kuting.',
  })
}

// Kirish: login va parol to'g'ri bo'lsa — administratorga so'rov ketadi (token HALI berilmaydi)
app.post('/api/auth/login', (req, res) => {
  const { login, password } = req.body || {}
  const ip = clientIp(req)

  if (!login || !password) {
    return res.status(400).json({ success: false, message: 'Login va parol kiritilishi shart' })
  }

  const cleanLogin = String(login).trim().toLowerCase()
  const lockKey = `login:${ip}:${cleanLogin}`
  if (rlCount(lockKey, 300000) >= 5 || rlCount(`loginip:${ip}`, 300000) >= 20) {
    return res.status(429).json({ success: false, message: 'Juda ko\'p noto\'g\'ri urinish. 5 daqiqadan keyin qayta urinib ko\'ring.' })
  }
  console.log(`🔐 [${tashkentTime()}] LOGIN URINISH: "${cleanLogin}" | IP: ${ip}`)

  const user = db.users.find(u => u.login.toLowerCase() === cleanLogin)
  if (!user) {
    rlHit(lockKey); rlHit(`loginip:${ip}`)
    return res.status(404).json({
      success: false,
      message: 'Bunday hisob topilmadi! Iltimos, avval "Ro\'yxatdan o\'tish" bo\'limidan yangi hisob yarating.',
    })
  }

  if (!verifyPassword(String(password), user.password)) {
    rlHit(lockKey); rlHit(`loginip:${ip}`)
    console.log(`❌ PAROL XATO: "${cleanLogin}" | IP: ${ip}`)
    return res.status(401).json({ success: false, message: 'Parol noto\'g\'ri kiritildi!' })
  }

  if (user.blocked) {
    return res.status(403).json({ success: false, message: 'Bu hisob administrator tomonidan bloklangan.' })
  }

  attempts.delete(lockKey)
  const { request, pollKey } = createLoginRequest(user, req, 'login')
  pendingResponse(res, request, pollKey, user)
})

// Ro'yxatdan o'tish: hisob yaratiladi, lekin kirish uchun baribir administrator ruxsati kerak
app.post('/api/auth/register', (req, res) => {
  const { login, password, name, companyName, phone, role } = req.body || {}
  const ip = clientIp(req)

  if (!login || !String(login).trim()) {
    return res.status(400).json({ success: false, message: 'Iltimos, login kiriting' })
  }
  if (!password) {
    return res.status(400).json({ success: false, message: 'Iltimos, parol kiriting' })
  }

  const cleanLogin = String(login).trim()
  if (cleanLogin.length < 3 || cleanLogin.length > 40) {
    return res.status(400).json({ success: false, message: 'Login 3 dan 40 gacha belgidan iborat bo\'lishi kerak' })
  }
  if (String(password).length < 4) {
    return res.status(400).json({ success: false, message: 'Parol kamida 4 ta belgidan iborat bo\'lishi kerak' })
  }
  if (rlCount(`reg:${ip}`, 3600000) >= 5) {
    return res.status(429).json({ success: false, message: 'Juda ko\'p ro\'yxatdan o\'tish urinishi. Keyinroq urinib ko\'ring.' })
  }

  if (db.users.some(u => u.login.toLowerCase() === cleanLogin.toLowerCase())) {
    return res.status(400).json({
      success: false,
      message: 'Bu login allaqachon mavjud! "Tizimga kirish" bo\'limidan kiring yoki boshqa login tanlang.',
    })
  }

  const compName = (companyName && String(companyName).trim()) ? String(companyName).trim().slice(0, 80) : 'Hilol Kolbasalari'
  const existingCompany = db.companies.find(c => c.name.toLowerCase() === compName.toLowerCase())
  const finalCompany = existingCompany ? existingCompany.name : compName

  if (!existingCompany) {
    db.companies.unshift({
      id: `comp-${Date.now().toString(36)}`,
      name: compName,
      industry: 'Distribyutsiya va Savdo',
      city: 'Toshkent',
      phone: phone || '+998 71 200-55-44',
    })
  }

  const newUser = {
    id: `user-${Date.now().toString(36)}${crypto.randomBytes(2).toString('hex')}`,
    login: cleanLogin,
    password: hashPassword(password),
    name: (name && String(name).trim()) ? String(name).trim().slice(0, 80) : cleanLogin,
    company: finalCompany,
    role: 'Savdo Agenti', // rolni foydalanuvchi o'zi tanlay olmaydi
    phone: phone || '+998 90 123-45-67',
    avatar: '👨‍💼',
    blocked: false,
    createdAt: nowIso(),
  }
  void role

  db.users.push(newUser)
  saveDb()
  rlHit(`reg:${ip}`)
  console.log(`🆕 Yangi hisob: ${newUser.name} (login: ${newUser.login}, kompaniya: ${newUser.company}) — ruxsat kutilmoqda`)

  const { request, pollKey } = createLoginRequest(newUser, req, 'register')
  pendingResponse(res, request, pollKey, newUser, 201)
})

// Foydalanuvchi so'rovi holatini so'raydi (faqat so'rovni yaratgan qurilma — pollKey bilan)
function findOwnRequest(req) {
  expireStale()
  const r = db.loginRequests.find(x => x.id === req.params.id)
  const key = String(req.headers['x-poll-key'] || '')
  if (!r || !key || !safeEqual(sha256(key), r.pollKeyHash)) return null
  return r
}

app.get('/api/auth/request/:id', (req, res) => {
  const r = findOwnRequest(req)
  if (!r) return res.status(404).json({ success: false, status: 'unknown', message: 'So\'rov topilmadi' })

  if (r.status === 'pending') {
    const left = Math.max(0, Math.round((CONFIG.requestMinutes * 60000 - (Date.now() - new Date(r.createdAt).getTime())) / 1000))
    return res.json({ success: true, status: 'pending', secondsLeft: left })
  }

  if (r.status === 'approved') {
    const user = db.users.find(u => u.id === r.userId)
    if (!user || user.blocked) {
      return res.json({ success: true, status: 'rejected', message: 'Hisob bloklangan' })
    }
    if (r.tokenIssued) {
      return res.json({ success: true, status: 'expired', message: 'Bu ruxsat allaqachon ishlatilgan. Qayta kiring.' })
    }
    const { token } = createSession(user, req, r.id)
    r.tokenIssued = true
    saveDb()
    console.log(`🟢 [${tashkentTime()}] KIRDI: ${user.name} (${user.login}) | ${user.company}`)
    return res.json({
      success: true,
      status: 'approved',
      token,
      user: publicUser(user),
      message: `Xush kelibsiz, ${user.name}! (${user.company})`,
    })
  }

  const messages = {
    rejected: 'Administrator kirishga ruxsat bermadi.',
    expired: 'So\'rov muddati tugadi. Qayta kirishga urinib ko\'ring.',
    cancelled: 'So\'rov bekor qilindi.',
  }
  res.json({ success: true, status: r.status, message: messages[r.status] || 'So\'rov yopilgan' })
})

app.post('/api/auth/request/:id/cancel', (req, res) => {
  const r = findOwnRequest(req)
  if (!r) return res.status(404).json({ success: false, message: 'So\'rov topilmadi' })
  if (r.status === 'pending') {
    r.status = 'cancelled'
    r.decidedAt = nowIso()
    r.decidedBy = 'foydalanuvchi'
    saveDb()
    tgMarkDecided(r)
  }
  res.json({ success: true, status: r.status })
})

// ===== 0B. ADMIN API (faqat admin kaliti bilan) =====
app.post('/api/admin/check', requireAdmin, (req, res) => {
  res.json({ success: true, telegram: TG_ENABLED })
})

app.get('/api/admin/overview', requireAdmin, (req, res) => {
  expireStale()
  const sessions = db.sessions.filter(sessionActive).map(s => {
    const u = db.users.find(x => x.id === s.userId)
    return {
      id: s.id,
      userId: s.userId,
      name: u ? u.name : '—',
      login: u ? u.login : '—',
      company: u ? u.company : '—',
      ip: s.ip,
      device: s.device,
      createdAt: s.createdAt,
      expiresAt: s.expiresAt,
    }
  })

  const users = db.users.map(u => ({
    ...publicUser(u),
    blocked: Boolean(u.blocked),
    createdAt: u.createdAt || null,
    activeSessions: sessions.filter(s => s.userId === u.id).length,
  }))

  const pending = db.loginRequests.filter(r => r.status === 'pending').map(requestForAdmin).reverse()
  const history = db.loginRequests.filter(r => r.status !== 'pending').slice(0, 40).map(requestForAdmin)

  res.json({
    success: true,
    serverTime: nowIso(),
    telegram: TG_ENABLED,
    config: { sessionHours: CONFIG.sessionHours, requestMinutes: CONFIG.requestMinutes },
    stats: {
      pending: pending.length,
      activeSessions: sessions.length,
      users: users.length,
      companies: db.companies.length,
    },
    pending,
    history,
    sessions,
    users,
    companies: db.companies.map(c => ({ id: c.id, name: c.name, city: c.city, industry: c.industry })),
  })
})

function adminDecide(decision) {
  return (req, res) => {
    const result = decideRequest(req.params.id, decision, 'admin-panel')
    if (result.error) return res.status(result.code).json({ success: false, message: result.error })
    res.json({ success: true, request: requestForAdmin(result.request) })
  }
}
app.post('/api/admin/requests/:id/approve', requireAdmin, adminDecide('approve'))
app.post('/api/admin/requests/:id/reject', requireAdmin, adminDecide('reject'))

app.post('/api/admin/sessions/:id/revoke', requireAdmin, (req, res) => {
  const s = db.sessions.find(x => x.id === req.params.id)
  if (!s) return res.status(404).json({ success: false, message: 'Sessiya topilmadi' })
  s.revoked = true
  saveDb()
  res.json({ success: true })
})

app.post('/api/admin/users/:id/block', requireAdmin, (req, res) => {
  const u = db.users.find(x => x.id === req.params.id)
  if (!u) return res.status(404).json({ success: false, message: 'Foydalanuvchi topilmadi' })
  const blocked = Boolean(req.body && req.body.blocked)
  u.blocked = blocked
  if (blocked) {
    for (const s of db.sessions) if (s.userId === u.id) s.revoked = true
    for (const r of db.loginRequests) {
      if (r.userId === u.id && r.status === 'pending') {
        r.status = 'rejected'
        r.decidedAt = nowIso()
        r.decidedBy = 'admin-panel'
        tgMarkDecided(r)
      }
    }
  }
  saveDb()
  res.json({ success: true, blocked })
})

// Savdo ma'lumotlarini boshlang'ich holatga qaytarish (foydalanuvchilar va kompaniyalar saqlanadi)
app.post('/api/admin/reset', requireAdmin, (req, res) => {
  const keep = { users: db.users, sessions: db.sessions, loginRequests: db.loginRequests, companies: db.companies }
  db = { ...JSON.parse(JSON.stringify(initialData)), ...keep }
  saveDb()
  res.json({ success: true, message: 'Savdo ma\'lumotlari dastlabki holatga qaytarildi' })
})

// ===== 0C. HIMOYA: bundan keyingi barcha /api yo'llari tasdiqlangan sessiyani talab qiladi =====
app.get('/api/auth/me', requireSession, (req, res) => {
  res.json({ success: true, user: publicUser(req.user), session: { expiresAt: req.session.expiresAt } })
})

app.post('/api/auth/logout', requireSession, (req, res) => {
  req.session.revoked = true
  saveDb()
  res.json({ success: true })
})

app.use('/api', requireSession)

app.post('/api/companies', (req, res) => {
  const { name, industry, city } = req.body || {}
  if (!name || !String(name).trim()) {
    return res.status(400).json({ success: false, message: 'Kompaniya nomi kiritilishi shart' })
  }

  const trimmed = String(name).trim()
  let existing = db.companies.find(c => c.name.toLowerCase() === trimmed.toLowerCase())
  if (!existing) {
    existing = {
      id: `comp-${Date.now().toString(36)}`,
      name: trimmed,
      industry: industry || 'Distribyutsiya va Savdo',
      city: city || 'Toshkent',
      phone: '+998 71 200-00-00',
    }
    db.companies.unshift(existing)
    saveDb()
  }
  res.json({ success: true, company: existing })
})

// ===== 1. AGENT & DASHBOARD API =====
app.get('/api/agent', (req, res) => {
  res.json({ success: true, agent: getAgentStats(req.user) })
})

// ===== 2. PRODUCTS & CATEGORIES API =====
app.get('/api/categories', (req, res) => {
  res.json({ success: true, categories: db.categories })
})

app.get('/api/products', (req, res) => {
  const { category, search, popularOnly } = req.query
  let list = [...db.products]

  if (category && category !== 'cat-all') {
    list = list.filter(p => p.categoryId === category)
  }

  if (search) {
    const q = search.toLowerCase().trim()
    list = list.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      p.barcode.includes(q) ||
      p.category.toLowerCase().includes(q)
    )
  }

  if (popularOnly === 'true') {
    list = list.filter(p => p.isPopular)
  }

  res.json({ success: true, total: list.length, products: list })
})

app.get('/api/products/:id', (req, res) => {
  const product = db.products.find(p => p.id === req.params.id)
  if (!product) return res.status(404).json({ success: false, message: 'Mahsulot topilmadi' })
  res.json({ success: true, product })
})

// ===== 3. OUTLETS (SAVDO NUQTALARI) API =====
app.get('/api/outlets', (req, res) => {
  const { status, search, hasDebt } = req.query
  let list = [...db.outlets]

  if (status && status !== 'all') {
    list = list.filter(o => o.status === status)
  }

  if (search) {
    const q = search.toLowerCase().trim()
    list = list.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.address.toLowerCase().includes(q) ||
      p.contactPerson.toLowerCase().includes(q) ||
      p.phone.includes(q)
    )
  }

  if (hasDebt === 'true') {
    list = list.filter(o => o.debt > 0)
  }

  res.json({ success: true, total: list.length, outlets: list })
})

app.get('/api/outlets/:id', (req, res) => {
  const outlet = db.outlets.find(o => o.id === req.params.id)
  if (!outlet) return res.status(404).json({ success: false, message: 'Savdo nuqtasi topilmadi' })

  const outletOrders = db.orders.filter(o => o.outletId === outlet.id)
  const outletPayments = db.payments.filter(p => p.outletId === outlet.id)
  const outletVisits = db.visits.filter(v => v.outletId === outlet.id)

  res.json({
    success: true,
    outlet: {
      ...outlet,
      orders: outletOrders,
      payments: outletPayments,
      visits: outletVisits,
    },
  })
})

// Add new outlet
app.post('/api/outlets', (req, res) => {
  const { name, type, contactPerson, phone, address, landmark, creditLimit } = req.body
  if (!name || !address) {
    return res.status(400).json({ success: false, message: 'Nom va manzil kiritilishi shart' })
  }

  const newOutlet = {
    id: `out-${String(db.outlets.length + 1).padStart(2, '0')}`,
    name,
    type: type || 'B-Kategoriya (Do\'kon)',
    contactPerson: contactPerson || 'Do\'kon egasi',
    phone: phone || '+998 90 000-00-00',
    address,
    landmark: landmark || '',
    debt: 0,
    creditLimit: Number(creditLimit) || 10000000,
    status: 'planned',
    lastVisit: 'Hali tashrif buyurilmagan',
    routeOrder: db.outlets.length + 1,
    todayOrderTotal: 0,
    coords: { lat: 41.3111 + (Math.random() - 0.5) * 0.05, lng: 69.2406 + (Math.random() - 0.5) * 0.05 },
    photo: '🏪',
  }

  db.outlets.push(newOutlet)
  saveDb()
  res.status(201).json({ success: true, outlet: newOutlet })
})

// Check-in or complete visit
app.post('/api/outlets/:id/visit', (req, res) => {
  const outlet = db.outlets.find(o => o.id === req.params.id)
  if (!outlet) return res.status(404).json({ success: false, message: 'Savdo nuqtasi topilmadi' })

  const { note, result } = req.body
  const now = new Date()
  const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`

  outlet.status = 'visited'
  outlet.lastVisit = `2026-10-28 ${timeStr}`

  const newVisit = {
    id: `VIS-${String(db.visits.length + 1).padStart(2, '0')}`,
    outletId: outlet.id,
    outletName: outlet.name,
    checkIn: `2026-10-28 ${timeStr}`,
    checkOut: `2026-10-28 ${timeStr}`,
    durationMinutes: 15,
    result: result || note || 'Rejaviy tashrif bajarildi',
    status: 'Bajarildi',
    orderPlaced: false,
    amount: 0,
  }

  db.visits.unshift(newVisit)
  saveDb()
  res.json({ success: true, outlet, visit: newVisit })
})

// ===== 4. ORDERS API =====
app.get('/api/orders', (req, res) => {
  res.json({ success: true, total: db.orders.length, orders: db.orders })
})

app.post('/api/orders', (req, res) => {
  const { outletId, items, paymentType, discount = 0 } = req.body

  const outlet = db.outlets.find(o => o.id === outletId)
  if (!outlet) return res.status(404).json({ success: false, message: 'Savdo nuqtasi topilmadi' })

  if (!items || !items.length) {
    return res.status(400).json({ success: false, message: 'Buyurtmada tovarlar yo\'q' })
  }

  let totalRaw = 0
  const orderItems = []

  for (const item of items) {
    const prod = db.products.find(p => p.id === item.productId)
    if (prod) {
      const qty = Number(item.qty) || 1
      const itemTotal = prod.price * qty
      totalRaw += itemTotal

      prod.stock = Math.max(0, prod.stock - qty)

      orderItems.push({
        productId: prod.id,
        name: prod.name,
        price: prod.price,
        qty,
        total: itemTotal,
      })
    }
  }

  const finalTotal = Math.max(0, totalRaw - Number(discount))
  const orderNum = 890 + db.orders.length + 1

  const now = new Date()
  const dateStr = `2026-10-28 ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`

  const newOrder = {
    id: `ORD-2026-0${orderNum}`,
    outletId: outlet.id,
    outletName: outlet.name,
    agentId: req.user.id,
    agentName: req.user.name,
    date: dateStr,
    itemsCount: orderItems.length,
    totalAmount: finalTotal,
    discount: Number(discount),
    paymentType: paymentType || 'Nasiya / Qarz',
    status: 'Tasdiqlangan',
    syncStatus: 'Sinxronlangan',
    items: orderItems,
  }

  db.orders.unshift(newOrder)

  // Update outlet stats
  outlet.status = 'order_placed'
  outlet.todayOrderTotal = (outlet.todayOrderTotal || 0) + finalTotal
  if (paymentType && paymentType.toLowerCase().includes('qarz')) {
    outlet.debt += finalTotal
  }

  // Update visit record
  const visit = db.visits.find(v => v.outletId === outlet.id)
  if (visit) {
    visit.orderPlaced = true
    visit.amount = (visit.amount || 0) + finalTotal
  }

  saveDb()
  res.status(201).json({ success: true, order: newOrder, message: 'Buyurtma muvaffaqiyatli qabul qilindi' })
})

// ===== 5. PAYMENTS / INKASSATSIYA API =====
app.get('/api/payments', (req, res) => {
  res.json({ success: true, total: db.payments.length, payments: db.payments })
})

app.post('/api/payments', (req, res) => {
  const { outletId, amount, paymentMethod, note } = req.body

  const outlet = db.outlets.find(o => o.id === outletId)
  if (!outlet) return res.status(404).json({ success: false, message: 'Savdo nuqtasi topilmadi' })

  const payAmount = Number(amount)
  if (!payAmount || payAmount <= 0) {
    return res.status(400).json({ success: false, message: 'To\'g\'ri to\'lov summasini kiriting' })
  }

  const now = new Date()
  const dateStr = `2026-10-28 ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
  const receiptNum = `CHK-${Math.floor(10000 + Math.random() * 90000)}`

  const newPayment = {
    id: `PAY-${1000 + db.payments.length + 1}`,
    outletId: outlet.id,
    outletName: outlet.name,
    amount: payAmount,
    paymentMethod: paymentMethod || 'Naqd pul (Inkassatsiya)',
    date: dateStr,
    receiptNumber: receiptNum,
    note: note || 'Qarz to\'lovi qabul qilindi',
  }

  db.payments.unshift(newPayment)

  // Reduce outlet debt
  outlet.debt = Math.max(0, outlet.debt - payAmount)

  saveDb()
  res.status(201).json({
    success: true,
    payment: newPayment,
    remainingDebt: outlet.debt,
    message: 'To\'lov muvaffaqiyatli qabul qilindi',
  })
})

// ===== 6. WAREHOUSE (OMBOR QOLDIG'I) API =====
app.get('/api/warehouse', (req, res) => {
  const totalStockUnits = db.products.reduce((sum, p) => sum + p.stock, 0)
  const totalStockValue = db.products.reduce((sum, p) => sum + (p.stock * p.price), 0)
  const lowStock = db.products.filter(p => p.stock < 200)

  res.json({
    success: true,
    summary: {
      totalProducts: db.products.length,
      totalStockUnits,
      totalStockValue,
      lowStockCount: lowStock.length,
    },
    lowStockItems: lowStock,
    products: db.products,
  })
})

// ===== 7. SYNC & RESET API =====
app.get('/api/sync', (req, res) => {
  res.json({
    success: true,
    timestamp: new Date().toISOString(),
    db: publicDb(),
  })
})

app.post('/api/sync', (req, res) => {
  const { offlineOrders = [], offlinePayments = [] } = req.body

  let addedOrders = 0
  for (const ord of offlineOrders) {
    if (!db.orders.some(o => o.id === ord.id)) {
      db.orders.unshift({ ...ord, syncStatus: 'Sinxronlangan' })
      addedOrders++
    }
  }

  saveDb()
  res.json({
    success: true,
    message: `${addedOrders} ta offline buyurtma serverga yuklandi`,
    timestamp: new Date().toISOString(),
  })
})

// ===== 8. USERS LIST (tizimga kirgan foydalanuvchilar uchun) =====
app.get('/api/users', (req, res) => {
  const users = (db.users || []).map(publicUser) // parol HECH QACHON yuborilmaydi
  res.json({ success: true, total: users.length, users })
})

// Noma'lum /api yo'llari
app.use('/api', (req, res) => {
  res.status(404).json({ success: false, message: 'Bunday API topilmadi' })
})

// Tayyor (build qilingan) frontend bo'lsa, shu server o'zi ham uni ko'rsatadi
if (fs.existsSync(path.join(DIST_DIR, 'index.html'))) {
  app.use(express.static(DIST_DIR))
  app.get('/{*splat}', (req, res) => {
    res.sendFile(path.join(DIST_DIR, 'index.html'))
  })
  console.log('🖥️  dist/ topildi — frontend shu serverdan ham ochiladi')
}

// JSON xatolar (noto'g'ri so'rov formati va h.k.)
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err)
  const status = err.status || 500
  if (status >= 500) console.error(err)
  res.status(status).json({
    success: false,
    message: status === 400 ? 'So\'rov formati noto\'g\'ri' : 'Server xatosi',
  })
})

process.on('unhandledRejection', (e) => console.error('unhandledRejection:', e))

app.listen(PORT, () => {
  console.log(`🚀 SD Agent Backend server running on http://localhost:${PORT}`)
  console.log('────────────────────────────────────────────────────')
  console.log(`🛡️  ADMIN PANEL:  http://localhost:5173/admin   (yoki http://localhost:${PORT}/admin)`)
  console.log(`🔑 ADMIN KALITI:  ${ADMIN_KEY}`)
  console.log(`⏱️  Ruxsat muddati: ${CONFIG.sessionHours} soat | So'rov kutish: ${CONFIG.requestMinutes} daqiqa`)
  console.log('────────────────────────────────────────────────────')
  if (TG_ENABLED) tgLoop()
  else console.log('ℹ️  Telegram o\'chiq (ixtiyoriy). Yoqish uchun README dagi ko\'rsatmaga qarang.')
})
