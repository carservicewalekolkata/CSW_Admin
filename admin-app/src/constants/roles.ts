export const ROLE_PERMISSION_TABLES = [
  { id: 'serviceCategories', label: 'Service Categories' },
  { id: 'services', label: 'Services' },
  { id: 'carBrands', label: 'Car Brands' },
  { id: 'carModels', label: 'Car Models' },
  { id: 'users', label: 'Users' },
  { id: 'roles', label: 'Roles' },
] as const

export type RolePermissionTableId = (typeof ROLE_PERMISSION_TABLES)[number]['id']

export const ROLE_PERMISSION_TABLE_IDS = ROLE_PERMISSION_TABLES.map((entry) => entry.id)
