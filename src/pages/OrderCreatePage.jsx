import React, { useState, useMemo } from 'react'
import { FiShoppingCart, FiSearch, FiPlus, FiMinus, FiTrash2, FiCheck } from 'react-icons/fi'
import { formatSum } from '../services/api'

export default function OrderCreatePage({ outlets, products, categories, onSubmitOrder }) {
  const [selectedOutlet, setSelectedOutlet] = useState('')
  const [outletSearch, setOutletSearch] = useState('')
  const [cart, setCart] = useState({}) // { productId: quantity }
  const [productSearch, setProductSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const filteredOutlets = useMemo(() =>
    (outlets || []).filter(o =>
      o.name?.toLowerCase().includes(outletSearch.toLowerCase())
    ), [outlets, outletSearch])

  const filteredProducts = useMemo(() =>
    (products || []).filter(p => {
      const matchSearch = p.name?.toLowerCase().includes(productSearch.toLowerCase())
      const matchCat = !selectedCategory || String(p.categoryId) === String(selectedCategory)
      return matchSearch && matchCat
    }), [products, productSearch, selectedCategory])

  const cartItems = useMemo(() =>
    Object.entries(cart)
      .filter(([, qty]) => qty > 0)
      .map(([id, qty]) => {
        const product = products?.find(p => String(p.id) === id)
        return product ? { product, qty } : null
      })
      .filter(Boolean),
    [cart, products])

  const total = useMemo(() =>
    cartItems.reduce((sum, { product, qty }) => sum + (product.price || 0) * qty, 0),
    [cartItems])

  const setQty = (productId, qty) => {
    setCart(prev => {
      const next = { ...prev }
      if (qty <= 0) delete next[String(productId)]
      else next[String(productId)] = qty
      return next
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!selectedOutlet || cartItems.length === 0) return
    setSubmitting(true)
    try {
      const payload = {
        outletId: selectedOutlet,
        items: cartItems.map(({ product, qty }) => ({
          productId: product.id,
          quantity: qty,
          price: product.price,
        })),
        total,
      }
      await onSubmitOrder(payload)
      setCart({})
      setSelectedOutlet('')
      setSubmitted(true)
      setTimeout(() => setSubmitted(false), 3000)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="container animate-fade-in" style={{ paddingTop: '20px', paddingBottom: '24px' }}>
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FiShoppingCart style={{ color: '#2563eb' }} /> Buyurtma Yaratish
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>
          Do'kon tanlang va mahsulot qo'shing
        </p>
      </div>

      {submitted && (
        <div className="card animate-fade-in" style={{ marginBottom: '16px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', textAlign: 'center', padding: '20px' }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>✅</div>
          <div style={{ fontWeight: 700, color: '#10b981', fontSize: '16px' }}>Buyurtma muvaffaqiyatli qabul qilindi!</div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Outlet selection */}
        <div className="card" style={{ marginBottom: '16px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#fff', marginBottom: '12px' }}>1. Do'konni Tanlang</h2>
          <div style={{ position: 'relative', marginBottom: '10px' }}>
            <FiSearch style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              className="form-input"
              style={{ paddingLeft: '40px' }}
              placeholder="Do'kon qidirish..."
              value={outletSearch}
              onChange={e => setOutletSearch(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', maxHeight: '120px', overflowY: 'auto' }}>
            {filteredOutlets.map(o => (
              <button
                key={o.id}
                type="button"
                className="btn btn-sm"
                style={{
                  background: String(selectedOutlet) === String(o.id) ? 'var(--primary)' : 'var(--bg-surface)',
                  border: String(selectedOutlet) === String(o.id) ? '1px solid var(--primary)' : '1px solid var(--border)',
                  color: '#fff',
                }}
                onClick={() => setSelectedOutlet(String(o.id))}
              >
                🏪 {o.name}
              </button>
            ))}
          </div>
          {selectedOutlet && (
            <div style={{ marginTop: '8px', color: '#10b981', fontSize: '13px', fontWeight: 600 }}>
              ✓ Tanlandi: {outlets?.find(o => String(o.id) === selectedOutlet)?.name}
            </div>
          )}
        </div>

        {/* Products */}
        <div className="card" style={{ marginBottom: '16px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#fff', marginBottom: '12px' }}>2. Mahsulot Qo'shing</h2>

          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: '1', minWidth: '180px' }}>
              <FiSearch style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                className="form-input"
                style={{ paddingLeft: '40px' }}
                placeholder="Mahsulot qidirish..."
                value={productSearch}
                onChange={e => setProductSearch(e.target.value)}
              />
            </div>
            <select
              className="form-select"
              style={{ minWidth: '140px' }}
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
            >
              <option value="">Barcha kategoriyalar</option>
              {(categories || []).map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '10px' }}>
            {filteredProducts.map(product => {
              const qty = cart[String(product.id)] || 0
              return (
                <div
                  key={product.id}
                  className="card"
                  style={{
                    padding: '14px',
                    border: qty > 0 ? '1px solid rgba(37,99,235,0.5)' : '1px solid var(--border)',
                    background: qty > 0 ? 'rgba(37,99,235,0.08)' : 'var(--bg-surface)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div>
                      <div style={{ fontWeight: 700, color: '#fff', fontSize: '13px' }}>{product.name}</div>
                      <div style={{ fontSize: '12px', color: '#10b981', fontWeight: 600 }}>{formatSum(product.price)}</div>
                    </div>
                    <span style={{ fontSize: '11px', color: product.stock > 0 ? '#34d399' : '#f87171' }}>
                      {product.stock > 0 ? `${product.stock} ta` : 'Tugagan'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '6px' }}
                      onClick={() => setQty(product.id, qty - 1)}
                      disabled={qty === 0}
                    >
                      <FiMinus />
                    </button>
                    <span style={{ fontWeight: 800, color: qty > 0 ? '#60a5fa' : 'var(--text-muted)', minWidth: '24px', textAlign: 'center' }}>
                      {qty}
                    </span>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '6px' }}
                      onClick={() => setQty(product.id, qty + 1)}
                      disabled={product.stock !== undefined && qty >= product.stock}
                    >
                      <FiPlus />
                    </button>
                    {qty > 0 && (
                      <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#60a5fa', fontWeight: 700 }}>
                        = {formatSum(product.price * qty)}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Cart Summary */}
        {cartItems.length > 0 && (
          <div className="card" style={{ marginBottom: '16px', border: '1px solid rgba(37,99,235,0.3)' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#fff', marginBottom: '12px' }}>3. Buyurtma Ro'yxati</h2>
            {cartItems.map(({ product, qty }) => (
              <div key={product.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontWeight: 600, color: '#fff', fontSize: '13px' }}>{product.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{qty} × {formatSum(product.price)}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontWeight: 700, color: '#10b981' }}>{formatSum(product.price * qty)}</span>
                  <button type="button" style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }} onClick={() => setQty(product.id, 0)}>
                    <FiTrash2 />
                  </button>
                </div>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px', paddingTop: '10px', borderTop: '1px solid var(--border)' }}>
              <span style={{ fontWeight: 700, fontSize: '16px', color: '#fff' }}>Jami:</span>
              <span style={{ fontWeight: 900, fontSize: '20px', color: '#10b981' }}>{formatSum(total)}</span>
            </div>
          </div>
        )}

        <button
          type="submit"
          className="btn btn-primary"
          style={{ width: '100%', padding: '14px', fontSize: '15px', fontWeight: 700 }}
          disabled={submitting || !selectedOutlet || cartItems.length === 0}
        >
          <FiCheck /> {submitting ? 'Yuborilmoqda...' : 'Buyurtmani Tasdiqlash'}
        </button>
      </form>
    </div>
  )
}
