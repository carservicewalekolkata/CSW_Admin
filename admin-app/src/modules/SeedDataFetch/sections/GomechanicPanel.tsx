'use client'

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent, type FC } from 'react'

import { FiPlus, FiTrash2 } from 'react-icons/fi'

import { gomechanicCategories, GOMECHANIC_DEFAULT_CITY_ID } from '../data/gomechanicCategories'
import { gomechanicOperations } from '../data/gomechanicOperations'

const DEFAULT_MONGODB_URI =
  process.env.NEXT_PUBLIC_SEED_MONGODB_URI ?? 'mongodb+srv://seed-user:secure-password@cluster.mongodb.net/cswdb'

const DEFAULT_GOMECHANIC_TOKEN =
  process.env.NEXT_PUBLIC_SEED_GOMECHANIC_TOKEN ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.seeded-demo-token-replace-me'

type SubmissionStatus = 'idle' | 'submitting' | 'success'

interface CategoryOverride {
  id: string
  apiName: string
  writeAs: string
}

interface FormState {
  mongodbUri: string
  databaseName: string
  bearerToken: string
  cityId: string
  includeAssets: boolean
  dryRun: boolean
  categories: Record<string, boolean>
  operations: Record<string, boolean>
  categoryOverrides: Record<string, CategoryOverride[]>
  categoryParams: Record<string, string>
}

const createInitialCategories = () =>
  Object.fromEntries(gomechanicCategories.map((category) => [category.id, true]))

const createInitialOperations = () =>
  Object.fromEntries(gomechanicOperations.map((operation) => [operation.id, true]))

const createInitialOverrides = () =>
  Object.fromEntries(gomechanicCategories.map((category) => [category.id, [] as CategoryOverride[]]))

const createInitialCategoryParams = () =>
  Object.fromEntries(gomechanicCategories.map((category) => [category.id, category.id]))

const createInitialFormState = (): FormState => ({
  mongodbUri: DEFAULT_MONGODB_URI,
  databaseName: '',
  bearerToken: DEFAULT_GOMECHANIC_TOKEN,
  cityId: GOMECHANIC_DEFAULT_CITY_ID,
  includeAssets: true,
  dryRun: false,
  categories: createInitialCategories(),
  operations: createInitialOperations(),
  categoryOverrides: createInitialOverrides(),
  categoryParams: createInitialCategoryParams(),
})

