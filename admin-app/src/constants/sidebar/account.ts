import {
  HiOutlineArrowRightOnRectangle,
  HiOutlineCog6Tooth,
  HiOutlineMoon,
} from 'react-icons/hi2'

import type { AccountAction } from '../../types/sidebar'

export type AccountActionDefinition = Omit<AccountAction, 'onSelect'>

export const ACCOUNT_ACTIONS: AccountActionDefinition[] = [
  {
    id: 'settings',
    label: 'Settings',
    description: 'Workspace preferences',
    icon: HiOutlineCog6Tooth,
    href: '/settings',
  },
  {
    id: 'theme',
    label: 'Theme',
    description: 'Personalize the dashboard',
    icon: HiOutlineMoon,
    href: '/settings/theme',
  },
  {
    id: 'logout',
    label: 'Log out',
    icon: HiOutlineArrowRightOnRectangle,
    tone: 'critical',
  },
]

export const HIGHLIGHTED_ACTION_ID = 'theme'
