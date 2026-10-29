import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  FiShield,
  FiLock,
  FiCheck,
  FiX,
  FiLogOut,
  FiBell,
  FiBellOff,
  FiUsers,
  FiActivity,
  FiBriefcase,
  FiClock,
  FiSlash,
  FiUnlock,
  FiMonitor,
} from 'react-icons/fi'
import {
  adminCheck,
  adminOverview,
  adminDecide,
  adminRevokeSession,
  adminBlockUser,
  ADMIN_KEY_STORAGE,
} from '../services/api'
import { useApp } from '../context/AppContext'

const POLL_MS = 2000

const fmtTime = (iso) => {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('uz-UZ', { timeZone: 'Asia/Tashkent', hour12: false })
}

const ago = (iso) => {
  const sec = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000))
  if (sec < 60) return `${sec} soniya oldin`
  if (sec < 3600) return `${Math.floor(sec / 60)} daqiqa oldin`
  return `${Math.floor(sec / 3600)} soat oldin`
}

const shortDevice = (ua = '') => {
  const browser = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Brauzer'
  const os = /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : /Windows/.test(ua) ? 'Windows' : /Mac OS/.test(ua) ? 'Mac' : /Linux/.test(ua) ? 'Linux' : ''
  return os ? `${browser} · ${os}` : browser
}

const STATUS_BADGE = {
  approved: 'badge-success',
  rejected: 'badge-danger',
  pending: 'badge-warning',
  expired: 'badge-warning',
  cancelled: 'badge-warning',
}

