import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function Register() {
  const { register } = useAuth()
  const { t }        = useTranslation()
  const navigate     = useNavigate()

  const [form, setForm]       = useState({ email: '', pseudo: '', password: '', confirm: '' })
  const [touched, setTouched] = useState({})
  const [error, setError]     = useState(null)
  const [loading, setLoading] = useState(false)

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
      navigate('/', { replace: true })
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
