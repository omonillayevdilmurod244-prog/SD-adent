import React, { useState, useEffect } from 'react'
import {
  FiSettings,
  FiUser,
  FiRefreshCw,
  FiServer,
  FiGlobe,
  FiCheck,
  FiBriefcase,
  FiLogOut,
  FiPhone,
  FiUsers,
  FiActivity,
} from 'react-icons/fi'
import client from '../services/api'

export default function SettingsPage({ agent, currentUser, onSync, isSyncing, onLogout }) {
  const [lang, setLang] = useState('uz')
  const [syncedTime, setSyncedTime] = useState('Hozirgina')
  const [syncSuccess, setSyncSuccess] = useState(false)
  const [users, setUsers] = useState([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [serverOnline, setServerOnline] = useState(false)

  const activeUser = currentUser || agent
  const compName = currentUser?.company || agent?.company || 'Sales Doctor Distribution LLC'

  const handleSyncClick = async () => {
    await onSync()
    setSyncedTime(new Date().toLocaleTimeString('uz-UZ'))
    setSyncSuccess(true)
    setTimeout(() => setSyncSuccess(false), 3000)
  }

  const fetchUsers = async () => {
    setUsersLoading(true)
    try {
      const res = await client.get('/users')
      if (res.data && res.data.users) {
        setUsers(res.data.users)
        setServerOnline(true)
      }
    } catch {
      setServerOnline(false)
    } finally {
      setUsersLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
    const interval = setInterval(fetchUsers, 30000) // Har 30 sekundda yangilash
    return () => clearInterval(interval)
  }, [])

  const roleColors = {
    'Savdo Agenti': '#10b981',
    'Katta Savdo Agenti': '#2563eb',
    'Menejer': '#f59e0b',
    'Administrator': '#ef4444',
  }

  return (
    <div className="container" style={{ paddingBottom: '40px' }}>
      <div style={{ marginTop: '20px', marginBottom: '20px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FiSettings style={{ color: 'var(--primary-light)' }} /> Sozlamalar &amp; Sinxronizatsiya
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
          SD Agent tizim parametrlari, korxona va agent profili
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        {/* Agent & Company Profile Card */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FiUser style={{ color: 'var(--primary-light)' }} /> Agent &amp; Kompaniya
            </h2>
            <button
              onClick={onLogout}
              className="btn btn-secondary btn-sm"
              style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)' }}
            >
              <FiLogOut /> Chiqish
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'linear-gradient(135deg, #2563eb, #06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px' }}>
              {activeUser?.avatar || '👨‍💼'}
            </div>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#fff' }}>{activeUser?.name || 'Jasur Rahimov'}</h3>
              <div style={{ fontSize: '13px', color: 'var(--accent-cyan)' }}>{activeUser?.role || 'Katta Savdo Agenti'}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Login: <b>{activeUser?.login || 'agent1'}</b></div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
              <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FiBriefcase /> Kompaniya:
              </span>
              <span style={{ fontWeight: 700, color: '#38bdf8', textAlign: 'right', maxWidth: '220px' }}>
                {compName}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
              <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FiPhone /> Telefon:
              </span>
              <span style={{ fontWeight: 600 }}>{activeUser?.phone || '+998 90 123-45-67'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Biriktirilgan hudud:</span>
              <span style={{ fontWeight: 600, textAlign: 'right', maxWidth: '200px' }}>{agent?.territory || 'Toshkent shahar hududi'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Tizim holati:</span>
              <span className="badge badge-success">Online • Faol</span>
            </div>
          </div>
        </div>

        {/* Server & Synchronization */}
        <div className="card">
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FiServer style={{ color: '#10b981' }} /> Server &amp; Sinxronizatsiya
          </h2>

          <div style={{ background: 'var(--bg-surface)', padding: '16px', borderRadius: 'var(--radius-md)', marginBottom: '18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Backend Server:</span>
              <span className={`badge ${serverOnline ? 'badge-success' : 'badge-danger'}`}>
                {serverOnline ? '🟢 Online (Express.js port 5000)' : '🔴 Offline'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Frontend Klon:</span>
              <span className="badge badge-primary">React 19 + Vite (port 5173)</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Ma'lumotlar bazasi:</span>
              <span style={{ fontWeight: 600, fontSize: '13px', color: '#38bdf8' }}>server/db.json (Doimiy)</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Oxirgi sinxronlash:</span>
              <span style={{ fontWeight: 600, fontSize: '13px' }}>{syncedTime}</span>
            </div>
          </div>

          {syncSuccess && (
            <div style={{ background: 'var(--success-bg)', border: '1px solid var(--success-border)', color: 'var(--success)', padding: '10px 14px', borderRadius: 'var(--radius-md)', fontSize: '13px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FiCheck /> Barcha ma'lumotlar server bilan muvaffaqiyatli sinxronlandi!
            </div>
          )}

          <button
            className="btn btn-primary"
            style={{ width: '100%', padding: '12px' }}
            disabled={isSyncing}
            onClick={handleSyncClick}
          >
            <FiRefreshCw style={{ animation: isSyncing ? 'spin 1s linear infinite' : 'none' }} />
            {isSyncing ? 'Sinxronlanmoqda...' : 'Hozir Server Bilan Sinxronlash'}
          </button>
        </div>

        {/* Application Preferences */}
        <div className="card">
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FiGlobe style={{ color: 'var(--accent-cyan)' }} /> Tizim Parametrlari
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                Interfeys tili:
              </label>
              <select className="form-select" value={lang} onChange={e => setLang(e.target.value)}>
                <option value="uz">O'zbek tili (Lotin)</option>
                <option value="ru">Русский язык</option>
                <option value="en">English</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                Valyuta:
              </label>
              <input type="text" className="form-input" disabled value="UZS — O'zbekiston So'mi" />
            </div>

            <div>
              <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                Dastur versiyasi:
              </label>
              <input type="text" className="form-input" disabled value="SD Agent v2.4 (Sales Doctor Clone)" />
            </div>
          </div>
        </div>

        {/* === USERS MONITOR PANEL === */}
        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FiUsers style={{ color: '#f59e0b' }} /> Tizimga Ro'yxatdan O'tgan Foydalanuvchilar
              <span style={{
                background: 'rgba(245,158,11,0.15)',
                border: '1px solid rgba(245,158,11,0.3)',
                color: '#f59e0b',
                borderRadius: '12px',
                padding: '2px 10px',
                fontSize: '13px',
                fontWeight: 800,
              }}>
                {users.length} ta
              </span>
            </h2>
            <button
              className="btn btn-secondary btn-sm"
              onClick={fetchUsers}
              disabled={usersLoading}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <FiActivity style={{ animation: usersLoading ? 'spin 1s linear infinite' : 'none' }} />
              {usersLoading ? 'Yangilanmoqda...' : 'Yangilash'}
            </button>
          </div>

          {users.length === 0 && !usersLoading && (
            <div style={{
              textAlign: 'center',
              padding: '40px 20px',
              color: 'var(--text-muted)',
              fontSize: '14px',
            }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>👤</div>
              <div style={{ fontWeight: 600 }}>Hali hech kim ro'yxatdan o'tmagan</div>
              <div style={{ fontSize: '12px', marginTop: '4px' }}>Login sahifasidan yangi hisob yaratish mumkin</div>
            </div>
          )}

          {usersLoading && users.length === 0 && (
            <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
              Yuklanmoqda...
            </div>
          )}

          {users.length > 0 && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)' }}>
                    <th style={{ padding: '10px 12px', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Avatar</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Ism</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Login</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>🏢 Kompaniya</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Lavozim</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Telefon</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center', color: 'var(--text-secondary)', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Holat</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u, idx) => (
                    <tr
                      key={u.id}
                      style={{
                        borderBottom: '1px solid var(--border)',
                        background: u.login === currentUser?.login
                          ? 'rgba(37, 99, 235, 0.12)'
                          : idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(37,99,235,0.1)'}
                      onMouseLeave={e => e.currentTarget.style.background = u.login === currentUser?.login
                        ? 'rgba(37, 99, 235, 0.12)'
                        : idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)'}
                    >
                      <td style={{ padding: '12px 12px' }}>
                        <div style={{
                          width: '38px',
                          height: '38px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #2563eb, #06b6d4)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '20px',
                          boxShadow: '0 2px 8px rgba(37,99,235,0.3)',
                        }}>
                          {u.avatar || '👨‍💼'}
                        </div>
                      </td>
                      <td style={{ padding: '12px 12px' }}>
                        <div style={{ fontWeight: 700, color: '#fff' }}>
                          {u.name}
                          {u.login === currentUser?.login && (
                            <span style={{
                              marginLeft: '8px',
                              background: 'rgba(37,99,235,0.3)',
                              color: '#60a5fa',
                              borderRadius: '6px',
                              padding: '1px 6px',
                              fontSize: '10px',
                              fontWeight: 800,
                            }}>SIZ</span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '12px 12px' }}>
                        <code style={{
                          background: 'rgba(255,255,255,0.08)',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '13px',
                          color: '#38bdf8',
                          fontWeight: 700,
                        }}>
                          {u.login}
                        </code>
                      </td>
                      <td style={{ padding: '12px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <FiBriefcase style={{ color: '#f59e0b', fontSize: '12px', flexShrink: 0 }} />
                          <span style={{ fontWeight: 600, color: '#fbbf24' }}>{u.company}</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 12px' }}>
                        <span style={{
                          background: `${roleColors[u.role] || '#6366f1'}22`,
                          border: `1px solid ${roleColors[u.role] || '#6366f1'}44`,
                          color: roleColors[u.role] || '#818cf8',
                          borderRadius: '8px',
                          padding: '3px 10px',
                          fontSize: '12px',
                          fontWeight: 700,
                          whiteSpace: 'nowrap',
                        }}>
                          {u.role}
                        </span>
                      </td>
                      <td style={{ padding: '12px 12px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                        {u.phone}
                      </td>
                      <td style={{ padding: '12px 12px', textAlign: 'center' }}>
                        <span style={{
                          background: 'rgba(16,185,129,0.15)',
                          border: '1px solid rgba(16,185,129,0.3)',
                          color: '#34d399',
                          borderRadius: '8px',
                          padding: '3px 10px',
                          fontSize: '12px',
                          fontWeight: 700,
                        }}>
                          🟢 Faol
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div style={{
            marginTop: '14px',
            padding: '10px 14px',
            background: 'rgba(37,99,235,0.08)',
            border: '1px solid rgba(37,99,235,0.2)',
            borderRadius: '10px',
            fontSize: '12px',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            🔒 <span>Parollar xavfsizlik maqsadida ko'rsatilmaydi. Ma'lumotlar <b>server/db.json</b> da saqlanadi.</span>
          </div>
        </div>
      </div>
    </div>
  )
}
