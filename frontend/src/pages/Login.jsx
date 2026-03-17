import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validate(form) {
  const errors = {}
  if (!form.email.trim())         errors.email = 'Email requis'
  else if (!EMAIL_RE.test(form.email)) errors.email = 'Format email invalide'
  if (!form.password)             errors.password = 'Mot de passe requis'
  return errors
}

export default function Login() {
  const { login } = useAuth()
  const navigate  = useNavigate()
  const location  = useLocation()
  const from      = location.state?.from || '/'

  const [form, setForm]       = useState({ email: '', password: '' })
  const [touched, setTouched] = useState({})
  const [error, setError]     = useState(null)
  const [loading, setLoading] = useState(false)

  const errors = validate(form)
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
    `w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 ${
      touched[name] && errors[name] ? 'border-red-400 bg-red-50' : 'border-gray-200'
    }`

  return (
    <div className="max-w-sm mx-auto mt-12">
      <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">Connexion</h1>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4" noValidate>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            name="email" type="email" value={form.email}
            onChange={handleField} onBlur={handleBlur}
            className={fieldClass('email')}
          />
          {touched.email && errors.email && (
            <p className="mt-1 text-xs text-red-500">{errors.email}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
          <input
            name="password" type="password" value={form.password}
            onChange={handleField} onBlur={handleBlur}
            className={fieldClass('password')}
          />
          {touched.password && errors.password && (
            <p className="mt-1 text-xs text-red-500">{errors.password}</p>
          )}
        </div>
        <button
          type="submit" disabled={loading}
          className="w-full py-2.5 bg-amber-500 text-white text-sm font-medium rounded-lg hover:bg-amber-600 disabled:opacity-60 transition-colors"
        >
          {loading ? 'Connexion...' : 'Se connecter'}
        </button>
      </form>

      <p className="text-center text-sm text-gray-500 mt-4">
        Pas encore de compte ?{' '}
        <Link to="/register" className="text-amber-600 hover:underline font-medium">
          S'inscrire
        </Link>
      </p>
    </div>
  )
}
