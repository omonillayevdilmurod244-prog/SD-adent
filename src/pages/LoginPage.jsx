import React, { useState, useEffect, useRef } from 'react'
import {
  FiUser,
  FiLock,
  FiBriefcase,
  FiArrowRight,
  FiEye,
  FiEyeOff,
  FiSearch,
  FiCheck,
  FiUserPlus,
  FiLogIn,
  FiPhone,
  FiX,
  FiPlus,
} from 'react-icons/fi'
import { HiLightningBolt } from 'react-icons/hi'
import { loginUser, registerUser, getCompanies, getLoginRequestStatus, cancelLoginRequest } from '../services/api'
import { useApp } from '../context/AppContext'

const PENDING_KEY = 'sd_pending_request'

const formatMmSs = (sec) => {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// Kompaniya nomidagi mos keladigan qismini ajratib ko'rsatish
function Highlight({ text, query }) {
  const q = (query || '').trim()
  if (!q) return <>{text}</>
  const i = text.toLowerCase().indexOf(q.toLowerCase())
  if (i < 0) return <>{text}</>
  return (
    <>
      {text.slice(0, i)}
      <mark style={{ background: 'rgba(56, 189, 248, 0.3)', color: '#fff', borderRadius: '3px', padding: '0 1px' }}>
        {text.slice(i, i + q.length)}
      </mark>
      {text.slice(i + q.length)}
    </>
  )
}

export default function LoginPage({ onLoginSuccess }) {
  const { addToast, playChime } = useApp()

  const [mode, setMode] = useState('login') // 'register' | 'login'

  // Form states
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('+998 90 ')
  const [companyName, setCompanyName] = useState('Hilol Kolbasalari')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  // Administrator ruxsatini kutish holati
  const [pending, setPending] = useState(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(PENDING_KEY) || 'null')
      return saved && saved.expiresAt > Date.now() ? saved : null
    } catch {
      return null
    }
  })
  const [secondsLeft, setSecondsLeft] = useState(0)
  const claimedRef = useRef(false)

  // Company suggestions list
  const [companiesList, setCompaniesList] = useState([])
  const [filteredCompanies, setFilteredCompanies] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)
  const dropdownRef = useRef(null)
  const searchTimer = useRef(null)

  const loadCompanies = () =>
    getCompanies()
      .then(comps => {
        setCompaniesList(comps || [])
        setFilteredCompanies(comps || [])
      })
      .catch(err => console.error('Error fetching companies:', err))

  useEffect(() => {
    loadCompanies()

    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      clearTimeout(searchTimer.current)
    }
  }, [])

  // ===== Administrator qarorini kutish (har 2 soniyada so'raymiz) =====
  useEffect(() => {
    if (!pending) return
    claimedRef.current = false
    let inFlight = false
    let stopped = false

    const closePending = (message) => {
      sessionStorage.removeItem(PENDING_KEY)
      setPending(null)
      if (message) addToast(message, 'error')
    }

    const tick = async () => {
      if (inFlight || claimedRef.current) return
      inFlight = true
      try {
        const r = await getLoginRequestStatus(pending.requestId, pending.pollKey)
        if (claimedRef.current) return
        if (r.status === 'approved' && r.token) {
          // Token faqat bir marta beriladi — javobni hech qachon tashlab yubormaymiz
          claimedRef.current = true
          sessionStorage.removeItem(PENDING_KEY)
          playChime('success')
          addToast(r.message || `Xush kelibsiz, ${r.user.name}!`, 'success')
          onLoginSuccess(r.user, r.token)
        } else if (!stopped && r.status !== 'pending') {
          closePending(r.message || 'So\'rov yopildi')
        }
      } catch (err) {
        if (!stopped && err.response?.status === 404) {
          closePending('So\'rov topilmadi. Qaytadan kirishga urinib ko\'ring.')
        }
        // tarmoq xatosi bo'lsa — keyingi urinishda qayta so'raymiz
      } finally {
        inFlight = false
      }
    }

    tick()
    const iv = setInterval(tick, 2000)
    return () => {
      stopped = true
      clearInterval(iv)
    }
  }, [pending])

  // Qolgan vaqt hisoblagichi
  useEffect(() => {
    if (!pending) return
    const update = () => setSecondsLeft(Math.max(0, Math.round((pending.expiresAt - Date.now()) / 1000)))
    update()
    const iv = setInterval(update, 1000)
    return () => clearInterval(iv)
  }, [pending])

  const startPending = (res) => {
    const p = {
      requestId: res.requestId,
      pollKey: res.pollKey,
      user: res.user,
      expiresAt: Date.now() + (res.expiresInSeconds || 600) * 1000,
    }
    sessionStorage.setItem(PENDING_KEY, JSON.stringify(p))
    setPassword('')
    setPending(p)
  }

  const handleCancelPending = async () => {
    const p = pending
    sessionStorage.removeItem(PENDING_KEY)
    setPending(null)
    try {
      await cancelLoginRequest(p.requestId, p.pollKey)
    } catch {
      // bekor qilish xabari yetib bormasa ham, so'rov o'zi muddati bilan tugaydi
    }
    addToast('So\'rov bekor qilindi', 'info')
  }

  // ===== Kompaniya nomini yozganda ro'yxat O'ZI chiqadi =====
  const handleCompanyInput = (val) => {
    setCompanyName(val)
    setShowSuggestions(true)
    setActiveIdx(-1)

    // Darhol mahalliy ro'yxatdan filtrlaymiz...
    const q = val.toLowerCase().trim()
    setFilteredCompanies(
      !q
        ? companiesList
        : companiesList.filter(c => c.name.toLowerCase().includes(q) || (c.industry && c.industry.toLowerCase().includes(q))),
    )
    // ...va serverdan yangilarini ham olamiz (boshqa agentlar qo'shgan kompaniyalar)
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => {
      getCompanies(val.trim())
        .then(list => setFilteredCompanies(list || []))
        .catch(() => {})
    }, 200)
  }

  const selectCompany = (selectedName) => {
    setCompanyName(selectedName)
    setShowSuggestions(false)
    setActiveIdx(-1)
  }

  const trimmedCompany = companyName.trim()
  const exactCompany = companiesList.find(c => c.name.toLowerCase() === trimmedCompany.toLowerCase())
  const canAddNew = trimmedCompany.length > 0 && !exactCompany

  const handleCompanyKeyDown = (e) => {
    const total = filteredCompanies.length
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setShowSuggestions(true)
      setActiveIdx(i => (total ? (i + 1) % total : -1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx(i => (total ? (i - 1 + total) % total : -1))
    } else if (e.key === 'Enter' && showSuggestions && activeIdx >= 0 && filteredCompanies[activeIdx]) {
      e.preventDefault()
      selectCompany(filteredCompanies[activeIdx].name)
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
    }
  }

  // Handle Form Submission
  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!login.trim()) {
      addToast('Iltimos, login kiriting', 'error')
      return
    }
    if (!password) {
      addToast('Iltimos, parol kiriting', 'error')
      return
    }

    setLoading(true)

    try {
      const res =
        mode === 'login'
          ? await loginUser({ login: login.trim(), password })
          : await registerUser({
              login: login.trim(),
              password,
              name: name.trim() || login.trim(),
              companyName: companyName.trim() || 'Hilol Kolbasalari',
              phone: phone.trim(),
              role: 'Savdo Agenti',
            })

      if (res && res.success && res.pending) {
        addToast('So\'rov administratorga yuborildi. Ruxsatni kuting...', 'info')
        startPending(res)
      }
    } catch (err) {
      const fallback = mode === 'login' ? 'Login yoki parol noto\'g\'ri' : 'Ro\'yxatdan o\'tishda xatolik yuz berdi'
      const msg = err.response?.data?.message || (err.response ? fallback : 'Server bilan aloqa yo\'q. Server ishlayotganini tekshiring.')
      addToast(msg, 'error')
    } finally {
      setLoading(false)
    }
  }

  // ===== Administrator ruxsatini kutish oynasi =====
  if (pending) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'radial-gradient(circle at 50% 20%, #172554 0%, #0b1120 70%)',
          padding: '24px 16px',
        }}
      >
        <div
          className="card animate-fade-in"
          style={{
            width: '100%',
            maxWidth: '460px',
            textAlign: 'center',
            background: 'rgba(19, 28, 49, 0.95)',
            border: '1px solid rgba(245, 158, 11, 0.4)',
            borderRadius: '24px',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6), 0 0 40px rgba(245, 158, 11, 0.15)',
            padding: '36px 32px',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              margin: '0 auto 18px',
              border: '4px solid rgba(245, 158, 11, 0.2)',
              borderTopColor: '#f59e0b',
              animation: 'sd-spin 1s linear infinite',
            }}
          />
          <style>{`@keyframes sd-spin { to { transform: rotate(360deg); } }`}</style>

          <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#fff', marginBottom: '6px' }}>
            Administrator ruxsatini kutyapmiz
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '20px' }}>
            So'rovingiz yuborildi. Administrator ruxsat berishi bilan siz avtomatik tizimga kirasiz.
          </p>

          <div
            style={{
              background: 'var(--bg-surface)',
              borderRadius: 'var(--radius-md)',
              padding: '14px 16px',
              textAlign: 'left',
              fontSize: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              marginBottom: '16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Foydalanuvchi:</span>
              <b style={{ color: '#fff' }}>{pending.user?.name} ({pending.user?.login})</b>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Kompaniya:</span>
              <b style={{ color: '#38bdf8', textAlign: 'right' }}>{pending.user?.company}</b>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Kutish muddati:</span>
              <b style={{ color: secondsLeft < 60 ? '#ef4444' : '#f59e0b', fontVariantNumeric: 'tabular-nums' }}>
                {formatMmSs(secondsLeft)}
              </b>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-secondary"
            style={{ width: '100%', padding: '12px', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)' }}
            onClick={handleCancelPending}
          >
            <FiX /> So'rovni bekor qilish
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(circle at 50% 20%, #172554 0%, #0b1120 70%)',
        padding: '24px 16px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background ambient glowing orbs */}
      <div style={{ position: 'absolute', top: '15%', left: '20%', width: '320px', height: '320px', background: 'radial-gradient(circle, rgba(37,99,235,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '15%', right: '20%', width: '350px', height: '350px', background: 'radial-gradient(circle, rgba(6,182,212,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div
        className="card animate-fade-in"
        style={{
          width: '100%',
          maxWidth: '480px',
          background: 'rgba(19, 28, 49, 0.95)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(37, 99, 235, 0.4)',
          borderRadius: '24px',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6), 0 0 40px rgba(37, 99, 235, 0.2)',
          padding: '36px 32px',
          zIndex: 10,
        }}
      >
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #2563eb, #06b6d4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px',
              fontSize: '32px',
              color: '#fff',
              boxShadow: '0 8px 25px rgba(37, 99, 235, 0.5)',
            }}
          >
            <HiLightningBolt />
          </div>

          <h1 style={{ fontSize: '26px', fontWeight: 900, color: '#fff', letterSpacing: '-0.5px', marginBottom: '4px' }}>
            SD <span style={{ color: '#38bdf8' }}>Agent</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 500 }}>
            Sales Doctor &bull; Savdo va Distribyutsiya Tizimi
          </p>
        </div>

        {/* Tab Switcher: Ro'yxatdan O'tish vs Tizimga Kirish */}
        <div
          style={{
            display: 'flex',
            background: 'var(--bg-surface)',
            padding: '4px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border)',
            marginBottom: '22px',
          }}
        >
          <button
            type="button"
            className={`btn btn-sm ${mode === 'register' ? 'btn-primary' : ''}`}
            style={{
              flex: 1,
              background: mode === 'register' ? 'var(--primary)' : 'transparent',
              color: mode === 'register' ? '#fff' : 'var(--text-secondary)',
              padding: '10px',
              fontWeight: 700,
            }}
            onClick={() => {
              setMode('register')
            }}
          >
            <FiUserPlus /> 1. Ro'yxatdan O'tish
          </button>

          <button
            type="button"
            className={`btn btn-sm ${mode === 'login' ? 'btn-primary' : ''}`}
            style={{
              flex: 1,
              background: mode === 'login' ? 'var(--primary)' : 'transparent',
              color: mode === 'login' ? '#fff' : 'var(--text-secondary)',
              padding: '10px',
              fontWeight: 700,
            }}
            onClick={() => {
              setMode('login')
            }}
          >
            <FiLogIn /> 2. Tizimga Kirish
          </button>
        </div>

        {/* Info notice about current mode */}
        <div
          style={{
            background: mode === 'register' ? 'rgba(37, 99, 235, 0.15)' : 'rgba(16, 185, 129, 0.15)',
            border: `1px solid ${mode === 'register' ? 'rgba(37, 99, 235, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
            borderRadius: '10px',
            padding: '10px 14px',
            fontSize: '12px',
            color: mode === 'register' ? '#60a5fa' : '#34d399',
            marginBottom: '18px',
          }}
        >
          {mode === 'register' ? (
            <span>✨ <b>Yangi hisob:</b> Login va parol yozing. Hisob saqlanadi, kirish uchun administrator ruxsati kerak.</span>
          ) : (
            <span>🔑 <b>Mavjud hisob:</b> Login va parolni yozing — so'rov administratorga boradi, ruxsat bergach kirasiz.</span>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {/* If Register: Company Selection */}
          {mode === 'register' && (
            <div ref={dropdownRef} style={{ position: 'relative' }}>
              <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontWeight: 600 }}>
                <span>🏢 Kompaniya / Biznes Nomi:</span>
                {exactCompany ? (
                  <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 700 }}>✓ Mavjud kompaniya</span>
                ) : canAddNew ? (
                  <span style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 700 }}>🆕 Yangi kompaniya</span>
                ) : null}
              </label>
              <div style={{ position: 'relative' }}>
                <FiBriefcase style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  required
                  placeholder="Kompaniya nomi (masalan: Hilol kolbasalari)..."
                  className="form-input"
                  style={{ paddingLeft: '40px', paddingRight: '36px', fontSize: '14px', fontWeight: 600, borderColor: '#2563eb' }}
                  value={companyName}
                  autoComplete="off"
                  onChange={e => handleCompanyInput(e.target.value)}
                  onFocus={() => {
                    setShowSuggestions(true)
                    loadCompanies()
                  }}
                  onKeyDown={handleCompanyKeyDown}
                />
                <button
                  type="button"
                  onClick={() => setShowSuggestions(!showSuggestions)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--primary-light)',
                    cursor: 'pointer',
                    fontSize: '14px',
                  }}
                >
                  <FiSearch />
                </button>
              </div>

              {/* Company Quick-Select Chips */}
              <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                {companiesList.slice(0, 3).map(c => (
                  <button
                    key={c.id}
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{
                      fontSize: '11px',
                      padding: '3px 8px',
                      background: companyName === c.name ? 'var(--primary)' : 'var(--bg-surface)',
                      color: companyName === c.name ? '#fff' : 'var(--text-secondary)',
                    }}
                    onClick={() => selectCompany(c.name)}
                  >
                    🏢 {c.name}
                  </button>
                ))}
              </div>

              {/* Dropdown list of companies matching search */}
              {showSuggestions && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    zIndex: 50,
                    marginTop: '4px',
                    background: '#131c31',
                    border: '1px solid rgba(37, 99, 235, 0.4)',
                    borderRadius: '12px',
                    boxShadow: '0 12px 30px rgba(0, 0, 0, 0.7)',
                    maxHeight: '200px',
                    overflowY: 'auto',
                  }}
                >
                  <div style={{ padding: '8px 12px', fontSize: '11px', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>
                    🔍 Kompaniyalar ro'yxati:
                  </div>

                  {filteredCompanies.length === 0 && !canAddNew && (
                    <div style={{ padding: '12px 14px', fontSize: '13px', color: 'var(--text-muted)' }}>Kompaniya topilmadi</div>
                  )}

                  {filteredCompanies.map((c, idx) => (
                    <div
                      key={c.id}
                      onClick={() => selectCompany(c.name)}
                      style={{
                        padding: '10px 14px',
                        fontSize: '13px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                        background: idx === activeIdx ? 'rgba(37, 99, 235, 0.25)' : 'transparent',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={() => setActiveIdx(idx)}
                    >
                      <div>
                        <div style={{ fontWeight: 700, color: '#fff' }}>
                          <Highlight text={c.name} query={companyName} />
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{c.industry || 'Savdo'} &bull; {c.city || 'Toshkent'}</div>
                      </div>
                      <FiCheck style={{ color: companyName === c.name ? '#10b981' : 'transparent' }} />
                    </div>
                  ))}

                  {canAddNew && (
                    <div
                      onClick={() => selectCompany(trimmedCompany)}
                      style={{
                        padding: '10px 14px',
                        fontSize: '13px',
                        cursor: 'pointer',
                        color: '#fbbf24',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                    >
                      <FiPlus /> &laquo;{trimmedCompany}&raquo; ni yangi kompaniya sifatida qo'shish
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* If Register: Agent Name */}
          {mode === 'register' && (
            <div>
              <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px', fontWeight: 600 }}>
                Agent Ismi (F.I.Sh)
              </label>
              <div style={{ position: 'relative' }}>
                <FiUser style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Ismingiz (masalan: Islom Karimov)"
                  className="form-input"
                  style={{ paddingLeft: '40px' }}
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Login Field */}
          <div>
            <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px', fontWeight: 600 }}>
              {mode === 'register' ? 'O\'zingiz Xohlagan Yangi Login *' : 'Login *'}
            </label>
            <div style={{ position: 'relative' }}>
              <FiUser style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                required
                autoFocus
                placeholder={mode === 'register' ? 'Ixtiyoriy login yozing...' : 'Loginingizni kiriting...'}
                className="form-input"
                style={{ paddingLeft: '40px', fontSize: '15px' }}
                value={login}
                onChange={e => setLogin(e.target.value)}
              />
            </div>
          </div>

          {/* Password Field */}
          <div>
            <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px', fontWeight: 600 }}>
              {mode === 'register' ? 'O\'zingiz Xohlagan Yangi Parol *' : 'Parol *'}
            </label>
            <div style={{ position: 'relative' }}>
              <FiLock style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="Parolni kiriting..."
                className="form-input"
                style={{ paddingLeft: '40px', paddingRight: '40px', fontSize: '15px' }}
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: '16px',
                }}
              >
                {showPassword ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
          </div>

          {/* If Register: Phone */}
          {mode === 'register' && (
            <div>
              <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px', fontWeight: 600 }}>
                Telefon Raqam (Ixtiyoriy)
              </label>
              <div style={{ position: 'relative' }}>
                <FiPhone style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="+998 90 123-45-67"
                  className="form-input"
                  style={{ paddingLeft: '40px' }}
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            className={`btn ${mode === 'register' ? 'btn-success' : 'btn-primary'}`}
            style={{ width: '100%', padding: '14px', fontSize: '15px', marginTop: '6px', fontWeight: 700 }}
            disabled={loading}
          >
            {loading ? (
              'So\'rov yuborilmoqda...'
            ) : mode === 'register' ? (
              <>
                <FiCheck /> Ro'yxatdan O'tish va Ruxsat So'rash
              </>
            ) : (
              <>
                <FiLogIn /> Kirish — Administratordan Ruxsat So'rash
              </>
            )}
          </button>
        </form>

        {/* Footer switch prompt */}
        <div style={{ textAlign: 'center', marginTop: '18px', fontSize: '13px', color: 'var(--text-secondary)' }}>
          {mode === 'register' ? (
            <span>
              Allaqachon hisobingiz bormi?{' '}
              <button
                type="button"
                style={{ color: '#38bdf8', fontWeight: 700, textDecoration: 'underline', border: 'none', background: 'none', cursor: 'pointer' }}
                onClick={() => setMode('login')}
              >
                Tizimga kiring
              </button>
            </span>
          ) : (
            <span>
              Hisobingiz yo'qmi?{' '}
              <button
                type="button"
                style={{ color: '#10b981', fontWeight: 700, textDecoration: 'underline', border: 'none', background: 'none', cursor: 'pointer' }}
                onClick={() => setMode('register')}
              >
                Ro'yxatdan o'ting
              </button>
            </span>
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: '14px' }}>
          <a href="/admin" style={{ fontSize: '11px', color: 'var(--text-muted)', textDecoration: 'none' }}>
            🛡️ Administrator paneli
          </a>
        </div>
      </div>
    </div>
  )
}
