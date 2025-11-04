import { HiMiniSquares2X2, HiOutlinePlus, HiOutlineUser } from 'react-icons/hi2'
import { FaCar } from 'react-icons/fa'
import { MdOutlineLocalLaundryService } from 'react-icons/md'
import { TbDatabaseEdit } from 'react-icons/tb'

import type { MobileTab, PrimaryNavItem } from '../../types/sidebar'

export const NAVIGATION: PrimaryNavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: HiMiniSquares2X2,
    patterns: ['/dashboard'],
    secondary: [
      {
        id: 'overview',
        label: 'Overview',
        description: 'At-a-glance metrics and platform health.',
        href: '/dashboard',
      },
      {
        id: 'activity',
        label: 'Activity log',
        description: 'Keep an eye on import history and recent updates.',
        href: '/dashboard/activity',
      },
      {
        id: 'customers',
        label: 'Customers',
        description: 'Monitor verified customer searches and sessions.',
        href: '/dashboard/activity/customers',
      },
    ],
  },
  {
    id: 'cars',
    label: 'Cars',
    icon: FaCar,
    patterns: ['/dashboard/cars'],
    secondary: [
      {
        id: 'brands',
        label: 'Car Brands',
        description: 'Display all the brands.',
        href: '/dashboard/cars/brands',
      },
      {
        id: 'models',
        label: 'Car Models',
        description: 'Display all the models.',
        href: '/dashboard/cars/models',
      },
    ],
  },
  {
    id: 'services',
    label: 'Services',
    icon: MdOutlineLocalLaundryService,
    patterns: ['/dashboard/services'],
    secondary: [
      {
        id: 'service-category',
        label: 'Service Category',
        description: 'Displays all the service categories.',
        href: '/dashboard/services/category',
      },
      {
        id: 'service-details',
        label: 'Service Details',
        description: 'Displays details of each services.',
        href: '/dashboard/services/details',
      },
    ],
  },
  {
    id: 'seed',
    label: 'Seed Data',
    icon: TbDatabaseEdit,
    patterns: ['/dashboard/seed'],
    secondary: [
      {
        id: 'users',
        label: 'Users & roles',
        description: 'Invite teammates and manage permissions.',
        href: '/dashboard/seed/users',
      },
      {
        id: 'data-fetch',
        label: 'Data Fetch',
        description: 'Fetch Data from different car vendors.',
        href: '/dashboard/seed/data-fetch',
      },
    ],
    danger: true,
  },
]

export const MOBILE_TABS: MobileTab[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: HiMiniSquares2X2,
    href: '/dashboard',
  },
  {
    id: 'cars',
    label: 'Cars',
    icon: FaCar,
    href: '/dashboard/cars',
  },
  {
    id: 'create',
    label: 'Create',
    icon: HiOutlinePlus,
    href: '/dashboard/services/create',
    primary: true,
  },
  {
    id: 'services',
    label: 'Services',
    icon: MdOutlineLocalLaundryService,
    href: '/dashboard/services',
  },
  {
    id: 'profile',
    label: 'Profile',
    icon: HiOutlineUser,
    href: '/dashboard/profile',
  },
]
