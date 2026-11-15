// Online/offline do navegador (L7 §9.7): sustenta o "works without Earth". Só informativo.
import { useSyncExternalStore } from 'react'

export function useOnline(): boolean {
  return useSyncExternalStore(
    (cb) => {
      window.addEventListener('online', cb)
      window.addEventListener('offline', cb)
      return () => {
        window.removeEventListener('online', cb)
        window.removeEventListener('offline', cb)
      }
    },
    () => navigator.onLine,
    () => true,
  )
}
