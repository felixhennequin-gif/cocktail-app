import { useCallback, useSyncExternalStore } from 'react'

const STORAGE_KEY = 'compare_ids'
const MAX = 2
const EMPTY = []

let listeners = new Set()
const subscribe = (cb) => { listeners.add(cb); return () => listeners.delete(cb) }

// Cache le snapshot pour que useSyncExternalStore reçoive une référence stable
const UNSET = Symbol()
let cachedRaw = UNSET
let cachedSnapshot = EMPTY

function getIds() {
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

function setIds(ids) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
  cachedRaw = UNSET
  listeners.forEach((cb) => cb())
}

export default function useCompare() {
  const ids = useSyncExternalStore(subscribe, getIds, () => EMPTY)

  const toggle = useCallback((id) => {
    const current = getIds()
    if (current.includes(id)) {
      setIds(current.filter((x) => x !== id))
    } else if (current.length < MAX) {
      setIds([...current, id])
    }
  }, [])

  const clear = useCallback(() => setIds([]), [])

  const isSelected = useCallback((id) => ids.includes(id), [ids])

  const canAdd = ids.length < MAX

  const compareUrl = ids.length === 2 ? `/compare?ids=${ids.join(',')}` : null

  return { ids, toggle, clear, isSelected, canAdd, compareUrl }
}
