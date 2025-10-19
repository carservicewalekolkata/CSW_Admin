import type { SeedVendorDefinition } from '@/types/seed'

export const seedVendors: SeedVendorDefinition[] = [
  {
    id: 'gomechanic',
    name: 'GoMechanic',
    status: 'ready',
    description:
      'Pull brands, models, service categories, and downstream service details directly from GoMechanic.',
    accentColor: 'from-brand-500 via-brand-500 to-brand-600',
    helperText: 'Live integration',
    highlights: [
      {
        id: 'brands',
        label: 'Seed brand directory with icons',
      },
      {
        id: 'models',
        label: 'Sync model metadata & hero assets',
      },
      {
        id: 'services',
        label: 'Hydrate service categories and offerings',
      },
    ],
  },
]
