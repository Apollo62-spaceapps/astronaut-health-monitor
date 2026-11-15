import { useCallback, useEffect, useState } from 'react'
import { DEFAULT_TAB, isTabId, type TabId } from '@/app/tabs'

/** Lê a aba atual do hash da URL (#/vitals). Funciona offline e com `base: './'`. */
function readTab(): TabId {
  const raw = window.location.hash.replace(/^#\/?/, '').split('?')[0] ?? ''
  return isTabId(raw) ? raw : DEFAULT_TAB
}

export function useHashTab(): [TabId, (tab: TabId) => void] {
  const [tab, setTab] = useState<TabId>(readTab)

  useEffect(() => {
    const onHash = () => setTab(readTab())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const go = useCallback((next: TabId) => {
    window.location.hash = `/${next}`
  }, [])

  return [tab, go]
}
