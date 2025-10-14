'use client'

import { useCallback, useState, type FormEvent } from 'react'
import { FiPlus } from 'react-icons/fi'

import { toast } from '@/lib/sonner'
import type { RoleRecord } from '@/types/roles'
import { ROLE_PERMISSION_TABLES, type RolePermissionTableId } from '@/constants/roles'

import { useRoles } from '@/hooks/useRoles'
import type { PermissionStateEntry, RoleDraft } from '@/types/pages/seedPageTypes'
import { createDraftFromRole, createEmptyRoleDraft, toRoleMutationPayload } from '@/types/pages/seedPageTypes'

import RolesTable from './RolesTable'
import RoleEditor from './RoleEditor'
import DeleteRoleBanner from './DeleteRoleBanner'

const permissionTableIds = ROLE_PERMISSION_TABLES.map((table) => table.id) as RolePermissionTableId[]

const parseMembers = (input: string) =>
  input
    .split(/[\n,]+/)
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)

const RolesManager = () => {
  const { roles, isLoading, error, setError, createRole, updateRole, deleteRole } = useRoles()

  const [mode, setMode] = useState<'create' | 'edit' | null>(null)
  const [draft, setDraft] = useState<RoleDraft | null>(null)
  const [activeRoleId, setActiveRoleId] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<RoleRecord | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const updateDraft = useCallback((next: RoleDraft) => {
    setDraft(next)
  }, [])

  const resetFormState = useCallback(() => {
    setMode(null)
    setDraft(null)
    setActiveRoleId(null)
    setFormError(null)
    setIsSubmitting(false)
  }, [])

  const startCreate = () => {
    setMode('create')
    setDraft(createEmptyRoleDraft(permissionTableIds))
    setActiveRoleId(null)
    setFormError(null)
  }

  const startEdit = (role: RoleRecord) => {
    setMode('edit')
    setActiveRoleId(role.id)
    setDraft(createDraftFromRole(role, permissionTableIds))
    setFormError(null)
  }

  const cancelEditor = () => {
    resetFormState()
  }

  const handlePermissionToggle = (tableId: RolePermissionTableId, field: keyof PermissionStateEntry, value: boolean) => {
    setDraft((current) => {
      if (!current) {
        return current
      }

      const nextPermissions = { ...current.permissions }
      const entry = { ...nextPermissions[tableId] }

      if (!entry) {
        return current
      }

      if (field === 'canView') {
        entry.canView = value
        if (!value) {
          entry.canEdit = false
          entry.canDelete = false
        }
      } else {
        entry[field] = value
        if (value) {
          entry.canView = true
        }
      }

      nextPermissions[tableId] = entry

      return {
        ...current,
        permissions: nextPermissions,
      }
    })
  }

  const handleRoleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!mode || !draft) {
      return
    }

    const name = draft.name.trim()
    if (!name) {
      setFormError('Role name is required.')
      return
    }

    const members = parseMembers(draft.members)
    const permissions = toRoleMutationPayload(draft)

    if (!permissions.length) {
      setFormError('Select at least one table permission.')
      return
    }

    setIsSubmitting(true)
    setFormError(null)

    const payload = {
      name,
      description: draft.description.trim() || null,
      members,
      permissions,
    }

    const response =
      mode === 'edit' && activeRoleId
        ? await updateRole(activeRoleId, payload)
        : await createRole(payload)

    setIsSubmitting(false)

    if (!response.success) {
      setFormError(response.message ?? 'Unable to save role.')
      return
    }

    toast.success(mode === 'edit' ? 'Role updated' : 'Role created')
    resetFormState()
  }

  const confirmDelete = async () => {
    if (!deleteTarget) {
      return
    }

    setIsDeleting(true)
    const response = await deleteRole(deleteTarget.id)
    setIsDeleting(false)

    if (!response.success) {
      toast.error(response.message ?? 'Unable to delete role.')
      return
    }

    toast.success('Role deleted')
    if (mode === 'edit' && activeRoleId === deleteTarget.id) {
      resetFormState()
    }
    setDeleteTarget(null)
  }

  return (
    <section className="space-y-6 rounded-2xl border border-white/10 bg-white/70 p-6 shadow-sm backdrop-blur">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-brand-800">Roles & Permissions</h2>
          <p className="text-sm text-brand-600/80">
            Manage custom roles and map teammates to the datasets they can view, edit, or delete.
          </p>
        </div>
        <button
          type="button"
          onClick={startCreate}
          className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
        >
          <FiPlus className="h-4 w-4" />
          New Role
        </button>
      </header>

      {error ? (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <span>{error}</span>
          <button type="button" className="text-xs font-semibold text-rose-500 hover:text-rose-600" onClick={() => setError(null)}>
            Dismiss
          </button>
        </div>
      ) : null}

      <RolesTable roles={roles} isLoading={isLoading} onEdit={startEdit} onDelete={setDeleteTarget} />

      {mode && draft ? (
        <RoleEditor
          mode={mode}
          draft={draft}
          onDraftChange={updateDraft}
          onPermissionToggle={handlePermissionToggle}
          onCancel={cancelEditor}
          onSubmit={handleRoleSubmit}
          isSubmitting={isSubmitting}
          error={formError}
        />
      ) : null}

      {deleteTarget ? (
        <DeleteRoleBanner
          role={deleteTarget}
          isDeleting={isDeleting}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      ) : null}
    </section>
  )
}

export default RolesManager
