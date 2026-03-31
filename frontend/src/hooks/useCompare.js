import { useState, useCallback, useSyncExternalStore } from 'react'

const STORAGE_KEY = 'compare_ids'
const MAX = 2

// Stockage et notification pour useSyncExternalStore
let listeners = new Set()
const subscribe = (cb) => { listeners.add(cb); return () => listeners.delete(cb) }
const notify = () => listeners.forEach((cb) => cb())

function getIds() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function setIds(ids) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
  notify()
}

export default function useCompare() {
  const ids = useSyncExternalStore(subscribe, getIds, () => [])

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
