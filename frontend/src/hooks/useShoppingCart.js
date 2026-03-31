import { useCallback, useSyncExternalStore } from 'react'

const STORAGE_KEY = 'shopping_cart'
const MAX = 20

let listeners = new Set()
const subscribe = (cb) => { listeners.add(cb); return () => listeners.delete(cb) }
const notify = () => listeners.forEach((cb) => cb())

function getCart() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function setCart(ids) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
  notify()
}

export default function useShoppingCart() {
  const ids = useSyncExternalStore(subscribe, getCart, () => [])

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
