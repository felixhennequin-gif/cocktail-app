import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'

export default function VerifyEmail() {
  const { t } = useTranslation()
  const { user, authFetch } = useAuth()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const [status, setStatus] = useState('loading') // loading | success | error
  const [errorMsg, setErrorMsg] = useState('')
  const [resending, setResending] = useState(false)
  const [resent, setResent] = useState(false)

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setErrorMsg(t('auth.verifyEmail.noToken'))
      return
    }

    fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        const data = await res.json()
        if (res.ok) {
          setStatus('success')
        } else {
          setStatus('error')
          setErrorMsg(data.error || t('auth.verifyEmail.genericError'))
        }
      })
      .catch(() => {
        setStatus('error')
        setErrorMsg(t('auth.verifyEmail.genericError'))
      })
  }, [token, t])

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

  return (
    <div className="max-w-sm mx-auto mt-12 text-center">
      {status === 'loading' && (
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-gold-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">{t('auth.verifyEmail.loading')}</p>
        </div>
      )}

      {status === 'success' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">{t('auth.verifyEmail.successTitle')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{t('auth.verifyEmail.successMessage')}</p>
          <Link
            to="/login"
            className="inline-block px-6 py-2.5 bg-gold-400 text-ink-900 text-sm font-medium rounded-lg hover:bg-gold-500 transition-colors"
          >
            {t('auth.verifyEmail.goToLogin')}
          </Link>
        </div>
      )}

      {status === 'error' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">{t('auth.verifyEmail.errorTitle')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{errorMsg}</p>
          {user && !resent && (
            <button
              onClick={handleResend}
              disabled={resending}
              className="inline-block px-6 py-2.5 bg-gold-400 text-ink-900 text-sm font-medium rounded-lg hover:bg-gold-500 disabled:opacity-60 transition-colors"
            >
              {resending ? t('auth.verifyEmail.resending') : t('auth.verifyEmail.resendButton')}
            </button>
          )}
          {resent && (
            <p className="text-sm text-green-500">{t('auth.verifyEmail.resent')}</p>
          )}
        </div>
      )}
    </div>
  )
}
