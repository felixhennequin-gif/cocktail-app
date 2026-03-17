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
  if (!isOpen) return null

  const confirmClass = variant === 'warning'
    ? 'bg-orange-500 hover:bg-orange-600 text-white'
    : 'bg-red-600 hover:bg-red-700 text-white'

  return (
    // Overlay
    <div
      className="fixed inset-0 z-[9000] flex items-center justify-center p-4 bg-black/40"
      onClick={onCancel}
    >
      {/* Panel — stoppe la propagation pour éviter fermeture au clic intérieur */}
      <div
        className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-gray-900 mb-2">{title}</h2>
        {message && <p className="text-sm text-gray-600 mb-6">{message}</p>}
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:border-gray-300 transition-colors"
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