const GomechanicPanel: FC = () => {
  const [formState, setFormState] = useState<FormState>(() => createInitialFormState())
  const [status, setStatus] = useState<SubmissionStatus>('idle')
  const [feedback, setFeedback] = useState<string | null>(null)
  const [logEntries, setLogEntries] = useState<string[]>([])
  const [isConsoleOpen, setIsConsoleOpen] = useState(false)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const consoleEndRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (isConsoleOpen && consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logEntries, isConsoleOpen])

  const selectedCategoryParams = useMemo(
    () =>
      Object.entries(formState.categories)
        .filter(([, include]) => include)
        .map(([categoryKey]) => {
          const candidate = formState.categoryParams[categoryKey]
          if (typeof candidate === 'string' && candidate.trim()) {
            return candidate.trim()
          }
          return categoryKey
        })
        .filter((value) => Boolean(value)),
    [formState.categories, formState.categoryParams],
  )

  const selectedOperations = useMemo(
    () => Object.entries(formState.operations).filter(([, run]) => run).map(([operationId]) => operationId),
    [formState.operations],
  )

  const selectedOperationDetails = useMemo(
    () => gomechanicOperations.filter((operation) => formState.operations[operation.id]),
    [formState.operations],
  )

  const selectedCategorySummaries = useMemo(
    () =>
      gomechanicCategories
        .filter((category) => formState.categories[category.id])
        .map((category) => ({
          id: formState.categoryParams[category.id]?.trim() || category.id,
          label: category.label,
        })),
    [formState.categories, formState.categoryParams],
  )

  const totalOverrides = useMemo(
    () =>
      Object.values(formState.categoryOverrides ?? {}).reduce(
        (accumulator, overrides) => accumulator + overrides.length,
        0,
      ),
    [formState.categoryOverrides],
  )

  const handleInputChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target

    setFormState((previous) => ({
      ...previous,
      [name]: value,
    }))
  }

  const handleCategoryToggle = (categoryId: string) => {
    setFormState((previous) => ({
      ...previous,
      categories: {
        ...previous.categories,
        [categoryId]: !previous.categories[categoryId],
      },
    }))
  }

  const handleCategoryParamChange = (categoryId: string, value: string) => {
    const sanitizedValue = value.replace(/\s+/g, '')
    setFormState((previous) => ({
      ...previous,
      categoryParams: {
        ...previous.categoryParams,
        [categoryId]: sanitizedValue,
      },
    }))
  }

  const handleAddOverride = (categoryId: string) => {
    setFormState((previous) => {
      const overrides = previous.categoryOverrides[categoryId] ?? []
      const baseParam = previous.categoryParams[categoryId] ?? categoryId
      const nextOverrides = [...overrides, { id: baseParam, apiName: '', writeAs: '' }]
      return {
        ...previous,
        categoryOverrides: {
          ...previous.categoryOverrides,
          [categoryId]: nextOverrides,
        },
      }
    })
  }

  const handleOverrideChange = (
    categoryId: string,
    index: number,
    field: keyof CategoryOverride,
    value: string,
  ) => {
    setFormState((previous) => {
      const overrides = previous.categoryOverrides[categoryId] ?? []
      const sanitizedValue = field === 'id' ? value.replace(/\s+/g, '') : value
      const nextOverrides = overrides.map((override, overrideIndex) =>
        overrideIndex === index ? { ...override, [field]: sanitizedValue } : override,
      )
      return {
        ...previous,
        categoryOverrides: {
          ...previous.categoryOverrides,
          [categoryId]: nextOverrides,
        },
      }
    })
  }

  const handleOverrideRemove = (categoryId: string, index: number) => {
    setFormState((previous) => {
      const overrides = previous.categoryOverrides[categoryId] ?? []
      const nextOverrides = overrides.filter((_, overrideIndex) => overrideIndex !== index)
      return {
        ...previous,
        categoryOverrides: {
          ...previous.categoryOverrides,
          [categoryId]: nextOverrides,
        },
      }
    })
  }

  const handleOperationToggle = (operationId: string) => {
    setFormState((previous) => ({
      ...previous,
      operations: {
        ...previous.operations,
        [operationId]: !previous.operations[operationId],
      },
    }))
  }

  const handleAssetsToggle = (event: ChangeEvent<HTMLInputElement>) => {
    const { checked } = event.target
    setFormState((previous) => ({
      ...previous,
      includeAssets: checked,
    }))
  }

  const handleDryRunToggle = (event: ChangeEvent<HTMLInputElement>) => {
    const { checked } = event.target
    setFormState((previous) => ({
      ...previous,
      dryRun: checked,
    }))
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!selectedOperations.length) {
      setFeedback('Select at least one GoMechanic script before running the seed.')
      return
    }

    setFeedback(null)
    setIsConfirmOpen(true)
  }

  const executeSeed = async () => {
    if (!selectedOperations.length) {
      setFeedback('Select at least one GoMechanic script before running the seed.')
      return
    }

    const trimmedUri = formState.mongodbUri.trim()
    const trimmedToken = formState.bearerToken.trim()
    const trimmedCity = formState.cityId.trim() || GOMECHANIC_DEFAULT_CITY_ID

    if (!trimmedUri || !trimmedToken) {
      setFeedback('Provide both the MongoDB connection URI and GoMechanic bearer token before running the seed.')
      return
    }

    setIsConfirmOpen(false)
    setStatus('submitting')
    setFeedback(null)
    setLogEntries([])
    setIsConsoleOpen(true)

    const formatTimestamp = () => new Date().toLocaleTimeString()
    const appendLog = (message: string) =>
      setLogEntries((previous) => [...previous, `${formatTimestamp()}  ${message}`])

    appendLog('Queued seed request. Preparing environment variables…')
    appendLog('Dispatching seed worker request to API route…')

    const categoryConfig = gomechanicCategories
      .filter((category) => formState.categories[category.id])
      .map((category) => {
        const queryId = formState.categoryParams[category.id]?.trim() || category.id
        const overridesRaw = formState.categoryOverrides[category.id] ?? []
        const overrides = overridesRaw
          .map((override) => ({
            id: (override.id || queryId).trim(),
            apiName: override.apiName?.trim() || undefined,
            writeAs: override.writeAs?.trim() || undefined,
          }))
          .filter((override) => override.id || override.apiName || override.writeAs)
        return {
          id: queryId,
          label: category.label,
          overrides,
        }
      })

    const payload = {
      mongodbUri: trimmedUri,
      databaseName: formState.databaseName.trim() || null,
      bearerToken: trimmedToken,
      cityId: trimmedCity,
      operations: selectedOperations,
      categoryConfig,
      includeAssets: formState.includeAssets,
      dryRun: formState.dryRun,
    }

    const normaliseLogs = (raw: unknown): string[] => {
      const entries = Array.isArray(raw) ? raw : raw ? [raw] : []
      return entries
        .flatMap((entry) => String(entry).split(/\r?\n/))
        .map((line) => line.trim())
        .filter(Boolean)
    }

    try {
      const response = await fetch('/api/seed/gomechanic', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (!response.ok) {
        const serverLogs = normaliseLogs(data.logs)
        const message = typeof data.error === 'string' ? data.error : 'Seed request failed.'
        const error = new Error(message) as Error & { logs?: string[] }
        error.logs = serverLogs
        throw error
      }

      const normalizedLogs = normaliseLogs(data.logs)

      if (normalizedLogs.length) {
        setLogEntries((previous) => [
          ...previous,
          ...normalizedLogs.map((line) => `${formatTimestamp()}  ${line}`),
        ])
      }

      appendLog('GoMechanic seed completed successfully.')

      setStatus('success')
      const overridePhrase =
        totalOverrides > 0
          ? ` and ${totalOverrides} custom mapping${totalOverrides === 1 ? '' : 's'}`
          : ''
      const selectedCategoryCount = selectedCategoryParams.length
      setFeedback(
        `Seed request prepared with ${selectedOperations.length} operation(s) targeting ${selectedCategoryCount} category id value(s)${overridePhrase}. Connect this form to the admin API to invoke scripts/seed_gomechanic_data.py with the provided payload.`,
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to run GoMechanic seed.'
      const logsFromError = (error as { logs?: string[] }).logs ?? []
      if (logsFromError.length) {
        setLogEntries((previous) => [
          ...previous,
          ...logsFromError.map((line) => `${formatTimestamp()}  ${line}`),
        ])
      }
      appendLog(`ERROR: ${message}`)
      setStatus('idle')
      setFeedback(`Failed to run GoMechanic seed: ${message}`)
    }
  }

  const resetForm = () => {
    setFormState(createInitialFormState())
    setStatus('idle')
    setFeedback(null)
    setLogEntries([])
    setIsConsoleOpen(false)
    setIsConfirmOpen(false)
  }

  const isSubmitting = status === 'submitting'
  const hasFeedback = Boolean(feedback)

  return (
    <section className="space-y-8">
      <header className="space-y-3">
        <h2 className="text-2xl font-semibold text-brand-800">GoMechanic ingestion</h2>
        <p className="max-w-3xl text-sm text-muted-500">
          Provide the GoMechanic authentication token and MongoDB connection details to mirror the Python seeding script.
          All credentials are encrypted in transport and never stored client-side.
        </p>
      </header>

      <div className="grid gap-8">
        <form
          onSubmit={handleSubmit}
          className="space-y-8 rounded-[32px] border border-brand-100/70 bg-white/95 p-8 shadow-lg shadow-brand-900/5"
        >
          <fieldset className="space-y-6">
            <legend className="text-xs font-semibold uppercase tracking-[0.28em] text-brand-600">
              Environment configuration
            </legend>

            <div className="space-y-3">
              <label htmlFor="mongodbUri" className="text-sm font-medium text-brand-800">
                MongoDB connection URI<span className="text-brand-500">*</span>
              </label>
              <input
                id="mongodbUri"
                name="mongodbUri"
                type="text"
                required
                autoComplete="off"
                placeholder="mongodb+srv://username:password@cluster.mongodb.net"
                value={formState.mongodbUri}
                onChange={handleInputChange}
                disabled={isSubmitting}
                className="w-full rounded-2xl border border-brand-100/70 bg-brand-50/20 px-4 py-3 text-sm text-foreground placeholder:text-muted-400 focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-200 disabled:cursor-not-allowed disabled:opacity-70"
              />
              <p className="text-xs text-muted-500">
                Required to hydrate brand, model, category, and service collections.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3">
                <label htmlFor="databaseName" className="text-sm font-medium text-brand-800">
                  Database name
                </label>
                <input
                  id="databaseName"
                  name="databaseName"
                  type="text"
                  autoComplete="off"
                  placeholder="cswdb"
                  value={formState.databaseName}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                  className="w-full rounded-2xl border border-brand-100/70 bg-brand-50/20 px-4 py-3 text-sm text-foreground placeholder:text-muted-400 focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-200 disabled:cursor-not-allowed disabled:opacity-70"
                />
                <p className="text-xs text-muted-500">
                  Optional. Defaults to `DB_CSW_NAME` or `MONGODB_DB` when left blank.
                </p>
              </div>

              <div className="space-y-3">
                <label htmlFor="cityId" className="text-sm font-medium text-brand-800">
                  Default city ID
                </label>
                <input
                  id="cityId"
                  name="cityId"
                  type="text"
                  autoComplete="off"
                  placeholder={GOMECHANIC_DEFAULT_CITY_ID}
                  value={formState.cityId}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                  className="w-full rounded-2xl border border-brand-100/70 bg-brand-50/20 px-4 py-3 text-sm text-foreground placeholder:text-muted-400 focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-200 disabled:cursor-not-allowed disabled:opacity-70"
                />
                <p className="text-xs text-muted-500">
                  Matches the `city_id` parameter used in the seeding script&apos;s service route.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <label htmlFor="bearerToken" className="text-sm font-medium text-brand-800">
                GoMechanic bearer token<span className="text-brand-500">*</span>
              </label>
              <textarea
                id="bearerToken"
                name="bearerToken"
                required
                rows={4}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                value={formState.bearerToken}
                onChange={handleInputChange}
                disabled={isSubmitting}
                className="w-full rounded-2xl border border-brand-100/70 bg-brand-50/20 px-4 py-3 text-sm text-foreground placeholder:text-muted-400 focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-200 disabled:cursor-not-allowed disabled:opacity-70"
              />
              <p className="text-xs text-muted-500">
                Paste an admin-scoped JWT generated from the GoMechanic CRM portal. It is injected into
                the Authorization header.
              </p>
            </div>
          </fieldset>

          <fieldset className="space-y-6">
            <legend className="text-xs font-semibold uppercase tracking-[0.28em] text-brand-600">
              Choose GoMechanic scripts
            </legend>

            <div className="grid gap-4 md:grid-cols-2">
              {gomechanicOperations.map((operation) => {
                const isChecked = formState.operations[operation.id]
                return (
                  <label
                    key={operation.id}
                    className={`block cursor-pointer rounded-2xl border px-4 py-4 transition ${
                      isChecked
                        ? 'border-brand-200 bg-brand-50/70 text-brand-800 shadow-sm'
                        : 'border-brand-100/80 bg-brand-50/20 text-muted-700 hover:border-brand-200 hover:bg-brand-50/40'
                    }`}
                  >
                    <span className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        name={`operation-${operation.id}`}
                        checked={isChecked}
                        onChange={() => handleOperationToggle(operation.id)}
                        disabled={isSubmitting}
                        className="mt-1 h-4 w-4 rounded border-brand-300 text-brand-600 focus:ring-brand-400 disabled:cursor-not-allowed disabled:opacity-70"
                      />
                      <span>
                        <span className="text-sm font-semibold">{operation.label}</span>
                        <span className="mt-2 inline-flex rounded-md bg-brand-50/90 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-brand-600">
                          {operation.id}
                        </span>
                        <p className="mt-1 text-xs text-muted-500">{operation.description}</p>
                      </span>
                    </span>
                  </label>
                )
              })}
            </div>

            <p className="text-xs text-muted-500">
              {selectedOperations.length} workflow(s) selected. These mirror the helper functions within the Python
              seed script.
            </p>
          </fieldset>

          <fieldset className="space-y-6">
            <legend className="text-xs font-semibold uppercase tracking-[0.28em] text-brand-600">
              Service categories
            </legend>

            <div className="grid gap-4 md:grid-cols-2">
              {gomechanicCategories.map((category) => {
                const isChecked = formState.categories[category.id]
                const overrides = formState.categoryOverrides[category.id] ?? []
                const categoryParamValue = formState.categoryParams[category.id] ?? category.id
                return (
                  <label
                    key={category.id}
                    className={`block cursor-pointer rounded-2xl border px-4 py-4 transition ${
                      isChecked
                        ? 'border-brand-200 bg-brand-50/70 text-brand-800 shadow-sm'
                        : 'border-brand-100/80 bg-brand-50/20 text-muted-700 hover:border-brand-200 hover:bg-brand-50/40'
                    }`}
                  >
                    <span className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        name={`category-${category.id}`}
                        checked={isChecked}
                        onChange={() => handleCategoryToggle(category.id)}
                        disabled={isSubmitting}
                        className="mt-1 h-4 w-4 rounded border-brand-300 text-brand-600 focus:ring-brand-400 disabled:cursor-not-allowed disabled:opacity-70"
                      />
                      <span>
                        <span className="text-sm font-semibold">{category.label}</span>
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-brand-600">
                          <span className="flex items-center gap-2 rounded-lg bg-white px-2 py-1 shadow-sm ring-1 ring-brand-100/60">
                            <span className="font-semibold uppercase tracking-wide">Query ID</span>
                            <input
                              type="text"
                              value={categoryParamValue}
                              onChange={(event) => handleCategoryParamChange(category.id, event.target.value)}
                              onMouseDown={(event) => event.stopPropagation()}
                              onClick={(event) => event.stopPropagation()}
                              onFocus={(event) => event.stopPropagation()}
                              disabled={isSubmitting}
                              aria-label={`Query ID used to fetch ${category.label}`}
                              className="w-20 rounded-md border border-brand-100/70 bg-brand-50/30 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-brand-700 focus:border-brand-300 focus:outline-none focus:ring-1 focus:ring-brand-300 disabled:cursor-not-allowed disabled:opacity-60"
                            />
                          </span>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.preventDefault()
                              handleAddOverride(category.id)
                            }}
                            disabled={isSubmitting}
                            className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-brand-200 bg-brand-50 text-brand-600 transition hover:border-brand-300 hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-60"
                            aria-label={`Add category mapping for ${category.label}`}
                          >
                            <FiPlus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        {category.description && (
                          <p className="mt-1 text-xs text-muted-500">{category.description}</p>
                        )}
                        {overrides.length > 0 && (
                          <div className="mt-3 space-y-3 rounded-2xl bg-white/90 p-3 text-muted-700 shadow-sm ring-1 ring-brand-100/60">
                            {overrides.map((override, index) => (
                              <div key={`${category.id}-override-${index}`} className="space-y-2">
                                <div className="grid gap-3 md:grid-cols-[minmax(0,0.6fr)_minmax(0,1fr)_minmax(0,1fr)]">
                                  <input
                                    type="text"
                                    placeholder="Category ID"
                                    value={override.id}
                                    onChange={(event) =>
                                      handleOverrideChange(category.id, index, 'id', event.target.value)
                                    }
                                    disabled={isSubmitting}
                                    className="rounded-xl border border-brand-100/70 bg-brand-50/20 px-3 py-2 text-xs focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-200 disabled:cursor-not-allowed disabled:opacity-60"
                                  />
                                  <input
                                    type="text"
                                    placeholder="API category name"
                                    value={override.apiName}
                                    onChange={(event) =>
                                      handleOverrideChange(category.id, index, 'apiName', event.target.value)
                                    }
                                    disabled={isSubmitting}
                                    className="rounded-xl border border-brand-100/70 bg-brand-50/20 px-3 py-2 text-xs focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-200 disabled:cursor-not-allowed disabled:opacity-60"
                                  />
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="text"
                                      placeholder="Write as"
                                      value={override.writeAs}
                                      onChange={(event) =>
                                        handleOverrideChange(category.id, index, 'writeAs', event.target.value)
                                      }
                                      disabled={isSubmitting}
                                      className="w-full rounded-xl border border-brand-100/70 bg-brand-50/20 px-3 py-2 text-xs focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-200 disabled:cursor-not-allowed disabled:opacity-60"
                                    />
                                    <button
                                      type="button"
                                      onClick={(event) => {
                                        event.preventDefault()
                                        handleOverrideRemove(category.id, index)
                                      }}
                                      disabled={isSubmitting}
                                      className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-brand-200 text-brand-500 transition hover:border-brand-300 hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-60"
                                      aria-label={`Remove mapping ${index + 1} for ${category.label}`}
                                    >
                                      <FiTrash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </span>
                    </span>
                  </label>
                )
              })}
            </div>

            <p className="text-xs text-muted-500">
              {selectedCategoryParams.length} category id value{selectedCategoryParams.length === 1 ? '' : 's'} queued for
              the CLI invocation. {totalOverrides > 0 &&
                `${totalOverrides} custom mapping${totalOverrides === 1 ? '' : 's'} configured.`}
            </p>
          </fieldset>

          <fieldset className="space-y-5">
            <legend className="text-xs font-semibold uppercase tracking-[0.28em] text-brand-600">
              Additional options
            </legend>

            <label className="flex items-start gap-3 rounded-2xl border border-brand-100/70 bg-brand-50/30 px-4 py-4">
              <input
                type="checkbox"
                name="includeAssets"
                checked={formState.includeAssets}
                onChange={handleAssetsToggle}
                disabled={isSubmitting}
                className="mt-1 h-4 w-4 rounded border-brand-300 text-brand-600 focus:ring-brand-400 disabled:cursor-not-allowed disabled:opacity-70"
              />
              <span>
                <span className="text-sm font-semibold text-brand-800">Download media assets</span>
                <p className="text-xs text-muted-500">
                  Mirrors the script&apos;s use of `resolve_public_asset_path` to populate `/public/assets`.
                </p>
              </span>
            </label>

            <label className="flex items-start gap-3 rounded-2xl border border-brand-100/70 bg-brand-50/30 px-4 py-4">
              <input
                type="checkbox"
                name="dryRun"
                checked={formState.dryRun}
                onChange={handleDryRunToggle}
                disabled={isSubmitting}
                className="mt-1 h-4 w-4 rounded border-brand-300 text-brand-600 focus:ring-brand-400 disabled:cursor-not-allowed disabled:opacity-70"
              />
              <span>
                <span className="text-sm font-semibold text-brand-800">Dry run</span>
                <p className="text-xs text-muted-500">
                  Validate connectivity without writing to MongoDB. Useful while testing bearer tokens.
                </p>
              </span>
            </label>
          </fieldset>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-pill bg-gradient-to-r from-brand-500 via-brand-500 to-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-900/20 transition hover:from-brand-600 hover:via-brand-600 hover:to-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? 'Running GoMechanic seed…' : 'Review & run GoMechanic seed'}
            </button>

            <button
              type="button"
              onClick={resetForm}
              disabled={isSubmitting}
              className="rounded-pill border border-brand-200 bg-white px-5 py-3 text-sm font-semibold text-brand-600 transition hover:border-brand-300 hover:bg-brand-50/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-70"
            >
              Reset form
            </button>
          </div>

          {logEntries.length > 0 && (
            <div className="rounded-2xl border border-brand-100/70 bg-brand-50/40 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-brand-700">
                  <span
                    className={`inline-flex h-2.5 w-2.5 rounded-full ${
                      isSubmitting ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500'
                    }`}
                  />
                  <span>{isSubmitting ? 'Processing GoMechanic seed…' : 'Seed run finished'}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsConsoleOpen((previous) => !previous)}
                  className="text-xs font-semibold uppercase tracking-wide text-brand-600 hover:text-brand-700"
                >
                  {isConsoleOpen ? 'Collapse logs' : 'View logs'}
                </button>
              </div>

              {isConsoleOpen && (
                <div className="mt-4 max-h-60 overflow-y-auto rounded-xl border border-brand-100/60 bg-[#0f172a] text-xs text-white shadow-inner">
                  <pre className="whitespace-pre-wrap break-words p-4 font-mono leading-relaxed text-brand-50/90">
                    {logEntries.join('\n')}
                  </pre>
                  <div ref={consoleEndRef} />
                </div>
              )}
            </div>
          )}

          {hasFeedback && (
            <div className="rounded-2xl border border-brand-200 bg-brand-50/60 px-4 py-3 text-sm text-brand-700">
              {feedback}
            </div>
          )}
        </form>

      </div>

      {isConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
          <div className="w-full max-w-lg space-y-6 rounded-[32px] border border-brand-100/60 bg-white p-6 shadow-2xl">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-brand-800">Run GoMechanic seed?</h3>
              <p className="text-sm text-muted-600">
                We will run {selectedOperationDetails.length} workflow{selectedOperationDetails.length === 1 ? '' : 's'} targeting{' '}
                {selectedCategorySummaries.length} category id value{selectedCategorySummaries.length === 1 ? '' : 's'}. Confirm to proceed with the Python script execution.
              </p>
            </div>

            <div className="space-y-4 rounded-3xl bg-brand-50/40 p-4">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-[0.28em] text-brand-600">Workflows</h4>
                <ul className="mt-2 space-y-1 text-sm text-brand-800">
                  {selectedOperationDetails.map((operation) => (
                    <li key={operation.id} className="flex items-center gap-2">
                      <span className="inline-flex h-2 w-2 rounded-full bg-brand-500" />
                      <span>{operation.label}</span>
                    </li>
                  ))}
                  {!selectedOperationDetails.length && (
                    <li className="text-xs text-muted-500">No workflows selected.</li>
                  )}
                </ul>
              </div>

              <div>
                <h4 className="text-xs font-semibold uppercase tracking-[0.28em] text-brand-600">Categories</h4>
                <ul className="mt-2 space-y-1 text-sm text-brand-800">
                  {selectedCategorySummaries.map((category) => (
                    <li key={`${category.id}-${category.label}`} className="flex items-center gap-2">
                      <span className="inline-flex h-2 w-2 rounded-full bg-brand-500" />
                      <span>{category.label}</span>
                      <span className="text-xs text-brand-500">({category.id})</span>
                    </li>
                  ))}
                  {!selectedCategorySummaries.length && (
                    <li className="text-xs text-muted-500">No categories selected.</li>
                  )}
                </ul>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsConfirmOpen(false)}
                className="rounded-pill border border-brand-200 px-5 py-2 text-sm font-semibold text-brand-600 transition hover:border-brand-300 hover:bg-brand-50/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeSeed}
                className="rounded-pill bg-gradient-to-r from-brand-500 via-brand-500 to-brand-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-brand-900/20 transition hover:from-brand-600 hover:via-brand-600 hover:to-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
              >
                Run now
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

export default GomechanicPanel
