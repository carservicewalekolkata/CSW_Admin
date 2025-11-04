import { useState } from 'react'

import { useUpdateModelMutation, updateModel as updateModelAction } from '@/store/slices/models/modelsSlice'
import { useAppDispatch } from '@/store/hooks'
import { sanitizeFuelTypes, resolveModelErrorMessage } from '@/utils/models'
import type { Model } from '@/types/models'
import type { ModelFuelModalState } from '@/types/modelsPage'
import { toast } from '@/lib/sonner'

const useModelFuelModal = (): ModelFuelModalState => {
  const [model, setModel] = useState<Model | null>(null)
  const [updateModel, { isLoading }] = useUpdateModelMutation()
  const dispatch = useAppDispatch()

  const open = (nextModel: Model) => {
    setModel(nextModel)
  }

  const close = () => {
    setModel(null)
  }

  const onSave = async (fuelTypes: string[]) => {
    if (!model) return
    const sanitized = sanitizeFuelTypes(fuelTypes)
    try {
      const response = await updateModel({ slug: model.slug, fuelType: sanitized }).unwrap()
      if (response.data) {
        dispatch(updateModelAction({ model: response.data, previousSlug: model.slug }))
      }
      toast.success(`Updated fuels for ${model.name}`)
      close()
    } catch (error) {
      toast.error(resolveModelErrorMessage(error, 'Failed to update fuels'))
    }
  }

  return {
    model,
    open,
    close,
    onSave,
    isSaving: isLoading,
  }
}

export default useModelFuelModal
