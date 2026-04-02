import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'

/**
 * Convertit une clé publique VAPID encodée en base64 URL-safe
 * en Uint8Array requis par l'API PushManager.
 */
const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)))
}

/**
 * Hook gérant l'abonnement aux notifications push PWA.
 *
 * Retourne :
 *  - supported    {boolean} — Push API disponible dans le navigateur
 *  - permission   {string}  — 'default' | 'granted' | 'denied'
 *  - subscribed   {boolean} — L'utilisateur est actuellement abonné
 *  - loading      {boolean} — Opération en cours
 *  - subscribe    {Function} — Demande la permission et s'abonne
 *  - unsubscribe  {Function} — Se désabonne et notifie le backend
 */
const usePushNotifications = () => {
  const { authFetch } = useAuth()

  const [supported, setSupported]   = useState(false)
  const [permission, setPermission] = useState('default')
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading]       = useState(false)

  // Vérifie la disponibilité et l'état courant au montage
  useEffect(() => {
    const isPushSupported =
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window

    setSupported(isPushSupported)

    if (!isPushSupported) return

    setPermission(Notification.permission)

    // Vérifie si une subscription active existe déjà dans le SW
    navigator.serviceWorker.ready.then((registration) => {
      registration.pushManager.getSubscription().then((sub) => {
        setSubscribed(!!sub)
      })
    }).catch(() => {})
  }, [])

  /**
   * Récupère la clé publique VAPID depuis le backend.
   * Retourne null si le push n'est pas configuré côté serveur.
   */
  const fetchVapidKey = useCallback(async () => {
    try {
      const res = await fetch('/api/push/vapid-key')
      if (!res.ok) return null
      const { publicKey } = await res.json()
      return publicKey
    } catch {
      return null
    }
  }, [])

  /**
   * Demande la permission Notifications et crée la subscription push.
   * N'appelle jamais la Permission API en dehors d'un geste utilisateur.
   */
  const subscribe = useCallback(async () => {
    if (!supported || loading) return

    setLoading(true)
    try {
      // 1. Demander la permission
      const perm = await Notification.requestPermission()
      setPermission(perm)
      if (perm !== 'granted') return

      // 2. Récupérer la clé VAPID publique
      const vapidKey = await fetchVapidKey()
      if (!vapidKey) throw new Error('Clé VAPID non disponible')

      // 3. Créer la subscription dans le service worker
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      })

      // 4. Envoyer la subscription au backend
      const subJson = subscription.toJSON()
      const res = await authFetch('/api/push/subscribe', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          endpoint: subJson.endpoint,
          keys:     subJson.keys,
        }),
      })

      if (res.ok) {
        setSubscribed(true)
      }
    } catch {
      // Echec silencieux — l'état subscribed reste false
    } finally {
      setLoading(false)
    }
  }, [supported, loading, authFetch, fetchVapidKey])

  /**
   * Annule la subscription push et la supprime côté backend.
   */
  const unsubscribe = useCallback(async () => {
    if (!supported || loading) return

    setLoading(true)
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()

      if (subscription) {
        // Prévenir le backend avant de résilier la subscription locale
        await authFetch('/api/push/subscribe', {
          method:  'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ endpoint: subscription.endpoint }),
        }).catch(() => {})

        await subscription.unsubscribe()
      }

      setSubscribed(false)
    } catch {
      // Echec silencieux
    } finally {
      setLoading(false)
    }
  }, [supported, loading, authFetch])

  return { supported, permission, subscribed, loading, subscribe, unsubscribe }
}

export default usePushNotifications
