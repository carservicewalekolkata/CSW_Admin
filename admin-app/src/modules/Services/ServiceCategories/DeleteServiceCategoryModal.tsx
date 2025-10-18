import type { DeleteModalState } from '@/types/serviceCategoriesPage'

type DeleteServiceCategoryModalProps = {
  modal: DeleteModalState
}

const DeleteServiceCategoryModal = ({ modal }: DeleteServiceCategoryModalProps) => {
  if (!modal.target) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-xl font-semibold text-brand-700">Delete Service Category</h2>
        <p className="mt-2 text-sm text-brand-600/80">
          Are you sure you want to delete <span className="font-semibold text-brand-700">{modal.target.name}</span>? This action cannot be undone.
        </p>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            className="rounded-md border border-brand-200 px-4 py-2 text-sm font-medium text-brand-600 transition hover:bg-brand-50"
            onClick={modal.cancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className="rounded-md border border-rose-500 bg-rose-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-600"
            onClick={modal.confirm}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

export default DeleteServiceCategoryModal
