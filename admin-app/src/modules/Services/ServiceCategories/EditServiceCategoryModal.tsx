'use client'

import type { EditModalState } from '@/types/serviceCategoriesPage'

type EditServiceCategoryModalProps = {
  modal: EditModalState
}

const EditServiceCategoryModal = ({ modal }: EditServiceCategoryModalProps) => {
  if (!modal.isOpen || !modal.target) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <form className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onSubmit={modal.onSubmit}>
        <h2 className="text-xl font-semibold text-brand-700">Edit Service Category</h2>
        <p className="mt-2 text-sm text-brand-600/80">
          Update the name of the service category. Changes apply immediately across the app.
        </p>

        <label className="mt-5 flex flex-col gap-2 text-sm font-medium text-brand-700">
          Category Name
          <input
            type="text"
            value={modal.name}
            onChange={(event) => modal.onNameChange(event.target.value)}
            placeholder="Enter category name"
            autoFocus
            className="rounded-lg border border-brand-200 px-3 py-2 text-sm text-brand-800 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
            aria-invalid={modal.error ? 'true' : 'false'}
          />
        </label>

        {modal.error && <p className="mt-2 text-sm text-rose-600">{modal.error}</p>}

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            className="rounded-md border border-brand-200 px-4 py-2 text-sm font-medium text-brand-600 transition hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-60"
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
            {modal.isSubmitting ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default EditServiceCategoryModal
