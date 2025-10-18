import { toast } from '@/lib/sonner'

import type { UseBrandFormStateReturn } from '@/hooks/useBrandFormState'
import { useAppDispatch } from '@/store/hooks'
import {
  addBrand,
  updateBrand as updateBrandAction,
  type useCreateBrandMutation,
  type useUpdateBrandMutation,
} from '@/store/slices/brands/brandsSlice'
import type { Brand } from '@/types/brands'
import {
  buildBrandFormErrors,
  buildBrandUpdatePayload,
  resolveBrandErrorMessage,
} from '@/utils/brands'

type CreateBrandTrigger = ReturnType<typeof useCreateBrandMutation>[0]
type UpdateBrandTrigger = ReturnType<typeof useUpdateBrandMutation>[0]

type UseBrandFormSubmissionParams = {
  formState: UseBrandFormStateReturn
  createBrand: CreateBrandTrigger
  isCreating: boolean
  updateBrand: UpdateBrandTrigger
  isUpdating: boolean
  page: number
  setPage: (value: number) => void
  // refreshBrands: (nextPage: number) => Promise<void>
  closeForm: () => void
}

export const useBrandFormSubmission = ({
  formState,
  createBrand,
  isCreating,
  updateBrand,
  isUpdating,
  page,
  setPage,
  // refreshBrands,
  closeForm,
}: UseBrandFormSubmissionParams) => {
  const dispatch = useAppDispatch()

  const submitCreate = async () => {
    const { errors, trimmedName, sanitizedSlug, iconTrimmed } = buildBrandFormErrors(formState.values)
    if (Object.keys(errors).length > 0) {
      formState.setErrors(errors)
      return
    }

    try {
      const response = await createBrand({
        name: trimmedName,
        slug: sanitizedSlug,
        status: formState.values.status,
        icon: iconTrimmed ? iconTrimmed : undefined,
      }).unwrap()

      const fallbackBrand: Brand = {
        name: trimmedName,
        slug: sanitizedSlug,
        status: formState.values.status,
        icon: iconTrimmed || null,
        created_date: null,
        updated_date: null,
      }

      const brand: Brand = response.data ?? fallbackBrand

      dispatch(addBrand(brand))

      toast.success(`Created brand: ${brand.name}`)
      closeForm()
      if (page !== 1) {
        setPage(1)
      }
      // await refreshBrands(1)
    } catch (err) {
      toast.error(resolveBrandErrorMessage(err, 'Failed to create brand'))
    }
  }

  const submitEdit = async () => {
    if (!formState.editingBrand) return
    const { errors } = buildBrandFormErrors(formState.values)
    if (Object.keys(errors).length > 0) {
      formState.setErrors(errors)
      return
    }

    const { payload, hasChanges, trimmedName } = buildBrandUpdatePayload(
      formState.values,
      formState.editingBrand,
    )

    if (!hasChanges) {
      toast.info('No changes to save')
      return
    }

    try {
      const response = await updateBrand(payload).unwrap()
      const fallbackBrand: Brand = {
        ...formState.editingBrand,
        name: trimmedName,
        slug: payload.newSlug ?? formState.editingBrand.slug,
        status: formState.values.status,
        icon: formState.values.icon.trim() ? formState.values.icon.trim() : null,
        updated_date: new Date().toISOString(),
      }

      const updated: Brand = response.data ?? fallbackBrand

      dispatch(
        updateBrandAction({
          brand: updated,
          previousSlug: formState.editingBrand.slug,
        }),
      )

      toast.success(`Updated brand: ${updated.name}`)
      closeForm()
      // await refreshBrands(page)
    } catch (err) {
      toast.error(resolveBrandErrorMessage(err, 'Failed to update brand'))
    }
  }

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault()
    if (formState.isUploadingIcon) {
      toast.info('Please wait for the icon upload to finish.')
      return
    }
    if (formState.mode === 'create') {
      void submitCreate()
    } else if (formState.mode === 'edit') {
      void submitEdit()
    }
  }

  const isSubmitting = formState.mode === 'create' ? isCreating : formState.mode === 'edit' ? isUpdating : false

  return {
    handleSubmit,
    isSubmitting,
  }
}

export default useBrandFormSubmission
