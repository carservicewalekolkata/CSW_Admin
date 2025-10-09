'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

type UseAccountMenuArgs = {
  watchValue?: unknown
}

export const useAccountMenu = ({ watchValue }: UseAccountMenuArgs = {}) => {
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const timeoutRef = useRef<ReturnType<typeof window.setTimeout> | null>(null)
  const openRef = useRef(false)

  const [mounted, setMounted] = useState(false)
  const [open, setOpen] = useState(false)

  const close = useCallback(() => {
    setOpen(false)
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current)
    }
    timeoutRef.current = window.setTimeout(() => {
      setMounted(false)
      timeoutRef.current = null
    }, 200)
  }, [])

  const openMenu = useCallback(() => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    setMounted(true)
    requestAnimationFrame(() => setOpen(true))
  }, [])

  const toggle = useCallback(() => {
    if (open) {
      close()
    } else {
      openMenu()
    }
  }, [open, close, openMenu])

  useEffect(() => {
    if (!mounted) {
      return
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (menuRef.current?.contains(target) || triggerRef.current?.contains(target)) {
        return
      }
      close()
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        close()
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [mounted, close])

  useEffect(() => {
    if (open && menuRef.current) {
      menuRef.current.focus({ preventScroll: true })
    }
  }, [open])

  useEffect(() => {
    openRef.current = open
  }, [open])

  useEffect(() => {
    if (!openRef.current) {
      return
    }
    close()
  }, [watchValue, close])

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return {
    accountMenuRef: menuRef,
    accountTriggerRef: triggerRef,
    accountMenuMounted: mounted,
    accountMenuOpen: open,
    closeAccountMenu: close,
    openAccountMenu: openMenu,
    toggleAccountMenu: toggle,
  }
}
