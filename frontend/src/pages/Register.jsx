import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Helmet } from 'react-helmet-async'
import { useAuth } from '../contexts/AuthContext'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function Register() {
  const { register, authFetch } = useAuth()
  const { t }        = useTranslation()
  const navigate     = useNavigate()

  const [form, setForm]             = useState({ email: '', pseudo: '', password: '', confirm: '' })
  const [touched, setTouched]       = useState({})
  const [error, setError]           = useState(null)
  const [loading, setLoading]       = useState(false)
  const [registered, setRegistered] = useState(false)
  const [resending, setResending]   = useState(false)
  const [resent, setResent]         = useState(false)

  const validate = (f) => {
    const errors = {}
    if (!f.email.trim())              errors.email = t('auth.errors.emailRequired')
    else if (!EMAIL_RE.test(f.email)) errors.email = t('auth.errors.emailInvalid')
    if (!f.pseudo.trim())             errors.pseudo = t('auth.errors.pseudoRequired')
    else if (f.pseudo.length < 2)     errors.pseudo = t('auth.errors.pseudoTooShort')
    if (!f.password)                  errors.password = t('auth.errors.passwordRequired')
    else if (f.password.length < 8 || !/[a-zA-Z]/.test(f.password) || !/[0-9]/.test(f.password))
      errors.password = t('auth.errors.passwordTooShort')
    if (!f.confirm)                   errors.confirm = t('auth.errors.confirmRequired')
    else if (f.confirm !== f.password) errors.confirm = t('auth.errors.confirmMismatch')
    return errors
  }

  const errors  = validate(form)
  const isValid = Object.keys(errors).length === 0

  const handleField = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))
  const handleBlur  = (e) => setTouched((tv) => ({ ...tv, [e.target.name]: true }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setTouched({ email: true, pseudo: true, password: true, confirm: true })
    if (!isValid) return
    setLoading(true)
    setError(null)
    try {
      await register(form.email, form.pseudo, form.password)
      setRegistered(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const fieldClass = (name) =>
    `w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gold-400 ${
      touched[name] && errors[name]
        ? 'border-red-400 bg-red-50 dark:bg-red-900/20'
        : 'border-gray-200 dark:border-gray-600'
    }`

  const handleResend = async () => {
    setResending(true)
    try {
      await authFetch('/api/auth/resend-verification', { method: 'POST' })
      setResent(true)
    } catch {
      // Silencieux
    } finally {
      setResending(false)
    }
  }

  if (registered) {
    return (
      <div className="max-w-sm mx-auto mt-12 text-center">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">{t('auth.verifyEmail.checkInbox')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            {t('auth.verifyEmail.sentTo', { email: form.email })}
          </p>
          {!resent ? (
            <button
              onClick={handleResend}
              disabled={resending}
              className="text-sm text-gold-500 dark:text-gold-400 hover:underline font-medium disabled:opacity-60"
            >
              {resending ? t('auth.verifyEmail.resending') : t('auth.verifyEmail.resendButton')}
            </button>
          ) : (
            <p className="text-sm text-green-500">{t('auth.verifyEmail.resent')}</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-sm mx-auto mt-12">
      <Helmet><title>Inscription — Écume</title></Helmet>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6 text-center">{t('auth.registerTitle')}</h1>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-4" noValidate>
        <div>
          <label htmlFor="register-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('auth.emailLabel')}</label>
          <input
            id="register-email" name="email" type="email" value={form.email}
            onChange={handleField} onBlur={handleBlur}
            aria-describedby={touched.email && errors.email ? 'register-email-error' : undefined}
            className={fieldClass('email')}
          />
          {touched.email && errors.email && (
            <p id="register-email-error" role="alert" className="mt-1 text-xs text-red-500">{errors.email}</p>
          )}
        </div>
        <div>
          <label htmlFor="register-pseudo" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('auth.pseudoLabel')}</label>
          <input
            id="register-pseudo" name="pseudo" value={form.pseudo}
            onChange={handleField} onBlur={handleBlur}
            aria-describedby={touched.pseudo && errors.pseudo ? 'register-pseudo-error' : undefined}
            className={fieldClass('pseudo')}
          />
          {touched.pseudo && errors.pseudo && (
            <p id="register-pseudo-error" role="alert" className="mt-1 text-xs text-red-500">{errors.pseudo}</p>
          )}
        </div>
        <div>
          <label htmlFor="register-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('auth.passwordLabel')} <span className="text-gray-400 dark:text-gray-500 font-normal">{t('auth.passwordHint')}</span>
          </label>
          <input
            id="register-password" name="password" type="password" value={form.password}
            onChange={handleField} onBlur={handleBlur}
            aria-describedby={touched.password && errors.password ? 'register-password-error' : undefined}
            className={fieldClass('password')}
          />
          {touched.password && errors.password && (
            <p id="register-password-error" role="alert" className="mt-1 text-xs text-red-500">{errors.password}</p>
          )}
        </div>
        <div>
          <label htmlFor="register-confirm" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('auth.confirmLabel')}</label>
          <input
            id="register-confirm" name="confirm" type="password" value={form.confirm}
            onChange={handleField} onBlur={handleBlur}
            aria-describedby={touched.confirm && errors.confirm ? 'register-confirm-error' : undefined}
            className={fieldClass('confirm')}
          />
          {touched.confirm && errors.confirm && (
            <p id="register-confirm-error" role="alert" className="mt-1 text-xs text-red-500">{errors.confirm}</p>
          )}
        </div>
        <button
          type="submit" disabled={loading}
          className="w-full py-2.5 bg-gold-400 text-ink-900 text-sm font-medium rounded-lg hover:bg-gold-500 disabled:opacity-60 transition-colors"
        >
          {loading ? t('auth.registerLoading') : t('auth.registerButton')}
        </button>
      </form>

      <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4">
        {t('auth.alreadyAccount')}{' '}
        <Link to="/login" className="text-gold-500 dark:text-gold-400 hover:underline font-medium">
          {t('auth.signInLink')}
        </Link>
      </p>
    </div>
  )
}
