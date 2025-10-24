import type { CreateModalState } from '@/types/serviceCategoriesPage'

type CreateServiceCategoryModalProps = {
  modal: CreateModalState
}

const CreateServiceCategoryModal = ({ modal }: CreateServiceCategoryModalProps) => {
  if (!modal.isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <form className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onSubmit={modal.onSubmit}>
        <h2 className="text-xl font-semibold text-brand-700">Add Service Category</h2>
        <p className="mt-2 text-sm text-brand-600/80">
          Provide a name and short description to create a new category for classifying services.
        </p>

        <label className="mt-5 flex flex-col gap-2 text-sm font-medium text-brand-700">
          Category Name
          <input
            type="text"
            value={modal.name}
            onChange={(event) => modal.onNameChange(event.target.value)}
            placeholder="e.g. Exterior Detailing"
            autoFocus
            className="rounded-lg border border-brand-200 px-3 py-2 text-sm text-brand-800 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
            aria-invalid={modal.error ? 'true' : 'false'}
          />
        </label>

        <label className="mt-4 flex flex-col gap-2 text-sm font-medium text-brand-700">
          Short Description
          <textarea
            value={modal.description}
            onChange={(event) => modal.onDescriptionChange(event.target.value)}
            placeholder="Describe how this category helps users discover the right services."
            rows={3}
            className="rounded-lg border border-brand-200 px-3 py-2 text-sm text-brand-800 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
          />
        </label>

        <label className="mt-4 flex flex-col gap-2 text-sm font-medium text-brand-700">
          Category Type
          <select
            value={modal.type}
            onChange={(event) => modal.onTypeChange(event.target.value as CreateModalState['type'])}
            className="rounded-lg border border-brand-200 px-3 py-2 text-sm text-brand-800 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
          >
            <option value="basic">Basic</option>
            <option value="custom">Custom</option>
          </select>
        </label>

        {modal.error && <p className="mt-2 text-sm text-rose-600">{modal.error}</p>}

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            className="rounded-md border border-brand-200 px-4 py-2 text-sm font-medium text-brand-600 transition hover:bg-brand-50"
            onClick={modal.close}
            disabled={modal.isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-md border border-brand-500 bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={modal.isSubmitting}
          >
            {modal.isSubmitting ? 'Creating...' : 'Create Category'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default CreateServiceCategoryModal
