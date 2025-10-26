'use client'

import { useEffect, useState } from 'react'

import type { ModelFuelModalState } from '@/types/modelsPage'
import ModelFuelTypesField from './ModelFuelTypesField'
import { sanitizeFuelTypes } from '@/utils/models'

const ModelFuelModal = ({ modal }: { modal: ModelFuelModalState }) => {
  const [draft, setDraft] = useState<string[]>([])

  useEffect(() => {
    if (modal.model) {
      setDraft(Array.isArray(modal.model.fuel_type) ? modal.model.fuel_type : [])
    }
  }, [modal.model])

  if (!modal.model) {
    return null
  }

  const handleAddFuel = (value: string) => {
    setDraft((prev) => sanitizeFuelTypes([...prev, value]))
  }

  const handleRemoveFuel = (value: string) => {
    setDraft((prev) => prev.filter((fuel) => fuel !== value))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-xl space-y-6 rounded-2xl bg-white p-6 shadow-xl">
        <header className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-500">Manage fuels</p>
          <h2 className="text-xl font-semibold text-brand-700">{modal.model.name}</h2>
          <p className="text-sm text-brand-600/80">Fuels control which services can be linked.</p>
        </header>

        <ModelFuelTypesField fuels={draft} onAdd={handleAddFuel} onRemove={handleRemoveFuel} />

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            className="rounded-md border border-brand-200 px-4 py-2 text-sm font-medium text-brand-600 transition hover:bg-brand-50"
            onClick={modal.close}
            disabled={modal.isSaving}
          >
            Cancel
          </button>
          <button
            type="button"
            className="rounded-md border border-brand-500 bg-brand-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-70"
            onClick={() => void modal.onSave(draft)}
            disabled={modal.isSaving}
          >
            {modal.isSaving ? 'Saving…' : 'Save Fuels'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ModelFuelModal
