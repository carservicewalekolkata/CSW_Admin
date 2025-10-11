'use client'

import type { FormEvent } from 'react'

import { ROLE_PERMISSION_TABLES, type RolePermissionTableId } from '@/constants/roles'

import type { PermissionStateEntry, RoleDraft } from '../../../types/pages/seedPageTypes'

type RoleEditorProps = {
  mode: 'create' | 'edit'
  draft: RoleDraft
  onDraftChange: (next: RoleDraft) => void
  onPermissionToggle: (tableId: RolePermissionTableId, field: keyof PermissionStateEntry, value: boolean) => void
  onCancel: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  isSubmitting: boolean
  error: string | null
}

const RoleEditor = ({
  mode,
  draft,
  onDraftChange,
  onPermissionToggle,
  onCancel,
  onSubmit,
  isSubmitting,
  error,
}: RoleEditorProps) => {
  const actionLabel = mode === 'edit' ? 'Save Changes' : 'Create Role'

  return (
    <form className="space-y-5 rounded-xl border border-brand-100/70 bg-brand-50/50 p-5" onSubmit={onSubmit}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-brand-700">{mode === 'edit' ? 'Update Role' : 'Create Role'}</h3>
          <p className="text-xs uppercase tracking-wide text-brand-500">
            {mode === 'edit'
              ? 'Make adjustments and save to apply immediately.'
              : 'Configure role metadata and permissions.'}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-brand-300 px-4 py-2 text-sm font-semibold text-brand-500 hover:border-brand-400 hover:text-brand-600"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving…' : actionLabel}
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium text-brand-700">
          Role Name
          <input
            type="text"
            value={draft.name}
            onChange={(event) =>
              onDraftChange({
                ...draft,
                name: event.target.value,
              })
            }
            placeholder="e.g. Operations Admin"
            className="rounded-lg border border-brand-100 bg-white px-3 py-2 text-sm text-brand-800 placeholder:text-brand-300 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
            required
          />
        </label>

        <label className="grid gap-2 text-sm font-medium text-brand-700">
          Description <span className="text-xs font-normal text-brand-400">(optional)</span>
          <input
            type="text"
            value={draft.description}
            onChange={(event) =>
              onDraftChange({
                ...draft,
                description: event.target.value,
              })
            }
            placeholder="Short summary for this role"
            className="rounded-lg border border-brand-100 bg-white px-3 py-2 text-sm text-brand-800 placeholder:text-brand-300 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
          />
        </label>
      </div>

      <label className="grid gap-2 text-sm font-medium text-brand-700">
        Member Emails
        <textarea
          value={draft.members}
          onChange={(event) =>
            onDraftChange({
              ...draft,
              members: event.target.value,
            })
          }
          placeholder="Add one email per line or separate with commas"
          rows={4}
          className="rounded-lg border border-brand-100 bg-white px-3 py-2 text-sm text-brand-800 placeholder:text-brand-300 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
        />
        <span className="text-xs text-brand-500">Emails are stored in lowercase. Users can belong to multiple roles.</span>
      </label>

      <div className="space-y-3">
        <p className="text-sm font-semibold text-brand-700">Table Permissions</p>
        <div className="space-y-3">
          {ROLE_PERMISSION_TABLES.map((table) => {
            const state = draft.permissions[table.id]
            return (
              <div
                key={table.id}
                className="flex flex-col gap-3 rounded-lg border border-brand-100 bg-white p-4 text-sm text-brand-700 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-semibold text-brand-700">{table.label}</p>
                  <p className="text-xs text-brand-500">Control access to the {table.label.toLowerCase()} data.</p>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={state?.canView ?? false}
                      onChange={(event) => onPermissionToggle(table.id, 'canView', event.target.checked)}
                    />
                    View
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={state?.canEdit ?? false}
                      onChange={(event) => onPermissionToggle(table.id, 'canEdit', event.target.checked)}
                    />
                    Edit
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={state?.canDelete ?? false}
                      onChange={(event) => onPermissionToggle(table.id, 'canDelete', event.target.checked)}
                    />
                    Delete
                  </label>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
    </form>
  )
}

export default RoleEditor
