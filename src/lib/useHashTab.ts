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

/** Lê um parâmetro depois do "?" no hash (ex.: #/sources?src=S07 → "S07"). */
export function readHashParam(name: string, hash = window.location.hash): string | null {
  const query = hash.split('?')[1]
  return query ? new URLSearchParams(query).get(name) : null
}

/** Parâmetro do hash que acompanha a navegação (SRC-02: selo → linha da fonte). */
export function useHashParam(name: string): string | null {
  const [value, setValue] = useState(() => readHashParam(name))
  useEffect(() => {
    const onHash = () => setValue(readHashParam(name))
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [name])
  return value
}

/** Navega para uma aba (fora de componente: usado pelas ações propostas do Orbit). */
export function goToTab(tab: TabId): void {
  window.location.hash = `/${tab}`
}
