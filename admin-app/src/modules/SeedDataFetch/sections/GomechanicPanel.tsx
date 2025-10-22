'use client'

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent, type FC, type FocusEvent } from 'react'

import { FiPlus, FiTrash2 } from 'react-icons/fi'

import { gomechanicCategories, GOMECHANIC_DEFAULT_CITY_ID } from '../data/gomechanicCategories'
import { gomechanicOperations } from '../data/gomechanicOperations'
import { APIEndpoint } from '@/APIEndpoints'

const DEFAULT_MONGODB_URI =
  process.env.NEXT_PUBLIC_SEED_MONGODB_URI ?? 'mongodb+srv://seed-user:secure-password@cluster.mongodb.net/cswdb'

const DEFAULT_GOMECHANIC_TOKEN =
  process.env.NEXT_PUBLIC_SEED_GOMECHANIC_TOKEN ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.seeded-demo-token-replace-me'

type SubmissionStatus = 'idle' | 'submitting' | 'success'

interface CustomCategory {
  key: string
  label: string
  description?: string
  sourceCategoryId?: string | null
}

interface AvailableCategory {
  key: string
  label: string
  description?: string
  sourceCategoryId?: string | null
}

type CategoryPersistStatus = 'idle' | 'saving' | 'saved' | 'error'

interface CategoryPersistMeta {
  status: CategoryPersistStatus
  message?: string
  lastSavedName?: string
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
  categoryParams: Record<string, string>
  customCategories: CustomCategory[]
}

const createInitialCategories = () => ({})

const createInitialOperations = () =>
  Object.fromEntries(gomechanicOperations.map((operation) => [operation.id, true]))

const createInitialCategoryParams = () => ({})

