import { useEffect, useRef } from 'react'

/**
 * Modale de confirmation réutilisable.
 * Props :
 *   isOpen       : boolean
 *   onConfirm    : () => void
 *   onCancel     : () => void
 *   title        : string
 *   message      : string
 *   confirmLabel : string (défaut : "Confirmer")
 *   variant      : "danger" | "warning" (défaut : "danger")
 */
export default function ConfirmModal({
  isOpen,
  onConfirm,
  onCancel,
  title,
  message,
  confirmLabel = 'Confirmer',
  variant = 'danger',
}) {
  const modalRef = useRef(null)

  useEffect(() => {
    if (!isOpen) return
    if (modalRef.current) {
      const firstFocusable = modalRef.current.querySelector('button, input, [tabindex]:not([tabindex="-1"])')
      firstFocusable?.focus()
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') { onCancel(); return }
      if (e.key === 'Tab' && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll('button, input, [tabindex]:not([tabindex="-1"])')
        if (focusable.length === 0) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onCancel])

  if (!isOpen) return null

  const confirmClass = variant === 'warning'
    ? 'bg-orange-500 hover:bg-orange-600 text-white'
    : 'bg-red-600 hover:bg-red-700 text-white'

  return (
    // Overlay
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      className="fixed inset-0 z-[9000] flex items-center justify-center p-4 bg-black/40"
      onClick={onCancel}
    >
      {/* Panel — stoppe la propagation pour éviter fermeture au clic intérieur */}
      <div
        ref={modalRef}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-sm w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="confirm-modal-title" className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">{title}</h2>
        {message && <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">{message}</p>}
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 rounded-xl hover:border-gray-300 dark:hover:border-gray-500 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-medium rounded-xl transition-colors ${confirmClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
