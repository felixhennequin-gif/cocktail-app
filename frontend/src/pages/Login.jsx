import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Helmet } from 'react-helmet-async'
import { useAuth } from '../contexts/AuthContext'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function Login() {
  const { login } = useAuth()
  const { t }     = useTranslation()
  const navigate  = useNavigate()
  const location  = useLocation()
  const from      = location.state?.from || '/'

  const [form, setForm]       = useState({ email: '', password: '' })
  const [touched, setTouched] = useState({})
  const [error, setError]     = useState(null)
  const [loading, setLoading] = useState(false)

  const validate = (f) => {
    const errors = {}
    if (!f.email.trim())            errors.email = t('auth.errors.emailRequired')
    else if (!EMAIL_RE.test(f.email)) errors.email = t('auth.errors.emailInvalid')
    if (!f.password)                errors.password = t('auth.errors.passwordRequired')
    return errors
  }

  const errors  = validate(form)
  const isValid = Object.keys(errors).length === 0

  const handleField = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))
  const handleBlur  = (e) => setTouched((t) => ({ ...t, [e.target.name]: true }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setTouched({ email: true, password: true })
    if (!isValid) return
    setLoading(true)
    setError(null)
    try {
      await login(form.email, form.password)
      navigate(from, { replace: true })
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

  return (
    <div className="max-w-sm mx-auto mt-12">
      <Helmet><title>Connexion — Écume</title></Helmet>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6 text-center">{t('auth.loginTitle')}</h1>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-4" noValidate>
        <div>
          <label htmlFor="login-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('auth.emailLabel')}</label>
          <input
            id="login-email" name="email" type="email" value={form.email}
            onChange={handleField} onBlur={handleBlur}
            aria-describedby={touched.email && errors.email ? 'login-email-error' : undefined}
            className={fieldClass('email')}
          />
          {touched.email && errors.email && (
            <p id="login-email-error" role="alert" className="mt-1 text-xs text-red-500">{errors.email}</p>
          )}
        </div>
        <div>
          <label htmlFor="login-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('auth.passwordLabel')}</label>
          <input
            id="login-password" name="password" type="password" value={form.password}
            onChange={handleField} onBlur={handleBlur}
            aria-describedby={touched.password && errors.password ? 'login-password-error' : undefined}
            className={fieldClass('password')}
          />
          {touched.password && errors.password && (
            <p id="login-password-error" role="alert" className="mt-1 text-xs text-red-500">{errors.password}</p>
          )}
        </div>
        <button
          type="submit" disabled={loading}
          className="w-full py-2.5 bg-gold-400 text-ink-900 text-sm font-medium rounded-lg hover:bg-gold-500 disabled:opacity-60 transition-colors"
        >
          {loading ? t('auth.loginLoading') : t('auth.loginButton')}
        </button>
      </form>

      <div className="text-center text-sm mt-4 space-y-2">
        <p className="text-gray-500 dark:text-gray-400">
          <Link to="/forgot-password" className="text-gold-500 dark:text-gold-400 hover:underline font-medium">
            {t('auth.forgotPassword.link')}
          </Link>
        </p>
        <p className="text-gray-500 dark:text-gray-400">
          {t('auth.noAccount')}{' '}
          <Link to="/register" className="text-gold-500 dark:text-gold-400 hover:underline font-medium">
            {t('auth.signUpLink')}
          </Link>
        </p>
      </div>
    </div>
  )
}
