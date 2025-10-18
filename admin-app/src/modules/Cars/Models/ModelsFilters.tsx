import type { ModelFiltersState } from '@/types/modelsPage'

type ModelsFiltersProps = {
  filters: ModelFiltersState
  pageSizeOptions?: number[]
}

const DEFAULT_PAGE_SIZES = [10, 25, 50]

const ModelsFilters = ({ filters, pageSizeOptions = DEFAULT_PAGE_SIZES }: ModelsFiltersProps) => {
  const pageSizes = pageSizeOptions.includes(filters.pageSize)
    ? pageSizeOptions
    : [...pageSizeOptions, filters.pageSize].sort((a, b) => a - b)

  const summaryText = filters.total === 0
    ? 'Showing 0-0 of 0 models'
    : `Showing ${filters.startIndex}-${Math.max(filters.startIndex, filters.endIndex)} of ${filters.total} models`

  return (
    <div className="grid gap-4 rounded-xl border border-white/20 bg-white/60 p-4 shadow-sm backdrop-blur">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-brand-600">
          Name
          <input
            type="search"
            value={filters.searchName}
            onChange={(event) => filters.onNameChange(event.target.value)}
            placeholder="Search by model name"
            className="rounded-lg border border-brand-100/80 bg-white px-3 py-2 text-sm text-brand-800 placeholder:text-brand-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
          />
        </label>

        <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-brand-600">
          Slug
          <input
            type="search"
            value={filters.slug}
            onChange={(event) => filters.onSlugChange(event.target.value)}
            placeholder="Filter by slug"
            className="rounded-lg border border-brand-100/80 bg-white px-3 py-2 text-sm text-brand-800 placeholder:text-brand-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
          />
        </label>

        <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-brand-600">
          Brand
          <select
            value={filters.brand}
            onChange={(event) => filters.onBrandChange(event.target.value)}
            className="rounded-lg border border-brand-100/80 bg-white px-3 py-2 text-sm text-brand-800 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
          >
            <option value="">All brands</option>
            {filters.brandFilterOptions.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-brand-600">
          Status Order
          <select
            value={filters.statusSort}
            onChange={(event) => filters.onStatusChange(event.target.value as typeof filters.statusSort)}
            className="rounded-lg border border-brand-100/80 bg-white px-3 py-2 text-sm text-brand-800 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
          >
            <option value="none">No sorting</option>
            <option value="active-first">Active first</option>
            <option value="inactive-first">Inactive first</option>
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-brand-600">
          Updated
          <select
            value={filters.dateSort}
            onChange={(event) => filters.onSortChange(event.target.value as typeof filters.dateSort)}
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
              {pageSizes.map((option) => (
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

            <span className="text-xs font-semibold uppercase tracking-wide text-brand-500">
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

export default ModelsFilters
