import { useCallback, useSyncExternalStore } from 'react'

const STORAGE_KEY = 'shopping_cart'
const MAX = 20
const EMPTY = []

let listeners = new Set()
const subscribe = (cb) => { listeners.add(cb); return () => listeners.delete(cb) }

// Cache le snapshot pour que useSyncExternalStore reçoive une référence stable
// (getSnapshot doit renvoyer la même référence si la valeur n'a pas changé)
const UNSET = Symbol()
let cachedRaw = UNSET
let cachedSnapshot = EMPTY

function getCart() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw !== cachedRaw) {
      cachedRaw = raw
      cachedSnapshot = raw ? JSON.parse(raw) : EMPTY
    }
    return cachedSnapshot
  } catch {
    return cachedSnapshot
  }
}

function setCart(ids) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
  // Invalide le cache avant de notifier
  cachedRaw = UNSET
  listeners.forEach((cb) => cb())
}

export default function useShoppingCart() {
  const ids = useSyncExternalStore(subscribe, getCart, () => EMPTY)

  const add = useCallback((id) => {
    const current = getCart()
    if (!current.includes(id) && current.length < MAX) {
      setCart([...current, id])
    }
  }, [])

  const remove = useCallback((id) => {
    setCart(getCart().filter((x) => x !== id))
  }, [])

  const toggle = useCallback((id) => {
    const current = getCart()
    if (current.includes(id)) {
      setCart(current.filter((x) => x !== id))
    } else if (current.length < MAX) {
      setCart([...current, id])
    }
  }, [])

  const clear = useCallback(() => setCart([]), [])

  const has = useCallback((id) => ids.includes(id), [ids])

  return { ids, add, remove, toggle, clear, has, count: ids.length }
}
