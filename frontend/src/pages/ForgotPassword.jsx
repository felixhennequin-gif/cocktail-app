import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function ForgotPassword() {
  const { t } = useTranslation()

  const [email, setEmail]       = useState('')
  const [touched, setTouched]   = useState(false)
  const [loading, setLoading]   = useState(false)
  const [sent, setSent]         = useState(false)
  const [error, setError]       = useState(null)

  const emailError = touched && (!email.trim() ? t('auth.errors.emailRequired') : !EMAIL_RE.test(email) ? t('auth.errors.emailInvalid') : null)
  const isValid = email.trim() && EMAIL_RE.test(email)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setTouched(true)
    if (!isValid) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || t('auth.forgotPassword.genericError'))
      }
      setSent(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="max-w-sm mx-auto mt-12 text-center">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">{t('auth.forgotPassword.sentTitle')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{t('auth.forgotPassword.sentMessage')}</p>
          <Link to="/login" className="text-sm text-gold-500 dark:text-gold-400 hover:underline font-medium">
            {t('auth.forgotPassword.backToLogin')}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-sm mx-auto mt-12">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6 text-center">{t('auth.forgotPassword.title')}</h1>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-4" noValidate>
        <p className="text-sm text-gray-500 dark:text-gray-400">{t('auth.forgotPassword.description')}</p>
        <div>
          <label htmlFor="forgot-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('auth.emailLabel')}</label>
          <input
            id="forgot-email" name="email" type="email" value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => setTouched(true)}
            aria-describedby={emailError ? 'forgot-email-error' : undefined}
            className={`w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gold-400 ${
              emailError ? 'border-red-400 bg-red-50 dark:bg-red-900/20' : 'border-gray-200 dark:border-gray-600'
            }`}
          />
          {emailError && (
            <p id="forgot-email-error" role="alert" className="mt-1 text-xs text-red-500">{emailError}</p>
          )}
        </div>
        <button
          type="submit" disabled={loading}
          className="w-full py-2.5 bg-gold-400 text-ink-900 text-sm font-medium rounded-lg hover:bg-gold-500 disabled:opacity-60 transition-colors"
        >
          {loading ? t('auth.forgotPassword.loading') : t('auth.forgotPassword.button')}
        </button>
      </form>

      <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4">
        <Link to="/login" className="text-gold-500 dark:text-gold-400 hover:underline font-medium">
          {t('auth.forgotPassword.backToLogin')}
        </Link>
      </p>
    </div>
  )
}
