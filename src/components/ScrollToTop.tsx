import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/** Resets scroll on route change so every page boots at the top. */
export function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [pathname])

  return null
}
