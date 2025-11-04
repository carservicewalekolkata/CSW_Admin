'use client'

import type { BrandDeleteModalState } from '@/types/brandsPage'

type BrandDeleteModalProps = {
  modal: BrandDeleteModalState
}

const BrandDeleteModal = ({ modal }: BrandDeleteModalProps) => {
  if (!modal.target) return null

  const { target } = modal

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-xl font-semibold text-brand-700">Delete Brand</h2>
        <p className="mt-2 text-sm text-brand-600/80">
          Are you sure you want to delete <span className="font-semibold text-brand-700">{target.name}</span>? This action cannot be undone.
        </p>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            className="rounded-md border border-brand-200 px-4 py-2 text-sm font-medium text-brand-600 transition hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={modal.cancel}
            disabled={modal.isDeleting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="flex items-center justify-center rounded-md border border-rose-500 bg-rose-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-70"
            onClick={() => void modal.confirm()}
            disabled={modal.isDeleting}
          >
            {modal.isDeleting ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/70 border-t-transparent" />
            ) : (
              'Delete'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default BrandDeleteModal
