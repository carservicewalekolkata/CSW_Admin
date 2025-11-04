export interface GomechanicCategory {
  id: string
  label: string
  description?: string
}

export const GOMECHANIC_DEFAULT_CITY_ID = '144'

export const gomechanicCategories: GomechanicCategory[] = [
  {
    id: '0',
    label: 'Car services',
    description: 'Complete maintenance, periodic service, and SOS support.',
  },
  {
    id: '13',
    label: 'AC services & repairs',
    description: 'HVAC inspection, gas refills, and leak fixes.',
  },
  {
    id: '-4',
    label: 'Batteries',
    description: 'Battery replacement support with SOC testing.',
  },
  {
    id: '21',
    label: 'Tyres & wheel care',
    description: 'Alignment, balancing, and tyre replacement.',
  },
  {
    id: '16',
    label: 'Denting & painting',
    description: 'Bodywork, panel repairs, and paint jobs.',
  },
  {
    id: '37',
    label: 'Detailing',
    description: 'Interior deep cleaning and detailing packages.',
  },
]
