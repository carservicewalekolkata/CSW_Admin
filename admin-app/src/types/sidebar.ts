import type { ReactNode } from 'react'
import type { IconType } from 'react-icons'

export type SidebarProps = {
  user: {
    email?: string | null
    name?: string | null
    roles?: string[] | null
  } | null
  children: ReactNode
}

export type SidebarState = {
  isSecondaryOpen: boolean
  viewport: 'small' | 'medium' | 'large'
}

export type SecondaryNavItem = {
  id: string
  label: string
  description: string
  href: string
}

export type PrimaryNavItem = {
  id: string
  label: string
  icon: IconType
  href?: string
  patterns?: string[]
  secondary: SecondaryNavItem[]
  danger?: boolean
}

export type AccountAction = {
  id: string
  label: string
  description?: string
  icon: IconType
  href?: string
  onSelect?: () => void | Promise<void>
  tone?: 'default' | 'critical'
}

export type MobileTab = {
  id: string
  label: string
  icon: IconType
  href?: string
  onSelect?: () => void | Promise<void>
  primary?: boolean
}
