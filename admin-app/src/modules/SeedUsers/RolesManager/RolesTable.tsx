'use client'

import { useMemo } from 'react'
import { FiEdit2, FiTrash2 } from 'react-icons/fi'

import Table, { type TableColumn } from '@/components/Table'
import type { RoleRecord } from '@/types/roles'
import { ROLE_PERMISSION_TABLES } from '@/constants/roles'

type RolesTableProps = {
  roles: RoleRecord[]
  isLoading: boolean
  onEdit: (role: RoleRecord) => void
  onDelete: (role: RoleRecord) => void
}

const permissionMap = ROLE_PERMISSION_TABLES.reduce<Record<string, string>>((accumulator, entry) => {
  accumulator[entry.id] = entry.label
  return accumulator
}, {})

const formatPermission = (permission: RoleRecord['permissions'][number]) => {
  const scopes = ['view']
  if (permission.canEdit) scopes.push('edit')
  if (permission.canDelete) scopes.push('delete')
  return scopes.join(' · ')
}

const RolesTable = ({ roles, isLoading, onEdit, onDelete }: RolesTableProps) => {
  const columns: TableColumn<RoleRecord>[] = useMemo(
    () => [
      {
        key: 'name',
        label: 'Role',
        render: (row) => (
          <div className="flex flex-col gap-1">
            <span className="font-medium text-brand-700">{row.name}</span>
            {row.description ? <span className="text-xs text-brand-500">{row.description}</span> : null}
          </div>
        ),
      },
      {
        key: 'members',
        label: 'Members',
        render: (row) =>
          row.members.length ? (
            <div className="flex flex-wrap gap-2">
              {row.members.map((email) => (
                <span
                  key={email}
                  className="rounded-full bg-brand-50 px-2 py-1 text-xs font-medium text-brand-600 ring-1 ring-brand-100"
                >
                  {email}
                </span>
              ))}
            </div>
          ) : (
            <span className="text-sm text-brand-400">—</span>
          ),
      },
      {
        key: 'permissions',
        label: 'Permissions',
        render: (row) =>
          row.permissions.length ? (
            <div className="flex flex-col gap-1 text-xs text-brand-600">
              {row.permissions.map((permission) => (
                <div key={`${row.id}-${permission.table}`} className="flex flex-wrap gap-1">
                  <span className="font-semibold">{permissionMap[permission.table] ?? permission.table}:</span>
                  <span>{formatPermission(permission)}</span>
                </div>
              ))}
            </div>
          ) : (
            <span className="text-sm text-brand-400">—</span>
          ),
      },
      {
        key: 'actions',
        label: 'Actions',
        className: 'w-28',
        render: (row) => (
          <div className="flex gap-2">
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-md border border-brand-300 bg-white text-brand-600 transition hover:bg-brand-50"
              onClick={() => onEdit(row)}
              aria-label={`Edit role ${row.name}`}
            >
              <FiEdit2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-md border border-rose-500 bg-rose-500 text-white transition hover:bg-rose-600"
              onClick={() => onDelete(row)}
              aria-label={`Delete role ${row.name}`}
            >
              <FiTrash2 className="h-4 w-4" />
            </button>
          </div>
        ),
      },
    ],
    [onDelete, onEdit],
  )

  return (
    <Table<RoleRecord>
      data={roles}
      columns={columns}
      getRowKey={(row) => row.id}
      emptyMessage="No roles defined yet. Use the New Role button to create one."
      isLoading={isLoading}
    />
  )
}

export default RolesTable
