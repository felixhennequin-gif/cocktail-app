import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]               = useState(null)
  const [token, setToken]             = useState(() => localStorage.getItem('token'))
  const [refreshToken, setRefreshToken] = useState(() => localStorage.getItem('refreshToken'))
  const [loading, setLoading]         = useState(true)

  // Ref vers le refreshToken pour éviter les closures stale dans authFetch
  const refreshTokenRef = useRef(refreshToken)
  const tokenRef = useRef(token)
  const refreshPromiseRef = useRef(null) // Déduplication des refresh parallèles
  useEffect(() => { refreshTokenRef.current = refreshToken }, [refreshToken])
  useEffect(() => { tokenRef.current = token }, [token])

  // Vérifie le token au démarrage
  useEffect(() => {
    if (!token) { setLoading(false); return }
    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((u) => {
        if (u) {
          setUser(u)
        } else {
          localStorage.removeItem('token')
          localStorage.removeItem('refreshToken')
          setToken(null)
          setRefreshToken(null)
        }
      })
      .catch(() => {
        localStorage.removeItem('token')
        localStorage.removeItem('refreshToken')
        setToken(null)
        setRefreshToken(null)
      })
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // run once on mount — vérifie le token stocké au démarrage uniquement

  const login = async (email, password) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error || 'Erreur de connexion')
    }
    const data = await res.json()
    localStorage.setItem('token', data.token)
    if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken)
    setToken(data.token)
    setRefreshToken(data.refreshToken || null)
    setUser(data.user)
    return data.user
  }

  const register = async (email, pseudo, password) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, pseudo, password }),
    })
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error || 'Erreur lors de l\'inscription')
    }
    const data = await res.json()
    localStorage.setItem('token', data.token)
    if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken)
    setToken(data.token)
    setRefreshToken(data.refreshToken || null)
    setUser(data.user)
    return data.user
  }

  const logout = async () => {
    const currentRefreshToken = refreshTokenRef.current
    // Invalide le refresh token côté serveur
    if (currentRefreshToken) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: currentRefreshToken }),
        })
      } catch {
        // Échec silencieux — on nettoie quand même le localStorage
      }
    }
    localStorage.removeItem('token')
    localStorage.removeItem('refreshToken')
    setToken(null)
    setRefreshToken(null)
    setUser(null)
  }

  // fetch avec token JWT injecté automatiquement + refresh automatique sur 401
  // useCallback([]) : authFetch est stable car elle lit le token via tokenRef/refreshTokenRef
  const authFetch = useCallback(async (url, options = {}) => {
    const currentToken = tokenRef.current
    const res = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        ...(currentToken ? { Authorization: `Bearer ${currentToken}` } : {}),
      },
    })

    if (res.status === 401 && refreshTokenRef.current) {
      // Déduplication : si un refresh est déjà en cours, attendre le résultat
      if (!refreshPromiseRef.current) {
        refreshPromiseRef.current = fetch('/api/auth/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: refreshTokenRef.current }),
        })
          .then(async (refreshRes) => {
            if (refreshRes.ok) {
              const data = await refreshRes.json()
              localStorage.setItem('token', data.token)
              setToken(data.token)
              tokenRef.current = data.token
              if (data.refreshToken) {
                localStorage.setItem('refreshToken', data.refreshToken)
                setRefreshToken(data.refreshToken)
                refreshTokenRef.current = data.refreshToken
              }
              return data.token
            } else {
              await logout()
              return null
            }
          })
          .finally(() => { refreshPromiseRef.current = null })
      }
      const newToken = await refreshPromiseRef.current
      if (newToken) {
        return fetch(url, {
          ...options,
          headers: { ...options.headers, Authorization: `Bearer ${newToken}` },
        })
      }
      return res
    }
    return res
  }, [])

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, authFetch }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
