import type { ServiceCategory } from '@/types/serviceCategories'

export const formatServiceCategoryDate = (value: string | null) => {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? '—'
    : new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }).format(date)
}

export const resolveServiceCategoryErrorMessage = (error: unknown, fallback: string) => {
  if (typeof error === 'string') {
    return error
  }

  if (error && typeof error === 'object') {
    if ('data' in error) {
      const data = (error as { data?: unknown }).data
      if (
        data &&
        typeof data === 'object' &&
        'message' in data &&
        typeof (data as { message?: unknown }).message === 'string'
      ) {
        return (data as { message: string }).message
      }
    }

    if ('error' in error && typeof (error as { error?: unknown }).error === 'string') {
      return (error as { error: string }).error
    }
  }

  return fallback
}

export const removeCategoryFromList = (items: ServiceCategory[], id: number) =>
  items.filter((category) => category.id !== id)

export const upsertCategoryIntoList = (
  items: ServiceCategory[],
  created: ServiceCategory,
  sortOrder: 'asc' | 'desc',
  limit: number,
) => {
  const filtered = items.filter((item) => item.id !== created.id)

  if (sortOrder === 'asc') {
    filtered.push(created)
  } else {
    filtered.unshift(created)
  }

  return filtered.slice(0, limit)
}
