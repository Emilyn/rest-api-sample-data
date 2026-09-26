import * as React from "react"

/**
 * Tracks the "dark" class ThemeProvider toggles on <html>, so components that
 * can't consume ThemeProvider's context directly (e.g. third-party editors)
 * can still pick a matching theme.
 */
export function useIsDark() {
  const [isDark, setIsDark] = React.useState(() =>
    document.documentElement.classList.contains("dark")
  )

  React.useEffect(() => {
    const root = document.documentElement
    const observer = new MutationObserver(() => {
      setIsDark(root.classList.contains("dark"))
    })
    observer.observe(root, { attributes: true, attributeFilter: ["class"] })
    return () => observer.disconnect()
  }, [])

  return isDark
}
