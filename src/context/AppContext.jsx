import React, { createContext, useContext, useState, useCallback, useRef } from 'react'

const AppContext = createContext(null)

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}

export function AppProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const audioCtxRef = useRef(null)

  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 4500)
  }, [])

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const playChime = useCallback((kind = 'success') => {
    try {
      const AC = window.AudioContext || window.webkitAudioContext
      if (!AC) return
      if (!audioCtxRef.current) audioCtxRef.current = new AC()
      const ctx = audioCtxRef.current
      if (ctx.state === 'suspended') ctx.resume()
      const t0 = ctx.currentTime
      const freqs = kind === 'success' ? [523, 659, 784] : [392, 330]
      freqs.forEach((f, i) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.frequency.value = f
        gain.gain.setValueAtTime(0.15, t0 + i * 0.12)
        gain.gain.exponentialRampToValueAtTime(0.001, t0 + i * 0.12 + 0.2)
        osc.start(t0 + i * 0.12)
        osc.stop(t0 + i * 0.12 + 0.22)
      })
    } catch {
      // ignore audio errors
    }
  }, [])

  return (
    <AppContext.Provider value={{ toasts, addToast, removeToast, playChime }}>
      {children}
    </AppContext.Provider>
  )
}
