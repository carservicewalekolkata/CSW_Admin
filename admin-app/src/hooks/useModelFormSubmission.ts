import { toast } from '@/lib/sonner'

import type { UseModelFormStateReturn } from '@/hooks/useModelFormState'
import { useAppDispatch } from '@/store/hooks'
import {
  addModel,
  updateModel as updateModelAction,
  type useCreateModelMutation,
  type useUpdateModelMutation,
} from '@/store/slices/models/modelsSlice'
import {
  buildModelFormErrors,
  buildModelServicesPayload,
  buildModelUpdatePayload,
  resolveModelErrorMessage,
} from '@/utils/models'

type CreateModelTrigger = ReturnType<typeof useCreateModelMutation>[0]
type UpdateModelTrigger = ReturnType<typeof useUpdateModelMutation>[0]

type UseModelFormSubmissionParams = {
  formState: UseModelFormStateReturn
  createModel: CreateModelTrigger
  isCreating: boolean
  updateModel: UpdateModelTrigger
  isUpdating: boolean
  page: number
  setPage: (value: number) => void
  closeForm: () => void
}

export const useModelFormSubmission = ({
  formState,
  createModel,
  isCreating,
  updateModel,
  isUpdating,
  page,
  setPage,
  closeForm,
}: UseModelFormSubmissionParams) => {
  const dispatch = useAppDispatch()

  const submitCreate = async () => {
    const { errors, trimmedName, sanitizedSlug, sanitizedFuelTypes } = buildModelFormErrors(formState.values)
    if (Object.keys(errors).length > 0) {
      formState.setErrors(errors)
      return
    }

    try {
      const response = await createModel({
        name: trimmedName,
        slug: sanitizedSlug,
        brandSlug: formState.values.brandSlug,
        status: formState.values.status,
        imagePath: formState.values.imagePath || undefined,
        iconId: formState.values.iconId || undefined,
        fuelType: sanitizedFuelTypes.length > 0 ? sanitizedFuelTypes : undefined,
        services:
          formState.values.services.length > 0
            ? buildModelServicesPayload(formState.values.services)
            : undefined,
      }).unwrap()

      const model = response.data
      if (model) {
        dispatch(addModel(model))
        toast.success(`Created model: ${model.name}`)
      } else {
        toast.success(`Created model: ${trimmedName}`)
      }
      closeForm()
      if (page !== 1) {
        setPage(1)
      }
    } catch (err) {
      toast.error(resolveModelErrorMessage(err, 'Failed to create model'))
    }
  }

  const submitEdit = async () => {
    if (!formState.editingModel) return
    const { errors } = buildModelFormErrors(formState.values)
    if (Object.keys(errors).length > 0) {
      formState.setErrors(errors)
      return
    }

    const { payload, hasChanges, trimmedName } = buildModelUpdatePayload(
      formState.values,
      formState.editingModel,
    )

    if (!hasChanges) {
      toast.info('No changes to save')
      return
    }

    try {
      const response = await updateModel(payload).unwrap()
      const updatedModel = response.data

      if (updatedModel) {
        dispatch(
          updateModelAction({
            model: updatedModel,
            previousSlug: formState.editingModel.slug,
          }),
        )
        toast.success(`Updated model: ${updatedModel.name}`)
      } else {
        toast.success(`Updated model: ${trimmedName}`)
      }
      closeForm()
    } catch (err) {
      toast.error(resolveModelErrorMessage(err, 'Failed to update model'))
    }
  }

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault()
    if (formState.isUploadingIcon || formState.isUploadingImage) {
      toast.info('Please wait for the uploads to finish.')
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

export default useModelFormSubmission