export default function AdminPage() {
  const { addToast } = useApp()

  const [adminKey, setAdminKey] = useState(() => localStorage.getItem(ADMIN_KEY_STORAGE) || '')
  const [authed, setAuthed] = useState(false)
  const [checking, setChecking] = useState(() => Boolean(localStorage.getItem(ADMIN_KEY_STORAGE)))
  const [keyInput, setKeyInput] = useState('')
  const [loginError, setLoginError] = useState('')

  const [data, setData] = useState(null)
  const [online, setOnline] = useState(true)
  const [busyId, setBusyId] = useState(null)
  const [soundOn, setSoundOn] = useState(true)
  const [notifPerm, setNotifPerm] = useState(typeof Notification !== 'undefined' ? Notification.permission : 'denied')
  const [tab, setTab] = useState('requests')

  const seenPending = useRef(null) // avval ko'rilgan so'rov id lari (yangisini aniqlash uchun)
  const audioCtx = useRef(null)
  const soundRef = useRef(soundOn)
  soundRef.current = soundOn

  // ===== Ovozli signal (yangi so'rov kelganda) =====
  const beep = useCallback(() => {
    if (!soundRef.current) return
    try {
      const AC = window.AudioContext || window.webkitAudioContext
      if (!AC) return
      if (!audioCtx.current) audioCtx.current = new AC()
      const ctx = audioCtx.current
      if (ctx.state === 'suspended') ctx.resume()
      const t0 = ctx.currentTime
      ;[880, 1175, 880, 1175].forEach((f, i) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.frequency.value = f
        gain.gain.setValueAtTime(0.18, t0 + i * 0.18)
        gain.gain.exponentialRampToValueAtTime(0.001, t0 + i * 0.18 + 0.15)
        osc.start(t0 + i * 0.18)
        osc.stop(t0 + i * 0.18 + 0.16)
      })
    } catch {
      // brauzer ovozga ruxsat bermasa — jim o'tamiz
    }
  }, [])

  // ===== Kirish =====
  const tryLogin = async (key, silent = false) => {
    setChecking(true)
    try {
      await adminCheck(key)
      localStorage.setItem(ADMIN_KEY_STORAGE, key)
      setAdminKey(key)
      setAuthed(true)
      setLoginError('')
    } catch (err) {
      localStorage.removeItem(ADMIN_KEY_STORAGE)
      setAuthed(false)
      if (!silent || err.response) {
        setLoginError(
          err.response?.data?.message || 'Server bilan aloqa yo\'q. Server ishlayotganini tekshiring.',
        )
      }
    } finally {
      setChecking(false)
    }
  }

  useEffect(() => {
    if (adminKey) tryLogin(adminKey, true)
    else setChecking(false)
  }, [])

  const logout = () => {
    localStorage.removeItem(ADMIN_KEY_STORAGE)
    setAdminKey('')
    setAuthed(false)
    setData(null)
    seenPending.current = null
  }

  // ===== Ma'lumotlarni doimiy yangilab turish =====
  useEffect(() => {
    if (!authed) return
    let stopped = false

    const load = async () => {
      try {
        const d = await adminOverview(adminKey)
        if (stopped) return
        setOnline(true)
        setData(d)

        const ids = d.pending.map(r => r.id)
        if (seenPending.current === null) {
          // birinchi yuklash: kutayotgan so'rov bo'lsa ham signal beramiz
          if (ids.length) beep()
        } else {
          const fresh = d.pending.filter(r => !seenPending.current.has(r.id))
          if (fresh.length) {
            beep()
            if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
              const r = fresh[0]
              try {
                new Notification('SD Agent: yangi kirish so\'rovi', { body: `${r.name} — ${r.company}` })
              } catch {
                // ba'zi mobil brauzerlar Notification konstruktorini qo'llamaydi
              }
            }
          }
        }
        seenPending.current = new Set(ids)
      } catch (err) {
        if (stopped) return
        if (err.response?.status === 401) {
          logout()
          setLoginError('Admin kaliti noto\'g\'ri yoki o\'zgargan')
        } else {
          setOnline(false)
        }
      }
    }

    load()
    const iv = setInterval(load, POLL_MS)
    return () => {
      stopped = true
      clearInterval(iv)
    }
  }, [authed, adminKey, beep])

  // Brauzer sarlavhasida kutayotgan so'rovlar soni
  const pendingCount = data?.stats?.pending || 0
  useEffect(() => {
    document.title = pendingCount > 0 ? `(${pendingCount}) Yangi so'rov — SD Agent Admin` : 'SD Agent — Admin panel'
    return () => {
      document.title = 'SD Agent'
    }
  }, [pendingCount])

  // ===== Amallar =====
  const refresh = async () => {
    try {
      setData(await adminOverview(adminKey))
    } catch {
      // keyingi avtomatik yangilanish tuzatadi
    }
  }

  const decide = async (id, decision) => {
    setBusyId(id)
    try {
      await adminDecide(adminKey, id, decision)
      addToast(decision === 'approve' ? '✅ Ruxsat berildi — foydalanuvchi kirmoqda' : '⛔ So\'rov rad etildi', decision === 'approve' ? 'success' : 'info')
    } catch (err) {
      addToast(err.response?.data?.message || 'Amal bajarilmadi', 'error')
    } finally {
      setBusyId(null)
      refresh()
    }
  }

  const revoke = async (id) => {
    setBusyId(id)
    try {
      await adminRevokeSession(adminKey, id)
      addToast('Foydalanuvchi tizimdan chiqarib yuborildi', 'info')
    } catch (err) {
      addToast(err.response?.data?.message || 'Amal bajarilmadi', 'error')
    } finally {
      setBusyId(null)
      refresh()
    }
  }

  const toggleBlock = async (user) => {
    setBusyId(user.id)
    try {
      await adminBlockUser(adminKey, user.id, !user.blocked)
      addToast(user.blocked ? `${user.name} blokdan chiqarildi` : `${user.name} bloklandi`, 'info')
    } catch (err) {
      addToast(err.response?.data?.message || 'Amal bajarilmadi', 'error')
    } finally {
      setBusyId(null)
      refresh()
    }
  }

  const enableNotifications = async () => {
    if (typeof Notification === 'undefined') {
      addToast('Bu brauzer bildirishnomalarni qo\'llamaydi', 'error')
      return
    }
    const p = await Notification.requestPermission()
    setNotifPerm(p)
    if (p === 'granted') addToast('Bildirishnomalar yoqildi', 'success')
  }

  // ======================= KIRISH OYNASI =======================
  if (!authed) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'radial-gradient(circle at 50% 20%, #3b0a0a 0%, #0b1120 70%)',
          padding: '24px 16px',
        }}
      >
        <form
          className="card animate-fade-in"
          onSubmit={(e) => {
            e.preventDefault()
            if (keyInput.trim()) tryLogin(keyInput.trim())
          }}
          style={{ width: '100%', maxWidth: '420px', padding: '32px', borderRadius: '24px', border: '1px solid rgba(239, 68, 68, 0.35)' }}
        >
          <div style={{ textAlign: 'center', marginBottom: '22px' }}>
            <div
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #ef4444, #f59e0b)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px',
                fontSize: '30px',
                color: '#fff',
              }}
            >
              <FiShield />
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: 900, color: '#fff' }}>Administrator paneli</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>
              Kirish so'rovlarini tasdiqlash uchun admin kalitini kiriting
            </p>
          </div>

          <div style={{ position: 'relative', marginBottom: '14px' }}>
            <FiLock style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="password"
              autoFocus
              className="form-input"
              placeholder="Admin kaliti"
              style={{ paddingLeft: '40px' }}
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
            />
          </div>

          {loginError && (
            <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: '#fca5a5', borderRadius: '10px', padding: '10px 12px', fontSize: '13px', marginBottom: '14px' }}>
              {loginError}
            </div>
          )}

          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '13px', fontWeight: 700 }} disabled={checking}>
            {checking ? 'Tekshirilmoqda...' : 'Kirish'}
          </button>

          <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '14px', textAlign: 'center' }}>
            Kalit server ishga tushganda terminalda ko'rsatiladi (<b>ADMIN KALITI</b>) va <code>server/admin.json</code> faylida saqlanadi.
          </p>
        </form>
      </div>
    )
  }

  // ======================= ASOSIY PANEL =======================
  const stats = data?.stats || { pending: 0, activeSessions: 0, users: 0, companies: 0 }

  const tabs = [
    { id: 'requests', label: 'So\'rovlar', icon: <FiBell />, count: stats.pending, hot: stats.pending > 0 },
    { id: 'sessions', label: 'Kirganlar', icon: <FiActivity />, count: stats.activeSessions },
    { id: 'users', label: 'Foydalanuvchilar', icon: <FiUsers />, count: stats.users },
    { id: 'companies', label: 'Kompaniyalar', icon: <FiBriefcase />, count: stats.companies },
  ]

  return (
    <div className="container" style={{ paddingBottom: '48px' }}>
      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'space-between', alignItems: 'center', margin: '20px 0' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FiShield style={{ color: '#ef4444' }} /> Administrator paneli
          </h1>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '4px' }}>
            <span className={`badge ${online ? 'badge-success' : 'badge-danger'}`}>{online ? '🟢 Server ulangan' : '🔴 Server bilan aloqa yo\'q'}</span>
            <span>Ruxsat muddati: {data?.config?.sessionHours ?? '—'} soat</span>
            <span>Telegram: {data?.telegram ? '✅ yoqilgan' : 'o\'chiq'}</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => setSoundOn(v => !v)} title="Yangi so'rov ovozi">
            {soundOn ? <FiBell /> : <FiBellOff />} Ovoz: {soundOn ? 'yoqiq' : 'o\'chiq'}
          </button>
          {notifPerm !== 'granted' && (
            <button className="btn btn-secondary btn-sm" onClick={enableNotifications}>
              🔔 Bildirishnoma yoqish
            </button>
          )}
          <button className="btn btn-secondary btn-sm" onClick={logout} style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)' }}>
            <FiLogOut /> Chiqish
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '18px' }}>
        {tabs.map(t => (
          <button
            key={t.id}
            className={`btn btn-sm ${tab === t.id ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setTab(t.id)}
            style={t.hot && tab !== t.id ? { borderColor: '#f59e0b', color: '#fbbf24' } : undefined}
          >
            {t.icon} {t.label} ({t.count})
          </button>
        ))}
      </div>

      {!data && <div style={{ color: 'var(--text-secondary)', padding: '24px' }}>Yuklanmoqda...</div>}

      {/* ===== SO'ROVLAR ===== */}
      {data && tab === 'requests' && (
        <>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', marginBottom: '12px' }}>
            ⏳ Ruxsat kutayotganlar ({data.pending.length})
          </h2>

          {data.pending.length === 0 && (
            <div className="card" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '28px' }}>
              Hozircha kutayotgan so'rov yo'q. Yangi so'rov kelganda ovoz chiqadi va shu yerda paydo bo'ladi.
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '14px', marginBottom: '28px' }}>
            {data.pending.map(r => (
              <div key={r.id} className="card" style={{ border: '1px solid rgba(245, 158, 11, 0.5)', boxShadow: '0 0 24px rgba(245, 158, 11, 0.12)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '10px' }}>
                  <div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: '#fff' }}>{r.name}</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>login: <b>{r.login}</b></div>
                  </div>
                  <span className={`badge ${r.kind === 'register' ? 'badge-primary' : 'badge-success'}`}>
                    {r.kind === 'register' ? '🆕 Yangi hisob' : '🔑 Mavjud hisob'}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', marginBottom: '14px' }}>
                  <div><FiBriefcase style={{ verticalAlign: '-2px' }} /> <b style={{ color: '#38bdf8' }}>{r.company}</b></div>
                  <div style={{ color: 'var(--text-secondary)' }}><FiMonitor style={{ verticalAlign: '-2px' }} /> {shortDevice(r.device)} · IP: {r.ip}</div>
                  <div style={{ color: 'var(--text-secondary)' }}><FiClock style={{ verticalAlign: '-2px' }} /> {ago(r.createdAt)} ({fmtTime(r.createdAt)})</div>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    className="btn btn-success"
                    style={{ flex: 1, padding: '12px', fontWeight: 700 }}
                    disabled={busyId === r.id}
                    onClick={() => decide(r.id, 'approve')}
                  >
                    <FiCheck /> Ruxsat berish
                  </button>
                  <button
                    className="btn btn-secondary"
                    style={{ flex: 1, padding: '12px', fontWeight: 700, color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.4)' }}
                    disabled={busyId === r.id}
                    onClick={() => decide(r.id, 'reject')}
                  >
                    <FiX /> Rad etish
                  </button>
                </div>
              </div>
            ))}
          </div>

          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', marginBottom: '12px' }}>📜 So'nggi so'rovlar tarixi</h2>
          <div className="card" style={{ overflowX: 'auto', padding: 0 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style={th}>Vaqt</th>
                  <th style={th}>Foydalanuvchi</th>
                  <th style={th}>Kompaniya</th>
                  <th style={th}>IP</th>
                  <th style={th}>Natija</th>
                </tr>
              </thead>
              <tbody>
                {data.history.length === 0 && (
                  <tr><td style={td} colSpan={5}>Hali tarix yo'q</td></tr>
                )}
                {data.history.map(r => (
                  <tr key={r.id} style={{ borderTop: '1px solid var(--border)' }}>
                    <td style={td}>{fmtTime(r.createdAt)}</td>
                    <td style={td}><b>{r.name}</b> <span style={{ color: 'var(--text-muted)' }}>({r.login})</span></td>
                    <td style={td}>{r.company}</td>
                    <td style={td}>{r.ip}</td>
                    <td style={td}>
                      <span className={`badge ${STATUS_BADGE[r.status] || 'badge-warning'}`}>{r.statusLabel}</span>
                      {r.decidedBy && <span style={{ color: 'var(--text-muted)', marginLeft: '6px', fontSize: '11px' }}>({r.decidedBy})</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ===== KIRGANLAR ===== */}
      {data && tab === 'sessions' && (
        <div className="card" style={{ overflowX: 'auto', padding: 0 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ textAlign: 'left', color: 'var(--text-muted)' }}>
                <th style={th}>Foydalanuvchi</th>
                <th style={th}>Kompaniya</th>
                <th style={th}>Qurilma / IP</th>
                <th style={th}>Kirgan vaqti</th>
                <th style={th}>Amal qilish muddati</th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {data.sessions.length === 0 && (
                <tr><td style={td} colSpan={6}>Hozir tizimda hech kim yo'q</td></tr>
              )}
              {data.sessions.map(s => (
                <tr key={s.id} style={{ borderTop: '1px solid var(--border)' }}>
                  <td style={td}><b>{s.name}</b> <span style={{ color: 'var(--text-muted)' }}>({s.login})</span></td>
                  <td style={td}>{s.company}</td>
                  <td style={td}>{shortDevice(s.device)} · {s.ip}</td>
                  <td style={td}>{fmtTime(s.createdAt)}</td>
                  <td style={td}>{fmtTime(s.expiresAt)}</td>
                  <td style={td}>
                    <button
                      className="btn btn-secondary btn-sm"
                      style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.4)' }}
                      disabled={busyId === s.id}
                      onClick={() => revoke(s.id)}
                    >
                      <FiLogOut /> Chiqarib yuborish
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ===== FOYDALANUVCHILAR ===== */}
      {data && tab === 'users' && (
        <div className="card" style={{ overflowX: 'auto', padding: 0 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ textAlign: 'left', color: 'var(--text-muted)' }}>
                <th style={th}>Ism</th>
                <th style={th}>Login</th>
                <th style={th}>Kompaniya</th>
                <th style={th}>Rol</th>
                <th style={th}>Telefon</th>
                <th style={th}>Holat</th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {data.users.map(u => (
                <tr key={u.id} style={{ borderTop: '1px solid var(--border)' }}>
                  <td style={td}>{u.avatar} <b>{u.name}</b></td>
                  <td style={td}>{u.login}</td>
                  <td style={td}>{u.company}</td>
                  <td style={td}>{u.role}</td>
                  <td style={td}>{u.phone}</td>
                  <td style={td}>
                    {u.blocked ? (
                      <span className="badge badge-danger">Bloklangan</span>
                    ) : u.activeSessions > 0 ? (
                      <span className="badge badge-success">Tizimda</span>
                    ) : (
                      <span className="badge badge-warning">Tizimda emas</span>
                    )}
                  </td>
                  <td style={td}>
                    <button
                      className="btn btn-secondary btn-sm"
                      disabled={busyId === u.id}
                      onClick={() => toggleBlock(u)}
                      style={u.blocked ? undefined : { color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.4)' }}
                    >
                      {u.blocked ? <><FiUnlock /> Blokdan chiqarish</> : <><FiSlash /> Bloklash</>}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ===== KOMPANIYALAR ===== */}
      {data && tab === 'companies' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
          {data.companies.map(c => {
            const members = data.users.filter(u => u.company === c.name)
            return (
              <div key={c.id} className="card">
                <div style={{ fontWeight: 800, color: '#fff', marginBottom: '2px' }}>{c.name}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>{c.industry || 'Savdo'} · {c.city || 'Toshkent'}</div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Agentlar: <b style={{ color: '#38bdf8' }}>{members.length}</b>
                  {members.length > 0 && <span> — {members.map(m => m.name).join(', ')}</span>}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

const th = { padding: '12px 14px', fontWeight: 600, whiteSpace: 'nowrap' }
const td = { padding: '12px 14px', verticalAlign: 'middle' }
