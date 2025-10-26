'use client'

import { useState } from 'react'

type ModelFuelTypesFieldProps = {
  fuels: string[]
  onAdd: (value: string) => void
  onRemove: (value: string) => void
}

const ModelFuelTypesField = ({ fuels, onAdd, onRemove }: ModelFuelTypesFieldProps) => {
  const [inputValue, setInputValue] = useState('')

  const handleSubmit = () => {
    const trimmed = inputValue.trim()
    if (!trimmed) {
      return
    }
    onAdd(trimmed)
    setInputValue('')
  }

  const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-brand-100/80 bg-white p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">Fuel Types</p>
          <p className="text-xs text-brand-500">Add supported fuel variants for this model.</p>
        </div>
        <div className="flex w-full gap-2 sm:w-auto">
          <input
            type="text"
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g., Petrol"
            className="flex-1 rounded-lg border border-brand-100/80 px-3 py-2 text-sm text-brand-700 focus:border-brand-400 focus:outline-none focus:ring-0"
          />
          <button
            type="button"
            onClick={handleSubmit}
            className="inline-flex items-center rounded-lg border border-brand-500 bg-brand-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!inputValue.trim()}
          >
            Add
          </button>
        </div>
      </div>
      {fuels.length === 0 ? (
        <p className="text-sm text-brand-500">No fuel types added yet.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {fuels.map((fuel) => (
            <span
              key={fuel}
              className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-sm font-medium text-brand-700"
            >
              {fuel}
              <button
                type="button"
                className="text-xs font-semibold text-brand-500 transition hover:text-brand-700"
                onClick={() => onRemove(fuel)}
                aria-label={`Remove ${fuel}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

export default ModelFuelTypesField

