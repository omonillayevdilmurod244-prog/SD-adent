import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { FiDollarSign, FiSearch, FiCheck } from 'react-icons/fi'
import { formatSum } from '../services/api'

export default function PaymentsPage({ payments, outlets, onCreatePayment }) {
  const [searchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ outletId: '', amount: '', method: 'cash', note: '' })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const outletId = searchParams.get('outletId')
    if (outletId) {
      setForm(p => ({ ...p, outletId }))
      setShowForm(true)
    }
  }, [searchParams])

  const filtered = (payments || []).filter(p =>
    p.outletName?.toLowerCase().includes(search.toLowerCase()) ||
    p.receiptNumber?.toLowerCase().includes(search.toLowerCase())
  )

  const totalCollected = filtered.reduce((sum, p) => sum + (p.amount || 0), 0)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.outletId || !form.amount) return
    setSubmitting(true)
    try {
      await onCreatePayment({ ...form, amount: Number(form.amount) })
      setForm({ outletId: '', amount: '', method: 'cash', note: '' })
      setShowForm(false)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="container animate-fade-in" style={{ paddingTop: '20px', paddingBottom: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FiDollarSign style={{ color: '#10b981' }} /> To'lovlar
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>
            Jami yig'ilgan: <b style={{ color: '#10b981' }}>{formatSum(totalCollected)}</b>
          </p>
        </div>
        <button className="btn btn-success btn-sm" onClick={() => setShowForm(v => !v)}>
          <FiCheck /> To'lov Qabul Qilish
        </button>
      </div>

      {showForm && (
        <form className="card animate-fade-in" onSubmit={handleSubmit} style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#fff' }}>💵 Yangi To'lov Qabul Qilish</h2>

          <div>
            <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px', fontWeight: 600 }}>Do'kon *</label>
            <select
              className="form-select"
              value={form.outletId}
              onChange={e => setForm(p => ({ ...p, outletId: e.target.value }))}
              required
            >
              <option value="">Do'konni tanlang...</option>
              {(outlets || []).map(o => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px', fontWeight: 600 }}>Summa (so'm) *</label>
            <input
              type="number"
              className="form-input"
              placeholder="0"
              value={form.amount}
              onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
              min="1"
              required
            />
          </div>

          <div>
            <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px', fontWeight: 600 }}>To'lov usuli</label>
            <select className="form-select" value={form.method} onChange={e => setForm(p => ({ ...p, method: e.target.value }))}>
              <option value="cash">Naqd pul</option>
              <option value="card">Bank kartasi</option>
              <option value="transfer">Bank o'tkazma</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px', fontWeight: 600 }}>Izoh (ixtiyoriy)</label>
            <textarea
              className="form-textarea"
              placeholder="Qo'shimcha ma'lumot..."
              value={form.note}
              onChange={e => setForm(p => ({ ...p, note: e.target.value }))}
              rows={2}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="submit" className="btn btn-success" style={{ flex: 1 }} disabled={submitting}>
              <FiCheck /> {submitting ? 'Saqlanmoqda...' : 'To\'lovni Tasdiqlash'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Bekor</button>
          </div>
        </form>
      )}

      <div style={{ position: 'relative', marginBottom: '16px' }}>
        <FiSearch style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input
          className="form-input"
          style={{ paddingLeft: '40px' }}
          placeholder="Do'kon nomi yoki chek raqami..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '48px 20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>💰</div>
          <div style={{ fontWeight: 700, color: '#fff' }}>To'lovlar topilmadi</div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {filtered.map(payment => (
          <div key={payment.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 700, color: '#fff', fontSize: '14px' }}>
                {payment.outletName || 'Noma\'lum do\'kon'}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '3px' }}>
                {payment.receiptNumber} · {payment.method === 'cash' ? '💵 Naqd' : payment.method === 'card' ? '💳 Karta' : '🏦 O\'tkazma'}
              </div>
              {payment.date && (
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {new Date(payment.date).toLocaleDateString('uz-UZ')}
                </div>
              )}
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 900, color: '#10b981', fontSize: '18px' }}>
                {formatSum(payment.amount)}
              </div>
              <span className="badge badge-success" style={{ fontSize: '11px' }}>Qabul qilindi</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
