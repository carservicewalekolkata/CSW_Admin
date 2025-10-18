import type { ServiceFiltersState } from '@/types/serviceDetailsPage'

type ServiceDetailsFiltersProps = {
  filters: ServiceFiltersState
  pageSizeOptions?: number[]
}

const DEFAULT_PAGE_SIZES = [10, 25, 50]

const ServiceDetailsFilters = ({
  filters,
  pageSizeOptions = DEFAULT_PAGE_SIZES,
}: ServiceDetailsFiltersProps) => {
  const options = pageSizeOptions.includes(filters.pageSize)
    ? pageSizeOptions
    : [...pageSizeOptions, filters.pageSize].sort((a, b) => a - b)

  const summaryText =
    filters.total === 0
      ? 'Showing 0-0 of 0 services'
      : `Showing ${filters.startIndex}-${Math.max(filters.startIndex, filters.endIndex)} of ${filters.total} services`

  return (
    <div className="grid gap-4 rounded-xl border border-white/20 bg-white/60 p-4 shadow-sm backdrop-blur">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-brand-600">
          Search
          <input
            type="search"
            value={filters.searchTerm}
            onChange={(event) => filters.onSearchChange(event.target.value)}
            placeholder="Filter by name or description"
            className="rounded-lg border border-brand-100/80 bg-white px-3 py-2 text-sm text-brand-800 placeholder:text-brand-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
          />
        </label>

        <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-brand-600">
          Category
          <select
            value={filters.categoryId}
            onChange={(event) => filters.onCategoryChange(event.target.value)}
            className="rounded-lg border border-brand-100/80 bg-white px-3 py-2 text-sm text-brand-800 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
          >
            <option value="">All categories</option>
            {filters.categoryOptions.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-brand-600">
          Status
          <select
            value={filters.status}
            onChange={(event) => filters.onStatusChange(event.target.value as ServiceFiltersState['status'])}
            className="rounded-lg border border-brand-100/80 bg-white px-3 py-2 text-sm text-brand-800 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-brand-600">
          Updated
          <select
            value={filters.dateSort}
            onChange={(event) => filters.onSortChange(event.target.value as 'asc' | 'desc')}
            className="rounded-lg border border-brand-100/80 bg-white px-3 py-2 text-sm text-brand-800 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
          >
            <option value="desc">Newest first</option>
            <option value="asc">Oldest first</option>
          </select>
        </label>
      </div>

      <div className="flex flex-col gap-3 border-t border-white/40 pt-3 text-sm text-brand-700 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs uppercase tracking-wide text-brand-500">{summaryText}</p>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-brand-600">
            Rows per page
            <select
              value={filters.pageSize}
              onChange={(event) => filters.onPageSizeChange(Number(event.target.value))}
              className="rounded-md border border-brand-100/80 bg-white px-2 py-1 text-sm text-brand-800 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
            >
              {options.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-md border border-brand-200 px-3 py-1 text-sm font-medium text-brand-600 transition hover:bg-brand-50 disabled:cursor-not-allowed disabled:text-brand-300"
              onClick={filters.onPrevPage}
              disabled={filters.safePage === 1}
            >
              Previous
            </button>

            <span className="text-xs                                          font-semibold uppercase tracking-wide text-brand-500">
              Page {filters.safePage} of {filters.totalPages}
            </span>

            <button
              type="button"
              className="rounded-md border border-brand-200 px-3 py-1 text-sm font-medium text-brand-600 transition hover:bg-brand-50 disabled:cursor-not-allowed disabled:text-brand-300"
              onClick={filters.onNextPage}
              disabled={filters.safePage === filters.totalPages}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ServiceDetailsFilters