const generateCustomCategoryKey = () => `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

const sanitizeCategoryParam = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s_-]/g, '')
    .replace(/\s+/g, '-')


const createInitialFormState = (): FormState => ({
  mongodbUri: DEFAULT_MONGODB_URI,
  databaseName: '',
  bearerToken: DEFAULT_GOMECHANIC_TOKEN,
  cityId: GOMECHANIC_DEFAULT_CITY_ID,
  includeAssets: true,
  dryRun: false,
  categories: createInitialCategories(),
  operations: createInitialOperations(),
  categoryParams: createInitialCategoryParams(),
  customCategories: [],
})

const GomechanicPanel: FC = () => {
  const [formState, setFormState] = useState<FormState>(() => createInitialFormState())
  const [status, setStatus] = useState<SubmissionStatus>('idle')
  const [feedback, setFeedback] = useState<string | null>(null)
  const [logEntries, setLogEntries] = useState<string[]>([])
  const [isConsoleOpen, setIsConsoleOpen] = useState(false)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [categoryPersistState, setCategoryPersistState] = useState<Record<string, CategoryPersistMeta>>({})
  const consoleEndRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (isConsoleOpen && consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logEntries, isConsoleOpen])

  const activeCategories = useMemo<AvailableCategory[]>(() => {
    return formState.customCategories.map<AvailableCategory>((category) => ({
      key: category.key,
      label: category.label,
      description: category.description,
      sourceCategoryId: category.sourceCategoryId ?? null,
    }))
  }, [formState.customCategories])

  const selectedCategoryParams = useMemo(
    () =>
      activeCategories
        .filter((category) => formState.categories[category.key])
        .map((category) => {
          const candidate = formState.categoryParams[category.key]
          if (typeof candidate === 'string' && candidate.trim()) {
            return candidate.trim()
          }
          return ''
        })
        .filter((value) => Boolean(value)),
    [activeCategories, formState.categories, formState.categoryParams],
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
      activeCategories
        .filter((category) => formState.categories[category.key])
        .map((category) => {
          const rawParam = formState.categoryParams[category.key]?.trim()
          const effectiveParam = rawParam || 'Pending ID'
          const displayLabel = category.label?.trim() || 'Custom category'
          return {
            id: effectiveParam,
            label: displayLabel,
          }
        }),
    [activeCategories, formState.categories, formState.categoryParams],
  )

  const handleInputChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target

    setFormState((previous) => ({
      ...previous,
      [name]: value,
    }))
  }

  const persistServiceCategory = async (categoryKey: string, rawName: string) => {
    const trimmedName = rawName.trim()
    if (!trimmedName) {
      setCategoryPersistState((previous) => ({
        ...previous,
        [categoryKey]: {
          status: 'error',
          message: 'Category name is required.',
          lastSavedName: previous[categoryKey]?.lastSavedName,
        },
      }))
      return { success: false, message: 'Category name is required.' }
    }

    const current = categoryPersistState[categoryKey]

    if (current?.status === 'saving') {
      return { success: false, message: 'Category is already being saved.' }
    }

    if (current?.status === 'saved' && current.lastSavedName === trimmedName.toLowerCase()) {
      return { success: true as const }
    }

    setCategoryPersistState((previous) => ({
      ...previous,
      [categoryKey]: { status: 'saving', message: undefined, lastSavedName: current?.lastSavedName },
    }))

    try {
      const serviceCategoryUrl = `${APIEndpoint.BackendUrl}${APIEndpoint.services.servicesCategory}`
      const response = await fetch(serviceCategoryUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: trimmedName }),
        credentials: 'include',
      })

      if (!response.ok && response.status !== 409) {
        const data = (await response.json().catch(() => null)) as { message?: string } | null
        const message = data?.message ?? 'Failed to create service category.'
        throw new Error(message)
      }

      const normalizeName = trimmedName.toLowerCase()

      setCategoryPersistState((previous) => ({
        ...previous,
        [categoryKey]: {
          status: 'saved',
          message: response.status === 409 ? 'Service category already exists.' : undefined,
          lastSavedName: normalizeName,
        },
      }))

      return { success: true as const }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create service category.'

      setCategoryPersistState((previous) => ({
        ...previous,
        [categoryKey]: {
          status: 'error',
          message,
          lastSavedName: previous[categoryKey]?.lastSavedName,
        },
      }))

      return { success: false as const, message }
    }
  }

  const handleCategoryToggle = (categoryId: string) => {
    const willEnable = !formState.categories[categoryId]
    setFormState((previous) => ({
      ...previous,
      categories: {
        ...previous.categories,
        [categoryId]: !previous.categories[categoryId],
      },
    }))
    if (willEnable) {
      const category = formState.customCategories.find((item) => item.key === categoryId)
      if (category?.label.trim()) {
        void persistServiceCategory(categoryId, category.label)
      }
    }
  }

  const handleCategoryParamChange = (categoryId: string, value: string) => {
    const sanitizedValue = value.replace(/\s+/g, '')
    setFormState((previous) => {
      return {
        ...previous,
        categoryParams: {
          ...previous.categoryParams,
          [categoryId]: sanitizedValue,
        },
      }
    })
  }

  const handleAddCustomCategory = () => {
    const newKey = generateCustomCategoryKey()
    setFormState((previous) => ({
      ...previous,
      customCategories: [
        ...previous.customCategories,
        {
          key: newKey,
          label: '',
          description: '',
          sourceCategoryId: null,
        },
      ],
      categories: {
        ...previous.categories,
        [newKey]: true,
      },
      categoryParams: {
        ...previous.categoryParams,
        [newKey]: '',
      },
    }))
    setCategoryPersistState((previous) => ({
      ...previous,
      [newKey]: { status: 'idle' },
    }))
  }

  const handleRemoveCustomCategory = (categoryKey: string) => {
    setFormState((previous) => {
      const nextCustomCategories = previous.customCategories.filter((category) => category.key !== categoryKey)
      const nextCategories = { ...previous.categories }
      const nextCategoryParams = { ...previous.categoryParams }

      delete nextCategories[categoryKey]
      delete nextCategoryParams[categoryKey]

      return {
        ...previous,
        customCategories: nextCustomCategories,
        categories: nextCategories,
        categoryParams: nextCategoryParams,
      }
    })
    setCategoryPersistState((previous) => {
      const next = { ...previous }
      delete next[categoryKey]
      return next
    })
  }

  const handleCustomCategoryLabelChange = (categoryKey: string, value: string) => {
    setFormState((previous) => {
      const nextCategories = previous.customCategories.map((category) =>
        category.key === categoryKey ? { ...category, label: value } : category,
      )

      const currentParam = previous.categoryParams[categoryKey] ?? ''
      const trimmedParam = currentParam.trim()
      const nextParam =
        trimmedParam.length > 0 ? trimmedParam : value.trim().length > 0 ? sanitizeCategoryParam(value) : ''

      return {
        ...previous,
        customCategories: nextCategories,
        categoryParams: {
          ...previous.categoryParams,
          [categoryKey]: nextParam,
        },
      }
    })

    const trimmed = value.trim().toLowerCase()
    setCategoryPersistState((previous) => {
      const current = previous[categoryKey]
      if (!current || current.status === 'saving') {
        return previous
      }

      if (!trimmed) {
        return {
          ...previous,
          [categoryKey]: { status: 'idle' },
        }
      }

      if (current.lastSavedName && current.lastSavedName !== trimmed) {
        return {
          ...previous,
          [categoryKey]: { status: 'idle' },
        }
      }

      return previous
    })
  }

  const handleCustomCategoryLabelBlur = (categoryKey: string, event: FocusEvent<HTMLInputElement>) => {
    const value = event.target.value
    void persistServiceCategory(categoryKey, value)
  }

  const handleCustomCategoryTemplateChange = (categoryKey: string, templateId: string) => {
    const template = gomechanicCategories.find((category) => category.id === templateId)

    setFormState((previous) => {
      const nextCustomCategories = previous.customCategories.map((category) => {
        if (category.key !== categoryKey) {
          return category
        }

        if (!templateId) {
          return {
            ...category,
            sourceCategoryId: null,
          }
        }

        return {
          ...category,
          sourceCategoryId: templateId,
          label: template?.label ?? category.label,
          description: template?.description,
        }
      })

      const nextCategoryParams = {
        ...previous.categoryParams,
      }

      if (template) {
        nextCategoryParams[categoryKey] = template.id
      } else if (!(categoryKey in nextCategoryParams)) {
        nextCategoryParams[categoryKey] = ''
      }

      return {
        ...previous,
        customCategories: nextCustomCategories,
        categoryParams: nextCategoryParams,
        categories: {
          ...previous.categories,
          [categoryKey]: true,
        },
      }
    })

    if (template?.label) {
      void persistServiceCategory(categoryKey, template.label)
    } else {
      setCategoryPersistState((previous) => ({
        ...previous,
        [categoryKey]: { status: 'idle' },
      }))
    }
  }

  const ensureSelectedCategoriesPersisted = async () => {
    for (const category of activeCategories) {
      if (!formState.categories[category.key]) {
        continue
      }

      const name = category.label.trim()
      if (!name) {
        return { success: false as const, message: 'Provide a name for each selected category before running the seed.' }
      }

      const result = await persistServiceCategory(category.key, name)
      if (!result.success) {
        return {
          success: false as const,
          message: result.message ?? 'Failed to save service categories.',
        }
      }
    }

    return { success: true as const }
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

    const requiresCategories = selectedOperations.includes('seed-services-data')
    if (requiresCategories && selectedCategoryParams.length === 0) {
      setFeedback('Add at least one service category when running the service data seed.')
      return
    }

    const hasPendingCustomCategoryId = activeCategories.some(
      (category) => formState.categories[category.key] && !formState.categoryParams[category.key]?.trim(),
    )

    if (hasPendingCustomCategoryId) {
      setFeedback('Provide a query ID for every custom category before running the seed.')
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

    const requiresCategories = selectedOperations.includes('seed-services-data')
    if (requiresCategories && selectedCategoryParams.length === 0) {
      setIsConfirmOpen(false)
      setFeedback('Add at least one service category when running the service data seed.')
      return
    }

    const hasPendingCustomCategoryId = activeCategories.some(
      (category) => formState.categories[category.key] && !formState.categoryParams[category.key]?.trim(),
    )

    if (hasPendingCustomCategoryId) {
      setIsConfirmOpen(false)
      setFeedback('Provide a query ID for every custom category before running the seed.')
      return
    }

    const persistenceResult = await ensureSelectedCategoriesPersisted()

    if (!persistenceResult.success) {
      setFeedback(persistenceResult.message)
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

    const categoryConfig = activeCategories.flatMap((category) => {
      if (!formState.categories[category.key]) {
        return []
      }

      const rawQueryId = formState.categoryParams[category.key]
      const queryId = rawQueryId?.trim() || ''

      if (!queryId) {
        return []
      }

      const label = category.label?.trim() || queryId

      return [
        {
          id: queryId,
          label,
        },
      ]
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

    try {
      const response = await fetch('/api/seed/gomechanic', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })
      const contentType = response.headers.get('Content-Type') || ''

      if (!response.ok && !contentType.includes('text/event-stream')) {
        const errorPayload = await response.json().catch(() => null)
        const message =
          typeof errorPayload?.error === 'string'
            ? errorPayload.error
            : 'Seed request failed.'
        throw new Error(message)
      }

      if (!contentType.includes('text/event-stream')) {
        throw new Error('Seed worker did not return a streaming response.')
      }

      const body = response.body

      if (!body) {
        throw new Error('Seed worker returned an empty response body.')
      }

      const reader = body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let completed = false
      let failedMessage: string | null = null

      const selectedCategoryCount = selectedCategoryParams.length

      const handleStatusComplete = () => {
        if (completed || failedMessage) {
          return
        }
        appendLog('GoMechanic seed completed successfully.')
        setStatus('success')
        setFeedback(
          `Seed request prepared with ${selectedOperations.length} operation(s) targeting ${selectedCategoryCount} category id value(s). Connect this form to the admin API to invoke scripts/seed_gomechanic_data.py with the provided payload.`,
        )
        completed = true
      }

      while (true) {
        const { value, done } = await reader.read()
        if (done) {
          break
        }

        buffer += decoder.decode(value, { stream: true })
        const events = buffer.split('\n\n')
        buffer = events.pop() ?? ''

        for (const event of events) {
          const lines = event.trim().split('\n')
          const dataLine = lines.find((line) => line.startsWith('data:'))
          if (!dataLine) {
            continue
          }

          const rawPayload = dataLine.slice(5).trim()
          if (!rawPayload) {
            continue
          }

          let parsed: { type?: string; message?: unknown; state?: string; exitCode?: number } | null = null
          try {
            parsed = JSON.parse(rawPayload)
          } catch {
            appendLog(`Received malformed stream payload: ${rawPayload}`)
            continue
          }

          if (!parsed) {
            continue
          }

          if (parsed.type === 'log' && typeof parsed.message === 'string') {
            appendLog(parsed.message)
          }

          if (parsed.type === 'error' && typeof parsed.message === 'string') {
            failedMessage = parsed.message
            appendLog(`ERROR: ${parsed.message}`)
            setStatus('idle')
            setFeedback(`Failed to run GoMechanic seed: ${parsed.message}`)
          }

          if (parsed.type === 'status') {
            if (parsed.state === 'started') {
              appendLog('Seed worker started…')
            } else if (parsed.state === 'completed') {
              handleStatusComplete()
            } else if (parsed.state === 'failed') {
              const failure = typeof parsed.message === 'string' ? parsed.message : 'Seed request failed.'
              failedMessage = failure
              appendLog(`ERROR: ${failure}`)
              setStatus('idle')
              setFeedback(`Failed to run GoMechanic seed: ${failure}`)
            }
          }
        }
      }

      if (!completed && !failedMessage) {
        handleStatusComplete()
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to run GoMechanic seed.'
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
    setCategoryPersistState({})
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
            <legend className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.28em] text-brand-600">
              <span>Service categories</span>
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault()
                  handleAddCustomCategory()
                }}
                disabled={isSubmitting}
                className="inline-flex items-center gap-1 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-brand-600 transition hover:border-brand-300 hover:bg-brand-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                <FiPlus className="h-3.5 w-3.5" />
                Add category
              </button>
            </legend>

            <div className="grid gap-4 md:grid-cols-2">
              {activeCategories.map((category) => {
                const categoryKey = category.key
                const isChecked = Boolean(formState.categories[categoryKey])
                const categoryParamValue = formState.categoryParams[categoryKey] ?? ''
                const labelValue = category.label
                const displayLabel = labelValue.trim() || 'Custom category'
                const templateCategory = category.sourceCategoryId
                  ? gomechanicCategories.find((template) => template.id === category.sourceCategoryId)
                  : null
                const persistenceMeta = categoryPersistState[categoryKey]

                return (
                  <label
                    key={categoryKey}
                    className={`block cursor-pointer rounded-2xl border px-4 py-4 transition ${
                      isChecked
                        ? 'border-brand-200 bg-brand-50/70 text-brand-800 shadow-sm'
                        : 'border-brand-100/80 bg-brand-50/20 text-muted-700 hover:border-brand-200 hover:bg-brand-50/40'
                    }`}
                  >
                    <span className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        name={`category-${categoryKey}`}
                        checked={isChecked}
                        onChange={() => handleCategoryToggle(categoryKey)}
                        disabled={isSubmitting}
                        className="mt-1 h-4 w-4 rounded border-brand-300 text-brand-600 focus:ring-brand-400 disabled:cursor-not-allowed disabled:opacity-70"
                      />
                      <span className="flex-1 space-y-2">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <input
                              type="text"
                              value={labelValue}
                              placeholder="Service category name"
                              onChange={(event) =>
                                handleCustomCategoryLabelChange(categoryKey, event.target.value)
                              }
                              onBlur={(event) => handleCustomCategoryLabelBlur(categoryKey, event)}
                              onMouseDown={(event) => event.stopPropagation()}
                              onClick={(event) => event.stopPropagation()}
                              onFocus={(event) => event.stopPropagation()}
                              disabled={isSubmitting}
                              aria-label="Service category name"
                              className="min-w-[10rem] flex-1 rounded-xl border border-brand-100/70 bg-brand-50/20 px-3 py-2 text-sm font-semibold text-brand-800 focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-200 disabled:cursor-not-allowed disabled:opacity-70"
                            />
                            <button
                              type="button"
                              onClick={(event) => {
                                event.preventDefault()
                                event.stopPropagation()
                                handleRemoveCustomCategory(categoryKey)
                              }}
                              disabled={isSubmitting}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-brand-200 text-brand-500 transition hover:border-brand-300 hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-60"
                              aria-label={`Remove ${displayLabel}`}
                            >
                              <FiTrash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-[11px] text-brand-600">
                            <span className="flex items-center gap-2 rounded-lg bg-white px-2 py-1 shadow-sm ring-1 ring-brand-100/60">
                              <span className="font-semibold uppercase tracking-wide">Template</span>
                              <select
                                value={category.sourceCategoryId ?? ''}
                                onChange={(event) =>
                                  handleCustomCategoryTemplateChange(categoryKey, event.target.value)
                                }
                                onMouseDown={(event) => event.stopPropagation()}
                                onClick={(event) => event.stopPropagation()}
                                onFocus={(event) => event.stopPropagation()}
                                disabled={isSubmitting}
                                aria-label="Choose existing category template"
                                className="rounded-md border border-brand-100/70 bg-brand-50/20 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-brand-700 focus:border-brand-300 focus:outline-none focus:ring-1 focus:ring-brand-300 disabled:cursor-not-allowed disabled:opacity-70"
                              >
                                <option value="">Custom name</option>
                                {gomechanicCategories.map((template) => (
                                  <option key={`${categoryKey}-template-${template.id}`} value={template.id}>
                                    {template.label}
                                  </option>
                                ))}
                              </select>
                            </span>
                            {templateCategory && (
                              <span className="text-[11px] text-muted-500">
                                Based on {templateCategory.label} template
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-brand-600">
                          <span className="flex items-center gap-2 rounded-lg bg-white px-2 py-1 shadow-sm ring-1 ring-brand-100/60">
                            <span className="font-semibold uppercase tracking-wide">Category ID</span>
                            <input
                              type="text"
                              value={categoryParamValue}
                              placeholder="Auto-generated"
                              onChange={(event) => handleCategoryParamChange(categoryKey, event.target.value)}
                              onMouseDown={(event) => event.stopPropagation()}
                              onClick={(event) => event.stopPropagation()}
                              onFocus={(event) => event.stopPropagation()}
                              disabled={isSubmitting}
                              aria-label={`Category ID used to fetch ${displayLabel}`}
                              className="w-24 rounded-md border border-brand-100/70 bg-brand-50/30 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-brand-700 focus:border-brand-300 focus:outline-none focus:ring-1 focus:ring-brand-300 disabled:cursor-not-allowed disabled:opacity-60"
                            />
                          </span>
                        </div>
                        {(category.description || templateCategory?.description) && (
                          <p className="mt-1 text-xs text-muted-500">
                            {category.description || templateCategory?.description}
                          </p>
                        )}
                        {persistenceMeta?.status === 'saving' && (
                          <p className="text-[11px] font-medium text-brand-600">Saving category…</p>
                        )}
                        {persistenceMeta?.status === 'error' && persistenceMeta.message && (
                          <p className="text-[11px] font-medium text-red-500">{persistenceMeta.message}</p>
                        )}
                        {persistenceMeta?.status === 'saved' && !persistenceMeta.message && (
                          <p className="text-[11px] text-emerald-600">Category synced to database.</p>
                        )}
                        {persistenceMeta?.status === 'saved' && persistenceMeta.message && (
                          <p className="text-[11px] text-amber-600">{persistenceMeta.message}</p>
                        )}
                      </span>
                    </span>
                  </label>
                )
              })}
              {!activeCategories.length && (
                <div className="rounded-2xl border border-dashed border-brand-200 bg-brand-50/60 p-6 text-sm text-muted-500">
                  No categories configured.
                </div>
              )}
            </div>

            <p className="text-xs text-muted-500">
              {selectedCategoryParams.length} category id value{selectedCategoryParams.length === 1 ? '' : 's'} queued for
              the CLI invocation.
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
