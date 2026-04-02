import { createContext, useContext, useState, useCallback } from 'react'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const showToast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random()
    setToasts((prev) => [...prev, { id, message, type, exiting: false }])
    setTimeout(() => {
      setToasts((prev) => prev.map((t) => t.id === id ? { ...t, exiting: true } : t))
      // Retirer après la durée de l'animation de sortie
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
      }, 300)
    }, 2500)
  }, [])

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.map((t) => t.id === id ? { ...t, exiting: true } : t))
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 300)
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast doit être utilisé dans un ToastProvider')
  return ctx
}

const ICON_COLORS = {
  success: 'text-emerald-400',
  error:   'text-red-400',
  info:    'text-amber-400',
}

const ICONS = {
  success: '✓',
  error:   '✕',
  info:    'ℹ',
}

const BORDER_COLORS = {
  success: 'border-emerald-500/20',
  error:   'border-red-500/20',
  info:    'border-amber-500/20',
}

function ToastContainer({ toasts, onDismiss }) {
  if (toasts.length === 0) return null
  return (
    <div role="status" aria-live="polite" aria-atomic="false" className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`toast-glass flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium max-w-sm pointer-events-auto border ${BORDER_COLORS[t.type] ?? BORDER_COLORS.info} ${t.exiting ? 'toast-out' : 'toast-in'}`}
        >
          <span className={`shrink-0 text-base font-bold ${ICON_COLORS[t.type] ?? ICON_COLORS.info}`}>{ICONS[t.type] ?? ICONS.info}</span>
          <span className="flex-1 text-gray-100">{t.message}</span>
          <button
            onClick={() => onDismiss(t.id)}
            className="shrink-0 text-gray-400 hover:text-gray-200 transition-opacity text-lg leading-none"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}
