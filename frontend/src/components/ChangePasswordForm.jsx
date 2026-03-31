import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'

export default function ChangePasswordForm() {
  const { authFetch, logout } = useAuth()
  const { showToast }         = useToast()
  const { t }                 = useTranslation()

  const [form, setForm]       = useState({ currentPassword: '', newPassword: '', confirm: '' })
  const [touched, setTouched] = useState({})
  const [error, setError]     = useState(null)
  const [loading, setLoading] = useState(false)

  const validate = (f) => {
    const errors = {}
    if (!f.currentPassword) errors.currentPassword = t('auth.changePassword.currentRequired')
    if (!f.newPassword) errors.newPassword = t('auth.errors.passwordRequired')
    else if (f.newPassword.length < 8 || !/[a-zA-Z]/.test(f.newPassword) || !/[0-9]/.test(f.newPassword))
      errors.newPassword = t('auth.errors.passwordTooShort')
    if (!f.confirm) errors.confirm = t('auth.errors.confirmRequired')
    else if (f.confirm !== f.newPassword) errors.confirm = t('auth.errors.confirmMismatch')
    return errors
  }

  const errors  = validate(form)
  const isValid = Object.keys(errors).length === 0

  const handleField = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))
  const handleBlur  = (e) => setTouched((t) => ({ ...t, [e.target.name]: true }))

  const fieldClass = (name) =>
    `w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gold-400 ${
      touched[name] && errors[name]
        ? 'border-red-400 bg-red-50 dark:bg-red-900/20'
        : 'border-gray-200 dark:border-gray-600'
    }`

  const handleSubmit = async (e) => {
    e.preventDefault()
    setTouched({ currentPassword: true, newPassword: true, confirm: true })
    if (!isValid) return
    setLoading(true)
    setError(null)
    try {
      const res = await authFetch('/api/auth/change-password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: form.currentPassword, newPassword: form.newPassword }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || t('auth.changePassword.genericError'))
      showToast(t('auth.changePassword.success'), 'success')
      logout()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {error && (
        <div className="px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}
      <div>
        <label htmlFor="cp-current" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('auth.changePassword.currentLabel')}
        </label>
        <input
          id="cp-current" name="currentPassword" type="password" value={form.currentPassword}
          onChange={handleField} onBlur={handleBlur}
          className={fieldClass('currentPassword')}
        />
        {touched.currentPassword && errors.currentPassword && (
          <p role="alert" className="mt-1 text-xs text-red-500">{errors.currentPassword}</p>
        )}
      </div>
      <div>
        <label htmlFor="cp-new" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('auth.changePassword.newLabel')} <span className="text-gray-400 dark:text-gray-500 font-normal">{t('auth.passwordHint')}</span>
        </label>
        <input
          id="cp-new" name="newPassword" type="password" value={form.newPassword}
          onChange={handleField} onBlur={handleBlur}
          className={fieldClass('newPassword')}
        />
        {touched.newPassword && errors.newPassword && (
          <p role="alert" className="mt-1 text-xs text-red-500">{errors.newPassword}</p>
        )}
      </div>
      <div>
        <label htmlFor="cp-confirm" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('auth.confirmLabel')}
        </label>
        <input
          id="cp-confirm" name="confirm" type="password" value={form.confirm}
          onChange={handleField} onBlur={handleBlur}
          className={fieldClass('confirm')}
        />
        {touched.confirm && errors.confirm && (
          <p role="alert" className="mt-1 text-xs text-red-500">{errors.confirm}</p>
        )}
      </div>
      <button
        type="submit" disabled={loading}
        className="w-full py-2.5 bg-gold-400 text-ink-900 text-sm font-medium rounded-lg hover:bg-gold-500 disabled:opacity-60 transition-colors"
      >
        {loading ? t('auth.changePassword.loading') : t('auth.changePassword.button')}
      </button>
    </form>
  )
}
