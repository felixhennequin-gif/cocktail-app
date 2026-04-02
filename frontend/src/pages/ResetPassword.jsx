import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Helmet } from 'react-helmet-async'

export default function ResetPassword() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const [form, setForm]       = useState({ password: '', confirm: '' })
  const [touched, setTouched] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)
  const [success, setSuccess] = useState(false)

  const validate = (f) => {
    const errors = {}
    if (!f.password) errors.password = t('auth.errors.passwordRequired')
    else if (f.password.length < 8 || !/[a-zA-Z]/.test(f.password) || !/[0-9]/.test(f.password))
      errors.password = t('auth.errors.passwordTooShort')
    if (!f.confirm) errors.confirm = t('auth.errors.confirmRequired')
    else if (f.confirm !== f.password) errors.confirm = t('auth.errors.confirmMismatch')
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

  if (!token) {
    return (
      <div className="max-w-sm mx-auto mt-12 text-center">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">{t('auth.resetPassword.invalidLink')}</h1>
          <Link to="/forgot-password" className="text-sm text-gold-500 dark:text-gold-400 hover:underline font-medium">
            {t('auth.resetPassword.requestNew')}
          </Link>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="max-w-sm mx-auto mt-12 text-center">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">{t('auth.resetPassword.successTitle')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{t('auth.resetPassword.successMessage')}</p>
          <Link
            to="/login"
            className="inline-block px-6 py-2.5 bg-gold-400 text-ink-900 text-sm font-medium rounded-lg hover:bg-gold-500 transition-colors"
          >
            {t('auth.resetPassword.goToLogin')}
          </Link>
        </div>
      </div>
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setTouched({ password: true, confirm: true })
    if (!isValid) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password: form.password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || t('auth.resetPassword.genericError'))
      setSuccess(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-sm mx-auto mt-12">
      <Helmet><title>Réinitialisation — Écume</title></Helmet>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6 text-center">{t('auth.resetPassword.title')}</h1>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-4" noValidate>
        <div>
          <label htmlFor="reset-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('auth.resetPassword.newPasswordLabel')} <span className="text-gray-400 dark:text-gray-500 font-normal">{t('auth.passwordHint')}</span>
          </label>
          <input
            id="reset-password" name="password" type="password" value={form.password}
            onChange={handleField} onBlur={handleBlur}
            aria-describedby={touched.password && errors.password ? 'reset-password-error' : undefined}
            className={fieldClass('password')}
          />
          {touched.password && errors.password && (
            <p id="reset-password-error" role="alert" className="mt-1 text-xs text-red-500">{errors.password}</p>
          )}
        </div>
        <div>
          <label htmlFor="reset-confirm" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('auth.confirmLabel')}</label>
          <input
            id="reset-confirm" name="confirm" type="password" value={form.confirm}
            onChange={handleField} onBlur={handleBlur}
            aria-describedby={touched.confirm && errors.confirm ? 'reset-confirm-error' : undefined}
            className={fieldClass('confirm')}
          />
          {touched.confirm && errors.confirm && (
            <p id="reset-confirm-error" role="alert" className="mt-1 text-xs text-red-500">{errors.confirm}</p>
          )}
        </div>
        <button
          type="submit" disabled={loading}
          className="w-full py-2.5 bg-gold-400 text-ink-900 text-sm font-medium rounded-lg hover:bg-gold-500 disabled:opacity-60 transition-colors"
        >
          {loading ? t('auth.resetPassword.loading') : t('auth.resetPassword.button')}
        </button>
      </form>
    </div>
  )
}
