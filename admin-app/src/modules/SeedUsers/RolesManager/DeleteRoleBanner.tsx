'use client'

import type { RoleRecord } from '@/types/roles'

type DeleteRoleBannerProps = {
  role: RoleRecord
  isDeleting: boolean
  onConfirm: () => void
  onCancel: () => void
}

const DeleteRoleBanner = ({ role, isDeleting, onConfirm, onCancel }: DeleteRoleBannerProps) => (
  <div className="rounded-xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
    <p className="font-semibold">Delete role “{role.name}”?</p>
    <p className="mt-1 text-sm text-rose-600/80">
      This action removes the role and revokes access for all assigned members. This cannot be undone.
    </p>
    <div className="mt-3 flex gap-3">
      <button
        type="button"
        className="rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-70"
        onClick={onConfirm}
        disabled={isDeleting}
      >
        {isDeleting ? 'Deleting…' : 'Delete Role'}
      </button>
      <button
        type="button"
        className="text-sm font-semibold text-rose-500 hover:text-rose-600"
        onClick={onCancel}
        disabled={isDeleting}
      >
        Cancel
      </button>
    </div>
  </div>
)

export default DeleteRoleBanner
