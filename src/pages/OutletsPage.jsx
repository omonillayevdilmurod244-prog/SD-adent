import React, { useState } from 'react'
import { FiMapPin, FiCheck, FiPlus, FiSearch, FiPhone, FiDollarSign, FiClock } from 'react-icons/fi'

export default function OutletsPage({ outlets, onCheckIn, onCreateOutlet, onOpenPayment }) {
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', address: '', phone: '' })
  const [busyId, setBusyId] = useState(null)
  const [creating, setCreating] = useState(false)

  const filtered = (outlets || []).filter(o =>
    o.name?.toLowerCase().includes(search.toLowerCase()) ||
    o.address?.toLowerCase().includes(search.toLowerCase())
  )

  const handleCheckIn = async (outlet) => {
    setBusyId(outlet.id)
    try {
      await onCheckIn(outlet.id)
    } finally {
      setBusyId(null)
    }
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return
    setCreating(true)
    try {
      await onCreateOutlet(form)
      setForm({ name: '', address: '', phone: '' })
      setShowCreate(false)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="container animate-fade-in" style={{ paddingTop: '20px', paddingBottom: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FiMapPin style={{ color: '#06b6d4' }} /> Savdo Nuqtalari
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>
            Jami {filtered.length} ta do'kon
          </p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(v => !v)}>
          <FiPlus /> Yangi Do'kon
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <form className="card animate-fade-in" onSubmit={handleCreate} style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#fff' }}>🏪 Yangi Do'kon Qo'shish</h2>
          <input
            className="form-input"
            placeholder="Do'kon nomi *"
            value={form.name}
            onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
            required
          />
          <input
            className="form-input"
            placeholder="Manzil"
            value={form.address}
            onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
          />
          <input
            className="form-input"
            placeholder="Telefon raqam"
            value={form.phone}
            onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
          />
          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="submit" className="btn btn-success" style={{ flex: 1 }} disabled={creating}>
              {creating ? 'Saqlanmoqda...' : 'Saqlash'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>Bekor</button>
          </div>
        </form>
      )}

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: '16px' }}>
        <FiSearch style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input
          className="form-input"
          style={{ paddingLeft: '40px' }}
          placeholder="Do'kon nomi yoki manzilni qidiring..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* List */}
      {filtered.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '48px 20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>🏪</div>
          <div style={{ fontWeight: 700, color: '#fff' }}>Do'konlar topilmadi</div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px' }}>
        {filtered.map(outlet => (
          <div
            key={outlet.id}
            className="card"
            style={{
              border: outlet.status === 'visited' ? '1px solid rgba(16,185,129,0.4)' : '1px solid var(--border)',
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: '16px', color: '#fff' }}>{outlet.name}</div>
                {outlet.address && (
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <FiMapPin style={{ fontSize: '11px' }} /> {outlet.address}
                  </div>
                )}
              </div>
              <span className={`badge ${outlet.status === 'visited' ? 'badge-success' : 'badge-warning'}`}>
                {outlet.status === 'visited' ? '✅ Borildi' : '⏳ Kutmoqda'}
              </span>
            </div>

            {outlet.phone && (
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FiPhone style={{ fontSize: '12px' }} /> {outlet.phone}
              </div>
            )}

            {outlet.lastVisit && (
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FiClock style={{ fontSize: '11px' }} /> Oxirgi tashrif: {new Date(outlet.lastVisit).toLocaleDateString('uz-UZ')}
              </div>
            )}

            {typeof outlet.debt === 'number' && outlet.debt > 0 && (
              <div style={{ fontSize: '13px', color: '#f87171', marginBottom: '10px', fontWeight: 600 }}>
                Qarz: {outlet.debt?.toLocaleString()} so'm
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className="btn btn-success btn-sm"
                style={{ flex: 1 }}
                disabled={busyId === outlet.id}
                onClick={() => handleCheckIn(outlet)}
              >
                <FiCheck /> Tashrif qayd
              </button>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => onOpenPayment(outlet)}
              >
                <FiDollarSign />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
